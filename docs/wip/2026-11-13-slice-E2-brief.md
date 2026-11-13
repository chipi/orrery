# Slice E2 brief — program data: roster rows that name an existing mission, craft or module link to it; hardware lists filled from what exists; a Milestones section for rows that are segments (PG7, PG8, PG9)

Read-only brief, written at HEAD `07ef5237c7a` on `tech-debt/0.9.9`. Method: reading files from the repo root, `git grep`, and read-only node scripts over `static/data/` and `i18n-src/en-US/` (scratchpad `ebr-roster.mjs`, `ebr-roster2.mjs`, `ebr-orphans.mjs`, `ebr-candidates.mjs`, `ebr-fleet-find.mjs`, `ebr-dispatch.mjs`, `ebr-count.mjs`, `ebr-spine.mjs`, `ebr-heroes.mjs`, not in the repo; their output is quoted). Nothing was built or run in a browser; no data file was edited. The working tree holds other agents' uncommitted edits: not touched. The slice has no open operator question in the plan (`CHANGE-INVENTORY.md` line 74: "Waits on: —"); the five forks in §12 are about scope. The page code that shows the roster is slice E1's; E2 changes data, one row shape and one section.

## 0. Answer first

1. **Of 291 roster rows, 182 link and 109 are name-only; 14 of the 109 name an entry that exists, and 17 more name a flight of a craft that exists.** `ebr-roster.mjs`: 72 mission links, 88 fleet links, 22 module links (iss, tiangong), 0 dead links; 109 rows with a `name` and no `linked_id`. By exact or embedded name against the 126 missions, 294 fleet entries and the ISS modules (`ebr-roster.mjs` and `ebr-roster2.mjs`, read by hand because both scripts miss short or prefixed names): **6 rows name an existing mission** (Apollo 1, 7, 9 in `apollo`; "Huygens lands on Titan" in `cassini`, `huygens`; "Viking 1 lands" in `viking`, `viking1`; "Mariner 10 at Mercury" in `mariner`, `mariner10`), **8 name an existing craft or module** (Challenger and Columbia in `space-shuttle`; Compton Gamma Ray Observatory in `great-observatories`; Gaia's map and Euclid in `esa-science`; Viking 2 in `viking`, `viking2-lander`; N1 in `soviet-lunar`; Columbus in `esa-human`, the ISS module `columbus`), and **17 name one flight of a craft that exists** (Gemini 1, 2, 5, 9A, 10, 11 on the fleet's `gemini`; Shenzhou 5, 7, 9, 11, 12 and Shenzhou 5, 9 in Tiangong on `shenzhou`; Lunar Orbiter, Surveyor, Mercury-Redstone 2, Chandrayaan-2 on `lunar-orbiter-1` to `5`, `surveyor-3`, `mercury-redstone`, `vikram-cy2`). The runbook allowed Apollo to name 1, 7 and 9 "without modelling them" (`program-addition-runbook.md:32`); they are modelled now and the roster did not follow.
2. **The data has more than the roster uses: 56 of 126 missions and 213 of 294 fleet entries are in no program's roster** (`ebr-orphans.mjs`). `soviet-lunar` has 4 context rows and no linked row while Luna 9, 10, 16, 17, 21 and 24 exist; `space-shuttle` has 3 rows and no link while Galileo (already in `galileo`), Ulysses and Magellan were deployed from it (`vehicle` names the Shuttle); `ariane` has 2 rows and no link while Giotto, Juice, BepiColombo and SMART-1 flew on it; `mariner` lists Mariner 2 and 10 as text while `mariner4`, `mariner9` and `mariner10` exist. 19 of the 56 are linkable to a program that already tells their story (§4.1; Luna 24, 1976, is after the program's 1964 to 1974 years and is left out); the other 37 have no program (Dawn, Juno, MAVEN, InSight, Phoenix, LRO, Messenger, Magellan's siblings, the OTV flights, Venera 13, Vega 1 and 2 ...) and are a content question for stream H, not E2.
3. **Nine programs have no hardware row; 20 of the 52 hardware candidates (a fleet entry that a program's linked missions or the entry's own flights reach, not yet in its roster) are for those nine** (`ebr-roster.mjs` candidates, `ebr-count.mjs`: 21 programs, 52 pairs: launchers 18, launch sites 12, rovers 7, orbiters 7, crewed craft 4, landers 4). Cassini, Voyager, Pioneer, Galileo, New Horizons and the Mars rovers all have their own craft in the fleet (cassini, voyager-1 and 2, pioneer-10 and 11, galileo, atlas-v, sojourner, spirit, opportunity, curiosity, perseverance) with a gallery hero and a thumb. Sputnik has none to link (the fleet's `r-7-vostok` is Vostok's rocket, not Sputnik's), Commercial stations and ROS are plans.
4. **Cassini's "4 missions" are one mission and three segments:** a linked row `cassini` and the context rows "Huygens lands on Titan" (a mission that exists), "The geysers of Enceladus" and "The Grand Finale" (episodes). By my reading of the 109 names about 52 are segments, phases or plans rather than flights (Mir's 4, JWST's 5, Starlink's 4, Galileo's 4, Voyager's 3, Commercial stations' 6 ...); that count is a judgement, not a script result.
5. **Recommendation:** (a) link the 6 + 8 rows that name an existing entry, keeping their year and note, through one new optional `link` field for rows that point at a craft or module (Decision 5); (b) add hardware for the programs that have none and for the others where a flown vehicle is missing, vehicles only (Decision 6); (c) add the 15 mission rows of §4.1 whose missions exist (Decision 7); (d) a `milestone: true` flag and a "Milestones" section; (e) leave the 17 flight-of-a-craft rows as context (they are flights, not the craft); (f) record the dispatch debt instead of blocking the links (Decision 8). New missions (Kaguya, Chandrayaan-2 and the ones the operator picks) are stream H and the mission runbook, not this slice.
6. **Data: 10 base files for the mission and craft links (A to C), up to about 35 with hardware and milestone flags; 1 new key** (`program_section_milestones`, 14 locales). Page code: the roster split and the module route, in the file E1 rebuilds.
7. **Needs the operator before data:** nothing blocks; 5 forks in §12 (numbers 5 to 9 of the E series).

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 235-237; slice row 376)

| ID | Text | State at HEAD |
|---|---|---|
| PG7 | "Space Shuttle has only 3 missions and Ariane 2 — looks odd. Not all, but we miss missions we have in the project and could add specific ones; review all programs with 1–3 missions that don't match the story." | 21 programs have 1 to 3 mission-timeline rows (§2.2); the missions that exist and fit are listed in §4.1. |
| PG8 | "Cassini has 4 'missions' that are segments of one: link and card the items that have no links; maybe rename to 'milestones' where a program has milestones rather than missions." | One linked row and three context rows; no flag (§2.3). |
| PG9 | "Cassini's hardware section is empty though we have the hardware; review every program's related hardware — link what we have, don't add new." | 9 programs empty, 52 candidates over 21 programs (§2.4). |

Done when (plan row 376): "every roster row naming an existing mission or fleet entry links".
Plan wording that is outdated: "lists in the map" (no map exists; the lists are §4 of this brief, from the scripts); "roster links to missions and hardware that exist" is right but the runbook's rule that a roster never expands the curated set (`program-addition-runbook.md:16`, `:91`) still binds the new-mission part: PG7's "could add specific ones" means new mission entries, which go through the mission runbook first.

## 2. Current state (file:line at `07ef5237c7a`)

### 2.1 The roster model

`static/data/schemas/program.schema.json:62-85` describes a roster item as linked (`linked_id` + `ref` in `mission | fleet`) or context (`name`); the data also has `ref: 'module'` (22 rows) which the schema's enum does not list, and 22 rows with both `linked_id` and `name` satisfy both `oneOf` branches. **No script reads this schema** (`git grep "program.schema"` over `scripts` and `src`: nothing), so it is documentation. `src/types/program.ts:11-18` has `ref?: 'mission' | 'fleet' | 'module'`. The page splits the roster by ref (`routes/programs/[id]/+page.svelte:106-122`): the Missions timeline takes `ref === 'mission'` rows and name-only rows; Hardware `ref === 'fleet'`; the assembly list `ref === 'module'`. So a row cannot be a timeline row and point at a craft today. A module row links `/${p.id}?module=<id>` (`:93`): it works only where the program id equals the station route (`iss`, `tiangong`); Columbus under `esa-human` would build `/esa-human?module=columbus`.

The roster `name`, `role` and `note` are in the base file and English in all 14 locales (no `roster` key in `i18n-src/de/programs/cassini.json`).

### 2.2 Programs with 1 to 3 timeline rows

`ebr-roster.mjs`: voskhod 2, skylab 3, salyut 1, space-shuttle 3, buran 2, ariane 2, esa-human 3, iss 2, kuiper 3, hayabusa 2, jaxa-robotic 3, chandrayaan 3, mangalyaan 3, great-observatories 2, gaganyaan 3, esa-science 3, ros 3, sputnik 3, viking 3, new-horizons 3, mariner 2 (21). 16 programs have no linked mission row at all (soviet-lunar, mir, space-shuttle, buran, ariane, esa-human, iss, starlink, kuiper, great-observatories, jwst, gaganyaan, commercial-stations, ros, viking, mariner: 51 rows).

### 2.3 Cassini

`cassini.json`: row 1 `{linked_id: cassini, ref: mission, role: "Saturn orbiter", year: 2004}`; rows 2 to 4 name-only: "Huygens lands on Titan" (2005), "The geysers of Enceladus" (2005), "The Grand Finale" (2017). The mission `huygens` exists in `static/data/missions/saturn/huygens.json` and carries a dispatch (`ebr-dispatch.mjs`). 0 hardware rows; the fleet has `cassini` (orbiter, "Cassini-Huygens") and the mission `cassini` lists it in `fleet_refs`.

### 2.4 Hardware candidates

`ebr-roster.mjs` (candidates reached through a linked mission's `fleet_refs` or a fleet entry's `flights[].mission_id`): the nine empty programs: voyager (voyager-1, voyager-2), pioneer (pioneer-10, pioneer-11, atlas-slv-3d, cape-canaveral-lc-36b), cassini (cassini), galileo (galileo, space-shuttle-orbiter, space-shuttle-stack), new-horizons (atlas-v), mars-rovers (sojourner, spirit, opportunity, curiosity, perseverance, delta-ii, atlas-v), sputnik (r-7-vostok, baikonur-1-5), commercial-stations and ros (none). The other twelve: soyuz (soyuz, saturn-ib, apollo-csm-block-ii, lc-39b), skylab (saturn-ib, apollo-csm-block-ii, lc-39b), salyut (soyuz, soyuz-7k-ok, baikonur-1-5), tiangong and shenzhou (jiuquan-slc-43), spacex, artemis (a pad each), hayabusa and jaxa-robotic (h-iia), chandrayaan (pslv-xl, sriharikota-slp, lvm3, vikram-cy3, pragyan), mangalyaan (pslv-xl), esa-science (ariane-5), change (change1, long-march-3b, change-3, yutu, change-4, long-march-5, change-5, wenchang-lc-101). Some pairs are loose: apollo-csm-block-ii and saturn-ib under `soyuz` come from the Apollo-Soyuz mission, which `soyuz` links.

### 2.5 Dispatch debt

The runbook calls a program done when "every linked mission carries its dispatch" (`program-addition-runbook.md:84`, `:48-54`). `ebr-dispatch.mjs`: 50 of 126 missions and 49 of 294 fleet entries carry one. Of the 21 missions E2 would link (§4.1) 2 do (huygens, galileo); of the 7 craft rows 3 do (challenger, columbia, n1); of the nine empty programs' craft none of voyager-1/2, pioneer-10/11, cassini, galileo, atlas-v and the five rovers does. No script or test enforces the rule (`git grep dispatch scripts/validate-data*.ts` finds nothing).

### 2.6 Tests that touch the data

`data.test.ts:1326-1380` loads programs and badges; nothing asserts that a linked id exists or that a name-only row is not an existing entry (the 0 dead links are luck). `entity-page-thumbs.spec.ts:72-83` counts apollo's thumbs.

## 3. Screenshot list (before the data and again after; no browser was used for this brief)

Desktop 1440×900, phone 390×844, phone 844×390, `en-US`:
1. `/programs/cassini`: before, a Missions list of four with one link; after, Missions (Cassini, Huygens linked, the pane opening Huygens) over Milestones (two rows), one hardware card.
2. `/programs/apollo`: Apollo 1, 7 and 9 with patches or thumbs and the pane.
3. `/programs/space-shuttle`: 3 linked missions plus the context rows, craft links on Challenger and Columbia.
4. `/programs/soviet-lunar`: six Luna rows, N1 linked to its craft.
5. `/programs/jwst` and `/programs/commercial-stations`: a Milestones section with no Missions heading above it.
6. `/programs/esa-human`: the Columbus row opening `/iss?module=columbus`.

## 4. Proposal

### 4.1 Roster edits (data), by kind

| Kind | Rows | Programs and ids |
|---|---|---|
| A. Existing context row names an existing mission: set `linked_id`, `ref: mission`, keep year and note | 6 | apollo (apollo-1, apollo7, apollo9), cassini (huygens), viking (viking1), mariner (mariner10) |
| B. Existing context row names a craft or module: add `link: { ref, id }`, keep year and note | 8 | space-shuttle (challenger, columbia), great-observatories (compton-gro), esa-science (gaia, euclid), viking (viking2-lander), soviet-lunar (n1), esa-human (module columbus) |
| C. New mission rows for missions that exist and fit the program's story (year from the mission) | 15 | soviet-lunar +5 (luna9, luna10, luna16, luna17, luna21; luna24 is 1976, after the program's 1964 to 1974), ariane +5 (giotto, rosetta, juice, bepicolombo, smart-1), space-shuttle +3 (galileo, ulysses, magellan), mariner +2 (mariner4, mariner9) |
| D. New hardware rows (`ref: fleet`) | 20 to 52 | §2.4; the recommended set (Decision 6a) is the 40 vehicles, the 12 pads are left |
| E. Left as context (flights of a craft that exists) | 17 | Gemini ×6, Shenzhou ×7, Lunar Orbiter, Surveyor, Mercury-Redstone 2, Chandrayaan-2 |

