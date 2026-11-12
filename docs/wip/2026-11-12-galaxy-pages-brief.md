# Galaxy and outer-scale entity pages brief — Local Group, Local Sheet, Virgo, Laniakea, Cosmic web
Brief, 2026-11-12, written at HEAD `e09e6cc4c51` on `tech-debt/0.9.9`. Read-only investigation: nothing in `src/`, `scripts/`, `static/` or `i18n-src/` was changed. Follows `docs/wip/2026-11-12-deep-entity-pages-brief.md` (inventory, floors) and `docs/wip/2026-11-12-deep-sky-pages-brief.md` (the model whose 8 approved recommendations this brief copies). Text pipeline: `docs/wip/deep-text/README.md`. Milestone: `docs/wip/2026-11-11-ux-feedback-plan.md:359` ("Milestone before D": galaxy / Local Group entities and pages are on the list).

Operator rule 2026-11-12, which replaces the earlier brief's "never as separate pages" (`2026-11-12-deep-entity-pages-brief.md:16`) and ADR-096 item 15 ("once each entity's text clears the floor", `docs/adr/ADR-096.md:116–123`): every entity has a panel, a deep link and a page, and its INDEX row links the page. Each real object has ONE page; doubles are aliases.

Method. Measuring scripts are files in the session scratchpad `…/scratchpad/`, all prefixed `gal-` (`gal-lg.mjs`, `gal-ds.mjs`, `gal-ids.mjs`, `gal-measure.mjs`, `gal-nt.mjs`, `gal-nt2.mjs`, `gal-text.mjs`), run from the repo root; floors are read from `scripts/check-seo.mjs:54` by regex, not copied. Characters are counted the way `check-seo` counts (whitespace removed). **No page for these entities exists, so every character figure is a MODEL of the page text, not a build measurement** (same limit as both earlier briefs; §6).

## 0. Answer first

| Question | Answer |
|---|---|
| Entity rows in scope | 5 outer scales hold 64 rows = **63 distinct ids** (`gal-ids.mjs`): Local Group 33, Local Sheet 9, Virgo 7, Laniakea 8, Cosmic web 7; `local-group` is a row in both Local Sheet and Virgo. Plus the Milky Way scale's 2 Magellanic pins, which are the same ids as the Local Group's `lmc` / `smc` (covered once here, no extra pages). |
| New pages | **59** (× 14 locales = **826** page-locales): 29 galaxies (Milky Way, LMC, SMC, 26 dwarfs) + 30 structures (9 groups, 5 clouds, 3 clusters, 7 superclusters, 1 attractor, 1 concentration, 3 walls, 1 void). |
| Same real object as an existing page | **4**: `andromeda` → `m31` and `triangulum` → `m33` (aliases in `DEEP_SKY_ALIAS`, `scripts/site-routes.mjs:212–217`), `m32` and `m110` (same id, page exists). No new page, rows already link. |
| Structures, not single objects | **30** of the 59. The operator's rule gives them pages (decision 2). 4 of them are not objects a catalogue holds: the Boötes Void, the Sloan Great Wall, the Coma / CfA2 Great Wall, the Perseus–Pisces wall (`kind: void`, `wall`). |
| Text today | **No entity has any entity-specific text.** Every panel shows a kind-level blurb (28 of 33 Local Group members show one dwarf sentence). 8 `/science` articles cover 8 headliners. the first brief modelled 0 of 33 Local Group members over the floor (225–263 en-US against 350), 8 of 9 Local Sheet pages over it on one repeated paragraph, 0 of 7 Virgo, 0 of 8 Laniakea, 0 of 7 Cosmic web in all 14 locales (`2026-11-12-deep-entity-pages-brief.md:65–70`); no entity has text of its own. |
| Text needed | At least about 240–260 non-space characters of prose in en-US (worst case, fr 328), i.e. the writers' 400–600 characters (with spaces) fact + bio already clears every locale on this model. §2.3. |
| Cost | **2 batches** (galaxies 29, structures 30), writer + review about 0.6–0.8 million tokens in total (derived from the recorded batch costs, §3.5). |
| New URL prefixes | `/explore/galaxies/<id>` (29) and `/explore/structures/<id>` (30). Recommended in §3.1, decision 1. |

## 1. Entity inventory

### 1.1 Local Group (`static/data/universe/local-group.json`, 33 members, `members[]`)

Counts by `kind`: spiral 3, irregular 2, dwarf-spheroidal 17, dwarf-elliptical 2, dwarf-irregular 9; headliners 6 (`milky-way andromeda triangulum lmc smc ngc-6822`).

