# Mission facts, sourced (2026-11-17)

Research for backlog rows F11, F12, S1, S2, S3, S4 and plan row L57. Nothing in the repo data was edited.

Reading rules:

- "Primary" = agency page, agency press release or mission brochure, NASA TRS paper, conference paper by a mission/instrument team member. "Secondary" = Wikipedia, news, search-result summaries.
- Web pages were read through a fetch tool that summarises with a small model. Text in quotes from web pages came back through that summariser and is not guaranteed character-exact; check against the live page before putting a quote in a source field. Quotes from PDFs (Stooke LPSC 2025, ISRO brochure, ISRO one-year PDF, Kawakatsu ISSFD 2007, Zhao 2014) were extracted locally with pdftotext and are exact.
- Where the fetch tool said "typo in source", that is its remark, not mine; see the note in F11.

---

## F11. Artemis I trajectory

### Key events (NASA "Artemis I Mission Timeline")

Source: NASA, "Artemis I Mission Timeline", https://www.nasa.gov/reference/artemis-i-mission-timeline/ (primary). MET format is DDD/HH:MM:SS.

| Fact | Value | Source | Quote / table cell |
|---|---|---|---|
| Launch | 2022-11-16, MET 000/00:00:00; 06:47:44 UTC | NASA timeline (primary); 06:47:44 UTC from CelesTrak event page https://celestrak.org/events/Artemis-I/ ("actual launch occurring at 0647 UTC", secondary summary) and a search-result summary (secondary) | "Launch" "000/00:00:00" |
| TLI burn (ICPS) | MET 000/01:29:27 | NASA timeline (primary) | "Trans-lunar injection burn" "000/01:29:27" |
| Outbound powered flyby burn | MET 005/06:40:14; "about 81 miles above the surface" | NASA timeline (primary) | "Outbound powered flyby burn" "005/06:40:14"; "about 81 miles above the surface" |
| Outbound flyby date | 2022-11-21 | search-result summary of NASA/ESA pages (secondary; not read on the page) | "Orion completed one flyby of the Moon on November 21" |
| DRO insertion burn | MET 009/15:48:27 | NASA timeline (primary) | "Distant retrograde orbit insertion burn" "009/15:48:27" |
| Distance from Moon at DRO insertion (Flight Day 10 row) | the page text reads "57,00 miles" (a digit is missing in the NASA text; the value is not 5,700 and not confirmed as 57,000) | NASA timeline (primary) | "Shortly before conducting the burn, Orion was traveling more than 57,00 miles above the lunar surface, marking the farthest distance it will reach from the Moon during the mission." |
| Distance record (Flight Day 11) | 2022-11-26, 7:42 a.m. (time zone not stated in the fetched text) | NASA timeline (primary) | "Orion surpassed the distance record for a mission with a spacecraft designed to carry humans to deep space and back to Earth, at 7:42 a.m. Saturday, Nov. 26." |
| Maximum distance from Earth | 268,563 miles, Flight Day 13, 2022-11-28, "just after 3 p.m. CST" | NASA timeline and NASA blog "Artemis I Flight Day 13: Orion Goes the Max Distance" https://www.nasa.gov/blogs/missions/2022/11/28/artemis-i-flight-day-13-orion-goes-the-max-distance (both primary) | "Orion reached the farthest distance from Earth it will travel during the Artemis I mission — 268,563 miles from our home planet — just after 3 p.m. CST." |
| Moon distance at 8 p.m. EST, 2022-11-28 | 43,138 miles from the Moon, 268,457 miles from Earth | NASA blog FD13 (primary) | "Orion was 268,457 miles from Earth and 43,138 miles from the Moon." |
| DRO duration | "approximately six-day leg" | NASA blog FD13 (primary) | "an approximately six-day leg of its larger mission thousands of miles beyond the Moon" |
| DRO departure burn | MET 015/15:49:56 | NASA timeline (primary) | "Distant retrograde orbit departure" "015/15:49:56" |
| Return powered flyby burn | MET 019/10:24:00; "80.6 miles above the lunar surface" | NASA timeline (primary) | "Returned powered flyby burn" "019/10:24:00"; "80.6 miles above the lunar surface" |
| Return flyby date | 2022-12-05 | search-result summary (secondary) | "completed a second flyby of the Moon on December 5" |
| Exit of lunar sphere of influence (Flight Day 18 row) | about 39,993 miles from the lunar surface (the page calls it "Entry into the lunar sphere of entry"; this is the entry into Earth-side sphere per the context, not confirmed) | NASA timeline (primary) | "Entry into the lunar sphere of entry occurred when the spacecraft was about 39,993 miles from the lunar surface." |
| Targeted entry interface | MET 025/11:15:49 | NASA timeline (primary) | "Targeted entry interface" "025/11:15:49" |
| Crew module entry interface | MET 025/11:15:52 | NASA timeline (primary) | "Crew module entry interface" "025/11:15:52" |
| Splashdown | 2022-12-11, "9:40 PST, 12:40 EST" (= 17:40 UTC); MET 025/11:36:27 | NASA timeline (primary) | "Splashdown" "025/11:36:27" |
| Mission duration | 25 days, 10 hours, 53 minutes (NASA timeline); 25 days, 10 hours, 52 minutes (search summary, secondary) | NASA timeline (primary) | "25 days, 10 hours, 53 minutes" |
| Total distance traveled | 1.4 million miles | NASA timeline (primary) | "Total distance traveled: 1.4 million miles" |
| Re-entry speed | 24,581 mph (Mach 32) | NASA timeline (primary) | "24,581 mph (Mach 32)" |
| Pre-flight plan, DRO | "about 40,000 miles beyond the Moon, or a total of about 280,000 miles from Earth" | NASA Artemis Reference Guide https://www.nasa.gov/wp-content/uploads/2023/03/Artemis20I20Reference20Guide_Inter.pdf (primary, pre-flight plan, pdftotext extract) | "Orion will continue on a path toward a lunar distant retrograde orbit, where it will travel about 40,000 miles beyond the Moon, or a total of about 280,000 miles from Earth, before returning home." |