After A to C: linked mission rows 72 to 93, rows with no link at all 109 to 95 (kind B rows keep a name and gain a `link`); missions in no roster 56 to 37 (13 of the 15 new rows and all 6 of kind A come from the 56; rosetta and galileo are already in another roster, as soyuz-11 and shenzhou-1 are in two today). Whether Magellan, Galileo and Ulysses belong under "Space Shuttle" is an editorial call (the program page tells the Shuttle's story and these are what it carried); they are listed so the operator can strike them (Decision 7).

### 4.2 Schema and page

- `src/types/program.ts` and `program.schema.json`: `ProgramRosterItem` gains `milestone?: true` and `link?: { ref: 'fleet' | 'module'; id: string }` (a row without `linked_id` that points at a craft or a module; the roster item stays name-led); the schema also gains `module` in the `ref` enum and the oneOf is relaxed to what the data is.
- `+page.svelte` (E1's file): `missions` = rows that are not milestones; `milestones` = rows with the flag; a heading "Milestones" over a plain timeline (the same `timeline` look, no pane, no thumb, linked rows keep their link); a program with no mission row shows only Milestones; `hasClickable` counts mission rows only. `href()` for `ref: 'module'` and `link.ref: 'module'` resolves the route from the module id (`iss-modules` or `tiangong-modules`), not from the program id.
- `+page.ts`: `missionDetails` already loads every linked mission; no change.

### 4.3 Which rows are milestones

The flag goes on a row that is an episode, phase, decision or plan inside a program rather than a flight, a craft or a test: by my reading about 52 of the 109 (§0.4). The editorial pass sets it row by row from the names; a row that also names an entry (Huygens) is a mission link, not a milestone. Unlinked milestones stay plain text: no card (there is no image to put on one; Decision 9).

### 4.4 Guards

`src/lib/programs-roster.test.ts` (new), over the real data: every `linked_id` and every `link.id` exists in the mission index, the fleet index or the station modules; no name-only row has a core name (text before ` (`, ` —`, ` →`) equal to an existing mission or fleet name or id or a station module id (this fails on the 14 rows of §4.1 A and B today); no program lists the same linked id twice; every `milestone` row has no `linked_id` of kind mission.

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on E2 |
|---|---|
| L45 (UXD-025) | The pane and the timeline thumbs read `thumbOf('missions', id)`: every newly linked mission has a thumb (`ebr-heroes.mjs`: 72 of 72 today; the 21 new ones were not checked, NV4). |
| C5 (ruler data) | Founding missions already link where the mission exists; this slice does the same for the roster. |
| C1 (UXD-019) | Mission links from a program use `/missions?id=...&from=program:<id>` (`+page.svelte:91`); unchanged. |
| E1 | Hides the empty Hardware section and builds the cards; E2 fills six of the nine empty lists. Either order works; shots of Cassini and Mars rovers want both. |
| Content stream H (plan lines 399-400) | MI5, PG7 and FL3 ids: Kaguya, Chandrayaan-2 and "the next candidates from the gaps found" are proposed there; §4.1 E and the list of 17 are inputs. |

Plan ideas now outdated: "lists in the map" (none exists); "roster links to missions ... that exist" as if few did (14 of 109 rows plus 20 orphan missions); the plan's "Cassini has 4 missions" (it has 1 mission row, 1 more that is a mission, 2 episodes).

## 6. i18n impact (14 locales, glossary first)

One new key: `program_section_milestones` ("Milestones"), shown only where a program has milestone rows. The glossary (`static/data/glossary/native-terms.json`) has no entry for the word; the milestone strings already in the messages (`fly_milestone_aria`, the Explore milestone boxes of C7) give each locale's form, so the translators start from those, by hand per the rule "translation rounds inline". Roster names and notes stay English in all locales as today (NV6).

## 7. Data changes

- `static/data/programs/{apollo,cassini,viking,mariner,space-shuttle,great-observatories,esa-science,soviet-lunar,esa-human,ariane}.json`: rows of §4.1 A to C; hardware rows (D) in up to 21 files; `milestone` flags in about 20 files.
- `src/types/program.ts`, `static/data/schemas/program.schema.json`, `docs/guides/program-addition-runbook.md`.
- No mission, fleet or image file; no `image-provenance` row. `npm run validate-data` after the edit.

## 8. Tests to add or change

**Unit (vitest):** `programs-roster.test.ts` (§4.4); `program-roster-href.test.ts`: module route from id (`columbus` gives `/iss?module=columbus`, `tianhe` gives `/tiangong?module=tianhe`); the roster split puts a `milestone` row in Milestones and keeps `hasClickable` on missions.

**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `programs-roster.spec.ts`: `/programs/cassini` has Missions with 2 rows (Cassini, Huygens, both linked, the pane opens Huygens) and Milestones with 2 plain rows; `/programs/apollo` rows Apollo 1, 7, 9 link to existing missions; `/programs/esa-human` Columbus opens `/iss?module=columbus` with the module panel; `/programs/jwst` has Milestones and no Missions heading.
2. Same spec, data-driven: every link in `.timeline` and `.hardware` on five programs resolves (a request to the target's data returns 200); no `a[href]` to `/missions?id=` whose id is missing from `missions/index.json`.
3. `a11y.spec.ts`: Cassini and JWST 0 serious (new heading).
4. `entity-page-thumbs.spec.ts:72-83` is E1's; E2 changes no count it asserts.

## 9. Docs to update by name

- **UXD-NNN** (new, `docs/uxs/decisions/UXD-NNN-program-roster-links-and-milestones.md`; next free number at build time): the rule "a row that names an entry links to it", the `link` and `milestone` fields, the Milestones section; row in `docs/uxs/decisions/README.md`; row E2 in `docs/uxs/CHANGE-INVENTORY.md` (line 74); close PG7 to PG9.
- `docs/guides/program-addition-runbook.md` §2 (the Apollo 1/7/9 example is now a link; `link` and `milestone`; `module` is a ref; the dispatch rule's status), `docs/prd/PRD-029.md` (roster model, if it states the two shapes), `static/data/schemas/program.schema.json` and `src/types/program.ts` (the schema becomes true to the data; whether to wire it into `validate-data` is NV3).
- `docs/uxs/UXS-004.md` ("Program page" extension: the Milestones section), `docs/uxs/IA.md` §surfaces, `docs/concept/05_Design_System.md` (the timeline section in the E1 §5.18 entry), `docs/adr/TA.md` (line 97, the `/programs` row; the roster paragraph if any).
- READMEs: none changed (no folder map lists program data).

## 10. Phased plan

1. **E2a the guard red first:** `programs-roster.test.ts` fails on the 14 rows; schema, type and `href()` change; the module-route test.
2. **E2b the rows:** kinds A and B (14 rows), then C (15), then D (Decision 6), then the `milestone` flags and the page split; the key in 14 locales.
3. **E2c checks:** the e2e of §8, shots 1 to 6, docs of §9, `npm run validate-data`, `npm run preflight` once before a push; the dispatch-debt list written to the deferred list (Decision 8).

## 11. Acceptance checks

- The new unit test passes on the real data: 0 dead links, 0 name-only rows that equal an existing mission, craft or module.
- Cassini shows Missions (2, both linked) and Milestones (2) and one hardware card; Apollo 1, 7 and 9, Huygens, Viking 1 and Mariner 10 link.
- Every program that has a flown craft in the fleet shows it (the nine empty lists reduced to Sputnik, Commercial stations and ROS under Decision 6a).
- Columbus opens the ISS module panel.
- 14 locales carry the new key; `validate-data` green; docs of §9 updated; the inventory row E2 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first; numbered across the five E briefs)

5. **How a row that names a craft or module links.** **(a) A new optional `link: { ref, id }` on a timeline row, so Challenger, Columbia, Compton, Gaia, Euclid, Viking 2, N1 and Columbus stay in the timeline with their year and note and gain a link** (recommended: the row is an event about the craft, not a hardware entry; one field, one guard); (b) move those rows into Hardware as `ref: fleet` rows (they lose their year and note, and Hardware becomes a mix of vehicles and events); (c) leave them as context and link only the 6 mission rows (the plan's "every roster row naming an existing ... fleet entry links" is then not met).
6. **Which hardware to link (52 pairs found).** **(a) Vehicles only: launchers, crewed craft, orbiters, landers and rovers, 40 pairs; the 12 launch-site pairs are left out** (recommended: the existing lists already hold only 5 distinct pads, and a pad row says little about a program; the nine empty programs get their craft); (b) all 52 (pads included; Baikonur, Cape Canaveral and Jiuquan then appear on a dozen pages); (c) only the nine empty programs (20 pairs; Cassini, Voyager, Pioneer, Galileo, New Horizons, Mars rovers get theirs, the other lists stay as they are). In every case Sputnik stays empty and loses its heading (E1).
7. **New mission rows for missions that exist but sit in no roster (15 rows).** **(a) Add the 15 of §4.1 C** (recommended: they are the plan's "missions we have in the project"; Luna on `soviet-lunar`, the Ariane-launched probes on `ariane`, the Shuttle-deployed probes on `space-shuttle`, Mariner on `mariner`); (b) link only the 6 existing rows (A) and leave the programs short (Space Shuttle then stays at 3 rows with no mission, Ariane at 2); (c) the 15 plus the ESA probes not placed by them (hera, mars-express, schiaparelli, solar-orbiter) on `esa-science` (4 more rows). New missions that do not exist (Kaguya, Chandrayaan-2, STS-1, Artemis I, the Gemini and Starship flights) are not in any option: they go to stream H with the mission runbook.
8. **The dispatch debt of the new links.** **(a) Link now and put the missing dispatches on the deferred list (19 of 21 new mission links, 4 of 7 craft links and all 13 craft checked for the empty programs have none)** (recommended: no gate checks it, the pane uses `first`, and the plan says "link what we have, don't add new"); (b) hold every link whose target has no dispatch (19 of 21 mission rows and most hardware wait; the plan row is mostly unmet); (c) write the dispatches in this slice (research, science review and 14-locale translation: a content project of its own, not E2).
9. **The Milestones section.** **(a) A `milestone: true` flag set row by row, a "Milestones" section after Missions, plain timeline text with no pane and no card** (recommended: it answers PG8 with one flag and one key; there is no picture for an episode to put on a card); (b) the same, plus a small card for a milestone that has a gallery image to reuse (the runbook's `reuse` refs; none of the 52 rows has one today, so a research task first); (c) no flag: keep every row under Missions and rename the heading per program in data (a heading per program is a translation per program).

## 13. NOT VERIFIED

- NV1 No browser, build or test was run and no data file was edited. The counts come from the scripts named in the header; the classification of rows into "names an existing entry", "flight of a craft" and "milestone" is my reading of the names, with the scripts' exact and contained matches as a floor (the scripts missed the short ids `n1` and the prefixed `Challenger (STS-51-L)`; I added them by hand from the fleet list). A row I did not recognise as naming an entry is not in the 14.
- NV2 "52 milestones of 109" is a judgement from the row names; the editorial pass may flag more or fewer.
- NV3 Whether `validate-data` should start reading `program.schema.json` (it validates other schemas through its own runner) was not checked; the schema as written fails on the 22 module rows, so wiring it needs the schema fix first.
- NV4 Whether the 21 mission links and the craft links all have a gallery hero and a thumb (`ebr-heroes.mjs` checked only the 160 existing links, 160 of 160) was not run for the new ids; `validate-data` would show a stale `entity-thumbs.json`.
- NV5 The hardware candidates are reached through `fleet_refs` and `flights`; a craft that appears in neither (Sputnik's own rocket, the Luna landers' launcher, Skylab's workshop if modelled) is invisible to the script. Orbiters that are also missions (cassini, galileo, voyager) are both a mission entry and a fleet entry: whether a program should list both is Decision 6's neighbour, not decided.
- NV6 Roster `name`, `role` and `note` are English in every locale; the new rows follow that. Whether `/programs/<id>` roster text should be translated was not asked.
- NV7 The editorial fit of Magellan, Galileo and Ulysses under "Space Shuttle" and of the Luna missions under "Soviet lunar" (the program runs 1964 to 1974 in its base file; its context rows end at 1972; Luna 21, 1973, is inside the years and was not weighed against the prose) was not read against the program's prose.
- NV8 No operator or reviewer wording of the Milestones heading was tried in the 14 locales.
