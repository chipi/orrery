# Slice E5 brief — the station assembly player keeps one height across its phases (ISS2)

Read-only brief, written at HEAD `07ef5237c7a` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and one read-only node script over the phase data and module files (scratchpad `ebr-chip.mjs`, not in the repo; its output is quoted). Nothing was built, run in a browser or measured on screen; every line count below is arithmetic over character counts at an assumed width per character (§13). No code was changed. The working tree holds other agents' uncommitted edits: not touched. The slice has no open operator question in the plan (`CHANGE-INVENTORY.md` line 77: "Waits on: —"). ISS1 ("Watch live" as a chip) was A4's. The player is one component shared by `/iss` and `/tiangong`, so the fix lands on both; the plan names only the ISS.

## 0. Answer first

1. **The player's height depends on the length of the phase text, and the text varies a lot.** `StationAssemblyControl.svelte` is a box (`.assembly-overlay`, `:154-165`: `position: absolute; left: 50%; bottom: 5.5rem; width: min(92vw, 640px)`) with a row of controls, a "chip" paragraph that names the latest launch (`:117-146`: a rocket glyph, then `<name> · <launcher> · <date>`, `flex-wrap: wrap`, `:190-198`), and a hint paragraph (`:148-150`). Nothing fixes the height, so the chip wraps by its content and the box grows upward from its fixed bottom: the play button, the scrub bar and the date move up and down as the phase changes.
2. **Measured from the data (arithmetic): on `/iss` 18 of the 38 phases fit one line at 640 px and 20 need two; on a phone width 10 need one, 8 two, 17 three and 3 four or more.** `ebr-chip.mjs` (chip text = the glyph and a space + name + ` · ` + launcher + ` · ` + date; 72 characters a line at 640 px, 38 at 358 px; the assumption is §13 NV1): the 18 module phases are 29 to 51 characters (one line at 640); the 7 dock events 85 to 102 (two); the 13 truss and iROSA phases 84 to 129 (two), the longest "Z1 truss + PMA-3 (STS-92) · STS-92 Discovery · Wisoff + López-Alegría + Chiao + McArthur + Wakata + Duffy + Melroy · 2000-10-11" (129 characters, four lines on a phone). `/tiangong`: 4 module phases of 38 to 65 characters and 3 dock events of 75 to 129 (the longest "Shenzhou 15 — first 3-spacecraft handover (6 crew aboard) · Long March 2F · Fei Junlong + Deng Qingming + Zhang Lu · 2022-11-29"). The empty state ("Waiting for the first launch…", 29 characters) is one line. The hint ("Playback 20 s · scrub to any date · click pause to inspect", 58 characters at 0.74 rem) is one line at 640 and about two at 358 px.
3. **So the box changes by about one chip line (about 18 px at 13.76 px × 1.3) between a module phase and a dock or truss phase on a desktop, and by up to three lines on a phone**, which is what the operator saw ("changes height as content changes").
4. **Recommendation:** make the box a fixed structure: a constant control row, a **two-line chip block** (line 1 the phase name, bold; line 2 "launcher · date"), each line on one row with an ellipsis, the full text in the `title` and in the hidden live region, and the hint on one row with a reserved second row only at 480 px and below. No data edit. The module chip's click and the `data-testid`s stay (Decisions 22 and 23).
5. **No data change, no image, no new key** (14 locales untouched: the phase strings are English constants in `iss-assembly-phases.ts` and `tiangong-assembly-phases.ts` today, see NV5). One new e2e spec on three projects and one small UXD record.
6. **Needs the operator before code:** nothing blocks; 2 forks in §12 (numbers 22 and 23 of the E series).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 259-262; slice row 379)

| ID | Text | State at HEAD |
|---|---|---|
| ISS2 | "The assembly player changes height as content changes; fix its height." | The box grows with the chip's wrapped text (§2.1, §2.2). |

Done when (plan row 379): "no height change across phases". Plan wording that is outdated: none; the inventory's pointer to ADR-040 (`CHANGE-INVENTORY.md:77`) is wrong: `docs/adr/ADR-040.md` has no text on the assembly player (`grep -n -i assembly` over ADR-040, 041, 048, 049: nothing), so the rule has no home yet (§9).

