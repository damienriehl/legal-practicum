// Server-rendered human signer view for one scope-gated assessment audit.
import { escapeHtml } from "./editor-map.js";
import { attributionLabel } from "./editor-auth.js";

function headingLabel(id) {
  return String(id || "")
    .split("_")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

// Historical/legacy records may contain translation fields even though the
// memo evaluator does not. They are never relevant to this 1-7 review surface.
function assessmentOnly(value) {
  if (Array.isArray(value)) return value.map(assessmentOnly);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["lettergrade", "lettergrademap"].includes(
      key.toLowerCase().replace(/[^a-z]/g, "")
    ))
    .map(([key, child]) => [key, assessmentOnly(child)]));
}

export function assessmentViewModel(record = {}) {
  const evidence = assessmentOnly(record.evidence || {});
  const result = assessmentOnly(record.result || {});
  const provenance = assessmentOnly(record.provenance || {});
  const overrides = assessmentOnly(record.overrides || []);
  const config = provenance.config || {};
  const competence = Number.isInteger(config.competence_score) ? config.competence_score : 4;
  const redoBelow = Number.isInteger(config.redo_eligible_below) ? config.redo_eligible_below : 6;
  const latestOverride = new Map();
  for (const item of overrides) {
    const value = item?.value;
    if (value && typeof value.heading_id === "string" &&
        Number.isInteger(value.score) && value.score >= 1 && value.score <= 7) {
      latestOverride.set(value.heading_id, item);
    }
  }
  return {
    ...record,
    evidence,
    result,
    provenance,
    overrides,
    competence_score: competence,
    redo_eligible_below: redoBelow,
    headings: (result.headings || []).map((heading) => {
      const humanOverride = latestOverride.get(heading.heading_id) || null;
      const score = humanOverride?.value?.score ?? heading.score;
      return {
        ...heading,
        base_score: heading.score,
        score,
        human_override: humanOverride,
        label: headingLabel(heading.heading_id),
        competent: score >= competence,
        redo_eligible: score < redoBelow,
      };
    }),
  };
}

function pretty(value) {
  return escapeHtml(JSON.stringify(value, null, 2));
}

function renderHeadings(vm) {
  return vm.headings.map((heading) => {
    const status = heading.competent ? "Competent" : "Not yet competent";
    const redo = heading.redo_eligible ? "Redo-eligible" : "Not redo-eligible";
    const observations = (heading.observations || []).map((observation) =>
      "<li><p><strong>Evidence:</strong> " +
      escapeHtml((observation.evidence_spans || []).join(" · ")) +
      "</p><p><strong>Rationale:</strong> " + escapeHtml(observation.rationale || "") +
      "</p><p class=\"as-provider\">" +
      escapeHtml([observation.provider, observation.model, observation.mode].filter(Boolean).join(" · ")) +
      "</p></li>"
    ).join("");
    const id = escapeHtml(heading.heading_id);
    const label = escapeHtml(heading.label);
    const editorId = "override-editor-" + id;
    return "<article class=\"as-heading\" id=\"heading-" + id + "\" data-heading-id=\"" + id + "\">" +
      "<header><h3 id=\"heading-title-" + id + "\">" + label + "</h3>" +
      "<div class=\"as-score-group\"><p class=\"as-score\">Score " + Number(heading.score) + "</p>" +
      // Hidden until assessment-review.js enhances the page: the override
      // endpoint needs the JSON + X-Edit-Request CSRF contract, so without
      // script there is no working override path to offer.
      "<button type=\"button\" class=\"as-override-toggle\" hidden aria-expanded=\"false\" aria-controls=\"" +
      editorId + "\" aria-describedby=\"heading-title-" + id + "\">Override score</button></div></header>" +
      "<p><strong>" + status + ".</strong> " + redo +
      " under the resolved below-" + Number(vm.redo_eligible_below) + " rule.</p>" +
      (heading.human_override ? "<p class=\"as-override-note\"><strong>Human override by " +
        escapeHtml(attributionLabel(heading.human_override.author) || heading.human_override.author) +
        ".</strong> The derived score was " + Number(heading.base_score) + ".</p>" : "") +
      renderInlineEditor(heading, editorId) +
      "<dl class=\"as-result-meta\"><div><dt>Median</dt><dd>" +
      escapeHtml(heading.median_score ?? heading.base_score) + "</dd></div><div><dt>Spread</dt><dd>" +
      escapeHtml(heading.spread ?? "—") + "</dd></div></dl>" +
      (observations ? "<details><summary>Raw grader evidence</summary><ol>" + observations + "</ol></details>" : "") +
      "</article>";
  }).join("");
}

