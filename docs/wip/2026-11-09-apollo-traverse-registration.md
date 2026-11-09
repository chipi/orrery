# Apollo traverse registration check (2026-11-09)

Symptom: on `/moon?site=apollo16` the green start dot sat about 90 m north-east of the LM.

## Verdict

Not a datum or registration offset. Apollo 16 was stored end-first: `points[0]` was the LRV's final parking spot (end of EVA 3), not the drive start. The coordinates were right; the order was reversed.

The track is the LROC team's own mapping (`luna_apollo_16_eva{1,2,3}.geojson`), the same datum as the LM and hardware coordinates (`luna_apollo_16_hardware.geojson`, `moon-sites.json`).

Evidence, fetched 2026-11-09 from lroc.asu.edu / lroc.im-ldi.com:

| Source feature (LROC) | lat, lon | Old `apollo16.json` |
|---|---|---|
| EVA1 line, first vertex (chronological start) | -8.973575, 15.501020 | was `points[1000]` (last) |
| EVA3 line, last vertex | -8.972858, 15.503693 | was `points[0]` (first) |
| Hardware "Lunar Roving Vehicle" (final park) | -8.97293, 15.50374 | 2 m from `points[0]` |
| Hardware "Landing Module" | -8.97344, 15.50105 | 4 m from `points[1000]` |
| Hardware "ALSEP" / "Seismometer" | -8.97588, 15.49856 | 6 m from `points[834]` |

The EVA lines chain end to start (EVA1 end = EVA2 start, EVA2 end = EVA3 start). Station order in the old file was 11 (idx 215), 4 (647), 1 (916): reverse chronological. The start dot is therefore 82 m from the LM site (16.7 m N, 80.7 m E); that is the LRV parking spot. The first point of the corrected file is 16 m S of the LM (the LRV deployment spot).

## Fix applied

- `static/data/moon-traverses/apollo16.json`: `points` reversed, `stops` sorted by station number (1, 4, 11), credit notes the order. No coordinate changed.
- `static/data/moon-traverses/apollo16.route-patches.json`: labels only. `start` (centred on the LRV final parking) is now "LRV final parking (end of EVA 3)" and `end` is "Along route". The label field is not read by `src/`.
- With the old order, `surface-traverses.ts` prepended the site point because the first vertex was more than 1e-3 deg from it, drawing an 82 m leg the crew never drove. The new first vertex is inside that threshold, so nothing is prepended.

## Apollo 15 and 17 (3 points each)

Hardware points are from `luna_apollo_{15,17}_hardware.geojson`; distance is to the nearest vertex of the stored track.

| | LM | ALSEP | LRV final park | Order |
|---|---|---|---|---|
| Apollo 15 | 6 m | 7 m | 1 m (`points[901]`, the end) | chronological; `points[0]` is 5 m from the LM |
| Apollo 17 | 2 m | 2 m | 24 m | see below |

Apollo 15 is fine: (a) for the first point, a correct real location, with no offset.

Apollo 17 is registered correctly (USGS Haase 2019 track, tied to the LROC orthomosaic; 2 m at the LM and the ALSEP). Its first point is 20 m W of the LM, so the dot looks fine. The order is not chronological. Station vertex indices run 6, 7, 8, 9 (148 to 360), then 1 (490), then 5, 4, 3, 2 (624 to 884, reversed). That looks like EVA3, EVA1, EVA2-reversed, chained at the LM area. The final vertex is not the LRV final park (24 m from the nearest vertex, and `points[1123]` is about 87 m from the LROC LRV point). I did not change Apollo 17: re-ordering needs the three per-EVA USGS lines, and there is no visible symptom.

## Not verified

- Not run in a browser; the dot position is computed from the data, not seen.
- `apollo16.route-patches.json` ids (`km-NN`) still count from the old end, and tile images are unchanged. Placement is by lat/lon so rendering is unaffected. Re-running `fetch-moon-traverse.ts --rover apollo16` would regenerate ids in mission order, but it is a network and GDAL job that rewrites tiles, and I did not run it.
- The last manifest patch, `end` at -8.97498, 15.49659, is not the last polyline vertex (-8.973575, 15.50102 before the fix). The manifest looks generated from a different polyline version. Cause not investigated.
- Apollo 17 ordering, as above.
- The generator for `apollo15/16.json` is not in the repo (`build-moon-traverses.mjs` only builds the V1 robotic polylines). The data came from an ad hoc build; the order fix was applied directly to the JSON with `jq`.
