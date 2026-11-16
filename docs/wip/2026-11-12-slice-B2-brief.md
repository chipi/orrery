# Slice B2 brief — science links (S1, S2, O6)

Read-only brief, written 2026-11-12 at HEAD `34019040ba8` on `tech-debt/0.9.9` (A1 type scale, A2 page shell, A3 accent tokens, A4 one chip landed; A5 is being built in this checkout
right now, so `git status` shows its uncommitted files; B2 touches none of them, see §6). Method: `git grep` and reads from the repo root, `jq` over `i18n-src/` and `static/data/`, and two
node scripts run as files (`b2-measure.mjs`, output `b2-measure-out.txt`; the check in §10, output `b2-check-out.txt`), both in
`/tmp/claude-1000/-work-orrery-worktrees-0-9-5/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/`. Every `file:line` was read at this HEAD. No browser, no build, no test run: the card
heights, the screenshots and every claim about what renders are NOT measured here (§12). The list counts are computed from the data by re-implementing each panel's list-building code in
`b2-measure.mjs`; where the panel code and the script could differ it is said so.

## 0. The point list

| ID | Operator text (plan lines 61–62, 177, 445–450) | State at HEAD |
|---|---|---|
| S1 | Same science links repeat across panels of the same type. Assess; we need variation: pick the most appropriate science sections for each page. Need not be complete. | Three planet sections (`planets/axial-tilt-and-seasons`, `moons-of-the-system`, `active-spacecraft-survey`) sit on 6 of the 8 planet panels each; the 41 missions that carry no `flight` block share one 3-card list, and `dv-budget`, `hohmann-transfer`, `mission-types` are on all 126 mission panels; all 22 station-module panels carry the same 11 hand-written links; 30 of 31 Earth-object panels carry the same 5 (§1.3, §2) |
| S2 | Sometimes too many: 1–5 is more than enough, varied per type. | **102 of 289 panels exceed 5**: 79 of 126 mission panels (mean 11.2, max 21: `mars-express`, `tianwen1`, `viking1`), all 22 station-module panels (11), 1 Earth-object panel (ISS, 6) |
| O6 | All orbit panes repeat the same science links (light minute, light year): variety, different per pane, best matches, no repetition. (Plan clarification, lines 445–450: the data has `light-minute` on SUN only; across the Explore ruler `keplers-laws`, `apsides`, `hill-sphere` and `planetary-stats` repeat.) | 24 regime panes across 4 rulers (`i18n-src/en-US/orbit-regimes*/`) each carry one `science_link`; **across all 24, `orbits/apsides` is on 5 panes, `keplers-laws` on 4, `hill-sphere` on 4**; inside one ruler 4 panes repeat (Explore: KUIPER = BELT, OORT = HELIOPAUSE, TERRESTRIAL = GIANTS; Mars: HMO = DMO) |

Plan slice row B2 (`docs/wip/2026-11-11-ux-feedback-plan.md:339`): "a shared helper caps every panel at 5; the MissionPanel push-chain (up to ~21 cards) becomes a ranked pick by
mission type/phase; generic defaults replaced by curated per-body lists; orbit-regime links varied (keplers-laws and apsides repeat 4–5×)". Done when: "no panel > 5; no two panels of one
type with the same list (unit test over the data)". Accepted decision: [UXD-010](../uxs/decisions/UXD-010-ruler-regimes-each-get-their-own-science-card.md) (every ruler regime its own best card, no repeats within a ruler; the cap of five is "part of the same slice").

## 0a. Findings the plan did not know (read first)

1. **sr-Cyrl links are broken in the data, today.** In `i18n-src/sr-Cyrl/{planets,satellites,small-bodies,belts}/*.json` and `sun.json` the `tab` of **108 `science_sections` entries in
   49 files** was translated (`"Планете/axial-tilt-and-seasons"`, `"Орбите/eccentricity"`, `"трансфери/hohmann-transfer"`; `jq` over `i18n-src/sr-Cyrl/planets/mars.json`). `ScienceCard` links
   `/science/Планете/…` and fetches a section that does not exist; the entity page `src/routes/explore/[id]/+page.server.ts:85–100` silently drops them (`.filter((x) => x !== null)`). The other
   12 locales are clean (0 non-ASCII tabs). The existing guard covers only regime `science_link` and fleet slugs (`src/lib/science-orphan-detector.test.ts:376–412`, a Serbian regime bug fixed 2026-11-01);
   the same class of bug sits one field over, unguarded. B2 fixes the data and extends the guard to every locale and every `science_sections` (§7 T6). Reproduce first (red test), then fix.
2. **The generic defaults never render today and are 10 links when they would.** All 8 planets, the Sun and all 24 small bodies carry their own list, so `PLANET_SCIENCE_SECTIONS` (10 entries,
   `PlanetPanel.svelte:34–46`), `SUN_SCIENCE_SECTIONS` (6, `SunPanel.svelte:25–32`) and `SMALL_BODY_SCIENCE_SECTIONS` (5, `SmallBodyPanel.svelte:25–31`) are dead fallbacks. Pluto, the only entry
   in `planets.json` without a planet overlay list, is drawn by `SmallBodyPanel` (`src/routes/explore/+page.svelte:252`). "Generic defaults replaced by curated per-body lists" therefore means
   **delete the defaults** (a missing list renders no block), plus a test that every body has a list. The 10-entry default would break the cap if data ever lacked a list.
3. **The MissionPanel SCIENCE-tab blurb becomes false.** `mp_science_blurb` says "every formula and named phase the {tab} tab references" (`messages/en-US.json`); a ranked five is not
   "every". One message key rewritten in 14 locales (§7 Locales).
4. **The hand-written link lists have their own message keys.** `StationModulePanel.svelte:235–294` (11 links, keys `chip_label_pressurized_volume` … `chip_label_eva_physiology`),
   `EarthObjectPanel.svelte:315–353` (5 links, each rendered twice: an `<a>` and a `ScienceChip` to the same URL) and `StationOrbitBanner.svelte:156–172` (5 links) use `m.chip_label_*`
   and `m.station_banner_*` keys that each have exactly one consumer (`git grep -l "m\.<key>\b" -- src` = 1 for all 20 checked). Replacing the lists with `ScienceCard`s (titles come from the
   section's own overlay) leaves ~20 orphaned keys in 14 locales; remove them (the A4 lesson L24).
5. **Moving a list into JSON hides it from the orphan detector.** `science-orphan-detector.test.ts:39–64` finds inbound references in `src/` source (patterns A/B/C) plus `DATA_LINK_FILES`
   (`static/data/observatories.json`) and the regime and fleet roots. Sections that today have their only inbound link inside `MissionPanel`'s push-chain
   (`goddard-liquid-rocket-1926`, `tsiolkovsky-equation-1903`, `star-trackers`, `true-anomaly`, `j2000`, `sidereal-synodic`, `throttling-and-gimbaling`: `git grep` finds 2 files each, one of them
   `MissionPanel`) or in `StationModulePanel`'s list would become orphans unless the new class table stays in `src/` as `tab: 'x', section: 'y'` literals (pattern B) or the new data files are added to the scan.
6. **The Belt panel links the same article twice.** `BeltPanel.svelte:224–234`: a CTA to `/science/planets/<id>-belt` above a cards block whose first entry is that same section
   (`asteroid.json`: `planets/asteroid-belt`; `kuiper.json`: `planets/kuiper-belt`). Its `science-label` shows the raw path text `/science/planets/asteroid-belt` to the visitor.
7. **Stale comments.** `ScienceCard.svelte` (header and `why` prop) and `src/types/planet.ts:46` call the `why` line an "italic prefix"; the CSS has no italic (`ScienceCard.svelte` `.why`, A1). Rewrite with the rule.

## 0b. What B2 is not

B1 (hero, close, actions; Q6 still open), B3 (star and outer panels), the Science Lens panel (`ScienceLayersPanel`, its per-layer "learn" links), and the card's own look (`ScienceCard` type sizes,
A1 territory) are not B2. The `ScienceChip` decision is in §1 and §8 (Q2).

**Operator, 2026-11-12: all open questions of §9 (Q1–Q10) approved as recommended.**

& (lead, 2026-11-12 afternoon) — read before §1

