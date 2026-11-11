# Robotic Moon lander close-up annotations - candidates

Date: 2026-11-09. Draft only: `static/data/surface-hotspots.json` and `src/` are untouched. Data: `docs/wip/2026-11-09-moon-robotic-annotations.json` (shape of the Apollo pilot json: `hotspot_annotations` with `px`, `py`, `lat_offset_m`, `lon_offset_m`, `label`, `label_short`, `explain_en`, `source`, `confidence`, plus `gallery`; `held` / `dropped` per site). Check images (gitignored): `static/images/_staging/robotic-annotations/<site>.jpg` (all rings) and `<site>-<id>.jpg` (3x, plain | ringed).

## Result

| Site | Kept (two-source / one-source) | Dropped |
|---|---|---|
| luna16 | - / descent stage | - |
| luna17 | lander / - | Lunokhod 1 (8.6 km away, out of frame), tracks (not an object) |
| luna21 | lander / - | Lunokhod 2 (about 15 km away) |
| luna24 | - / lander | bright specks (LROC: "may be") |
| change3 | - / lander (medium, caveat below) | Yutu (does not match LROC offset), blast zone (not resolved) |
| change4 | - / - | lander and Yutu-2 both outside the patch; no hardware visible |
| change5 | lander / - | - |
| change6 | - / lander | - |
| chandrayaan3 | lander / - | Pragyan (no source places it here) |
| slim | lander / - | exhaust change (ratio image only) |
| beresheet | impact smudge / - | - |
| luna9 | - | Kaguya failover patch, no LROC frame, no source |

"Two sources" = two LROC products (an LROC post plus an LROC coordinate layer or the annotation LROC drew on the same image). No second agency (CNSA/JAXA/ISRO/NASA mission page) was consulted in this pass; all identification is LROC, the same team that made the images. A ring is "two-source" when LROC both captions the object in this frame and gives a coordinate or draws its own marker on it.

## Method

1. Patch geometry. The patches are not what `hotspot_tier2_ground_m` says (1500, 1000, 1738 m): for change3/4, luna16/17/21/24 the source is the LROC Featured Sites clean frame, a 1000x562 jpg; `fetch-moon-featured-images.ts` centre-crops the 562x562 middle and resizes to 2048 (x3.644). Ground scale = the frame's pixel scale (LROC Featured Sites page, "Pixel Scale") x 562 / 2048: luna16 0.151 m/px (309 m wide), luna17/21/24 0.137 m/px (281 m), change3 0.428 m/px (876 m), change4 0.84 m/px source = 472 m wide. For the blog PNGs (change5/6, chandrayaan3, slim, beresheet) the whole 1100 px image is resized, so scale = the post's stated image width / 2048: change5 1210 m (0.591), chandrayaan3 1738 m (0.849), slim 880 m (0.430), beresheet 490 m (0.239), change6 about 467 m by the file name `425mmpp` (0.228; uncertain, see NOT verified). The 64 m crater at luna24 measures about 59 m on this scale, a sanity check of the native-resolution assumption.
2. Positions. Every ring is placed by eye on the hardware itself (bright body plus shadow, 3x crops), not from coordinates. LROC captions and coordinate layers decide which object it is; offsets are metres from the patch centre (`lat_offset_m` = (1024 - py) x m/px, `lon_offset_m` = (px - 1024) x m/px).
3. Rings drawn with a scratch script on copies of each patch (r = 14 px, Beresheet 26 px for the 10 m smudge) and each looked at 3x next to the plain crop; all kept rings sit on the object.
4. Sources: LROC image posts (`lroc.im-ldi.com/images/<n>`), LROC Featured Sites site_images pages (frame, pixel scale, feature pixel), LROC geojson layers `luna_lunokhod_lms`, `luna_lunokhod_rvrs`, `luna_change_4_lms`, `luna_change_4_rover_points`, `luna_lunokhod{1,2}_traverse_stops`.

