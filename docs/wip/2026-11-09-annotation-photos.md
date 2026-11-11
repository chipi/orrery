# Annotation photos: which NASA frame shows which ring object (2026-11-09)

Rule: the photo must show THAT object from THAT mission, identified by NASA frame id and the official caption, never by look-alike. Captions below were read from the images.nasa.gov API (`images-api.nasa.gov/search?nasa_id=...`) or the Commons description of the NASA original. Staging previews (1600 px, gitignored) and a labelled sheet: `static/images/_staging/annotation-photos/` (`sheet.jpg`, `<site>-<object>.jpg`).

## Corrections to known gallery rows (read before wiring)

- `missions/apollo14/05` is credited "View of the Central Station of the ALSEP" (AS14-68-9405). The official caption says it is Shepard assembling a core tube beside the MET. It does NOT show the ALSEP. Do not use it for the A14 ALSEP ring.
- `moon-sites/apollo15/02` is titled "View of the ALSEP (as15-85-11471)" in provenance, but the NASA caption and the pixels show Scott seated in the LRV. It is a valid A15 LRV photo, a wrong A15 ALSEP photo. The row title is misleading (fix the title or leave; do not use it as ALSEP).
- `missions/apollo11/05` (AS11-40-5931) is "prepares to deploy EASEP", the package not yet deployed. Weak for the PSEP ring.
- `missions/apollo12/05` (AS12-46-6813) shows the Lunar Surface Magnetometer, not the ALSEP central station.
- `missions/apollo16/01` ("Lunar Module West") is a panorama strip with a tiny LM and no frame id in the row. Weak.
- `missions/apollo16/04` (Apollo16-Schooner) is a terrestrial test photo. Never use.

## Per annotation

| Site | Object | Existing gallery image (confirmed) | Candidate (not in repo) |
|---|---|---|---|
| apollo11 | LM descent stage | `/images/missions/apollo11/03.webp`, AS11-40-5927, "View Apollo 11 Lunar Module as it rested on lunar surface" | |
| apollo11 | PSEP | none good (`missions/apollo11/05` AS11-40-5931 is pre-deploy) | AS11-40-5948 "Astronaut Edwin Aldrin after deployment of EASEP on surface of moon" |
| apollo11 | LRRR | none | AS11-40-5948: caption names "In the foreground PSEP; beyond it the Laser Ranging Retro-Reflector (LR-3)". The LRRR is small in the frame (sheet: left of centre, beyond the PSEP). Confidence medium. |
| apollo12 | LM | none clean | AS12-46-6749 "Astronaut Alan Bean works on Modular Equipment Stowage Assembly" (caption: on the Apollo 12 LM; whole LM visible). Also AS12-48-7134 shows the LM tiny in the background. |
| apollo12 | ALSEP | none | AS12-47-6918 "View of part of the deployed ALSEP"; caption: PSE centre foreground, Central Station the largest object, SIDE on legs. |
| apollo12 | Surveyor 3 | `/images/fleet-galleries/surveyor-3/01.webp`, Commons "Surveyor 3 Conrad.jpg" = AS12-48-7134 (Conrad at Surveyor 3, LM in background); also `surveyor-3/04` ("Apollo 12 and Surveyor 7135", AS12-48-7135, not caption-checked) | |
| apollo14 | LM | `/images/missions/apollo14/01.webp`, Commons copy of AS14-66-9277 "excellent view of the Apollo 14 LM on the moon" | |
| apollo14 | ALSEP | none (`apollo14/05` is NOT ALSEP, see above) | AS14-67-9379 "View of the Central Station of the ALSEP deploy by Apollo 14 astronauts"; caption: close-up of the central station. Sharp, good. |
| apollo15 | LM | `/images/missions/apollo15/01.webp`, Commons copy of AS15-88-11866 (Irwin salutes; caption: LM "Falcon" in the centre, LRV on the right) | |
| apollo15 | ALSEP | none | AS15-87-11845 (Commons file `AS15-87-11845 - Apollo 15 - ... Panoramic view of Station 8 ALSEP, Central Station, Magnetometer - DPLA ...`, NASA record): central station in the foreground. Panorama frame with a dark film border: crop needed. NASA Images API does not index it; the ALSJ/DPLA record is the source. |
| apollo15 | LRV | `/images/moon-sites/apollo15/02.webp`, as15-85-11471, "Scott seated in the LRV" (caption), also LRV right side of `missions/apollo15/01` | |
| apollo16 | LM | `missions/apollo16/01` weak (see above) | AS16-107-17436 "excellent view of the Lunar Module Orion and Lunar Roving Vehicle" (Duke, EVA-1) |
| apollo16 | ALSEP | none | AS16-113-18347 "Partial view of the deployed ALSEP"; caption: PSE foreground, Central Station centre background, RTG left. Alternative AS16-114-18388 (Young at ALSEP site; central station only partly in frame). |
| apollo16 | LRV | none | AS16-107-17436 (same frame, LRV right). AS16-115-18559 ("Young drives the LRV to its final parking place") rejected: LRV a speck. |
| apollo17 | LM | none | AS17-134-20382 "Schmitt stands near the deployed flag... LM at left background and LRV at right background (partially obscured)". Good frame; LM is a supporting subject, not the only one. |
| apollo17 | LRV | `/images/missions/apollo17/01.webp`, Commons copy of AS17-147-22526 "Cernan makes a short checkout of the LRV"; also `fleet-galleries/lrv-apollo/04` as17-137-20979 | |
| apollo17 | ALSEP | none | NO CONFIDENT PHOTO. AS17-147-22548 is titled "ALSEP Panorama" but the caption is about the LSP geophone flag and the ALSEP is a speck in the background. Rejected. |
| apollo17 | SEP transmitter | none | NO CONFIDENT SURFACE PHOTO. AS17-134-20446 ("STA SEP, PAR PAN") is an empty landscape view from the SEP station, rejected. S72-53951 (Commons "Apollo 17 SEP Experiment"; NASA caption: pre-flight lab photo of the SEP transmitter that was mounted on the Rover) shows the hardware clearly but is not a lunar-surface photo. Needs an operator decision whether a pre-flight photo is acceptable. |