| Source | What it changes in B2 |
|---|---|
| B1 decisions O1–O8 (approved) | Panel actions are one chip row under the identity block; Share is in the header bar. B2's SCIENCE lists stay in their tab / section (Q7 keep the tab stands); the cap helper must not count the B1 action row. |
| Catalogue layer #658 (committed) | Panels gained per-value source links and a folded `DataSources` block. These are data provenance, not science links: **not counted** by the cap (same class as the outbound library links in Q1). |
| Scale INDEX on all eight scales (in build) | No science links in the INDEX; no B2 change. |
| Deep text batches 1–3 (being integrated) | Deep-sky / Local Group overlays gain prose; if a writer added `links` to `/science`, those lists fall under the cap like any other panel list — the B2 check covers them once integrated. |
| `/library` Astrophysics data block (`5950bf6a235`, `aa14349d0c9`) | Outbound catalogue links, not science links; not counted. |

## 1. Cascade — what each landed or decided slice changes for B2

| Source | What it settles | Effect on B2 (tactics changed; outdated plan ideas named) |
|---|---|---|
| **UXD-010** (accepted) | Each ruler regime gets its own best card, no repeats within a ruler; the cap of five is part of the slice | The hard rule for regimes is **within one ruler** (§3.5). The plan sentence in O6 "different per pane, no repetition" read literally (all 24 panes unique) is **not** adopted; measured fallout in §3.5 and Q5. UXD-010 §Verification is "planned, not written": B2 writes it (§7 T4, §11). Its Context cites `static/data/i18n/en-US.core.json`; the source is `i18n-src/en-US/orbit-regimes-explore/*.json` (the core JSON is the build output). |
| **A1 type scale (UXD-002)** | 11 px floor, upright body, italic only for quotes/captions | B2 adds no text styles; `ScienceCard` is reused unchanged. The "italic prefix" wording in comments is outdated (§0a.7), not the CSS. The plan's old idea "keep the `why` as an italic line" is dropped. |
| **A2 page shell (UXD-012)** | Pages, not panels | No effect on panels. `/science` pages are not touched. |
| **A3 tokens (UXD-001)** | `--color-accent` blue D, `--color-state` `#889fe7`, hover/focus tokens | `ScienceCard` already uses `--color-accent`/`--color-state`/`--color-text-label` (no teal left). `ScienceChip` already paints `var(--color-state)` and the A3 hover (`ScienceChip.svelte:88–101`). **No colour work in B2**; the science chip colours in the plan's A3 line are done. |
| **A4 one chip (UXD-014)** | `Chip` for toggle/filter/choice/action; `ScienceChip` on the allow-list (A4 brief §1.2, §6) | **Decision: `ScienceChip` stays as it is, outside the chip family and outside the cap.** Reason: it is a 14 px glyph with a 24 px hit area (ADR-036, `AGENTS.md:110`) that annotates one label (`MET`, `C3`, `semi-major axis`), not a link in a list; turning it into a 30 px `Chip` would make every labelled number taller, which A4 explicitly avoided. The science *cards* are not chips either. The cap applies to **lists of science links in a panel**, counted as `ScienceCard` + hand-written related links + banner links; inline `ScienceChip`s per field (6 on the MissionPanel FLIGHT tab: `MissionPanel.svelte:547–734`; 5 on the PlanetPanel TECHNICAL tab: `PlanetPanel.svelte:214–260`) are listed in §6 and not capped (Q1). Sweep `chip.spec.ts` does not need a new allow-list row. |
| **A5 (flat layer row, A–Z into INDEX; being built)** | Touches `SurfaceScene`, `SurfaceIndexPanel`, `LayerChipRow`, Explore HUD, `OrbitRuler`, routes | **Conflict map, not a dependency.** `git status` at HEAD lists A5's modified files; none of B2's source files (§6) is among them, **except** `src/routes/explore/+page.svelte` (A5) which B2 does not need to edit. `OrbitRuler.svelte` (modified by A5) is where the ruler regime panes open; B2 changes only the regime data. Rebase order: A5 first; B2 data edits (i18n-src, static) cannot conflict with it. The EarthObjectPanel (`src/lib/surface-scene/EarthObjectPanel.svelte`) is not in A5's list. |
| **A6 (nav bar)** | `--nav-height` 52 px, More menu | None. |
| **B1 (hero, close, actions; briefed after this one or alongside)** | Q3 answered 2026-11-12: "Collector card" → "Share", same card overlay, placed higher (`34019040ba8`); Q6 (slim fixed header bar vs scroll-away close) **recommendation pending** | B1 moves the plan / explore-surface / share row up in OVERVIEW, which leaves the science block as the last item of Overview on planet, small-body, satellite, belt and Sun panels (EP4). B2 changes what is inside that block and not where it sits. If Q6 = a fixed header bar, the scroll area shortens by that bar; the cap of five makes the block shorter, so there is no interaction. B1 and B2 both edit `PlanetPanel`, `SmallBodyPanel`, `SatellitePanel`, `MissionPanel`: whichever lands second rebases (small, separate hunks: B1 edits the head and the action row, B2 the science block and `<script>` list code). |
| **Deferred list L1–L28** | — | **Fold in:** none of L1–L28 is about science links. **Leave:** L4 (palette review) — not touched, B2 adds no colour. **Related:** L10 (link UXDs from specs): B2 writes UXD-015 and links UXD-010 from UXS-014; L24 (orphaned message keys) — the lesson applies to §0a.4. **L28 (today, `21aeec48817`):** the /plan and /fly Science Lens texts are now message keys in 14 locales; the lens is out of scope (§0b), but the `ScienceChip`s on `/plan` (6, `plan/+page.svelte:1044–1089`) and `/fly` (8) stay untouched. L26/L5 are chips/crawl items, not here. |
| **Plan "Definition of done" and "Checks and balances"** | Whole project, docs, tests on 3 Playwright projects, 14 locales, status + small screenshots | Mapped in §11. The "no partial update" rule decides Q1: every list surface in §1.3 is in B2, not only the MissionPanel. |
| **`docs/uxs/CHANGE-INVENTORY.md:34`** | B2: "Science links: a shared cap of five per panel, ranked picks, every ruler regime its own card"; will touch UXS-001, UXS-014 | Row to be updated (status, decision UXD-010 + the new UXD-015); UXS-014 has "no ruler section today" (UXS-000 §Next, UXD-010 Changes): B2 adds the ruler/science-links paragraph to UXS-014, not only a link. |

## 1.1 Where the science links are built — file:line

Counts per panel type are in §1.3. The consumers of one list shape are marked; every row is a place that decides what a visitor sees.

| # | Surface | Builds the list at | Renders at | Source of the list |
|---|---|---|---|---|
| 1 | PlanetPanel (OVERVIEW) | `PlanetPanel.svelte:34–46` default, `:198–209` | `ScienceCard` ×n | `i18n-src/<locale>/planets/<id>.json` `science_sections` (8 planets × 14 locales) |
| 2 | SunPanel | `SunPanel.svelte:25–32` default, `:114–125` | `ScienceCard` | `i18n-src/<locale>/sun.json` |
| 3 | SmallBodyPanel | `SmallBodyPanel.svelte:25–31` default, `:91–96`, `:220–227` | `ScienceCard` | `i18n-src/<locale>/small-bodies/<id>.json` (24 bodies) |
| 4 | SatellitePanel | `SatellitePanel.svelte:84`, `:187–193` | `ScienceCard` | `i18n-src/<locale>/satellites/<id>.json` (16 moons); no default |
| 5 | BeltPanel | `BeltPanel.svelte:87`, `:224–234` | CTA link + `ScienceCard` | `i18n-src/<locale>/belts/{asteroid,kuiper}.json` |
| 6 | RegimePanel (ruler panes) | `RegimePanel.svelte:177–185` | one `ScienceCard` | `i18n-src/<locale>/orbit-regimes{,-explore,-mars,-moon}/<ID>.json` `science_link` (6 + 8 + 5 + 5 panes) |
| 7 | MissionPanel SCIENCE tab | `MissionPanel.svelte:174–219` (`missionScienceSections`, 19 `list.push({ tab:` lines `:180–217`) | `:772–788`, `ScienceCard` per entry | code only (no data) |
| 8 | FleetEntryPanel | engines `:240–270`, `:514–525` (link list); others `:567–571` (`ScienceCard`) | | `static/data/fleet/**/*.json` `science: ['tab/section']` (22 engines, 13 suits carry it) |
| 9 | StationModulePanel (ISS 18 + Tiangong 4) | `StationModulePanel.svelte:235–294` literal `<a>` ×11 | link list "EXPLORE FURTHER" | code only |
| 10 | EarthObjectPanel (31 objects) | `EarthObjectPanel.svelte:302–306` (ISS only), `:315–353` literal ×5 (+ `ScienceChip` ×5) | link list | code only |
| 11 | StationOrbitBanner (the /iss and /tiangong banner, not a panel) | `StationOrbitBanner.svelte:156–172` literal ×5 | links | code only |
| 12 | Entity page `/explore/[id]` (SEO twin of rows 1–4) | `src/lib/data/body-entity.ts:102, :140, :178` (`o.science_sections ?? …base… ?? []`), `+page.server.ts:83–100` | list on the page | the same overlays; **does not go through any panel code, so the cap must live in a shared function both call** |
| 13 | single links, below the cap by construction | `PhasePanel.svelte:49`, `BlackHolePanel.svelte:92`, `StarPanel.svelte:346`, `SurfaceScene.svelte` apollo11 milestone (`/science/history/apollo-11-1969`), `EarthObjectPanel.svelte:302–306`, `ConicSectionPanel`, `WhyPopover`, `FlightDirectorBanner:194` | | allow-list (§5) |
| 14 | `ScienceLayersPanel` lens | per-layer `learn` + `historicalFoundations` | | out of scope (§0b, Q1) |