## Findings that change wiring

- Several patch centres are not the object. luna17: the hotspot site point (38.315 N, 324.992 E) is Lunokhod 1's final parking place per LROC; the patch shows the Luna 17 LANDER (38.23764 N, 324.99821 E), 8.6 km away. luna21: site point (25.83, 30.914) is Lunokhod 2; the patch shows the Luna 21 lander (26.005 N, 30.406 E), about 15 km away. Offsets in the json are from the patch centre, so they are correct for the image, but the site's lat/lon and the patch disagree. change4: the patch (centred -45.4446, 177.6048) contains neither the lander (-45.4561, 177.5885) nor Yutu-2 on that date.
- Baked-in LROC annotations: change5 (box, label, scale bar), beresheet (box, label, date, scale bar), slim (arrow). A ring plus the baked marker doubles up; for beresheet and change5 the ring sits inside the box. The earlier decision "operator wants non-annotated crops" is not met by these three (the clean frames are not in the featured_sites tree).
- change3 lander: the dot I annotate is 50 m north of the patch centre although the centre equals LROC's lander coordinate. Match is by pattern (bright dot with dark streaks to its east, as in LROC's annotated sibling frame M1142582775R). Treat as medium.

## Per-site tables

Columns: id, label (<= 28), label_short (<= 16), px, py, offset from centre (E, N m), confidence, sources, explanation. Full strings are in the json; condensed here.

### luna16 (M141899500L, 2010-10-16, 0.55 m/px source; patch 0.151 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| descent-stage | Luna 16 descent stage / Descent stage | 1029, 1022 | +0.8, +0.3 | one source: LROC image post 10 ("Soviet Luna 16 descent stage") + featured-site frame whose feature pixel is the crop centre | The lower half of the Soviet Luna 16 lander, left on Mare Fecunditatis after the sample-return capsule lifted off on 21 September 1970 with about 101 grams of soil. |

### luna17 (M173144480R, 2011-10-13, 0.50 m/px; patch 0.137 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| lander | Luna 17 lander / Luna 17 lander | 1031, 1018 | +1.0, +0.8 | two sources: LROC layer `luna_lunokhod_lms` (38.23764 N, -35.00179 E) + LROC posts 402 and 11 (tracks circle the lander, ramps on the east side). LROC does not annotate this frame: identification by eye from the lander-with-circling-tracks pattern | The Luna 17 lander that delivered Lunokhod 1 to Mare Imbrium on 17 November 1970. Its descent engines brightened the surface around it, which makes the rover tracks circling the lander stand out. |

### luna21 (M122007650L, 2010-02-28, 0.50 m/px; patch 0.137 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| lander | Luna 21 lander / Luna 21 lander | 1028, 1019 | +0.5, +0.7 | two sources: LROC post 15 (this frame M122007650L: lander, bright zone 10-20 m, rover tracks) + layer `luna_lunokhod_lms` (26.005 N, 30.406 E) | The Luna 21 lander that delivered Lunokhod 2 to Le Monnier crater on 15 January 1973. Its descent engines scoured a bright zone 10 to 20 m wide around it, and the rover tracks lead away from it. |

### luna24 (M137136039R, 2010-08-22, 0.50 m/px; patch 0.137 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| lander | Luna 24 lander / Luna 24 lander | 1019, 1015 | -0.7, +1.2 | one source: LROC post 9 (Luna 24 NAC frames, bright pixels near it) + featured-site feature pixel at the crop centre; no coordinate or arrow for this frame | The Luna 24 lander on the rim of a crater in Mare Crisium. The August 1976 mission drilled over 2 m into the regolith and returned about 170 grams of it. |

