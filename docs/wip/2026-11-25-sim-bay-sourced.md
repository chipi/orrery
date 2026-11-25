# SIM bay: sourcing of the "NOT FOUND" list (apollo-sim-bay.ts)

Date: 2026-11-25. Research only; nothing in `src/` changed. Every URL below was opened (PDF downloaded and text-extracted, or page fetched) in this pass unless marked "search snippet only". "Read as a picture" means I rendered the PDF page and looked at the figure. Where a source gives no number the entry says "not found".

## Corrections to the header comment (read first)

1. **Boom lengths: the header has them swapped/short.** Header says gamma-ray boom 25 ft, mass-spectrometer boom 24 ft. Two NASA technical documents say otherwise:
   - R. D. White, "The Apollo 15 Deployable Boom Anomaly" (NASA MSC, NTRS 19730010141, https://ntrs.nasa.gov/api/citations/19730010141/downloads/19730010141.pdf): "the mass-spectrometer boom extended 762 centimeters (25 feet) and the gamma-ray boom extended 817.8 centimeters (26 feet 10 inches)".
   - Apollo 15 Mission Report (TM X-68394, NTRS 19720021182, https://ntrs.nasa.gov/api/citations/19720021182/downloads/19720021182.pdf) section 14.1.6: "the mass spectrometer boom is 1 foot 10 inches shorter than the gamma ray spectrometer boom". 26 ft 10 in minus 1 ft 10 in = 25 ft, so White and section 14.1.6 agree with each other.
   - The "25-foot" (gamma) and "24-foot" (mass spec) figures are in the same Mission Report's appendix A.4.2 and in the Apollo 15 Press Kit (NTRS 20130009855, https://ntrs.nasa.gov/api/citations/20130009855/downloads/20130009855.pdf, p. 62-63) and Apollo 16 Press Kit (https://ibiblio.org/apollo/Documents/1APOLLO16.pdf, "7.6 meter (25-foot)" and "7.3-meter (24-foot)"). So the NASA documents disagree among themselves. White gives centimetres to a tenth, plus the 1 ft 10 in difference is a design statement, so for a 3D model I would use 817.8 cm and 762 cm, and note the press-kit nominal values. What the 817.8 cm is measured to (boom tip, or experiment centre) is not stated.
2. **Subsatellite length: 30 vs 31 in.** The header quotes the Press Kit (31 in). The Mission Report appendix A says "hexagonal in shape, 30 inches in length, and weighs approximately 85 pounds"; the Apollo 16 Press Kit says "77 centimeters (30 inches) long, ... 35.6 cm (14-inch) hexagonal diameter ... 40 kg (90 pounds)"; NSSDC says "78 cm in length and approximately 36 cm across opposite corners ... 36.3 kg" (https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063D). 14 in = 35.6 cm; the container ("mailbox") is larger than the satellite.
3. **Subsatellite orientation: "end-on, boom end out" is plausible but not stated by any text; see item 5.**

## 1. Bay dimensions

| Item | Value | Source |
|---|---|---|
| Sector 1 arc | 50 degrees. "Sectors 1 and 4 measured 50 degrees of arc, Sectors 3 and 6 60, Sectors 2 and 5 70" | enginehistory.org, "U.S. Manned Rocket Propulsion Evolution" ch. 9.30, https://enginehistory.org/Rockets/RPE09.30/RPE09.30.shtml. Secondary (a history text, no drawing cited); no NASA primary found |
| SM outer diameter | 12 ft 10 in (3.91 m) | same page ("24 feet 2 inches long, 12 feet 10 inches in diameter"; the 24 ft 2 in includes the engine bell). NASA: "3.9 meters in diameter and 7.6 meters long" (PDS, https://pds-geosciences.wustl.edu/lunar/urn-nasa-pds-apollodoc/document_a17/instrument_hosts/a17c_csm.txt) |
| Skin panel | 1 in thick aluminium honeycomb; sector panels bolted to the radial beams | same enginehistory page; Apollo 17 Press Kit "2.54 centimeters (one inch) thick" (https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A17_PressKit.pdf, spacecraft description, Service Module paragraph) |
| Attachment | "attached with 1/4-inch bolts to radial beams 1 and 6, to the new cryogenic tank panel, and to the aft bulkhead of the service module" | Apollo 15 Mission Report A.1.1 (URL above) |
| Bay height along CSM axis, width, depth, position from the aft bulkhead | **not found** as numbers | no NASA text or caption gives them |

Derived by me, not sourced: with a 50 degree sector at skin radius 77 in (from 12 ft 10 in diameter) the skin chord is about 65 in and the arc about 67 in; the central tunnel to skin depth is not sourced.

Inferences from sourced statements:
- SIM bay centreline = the sector's radial centreline: the UV spectrometer final report (APL/JHU, NTRS 19730011764, https://ntrs.nasa.gov/api/citations/19730011764/downloads/19730011764.pdf) says "the CSM +X axis was aligned to the velocity vector and the SIM bay centerline aligned to the nadir".
- The Apollo 15 SIM photo document: pan camera "centerline displaced 8.25 inches from the centerline of the SIM toward the positive Y coordinate" and "optical axis (at center of format) is parallel to the SIM centerline" (PDS, https://pds-geosciences.wustl.edu/lunar/urn-nasa-pds-apollodoc/document_a15/photographic_support/ap15_sim_photo_equip.pdf; the PDF is a scan, I OCRed it with tesseract, so numbers below were checked against the OCR only).

## 2. Compartments and shelf heights

- Number of shelves: Apollo 17 pan camera "mounted on structural beams in the CSM SIM bay between the two SIM shelves" (PDS a17c_pancam, https://pds-geosciences.wustl.edu/Lunar/urn-nasa-pds-apollodoc/document_a17/instruments/a17c_pancam.pdf); mapping camera "on the top shelf" (a17c_metriccam, same directory); IR radiometer and UV spectrometer "on the bottom shelf" (Apollo 17 Press Kit, lunar sounder section, p. 58-59). So two shelves, three compartments (confirms the header).
- Apollo 15 X-ray/alpha: "shares a compartment on the SIM bay lower shelf with the alpha-particle experiment" (Apollo 15 Press Kit p. 62). White: spectrometer and boom are "mounted on two rails that are supported by trusses from the bottom side of a SIM-bay shelf" (White, NTRS 19730010141).
- Shelf construction: "bonded aluminum sandwich" (Mission Report A.1.1).
- Layout read as a picture from Apollo 15 Mission Report figure A-1 (PDF page 293 of the NTRS file): top compartment: mapping camera, laser altimeter, mapping-camera film cassette; middle: panoramic camera with its two film cassettes and gaseous-nitrogen control, subsatellite at left with EVA foot restraint; bottom: gamma-ray spectrometer (cylindrical can at left front), alpha/X-ray housing (box, centre), mass spectrometer (right).
- Shelf heights, compartment heights: **not found**.

## 3. Instrument envelopes and masses

| Instrument | Value | Source |
|---|---|---|
| Mapping camera subsystem (camera, stellar camera, altimeter, deployment mechanism) | 8 x 22 x 51 in, 280 lb with film; film container 11 in dia x 9 in wide, 23 lb | Apollo 15 SIM photo equipment doc (PDS URL above, OCR) |
| Laser altimeter | hard mounted to the mapping camera; laser output beam 0.25 in, expanded to 4 in dia by a 16-power telescope. Own envelope not found | same doc |
| 24-in panoramic camera | envelope "25 x 29 x 60 inches", 335 lb with film and cassettes; cassette 72 lb, 19 in dia x 7 in wide; film 5 in wide, format 45.24 x 4.5 in | same doc (OCR). Apollo 17: 5 in x 48 in film, 24 in focal length, 108 deg cross-track x 10.77 deg along-track (PDS a17c_pancam) |
| Pan camera axes (25 vs 29) | **not found.** Known facts: scan is cross-track and rotates the roll frame; gimbal tilts fore-aft; main frame on rails on the shelves; optical axis parallel to SIM centreline; lens stowed face-inward when off. None says which of 25/29/60 lies along which axis | same doc, PDS a17c_pancam |
| Gamma-ray spectrometer detector | NaI(Tl) crystal "76 x 76 mm" (3 in x 3 in) with plastic anticoincidence scintillator, 512 channels. Other sources say 7.0 cm x 7.0 cm. Outer can envelope and mass **not found** | NASA HEASARC, https://heasarc.gsfc.nasa.gov/docs/heasarc/missions/apollo1516.html and https://heasarc.gsfc.nasa.gov/Images/apollo/gamma_diagram.html ("76 x 76 mm"); the 7.0 cm figure is a search snippet only (ADS abstract of Harrington et al. 1974, https://ui.adsabs.harvard.edu/abs/1974NucIM.118..401H/abstract, not opened) |
| Boom mechanism (gamma and mass spec are "similar") | mechanism incl. jettison: 33 x 43 x 84 cm (13 x 17 x 33 in), 41 kg (90 lb), mass-spec unit about 11 kg (25 lb) | White, NTRS 19730010141 (stated for the mass-spec assembly) |
| X-ray fluorescence + alpha-particle housing | "housed in the same enclosure"; alpha sensor = array of 10 silicon surface-barrier detectors. Housing size and mass **not found** | Mission Report A.4.2; Apollo 15 Press Kit p. 62 |
| Mass spectrometer | unit about 11 kg (25 lb); box size **not found**; has a thermal/contamination cover that closes over the outboard face (opens with first boom motion) | White |
| Lunar sounder (Apollo 17): optical recorder, CSAR electronics | "The radar and optical recorder are located in the lower portions of the SIM bay". Envelope **not found**. Total system 43 kg, 103 W comes from Wikipedia ("ALSE"), not opened here; not NASA primary | Apollo 17 Press Kit p. 56-57 |
| Lunar sounder HF antennas | two HF dipole booms, each "two nested 0.008-inch by 4.00-inch steel elements ... tubular antenna 410 inches in length" (10.41 m); Press Kit "scan of 24.4 m (80 feet)" tip to tip; deploy "from the base of the SIM". Boom tube diameter not found | Apollo 17 Mission Report 15.1.3, https://ntrs.nasa.gov/api/citations/19730015117/downloads/19730015117.pdf; Press Kit p. 56 |
| Lunar sounder VHF antenna | a Yagi, "automatically deployed after the spacecraft/LM adapter (SLA) panels are jettisoned". Press Kit figure label "HF ANTENNA NO. 2 34' 2'" (= 410 in). Yagi size and where it mounts: **not found** | Apollo 17 Press Kit |
| Infrared scanning radiometer | "mounted on the bottom shelf"; folded Cassegrain telescope, scan mirror sweeps 162 degrees cross-track. Size and mass **not found** (the PSR chapter 24 by Low and Mendell was not retrievable) | Apollo 17 Press Kit p. 58-59 |
| Far-UV spectrometer | volume "roughly 0.03 cubic meters", mass "about 17 kg", Ebert, half-metre focal length; "mounted on a triangular stand attached to a bulkhead ... perpendicular to the longitudinal axis of the spacecraft"; "looked forward 23 degrees relative to normal and 18 degrees to the right of the SIM center"; baffle assembly "approximately 19 inches long", field 12 x 12 deg; 4 shock mounts to an NR bracket. Full envelope is in ICD MH01-12460-134 (not found) | PDS a17c_fuvs, https://pds-geosciences.wustl.edu/Lunar/urn-nasa-pds-apollodoc/document_a17/instruments/a17c_fuvs.pdf; APL final report NTRS 19730011764 |

## 4. Boom geometry

- Direction: no text states it. Evidence: (a) White fig. 1, an NASA artist's concept of "Apollo SIM-bay experiments", shows both booms hanging from the SM toward the Moon, long, straight, slightly splayed, i.e. radially out of the bay; (b) White fig. 6, a photograph "Boom deployed in lunar orbit", shows one straight boom pointing away from the spacecraft; (c) the purpose (clear of the spacecraft's contamination cloud and of the other instruments' field of view); (d) the SM "must retract before any SPS firing" so the boom would otherwise buckle under the SPS thrust, which is along the CSM axis, so the boom is not along the SM axis. Read as pictures. An exact angle off radial: **not found**.
- Geometry: boom is two tempered-steel tapes "14.2 centimeters (5.6 inches) wide and 0.03 centimeter (0.012 inch) thick" forming a circular cross-section "5.08 centimeters (2 inches) in diameter" (White). Stowed on two motor-driven reels in the mechanism housing; experiment rides on two guide rails fixed by a truss to the underside of a shelf; the experiment slides out along the rails first.
- Cycle: about 140 s to extend, 173 s to retract at 28 V (White). Gamma boom can stop at two intermediate positions (Mission Report A.4.2).
- Power cable coiled round the boom, 1.3 cm cross-section, 1920 cm long uncoiled, about 260 cm relaxed (White).
- End-of-boom positions: only lengths above (7.62 m / 8.178 m). Position of the root along the shelf: **not found**.
- Mass-spec boom must retract to within about 12 in (30 cm) of full retraction before SPS burns (Mission Report 14.1.6; White).

## 5. PFS subsatellite orientation in its launcher

- Hardware: hexagonal prism; "three equally-spaced 1.5-meter-long deployable booms were hinged to one of the end platforms"; "a short cylinder was attached to the end platform opposite the booms and was used for the initial deployment and spin-up of the satellite, achieved using a spring loaded mechanism in the SM bay" (NSSDC, URL above). Ejected "spring-ejected out-of-plane at 4 fps with a spin rate of 140 rpm" (Apollo 15 Press Kit p. 63; Apollo 16 Press Kit says 1.2 m/s). After boom deploy the spin is 12 rpm about an axis normal to the ecliptic.
- Apollo 15 Mission Report figure A-12(a), "Subsatellite predeployment configuration and launch mechanism", read as a picture (PDF page 314): the hexagonal prism lies along a pair of "Guide rail"s with its long axis parallel to the rails, folded booms along the side ("Deployable booms" label), the "Launch mechanism" and the cylinder with the "S-band antenna" label at one end, a clamp frame at the other. So the satellite slides out along its own axis on the rails: it is launched end-on along the rails. Pointing the same way, the cylinder end is the pusher end, the boom end leads. This supports "end-on" and matches the header, but the text of the report states neither "end-on" nor which end leads; I am inferring that from the picture plus the NSSDC "cylinder opposite the booms". Whether the rails run radially in the bay (consistent with the out-of-plane ejection when the SIM bay faces away from the orbit plane) or tangentially: not found.
- Figure A-1 (picture) shows the housing with its lid hinged open at the bay's left side, between the middle and bottom compartments, with the hexagonal end visible and angled toward the viewer.
- The press kit calls the housing "a container resembling a rural mailbox".

## 6. Photographs and drawings (public domain: NASA)

Viewed by me:
- **AS17-145-22254** (NASA/JSC via Internet Archive, "Public Domain", https://archive.org/details/as17-145-22254; metadata: "CSM photographed from the LM Challenger during ... SIM Bay Inspection, revolution 52 ... Moon in background over Auzout A ... 60mm lens"). Clearest A17 photo: sector 1 open on the left-hand skin of the SM, three compartments visible, white boxes in the top compartment, dark mylar-covered camera boxes in the middle, black covered units at the bottom, shelves edge-on; the Moon behind.
- **AS17-145-22257** (https://archive.org/details/as17-145-22257, same sequence, "over Sea of Crises"). Same bay at a more oblique angle, showing the bay depth and the shelves in perspective; the top-compartment dark blue cover is clear.
- **AS15-96-13035** (A15 PSR photo summary, fig. caption: the LM crew inspected the SIM bay "from close range"; https://an.rsl.wustl.edu/apollo/data/A15/resources/photo_summary_psr.pdf). Caption only; I did not find the image file.
- **AS15-96-13068** (same source): the subsatellite spinning after launch with booms deployed. Caption only.
- Apollo 15 Mission Report figure 5-1 "Command and service module as viewed from lunar module during rendezvous" (the AS15-88-11972 type frame; the report does not give the ID) and figure 5-2 "Subsatellite shortly after launch".

Listed by search result title or snippet only, images not opened:
- **AS15-88-11972**: auction/print listings (https://sothebys.com/en/buy/auction/2019/space-photography-online/apollo-15-the-sim-bay-viewed-from-the-lm-vintage and https://www.auction.fr/en-US/lot/378-apollo-15-the-csm-endeavour-with-exposed-sim-bay-above-the-sea-of-fertility-james-81408723) describe it as the first view of the open bay from the LM. NASA's own caption not retrieved. It does not exist as an Internet Archive item under the name I tried.
- **AS17-145-22244**, **AS17-145-22251**, **AS17-145-22257** appear in the same "SIM Bay inspection" series (dp.la title for 22244, https://dp.la/item/a8a8f6aa70bca4fab2629b6af84ca4ef; Flickr for 22251). Not opened.
- Apollo Flight Journal "SIM bay cameras" pages (https://www.nasa.gov/history/afj/simbaycam/simbaycameras.html and a15/a16/a17-stat-perf.html): the fetch returned the Apollo Journals landing page, not the content. The ninfinger.org page (https://www.ninfinger.org/karld/My Space Museum/simbay.htm) has diagrams "Apollo 15 & 16 SIM Bay diagram" with no numbers or attribution, so not usable as a source.

Drawings:
- Apollo 15 Mission Report figure A-1 (above): a cutaway with labels, no dimensions.
- Apollo 16 Press Kit p. 91 "Mission SIM Bay Science Equipment Installation" (https://ibiblio.org/apollo/Documents/1APOLLO16.pdf): a labelled layout, notes "SIM door shown removed; gamma-ray and mass spectrometers and mapping camera shown in retracted positions". No dimensions. Pages 94-96 carry "Apollo Subsatellite" and "SIM Bay Subsatellite Experiments Concepts" figures (not opened as images).
- White, figures 2 and 4: mass-spec boom mechanism and its truss/rail support under the SIM shelf, no dimensions beyond the text values.
- A Google Arts and Culture "line drawing of layout of scientific instrument module of Apollo 16" (https://artsandculture.google.com/asset/line-drawing-of-layout-of-scietific-instrument-module-of-apollo-16/fgF835fCwZOWng): appeared in a search result, not opened.
- No North American Rockwell SIM dimensioned drawing and no CSM News Reference SIM figure with dimensions was reachable. The CSM News Reference SM overview (CSM07_Service_Module_Overview_pp53-60.pdf) returned 404/empty from nasa.gov.

## Still not found

1. SIM bay height along the CSM axis, depth, and its position from the aft bulkhead (any number).
2. A NASA primary source for the 50 degree sector angle (only enginehistory.org).
3. Shelf heights and compartment heights.
4. Which of 25 / 29 / 60 in is which axis of the pan camera envelope.
5. Envelopes and masses of: gamma-ray detector can, X-ray/alpha housing, mass-spectrometer box, lunar sounder optical recorder and electronics, VHF Yagi, infrared radiometer, UV spectrometer (only the volume and mass), laser altimeter alone.
6. HF antenna and boom tube diameter; where the Yagi sits.
7. Boom direction as a stated angle; boom root positions; why gamma boom is 817.8 cm in White and 25 ft in the Mission Report.
8. The rail direction of the subsatellite launcher relative to the CSM axis; the launcher's exact envelope (container size).
9. Image files for AS15-88-11972, AS15-96-13035, AS15-96-13068 from an NASA source; Apollo 16 SIM photos with IDs.
10. Apollo 17 Preliminary Science Report SP-330 chapters 16 (UV), 22 (lunar sounder), 24 (IR radiometer) and Apollo 15/16 PSR instrument chapters: the nasa.gov, NTRS (108 MB scan) and nssdc copies would not download in this environment. These are the likeliest source for items 5 and 6; try a manual download.
11. Apollo Scientific Experiments Data Handbook (TM X-58131, NTRS 19760007062): download over the size limit, not read.
