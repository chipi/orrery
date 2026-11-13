# UXD-025 — Lists carry a round photo of the row's own thing, from one component and one resolver

- **Status**: accepted (T1 built: the component, the resolver, the manifest, the regime panel and its founding missions; T2 built: the solar-system and the Worlds' INDEXes; T3a built: the station lists and the belt members; T4 built: the fleet panel and the entity pages; T3b, the PATHS legend, is decided and not built)
- **Date**: 2026-11-13 (proposed and decided)
- **Decider**: the operator, 2026-11-13 — all 8 recommendations of `docs/wip/2026-11-13-L45-thumbnail-scan-brief.md` §13 approved (option a each); slices T1 to T4 approved, built in that order
- **Answers**: L45 of the UX feedback plan
- **Builds on**: [UXD-024](UXD-024-orbit-ruler-one-row-draws-its-regime.md) (the 28 px resident photo this generalises), [UXD-001](UXD-001-ui-accent-blue-replaces-teal.md) (no teal or cyan ring), [UXD-017](UXD-017-one-index-on-every-scale.md) (the INDEX rows T2 puts a photo in)
- **Changes**: `src/lib/components/EntityThumb.svelte`, `src/lib/entity-thumb.ts` (new, each with its test), `RegimePanel.svelte`, `surface-map/nation-palette.ts` (`agencyRingColor`), `scripts/build-entity-thumbs.ts` (new), `scripts/vision/build-credit-thumbs.mjs` (`--paths`), `scripts/validate-data.ts`, `static/data/entity-thumbs.json` (new; T2 adds `sites`), T2: `ScaleIndex.svelte`, `SurfaceIndexPanel.svelte`, `index-panel.css`, `surface-map/surface-index.ts` (`IndexItem.thumb`), `data/gallery-ids.ts` (extracted from `galleries.ts`), `static/data/orbit-regime-thumbs.json`, 352 files in `static/credit-thumbs/images/`, 22 `1x1.jpg` crops in `static/images/`, T3a and T4: `StationRoute.svelte`, `BeltPanel.svelte`, `FleetEntryPanel.svelte`, `SiteEntityPage.svelte`, `entity-page.css`, `surface-scene/MuseumPanel.svelte`, `routes/fleet/[id]/` and `routes/programs/[id]/` pages, `entity-thumb.ts` (`beltMemberThumb`), `data/site-entity.ts` (hardware `agency`), no data file; [UXS-014](../UXS-014.md), Design System §5.16, `docs/adr/TA.md`, `docs/accessibility.md`, the component and scripts READMEs

## Context

C4 put a 28 px round photo with an agency-colour ring before each resident of a regime panel and the operator
called it good: the grey 8 px dots of other lists are what reads as boring. The scan (the brief, §4) found six
lists worth the same photo, four that look good in the data and bad on screen, and a defect in C4's own map:
`orbit-regime-thumbs.json` always pointed at `01.1x1.jpg`, and for 12 of its 49 residents the hero review had
blessed another slot (repaired in `1e405882d2f`). The thumb was inline markup in one file, keyed by a hand-kept
map, loading the 512 px crop (30 to 56 KB) where the pipeline already has a 192 px WebP (3 to 9 KB).

## Decision

1. **One component, `EntityThumb` (brief §6).** A 28 px round photo (`size`), `object-fit: cover`, a 2 px ring
   (`ring`), `alt=""` (the row's name is beside it), `loading="lazy"`, `decoding="async"`, explicit `width` and
   `height`. No text, no message key, not a `Chip`, never inside one. With no file, or when the file fails to load
   (`onerror`), it draws the C4 centred 8 px dot in the same slot, so labels line up and no broken-image icon
   shows; `fallback="none"` draws nothing.
2. **One resolver, `entity-thumb.ts` (decision 1, option a).** `thumbOf(surface, id)` returns the 192 px WebP of the
   entity's blessed hero slot, or null. The slot is the one `static/data/<surface>-hero-overrides.json` names, else
   `01` (what `entityHero()` does for the big hero), so a thumb is never a picture the hero review rejected. The
   source is `static/data/entity-thumbs.json`, written by `scripts/build-entity-thumbs.ts` from the hero overrides
   and the files on disk: per surface (`missions`, `fleet`, `planets`, `small-bodies`, `satellites`, `belts`,
   `earth-objects`, `moon-sites`, `mars-sites`, `iss-modules`, `tiangong-modules`, `sun`) the directory, the slot of
   each entity that has a thumb and the ids that have none; 13 KB, one import. `validate-data` fails when the file
   is stale, a listed file is missing, or a blessed slot has a 1x1 crop or a master and no thumb. A new gallery
   image, a replaced slot or a changed hero override therefore needs `build-entity-thumbs.ts` to be run again.
3. **The files (decisions 1 and 2, option a).** The 192 px thumbs of every blessed slot that had none (352 files,
   1.9 MB) come from the existing `build-credit-thumbs.mjs`, which gained `--paths F` for a list of `/images`
   paths, credited or not: a crop regenerated from a master has no provenance row, and the generator only walked
   provenance. The 22 blessed slots with no 1x1 crop yet (15 moons including the Moon, Chang'e 7 and 6 fleet
   entries: Lanyue, Long March 10, Mengzhou, Promise, Soyuz, Vostok-K) got one from the existing
   `regenerate-tier3-variants.mjs --slots`, offline, no API cost. No new source image, no change to
   `image-provenance.json`: a thumb is a derived file of an image already credited.
4. **Ring colour (decision 4, option a).** The row's own identity colour (agency, nation, planet, trajectory), the
   neutral `rgba(255,255,255,0.5)` where the row has none. A teal or cyan identity colour (hue 160 to 200 degrees:
   `#4ecdc4`, Uranus `#7de8e8`, New Zealand `#00A6A6`, Voyager 2's path) gets the neutral ring (`ringColor`); the
   fallback dot keeps the data colour. `agencyRingColor()` moved from `RegimePanel` to `nation-palette.ts`; it is
   the palette of `nationChipFor` keyed by the agency alone, and returns the colours the panel always had.
5. **The regime panel on it.** Residents use `EntityThumb`; `orbit-regime-thumbs.json` stays as the
   `<bundle>/<id>` to `<surface>/<id>` map (a resident id means different things per bundle) and no longer holds a
   path, so the file is always the blessed slot; its `NO_THUMB` decisions (15 residents keep the dot) are unchanged.
   The founding missions that link to a mission (23 of 38) show that mission's photo before the year, ring neutral
   (the row carries no agency); the other 15 keep the dot in the same slot, so years and labels line up. The
   `firsts` grid is `28px 52px 1fr`.
6. **Held (decision 3, option a).** The neighbourhood INDEX (54 of 209 rows with a photo) and the six outer-scale
   INDEXes (10 of 84) get no thumbs until a content pass raises coverage: a quarter of the rows with a photo reads
   as a mistake. `/fleet?view=list` (decision 7, option a) stays without thumbs: nothing links to it. Launch rows
   are not proposed (their images are other people's URLs).
7. **Built after T1, decided.** T2 the Worlds' INDEX and the solar-system INDEX, after C6 (decision 5, option a;
   see "T2" below). T3a the station module lists and the belt members, T4 the fleet panel's lists (the MISSIONS tab
   printed the raw mission id: fixed first) and the entity pages' Related and hardware lists (decision 6, option a;
   a patched program row keeps its patch), built after T2 (see "T3a" and "T4" below). **Still to build, decided.**
   T3b the PATHS legend (thumb with the path colour as ring, the swatch dot dropped; Voyager 2 neutral, decision 8,
   option a); its file, `paths-legend.ts`, is with the C7 work.

## T2 — the solar-system and the Worlds' INDEXes (built 2026-11-13, after C6)

1. **Solar-system INDEX** (`ScaleIndex.svelte`, the scale `solar-system` only): the lead slot of a row holds an
   `EntityThumb` where the manifest has a thumb (`solarRowThumb({ id, kind })` in `entity-thumb.ts`: the Sun,
   `planets`, `small-bodies` for dwarf, asteroid, comet, Kuiper object and interstellar, `satellites`, `belts`).
   40 of 51 rows: the Sun, 9 of 9 planets (Earth and Mars on their override slots), 12 of 23 small
   bodies, 16 of 16 moons (the 15 crops generated in T1), 2 of 2 belts. The 11 small bodies with no image at all
   (Psyche, Arrokoth, Didymos, Dimorphos, Donaldjohanson, Eurybates, Polymele, Leucus, Orus, Patroclus,
   Menoetius) keep the dot. Ring: the body's colour the page already gives the dot (the Sun and the planets);
   every other row's ring is neutral, as its dot is grey; Uranus (`#7de8e8`) is neutral (decision 4). The lead
   slot is 28 px on this scale (grid column and `.si-lead`, centring the dot of a row without a photo), so names
   start at one x with and without a photo; the two-line row is 44 px or more, as before.
2. **Worlds' INDEX** (`SurfaceIndexPanel.svelte`, `/moon /mars /venus /earth`): the lead slot (28 px, spanning
   both lines) holds the site's photo, ring `item.color` (the nation colour, `colorFor(site)`; an Earth object's
   own colour, so the ISS is neutral). 28 of 28 moon, 27 of 27 Mars, 3 of 3 Venus rows; `/earth` 73 of 73 (31
   objects, 42 launch pads). A site without a thumb keeps the C6 dot (nation colour, light ring), centred.
