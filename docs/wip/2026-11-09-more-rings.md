# More annotation rings for the Moon close-up patches - candidates

Date: 2026-11-09. Draft only: `static/data` and `src/` untouched. Data: `docs/wip/2026-11-09-more-rings.json` (only the NEW rings; shape of the earlier jsons plus `kind`, `position_source`, `r_m` for areas). Check images (gitignored): `static/images/_staging/more-rings/<site>.jpg` (existing rings cyan, new object yellow, feature orange, area magenta with the suggested radius; all 17 Moon patches, including those with no new ring). Earlier research: `2026-11-09-apollo-annotations.md`, `2026-11-09-moon-robotic-annotations.md`.

## Result

New rings: **14 objects, 13 features, 19 areas = 46**.

| Site | Objects | Features | Areas | Notes |
|---|---|---|---|---|
| apollo11 | 2 | 2 | 2 | flag, TV, Little West, Double, footpath to Little West, blast zone |
| apollo12 | 2 | 4 | 2 | flag, seismometer (3 m from ALSEP), Surveyor/Head/Bench/Block craters, ALSEP footpaths, blast zone |
| apollo14 | 3 | 1 | 2 | ALSEP, seismometer, flag, Triplet craters, footpaths, blast zone |
| apollo15 | 2 | 0 | 3 | seismometer, flag, ALSEP footpaths, LRV track, blast zone |
| apollo16 | 2 | 1 | 3 | seismometer, flag, Spot crater, ALSEP footpaths, LRV track, blast zone |
| apollo17 | 3 | 3 | 3 | ALSEP, SEP, flag, Rudolph/Poppie/Barjea, geophone paths, SEP rover tracks, blast zone |
| luna17 | 0 | 0 | 2 | blast zone, Lunokhod 1 tracks |
| luna21 | 0 | 0 | 1 | blast zone |
| luna24 | 0 | 1 | 0 | 60 m crater |
| change3 | 0 | 1 | 1 | 450 m crater, blast zone |
| luna16, change4, change5, change6, chandrayaan3, slim, beresheet | 0 | 0 | 0 | nothing new passed (see Dropped) |

## Method

1. Objects (A): LROC coordinates from the 2016 table (`2016_LROC_Coordinates_of_Human_Features.pdf`) and the Featured Sites hardware geojsons `luna_apollo_NN_hardware` (fetched: Landing Module, Seismometer, ALSEP, LRRR, LRV, SEP, Flag, TV, Magnetometer; the flag and TV points are in the layer only, not the 2016 table). Offsets = (object - LM) in metres (equirectangular, R = 1737.4 km) added to the existing LM ring's offset from the patch centre, so the shared registration error of the frame cancels. Patch scale = `hotspot_tier2_ground_m`/2048 (0.40 m/px Apollo 11/12/15/16, 0.45 Apollo 14, 0.50 Apollo 17, 0.137 Luna 17/21/24, 0.428 Chang'e 3).
2. Features (B): crater labels from the Featured Sites nomenclature layer (`luna_nomenclature.geojson`); EVA traverse layers (`luna_apollo_NN_eva1/2/3`) and `luna_apollo_11_traverse` for footpath corridors; LROC post text for the blast zones and the Luna 24 and Chang'e 3 craters. A label point was moved to the visible crater centre only where it was well off (Head, Bench, Triplet; recorded as `lroc_label_offset_m`).
3. Area rings (footpaths, rover tracks, blast zones) are a centre plus a suggested radius `r_m` read off the image; they are not points. Where an area ring is centred on the object it describes (blast zone on the LM), the app will draw two rings on one spot.
4. Every ring (existing + new) was drawn on a copy of its patch and looked at in 3 to 5 crops per Apollo site and one or two per robotic site. Rings were dropped when the point had no visible match and the source says there should be one (see Dropped).

## Blast zones - what the sources say