## 1.2 What a "science link" is in B2

A **science link list** is any block in a panel or banner that offers `/science/<tab>/<section>` destinations as a set (rows 1–11). Counting rule for the cap and the tests: the number of distinct
`tab/section` destinations the block shows; a CTA to the same destination counts once (row 5); an `<a>` plus a `ScienceChip` to the same URL counts once (row 10).
Excluded: inline per-field `ScienceChip`s, single contextual links (row 13), the lens panel (row 14), outbound library links (`LearnLink`, `PanelLinkTiers`, ADR-051).

## 1.3 Counts per panel type (computed; `b2-measure.mjs`, `b2-measure-out.txt`)

Panels counted: every `static/data/missions/**` file (126), every module (22), every Earth object (31), every body overlay in en-US (8 planets, Sun, 24 small bodies, 16 moons, 2 belts), every
regime (24), fleet entries. Fleet engines are counted as the two primers plus `science`, without the power-cycle card the panel derives from `specs.cycle` (+1 for some).

| Panel type | n | links min / max / mean | over 5 | distinct lists | Notes |
|---|---|---|---|---|---|
| Mission (SCIENCE tab) | 126 | 3 / 21 / 11.2 | **79** | 18 | size histogram `{3:41, 4:6, 6:8, 12:16, 14:4, 17:4, 18:15, 19:18, 20:11, 21:3}`; 41 missions share the 3-card list; 3 sections on 126 of 126 |
| Station module (ISS 18, Tiangong 4) | 22 | 11 / 11 / 11 | **22** | **1** | identical hand-written list on every module |
| Earth object | 31 | 5 / 6 / 5.0 | 1 (ISS) | 2 | 30 identical |
| Planet | 8 | 4 / 5 / 4.5 | 0 | 8 | but 3 sections on 6 of 8 each |
| Sun | 1 | 5 | 0 | 1 | |
| Small body | 24 | 1 / 3 / 1.5 | 0 | 13 | 15 panels repeat another's list: 6 identical (`psyche donaldjohanson eurybates polymele leucus orus`), 4 (`itokawa ryugu eros didymos`), 2 ×3 |
| Satellite | 16 | 1 / 4 / 1.7 | 0 | 12 | `ariel deimos umbriel` identical; `europa io`; `oberon titania` |
| Belt | 2 | 3 / 3 | 0 | 2 | CTA duplicates card 1 |
| Regime, Explore ruler | 8 | 1 | 0 | 5 | 3 repeating pairs |
| Regime, Earth / Mars / Moon ruler | 6 / 5 / 5 | 1 | 0 | 6 / 4 / 5 | Mars: HMO = DMO |
| Fleet engine / space suit | 22 / 13 | 2–3 | 0 | 4 / 3 | engines: 18 of 22 share the two primers (intentional: "every engine illustrates the two primers", `FleetEntryPanel.svelte:240–246`) |

**Totals: 102 of 289 panels exceed five; 0 of the 8+1+24+16+2 body panels do.**

Worst panels (links, sections that repeat on the others): `mars-express`, `tianwen1`, `viking1` = 21; `apollo11 apollo17 artemis4 artemis5 blue-moon-mk1 change4 change5 change6 luna17 …` = 20 (11
crewed-lunar and lunar-lander missions share one list of 20); every ISS/Tiangong module = 11; `iss` = 6.

Per-section share, body types: planets `axial-tilt-and-seasons` 6/8, `active-spacecraft-survey` 6/8, `moons-of-the-system` 6/8; small bodies `semi-major-axis` 9/24, `asteroid-belt` 8/24;
satellites `semi-major-axis` 6/16, `eccentricity` 5/16. Regime links across all 24 panes: `apsides` ×5, `keplers-laws` ×4, `hill-sphere` ×4, `lagrange-points` ×2, `cislunar-orbits` ×2,
`inclination` ×2, `planetary-stats` ×2, `light-minute` ×1.

Mission data coverage that decides the gating (`jq` over `static/data/missions/*/*.json`): `flight` present 85; `flight.launch` 71; `flight.cruise` 51; `arrival.orbit_insertion_dv_km_s` 38;
`arrival.entry_velocity_km_s` 38; `arrival.v_infinity_km_s` 51; `flight_data_quality` without `flight` 40; neither 1; crewed (index) 45. 126 missions across 19 `dest` values (EARTH 41, MOON 32, MARS 20,
VENUS 5, JUPITER 5, SATURN 4, others ≤3). The mission `type` string (`CREWED EARTH-ORBIT · FLOWN`, `ORBITER · ACTIVE` …) is free text in the **translated overlay** and is not usable as a
language-neutral key; the ranking must use `dest`, `crewed`, and the `flight.*` field presence (§3.3).

## 2. Findings that shape the proposal

1. The cap is not the hard part for body panels (all ≤ 5 already); it is the hard part for **three families written in code**: missions (79 over), station modules (22 over, all identical) and the Earth-object / banner link lists. The variety work (S1) is data editing for bodies and **rules plus a class table** for families of 31–126 panels.
2. Variety inside a family of 126 missions cannot come from hand curation in this slice (no science content, no new `why`, no paid run). It has to come from a **deterministic ranking over language-neutral facts the data already holds** (§3.3). That makes "no two panels of one type with the same list" **true for body types and rulers but not literally for missions, modules and Earth objects**; §7 T5 and Q4 propose the testable form.
3. Section lists are duplicated per locale, with only `why` translatable. The structure (`tab`, `section`) is language-neutral and was corrupted in one locale (§0a.1). B2 keeps the file location (smallest change) and makes the test cover every locale; a single-source refactor is Q3.
4. Every list surface also has an SEO twin (`/explore/[id]` via `body-entity.ts`; AGENTS.md:97 "A change to what a panel shows should reach its entity page"). One helper, two callers.
5. Cards are tall (`ScienceCard`: `.why` + title + intro + 3-line preview, ~130 px each by CSS, not measured). Five cards is still a long block; the compact (`expanded={false}`) form that already exists in the component is the right form for the lists that were one-line links (modules, Earth objects, banner).
6. `ScienceCard` fetches one overlay per card on mount (`getScienceSection`): fewer cards is also 16 fewer requests on a 21-card mission panel (not measured).

## 3. Proposal

### 3.1 The helper — `src/lib/science-links.ts` (new, pure TypeScript, no Svelte)

```ts
export const SCIENCE_LINK_MAX = 5;
export interface ScienceRef { tab: string; section: string; why?: string }
/** Dedupe by tab/section (first wins), keep order, cut at max. The one place the cap lives. */
export function pickScienceLinks<T extends ScienceRef>(refs: readonly T[] | undefined, max = SCIENCE_LINK_MAX): T[];
/** The ranked pick for a mission, from language-neutral facts only (§3.3). */
export function rankMissionScience(m: MissionScienceInput): ScienceRef[];
export const MISSION_SCIENCE_CLASSES: Record<MissionClass, ScienceRef[]>;   // the class table, literals in src/ (orphan detector pattern B)
```

Callers: the nine panel/banner files of §1.1 rows 1–5, 7–11 and `body-entity.ts` (rows 12). A panel never slices or defaults by itself. The helper trims silently; the **test** (§7) is what fails on a data list over five, so a bad edit is caught in CI and a bad future overlay still cannot exceed the cap on screen.
`ScienceRef` replaces the three local object types (`ScienceSectionRef` in `src/types/planet.ts:54`, `BodyScienceRef` in `body-entity.ts:5`, the inline types in `SunPanel` / `PlanetPanel`); keep `ScienceSectionRef` as the exported name, fix its comment (§0a.7).

### 3.2 Body panels — curated lists, no defaults