3. **Which file.** A site shows the picture of the folder its panel gallery resolves to, not of a folder named
   like it. The manifest gained `sites` (`moon`, `mars`, `venus`, `earth-objects`): per site id the
   `<dir>/<folder>/<slot>` of the thumb. `build-entity-thumbs.ts` runs the loaders' ladder (`getMoonSiteGallery`,
   `getMarsSiteGallery`, `getEarthObjectGallery`: own folder, mission by `mission_id`, mission by id, fleet id
   variants (`gallery-ids.ts`, extracted from `galleries.ts` so both use one list of variants); a venus site
   skips the own folder), and the slot is what `applyHeroOverride` makes first: the folder's own hero override
   (missions, fleet), then the site surface's. So Apollo 16 on `/moon` shows `missions/apollo16/06`. An Earth launch
   pad is the fleet's `launch-site` entry: `thumbOf('fleet', id)`. `validate-data` checks the `sites` paths on
   disk. The ladder differs from the brief's reading in three places, both found by reading the loaders: an Earth
   object falls back to the mission folder only (the panel never looks in the fleet folder), and the seven Moon-orbit objects the brief said reach an image only through the fleet folder (`lro`, `luna10`, `clementine`, `lunar-prospector`, `smart-1`, `change1`, `chandrayaan1`) have a mission folder; `/mars`
   reaches 27 of 27 (`mars2` and `mars6` resolve to their mission folders) where the brief counted 25.