### change3 (M1142596997R, 2013-12-25 07:48 UTC, 1.559 m/px, incidence 78 deg; patch 0.428 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| lander | Chang'e 3 lander / Chang'e 3 lander | 1031, 911 | +3.0, +48.3 | one source (LROC post 637, sibling frame, same pass 4 h earlier) matched by pattern; medium, see Findings | China's Chang'e 3 lander, which touched down in Mare Imbrium on 14 December 2013, the first lunar landing since 1976. At this low Sun it shows as one bright pixel with a long shadow. |

### change4 (M1370616052, 2021-03-17, 0.84 m/px)

Nothing kept. The patch is 472 m wide, centred -45.4446, 177.6048. LROC's lander point (-45.4561, 177.5885) is about 350 m S and 350 m W of the centre (outside); Yutu-2 on this date (-45.45085, 177.56916) is about 780 m from the centre (outside). By eye the patch shows craters only.

### change5 (M1361560086R, 2020-12-02, 1210 m wide; patch 0.591 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| lander | Chang'e 5 lander / Chang'e 5 lander | 1025, 1022 | +0.6, +1.2 | two sources: LROC post 1172 ("the lander is the bright spot in the center of the outline"; 43.0576 N, 308.0839 E +/-20 m) + the box and label LROC drew on this image | China's Chang'e 5 lander in Oceanus Procellarum, imaged by LRO the day after its 1 December 2020 touchdown. The sample-return mission brought back about 1.7 kg of lunar soil. |

### change6 (M1472410644L, 2024-06-07, scale uncertain; patch about 0.228 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| lander | Chang'e 6 lander / Chang'e 6 lander | 1026, 1021 | +0.5, +0.7 | one source: LROC post 1374 ("the small cluster of bright pixels in the center of the image", rim of an eroded ~50 m crater; 41.6385 S, 206.0148 E +/-30 m) | China's Chang'e 6 lander on the far side, in the Apollo basin, imaged by LRO about a week after its 1 June 2024 landing. The brighter ground around it was disturbed by the landing engine. |

### chandrayaan3 (M1447750764LR, 2023-08-27, 1738 m wide oblique mosaic; patch about 0.849 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| lander | Chandrayaan-3 Vikram lander / Vikram lander | 1025, 1024 | +0.8, 0 | two sources: LROC post 1314 ("lander is in the center of the image, its dark shadow is visible against the bright halo") + its coordinates 69.3741 S, 32.32 E | India's Chandrayaan-3 Vikram lander, which touched down on 23 August 2023 about 600 km from the south pole. LRO imaged it four days later; the bright halo is regolith disturbed by the rocket plume. |

### slim (M1460739214L, 2024-01-24, 880 m wide; patch 0.430 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| lander | SLIM lander / SLIM lander | 1026, 1027 | +0.9, -1.3 | two sources: LROC post 1358 ("The SLIM lander on the lunar surface (13.3160 S, 25.2510 E)") + the arrow LROC drew on this image | JAXA's SLIM lander, which landed on 19 January 2024 near Shioli crater. LRO imaged it five days later; a faint change in brightness around it marks where the engine exhaust swept the surface. |

### beresheet (M1310536929R, 2019-04-22, 490 m wide; patch 0.239 m/px)

| id | label / short | px, py | E, N (m) | confidence | explain |
|---|---|---|---|---|---|
| impact-smudge | Beresheet impact smudge / Impact smudge | 1025, 1042 (r 26 px) | +0.2, -4.3 | two sources: LROC post 1101 (dark elongated smudge about 10 m across at 32.5956 N, 19.3496 E, 95% interval 20 x 8 m) + the box LROC drew on this image | The dark smudge where the Israeli Beresheet lander crashed on 11 April 2019 in Mare Serenitatis. It hit at a low angle, from the north, about 1000 m/s faster than planned; the smudge is about 10 m across and lowers the surface brightness by about 10%. |

## Gallery photos (gallery = `missions/<id>`; slots as the provenance rows describe them)

