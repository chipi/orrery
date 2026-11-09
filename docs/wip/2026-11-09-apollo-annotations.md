# Apollo close-up annotations (pilot) - candidates

Date: 2026-11-09. Draft only: `static/data/surface-hotspots.json` and `src/` are untouched. Data file: `docs/wip/2026-11-09-apollo-annotations.json` (shape of `hotspot_annotations` plus `px`, `py`, `east_of_lm_m`, `north_of_lm_m`, `source`, `confidence`, `explain_en`; `held` and `dropped` per site).

## Result in one table

| Site | Kept (two-source / one-source) | Held | Dropped |
|---|---|---|---|
| apollo11 | PSEP, LRRR (two) / LM (one) | - | flag, TV |
| apollo12 | ALSEP, Surveyor 3 (two) / LM (one) | - | flag, separate seismometer point |
| apollo14 | LM (two) / - | ALSEP | flag, magnetometer (outside frame) |
| apollo15 | LM, ALSEP (two) / LRV (one) | - | flag |
| apollo16 | ALSEP (two) / LM, LRV (one) | - | flag |
| apollo17 | - / LM, LRV (one) | ALSEP, SEP | flag |

"Two sources" means LROC (ASU) plus an independent NASA page (NSSDCA) or a second LROC publication; the NSSDCA numbers are 4-decimal and some are 10-20 m from LROC's (stated per row), so the NASA page confirms the area and LROC supplies the pixel. Every kept ring was looked at on the image and sits on visible hardware (LM, bright/dark hardware cluster, or a dark rover blob at the end of a track).

## Sources (what each gives)

