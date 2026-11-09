# More annotation rings for the Mars close-up patches - research

Date: 2026-11-09. Research only: `static/data`, `src/` and the images untouched. Mirrors `2026-11-09-more-rings.md` (Moon). First Mars pass: `2026-11-09-mars-annotations.md`. Scratch work (windows, cut-outs, registration logs) is outside the repo.

Rule applied (operator): a ring only where an authoritative source places the object in THAT exact image (HiRISE caption or labelled cut-out of the same product, NASA/JPL page, mission-team map, published coordinates). Where the position comes from coordinates only, that is written as "position from coordinates" and the ring would mark a place, not a visible object.

## Result

Nothing here is wired. 8 candidates in the current patches, plus the re-cut plan for Perseverance and Curiosity.

| Site | Ring kind | Candidate | Confidence | Verdict |
|---|---|---|---|---|
| spirit | crater ring | Sleepy Hollow | high | recommend |
| opportunity | crater ring | Eagle Crater | high | recommend |
| phoenix | hardware | heat shield impact | medium-high | recommend (needs a decision on the patch rotation, see Findings) |
| spirit | crater ring (partial) | Bonneville Crater rim | low | hold (crater is mostly outside) |
| viking1-lander | hardware | lander at the patch centre | low-medium | hold (label found, registration failed) |
| insight | dashed area (true size) | Homestead hollow, 27 m | low | hold (centre not placed) |
| perseverance | position from coordinates | landing position | medium | needs re-cut first (18 m outside the current patch) |
| curiosity | position from coordinates | Bradbury Landing | medium | recommend only as a coordinate note (nothing visible) |

Counts by kind: crater ring 3 (one partial), hardware 2, dashed area 1 (+ 2 more only after re-cut: Perseverance and Curiosity blast zones), position from coordinates 2.

## Registration methods used (and what failed)

- M1 - same-product visual match: the labelled HiRISE cut-out shows the object next to a feature that is also in our patch (crater, halo); the patch is the same product (Spirit, Opportunity) or the feature is the lander itself (Phoenix). Checked by looking at both at full resolution.
- M2 - geometry check: the relative position of two objects in the cut-out (distance ratio, angle between them) is compared with the same two objects found in a window cut from the patch's own raster (Phoenix).
- M3 - NCC (normalised cross-correlation, high-pass, rotations in 15 degree steps, scales 0.5 / 0.78 / 1.0 and 0.25 m/px): FAILED for Viking 1 (best 0.055) and Pathfinder (best 0.041), same outcome as the first pass; for Beagle 2 (template = cut-out inside the patch, different product) best 0.19. Noise level, nothing registered by M3.
- Tools: `static/images/hotspots/mars/<site>/tier2-hirise.jpg`, the cached HiRISE JP2s in `.image-cache/hotspots/raw` (read only), the RDR cumulative index `.image-cache/hirise/RDRCUMINDEX.TAB` (complete, 168 MB) for the product lists.

## Per-site tables

Offsets are metres east / north of the patch centre (= site point in `mars-sites.json`). Patch half-width is 256 m. Labels are <= 28 / <= 16 characters (checked by eye).

### spirit (patch PSP_001513_1655, 2006-11-22, 0.25 m/px, north-up)