Internal inconsistency to resolve before using the MET column: launch 06:47:44 UTC plus MET 025/11:36:27 gives 2022-12-11 18:24:11 UTC, but NASA's own splashdown time is 17:40 UTC (a 44-minute difference), and NASA's duration is 25 d 10 h 52/53 min, not 25 d 11 h 36 min. I did not find which of the two is right; do not convert MET to clock times from this table without a second source. The MET column and the duration line cannot both be correct.

### Ephemeris / state vectors

| Fact | Value | Source | Quote |
|---|---|---|---|
| NASA published a downloadable Artemis I ephemeris | Yes: a file "Artemis I Ephemeris" (ZIP, 514.59 KB), last updated 2024-04-10, at the bottom of the NASA AROW article | NASA, "Track NASA's Artemis I Mission in Real Time" https://www.nasa.gov/feature/track-nasa-s-artemis-i-mission-in-real-time (primary) | "Also available for download will be trajectory data from the flight, called an ephemeris, found at the bottom of this page." |
| State vectors | AROW tweeted a set of state vectors | same (primary) | "AROW also will provide a set of Orion's state vectors — data that describes precisely where Orion is located in space and how it moves" |
| Format | OEM (CCSDS Orbit Ephemeris Message) | search-result summary (secondary); not read in the downloaded file | "standard OEM (Orbital Ephemeris Message) format of the Consultive Committee for Space Data Systems (CCSDS)" |
| JPL Horizons carries Artemis I | Yes, CelesTrak says its tracking uses "data from the NASA JPL Horizons System" and points users to Horizons for orbit data | CelesTrak https://celestrak.org/events/Artemis-I/ (secondary, third party) | "the NASA JPL Horizons System at: https://ssd.jpl.nasa.gov/horizons/app.html#/" |
| Horizons target ID -1023 | NOT confirmed (see Not found) | | |
| Trajectory design papers (not ephemerides) | JPL DE421 used for Earth/Moon/Sun in design; papers: AAS20649 "Artemis1 Trajectory Design Optimization" https://ntrs.nasa.gov/citations/20205005150 ; "Artemis1 Offnominal Trajectory Design and Optimization" https://ntrs.nasa.gov/api/citations/20230010126/downloads/Artemis1%20Offnominal%20Trajectory%20Design%20and%20Optimization%20Rev%201.pdf | NASA NTRS (primary; titles from search results, contents not read) | none read |

Action for F11: download the ZIP from the AROW page and check whether the file covers the whole flight at a step that gives a smooth DRO loop. I did not download it.

---

## F12. Chandrayaan-2 Vikram descent profile

ISRO's own pages and brochure give no velocity/altitude table for Vikram's descent (ISRO Chandrayaan_2.html, Press Release 3/6 and mission page were checked). The phase numbers below come from news summaries of the ISRO briefing material.