LROC post 363 ("On the rim!"): the descent engine produced a distinct bright halo at all the landing sites, most likely by blowing the finest particles away from below the engine. A search snippet of Clegg-Watkins et al. 2017 gives an average area of increased reflectance of 23,800 m2 at the Apollo sites (equivalent circle radius about 87 m); Apollo 12 excluded because Surveyor crater enlarged it, Apollo 17 has a lobe that may mark the descent path. The 87 m radius is used only where the image shows a halo of that size (Apollo 14, 16, 17); Apollo 11 (60 m), 12 (80 m, rough), 15 (75 m lobe, offset), Luna 17 (25 m), Luna 21 (16 m, LROC says 10 to 20 m) are read off the image. Chang'e 3 (LROC post 929: diffuse zone 40-50 m N-S, 10-15 m E-W beyond the focused zone) is not visible at 78 deg incidence. Apollo 12 is the weakest: the bright ground is stretched toward Surveyor crater and the ring is a rough guide.

## New rings (full strings in the json)

Columns: id, label / short, kind, offset from patch centre E, N (m), px, py, position source, confidence, sources. Explanation text is in the json.

### apollo11 (m/px 0.4)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| flag | US flag (LROC position) / US flag | object | -12.9, 10.2 | 992, 999 | LROC coordinates | low: LROC hardware-layer point (no uncertainty given, not in the 2016 table); the flag is not resolvable at 0.4 m/px | https://lroc.im-ldi.com/geojson/luna_apollo_11_hardware.geojson |
| tv | TV camera (LROC position) / TV camera | object | -18.8, 22.1 | 977, 969 | LROC coordinates | low: LROC hardware-layer point (no uncertainty given); nothing resolvable at the point | https://lroc.im-ldi.com/geojson/luna_apollo_11_hardware.geojson |
| little-west | Little West crater / Little West | feature | 73.8, 7 | 1209, 1007 | LROC label (Featured Sites nomenclature layer) | medium: label point sits on the crater (dark shadowed floor, bright rim) in the image | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson<br>https://lroc.im-ldi.com/images/65 |
| double | Double crater / Double crater | feature | -14.1, -8.1 | 989, 1044 | LROC label (Featured Sites nomenclature layer) | low: label point 17 m south-west of the Lunar Module; a crater is nearby but the ring is not clearly centred on one | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| footpath-little-west | Footpath toward Little West / Footpath | area (r 22 m) | 37, -6 | 1117, 1039 | LROC Apollo 11 traverse layer + visible line in the image | medium: a faint dark line east of the Lunar Module lies inside the ring; centre point of an area about 45 m across | https://lroc.im-ldi.com/geojson/luna_apollo_11_traverse.geojson<br>https://lroc.im-ldi.com/images/65 |
| blast | LM descent-engine blast zone / Blast zone | area (r 60 m) | -0.8, 2.8 | 1022, 1017 | LROC halo description + visible bright halo centred on the LM | medium: the bright halo around the Lunar Module is visible; ring radius 60 m is read off the image (an irregular area, not a circle) | https://lroc.im-ldi.com/posts/363<br>Clegg-Watkins et al. 2017, Icarus (LROC blast-zone photometry; average area of increased reflectance at the Apollo sites 23,800 m2 excluding Apollo 12; seen in a search snippet only, paper not opened) |