## 2. Current state (file:line at `07ef5237c7a`)

### 2.1 The component

`src/lib/components/StationAssemblyControl.svelte` (237 lines): props `playing`, `progress`, `startEpoch`, `endEpoch`, `durationMs`, `latestChip { name, launcher, date, pickableId }`, callbacks `onTogglePlay`, `onScrub`, `onReset`, `onClose`, `onChipClick`. Markup: `.assembly-row` (`:71-114`) = play and reset `Chip kind="action"`, the range input, the date readout (`min-width: 6.2rem`, `:177-182`), a close chip; then either the filled chip paragraph (`:117-140`: the name as a button when `pickableId` is set, plain text for truss and iROSA phases, then ` · launcher · date`) or the empty one (`:142-146`), then the hint (`:148-150`, `station_assembly_hint` with the seconds). CSS: box `padding: 0.9rem 1.2rem 0.7rem`, `border-radius: 12px`, `z-index: 12` (`:154-165`); `.chip` margin `0.55rem 0 0`, `font-size: 0.86rem`, `flex-wrap: wrap`, `line-height: 1.3` (`:190-198`); `.hint` `font-size: 0.74rem`, `line-height: 1.25`, margin `0.35rem 0 0` (`:231-236`). No `min-height`, no clamp, no `white-space` rule.

### 2.2 Where the text comes from

`StationRoute.svelte:234-271` builds `assemblyPhases` = module phases (`name` from the module, `launcher` from `launch_vehicle`, `date` from `launch_date`) + `config.assembly.dockEvents` + `trussPhases`, sorted by epoch; `assemblyChip` (`:287-293`) is `currentChip(assemblyPhases, assemblyNowEpoch)` (`station-assembly-anim.ts:144-155`, the latest phase whose epoch is not after "now"). `buildPiecewiseMapping` (`station-assembly-anim.ts:179-193`) gives each distinct launch epoch an equal slice of progress, so a scrub value `(k + 0.75) / N` lands on phase k. The dock and truss strings are English constants (`iss-assembly-phases.ts:46-173`: 7 dock events and 13 truss and iROSA phases; `tiangong-assembly-phases.ts`: 3 dock events); module names come from the overlay. The component is rendered by `/iss` and `/tiangong` through `StationRoute` (`:1381-1415`), opened by the ASSEMBLY toggle (`:1548-1558`) or the mobile drawer tab (`:1655-1670`); it is not used by the AR replay.

### 2.3 Tests that touch it

`iss.spec.ts:145-180` (opens the overlay, scrubs to 0.75, the date readout changes), the same in `tiangong.spec.ts`; `iss-keyboard-nav.spec.ts`; `a11y.spec.ts` (the stations). None measures the box.

## 3. Screenshot list (before the build and again after; no browser was used for this brief)

Desktop 1440×900 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), phone 844×390 (`mobile-landscape-chromium`), `en-US`; `ar` once (RTL):
1. `/iss` with ASSEMBLY open at three phases: a module (Tranquility), a dock event (Crew Dragon Demo-2) and the longest truss phase (Z1): before, the box at three heights; after, one height with the controls at the same y in all three.
2. The empty state ("Waiting for the first launch") and the last phase.
3. `/tiangong`: Mengtian and the Shenzhou 15 handover.
4. The phone (390 and 844×390) with the mobile drawer closed and open: the box against the drawer and the module panel.
5. Hover (title) and keyboard focus on the chip name.

## 4. Proposal

### 4.1 A box with a fixed structure

- Control row unchanged (chips 30 px fine pointer, 44 px touch, A4).
- Chip block: a fixed-height block of two rows, `min-height: calc(2 * 1.3em)`. Row 1: the rocket glyph and the phase name (a button when `pickableId`, else static), bold, `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`. Row 2: `launcher · date`, the same ellipsis, the date never cut (it is last, `flex: none`; the launcher takes the ellipsis). The empty state fills the same two rows (row 1 the waiting text, row 2 empty).
- The full phase text (`name — launcher — date`) goes in the chip block's `title` and in the existing `aria-live` region, so a screen reader still hears the whole phase and a pointer user can read the cut text; a touch user opens the module panel by the name (unchanged) where there is one.
- Hint: one row with the same ellipsis above 480 px; at 480 px and below `min-height: 2 rows` so it never changes the box height (Decision 23).
- The box keeps `bottom: 5.5rem` and its width rule; with a fixed height the controls no longer move when a phase changes.

