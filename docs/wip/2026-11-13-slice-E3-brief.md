# Slice E3 brief — the missions page: one agency palette, the mission colour on its filter, an era strip that reads (MI2, MI3)

Read-only brief, written at HEAD `07ef5237c7a` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and read-only node scripts (scratchpad `ebr-palette.mjs`, `ebr-contrast.mjs`, `ebr-epoch.mjs`, not in the repo; their output is quoted). Nothing was built, run in a browser or measured on screen; widths and contrasts below are arithmetic (§13). No code was changed. The working tree holds other agents' uncommitted edits: not touched. **This slice waits on the operator's D7** (`docs/wip/2026-11-11-ux-feedback-plan.md` line 32: "D7 Missions/era filter designed with Higgsfield (paid) or in code"; `CHANGE-INVENTORY.md` line 75 "Waits on: D7"). **D7 is not answered anywhere:** the plan's "Answers (2026-11-11)" (lines 431-483) has no D7, `UXS-000-orrery-ux-architecture.md:132` and `docs/uxs/decisions/README.md:96` still list "D1 to D3, D5 to D7" as open, and the "25 recommendations" approval of 2026-11-13 covered C6 to C10 (`2026-11-13-slice-C9-brief.md:152`) and the D briefs, not E3. So Decision 12 is the whole of the open question; the palette and the dots (MI3) are built for either answer, the strip is not.

## 0. Answer first

1. **"Three palettes" is right for the code and short by one for the data.** Counted from the files: (1) `src/lib/agencies.ts` `AGENCIES`: 37 agencies, each with one `color`, 32 distinct values (the badge and card colour); (2) `src/lib/surface-map/nation-palette.ts` `NATION_COLORS`: 14 nations, 14 colours (the surface-site markers and the nation legend); (3) the same file's `nationChipFor`: 20 return sites, 12 distinct colours plus a neutral (the lighter "chip" colour of the Worlds' INDEX dots, the regime panel and every list thumb ring through `agencyRingColor`); and (4) **the `color` field the mission data carries**: 15 distinct values over 126 missions in `static/data/missions/index.json` (and in each mission file), which is what the missions card actually draws (`+page.svelte:600`, `:632`). Of the 126, 115 equal the lead agency's registry colour and **11 differ**: otv-1 to otv-7 (`#1a3a8a` against USSF `#1D2951`), soyuz-1 and soyuz-11 (`#CD1F2D` against `#cc4444`), huygens (`#FFD700` against ESA `#003247`), near-shoemaker (`#D97D2C` against NASA `#0B3D91`). The fleet page uses none of these: its card accent is a category palette (`+page.svelte:218-231`, 12 colours).
2. **The approved §2.4 already says what the palette is, so "one palette" cannot mean new values.** Design System §2.4 (operator-confirmed 2026-11-13, teal and cyan identity colours included, `05_Design_System.md:79-146`) is a two-column table: Badge (= `agencies.ts`) and Map or regime chip where it differs (= `nationChipFor`), plus a Nations table. So the palettes are one concept (an agency has a badge colour and a chip colour) kept in two files by hand. Reconcile by one registry that holds both fields per agency, **values unchanged**, and `nationChipFor`/`agencyRingColor` reading it (Decision 10).
3. **The mission colour cannot go onto the filter as is: 7 of the 13 agency chips would be nearly invisible.** The agency chips are derived from the loaded missions (`+page.svelte:174-176`): ASI, Blue Origin, CMSA, CNSA, ESA, ISRO, JAXA, NASA, Roscosmos, SpaceIL, SpaceX, UAESA, USSF. Their card (badge) colours against the page background `#04040c` (`ebr-contrast.mjs`): NASA 2.03, ESA 1.51, JAXA 1.72, SpaceIL 2.20, SpaceX 2.49, USSF 1.45, Blue Origin 1.35 are under the 3:1 floor for a graphic; ISRO 9.59, CNSA and CMSA 4.31, Roscosmos 4.36, UAESA 4.20, ASI 4.71 pass. `Chip` takes one `tone` that colours both the dot and, when on, the edge, so a dark brand colour would also make the selected state invisible. The chip palette passes everywhere (all 12 colours 3.05 to 10.41) but gives **6 distinct colours for the 13 agencies** (`#3b82f6` for NASA, SpaceX, USSF and Blue Origin; `#1d4ed8` for ESA, JAXA, SpaceIL and ASI; `#dc2626` for CNSA and CMSA). Decision 11.
4. **The era strip's problems are measurable.** `EpochTimelineStrip` draws nine bands on a proportional 1957 to 2040 axis, 56 px high, in one row (`EpochTimelineStrip.svelte:61-103`, `epoch-bands.ts:55-77`). At the page's 1356 px strip: First Steps is 65 px for a label that needs about 93, Lunar Era 49 px for about 78, Lunar Return 98 px for about 100 (arithmetic, 7.15 px a character); two bands overlap in time (First Stations 1973 to 1986 and Shuttle & Mir 1981 to 1998) and are drawn over each other; the 34 % of missions flown 1957 to 1972 (43 of 126: first-steps 5, space-race 27, lunar-era 11) take 18 % of the width (245 of 1356 px) while Commercial Era alone holds 32; the strip sits behind the FILTERS chip (closed by default) and the same component serves `/fleet` with different counts. The mobile fallback (under 720 px) is a different thing: a chip carousel with `dot` and `tone`.
5. **There is a finished-looking but unused alternative in the tree:** `src/lib/components/TimelineNavigator.svelte` (535 lines: one dot per mission coloured by `mission.color`, row-packed, two drag handles, pinch zoom, a reduced-motion number-input variant). Nothing imports it (`git grep TimelineNavigator -- src` finds the file and a comment); `UXS-004.md:104-160` still specifies it as the missions timeline, so that spec section is wrong about the code.
6. **Recommendation:** (a) one registry (`agencies.ts`) with `color` and `chip`, values as approved, 11 mission colours corrected to it and a test (Decisions 10 and 14); (b) the card's own colour as a 10 px dot with the §5.13 1 px light ring on each agency chip, active state unchanged (Decision 11); (c) D7: design it in code with two prototype sheets, no paid run (Decision 12); (d) the strip becomes nine equal tiles with a count bar, no proportional axis (Decision 13).
7. **i18n: 0 to 1 key; data: 11 mission files and the index; no image.** Needs the operator before the strip: D7. Needs the operator for the palette work: 4 forks (10, 11, 13, 14 of the E series).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 241-247; slice row 377)

