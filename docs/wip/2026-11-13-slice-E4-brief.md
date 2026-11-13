# Slice E4 brief — the fleet page: the line-up as a view toggle, and a Missions tab that counts once and links only where a mission exists (FL2, FL3)

Read-only brief, written at HEAD `07ef5237c7a` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and read-only node scripts over `static/data/fleet/` and `static/data/missions/` (scratchpad `ebr-fleet.mjs`, `ebr-fleet2.mjs`, `ebr-fleet3.mjs`, not in the repo; their output is quoted). Nothing was built, run in a browser or measured on screen. No code or data was changed. The working tree holds other agents' uncommitted edits: not touched. The slice has no open operator question in the plan (`CHANGE-INVENTORY.md` line 76: "Waits on: —"); the forks in §12 are about shape and scope. FL1 (same filter comments as missions) was A4's and is built. `/fleet` shares the era strip and the agency colours with E3: see §5.

## 0. Answer first

1. **The line-up is reachable but is the smallest control on the page.** It is a `ChipGroup class="lineup-bar"` of an 11 px label "Line-up" and two toggle chips (Launchers, Capsules & spacecraft), drawn under the FILTERS row (`fleet/+page.svelte:619-636`); the class has no CSS anywhere (`git grep lineup-bar -- src` finds the markup only), so it is the default chip row. Opening it sets the category filter as a side effect (`openLineup`, `:314-319`) and the way out appears only afterwards ("Back to the grid", a separate action chip). The line-up itself is a real 3D true-scale scene (`FleetLineup.svelte`, e2e: at least 25 launcher labels and 35 craft labels) that nothing on the page advertises.
2. **Crew Dragon's two counts are two different lists.** `crew-dragon.json` has `linked_missions: [inspiration4, polaris-dawn]` (what the OVERVIEW button counts: "2 missions") and `flights` Demo-2, Crew-1, Inspiration4, Crew-9 (what the "CREW" tab lists: 4). The union is 5 rows (Polaris Dawn is not a flight in the file); **2 of the 5 have a mission entry** (inspiration4, polaris-dawn); the tab links the other three to `/missions?id=demo-2`, `crew-1`, `crew-9`, which open the missions page with no panel. All 12 crew rows have no portrait: `portrait_path` is set on **0 of 42 crew rows in the data and `patch_path` on 0 of 139 flights**, so every crew card is the "—" circle.
3. **It is not only Crew Dragon.** 25 fleet entries have `flights`; they hold **139 flights, of which 45 name an existing mission, 6 more (the Gemini ones: `gemini-3`, `-4`, `-6a`, `-7`, `-8`, `-12`) name it with a hyphen the mission id lacks (`gemini3` ...), and 88 name a mission that does not exist** (STS-1 to STS-135, Soyuz TM and TMA, Shenzhou, Enterprise, ...): 63 % of the "Mission →" links on the tab are dead. On 8 of the 62 entries with flights or two or more linked missions the OVERVIEW count differs from the tab's rows (apollo-csm-block-ii 15 against 11, apollo-lm 9 against 10, crew-dragon 2 against 4, gemini 6 against 10, orion 4 against 2, shenzhou 1 against 8, soyuz-7k-ok 3 against 6, space-shuttle-orbiter 2 against 6); the tab is labelled "CREW" for all 25, but only 5 carry any crew (crew-dragon 12, new-shepard 8, space-shuttle-orbiter 16, orion 4, starliner 2).
4. **The same bug class is on the OVERVIEW button:** an entry with exactly one linked mission shows the **raw mission id** as the button's value (`FleetEntryPanel.svelte:478`: `{missionIds[0]}`): 74 of 294 entries ("inspiration4", "change3", "phoenix"). T4 (UXD-025) fixed the tab and left this (Decision 20).
5. **Recommendation:** (a) a view toggle at the head of the results, GRID and LINE-UP as two chips of one radiogroup, the kind (Launchers, Capsules & spacecraft) a second group that shows only in LINE-UP, on the FILTERS row so it is always visible (Decision 16); (b) the panel tab becomes "Missions" for every entry: one list of the union of flights and linked missions, newest last, a thumb and an arrow only where the mission exists, the others plain text, the crew as one compact line of names, no portraits, one count shared with the OVERVIEW button (Decisions 18, 19); (c) the six `gemini-N` ids fixed in the data (Decision 21) and the same list on `/fleet/<id>`; (d) the raw-id button fixed in the same pass (Decision 20).
6. **i18n: 3 new keys, 2 retired (14 locales); data: 1 file (6 ids); no image.** Needs the operator before code: nothing blocks; 6 forks in §12 (numbers 16 to 21 of the E series).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 251-255; slice row 378)