| Group | Ids | n | Page |
|---|---|---|---|
| Twin, existing deep-sky page, alias | `andromeda` → `m31`, `triangulum` → `m33` | 2 | exists; INDEX rows already link (`scale-index.ts:243–257`) |
| Twin, same id, existing page | `m32`, `m110` (dwarf-elliptical) | 2 | exists |
| Spiral / major | `milky-way` | 1 | new |
| Magellanic Clouds (satellite of Milky Way, also `?galaxy=lmc|smc` pins) | `lmc`, `smc` | 2 | new |
| Milky Way dwarf spheroidals | `sagittarius-dsph ursa-minor-dwarf draco-dwarf sculptor-dwarf sextans-dwarf carina-dwarf fornax-dwarf leo-i leo-ii` | 9 | new |
| Andromeda dwarfs | `ngc-147 ngc-185 andromeda-i andromeda-ii andromeda-iii pegasus-dsph` (named "Andromeda VI (Pegasus)") dSph; `ic-10` dIrr | 7 | new |
| Independent dwarfs | dIrr `ngc-6822 ic-1613 wlm leo-a phoenix-dwarf sagittarius-dirr aquarius-dwarf pegasus-dirr`; dSph `tucana-dwarf cetus-dwarf` | 10 | new |
| **New pages** | | **29** | = 3 + 9 + 7 + 10 |

Checked at repo root (`gal-ds.mjs`, `gal-ids.mjs`): none of the 29 new ids equals a deep-sky, star, black-hole or body id; none of them is a record of `deep-sky-objects.json`. Related, not the same object (cross-link, no alias): `sagittarius-dsph` and `m54` (M54 sits in the Sagittarius dwarf; distances agree, 84,800 ly in `local-group.json` against 85,714 ly in `deep-sky-objects.json`); LMC and `30-doradus`; SMC and `ngc-346`, `ngc-602`; M33 and `ngc-604`. Whether M54 is the dwarf's nucleus is a literature statement the writer must source (§6).

### 1.2 Local Sheet, Virgo, Laniakea, Cosmic web (structures)

Files `local-sheet.json`, `virgo-cluster.json`, `laniakea.json`, `cosmic-web.json`, all `members[]`. 30 distinct ids.

| Scale | Rows | Ids (kind) | New pages |
|---|---|---|---|
| Local Sheet | 9 | `local-group` (group, headliner), `ic-342-group`, `m81-group`, `centaurus-a-group`, `sculptor-group` (group, headliners), `maffei-group`, `ngc-6946-group`, `m101-group` (group), `canes-venatici-i` (cloud) | 9 |
| Virgo | 7 | `local-group` (second row, same page), `virgo-cluster` (cluster, headliner), `canes-venatici-spur`, `leo-i-cloud`, `ursa-major-cloud`, `virgo-ii-groups` (cloud), `ngc-5846-group` (group) | 6 |
| Laniakea | 8 | `virgo-supercluster`, `great-attractor` (attractor), `hydra-centaurus` (supercluster, headliners), `centaurus-cluster`, `antlia-cluster` (cluster), `pavo-indus`, `ophiuchus-supercluster`, `fornax-eridanus` (supercluster) | 8 |
| Cosmic web | 7 | `laniakea` (supercluster, headliner), `shapley-concentration` (concentration, headliner), `sloan-great-wall` (wall, headliner), `perseus-pisces`, `coma-great-wall` (wall), `bootes-void` (void), `horologium-reticulum` (supercluster) | 7 |
| **Distinct** | 31 rows | `local-group` counted once | **30** |

Kinds across the 30: group 9, cloud 5, cluster 3, supercluster 7, attractor 1, concentration 1, wall 3, void 1.

Not the same object as an existing page, cross-link only (parts, not doubles): `virgo-cluster` ⊃ `m87` (page) ⊃ `m87-star` (black-hole page; the scene gives M87* no pin of its own, `explore-scene-host.ts:3000` area); `m81-group` and `m81`; `ic-342-group` and `ic-342`; `m101-group` and `m101`; `centaurus-a-group` and `m83`; `leo-i-cloud` and `m96`; `perseus-pisces` (supercluster) and `perseus-cluster` (a cluster inside it). **No id collision** of the 30 with any existing page (`gal-ids.mjs`: only `m32`, `m110` print "ID TAKEN", both Local Group twins).

### 1.3 Milky Way scale residue (`milky-way-schematic.json`)