| Fact | Value | Source | Quote / cell |
|---|---|---|---|
| Separation of Vikram | 2019-09-02 (ISRO planned window 1245-1345 IST) | ISRO "Fifth Lunar Orbit Maneuver" https://www.isro.gov.in/Fifth%20Lunar%20Orbit%20Maneuver.html (primary); ISRO Chandrayaan_2.html https://www.isro.gov.in/Chandrayaan_2.html (primary) | "on September 02, 2019, Vikram Lander was separated from the Orbiter" |
| Orbit before separation | 119 km x 127 km after fifth lunar-bound manoeuvre, 2019-09-01 from 1821 IST, 52 s | ISRO Fifth Lunar Orbit Maneuver (primary) | "The duration of the maneuver was 52 seconds. The orbit achieved is 119 km x 127 km." |
| De-orbit manoeuvres, plan | Deorbit #1: 2019-09-03 09:00-10:00 IST to 109 km x 120 km; Deorbit #2: 2019-09-04 03:00-04:00 IST to 36 km x 110 km | ISRO Fifth Lunar Orbit Maneuver (primary) | "Deorbit #1: September 03, 2019, 09:00–10:00 IST, achieving orbit of 109 km x 120 km / Deorbit #2: September 04, 2019, 03:00–04:00 IST, achieving orbit of 36 km x 110 km" |
| Orbit after the two de-orbits, as achieved | "100 km x 35 km" (ISRO text) | ISRO Chandrayaan_2.html (primary) | "two de-orbit maneuvers were performed on Vikram Lander so as to change its orbit and begin circling the moon in a 100 km x 35 km orbit" |
| Same, other wording | "35 km x 101 km" | search-result summary (secondary) | "de-orbiting maneuver was performed to reduce the orbit to 35 km x 101 km" |
| Planned lander orbit | "100 km X 30 km" (planning figure in the LOI press release) | ISRO "Chandrayaan-2 update: Lunar Orbit Insertion" https://www.isro.gov.in/Lunar%20Orbit%20Insertion.html (primary) | "enters into a 100 km X 30 km orbit" |
| Powered descent start | about 20:08 GMT on 2019-09-06 (the 15-minute descent); touchdown planned about 20:23 GMT | Spaceflight Now https://spaceflightnow.com/2019/09/05/indian-moon-lander-ready-for-final-descent/ (secondary) | "begin its final 15-minute powered descent to the lunar surface at approximately 2008 GMT (4:08 p.m. EDT) Friday" ; "touchdown on the moon at around 2023 GMT" |
| Rough braking | begins at 30 km altitude, ends at 7.4 km; velocity 1,680 m/s to 146 m/s in about 10 minutes | news summary (BoomLive via search result) and a search-result summary of ISRO material (secondary; I could not open an ISRO page that states it) | "the orbit was brought down from 30 km to 7.4 km in about 10 minutes, and the velocity of Vikram was also bought down from 1,680 m per second to 146 m/sec" |
| End of rough braking, other wording | 10 min: 7.4 km, 526 km/h | search-result summary of news (secondary) | "after 10 minutes, the lander was at 7.4 km altitude with 526 kmph velocity" |
| Fine braking | from 5 km (11 min 08 s, 331.2 km/h) to about 400 m (12 min 37 s), then hover about 12 s | search-result summary of news (secondary) | "After 11 minutes 08 seconds, altitude was 5 km and velocity was 331.2 kmph. After 12 minutes 37 seconds, altitude was 400 meters and the lander hovered using 2 engines for 12 seconds" |
| Fine braking end altitude, other wording | "800 m" for terminal descent start; "about 400 metres" in the other source. The two disagree. | search-result summaries (secondary) | "Fine braking brings the module to a safe altitude of 800 m above the designated landing site" |
| Hover / vertical descent | hover about 330 ft (100 m); centre engine ignited about 42 ft (13 m) above the surface | Spaceflight Now (secondary) | "Vikram will then hover at an altitude of about 330 feet (100 meters)" ; "ignite its center engine roughly 42 feet (13 meters) above the moon's surface" |
| Speed at loss of contact | about 50 m/s | search-result summary of news (secondary) | "When communication was lost Vikram was still travelling at around 50 m/sec." |
| Contact lost | altitude 2.1 km; "descent was as planned and normal performance was observed upto an altitude of 2.1 km"; no time or velocity in ISRO's text | ISRO Chandrayaan_2.html (primary); K Sivan quote in news (secondary) | "Vikram Lander descent was as planned and normal performance was observed upto an altitude of 2.1 km. Subsequently communication from lander to the ground stations was lost." |
| Failure analysis | Report not published. Press reports (secondary): committee led by V. Narayanan, cause "software glitch", velocity reduction in rough braking more than designed; hard landing about 500 m from the chosen site | The Week 2019-11-16, Onmanorama 2019-11-16 (secondary, via search result); The Space Review "Schrödinger's lander" https://thespacereview.com/article/3789/1 says ISRO released nothing further (secondary) | "Unlike ISRO's previous record, the report of the Failure Analysis Committee has not been made public." |
| Landing target | 70.9 S, 22.7 E ("about"); alternate 67.7 S, 18.4 W; touchdown velocity 2 m/s | ISRO brochure "GSLV MkIII-M1 / Chandrayaan 2" https://www.isro.gov.in/media_isro/pdf/GSLVMkIII_M1.pdf (primary, pdftotext) | "Landing Site: High plain between two craters, Manzinus C and Simpelius N, at a latitude of about 70.9° South 22.7° East / Alternate Site: 67.7 ° South 18.4° West" ; "touchdown velocity of 2 metres per second" |
| Impact site found by LROC | 70.8810 S, 22.7840 E, 834 m elevation | LROC post 1131 "Vikram Lander Found", 2019-12-02 https://lroc.im-ldi.com/images/1131 (primary, NASA/GSFC/ASU) | "70.8810°S, 22.7840°E, 834 m elevation" |

---

## S1. Yutu (Chang'e 3) traverse

A coordinate table or georeferenced route for the actual Yutu traverse was not found in an openable source. What exists:

| Fact | Value | Source | Quote / cell |
|---|---|---|---|
| Lander coordinates | 44.12 N, 340.49 E, Mare Imbrium | LROC post 811 "The Chang'e 3 Landing Site in 3D", 2014-10-07 https://lroc.im-ldi.com/images/811 (primary, NASA/GSFC/ASU) | "44.12°N, 340.49°E" |
| Lander coordinates, more digits | 44.1214 N, 340.4884 E | LROC post 751 "Still There!", 2014-03-04 https://lroc.im-ldi.com/images/751 (primary) | "44.1214°N, 340.4884°E" |
| Landing site per Chinese team (pre-landing paper) | 340.49 E, 44.12 N | Zhao J. et al., "Geologic characteristics of the Chang'E-3 exploration region", Sci. China Phys. Mech. Astron. 57(3), 569-576, 2014, doi 10.1007/s11433-014-5399-z (primary, peer-reviewed; pdftotext) | "The landing site of CE-3 is 340.49°E, 44.12°N" |
| Distance driven | "about 100 m (as measured from tracks seen in the LROC images)" | LROC post 811 (primary) | "Yutu only traversed about 100 m (as measured from tracks seen in the LROC images) before a mechanical failure left it stuck in place." |
| Distance driven, 114 m figure | 114 m | search-result summaries of Wikipedia/news (secondary) | "The rover was able to travel a distance of 114 meters on the Moon" |
| Rover position in early LROC image | about 17 m southwest of the lander | LROC post 751 (primary) | "tracking the rover's movement approximately 17 meters southwest of the lander" |
| Route map exists | Phil Stooke map for his Atlas of Lunar Exploration; the base is a mosaic of Chang'e 3 descent images; no coordinates in the caption | The Planetary Society "Yutu route map (final)" https://www.planetary.org/space-images/yutu-route-map (secondary, image page; credit CAS / Phil Stooke) | "The Yutu rover's path and scientific activities across the lunar surface, in a map produced by Phil Stooke for his Atlas of Lunar Exploration." |
| Zhao 2014 content | Proposes TWO PLANNED traverses ("Path 1", "Path 2"), made before landing; it is not a map of the real route | Zhao et al. 2014 (primary) | "We also suggest several rover traverses to explore interesting targets and maximize the potential scientific output." |
| Waypoints | Navigation points N101 to N208 | search-result summary only (secondary; I could not open the page that states it) | "traverse route and speed of the Yutu rover extends from navigation points N101 to N208" |

Lead, NOT verified by opening the page (search-result summary only): a Science China Physics, Mechanics & Astronomy 2014 paper doi 10.1007/s11433-014-5612-0 (Springer, blocked to the fetcher) is described as giving "traveled distance from the lander is 114.8 m from cross-site visual localization and 111.2 m from DOM matching localization" and a lander location "(19.51256°W, 44.11884°N, −2615.451 m)". Treat as a lead, not as a sourced value, until the page is read. 19.51256 W equals 340.48744 E, which agrees with the LROC 340.4884 E to 0.001 degree.

---

## S2. Pragyan (Chandrayaan-3) traverse

| Fact | Value | Source | Quote / cell |
|---|---|---|---|
| ISRO released a route map | Image from the rover navigation camera, posted on X, with the statement that the rover "has traversed 100 meters from the Shiv Shakti Point" | ISRO post https://x.com/isro/status/1697881823391711684 (primary, cited as ref [1] by Stooke; I did not open it); text via The Week 2023-09-02 https://www.theweek.in/news/sci-tech/2023/09/02/chandrayaan-3-isro-shares-map-of-pragyans-100-metre-route-on-lunar-surface.html (secondary) | "has traversed 100 meters from the Shiv Shakti Point where the Chandrayaan-3 lander Vikram touched down on August 23." ; The Week says the article has no coordinates |
| Rover total | about 103 m in one lunar day | search-result summary (secondary) | "The Pragyan rover traversed around 103 meters" |
| Crater event 2023-08-27 | crater 4 m diameter, 3 m ahead; rover retraced | The Week (secondary), quoting ISRO | "The Rover came across a four-meter diameter crater positioned three meters ahead of its location." |
| Peer-reviewed re-mapping of the traverse | Stooke P. J., "Chandrayaan 3 and Pragyan Rover: Traverse Analysis", 56th LPSC (2025), abstract 1025, https://www.hou.usra.edu/meetings/lpsc2025/pdf/1025.pdf (primary, conference abstract, exact text via pdftotext). Claims: the released maps "do not agree with each other or the ISRO map in many details"; "the APXS maps are more accurate than the original ISRO map"; the ISRO map "rotates the two excursions counterclockwise"; the map is "still uncertain" near West Crater | Stooke LPSC 2025 | "Several other maps of Pragyan's drive have been published, but they do not agree with each other or the ISRO map in many details." |
| Where the published maps are | ISRO map (ref 1, X post); Vadawale S. et al. 2024 Nature https://doi.org/10.1038/s41586-024-07870-7 (APXS team map); Vijayan S. et al. 2024 Icarus https://doi.org/10.1016/j.icarus.2024.116329 ; Ghosh R. et al. 2024 Int. Conf. Space Robotics (distorted map, per Stooke) | Stooke LPSC 2025 reference list (primary pointers; I did not open any of the four) | "[3] Vadawale, S. et al., 2024. Nature, https://doi.org/10.1038/s41586-024-07870-7. [4] Vijayan, S. et al., 2024. Icarus, https://doi.org/10.1016/j.icarus.2024.116329." |
| Final position | "unambiguously revealed by OHRC and LRO images" | Stooke LPSC 2025 (primary) | "The final position is unambiguously revealed by OHRC and LRO images." |
| Imagery for orbital matching | Chandrayaan-2 OHRC images, "c. 20-25 cm/pixel", from ISSDC | Stooke LPSC 2025 (primary) | "Chandrayaan 2 OHRC images of the landing site, currently the highest resolution available (c. 20-25 cm/pixel)" |
| Named features | South Crater (9 m diameter), crater A (about 1 m, on the South Crater rim), West Crater, crater B (2 m diameter) | Stooke LPSC 2025 (primary) | "a crater about 1 m across (crater A in Fig. 3) on the rim of the 9 m diameter South Crater" ; "a 2 m diameter crater (crater B in Fig. 2)" |
| Drive length of Stooke's re-mapping | not stated in the abstract | | |
| Landing point (lander) | 69°22′23″S 32°19′08″E ("Statio Shiv Shakti", between Manzinus C and Simpelius N), IAU approval 2024-03-19 | Wikipedia "Statio Shiv Shakti" https://en.wikipedia.org/wiki/Statio_Shiv_Shakti (secondary) | "69°22′23″S 32°19′08″E" |
| LROC imagery of the landing point | LROC took an oblique view on 2023-08-27 (42 degree slew); the rover and its tracks are not visible | search-result summary of news/space.com (secondary; the LROC page itself was not opened) | "In the LROC image, Pragyan is present but neither it nor its tracks appear visible." |
| ISRO OHRC image of the lander | ISRO page "Discovery of a buried crater on the moon" https://www.isro.gov.in/ISRO_EN/ch3_Discovery_of_a_buried_crater_on_the_moon.html | ISRO (primary; title seen in search results, not opened) | none read |