### apollo12 (m/px 0.4)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| flag | US flag (LROC position) / US flag | object | -5.5, 14.7 | 1010, 987 | LROC coordinates | low: LROC hardware-layer point (no uncertainty given); the flag is not resolvable | https://lroc.im-ldi.com/geojson/luna_apollo_12_hardware.geojson |
| seismometer | Passive seismometer (LROC) / Seismometer | object | -87.8, 88.4 | 805, 803 | LROC coordinates (PSE, 2016 table +/-2.6 m) | medium: 3 m from the ALSEP ring (rings overlap); the central-station cluster and its trails are visible | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_12_hardware.geojson |
| surveyor-crater | Surveyor crater / Surveyor crater | feature | 58.1, -97.7 | 1169, 1268 | LROC label (Featured Sites nomenclature layer) | medium: label point is inside the ~100 m crater south-east of the LM; Surveyor 3 lies on its east side | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson<br>https://lroc.im-ldi.com/posts/141 |
| head | Head crater / Head crater | feature | -123, -32 | 717, 1104 | LROC label, moved by eye | low: label point (148 m west of the LM) sits on the edge of the large shadowed crater at the left of the frame; ring moved 24 m to the visible crater centre | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| bench | Bench crater / Bench crater | feature | -258, -212 | 379, 1554 | LROC label, moved by eye | low: label point 320 m south-west of the LM; the crater is at the lower-left corner of the frame, ring moved 20 m to its visible centre | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| block | Block crater / Block crater | feature | 112.6, -18.9 | 1306, 1071 | LROC label (Featured Sites nomenclature layer) | medium: ring sits on a small bright-rimmed crater with a boulder, 113 m east of the LM | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| footpath-alsep | Footpaths to the ALSEP / ALSEP footpaths | area (r 45 m) | -59, 53 | 877, 892 | LROC EVA 1 traverse layer (luna_apollo_12_eva1) + visible dark trails | medium: dark trails run from the LM area to the ALSEP cluster inside the ring (area about 90 m across) | https://lroc.im-ldi.com/geojson/luna_apollo_12_eva1.geojson |
| blast | LM blast zone / Blast zone | area (r 80 m) | 0, -0.4 | 1024, 1025 | LROC halo description; centred on the LM | low: the bright zone around the LM is big and lopsided because Surveyor crater brightens it; centre and 80 m radius are approximate | https://lroc.im-ldi.com/posts/363<br>Clegg-Watkins et al. 2017, Icarus (LROC blast-zone photometry; average area of increased reflectance at the Apollo sites 23,800 m2 excluding Apollo 12; seen in a search snippet only, paper not opened) |

### apollo14 (m/px 0.45)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| alsep | ALSEP central station / ALSEP | object | -175.5, 48.4 | 634, 916 | LROC coordinates (ALSEP, 2016 table +/-0.4 m) | high: dark equipment spot with trails east of it lies under the ring | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_14_hardware.geojson<br>https://phys.org/news/2011-02-lro-apollo-crew-majestic-view.html |
| seismometer | Passive seismometer (LROC) / Seismometer | object | -175.2, 51.8 | 635, 909 | LROC coordinates (PSE, 2016 table +/-0.4 m) | medium: 3.4 m from the ALSEP ring (rings overlap) | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_14_hardware.geojson |
| flag | US flag (LROC position) / US flag | object | -9.3, 3.1 | 1003, 1017 | LROC coordinates | low: LROC hardware-layer point (no uncertainty given); not resolvable | https://lroc.im-ldi.com/geojson/luna_apollo_14_hardware.geojson |
| triplet-craters | Triplet craters / Triplet craters | feature | 127, -138 | 1306, 1331 | LROC label (Triplet / Center Crater), moved by eye 14 m | medium: ring sits on the middle crater of the bright three-crater group south-east of the LM | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| footpaths | Footpaths around the ALSEP / ALSEP footpaths | area (r 60 m) | -117, 34 | 764, 948 | LROC EVA 1 traverse layer (luna_apollo_14_eva1) + visible dark trails | high: trails east of the ALSEP lie under the ring (area about 120 m across) | https://lroc.im-ldi.com/geojson/luna_apollo_14_eva1.geojson<br>https://phys.org/news/2011-02-lro-apollo-crew-majestic-view.html |
| blast | LM blast zone / Blast zone | area (r 87 m) | -1.8, -3.1 | 1020, 1031 | LROC halo description + visible halo centred on the LM | medium: a faint bright halo around the LM matches the 87 m radius | https://lroc.im-ldi.com/posts/363<br>Clegg-Watkins et al. 2017, Icarus (LROC blast-zone photometry; average area of increased reflectance at the Apollo sites 23,800 m2 excluding Apollo 12; seen in a search snippet only, paper not opened) |