### 4.2 Same fix on both stations

One component, so `/tiangong` gets it with `/iss`. The plan names the ISS only; Decision 22 is about the shape, not the scope (the rule "a decision applies project-wide" and the shared component decide the scope).

### 4.3 What is not changed

The phase strings (including the crew lists in the truss phases) stay as data: they are shown in full in the title and the live region, cut on screen only. The assembly durations, the scrub mapping, the `data-testid`s (`station-assembly`, `assembly-play`, `assembly-reset`, `assembly-scrub`, `assembly-date`, `assembly-chip`, `assembly-chip-name`) and the AR replay are untouched.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on E5 |
|---|---|
| A4 (one chip) | The play, reset and close controls are `Chip kind="action"` (30 px fine, 44 px touch): the control row is already a fixed height; only the chip and hint paragraphs vary. ISS1 ("Watch live" chip) is built. |
| A2, A3, B1 | No shell, accent or panel rule applies to this overlay (it is a scene HUD). Its colours (`#ffd57a` date, `rgba(8,12,18,0.92)` fill) are untouched. |
| L45 (UXD-025) | The `/iss` module and visitor lists got round thumbs (T3a); the player has none and gets none. |
| L26 (layout risks) | The deferred list names the Explore left column, the time dock and the nation legend; the station overlay was not on it. Shot 4 checks it against the mobile drawer. |
| E1 to E4 | No interaction. |

Plan ideas now outdated: none; "no height change across phases" is the acceptance rule as written.

## 6. i18n impact (14 locales)

None. The hint and the waiting text keep their keys (`station_assembly_hint`, `assembly_waiting_first_launch`); the title text is built from the phase fields already shown. If Decision 23b hides the hint on touch no key is removed.

## 7. Data changes

None.

## 8. Tests to add or change