Result for S2: a peer-reviewed paper exists that compares the maps and says ISRO's own map has errors; no coordinate table for waypoints was found. Using the ISRO route image as the base is defensible only with the caveats in Stooke (2025).

---

## S3. Chandrayaan-2 facts table

| Fact | Value | Source | Quote / cell |
|---|---|---|---|
| Launch | 2019-07-22, 1443 hrs IST (= 09:13 UTC), GSLV MkIII-M1, Satish Dhawan Space Centre | ISRO press release "GSLV MkIII-M1 Successfully Launches Chandrayaan-2 spacecraft" https://www.isro.gov.in/Press%20Release5.html (primary) | "Jul 22,2019" "1443Hrs (2:43 pm) Indian Standard Time (IST)" |
| Injection orbit | 169.7 km x 45,475 km | same (primary) | "perigee (nearest point to Earth) of 169.7 km and an apogee (farthest point to Earth) of 45,475 km" |
| Masses (ISRO press release) | total 3840 kg; orbiter about 2,369 kg; lander 1,477 kg; rover 26 kg | same (primary) | "3840 kg" ; "about 2,369 kg" ; "1,477 kg" ; "26 kg" |
| Masses (ISRO brochure) | total 3,850 kg; orbiter 2,379 kg; Vikram 1,471 kg; Pragyan 27 kg | ISRO brochure https://www.isro.gov.in/media_isro/pdf/GSLVMkIII_M1.pdf (primary) | "3,850 kg" ; "2,379 kg" ; "1,471 kg" ; "27 kg" |
| Mass conflict | The two ISRO documents disagree (press release: launch-day figures; brochure: pre-launch figures). Wikipedia's 3850/2379/1471/27 matches the brochure. Pick one and cite it. | | |
| TLI | 2019-08-14, 02:21 IST, about 1203 s burn | ISRO Press Release 4 https://www.isro.gov.in/ISRO_EN/Press%20Release4.html (primary) | "The final orbit raising manoeuvre ... was successfully carried out today (August 14, 2019) at 02:21 am IST." |
| LOI | 2019-08-20, 0902 IST start, 1738 s; orbit 114 km x 18072 km | ISRO "Lunar Orbit Insertion" https://www.isro.gov.in/Lunar%20Orbit%20Insertion.html (primary) | "The duration of maneuver was 1738 seconds beginning from 0902 hrs IST." ; "a 114 km x 18072 km" |
| Orbiter orbit | polar, 100 km; "100 +/- 25 km polar orbit"; 100 km orbit reached 24 September 2019; 17 orbit-maintenance manoeuvres in the first year; fuel for about seven years | ISRO "Chandrayaan-2 completes a year around the Moon" https://www.isro.gov.in/media_isro/pdf/chandrayaan-2_completes_a_year_around_the_moon_.pdf (primary, pdftotext) | "The orbiter is being maintained in 100 +/- 25 km polar orbit" ; "since achieving 100 km lunar orbit on 24th September 2019" |
| Orbiter instruments (8) | TMC-2, OHRC, CLASS, XSM, IIRS, DFSAR, CHACE-2, DFRS | same ISRO PDF (primary); ISRO science page https://www.isro.gov.in/Chandrayaan2_science.html (primary) | "the orbiter, which was equipped with eight scientific instruments" |
| Lander instruments (3 + 1 passive) | Instrument for Lunar Seismic Activity (ILSA); Chandra's Surface Thermo-physical Experiment (ChaSTE); Langmuir Probe (RAMBHA-LP); passive Laser Retroreflector Array (LRA) | ISRO brochure (primary, pdftotext) | "Vikram Payloads: Instrument for Lunar Seismic Activity ... Chandra's Surface Thermo-physical Experiment ... Langmuir Probe ... Passive Experiment (on Vikram lander) Laser Retroreflector Array (LRA)" |
| Rover instruments (2) | Alpha Particle X-ray Spectrometer (APXS); Laser Induced Breakdown Spectroscope (LIBS) | ISRO brochure (primary) | "Pragyan Payloads: Alpha Particle X-ray Spectrometer ... Laser Induced Breakdown Spectroscope" |
| Rover range | 500 m at 1 cm/s | ISRO brochure (primary) | "It can travel up to 500 m (0.5 km) at a speed of 1 centimetre per second" |
| Vikram impact site | 70.8810 S, 22.7840 E; announced 2019-12-02 | LROC post 1131 (primary) | "70.8810°S, 22.7840°E, 834 m elevation" |
| Contact lost | "shortly before the scheduled touchdown (7 September in India, 6th September in the United States)"; ISRO: 2.1 km | LROC 1131 (primary); ISRO Chandrayaan_2.html (primary) | quotes above |
| Volunteer from Chennai | not re-verified in this pass | | |