| ID | Text | State at HEAD |
|---|---|---|
| FL2 | "Line-up looks tiny and almost hidden; style it better." | A label and two toggle chips under the filters (§2.1). |
| FL3 | "Crew Dragon: overview says 2 missions, the crew page shows 4; no people photos, only empty placeholders. Recompose the tab: name it 'Missions', remove people photos, compact crew list, make clear which missions we have and can navigate into." | Two lists, two counts, 63 % dead links, 0 portraits (§2.2). |

Done when (plan row 378): "Crew Dragon, Soyuz, Gemini shots; no dead mission links". The slice row also says "`gemini-3` → `gemini3` id normalisation" and "one count": both in §4.
Plan wording that is outdated: "no dead mission links" is about the whole page, but the dead ones are in the data (88 of 139 flights name a mission that does not exist): the page can only stop linking them, not make them exist; "Crew tab → Missions" (the label is already `panel_tab_missions` for entries without flights; the "CREW" label is a second name for the same tab).

## 2. Current state (file:line at `07ef5237c7a`)

### 2.1 The line-up

`fleet/+page.svelte`: state `lineupView`, `lineupFocus`, `lineupKind` (`:96-102`; `lineup-kind.ts` maps the categories: launchers is `launcher`; spacecraft is `crewed-spacecraft` and `cargo-spacecraft`, both kinds live); URL `?view=lineup&focus=<id>` (`:259-260`, `:297-300`); the bar `:619-636`; the scene `:638-653` (`FleetLineup` loaded on demand, given **all** entries, not the filtered list, `:642-644`: it filters by category itself, so the search, agency, status and epoch filters do not apply to it while the FILTERS count above it shows the filtered total); the list view `?view=list` (`:656-671`) has no control that sets it (UXD-025 notes "nothing links to it"). Keys: `fleet_lineup_toggle` "Line-up", `fleet_lineup_launchers`, `fleet_lineup_spacecraft` "Capsules & spacecraft", `fleet_lineup_back` "Back to the grid", `fleet_lineup_toggle_aria`. e2e `fleet.spec.ts:166-195` drives `?view=lineup` and the button named /Capsules/.

### 2.2 The missions tab

`FleetEntryPanel.svelte`: tab id `missions` (`:67`), label `hasFlights ? panel_tab_crew : panel_tab_missions` (`:430`), shown when `hasMissions` (2 or more `linked_missions`) or `hasFlights` (`:215-224`, `:782`); the OVERVIEW button: 1 linked mission prints `{missionIds[0]}` (`:461-481`), 2 or more `{count} missions →` from `linked_missions.length` and opens the tab (`:482-505`); with flights the tab renders `.flights` (`:783-823`): per flight a header (the designation text and a "Mission →" link to `/missions?id=<mission_id>`, **unconditional**), a patch image (never present), a crew grid of 80 px circles (portrait or a "—" circle) with name and role; without flights `.missions-list` rows from `getMission` names with a round thumb (`:824-840`, T4). `/fleet/<id>` (`fleet/[id]/+page.svelte:154-190`, `+page.server.ts:53-74`, `:115-120`) lists linked missions under "Missions" (names, `/missions/<id>` entity links, only existing ones) and the flights under "Crew" (`fl.missionId` set only when the mission exists; `fl.crew.join(', ')`), so the page already does the right thing for links and compact crew and has the same two-list, two-heading shape and no hyphen normalisation (it checks `missionIndex.some(x.id === fl.mission_id)`).

`ebr-fleet.mjs`: 294 entries, 25 with flights, 139 flights, 45 exist, 6 exist after normalising, 88 do not; 42 crew rows, 0 portraits; 0 patches; `linked_missions` refs 311, 0 dead. `ebr-fleet2.mjs`: per entry, overview count against tab rows and the union (crew-dragon: 2, 4, union 5 with 2 existing; gemini: 6, 10, 10 with 6; soyuz-7k-ok: 3, 6, 7 with 3; space-shuttle-orbiter: 2, 6, 8 with 2; shenzhou: 1, 8, 9 with 1; 17 entries show no OVERVIEW count at all because they have flights and no `linked_missions`). `ebr-fleet3.mjs`: single-mission button on 74 entries, 48 entries with 2 or more, 172 with none.

