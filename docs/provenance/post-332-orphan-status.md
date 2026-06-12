# Post-#332 orphan status (provenance backfill, 2026-06-12)

This document captures the state of `static/data/image-provenance.json` after
the #332 / #5 Phase 0/1/5 work, and what remains as work-to-do for full
manifest coverage.

## Disk vs manifest, by surface

After fixing the `buildFleetEntries` shape mismatch (252 fleet-image-sources
entries authored by the post-2026-06 `fetch-assets.ts` use a
`{commons_file, commons_url, credit, license}` shape that the build script
was crashing on), the manifest covers **4417 of 8609** files on disk:

| Surface           | On disk | In manifest | Orphan |
|-------------------|---------|-------------|--------|
| fleet-galleries   | 4344    | ~851        | ~3493  |
| missions          | 1637    | ~1100       | ~537   |
| iss-modules       | 576     | 576         | 0      |
| mars-sites        | 448     | 448         | 0      |
| moon-sites        | 308     | 308         | 0      |
| science           | 296     | 74          | 222    |
| earth-objects     | 204     | 204         | 0      |
| hotspots          | 184     | 19          | 165    |
| planets           | 160     | 160         | 0      |
| tiangong-modules  | 136     | 136         | 0      |
| recommendations   | 124     | 31          | 93     |
| small-bodies      | 104     | 104         | 0      |
| rockets           | 52      | 13          | 39     |
| sun               | 20      | 20          | 0      |
| satellites        | 16      | 0           | 16     |

## Root cause of the remaining orphans

The bulk (≈ 3600 of 4584 orphans) is **derivative variants** — the
`.16x9.jpg` / `.4x3.jpg` / `.1x1.jpg` files produced by the image
resizing step. `buildFleetEntries`, `buildMissionGalleryEntries`, and a
few others emit *one provenance row per logical slot* rather than one
row per file on disk. The variant files inherit their license + author
from the base, but they aren't enumerated in the manifest.

Two fixes are possible and both should be discussed with Marko before
landing:

1. **Inherit-on-walk**: after writing an entry for `<id>/01.jpg`, also
   write entries for `<id>/01.16x9.jpg`, `<id>/01.4x3.jpg`, and
   `<id>/01.1x1.jpg` with `modifications: [...base, 'resampled-16x9']`
   etc. Pure manifest expansion; no fetch-assets changes.

2. **Treat variants as out-of-scope**: amend the doc + the validate-data
   gate to assert "every base file (`<id>/<NN>.<ext>`) has a manifest
   entry" and stop trying to track variants. Simpler, and arguably
   correct since the variants are pipeline output, not curated content.

### Slice B/C mission heroes — true orphans

After variants, the residual real-content gap is **29 mission heroes**
with no `MISSION_IMAGE_QUERIES` curated entry:

```
apollo-1, apollo-soyuz, beresheet, change3, inspiration4,
luna16, luna21, mariner10,
otv-1, otv-2, otv-3, otv-4, otv-5, otv-6, otv-7,
polaris-dawn, schiaparelli, shenzhou-1,
skylab-2, skylab-3, skylab-4,
voskhod-1, voskhod-2,
vostok-1, vostok-2, vostok-3, vostok-4, vostok-5, vostok-6
```

These are the missions whose hero files were created during #5 Phase 0
without a corresponding curated entry in `scripts/fetch-assets.ts`.

**Why this is not a trivial add:** dropping a `{ id, query }` entry into
`MISSION_IMAGE_QUERIES` will cause the next `npm run fetch-assets` run
to refetch from NASA Images API and overwrite the Phase 0 imagery. So
either:

  - **Annotate the existing files** with `commonsCoverFirst` titles
    matched to what was actually placed during Phase 0 (manual + careful
    per-mission inspection), or
  - **Add a `manifestOnly: true` flag** to `MissionImageQuery` that the
    build script honours (manifest entry yes, fetch-assets refetch no),
    or
  - **Rework `buildMissionGalleryEntries`** to walk the on-disk dirs
    like `buildPanelEntries` does, emitting `direct-other` /
    `curated-no-upstream-record` entries for any directory not in the
    curated map.

Option 3 is the most automatic but the laxest about provenance honesty;
Option 1 keeps the `direct-other` rate low but is the most manual.

### Smaller residuals

- **science (222), hotspots (165), recommendations (93), rockets (39),
  satellites (16):** the build script has dedicated walkers for science
  + hotspots + recommendations + rockets but each one walks a curated
  metadata map rather than the filesystem. New files added to these
  surfaces since the last metadata-map update aren't picked up. Each
  surface needs a metadata-map sync + re-run.

## What landed in this commit

- `scripts/build-image-provenance.ts` — `buildFleetEntries` now handles
  both legacy `{agency, sourceUrl}` and new
  `{commons_file, commons_url, credit, license}` source-manifest shapes
  via a tagged-union dispatch. The new shape skips the URL regex parse
  because it carries the Commons filename directly. No behaviour change
  for the 851 legacy entries; recovers the 252 entries that were
  crashing the build.
- `static/data/image-provenance.json` — regenerated; +233 net entries
  (4184 → 4417).

## What did NOT land

- Mission `MISSION_IMAGE_QUERIES` additions for the 29 unscored heroes
  (needs design input — see above).
- Variant-inheritance walk in `buildFleetEntries` /
  `buildMissionGalleryEntries` (needs design input).
- Vision rescoring for the 29 unscored heroes (~$1 cost; pending Marko's
  explicit budget approval).

## Refs

- #332 umbrella PR
- #5 follow-up (post-332-follow-ups.md item 5: mission image rework)
