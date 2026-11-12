# Deep-level entity pages brief — stars, black holes, deep-sky, galaxies, exoplanet systems

Brief, 2026-11-12, written at HEAD `50b754fd271` on `tech-debt/0.9.9`. Read-only investigation: nothing in `src/`, `scripts/` or `static/` was changed. Operator ask (plan line 471, `docs/wip/2026-11-11-ux-feedback-plan.md`): "first we have to take a step back and add stars as entity pages and then catch up. Same goes for black holes, deep-sky objects, galaxies and exoplanet systems, measure them now and lets lock them in as entities as well. And then we close that gap on index/A–Z, sitemap and wherever else."

Method. Four scripts run as files from the repo root (session scratchpad `…/6fc6157c-346c-4f06-8e2d-3b7060eafb22/scratchpad/`): `measure.mjs` (page-text model per type and locale), `measure2.mjs` (science-article add-on, entity lists), `baseline.mjs` (the real built `/explore/<id>` pages), `names.mjs` (overlay names). The floors are read from `scripts/check-seo.mjs` by regex, not copied. Characters are counted the way `check-seo.mjs` counts (`mainText()`: `<main>` text, whitespace removed). **The new types have no pages yet, so their counts are a MODEL of the page text** (chrome + overlay prose + the panel's own labels and values, §1.2), not a build measurement. The baseline for existing pages is real: `build/` of 2026-11-12 14:13.

## 0. Answer first

| Type | Entities | Clear the floor in all 14 | Clear en-US only | Missing locales | Recommended |
|---|---|---|---|---|---|
| Named stars | 62 | **62** (min 584 en-US vs 350; zh-CN 274 vs 175) | 0 | none: 62 overlay files in each of 14 locales; 0 of 13 non-English bios equal the English one; 10 have a photo | **page** — phase 1 |
| Exoplanet systems | 11 hosts (7 are a named star, 4 are host-only: `trappist-1`, `51-pegasi`, `toi-700`, `kepler-16`); 26 planets | **11** (min 559 en-US) | 0 | none for hosts; planet overlays: 25 of 26 planets, in all 14 locales (`kepler-16-b` has none, in en-US either) | **page, merged into the star page** (host-only hosts get a star page built from the system record) — phase 1. Not one page per planet |
| Black holes | 4 (3 real, `gargantua` fictional) | **3** from panel data + the `/science` intro (min 362 en-US); 4 only when the generic lens notes are added | 1 (fails fr, pt-BR, it, nl by under ~20 characters) | none; but the `discovery` line (the only entity-specific text) is English in every locale | **page after** the 4 `discovery` lines are translated (52 strings) and the `gargantua` question is answered — phase 2 |
| Deep-sky objects | 141 (44 with a curated photo and caption, 97 with none) | **1** | 1 | none (overlays exist for the 50 gallery keys); 96 of 141 have **0 prose characters** | **not yet.** 139 fail even en-US; the 44 photo-backed ones reach 206–239 against 350 |
| Galaxies: Local Group | 33 (6 headliners) | **0** | 0 | none; names English | **not yet.** 225–245 en-US against 350; 28 of 33 share one dwarf paragraph. 4–6 headliners with a dedicated `/science` article would clear (arithmetic, §1.5) |
| Local Sheet / Virgo / Laniakea / Cosmic web | 9 / 7 / 8 / 7 | 8 / 0 / 0 / 0 | 0 / 6 / 7 / 2 | none | **never as separate pages** (the Local Sheet's 8 passes are one paragraph repeated 8 times — passing the floor is not passing the purpose) |
| Milky Way pins (globulars, Magellanic Clouds) | 12 (+5 arms, Sun, Sag A\*) | **0** | 0 | none | **not yet**; Sag A\* is the black-hole page |

Pages this adds: phase 1 = 62 stars + 4 host-only stars = 66 × 14 = **924** (+7.6 % on the 12,166 indexable pages of ADR-096); phase 2 = 3 (or 4) × 14 = 42 (56). Total at most 980, indexable pages 13,146.

## 1. Measurement

### 1.1 Where the data and the prose live

| Type | Data | Prose | Panel (component) | Deep link into the scene (`explore-url-sync.svelte.ts`) |
|---|---|---|---|---|
| Stars | `static/data/universe/named-stars.json` (62: id, hip, proper, con, spect, dist_pc, mag, absmag, bv, xyz) | `i18n-src/<locale>/universe/named-stars/<id>.json` — `name?`, `fact`, `bio`, `cultural`, `links[]`, `photo?` (62 files × 14 locales) + `culture-doors` blurbs (3 doors on stars) | `StarPanel.svelte` | `?goto=<id>` (`:143`) |
| Exoplanet systems | `universe/exoplanet-systems.json` (11 hosts, 26 planets: period, a, e, radius, mass, discovery) | `i18n-src/<locale>/universe/exoplanets/<planetId>.json` — `fact`, `bio`, `links[]` (25 files × 14) | `ExoplanetPanel.svelte`, `StarPanel` SYSTEM tab | `?system=<hostId>[&planet=<planetId>]` (`:171–172`) |
| Black holes | `universe/black-holes.json` (4: mass, distance, spin, rs_km, `science_section`, `discovery`) | **no overlay.** Panel text = message labels (`explore_bh_*`) + `discovery` (English string in the data file) + the `/science/observation/black-holes` article | `BlackHolePanel.svelte` (+ `BlackHoleNotes.svelte` generic lens notes) | `?bh=<id>` (`:253`) |
| Deep-sky | `universe/deep-sky-objects.json` (141: designation, category, ra/dec, `dist_label` English, `con` code) | only for the 44 with `photoKey`: `i18n-src/<locale>/deep-sky.json` (50 gallery keys: title, caption, type, distance); none for the other 97 | `DeepSkyPanel.svelte` | `?deepsky=<id or designation>` (`:200`; `getDeepSkyObject` accepts both) |
| Local Group | `universe/local-group.json` (33; 6 `headliner`) | **none per member.** One generic blurb per kind (`explore_lg_blurb_spiral/irregular/dwarf`) + a group label | `LocalGroupPanel.svelte` | **none** (B3 brief §5 point 5: pick by canvas only; `?galaxy=` is Milky Way pins only) |
| Local Sheet, Virgo, Laniakea, Cosmic web | `local-sheet.json`, `virgo-cluster.json`, `laniakea.json`, `cosmic-web.json` | generic blurb per panel (distinct blurbs per set: Sheet 2, Virgo 2, Laniakea 3, Cosmic web 2) | `LocalSheetPanel`, `VirgoPanel`, `LaniakeaPanel`, `CosmicWebPanel` | `?context=` jumps to the shell only; member panels have none |
| Milky Way pins | `universe/milky-way-schematic.json` (10 globulars, 2 Magellanic, 5 arms, Sun, Sag A\*) | generic blurb per kind | `MilkyWayPanel.svelte` | `?galaxy=<id>` (`:228`) |
| Reference: planets, moons, small bodies | `planets.json`, `satellites.json`, `small-bodies.json` | `i18n-src/<locale>/{planets,satellites,small-bodies}/<id>.json` | `PlanetPanel`, … | `?id=` |

Names. Star overlays carry a localized `name` for sr-Cyrl, zh-CN, ja, ko, hi, ru (62 of 62), ar (59), and 10–17 of 62 in the Latin locales (`names.mjs`). Black-hole, deep-sky and galaxy names are English in the data; `scripts/i18n-tools/native-terms.json` has no entry for `m87`, `cygnus x-1` or `sagittarius a`, and does have `andromeda`, `large magellanic`, `virgo cluster`, `laniakea` (substring search over the file). Memory "Names: glossary first" applies before any of these pages is written.

### 1.2 How the page text was modelled

Same chrome as the existing `/explore/<id>` template (`src/routes/explore/[id]/+page.svelte`): crumb (`explore_page_title` + name), H1 name, "Open in Orrery". Then per type, from the panel's own pieces: stars = name, `fact`, `bio`, `cultural` (+ the "Across cultures" heading), culture-door blurbs, the TECHNICAL rows (colour, distance ly and pc, apparent and absolute magnitude, spectral class, constellation, HIP number) with the panel's message labels, link labels; for the 7 star-hosts also the system's planets (name, `fact`, `bio`, six data rows, labels). Black holes = kind label, four data rows, `discovery`, `/science` article title and intro (from `science-index.<locale>.json`), the badge. Deep-sky = category label, designation, distance, telescope, credit, constellation, caption. Galaxies = kind label, blurb, group label, distance, diameter, badge. Numbers use `Intl.NumberFormat(locale)`. No message key was missing (`missing message keys: none`).

### 1.3 Real baseline (existing pages, `build/` 2026-11-12 14:13, `check-seo`'s own measure)

| Kind | n | en-US min / median / max | zh-CN min / median | ko min / median |
|---|---|---|---|---|
| planets | 9 | 755 / 1,748 / 2,667 | 291 / 591 | 326 / 701 |
| moons | 16 | 915 / 1,328 / 1,838 | 412 / 609 | 481 / 683 |
| small bodies | 23 | 744 / 921 / 1,380 | 299 / 386 | 347 / 450 |

(ja, hi, ar, ru, fr … in `baseline.mjs` output; every locale's minimum sits at 2× its floor or more.) So the thinnest existing page is 744–915 en-US characters. Modelled stars start at 584 (median 684), host systems at 559, black holes at 362–381 (694–713 with lens notes), deep-sky at 92–239, Local Group at 225–263: stars and hosts are comparable to a small body, everything else is a different class of page.

### 1.4 Results per type (model output)

| Type | n | clear all 14 | clear en-US but not all | fail en-US too | en-US chars min / median | entities with 0 prose characters (en-US) |
|---|---|---|---|---|---|---|
| stars | 62 | 62 | 0 | 0 | 584 / 684 | 0 |
| stars incl. their planets (7 hosts) | 62 | 62 | 0 | 0 | 584 / 697 | 0 |
| exoplanet systems | 11 | 11 | 0 | 0 | 559 / 1,036 | 1 (`kepler-16`: its one planet has no overlay) |
| exoplanets, planet-level | 26 | 26 | 0 | 0 | 491 / 577 | 1 |
| black holes, panel data + science intro | 4 | 3 | 1 | 0 | 362 / 381 | 0 |
| black holes + lens notes | 4 | 4 | 0 | 0 | 694 / 713 | 0 (the notes are generic) |
| deep-sky | 141 | 1 | 1 | 139 | 92 / 101 | 96 |
| deep-sky with photo and caption | 44 | 0 | 1 | 43 | 206 / 239 | 0 |
| deep-sky without | 97 | 1 | 0 | 96 | 92 / 98 | 96 |
| Local Group | 33 | 0 | 0 | 33 | 225 / 244 | 0 (a generic blurb) |
| Local Group headliners | 6 | 0 | 0 | 6 | 244 / 263 | 0 |
| Local Sheet | 9 | 8 | 0 | 1 | 265 / 432 | 0 |
| Virgo | 7 | 0 | 6 | 1 | 296 / 390 | 0 |
| Laniakea | 8 | 0 | 7 | 1 | 310 / 378 | 0 |
| Cosmic web | 7 | 0 | 2 | 5 | 293 / 332 | 0 |
| Milky Way globulars + Magellanic | 12 | 0 | 0 | 12 | 256 / 266 | 0 |

Per-locale minimum against floor (excerpt, chars / floor): stars en-US 584/350, fr 666/430, zh-CN 274/175, ja 328/190, ko 313/175, ar 522/330; black holes (panel data + intro) fr 414/430, pt-BR 380/390, it 391/395, nl 400/410 (fail), zh-CN 209/175; deep-sky en-US 92/350, zh-CN 53/175; Local Group en-US 225/350, zh-CN 105/175.

### 1.5 What the numbers mean

1. **Stars and hosts clear with a wide margin** (234 characters in en-US, 99 in zh-CN). A model error of a few dozen characters cannot flip them. The prose is real and per-entity (`fact`, `bio`, `cultural` in every locale, none a copy of the English).
2. **Black holes clear only barely and only by borrowing.** The unique text is a 60-character English `discovery` line; the rest is labels, numbers and the `/science/observation/black-holes` intro, the same intro on all 4 pages. The generic lens notes lift all four far past the floor but are identical on every page. A page that clears the floor on boilerplate satisfies the regression guard (ADR-096 item 12 says it "guards against regressions rather than judging content"), not search.
3. **Deep-sky: no.** 97 objects have a name, a designation, a category and an English distance string and nothing else. 44 have a one-sentence caption. Even those fail the floor in every locale. Making these pass means either lowering the floor for the type (the floor is a frozen regression guard, not mine to move) or writing prose (ADR-096 "Hand-written SEO copy": a translation programme, rejected for the entity pages).
4. **Galaxies: no.** Every Local Group panel shows the kind blurb: 28 of 33 members show the same dwarf paragraph, 3 the spiral one, 2 the irregular one. The Local Sheet passes the floor (8 of 9) only because its blurb is long; eight pages would carry one identical paragraph, which is the doorway-page shape ADR-096 rejected for the `/c/*` stubs.
5. **Headliners with an article.** `/science` has dedicated articles for `andromeda-galaxy`, `magellanic-clouds`, `our-galaxy`, `local-group`, `dwarf-spheroidals`, `galaxy-types`, `laniakea-and-the-great-attractor`, `large-scale-structure`. Title plus intro is 215–249 characters in en-US, 77–125 in zh-CN (`measure2.mjs`). Adding that to the headliner's 244–263 gives ~460–510 en-US and clears every floor by arithmetic (sum of two measured parts, not re-measured as one page). It would cover `milky-way`, `andromeda`, `lmc`, `smc` with a specific article; `triangulum` and `ngc-6822` would reuse the generic `local-group` one. Same ADR-096 item 12 route the body pages took (linked science sections with the reason line), but the intro is shared text.

### 1.6 Id collisions (script `measure.mjs`)

- New ids against the existing `/explore/<id>` ids (planets, moons, small bodies): **none** (no star, host, planet, black hole, deep-sky or galaxy id equals a body id).
- Between the new groups (the same real object under two ids or two groups): star = host system (7: `aldebaran`, `pollux`, `hamal`, `lalande-21185`, `barnards-star`, `luytens-star`, `proxima-centauri`); black hole = Milky Way pin (`sagittarius-a-star`); deep-sky = Milky Way globular (`m3 m4 m5 m13 m15 m22 m92`); deep-sky = Local Group member (`m32`, `m110`); Local Group = Magellanic pin (`lmc`, `smc`); Local Sheet = Virgo (`local-group`). `m31` (deep-sky) and `andromeda` (Local Group) are one galaxy under two ids; `milky-way` and `sun` also sit in more than one dataset. All ids match `[a-z0-9-]+`.
- Consequence: stars, hosts and black holes can take a flat namespace today; deep-sky and galaxies cannot without a canonical-id table (one entity, several panels). That is one more reason they wait.

## 2. Design

### 2.1 URL scheme — recommendation: typed paths under `/explore`

`/explore/stars/<id>` (66), later `/explore/black-holes/<id>`. Not flat `/explore/<id>`.

| Question | Typed `/explore/stars/<id>` | Flat `/explore/<id>` |
|---|---|---|
| Id collisions | none by construction (today also none flat, but deep-sky/galaxies already collide with each other) | shared with planets/moons/small bodies forever; a new moon named like a star would break a build |
| Loader | one `+page.server.ts` per type, own entry generator; `explore/[id]` untouched | `getBodyEntity` chain (planet → moon → small body) gains four more branches; `entries` merges five lists |
| Existing gates | `/explore/stars/<id>` has a `/` in the rest, so `hubIds('explore')` (`src/lib/server/entity-index.ts:25–35`) and `entityIds('explore')` (`tests/e2e/index-links.spec.ts:38–45`) skip it automatically | flat ids enter both lists: `nameOf` returns `null` for them (`entity-index.ts:52–55`) and **silently drops them from the A–Z**, and the e2e then expects an INDEX link for each star in the solar-system index (it is in the neighbourhood index) — both break quietly |
| Breadcrumb | Explore › Stars › Sirius, matches the ScaleNav levels | Explore › Sirius |
| hreflang, canonical, sitemap | generic: `hreflangAlternates(route)` / `canonicalUrl(route, locale)` take any route; nothing per path | same |
| Cost | one hub route `/explore/stars` (below) and `ENTITY_ROUTE` regex learns the new prefix (`check-seo.mjs:71`) | smaller |

Hub route `/explore/stars`: a prerendered A–Z of the 66 stars with each star's `fact`, server load, no client JS. Reason: ADR-096 item 11 requires every hub to link all its entity pages in the **prerendered** HTML, and I did not verify that `StarIndex` is in the DOM of `/explore` outside the neighbourhood view (§5 NOT VERIFIED). A static hub does not depend on scene state. It must be added to `NOT_ENTITY` (`check-seo.mjs:73`) and filtered in `hubIds`/`entityIds` the way `hub` is.

Exoplanet systems: no URL of their own. A host is a star; `/explore/stars/<hostId>` carries the system section with the planets as anchors (`#trappist-1-b`) and the `?system=<host>&planet=<id>` links. The 7 hosts that are named stars already have the id; the 4 host-only ones get a star page built from `exoplanet-systems.json`' `star` record (name, spectral class, distance, constellation, position).

### 2.2 Template — new route, shared CSS and helpers

Reuse: `src/lib/components/entity-page.css`, `JsonLd`, `pageTitle()`, `metaDescription()`, `breadcrumbList()`, `article()`, `localHref`, the `explore/[id]` structure (crumb, header with kind line, lede, `dispatch` paragraph, `facts` dl, linked sections, `.cta`). New: `src/lib/data/star-entity.ts` (`getStarEntity(id, locale, fetch)` mirroring `body-entity.ts`: base record or system host record + overlay `i18n/<locale>/universe/named-stars/<id>.json` with en-US fallback + culture doors + system planets), `src/routes/explore/stars/[id]/+page.server.ts` (`prerender = true`, `entries`, server-only, as ADR-096 item 2), `+page.svelte`, `src/routes/explore/stars/+page.{server.ts,svelte}` (hub). `explore/[id]` itself stays.

Star page shows: kind line (spectral class and colour name, constellation), H1 name, `fact` as lede, `bio`, "Across cultures" + `cultural`, culture-door blurbs under "In culture", the technical rows (distance in ly and pc, magnitudes, spectral class, catalogue number), for hosts the system section (planet count, per planet: name, `fact`, `bio`, period, axis, eccentricity, radius, mass, discovery), the H–R science link and the overlay's `links[]` (B2 caps science link lists at 5 and wants "one helper, two callers" — the star page takes its list from B2's helper when that lands), "Open in Orrery".

Black hole page (phase 2): kind label, the four data rows, `discovery` (translated), the `/science` article title and intro with link, the culture door (Gargantua only), "Open in Orrery" `?bh=<id>`.

Images. The existing `explore/[id]` page shows **no image** (read in full). Stars with a photo: 10 (altair, antares, barnards-star, betelgeuse, fomalhaut, proxima-centauri, rigel, rigil-kentaurus, sirius, vega; B3 §2.3), all `kind: real`, provenance rows `star-<id>-01`. Phase 1 ships without images, like every other entity page. A hero is phase 3 and goes through B3's `getUniverseHero(kind, id)` / `panel-heroes.json` (so pages and panels share one curation), the existing tools (`image-find-source.mjs`, `move-image-to-gallery.ts`, `replace-gallery-slots.ts`) and `/credits` via `image-provenance.json`; no new image work is part of this brief. For OG: a page's own `og:image` wins in `addSocialMeta()` (`src/lib/social-meta.ts:40`), so the 10 star photos could be the card, else `DEFAULT_OG_IMAGE`; image width requirements for cards were not checked (star photos are 600×600 to 2401×3001 per B3).

JSON-LD. `article()` + `breadcrumbList()` as the body pages do (`explore/[id]/+page.svelte:25–30`). I know of no dedicated schema.org type for a star, galaxy or black hole and did not verify one; no new type is proposed. `sameAs` from the overlay's Wikipedia link is a possible later addition (not verified as useful).

### 2.3 "Open in scene" links

| Page | Link |
|---|---|
| star (named) | `/explore?goto=<id>` |
| host-only star (`trappist-1`, `51-pegasi`, `toi-700`, `kepler-16`) | `/explore?system=<hostId>` — `?goto=` takes named-star ids; these four are not in `named-stars.json` |
| planet anchor | `/explore?system=<hostId>&planet=<planetId>` |
| black hole | `/explore?bh=<id>` |
| deep-sky (later) | `/explore?deepsky=<id>` |
| Milky Way pin (later) | `/explore?galaxy=<id>` |
| Local Group … Cosmic web member (later) | **no link exists**; `?context=local-group` only enters the shell. A galaxy page needs a new member deep link in the scene host (B3 §5 point 5) — scene work, not page work |

Panels link back to pages through the INDEX rows (A5's `ExploreBodyIndex` pattern: `pageIds`, `pageHref`, `data-testid="explore-body-index-page-link"`), not from inside the panel (ADR-096 "Neutral": the panels do not link to the pages).

### 2.4 How pages and panels share content

Both read the same JSON: the panel via client `getNamedStarI18n` (`src/lib/data/universe.ts`), the page via the new server loader on the same `i18n/<locale>/universe/named-stars/<id>.json`. No second copy. AGENTS.md:97 already requires that "a change to what a panel shows should reach its entity page". The consequences for in-flight slices:

- **B3** rewrites `StarPanel` (one hero, IN THE SKY tab, TECHNICAL, Gallery only at ≥2 images — 0 of 62 at ship) and the outer panels, and owns the counts: 62 named stars, 10 with a photo, 4 black holes, 141 deep-sky of which 44 with a photo, 33 Local Group, 19 Milky Way pins, and "no deep link for Local Group … Cosmic web" (§5 point 5). I reuse those numbers. B3 keeps `?goto=` unchanged, so the page link is stable. The star page does not need B3's tabs; it needs B3's hero loader only in phase 3.
- **B2** (science links capped at 5, one helper): the star page lists science links, so it must call B2's helper; phase 1 should start after B2's helper exists or leave the list as the H–R link plus overlay `links[]` and migrate with B2.
- **B1** (shared panel shell, action row): does not touch standalone pages (B1 brief line 350; `.cta` on pages is deferred item L31).
- **A5** (built, fixes in progress): `ExploreBodyIndex.svelte:49` hard-codes `pageHref = /explore/${id}`; typed paths need a second helper. `StarIndex.svelte` rows (`:110` button, `:133` black-hole rows) have no links; adding them waits until A5's fixes land (the A5 files are being edited in this checkout).
- **A6** (nav/shell): footer and `/explore/hub` are the only discovery surfaces outside the scene; no change forced.

## 3. Every touchpoint

Paths and lines read at HEAD `50b754fd271`.

| # | Place | What changes |
|---|---|---|
| 1 | `scripts/site-routes.mjs:126–136` (`bodyRoutes`), `:154–166` (`collectCanonicalRoutes`) | new `starRoutes()` (named-stars + system hosts, deduped) → `/explore/stars/<id>`, plus `/explore/stars` in the seeds; later `blackHoleRoutes()`. One list feeds prerender and sitemaps |
| 2 | `svelte.config.js:11,24,91–92` | none: `expandLocalizedRoots(collectCanonicalRoutes())` carries nested paths (`/explore/hub`, `/science/a/b` work already); the new routes need their `entries` export in `+page.server.ts` like `explore/[id]` (`handleEntryGeneratorMismatch` is `'ignore'`) |
| 3 | `src/lib/sitemap.ts:72` | none: iterates `collectCanonicalRoutes()`; `src/lib/sitemap.test.ts` gets a case |
| 4 | `scripts/build-route-lastmod.mjs:86–93` (`ENTRY_FILES`), `:271–276` (`inputsFor`) | new branch for `explore/stars/<id>`: data `static/data/universe/named-stars.json` (`stars[]`, entry-dated by id like `planets.json`) or `exoplanet-systems.json` (`systems[]` by `hostId`), overlays `universe/named-stars/<id>.json` and, for hosts, `universe/exoplanets/<planet>.json`, `addDir('explore/stars/[id]')`. **An unmapped route is a hard error** (header comment line 41), so this is not optional. Then `npm run route-lastmod` in the release PR regenerates `src/lib/generated/route-lastmod.json`; `src/lib/route-lastmod.test.ts` and `scripts/build-route-lastmod.test.ts` get cases |
| 5 | `scripts/indexnow-submit.mjs:7,30`, `docs/ops/indexnow.md:27` | no code change: reads the sitemaps, batches of at most 10,000 (13,146 URLs → 2 batches). Docs: the URL count. The first real submission (L13) should include these pages if they land in 0.9.9 |
| 6 | `scripts/check-seo.mjs:71` (`ENTITY_ROUTE`), `:73` (`NOT_ENTITY`), `:221–231` (floor), `:49–64` (`THIN_MIN_CHARS`) | regex gains `explore/stars/<id>`; `/explore/stars` into `NOT_ENTITY`; floors **unchanged**. After the first build run `CHECK_SEO_FLOORS=1 node scripts/check-seo.mjs` to compare the thinnest star page with §1.4. `scripts/check-seo.test.ts` fixture build gets a star page |
| 7 | `scripts/check-internal-links.mjs`, `scripts/check-prerender-completeness.mjs` (`MIN_HTML_FILES = 200`) | the former follows `<a>` targets and needs no list; the latter only counts; neither read for a route list. Not edited, not run |
| 8 | `scripts/mobile/prune-streamed-assets.mjs:153–180` | **add the star pages and their `__data.json` to the prune loop** (decision 7 of ADR-096). The mobile build is at 75.6 MB of 77 MB; 924 pages at the average of 8,302 pages / 212 MB (~25 KB each) is ~23 MB. Without this the mobile size gate fails |
| 9 | `src/lib/server/entity-index.ts:10` (`EntityHub`), `:25–35` (`hubIds`), `:52–55` (`nameOf`) | new hub `stars` (typed, not part of `explore`), or `/explore/stars` served by its own load; `getEntityIndex('stars', locale, fetch)`; native-name sorting reuses the collator. `src/lib/server/entity-index.test.ts` |
| 10 | `src/lib/components/EntityIndex.svelte` and hub pages (`src/routes/missions/+page.server.ts`, `fleet`, `explore/+page.server.ts`) | `/explore/stars` renders the star list through the same component or its own markup |
| 11 | INDEX rows: `src/lib/components/StarIndex.svelte:110` (star rows), `:133` (black-hole rows); `ExploreBodyIndex.svelte:48–52,118–132`; `SurfaceIndexPanel.svelte` | star rows get a real link per row (A5 pattern, `data-testid` like `explore-body-index-page-link`), a typed `pageHref`, the plain-list-before-load behaviour of ADR-096 item 11 if `StarIndex` can be in the DOM while closed. Black-hole rows in phase 2. **Deep-sky and galaxy rows have no page and stay buttons** |
| 12 | Command palette `src/lib/components/CommandPalette.svelte` (+ items in `+layout.svelte:56`) | destinations only ("routes + key bodies", header lines 3–4); stars are not in it. Optional: add `/explore/stars`. Not required to close the gap |
| 13 | Footer `src/routes/+layout.svelte:585–` (Explore · Worlds · Catalog · Learn) and `/explore/hub` (`src/routes/explore/hub/+page.svelte`, cards for the scale levels with `explore_hub_desc_*`) | link `/explore/stars` from the Explore hub; the footer already reaches the hub (`href=/explore/hub`) |
| 14 | Breadcrumbs | per-page `.crumb` nav (as `explore/[id]/+page.svelte:42–46`) and `breadcrumbList()` JSON-LD; ScaleNav (`src/routes/explore/ScaleNav.svelte`) is scene chrome and is untouched |
| 15 | i18n: `messages/<14 locales>.json` | reused: `star_label_*`, `star_color_*`, `star_across_cultures`, `culture_heading`, `exo_*`, `star_system_planet_count`, `launches_open_in_orrery`, `explore_page_title`. New (est. 3–5 keys): the "Stars" crumb/hub title, hub intro, hub description for the Explore hub card, black-hole crumb in phase 2. Every key in all 14 locales; numbers/facts check per "Numbers in all locales". Names into `native-terms.json` first |
| 16 | Prerender data `static/data/…` | none new; `named-stars.json` and `exoplanet-systems.json` are already served; loader is server-only, so no client JS (`scripts/route-budget.json` default route budget applies; not measured) |
| 17 | e2e | `tests/e2e/index-links.spec.ts:13,38–45,115` (hub list, `entityIds` filter must skip `stars`; new spec for the star index links and the `/explore/stars` static HTML in `''` and `/de`); `explore-deeplinks.spec.ts:18,27` already cover `?goto=` and `?system=` which the pages link to; SEO specs: `scripts/check-seo.test.ts`, `src/lib/seo.test.ts`, `src/lib/sitemap.test.ts` |
| 18 | Unit | `src/lib/data/star-entity.test.ts` modelled on `entity-loaders.test.ts`; `site-routes` list pinned against `named-stars.json` ∪ `exoplanet-systems.json` hosts (same idea as `lab-formulas-json.test.ts`) |
| 19 | Visual / perf budgets | `tests/e2e/visual.spec.ts` + snapshots: whether entity pages are covered was not checked; mount-perf specs are scene specs and do not apply |
| 20 | Docs | ADR-096: amendment items 13–15 (recommended, §6 Q6) listing the new types and the "types that do not clear the floor" rule; `docs/adr/TA.md:110` (the entity-page paragraph), `AGENTS.md:97` (SEO surface row), `docs/uxs/IA.md`, `docs/ops/indexnow.md`, `src/routes/explore/README.md`, this plan's L-list |

Not a touchpoint but easy to forget: the 523 `/c/*` stubs and `scripts/card-targets.mjs` are unrelated to stars.

## 4. Phased plan

| Phase | Scope | Pages | Gate |
|---|---|---|---|
| 0 | Operator answers Q1–Q6; ADR-096 amendment; measure promoted: after the first build, `CHECK_SEO_FLOORS=1` replaces this model | — | decisions recorded |
| 1 | Stars + host-only stars + system sections: `star-entity.ts`, `/explore/stars/[id]`, `/explore/stars` hub, `site-routes`, lastmod, prune (#8), check-seo regex, entity-index, i18n keys, unit + SEO tests, docs. **No INDEX links yet** | 924 | build, `check-seo` PASS, thinnest star page ≥ model, internal links, mobile size gate |
| 1b | INDEX/A–Z: `StarIndex` rows link pages, `/explore/hub` card, e2e. Starts after A5's fixes land | 0 | `index-links.spec.ts` |
| 2 | Black holes: translate `discovery` ×4 ×13, native names, `/explore/black-holes/[id]`, INDEX rows | 42–56 | `check-seo`; fr/pt-BR/it/nl margin is under 20 characters, so the real build decides |
| 3 | Hero images for the 10 photo stars and M87\* via B3's `getUniverseHero` and `panel-heroes.json`; `og:image` | 0 | image provenance rows, `/credits` |
| 4 | Re-measure deep-sky and galaxies after B2/B3, and decide with the operator whether real prose is commissioned (a translation programme) | — | a new measurement table |

Order against the open work: phase 1 first (plan line 471: "Before A5's remaining work and B"); 1b waits for A5 fixes; phase 3 follows B3.

## 5. Tests

- Unit: `star-entity.test.ts` (base record + overlay + fallback to en-US for a missing locale file; a host-only star; `kepler-16`, whose planet has no overlay, still returns a page); route-list test (every `named-stars.json` id and system host is a route, no duplicates, none equals a body id — the §1.6 check as an assertion); sitemap and lastmod cases.
- Build gate: `check-seo` with the new prefix in the thin-page rule (a star page under its locale's floor fails the build); `CHECK_SEO_FLOORS=1` to read the true thinnest.
- E2E: `index-links.spec.ts` extended; a static-HTML spec for `/explore/stars` (a link per star in `''` and `/de`); `?goto=` link from a page resolves (existing deep-link spec).
- Not planned: a browser test of the page itself (static HTML; `request.get` suffices, as in `index-links.spec.ts`).

## 6. Operator questions (recommendation first)

1. **URL scheme.** Recommend typed `/explore/stars/<id>` (and `/explore/black-holes/<id>` later). Alternative: flat `/explore/<id>`; it breaks the explore A–Z and its e2e silently (§2.1). Yes to typed?
2. **Exoplanet systems.** Recommend no separate type: the system is a section of the host star's page; the 4 host-only hosts get star pages. Alternative: `/explore/systems/<host>` as a second page for the 7 named-star hosts (two near-duplicate pages per host). OK to merge?
3. **Scope now.** Recommend stars + hosts (66 → 924 pages) now; black holes in phase 2; deep-sky and galaxies **not yet**, recorded as "locked in as entities in the data and the INDEX, no page", with §1.4 as the reason. Alternative: pages for everything with the generic text and a lowered per-type floor (217 more entities × 14 = 3,038 pages; 96 of those 217 have no entity-specific words at all). Go with the recommendation?
4. **Gargantua.** Recommend no page (fiction; its culture door already appears in the panel). Alternative: a page with a fiction badge and no real-entity JSON-LD. Which?
5. **`/explore/stars` hub page** (static A–Z of the 66). Recommend yes, linked from `/explore/hub` and from the star INDEX. OK?
6. **Where the decision is recorded.** Recommend amending ADR-096 (items 13–15), as it was amended on 2026-11-09, rather than a new ADR-098: the rule (one page per entity, a floor, hubs link all) is the same, the scope grows. OK?
7. **Black-hole `discovery` strings.** Recommend translating the 4 English lines into 13 locales by hand before phase 2 (free route, 52 strings), not by a paid run. OK?
8. **Deep-sky / galaxies later.** Recommend a one-line status in the plan ("needs prose: 96 deep-sky objects have none") and that the 44 captioned deep-sky objects stay on the existing indexable `/gallery/deep-sky` page. Alternative: commission editorial text per object (a translation programme, ADR-096 "Alternatives"). Which do you want at 0.9.10?
9. **Should the Milky Way / Local Group shells themselves be pages** (5 pages: the scale levels the Explore hub already describes)? Not measured. Recommend deciding after phase 4.

## 7. NOT VERIFIED (as long as the done list)

- Every number for the new types is a model of the page text, not a built page. No star page exists, so `check-seo`'s `mainText()` was never run on one. The model's error was not calibrated against a page whose text I modelled and then measured; the existing-page baseline is real but a different set of pages.
- The chrome estimate (crumb, H1, CTA) copies the `explore/[id]` template; a new template may add or remove elements in `<main>`. Whether the layout puts anything else inside `<main>` was not checked beyond seeing that the footer sits after `</main>` (`+layout.svelte:560–565`).
- Value strings are approximations: colour temperature (`~5,800 K`), constellation names (the 3-letter code or a fixed word, not `constellationName()`), magnitudes. Each is under ~20 characters; the star margin is 234.
- Black-hole margins are 12 characters in en-US and a few in fr/pt-BR/it/nl; the model cannot settle those. `which of the four black holes fails` was not printed.
- Not read: whether `StarIndex` is in the DOM of the prerendered `/explore` when closed or outside the neighbourhood context (decides whether an INDEX link alone would satisfy ADR-096 item 11; the brief recommends a static hub instead). `explore/+page.svelte` was only grepped.
- Not read: whether `?context=` accepts `local-sheet`, `virgo`, `laniakea`, `cosmic-web` (the type `ExploreContextId` lists them, `explore-context.ts:14–22`; the handler at `explore-url-sync.svelte.ts:280` passes the string on).
- Not run: any build, `check-seo`, `check-internal-links`, `route-lastmod`, test, browser. The build-size figure (~25 KB per page) is a division of ADR-096's 212 MB by 8,302 pages; the mobile 75.6/77 MB figures are quoted from ADR-096 item 7 and the pruning script comment, not re-measured. A star page may be smaller or larger.
- Not verified: that the lastmod machinery can date `named-stars.json` entries per id (`ENTRY_FILES` handles `planets.json` that way; `named-stars.json` has a `stars[]` array like `satellites.json`; `exoplanet-systems.json` uses `systems[]` keyed by `hostId`, a new key); not verified that overlay paths with a subfolder (`universe/named-stars/<id>.json`) fit `overlays` exactly as `site-stories/<id>.json` does.
- Not verified: schema.org has no suitable type for a star/galaxy/black hole (my belief, not checked); `sameAs` usefulness; OG-card size rules; whether star photos (600×600 … 2401×3001) are acceptable as `og:image`.
- Not checked: whether `tests/e2e/visual.spec.ts` snapshots cover any entity page; `scripts/route-budget.json` budget for a server-only route; `check-internal-links.mjs` internals (assumed to follow anchors); the Hindi/Arabic/RTL rendering of the new hub.
- Not measured: `kepler-16-b` having no overlay in any locale (en-US too) — a content gap that the page tolerates (559 en-US) but the panel shows as a planet with numbers only.
- Not measured: Sun, the 5 Milky Way arms, `omega-centauri`/`47-tucanae` as individual pins beyond the 12-entity group; belts; the interstellar craft messages (`getInterstellarCraft`); `/science` article text beyond title + intro length.
- Not decided here: the canonical id for objects with two ids (`m31`/`andromeda`, `m32`, `m110`, the globulars, `lmc`/`smc`, `sagittarius-a-star`) — needed only when deep-sky or galaxies get pages.
- The scratchpad scripts are session-local and are not in the repo. Promoting them to a repo tool (memory "Document tools as you build") was not done; the build-time `CHECK_SEO_FLOORS=1` mode is the repo's own equivalent once pages exist.
- Other agents are editing A5 files in this checkout (`git status`: `AGENTS.md`, `docs/uxs/IA.md`, `SurfaceScene.svelte`, `explore/+page.svelte`, …); line numbers for those files may have moved since reading.
