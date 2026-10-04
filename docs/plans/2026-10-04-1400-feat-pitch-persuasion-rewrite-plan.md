---
title: Rewrite the pitch as persuasion - Plan
type: feat
date: 2026-10-04
topic: pitch-persuasion-rewrite
artifact_contract: ce-unified-plan/v1
artifact_readiness: implementation-ready
product_contract_source: ce-brainstorm
execution: code
---

# Rewrite the pitch as persuasion - Plan

## Goal Capsule

**Objective.** Rebuild the public pitch (`site/index.html`) so it persuades a dean or faculty
member instead of arguing like a law-review article. The accepted scope comes from Damien's
2026-10-04 triage of John Sonsteng's requests (Cockpit record
`sonsteng-magnum-opus-2026-10-04-1557-john-requests-triage`, qids l44, l64, l48, l45, l43, l35,
l49, l46, l08, l47, l53, l39, l40, l15, l16, l31, l72, l11). l41 (the history of who law schools
trained) was rejected and stays out.

**Product authority.** Damien's triage answers settle *what* goes in. The brainstorm below
settles *how*: the order of sections, the tone, and the wording. Those are taste calls. Under
the Decision Bar they are built first on the recommended option, kept revertible on this branch,
and put to Damien on a Decision Sheet after the build.

**Open blockers.** None. Darngood v. Landers & PUDS (l12/l34) waits on John's PDF and is not in
this pass; Midstate stays the live demonstration until it arrives.

## Brainstorm (requirements)

### Problem frame

John, 2026-08-28: what he had written "looked pretty" but was "academic arrogance … Persuasion!!!"
Then, 2026-09-09 ("Eureka"): schools do not need to change legal education, because "legal
educators have been teaching with a 'Learning by doing methodology' all along." The live pitch
still runs the old spine: broken promise → survey → a trilogy that reads as one author's life
work → "Magnum Opus" layers → "centaur, Human + AI" → coverage → free → reactions. It says "AI"
23 times in about 2,960 words. Damien's l46 note: rotate AI, tech, technology and evolving
technology, and say "AI" less, "since there is a societal backlash against AI, especially in
academia."

### Audience and stance

- The reader is a dean, associate dean or faculty member at **any** school (l45: school-neutral;
  Mitchell Hamline is not named, because John doubted Mitchell on 09-25 and l37 is deferred).
- Stance: *you already do this well; here is a ready system that makes every graduate practice
  ready.* No reform rhetoric, no "broken promise", no "Renaissance" as a thesis.
- Voice: plain, short sentences, second person ("your school", "your faculty"), confident,
  warm. No hedging, no academic throat-clearing. Concrete nouns over abstractions.

### New spine (recommended; provisional pending Damien's review)

Each section keeps one `THE PROOF` disclosure where the old page had evidence worth keeping.

1. **Hero.** Tagline (l43): "Good in theory. Better in practice. Practice ready." Opener (l45,
   school-neutral): your school as a leader in innovative legal education, its graduates
   practice ready, combining the best of theory, knowledge and practice with the ethical and
   effective use of ever-evolving technology. Three-part line (l49): knowledge, skills, and the
   effective, appropriate use of evolving technology. Byline unchanged.
2. **You already teach this way (l64, l35).** Learning by doing is already part of legal
   education; faculty write practicum exercises all the time (for exams, skills courses,
   clinics). The Legal Practicum adds a complete, ready-to-run system to what a school already
   does well; it does not ask anyone to stop. John's line: "We are teaching for tomorrow, not
   yesterday."
3. **What students come to law school for (l40, l39).** Medicine, engineering and architecture
   train practitioners through practice; students pay to go to law school to learn to be
   lawyers. The surveys of 19,077 attorneys identify 26 skills (17 lawyering, 9 practice
   management) and show where new lawyers learn them. ABA accreditation standards already
   require professional-skills outcomes (Standard 302) and at least six credit hours of
   experiential coursework (Standard 303). Do **not** say the ABA or a state bar publishes the
   26-skill list; the list comes from the surveys. The survey method line added in PR #94 stays.
4. **For every student, including the ones clinics miss (l47, l53).** A broad spectrum of
   students (John avoided "diversity"; so do we). Students who work jobs or raise families
   often cannot take internships or clinics; the practicum runs inside the course.
5. **See it work: Midstate and Rogers (l15, l16).** Keep the existing demonstration, the
   three-step cycle and the matter cards. Add John's sample cross-examination question, "You
   didn't actually see the professor take a drink?", followed by a sample of the feedback a
   student receives. The feedback follows the house rule from PR #94: it starts with what works,
   never says "good" or "bad", and invites a revision. Then show the seven-heading, 1-7
   assessment and feedback form from `data/curriculum/assessment-instrument.json` (headings and
   scale verbatim).
6. **People first; technology is the tool (l08, l46).** Replaces the centaur section. Human
   interaction comes first: faculty, clients, opposing counsel, decision-makers. Technology
   supplies more practice repetitions, first-pass feedback at any hour, and preparation help,
   always supervised by faculty. "With", not "and": technology is not a partner.
