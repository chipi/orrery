# Orrery technical SEO audit (build snapshot 2026-11-08, branch tech-debt/0.9.7)

Scope: every .html in /work/orrery/worktrees/0.9.5/build (4,417 files), parsed with scripts in this folder (scan.py -> pages.json, a1..a7.py). Live site spot-checked with curl (robots.txt, headers, titles/canonicals of /, /de/, /missions, /explore, /fly, /venus); live matches the build on every point below.

## URL scheme (confirmed)
- en-US at the bare path (`/missions`), the other 13 locales under `/<loc>/...` (`/de/missions`, `/sr-Cyrl/...`, `/pt-BR/...`, `/zh-CN/...`). Home of a locale is `/de/` (file `build/de.html`). Source: src/lib/seo.ts:50-58 (`localizedPath`), vite.config.ts:165 (paraglide urlPatterns), scripts/site-routes.mjs.
- No query-string locales, no hash routing, no meta refresh anywhere (0 of 4,417). `LanguageSuggestion.svelte` is an opt-in banner, not an auto-redirect.
- Page population: 278 routes x 14 locales = 3,892 indexable pages + `lab/callback.html` (indexable by mistake, see #8) + 523 `/c/*` share stubs (en-US only, noindex) + `404.html` = 4,417.
- Per-type counts (all locales): science 2,674 (191 x 14), programs 588 (42 x 14), essays 182 (13 x 14), card stubs 523, then 14 each for ~30 hub/tool pages.

## Findings, ranked by search impact

### HIGH

**H1. Individual missions, fleet entries, sites, planets have no indexable URL (hundreds of entities, 0 own pages).**
- `/missions` (50 words in prerendered HTML), `/fleet` (48 words), `/explore` (99), `/library` (82), `/live` (64) are client-rendered shells. Entities are reached only through `?id=` query strings (`/fleet?id=a7l`, `/missions?id=...`; 471 + 310 such links in the prerendered pages, repeated per locale). The page canonicalises to `/fleet` (no query), so every `?id=` URL is a duplicate of the shell and the entity text is never in HTML.
- The only entity-specific static pages are the 523 `/c/<kind>/<id>` share stubs (fleet 294, mission 126, moon-site 28, mars-site 27, small-body 24, moon 16, planet 8): ~37 words each, `noindex`, en-US only, no hreflang, and they JS-redirect (`goto`) humans to the `?id=` view. They are correctly noindex, so the net effect is that the richest content (every mission/vehicle/lander) cannot rank at all.
- Examples: https://www.orrerylearn.com/fleet?id=a7l (canonical /fleet), /c/fleet/a7l, /c/mission/chandrayaan1, /c/mars-site/curiosity, /missions, /fleet.
- Code: src/routes/c/[kind]/[id]/+page.svelte:12-25 (goto + noindex), src/routes/fleet/+page.svelte:442-443 and src/routes/missions/+page.svelte:404 (shell titles), scripts/card-targets.mjs (entity enumerator), src/routes/+layout.svelte:106-107 (canonical strips query).
- Fix: promote entities to real routes (`/fleet/<id>`, `/missions/<id>`, `/moon/<site>` ...) prerendered with unique title, 150+ words of text from the existing entity data, H1, canonical, 14 locales, added to scripts/site-routes.mjs (sitemap + hreflang come free). The stub generator already enumerates the id set. Until then, at least render the entity list (names + taglines, linked) into the /fleet and /missions prerender so the hubs are not 48-word pages with 9 links.

**H2. No Open Graph / Twitter tags on any of the 3,893 indexable pages; no og:image anywhere except the noindex stubs.**
- Present on real pages: only `og:locale` + 13 `og:locale:alternate` (src/routes/+layout.svelte:514-517). Missing on 3,893 of 3,893: og:title, og:description, og:image, og:url, og:type, og:site_name, twitter:card/title/description/image. Only the 523 noindex stubs carry them (c/[kind]/[id]/+page.svelte:27-36).
- Effect: every link share of an essay, science article, program or the homepage unfurls with no image and a bare title; no large-image result cards.
- Examples: /, /essays/delta-v, /science/orbits/keplerian-orbit, /programs/apollo, /de/essays/delta-v.
- Fix: emit OG/Twitter from one place in +layout.svelte next to the canonical (title/description read from the page; per-type fallback image, e.g. hero for essays/programs, a branded 1200x630 for the rest; `og:type` website/article; `og:url` = canonicalHref; `twitter:card=summary_large_image`; `og:image:alt`). Pages already know title + description; expose them via `page.data.meta` or a small store so the layout does not duplicate them.

**H3. Zero JSON-LD structured data on all pages.**
- 0 pages with `application/ld+json`; `grep ld+json|schema.org src/` is empty.
- Missing and applicable: `WebSite` + `Organization` (home), `Article`/`ScholarlyArticle` (13 essays, 191 science sections: headline, description, inLanguage, datePublished/dateModified, author), `BreadcrumbList` (science/<tab>/<section>, programs/<id>, essays/<slug>), `CollectionPage`/`ItemList` (hubs), `LearningResource`/`Course` (science), and for entities once H1 exists: `Place`/`Event`/`Product`-style types (mission, lander).
- Fix: a `<JsonLd>` helper component in src/lib/components emitting script tags from the same data; ship Article + BreadcrumbList first (covers ~2,900 pages). Note the CSP `script-src` hash mode (svelte.config.js:35-50): `type=application/ld+json` is a data block and is not executed, so no hash is needed.

**H4. Six tool pages (and /explore, /fly) have the bare title "Orrery"; 42 pages share it.**
- Built `<title>` is exactly `Orrery` on /explore, /fly, /venus in all 14 locales (42 pages; same title also on the live site). Locale messages do define better titles (messages/en-US.json:516 `explore_page_title` = "Solar System Explorer · Orrery", :739 `fly_page_title` = "Mission Arc · Orrery") but the output is the layout default (src/routes/+layout.svelte:509). Root cause for explore/fly not confirmed from source alone (same one-line `<svelte:head><title>` form as /missions which works: explore/+page.svelte:1704, fly/+page.svelte:3140); for /venus there is simply no `<title>` in the page: it puts a title in `+page.ts` `meta` (src/routes/venus/+page.ts:6 "Venus — Orrery") that nothing reads, and no `<svelte:head>` exists in src/routes/venus/+page.svelte.
- Examples: /explore, /fly, /venus, /de/explore, /ja/venus.
- Fix: add `<svelte:head><title>` + description to venus; find why explore/fly lose to the layout `<title>` (e.g. render the layout default only when no page title is set, or drop the layout `<title>Orrery</title>` fallback entirely and verify via a post-build assertion that no page ends with the bare brand title).

**H5. 476 indexable pages have no meta description; hubs and tools are thin.**
- Missing description: 21 route types x 14 = 294 (catalog, colophon, credits, earth, explore, explore/hub, fly, iss, lab, learn, library, live, mars, missions, moon, plan, posters, privacy, tiangong, venus, worlds) + 182 science tab pages (13 tabs x 14: /science/orbits, /science/transfers, /science/planets, /science/cosmology, /science/propulsion ...). The rest are fine (3,417 pages have one, none duplicated).
- Code: science tab page src/routes/science/[tab]/+page.svelte:41 sets a title only (section pages do set one at [section]/+page.svelte:97); the other routes listed in "svelte:head grep" have no `<meta name="description">`.
- Fix: add `*_meta_description` messages (the pattern already exists for fleet/gallery/programs) and a tab intro description for science tabs.

### MEDIUM

**M1. Titles: inconsistent brand pattern, ALL-CAPS and over-length science titles.**
- Pattern mix: `X · Orrery` (majority), `X — Orrery`, `X · ORRERY` (56 pages: catalog, learn, worlds, explore/hub), `Orrery — Sign in`, `Fleet — Spaceflight hardware` (14 pages with no brand at all: /fleet in every locale, src/routes/fleet/+page.svelte:442). Uppercase titles: "CATALOG · ORRERY", "LEARN · ORRERY", "WORLDS · ORRERY", "EXPLORE · ORRERY", science tabs "COSMOLOGY · Science · Orrery" (src/routes/catalog/+page.svelte:48, learn/+page.svelte:30, worlds/+page.svelte:40, explore/hub/+page.svelte:70, science/[tab]/+page.svelte:41).
- Length >60 chars: 665 pages (638 science, 18 essay, 7 program). Latin-script locales have ~50-70 each; worst are science sections where `section.title` is a full sentence ("Crew dynamics & psychology — Mir crises, ISS protocols, isolation · Science · Orrery", 84 chars; Arabic version 98-99 chars). CJK titles are never >60 (0-2) and are short in characters (not a defect by width).
- Length <20 chars: 442 real pages (excl. 300 noindex stubs): mostly hub pages "Live · Orrery", "Privacy — Orrery", "Gallery · Orrery", plus the 42 bare "Orrery". CJK "short" counts (zh 117, ja 67, ko 77) are character-count artifacts.
- Duplicates (excluding noindex stubs): the 42 "Orrery" pages; "Colophon — Orrery"/"Live · Orrery"/"Privacy — Orrery" repeated across 2-3 locales because the loanword is identical (acceptable). Within one locale, only the "Orrery" trio duplicates. No duplicates among science/essay/program pages.
- Non-English titles in non-en pages: effectively none beyond the above; programs/science titles keep Latin proper nouns ("Apollo · プログラム · Orrery"), which is correct. 53 non-en pages carry titles identical to English (39 are the bare "Orrery"; rest are loanwords).
- Fix: one helper `pageTitle(parts)` producing `Page · Section · Orrery`, truncating the middle at ~60 chars; use `section.short_title` for science sections; lowercase/normal-case the `ORRERY`/`COSMOLOGY` titles; add brand to the fleet title.

**M2. Descriptions: 1,480 over 160 chars, mostly essays/science/programs.**
- Over 160: essays 145 of 182 (the whole essay `dek`, up to 386 chars, used verbatim: src/routes/essays/[slug]/+page.svelte:53), science 1,067 of 2,492, programs 242 of 588 (src/routes/programs/[id]/+page.svelte:128 uses `p.tagline`), landing 11 of 14. Latin/Cyrillic/Devanagari/Arabic locales: 80-165 pages each; ja/ko/zh >160 are only 0-2 (character counts).
- Under 70: 406, of which ~396 are zh/ja/ko (character artifact, 26-60 chars is normal for CJK) and ~10 real (en: 1, pt-BR 1, sr-Cyrl 1, hi 2, ar 4, ru 1).
- Non-English pages with English description: 0 found (checked script ratio in sr-Cyrl, zh, ja, ko, hi, ar, ru and identity-to-English in all). Descriptions are unique (0 duplicate groups).
- Fix: a `metaDescription(text)` that cuts at a sentence/word boundary <=155 chars; add a short dedicated `meta_description` field for essays.

**M3. Thin prerendered text on tool/map/hub pages (no H1 on 7 route types).**
- Median body words (nav/footer excluded): fleet 16, missions 19 (/missions has 0 sub-links), mission launches 12, explore 50, colophon 50, library 42, live 33, tiangong 48, venus 49, iss 54, moon 79, mars 80, earth 88, worlds 105, learn 107. Essays ~2,974, programs ~1,376, science median 602, lab 1,462, home 941.
- No `<h1>` in prerendered HTML: /earth, /iss, /mars, /moon, /tiangong, /venus (6 x 14 = 84 pages), /missions/launches (14) + the 523 stubs + lab/callback + 404. (explore, fly have a visually-hidden h1 and do render it.)
- 87 science pages and 16 program pages have <100 body words; 177 science + 16 program pages have <150 (e.g. the 13 science tab pages at ~230-400 words are mostly a section list). 14 pages skip heading levels (h1 -> h3).
- H1 is unique within a locale on every page that has one (0 duplicate groups). Science tab pages repeat the tab name as both H1 and H2 ("COSMOLOGY" / "Sections" / "COSMOLOGY").
- Code: src/lib/components/StationRoute.svelte:1133 (title only), per-route +page.svelte files above.
- Fix: add a visible or sr-only H1 + a 100-200 word intro paragraph to each map/station page in the prerendered shell; render the list of missions/fleet items (see H1) server-side.

**M4. lab/callback is indexable, canonicalised, hreflang-pointing at 13 pages that were never built, and missing from the sitemap.**
- build/lab/callback.html has canonical https://www.orrerylearn.com/lab/callback and a full 15-entry hreflang set, 13 of which (`/es/lab/callback` ... `/ru/lab/callback`) do not exist (the only 13 broken hreflang targets in the build). No noindex. Title "Orrery — Sign in" (src/routes/lab/callback/+page.svelte:28).
- Fix: add `<meta name="robots" content="noindex">` there and skip hreflang for it (same pattern as `isCardStub` in +layout.svelte:106-107, extend the condition to `/lab/callback`).

**M5. Sitemap has no `<lastmod>`; 7.1 MB for 3,892 URLs.**
- 3,892 `<url>` entries, all unique, all on https://www.orrerylearn.com, all map to a built page (0 unbuilt). Every indexable built page except lab/callback is listed (3,892 of 3,893). No `lastmod`, `changefreq`, `priority` (lastmod is the only one Google uses). File is 7.1 MB uncompressed (each entry repeats 15 xhtml:link lines); limits are 50 MB / 50,000 URLs, so it passes, but it is one file.
- Code: src/routes/sitemap.xml/+server.ts:36-50.
- Fix: add `<lastmod>` from git/data-file mtime per route (essays/science have dates in their data), optionally split into a sitemap index per type.

**M6. Orphan-style hubs: /catalog, /learn, /worlds, /explore/hub (14 locales each = 56 pages) have no inbound links in the prerendered HTML.**
- 0 distinct linking pages among 3,893 indexable pages for these four routes (only reachable via sitemap or client-side menu/JS). Another 266 pages have only 1-2 linking pages (programs 168, patches/posters/sourcing/venus/essays 14 each).
- Hubs with few crawlable links: /missions 9 distinct links, /fleet 9, /explore 9, /library 11 (all nav/footer; 0 content links).
- Fix: render the main menu groups (Worlds, Learn, Catalog, Explore hub) as real `<a>` in the prerendered Nav/footer, and link from the home page "How to use it" section.

### LOW

**L1. Empty-alt images:** 14,630 `<img>` in prerendered HTML, 0 missing the alt attribute, but 6,942 have `alt=""` (47%). By type (en-US): program 177 of 260, science 144 of 228, plus every image on essay-index (13), gallery-index (24), program-index (135), explore-index (2). Fine if decorative; essay/program hero images that carry meaning should have alt text (image rankings). Examples: /programs, /essays, /programs/apollo.

**L2. Trailing-slash / path variants resolve with 200:** live `/de` and `/de/` both return 200 (different bytes: `de.html` vs the SPA path), `/fleet/` returns 200. Canonical is always the slashless form except locale homes (`/de/`), so duplicates are handled by canonical; no action beyond keeping canonical correct.

**L3. Stale comment:** src/routes/c/[kind]/[id]/+page.svelte:21 says "407 thin ... pages", the build has 523.

**L4. 404.html** has no `<title>`, no canonical (SPA fallback; live returns real 404 status for unknown paths, verified with `/nonexistent-xyz`). Fine.

**L5. Heading text:** essay H2s are numbered ("01Gravity is the accountant") because the number span is inside the heading; harmless for ranking.

## What is correct (verified)
- Canonical: present on 4,416 of 4,417 (404 excepted), exactly one each, self-referencing 4,416 of 4,416, all on `https://www.orrerylearn.com`, all resolve to a built file, no canonical shared by two pages; identical to sitemap `<loc>`.
- hreflang: 3,893 pages carry the full set (14 locales + x-default = 15 links), zero incomplete sets, codes correct (`en-US`, `pt-BR`, `sr-Cyrl`, `zh-CN`, ...), self entry equals canonical on every page, 0 non-reciprocal pairs, 0 wrong-locale targets; x-default -> en-US. Only unbuilt targets: the 13 lab/callback ones (M4). Sitemap carries the same set.
- `<html lang>` equals the locale on all 4,417 pages (`sr-Cyrl`, `zh-CN`, `pt-BR` included); `dir="rtl"` on all 278 Arabic pages (src/hooks.server.ts).
- No noindex on any real page (only the 523 stubs); no `X-Robots-Tag` on the live homepage headers; robots.txt: Cloudflare managed block allows `User-agent: *` (Allow: /) and disallows only AI-training bots; no Googlebot/Bingbot block; `Sitemap:` line present (live robots.txt and static/robots.txt).
- Descriptions: none duplicated, none in English on non-en pages. Titles: none missing (except 404.html), no duplicate H1s.
- Essay, science and program body text (median 2,974 / 602 / 1,376 words) is fully in the prerendered HTML in every locale.

## Not checked
- Googlebot rendering: not run (no Search Console / URL Inspection access); "client-side only" conclusions are from the prerendered HTML, not from a rendered crawl.
- Real index coverage, impressions, duplicate-canonical overrides by Google (needs Search Console).
- Core Web Vitals, JS bundle cost, mobile usability, structured-data rich-result validation (there is none to validate).
- Image sitemap, `/images` file weights, og:image dimensions/format (no OG images exist on real pages).
- Link targets pointing to external hosts, broken external links, nofollow/ugc rel attributes, outbound anchor quality beyond internal hubs.
- Internal-link analysis counted `<a href>` in prerendered HTML only; links created client-side (menus, dialogs, command palette) are not counted, so some "orphans" may be reachable by JS-driven navigation.
- Anchor-text quality was checked mechanically only (0 empty or generic-text anchors in 4,417 files); a human read of hub anchors was limited to home, science, essays.
- Language correctness of translations (only script-ratio and identity-to-English heuristics for title/description).
- Dev routes under src/routes/dev (not in the build, so out of scope), scripts/_archive (not touched), Cloudflare cache/redirect rules beyond a handful of curl probes, hreflang vs `og:locale` alignment in social crawlers.
- Whether the zh/ja/ko description lengths are acceptable by pixel width (character counts reported only).