---

## S4. Kaguya (SELENE) facts table

### Instrument count

| Source | Count | Quote / cell |
|---|---|---|
| JAXA SELENE site, "about_sat_e" https://www.selene.jaxa.jp/en/about/about_sat_e.htm (primary) | The mission-instrument table has 15 rows. The page does not state a total. | Rows: XRS, GRS, MI, SP, TC, LRS, LALT, LMAG, CPS, PACE, RS, UPI, RSAT, VRAD, HDTV |
| ISAS DARTS Kaguya page https://darts.isas.jaxa.jp/en/missions/kaguya (primary) | 15 | "The mission carried 15 primary scientific instruments" (fetch-summariser wording) |
| Kawakatsu Y., "SELENE translunar trajectory reconfiguration plan provided for the case of main engine anomaly", 20th ISSFD 2007, session 19 no. 3 (primary, JAXA/ISAS author; pdftotext) | 14 | "SELENE payload includes 14 instruments such as spectrometers and imagers." |
| NASA GSFC overview (Ahrens, citing Kato et al. 2010; search-result text) | 15 | "15 Mission Instruments (~300 kg)" (secondary; from a LSIC presentation in search results) |
| Why the counts differ | JAXA's 15-row table includes HDTV, RSAT and VRAD as separate lines. The 14 in the 2007 paper predates launch. I found no source that states which item is left out of 13 or 14; that explanation is not sourced. | |

Result: use 15 and cite the JAXA table (15 named rows) plus DARTS.

### Other facts

| Fact | Value | Source | Quote / cell |
|---|---|---|---|
| Launch | 2007-09-14, 10:31:01 a.m. JST, H-IIA, Tanegashima | JAXA SELENE page (primary) | "launched "KAGUYA (SELENE)" by the H-IIA Launch Vehicle at 10:31:01 a.m. on September 14, 2007 (JST)" |
| Masses | main orbiter "3 tons (at launch, including two small satellites)"; sub-satellites 50 kg each | JAXA SELENE page (primary) | "3 tons (at launch, including two small satellites)" ; "Mass: 50 kg" |
| Dimensions | about 2.1 x 2.1 x 4.8 m | DARTS (primary) | "approximately 2.1m × 2.1m × 4.8m" |
| Initially injected orbit (pre-launch plan) | 100 km x 13000 km, perigee altitude 1000 km before TLI | Kawakatsu ISSFD 2007, Fig. 2 (primary, pdftotext) | "Initially injected orbit 100×13000km" ; "Perigee altitude 1000km" |
| Earth phasing | one long elliptical phasing orbit, two rotations before TLI | Kawakatsu ISSFD 2007 (primary) | "SELENE is once injected into a long elliptical phasing orbit around the earth, and after two rotations on the phasing orbit, it is injected into the translunar trajectory" |
| LOI1 | 2007-10-04, JAXA planned start about 5:55 a.m. JST; completed 6:20 a.m. JST. No pre-LOI correction (dVc3) was needed. | JAXA press releases https://global.jaxa.jp/press/2007/10/20071004_kaguya_e.html and https://global.jaxa.jp/press/2007/10/20071005_kaguya_e.html (primary) | "from around 5:55 a.m. on October 4, 2007" ; "no preliminary orbital adjustment maneuver (ΔVc3) was necessary due to minimal orbit error" (summariser paraphrase of the second part) |
| LOI orbit achieved | apocynthion altitude 11,741 km; pericynthion altitude 101 km; period 16 h 42 min | JAXA press release 2007-10-05 (primary) | "Apocynthion altitude: 11,741 km; Pericynthian altitude: 101 km; Period: 16 hours 42 minutes" |
| LOI orbit, other figure | 100 x 13000 km (NASA/Kato overview) is the plan; JAXA's achieved orbit is 101 x 11,741 km. Use JAXA's achieved figure. | | |
| Okina (Rstar) release | 2007-10-09, 100 x 2400 km | search-result summary of Wikipedia (secondary); JAXA SELENE page gives the orbit (primary) | "Elliptical orbit (100km x 2,400km), Inclination 90 degrees" |
| Ouna (Vstar) release | 2007-10-12, 100 x 800 km | same | "Elliptical orbit (100km x 800km), Inclination 90 degrees" |
| 100 km circular polar orbit | reached by 2007-10-18/19 (sources differ by a day) | search-result summary (secondary) | "Kaguya reached the nominal observation orbit with 100 km circular and polar on October 18" ; "By October 19, the orbiter was in a circular 100-kilometre orbit" |
| Impact | 2009-06-11, 3:25 a.m. JST (= 2009-06-10 18:25 UTC), 65.5 S, 80.4 E, near Gill crater | JAXA press release "KAGUYA (SELENE) Slam Crashed to the Moon" https://global.jaxa.jp/press/2009/06/20090611_kaguya_e.html (primary) | "at 3: 25 a.m. on June 11, 2009 (Japan Standard Time)" ; "65.5 degrees south latitude, 80.4 degrees east longitude" ; "near GILL crater" |
| Impact date discrepancy | DARTS says impact June 11, operations concluded June 10 (JST vs UTC). Both are consistent with 3:25 JST on 11 June = 18:25 UTC on 10 June. | DARTS (primary) | "deliberately impacted on the near side of the Moon on June 11, 2009" |
| Mission phases | nominal operations about 10 months, extended phase about 7.5 months | JAXA press release 2009-06-11 (primary) | "Nominal operations: approximately 10 months; Extended operational phase: approximately 7.5 months" |