- LROC "Coordinates of Lunar Anthropogenic Targets", 28 July 2016 (Wagner et al., Icarus 2016): mean lat/lon with uncertainty in metres for the LM, ALSEP central station, PSE, LRV, SEP of each Apollo site, and Surveyor 3. https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf
- LROC Featured Sites "Hardware" overlay, one geojson per site (named points: Landing Module, Seismometer, ALSEP, LRRR, LRV, SEP, Flag, TV, Magnetometer): `https://lroc.im-ldi.com/geojson/luna_apollo_NN_hardware.geojson` (the Simple Traverse page lists it as overlay `luna_apollo_NN_hardware`). Its LM/PSE/ALSEP/LRV/SEP values equal the 2016 table, so these two are one source in two products.
- The Site Images pages only expose the LM feature pixel (`feature: {line, sample}`), no other labels.
- NASA NSSDCA pages (4-decimal ALSEP/EASEP coordinates and instrument lists): ids 1969-059C, 1969-099C, 1971-008C, 1971-063C, 1972-031C, 1972-096C, Surveyor 3 1967-035A.
- LROC post "First Look: Apollo 12 and Surveyor 3" (https://lroc.im-ldi.com/posts/141): annotated image (different frame M104662862R, 2009) labelling descent stage, ALSEP and Surveyor 3. Its text also says Surveyor lies "approximately 450 meters east of the LM", which contradicts the 155-180 m of NSSDCA and the LROC table (157 m); not used.

## Method

1. Object coordinates from the LROC layer/table. East/north metres from the LM point: dE = dlon * R * cos(lat0), dN = dlat * R, R = 1737.4 km (the frame's equirectangular Moon SRS).
2. Pixel in our 2048 crop = observed LM pixel + (dE/mpp, -dN/mpp), grid m/px from the research file (0.40, 0.40, 0.45, 0.40, 0.40, 0.50). The crop is centred on the LROC LM feature pixel (window origin minus feature pixel = 1024), but the LM seen in the image is not exactly at 1024,1024 (table below). The raw frames carry a few metres of registration error against the 2016 corrected coordinates, so non-LM objects are placed relative to the LM as seen, not by absolute pixel.
3. Offsets for the app are metres from the crop centre (= site point), so they include the LM's own displacement.
4. Rings (r = 9 px = 3.6-4.5 m) drawn with ImageMagick on a copy of `tier2-lroc.jpg`; each object also viewed as a 240 px crop at 3x, plain next to ringed.

## Finding: the LM is not exactly at the crop centre

LM position in our crops (eye on 3x crops, +/-2 px), as metres from the centre (east, north): apollo11 -0.9, +2.8; apollo12 -0.2, -0.4; apollo14 -1.8, -3.1; apollo15 -1.6, -3.4; apollo16 +2.4, +1.2; apollo17 +4.0, -11.5. Apollo 17 is the outlier: the LM sits about 11.5 m south of the centre (23 px at 0.5 m/px), so an LM annotation at (0,0) would miss it by that. The other five are within about 3 m.

## Existing apollo11 annotations in surface-hotspots.json vs this pass

Current `lrrr` (-10, 14) and `easep` (-15, 18) do not match LROC: LRRR is at about -1 E, -22 N of the LM and the seismometer package at about +0 E, -28 N. `us-flag` and `plaque` have no resolvable object in the frame. Replace rather than extend.

## Per-site tables

### Apollo 11 (frame M175124932R, 0.4 m/px)

LM as seen in our crop: pixel 1021.7, 1017.1 (eye, +/-2 px), i.e. -0.9 m E, 2.8 m N of the crop centre.

| id | label | px (x,y) | E, N of LM (m) | offset from centre E, N (m) | confidence | sources | explanation |
|---|---|---|---|---|---|---|---|
| lm-descent-stage | Eagle descent stage | 1022, 1017 | 0, 0 | -0.8, 2.8 | two sources (LROC coordinates + NASA NSSDCA mission page); object unmistakable in the frame | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 11 LM 0.67416 N, 23.47314 E, +/-0.3 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_11_hardware.geojson (Landing Module, same coordinates); LROC Site Images page apollo-11/site_images/m175124932r feature pixel line 33482 sample 1887 = same point<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C (mission page; LM landing coordinates) | The lower half of the Apollo 11 Lunar Module Eagle. It stayed on the Moon when the ascent stage lifted the crew off after the July 1969 landing. |
| pse | Passive seismometer (PSEP) | 1022, 1088 | 0.3, -28.5 | -0.8, -25.6 | two sources (LROC + NASA NSSDCA; agree on area to ~10 m, pixel from LROC) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 11 PSE 0.67322 N, 23.47315 E, +/-0.4 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_11_hardware.geojson (Seismometer)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C (EASEP: passive seismometer, 0.6735 N 23.4730 E, "about 17 m south of the LM"; 4-decimal coordinates, ~10 m from LROC) | The Passive Seismic Experiment of the Early Apollo Scientific Experiments Package, set up south of the Lunar Module on 21 July 1969 to record moonquakes and impacts. |
| lrrr | Laser retroreflector (LRRR) | 1019, 1072 | -1, -21.8 | -2, -19.2 | two sources (LROC layer + NASA NSSDCA relative position) | - https://lroc.im-ldi.com/geojson/luna_apollo_11_hardware.geojson (LRRR 0.67344 N, 23.47311 E)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C ("deployed about 5 meters NNW of the EASEP"; LROC layer puts it 6.7 m N of the seismometer) | The Laser Ranging Retroreflector Array left by Apollo 11: a reflector that lets observatories on Earth time laser pulses bounced back from the Moon. Placed about 5 m north-north-west of the seismometer package. |

- DROPPED Flag: LROC layer position only (12 m WNW of LM); nothing resolvable at 0.4 m/px and 41 deg incidence. TV camera (LROC layer, 19 m NW of LM): nothing resolvable.

Check images: `static/images/_staging/apollo-annotations/apollo11.jpg` (all computed rings, r = 9 px) and per-object 3x side-by-side crops `apollo11-<Object>.jpg` (plain | ringed).

### Apollo 12 (frame M175428601R, 0.4 m/px)

LM as seen in our crop: pixel 1023.6, 1024.9 (eye, +/-2 px), i.e. -0.2 m E, -0.4 m N of the crop centre.

| id | label | px (x,y) | E, N of LM (m) | offset from centre E, N (m) | confidence | sources | explanation |
|---|---|---|---|---|---|---|---|
| lm-descent-stage | Intrepid descent stage | 1024, 1025 | 0, 0 | 0, -0.4 | two sources (LROC coordinates + NASA NSSDCA mission page); object unmistakable in the frame | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 12 LM -3.0128, 336.5781 E = -23.4219, +/-2.2 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_12_hardware.geojson (Landing Module -3.01279, -23.42192)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C (mission page; LM landing coordinates) | The lower half of the Apollo 12 Lunar Module Intrepid, left on the Moon after the November 1969 landing close to the earlier Surveyor 3 probe. |
| alsep | ALSEP central station | 797, 800 | -90.5, 90.1 | -90.8, 89.6 | two sources (LROC + NASA NSSDCA; agree on area to ~16 m, pixel from LROC, hardware cluster visible under the ring) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 12 ALSEP -3.0098, 336.5751 E, +/-2.2 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_12_hardware.geojson (ALSEP)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C (central station 3.0094 S, 23.4246 W; ~16 m from LROC) | The Apollo 12 Lunar Surface Experiments Package, deployed on 19 November 1969. Its instruments included a passive seismometer, a magnetometer and a solar wind spectrometer, all wired to the central station. |
| surveyor-3 | Surveyor 3 lander | 1320, 1283 | 118.7, -103.4 | 118.4, -103.6 | two sources (LROC table + LROC labelled image; NSSDCA repeats the LROC coordinates, not independent) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Surveyor 3 -3.0162, 336.5820 E = -23.4180, +/-2.6 m)<br>- https://lroc.im-ldi.com/posts/141 (LROC post "First Look: Apollo 12 and Surveyor 3": annotated image labels descent stage, ALSEP and Surveyor 3; a different frame, M104662862R)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1967-035A (landing 20 April 1967, coordinates quoted from LRO images; "within about 180 m" of the Apollo 12 LM) | NASA robotic lander that touched down on 20 April 1967 on the inner slope of a small crater. Apollo 12 landed about 160 m from it in November 1969, and its crew removed about 10 kg of parts, including the TV camera, on 20 November. |

- DROPPED Flag: LROC layer position (15 m NNW of LM); only a 1-px dark speck under the ring, not identifiable.
- DROPPED Seismometer: Same site as the ALSEP point (2.7 m away), would overlap; merged into ALSEP. Same for A14, A15, A16 PSE points (1.5-3 m from ALSEP).

Check images: `static/images/_staging/apollo-annotations/apollo12.jpg` (all computed rings, r = 9 px) and per-object 3x side-by-side crops `apollo12-<Object>.jpg` (plain | ringed).

### Apollo 14 (frame M168319885LR, 0.45 m/px)

LM as seen in our crop: pixel 1020, 1031 (eye, +/-2 px), i.e. -1.8 m E, -3.1 m N of the crop centre.

| id | label | px (x,y) | E, N of LM (m) | offset from centre E, N (m) | confidence | sources | explanation |
|---|---|---|---|---|---|---|---|
| lm-descent-stage | Antares descent stage | 1020, 1031 | 0, 0 | -1.8, -3.1 | two sources (LROC coordinates + NASA NSSDCA mission page); object unmistakable in the frame | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 14 LM -3.64589, 342.52806 E = -17.47194)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-008C (mission page; LM landing coordinates) | The lower half of the Apollo 14 Lunar Module Antares, left on the Moon after the February 1971 landing. |