### apollo15 (m/px 0.4)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| seismometer | Passive seismometer (LROC) / Seismometer | object | -96.9, 48.6 | 782, 903 | LROC coordinates (PSE, 2016 table +/-0.3 m) | medium: 3.4 m from the ALSEP ring (rings overlap); dark cluster with trails is visible | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_15_hardware.geojson |
| flag | US flag (LROC position) / US flag | object | 0.5, 8.9 | 1025, 1002 | LROC coordinates | low: LROC hardware-layer point (no uncertainty given); not resolvable | https://lroc.im-ldi.com/geojson/luna_apollo_15_hardware.geojson |
| footpath-alsep | Footpaths to the ALSEP / ALSEP footpaths | area (r 35 m) | -41, 15 | 922, 987 | Visible dark trails + LROC EVA traverse layers | medium: dense dark trails between the LM and the ALSEP cluster lie under the ring (area about 70 m across) | https://lroc.im-ldi.com/geojson/luna_apollo_15_eva1.geojson |
| lrv-track | Rover track to the LRV / Rover track | area (r 55 m) | 64, -20 | 1184, 1074 | Visible track + LROC LRV point | medium: a single dark line runs from the LM east to the LRV; ring centred on its middle (area about 110 m long) | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_15_hardware.geojson |
| blast | LM blast zone / Blast zone | area (r 75 m) | 11, -42 | 1052, 1129 | LROC halo description + visible lobe south-south-east of the LM | medium: the bright lobe is off-centre (centre about 40 m south-south-east of the LM, radius 75 m by eye) | https://lroc.im-ldi.com/posts/363<br>Clegg-Watkins et al. 2017, Icarus (LROC blast-zone photometry; average area of increased reflectance at the Apollo sites 23,800 m2 excluding Apollo 12; seen in a search snippet only, paper not opened) |

### apollo16 (m/px 0.4)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| seismometer | Passive seismometer (LROC) / Seismometer | object | -70.7, -73.7 | 847, 1208 | LROC coordinates (PSE, 2016 table +/-2.5 m) | medium: 1.8 m from the ALSEP ring (rings nearly coincide) | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_16_hardware.geojson |
| flag | US flag (LROC position) / US flag | object | -7.8, 17.1 | 1005, 981 | LROC coordinates | low: LROC hardware-layer point (no uncertainty given); not resolvable | https://lroc.im-ldi.com/geojson/luna_apollo_16_hardware.geojson |
| spot-crater | Spot crater / Spot crater | feature | 39.2, -300.4 | 1122, 1775 | LROC label (Featured Sites nomenclature layer) | low: label point 300 m south of the LM sits on the east side of a shallow eroded crater with a bright west half | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| footpath-alsep | Footpaths to the ALSEP / ALSEP footpaths | area (r 45 m) | -40, -26 | 924, 1089 | Visible dark trails + LROC EVA traverse layers | medium: dark trails between the LM and the ALSEP lie under the ring (area about 90 m across) | https://lroc.im-ldi.com/geojson/luna_apollo_16_eva1.geojson |
| lrv-track | Rover track to the LRV / Rover track | area (r 40 m) | 42, 15 | 1129, 987 | Visible tracks + LROC LRV point | medium: dark tracks run from the LM east to the LRV; ring centred on them (area about 80 m long) | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_16_hardware.geojson |
| blast | LM blast zone / Blast zone | area (r 87 m) | 2.4, 1.2 | 1030, 1021 | LROC halo description + visible bright halo centred on the LM | high: the bright halo around the LM matches the 87 m radius | https://lroc.im-ldi.com/posts/363<br>Clegg-Watkins et al. 2017, Icarus (LROC blast-zone photometry; average area of increased reflectance at the Apollo sites 23,800 m2 excluding Apollo 12; seen in a search snippet only, paper not opened) |

