---
title: John's October–November Suggestions - Plan
type: feat
date: 2026-11-02
topic: john-nov-suggestions
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
---

# John's October–November Suggestions - Plan

## Goal Capsule

- **Objective:** A first-time reader of legalpracticum.org meets John's new introduction, the correct authors, and a clear path to run the practicum on their own cases, and the site carries every pending edit from John.
- **Product authority:** Damien's answers on 2026-11-02, recorded in Cockpit ask `sonsteng-magnum-opus-2026-11-02-1828-john-oct-nov-suggestions` (qids `byline`, `license`, `adopter`, `cleanup`). Sources: John's emails of Oct 22, Oct 28/30, Oct 31, and Nov 1; the Oct 30 call with John; the editor review queue as of Nov 2 (49 items).
- **Open blockers:** None block the copy work. Making the repository public waits on R12.

## Product Contract

### Summary

Apply John's latest intro and byline, fold in his stuck on-site edits with a light touch, answer Abby's comments, and add an adopter page that links to the repository once it goes public.

### Requirements

**Home page and authorship**

- R1. The home page keeps its current title and replaces the paragraph after it with John's Oct 31 introduction, word for word except for typo fixes.
- R2. The home page lists the law practice skills and the law practice management skills in two side-by-side columns.
- R3. The byline reads "John Sonsteng and Damien Riehl, with Abby Breit, Editor." (session-settled: user-directed — chosen over keeping "with Roger Haydock" from John's Oct 31 and Nov 1 emails: Damien follows the Oct 30 call)
- R4. Roger Haydock's name leaves every reader-facing surface, including the byline and the footer.
- R5. "Sonsteng" leaves the body copy (e.g. "Professor Sonsteng's design" in Module III); the byline and author bios keep it. (session-settled: user-directed — byline keeps the name; body copy drops it)
- R6. An authors section gives each author a short bio and title: John as "Author" and Damien as "Co-author & Provocateur." John's bio starts from his Oct 31 draft.
- R7. Footnotes cite John's books, including the trial book, and his articles.

**Pending editor work**

- R8. Every one of John's stuck edits (needs_human, drift, and accepted_blocked rows) is either applied or reported back with a one-line reason. Where John submitted several versions of one paragraph, the latest one wins.
- R9. The cleanup stays a light touch: John's pending edits plus typo, spacing, and punctuation fixes. It cuts no sections and makes no structural rewrites. (session-settled: user-directed — chosen over a reader pass that strips TSK codes and matter slugs, and over a deep edit)
- R10. Each of Abby's 12 comments and John's 2 comments gets a reply in the editor. Fixes small enough for a light touch ship, such as anchoring the links at the bottom of each home-page box and paragraph breaks that the editor drops.

**Adopter path**

- R11. An up-front page on www.legalpracticum.org explains the three ways to use the practicum: students use the public exercises, while law schools, legal aid organizations, and solo lawyers run a private copy from the repository with Claude Code or Codex, so client files never touch the public demo. It also covers how to prompt the system.
- R12. The repository goes public and the adopter page links to it only after four steps, in this order: the R1–R10 changes ship, an audit of the full repository history finds no secrets or personal data, John and Abby review the adopter page on the editing site, and Damien gives an explicit go. (session-settled: user-directed — Damien asked to be asked before the flip)

**License**

- R13. The license stays CC BY. (session-settled: user-directed — chosen over CC BY-NC-SA 4.0: matches where the Oct 30 call ended, after John's earlier "no profit, no provider" email)

### Key Flows

- F1. **Lawyer reads the adopter page:** A solo lawyer lands on the home page, follows the adopter link, learns why their own client files belong in a private copy, and gets the steps to set one up. **Covers R11, R12.**

### Acceptance Examples

- AE1. A search of reader-facing pages finds no "Roger," no "Haydock," and "Sonsteng" only in the byline, bios, and citations. **Covers R4, R5.**
- AE2. The editor review queue shows no John rows in needs_human, drift, or accepted_blocked, and a reply sits under each of Abby's and John's comments. **Covers R8, R10.**
- AE3. Before R12's gate clears, the adopter page links to no repository URL that a visitor cannot open. **Covers R12.**

### Scope Boundaries

- **Colors and fonts:** Deferred. John likes the current palette. Abby dislikes the brown and will share color and font ideas through John.
- **Table of contents:** Out of scope. On Oct 30 John agreed that the existing "Curriculum modules" and "Explore the practicum" links suffice.
- **Outreach letter:** Deferred until the site is done. This is John's Oct 22 letter to Mitchell Hamline students and alumni and to the MSBA.
- **Michael Sonsteng:** Joins the byline only if he takes on a role (John, Nov 1).
- **Reader-pass cleanup:** Out of scope per R9. That pass would strip TSK codes, matter slugs, and taxonomy jargon.
- **Editor access:** Already done on Oct 24 (Michael and Abby). Sign-in reminder emails for John, Abby, and Michael are in Damien's Gmail drafts.

### Outstanding Questions

- **Resolve before planning:** None.
- **Deferred to planning:**
  - **Citations naming Roger:** Should the trial-book citations name Roger Haydock as co-author? Accurate citation conflicts with R4; ask Damien when the footnotes are drafted.
  - **Modules or volumes:** Abby asked whether the site should say "modules" or "volumes." A terminology choice for John and Damien.
  - **Author materials:** John's resume and bibliography, and Damien's bio, must arrive before R6 and R7 can finish.
  - **Abby's larger ideas:** Private work tracking, partner matching, and pre-practice outreach skills go in the replies (R10). Building any of them is out of scope.
