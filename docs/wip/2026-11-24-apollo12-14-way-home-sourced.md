# Apollo 12 and Apollo 14 way home: sourced figures (2026-11-24)

Read-only research for the way-home act, same format as `2026-11-24-apollo11-way-home-sourced.md`. Quotes are from
the fetched files, OCR spacing normalised ("[?]" = OCR doubtful). "Not found" means I did not find it, not that it
does not exist.

## Sources

- **A12-MR**: Apollo 12 Mission Report MSC-01855, https://apollojournals.org/alsj/a12/A12_MissionReport.pdf (same file
  as history.nasa.gov/alsj/a12/A12_MissionReport.pdf and ibiblio.org/apollo/Documents/A12_MissionReport.pdf). OCR is poor.
- **A12-TR**: Apollo 12 MR Supplement 1, Trajectory Reconstruction and Postflight Analysis vol 1 (TRW),
  https://apollojournals.org/afj/ap12fj/pdf/a12-mr-traj-recon-19740077273.pdf
- **A12-SP**: SP-4029 summary and transearth pages,
  https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_12a_Summary.htm and `Apollo_12h_Transearth_Phase.htm`
- **A12-AFJ**: https://apollojournals.org/afj/ap12fj/ pages `18day6_lmjett_rev33_35.html`, `24day10_sf3th.html`
- **A14-MR**: Apollo 14 Mission Report MSC-04112, https://apollojournals.org/afj/ap14fj/pdf/a14_mission-report.pdf
- **A14-TR**: Postflight Evaluation of the Apollo 14 Spacecraft Trajectories (MSC 04330, 26 May 1971),
  https://apollojournals.org/alsj/a14/A14PostFlightTrajAnal_HSI-43756.pdf
- **A14-SP**: https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_14a_Summary.htm (and `Apollo_14h_...`)
- **A14-AFJ**: https://apollojournals.org/afj/ap14fj/ pages `24_day6_docking_a14.html`, `25_day6_packing_crash_antares.html`,
  `34_day9_reentry_splashdown.html`