### apollo17 (m/px 0.5)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| alsep | ALSEP central station / ALSEP | object | -189.5, 24.9 | 645, 974 | LROC coordinates (ALSEP, 2016 table +/-3.5 m) | high: dark equipment spot with a cross of trails lies under the ring | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_17_hardware.geojson<br>https://lroc.im-ldi.com/posts/72 |
| sep | SEP transmitter / SEP transmitter | object | 131.5, 15.8 | 1287, 992 | LROC coordinates (SEP, 2016 table +/-3.7 m) | high: ring sits on the dark spot at the end of the tracks east of the LM | https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf<br>https://lroc.im-ldi.com/geojson/luna_apollo_17_hardware.geojson<br>https://lroc.im-ldi.com/posts/72 |
| flag | US flag (LROC position) / US flag | object | -2.9, 9.3 | 1018, 1005 | LROC coordinates | low: LROC hardware-layer point (no uncertainty given); not resolvable at 0.5 m/px | https://lroc.im-ldi.com/geojson/luna_apollo_17_hardware.geojson |
| rudolph | Rudolph crater / Rudolph crater | feature | -248.7, 132.2 | 527, 760 | LROC label (Featured Sites nomenclature layer) | medium: ring sits on the bright-rimmed crater with a dark floor north-west of the LM | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| poppie | Poppie crater / Poppie crater | feature | -4, -113.4 | 1016, 1251 | LROC label (Featured Sites nomenclature layer) | medium: ring sits on a small dark crater 100 m south of the LM | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| barjea | Barjea crater / Barjea crater | feature | 124.1, -189.2 | 1272, 1402 | LROC label (Featured Sites nomenclature layer) | high: ring sits on a small bright-rimmed crater | https://lroc.im-ldi.com/geojson/luna_nomenclature.geojson |
| geophone-paths | Geophone footpaths / Geophone paths | area (r 45 m) | -132, -8 | 760, 1040 | LROC image text + visible cross of trails | high: the cross-shaped trail LROC describes west of the landing site lies under the ring | https://lroc.im-ldi.com/posts/72 |
| sep-rover-tracks | Rover tracks to the SEP site / SEP tracks | area (r 35 m) | 68, 2 | 1160, 1020 | LROC image text + visible tracks | high: dark tracks run from the LM area east to the SEP spot inside the ring | https://lroc.im-ldi.com/posts/72 |
| blast | LM blast zone / Blast zone | area (r 87 m) | 4, -11.5 | 1032, 1047 | LROC halo description + visible bright halo centred on the LM | high: bright halo around the LM matches the 87 m radius; LROC notes a lobe that may mark the descent path | https://lroc.im-ldi.com/posts/363<br>Clegg-Watkins et al. 2017, Icarus (LROC blast-zone photometry; average area of increased reflectance at the Apollo sites 23,800 m2 excluding Apollo 12; seen in a search snippet only, paper not opened)<br>https://lroc.im-ldi.com/posts/363 |

### luna17 (m/px 0.1372)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| blast | Luna 17 blast zone / Blast zone | area (r 25 m) | 4, 6 | 1053, 980 | LROC post 402 text + visible bright halo | high: bright halo around the lander lies under the ring (radius 25 m by eye) | https://lroc.im-ldi.com/images/402<br>https://lroc.im-ldi.com/images/11 |
| tracks | Lunokhod 1 tracks / Rover tracks | area (r 20 m) | 10, -5 | 1097, 1060 | LROC posts 402 / 11 text + visible tracks | high: dark loops and tracks around the lander lie under the ring (area about 40 m across) | https://lroc.im-ldi.com/images/402<br>https://lroc.im-ldi.com/images/11 |

### luna21 (m/px 0.1372)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| blast | Luna 21 blast zone / Blast zone | area (r 16 m) | -7, 6 | 973, 980 | LROC post 15 text + visible bright zone | high: the bright zone west of the lander lies under the ring (radius 16 m by eye) | https://lroc.im-ldi.com/images/15 |