// In-place editor for one heading. Server-rendered (hidden) so the markup,
// labels, and ids are the same on first paint and after a refresh; the
// script only toggles it and posts to the existing override endpoint.
function renderInlineEditor(heading, editorId) {
  const id = escapeHtml(heading.heading_id);
  const label = escapeHtml(heading.label);
  const current = Number(heading.score);
  const options = [1, 2, 3, 4, 5, 6, 7].map((score) => {
    const isCurrent = score === current;
    return "<label class=\"as-scale-option" + (isCurrent ? " is-current" : "") + "\">" +
      "<input type=\"radio\" name=\"score\" value=\"" + score + "\">" +
      "<span class=\"as-scale-face\"><span class=\"as-scale-num\">" + score + "</span>" +
      (isCurrent ? "<span class=\"as-scale-cur\">now</span><span class=\"as-sr\"> (current score)</span>" : "") +
      "</span></label>";
  }).join("");
  return "<form class=\"as-inline-override\" id=\"" + editorId + "\" data-heading-id=\"" + id +
    "\" data-heading-label=\"" + label + "\" hidden novalidate>" +
    "<fieldset class=\"as-scale\" aria-describedby=\"override-current-" + id + "\">" +
    "<legend>Replacement score for " + label + "</legend>" +
    "<p class=\"as-scale-hint\" id=\"override-current-" + id + "\">Currently " + current +
    ". Choose the score this heading should carry.</p>" +
    "<div class=\"as-scale-options\">" + options + "</div></fieldset>" +
    "<label class=\"as-reason-label\" for=\"override-note-" + id + "\">Reason</label>" +
    "<p class=\"as-reason-help\" id=\"override-help-" + id + "\">Required. Your authenticated identity and the server time are recorded with it.</p>" +
    "<textarea id=\"override-note-" + id + "\" name=\"note\" maxlength=\"4000\" required aria-describedby=\"override-help-" + id + "\"></textarea>" +
    "<p class=\"as-inline-error\" id=\"override-error-" + id + "\" tabindex=\"-1\" hidden></p>" +
    "<div class=\"as-inline-actions\"><button type=\"submit\" class=\"as-record\">Record override</button>" +
    "<button type=\"button\" class=\"as-cancel\">Cancel</button></div></form>";
}

function renderOverrides(vm) {
  if (!vm.overrides?.length) return "<p>No human overrides have been recorded.</p>";
  return "<ol class=\"as-overrides\">" + vm.overrides.map((item) =>
    "<li><strong>" + escapeHtml(attributionLabel(item.author) || item.author) + "</strong> · " +
    escapeHtml(new Date(item.created_at).toISOString()) + "<pre>" + pretty(item.value) + "</pre></li>"
  ).join("") + "</ol>";
}

export function renderAssessmentReviewPage(record, viewerLabel = "") {
  const vm = assessmentViewModel(record);
  const config = vm.provenance.config || {};
  const isLocalConfig = config.locally_supplied === true;
  const ruleSummary = isLocalConfig
    ? "<p><strong>Resolved competence begins at score " + Number(vm.competence_score) +
      ".</strong> Scores below " + Number(vm.redo_eligible_below) +
      " are redo-eligible. This is a locally supplied, unverified " +
      escapeHtml(config.source || "threshold") + " claim (" +
      escapeHtml(config.source_id || "source not identified") + ").</p>"
    : "<p><strong>Score 4 is competent.</strong> <strong>Score 5 is competent and redo-eligible</strong> under the canonical below-6 rule. Scores stay on the 1–7 section scale and are never translated.</p>";
  const html = "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
    "<title>Assessment signer review — Sonsteng</title>" +
    "<link rel=\"stylesheet\" href=\"/edit/assets/editor.css\">" +
    "<link rel=\"stylesheet\" href=\"/edit/assets/assessment-review.css\"></head><body>" +
    "<main class=\"as-review\" data-assessment-id=\"" + escapeHtml(vm.id) + "\">" +
    "<nav aria-label=\"Editor\"><a href=\"/edit/admin\">Editor dashboard</a></nav>" +
    "<header class=\"as-head\"><p class=\"as-eyebrow\">Human assessment record" +
    (viewerLabel ? " · " + escapeHtml(viewerLabel) : "") + "</p>" +
    "<h1>Assessment signer review</h1><p>Review the derived section scores, their provenance, and the raw evidence before recording any human judgment.</p></header>" +
    "<section class=\"as-rule\" aria-labelledby=\"as-rule-title\"><h2 id=\"as-rule-title\">How to read these scores</h2>" +
    ruleSummary + "</section>" +
    "<section aria-labelledby=\"as-results-title\"><h2 id=\"as-results-title\">Seven-heading result</h2>" +
    "<p class=\"as-results-help\" hidden>To change a heading's score, use Override score beside it. Every override is signed with your identity and kept in the log below.</p>" +
    "<p id=\"assessment-override-status\" class=\"as-status\" role=\"status\" aria-live=\"polite\"></p>" +
    renderHeadings(vm) + "</section>" +
    "<section class=\"as-provenance\" aria-labelledby=\"as-provenance-title\"><h2 id=\"as-provenance-title\">Provenance</h2>" +
    "<h3>Provider configuration</h3><pre>" + pretty(vm.provenance.providers || []) + "</pre>" +
    "<h3>Resolved threshold configuration</h3><p><strong>Configuration status:</strong> " +
    (isLocalConfig ? "Locally supplied and unverified; institutional authority has not been verified." : "Canonical default configuration.") +
    "</p><pre>" + pretty(vm.provenance.config || {}) + "</pre>" +
    "<h3>Assessment instrument</h3><pre>" + pretty(vm.provenance.instrument || {}) + "</pre></section>" +
    "<section class=\"as-evidence\" aria-labelledby=\"as-evidence-title\"><h2 id=\"as-evidence-title\">Raw evidence</h2><pre>" +
    pretty(vm.evidence) + "</pre></section>" +
    "<section id=\"assessment-override-log\" aria-labelledby=\"as-overrides-title\"><h2 id=\"as-overrides-title\">Recorded human overrides</h2>" +
    renderOverrides(vm) + "</section>" +
    "</main><script src=\"/edit/assets/assessment-review.js\" defer></script></body></html>";
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