- Delete `PLANET_SCIENCE_SECTIONS`, `SUN_SCIENCE_SECTIONS`, `SMALL_BODY_SCIENCE_SECTIONS`; a body without a list renders no block (the `{#if}` already handles empty).
- Lists stay in the locale overlays (`i18n-src/<locale>/…`), 1–5 entries, authored in **en-US first**; the other 13 locales mirror the `tab`/`section` pairs exactly (a script copies the pair list; `why` strings stay each locale's own).
- Variety rules (tested): no two bodies of one type have the same set (planets, satellites, small bodies, belts); no single section on more than half the panels of a type (planets: ≤ 4 of 8; today 6 of 8 ×3); every entry exists under `static/data/science/<tab>/<section>.json`.
- Where a body needs a section that has no `why` yet, ship the entry **without** `why` (it is optional, the card then shows title + intro). Do not write new `why` sentences in this slice, except to replace one that would now say something false; any new or changed `why` goes through the science-reviewer gate (`.claude/agents/science-reviewer.md`, the required peer-review gate; AGENTS.md does not name it) and 14 locales by hand, no paid run (memory `no-paid-translation-runs`, `size-paid-runs-before-launch`).
- Content source of the new picks: the existing 175 `/science` sections (TA.md:69; 189 files under `static/data/science/*/` per `ls`, including `_index.json`). Who writes: the implementer proposes lists from the section titles/intros; **science-reviewer** (sonnet, read-only, web) checks each body-to-section pairing for relevance and any changed `why` for fact accuracy before commit.
- Belt: drop the raw-path CTA label (`BeltPanel.svelte:224–227`) or fold it into card 1 (the CTA and card 1 are the same article); keep one link.

### 3.3 Missions — ranked pick, deterministic, language-neutral

Input (`MissionScienceInput`): `dest` (index), `crewed` (index), and from `mission.flight`: `launch` present, `launch.c3_km2_s2`, `cruise` present, `cruise.tcm_count`, `arrival.orbit_insertion_dv_km_s`,
`arrival.entry_velocity_km_s`, `arrival.v_infinity_km_s`. Not used: the translated `type` string.

Rule, in order:
1. **Classify** into one of ~10 classes from those fields (table below).
2. **Phase slot (slot 1):** the mission's defining phase: `entry_velocity` present → `mission-phases/edl` (or `skycrane` / `propulsive-landing` for the class); else `orbit_insertion` present → `mission-phases/orbit-insertion` (or `aerobraking` for a Mars orbiter); else `tcm_count > 0` → `mission-phases/tcm`; else `mission-phases/trans-x-injection` if `launch` present; else `mission-phases/launch`.
3. **Class slots (2–5):** the class's ordered list (`MISSION_SCIENCE_CLASSES`), skipping any entry already chosen and any entry whose data gate fails (the gates that exist today: `c3` needs `c3_km2_s2`, `v-infinity` needs `v_infinity_km_s`, `edl` needs `entry_velocity_km_s`, …), **at most 2 per tab** (stops five `propulsion/*` cards).
4. **No universal entries.** `propulsion/dv-budget`, `transfers/hohmann-transfer`, `mission-phases/mission-types` and `scales-time/j2000` (126/126, 126/126, 126/126, 85/126 today) appear only inside the classes where they are the best match (interplanetary transfers: `hohmann-transfer`; robotic deep-space: `dv-budget`).
5. **Stable:** same input, same output; ties by table order; no randomness, no hash of the id.
6. The 41 missions without `flight` (and the one without even `flight_data_quality`) get the class list ungated, which is exactly what makes them differ from each other by class instead of all sharing one 3-card list.

**DRAFT class table** (every section id below exists in `static/data/science/`; science-reviewer confirms the pairings):

| Class (from) | Count (approx.) | Ordered list after the phase slot |
|---|---|---|
| crewed Earth orbit (`dest EARTH`, crewed) | ~21 flown | `mission-phases/launch`, `mission-phases/max-q`, `life-in-space/microgravity-physiology`, `mission-phases/deorbit-corridor`, `mission-phases/entry-heating` |
| crewed lunar (`MOON`, crewed) | ~10 | `transfers/free-return`, `mission-phases/trans-x-injection`, `orbits/cislunar-orbits`, `life-in-space/radiation-exposure`, `mission-phases/edl` |
| robotic lunar lander (`MOON`, not crewed, `entry_velocity`) | ~12 | `mission-phases/propulsive-landing`, `planets/lunar-ice`, `planets/regolith`, `planets/moon-surface-imagery`, `mission-phases/dsn` |
| lunar orbiter / flyby (`MOON`, not crewed, no entry) | ~10 | `orbits/cislunar-orbits`, `mission-phases/orbit-insertion`, `orbits/orbit-regimes`, `planets/moon-surface-imagery`, `orbits/lagrange-points` |
| Mars lander (`MARS`, `entry_velocity`) | ~12 | `mission-phases/edl`, `mission-phases/skycrane`, `planets/mars-surface-imagery`, `transfers/hohmann-transfer`, `mission-phases/dsn` |
| Mars orbiter (`MARS`, `orbit_insertion`, no entry) | ~8 | `mission-phases/orbit-insertion`, `mission-phases/aerobraking`, `scales-time/sidereal-synodic`, `transfers/hohmann-transfer`, `orbits/true-anomaly` |
| outer-planet flyby / tour (`JUPITER … PLUTO`) | ~15 | `transfers/gravity-assist`, `mission-phases/dsn`, `propulsion/c3`, `scales-time/light-minute`, `mission-phases/tcm` |
| small body (`ASTEROID COMET BENNU CERES ITOKAWA …`) | ~12 | `planets/asteroid-belt`, `mission-phases/star-trackers`, `orbits/semi-major-axis`, `mission-phases/orbit-insertion`, `propulsion/ion-drive` |
| inner system / Sun (`VENUS MERCURY SUN`) | ~13 | `propulsion/oberth-effect`, `transfers/gravity-assist`, `orbits/eccentricity`, `scales-time/au`, `mission-phases/orbit-insertion` |
| Earth uncrewed / other | ~13 | `mission-phases/launch`, `propulsion/rocket-stages`, `orbits/orbit-regimes`, `orbits/sun-synchronous`, `orbits/space-debris` |

The rule drops 19 hand-pushed lines (`MissionPanel.svelte:180–217`) and the two seed entries (`:175–178`) for one call. The Apollo 11 milestone pin
(`history/apollo-11-1969`, already linked from the Moon site panel at `SurfaceScene.svelte` apollo11) is a per-id pin in the table (`PINNED: Record<missionId, ScienceRef>`), taking slot 2, for the ~3 missions that have a `/science/history` article (`apollo11`; `sputnik1` → `sputnik-1957`); this is the only per-mission content.

### 3.4 Station modules, Earth objects, banner — per-entry or per-group lists, as cards

- `iss-modules.json` and `tiangong-modules.json` entries get `science: ['tab/section', …]` (1–5, language-neutral, same shape as fleet entries' `science`), drafted by module role (core/service, node/connector, laboratory, airlock, cupola, logistics/inflatable, robotic arm); the 11-entry cluster is **distributed** so that the union over the 22 modules still contains all 11 sections (a test, §7 T8).
- `static/data/earth-objects.json` entries get `science` by group (comms, nav, imaging, weather, early-warning, science, moon-orbiter, crewed-station), 3–5 each; the current 5 (`cislunar-orbits`, `sun-synchronous`, `special-orbits`, `space-debris`, `disposal-end-of-life`) are split by what they explain (cislunar → moon-orbiters; `sun-synchronous` → imaging/weather; `special-orbits` → early-warning/comms; debris/disposal → comms constellations).
- `StationOrbitBanner.svelte:156–172` (5 links in two foot rows): keep the lead link `orbits/orbit-regimes` and one second link, rest dropped to the module panels (cap applies to the banner as one block of ≤ 3; it is a banner, not a panel, Q1).
- Render as `ScienceCard expanded={false}` (title + intro), through the helper. The 18+ `chip_label_*` / banner keys leave (§0a.4).

### 3.5 Regimes (O6) — one card per pane, each its own within a ruler

One `science_link` per pane stays (UXD-010: "its own best science card"). Changes only in `i18n-src/<locale>/orbit-regimes*/<ID>.json` (14 × 24 files; the field is `{tab, section}`, no text, so no translation):

| Ruler | Pane | Today | Proposed (DRAFT) |
|---|---|---|---|
| Explore | SUN | `scales-time/light-minute` | keep |
| Explore | TERRESTRIAL | `planets/planetary-stats` | keep |
| Explore | **GIANTS** | `planets/planetary-stats` | `planets/moons-of-the-system` (the panel story is the giants' moon systems) |
| Explore | **BELT** | `orbits/keplers-laws` | `planets/asteroid-belt` |
| Explore | **KUIPER** | `orbits/keplers-laws` | `planets/kuiper-belt` |
| Explore | SCATTERED | `orbits/apsides` | `orbits/eccentricity` |
| Explore | **HELIOPAUSE** | `orbits/hill-sphere` | `scales-time/au` (120 AU is the unit the pane teaches) |
| Explore | OORT | `orbits/hill-sphere` | keep (the Oort cloud ends at the Sun's Hill sphere) |
| Mars | **DMO** (Deep Mars Orbit) | `orbits/apsides` | `orbits/eccentricity` |
| Mars | HMO | `orbits/apsides` | keep |
| Mars / Moon / Earth | other 13 panes | unique within their ruler | keep |

Result (to be re-measured): 0 repeats inside any ruler (today 4); across all 24 panes the maximum repeat drops from 5 (`apsides`) to 3 (`apsides` on HEO / HMO / HLO, `hill-sphere` on OORT / Mars HILL / Moon HILL). Picking the all-24-unique reading of O6 needs 8 more swaps and gives up good matches (GEO and areostationary are the same Kepler's-third-law idea); Q5.
`light-year` has no section; the data confirms only `light-minute` (UXD-010 Context).

## 4. Replacement map

| Old | New |
|---|---|
| `MissionPanel.svelte:174–219` push-chain + `:777` `#each missionScienceSections` | `rankMissionScience(...)` (`science-links.ts`) via `pickScienceLinks`; `#each` unchanged |
| `PLANET_/SUN_/SMALL_BODY_SCIENCE_SECTIONS` and the `?? DEFAULT` fallbacks (9 lines) | deleted; `{#if list.length}` |
| `(x.science_sections ?? …)` in six render sites | `pickScienceLinks(x.science_sections)` |
| `StationModulePanel.svelte:235–294`, `EarthObjectPanel.svelte:315–353`, `StationOrbitBanner.svelte:156–172` literal link lists | `ScienceCard expanded={false}` over `pickScienceLinks(entry.science)` |
| `body-entity.ts:102/140/178` `science: o.science_sections ?? … ?? []` | `science: pickScienceLinks(o.science_sections ?? …)` |
| `mp_science_blurb` ("every formula and named phase the {tab} tab references") | new wording, 14 locales (proposal: "Five concepts behind {name}, picked for this kind of mission.") |
| ~20 `chip_label_*` / `station_banner_*` / `panel_related_science_heading` keys | removed in 14 locales if no consumer remains (verify with `git grep` before) |
| 49 sr-Cyrl overlay files, 108 translated `tab` values | `tab` restored to the en-US value |
| comments "italic prefix" (`ScienceCard.svelte`, `planet.ts:46`) | the rule (upright line, A1) |

## 5. Allow-list (not changed, with reason)

- Inline `ScienceChip` per field: `MissionPanel.svelte:547–734`, `PlanetPanel.svelte:214–260`, `SpacecraftInfoCard`, `AscentLosses`, `CoastScene`, `DescentScene`, `LaunchTelemetry`, `/fly`, `/plan` — one glyph per labelled value, ADR-036, A4 STAY.
- Single contextual links: `PhasePanel.svelte:49`, `BlackHolePanel.svelte:92`, `StarPanel.svelte:346`, `EarthObjectPanel.svelte:302–306` (ISS milestone), `SurfaceScene` apollo11 milestone, `ConicSectionPanel`, `WhyPopover`, `FlightDirectorBanner`, `MicrogravityAxesLegend`, `MilkyWayPanel`, `explore/+page.svelte:807–813`, `ScaleStrip`, `HudControls` coplanar-trajectories links.
- `ScienceLayersPanel` (lens, per-layer learn, historical foundations) and `lens-panel.ts`.
- Outbound library links (`LearnLink`, `PanelLinkTiers`, `CultureDoorCard`) — different system (ADR-051).
- `/science` itself (`ScienceSearch`, section pages, `science-index.json`: the search index, `scripts/build-science-index.ts`; **not** a link source for panels).
- Mark with `b2-keep: <why>` in code where the check could match.

## 6. Hit list (baseline at `34019040ba8`: **133 violations**; full output `b2-check-out.txt`)

| Kind | Count | Where |
|---|---|---|
| NO-HELPER-FILE | 2 | `src/lib/science-links.ts`, `src/lib/science-links.test.ts` |
| PANEL-NOT-USING-HELPER | 10 | `PlanetPanel`, `SunPanel`, `SmallBodyPanel`, `SatellitePanel`, `BeltPanel`, `MissionPanel`, `FleetEntryPanel`, `StationModulePanel` (`src/lib/components/`), `EarthObjectPanel` (`src/lib/surface-scene/`), `src/lib/data/body-entity.ts` |
| OLD-PUSHCHAIN | 19 | `MissionPanel.svelte:180, 182, 185–190, 194, 197, 199, 201, 203, 206, 208, 211, 213, 215, 217` |
| GENERIC-DEFAULT | 9 | `PlanetPanel.svelte:34, 198, 201`; `SunPanel.svelte:25, 114, 117`; `SmallBodyPanel.svelte:25, 67, 95` |
| HARDCODED-LINK | 22 | `StationModulePanel.svelte:241–289` (11), `EarthObjectPanel.svelte:303, 317–345` (6, of which 303 is an allow-listed single link: mark `b2-keep`), `StationOrbitBanner.svelte:156–170` (5) |
| LOCALE-REF-DRIFT | 49 | all `i18n-src/sr-Cyrl/{planets (8), satellites (16), small-bodies (22), belts (2), sun.json}` files whose `tab`/`section` pairs differ from en-US |
| REGIME-REPEAT | 4 | Explore KUIPER, OORT, TERRESTRIAL; Mars HMO |
| SAME-LIST | 15 | satellites `deimos umbriel io titania`; small bodies `eros eurybates itokawa leucus makemake orus patroclus polymele psyche ryugu vesta` |
| SECTION-SHARE | 3 | planets: `axial-tilt-and-seasons`, `moons-of-the-system`, `active-spacecraft-survey` on 6 of 8 |

Files B2 edits (and, by name, the files it must not need): `src/lib/science-links.ts` (+ `.test.ts`), the nine consumers above, `src/types/planet.ts` (type + comment), `src/lib/components/ScienceCard.svelte` (comment only),
`src/lib/components/README.md` (add `science-links.ts` to the data helpers, `ScienceCard`/`ScienceChip` rows), `static/data/iss-modules.json`, `static/data/tiangong-modules.json`, `static/data/earth-objects.json`
(+ `static/data/schemas/*` for the new `science` field if those files have schemas; not checked), `i18n-src/<14 locales>/{planets,satellites,small-bodies,belts}/*.json` and `sun.json` (list edits and the sr-Cyrl repair),
`i18n-src/<14>/orbit-regimes{,-explore,-mars,-moon}/*.json` (`science_link`), `messages/*.json` (one rewritten key, ~20 removed keys), `scripts/i18n-tools/en-source-hashes.json`.
A5 is editing `SurfaceScene.svelte`, `SurfaceIndexPanel.svelte`, `LayerChipRow.svelte`, `OrbitRuler.svelte`, `explore/+page.svelte`, `HudControls.svelte`, `ScaleNav.svelte`, `earth-launch-sites-config.ts`, `moon/mars/venus/+page.svelte`, `+layout.svelte`, `messages/*.json`, `scripts/i18n-tools/{native-terms,ui-senses}.json` right now: **`messages/*.json` and `en-source-hashes.json` are shared with A5** (both add/remove keys); B2 lands its message edits in a separate commit after A5's, and re-reads the file before editing.

## 7. Tests, docs, locales

### Tests (written first where they reproduce a defect; repro-first)

New file `src/lib/science-links.test.ts` (vitest, node `fs` like `science-orphan-detector.test.ts`):
- **T1 cap.** For every panel type, every entry: `pickScienceLinks(list).length <= 5` and the raw data list `<= 5` (planets, Sun, satellites, small bodies, belts, fleet `science`, modules, Earth objects) and `rankMissionScience(m).length <= 5` for **all 126 mission files**.
- **T2 real sections.** Every `tab/section` exists at `static/data/science/<tab>/<section>.json` (as `science-orphan-detector.test.ts:380–412` does for regimes and fleet).
- **T3 body variety.** Planets, satellites, small bodies, belts: pairwise-distinct sets; no section on more than half of the panels of a type; every body has a list (the deleted defaults).
- **T4 rulers.** For each of the 4 ruler directories every pane has a `science_link` and no `tab/section` repeats inside the ruler.
- **T5 families.** For missions, station modules, Earth objects: the largest group of identical lists is at most 25 % of the family (recommended threshold, Q4); also logs the number of distinct lists. Fleet engines and suits are excluded (intentional primers).
- **T6 locales (red first).** For all 14 locales, every `science_sections[i].{tab,section}` and every `science_link` equals the en-US value. **Fails today on 49 sr-Cyrl files / 108 entries** (reproduces §0a.1) and is green after the data repair.
- **T7 helper.** dedupe by `tab/section` (first wins), order kept, `max` honoured, `undefined` and empty input, entry with `why` kept intact.
- **T8 coverage.** The union of sections reachable from the module lists contains all 11 sections of the old cluster; the union reachable from mission classes + pins contains the 7 sections named in §0a.5.
- **Mutation check (replay-proven-fix spirit):** the lead flips one assertion per test (add a sixth entry, repeat a regime link, translate one tab) and sees each test fail.

Existing tests to adjust: `src/lib/science-orphan-detector.test.ts` (add the new data files to `DATA_LINK_FILES` / its scan if the lists move to JSON; confirm the 7 sections of §0a.5 stay reachable; re-run), `science-deeplink-coverage.test.ts`, `src/lib/data/entity-loaders.test.ts` (the entity `science` shape), `scripts/build-science-index.test.ts` and `science-index-coverage.test.ts` (unchanged unless counts are asserted: not read).
New e2e `tests/e2e/science-links-cap.spec.ts` (3 projects: desktop-chromium, mobile-chromium, mobile-landscape-chromium): open one panel of each shape and assert `[data-science-card]` (+ the module/earth-object card lists) `<= 5` — mission with 21 today (`mars-express`), a lunar mission (20), an ISS module (11), an Earth object, a planet, a small body, and two regime panes (GIANTS, TERRESTRIAL) whose single card **differs**. Route/query shapes (`/missions?id=…`, `/explore?regime=GIANTS` is quoted in the plan, others to be read from the existing specs) are not verified here. No existing e2e asserts science-card counts (`git grep` of `data-science-card` in `tests/` is empty). Visual baselines: not predicted (no spec screenshot of a science block was identified; NV).

### Docs
- `docs/uxs/decisions/UXD-015-science-link-lists.md` (proposed; appendix draft below the acceptance section): the cap, the ranking, no defaults, the within-ruler rule; and update **UXD-010 Verification** (it says "Planned, not written") to point at T4 and the e2e. Index row in `docs/uxs/decisions/README.md`; `docs/uxs/CHANGE-INVENTORY.md:34` row B2 (status, decisions UXD-010 + UXD-015, specs).
- `docs/uxs/UXS-014.md` "Selecting & understanding an object": the ruler/science-links paragraph UXD-010 says does not exist yet; `UXS-001` (panel anatomy: science block, cap, order); link L10 for both.
- `AGENTS.md`: a row beside `AGENTS.md:110` (`/science` chips): "Science link lists: ≤ 5 `ScienceCard`s per panel through `pickScienceLinks`; no per-type defaults; lists curated per body; enforced by `src/lib/science-links.test.ts`". `docs/adr/TA.md:207` (the ?-chip paragraph) gets the one-sentence list rule; `src/lib/components/README.md` rows.
- `docs/guides/` for adding a body or mission class: a short "how to give a new body its science links" in the existing data-authoring guide (the file was not identified: NV).
- Comments to rewrite: `ScienceCard.svelte` header and `why` prop, `planet.ts:46`, `PlanetPanel.svelte:20–32` (default-list paragraph), `RegimePanel.svelte` header, `SmallBodyPanel.svelte:67–69`.

### Locales (all 14; `validate-data` green)
- **Structure only (no text):** 24 regime `science_link` files × 14; the 49 sr-Cyrl `tab` repairs; list edits to planet / satellite / small-body / belt overlays (mirror of the en-US pairs, `why` per locale untouched). A script copies pairs; the T6 test proves it.
- **Text:** `mp_science_blurb` rewritten (14 locales, by hand with the glossary, no paid run); ~20 orphaned keys removed in 14 files (no translation; the 14-file diff shows deletions only); any `why` removed or changed because its section left a list: the line goes with the entry (no orphan `why`), changed text = science-reviewer + 14 locales by hand. Per-locale check shown after the edit (`git diff --stat -- messages i18n-src`), and `scripts/i18n-tools/en-source-hashes.json` refreshed for changed en-US strings.
- Numbers or facts in any changed `why` follow the "Numbers in all locales" rule (validate + change in all 14, show the per-locale check).

## 8. Screenshots for the operator (dev server, per AGENTS "Iterating on UI"; not Docker)

Desktop 1440x900 and phone 390x844, before (this commit) and after, one sheet per viewport, 9 scenes: 1. mission panel SCIENCE tab for `mars-express` (21 today) and `apollo11` (20), 2. a lunar-orbiter and a Mars-lander
mission (the class lists differ), 3. ISS module panel (Destiny) and a Tiangong module (Wentian), 4. Earth-object panel (GPS) and ISS, 5. Jupiter and Mars planet panels (OVERVIEW science block), 6. Europa and Io (satellite lists no longer equal) and Ceres / Vesta (small bodies), 7. `/explore?regime=GIANTS` and TERRESTRIAL, BELT and KUIPER panes (one card each, all different), 8. Belt panel (one link), 9. one `sr-Cyrl` planet panel (the 5 cards resolve to titles, not "loading"). Heights are read from the shots, not from CSS.

## 9. Decisions and open questions (operator) — recommendation first

Already decided (not re-asked): UXD-010 (regime cards, cap of five in this slice); S2 "1–5 is more than enough, varied per type"; S1 "need not be complete"; A4's `ScienceChip` STAY; the "no partial update" rule.

- **Q1 What the cap counts.** Recommended: lists of `/science` destinations in a panel or banner (rows 1–11 of §1.1), counted per distinct destination; inline per-field `ScienceChip`s, single contextual links, the Science Lens panel and outbound library links are not counted. Alternative: also cap `ScienceChip`s per panel (MissionPanel FLIGHT 6, PlanetPanel TECHNICAL 5, `/fly` 8) and the lens' per-layer links. The alternative would remove the info glyph next to labels, which the operator did not ask for.
- **Q2 `ScienceChip`: keep or change?** Recommended: keep as is (14 px glyph, 24 px hit area, `--color-state`), outside the chip family and the cap — reason in §1 (A4 row). No code change in B2.
- **Q3 Where the per-body lists live.** Recommended: keep them in the locale overlays; B2 repairs sr-Cyrl and adds T6 so the pairs can never drift again (49 files, a script). Alternative: one language-neutral list file per body type (`tab`/`section` in `static/data/…`, only `why` in the overlays), which removes 13 copies of every list and the whole drift class, at the cost of touching ~4 loaders and ~710 overlay files. Recommend the alternative as a separate later slice; ask the operator if they want it inside B2.
- **Q4 What "no two panels of one type with the same list" means for families of 31–126.** Recommended: strict (pairwise distinct) for the bodies and rulers (51 body panels + 24 regime panes); for missions, station modules and Earth objects the largest group of identical lists is at most 25 % of the family (126 → 31, 22 → 5, 31 → 7). Measured today: modules 100 % (22 of 22), Earth objects 97 % (30 of 31), missions 33 % (41 of 126; 14 groups identical). Whether the mission class table reaches 25 % is **not** proven here (§12 NV3). A literal "all 126 missions distinct" needs 126 hand-curated lists = science content for 126 missions, which the operator's S1 ("need not be complete") does not ask for. Fleet engines and suits are excluded (the two primers are intentional).
- **Q5 Regime uniqueness scope.** Recommended: no repeat **within one ruler** (UXD-010 as accepted; 0 repeats after §3.5); across the four rulers a concept may repeat where the physics is the same (max 3 instead of 5). Alternative: all 24 panes distinct: 8 more swaps, with worse matches (GEO / areostationary, the three Hill spheres).
- **Q6 Do regime panes get more than one card?** Recommended: no, one best card per pane (UXD-010 wording, panes are short). Alternative: up to 3, which doubles the content to review.
- **Q7 Mission SCIENCE tab: keep as a tab or fold into OVERVIEW like the planets (2026-06-21)?** Recommended: keep the tab (B1 and B3 own panel structure; folding it changes the tab count and the tab e2e). With five cards the tab is no longer a wall.
- **Q8 Card form for the lists that were one-line links** (modules, Earth objects, banner). Recommended: `ScienceCard expanded={false}` (title + intro, no preview) through the helper, no new message keys, and the orphaned labels removed. Alternative: keep one-line links and write 22+31 per-entry labels as new message keys in 14 locales (≈ 50 new keys): more translation, no benefit.
- **Q9 `mp_science_blurb` wording.** Recommended: "Five concepts behind {name}, picked for this kind of mission." (drop `{tab}`); hand translation in 14 locales. Operator may want a different tone.
- **Q10 Ownership of the class table.** Recommended: the implementer drafts it from §3.3, the science-reviewer checks each class-to-section pairing and the 11-section module distribution (read-only, web), the operator sees the final table as part of the status (not per class). Content changes that need native-speaker review are not listed (memory `no-native-speaker-review`).

## 10. Check (re-run by the independent checker; must print `B2-CHECK violations: 0`)

Baseline: **133 violations** at `34019040ba8` (`NO-HELPER-FILE` 2, `PANEL-NOT-USING-HELPER` 10, `OLD-PUSHCHAIN` 19, `GENERIC-DEFAULT` 9, `HARDCODED-LINK` 22, `LOCALE-REF-DRIFT` 49, `REGIME-REPEAT` 4, `SAME-LIST` 15, `SECTION-SHARE` 3).
Save as `b2-check.mjs` in a scratch folder (not added to the repo), run from the repo root: `node b2-check.mjs`. Allow marker: `b2-keep: <why>` on the line or the line above it.

```js
// B2-CHECK (slice B2, science links) — run from the repo root: node b2-check.mjs
// Prints each violation as "KIND  where  detail", then "B2-CHECK violations: N".
// Allow marker: `b2-keep: <why>` on the line itself or the line directly above it.
// Read-only. Pure node (no TypeScript import): the ranking itself is proven by
// src/lib/science-links.test.ts; this script proves the old patterns are gone and the data obeys the rule.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = execSync('git rev-parse --show-toplevel').toString().trim();
process.chdir(root);
const viol = [];
const v = (kind, where, detail = '') => viol.push({ kind, where, detail });
const rj = (p) => JSON.parse(readFileSync(p, 'utf8'));
const lines = (p) => readFileSync(p, 'utf8').split('\n');
const kept = (ls, i) => /b2-keep:/.test(ls[i]) || (i > 0 && /b2-keep:/.test(ls[i - 1]));
const MAX = 5;

// A. the helper and its test exist
for (const f of ['src/lib/science-links.ts', 'src/lib/science-links.test.ts']) {
  if (!existsSync(f)) v('NO-HELPER-FILE', f, 'missing');
}

// B. every panel that builds a science-link list goes through the helper
const PANELS = [
  'src/lib/components/PlanetPanel.svelte', 'src/lib/components/SunPanel.svelte',
  'src/lib/components/SmallBodyPanel.svelte', 'src/lib/components/SatellitePanel.svelte',
  'src/lib/components/BeltPanel.svelte', 'src/lib/components/MissionPanel.svelte',
  'src/lib/components/FleetEntryPanel.svelte', 'src/lib/components/StationModulePanel.svelte',
  'src/lib/surface-scene/EarthObjectPanel.svelte', 'src/lib/data/body-entity.ts',
];
for (const f of PANELS) {
  if (!readFileSync(f, 'utf8').includes('pickScienceLinks(')) v('PANEL-NOT-USING-HELPER', f, 'no pickScienceLinks( call');
}

// C. the MissionPanel push-chain
{
  const f = 'src/lib/components/MissionPanel.svelte';
  lines(f).forEach((l, i) => {
    if (/list\.push\(\{\s*tab:/.test(l) && !kept(lines(f), i)) v('OLD-PUSHCHAIN', `${f}:${i + 1}`, l.trim().slice(0, 70));
  });
}

// D. generic per-type defaults
for (const f of execSync('git ls-files src', { maxBuffer: 1 << 26 }).toString().split('\n').filter((x) => /\.(svelte|ts)$/.test(x))) {
  const ls = lines(f);
  ls.forEach((l, i) => {
    if (/\b(PLANET|SUN|SMALL_BODY)_SCIENCE_SECTIONS\b/.test(l) && !kept(ls, i)) v('GENERIC-DEFAULT', `${f}:${i + 1}`, l.trim().slice(0, 70));
  });
}

// E. hard-coded /science link lists inside panels and banners
for (const f of [
  'src/lib/components/StationModulePanel.svelte', 'src/lib/surface-scene/EarthObjectPanel.svelte',
  'src/lib/components/StationOrbitBanner.svelte',
]) {
  const ls = lines(f);
  ls.forEach((l, i) => {
    if (/localHref\(`\/science\//.test(l) && !kept(ls, i)) v('HARDCODED-LINK', `${f}:${i + 1}`, l.trim().slice(0, 70));
  });
}

// F. data: no body overlay or fleet entry names more than MAX sections
const locales = readdirSync('i18n-src');
const bodyDirs = ['planets', 'satellites', 'small-bodies', 'belts'];
const overlayFiles = [];
for (const loc of locales) {
  for (const d of bodyDirs) {
    const dir = join('i18n-src', loc, d);
    if (existsSync(dir)) for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) overlayFiles.push([loc, d, f, join(dir, f)]);
  }
  const sun = join('i18n-src', loc, 'sun.json');
  if (existsSync(sun)) overlayFiles.push([loc, '.', 'sun.json', sun]);
}
for (const [loc, d, f, p] of overlayFiles) {
  const n = (rj(p).science_sections ?? []).length;
  if (n > MAX) v('DATA-OVER-5', p, `${n} sections`);
}
function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (n.endsWith('.json')) out.push(p);
  }
  return out;
}
for (const p of walk('static/data/fleet')) {
  const s = rj(p).science;
  if (Array.isArray(s) && s.length > MAX) v('DATA-OVER-5', p, `${s.length} slugs`);
}