**Apollo 14 clock trap.** The A14 Journal pages print mission-timer GET, which was moved forward 40 min 2.9 s at 054:53:36
(AFJ: "All transcript times are presented according to the GET update at 054:53:36 that saw the mission timer moved forward
40 minutes, 2.90 seconds"). The Mission Report and SP-4029 use time from actual liftoff (range zero 21:03:02 GMT). So the
AFJ clock = MR clock + 40:02.9 for everything after that update. Check: MR drogues 215:56:08 vs AFJ "216:36:12 Mitchell:
There's the drogue." (difference 40:04). All A14 GETs below are on the MR clock unless marked "AFJ clock". Apollo 12 has no
such offset (MR splash 244:36:25 vs AFJ "244:36:23 Recovery: Splashdown.").

Range zero A12: 16:22:00 GMT, 14 Nov 1969 (A12-MR Table 5-I). Range zero A14: 21:03:02 GMT, 31 Jan 1971 (A14-MR).
UTC marked "derived" = range zero + GET.

## Apollo 12 (Intrepid / Yankee Clipper), way home

| Event | GET | Values | Source | Quote |
|---|---|---|---|---|
| LM liftoff | 142:03:48 (SP: 142:03:47.78) | 20 Nov 1969 14:25:48 GMT (derived); LM had been on the surface 31 h 31 m 11.6 s | A12-MR Table 5-I; A12-SP | "Lunar li ft -off 142:03:48" ; "ignition of the ascent stage engine for lunar liftoff occurred at 142:03:47.78" |
| Ascent burn | to ~142:10:5x | SP-4029: 434 s ("1.2 seconds longer than planned"). MR Table 5-VI lists 423.2 s and a 30 ft/s late-arm overburn removed by RCS trim. Disagreement, see below | A12-SP; A12-MR §9.11.1, Table 5-VI | "The 434-second burn was 1.2 seconds longer than planned" |
| Insertion orbit | 142:10:59.9 (SP time) | 51.93 x 9.21 n.mi (SP-4029). MR Table 5-VI "Lunar orbit insertion, Ascent propulsion ... 6057.0 ft/s, 46.3 x 8.8" (likely pre-trim) | A12-SP; A12-MR | "placed the spacecraft into an orbit of 51.93 by 9.21 n mi at 142:10:59.9" |
| CSI (coelliptic sequence initiation) | 143:01:51 | 41.1 s, 45.0 ft/s; MR 51.0 x 41.5, SP 51.49 x 41.76 n.mi | A12-MR Table 5-VI; A12-SP | "A 41.1-second coelliptic orbit maneuver at 143:01:51.0 raised the orbit to 51.49 by 41.76 n mi" |
| CDH | 144:00:02.6 | 13.0 s, 13.8 ft/s; 44.4 x 40.4 | A12-SP; A12-MR | "A 13.0-second constant differential height maneuver at 144:00:02.6 lowered the orbit to 44.4 by 40.4 n mi" |
| TPI | 144:36:26 | 26.0 s, 29.0 ft/s; 60.2 x 43.8 | A12-SP | "A 26.0-second terminal phase initiate maneuver occurred at 144:36:26 and brought the ascent stage to an orbit of 60.2 by 43.8 n mi" |
| TPF (terminal phase finalisation) | 145:19:29.3 | 38.0 s, 40 ft/s; 62.3 x 58.3 | A12-SP | "the ascent stage made a 38.0-second maneuver at 145:19:29.3 to finalize the orbit at 62.3 by 58.3 n mi" |
| CSM orbit | | 62.6 x 57 n.mi at 147:43 (PAO); 62.0 x 57.5 after the separation burn | A12-AFJ; A12-SP | "We presently show Apollo 12 with an apolune of 62.6 nautical miles, perilune of 57 nautical miles" |
| Docking | 145:36:20 (SP 145:36:20.2) | at 58.14 n.mi altitude; undocked 37 h 42 m 17.9 s | A12-MR Table 5-I; A12-SP | "Lunar orbit docking 145:36:20" |
| Crew back in the CM | ~147:50 (PAO inference, no exact time) | hatch secured about 147:35-147:50 | A12-AFJ 18day6 | "We've not yet received verbal confirmation ... that they are both now back in Yankee Clipper, but we feel reasonably assured that they have effected their return" (at 147:50) ; "All 3 crew members now back in the Yankee Clipper" (at ~147:58) |
| LM ascent stage jettison | 147:59:32 (SP 147:59:31.6) | CSM separation burn 148:04:30.9, 5.4 s, 1.0 ft/s | A12-MR Table 5-I; A12-SP | "Ascent stage jettison 147:59:32" |
| LM deorbit and impact | deorbit 149:28:15; impact 149:55:16 (MR) / 149:55:17.7 (SP) / 149:55:16.4 (TR) | RCS deorbit 82.1 s, 196 ft/s; impact 3.42 S, 19.67 W, about 39 n.mi ESE of the landing site, 5 n.mi from target | A12-MR Table 5-I; A12-SP; A12-TR | "Ascent stage impact 149:55:16" ; "39 n mi east southeast of the Apollo 12 landing site and 5 n mi from the target" |
| TEI | 172:27:16.8 ignition; cutoff 172:29:27.1 | SPS 130.3 s, delta-v 3,042.0 ft/s (about 927 m/s); 21 Nov 1969 20:49:17 GMT (derived; TR gives 21:20:49:15.8). After 45 lunar revs | A12-MR Table 5-VIII; A12-SP; A12-TR | "Transearth injection Service propulsion 172:27:16.8 130.3 3042.0 -7.24 36 116" |
| Transearth midcourse corrections | 188:27:15.8 (4.4 s, 2.0 ft/s); 241:21:59.7 (5.7 s, 2.4 ft/s) | Two, both SM RCS. MR labels them "second" and "third" (MCC-1 was translunar). Predicted EI flight-path angle after them -6.42 deg, then -6.48 deg | A12-MR Table 5-I, 5-VIII, §9.14; A12-SP | "During transearth coast, two midcourse corrections were required. The first midcourse correction was 2 ft/sec and the second was 2.4 ft/sec." |
| CM/SM separation | 244:07:20 (SP 244:07:20.1) | 15 min before EI; SM then fired RCS to depletion, never sighted | A12-MR Table 5-I; A12-SP | "Command module/service module separation 244:07:20" |
| Entry interface (400,000 ft) | 244:22:19.1 | 36,116 ft/s inertial (36,116.6 per SP; about 11,009 m/s); flight-path angle -6.48 deg; 13.80 S, 173.52 E; 65.8 n.mi geodetic; heading 98.16 deg. TR reconstruction: -6.4834 deg, 13.7947 S, 173.5279 E. 24 Nov 1969 20:44:19 GMT (TR) | A12-MR Table 5-IX; A12-TR §5.2.4 | "Time, hr:min:sec 244:22:19.1 ... Space-fixed velocity, ft/sec 36 116 ... Space-fixed flight-path angle, deg -6.48" |
| Peak g | not found (actual) | Predicted "maximum g forces during entry of 6 point 2" (PAO). Conrad on the first pulse: "6g" (informal). Second pulse "Pulling 3g's" (Gordon) | A12-AFJ 23day9, 24day10 | "We also show expected maximum g forces during entry of 6 point 2." ; "244:27:25 Gordon: Pulling 3g's, and it starts the Earth mode." |
| Blackout | begins EI+19 s, ends EI+3:28 (planned) | S-band contact regained about 244:27:04 | A12-AFJ 24day10 | "244:27:04 Conrad: Hello, Houston. You read Apollo 12 out of blackout?" |
| Drogues | 244:30:43 (MR: 8 min 24 s after EI; plan was 8:04) | AFJ call 244:30:44; plan altitude ~23,000 ft | A12-MR §9.15; A12-AFJ | "the actual deployment did not occur until 8 minutes 24 seconds" ; "244:30:44 Bean: Got drogues, Houston." |
| Mains | ~244:31:33 | 3 mains, "not reefed" then dereefed; Conrad called 10,000 ft just before; AFJ clock call, not a measured MR time | A12-AFJ 24day10 | "244:31:33 Conrad: There go the mains. Three, but they're not reefed. There they go. They dereefed." |
| Splashdown | 244:36:25 | 20:58:25 GMT 24 Nov 1969 (15:58:25 EST per SP); recovery-calculated 15 deg 46.6 min S, 165 deg 9.0 min W (SP: 15.78 S, 165.15 W); about 2 n.mi from target (target 15 49 S 165 10 W); 3.91 n.mi from ship USS Hornet | A12-MR §11.3.1, Table 5-I; A12-SP | "The command module landed at 244:36:25 (2058 G.m.t.) at a point calculated by recovery forces to be 15 degrees 46.6 minutes south latitude and 165 degrees 9.0 minutes west longitude." |
| Impact severity | | "extremely hard"; about 15 g; entered the water at about 20-22 deg instead of the nominal 27.5 deg; heat-shield portions knocked loose | A12-MR §9.15; A12-SP | "the landing impact was extremely hard ... corresponds to an impact acceleration of about 15g" |
| After splashdown | | landed Stable I then Stable II (apex down) at once; uprighted to Stable I in 4 min 26 s (about 2058-2103 GMT) | A12-MR §11.3.1 | "immediately went to the stable II (apex down) attitude. The uprighting system returned the command module to the stable I attitude 4 minutes 26 seconds later." |
| CM entry mass | | 12,275.5 lb (about 5,568 kg) at "Entry" row of Table A-II (OCR "12 275.5", doubtful); 12,263.5 lb after CM/SM separation (OCR doubtful); 11,050.2 lb at landing (also SP-4029) | A12-MR Table A-II; A12-SP | "The estimated CM weight at splashdown was 11,050.2 pounds" |

### Apollo 12 distinctive about the way home
- The splashdown camera: the 16 mm sequence camera in the right rendezvous window broke off its bracket at impact and hit
  Bean above the right eye (A12-MR §9.15: "contacted the Lunar Module Pilot above the right eye"; A14-AFJ later notes "Alan
  Bean needed stitches when the camera came off its bracket and hit him on the face").
- Hardest splashdown of the programme (about 15 g), apex-down immediately, uprighted in 4 min 26 s.
- On the way home the crew photographed an eclipse of the Sun by the Earth (A12-MR §9.14: "the observation and photography
  of a solar eclipse that occurred when the earth came between the spacecraft and the sun").
- The lunar-orbit crew-transfer and jettison were uneventful; the ascent stage was crashed 39 n.mi from the landing site
  (not the planned 5 n.mi, because of a 2 s deorbit overburn).

## Apollo 14 (Antares / Kitty Hawk), way home

| Event | GET (MR clock) | Values | Source | Quote |
|---|---|---|---|---|
| LM liftoff | 141:45:40 | 18:48:42 GMT 6 Feb 1971 (SP-4029; matches range zero + GET); on the surface 33 h 30 m 31 s | A14-SP; A14-TR | "Ignition of the ascent stage engine for lunar liftoff occurred at 18:48:42 GMT (13:48:42 EST) on 6 February at 141:45:40." |
| Ascent burn | 141:45:40 to about 141:52:52 | 432.1 s, delta-v 6,066.1 ft/s | A14-MR Table 6-V(b); A14-SP | "The 432.1-second firing of the ascent engine placed the vehicle directly into a 51.7 by 8.5 n mi orbit" |
| Insertion orbit | about 141:52:52 | 51.7 x 8.5 n.mi, direct insertion. Post-insertion trim of dVx -1.2, dVz -2.5 ft/s (TR). 12.1 s RCS vernier ("tweak") at 141:56:49.4, 10.3 ft/s, 4 min after cutoff, gave 51.2 x 8.4 | A14-SP; A14-MR §6.2.2; A14-TR | "the first use of a direct lunar orbit rendezvous in the Apollo program" ; "a reaction control system vernier adjustment maneuver of 10.3 ft/sec was performed approximately 4 minutes after ascent engine cutoff" |
| Rendezvous type | | DIRECT, one revolution: NO CSI, NO CDH flown. Sequence flown: vernier adjustment 141:56:49.4; TPI 142:30:51 (APS burn, 3.6 s, 88.5 ft/s, 60.1 x 46.0); two small midcourse corrections; TPF 143:13:29.1 (RCS, 26.7 s, 32 ft/s, 61.5 x 58.2); docking | A14-MR §6.0; Table 6-V; A14-TR | "A direct rendezvous was performed using the ascent propulsion system to perform the terminal phase initiation maneuver." |
| CSM orbit | | 63.9 x 56.0 after circularisation (105:11:46); about 61.5 x 58.2 at docking; 63.4 x 56.8 after the separation burn; docking altitude 58.6 n.mi | A14-MR Table 6-V; A14-SP | "to finalize the orbit at 61.5 by 58.2 n mi for docking with the CSM at 143:32:50.5 at an altitude of 58.6 n mi" |
| Docking | 143:32:51 (TR 143:32:50.5) | 1 h 47 m 10 s after liftoff; AFJ clock capture 144:12:33, hard dock 144:12:55. No probe problems this time | A14-MR Table 6-I, §6.2.2; A14-AFJ | "docking occurred 1 hour 47 minutes 10 seconds after lunar lift-off" ; "144:12:55 Roosa: Okay. And we got hard dock." |
| Crew back in the CM | about 145:24 (AFJ clock 146:04:01 "Go for final closeout") | No exact hatch-close time published. Probe and drogue then stowed (probe tied down at the foot of the LMP couch for entry) | A14-AFJ 25; A14-MR §9.15 | "We don't have a precise time for the crew transfer to the Command Module, however, Mitchell reported at 146 hours that they were ready for the transfer" (AFJ clock) |
| LM ascent stage jettison | 145:44:58 (AFJ clock 146:25:00; "146:25:19 Mitchell: And we bid sayonara to Antares.") | CSM separation burn 145:49:42.5, 15.8 s, 3.4 ft/s, gave 63.4 x 56.8 | A14-MR Table 6-I, 6-V; A14-TR | "Lunar module jettison 145:44:58" |
| LM deorbit and impact | deorbit 147:14:16.9 (RCS 76.2 s, 186 ft/s); impact 147:42:23 (TR 147:42:23.4; SP 147:42:23.7) | 3.42 S, 19.67 W; 36 n.mi west of the Apollo 14 site, 62 n.mi from Apollo 12, 7 n.mi from target; fired deliberately to trigger the seismometers | A14-MR Table 6-I; A14-TR; A14-SP | "Lunar module lunar impact 147:42:23" ; "guided to impact approximately 36 miles west of the Apollo 14 landing site" |
| TEI | 148:36:02.3 ignition; cutoff 148:38:31.5 | SPS 149.2 s, delta-v 3,460.6 ft/s (about 1,055 m/s); 7 Feb 1971 01:39:04 GMT (derived); rev 34; "slight hum or buzz" in the SPS for the last 20 s | A14-MR Table 6-V(c), §9.13; A14-TR | "Transearth injection, Firing time = 149.2 sec 148:36:02" ; "Transearth injection occurred during the 34th lunar revolution at about 148-1/2 hours" |
| Transearth midcourse | 165:34:56.7 (single one) | SM RCS, 3.0 s; delta-v 0.5 ft/s (Table 6-V and TR) vs "0.7 ft/sec" (MR §9.14 total). Planned 0.7 ft/s; executed gave EI flight-path angle -6.63 deg predicted | A14-MR Table 6-V, §9.14; A14-TR | "The only midcourse correction during the transearth coast phase was one reaction control system maneuver performed approximately 17 hours after transearth injection." |
| CM/SM separation | 215:32:42.2 | 15 min before EI; CM turned blunt end forward | A14-MR Table 6-I; A14-TR | "Command module/service module separation 215:32:42" |
| Entry interface (400,000 ft) | 215:47:45.3 | 36,170.2 ft/s (about 11,025 m/s); flight-path angle -6.37 deg (TR Table VII "Entry" column; Table IX OCR "-6.[?]7"); 36.36 S, 165.80 E; 66.8 n.mi; 20:50:47 GMT 9 Feb 1971 (derived); blackout began EI+17 s (215:48:02), ended 215:51:19 | A14-TR Tables I, VII; A14-MR Table 6-I; A14-SP | "Entry occurred at 215:47:45.3 at latitude 36.36 S and longitude 165.80 E." ; "Begin blackout 215:48:02 ... End blackout 215:51:19" |
| Peak g | about EI+1:29 (AFJ clock 216:29:14) | 6.75 g on the EMS (crew call); PAO predicted 6.2; second pulse "3g's"; 0.05 g light never lit, EMS started manually at 0.05 g time +3 s | A14-AFJ 34; A14-MR §9.15 | "216:29:14 Shepard (onboard): 6.75." ; "216:32:26 Roosa (onboard): Going right at 3g's." |
| Drogues | 215:56:08 (AFJ clock 216:36:12) | EI + 8:23 | A14-MR Table 6-I; A14-AFJ | "Drogue deployment 215:56:08" ; "216:36:12 Shepard: Drogues are out." |
| Mains | about 215:56:58 (AFJ clock 216:37:01 "the mains are out free ... we got all three") | about 10,000 ft (AFJ: "Waiting for mains at 10K"); main-chute deploy weight 12,130.8 lb | A14-AFJ 34; A14-MR Table A-II | "216:37:01 Roosa: And there go the drogues. And the mains are out free. Oh, we got all three." |
| Splashdown | 216:01:58 (TR 216:01:58.1) | 21:05:00 GMT 9 Feb 1971 (16:05 EST); 27.01 S, 172.65 W (TR); recovery-calculated 27 deg 0 min 45 s S, 172 deg 39 min 30 s W; miss 0.62 n.mi from target, 3.8 n.mi from USS New Orleans | A14-MR §11.3.1; A14-TR; A14-SP | "The command module landed February 9, 1971, at 2105 G.m.t. and remained in the stable I flotation attitude." |
| After splashdown | | Stable I straight away (no Stable II); landing "milder than anticipated"; one main chute stayed fouled on the CM and was cut loose by swimmers; recovery arrived before the 10-minute wait for uprighting bags ended; crew aboard ship 48 min after splashdown | A14-MR §9.15; A14-AFJ | "The parachutes were jettisoned and the spacecraft remained in the stable I attitude." ; "216:42:19 Shepard: We're Stable I." |
| CM entry mass | | 12,703.5 lb (about 5,762 kg) at "Entry"; 12,715.1 lb right after CM/SM separation; 11,481.2 lb at landing | A14-MR Table A-II; A14-SP | "The estimated CM weight at splashdown was 11,481.2 pounds" |

### Apollo 14 distinctive about the way home
- The docking trouble was on the way out; this docking was clean, but on final braking the LM abort guidance system failed
  (A14-MR: "the lunar module abort guidance system failed after the system was no longer required").
- Apollo 14 is the first direct (one-revolution) lunar-orbit rendezvous: no CSI/CDH, an APS terminal-phase burn, docking
  1 h 47 m after liftoff.
- The probe and drogue were removed and, for the first time on a lunar return, the docking probe was tied down for entry at
  the foot of the LMP couch (A14-MR §9.15).
- Ascent stage was crashed deliberately to give the seismometers a calibrated moonquake (AFJ: "triggering seismic detectors").
- Transearth coast: oxygen flow-rate test, a no-ground-contact navigation exercise, and four zero-g demonstrations on TV.
- Entry went exactly on target (0.6 n.mi miss), but a main chute remained fouled on the CM at splashdown and the 0.05 g
  light never came on.

## Disagreements and gaps

- **A12 ascent burn and insertion orbit.** MR Table 5-VI: 423.2 s, 46.3 x 8.8 n.mi; SP-4029: 434 s, 51.93 x 9.21 n.mi at
  142:10:59.9. MR §9.11.1 describes a 30 ft/s overburn nulled by RCS, so Table 5-VI is likely the pre-trim state. The time
  142:10:59.9 appears in both (MR table lists it in the "Ignition time" column, which cannot be ignition for a 423-434 s burn
  started at 142:03:48).
- **A12 CSI orbit.** MR 51.0 x 41.5 vs SP 51.49 x 41.76.
- **A12 LM impact time.** 149:55:16 (MR Table 5-I), 149:55:16.4 (TR), 149:55:17.7 (SP); AFJ PAO planned 149:55:53.2.
- **A12 entry mass.** The Table A-II OCR for the CM "Entry" row reads 12 275.5 lb with the row label garbled; read as the
  entry row, not independently checked.
- **A14 midcourse delta-v.** 0.5 ft/s (Table 6-V(c), TR Table VIII, SP-4029) vs 0.7 ft/s (MR §9.14).
- **A14 entry flight-path angle.** TR Table VII "Entry" column -6.37 deg; the MCC-5 targeting columns show -6.63 and -6.35;
  Table I OCR "-6.[?]7". Use -6.37.
- **A14 clock.** AFJ pages are 40:02.9 ahead of the MR/SP clock (see top). EST in SP-4029 (4:05 pm) agrees with 21:05 GMT;
  the TR table's "3:05 p.m." is not EST.
- **A14 crew-in-CM time.** Not published as one instant; "final closeout" go at AFJ-clock 146:04:01 (MR clock about 145:24).
- **A12 crew-in-CM time.** Not published; PAO inference only (about 147:50).

### Not found (both missions)
- The entry postflight analyses: "Apollo 14 Entry Postflight Analysis", MSC IN 71-FM-102, 26 Mar 1971 is cited in A14-TR
  (reference list) but is not on NTRS or the Journal documents pages I searched; no Apollo 12 equivalent found. NTRS
  search for "Apollo 12/14 entry postflight" returned nothing relevant; apollojournals ap12fj/ap14fj document indexes list
  no entry analysis (pdf directory listing returns 403).
- Therefore **not found** for either mission: reconstructed hypersonic L/D, relative and inertial range from EI to target,
  first/second maximum load factor as reconstructed (only crew/PAO call-outs above), minimum load factor between pulses,
  EI-to-splashdown time as a published figure (derivable: A12 244:36:25 - 244:22:19 = 14 min 06 s; A14 216:01:58 - 215:47:45
  = 14 min 13 s).
- Measured main-chute GET (MR) for either mission; drogue/main altitudes from the MR.
- A12 range zero is the only 16:22:00 GMT figure; other A12/A14 UTC values are derived unless noted.
- Targets: A12 target 15 49 S, 165 10 W (AFJ PAO; MR §11.3.1); A14 target about 27 S 172.6 W (landing 0.62 n.mi from it).