- HELD ALSEP central station (alsep): HELD: the computed ring (LM-relative) lands ~4-5 m from the only visible candidate, a bright dot with a dark smudge and a track starting at it (about 9 px W of the ring). Sources agree with each other but the image offset is bigger than their stated uncertainty (0.4 m), so identification would rest on the shape. Not annotated.
- DROPPED Flag: LROC layer position; nothing resolvable.
- DROPPED Magnetometer: LROC layer position 1.33 km E of the LM: outside the 922 m frame.

Check images: `static/images/_staging/apollo-annotations/apollo14.jpg` (all computed rings, r = 9 px) and per-object 3x side-by-side crops `apollo14-<Object>.jpg` (plain | ringed).

### Apollo 15 (frame M175252641LR, 0.4 m/px)

LM as seen in our crop: pixel 1020, 1032.5 (eye, +/-2 px), i.e. -1.6 m E, -3.4 m N of the crop centre.

| id | label | px (x,y) | E, N of LM (m) | offset from centre E, N (m) | confidence | sources | explanation |
|---|---|---|---|---|---|---|---|
| lm-descent-stage | Falcon descent stage | 1020, 1033 | 0, 0 | -1.6, -3.6 | two sources (LROC + NASA NSSDCA identical coordinates) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 15 LM 26.13239 N, 3.63330 E, +/-1.0 m)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C (LM 26.13239 N, 3.63330 E)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_15_hardware.geojson (Landing Module) | The lower half of the Apollo 15 Lunar Module Falcon, left on the Moon after the July 1971 landing. |
| alsep | ALSEP central station | 789, 906 | -92.3, 50.6 | -94, 47.2 | two sources (LROC + NASA NSSDCA, within ~3 m) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 15 ALSEP 26.13406 N, 3.62991 E, +/-0.5 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_15_hardware.geojson (ALSEP)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C (ALSEP 26.1341 N, 3.6298 E; equals LROC PSE point; "deployed at the end of the traverse" on the first EVA) | The Apollo 15 Lunar Surface Experiments Package, deployed on 31 July 1971. Instruments listed by NASA: passive seismometer, magnetometer, solar wind spectrometer, suprathermal ion detector, cold cathode ion gauge, dust detector and a heat flow experiment. |
| lrv | Lunar Roving Vehicle | 1342, 1082 | 128.8, -19.7 | 127.2, -23.2 | one source (LROC table and layer; dark rover blob at the end of a track under the ring) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 15 LRV 26.13174 N, 3.63803 E, +/-0.5 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_15_hardware.geojson (Lunar Roving Vehicle)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C (mission page, Lunar Roving Vehicle) | Apollo 15 was the first mission to carry a Lunar Roving Vehicle. Where LROC images the rover today, left on the Moon after the mission. |

