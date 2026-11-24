---
title: Editor Theme Editing - Plan
type: feat
date: 2026-11-24
topic: editor-theme-editing
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-brainstorm
execution: code
---

# Editor Theme Editing - Plan

## Goal Capsule

- **Objective:** An editor such as Abby can try site-wide changes to fonts, colors, and block sizes, preview them across the whole site, and propose them for review, and no path lets her style one element by itself.
- **Product authority:** Damien's answer on 2026-11-24 ("All three layers"), recorded in Cockpit record `sonsteng-magnum-opus-2026-11-24-1707-abby-formatting-layers`. Source: Abby's email of 2026-11-24 ("I'd love to play around with fonts, colors, and block sizes, but I don't want to break the site").
- **Open blockers:** Starts after `docs/plans/2026-11-24-1104-feat-editor-queue-nov-requests-plan.md` ships.

## Product Contract

### Summary

Give editors three layers of control over style: a theme playground over curated site-wide values, a hint that steers one-off styling toward the matching role, and plain-English design requests that Claude Code drafts. Every change stays site-wide and passes review before it publishes.

### Problem Frame

Today the editor changes words only. Abby wants to experiment with the look, and she dislikes the current brown, while John likes the palette. A per-paragraph formatting tool would scatter one-off styles across 3,000+ blocks and drift from the site's design. The site already defines its look in about 70 shared values (colors, font roles, type scale, timing), so style edits can work at that level.

### Requirements

**Theme playground**

- R1. Editors open a theme panel that exposes a curated set of site-wide controls: brand colors, a font pairing chosen from a vetted list, base text size and scale, and card width and spacing.
- R2. Changes preview across every page, but only in the editor's own browser, until the editor proposes them.
- R3. A proposed theme enters the existing review flow, and Damien accepts or declines it as one unit. Nothing an editor does in the panel publishes on its own.
- R4. The panel refuses any color pairing that fails WCAG AA contrast, and every size stays within a set range.
- R5. The editor can reset the preview to the published theme at any time.

**Role hint**

- R6. When an editor selects an element and reaches for a style change, the editor names the element's role (for example, "Body paragraph") and offers to open that role's control in the theme panel. It never offers formatting for that element alone.

**AI design requests**

- R7. Editors can file a plain-English design request (for example, "Make all the section headings larger") through the same request flow that already handles text.
- R8. Claude Code on Damien's home box drafts each request as a site-wide style change. It attaches before-and-after screenshots from several pages, along with the accessibility audit's result.
- R9. A request that asks for a one-off change comes back either as a role-level proposal or as a clarifying question to the editor. It never comes back as a one-off style.

### Key Flows

- F1. **Abby tries a new palette:** She opens the theme panel, swaps the brown accent for another color, browses three pages in preview, and proposes the theme. Damien sees the proposal in review with a comparison and accepts it. **Covers R1–R3.**
- F2. **Abby enlarges a few paragraphs:** She selects three paragraphs and looks for a size control. The editor tells her these are body paragraphs and opens the body-text size control. **Covers R6.**

### Acceptance Examples

- AE1. Choosing a text color that fails AA against its background shows a refusal and leaves the preview unchanged. **Covers R4.**
- AE2. Closing the browser without proposing leaves the public site and other editors' views unchanged. **Covers R2, R3.**
- AE3. The design request "Make this one paragraph red" comes back as a question or a role-level proposal, never as a style on one paragraph. **Covers R9.**

### Scope Boundaries

- **Per-element formatting:** Excluded by design.
- **Layout changes beyond the curated controls:** Reach the site only through AI design requests (R7–R9).
- **Who else approves:** Damien accepts themes. Whether John also signs off on palette changes is his relationship call. Damien can make it per proposal.
- **Font licensing:** Only fonts the site already licenses, or adds as vetted dependencies, appear in the list.

### Outstanding Questions

- **Resolve before planning:** None.
- **Deferred to planning:**
  - **Theme storage:** Whether a theme lives as a data file that the build turns into the stylesheet, or as edits to the stylesheet itself.
  - **Preview mechanism:** How the preview reaches every page without publishing (for example, a stored local override that the editor script applies).
  - **Design-request cost:** How many requests to allow per day before Damien gets a nudge.
