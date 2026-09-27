// In-place override controller for the scope-gated assessment review page.
// Each heading card carries a server-rendered (hidden) native form; this script
// reveals the "Override score" disclosure buttons, posts to the existing
// /edit/v1/assessment-override endpoint with the X-Edit-Request CSRF header,
// and then swaps in the server's own re-rendered card and override log so the
// in-place result is exactly what a reload shows.
(() => {
  "use strict";
  const main = document.querySelector("[data-assessment-id]");
  const status = document.getElementById("assessment-override-status");
  if (!main || !status) return;

  let pendingForm = null;
  let refreshSequence = 0;

  const MESSAGES = {
    400: "The server rejected this override. Choose a score from 1 to 7 and give a reason, then record it again.",
    403: "The server refused the request. Reload the page, then record the override again.",
    404: "This assessment is no longer available to record against. Reload the page to check its status.",
  };

  function enhance(root) {
    root.querySelectorAll(".as-override-toggle, .as-results-help").forEach((el) => {
      el.hidden = false;
    });
  }

  function parts(form) {
    const card = form.closest(".as-heading");
    return {
      card,
      toggle: card.querySelector(".as-override-toggle"),
      error: form.querySelector(".as-inline-error"),
      note: form.querySelector("textarea[name=note]"),
      radios: [...form.querySelectorAll("input[type=radio][name=score]")],
      submit: form.querySelector("button[type=submit]"),
      cancel: form.querySelector(".as-cancel"),
    };
  }

  function clearError(form) {
    const { error, note, radios } = parts(form);
    error.hidden = true;
    error.textContent = "";
    for (const field of [note, ...radios]) {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-errormessage");
    }
  }

  function showError(form, message, target) {
    const { error } = parts(form);
    error.textContent = message;
    error.hidden = false;
    if (target) {
      target.setAttribute("aria-invalid", "true");
      target.setAttribute("aria-errormessage", error.id);
      target.focus();
    } else {
      error.focus();
    }
  }

  function open(form) {
    const { toggle, radios } = parts(form);
    form.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    (radios.find((radio) => radio.checked) || radios[0]).focus();
  }

  function close(form) {
    if (form === pendingForm) return;
    const { toggle } = parts(form);
    form.reset();
    clearError(form);
    form.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  }

  function setSaving(form, saving) {
    pendingForm = saving ? form : null;
    // The audit log is shared by every heading: hold this lock through the GET.
    main.querySelectorAll("button[type=submit]").forEach((button) => {
      button.disabled = saving;
      button.setAttribute("aria-disabled", String(saving));
      button.textContent = saving ? "Saving…" : "Record override";
    });
    const { toggle, cancel, submit } = parts(form);
    for (const button of [toggle, cancel]) {
      button.disabled = saving;
      button.setAttribute("aria-disabled", String(saving));
    }
    if (saving) submit.setAttribute("aria-busy", "true");
    else submit.removeAttribute("aria-busy");
  }

  // Re-read the server-rendered page and swap in the updated card and log, so
  // the in-place result cannot drift from what a reload would show.
  async function refreshFromServer(headingId) {
    const sequence = ++refreshSequence;
    const response = await fetch(location.href, { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error(String(response.status));
    const html = await response.text();
    // Check after the body resolves as well: an older response can arrive last.
    if (sequence !== refreshSequence) return null;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const freshCard = doc.getElementById(`heading-${headingId}`);
    const freshLog = doc.getElementById("assessment-override-log");
    const card = document.getElementById(`heading-${headingId}`);
    const log = document.getElementById("assessment-override-log");
    if (!freshCard || !freshLog || !card || !log) throw new Error("missing");
    const nextCard = document.importNode(freshCard, true);
    const nextLog = document.importNode(freshLog, true);
    enhance(nextCard);
    card.replaceWith(nextCard);
    log.replaceWith(nextLog);
    return nextCard;
  }

  main.addEventListener("click", (event) => {
    const toggle = event.target.closest(".as-override-toggle");
    if (toggle) {
      const form = document.getElementById(toggle.getAttribute("aria-controls"));
      if (!form || form === pendingForm) return;
      if (form.hidden) open(form);
      else close(form);
      return;
    }
    const cancel = event.target.closest(".as-inline-override .as-cancel");
    if (cancel) close(cancel.closest("form"));
  });

  main.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const form = event.target.closest?.(".as-inline-override");
    if (form && !form.hidden) close(form);
  });

  main.addEventListener("submit", async (event) => {
    const form = event.target.closest(".as-inline-override");
    if (!form) return;
    event.preventDefault();
    if (pendingForm) return;
    const { note, radios } = parts(form);
    const headingId = form.dataset.headingId;
    const label = form.dataset.headingLabel;
    clearError(form);
    const chosen = radios.find((radio) => radio.checked);
    if (!chosen) {
      showError(form, "Choose a replacement score from 1 to 7.", radios[0]);
      return;
    }
    if (!note.value.trim()) {
      showError(form, "Give a reason for this override. It is recorded with your identity.", note);
      return;
    }
    const score = Number(chosen.value);
    setSaving(form, true);
    status.textContent = `Saving… Recording the override for ${label}.`;
    let recorded = false;
    try {
      const response = await fetch("/edit/v1/assessment-override", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json", "X-Edit-Request": "1" },
        body: JSON.stringify({
          id: `assessment-override-${crypto.randomUUID()}`,
          assessment_id: main.dataset.assessmentId,
          heading_id: headingId,
          score,
          note: note.value,
        }),
      });
      if (!response.ok) {
        const error = new Error(String(response.status));
        error.status = response.status;
        throw error;
      }
      recorded = true;
      const card = await refreshFromServer(headingId);
      if (!card) return;
      status.textContent = `Override recorded. ${label} is now scored ${score}, signed with your identity.`;
      card.classList.add("as-just-updated");
      card.querySelector(".as-override-toggle").focus();
    } catch (error) {
      if (recorded) {
        // Saved on the server, but the fresh view could not be fetched.
        status.textContent = `Override recorded for ${label}. Reloading the audit record.`;
        location.reload();
        return;
      }
      status.textContent = `The override for ${label} was not recorded.`;
      showError(form, MESSAGES[error.status] ||
        "The override was not recorded because the server could not be reached or failed. Your score and reason are kept; try again.");
    } finally {
      setSaving(form, false);
    }
  });

  enhance(main);
})();