| ID | Text | State at HEAD |
|---|---|---|
| MI2 | "Timescale/era filter needs to be much better; design one (Higgsfield? D7)." | Nine proportional bands, three labels clipped, one overlap, inside the closed FILTERS (§2.3). |
| MI3 | "Each mission has a colour code; bring it to the matching filters." | The card carries the colour; the agency chips show a logo or the name, no colour (§2.2). |

Done when (plan row 377): "shots". Plan wording that is outdated: "one agency palette (three exist today)" counts the code and misses the data field (§0.1); "colour dots in the agency filter" assumes the card colour is readable as a dot (§0.3). MI1 (filters look ugly, tiny text, count placement) was A4's and is built (UXD-014, `+page.svelte:464-491`).

## 2. Current state (file:line at `07ef5237c7a`)

### 2.1 The palettes

- `agencies.ts:47-336` `AGENCIES` (`short`, `full`, `logo`, `color`, `aliases`); `agencyColor(input)` `:424-427` takes the first partner's colour. Consumers: `AgencyRow.svelte:23` only.
- `nation-palette.ts:15-31` `NATION_COLORS`; `:48-92` `nationChipFor(site)` (agency first, then nation: 20 colour returns); `:94-111` `agencyRingColor(agency)` with `RING_ALIAS` (Roscosmos to ROSCOSMOS, CMSA to CNSA, USSF and Blue Origin to USA). It returns a colour for all 13 mission-index agencies. Consumers: `RegimePanel`, `StationRoute`, `SiteEntityPage`, `FleetEntryPanel`, `fleet/[id]/+page.svelte` (thumb rings).
- Mission data `color`: required by `mission.schema.json` and `mission-index.schema.json`; read by `missions/+page.svelte:600`, `:632-636` (`--accent`, badge fill, `readableTextOn`), `MissionPanel.svelte:317` (`AgencyRow color`), `HudControls.svelte:247`, `:368` (thumb ring `entry.color`), `TimelineNavigator.svelte:295`.
- Docs: Design System §2.4 (as above); **`docs/uxs/IA.md:286-296` §Agency colours is a fourth, older table that disagrees with the code**: `color-esa #003299` (code `#003247`), `color-roscosmos #8B0000` (code `#cc4444`), and lists seven agencies of 37.