### 2.3 Intent on record

ADR-053 (`docs/adr/ADR-053.md:60-68`, `:96`) set the crew-portrait rule: "when no licensed portrait exists, the crew member renders as a name + role without an image. The panel does not display a silhouette placeholder", and rejected "silhouette placeholders for missing crew portraits". The panel's "—" circle (`.crew-portrait-empty`, `:1284-1294`) is exactly that placeholder, so the code diverges from the ADR, and the operator's FL3 ("no people photos, only empty placeholders") is the same complaint. ADR-053 also planned about 400 portraits and about 120 patches (`:15-16`); the data has 0 and 0 and the operator now says to remove them.

### 2.4 Tests that touch the area

`fleet.spec.ts:166-195` (line-up, `?view=lineup`), `:252-268` (MISSIONS tab names and thumbs, atlas-v, 15 rows), `:141-150` (epoch chip), `fleet-keyboard-nav.spec.ts`, `chip.spec.ts` (fleet radiogroups), `entity-page-thumbs.spec.ts` (`/fleet/atlas-v`), `launches-fleet-cross-integration.spec.ts`. Nothing asserts a flight link target exists, the OVERVIEW count equals the tab's rows, or the crew rendering.

## 3. Screenshot list (before the build and again after; no browser was used for this brief)

Desktop 1440×900 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), phone 844×390 (`mobile-landscape-chromium`), `en-US`:
1. `/fleet`: the top of the page, the toggle in both states, FILTERS open and closed, line-up open (launchers, capsules).
2. `/fleet?id=crew-dragon`: OVERVIEW button and the Missions tab (5 rows, 2 linked, crew lines), before and after.
3. `/fleet?id=soyuz-7k-ok` (7 rows, 3 linked) and `/fleet?id=gemini` (10 rows, 6 linked after the id fix).
4. `/fleet?id=space-shuttle-orbiter` (8 rows, 2 linked, crew lines for 16) and an entry with one linked mission (the button prints a name).
5. `/fleet/crew-dragon` the entity page with the merged list.
6. The line-up toggle on the phone at 390 and 844×390, with the 3D scene open.

## 4. Proposal

### 4.1 The view toggle (FL2)

A `ChipGroup role="radiogroup"` named by a new `fleet_view_aria`, two `Chip kind="choice"`: GRID (new key `fleet_view_grid`) and LINE-UP (the existing `fleet_lineup_toggle`), placed on the FILTERS row (`.filters-bar`, `:496-523`) after the FILTERS chip, always visible, never inside the collapsible strip. Choosing LINE-UP sets `?view=lineup` and the kind defaults to Launchers; a second radiogroup (Launchers, Capsules & spacecraft, the existing keys) appears right after the toggle only while LINE-UP is on; GRID is the way back, so `fleet_lineup_back` and its action chip retire. The side effect on `categoryFilter` (`openLineup`) is removed: the line-up's kind is its own state (`?view=lineup&kind=...`), so leaving it does not leave the grid category-filtered. The URL keeps `view=lineup` and `focus`; the old `category=launcher&view=lineup` links still open the launcher line-up (the kind is read from `category` when `kind` is absent). While LINE-UP is on, the FILTERS chip stays in place but disabled, not removed, so nothing on the row moves (the A4 rule for controls that change availability; Decision 17a). The list view stays out of the toggle (Decision 16).

### 4.2 One list of missions per entry (FL3)

A pure `fleetMissionRows(entry, missionIndex, missionName)` in `src/lib/fleet-missions.ts` returns one row per distinct mission: the union of `flights[].mission_id` and `linked_missions`, ids resolved through the mission index (a hyphen-insensitive match is a fallback only if Decision 21b is chosen), sorted by year of the mission or the flight's date, each row `{ key, title, sub, href | null, crew: string[] }`: for a mission that exists, the name in the locale, the year, `href /missions?id=<id>`; for one that does not, the flight designation as plain text and no href. Used by `FleetEntryPanel` (the tab and the OVERVIEW count) and by `/fleet/<id>`'s server load, so the two surfaces list the same rows.