4. **No new file.** Every thumb the two lists need was already on disk after T1 (`--missing` reports none for
   `sites`); no generator was run in T2.
5. **Lazy loading.** A closed INDEX is `hidden` (display none); Chromium fetches none of its lazy images (a
   Playwright request log: 0 thumb requests with the panel closed, 40 on `/explore` and 28 on `/moon` after
   opening). The e2e specs assert it. Firefox and WebKit were not run.
6. **Held, unchanged.** The neighbourhood and the six outer scales carry no thumb (decision 3); the e2e asserts no
   `img` in their panels.

## T3a — the station lists and the belt members (built 2026-11-13)

1. **Station lists** (`StationRoute.svelte`, `/iss` and `/tiangong`): every module and visiting-vehicle row leads
   with an `EntityThumb` (`thumbOf('iss-modules' | 'tiangong-modules', id)`; the visitors live in the same folders),
   in the list view and in the drawer copy, both through one `rowBody` snippet. 30 of 31 rows: `/iss` 24 of 25 (18
   modules and 7 visitors; Poisk has no image and keeps the dot), `/tiangong` 6 of 6. Ring: `agencyRingColor(agency)`,
   so Roscosmos, NASA, SpaceX, ESA, JAXA take their palette colour (a joint module its lead agency) and CSA and
   Northrop Grumman, which the palette does not know, the neutral. The `.module-row` button became a flex row (photo,
   then the name row and agency line in a `min-width: 0` block, so the agency badge and long names still wrap as before).
   The `sr-only` mirror list is unchanged text.
