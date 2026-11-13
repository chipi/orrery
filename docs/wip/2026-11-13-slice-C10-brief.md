# Slice C10 brief — Planet heroes: full-disc, true-colour, planets only (EP2, EP3)

Read-only brief, written at HEAD `280101627fe` on `tech-debt/0.9.9`. Method: reading files from the repo root, one read-only node script over `static/data/image-provenance.json`, `planet-galleries.json` and `planets-hero-overrides.json` (written with the Write tool into the session scratchpad; output quoted in §2.2), and **looking at the 14 existing 1x1 thumbnails** of the nine heroes plus Mars slots 03/04/05 and Venus 04 (`static/images/planets/<id>/NN.1x1.jpg`, read with the image reader: no browser, no download, no new file). Nothing was built, run in a browser or measured. No code and no image was changed. The rule of the operator (BACKFILL B-033, 2026-11-08: "Hero images on the explore pages, above all the planets, must stay visually consistent with each other"; the operator note says: never change one without a side-by-side and a yes) is honoured: this brief proposes, the operator decides after a contact sheet (§3, §10).

## 0. Answer first

1. **Eight of the nine planet panels already open on a full-disc planet picture; Mars does not.** Heroes at HEAD (the gallery's first slot after the override): Mercury 01 (MESSENGER colour), Venus 01 (Mariner 10), Earth **05** (NASA "Earth Eastern Hemisphere", override of 2026-11-08), Mars **03** (Hubble, 13 December 1990, override of 2026-09-12), Jupiter 01 (Hubble, with Europa), Saturn 01 (Hubble), Uranus 01 (Voyager 2), Neptune 01 (Voyager 2, "enhanced colour"), Pluto 01 (New Horizons true colour). Looking at the thumbnails: Mars 03 is the 1990 Hubble frame, noisy, low contrast and orange-brown, which is the operator's "blurry and not even red" (EP2); **Mars slot 04 ("Mars, image taken by NASA's Hubble Space Telescope, July 2018", 1600×1600) is a sharp, red, full disc with the polar cap and is already in the gallery and in `image-approved.json`** (`:5314-5315`): the fix for Mars is a one-line override edit (`planets-hero-overrides.json`, slot `03.jpg` to `04.jpg`) plus a card rebuild, **no new image**.
2. **EP3 (no artist concepts, no mission images) is already true of the hero slot for all nine planets**, because the Earth override moved the Apollo–Soyuz picture (slot 04) out of first place on 2026-11-08. The two examples the operator named are still in the **Gallery tab**: Earth 04 "American Apollo spacecraft as seen from Soviet Soyuz spacecraft in orbit" and Venus 03 "Magellan Orbit Artist Concept" (`PlanetPanel.svelte:54, :363` renders `gallery.slice(1)` in the tab). Whether "heroes" meant the hero slot only or every picture in the panel is Decision 3. Two more slots are borderline by title (Venus 02 "Maat Mons", a radar-derived rendered view; Earth 01 "Earthrise: a new visualization").
3. **Found while checking "full disc": the panel hero is a 16:9 cover crop** (`.panel-hero-btn img { aspect-ratio: 16/9; object-fit: cover }`, `src/lib/styles/panel-tabs.css:101-107`; `PlanetPanel.svelte:187-196` uses it) at the 400 px panel width (`IMAGE_SIZES.panel`, `image-sizes.ts:14`): 400 × 225 px. A square picture of a disc that fills the frame loses 44 % of its height: only the centre 56 % band shows. By eye from the 1x1 thumbnails the disc occupies about 52 % of the height in Mars 04 (fits), but about 80 to 95 % in Mercury, Venus, Earth, Uranus, Neptune, Pluto (their poles are cut). So **"full-disc heroes" is not achievable by choosing pictures alone for six planets: it needs a different hero frame for planets (Decision 1)**. This is the real fork of C10.
4. **No new image is downloaded or proposed to be downloaded in this step.** Candidates for a replacement hero, if the operator wants one, are in §4.3 as search plans against the sources the image runbook accepts (agency archives first, Commons last), none fetched.
5. **Cost:** data edit (1 to 3 JSON rows) + `npm run build-cards` + hero-crop sheet review; if a gallery slot moves out, the repo's own scripts run the 14-locale alt-text, provenance and manifest updates; no translation call, no paid run.
6. **Needs the operator before code:** 5 forks in §12 (hero frame, Mars source, EP3 scope, the "true-colour" wording for Neptune and Uranus, and whether the rule is written into the data), and the side-by-side sheet before any change lands.

## 1. Point list (operator text from `docs/wip/2026-11-11-ux-feedback-plan.md` lines 164–165; slice row 358)

| ID | Text | State at HEAD |
|---|---|---|
| EP2 | "Jupiter, Saturn, Uranus, Neptune heroes match the 3D render; achieve the same for every planet. Mars hero is blurry and not representative (not even red)." | The four named heroes are the model (§2.2). Mars hero = slot 03 (override 2026-09-12). Earth hero already moved to a full-disc picture 2026-11-08. |
| EP3 | "Explore heroes: pure planets only — no artist concepts or mission images (e.g. 'Magellan Orbit Artist Concept' on Venus, 'American Apollo spacecraft as seen from Soviet Soyuz' on Earth)." | Neither is the hero slot now (Venus 01, Earth 05); both sit in the Gallery tab (Venus slot 03, Earth slot 04). |

Done when (plan row 358): "shots of all 9 planet panels next to the 3D body".

## 2. Current state (file:line at `280101627fe`)

### 2.1 How a planet hero is chosen and drawn

- Gallery: `getPlanetGallery(id)` (`src/lib/data/galleries.ts:161-168`) lists `static/images/planets/<id>/NN.webp` from the count manifest `static/data/planet-galleries.json` (earth, jupiter, mars, mercury, neptune, saturn, uranus, venus: 5 each; pluto 2), then `applyHeroOverride('planets', id, gallery)` moves the override slot to the front (`src/lib/image-hero.ts:166-184`); the hero is `gallery[0]`, the Gallery tab shows `gallery.slice(1)` (`PlanetPanel.svelte:54`).
- Overrides: `static/data/planets-hero-overrides.json` has two entries: `mars` slot `03.jpg` ("manual hero override — Marko 2026-09-12 (no-panorama hero rule, card/hero pass)") and `earth` slot `05.jpg` ("manual hero override — Marko 2026-11-08 (full-disc planet heroes, consistent with the set)"). Neither carries a `position` (crop), so every planet hero is centred.
- Draw: `PanelHeroImage` → `.panel-hero-btn img { width: 100%; aspect-ratio: 16 / 9; object-fit: cover }` (`panel-tabs.css:84-107`), `object-position` from `heroPositionFor` when an override carries `position` (`PanelHeroImage.svelte:45`); sizes `IMAGE_SIZES.panel = '(max-width: 768px) 100vw, 400px'`.
- The same file also feeds the collectible card cover (`pickHero('planets', id)`, `galleries.ts:165` comment; `src/routes/cards/[kind]/[id]/+page.svelte:98`), whose hero band is about 1.6–2.6:1 with its lower half faded under the title (`IMAGE-PIPELINE.md` "Hero crop positions"), and the `/explore/<id>` entity page (not read: NV4).
- Image ladder per slot: `NN.webp` + `NN-320/640/1280.webp` rungs where the source is large + `NN.1x1.jpg` (the focal-point thumbnail; the one I looked at).

### 2.2 The nine heroes (provenance from `image-provenance.json`, size from `file`, appearance from the 1x1 thumbnail)

| Planet | Hero slot | Provenance title · author · licence | Source px | Appearance |
|---|---|---|---|---|
| Mercury | 01 | Commons "Mercury in color - Prockter07 centered.jpg" · NASA/JHU APL/CIW · PD-NASA | 1600×1587 | MESSENGER enhanced-colour disc, grey-brown, rays visible; full disc, dark corner |
| Venus | 01 | Commons "Venus from Mariner 10.jpg" · NASA/JPL-Caltech · PD-NASA | 1000×1000 | Cream-white cloud disc (the reprocessed Mariner 10 colour view); full disc |
| Earth | **05** (override) | Commons "Earth Eastern Hemisphere.jpg" · NASA · PD-NASA | 1600×1600 | Blue Marble-style Eastern hemisphere, near-full-frame disc |
| Mars | **03** (override) | Commons "Mars from Hubble (Dec. 13, 1990).jpg" · NASA/ESA/STScI · PD-NASA | 1600×1073 | Orange-brown, noisy, soft: the 1990 WFPC frame |
| Jupiter | 01 | Commons "Hubble View of Jupiter and Europa.jpg" · NASA, ESA, A. Simon (GSFC) · CC-BY-4.0 | 1600×1323 | Sharp full disc, Great Red Spot, Europa at left |
| Saturn | 01 | Commons "Saturn and Its Rings.jpg" · NASA Hubble · CC-BY-2.0 | 1433×882 | Full planet and rings, landscape source |
| Uranus | 01 | NASA images-api "Uranus as seen by NASA Voyager 2" · NASA · PD-NASA | 1280×1280 | Pale cyan-green disc, featureless, full |
| Neptune | 01 | Commons "Neptune enhanced colour.jpg" · NASA/JPL (uploaded by nagualdesign) · PD-NASA | 1280×1278 | Deep blue disc with the Great Dark Spot; title says **enhanced** colour |
| Pluto | 01 | Commons "Nh-pluto-in-true-color_2x_JPEG.jpg" · NASA/JHU APL/SwRI · PD-NASA | 1600×1600 | True-colour full disc with the heart |

Source order check (`IMAGE-PIPELINE.md` §Source-resolution order): Uranus came through NASA images-api (Tier 1); the other eight heroes are Commons mirrors of NASA/ESA originals (Tier 3, "failover"). Not changed by C10 unless Decision 2(b).

### 2.3 The rest of the galleries (titles only; I looked at Mars 03, 04, 05 and Venus 04 only)

- **Earth** 01 NASA Hangout "'Earthrise' A New Visualization" (640×360); 02 Apollo 13 transearth photograph (1280×1280); 03 "Blue Marble Eastern Hemisphere" (1600×1600); **04 "American Apollo spacecraft as seen from Soviet Soyuz spacecraft in orbit" (1274×1280)**; 05 hero.
- **Venus** 01 hero; 02 "Maat Mons on Venus" (3072×2458, a Magellan radar-derived rendered perspective); **03 "Magellan Orbit Artist Concept" (818×615)**; 04 Akatsuki, Kevin M. Gill, CC-BY-2.0, 1024×1024 (UV-composite colour: orange and blue, **not** true colour); 05 "Venus - Mead Crater" (3072×2688).
- **Mars** 01 Olympus Mons colour mosaic; 02 "MarsSunset.jpg" (a Pathfinder/Spirit sunset, a surface view); 03 hero today; **04 Hubble July 2018, sharp, red, full disc**; 05 "Hubble's Sharpest View of Mars - ACS Image" (monochrome, 1151×795).
- Mercury 02/03 (MESSENGER horizon and "from nearly two million miles"), 04 Caloris, 05 MESSENGER mosaic; Jupiter 02–05 Hubble and a Juno search result; Neptune 02 (a 1600×629 Voyager frame, "neptune voyager 2" search result), 03 false-colour haze, 04 "Crescents of Neptune and Triton", 05 clouds; Saturn 02–05 Cassini and Hubble ring images; Uranus 02–03 Voyager "search result" frames, 04 PIA01391, 05 "Alien aurorae on Uranus" (Hubble, a UV composite of the aurora); Pluto 02 New Horizons.

### 2.4 Tooling the repo already has for this (`scripts/IMAGE-PIPELINE.md`)

`scripts/vision/hero-crop-sheet.mjs --surface planets` (contact sheet of every hero as the panel and the card crop it; `--try "planets/mars=50% 50%"` previews a position); `scripts/move-image-to-gallery.ts` (a slot to another gallery's next free number, 1x1 + provenance + alt text follow); `scripts/drop-gallery-slots.mjs` (remove and renumber; hero overrides renumber, a dropped hero's override is removed); `scripts/replace-gallery-slots.ts` (a better picture in a slot, 14-locale alt text, pHash, credit thumb); `scripts/image-find-source.mjs` (find the true origin of a picture by dHash); `validate-image-integrity`; `npm run build-cards` after a hero change. `scripts/validate-hero-coverage.ts` only requires that `01.jpg` exist per entity: it does not know about overrides or kinds of picture.

## 3. Screenshot list (to take before the build and again after; no browser was used for this brief)

The "side-by-side" the operator's rule requires, as one contact sheet plus individual shots. Desktop 1440×900 (`desktop-chromium`), phone 390×844 (`mobile-chromium`), landscape 844×390 (`mobile-landscape-chromium`):
1. **Sheet A, the nine panels now:** `/explore?id=<planet>` for mercury … pluto, the panel's hero region at 400 px, next to a screenshot of the same planet's 3D body focused at the default distance (UXD-019 focus), with the planet's name. 9 pairs.
2. **Sheet B, the Mars options** side by side at the panel's real frame: slot 03 (today), slot 04 (Hubble 2018), and (if Decision 2(b)) any searched candidate; each in the current 16:9 cover frame and in the proposed planet frame (Decision 1).
3. **Sheet C, the proposed frame for all nine** (Decision 1(b)): contain-on-black full disc, and the cover crop with a reviewed `position` for comparison.
4. The Gallery tab of Earth, Venus, Mars before/after the EP3 relocation (Decision 3), at 400 px and phone width.
5. The collectible cards of Mars and Earth (cards `/cards/planet/mars`) before/after (the card shares the hero), and the `/explore/mars` entity page hero.
6. Landscape 844×390 and phone: the panel hero at 100 vw width, the new frame's height.

## 4. Proposal per feedback item

### 4.1 EP2 — one rule for the nine heroes, Mars fixed

**The rule** (to be recorded in the UXD and in AGENTS.md next to the hero rules, where B-033 is "not yet in AGENTS.md"): a planet panel's hero is a **single picture of the whole disc of that planet, in natural or published true colour, by the spacecraft or telescope that made it, no spacecraft, artwork, map, inset or diagram in frame**; one slot per planet is named in `planets-hero-overrides.json` (all nine get an explicit entry, the seven that are slot 01 today included, so the rule is data not accident), with a `disc: true` attestation field and, where the frame needs one, a `position`.
**Mars:** override `slot` `03.jpg` → `04.jpg` (Decision 2(a)); `npm run build-cards`; the card cover changes with it (the card's hero band crops a square disc to a wide strip: look at it in sheet §3.5).
**The other eight:** keep, subject to Decision 4 (Neptune and Uranus wording) and the frame decision below; Mercury, Venus, Jupiter, Saturn, Pluto stay; Jupiter's Europa is a satellite in frame, not a spacecraft or artwork: accepted by the rule as written (the operator names Jupiter as already matching the 3D render).
**The frame (Decision 1):** the cover crop in 16:9 cuts a full disc. Options: (a) keep the 16:9 cover frame and pick only pictures whose disc fits the central 56 % band (today only Mars 04; that would need six re-sourced pictures: not recommended); (b) **a planet-only hero frame: the whole picture shown (`object-fit: contain`) on the panel's near-black ground, same 16:9 box, so every planet's complete disc is visible and the nine are consistent**; the disc is then about 225 px across (the box height), centred in a 400 × 225 frame, with black either side (the pictures are on black space already: the seam is invisible; the image's own corners could differ, NV3); (c) a taller 1:1 or 4:3 frame for planets (disc 300–400 px, but 75–175 px more height before the tabs, against UXD-018's overview-above-the-fold intent). Recommend (b).

### 4.2 EP3 — keep non-planet pictures out of the planet panel

By the rule above, three clear exits and two borderline ones, listed by title (not all viewed):

| Slot | Why it fails the rule | Where it belongs |
|---|---|---|
| Earth 04 "American Apollo spacecraft as seen from Soviet Soyuz…" | spacecraft in frame; a mission picture | `missions/apollo-soyuz` (gallery exists; `move-image-to-gallery.ts` appends it as the next slot) |
| Venus 03 "Magellan Orbit Artist Concept" | artist concept | `missions/magellan` (exists) or `fleet-galleries/magellan` |
| Earth 02 Apollo 13 transearth photograph | a photograph **of** Earth from a mission, no spacecraft in frame: passes the rule | stays |
| Venus 02 "Maat Mons on Venus" | a rendered perspective from Magellan radar, not a photograph of the planet | borderline: stays or `missions/magellan` |
| Earth 01 "'Earthrise' A New Visualization" | NASA visualisation (a rendering from LRO data) | borderline: stays or `missions/lro` |

Mechanism: `move-image-to-gallery.ts planets/earth/04=missions/apollo-soyuz/NN` then `rebuild-gallery-manifests.ts`, `build-i18n-bundles.mjs`, `build-offline-manifest.mjs`, `npm run validate-image-integrity`; gallery counts drop 5 → 4 for Earth and Venus; overrides renumber automatically. Dry run first (Decision 5).

### 4.3 If the operator wants a better Mars (or any planet) than what the gallery holds

Not recommended for Mars (slot 04 meets the rule), listed so the fork is real. The runbook's order (`IMAGE-PIPELINE.md` §Source-resolution order): Tier 1 NASA images-api and the JPL Photojournal (a spacecraft global-colour Mars; a Hubble OPAL Mars), ESA (Hubble and Mars Express galleries), Tier 2 USGS Astrogeology (global colour mosaics), Commons last. Search with `scripts/image-find-source.mjs --q "Mars global colour" …` and `scripts/fetch-batch-2-mission-images.mjs`'s `resolveSources()` shape; dedup by the pHash gate; license rows by the TASL rule. **Nothing was searched or fetched here**; no candidate id is named because I did not verify any exists.

### 4.4 Heroes and the 3D bodies (the "next to the 3D body" check)

The 3D bodies use `2k_<planet>.jpg` textures (`explore-scene.ts`: `2k_mercury.jpg`, `2k_venus_atmosphere.jpg`, `2k_earth_daymap.jpg`, `2k_mars.jpg`, `2k_jupiter.jpg` …; Solar System Scope textures credited on `/credits`). "Matches the 3D render" is a **colour and character** match, not a pixel match; the sheet §3.1 is the check. The brief does not propose generating a hero from the texture (a render is not a picture of the planet; the operator's EP3 says "pure planets only").

## 5. Cascade (earlier slices and what they change here)

| Earlier slice | Effect on C10 |
|---|---|
| B1 (UXD-018) | The hero has no hover glow, 16:9, inset focus ring; a planet-only `contain` frame is an exception to "16:9 cover" in DS §5.3 item 2: state it there. |
| B3 (UXD-023) | Star/outer panels: "one hero or none, 16:9 cover, a part-of photo captions what is pictured": a planet frame that differs from the star frame must be called out, or the planet rule becomes the shared rule (the two are visually adjacent on the INDEX/level jumps). **Fold in or leave:** I recommend planets only (the star "hero" is often a portrait or a photo of a part), Decision 1 asks. |
| A1/A2 (type, shell) | None. |
| C1 (UXD-019) | `?id=<planet>` opens the panel focused: the §3.1 sheet uses it. |
| C2 (UXD-020) | Not concerned. |
| C6 | The INDEX has no pictures. |
| C8 (level card) | The card has no hero. |
| C9 | The "Go to Mars" chip sits above the hero (action row): changes the hero's vertical position by one row; no interaction. |
| D3 (Venus galleries, Worlds) | D3 gives Venus surface-site galleries from missions; the planet gallery is separate. |
| H / deep-text stream | None. |
| Operator note `explore-heroes-consistent` (B-033) | Constraint: no hero changes without the side-by-side and a yes (§3, §10). |

Plan idea now outdated: "full-disc true-colour heroes for every planet (Mars first)": eight are in place; Mars is a one-row edit; the open work is the frame and the gallery clean-up.

## 6. i18n impact (14 locales, glossary first)

- **No new UI text** for Decisions 1, 2(a), 4. The panel has no hero caption for planets (the lightbox uses the credit line; alt text is per slot).
- Alt text: the `image-alt-text` rows exist per slot in 14 locales (`drop-gallery-slots.mjs` renumbers them; `move-image-to-gallery.ts` carries the slot's own). A replacement picture (Decision 2(b)) would get alt text in 14 locales through `replace-gallery-slots.ts` (hand-written English recorded as the translation source: no paid run, per `no-paid-translation-runs`).
- The word "true colour" is not used in the UI. If the operator wants the hero credit line to say "enhanced colour" for Neptune (Decision 4), the credit line is composed from the provenance row (`author`/`title`) and has no locale text of its own (not read: NV5).

## 7. Data changes

1. `static/data/planets-hero-overrides.json`: `mars.slot` `03.jpg` → `04.jpg`, new `reason`/`approved_at` (the date of the operator's yes); optionally one explicit entry per other planet (`slot: "01.jpg"`, `disc: true`) so the rule is data (the schema of the file: `source_audit`, `overrides`; a new field must be accepted by the loader `loadHeroOverrides`, `image-hero.ts`, not read: NV6).
2. If Decision 3(a): `planet-galleries.json` counts (earth 5→4, venus 5→4), `mission-galleries.json` counts (`apollo-soyuz`, `magellan` +1), and every file the scripts rewrite (provenance, ladder, phash, approved, alt text, credit thumbs, offline manifest): the scripts do it; check `git diff --numstat` of each regenerated data file before staging (AGENTS.md "Never run a whole-file regenerator", `+80 / −64858` is a stop sign).
3. `static/images/cards/` (card covers) regenerated by `npm run build-cards` for Mars (and any other changed hero).
4. No change to `src/` for Decisions 1(a)/2(a); a planet-only frame (1(b)) is one CSS class on `PlanetPanel`'s `PanelHeroImage` (`heroClass` prop exists: `PanelHeroImage.svelte:25`) in `panel-tabs.css` or the component, plus the same for the entity page if it shares the frame.

## 8. Tests to add or change

**Unit (vitest) / data checks:**
- A data test (new, next to `data-overlays.test.ts`): every planet in `planet-galleries.json` has an override entry (if the explicit-entry choice is taken) whose `slot` exists on disk and in the manifest; `disc: true`; the slot's provenance title does not match `/artist|concept|illustration|visuali[sz]ation|spacecraft|orbiter|lander|rover/i` (a guard, not a classifier: false positives go on an allow-list with a reason, as `phash-baseline-allowlist.json` does).
- `image-hero.test.ts` (exists? not checked): `applyHeroOverride('planets','mars',…)` puts slot 04 first.
- `validate-image-integrity` (existing umbrella) stays green after any move/drop (`npm run validate-image-integrity`).
**E2E (`desktop-chromium`, `mobile-chromium`, `mobile-landscape-chromium`):**
1. New `planet-heroes.spec.ts`: for each of the nine planets, `/explore?id=<id>` opens the panel; the hero `img` `src` ends in the expected slot (`mars` → `04`), `naturalWidth >= 1000`; with Decision 1(b) the image's rendered box shows the whole picture (`object-fit: contain` computed style, rendered image box ≤ container); the Gallery tab does not list Earth 04 / Venus 03 after Decision 3(a); the card `/cards/planet/mars` hero src equals the panel's.
2. `panel-shell.spec.ts` (hero and header geometry): unchanged for non-planet panels; add the planet frame height to its geometry assertions if Decision 1(b)/(c).
3. `explore-deeplinks.spec.ts`, `select-focus.spec.ts` unchanged.
4. Visual: `hero-crop-sheet.mjs` output reviewed by the operator, not an automated pixel diff (the repo's visual baselines were not searched for planet panels: NV7).

## 9. Docs to update by name

- **UXD-028** (new, `docs/uxs/decisions/UXD-028-planet-heroes-full-disc-planets-only.md`; 024 is the last used at HEAD, 025 to 027 are proposed by the C7, C8, C9 briefs): the rule, the frame, the EP3 relocation, Mars; links BACKFILL B-033; row in `docs/uxs/decisions/README.md`; B-033's "not yet in AGENTS.md" column updated.
- `docs/concept/05_Design_System.md` §5.3 item 2 (planet hero frame), §5.11 (gallery grid: "planets: only whole-disc pictures in the hero, mission pictures live in the mission galleries"), §8.4 texture sources is unaffected.
- `docs/uxs/UXS-001.md` (planet panel hero), `docs/uxs/IA.md` §controls/§surfaces if the frame is stated, `docs/uxs/CHANGE-INVENTORY.md` row C10 (line 51: "none yet (see BACKFILL B-033)" → UXD-028, status).
- `AGENTS.md` (Image pipeline gotchas, near the "One image library per place" paragraph at line 466: the planet hero rule in one sentence, per BACKFILL "not yet in AGENTS.md"), `scripts/IMAGE-PIPELINE.md` ("Hero crop positions": the planets rule and `disc` attestation), `scripts/README.md` if a check is added.
- READMEs: `src/lib/components/README.md` (`PlanetPanel`, `PanelHeroImage` frame), `src/lib/data/README.md` if it exists (not checked).
- `docs/uxs/UXS-016.md`/`UXD-023`: one sentence that star/outer panels keep the 16:9 cover, if Decision 1(b) is planets-only.

## 10. Phased plan

1. **Sheets first (no repo change):** `hero-crop-sheet.mjs --surface planets` and the §3.1–3.3 side-by-sides; the operator picks the frame (Decision 1) and Mars (Decision 2). Per B-033 nothing lands before this yes.
2. **C10a Mars + data:** override edit (and explicit entries for the other eight if wanted), `npm run build-cards`, the data test; screenshots §3.5.
3. **C10b frame** (if 1(b)/(c)): the class and its CSS, `panel-shell.spec.ts` geometry, e2e §8-1.
4. **C10c EP3 relocation** (if Decision 3(a)): dry runs of the move scripts, the operator reads the plan, apply, the manifest/bundle/offline rebuild, `npm run validate-image-integrity`, `git diff --numstat` of every touched data file.
5. Docs, UXD-028, `npm run validate-data`, `npm run preflight` once before a push; `npm run preflight:coverage` only if a `src/lib` function is added.

## 11. Acceptance checks

- All nine planet panels open on a single whole-disc picture; Mars's is the sharp red one (slot 04); a reviewer holding the sheet sees no spacecraft, artwork or map in any hero.
- The hero frame shows the complete disc for all nine at 400 px and at phone width (if 1(b)/(c)); the nine look like one set next to their 3D bodies (sheet §3.1 approved by the operator).
- Earth 04 and Venus 03 are no longer in the planet galleries (if 3(a)), and the mission galleries hold them with provenance, alt text in 14 locales and a pHash row; `validate-image-integrity` green.
- Cards of Mars (and any changed planet) rebuilt; the card cover is the same picture as the panel hero.
- Docs of §9 updated; the inventory row C10 states what was built and what was not run in a browser.

## 12. Decisions for the operator (recommendation first)

1. **The hero frame for planets.** **(a) A planet-only frame: the whole picture on the panel's black ground (16:9 box, `contain`), so every disc is complete** (recommended: a 16:9 cover crop cuts the poles of six of nine planets, and "full-disc" cannot be met by picture choice alone; the nine stay consistent with each other); (b) keep 16:9 cover and accept the crop (only Mars 04 fits fully; for the rest the disc is cut at top and bottom; each hero gets a reviewed `position`); (c) a taller 1:1 hero for planets (whole disc, about 400 px, 175 px more height than today).
2. **The Mars hero.** **(a) Slot 04, Hubble July 2018 (already in the gallery and approved; one JSON edit and a card rebuild)** (recommended); (b) search a spacecraft global-colour disc through the runbook sources (new image, new provenance, 14-locale alt text, the sheet decides); (c) keep slot 03.
3. **How far EP3 goes.** **(a) The hero slot and the Gallery tab: move the two named pictures (Earth 04 Apollo–Soyuz, Venus 03 Magellan artist concept) to their mission galleries; the two borderline slots (Venus 02 Maat Mons, Earth 01 Earthrise visualisation) stay unless you say otherwise** (recommended: the operator's two examples are in the Gallery tab, not the hero slot); (b) the hero slot only (already true for all nine; nothing is moved); (c) also move the two borderline slots and audit every other slot by eye, case by case (a longer content pass, about nine more slots to look at).
4. **"True colour" for Neptune and Uranus.** **(a) Keep both Voyager 2 pictures; their provenance says "enhanced colour" for Neptune and is a published natural-colour version for Uranus; the credit line states the source** (recommended: these are the pictures the operator already called matching the 3D render); (b) look for a different Neptune hero (the gallery's Neptune 03 is a false-colour haze image, 02/04/05 are not whole-disc: nothing in the gallery qualifies, so this means new sourcing); (c) drop the words "true colour" from the rule and say "natural or published colour".
5. **Whether to write the rule into the data.** **(a) An explicit override row for all nine planets with `disc: true`, so a later gallery edit cannot silently change a hero** (recommended); (b) only the Mars edit; the rest remains "slot 01 by default".

## 13. NOT VERIFIED

- NV1 No browser, build or test was run. The 400 × 225 px frame, the 56 % crop band and the "disc fills 80–95 % of the height" figures are CSS and image arithmetic; the disc proportions were estimated by eye from the 512 px 1x1 thumbnails (a focal-point crop that can differ from the served `NN.webp`), not measured on the served files.
- NV2 I viewed 14 thumbnails (nine heroes, Mars 03/04/05, Venus 01 and 04). I did **not** view any other gallery slot; every statement about Earth 01/04, Venus 02/03/05 and the Mercury, Jupiter, Saturn, Uranus, Neptune non-hero slots is from the provenance title only.
- NV3 Whether the picture edges of the heroes (corner vignettes, a gradient, a coloured border) blend with the panel's near-black under `contain` was not checked; a rectangular seam would defeat Decision 1(a).
- NV4 The `/explore/<id>` entity page hero (`routes/explore/[id]`) and the `cards` hero band were located, not read: whether they share the panel's frame and `position` is unknown.
- NV5 The credit line composition (lightbox, `ImageCredit`) and whether it prints "enhanced colour" were not read.
- NV6 `loadHeroOverrides`' accepted fields (for a new `disc` key) and `validate-hero-coverage.ts` (281 lines, read for its header only) were not read; whether a new key fails a schema is unknown.
- NV7 Visual-regression baselines (`visual.spec.ts`) were not searched for planet panels; the cards manifest `static/images/cards/cards-manifest.json` was not opened.
- NV8 `masters/` are LFS: the `move-image-to-gallery.ts` and `replace-gallery-slots.ts` runs need `git lfs pull -I 'masters/**'` for the affected slots; whether the masters of planets/earth/04 and planets/venus/03 are present in this worktree was not checked.
- NV9 Image licences: Jupiter (CC-BY-4.0) and Saturn (CC-BY-2.0) and the Venus 04 Akatsuki (CC-BY-2.0) rows carry an attribution duty already met by the credits pipeline; I did not re-verify the rows on Commons (no network use in this step).
- NV10 Whether any sourcing candidate for a non-Mars planet exists that meets the rule better than today's hero was not searched (the brief does not claim one does).