The tab, named "Missions" (`panel_tab_missions`) for every entry with 2 or more rows: each row a `li`; a row with a mission is a link: the 28 px round `EntityThumb` (agency ring), the name, the year, the arrow; a row without is plain text: the 8 px dot instead of the thumb, the designation, no arrow, ink at 70 %, no hover. Under the title one compact line "CREW: Behnken, Hurley" (existing `panel_tab_crew` as the label, names comma-joined as the entity page already does; roles dropped). A header line above the list: "5 missions · 2 in the catalogue" (new key `fleet_missions_in_catalogue`). The OVERVIEW button counts the same rows: with 2 or more rows it says "5 missions →" and opens the tab (the tab exists from 2 rows); with exactly one row that has a mission it prints that mission's name, not its id, and links to it (Decision 20); with one row and no mission there is no button. The portrait grid, the patch image and the `.crew-portrait-empty` circle are deleted (0 of 42 and 0 of 139 in the data; ADR-053's sourcing for them is withdrawn, Decision 19). Mobile: the same list in the bottom sheet, rows at least 44 px tall.

### 4.3 Data

`static/data/fleet/crewed-spacecraft/gemini.json`: the six `mission_id` values `gemini-3`, `gemini-4`, `gemini-6a`, `gemini-7`, `gemini-8`, `gemini-12` become `gemini3`, `gemini4`, `gemini6a`, `gemini7`, `gemini8`, `gemini12` (Decision 21a). The other 88 dead ids stay (the missions do not exist; adding them is stream H and the mission runbook).

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on E4 |
|---|---|
| A4 (one chip and filter) | The FILTERS strip and chips are built; the view toggle is two more `Chip kind="choice"` in a radiogroup, no new chip look. FL1 is done. |
| B1 (panel shell) | The panel header, tabs and the action row are B1's; the tab body is all this slice touches. `FleetEntryPanel`'s header comment (`:54-66`, "Six tabs ... CREW / MISSIONS") is already out of date and is corrected. |
| L45 (UXD-025) | T4 made the MISSIONS tab show names and round thumbs for entries without flights and `/fleet/<id>` Related lists; E4 gives the flights branch the same row as that branch. `/fleet?view=list` stays without thumbs. |
| E3 | The strip, the agency dots and the registry are shared with `/fleet` (see E3 §5): E3's strip first, E4's toggle after, or one agent for both. If Decision 15 of E3 is taken, the category chips get dots in the same pass. |
| E2 | Adds mission links to programs; no effect on the fleet's flights. The 88 dead flight ids and E2's "missions in no roster" are the same list of candidates for stream H. |
| C1, C5 | Mission links elsewhere use `/missions?id=`; unchanged. |

Plan ideas now outdated: "crew tab → Missions" (the label is a second name for one tab, only 5 of 25 flight entries have crew); "links only to missions that exist" assumes some flights link: 51 of 139 can, 88 cannot.

## 6. i18n impact (14 locales, glossary first)

New: `fleet_view_aria` ("View"), `fleet_view_grid` ("Grid"), `fleet_missions_in_catalogue` ("{count} missions · {open} in the catalogue", count and open as numbers, word order per language). Retired: `fleet_lineup_back` ("Back to the grid"), `fleet_flight_mission_link` ("Mission →"). Reused: `fleet_lineup_toggle`, `fleet_lineup_launchers`, `fleet_lineup_spacecraft`, `panel_tab_missions`, `panel_tab_crew`, `fleet_missions_count`. "Grid" and "In the catalogue" take the glossary's forms (`native-terms.json`) first; 3 keys by hand across 13 locales. `flight_designation` text and the crew names are base-file strings, the same in every locale (not new).

## 7. Data changes

`gemini.json` (6 ids). Optionally Decision 21b instead: no data change. No new image; `npm run validate-data` after.

## 8. Tests to add or change