## Not verified

- AS12-48-7135 (surveyor-3/04) caption not read; AS14-66-9277 and AS15-88-11866 captions read from Commons descriptions, not the NASA API.
- Commons rows without nasa_id (apollo14/01, apollo15/01, apollo17/01, surveyor-3/01) carry the frame id only in the Commons description; provenance has `nasa_id: null`.
- LRRR: no sharp close-up frame found; AS11-40-5948 is the best identified frame. A dedicated LRRR frame may exist in the ALSJ A11 image library; not found with 10 search calls.
- Whether A12 ALSEP central station vs PSE: AS12-47-6918 shows both per caption.

## Steps to add a candidate (repo tools)

1. Full-size source: `curl` the `~orig.jpg` from `images-assets.nasa.gov/image/<id>/<id>~orig.jpg` (Commons-only frames: the Commons original URL) into `masters/` (LFS), per the route-photo flow in `scripts/hotspots/fetch-route-photos.ts` (master, `build-display-ladder --only ...`, `add-card-rungs --stems=...`).
2. Gallery slot: place in the mission gallery with `scripts/replace-gallery-slots.ts` (or add the next index; `scripts/rebuild-gallery-manifests.ts`, `scripts/validate-gallery-counts.ts`). Mission galleries are capped at 5 slots (apollo11-14 are full), so each add means replacing the weakest slot or serving the annotation photos from a separate path like the traverse route photos. Decision needed.
3. Provenance: write `{ "/images/<path>.webp": "<nasa_id>" }` to a map and run `node scripts/apply-provenance-nasa.mjs map.json --dry-run` then without the flag (list the `.1x1.jpg` crop too if one exists). It fills title, author, PD-NASA licence and the images.nasa.gov URL from the API. AS15-87-11845 is not in the API: use the Commons backfill (`scripts/backfill-provenance-commons.ts`).
4. Alt text: 14 locales via `scripts/translate-alt-text.mjs` (en seed written from the official caption, naming mission and object), then `image-approved`; run `scripts/validate-gallery-credits.ts`.
5. Crop AS15-87-11845 to remove the film border before the ladder.