| Site / object | Slot | State |
|---|---|---|
| luna16 descent stage | `missions/luna16/03` (LROC, descent stage inset, PD-NASA) | existing |
| luna17 lander | `missions/luna17/01` (LROC frame of the lander); `missions/luna17/05` also "Luna 17 lander" | existing; /01 row credited PD-Russia/Roscosmos but the image is an LROC frame: credit to be checked |
| luna21 lander | `missions/luna21/01` (LROC15, arrow at lander, PD-NASA) | existing |
| luna24 lander | `missions/luna24/01` (LROC frame, arrow at lander) | existing; credited PD-Russia/Roscosmos, image is LROC: credit to be checked |
| change3 lander | `missions/change3/04` (LROC "What a Blast!", lander + blast zone), `change3/05` (lander and rover arrows) | existing; /05 credited CNSA CC-BY-SA, image is LROC637 |
| change5 lander | `missions/change5/04` (LROC "After Blast Off", arrow at lander) | existing, partial (ascender gone, so it shows the descent stage only, which is also the ring's object); credited CNSA CC-BY-SA, image is LROC |
| change6 lander | none | CANDIDATE: LROC image from post 1374 (LROC-EDU, allowlisted, same source family as the patch). No CNSA landing photo identified; CNSA-EDU is allowlisted if one is found |
| chandrayaan3 Vikram | `missions/chandrayaan3/02` (ISRO, Vikram seen by the rover cameras, PD-self row); `chandrayaan3/04` LRO view, no arrow | existing |
| slim lander | `missions/slim/02` (LROC, arrow at lander, CC-BY-4.0 row) | existing |
| beresheet smudge | `missions/beresheet/02` (box at the smudge, PD-NASA), `beresheet/06` (after / ratio pair) | existing |

Slots were checked by eye on a contact sheet (luna16/03, luna17/01 and /06, luna21/01, luna24/01, change3/04 and /05, change5/04, chandrayaan3/04 and /02, slim/02 and /04, beresheet/02 and /06): each shows the object named. The other slots in these galleries were judged from provenance titles only.

## NOT verified / NOT done

- No second agency source: every identification is LROC. CNSA, JAXA, ISRO and NASA mission pages were not consulted for object positions.
- The patch-centre claim (patch centre = the Featured Sites "feature" pixel) is inferred, not read from the script or the page. It held for luna16/21/24 (hardware within about 1 m of centre) and failed for change3 (48 m off). I did not retrieve the jpg's georeference.
- change3: the lander match is by pattern against a different frame (M1142582775R), not by coordinates; if it is wrong the ring sits on a boulder. The Yutu candidate (bright pixel 50 m south) was dropped, not disproved.
- Scale of the change6 patch (0.228 vs 0.27 m/px) is unresolved; the ring pixel is not affected, the metre offsets (under 1 m) are.
- Metre offsets for chandrayaan3 come from a warped oblique mosaic, so the scale varies across the frame.
- Luna 17 and Luna 21 identification is by eye against LROC text for sibling frames (M175502049RE, M114185541RE, M122007650LE); the Luna 17 frame M173144480R has no LROC caption of its own. Luna 21's frame is the one LROC's post 15 names.
- Luna 9 (Kaguya patch) and sites without a tier-2 patch (Surveyors, IM-1, IM-2, Blue Ghost, Luna 20/23) were not examined for annotations.
- Photos: only the slots listed were viewed; captions were not read from the NASA API; credits on luna17/01, luna24/01, change3/05 and change5/04 look wrong (LROC images credited Roscosmos/CNSA) and were not corrected. No candidate was downloaded or licence-checked beyond the allowlist short names.
- Not run: any in-app render, `validate-data`, i18n of labels and explanations (English only), the `hotspot_tier2_ground_m` values in surface-hotspots.json (1500/1000/1738) disagree with the ground widths computed above (281-876 m for the Featured Sites patches) and were not changed.
- Label lengths: all labels <= 28 (longest "Chandrayaan-3 Vikram lander", 27); all short labels <= 16 ("Chang'e 3 lander", 16).