- DROPPED Flag: LROC layer position; nothing resolvable.

Check images: `static/images/_staging/apollo-annotations/apollo15.jpg` (all computed rings, r = 9 px) and per-object 3x side-by-side crops `apollo15-<Object>.jpg` (plain | ringed).

### Apollo 16 (frame M175179080LR, 0.4 m/px)

LM as seen in our crop: pixel 1030, 1021 (eye, +/-2 px), i.e. 2.4 m E, 1.2 m N of the crop centre.

| id | label | px (x,y) | E, N of LM (m) | offset from centre E, N (m) | confidence | sources | explanation |
|---|---|---|---|---|---|---|---|
| lm-descent-stage | Orion descent stage | 1030, 1021 | 0, 0 | 2.4, 1.2 | two sources (LROC coordinates + NASA NSSDCA mission page); object unmistakable in the frame | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 16 LM -8.9734, 15.5011, +/-3.0 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_16_hardware.geojson (Landing Module)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-031C (mission page; LM landing coordinates) | The lower half of the Apollo 16 Lunar Module Orion, left on the Moon after the April 1972 landing. |
| alsep | ALSEP central station | 844, 1206 | -74.6, -74 | -72, -72.8 | two sources (LROC + NASA NSSDCA; agree on area to ~20 m, pixel from LROC, hardware cluster visible under the ring) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 16 ALSEP -8.9759, 15.4986, +/-3.0 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_16_hardware.geojson (ALSEP)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-031C (central station 8.9754 S, 15.4981 E; ~20 m from LROC, "turned on at 19:38 UT on 21 April 1972") | The Apollo 16 Lunar Surface Experiments Package, switched on 21 April 1972. It carried a passive seismometer, an active seismometer, a magnetometer and a heat flow experiment; the heat flow experiment was lost on the first moonwalk when its cable was broken. |
| lrv | Lunar Roving Vehicle | 1232, 982 | 80.6, 15.5 | 83.2, 16.8 | one source (LROC table and layer; dark rover blob at the end of a track under the ring) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 16 LRV -8.9729, 15.5037, +/-3.7 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_16_hardware.geojson (Lunar Roving Vehicle) | The Apollo 16 Lunar Roving Vehicle. Where LROC images the rover today, left on the Moon after the mission. |

- DROPPED Flag: LROC layer position; nothing resolvable.

Check images: `static/images/_staging/apollo-annotations/apollo16.jpg` (all computed rings, r = 9 px) and per-object 3x side-by-side crops `apollo16-<Object>.jpg` (plain | ringed).