// G. the section reference (tab/section) is language-neutral: every locale equals en-US
const refs = (o) => (o.science_sections ?? []).map((e) => `${e.tab}/${e.section}`).join(',');
for (const [loc, d, f, p] of overlayFiles) {
  if (loc === 'en-US') continue;
  const en = join('i18n-src', 'en-US', d, f);
  if (!existsSync(en)) continue;
  if (refs(rj(p)) !== refs(rj(en))) v('LOCALE-REF-DRIFT', p, 'tab/section list differs from en-US');
}

// H. orbit-ruler regimes: within one ruler every pane has its own best card
for (const d of ['orbit-regimes', 'orbit-regimes-explore', 'orbit-regimes-mars', 'orbit-regimes-moon']) {
  const seen = new Map();
  for (const f of readdirSync(join('i18n-src/en-US', d)).filter((x) => x.endsWith('.json')).sort()) {
    const l = rj(join('i18n-src/en-US', d, f)).science_link;
    const k = l ? `${l.tab}/${l.section}` : null;
    if (!k) { v('REGIME-NO-LINK', `${d}/${f}`, 'no science_link'); continue; }
    if (seen.has(k)) v('REGIME-REPEAT', `${d}/${f}`, `${k} also on ${seen.get(k)}`);
    else seen.set(k, f);
  }
}