| id | label / short | kind | offset E, N | source | verification | confidence |
|---|---|---|---|---|---|---|
| sleepy-hollow | Sleepy Hollow crater / Sleepy Hollow | crater ring, r about 9 m | -11, +7 | HiRISE PSP_001513_1655 page: lander (area B) is beside the crater "Sleepy Hollow", which lies just north-west of it (https://www.uahirise.org/PSP_001513_1655) | M1: at the lander (bright object at the patch centre) a small bowl-shaped crater sits directly west-north-west; centre read at about -12 E, +7.5 N from the lander, diameter about 16-20 m by eye. The existing lander ring text already uses the same caption ("beside Sleepy Hollow, crater to the north-west"). | high |
| bonneville-rim | Bonneville crater rim / Bonneville rim | crater ring (partial, arc only) | +205, +190 (the sol-66 rim stop) | HiRISE page names Bonneville Crater; rim stop from the mission traverse in the repo (`static/data/mars-traverses/spirit.json`, stop "Bonneville Crater rim", sol 66) | The patch shows the crater's shadowed wall in the north-east corner (about +190..+256 E, +160..+256 N). Crater centre is about 420 m north-east of the lander (read off the labelled overview PSP_001513_1655_cut_b, scale from crater size, rough), so a full circle is outside; the 210 m diameter I had in mind is NOT sourced here. | low |

Not placed: parachute and backshell (area A) and heat shield (area C) are named in the caption; the cut-out boxes a, b, c, d carry letters only and no scale; not measured.

### opportunity (patch ESP_050177_1780, 2017-04-10, 0.25 m/px, north-up)

| id | label / short | kind | offset E, N | source | verification | confidence |
|---|---|---|---|---|---|---|
| eagle-crater | Eagle Crater / Eagle Crater | crater ring, r about 11 m | 0, 0 (concentric with the lander ring) | HiRISE ESP_050177_1780: "the lander rests at the center of Eagle Crater's bowl"; the existing ring text cites PIA21494 for the 22 m size (PIA21494 itself not re-read in this pass) | M1: the bright-rimmed crater with a dark floor and the lander dot is at the patch centre; the labelled 2006 cut-out (PSP_001414_1780) shows the same crater with "Opportunity Lander" arrowed. | high |

Seen but not named by any source: a second small crater about 230 m west-south-west (-222, -57), also visible in the 2006 labelled image; a dark smudge 140 m west. Not ringed.

### phoenix (patch PSP_008591_2485, 2008-05-26, polar-stereographic raster, NOT north-up)

| id | label / short | kind | offset (patch frame x right, y up) | offset (true E, N) | source | verification | confidence |
|---|---|---|---|---|---|---|---|
| heat-shield | Heat shield impact / Heat shield | hardware | -180, -92 | +180, -92 | HiRISE PSP_008591_2485 ("Phoenix Lander Hardware: EDL +22"): "the heat shield ... a dark marking, disturbance of the ground from impact and bouncing" (https://www.uahirise.org/PSP_008591_2485) and the cut-outs _cut_a / _cut_e of the same product | M2: in a 750 m window cut from this raster the dark blob with a tail at (-180, -92) is the nearest of two dark features; the second is a bright round object (parachute) beside a dark shadow with one bright dot (backshell) at (-344, +84), as in the cut-out. Lander-to-heat-shield versus lander-to-parachute distance ratio 1.6 in the raster against 1.9 in the cut-out, angle between them 44 versus 39 degrees. | medium-high |

Parachute and backshell are in the same product but 133 E, 328 S of the lander (true frame, from the same window): outside the patch (south 328 m > 256 m).

### viking1-lander (patch ESP_046170_2025, 2016-06-02, 0.25 m/px)

| id | label / short | kind | offset E, N | source | verification | confidence |
|---|---|---|---|---|---|---|
| lander | Viking 1 lander / Viking 1 lander | hardware | about 0, 0 | HiRISE ESP_046170_2025 caption: "Viking Lander 1 (VL1) and backshell", labelled cut-out in the same product | Not registered (M3 failed, best NCC 0.055). At 4x zoom the patch centre holds a pair of small bright dots with a shadow on the lip of a dark depression; in the cut-out the labelled lander is also a bright dot, but next to a larger dark area. I could not tie the two. | low-medium |

The backshell is in the cut-out; its distance from the lander is not measured (no scale on the cut-out).

### insight (patch ESP_087004_1845, 2025-02-16, 0.25 m/px)

| id | label / short | kind | offset E, N | source | verification | confidence |
|---|---|---|---|---|---|---|
| homestead-hollow | Homestead hollow / Homestead hollow | dashed area at true size, r 13.5 m | not placed (centre is south-east of the lander by up to about 10 m) | Search snippets of Grant et al. and Weitz et al., JGR Planets 2020: the lander sits in the north-west part of a degraded crater about 27 m across (25-27 m depending on the paper; papers at https://elib.dlr.de/139602/ and /139601/; not opened, the PDF was too large for the fetch tool) | The hollow is not resolved in this patch (zoomed on the lander: only the dark halo and the bright pair). No ring without a measured centre. | low |

Hardware in HiRISE ESP_058005_1845 (labelled overview with a 100 m bar), relative to the lander: heat shield 469 E, 178 N (502 m); backshell and parachute 133 E, 351 S (376 m). Outside the patch; they are in another product than the patch's.

### perseverance (see re-cut section)

| id | label / short | kind | offset E, N from the current patch centre | source | verification | confidence |
|---|---|---|---|---|---|---|
| landing | Octavia E. Butler Landing / Landing site | position from coordinates | +50, +274 (outside the patch: north half-width is 256) | first point of the rover team's traverse (MMGIS M20_traverse, `static/data/mars-traverses/perseverance.json`): 18.444627 N, 77.450886 E; HiRISE ESP_068294_1985 "Perseverance Hardware One Day after Landing" labels the rover at the centre of its blast pattern | Coordinates only. The current patch is the 2016 product ESP_046060 (pre-landing), so nothing is visible. The labelled 2021 product was not registered (JP2 download incomplete). | medium |
| blast-zones | Descent-stage blast zones / Blast zones | dashed area | not measured | HiRISE ESP_068360_1985 caption: "two bright zones cleared by descent stage rockets visible on either side of the rover" | would need the re-cut image | low |

Ingenuity: the repo traverse has a stop "Ingenuity Flight 1" (sol 58) at 8 E, 14 N of the landing point; that is the rover's parking place, not the helicopter or the airfield. The airfield map PIA24494 (JPL, 2021-03-23) marks landing site, airfield and flight zone on an unnamed HiRISE image and gives no coordinates or sizes (pds-rings page and JPL page read). Not ringed. Three Forks: not found in the repo stops and not searched; the only other stop within 1 km of the landing point is sol 190 at 899 m (366 W, 822 S of the landing).

### curiosity (see re-cut section)

| id | label / short | kind | offset E, N from the current patch centre | source | verification | confidence |
|---|---|---|---|---|---|---|
| bradbury-landing | Bradbury Landing / Bradbury Landing | position from coordinates | +96, +32 (inside the patch) | first point of the rover team's traverse (MMGIS MSL_traverse, `static/data/mars-traverses/curiosity.json`): -4.589467 N, 137.441633 E; the 2012 HiRISE products (ESP_028401_1755 etc.) show the rover at its landing spot | 2023 patch (ESP_078499_1755) windowed at that point: nothing visible there (no rover, no hardware, no distinct blast zone). A ring marks the place, not an object. | medium |
| blast-zone | Sky-crane blast zone / Blast zone | dashed area | not measured | HiRISE ESP_028335_1755 caption: "Descent Stage Blast Pattern clearly visible around the rover" (2012) | not visible in 2023; needs the 2012 re-cut | low |

### Sites with nothing recommended

| Site | What was checked | Result |
|---|---|---|
| beagle2 | patch ESP_040363_1915 ("Beagle 2 Lander Credible Candidate", 2015-03-07). The discovery products are ESP_030908, ESP_037145 and ESP_039308 (search results); labelled colour cut-out of ESP_039308_1915 with a 10 m bar | cut-out is a different product, 71 m wide; NCC against our patch best 0.19 (noise). No position in this patch. |
| mars3 | patch ESP_031036_1345 (the "possible Mars 3 lander" candidate product) | crowd-sourced candidates only; location uncertainty 10 km in the data; no authoritative position. |
| mars-pathfinder | PSP_001890_1995 caption and the labelled cut-outs (MPF, backshell/parachute, "Heatshield debris?") | M3 failed (best 0.041). Cut-out geometry (assuming 0.25 m/px, north-up, unverified): backshell and parachute about 53 E, 282 S of the lander, heat-shield debris farther. Big Crater is 3 km south, Little Crater and Rimshot Crater are on its north-west flank 2.2 km away (JPL PIA pages), Twin Peaks and North Knob are far: all outside. |
| viking2-lander | PSP_001501_2280 caption: lander precisely located, "likely locations found for the heat shield and backshell" | no cut-out file found on the page; no positions. |
| zhurong | ESP_069665_2055 caption and its three cut-outs: lander with blast pattern, rover "a bit to the south", parachute and backshell, heat shield | cut-outs carry no scale; distances not measured. Rover held (had driven off by the patch date). Repo traverse stops: "450 m due south" is 454 m away, outside. |
| schiaparelli | ESP_048120_1780 caption; JPL PIA21132 search snippet | parachute and backshell already ringed; the 2.4 m impact crater lies about 0.9 km north of them (JPL snippet) and the heat shield is farther: outside the patch. |

## Perseverance and Curiosity: re-cut recommendation

How the pipeline picks a product: `scripts/hotspots/fetch-mars.ts` reads `hotspot_tier2_force_product_id` from `static/data/surface-hotspots.json` and skips the catalog query; otherwise `hirise-catalog.ts` takes footprints containing the point and sorts by map scale, then incidence 30-60 degrees. The crop is 2048 px (512 m at 0.25 m/px) centred on the lat/lon in `mars-sites.json` (`gdal-crop.ts`, no rotation). Re-cut = set the force id, set the site point (below), run `npm run images:hotspots -- --site <id> --layer hirise`. Both sites then also need `hotspot_tier2_ground_m` re-read and the regional CTX layer left as is.

### Perseverance

- Today: 2016-05-24 product ESP_046060_1985, centred on 18.44 N 77.45 E, 278 m south-south-west of the team's landing point (see Findings). The landing point is 18 m outside the patch.
- Post-landing HiRISE products at the point (complete catalog scan, 25 products; all 0.25 m/px): ESP_068294_1985 (2021-02-19, one day after landing, incidence 45.8), ESP_068360_1985 (02-25, colour release, 45.99), ESP_068426_1985 (03-02, 46.2, frame centre 18.447 N 77.452 E), ESP_068822_1985 (04-01, "Rover and Ingenuity belly pan", 47.7), ESP_071077_1985 (2021-09-24, rover 700 m away), plus later ones.
- Recommended: **ESP_068294_1985**. Why: the HiRISE team labelled rover, descent stage, heat shield and parachute/backshell on exactly this product (release image `m2020-hardware-labels.jpg`, https://www.uahirise.org/ESP_068294_1985), the rover has not moved (first traverse point is at sol 13), and the blast pattern is one day old. Centre the patch on 18.444627 N, 77.450886 E (traverse start).
- Inside 512 m: rover and the blast pattern. Outside (ranges from the rover as given in the NASA Mars 2020 EDL reconstruction papers, Table 1, seen in a search snippet, https://ntrs.nasa.gov/api/citations/20210024320/downloads/MEADSreconstruction.pdf; bearings read from the labelled image assuming north-up): descent stage 669 m (about 319 degrees, NW), backshell and parachute 1129 m (about 301, WNW), heat shield 1467 m (about 70, ENE). The release says each inset is about 200 m across.
- A slightly larger crop does not help: the descent stage alone needs a half-width of 670 m, i.e. at least 1.35 km (5400 px at 0.25 m/px, or 2048 px at 0.66 m/px); all three need 3 km.
- Not done: no raster of the post-landing product was read (see NOT verified), so the rover pixel is not measured.

### Curiosity

- Today: ESP_078499_1755 (2023-04-25), centred on -4.59 N 137.44 E; the rover left in 2012, nothing of the landing is visible in the 2023 window. The team's landing point is 101 m east-north-east of the patch centre, inside the patch.
- Post-landing products at the point: 22, among them ESP_028269_1755 (2012-08-07, "Bits and Pieces", landing +1 day, sky-crane impact subimage), ESP_028335_1755 (08-12, colour, "descent stage blast pattern clearly visible around the rover"), ESP_028401_1755 (08-17, "Views of MSL Hardware 12 Days after Landing", about 0.27 m/px, labelled overview).
- Recommended: **ESP_028401_1755**. Why: the labelled overview of this product shows rover, descent-stage crash site, backshell and parachute, heat shield; the rover is still at the landing point on 2012-08-17 (sol 11; the traverse's sol-16 point is 6 m from the start, the first drive after landing is later). Centre on -4.589467 N 137.441633 E.
- Inside 512 m: rover and its blast fan (dark streaks, long axis about north-east to south-west in the cut-out). Outside, from the overview (200 m bar, rover box as origin; consistent with the earlier NASA release numbers 1.5 km / 615 m / 650 m): descent-stage crash site about 739 m (657 W, 338 N), backshell and parachute about 607 m (588 W, 151 S), heat shield about 1560 m (1478 E, 499 S), "2 new spots" about 940 m north-west, "new spot with streak" about 1.2 km west. A slightly larger crop reaching the backshell needs a half-width of 600 m (2400 px, 1.2 km); the descent stage 740 m; the heat shield is out of reach (1.6 km).

## Hardware just outside the 512 m patches

Distances from the site point (patch centre) unless noted; "crop" is the full width a square crop would need at 0.25 m/px to include it (2 x distance in the larger axis).

| Site | Object | Distance and direction | Source | Crop needed |
|---|---|---|---|---|
| phoenix | parachute and backshell | 353 m (133 E, 328 S) | window from PSP_008591 raster, M2 | 660 m (2640 px) |
| insight | backshell and parachute | 376 m (133 E, 351 S) | ESP_058005 labelled overview, 100 m bar | 710 m |
| insight | heat shield | 502 m (469 E, 178 N) | same | 940 m |
| opportunity | backshell and parachute | about 446 m (347 W, 281 S) | PSP_001414 labelled image, scale from a 200 m bar in a companion panel (assumed same field; rough) | 700 m |
| opportunity | heat shield impact | about 855 m (741 E, 426 S) | same | 1.5 km |
| opportunity | Endurance Crater (large crater east) | about 800 m east | same panel | 1.6 km |
| pathfinder | backshell and parachute | about 287 m (53 E, 282 S) | MPF_parts_2 cut-out, 0.25 m/px and north-up ASSUMED, not registered | 570 m |
| perseverance | descent stage | 669 m NW | NTRS table, bearing from labelled image | 1.35 km |
| perseverance | backshell and parachute | 1129 m WNW | same | 2.3 km |
| perseverance | heat shield | 1467 m ENE | same | 2.9 km |
| curiosity | backshell and parachute | about 607 m (588 W, 151 S) | ESP_028401 overview | 1.2 km |
| curiosity | descent-stage crash | about 739 m (657 W, 338 N) | same | 1.5 km |
| curiosity | heat shield | about 1560 m | same | 3.1 km |
| schiaparelli | impact crater (2.4 m) | about 0.9 km north of the backshell and parachute ring (JPL snippet) | PIA21132 / JPL pages | beyond 1.8 km |
| spirit | Bonneville Crater centre | about 420 m north-east | PSP_001513_1655_cut_b, rough | 0.9 km |

Not measured (no scale or no cut-out): zhurong parachute/backshell/heat shield, viking1 backshell, viking2 backshell and heat shield, spirit parachute/backshell/heat shield, beagle2 parachutes.

## Findings that matter for wiring

- The Perseverance and Curiosity site points are not the landing points: 278 m (Perseverance: +49.7 E, +273.7 N of the site point, sphere R = 3389.5 km) and 101 m (Curiosity: +96.3 E, +31.5 N). Computed from the first point of each mission-team traverse (MMGIS files, snapshot 2026-11-04), which is the team's localisation of the landed rover, not a direct measurement of the HiRISE pixel. No HiRISE-measured rover pixel was obtained (download did not finish, see NOT verified). The HiRISE page centre for ESP_068360_1985 (18.442 N, 77.452 E) is 167 m from the Perseverance traverse start and is a frame centre, not a rover measurement.
- Phoenix: the patch is cut from a polar-stereographic raster without rotation, so image-up is not north. At the lander, true north points 35.8 degrees below image-right (right 198, down 143 per 0.001 deg); the patch is turned about 54 degrees against a north-up patch. Any ring at an offset other than (0, 0) needs this: I checked that heat shield at image (-180, -92) is true (+180 E, -92 N). Whether the app draws the patch rotated, and whether `lat_offset_m` / `lon_offset_m` would be converted, was NOT checked. The same raster type is used by no other Mars site (the others are equirectangular: north vector pointing straight up at Curiosity, Spirit and InSight in my check).
- Opportunity: the Eagle Crater ring would sit exactly under the existing lander ring; the label must differ ("Eagle Crater" vs "Lander in Eagle Crater") or the two should merge.

## Dropped candidates (reasons)

| Item | Why |
|---|---|
| Opportunity "first bounce / effects of rocket firing" circle, r about 70 m, 103 E, 201 S of the lander | labelled "No Longer Visible" in the 2006 HiRISE image and not visible in 2017 |
| Opportunity second crater (-222, -57) and smudge | no source names or places them |
| Perseverance Ingenuity airfield / flight zone | no coordinates or sizes in the PIA24494 caption; product not named |
| Perseverance Three Forks depot | not in the repo stops, not searched, no source read |
| Curiosity John Klein / Yellowknife Bay | repo stop "John Klein drill" is 442 m east of the landing point: outside the patch |
| Viking 1 backshell, Viking 2 hardware, Pathfinder rocks and craters, Beagle 2 and Mars 3 | see "Sites with nothing recommended" |
| Phoenix "Holy Cow" and the polygon names | no source read; sub-lander scale (under about 1 m) |
| InSight Homestead hollow ring | position not placed (kept as hold above) |
| Zhurong rover | no source places it in the patch's product |
| NCC-based placements | all three NCC attempts are at noise level and are not used |

## NOT verified / NOT done

- No raster of the two recommended re-cut products was read: the JP2 downloads (ESP_068294_1985, 913 MB; ESP_028401_1755, 575 MB) from the HiRISE PDS server stalled at about 57-95 % (0.1 MB/s or less, connection resets; two overlapping resume loops may also have corrupted the partial files, so they were not used), and reading the JP2 remotely through GDAL hung. So: (a) no rover pixel measured in either product, so the 101 m / 278 m offsets are team-coordinate offsets, not HiRISE-measured; (b) positions of descent stage / chute / shield come from labelled cut-outs and a NASA table seen only as a search snippet; (c) whether the 2048 px crop at the traverse start is free of no-data was not run (the pipeline's own check will).
- The NTRS paper (MEADSreconstruction.pdf) was read only through a search snippet; the three ranges (669, 1129, 1467 m) were not confirmed in the paper and the snippet printed them as "kilometers" (units corrected by comparison with the labelled image, ratio 1.6-1.8 m per image pixel).
- Bearings from the labelled images assume the labelled images are north-up map-projected; not checked. The Phoenix cut-out is north-up (confirmed by M2 within about 15 degrees), the others not tested.
- The scale of the Opportunity PSP_001414 labelled image was taken from a 200 m bar in a companion MOC panel assumed to cover the same field; the numbers are rough.
- Names: Sleepy Hollow and Bonneville are from the HiRISE caption of the patch's own product. I did not look for the IAU or team name lists. "Homestead hollow" sizes (25-27 m) come from snippets of two papers, not read.
- PIA21494 (Eagle Crater 22 m) was not re-read; the radius 11 m rests on the existing ring text.
- Search budget: 10 web searches used (limit 40) plus about 25 page fetches of uahirise.org / JPL pages.
- Not run: `validate-data`, any in-app render, any i18n of labels. English draft labels only.
