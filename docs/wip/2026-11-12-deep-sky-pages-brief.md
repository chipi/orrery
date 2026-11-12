# Deep-sky entity pages brief — `/explore/deep-sky/<id>`
Brief, 2026-11-12, written at HEAD `e2ae9f1a729` on `tech-debt/0.9.9`. Read-only investigation for Part B: nothing in `src/`, `scripts/` or `static/` is changed by this document. Part A (the panel shows `fact` and `bio`) is committed as `e2ae9f1a729` and is a prerequisite of this brief. Follows `docs/wip/2026-11-12-deep-entity-pages-brief.md` (the first brief; its §1 method and baseline, §2 design, §1.6 collisions are reused, not repeated) and ADR-096 items 11–16 (item 15 is the clause this brief executes for deep-sky).
Method. Scripts run as files from the repo root (session scratchpad `…/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/`): `measure-ds.mjs` and `measure-ds2.mjs` (page-text model per object and locale, a rewrite of the first brief's `measure.mjs` for deep-sky with the new overlays), `collide.mjs`, `collide2.mjs` (id collisions), `names-ds.mjs`, `misc-ds.mjs`, `count.mjs`. The floors are read from `scripts/check-seo.mjs` by regex (`THIN_MIN_CHARS`, `:54–69`), not copied. Characters are counted the way `check-seo.mjs` counts (`<main>` text, whitespace removed). **No deep-sky page exists, so every count below is a MODEL of the page text, not a build measurement** (same limit as the first brief; §7).

## 0. Answer first

| Question | Answer |
|---|---|
| How many of the 141 clear the thin-page floor in all 14 locales? | **120** with the page model R (chrome, kind line, `fact`, `bio`, distance / magnitude / constellation rows, culture-door text). The 120 are exactly the objects with an overlay; the other 21 have 0 prose characters and fail in every locale (en-US 117–161 chars against 350). |
| With prose alone (chrome + `fact` + `bio`, no value rows)? | **106 of 141** clear all 14; 119 clear en-US. The value rows are what carry the last 14 over the floor, so the pages must show them. |
| Margin | Thinnest object in model R: `m49`, `m21`, `m54`, `m36` or `m6` depending on the locale; 414 against 350 in en-US (`m49`), 474 against 430 in fr (`m49`). **zh-CN is tight: 185 against 175 (`m21`), 6 objects within 30 characters of the floor; ar 354 against 330, 2 within 30.** A model error of ~10 characters in zh-CN flips a page. |
| Pages | 120 × 14 = **1,680** (+13.8 % on ADR-096's 12,138). All 141 would be 1,974. |
| Recommended | Pages for the **120 with text**, the set derived from the overlay files so batch 4's 21 become pages by adding files; canonical id = the deep-sky id; one page per object, never a second one under the Milky Way or Local Group; heroes with B3 (23 objects); **first make every one of the 120 open its panel** (today 97 of them open nothing, §3.1). |

## 1. Measurement

### 1.1 Where the text and data live now

| Piece | Where | State at HEAD |
|---|---|---|
| Record | `static/data/universe/deep-sky-objects.json` (141: id, designation, `name`, category, ra/dec, `dist_ly`, `dist_label`, `mag`, `con`, `photoKey`, `gatewaySystem`, `records`, `catalogue`) | `_count` 141, `_withPhoto` 44 |
| Prose | `i18n-src/<locale>/universe/deep-sky/<id>.json` (`fact`, `bio`, `links[]`; **no `name`**) | **120 objects × 14 locales** (batches 1–3, `docs/wip/deep-text/`); 21 without: `ngc-1300 ngc-1365 ngc-2014-2020 ngc-2174 ngc-2264 ngc-2392 ngc-3132 ngc-3324 ngc-3372 ngc-4038-4039 ngc-5139 ngc-6302 ngc-6543 ngc-7293 ngc-7635 perseus-cluster rho-ophiuchi serpens-nebula sn-1572 v838-mon wr-124`. **All 21 are photo-backed**; the 23 photo-backed objects with text are `30-doradus barnard-33 carina-nebula cas-a cygnus-loop eso-350-40 gum-29 hcg-92 hen-2-104 ic-342 m1 m8 m16 m31 m42 m51 m57 m74 m101 m104 ngc-346 ngc-602 ngc-604`. The other 97 with text are photo-less. |
| Gallery text | `static/data/deep-sky.json` (50 keys; 44 on objects; 6 gallery images have no catalogue object) + `i18n-src/<locale>/deep-sky.json` (title, caption, subject, type, distance, taken) | caption, telescope, credit shown by the panel for the 44 |
| Loader (panel) | `getDeepSkyI18n(locale, id, fetch)` (`src/lib/data/universe.ts:240`, Part A): the reader's locale, en-US fallback, null if neither | added by Part A; the page's server loader reads the same files |
| Culture doors | `arecibo-message` on `m13` only | the only deep-sky door |
| Gateways | `gatewaySystem`: `m42→trappist-1`, `ngc-3324→51-pegasi`, `rho-ophiuchi→barnards-star`, `serpens-nebula→toi-700` | 1 of the 4 is among the 120 (`m42`) |
| Panel | `DeepSkyPanel.svelte`, mounted at `src/routes/explore/+page.svelte:2193` | now leads with `fact` (`.editorial`) and `bio` (`.prose`), then the gallery caption, values, DataSources |
| Deep link | `?deepsky=<id or designation>` read at `explore-url-sync.svelte.ts:184–190`, resolved by `resolveDeepSkyDeepLink` (`explore-scene-host.ts:1708`, takes id or designation); mirrored back from `activeDeepSky` only (`+page.svelte:1125`) | see §3.1 |

### 1.2 How the page text was modelled

Chrome of the black-hole page (`src/routes/explore/black-holes/[id]/+page.svelte:56–104`): crumb (`explore_page_title` + name), kind line, H1 name, lede = `fact`, `dispatch` = `bio`, a `dl.facts`, `DataSources`, culture section, science section, CTA `launches_open_in_orrery`. Per variant:

| Variant | Contents | Why |
|---|---|---|
| **P** | chrome (crumb, name, H1 name, CTA label) + `fact` + `bio` | prose alone |
| **R** (the model the recommendation rests on) | P + kind line (category label, designation) + rows: distance (`explore_ds_distance`, `Intl` number from `dist_ly`, "ly"), apparent magnitude (`star_label_apparent_mag`, from `mag`, only where it is not null: 20 are null), constellation (English name from `IAU_CONSTELLATIONS`, the 3-letter code expanded) + culture-door heading, work, author and blurb (M13) | what the panel already shows, in the page's own markup |
| **F** | R + the Data sources block (heading, catalogue labels, bibcodes, field labels, notes, SIMBAD / NED labels) + for the 44 photo-backed objects telescope label and value, gallery caption (locale overlay, en-US fallback) and credit | the upper bound; the block text is English data in every locale |

All 14 locales' `messages/<locale>.json`: `missing message keys: none`. Numbers via `Intl.NumberFormat(locale)`. The H1 is the data `name` in every locale (no overlay carries a name, §6 Q5).

### 1.3 Results, per locale (model; objects clearing the floor of 141 / of the 120 with text)

| Locale | Floor | P (prose only) | R | F | thinnest of the 120 in R |
|---|---|---|---|---|---|
| en-US | 350 | 119 / 119 | 120 / 120 | 134 / 120 | 414 (`m49`) |
| es | 390 | 116 / 116 | 120 / 120 | 132 / 120 | 453 (`m6`) |
| fr | 430 | 114 / 114 | 120 / 120 | 123 / 120 | 474 (`m49`) |
| de | 390 | 119 / 119 | 120 / 120 | 132 / 120 | 468 (`m54`) |
| pt-BR | 390 | 117 / 117 | 120 / 120 | 132 / 120 | 456 (`m49`) |
| it | 395 | 116 / 116 | 120 / 120 | 129 / 120 | 451 (`m21`) |
| nl | 410 | 116 / 116 | 120 / 120 | 123 / 120 | 476 (`m36`) |
| sr-Cyrl | 315 | 120 / 120 | 120 / 120 | 136 / 120 | 407 (`m21`) |
| zh-CN | 175 | 114 / 114 | 120 / 120 | 138 / 120 | **185 (`m21`)** |
| ja | 190 | 120 / 120 | 120 / 120 | 138 / 120 | 234 (`m21`) |
| ko | 175 | 120 / 120 | 120 / 120 | 138 / 120 | 225 (`m54`) |
| hi | 345 | 120 / 120 | 120 / 120 | 131 / 120 | 411 (`m21`) |
| ar | 330 | 108 / 108 | 120 / 120 | 134 / 120 | **354 (`m21`)** |
| ru | 390 | 118 / 118 | 120 / 120 | 133 / 120 | 443 (`m49`) |
| **all 14** | | **106 of 141** | **120 of 141** | **122 of 141** (the 120 + 2 of the 21) | |

- en-US prose (`fact` + `bio`) of the 120: minimum 293, median 409 characters.
- Objects within 30 characters of the floor in model R: zh-CN 6, ar 2, every other locale 0.
- The 21 without text, en-US characters P / R / F: P 53–87, R 117–161, F 222–427. With the gallery caption (F) 14 of them clear en-US but only 3 clear fr and nl, 18 clear zh-CN / ja / ko. The gallery caption is entity-specific, but ADR-096 item 15 says no page ships on thin text, and item 12 says the floor fails the build: 121 of the 1,974 page-locale pairs would be under their floor in F, and 294 (21 × 14) in R.

### 1.4 What the numbers mean

1. **The overlays are the whole difference**: before them 1 of 141 cleared the first brief's floor in all locales (`deep-entity-pages-brief.md` §1.4); with them, 120. The value rows are not decoration: without them (P) 14 of the 120 fail at least one locale (zh-CN alone 6, ar 12), so the page must carry the rows R lists.
2. **zh-CN and ar decide the risk**. The model's rows are approximate (a distance string, the constellation in English); the first brief measured star pages at 234 characters of margin and called a few-dozen-character error negligible. Here zh-CN's margin is 10 characters on the thinnest object. The real build (`CHECK_SEO_FLOORS=1 node scripts/check-seo.mjs`) decides; plan a phase-1 gate that prints the thinnest deep-sky page per locale before the page set is frozen. If `m21` fails in zh-CN the remedies are the page's own localized data (gallery caption does not exist for photo-less objects), not new prose and not a lowered floor.
3. **The 21 are the photo-backed objects**: batch 4's list is the 21 best-known gallery targets (`ngc-3372` Carina, `ngc-7293` Helix, `ngc-5139` Omega Centauri, `ngc-4038-4039` Antennae, `ngc-6543` Cat's Eye). Their pages are the ones with a hero and a caption, so they are the most useful pages missing, not the least.
4. **Names**: 88 of the 141 data `name` values are a bare catalogue code (`m3 = "NGC5272"`, `m32 = "NGC0221"`, `m74 = "NGC0628"`, `ngc-1300 = "NGC1300"`); `names-ds.mjs`. The panel title already shows them. A page H1 of "NGC5272" for the object people search as "M3" is a defect to settle before pages (§6 Q5). The overlays carry no `name`, unlike the star and black-hole overlays.
5. **Page size**: 1,680 pages at the ~25 KB per page ADR-096 implies (212 MB / 8,302) is ~42 MB, from a division, not a build. The mobile build is at 75.6 of 77 MB (ADR-096 item 7, `prune-streamed-assets.mjs` comment), so the prune entry is mandatory (§3 row 8).

### 1.5 Id collisions (`collide.mjs`, `collide2.mjs`)

| Same real object | Deep-sky id | Other id and where | Same id? |
|---|---|---|---|
| Milky Way globulars | `m3 m4 m5 m13 m15 m22 m92` | same ids in `milky-way-schematic.json` `globulars` (names differ: deep-sky `m13` = "Hercules Globular Cluster", Milky Way `m13` = "M13 (Hercules Cluster)") | yes, 7 |
| Omega Centauri | `ngc-5139` (no text yet) | `omega-centauri` (Milky Way globular) | **no** |
| 47 Tucanae, NGC 6752 | none | `47-tucanae`, `ngc-6752` (Milky Way globulars) | n/a: no deep-sky record |
| Local Group members | `m32`, `m110` (names "NGC0221", "NGC0205") | same ids in `local-group.json` `members` | yes, 2 |
| Andromeda, Triangulum | `m31` ("Andromeda Galaxy"), `m33` ("Triangulum Galaxy") | `andromeda`, `triangulum` (Local Group headliners) | **no**, 2 |
| Magellanic Clouds | none (`30-doradus` is a region of the LMC) | `lmc`, `smc` (Milky Way satellites, Local Group) | n/a |

No deep-sky id equals a star, black-hole, planet, moon or small-body id (`collide.mjs`: both intersections empty). All 141 ids match `[a-z0-9-]+`. So the typed path `/explore/deep-sky/<id>` is collision-free on its own; the collisions are between **scene rows**, which is the INDEX question.

## 2. Design

### 2.1 URL, template, links

- **`/explore/deep-sky/<id>`**, typed like stars and black holes (ADR-096 items 13, 16). No list page (item 14): the pages are reached from the INDEX rows, the sitemaps, and the crumb back to `/explore`. `/gallery/deep-sky` stays the indexable wall for the 44 photographs; the page links to it for photo-backed objects.
- **Loader** `src/lib/data/deep-sky-entity.ts` (`getDeepSkyEntity(id, locale, fetch)`, server-only, same shape as `black-hole-entity.ts`): record + overlay (`getDeepSkyI18n`'s rule, en-US fallback) + culture doors + gallery fields for photo-backed objects + catalogue map + records. Returns null for an object without an overlay (it has no page).
- **Route** `src/routes/explore/deep-sky/[id]/+page.server.ts` (`prerender = true`, `entries` from one `deepSkyPageIds()` in `scripts/site-routes.mjs`) and `+page.svelte` on `entity-page.css`: crumb, kind line (category · designation), H1, `fact` as lede, `bio` as dispatch, optional hero (§4), `dl.facts` (distance, magnitude, constellation; telescope for photo-backed), `DataSources` (the same `dataSourceItems` and `sourceLink` the panel uses), culture section (M13), "Learn more" from the overlay's `links[]` (1–2 per object, Wikipedia and NASA), a gateway link where `gatewaySystem` is set (`/explore/stars/<host>`), the gallery link, CTA.
- **Open in scene**: `/explore?deepsky=<id>` (the resolver takes id or designation; the URL writer mirrors the designation, `deepSkyUrlDesignation`, `+page.svelte:1125`, so a shared link and a written link both resolve). C1's brief Q8 (`?pick=<id>`) is the general member link; deep-sky does not need it.
- **JSON-LD**: `article()` + `breadcrumbList()` as the black-hole page. No dedicated schema.org type is proposed (not verified, §7).
- **Page ids come from files**: `deepSkyPageIds()` = ids in `deep-sky-objects.json` whose `i18n-src/en-US/universe/deep-sky/<id>.json` exists. Batch 4 adds a page by adding 14 files; `validate-data` gets a rule that an object has its overlay in all 14 locales or in none (§3 row 13; I did not find such a check in `scripts/validate-data.ts`).

### 2.2 Canonical ids and the INDEX (recommendation)

One entity, one page, several rows. The deep-sky id is canonical because it is the only id that has a record, an overlay, a gallery photo and catalogue sources; the Milky Way and Local Group entries are positions in a schematic.

| Row | `href` |
|---|---|
| Neighbourhood `m13` (and every deep-sky row with a page) | `/explore/deep-sky/m13` |
| Milky Way globular `m3 m4 m5 m13 m15 m22 m92` | the same page |
| Local Group `m32`, `m110` | the same page |
| Local Group `andromeda`, `triangulum` | `/explore/deep-sky/m31`, `/explore/deep-sky/m33` (an alias map of 2) |
| Milky Way `omega-centauri` | `/explore/deep-sky/ngc-5139` when batch 4 gives it text (alias map of 1) |
| `47-tucanae`, `ngc-6752`, `lmc`, `smc`, every other Local Group member | no page (no deep-sky record, or no text) |

The alias map lives next to `deepSkyPageIds()` in `scripts/site-routes.mjs` (one list, `.mjs`, shared by the generator, the INDEX and the e2e, as `starPageIds` and `blackHolePageIds` are). Row naming follows UXD-017's rule "a row names its object as its page does": the Milky Way row for `m13` takes the page's name, not "M13 (Hercules Cluster)". The page content for `m31` is the deep-sky overlay; the Local Group `andromeda` panel is a different panel on the same object and stays (ADR-096 "Neutral": panels do not link to pages).

## 3. Every touchpoint (HEAD `e2ae9f1a729`)

### 3.1 The panel gap this brief depends on

`enterDeepSky` (`src/lib/three/explore-scene-host.ts:1615`) opens a panel and focuses only for an object with a `photoKey` or a culture door (`:1637–1647`; `cultureObjectIds`, `:428–431`). The other branch only highlights. Of the 120 objects with text, **97 are photo-less and 96 of them have no door (M13 is the one)**, so for 96 objects Part A's text is not reachable, `?deepsky=<id>` lands on a highlighted dot with no panel, the URL mirror (`+page.svelte:1125`) is never written, and the camera does not move. That also contradicts UXD-019 (select = focus: panel, ring, camera on every choice; `05_Design_System.md` §7.5). A page whose "Open in Orrery" ends on a dot is the wrong link. **Phase 0 makes every deep-sky object with an overlay open the flat panel and take the camera** (one change in `enterDeepSky`, plus a pin-focus for a photo-less object, `nbScene.focusDeepSky` is called only after the photo-less `return`, `:1649`). This is Part A's follow-up, not new design: the panel is built.

### 3.2 Table

| # | Place | What changes |
|---|---|---|
| 1 | `scripts/site-routes.mjs:139–158` (`starPageIds`, `starRoutes`), `:162–177` (black holes), `:201–210` (`collectCanonicalRoutes`) | new `deepSkyPageIds()` (overlay files), `DEEP_SKY_ALIAS`, `deepSkyRoutes()` → `/explore/deep-sky/<id>`, spread into `collectCanonicalRoutes`. One list feeds prerender, sitemaps, lastmod, prune and the tests |
| 2 | `svelte.config.js` (`expandLocalizedRoots(collectCanonicalRoutes())`), `src/lib/sitemap.ts:72` | none (generic); `src/lib/sitemap.test.ts` gets a case |
| 3 | `scripts/build-route-lastmod.mjs:73,109` (data files, entry-dated by id like `black-holes.json`), `:283–311` (stars and black-hole branches), `:312–318` (the 2-segment `explore/<id>` branch excludes `stars` and `black-holes`) | new branch for `explore/deep-sky/<id>`: `entry('static/data/universe/deep-sky-objects.json', id)`, overlay `universe/deep-sky/<id>.json`, the object's culture door and blurb, the gallery overlay for a photo-backed object (`deep-sky.json`), `addDir('explore/deep-sky/[id]')`. **An unmapped route is a hard error**, so this is required. `deep-sky-objects.json` needs an `objects[]` accessor in the entry-date map. Then `npm run route-lastmod` in the release PR; cases in `scripts/build-route-lastmod.test.ts`, `src/lib/route-lastmod.test.ts` |
| 4 | `scripts/check-seo.mjs:71–72` (`ENTITY_ROUTE`) | the regex's `(?:stars\|black-holes)` gains `deep-sky`; floors `:54–69` unchanged; after the first build `CHECK_SEO_FLOORS=1 node scripts/check-seo.mjs` to compare with §1.3; fixture build in `scripts/check-seo.test.ts` gets a deep-sky page |
| 5 | `scripts/mobile/prune-streamed-assets.mjs:153–165` (`bodyIds` lists `'stars'`, `'black-holes'`) | add `'deep-sky'` (and update the comment's page count: +1,680). Without it the mobile size gate fails |
| 6 | `src/lib/server/entity-index.ts:117–132` (`getStarLinks`, `getBlackHoleLinks`), `:153–` (`getScaleIndexRows`, `pages:` block), `:25–35` (`hubIds`) | new `getDeepSkyLinks` (names via `getDeepSkyEntity`), `pages.deepSky`, names map; `hubIds('explore')` is unchanged because the path has a `/` in the rest. `entity-index.test.ts` case |
| 7 | `src/lib/explore/scale-index.ts:172` (`pages` type), `:325–335` (`deepRows`: no `href` today), `:338–369` (`milkyWayRows`, globulars `:349–357`), `:207–218` (`memberRows`: no `href` parameter), `:381` (`'local-group'`) | `pages.deepSky`; `href: /explore/deep-sky/<canonical>` on deep-sky rows with a page; the alias map applied to the 7 globular rows (+1 later) and 4 Local Group rows; `memberRows` takes a page resolver. `src/lib/explore/scale-index.test.ts` (`:34` page sets, `:146–171` row/page counts): new expectations |
| 8 | `src/lib/components/ScaleIndex.svelte:177` (pre-hydration list is the rows with an `href`), `:195`, `:295–310` (`↗` link and link-only row) | none in markup; the prerendered `/explore` HTML gains up to 120 + 7 + 4 link rows. The hidden list's size and the no-JS reading order are not measured |
| 9 | `tests/e2e/scale-index.spec.ts:134–136` (`kind('/explore/stars/')` 66, `black-holes/` 4, `toHaveLength(48 + 66 + 4)` counts link **rows**, not pages) and the "every page is one of those links" filter `/^\/explore\/[^/]+(\/[^/]+)?$/` | add `kind('/explore/deep-sky/')` rows = 120 + 7 + 4 alias rows; distinct pages = 120; total row count recomputed. `tests/e2e/index-links.spec.ts:28–39,72–81` (`starPageIds`, `blackHolePageIds` helpers, the "INDEX links every star and black-hole page" test) gains deep-sky |
| 10 | `src/lib/three/explore-scene-host.ts:1615–1660` (`enterDeepSky`), `:1708–1716` (`resolveDeepSkyDeepLink`), `src/routes/explore/+page.svelte:1125` (`deepSkyUrlDesignation`) | §3.1: every object with an overlay opens the panel and takes the camera; the URL mirror follows `activeDeepSky` for it |
| 11 | `src/lib/components/DeepSkyPanel.svelte` (cells: `object.dist_label` is an English string in all locales, the constellation cell shows the 3-letter `object.con`) | not required for pages, but a panel and its page must agree (AGENTS.md:97 "a change to what a panel shows should reach its page"): the page formats the distance from `dist_ly` and spells the constellation; make the panel do the same, one formatter (`src/lib/explore/format.ts`) |
| 12 | i18n `messages/<14 locales>.json` | reused: `explore_ds_*`, `star_label_apparent_mag`, `catalogue_data_sources`, `culture_heading`, `launches_open_in_orrery`, `explore_page_title`, `explore_ds_gallery_link`, `explore_ds_gateway`. New: 0–2 keys (a "Learn more" label if the black-hole page's is not reusable). Names: §6 Q5. Every key in all 14 locales |
| 13 | `validate-data` (`scripts/validate-data.ts:499–540` deep-sky checks) | new rule: an object's overlay exists in all 14 locales or none; `fact` and `bio` non-empty; links' hosts in `source-logos.json` (the deep-text README step 4 already requires it) |
| 14 | Breadcrumbs, JSON-LD, OG | per-page crumb and `breadcrumbList()` as black holes. `og:image`: a hero if there is one, else `DEFAULT_OG_IMAGE` (`src/lib/social-meta.ts:40`). Image-width rules for cards were not checked |
| 15 | `scripts/indexnow-submit.mjs`, `docs/ops/indexnow.md` | no code change; URL count (12,138 + 1,680 = 13,818 pages) in the doc |
| 16 | Docs | **ADR-096 item 17** (amend, as item 16 did for black holes): deep-sky pages typed under `/explore/deep-sky/<id>` for objects with reviewed text, canonical-id rule and alias map, the "files decide" rule, floor unchanged; rewrite item 15's first sentence so it no longer lists deep-sky as remaining. `docs/adr/TA.md:110`, `AGENTS.md:97` and `:795`, `docs/uxs/IA.md:27–29` (new row beside black holes and stars) and the Design System page-pattern notes, `docs/uxs/UXS-014.md` (deep-sky panel and page), `docs/uxs/CHANGE-INVENTORY.md` (the Part A row and a new row), `src/routes/explore/README.md`, `docs/wip/deep-text/README.md` step 4 (integration done per batch) |

## 4. Cascade: the in-flight slices

| Slice | Effect on deep-sky pages |
|---|---|
| **B1** (panel shell, UXD-018; `Panel.svelte`, `PanelActions`) | The page does not use the panel shell (B1 brief: standalone pages untouched). `DeepSkyPanel` has no action row today and needs none: the gallery link and gateway are content, not actions. If B1 adds an action to a deep-sky panel (Open page is excluded by ADR-096 "Neutral"), the page's CTA is unaffected. Part A kept `Panel` as is. |
| **C1** (select = focus, UXD-019) | §3.1 is a C1 violation for 96 objects (no panel, no ring, no camera). The ring exists on deep-sky glints (C2, §5.14); focus and panel do not. Phase 0 closes it. C1's Q8 `?pick=<id>` member link is not needed here: `?deepsky=` exists and takes ids. |
| **C2** (pins, rings, labels, UXD-020) | Deep-sky glints already take the ring and a 12 px label. Pages change nothing in the scene. The INDEX row of a photo-less object selecting a dot with no panel is the C2/C1 seam that phase 0 fixes. |
| **UXD-017 scale INDEX** | Deep-sky rows get an `href` (§2.2, §3 rows 6–9). Rows for Milky Way globulars and four Local Group members share a page; a canonical-id rule is mandatory (§6 Q1). The first cut's ADR item 15 text "the page, when it ships, is one `href` on that row, no new UI" is the plan. |
| **#658 catalogue layer** | The page's distance and magnitude rows carry `sourceLink` and the page ends with `DataSources`, from `catalogue` and `records` exactly as the black-hole page does (`+page.server.ts:45–76`). Magnitude is V only; 20 objects have no magnitude, so no row. The Part A panel text and the DataSources block coexist (kept). |
| **B3** (hero loader `getUniverseHero(kind, id)`, `panel-heroes.json`, MW5, Q3 part-of images) | B3 is not built (no `getUniverseHero` in `src/`). 23 of the 120 have a gallery photo (`photoKey`); the 97 photo-less have none. Whether each of the 23 photos shows the object itself, not a part or a neighbour, was not checked here (B3 §2.3 made that call for its 44). The page hero comes from B3's loader so panels and pages share one curation; part-of images (Tarantula for the LMC) matter for Local Group pages, which this brief does not create. The deep-sky originals exist only as `.jpg` and `.thumb.jpg` (700 px wide), not on the WebP ladder (B3 brief §2.3, NV4 unverified for masters in LFS): phase 3 decides ladder or `.jpg`. B3 Q3 "part-of image as hero, caption mandatory" does not touch these 23 (their picture is the entity); it answers the Local Group panels. |
| **B2** (science links, capped at 5, one helper) | An overlay has 1–2 `links[]` (min 1, max 2). The page lists them directly; if B2's helper lands first the page calls it. |
| **C3** (HUD) | Not touched by pages. |

## 5. Phased plan and tests

| Phase | Scope | Pages | Gate |
|---|---|---|---|
| 0 | Operator answers §6. **Every overlay object opens its panel and takes the camera** (`enterDeepSky`, URL mirror); `validate-data` rule (all 14 or none). ADR-096 item 17 drafted. | 0 | unit + e2e for a photo-less `?deepsky=m3` panel text in en and de; vitest, svelte-check, eslint, validate-data |
| 1 | `deep-sky-entity.ts`, `/explore/deep-sky/[id]`, `site-routes`, lastmod, prune, `check-seo` regex, `entity-index`, INDEX `href` on neighbourhood rows, alias rows (Milky Way, Local Group), the H1 rule, tests, docs | 120 × 14 = 1,680 | build, `check-seo` PASS, `CHECK_SEO_FLOORS=1` prints thinnest per locale (compare §1.3; **zh-CN `m21` 185 vs 175 first**), internal links, mobile size gate, route-lastmod |
| 2 | Hero images for the 23 through B3's `getUniverseHero`, `og:image` | 0 | provenance rows, `/credits`, ladder decision |
| 3 | Batch 4: research, science review, glossary, hand translation of the 21 into 14 locales | +21 × 14 = 294 (1,974 total) | the page appears by adding files (`deepSkyPageIds`); re-run the model, then the build gate |

Tests. Unit: `deep-sky-entity.test.ts` (record + overlay, fallback to en-US, null for an object with no overlay, M13's door, `m42` gateway, a photo-backed object's gallery fields), a route-list test (every overlay id is a route; the alias map points only at ids that are routes; no collision with body, star or hole ids: `collide.mjs` as an assertion), `scale-index.test.ts` cases (globular and Local Group alias rows share `href`), `sitemap`, `route-lastmod`, `check-seo.test.ts` fixture. Build gate: `check-seo`. E2E: `scale-index.spec.ts` and `index-links.spec.ts` as §3 row 9; the static HTML of `/explore/deep-sky/m13` and `/de/explore/deep-sky/m13` by `request.get` (no browser needed, as `index-links.spec.ts`), plus the phase-0 panel spec. Not planned: a browser test of the page itself.

## 6. Open questions for the operator (Recommended first)

1. **Canonical ids for the collisions.** Recommended: the deep-sky id is canonical, one page per object at `/explore/deep-sky/<id>`; the Milky Way globulars `m3 m4 m5 m13 m15 m22 m92`, the Local Group `m32 m110` and the aliases `andromeda→m31`, `triangulum→m33` (and `omega-centauri→ngc-5139` with batch 4) link to that page from their INDEX rows; no second page, no Milky Way or Local Group page for the same object. Alternative: the Milky Way or Local Group id is canonical (needs a record, overlay and sources they do not have). Yes?
2. **Pages for which objects.** Recommended: the 120 with reviewed text (the set follows the overlay files, so the 21 join when batch 4 lands). Alternative: all 141 now, with 21 pages that fail the floor in every locale (294 page-locale pairs) or a per-type floor. Yes to 120?
3. **Heroes.** Recommended: with B3's loader, 23 objects (phase 2). Alternative: now, from `/images/deep-sky/<key>.jpg` directly (no WebP ladder, so a 700 px `.thumb.jpg` or a 1600 px original on a page). With B3?
4. **Batch 4 (the 21).** Recommended: start it after phase 1 is green, same pipeline and rules (`docs/wip/deep-text/README.md`: research, science review, glossary first, hand translation, free route); the 21 are the famous photographed objects, and their pages arrive with no code change. Alternative: before phase 1 (delays the 120 pages), or never (they stay INDEX rows and gallery items). Go after phase 1?
5. **H1 for the 88 objects whose `name` is a bare catalogue code.** Recommended: H1 = designation, then the common name where the data has one (`M13 · Hercules Globular Cluster`; `M3 · NGC 5272`), names stay English data in all locales (as black-hole names did before their overlays), no `name` field in the 1,680 overlay files; the panel title takes the same rule. Alternative: add a localized `name` to the overlays through `native-terms.json` first (memory "Names: glossary first"; a translation job of 120 × 13). Which?
6. **The 96 photo-less objects that open no panel (§3.1).** Recommended: fix now, before pages (phase 0): every object with an overlay opens the flat panel and takes the camera, as UXD-019 states. Alternative: leave them as dots and ship pages anyway (the page's "Open in Orrery" then lands on a highlight, not a panel). I can do phase 0 next if you say go.
7. **Where the decision is recorded.** Recommended: ADR-096 item 17, as item 16 was added for black holes; item 15's first sentence is rewritten. Alternative: a new ADR. Amend?
8. **Local Group and Milky Way pages for everything else** (33 + 19 rows without a deep-sky record). Recommended: not in this arc; decide after batch 4 and the next measurement. Alternative: pages for the 6 Local Group headliners using the `/science` article text (first brief §1.5 point 5). Defer?

## 7. NOT DONE / NOT VERIFIED

Not done:
- No page, loader, route, test or `site-routes` change; Part B is this document only. Phase 0 (the 96 photo-less objects) is not implemented.
- No batch 4 text, no `name` field, no alias map, no `validate-data` rule, no ADR-096 amendment (§3 row 16 is a plan).

Not verified:
- **Every character count is a model**, not a built page; `check-seo`'s `mainText()` was never run on a deep-sky page. The model's value strings are approximations (distance via `Intl` from `dist_ly`, constellation in English, "ly" suffix). The model was not calibrated against a page I modelled and then measured. **zh-CN margin is 10 characters (`m21`), ar 24**: those two locales can flip.
- The chrome copies the black-hole page's structure; a different template may add or remove elements in `<main>`. Whether the layout puts anything else inside `<main>` was not checked (first brief §7).
- The Data sources block and gallery caption text in variant F are English data; in the real page their count could differ if the block is collapsed or omitted. R excludes them on purpose.
- The size figure (~42 MB for 1,680 pages) is a division of ADR-096's 212 MB by 8,302 pages, not a build. Whether the mobile gate still passes with the prune entry is not run.
- No build, `check-seo`, `check-internal-links`, `route-lastmod`, Playwright, browser or dev server was run for Part B. Part A's checks are recorded in its commit report (vitest, svelte-check, eslint, prettier, validate-data, message-parity); its two e2e additions in `tests/e2e/explore-message-panel.spec.ts` (M13 en and `/de`) have not been run in a browser, and whether `/de/explore?deepsky=M13` cold-loads the German overlay is unverified.
- Not read: whether `ScaleIndex`'s hidden pre-hydration list holds 120 more link rows without a measurable HTML or accessibility cost; whether `scale-index.spec.ts` helpers other than lines `:134–171` assume one row per page.
- Not verified: that `deep-sky-objects.json` can be entry-dated per id in `build-route-lastmod.mjs` (its shape is `objects[]`, like `black-holes.json`, which is mapped at `:109`); that overlay paths `universe/deep-sky/<id>.json` fit `overlays` as `universe/black-holes/<id>.json` does.
- Not verified: schema.org has no suitable type for a deep-sky object (my belief, unchecked); OG-card size rules for deep-sky originals (1600×512 to 1600×1901); `masters/` LFS for the 8 originals B3 may use.
- Not checked: whether `tests/e2e/visual.spec.ts` snapshots cover any entity page; RTL rendering (ar) of the page; `scripts/route-budget.json` for the new route.
- The 6 gallery images with no catalogue object, and the 2 objects with null `dist_ly` and `dist_label`, were counted but their page rows were not designed (a null distance means no row).
