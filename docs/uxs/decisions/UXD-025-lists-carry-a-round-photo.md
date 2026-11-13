# UXD-025 — Lists carry a round photo of the row's own thing, from one component and one resolver

- **Status**: accepted (T1 built: the component, the resolver, the manifest, the regime panel and its founding missions; T2 to T4 are decided and not built)
- **Date**: 2026-11-13 (proposed and decided)
- **Decider**: the operator, 2026-11-13 — all 8 recommendations of `docs/wip/2026-11-13-L45-thumbnail-scan-brief.md` §13 approved (option a each); slices T1 to T4 approved, built in that order
- **Answers**: L45 of the UX feedback plan
- **Builds on**: [UXD-024](UXD-024-orbit-ruler-one-row-draws-its-regime.md) (the 28 px resident photo this generalises), [UXD-001](UXD-001-ui-accent-blue-replaces-teal.md) (no teal or cyan ring), [UXD-017](UXD-017-one-index-on-every-scale.md) (the INDEX rows T2 puts a photo in)
- **Changes**: `src/lib/components/EntityThumb.svelte`, `src/lib/entity-thumb.ts` (new, each with its test), `RegimePanel.svelte`, `surface-map/nation-palette.ts` (`agencyRingColor`), `scripts/build-entity-thumbs.ts` (new), `scripts/vision/build-credit-thumbs.mjs` (`--paths`), `scripts/validate-data.ts`, `static/data/entity-thumbs.json` (new), `static/data/orbit-regime-thumbs.json`, 352 files in `static/credit-thumbs/images/`, 22 `1x1.jpg` crops in `static/images/`; [UXS-014](../UXS-014.md), Design System §5.16, `docs/adr/TA.md`, `docs/accessibility.md`, the component and scripts READMEs

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
7. **Still to build, decided.** T2 the Worlds' INDEX and the solar-system INDEX, after C6 (decision 5, option a);
   T3 the station module lists, the PATHS legend (thumb with the path colour as ring, the swatch dot dropped;
   Voyager 2 neutral, decision 8, option a) and optionally the belt members; T4 the fleet panel's lists (the
   MISSIONS tab prints the raw mission id: the name first) and the entity pages' Related and hardware lists
   (decision 6, option a; a patched program row keeps its patch).

## Consequences

The lists get lighter, not heavier: a regime panel's 4 to 9 photos are 192 px WebPs (3 to 9 KB each) instead of
512 px JPEGs. The repo grows by 2.5 MB of images (1.9 MB thumbs, 0.6 MB crops). A row whose entity has no
thumb shows the dot, which is what it showed before. The manifest is a second thing to rebuild after a gallery
change; `validate-data` says so. The ring of a row that carries no identity colour is neutral, which includes
the founding missions in every regime panel: giving them their agency's colour would need the mission's agency
in a row that only holds a `mission_id`.

Not covered: T2 to T4; the held lists; right-to-left and the long-name locales (the T1 rows are flex and grid
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