**Unit (vitest):** `fleet-missions.test.ts` (new), over the real data: for every entry the rows equal `|flights ∪ linked_missions|` (crew-dragon 5 with 2 hrefs, gemini 10 with 6 after the data fix, soyuz-7k-ok 7 with 3, space-shuttle-orbiter 8 with 2); no row has an href whose mission is not in the index; the OVERVIEW count equals the row count for all 62 entries with flights or 2 or more links (this fails on 8 today); no `mission_id` in the data resolves only after hyphen-stripping (fails on the 6 Gemini ids today).

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. `fleet.spec.ts`: the view toggle is a radiogroup with GRID checked; LINE-UP opens `section.lineup`, shows the kind group, `?view=lineup` in the URL, GRID returns and leaves the category filter unchanged; `?category=launcher&view=lineup` (old link) still opens launchers; the existing line-up tests keep their selectors (`section.lineup .label`, the /Capsules/ button) and pass.
2. `fleet.spec.ts` new: `/fleet?id=crew-dragon`: the tab is "Missions", 5 rows, 2 links (`inspiration4`, `polaris-dawn`), no `a[href*="demo-2"]`, no `.crew-portrait-empty`, no `img` in the crew line, the OVERVIEW button says "5 missions" and equals the row count; `/fleet?id=gemini`: 10 rows, 6 links; `/fleet?id=soyuz-7k-ok`: 7 rows, 3 links; an entry with one linked mission prints its name, not its id; every `a` in the tab resolves to an existing mission (a request against `missions/index.json`).
3. `/fleet/crew-dragon` the same rows under one heading (`entity-page-thumbs.spec.ts` pattern, no horizontal scroll at 390).
4. `a11y.spec.ts`: `/fleet` with line-up on and the Crew Dragon panel, 0 serious (radiogroup name, plain-text rows are not links).

## 9. Docs to update by name

- **UXD-NNN** (new, `docs/uxs/decisions/UXD-NNN-fleet-view-toggle-and-missions-tab.md`; next free number at build time): the toggle, the one list, the plain-text rows, the withdrawn portraits; row in `docs/uxs/decisions/README.md`; row E4 in `docs/uxs/CHANGE-INVENTORY.md` (line 76); close FL2 and FL3; an addendum line in `docs/adr/ADR-053.md` (crew portraits and the portrait placeholder are no longer shown; the sourcing items for them are withdrawn).
- `docs/concept/05_Design_System.md` §5.7 (a view toggle is a choice group of chips) and §5.7a (where it sits), `docs/uxs/UXS-004.md` (a "Fleet" extension: the toggle and the Missions tab; it has no fleet content today), `docs/uxs/IA.md` §controls and §url-structure (`/fleet?view=lineup&kind=`), `docs/adr/TA.md` (the `/fleet` row, line 94; the Right panel line 34 lists tabs "FLIGHTS"), `docs/uxs/decisions/UXD-025-lists-carry-a-round-photo.md` (T4: the flights branch).
- READMEs: `src/lib/components/README.md` (the `FleetEntryPanel` clause; `fleet-missions.ts`), no route README exists for `/fleet`.
- Header comments: `FleetEntryPanel.svelte:54-66` (the tab list), `fleet/+page.svelte` (the line-up bar), `types/fleet.ts` (`patch_path` and `portrait_path` are documented as unused by the panel).

## 10. Phased plan

1. **E4a the list:** `fleet-missions.test.ts` red first, `fleet-missions.ts`, the panel tab and the OVERVIEW button on it, `/fleet/<id>` on it, the data fix (Decision 21a); e2e of §8 items 2 and 3.
2. **E4b the toggle:** the view radiogroup, the kind group, the URL (`kind`), the retired keys, the 3 new keys in 14 locales; e2e item 1.
3. Docs of §9; shots 1 to 6; `npm run validate-data`, `npm run preflight` once before a push, `npm run preflight:coverage` (the new pure module is tested).

## 11. Acceptance checks

- On Crew Dragon, Soyuz (7K-OK), Gemini and the Shuttle orbiter: one tab named "Missions", one count equal to the OVERVIEW button's, a link on a row only where the mission exists (`a[href]` all resolve), the crew a one-line list of names, no portrait or placeholder anywhere.
- `git grep -n "crew-portrait-empty\|crew-grid\|fleet_flight_mission_link" -- src` returns nothing; no `mission_id` in the fleet data resolves only after normalising.
- The line-up opens from a chip that is as visible as FILTERS, the grid returns with the same filters, the old URLs work.
- `/fleet/crew-dragon` lists the same 5 rows.
- Docs of §9 updated; the inventory row E4 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the five E briefs)