2. **Belt MEMBERS** (`BeltPanel.svelte`, optional in the brief, built because coverage reads fine): each member row
   leads with the photo of the body its string names (`beltMemberThumb`: the first word, a `small-bodies` id). 6 of 9
   rows (Ceres, Vesta, Pluto, Eris, Makemake, Haumea); Pallas, Hygiea and Quaoar keep the dot, so names line up. Ring
   neutral (a member row carries no agency).
3. **No file generated and no manifest surface added**: every thumb was on disk after T1 (`--missing` reports none).

## T4 — the fleet panel and the entity pages (built 2026-11-13)

1. **Bug fixed first.** The fleet panel's MISSIONS tab printed the raw mission id (`new-horizons`) where `/fleet/<id>`
   prints the mission's name. The tab now loads each linked mission with `getMission` in the page locale (the source
   `/fleet/<id>` uses, in the 14 overlays: no new string) and renders its rows once the names are in, so the id
   never flashes. It lists the entry's missions in data order. An entry with crew flights shows its flights, as before
   (patches and portraits, no photo). Guard: `fleet.spec.ts` "MISSIONS tab names its missions", written red first
   (`new-horizons →`).
2. **Fleet panel**: each MISSIONS row (311 linked rows over 122 entries, all with a thumb) and the "flies on" and
   "engines" lists (`thumbOf('fleet', id)`) lead with the photo, ring the agency (the mission index and the fleet
   index carry it).
3. **Entity pages (prerendered):** `/fleet/<id>` (missions, engines, used on, alongside, kin: 6 to 32 photos on each of the
   294 pages), the hardware list of a site page (`SiteEntityPage`; 14 `/mars` pages and 2 `/moon` pages have one, no
   `/venus` page), `/programs/<id>` (the hardware list; the mission rows with no patch, the patched rows keep the patch,
   decision 6) show the photo in the server HTML, `loading="lazy"`, `alt=""`, 28 × 28, `fallback="none"` (every linked
   row has a file; a list that is read, not scanned, shows nothing instead of a dot). Weight: 0.2 to 7 KB of `<img>`
   tags per page against 155 to 185 KB of HTML (the worst page is `/fleet/atlas-v`, 32 photos, 7.1 KB); measured on the
   dev server's HTML, not on a production build. Ring: the mission's or the entry's agency (the page data carries it);
   program rows carry none, so neutral. The assembly timeline of a program (modules) is not changed.
4. **`/earth` museum card** (`MuseumPanel`): each object row leads with the object's photo, 86 of 88 holdings (the
   2 `/science/history/<slug>` holdings keep the dot); ring neutral. The "You can see this in" block on an object's page
   (`MuseumsForObject`) lists museums, not objects, so it has no object photo to show and is unchanged.
5. **Held, unchanged.** `/fleet?view=list` (decision 7, option a) has no thumbs; the museum rows of `/fleet/<id>` (a
   museum is not in the manifest); the single mission row of a site page.
6. **No file generated**; the manifest was current.

## Consequences

The lists get lighter, not heavier: a regime panel's 4 to 9 photos are 192 px WebPs (3 to 9 KB each) instead of
512 px JPEGs. The repo grows by 2.5 MB of images (1.9 MB thumbs, 0.6 MB crops). A row whose entity has no
thumb shows the dot, which is what it showed before. The manifest is a second thing to rebuild after a gallery
change; `validate-data` says so. The ring of a row that carries no identity colour is neutral, which includes
the founding missions in every regime panel: giving them their agency's colour would need the mission's agency
in a row that only holds a `mission_id`.