NASA's 63.9 S 75.9 E "target near Gill" (from the backlog) was not re-checked; JAXA's 65.5 S 80.4 E is the agency's own post-impact figure.

---

## L57. Delta-v, Earth-orbit phasing and manoeuvres

### Chandrayaan-2 Earth-orbit raising (ISRO, primary)

Sources: ISRO manoeuvre pages and press releases. I opened the first (https://www.isro.gov.in/First_earth_bound_maneuver.html), the fourth (https://www.isro.gov.in/Fourth%20earth%20bound%20maneuver.html) and the TLI release (https://www.isro.gov.in/ISRO_EN/Press%20Release4.html). Rows 2, 3 and 5 are from a search-result summary of the ISRO pages (title list included the ISRO URLs); the first search quoted the 2nd and 3rd explicitly. Mark 2, 3, 5 as "to confirm on the ISRO page".

| Manoeuvre | Date and time (IST) | Burn | Orbit (perigee x apogee, km) | Verified how |
|---|---|---|---|---|
| Launch injection | 2019-07-22, 1443 IST | | 169.7 x 45,475 | ISRO press release 5 (opened) |
| EBN-1 | 2019-07-24, 1452 | 48 s | 230 x 45,163 | ISRO page opened: "First earth bound orbit raising maneuver ... performed successfully today (July 24, 2019) at 1452 hrs (IST) as planned, using the onboard propulsion system for a firing duration of 48 seconds." |
| EBN-2 | 2019-07-26, 0108 | 883 s | 251 x 54,829 | search-result text quoting ISRO (not opened) |
| EBN-3 | 2019-07-29, 1512 | 989 s | 276 x 71,792 | search-result text quoting ISRO (not opened) |
| EBN-4 | 2019-08-02, 1527 | 646 s | 277 x 89,472 | ISRO page opened: "Fourth earth bound orbit raising maneuver for Chandryaan-2 spacecraft has been performed successfully today (August 2, 2019)" ; orbit "277 x 89472 km" |
| EBN-5 | 2019-08-06, 1504 | 1041 s | 276 x 142,975 | search-result text quoting ISRO (not opened); the 4th-manoeuvre page says the next one is scheduled for "August 6, 2019 between 1430-1530 hrs (IST)" (opened) |
| TLI | 2019-08-14, 02:21 | about 1203 s | lunar transfer trajectory (no orbit given) | ISRO Press Release 4 (opened) |
| LOI | 2019-08-20, 0902 | 1738 s | 114 x 18,072 | ISRO LOI page (opened) |
| LBN-2 | 2019-08-21, 1230-1330 (plan) | | 121 x 4303 (plan) | ISRO Press Release 4 (opened); planned values |
| LBN-3 | 2019-08-28, 0530-0630 (plan) | | 178 x 1411 (plan) | same |
| LBN-4 | 2019-08-30, 1800-1900 (plan) | | 126 x 164 (plan) | same |
| LBN-5 | 2019-09-01, from 1821 (achieved) | 52 s | 119 x 127 | ISRO "Fifth Lunar Orbit Maneuver" (opened); the plan in Press Release 4 was 114 x 128 |

Notes:

- EBN-1 to EBN-5 apogees: 45,163 / 54,829 / 71,792 / 89,472 / 142,975 km. Perigee after the first burn 230 km, then 251 / 276 / 277 / 276.
- Orbit-raising burns used the spacecraft's own liquid engine (ISRO: "using the onboard propulsion system").
- Achieved orbits for LBN-2, LBN-3 and LBN-4 were not obtained; only the planned values from Press Release 4. They need the ISRO "Second/Third/Fourth Lunar Orbit Maneuver" pages (not opened).

### Kaguya delta-v and phasing

| Fact | Value | Source | Quote |
|---|---|---|---|
| Nominal sequence | launch to 100 x 13000 km injected orbit, two phasing-orbit rotations, TLI, LOI | Kawakatsu ISSFD 2007 (primary) | see S4 |
| Nominal LOI delta-v | "more than 200 m/s" required to be captured at the planned lunar encounter condition | Kawakatsu ISSFD 2007 (primary) | "the original lunar encounter condition requires more than 200m/s of Δv to be captured by the Moon" |
| LOI engine | 500 N bi-propellant main engine; twelve 20 N mono-propellant thrusters | Kawakatsu ISSFD 2007 (primary) | "The Lunar orbit injection maneuver is planned to be performed by a 500N bi-propellant main engine." |
| Final TCM before LOI (plan) | about 3 days before LOI | Kawakatsu ISSFD 2007 (primary) | "the final trajectory correction maneuver planned at 3 days before LOI" |
| JAXA's statement | "launched in September 2007, KAGUYA was put into orbit around the Moon about three weeks after its launch, as initially planned" | ISAS "Forefront" page, Kawakatsu interview https://www.isas.jaxa.jp/e/forefront/2008/kawakatsu/02.shtml (primary) | "put into orbit around the Moon about three weeks after its launch, as initially planned" |

The ISSFD paper is a contingency plan (main-engine failure). Its other numbers (39.0 m/s adjust, 64.0 m/s DSM on 28 Sep, 116.1 m/s LOI on 24 Oct, swing-by 3 Sep) belong to the backup trajectory and were NOT flown; do not put them into the Kaguya flight block.

Warning: one search-result summary stated "The required velocity increment (delta V) is more than 20 km/sec for the full lunar transfer sequence". I could not find it in the paper and the paper's own figures are in the hundreds of m/s. Do not use that number.

### Tracking the actual Kaguya flight numbers

JAXA press releases for LOI1 exist (above). No source for the actual TLI burn size, the phasing-orbit apogee/period, or the actual TCM sizes was found.

---

## Not found

| Item | What I searched | Result |
|---|---|---|
| Horizons target ID "-1023" for Artemis I | "JPL Horizons Artemis I Orion spacecraft ID "-1023" OR "Artemis 1" target body Horizons" | No result confirms the ID. CelesTrak says Horizons carries it but names no ID. Query Horizons directly to confirm. |
| Contents and time span of the NASA Artemis I Ephemeris ZIP | not downloaded | Unverified; the download link is on the AROW page. |
| Dates column of the NASA Artemis I timeline table | fetched twice | Only MET and some text came back; clock dates for the outbound/return flyby burns are from search-result summaries (secondary). |
| DRO distances in NASA's table (typo "57,00 miles") | two fetches of the NASA timeline page and the FD13 blog | FD13 blog gives 43,138 miles from the Moon at 8 p.m. EST on 2022-11-28 (primary); no clean DRO insertion or apolune number found. |
| ISRO page with the Vikram descent table (altitudes, velocities, times) | "Chandrayaan-2 Vikram powered descent rough braking fine braking altitude 2.1 km contact lost ISRO"; "...55 km x 35 km de-orbit 7.4 km 400 m hover terminal descent ISRO" (limited to isro.gov.in, nasa.gov, thespacereview.com); fetched ISRO Press Release 3 and 6, Chandrayaan_2.html, mission page | ISRO pages do not state the profile. All phase numbers in F12 are secondary. |
| Velocity and time of contact loss | same queries | ISRO gives 2.1 km only. "About 50 m/s" is secondary. |
| Failure analysis committee report text | "Chandrayaan-2 Vikram failure analysis committee report ..." | Not published (secondary). |
| Georeferenced Yutu traverse (coordinates of waypoints) | "Yutu rover traverse map Chang'e-3 coordinates route 114 m ..."; "Chang'e-3 Yutu rover traverse path map LROC NAC N101 ..."; "Chang'e-3 Yutu rover localization traverse positions table waypoint coordinates ..."; "Chang'e-3 Yutu rover traverse route map coordinates waypoints stops LROC NAC Ziwei ..." | No coordinate table opened. Lead: Sci China 2014 doi 10.1007/s11433-014-5612-0 (Springer, blocked to the fetcher). Springer/Taylor and Francis/doaj pages returned 303/403. |
| Yutu LROC route image with coordinates | LROC posts 751, 811, 1109 and 1168 opened | 751 and 811 give lander position and "about 100 m" only; 1109 and 1168 are Chang'e 4 posts. |
| Pragyan waypoint coordinates | "Pragyan rover traverse path Chandrayaan-3 Shiv Shakti point LROC NAC rover tracks coordinates 69.373 S 32.319 E"; "ISRO Pragyan rover traverse ... navcam rover track image 100 m"; "LROC Chandrayaan-3 Vikram lander Shiv Shakti Point NAC image latitude longitude rover tracks Pragyan" | None found. Vadawale 2024 (Nature) and Vijayan 2024 (Icarus) not opened. |
| LROC NAC page for Shiv Shakti | same | News summaries only. |
| Kaguya decimal LOI/orbit-lowering date to about 50 km | "Kaguya SELENE lunar orbit insertion October 4 2007 Okina Ouna separation dates orbit lowered 100 km October 19 JAXA" | Not found; the lowering to about 50 km is a later extended-mission step, not sourced here. |
| Kaguya actual TLI delta-v, phasing orbit apogee/period, TCM sizes | "SELENE Kaguya Earth orbit phasing loops apogee lunar transfer orbit insertion delta-v maneuver ..."; "Kaguya SELENE lunar impact June 11 2009 ..." | Only the pre-flight contingency paper. Actual flown values not found. |
| NASA GSFC Ahrens Kaguya overview (NTRS 20220000366) | fetched twice | Timeout and HTTP 504; its content here comes only from search-result text. |
| Chandrayaan-2 lunar-bound manoeuvres 2-4, achieved orbits | not searched | Only planned values. |
| Chennai volunteer (S3 backlog item) | not searched | Not verified. |
| Kaguya NASA target 63.9 S 75.9 E | not rechecked | Not verified. |

Searches used: 23 of 40 WebSearch calls. Six of them returned several result blocks (the search tool ran extra internal queries), so the worst-case count is 29, still under 40.