7. **What is in it (l11).** Merges the old trilogy, "What the Practicum is", the skills band
   and the coverage matrix into one shorter section: the book, the curriculum, the platform,
   twenty matters, all 26 skills mapped. The work is described as a collection by its three
   authors. Per decision A3, names stay in the byline and are not repeated in body prose. The
   cited work "A Legal Education Renaissance" may stay as a source title, not as the thesis.
8. **What your school gains (l31).** Show the reward up front: leadership (be the school that
   offers it), enrollment (applicants who want to practice), money (low cost per credit, no
   large new hires; link `cost-per-credit.html`), recognition (for faculty and students). No
   invented statistics.
9. **Free to use, with help when you want it (l72).** Materials are free under CC BY 4.0 and the
   code under MIT, so they outlive any one school or author. Schools that want hands-on help
   (faculty training, setup, adapting matters) can engage paid implementation services. Absorbs
   the old "Given away, so it outlives us" content and "What we're asking of you today".
10. **Questions deans ask (l48).** The closing spine in John's own words, each answer one word
    plus one supporting line: Does it work? Yes. Can every school implement it? Yes. Does it
    cost too much? No (link the cost page). Will it need many more faculty and administrators?
    No. Can we start now? Yes. Do we abandon what we already do well? Of course not. Can faculty
    keep teaching the way they teach now? Absolutely. Will students benefit? Yes. Will our
    graduates be practice ready? You betcha!
11. **Reactions.** Keep the existing reaction mechanism (controls, comment box, how it saves),
    re-keyed to the new sections' pillars.

### Requirements

- R1. The page follows the spine above, in that order, and carries every accepted item listed
  in the Goal Capsule.
- R2. Reader-visible prose is at most 2,400 words (old page about 2,960) and every section can
  be skimmed from its heading and first sentence.
- R3. Standalone "AI" appears at most 8 times in reader-visible text; the rest rotate among
  "technology", "tech", and "evolving technology". "AI" never comes first in a list, heading or
  tagline.
- R4. No reader-visible "centaur", "Human + AI", "broken promise", "Renaissance, realized",
  "Magnum Opus", "jury", "critique", "diversity", "trusted advisor" without "legal", or the
  rejected l41 history.
- R5. Body prose names no author (decision A3); the byline is unchanged.
- R6. Everything the page already guarantees still holds: embedded fonts and no external
  requests, the skip link, Standards and Large Type modes, WCAG AA contrast, the page-size
  ceiling, Midstate caption and remedy contract, working matter links.

### Scope boundaries

- Out: the brochure (l38) and the firms and bar associations page (l70), which follow this
  rewrite; gamification (l32); Darngood ingestion (l12/l34); the platform's generated pages
  other than the U3 sweep below.

## Key Decisions

- KD1. Rewrite the hand-authored page in place rather than generating it, matching how PRs
  #93-#96 edited it; `tools/verify_pitch.py` and its tests remain the gate and change only where
  the spine changes (proof summaries, pillar labels).
- KD2. Show the assessment form statically on the pitch, and add a test that its headings and
  scale match `data/curriculum/assessment-instrument.json`, so the two cannot drift.
- KD3. Extend the locked-vocabulary contract with the R4 forms that apply site-wide ("centaur",
  "Human + AI") once U3 removes them from the platform, so they cannot return.

## Implementation Units

- U1. Rewrite `site/index.html` to R1-R6, preserving its CSS, fonts, scripts, accessibility
  hooks and reaction mechanism. Update `tools/verify_pitch.py` constants (proof summaries,
  pillar labels) and `tools/tests/test_verify_pitch.py` to the new spine; add the KD2 parity test
  and an R3/R4 test over the pitch's visible text.
- U2. Bring any other reader-visible pitch surface (`site/cost-per-credit.html`) in line with R3
  and R4 if it trips them; no restructure there.
- U3. Platform sweep for l08/l46: reader-visible "centaur" and "Human + AI" framing in
  `data/copy/*.json`, `data/curriculum/*.md` and exercise or taxonomy text becomes "people
  first, technology as the tool" wording, with the smallest edit that reads naturally. Preserve
  every `{#b:...}` block id, JSON key and schema. Then rebuild the site, personas and instructor
  bundle per the repo's documented order, keep the new build stamp, and pass
  `tools/check_build_parity.py`. Add KD3 to the language contract test.

## Verification Contract

- `python3 tools/verify_pitch.py` and the full pytest suite pass.
- `bash tools/preflight.sh` passes (browser gates included), or each failing gate is shown to be
  pre-existing on `origin/main`.
- `python3 tools/check_build_parity.py` passes after U3.
- Rendered check of the new pitch on DEV in Standards and Large Type modes, desktop and phone
  width, with screenshots read by the orchestrator.

## Delivery

Branch `feat/pitch-persuasion-rewrite` → PR → review (`ce-code-review`) → merge → DEV deploy
(`deploy/deploy-dev.sh`). PROD advances only through a Publisher-authorized release. After the
DEV deploy, Damien gets a Decision Sheet with the taste questions: the spine and tone, the
paid-services wording, the ABA framing, and anything the review surfaces.