16. **The line-up as a view.** **(a) A GRID and LINE-UP radiogroup on the FILTERS row, the kind group appearing only in LINE-UP, the list view left out** (recommended: it makes the line-up as visible as the filters and removes the back chip and the category side effect; `?view=list` has no control and no thumbs, so it is not promoted); (b) GRID, LIST and LINE-UP (the list view comes back as a third choice: more to build, thumbs and tests for it); (c) keep today's bar and only restyle it (larger label, an icon: the least change, still a second row of small chips).
17. **Does the line-up obey the filters?** **(a) No: it is a fixed true-scale comparison of one category, and the FILTERS chip is shown disabled while it is open** (recommended: a line-up with holes is a worse comparison, and today's FILTERS count would no longer contradict the picture); (b) yes: pass the filtered list (search, agency, status, epoch narrow the line-up; `FleetLineup` must then accept a subset and the true-scale cast changes with it); (c) leave it as is (the count above the line-up lies).
18. **Which rows the Missions tab lists.** **(a) All rows (flights and linked missions), the ones we have marked and linked, the others plain text** (recommended: it is what the plan says, "make clear which missions we have and can navigate into"; the Shuttle orbiters keep their flight history); (b) only the rows that have a mission (Crew Dragon 2, Gemini 6, Soyuz 3, the Shuttle orbiters 2): no dead rows, but the history the data holds disappears from the panel and Shenzhou, Atlantis, Discovery show almost nothing).
19. **People photos and the crew line.** **(a) Remove the portrait grid, the patch image and the placeholder circle, show the crew as one line of names under the mission** (recommended: 0 of 42 portraits and 0 of 139 patches exist, ADR-053's own rule forbids the placeholder, and you asked for it; the ADR gets an addendum); (b) keep the portrait slot for the day a licensed portrait exists (dead code for a file that has none; the placeholder must still go); (c) names with roles ("Behnken (CDR)") instead of names only (the roles are free text in the data and long).
20. **The OVERVIEW button that prints a raw id.** **(a) Fix it in this slice: one linked mission prints its name, as the tab and `/fleet/<id>` do (74 entries)** (recommended: the same bug as the tab T4 fixed, one line in the file this slice rewrites); (b) leave it and put it on the deferred list.
21. **The six `gemini-N` ids.** **(a) Rename them in `gemini.json` to the mission ids (`gemini3` ...)** (recommended: the data should name the thing it points at, 6 strings, a test guards it); (b) resolve them at read time by stripping hyphens (no data edit; two spellings stay in the data and every new id has to be checked against the trick).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run and no data was edited. All counts are from the scripts named in the header over the committed data; the tab, the OVERVIEW button and `/fleet/<id>` behaviour is read from the source, not seen. The Crew Dragon "5 rows, 2 linked" is the script's union of `flights` and `linked_missions`, with Polaris Dawn from `linked_missions` and Demo-2, Crew-1, Crew-9 from `flights`.
- NV2 `FleetLineup.svelte` was read for its props and category filter only: whether it can accept a subset (Decision 17b), how it behaves at 390 px and 844×390, and the kind switch while it is open were not checked; the e2e that drive it (`fleet.spec.ts:166-195`) were not run.
- NV3 `flight_designation` strings ("Demo-2 (2020-05-30) · first commercial human spaceflight") are English base-file text in all 14 locales; used as the title of a row without a mission, they stay English in `de`, `ar`, ... Not new, not fixed here.
- NV4 The 28 px thumb ring for a mission row uses `agencyRingColor(row.agency)` (E3's registry); the rows without a mission have no agency, so they get the dot. Whether a plain-text row at 70 % ink passes contrast on the panel background was not computed.
- NV5 `/fleet/<id>` was read at its load and markup; whether the sitemap, JSON-LD or the entity-page tests (`social-meta.test.ts`, `entity-page-thumbs.spec.ts`) read the "Crew" heading or the `crewed` list was not grepped.
- NV6 `fleet-entry.schema.json` and `types/fleet.ts` keep `patch_path` and `portrait_path`; whether any script (provenance, `validate-data`) still requires an image for them (ADR-053 line 80) was not read; with 0 values set, none can fail.
- NV7 Whether the 17 flight entries with no OVERVIEW count today (all rows dead links) should gain the button at all (a button to a tab with no link in it) was not decided; §4.2 gives them the button when there are 2 or more rows, which a reader may prefer to restrict to rows with a link.
- NV8 The hardware cards of E1 and the missions rows here share no component; whether a shared row (thumb, name, year, arrow) is wanted across `/programs`, the fleet panel and `/fleet/<id>` was not weighed.