**Unit (vitest):** none needed for CSS; a data guard in `iss-assembly-phases.test.ts` that every dock and truss phase has non-empty `name`, `launcher` and an ISO `launch_date` (the second row's contract), if not already asserted.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `station-assembly-height.spec.ts` for `/iss` and `/tiangong`: open ASSEMBLY (the toggle on desktop, the drawer tab on touch, as `iss.spec.ts:145-163`), then set the scrub input to 60 evenly spaced values from 0 to 1 (more than the 38 and 7 distinct phases, so every phase is shown at least once, including the empty state), and for each read `getByTestId('station-assembly').boundingBox()` and the y of `assembly-play`: assert max minus min of the box height is at most 1 px, the control row y is constant within 1 px, and the box stays inside the viewport and does not overlap the mobile drawer's top edge.
2. Same spec: the longest phase (Z1; Shenzhou 15) has `scrollWidth` greater than `clientWidth` on its chip row (the ellipsis is doing the work) and a non-empty `title` with the whole phase text.
3. `iss.spec.ts:145-180` and the Tiangong twin unchanged, must pass; `a11y.spec.ts` stations 0 serious with ASSEMBLY open.

## 9. Docs to update by name

- **UXD-NNN** (new, `docs/uxs/decisions/UXD-NNN-station-assembly-player-fixed-box.md`; next free number at build time): the fixed two-row chip block, the ellipsis, the title and live text; row in `docs/uxs/decisions/README.md`; row E5 in `docs/uxs/CHANGE-INVENTORY.md` (line 77: replace "ADR-040" in "Will touch" by `TA.md`, the components README and the Design System section below, since ADR-040 does not cover the player); close ISS2.
- `docs/concept/05_Design_System.md`: a short section "Station assembly player" (box width, row structure, fixed chip block; next free §5.N at build time, E1 takes §5.18); `docs/adr/TA.md` lines 165-172 (the `iss-assembly-phases`, `station-assembly-*` entries: the player's layout rule) and line 352 (`StationAssemblyControl` siblings).
- `src/lib/components/README.md` line 12 (the Stations clause: `StationAssemblyControl` keeps a fixed height), header comment of `StationAssemblyControl.svelte`.
- `docs/prd/PRD-010.md` is not changed (it states the assembly sequence as content, not the player's layout).

## 10. Phased plan

1. **E5a the box:** the height spec red first on `/iss` (it fails on today's wrapping), then the markup and CSS of §4.1; the Tiangong run.
2. **E5b the details:** the hint rule at 480 px, the title and live text, shots 1 to 5, docs of §9; `npm run preflight` once before a push.

## 11. Acceptance checks

- Across 60 scrub positions the player's box height varies by at most 1 px and the control row does not move, on `/iss` and `/tiangong`, on all three projects (e2e).
- The longest chips are cut with an ellipsis and carry the whole text in `title` and in the live region; the module name still opens its panel.
- No overlap with the mobile drawer at 390 and 844×390 (shot 4, e2e bounds check).
- Docs of §9 updated (the inventory row no longer points at ADR-040); the inventory row E5 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the five E briefs)

22. **How the chip text stays one height.** **(a) Two fixed rows (name, then launcher and date), each one line with an ellipsis, the whole text in the title and the live region** (recommended: the height is the same at every width by construction; the cut text is secondary (crew names, vehicle detail) and still reachable); (b) three reserved rows with wrapping allowed, clamped at three (most phases show whole at 640 px; the box is 18 px taller than it needs to be for 18 of 38 ISS phases, and 3 phases still clip on a phone); (c) shorten the 20 dock and truss strings in the data so each fits one line at 640 px (no cut text, but 20 hand-edited strings in two files, the crew lists lost from the chip, and the phone still wraps).
23. **The hint on a phone.** **(a) Keep the sentence; reserve two rows for it at 480 px and below and one above** (recommended: the box never changes height and the instruction stays); (b) hide the hint on touch (the text says "click pause to inspect", written for a pointer; the box is 18 px shorter on a phone); (c) one row with an ellipsis everywhere (the instruction is cut on a phone).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. The line counts are arithmetic: 72 characters a line at 640 px comes from 640 px minus 2 × 1.2 rem padding (about 602 px) over 8.26 px a character (0.6 em at 0.86 rem in the mono face); 38 at 358 px from the same rule at `min(92vw, 640px)` for a 390 px viewport; the real font metrics, the emoji width and the actual breaks were not measured. The box heights (about 103 to 121 px on a desktop) were summed from the CSS, not read from a rendered box.
- NV2 The mobile layout was not traced: `bottom: 5.5rem` against the drawer (the drawer's `--mcd-bottom: calc(8px + env(safe-area-inset-bottom, 0px))` set in `StationRoute.svelte` next to the drawer tabs) and the 844×390 landscape height (the box is 103 to 121 px of 390) were not looked at; the player may already sit over the drawer's tab row.
- NV3 Whether the date readout's `min-width: 6.2rem` or the 30 px/44 px chips change the control row's height between desktop and touch is unchanged by this slice; that the row is constant within one breakpoint was read, not measured.
- NV4 The title attribute is not announced by every screen reader; the live-region text is the accessible path, and its existing behaviour (`aria-live="polite"` on the hint only, `StationAssemblyControl.svelte:148`) means the chip text is not announced when it changes today: the live-region part of §4.1 is a small accessibility addition the plan did not ask for and a reviewer may cut.
- NV5 The dock and truss strings are English constants in `.ts` files, so they are English in every locale today; that is a translation gap this slice does not touch and did not measure.
- NV6 `tiangong-assembly-phases.ts` was matched by regex for names, launchers and dates (3 events); a phase string with a quote or line break in it would have been missed by `ebr-chip.mjs`.
- NV7 AR assembly replay (`ar/ar-assembly.ts`) has no HUD of this kind; whether another overlay shows the same chip text (the timeline strip at `StationRoute.svelte:1361` and `:1593`) and has the same height problem was not read.
