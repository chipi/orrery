# UXS-000 — Orrery UX architecture

> Status · Draft v0.1 (2026-11-11)
> Visual fidelity · n/a — this document holds no visual rules of its own
> IA anchor · [IA.md](IA.md) §overview
> Related · [UX decision records](decisions/README.md), [change inventory](CHANGE-INVENTORY.md), [UX records](records/README.md)

## Summary

How Orrery's UX is designed, decided and kept true. It names the design artefacts, says which one
is authoritative for what, fixes the path every UX change takes from the operator's feedback to
shipped code and a guard test, and states what "done" means for one slice of work. The visual and
interaction rules themselves live in the documents it points to.

The model is the Close Listening player's `UXS-000` (UX decisions, records, backfill ledger and
change inventory), adapted: Orrery has no journeys document and no living mockup, and its decider
is the operator.

## The artefacts

| Artefact                  | Where                                                                                             | What it is                                                                                                                                                                                                                | Ids                                    |
| ------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Surface specs**         | [index](index.md): `UXS-001` … `UXS-006`, `UXS-013` … `UXS-016`                                   | The visual and interaction contract for one surface or concern. Each anchors to a section of IA.md                                                                                                                        | UXS-NNN                                |
| **Information architecture** | [`IA.md`](IA.md)                                                                               | Surfaces, nav groups, shell regions, URL structure, shared tokens. Every UXS anchors to it by section                                                                                                                     | `§section` anchors                     |
| **Design system doc**     | `docs/concept/05_Design_System.md`                                                                | The long-form rules: colour, type, components, panel anatomy, scene conventions                                                                                                                                           | headings                               |
| **Agent design rules**    | `AGENTS.md` §"Design system — do not change without UXS update"                                   | The short version every coding agent reads before touching a style                                                                                                                                                        | —                                      |
| **Architecture map**      | `docs/adr/TA.md`                                                                                  | Every route, subsystem, scene, contract and constraint, each with the ADR that locked it. Carries the rendering rules that bind the look (for example the one-output-step rule)                                           | sections                               |
| **Code and tokens**       | `src/lib/styles/tokens.css`, the components under `src/`                                          | What ships. `tokens.css` states in its first lines that it is authoritative for colour, type and spacing                                                                                                                  | CSS custom properties                  |
| **UX decisions**          | [`decisions/`](decisions/README.md)                                                               | One record per UX decision: context, options, the decision, its consequences. The operator decides. Specs and the rules documents state the rule and link the record. Architecture decisions stay ADRs                    | UXD-NNN                                |
| **Backfill ledger**       | [`decisions/BACKFILL.md`](decisions/BACKFILL.md)                                                  | Older UX decisions found in the specs, IA, AGENTS.md, ADRs and the operator's notes, one row each. History, not re-decided                                                                                                | B-NNN                                  |
| **UX records**            | [`records/`](records/README.md)                                                                   | Dated records of what happened: an operator feedback list, a review, a plan. Written once; a later event gets a new record                                                                                                | UXR-NNN                                |
| **Change inventory**      | [`CHANGE-INVENTORY.md`](CHANGE-INVENTORY.md)                                                      | Every UX slice in flight, the decisions behind it, its status, and which spec or ADR it will touch                                                                                                                        | slice ids (A1, B2 …)                   |
| **Working plans**         | `docs/wip/2026-11-11-ux-feedback-plan.md`, `…-0.9.9-plan.md`, `…-slice-*-brief.md`                 | The operator's numbered feedback, the slice plan, the open questions, and one brief per slice. Not published (the docs build excludes `wip/`)                                                                             | point ids (X1, P3 …), Q-ids, D-ids     |
| **Guards**                | see [Guards](#guards)                                                                             | Tests and builds that keep a decided rule true                                                                                                                                                                            | —                                      |

The PRDs say what and why; ADRs and RFCs own architecture and behaviour; the UXS documents, IA and
the design system own the visual and interaction contract.

## Which one is right

- **The code is the truth about what ships.** The specs and UXDs are the truth about what should
  ship. When they disagree it is a finding: log it as a spec-to-code mismatch
  ([below](#spec-to-code-mismatches-open)), and decide it. Never resolve it silently in either
  direction.
- **A UXD outranks the prose it changed.** A rule in IA, a UXS, the design system doc or AGENTS.md
  that contradicts an accepted UXD is stale; fix the prose and link the UXD.
- **`tokens.css` outranks any restated number.** A size, colour or spacing value in a document that
  differs from `tokens.css` is a mismatch to log, not a second source.
- **The UXS boxes are not a record of what shipped.** Each UXS carries an as-built note (2026-10-16,
  for example `UXS-001.md` line 93): for shipped behaviour read `docs/adr/TA.md` and `CHANGELOG.md`.
- **Operator operator notes are inputs, not authority.** A decision first recorded in a private
  note counts once it has a UXD or a backfill row that quotes its source and date.

## How a UX change moves

1. **Operator feedback** is captured as a dated record ([UXR](records/README.md)) with numbered
   points. The full list stays in the working plan; the record summarises it by area.
2. **Slice brief** (read-only, before any code): the exact search patterns that define "old", the
   full hit list across the repo, the allow-list with reasons, and the docs and tests that state or
   guard the rule. The implementer works from that list, not from sample screens.
3. **Decision**: where a choice is open, the question goes to the operator once, before the slice
   that needs it. The answer is written as a [UXD](decisions/README.md), `accepted` only on the
   operator's recorded go (date and where).
4. **Implement** against the brief. Tests move with the work.
5. **Independent check**: a fresh agent that did not write the code re-runs the brief's searches,
   the definition-of-done items and the affected suites on all three Playwright projects
   (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`), and reviews the diff.
   Findings go back to the implementer; the slice loops until the checker reports clean.
6. **Operator screenshots**: the lead reads the checker's evidence, then sends the operator small
   before/after screenshots (13-inch laptop and phone). The operator validates visually.
7. **State the rule**: the specs, IA, the design system doc, AGENTS.md and TA.md say the new rule
   and link the UXD. A decision is not done until its rules say it.
8. **Guard**: where the rule can be checked, a test is added, site-wide where possible.

Method for the surface slices follows the `ux-baseline-review` flow: a before/after look first,
the operator approving per screen, then the change, then e2e.

## Definition of done — every slice

Operator, 2026-11-11 ("no partial updates, quality over speed"; plan lines 467–481 in
`docs/wip/2026-11-11-ux-feedback-plan.md`). A slice is reported done only when the lead has checked
all of these, with the command and its output:

1. **Whole project.** The decision is applied in every route and component, proven by a repo-wide
   search for the old pattern that returns nothing outside a documented allow-list.
2. **Docs.** Every doc that states the rule says the new rule (AGENTS.md design rules, style
   guides, TA.md, READMEs of touched folders).
3. **Tests move with the work.** Tests whose expectations changed are adjusted, new tests guard the
   rule (site-wide where possible), obsolete ones are removed; the affected suites are green on
   `desktop-chromium`, `mobile-chromium` and `mobile-landscape-chromium`, with nothing skipped or
   left red.
4. **Locales.** Any new or changed text exists in all 14 locales through the glossary and the
   standard i18n tools; `validate-data` is green.
5. **The UXD exists and the rules link to it.** Every decision the slice implements has an accepted
   [UXD](decisions/README.md), and each spec, IA, design system, AGENTS.md or TA.md line that states
   the rule links to it. (Added to the operator's four by this document.)

Then the operator gets a short status and small before/after screenshots (13-inch laptop and phone).

## Guards

| Guard                                                                    | Keeps true                                                                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `tests/e2e/type-floor.spec.ts`                                           | no visible text below 11 px on any route in `scripts/site-routes.mjs` or in one open panel per panel type (see UXD-002)           |
| `src/lib/three/output-step-rule.test.ts`                                 | every `EffectComposer` ends in an OutputPass and colour textures carry a colour space (see UXD-004)                              |
| `tests/e2e/scale-index.spec.ts`                                          | the INDEX on all eight scales: hidden but in the DOM, one Tab stop, search, 30 / 44 px targets, black holes by scale, scale jump (see UXD-017) |
| `tests/e2e/select-focus.spec.ts`                                         | select = focus from every entry point, the ring rule, chip-off clears a selection (see UXD-019)                                  |
| `tests/e2e/explore-readability.spec.ts`, `src/lib/universe/scene-pins.test.ts` | the 12 px label, the 44 px ring, the placement pass, the steady label offset (see UXD-020)                                 |
| `tests/e2e/visual.spec.ts` snapshots                                     | the rendered baseline of the routes it covers; regenerated on the Linux runner when a decided rule changes them                  |
| `npm run docs:build`                                                     | every page under `docs/` builds with VitePress; no unresolved link                                                               |
| `npm run preflight` (pre-push hook)                                      | typecheck, lint, tests, `validate-data` and build. Does not run e2e and is not a byte-for-byte mirror of CI (see `CLAUDE.md`)    |

A new shared rule that can be checked arrives with its check. Accepted rules with no guard yet: the
link/accent colour (UXD-001, a repo-wide search for the old teal is the slice's check), the home
route-card title (UXD-003), and three rules whose guard is planned in their slice: the panorama
opening heading (UXD-007, e2e in slice D2), the deep-sky viewer fit (UXD-009), the ruler science cards
(UXD-010, a unit test over the data in slice B2).

## Open

Nothing below is a UXD. Each moves to one when the operator answers.

**Operator decisions (asked once, before the phase that needs them)** — plan lines 24–32:

| Id | Question                                                                                                       |
| -- | -------------------------------------------------------------------------------------------------------------- |
| D1 | Full redesign now, or this consistency pass first (proposal: consistency pass)                                 |
| D2 | Home: video instead of the hero graphic? A Higgsfield test video is a paid run: size and cost estimate first  |
| D3 | TV home and TV app: scope                                                                                      |
| D4 | Explore: drop the second-level nav and use the breadcrumb as the way through the levels?                       |
| D5 | Explore: zooming into Earth, Mars, Moon, Venus switches to the world page, or an explicit link?                |
| D6 | Launch camera: the operator shares example shots first                                                         |
| D7 | Missions era filter designed with Higgsfield (paid) or in code                                                 |

**Questions for the operator** — plan lines 402–414 (Q1 and Q2 are answered: UXD-001, UXD-002):

| Id  | Question                                                                                     |
| --- | -------------------------------------------------------------------------------------------- |
| Q3  | "Share": a renamed card overlay, or a real share-link action?                                |
| Q4  | A mission link in a body panel: open the mission panel in place, or go to `/missions`?       |
| Q5  | Chip groups: group every world (On ground / In space), or flatten Earth?                     |
| Q6  | Panel close X: scrolls away with the content, or a slim fixed header bar?                    |
| Q7  | Credits and colophon length: every section collapsed with its count, or "first N + show all"? |
| Q8  | Moon traverses: line style only, or the Mars extras (patches, photos, stops)?                |
| Q9  | "Launcher sketches": the launchers inside the 198 cutaways, or the exploded launcher art?    |
| Q10 | Library: which "JPL planetary models", and which landing and rover research items?           |

**Clarified from screenshots, fix described, no separate operator go recorded** (plan lines 417–425):
MW3 (Sagittarius A\* panel gets the EHT 2022 image as its hero; the lensing render becomes an
explicit action). It is planned in slice B3 and becomes a UXD with the slice's screenshots.

**To check at the end (operator, 2026-11-11)** — plan lines 462–465: science diagrams and Lab art
keep their own colours for now; review whether they should also move to the new palette once the UI
blue is in place.

**Unreconciled between decisions** (found while writing this document, not decided anywhere; the
`#889fe7` question is settled: it stays beside blue D, UXD-001, plan line 460):

- The plan says "lead/overview 15–16 px" for Q2; the tokens say 16 px, 15 px under 600 px width
  (UXD-002 records the tokens).

### Spec-to-code mismatches (open)

Read at commit `9fdf4cc4a6b`. Logged, not resolved here (another change set is editing those files).

| Id    | Document says                                                                                                         | Code says                                                                       |
| ----- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| SC-1  | CLOSED by slice A6 (2026-11-12): one 52 px bar from one token, `--nav-bar-height: 52px`, `--nav-height` built from it, and the docs name the real nav z-index 40 (IA said 20). Was: nav bar height 52 px in `IA.md` lines 52–55, 179, 236; `AGENTS.md` line 747; `05_Design_System.md` lines 158, 207 ([UXD-016](decisions/UXD-016-compact-nav-and-more-menu.md)) | `--nav-bar-height: 52px` in `tokens.css` (was 60 px, and `--nav-height` re-typed `60px`) |
| SC-2  | Desktop panel width 314 px: `IA.md` lines 181, 237; `AGENTS.md` lines 501, 749; `05_Design_System.md` line 167         | `--panel-width: 400px` in `tokens.css` (its own comment: 314 → 360 → 400)       |
| SC-3  | `--color-text-dim` is `rgba(255,255,255,0.35)`: `IA.md` line 203; `05_Design_System.md` line 51 (0.25–0.35)             | `--color-text-dim: rgba(255, 255, 255, 0.6)` in `tokens.css`                    |
| SC-4  | CLOSED by slice A3 (2026-11-12): UI teal is gone, the tokens and docs say blue (UXD-001). Was: spec versus decision (not spec versus code): teal `#4ecdc4` is a design colour (`IA.md` line 198; `AGENTS.md` line 720; `05_Design_System.md` line 48; UXS-002/003 HUD and CAPCOM colours) | UXD-001 says every UI teal becomes blue, but `tokens.css` lines 14 and 33 (`--color-teal`, `--color-tier-intro`) still define `#4ecdc4` until slice A3 |
| SC-5  | CLOSED by slice A3 (2026-11-12): `--color-accent` is `#5070ff`, the one UI accent, `#4466ff` retired, `--color-accent-text` kept as an alias. Was: `IA.md` line 197 and `AGENTS.md` line 719 name the accent `#4466ff` ("Primary accent", "Accent blue") | `tokens.css` line 9 `--color-accent: #4466ff` (brand: borders, outlines, fills) and line 13 `--color-accent-text: #5070ff` (the accent as text). UXD-001 calls `#5070ff` the "link blue" / UI accent. Which token is the UI accent, and whether `#4466ff` stays for borders and fills, is left for slice A3 to settle |

## Next — lines that must link to a UXD

Owner: the change set that edits these files (not this one). Each line states the current rule and

History note: the line numbers and "teal" wording in this table describe the files as they were before slice A3 (2026-11-12); those lines now say blue.
gains a link to the UXD, in the same change as the rule.

| File and lines                                                                        | Must link to                                                         |
| ------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `AGENTS.md` 717–723 (colour block: "Teal", "Accent blue")                             | UXD-001                                                              |
| `AGENTS.md` 729–745 (type scale, floor, italic rule, canvas allow-list)               | UXD-002                                                              |
| `AGENTS.md` 747–750 (nav 52 px, panel 314 px) — fix to the tokens first (SC-1, SC-2)  | none (mismatch); then UXS-000 §Spec-to-code mismatches               |
| `AGENTS.md` §"Performance — 3D scene discipline" (line 537 onward): add the one-OutputPass rule | UXD-004                                                    |
| `AGENTS.md` 91 and 959 (no staging tier)                                              | UXD-005 (and ADR-097)                                                |
| `docs/adr/TA.md` 371 (composer pipeline and colour, one output step)                  | UXD-004                                                              |
| `docs/uxs/IA.md` 193–215 (colour tokens, link tier colours, teal at 198 and 213)      | UXD-001                                                              |
| `docs/uxs/IA.md` 218–231 (typography tokens)                                          | UXD-002                                                              |
| `docs/uxs/IA.md` 121–152 (§home-cards)                                                | UXD-003 (route-card titles, the removed icon text)                   |
| `docs/uxs/IA.md` 233–242 (spacing tokens 52 px, 314 px) and 203 (text-dim)            | none (SC-1, SC-2, SC-3 first)                                        |
| `docs/uxs/UXS-013.md` 63 (`--size-lead`) and the hero/card typography section         | UXD-002, UXD-003                                                     |
| `docs/uxs/UXS-001.md` (detail panel tabs; no star-panel section today)                | UXD-008 (add a star-panel section), UXD-002 (panel overview text)    |
| `docs/uxs/UXS-002.md` 38, 40, 65, 84 and `UXS-003.md` 42, 89–90 (teal HUD and CAPCOM) | UXD-001                                                              |
| `docs/uxs/UXS-004.md`, `UXS-005.md`, `UXS-006.md` (size and italic lines)             | UXD-002                                                              |
| `docs/uxs/UXS-006.md` (Moon map; no panorama section today)                           | UXD-007 (add a panorama section; surface sites share the scene, ADR-072) |
| `docs/uxs/UXS-014.md` 25 onward ("Selecting & understanding an object")               | UXD-008 (star panel), UXD-010 (orbit ruler science cards; no ruler section today) |
| `docs/uxs/UXS-016.md` §1 (scale ladder rail)                                          | UXD-010 only if the ruler is specified there; otherwise none         |
| `docs/concept/05_Design_System.md` 48, 58, 61, 72, 87, 90, 97, 432 (teal)             | UXD-001                                                              |
| `docs/concept/05_Design_System.md` 125, 144–148, 215 (type rules)                      | UXD-002                                                              |
| `docs/concept/05_Design_System.md` 158, 167, 207, 360 (52 px, 314 px)                 | none (SC-1, SC-2)                                                    |
| `docs/guides/` and `docs/ops/*` that name staging                                     | UXD-005 (and ADR-097)                                                |
| `docs/adr/ADR-014.md`, `ADR-070.md`, `ADR-071.md`, `ADR-082.md`, `ADR-083.md`         | already carry their supersession by ADR-097 (not UX; listed for completeness) |
| no spec yet for the deep-sky viewer (`/gallery/deep-sky`)                             | UXD-009 (add the rule to the spec that will cover the gallery)       |

Line numbers are as read at `9fdf4cc4a6b`; re-grep before editing.

## Revision history

| Date       | Change                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------- |
| 2026-11-11 | Created: the artefacts, precedence, the change flow, the definition of done, the guards and the open items |