### luna24 (m/px 0.1372)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| crater-60m | 60 m crater at Luna 24 / 60 m crater | feature | 20, -35 | 1170, 1279 | LROC post 9 text + crater centre by eye (no coordinate) | medium: the lander is at the north-west rim of a crater about 55-60 m across; ring at the visible crater centre | https://lroc.im-ldi.com/images/9 |

### change3 (m/px 0.4278)

| id | label / short | kind | E, N (m) | px, py | position source | confidence | sources |
|---|---|---|---|---|---|---|---|
| crater-450m | 450 m crater west of lander / 450 m crater | feature | -283, 48 | 363, 912 | LROC post 637 text (rim 60 m west of the lander, diameter 450 m) + crater centre by eye | medium: bright inner east wall and dark floor visible at the position; centre derived, not an LROC coordinate | https://lroc.im-ldi.com/images/637<br>https://lroc.im-ldi.com/images/929 |
| blast | Chang'e 3 blast zone / Blast zone | area (r 30 m) | 3, 48.3 | 1031, 911 | LROC post 929 text; centred on the lander ring (not visible at this Sun angle) | low: elongated roughly north-south; not distinguishable at 78 deg incidence, so the ring cannot be checked against the image | https://lroc.im-ldi.com/images/929 |

## Dropped or held (with why)

| Site | Item | Why |
|---|---|---|
| apollo12 | snowman | DROPPED: LROC label point lies on the Surveyor crater slope; no crater visible there |
| apollo12 | tri-pt/dos/small/halo/bright-crater/middle-crescent/left-foot/right-foot/sharp-apollo | DROPPED: other nomenclature labels inside the patch; not checked one by one against the image (named-crater list limited to ones verified by eye) |
| apollo12 | eva-stops-1-17 | HELD: LROC EVA stop points (23 inside the patch) carry no names in the layer; not drawn |
| apollo14 | magnetometer | DROPPED: LROC layer point 1.3 km east of the LM, outside the 920 m patch |
| apollo14 | north-crater | DROPPED: label point on bright ejecta, no crater visible at it |
| apollo14 | doublet | DROPPED: label point at the left edge of the patch, crater only partly in frame and ring would be 20 m off its visible centre |
| apollo14 | weird / weird-rock / south-apollo-crater | DROPPED: not checked against the image (weird-rock is a boulder label); left out |
| apollo14 | eva2-stations-a-b-f-g-g1-h | HELD: named EVA 2 stations inside the patch (LROC layer luna_apollo_14_eva2stops); not requested as rings |
| apollo15 | last-crater | DROPPED: label point 40 m from the nearest visible crater, no crater under the ring |
| apollo15 | station-8-vip-site | HELD: LROC eva3stops labels; VIP Site coincides with the existing LRV ring |
| apollo16 | eva1stops station 2 | DROPPED: outside the patch (795 m west) |
| luna17 | lunokhod1 traverse stops 1 and 3 | DROPPED: inside the patch (LROC layer luna_lunokhod1_traverse_stops: 118 m S / 98 E and 52 N / 10 E of the lander) but what a "stop" marks is not stated in the layer; not drawn |
| luna17 | Lunokhod 1 final parking spot | DROPPED: 8.6 km from the lander, outside the patch |
| luna21 | Lunokhod 2 tracks and the International Women's Day circles | DROPPED: tracks not distinguishable in the patch; LROC post 15 gives no position for the circles |
| luna21 | Lunokhod 2 final / traverse stops | DROPPED: 0.8 km or more from the lander, outside the patch |
| luna24 | bright specks | DROPPED: LROC post 9 says they "may be" debris from the ascent stage; not an identified object |
| change3 | Yutu | DROPPED: LROC 2016 table: Yutu 21 m SW (about 11 m W, 18 m S) of the lander, +/-13 m. The only other bright pixel in the patch is 46 m south of the lander ring with no long shadow: 25 m off the table position and outside its uncertainty. Not placed. |
| luna16 | (nothing new) | DROPPED: LROC post 10 and the 2016 table give only the descent stage; no blast zone size or other feature stated |
| change4 | (nothing new) | DROPPED: lander (LROC nomenclature "Statio Tianhe", same point as the existing lander ring) and Yutu-2 rings already exist; no Yutu-2 track visible; Zhinyu, Hegu, Tianjin and Von Karman craters are 1 km or more away |
| change5 | blast zone | DROPPED: LROC posts 1172/1186 give no blast zone extent and none is visible at 47 deg incidence; baked-in LROC box and label already mark the lander |
| change6 | (nothing new) | DROPPED: LROC post 1374 names only the lander |
| chandrayaan3 | Pragyan | DROPPED: LROC post 1314 does not mention the rover; ISRO route reports (about 100 m of driving, 39 m west of the lander at one point) are not tied to this frame date (2023-08-27) and the rover would be about 1 px at 0.85 m/px |
| slim | LEV-1 / LEV-2 | DROPPED: LROC post 1358 does not mention them; no JAXA or LROC source found that places them in this frame (JAXA press PDF could not be read) |

