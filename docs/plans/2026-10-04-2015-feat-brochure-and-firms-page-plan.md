---
title: Brochure (L38) and firms & bar associations page (L70) - Plan
type: feat
date: 2026-10-04
topic: brochure-and-firms-page
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-plan-bootstrap
execution: code
---

# Brochure (L38) and firms & bar associations page (L70) - Plan

## Goal Capsule

**Objective.** Build the two items Damien accepted in the 2026-10-04 triage of John Sonsteng's
requests (Cockpit record `sonsteng-magnum-opus-2026-10-04-1557-john-requests-triage`) to follow
the pitch rewrite: l38, a one- to two-page brochure that "must grab [the reader] immediately"
(John, 08-24), and l70, a short page for law firms and bar associations (John, 09-25: "the big
firms … should implement it to train their new associates … offer it nationally").

**Product authority.** The message is settled: Damien kept the persuasion pitch as built on
2026-10-04 (Cockpit record `sonsteng-magnum-opus-2026-10-04-2102-pitch-persuasion-review`:
spine, zero "AI", generic paid-help wording, ABA Standards 302/303 framing). Both pieces reuse
that message; they do not invent a new one.

**Open blockers.** None.

## Product Contract

### Requirements

- R1 (brochure). A hand-authored, self-contained page `site/brochure.html` that prints on
  exactly two US Letter pages (one sheet, both sides) and reads well on screen and phone.
  Front: John's tagline "Good in theory. Better in practice. Practice ready.", the
  school-neutral opener, and the three-part line (knowledge, skills, evolving technology),
  then "you already teach this way" in two sentences. Back: what a school gets (book,
  curriculum, platform, twenty matters, 26 skills), what the school gains (leadership,
  enrollment, money, recognition), free under CC BY 4.0 / MIT with optional paid help, and a
  short block of John's yes/no questions ending "You betcha!". Ends with where to see it (the
  site address) and the byline. It must grab the reader in the first three seconds: big
  tagline, one strong line, generous whitespace.
- R2 (firms and bar associations). A hand-authored page `site/firms.html` for law-firm
  professional-development leaders and bar associations. Message: new associates arrive
  knowing law but not lawyering; the same free matters, exercises and feedback form that
  schools use can train first- and second-year associates and new-lawyer programs; they can
  start with one matter; paid implementation help is available. Keep it short (about 400-700
  words), with a few plain questions and answers in John's style. Do not claim CLE
  accreditation, partnerships, endorsements or adoption by any firm or bar.
- R3. Same voice and constraints as the pitch: plain, second person, school/firm-neutral,
  "AI" zero times (rotate technology, tech, evolving technology), no "centaur", "Magnum Opus",
  "jury", "critique", "diversity"; author names only in the byline; no invented statistics
  (reuse only figures the pitch already shows). Same visual system as the pitch (embedded
  fonts and tokens, Standard and Large Type modes, skip link, WCAG AA contrast), no external
  requests.
- R4. Linking: the pitch links to both pages (brochure from the hero area or footer; firms page
  from section VIII or IX), each new page links back to the pitch and to `cost-per-credit.html`
  where cost comes up, and the brochure links to the firms page.
- R5. The pitch gate (`tools/verify_pitch.py`, which already covers every top-level page) passes
  for both pages; extend it or its tests so the R3 wording rules and a two-page print check for
  the brochure are enforced (the print check can run in the browser gates if preflight already
  has a print matrix pattern).

## Implementation Units

- U1 (Codex worker). R1-R5, with tests.

## Verification Contract

`bash tools/preflight.sh` (full, browser gates included), then a DEV visual check of both pages
at desktop and phone width and a print preview of the brochure.