### 2.2 The missions page chrome

`+page.svelte:464-491` the FILTERS chip and CLEAR; `:493-500` the strip inside `{#if filterState.expanded}`; `:501-579` the radiogroups: destination (11 options, `:298-310`), status (6), crew (3), agency (`:538-578`: an `All` chip then one `Chip kind="choice" class="agency-chip"` per agency with the logo or, on a failed load, the name; `aria-label` the full name). The fleet page repeats the structure (`fleet/+page.svelte:535-601`) and its status chips already carry `dot` and `tone` (`STATUS_TONE`, `:235-243`); the missions status chips do not. `chip.css:6` already says the colour of a "mission colour" arrives per chip as `--chip-tone`.

### 2.3 The era strip

`EpochTimelineStrip.svelte` (421 lines): `countByEpoch` and `selected` in, `onSelect` out; desktop `.axis` 56 px with absolutely positioned `button.band` (`:61-103`, CSS `:134-310`, three `a4-keep` comments "MI2 redesigns it" at `:175`, `:205`, `:218`), ticks 1957, 1969, 1986, 2011, 2030, a "today" line (`:297-313`); under 720 px a `ChipGroup` of `Chip kind="choice" dot tone` (`:106-125`). Bands from `epoch-bands.ts:55-77`: ids first-steps, space-race, lunar-era, first-stations, shuttle-and-mir, iss-assembly, commercial-era, lunar-return, mars-era with hand colours (`a3-keep`, palette review L4). `epochForYear` (`:96-107`): first match wins, inclusive end.

`ebr-epoch.mjs` (counts exact, widths arithmetic): missions per band first-steps 5, space-race 27, lunar-era 11, first-stations 15, shuttle-and-mir 9, iss-assembly 19, commercial-era 32, lunar-return 7, mars-era 1 (126, none unassigned); per decade 1950s 1, 1960s 31, 1970s 22, 1980s 6, 1990s 8, 2000s 13, 2010s 19, 2020s 25, 2030s 1. `/fleet` counts its 294 entries by their own `epoch` field (first-steps 6, space-race 41, lunar-era 31, first-stations 17, shuttle-and-mir 45, iss-assembly 48, commercial-era 91, lunar-return 12, mars-era 3), so the strip is shared and any redesign changes both pages.

### 2.4 Tests that touch the area

`missions.spec.ts:229-275` (epoch strip: nine bands inside the expanded filters, `?epoch=lunar-era`, an invalid value falls back; selector `button.band, .ui-chip`), `fleet.spec.ts:141-150` (epoch chip, mobile carousel), `chip.spec.ts` (missions and fleet radiogroups), `a11y.spec.ts`, `agencies.test.ts`, `epoch-label.test.ts`. None asserts a colour of a card or a chip, that a label fits its band, or that the mission data colour equals the registry.

## 3. Screenshot list (before the build and again after; no browser was used for this brief)

Desktop 1440×900 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), phone 844×390 (`mobile-landscape-chromium`), `en-US` (one `de` and one `ar` of the strip, long labels and RTL):
1. `/missions` with FILTERS open: the strip and the agency row, before and after.
2. Each of the 13 agency chips beside a card of that agency (dot and badge side by side), desktop.
3. The strip with one era on, hover and focus states, desktop and phone; `/fleet` the same strip.
4. `?agency=NASA` and `?epoch=lunar-era` together; CLEAR FILTERS.
5. The 11 corrected cards (otv, soyuz-1, soyuz-11, huygens, near-shoemaker) before and after.
6. For D7: two prototype sheets of the strip (Decision 13, options A and B) on the real data at 1440 and 390, side by side with today's.

## 4. Proposal

### 4.1 One registry (MI3, the plan's "one palette")

