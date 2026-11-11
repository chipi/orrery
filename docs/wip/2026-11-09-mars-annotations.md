# Mars close-up annotations (scale-out of the Apollo pilot) - candidates

Date: 2026-11-09. Draft only: `static/data` and `src` untouched. Data: `docs/wip/2026-11-09-mars-annotations.json` (same shape as the Apollo pilot json). Check images (gitignored): `static/images/_staging/mars-annotations/<site>.jpg` (ring on the full patch) and `<site>-obj.jpg` (plain | ringed, 240 px at 2x).

## Result

13 Mars tier-2 HiRISE patches exist (beagle2, curiosity, insight, mars3, mars-pathfinder, opportunity, perseverance, phoenix, schiaparelli, spirit, viking1-lander, viking2-lander, zhurong). Four yield an annotation, one object each. Each patch is a 2048 px crop at 0.25 m/px (512 m) of one HiRISE RDR product (ids from `image-provenance.json`); offsets are metres from the patch centre = site point (E = (px-1024)*0.25, N = (1024-py)*0.25).

| Site | Product (date) | Kept | Source for placement | Confidence | Photo |
|---|---|---|---|---|---|
| schiaparelli | ESP_048120_1780 (2016-11-01) | Backshell and parachute, px 1667,458 (+160.8 E, +141.5 N) | caption + cutout of THIS product | high | existing `missions/schiaparelli/07` (PIA21132) |
| opportunity | ESP_050177_1780 (2017-04-10) | Lander in Eagle Crater, px 1057,1190 (+8.3 E, -41.5 N) | caption + cutout of THIS product | medium-high | candidate PIA21494 |
| zhurong | ESP_075625_2055 (2022-09-14) | Tianwen-1 lander, px 1360,1408 (+84.1 E, -96.0 N) | HiRISE ESP_069665 (other product, same static lander) | medium-high | existing `mars-sites/zhurong/05` (= `missions/tianwen1/02`) |
| insight | ESP_087004_1845 (2025-02-16) | InSight lander, px 1150,1149 (+31.5 E, -31.3 N) | HiRISE ESP_058005 (other product, same static lander) | medium | candidate PIA22875 |

Labels (<=28 / short <=16): "Backshell and parachute" / "Backshell+chute"; "Lander in Eagle Crater" / "Lander"; "Tianwen-1 lander" / "Lander"; "InSight lander" / "InSight lander". Explanations are in the json (`explain_en`), facts only from the cited captions. Every ring was looked at on the image (plain next to ringed) and sits on the object.

## Dropped sites and objects (why)

- viking1-lander: no hardware caption for ESP_018887; the lander by the usual published coordinate (not fetched, from memory) is ~1.5 km E of the patch centre. Not located.
- viking2-lander: PSP_001501_2280 has a labelled cutout (lander / backshell / "Heatshield?") of the same product, but the patch centre is the product centre, ~2 km from the lander (coordinate from memory), and the cutout could not be registered to the patch (NCC ~0.05).
- mars-pathfinder: labelled cutout of PSP_001890 (MPF, backshell/parachute, heat-shield debris?) could not be registered (NCC <= 0.1 over 12 scale/rotation tries); nothing recognisable at the patch centre.
- spirit: the cutout boxes a-d are unlabelled in the file; patch is ~490 m W of the usual lander coordinate (memory), outside the 256 m half-width; no Bonneville crater in the patch.
- phoenix: verified miss. HiRISE PSP_008591_2485 (lander image) is centred 234.256 E; the patch is at 234.300 E, ~1.1 km east. No hardware.
- curiosity: heat shield 1220 m, backshell+parachute 610 m, sky crane 620 m from the rover (HiRISE release, via Universe Today): all outside the patch; the rover has moved on.
- perseverance: product acquired 2016-05-24, five years before landing.
- mars3: only crowd-sourced candidates in the HiRISE release ("Could This Be the Soviet Mars 3 Lander?"), not tied to the patch centre; not annotated.
- beagle2: no hardware caption or labelled cutout on the product page.
- Backshell/parachute/heat shield at opportunity, insight, zhurong, and the Schiaparelli impact site and heat shield: all outside the 512 m patch.
- Zhurong rover held: it had driven off by 2022-09-14 and no source places it in this product.

## Finding (data, not annotation)

Several site points are the centre of the HiRISE frame, not the hardware: Phoenix (verified, 1.1 km), likely Viking 1/2 and Spirit (from memory-level coordinates). For those, a re-fetch centred on the lander would be needed before any ring is possible. Not touched here.

## NOT verified

- Placement by registration failed at Pathfinder, Viking 2 (and was not applicable at Zhurong/InSight, which use other products). For zhurong and insight the identification rests on morphology (bow-tie blast streaks with a dot at the waist; dust-cleared dark halo with a bright pair), not on pixel registration, so a few px of error and a wrong-object risk remain; insight is the weaker one.
- Opportunity: lander identified as the dark centre of Eagle Crater from the caption and cutout; the patch is grayscale so the airbags are not visible.
- Coordinates for Viking 1/2 and Spirit landers, used only to explain the drops, are from memory and were not fetched. Phoenix and Curiosity drops cite fetched pages.
- Not checked: PIA21494 and PIA22875 full captions beyond the first lines (NASA API); licences/provenance of candidates; photo for Opportunity and InSight are candidates only, nothing added to the repo.
- No in-app render, no `validate-data`, no i18n (English only).

## Wired (2026-11-09, second pass)

Rings in `static/data/surface-hotspots.json` + 13-locale `i18n-src/<loc>/hotspot-metadata/<site>.json`; photos in the shared `moon-annotation-photos.json` (site ids do not collide; `getMarsSites` now joins it like `getMoonSites`). 8 rings: schiaparelli backshell+parachute, opportunity lander (Eagle Crater), zhurong Tianwen-1 lander, insight lander (second check held: the 087004 patch registered on ESP_058005 by terrain cross-correlation 0.51 carries the labelled lander to the ring within ~10 m, same bright pair in a dark halo in both), and, after the patches below were re-cut on the landers, phoenix, viking2-lander and spirit.

Patches re-cut on the lander (centre = site point = HiRISE-measured lander): phoenix (PSP_008591_2485; the old patch was 1.1 km east), viking1-lander (ESP_046170_2025; the old site point 22.4856 N was 13 km north of the lander at 22.27 N), viking2-lander (PSP_001501_2280; NSSDCA 47.6673 N 134.2809 E is within 4 m of the lander), spirit (PSP_001513_1655; old patch 0.4 km west). Opportunity (42 m), InSight (44 m) and Zhurong (128 m) were re-centred on their landers in the product they already used. CTX regional re-cut for phoenix and both Vikings. Coordinates changed in `mars-sites.json` and `descent-profiles/{phoenix,spirit,insight,opportunity,viking1}.json`.

Not ringed: Viking 1 (the lander is probably the bright spot with a dark shadow now at the patch centre, but the HiRISE labelled cutout could not be registered, so it is not certain); backshell, parachute and heat shields at Phoenix, Viking 1/2, Spirit (outside the 512 m patch or not placed in the product). Not checked: authoritative coordinates of sites without a lander image in this pass (mars3, beagle2, curiosity, perseverance, pathfinder, schiaparelli's impact site).