### Apollo 17 (frame M172717297R, 0.5 m/px)

LM as seen in our crop: pixel 1032, 1047 (eye, +/-2 px), i.e. 4 m E, -11.5 m N of the crop centre.

| id | label | px (x,y) | E, N of LM (m) | offset from centre E, N (m) | confidence | sources | explanation |
|---|---|---|---|---|---|---|---|
| lm-descent-stage | Challenger descent stage | 1032, 1047 | 0, 0 | 4, -11.5 | two sources (LROC coordinates + NASA NSSDCA mission page); object unmistakable in the frame | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 17 LM 20.1911, 30.7723, +/-3.5 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_17_hardware.geojson (Landing Module)<br>- https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-096C (mission page; LM landing coordinates) | The lower half of the Apollo 17 Lunar Module Challenger, left on the Moon after the December 1972 landing, the last crewed landing so far (as of 2026-11). |
| lrv | Lunar Roving Vehicle | 1297, 1133 | 132.6, -43.1 | 136.5, -54.5 | one source (LROC table and layer; dark rover blob at the end of a track under the ring) | - https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf (Apollo 17 LRV 20.1896, 30.7769, +/-3.2 m)<br>- https://lroc.im-ldi.com/geojson/luna_apollo_17_hardware.geojson (Lunar Roving Vehicle) | The Apollo 17 Lunar Roving Vehicle. Where LROC images the rover today, left on the Moon after the mission. |

- HELD ALSEP central station (alsep): HELD: ring falls on a speckled dark patch; scattered bright dots around it, none unambiguous (the A17 frame is a heavy contrast stretch). Not annotated.
- HELD SEP transmitter (sep): HELD: ring sits on a crossing of rover tracks; the SEP is a small object and nothing identifiable is resolved. Position-only, one source, not verifiable by eye. Not annotated.
- DROPPED Flag: LROC layer position; nothing resolvable.

Check images: `static/images/_staging/apollo-annotations/apollo17.jpg` (all computed rings, r = 9 px) and per-object 3x side-by-side crops `apollo17-<Object>.jpg` (plain | ringed).

## Verification by eye (what the rings showed)

- Hit: A11 LM, PSEP, LRRR; A12 LM, ALSEP, Surveyor 3; A15 LM, ALSEP, LRV; A16 LM, ALSEP, LRV; A17 LM, LRV. Residual ring-to-object offsets are under about 3 m (a few px).
- Did not hit, moved to HELD: A14 ALSEP (4-5 m from the one bright dot), A17 ALSEP (nothing unambiguous), A17 SEP (nothing resolvable).
- Flags: nothing resolvable at 0.4-0.5 m/px in these frames; the LROC layer gives positions only. Plaques: no source position, not resolvable.

## NOT verified / NOT done

- Object identification is by LROC's own coordinates plus my reading of 3x crops. I did not open any LROC annotated image of these exact frames; no source labels objects in these frames themselves (the Site Images pages give only the LM pixel). The "same frame" part of the hard rule is met through LROC coordinates measured on these same observations (Wagner et al. 2016 uses several NAC frames per site, not necessarily these), not through arrows on these frames.
- LM pixel positions (the origin for every offset) are eye estimates, +/-2 px (about 1 m); not measured by a centroid fit (an automatic centroid was tried and disagreed with the eye at Apollo 14, 16 and 17, so it was not used).
- The A14 frame is slewed 23.6 deg and the A17 image is a heavy contrast stretch; both degrade the check.
- NSSDCA agreement is area-level only (10-20 m for A11, A12, A16); only A15 is identical to LROC. For Surveyor 3, NSSDCA repeats the LROC numbers.
- Explanation texts use only the fetched pages plus generic mission facts (Apollo 15 first LRV, LMs left on the Moon, A17 last crewed landing); no dimensions or masses. Not checked against a NASA mission page beyond the NSSDCA pages.
- LRV is "as left", not confirmed as the final parking spot by a source; LROC lists one LRV position per site.
- Not run: any in-app render, `validate-data`, i18n of labels and explanations (English only).
- Label length: all labels are 28 characters or fewer (longest "Laser retroreflector (LRRR)", 27).