`AgencyInfo` gains `chip: string | null` (the Map or regime chip colour of §2.4: NASA `#3b82f6`, ESA `#1d4ed8`, JAXA `#1d4ed8`, ISRO `#f97316`, CNSA `#dc2626`, Roscosmos `#ef4444`, UAESA `#00732F`, ASI `#1d4ed8`, SpaceX `#3b82f6`, SpaceIL `#1d4ed8`, Rocket Lab `#00A6A6`; the table's dashes stay null) and `agencies.ts` exports `agencyChipColor(input)`. `nationChipFor` keeps its nation fallbacks but reads the registry for every agency case (its 11 agency hex literals disappear); `agencyRingColor` and its alias map move beside the registry. `NATION_COLORS` stays: it is the nation legend, a different concept (nations, not agencies), and §2.4's third table. Result: two tables instead of three files of colours, every value as approved. A test (`agency-palette.test.ts`) reads the §2.4 table from `05_Design_System.md` and fails when a code value differs (a doc-vs-code guard, AGENTS rule 28), and one that checks every `color` in the mission index and in the 126 mission files equals `agencyColor(lead agency)` (Decision 14).

### 4.2 The colour on the filter (MI3)

Each agency chip gets `dot` in the card's colour (Decision 11a): a 10 px dot with the §5.13 1 px `rgba(255,255,255,0.35)` ring, so the seven dark colours read. `Chip` gets one optional `dotColor` (CSS var `--chip-dot`, falling back to `--chip-tone`), so the active edge stays the accent blue and never goes dark. The same `dot` goes on the fleet's category chips in the card accent (Decision 15), and the logo stays: the dot is the key to the card colour, the logo is the name.

### 4.3 The strip (MI2; the design waits on D7)

Option A (recommended): nine equal tiles in one row on desktop (`grid-template-columns: repeat(9, 1fr)`, about 150 px at 1356, 137 at 1236), two rows of five and four under 900 px, a one-column scroll row on a phone as today. A tile is a `Chip kind="choice"` in a `radiogroup` (the mobile carousel's markup, now the only one): the era's data dot, the label (11 px, wraps to two lines, never clipped), `1969–1972` underneath, and a count bar whose width is the era's share of the loaded missions (counts printed, bar `aria-hidden`). No proportional axis, so no overlap to draw and no clipped label; the overlap of 1981 to 1986 is stated by the two year ranges. The "today" marker becomes the tile that holds the current year. Same component serves `/fleet`.
Option B: a time-proportional dot ruler, reviving `TimelineNavigator`'s dots and row-packing with era names on a thin band below (keeps the time feel, costs 535 lines and a touch interaction, and the dense 1960s and 2020s stack to four rows). Option C: keep the proportional axis and fix it (merge the overlapping pair into one sub-row, labels above bands with leaders, 2-line labels): the smallest change, the strip stays a thin bar.

### 4.4 Data (Decision 14)

Set the 11 differing `color` values to the registry colour in `static/data/missions/index.json` and the 11 mission files; the new test keeps them equal. (Deleting the field from 127 files and deriving it is the larger alternative.)

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on E3 |
|---|---|
| A3 (accent) | Agency and nation identity colours are `a3-keep` data colours, confirmed 2026-11-13 (L44); E3 changes none of their values. The era colours are `a3-keep` too (palette review L4): keep. |
| A4 (one chip) | The FILTERS strip, count after the label, `Chip` kinds and the radiogroup keys are built; MI1 is done. The strip's three `a4-keep` comments are the markers E3 removes. |
| A2 (page shell) | Missions and fleet are "tools with no visible title" (A2 decision 4); no title is added. |
| C6, C7 (INDEX dots, nation colours) | The §5.13 dot-with-ring is the precedent for dark colours on this background (decision 11a). |
| L45 (UXD-025) | `agencyRingColor` is the thumb ring on every list; the registry change moves it without changing a colour, so UXD-025's "ring = identity colour" stays true. |
| E4 | `/fleet` shares the strip, the dots and the registry; the two slices touch `EpochTimelineStrip` and `fleet/+page.svelte` (the line-up toggle): build E3's strip first, E4 after, or one agent for both. |

Plan ideas now outdated: "three exist today" (3 in code, 4 with the data, 5 with the stale IA table); "the era strip redesign per D7" assumes the strip is mission-only (it is shared).

## 6. i18n impact (14 locales)

None if Option A keeps the existing era labels (`epoch_*`, 9 keys) and `epoch_band_aria`; Options B and C keep them too. If A prints the share as text (e.g. "17 %") one number key is new; the recommended bar prints the count only (already in `epoch_band_aria`). The agency dots carry no text. 0 keys recommended.

## 7. Data changes

11 mission files and `static/data/missions/index.json` (`color`); no other data, no image. `npm run validate-data` after.

## 8. Tests to add or change

**Unit (vitest):**
- `agency-palette.test.ts` (new): every §2.4 table row equals the registry (`color` and `chip`); `nationChipFor` returns the registry chip for each agency case; `agencyRingColor` returns a colour for all 13 mission-index agencies; every mission `color` (index and files) equals `agencyColor`.
- `epoch-bands.test.ts` (new, small): the nine ids, `epochForYear` boundaries (1961, 1972, 1986, 2024), counts over the real index sum to 126.
- `agencies.test.ts`: `agencyChipColor` for compound strings.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `missions-filters.spec.ts`: for each of the 13 agency chips the dot's computed colour equals the badge colour of a card of that agency (`.agency-badge` background); a chip that is on keeps the accent edge; no era tile label is clipped (`scrollWidth <= clientWidth`) at 1280 and 390 and in `de`; the nine tile counts sum to the card count; arrows move the selection in the tile radiogroup (`ar`: reversed).
2. `missions.spec.ts:229-275`: selectors move from `button.band` to the tile chips; `?epoch=` contract unchanged. `fleet.spec.ts:141-150` the same on `/fleet`.
3. `chip.spec.ts`, `chip-row.spec.ts` unchanged, must pass; `a11y.spec.ts` `/missions` and `/fleet` 0 serious with FILTERS open (contrast of the dots' ring).

## 9. Docs to update by name

- **UXD-NNN** (new, `docs/uxs/decisions/UXD-NNN-missions-one-agency-palette-colour-on-filters-era-tiles.md`; next free number at build time): the registry and the approved values, the dot rule, the strip; row in `docs/uxs/decisions/README.md`; row E3 in `docs/uxs/CHANGE-INVENTORY.md` (line 75); close MI2, MI3 and D7.
- `docs/concept/05_Design_System.md`: §2.4 (one registry; the doc-vs-code test reads it), §5.4 (card colour from the registry), §5.7a (dots on filter chips; the strip), §5.13 (the ring precedent now shared).
- `docs/uxs/UXS-004.md` (**the "Timeline navigator" extension, lines 104-160, is wrong about the code**: drag handles, `?from=&to=`, "32 missions as agency-coloured dots" were replaced on 2026-06-17 by the epoch strip and `?epoch=`; replace it with the strip's spec), `docs/uxs/IA.md` §Agency colours (`:286-296`: replace the stale table by a pointer to §2.4) and §controls (the filter dots), `docs/uxs/UXS-000-orrery-ux-architecture.md` §Open (D7 answered).
- `docs/adr/TA.md` (components list: `EpochTimelineStrip`, the registry), `src/lib/components/README.md` line 16 (the look-alikes sentence: `TimelineNavigator` is unused or removed), `src/lib/epoch-bands.ts` header, `src/lib/styles/entity-card-grid.css` header (the badge comment).

## 10. Phased plan

1. **E3a the registry and the data:** `agency-palette.test.ts` red first (11 rows fail), the registry, `nationChipFor` on it, the 11 values; no visual change except the 11 cards.
2. **E3b the dots:** `dotColor` on `Chip`, the agency chips (and Decision 15's category chips); `missions-filters.spec.ts` part 1.
3. **E3c the strip:** after D7 and Decision 13: two prototype sheets first, the operator picks, then the component; selectors and specs; docs of §9; `npm run preflight` once before a push, `npm run preflight:coverage`.

## 11. Acceptance checks

- One registry: `git grep -n "#3b82f6\|#1d4ed8\|#ef4444\|#dc2626\|#f97316" src/lib/surface-map` finds none outside the registry (the 11 agency literals are gone); the doc-vs-code test passes.
- All 126 mission `color` values equal the registry colour; the 11 cards changed and look as the shots say.
- Every agency chip shows its card colour as a dot; the selected chip keeps the accent edge; 0 serious a11y.
- The strip: no clipped label at 1280 and 390 in `en-US` and `de`, one count per era summing to the page's total, `?epoch=` unchanged, `/fleet` identical.
- Docs of §9 updated (UXS-004 and IA no longer wrong); the inventory row E3 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the five E briefs)

10. **What "one agency palette" means.** **(a) One registry holding both fields of §2.4 per agency (`color` and `chip`), `nationChipFor` and `agencyRingColor` reading it, nations unchanged, every value as approved** (recommended: it removes the hand-kept duplicates without touching a colour you confirmed on 2026-11-13); (b) one value per agency (collapse badge and chip): changes the approved table and every card badge, and the chip values win on contrast (20 of the 37 brand colours are under 3:1 on the page background), so every badge turns lighter and its text colour is recomputed; (c) leave the files as they are and only fix the 11 data colours and the stale IA table.
11. **The mission colour on the agency chips.** **(a) The card's own colour as a 10 px dot with the 1 px light ring, the active edge staying accent blue (one `Chip` prop)** (recommended: it is literally "bring it to the matching filters", and §5.13 already draws dark colours this way); (b) the chip colour (readable everywhere, but 6 distinct colours for the 13 agencies and different from the card); (c) no dots: the logos stay the key.
12. **D7: who designs the strip.** **(a) In code, with two prototype sheets of the real data before the build, no paid run** (recommended: the strip is data-driven UI the repo already has the parts for; a generated picture would be re-drawn in code anyway; a Higgsfield run is paid and I have made no field count or cost estimate, which the "size paid runs before launch" rule asks for first); (b) Higgsfield mock-ups first (paid; needs a size and cost estimate and your go before any run; the output is a picture to re-draw); (c) both: code sheets now, a Higgsfield pass only if you dislike them.
13. **The strip's shape (if D7 is "in code").** **(a) Nine equal tiles in one row, label and years inside, a count bar, no proportional axis** (recommended: removes the clipping and the overlap by construction, the same markup as the phone carousel, one component for fleet and missions); (b) a dot ruler over time, reviving `TimelineNavigator` (keeps the time axis; heavier, denser in the 1960s and 2020s); (c) keep the proportional axis and repair it (smallest change; the strip stays thin and the 1957 to 1972 era, 43 of 126 missions, stays squeezed to 18 % of the width).
14. **The 11 mission data colours.** **(a) Set them to the registry values and add the test** (recommended: 11 files, no schema change; OTV flights turn `#1D2951`, Soyuz 1 and 11 `#cc4444`, Huygens ESA `#003247`, NEAR Shoemaker NASA `#0B3D91`); (b) delete `color` from the 126 mission files and the index and derive it (a schema change and 127 files; no drift possible afterwards); (c) keep them as deliberate exceptions (then the "one palette" has seven documented exceptions and the dot of Huygens, a yellow card, differs from ESA's chip).
15. **Where else the card colour goes.** **(a) The fleet category chips also get a dot in the card accent (`CATEGORY_COLOR`)** (recommended: the same rule on both catalog pages, one prop, the fleet status chips already have dots; outside the plan row's words, which name missions only); (b) missions only, as MI3 says.

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. Band widths (65, 49, 98 px), the label needs (93, 78, 100 px at 7.15 px a character) and the strip width (1356 px at the 1400 px page max, about 1236 at 1280) are arithmetic over `epoch-bands.ts`, the English labels and the `.library` padding, not measured; the German and Arabic labels are longer or shorter and were not computed. The real overlap look of the 1981 to 1986 pair was not seen.
- NV2 Contrast figures are WCAG ratios of each colour against `#04040c` (`ebr-contrast.mjs`), the page background used by `readable-text.ts`; the chips sit on `rgba(255,255,255,0.0x)` fills that were not composited, and whether a 10 px dot with a ring reads at 1440 and on a phone was not seen.
- NV3 Whether `Chip`'s `tone` is used by any other caller in a way a new `dotColor` would disturb (status chips, regime chips, the epoch carousel) was not grepped in full; the carousel passes `tone={ep.color}` for dot and active edge.
- NV4 The fleet card's agency badge is filled with the category colour (`fleet/+page.svelte:712-716`), not an agency colour: whether that is intended was not asked; Decision 15 leaves it alone.
- NV5 `TimelineNavigator.svelte` was read for its header only; whether it still compiles against the current `Mission` type and `Chip`, and its a11y state, was not checked. Deleting it (if the strip becomes tiles) is a cleanup the plan does not ask for: your call.
- NV6 `epoch_*` labels in the 13 other locales and how two-line wrapping of a tile label behaves in each were not measured; the `ar` reversal of arrow keys relies on `ChipGroup`'s existing `rtl` branch in its `onkeydown`, not tried.
- NV7 The mission files' `color` field was counted from `missions/index.json`; that every mission file agrees with the index (the unit test would show) was not checked.
- NV8 Whether the Hebrew pilot or any other tool still reads `docs/uxs/IA.md` §Agency colours as data was not checked; it is prose in the file.