## Findings that matter for wiring

- Chang'e 3: the patch centre equals LROC's lander coordinate (44.1214 N, 340.4884 E), but the existing lander ring sits on the bright dot with the long shadow 48 m north of the centre; a second, shadow-less bright dot sits almost exactly on the centre (7 px east, 2 px south). The ring was matched to the shadowed dot by pattern (earlier doc, "medium"); this pass cannot settle which dot is the lander. If the frame's registration is good to a few metres the centre dot would be the lander; LROC's own text (post 637) calls the rover "two bright pixels" without positions. Not changed, flagged.
- Seismometer (PSE) rings sit 1.8 to 3.4 m from the ALSEP rings at Apollo 12, 14, 15, 16 and will overlap; the operator can drop them or merge into the ALSEP ring.
- Apollo 14 ALSEP and Apollo 17 ALSEP/SEP were "held" in the first pass because LROC had no caption; here they are drawn from the LROC coordinates and all three show dark equipment under the ring, so confidence is high rather than coordinate-only.

## NOT verified / NOT done

- No second agency source beyond LROC for any ring; the Clegg-Watkins area figure was seen in a search snippet only (the paper was not opened); the LROC post 141 / NSSDCA numbers were reused from the earlier pass, not re-read.
- Seven of the 14 object rings (six flags, the Apollo 11 TV camera) have no visible hardware at the point; they are LROC coordinates only by the operator's decision, confidence low or medium as stated.
- Crater labels from the nomenclature layer: LROC publishes only a point per name, no diameter. I did not check the IAU/LROC name list elsewhere; "Double", "Head", "Bench", "Spot" are Apollo-era informal names and their meaning is not stated in the layer.
- Footpath and rover-track areas: radius and centre are by eye; I did not compare against the traverse line geometry beyond centroid checks (A11 213 path points inside the patch, bbox 77 x 55 m).
- EVA stops (A12 23, A14 six named, A15 two) and Lunokhod 1 stops 1 and 3 were not turned into rings.
- Other nomenclature labels inside the Apollo 12 and 14 patches (Tri Pt, Dos, Small, Halo, Bright crater, Weird, South-Apollo, Left/Right Foot...) were not individually checked on the image.
- The Chang'e 5 blast zone, Pragyan, SLIM LEV-1/LEV-2, Yutu (Chang'e 3), Lunokhod 2 tracks and the Women's Day circles were searched for, not found in LROC/ISRO/JAXA text as geolocated in these frames. The JAXA SLIM press-briefing PDF could not be parsed by the fetch tool.
- Web searches used: 7 of 15; LROC images/posts read through WebFetch.
- No in-app render, no validate-data, no i18n of labels or explanations (English only); label lengths checked by the generator (all labels <= 28, short <= 16).