Not covered: the PATHS legend (T3b); the held lists; (T3a and T4: Firefox and WebKit, a production build, a real device, the drawer copy of the station list in its own sheet, `de` and `ar` on every list: `de` was read on `/iss` and the fleet panel, `ar` on `/iss` and `/fleet/atlas-v`;) (T2: Firefox and WebKit, whether a production build behaves like the dev
server, a real device, the Worlds' index with the folded filters of the next slice;) right-to-left and the long-name locales (the T1 rows are flex and grid
without physical offsets and were screenshot only in English); a phone width under 390 px; whether the
dev-server panel behaves the same in a production build (a hidden panel not fetching its lazy images was not
tested).

## Verification

Unit: `entity-thumb.test.ts` (blessed slot, override honoured for LRO, Hope and Earth, a moon, flat Sun, null for
no thumb and for junk, every thumb on disk and on the override's slot, teal and cyan to the neutral),
`EntityThumb.test.ts` (markup contract, size, ring, dot, teal), `build-entity-thumbs.test.ts` (a fixture tree:
override, none, master-only, flat; and the committed manifest equals what the builder writes),
`orbit-regimes.data.test.ts` (every mapped resident resolves to a file on disk; the 12 repaired residents show
their blessed slot), `nation-palette.test.ts` (`agencyRingColor`). `validate-data` runs the manifest check. E2E:
`orbit-ruler.spec.ts` (desktop-chromium, against the dev server: every linked founding mission has a photo; a
blocked thumb file turns into the dot). Screenshots of `/mars` LMO and DMO, `/earth` LEO, `/explore` GIANTS and
BELT at 1440×900 and 390×844 were read.

T3a and T4: unit `entity-thumb.test.ts` (every ISS and Tiangong module and visitor but Poisk has a thumb on disk,
`beltMemberThumb` 6 of 9, every one of the 311 linked fleet missions, every fleet entry and 86 of 88 museum holdings has
a thumb on disk), `entity-loaders.test.ts` (site hardware carries `agency`). E2E: `fleet.spec.ts` (the MISSIONS tab names
its missions and leads each row with a photo; written red first), `iss.spec.ts` and `tiangong.spec.ts` (a photo on every
row, Poisk's dot, no teal ring), `select-focus.spec.ts` (belt members: 2 photos and 2 dots on the asteroid belt),
`museums.spec.ts` (the card's object photo), `entity-page-thumbs.spec.ts` (the photos in the server HTML of
`/fleet/atlas-v`, `/fleet/saturn-v`, `/fleet/f-1`, `/mars/curiosity`, `/programs/apollo`; lazy and decorative; none broken
once scrolled to; no sideways scroll at 390 px; a patched program row has no photo). Screenshots at 1440×900 and 390×844:
`/iss` and `/tiangong` list view (en, de, ar), both belt panels' MEMBERS, the fleet panel (`atlas-v` MISSIONS in en and de,
`apollo-csm-block-ii` CREW, `f-1`), `/fleet/atlas-v` (en, ar), `/fleet/saturn-v`, `/mars/curiosity`, `/programs/apollo`
and `/programs/artemis`, the `/earth` museum card.

T2: unit `entity-thumb.test.ts` (`resolveSiteThumb`, `solarRowThumb` per row kind, the real manifest: 40 solar rows,
the 11 without, every moon, mars, venus site, earth object and launch pad has a thumb on disk, Apollo 16 on slot 06),
`build-entity-thumbs.test.ts` (the site ladder on a fixture tree: own, `mission_id`, fleet variants, both overrides,
a missing thumb), `surface-index.test.ts` (`thumb` per body). E2E `scale-index.spec.ts` (photo attributes, ring
colours incl. Uranus neutral, dot for Psyche, names aligned, blocked file to the dot, closed INDEX fetches
nothing, no `img` on the other scales) and `surface-index.spec.ts` (photo on every moon row, ring of Apollo 11,
slot 06 for Apollo 16, blocked file to the dot, names aligned, closed INDEX fetches nothing). Screenshots at
1440×900, 390×844 and 844×390: `/explore` All and Moons (en, de, ar), `/moon` (en, de, ar), `/mars`, `/earth`,
`/venus`.