Not new pages for this brief unless decided otherwise: `lmc`, `smc` (the Local Group pages above; the Milky Way scale's two satellite rows link them), the 10 globulars (7 have a page under their own id; `omega-centauri` is an alias of `ngc-5139`, which has a page; **`47-tucanae` and `ngc-6752` have no deep-sky record and no page**), `sagittarius-a-star` (black-hole page), `sun` (no `/explore/sun` page exists: `gal-ids.mjs` prints `flat explore ids incl sun? false`), 5 spiral arms (`perseus scutum-centaurus sagittarius norma orion-spur`, structures with no data beyond a label position). The two globulars are deep-sky objects, so their pages belong to the deep-sky page set (add two records and two overlays), not to this brief; the Sun and the arms are decision 3.

## 2. Text status

### 2.1 What exists

| Entity set | Per-entity text today | Source |
|---|---|---|
| 33 Local Group members | none. One blurb per kind: dwarf 79 chars (28 members), spiral (3), irregular (2) | `messages/en-US.json:429–431`; `LocalGroupPanel.svelte:25–47` picks `blurb(member.kind)` |
| 30 structures | none. Local Sheet: anchor + 1 generic; Virgo: anchor + 1; Laniakea: anchor + attractor + 1; Cosmic web: anchor + void + 1 | `messages/en-US.json:314–322, 392–394, 452–453, 554–555`; the panels pick by `id` / `kind` (`LocalSheetPanel.svelte:30–32`, `VirgoPanel.svelte:35–37`, `LaniakeaPanel.svelte:36–42`, `CosmicWebPanel.svelte:28–31`) |
| Names | English, from the data file, in all 14 locales and in the panel title (`LocalGroupPanel.svelte:50` `member?.name`). `native-terms.json` has an exact-name key for 8 of the 59 in all locales, 11 with fewer than 14, none for **40** (`gal-nt2.mjs`; exact key match, so a name filed under another key is missed, §6). Full-locale: Milky Way, LMC, SMC, Local Group, Virgo Cluster, Virgo Supercluster, Great Attractor, Laniakea. Partial: Ursa Minor, Draco, Sculptor, Sextans, Fornax dwarfs, M81 Group, Sculptor Group, Maffei Group, Shapley Concentration. |
| Facts in data | `dist_mly` / `dist_mpc`, `diam_kly` / `diam_mly`, `kind`, `parent`, `headliner`. Local Group distances carry a catalogue entry (McConnachie 2012, VizieR record link, `local-group.json` `catalogue.dist_mly`, whole kpc); **the 30 structures have no catalogue entry** (hand values, `_provenance` cites NED, Karachentsev 2013, Tully, Cosmicflows). `cosmic-web.json` `_provenance` ends "Science-review pending (WS-5d)". |
| `/science` articles | 8: `observation/our-galaxy`, `andromeda-galaxy`, `magellanic-clouds`, `local-group`, `dwarf-spheroidals`, `galaxy-types`; `cosmology/laniakea-and-the-great-attractor`, `large-scale-structure` (2.5–4.9 kB JSON each, title + intro + body paragraphs + caption, 14 locales). They cover Milky Way, M31 / M33 (via `andromeda-galaxy`, `local-group`), LMC + SMC, the dSphs as a class, Laniakea + Great Attractor + Virgo Supercluster, large-scale structure as a class. |
| Images | not checked (B3 hero loader `getUniverseHero` was not built in the deep-sky brief; not re-checked). Pages ship without a hero, as deep-sky did. |

### 2.2 What is missing

59 entity texts (`fact` + `bio` + 1–2 `links`, the deep-sky overlay shape, e.g. `i18n-src/en-US/universe/deep-sky/m31.json`), 14 locales each = **826 overlay files**; names in `native-terms.json` for the 51 entities with no or partial entries (decision 5); the catalogue layer (#658) entries for the 30 structures' distances (decision 6).

### 2.3 Characters needed for the thin-page floor (model `gal-measure.mjs`)

Frame = what the template carries without prose: crumb (`explore_page_title` + name), kind line, H1 name, rows (membership for Local Group, distance with the locale's number format, diameter or span) and the CTA `launches_open_in_orrery`. It excludes a Data sources block, culture doors and "related" links, so it is the conservative case. Needed prose = floor − the smallest frame (non-space characters in that locale).

| Locale | Floor | Frame, min–max (Local Group) | Frame, min–max (structures) | Prose needed, worst case |
|---|---|---|---|---|
| en-US | 350 | 111–184 | 92–173 | 239 (galaxies), 258 (structures) |
| fr | 430 | 129–201 | 102–178 | 301, 328 |
| nl | 410 | 134–200 | 100–177 | 276, 310 |
| de / es / pt-BR / it / ru | 390–395 | 125–211 | 101–183 | 255–265, 284–289 |
| hi / ar | 345 / 330 | 102–176 | 89–191 | 228–235, 232–256 |
| sr-Cyrl | 315 | 124–200 | 97–177 | 191, 218 |
| zh-CN / ja / ko | 175 / 190 / 175 | 69–132 | 67–163 | 105–115, 108–118 |

Reading: today's generic blurb (en-US 79 characters for a dwarf) plus the frame gives about 190–260 en-US, matching the first brief's 225 minimum for the Local Group; the structures' longer shared blurbs reach 293–432 (first brief), which is why 8 Local Sheet pages passed on one paragraph. A fact + bio of 400–600 characters with spaces is about 330–500 non-space characters in en-US, 1.1–1.2x that in fr / nl, so it clears the worst case in every locale on this model (fr needs 328, a 400-character en-US text translated to fr is about 360–390 non-space). A **300-character en-US text would fail fr and nl** on this model; the shortest en-US text that clears all 14 is about 330–350 characters with spaces. The deep-sky brief's zh-CN margin was 10 characters (`m21`); here zh-CN needs 105–118 and a 400-character English text gives well above that, but the real build decides (acceptance, §5).

## 3. Proposal

### 3.1 URL scheme (decision 1)

| Option | For | Against |
|---|---|---|
| **A. Two typed paths, `/explore/galaxies/<id>` (29) and `/explore/structures/<id>` (30)** | reads right in the URL and the crumb; matches `stars`, `black-holes`, `deep-sky` (typed paths, ADR-096 items 13, 16, 17); both are 2-segment-under-`explore` paths that `hubIds('explore')` and `entityIds` already skip (`entity-index.ts:50–58`); the 30 structures are not galaxies | M31 / M33 / M32 / M110 live under `/explore/deep-sky/`, so the galaxies path is partial: 4 of the 33 Local Group rows link `/explore/deep-sky/…` (as ADR-096 item 17 already decided: one object, one page, under the id that has a record) |
| B. `/explore/deep-sky/<id>` for the 29 galaxies | one loader | `getDeepSkyEntity` needs a record in `deep-sky-objects.json` (ra/dec, constellation, category, catalogue); the file drives the neighbourhood INDEX rows (`scale-index.ts:365–375`) and the scene ring, so adding 29 Local Group dwarfs 0.1–3.5 Mly away puts them in the neighbourhood scale. Rejected. |
| C. One path `/explore/galaxies/<id>` for all 59 | one loader | "galaxies" for a wall or a void is wrong in the URL and the structured data. |
| D. One path per scale (`/explore/local-group/…`, `/explore/virgo/…`, …) | follows the INDEX | `local-group` and `laniakea` are rows of two scales, so the canonical prefix of those two pages is arbitrary. |

Recommend A. Cost in code: both routes share one loader module (`src/lib/data/outer-entity.ts`, server-only, `getGalaxyEntity` / `getStructureEntity`) and one page component; the second `+page.server.ts` is a copy with a different id list.

### 3.2 Page template (reuse the deep-sky page)

`src/routes/explore/deep-sky/[id]/+page.svelte` (127 lines) is the template: `entity-page.css`, crumb, kind line, H1 name, `fact` as lede, `bio` as `dispatch`, `dl.facts`, `DataSources`, "Learn more" from the overlay's `links[]`, CTA `launches_open_in_orrery`, `JsonLd` `article` + `breadcrumbList`. Differences:

- Rows. Galaxies: membership (`explore_lg_group_*`, `LocalGroupPanel.svelte:34–40`), distance (not for the Milky Way, `dist_mly = 0`), diameter. Structures: type, distance, span (`explore_cosmic_web_label_span`, `explore_lg_label_diameter`). Distance from `dist_mly` / `dist_mpc` with one shared formatter (`src/lib/explore/format.ts`). **The four outer panels multiply by the literal 3.26e6** (`LocalSheetPanel.svelte`, `VirgoPanel.svelte`, `LaniakeaPanel.svelte`, `CosmicWebPanel.svelte`) and the Local Group panel uses 3 significant digits; page and panel must agree (AGENTS.md:97).
- A "Related" list built from the data, not from prose: the parent (a satellite's host, a member's group) and the children (a group's members that have pages: `local-group` lists its 33; `virgo-cluster` links `m87`, `m87-star`; `m81-group` links `m81`, `m82`; `laniakea` links the shells' members), plus the twin deep-sky page. This is the internal-link graph the pages exist for and adds characters in every locale without new prose; it needs 1–2 new message keys (decision 4 includes it).
- "Open in Orrery" links `?context=<scale>&pick=<id>` (UXD-019, `explore-url-sync.svelte.ts:262–310`; read at cold load `explore-scene-host.ts:3057–3083`). For `local-group` and `laniakea`, the scale where the entity is itself the object (`?context=local-sheet&pick=local-group`, `?context=cosmic-web&pick=laniakea`). The Magellanic Clouds could use `?galaxy=lmc` (`explore-url-sync.svelte.ts:213–233`); recommend `?context=local-group&pick=lmc` so all 29 galaxies use one form. Existing coverage: `tests/e2e/select-focus.spec.ts:571`, `tests/e2e/explore-hud.spec.ts:533–553`. No new URL parameter.
- No hero, no `og:image` in phase 1.

### 3.3 Panel text from overlays (as deep-sky did)

Overlays `i18n-src/<locale>/universe/galaxies/<id>.json` and `…/structures/<id>.json` (`fact`, `bio`, `links[]`, no `name`, like deep-sky); the "files decide" rule of ADR-096 item 17: `galaxyPageIds()` / `structurePageIds()` in `scripts/site-routes.mjs` list the en-US overlay files, `validate-data` (`scripts/validate-data.ts:564–590`, the deep-sky block) gets the same fact + bio + 1–2 links check in 14 locales. The six panels show `fact` and `bio` in place of the kind blurb when an overlay exists and keep the kind blurb as the fallback: `LocalGroupPanel` (galaxies), `MilkyWayPanel` (the LMC / SMC pins show the galaxy's text, same as the Local Group panel, as `m31` does in both), `LocalSheetPanel`, `VirgoPanel`, `LaniakeaPanel`, `CosmicWebPanel`. Client getters mirror `getDeepSkyI18n` (`src/lib/data/universe.ts:242`).

### 3.4 INDEX links and deep links

Rows come from `buildScaleIndexRows` (`scale-index.ts:421–432`); `memberRows` (`:218–236`) takes a page resolver for the Local Group only. It becomes one resolver for all five scales: id → `/explore/galaxies/<id>` or `/explore/structures/<id>` when a page exists, through the deep-sky resolver first (`deepSkyPageOf`, `:243–257`, covers the 4 twins). `ScaleIndexSource.pages` (`:176–181`) gains `galaxy` and `structure` sets. The Milky Way scale's `lmc` / `smc` rows (`milkyWayRows`, `:403–410`) link the same galaxy pages.

Row counts after the change: Local Group 33 link rows (4 existing + 29), Milky Way scale +2, Local Sheet 9, Virgo 7, Laniakea 8, Cosmic web 7 = 62 new link rows for 59 pages (the extra three: `lmc`, `smc` in the Milky Way scale, `local-group` a second time in Virgo). **The prerendered `/explore` HTML today holds six INDEX lists, not eight** (`tests/e2e/scale-index.spec.ts:117–124`): `ScaleIndex.svelte:177` shows only rows with an `href` before hydration and `:221` renders the `<aside>` only when something is shown, so Local Sheet and Laniakea (no page yet) are absent. After this change they appear and the test expects eight.

### 3.5 Batches for the deep-text pipeline

| Batch | Entities | Sources | Notes |
|---|---|---|---|
| 05 (galaxies) | 29: Milky Way, LMC, SMC, 26 dwarfs | McConnachie 2012 (AJ 144, 4; the distances already in the data, record links in `local-group.json`), NED, NASA / ESA Hubble and Gaia pages, Wikipedia as the lead, recent papers per dwarf (Gaia-era proper motions for the Milky Way satellites, HST star-formation histories for the isolated dIrrs); the science articles of the repo as the house reading | writer rules from the batch 1 review apply (hedge, no superlatives, no false precision, data agrees with the file, `Data conflicts` list). The earlier brief expected text-poor dwarfs; §3.6 |
| 06 (structures) | 30: 9 groups, 5 clouds, 3 clusters, 7 superclusters, attractor, concentration, 3 walls, void | Tully et al. 2014 (Nature, Laniakea), Cosmicflows-4 (Tully et al. 2023), Karachentsev et al. 2013 (Local Volume catalogue), Tully 1982 (Local Supercluster clouds), Mould (Virgo distance), Gott et al. 2005 (Sloan Great Wall), Kirshner et al. 1981 (Boötes Void), NED, NASA / ESA | the schematic positions are hand-drawn: the text must not state a position, only the real distance and extent, and say "schematic" nowhere in prose (the badge says it). `cosmic-web.json` is science-review pending: the batch review covers it |

One combined batch of 59 would break the "~50 objects per writer" rule of the README (`docs/wip/deep-text/README.md` step 1) and mix two source sets, so two batches. Per-step cost, from the README table: batch 1 writer 152,725 tokens for 24 objects (6.4k per object), reviewer 160,457 (6.7k per object); batch 4 reviewer 151,188 for 21 objects (7.2k per object), writer cost "not recorded". Estimate for 59 entities (derived, not a forecast): **writer about 0.35–0.4 million, reviewer about 0.4 million tokens** (per-object scaling) or 4 × ~150k = 0.6 million (the per-batch figure the task quotes); i.e. **0.6–0.8 million tokens for writing and review**. Translation (14 locales, by hand, 826 overlay files, 51 names) is not costed in the README; batch 4's integration plus translation ran as separate commits (`4ab9ca0a4e8`, `528784c6b4b`…`d102d11395d`) and its token cost is not recorded. At most 2 agents run at once on this stream (README), so the two batches run one writer after the other, or one writer and one reviewer in parallel.

### 3.6 Text-poor dwarfs (decision 7)

On this model the floor sets a minimum of about 330 characters with spaces for en-US (§2.3), against the writers' 400–600 rule, so "shorter text" saves at most about a fifth per dwarf and breaks fr and nl if it goes under 330. A 300-character text is on the failing side. Which dwarfs have only a catalogue entry and a Wikipedia page was not checked (§6).

### 3.7 Names in 14 locales (decision 5)

Memory rules: glossary first (`names-glossary-first`), origin-language rule, one name per language across panel, INDEX, page and article. The 59 names are English in the data and every panel title. `native-terms.json` has 8 complete, 11 partial, 40 none (approximate, §6). Many are catalogue codes that stay as written in every locale (`NGC 147`, `IC 10`, `WLM`, `Leo A`); the real translation work is the common names (Sculptor Dwarf, Boötes Void, Sloan Great Wall, the walls and superclusters) and the group names ("M101 Group (Pinwheel)"). Page H1, `<title>`, panel title and INDEX row take one string, as deep-sky did (`deepSkyTitle`); `ScaleIndexSource.names` (`scale-index.ts:165–171`) gains a `galaxy` / `structure` map, so the six panels switch from `member.name` to it.

## 4. Hit list

| # | Place | Change |
|---|---|---|
| 1 | `scripts/site-routes.mjs:146, 190–200, 212–217, 240–255` | `galaxyPageIds()`, `structurePageIds()` (en-US overlay files, minus aliases, same rule as `deepSkyPageIds`), `galaxyRoutes()`, `structureRoutes()` in `collectCanonicalRoutes`. `DEEP_SKY_ALIAS` unchanged. One list for prerender, sitemaps, lastmod, prune, tests |
| 2 | new `src/routes/explore/galaxies/[id]/` and `…/structures/[id]/` (`+page.server.ts` with `prerender = true` and `entries`, `+page.svelte`) and `src/lib/data/outer-entity.ts` | as `explore/deep-sky/[id]/` and `src/lib/data/deep-sky-entity.ts` (79 lines) |
| 3 | `scripts/build-route-lastmod.mjs:313–334` | new branches `explore/galaxies/<id>`, `explore/structures/<id>` (`entry()` per `members[]` file, overlay `universe/galaxies/<id>.json`, `addDir`); the 2-segment `explore/<id>` branch excludes both prefixes (`:330–334`); **an unmapped route is a hard error**; `members[]` accessors for the 5 data files next to `:109–111`; then `npm run route-lastmod` in the release PR; cases in `scripts/build-route-lastmod.test.ts`, `src/lib/route-lastmod.test.ts` |
| 4 | `scripts/check-seo.mjs:71` (`ENTITY_ROUTE`) | regex gains `galaxies\|structures`; floors `:54–69` unchanged |
| 5 | `scripts/mobile/prune-streamed-assets.mjs:153–171` (`bodyIds`) | add `'galaxies'`, `'structures'` (826 pages × ~25 KB is about 20 MB, using ADR-096's 212 MB / 8,302 pages; not re-measured); `prune-streamed-assets.test.ts` |
| 6 | `scripts/validate-data.ts:564–600` | the overlay-completeness block for `universe/galaxies/` and `universe/structures/` (fact, bio, 1–2 links, 14 locales, id is a member of the right file) |
| 7 | `src/lib/explore/scale-index.ts:176–183, 218–236, 243–257, 403–410, 421–432` and `src/lib/server/entity-index.ts` (the `getScaleIndexRows` source, imports `:26–32`) | the resolver for all five scales, `pages.galaxy` / `pages.structure`, names map, `lmc` / `smc` rows in the Milky Way scale |
| 8 | Panels `LocalGroupPanel`, `MilkyWayPanel`, `LocalSheetPanel`, `VirgoPanel`, `LaniakeaPanel`, `CosmicWebPanel` | `fact` / `bio` from the overlay, localized title, one distance formatter |
| 9 | i18n `messages/<14>.json` | reused: `explore_lg_*`, `explore_*_kind_*`, `explore_cosmic_web_label_span`, `launches_open_in_orrery`, `explore_page_title`, `science_learn_more`. New: 1–3 (the "Related" heading, optionally the crumb). Every key in all 14 locales; "numbers in all locales" check |
| 10 | `scripts/i18n-tools/native-terms.json` + `i18n-src/<14>/glossary/terms.json` | names first; a new `term` entry also needs its glossary definition in 14 locales or `build-glossary` fails the build (README step 5, batch 4 missed 12) |
| 11 | `static/data/universe/{local-sheet,virgo-cluster,laniakea,cosmic-web}.json` | `catalogue.dist_mpc` entries (source, bibcode, record link) for the 30 structures, as `local-group.json` has for its members; `scripts/refresh-local-group-catalogue.mjs` is the precedent (decision 6) |
| 12 | Tests, unit | `outer-entity.test.ts` (record + overlay, en-US fallback, null without an overlay, a twin returns null); `scripts/site-routes.test.ts` (every overlay id is a route, no collision with body / star / hole / deep-sky ids: `gal-ids.mjs` as an assertion); `src/lib/explore/scale-index.test.ts:34, 146–171` (row and page counts, the 4 twins keep their deep-sky `href`); `sitemap` and `route-lastmod` cases; `check-seo.test.ts` fixture |
| 13 | Tests, e2e | `tests/e2e/scale-index.spec.ts:117–136`: eight lists, link counts `+62`, "every page is a link" (regex already covers 2 segments); `tests/e2e/index-links.spec.ts:21–82, 115` (`entityIds`, page-id helpers, "INDEX links every page"); static-HTML check of `/explore/galaxies/lmc` and `/de/explore/structures/virgo-cluster` by `request.get` (no browser); `tests/e2e/select-focus.spec.ts:571` already covers `?context=&pick=` |
| 14 | Docs | ADR-096 **item 18** (amend; rewrite item 15's first sentence, `:116–118`, so it no longer defers galaxies; the typed paths, the files-decide rule, the structure-as-entity rule, the Related list); `docs/adr/TA.md:110`; `AGENTS.md:97` (SEO surface row) and `:814`; `docs/uxs/IA.md:28` (two new rows beside deep-sky); `docs/uxs/UXS-014.md:44` (outer-scale panels and pages); `docs/uxs/decisions/UXD-017*.md` (row link rule, row names); `docs/uxs/CHANGE-INVENTORY.md`; `docs/concept/05_Design_System.md` page-pattern notes; `src/routes/explore/README.md`; `docs/ops/indexnow.md`; `docs/wip/deep-text/README.md` (batches 05, 06, step 4 for galaxies / structures) |

## 5. Acceptance checks

1. `npm run build` then `CHECK_SEO_FLOORS=1 node scripts/check-seo.mjs` prints the thinnest galaxy page and the thinnest structure page per locale and exits PASS; compare with §2.3 (zh-CN, ja, ko and ar first; the deep-sky model was tight there). A failing page is fixed by prose or by a data row, not by a lower floor.
2. `check-seo`: one `<h1>`, canonical, hreflang, sitemaps list exactly the indexable pages (826 more page-locales), JSON-LD parses.
3. `node scripts/check-internal-links.mjs` clean (the Related list adds links between the 59 pages, the 4 twins, `m87`, `m81`, `ic-342`, `m101`, `m83`, `m96`, `m54`, the star pages).
4. `npm run route-lastmod` produces entries for all 59 × 14; `route-lastmod` tests pass.
5. `npm run validate-data`: overlay completeness 14 locales for 59 ids; the four translation-parity gates (README) green after the translations land; `build-glossary` green with the new terms.
6. Unit and e2e of §4 rows 12–13, `npm run test:coverage` (coverage floors are a frozen ratchet; new loader code needs tests, AGENTS rule R8), svelte-check, eslint `--no-cache`, prettier `--no-cache`.
7. Mobile build: prune keeps the 826 pages out of the mobile bundle; size gate unchanged.
8. Each text batch: science review verdict recorded (`batch-05-review.md`, `batch-06-review.md`), "Data conflicts" resolved in the catalogue layer, `text-sources.json` entries, `/credits` and `/library` checked, `build-link-provenance.ts`.
9. Panel and page agree: same title, same distance string, same text (UXD-017 "a row names its object as its page does").
10. Not run before this brief: any of the above. They are gates for the build phases, not results.

## 6. Phased plan

| Phase | Scope | New pages | Gate |
|---|---|---|---|
| 0 | decisions 1–8 answered; ADR-096 item 18; glossary names for 51 entities | 0 | decisions recorded; names in `native-terms.json` and the glossary |
| 1 | routes, loaders, `scale-index` resolver, INDEX rows, validate-data, lastmod, prune, check-seo regex, tests, docs, with **no overlay yet** (no pages: the files decide) | 0 | unit tests, build unchanged page set |
| 2 | batch 05 (29 galaxies): write, review, fix, integrate, translate; panels show `fact` / `bio` | 29 × 14 = 406 | §5 items 1–9 |
| 3 | batch 06 (30 structures) plus the 30 catalogue entries; panels | 30 × 14 = 420 | §5 items 1–9; `cosmic-web.json` science review |
| 4 | heroes through B3's loader where images match (LMC with 30 Doradus is a part-of image, B3 Q3) | 0 | provenance, `/credits` |

Phases 2 and 3 can swap or run side by side within the 2-agent limit. Pages in phases 2 and 3 appear by adding overlay files, as batch 4 did for deep-sky.

## 7. Decisions for the operator

1. **URL prefix.** Recommend two typed paths: `/explore/galaxies/<id>` (Milky Way, Magellanic Clouds, 26 dwarfs: 29 pages) and `/explore/structures/<id>` (groups, clouds, clusters, superclusters, attractor, concentration, walls, void: 30 pages), sharing one loader and one template. M31, M33, M32 and M110 stay at `/explore/deep-sky/<id>` (item 17). Alternatives: `/explore/deep-sky/<id>` for the galaxies (needs 29 records in `deep-sky-objects.json`, which would put them in the neighbourhood INDEX), one `/explore/galaxies/<id>` for all 59, or one path per scale (§3.1). Two typed paths?
2. **Structures get pages.** Recommend yes, all 30 including the Boötes Void and the three walls, because the rule is every entity a page and each has a panel, a deep link and an INDEX row; the page states what the structure is and what is real (distance, extent) and links its members. Alternative: pages for the 12 headliner structures only (`local-group ic-342-group m81-group centaurus-a-group sculptor-group virgo-cluster virgo-supercluster great-attractor hydra-centaurus laniakea shapley-concentration sloan-great-wall`) and the rest stay INDEX rows, which contradicts the rule and leaves 18 rows with a button and no link. All 30?
3. **Milky Way scale residue.** Recommend: the 5 spiral arms and the Sun get no page here (arms are positions on a schematic, the Sun is not in any entity set; the arms' text lives in the `our-galaxy` article and the Milky Way page); `47-tucanae` and `ngc-6752` are added to the deep-sky records with batch overlays so their globular rows link pages (a deep-sky change, 2 objects). Alternative: pages for the arms and the Sun now. Go with the recommendation?
4. **Related list on every page.** Recommend yes: parent and children computed from the data (a group's members, a satellite's host, the twin deep-sky page), with 1–3 new message keys. It makes the 59 pages a connected graph and adds characters in every locale without new prose. Alternative: pages with fact, bio, rows and links only (still clears the floor on the model, no internal links). Yes?
5. **Names in 14 locales, glossary first.** Recommend: write the glossary entries for the 51 names that lack a full entry before any text (catalogue codes stay as written, common names get the form the country's universities use, search native pages when unsure), then switch the six panels, the INDEX rows and the pages to one localized name per language; page H1, `<title>`, panel title and INDEX row are one string. Alternative: English names everywhere, as black holes were before their overlays (breaks the "one name per language" rule where the `/science` articles already use native forms). Glossary first?
6. **Distances of the 30 structures.** Recommend adding catalogue entries (source, bibcode or DOI, record link) for the 30 `dist_mpc` values, so the pages' distance rows carry a source link like the Local Group's; sources Karachentsev 2013, Tully 2014 / Cosmicflows-4, NED. Alternative: show the distances without a source link and say so in the batch notes (the schematic files cite sources only in `_provenance`). Add the catalogue entries?
7. **Text-poor dwarfs.** Recommend no shorter text: the writers' 400–600 characters apply to every entity, because the floor on this model needs about 330 characters in en-US and shorter text saves at most a fifth. Where a dwarf has little literature the writer leaves out what cannot be sourced (README rule) and the page's data rows and Related list carry the rest; the build decides per locale. Alternative: a 330–400 character target for the 12 or so least documented dwarfs. Same length for all?
8. **Batches.** Recommend two batches, 05 (29 galaxies) then 06 (30 structures), each written and reviewed as in batch 4, about 0.6–0.8 million tokens for writing and review, one writer at a time inside the 2-agent limit. Alternative: one batch of 59 (above the ~50 per writer in the README, two source sets), or one batch per scale (5 batches, about 12 entities each, more overhead per entity). Two batches, galaxies first?

## 8. NOT VERIFIED

- Every character count is a model of the page text, not a built page. `gal-measure.mjs` counts the frame (crumb, kind line, H1, rows, CTA) and not a Data sources block, culture doors, related links or JSON-LD; `check-seo`'s `mainText()` was never run on a galaxy or structure page. The model was not calibrated against a page I modelled and then measured. The prose-needed figures are the floor minus the smallest frame; the conversion of a 400-character en-US text into non-space characters in each locale (1.1–1.2x for the Latin and Cyrillic locales, about 1.0x for hi / ar, 0.55–0.6x for zh-CN / ja / ko) is quoted from `check-seo.mjs:20–30` (its header), not measured on a translation of these entities.
- Token costs are derived from the batch table in `docs/wip/deep-text/README.md` by dividing by the objects per batch (24 in batch 1, 21 in batch 4) and multiplying by 59. Batches 2, 3 and 4 have no writer figure. The translation cost of any batch is not recorded; no estimate is given for it.
- The native-terms match (8 / 11 / 40) is an exact, case-insensitive key match over the sections `body`, `feature`, `place`, `term`, `star`, `facility` using the full name, the name without its parenthesis, and the parenthesis text; a name filed under a different key (for example "Andromeda Galaxy" for `andromeda`) counts as missing. `leo-i` and `leo-ii` did not match; the 11 "partial" have fewer than 14 locale entries in the file. Entries for the ids `milky-way` onward were not read for correctness.
- Not read: the data of the 33 Local Group members for science accuracy (kinds, `parent` links such as `ic-10` under `andromeda`, `phoenix-dwarf` as dwarf-irregular, `pegasus-dsph` id for "Andromeda VI"); the four schematic files' distances and diameters are hand values and `cosmic-web.json` is marked science-review pending. The writer and reviewer batches are where these are checked.
- Not verified: that M54 is the nucleus of the Sagittarius dwarf as the text will say; whether NASA / ESA public pages exist for each dwarf (not searched, so "text-poor" has no measured list); which structures have a Wikipedia lead good enough to link.
- Not verified: that `selectLocalSheet('local-group')`, `selectVirgo('local-group')`, `selectLaniakea('virgo-supercluster')` and `selectCosmicWeb('laniakea')` open the anchor member (the e2e covers `m81-group`, `virgo-cluster`, `great-attractor`, `shapley-concentration` and `andromeda`, `explore-hud.spec.ts:533–553`); `selectLocalGroup` finds `milky-way` because `lgMembers` holds all 33 (`explore-scene-host.ts:2840`), whether the scene highlights it was not run.
- Not verified: that `build-route-lastmod.mjs` can entry-date `members[]` of five files (it handles `objects[]` at `:109–111`; the `/explore` seed already lists the five files in `SEED_DATA`, `:62–80`); that overlay paths `universe/galaxies/<id>.json` fit `overlays` as `universe/deep-sky/<id>.json` does.
- Not checked: images for any of the 59 (B3 hero loader state), `og:image` rules, schema.org types for galaxies and structures, RTL rendering of the new pages, whether `tests/e2e/visual.spec.ts` snapshots cover entity pages, `scripts/route-budget.json` for two new server-only routes.
- Not run: any build, dev server, `check-seo`, `check-internal-links`, `route-lastmod`, unit or e2e test, or browser. The only code run is the seven `gal-*.mjs` measuring files, which read data and message files and print.
- Counts of the INDEX lists (six, not eight, in the prerendered HTML) are read from `scale-index.spec.ts:117–124` and `ScaleIndex.svelte:177, 221`, not observed in a built `/explore`.

## Decisions (operator, 2026-11-13)

All 8 recommendations of §5 approved as written: two typed paths (`/explore/galaxies/<id>`, `/explore/structures/<id>`); all 30 structures get pages; no arm or Sun pages, 47 Tucanae and NGC 6752 become deep-sky objects with text; a Related list on every page; glossary first for the names; sourced catalogue entries for the 30 structure distances; 400–600 characters for every entity; two batches, 05 (29 galaxies) then 06 (30 structures).