// I. body-type panels: no two with the same list (en-US overlays)
for (const d of ['planets', 'satellites', 'small-bodies', 'belts']) {
  const seen = new Map();
  const planetIds = new Set(rj('static/data/planets.json').planets.map((p) => p.name.toLowerCase()).filter((n) => n !== 'pluto')); // Pluto renders in SmallBodyPanel
  for (const f of readdirSync(join('i18n-src/en-US', d)).filter((x) => x.endsWith('.json')).sort()) {
    if (d === 'planets' && !planetIds.has(f.replace('.json', ''))) continue; // leftover small-body files in planets/
    const k = (rj(join('i18n-src/en-US', d, f)).science_sections ?? []).map((e) => `${e.tab}/${e.section}`).sort().join(',');
    if (seen.has(k)) v('SAME-LIST', `${d}/${f}`, `same list as ${seen.get(k)}`);
    else seen.set(k, f);
  }
}

// J. variety inside a body type: one section on more than half of the panels of that type
for (const d of ['planets', 'satellites', 'small-bodies']) {
  const planetIds = new Set(rj('static/data/planets.json').planets.map((p) => p.name.toLowerCase()).filter((n) => n !== 'pluto')); // Pluto renders in SmallBodyPanel
  const files = readdirSync(join('i18n-src/en-US', d)).filter((x) => x.endsWith('.json') && (d !== 'planets' || planetIds.has(x.replace('.json', ''))));
  const count = {};
  for (const f of files) for (const e of new Set((rj(join('i18n-src/en-US', d, f)).science_sections ?? []).map((e) => `${e.tab}/${e.section}`))) count[e] = (count[e] ?? 0) + 1;
  for (const [s, n] of Object.entries(count)) if (n > files.length / 2) v('SECTION-SHARE', `${d}`, `${s} on ${n} of ${files.length}`);
}

for (const x of viol) console.log(`${x.kind.padEnd(24)} ${x.where}  ${x.detail}`);
const by = {};
for (const x of viol) by[x.kind] = (by[x.kind] ?? 0) + 1;
console.log('by kind:', JSON.stringify(by));
console.log(`B2-CHECK violations: ${viol.length}`);
```
Known limits of the check: it greps for the old patterns, reads the en-US and per-locale JSON, and requires `pickScienceLinks(` in ten files; it does **not** run the ranking (TypeScript with `$lib`
aliases does not load in plain node), so the cap on missions, the family-share rule and the "union covers the 11 sections" rule are proven only by the vitest file `src/lib/science-links.test.ts` (§7).
It does not detect a list that is hard-coded under a new name outside the files it lists (the runtime sweep in `science-links-cap.spec.ts` is the second net for that). `OLD-PUSHCHAIN` counts
single-line `list.push({ tab:` calls (19 at HEAD); a push split over two lines would be missed. It has no tests of its own and ran once, at baseline.


## 11. Acceptance (definition of done, per the plan; the lead checks each with command and output)

1. **Whole project.** `node b2-check.mjs` prints `B2-CHECK violations: 0`; `git grep -nE "\b(PLANET|SUN|SMALL_BODY)_SCIENCE_SECTIONS\b" -- src` is empty; `git grep -n "chip_label_pressurized_volume" -- src messages/en-US.json` is empty (and the other removed keys, one `git grep` per key listed in the commit body).
2. **Docs.** §7 Docs state the new rule: AGENTS.md row, TA.md, UXS-001 / UXS-014, README rows, UXD-015 `accepted` only on the operator's recorded go; UXD-010 Verification points at T4 and the e2e; CHANGE-INVENTORY row B2 updated; no "italic prefix" left (`git grep -n "italic prefix" -- src docs/uxs`).
3. **Tests.** `src/lib/science-links.test.ts` T1–T8 green (T6 written first and shown red on sr-Cyrl, then green); orphan detector, deeplink coverage, entity-loaders tests green; `science-links-cap.spec.ts` plus the re-run list (the specs that open mission, planet, small-body, satellite, station-module, Earth-object and regime panels, `a11y`, `type-floor`, `smoke`, `i18n-all-routes`) green on desktop-chromium, mobile-chromium, mobile-landscape-chromium; nothing skipped; `npm run preflight:coverage` once before the push (coverage floors are a frozen ratchet; the new file ships with its tests).
4. **Locales.** `mp_science_blurb` and the sr-Cyrl repair in 14 / 1 locales; removed keys gone from 14 files; `git diff --stat -- messages i18n-src static/data` shown; `validate-data` green; `check-i18n-en-source` green after the hash refresh.
5. **Done when (plan line 339):** no panel exceeds five (T1 over all 289 panels + the e2e sample); no two panels of one type with the same list (T3 for bodies, T4 for rulers, T5 for the three families per Q4).
6. The operator receives the §8 sheets and answers §9.

### Appendix — draft `docs/uxs/decisions/UXD-015-science-link-lists.md` (proposed; written when the go comes, not now)
```markdown
# UXD-015 — Science links: at most five per panel, curated per body, ranked per mission

- **Status**: proposed
- **Date**: 2026-11-12 (proposed)
- **Decider**: the operator — S1/S2 and O6 in `docs/wip/2026-11-11-ux-feedback-plan.md` (lines 61–62, 177) and UXD-010; the go on this record is pending
- **Answers**: S1, S2, O6; slice B2
- **Changes**: AGENTS.md design rules; `docs/uxs/UXS-001.md`, `UXS-014.md`; TA.md §?-chip; `src/lib/components/README.md`

## Context
At `34019040ba8` 102 of 289 panels showed more than five science links (mission panels up to 21, every station module the same 11), 3 planet sections sat on 6 of 8 planet panels, 15 small-body and satellite panels repeated another's list, four ruler panes repeated a card inside their ruler, and 108 Serbian list entries pointed at section ids that do not exist.

## Options
1. A cap in one shared helper + curated lists per body + a ranked pick per mission class + a data test. 2. A cap only (slice the first five). 3. Hand-curate every panel.

## Decision
Option 1: `pickScienceLinks` (≤ 5, deduped) for every list of `/science` destinations in a panel or banner; no per-type default list; body lists curated; missions ranked by class and defining phase from language-neutral data; each ruler regime its own card within its ruler; the section pairs identical in all 14 locales. Inline `ScienceChip`s, single contextual links, the lens panel and outbound library links are outside the rule.

## Consequences
One helper, one test file, a mission class table, ~20 message keys removed, one rewritten, 49 sr-Cyrl files repaired; the family-share threshold (25 %) is a tuning knob in the test.

## Verification
`src/lib/science-links.test.ts` (T1–T8), `tests/e2e/science-links-cap.spec.ts` on three projects; `b2-check.mjs` prints `B2-CHECK violations: 0`.
```

## 12. NOT VERIFIED (what this brief did not check)

- NV1 No browser, no build, no test run: no rendered card height, no screenshot, no statement about how a panel looks; the "~130 px per card" is CSS arithmetic, the 16 fewer requests on a 21-card panel is counting.
- NV2 `b2-measure.mjs` re-implements the panels' list code. `MissionPanel` was transcribed from `:174–219`; any divergence (a mission `flight` field read differently at runtime, an overlay merge that adds `science_sections` from another source) would change a count. Planets: Pluto excluded on the strength of `explore/+page.svelte:252`, not on a run. Engines: the `specs.cycle` card is not added (+1 for some).
- NV3 Whether the draft class table (§3.3) reaches the 25 % family share for missions is **unproven**: I computed only today's share (41 of 126 identical) and class sizes by eye from `dest` counts (EARTH 41 / MOON 32 / MARS 20 …), not by running the classifier. Station modules (22 modules, 7 roles) and Earth objects (31 objects, 8 groups) are unproven the same way; 22 modules at 25 % means no more than 5 modules with one list.
- NV4 The class table pairings (`transfers/free-return` for crewed lunar, `propulsion/ion-drive` for small bodies, `scales-time/au` for the heliopause, `planets/moons-of-the-system` for GIANTS …) are my reading of section titles. No section body was read for relevance or accuracy; the science-reviewer gate has not run. All `tab/section` ids were checked to exist by `ls static/data/science/<tab>/`.
- NV5 Orphan impact: the list in §0a.5 comes from `git grep` file counts (2 files each), not from running `science-orphan-detector.test.ts` before and after.
- NV6 `static/data/schemas/*` for `iss-modules`, `tiangong-modules`, `earth-objects` and the fleet schema were not read: whether a new `science` field needs a schema entry (and whether `validate-data` rejects unknown fields) is unknown.
- NV7 Which spec files open which panels, their route/query shapes, and which visual baselines include a science block were not read beyond one `git grep` (no e2e names a science card). The re-run list in §11 is by panel type, not by file.
- NV8 `ScienceCard` type sizes against the A1 floor (title 13 px display font, `.preview` 13 px Crimson Pro, `:60–140` of the file) were read but not judged: A1's brief and sweep were not re-opened; if A1 left them, that is a card-look question for a later pass, not B2.
- NV9 Entity pages: `git grep -n -i science -- "src/routes/missions/[id]" "src/routes/fleet/[id]"` is empty, so those two entity pages carry no science list of their own; the loaders behind them were not read. Only `/explore/[id]` (via `body-entity.ts`) was read in full.
- NV10 `Mission.type` is free text in the overlay (all 126 en-US values were not read, only the 30 most frequent); the claim that it cannot be a ranking key rests on its being a translated display string.
- NV11 The sr-Cyrl repair was found by `jq` and a loop over the other 12 locales (`ar de es fr hi it ja ko nl pt-BR ru zh-CN` = 0 non-ASCII tabs); the cause (a retranslation pass touched `tab`) was not traced. Hebrew (pilot, not shipped) was not checked.
- NV12 The 22 / 31 / 24 hand-written replacement lists, the planet swaps that bring three sections under half, and the small-body and satellite distinctness fixes are **not drafted here**; only the rules, the targets and the regime table are. The implementer drafts and the science-reviewer gates.
- NV13 `messages/*.json` and `scripts/i18n-tools/*.json` carry uncommitted edits from another agent at this HEAD (`git status`); key counts (`chip_label_*` = 54 keys; 20 with one consumer) were read from the working tree, so they may shift when A5 commits.
- NV14 `b2-check.mjs` ran once at baseline (133); it has no tests of its own and was not run against a fixed tree.
