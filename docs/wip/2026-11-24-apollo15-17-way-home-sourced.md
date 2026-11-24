# Apollo 15, 16, 17: sourced figures for the way home (2026-11-24)

Read-only research. Quotes are verbatim from the fetched text; OCR spacing normalised where the scan was letter-spaced.
Anything marked "OCR" is a digit read off a poor scan and should be eyeballed against the PDF page before it goes into code.

Sources:
- **MR15**: Apollo 15 Mission Report MSC-05161, https://ntrs.nasa.gov/api/citations/19720021182/downloads/19720021182.pdf
- **MR16**: Apollo 16 Mission Report MSC-07230, https://ntrs.nasa.gov/api/citations/19720026127/downloads/19720026127.pdf (poor OCR)
- **MR17**: Apollo 17 Mission Report JSC-07904, https://ntrs.nasa.gov/api/citations/19730015117/downloads/19730015117.pdf (poor OCR)
- **SP-TL**: NASA SP-4029 timelines, https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_15i_Timeline.htm (also `Apollo_16i_Timeline.htm`, `Apollo_17i_Timeline.htm`); GET + GMT per event, to the second where MR has it.
- **SP-TE**: SP-4029 transearth tables, https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_15h_Transearth_Phase.htm (`16h`, `17h`); burn duration, dv, FPA.
- **SP-ENT**: SP-4029 "Entry, Splashdown, and Recovery" (Apollo 7-17 in one table), https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_18-40_Entry_Splashdown_and_Recovery.htm. Footer: "Compiled from mission reports, USN Historical Office data, Apollo Program Summary Report (JSC-09423) and other sources." Its Apollo 11 column (6.56 g, L/D 0.300, 195:18:35) matches the Apollo 11 template.
- **AFJ15 / AFJ16**: https://apollojournals.org/afj/ap15fj/25b-day13_entry-splashdown.html , https://apollojournals.org/afj/ap16fj/30_Day12.html . The Apollo 17 Flight Journal index on apollojournals.org stops at day 9; no entry page found.

Not usable: nasa.gov `/history/alsj/...` and `/history/afj/...` return a 299 KB stub; the `static/history/alsj/a15/a15mr-N.htm` pages return 404 to curl. All three mission reports were read from NTRS PDFs.

**No Entry Postflight Analysis exists for 15/16/17.** MR15/16/17 Appendix E supplement tables list "Entry Postflight Analysis" only for older flights (dated Dec 1969 / Apr 1970; Apollo 13's is "Cancelled"). The mission reports give no L/D and no first/second max/min load factor. L/D, peak g and range come from SP-ENT (secondary compilation). Reconstructed relative vs inertial range, first/second max, minimum load factor: **not found**.

Range zero: A15 13:34:00 GMT 26 Jul 1971 (MR15 Table 3-I: "Range zero - 13:34:00 G.m.t., July 26, 1971"); A16 17:54:00 GMT 16 Apr 1972 (MR16: "Lift-off (Range zero = 17:54:00 G.m.t., April 16, 1972)"); A17 05:33:00 GMT 7 Dec 1972 (SP-TL "Liftoff (umbilical disconnected). 000:00:00.63 05:33:00 07 Dec 1972"; MR17 "Lift-off (Range zero = 342:05:33:00 G.m.t.)", launch delayed 2 h 40 min by a hardware fault).

## Apollo 15

| Event | GET | Values | Source | Quote |
|---|---|---|---|---|
| LM liftoff | 171:37:23.2 | 02 Aug 1971 17:11:23 GMT; stay "66 hours 54 minutes and 53 seconds" | SP-TL; MR15 Table 3-I | "Lunar ascent 171:37:23" |
| Ascent burn | to 171:44:34.2 | 431 s (cutoff minus ignition); dv 6059 ft/s (OCR) | SP-TL; MR15 Table 3-V | "Ascent Lunar module ascent propulsion 171:37:23.2 431 6059" |
| Insertion orbit | ~171:44 | 42.5 x 9.0 n.mi; no vernier adjustment | MR15 3.2.3 | "inserted into a 42.5-by-9.0-mile orbit ... a vernier adjustment maneuver was not required" |
| Rendezvous burns flown | TPI 172:29:40.0 (2.6 s, ~73 ft/s); MCCs; TPF 173:11:07 | Direct rendezvous, no CSI/CDH: ascent, TPI, midcourse corrections, TPF/braking. TPI 72.7 ft/s on the LM guidance computer (Table 3-V prints "12.7", an OCR slip) | MR15 3.2.3, Table 7-V; SP-TL | "The direct rendezvous technique, first used on Apollo 14, was executed nominally" |
| CSM orbit at rendezvous | | 64.5 x 53.6 n.mi after the plane change (165:11:33, SPS, 18.3 s, 330.6 ft/s); CSM orbit "was off-nominal" for TPI | MR15 Table 3-V(b), 9.10.1 | "Lunar orbit plane change Service propulsion 165:ll:32.7 18.3 330.6 64.5 53.6" |
| Docking | 173:36:25.5 | 19:10:25 GMT 2 Aug; "about 1 hour 50 minutes after completion of the ascent maneuver" | SP-TL; MR15 3.2.3 | "hard-docked about 1 hour 50 minutes after completion of the ascent maneuver" |
| Crew back in the CM | 176:40 | CDR and LMP entered CSM, hatch closed. The tunnel seal/suit-integrity check delayed jettison one rev | SP-TL; MR15 3.2.4 | "CDR and LMP entered CSM and hatch closed. 176:40" |
| LM ascent stage jettison | 179:30:01.4 | CSM separation burn 2 ft/s posigrade at ~179:50 (planned 1 ft/s retrograde). Deorbit 181:04:19.8; impact 181:29:37.0 at 26 deg 21 min N, 0 deg 15 min E, ~93 km W of landing site | MR15 3.2.4; SP-TL | "LM ascent stage jettisoned. 179:30:01.4" |
| SIM bay | door jettisoned 74:06:47.1 (29 Jul 15:40:47 GMT, before LOI at 78:31:47) | SIM bay stays on the SM for the rest of the flight (visible CSM difference; Worden's EVA reaches into it). A15 SIM bay houses mapping camera, pan camera, laser altimeter, subsatellite launch | MR15 Table 3-I; SP-TL | "Scientific instrument module door jettisoned. 074:06:47.1" |
| Orbit shaping | 221:20:48.0 | SPS, 3.4 s, 66.4 ft/s; 16.0 x 54.3 n.mi (OCR) | MR15 Table 3-V | "Orbit shaping Service propulsion 221:20:48 3.4 66.4" |
| Subsatellite release | 222:39:29.1 | 20:13:29 GMT 4 Aug; orbit 76.3 x 55.1 mi, inclination -28.7 deg; launched ~1 h after shaping | SP-TL; MR15 3.2.5 | "inclination of minus 28.7 degrees with an apocynthion of 76.3 miles and a pericynthion of 55.1 miles" |
| TEI | 223:48:45.84 | SPS, 140.90 s, dv 3,046.8 ft/s (928.7 m/s); 21:22:45 GMT 4 Aug; FPA +4.43 at cutoff, 8,272.4 ft/s | SP-TE; MR15 Table 3-V(c) | "Transearth injection ignition 223:48:45.84 ... cutoff 223:51:06.74 140.90 3,046.8" |
| Transearth EVA (Worden) | 241:57:12 to 242:36:19 | ~39 min (MR: "approximately 38 minutes"); film cassettes retrieved ~242:22; CM hatch open, CMP at SIM bay; 15:31:12 GMT 5 Aug start | SP-TL; MR15 1.0 | "Transearth EVA - Camera cassette retrieved. 242:22" |
| Midcourse corrections | 291:56:49.9 (the only one) | SM RCS, 22.3 s, 5.6 ft/s; "seventh midcourse correction opportunity" | SP-TE; MR15 1.0, 3.3 | "no midcourse corrections were made until about 3 hours prior to entry. A 5.6-ft/sec maneuver was performed using the service module reaction control system" |
| CM/SM separation | 294:43:55.2 | 20:17:55 GMT; ~15 min before EI; 23.85 S 139.91 E, 1,951.8 n.mi, 29,001.7 ft/s, FPA -36.44 | MR15 Table 3-III; SP-TL | "The service module was separated from the command module 15 minutes prior to entry" |
| Entry interface | 294:58:54.7 | 20:32:54 GMT 7 Aug; 36,096.4 ft/s (~11,002 m/s); FPA -6.51 deg; 14.23 N, 175.02 E (SP-ENT; MR table OCR agrees); heading 52.06 | SP-ENT; MR15 Table 3-III | "Entry Earth 294:58:54.7 14.23 N 175.02 E 65.9 36 096.4 -6.51 52.06" (OCR of table) |
| Peak g | n/a | 6.23 g (SP-ENT). PAD predicted 6.2; Scott: "the g levels agreed all the way into 6 g's" | SP-ENT; AFJ15 | "Maximum g ... 6.23" |
| Entry L/D, range, duration | | L/D 0.290; range EI to target 1,184 n.mi; EI-to-splash 778.3 s; max heating 289 BTU/ft2/s; total heat 25,881; EI heading 52.06 deg. Relative vs inertial range not stated | SP-ENT | "Lift To Drag Ratio ... 0.290"; "Range (n mi) ... 1,184" |
| Blackout | end 295:02:31 | SP-TL prints "Communication blackout started 295:59:13" (typo; ~294:59:13) | MR15 Table 3-I; SP-TL | "End blackout 295:02:31" |
| Forward heat shield jettison | 295:06:45 | | MR15 Table 3-I | "Forward heat shield jettison 295:06:45" |
| Drogues | 295:06:46 | 20:40:46 GMT. Altitude not given | MR15 Table 3-I | "Drogue deployment 295:06:46" |
| Mains | 295:07:34 | 20:41:34 GMT; "approximately 10 500 feet" (6.0 section) / "10 000 feet" (pilot's report) | MR15 6.1, 9.13 | "Main parachute deployment for earth landing, beginning at approximately 10 500 feet, was normal" |
| Main parachute failure | at ~6,000 ft, ~295:09 | One of three mains "deflated to approximately one-fifth of its full diameter at about 6000 feet altitude", descended to landing on two. Photo helicopter reported it 295:09:54. Touchdown "about 32 seconds earlier" than with three. Landing "higher than normal"; crew optical alignment sight fell off its bracket. Cause: riser/connector link failure, oxidiser (RCS depletion firing) damage suspected. Landing speed on two chutes: AFJ says "28 feet per second, or 32 feet per second, versus 28 feet on 3 chutes" (source text garbled; no MR value found) | MR15 14.1.9, 9.13, 13.x; AFJ15 | "One of the three main parachutes was deflated to approximately one-fifth of its full diameter at about 6000 feet altitude. The command module descended in this configuration to landing." |
| Splashdown | 295:11:53 | 20:45:53 GMT 7 Aug 1971 (MR: "2045:53 G.m.t."). 26.13 N, 158.13 W (SP-ENT); MR computed 26 deg 7 min 48 s N, 158 deg 8 min 24 s W; recovery fix 26 deg 7 min 30 s N, 158 deg 9 min W; ~1 n.mi from target; ship USS Okinawa | MR15 1.0, 13.x; SP-ENT | "a safe landing was made at 295:11:53" |
| After splashdown | | Stable I (apex up); chutes released, settled around CM in low wind; crew aboard Okinawa by helicopter ~39 min after landing | MR15 13.x | "remained in the Stable I flotation attitude" |
| CM entry mass | | 12,953 lb at entry (OCR, CM after separation 12,965); 11,731 lb at landing (SP-ENT 11,731 agrees) | MR15 Table A-III; SP-ENT | "Entry 12 953" |

## Apollo 16

| Event | GET | Values | Source | Quote |
|---|---|---|---|---|
| LM liftoff | 175:31:47.9 | 24 Apr 1972 01:25:47 GMT | SP-TL; MR16 Table 3-I | "Lunar ascent 175:31:48" |
| Ascent burn | to 175:38:55.7 | 427.8 s; MR table 427.7 s, dv 6054.2 ft/s | SP-TL; MR16 Table 3-V | "Ascent Ascent propulsion 175:31:48 427.7 6054.2" (OCR) |
| Insertion orbit | 175:38:56 | 40.2 x 7.9 n.mi (OCR; text "40-mile by 8-mile"); ~33,000 ft further downrange than desired; vernier adjustment 10 ft/s at 175:42:18 | MR16 3.3.3, Table 3-V | "inserted into a 40-mile by 8-mile lunar orbit about 7 minutes later ... a vernier adjustment maneuver of 10 ft/sec was necessary" |
| Rendezvous burns flown | vernier 175:42:18; TPI 176:26:05 (2.5 s, 78.0 ft/s); MCC1 176:35; MCC2 176:50; TPF 177:08:42 | Direct rendezvous (no CSI/CDH); TPI 78.5 ft/s CM computer, 78.0 LM computer | MR16 Table 3-V, Table 7-VI; SP-TL | "Terminal phase initiation ... 176:26:05 2.5 78.0" (OCR) |
| CSM orbit at rendezvous | | 64.6 x 55.0 n.mi after plane change at 169:05:52 (SPS, 7.1 s, 124.0 ft/s) (OCR). Circularisation was delayed 5 3/4 h by an SPS secondary yaw gimbal oscillation (landing delayed); circ burn 103:21:43 SPS, 4.7 s, 81.6 ft/s | MR16 Table 3-V, 3.3.1, 1.0 | "a service propulsion system control problem ... caused a 5 3/4-hour delay in the circularization maneuver" |
| Docking | 177:41:18 | 03:35:18 GMT 24 Apr; "about 2 hours and 10 minutes after lunar lift-off" | SP-TL; MR16 3.3.3 | "Docking 177:41:18" |
| Crew back in the CM | ~180:00 (no discrete hatch time) | "After docking, the lunar module was powered-down and the crew returned to the command module overnight." Transfer/stowing 178:15 to 180:00; transfer of items to LM 192:00 to 192:30; hatch closeout 194:30 | MR16 7.5; SP-TL | "Transfer and stowing of equipment and samples ended. 180:00" |
| LM ascent stage jettison | 195:00:12 | 20:54:12 GMT 24 Apr; CSM separation burn 195:03:13. Attitude control of the LM was lost at jettison (28-V enabling voltage did not reach preamps); **no deorbit, no lunar impact by planned burn**, "expected orbital lifetime of about one year" | SP-TL; MR16 1.0, 3.3.4 | "Attitude control of the lunar module was lost at jettison; consequently, a deorbit maneuver was not possible." |
| SIM bay | door jettisoned 69:59:01 (19 Apr 15:53:01 GMT, before LOI at 74:28:27.9) | SIM bay present on the SM through entry (visible CSM difference). A16 also jettisoned the mass-spectrometer boom at 195:23:12 (boom stalled), so the SIM bay sides lose that boom before TEI | MR16 Table 3-I; SP-TL | "Mass spectrometer boom jettisoned. 195:23:12" |
| Subsatellite release | 196:02:09 | 21:56:09 GMT 24 Apr, launched without the planned orbit-shaping maneuver (cancelled), into a short-life orbit; tracking lost rev 425 (29 May 1972) = impact | SP-TL; MR16 1.0, 3.3.5 | "the subsatellite was placed in a non-optimum orbit that resulted in a much shorter lifetime than the planned year" |
| TEI | 200:21:33.07 | SPS, 162.29 s, dv 3,370.9 ft/s (1,027.5 m/s); 02:15:33 GMT 25 Apr; FPA +5.12 at cutoff, 8,663.0 ft/s; "after 64 revolutions". Brought ~24 h earlier than planned (second plane change and some photography deleted) | SP-TE; MR16 3.4, 1.0 | "transearth injection could be performed about 24 hours earlier than originally planned" |
| Transearth EVA (Mattingly) | 218:39:46 to 220:03:28 | 83.7 min (MR "1-hour and 23-minute"); 20:33:46 to 21:57:28 GMT 25 Apr; retrieved film cassettes, inspected SIM, exposed microbial experiment | SP-TL; MR16 1.0 | "A 1-hour and 23-minute transearth extravehicular activity was conducted by the Command Module Pilot to retrieve the film cassettes" |
| Midcourse corrections | MCC-2 214:35:02.8; MCC-3 262:37:20.7 | MCC-2 22.6 s, 3.4 ft/s (SP-TE; MR Table 3-V OCR "8.0 s"); MCC-3 6.4 s, 1.4 ft/s (SP-TE; MR OCR "3.2 s"). MR calls both "Reaction control". "Two midcourse corrections were made during transearth flight" | SP-TE; MR16 3.4, Table 3-V(c) | "Second midcourse correction ... 214:35:03 ... 3.4" |
| CM/SM separation | 265:22:33 (MR) | SP-TL gives 265:22:23; 15 min before EI | MR16 Table 3-I; SP-TL | "Command module/service module separation 265:22:33" |
| Entry interface | 265:37:31 | 19:31:31 GMT 27 Apr; 36,196.1 ft/s (~11,033 m/s); FPA -6.55; 19.87 S, 162.13 W (MR "19:52 S 162:08 W"); heading 21.08 | MR16 Table 3-III; SP-ENT | "Entry interface 265:37:31 19:52 S 162:08 W 65.8 36 196.1 -6.55 21.08" (OCR) |
| Peak g | n/a | 7.19 g (SP-ENT). Pilot's report: "entry deceleration, which exceeded 7-g". AFJ16 PAD value 6.87 g (predicted) | SP-ENT; MR16 9.13; AFJ16 | "which exceeded 7-g" |
| Entry L/D, range, duration | | L/D 0.286; range EI to target 1,190 n.mi; EI-to-splash 814.0 s; max heating 346 BTU/ft2/s; total heat 27,939. Relative vs inertial range not stated | SP-ENT | "Lift To Drag Ratio ... 0.286" |
| Blackout | 265:37:47 to 265:41:01 | | MR16 Table 3-I | "Begin blackout 265:37:47" |
| Forward heat shield jettison | 265:45:25 | | MR16 Table 3-I | |
| Drogues | 265:45:26 | 19:39:26 GMT. Pilot noted large CM oscillations on the drogues | MR16 Table 3-I, 9.13 | "The only unexpected condition was the magnitude of the command module oscillations once the drogue parachutes were deployed" |
| Mains | 265:46:16 | 19:40:16 GMT. All three mains good; "all three main parachutes were recovered" | MR16 Table 3-I, 13.x | "Main parachute deployment 265:46:16" |
| Splashdown | 265:51:05 | 19:45:05 GMT 27 Apr 1972. 0.70 S, 156.22 W (SP-ENT); MR computer 0 deg 42 min 0 s S, 156 deg 12 min 48 s W; recovery fix 0 deg 44 min 18 s S, 156 deg 14 min 6 s W; 3 n.mi from target; ship USS Ticonderoga | SP-ENT; MR16 1.0, 13.x | "Landing occurred at 1945 G.m.t." |
| After splashdown | | Landed Stable I and "immediately went to the Stable II (apex down) flotation attitude"; uprighted in ~4.5 min (265:55:30); landing "flat and much harder"; crew on deck <37 min | MR16 13.x, 9.13; SP-TL | "immediately went to the Stable II (apex down) flotation attitude. Uprighting to the Stable I attitude required approximately four and one-half minutes" |
| CM entry mass | | 13,015 lb at entry (OCR; CM after separation 13,026); 11,995 lb at landing (SP-ENT agrees) | MR16 Table A-IV; SP-ENT | "Entry 13 015" |

## Apollo 17

| Event | GET | Values | Source | Quote |
|---|---|---|---|---|
| LM liftoff | 185:21:37 | 14 Dec 1972 22:54:37 GMT; ~75 h on surface | SP-TL; MR17 3.3.3 | "LM lunar liftoff ignition (LM APS). 185:21:37" |
| Ascent burn | to 185:28:58 | 441 s; dv 6075.7 ft/s (OCR) | SP-TL; MR17 Table 3-V | "Ascent Ascent propulsion 185:21:37 ... 6075.7" (OCR) |
| Insertion orbit | 185:28:56 | 48.5 x 9.1 n.mi (OCR); "Approximately 7 1/2 minutes later, the ascent stage was inserted"; vernier 10 ft/s at 185:32:12 | MR17 3.3.3, Table 3-V | "The achieved orbit required a vernier adjustment maneuver of 10 ft/sec to return the orbit to the planned conditions for rendezvous" |
| Rendezvous burns flown | CSM orbital trim 178:54:05 (RCS, 37 s, 9.2 ft/s); CSM plane change 179:53:54; LM vernier 185:32:12; TPI 186:15:58 (3.1 s, ~54 ft/s); TPF; docking | Direct rendezvous. CSM trim to 67.3 x 62.5 n.mi because "the planned decay of the CSM altitude ... was not realized. This was similar to the experience of Apollo 15". Plane change duration 20.05 s from SP-TL (RCS) vs 23.1 s "Service propulsion" in MR OCR (disagreement) | MR17 3.3.3, Table 3-V; SP-TL | "an orbital trim maneuver was performed to change the CSM apocynthion to 67.3 miles and the pericynthion to 62.5 miles" |
| CSM orbit | | 70 x 54 n.mi after circularisation at 109:17:29 (SPS, 3.8 s); 67.3 x 62.5 after trim; ~62.8 x 62.5 after plane change (OCR) | MR17 3.3.1, Table 3-V | "the command and service module orbit was circularized into one having a 70-mile apocynthion and a 54-mile pericynthion" |
| Docking | 187:37:15 | 15 Dec 01:10:15 GMT | SP-TL; MR17 3.3.3 | "the two vehicles were docked at 187 hours 37 minutes 15 seconds" |
| Crew back in the CM | 190:10 | "CDR and LMP entered CM"; transfer/stowing 188:00 to 190:05; LM closeout 190:30 | SP-TL | "CDR and LMP entered CM. 190:10" |
| LM ascent stage jettison | 191:18:31 | 04:51:31 GMT 15 Dec ("four hours after docking"); CSM separation burn 191:23:31 (12 s, RCS); deorbit 192:58:14 to 193:00:10; **impact 193:17:20.8** at 19 deg 57 min 58 s N, 30 deg 29 min 23 s E, 9.9 km from the landing site | SP-TL; MR17 3.3.4 | "impact occurred at 19 degrees 57 minutes 58 seconds north latitude, and 30 degrees 29 minutes 23 seconds east longitude" |
| SIM bay | door jettisoned 81:32:40 (10 Dec 15:05:40 GMT, ~4.5 h before LOI at 86:14:22.6) | SIM bay stays on the SM to entry. No subsatellite on Apollo 17 (SIM carries the lunar sounder and IR radiometer, not a subsatellite) | MR17 Table 3-I; SP-TL | "Scientific instrument module door jettisoned. 081:32:40" |
| Subsatellite release | n/a | not flown on Apollo 17 (no event in SP-TL; no mention in MR17 summary) | SP-TL | not found by design |
| TEI | 234:02:09.18 | SPS, 143.69 s, dv 3,046.3 ft/s (928.5 m/s); 23:35:09 GMT 16 Dec; FPA +2.46 at cutoff, 8,374.3 ft/s; CSM remained in lunar orbit "approximately 43 hours after the lunar module was jettisoned" | SP-TE; MR17 3.4 | "The transearth injection maneuver was initiated at 234 hours 2 minutes 9 seconds" |
| Transearth EVA (Evans) | 254:54:40 to 256:00:24 | 65.7 min; CM hatch closed 255:40; 20:27:40 to 21:33:24 GMT 17 Dec. Purpose (film retrieval) not quoted: MR17 EVA text not read | SP-TL | "Transearth EVA started (Evans). 254:54:40" |
| Midcourse corrections | 298:38:01 (the only one) | SM RCS, 9 s, 2.1 ft/s; 16:11:01 GMT 19 Dec | SP-TE; MR17 3.4 | "only one midcourse correction was required during transearth coast, and that was at three hours prior to entry with a differential velocity of 2.1 ft/sec" |
| CM/SM separation | 301:23:49 | 18:56:49 GMT; 15 min before EI | MR17 Table 3-I; SP-TL | "Command module/service module separation 301:23:49" (OCR "3O1:23:49") |
| Entry interface | 301:38:38 | 19:11:38 GMT 19 Dec; 36,090.3 ft/s (~11,000 m/s); FPA -6.49; 0.71 N, 173.34 W; heading 156.53 (SP-ENT). MR17 text: "entered the atmosphere 1200 miles from the landing point" | SP-ENT; MR17 3.4 | "The command module entered the atmosphere 1200 miles from the landing point" |
| Peak g | n/a | 6.49 g | SP-ENT | "Maximum g ... 6.49" |
| Entry L/D, range, duration | | L/D 0.290; range EI to target 1,190 n.mi; EI-to-splash 801.0 s; max heating 346 BTU/ft2/s; total heat 27,939 (same as Apollo 16 in the table, suspect copy). Relative vs inertial range not stated | SP-ENT | "Lift To Drag Ratio ... 0.290" |
| Blackout | 301:38:55 to 301:42:15 | | SP-TL; MR17 | "Communication blackout started. 301:38:55" |
| Forward heat shield jettison | 301:46:20 | | MR17 Table 3-I; SP-TL | |
| Drogues | 301:46:22 | 19:19:22 GMT | SP-TL | "Drogue parachute deployed 301:46:22" |
| Mains | 301:47:13 | 19:20:13 GMT | SP-TL | "Main parachute deployed. 301:47:13" |
| Splashdown | 301:51:59 | 19:24:59 GMT 19 Dec 1972 (MR: "1925 G.m.t."). 17.88 S, 166.11 W (SP-ENT); MR computer 17 deg 52 min 48 s S, 166 deg 6 min 36 s W; recovery fix 17 deg 53 min S, 166 deg 8 min 36 s W; 1.3 n.mi short of target; ship USS Ticonderoga | SP-ENT; MR17 3.4, 12.x | "the landing occurred 1.3 miles short of the targeted point" |
| After splashdown | | "landed normally and remained in the stable I attitude" (SP-TL: apex-up); crew aboard Ticonderoga 20:17 GMT | MR17 12.x | "The command module landed normally and remained in the stable I attitude." |
| CM entry mass | | ~13,152 lb after CM/SM separation (OCR, unconfirmed); 12,120 lb at landing (SP-ENT) | MR17 Table A-II; SP-ENT | "Command module 13 152" (OCR) |

## Disagreements and cautions
- A15 Stable: MR and the recovery call say Stable I (apex up); SP-TL "went to apex-up" agrees. A16 landed Stable I then went Stable II (apex down) and uprighted in ~4.5 min; MR16 9.13 says the chutes "immediately pulled the vehicle into the stable-II attitude".
- A16 CM/SM separation: MR16 265:22:33 vs SP-TL 265:22:23 (MR 14:58 before EI, SP 15:08).
- A16 midcourse burn durations: MR Table 3-V OCR "8.0 s" and "3.2 s" vs SP-TE 22.6 s and 6.4 s (use SP-TE). MR labels both RCS ("Reaction control"); SP-TL does not say.
- A15 Table 3-V TPI dv prints "12.7"; Table 7-V (rendezvous solutions) gives 72.7 ft/s LM computer. Use ~73.
- A15 main deploy altitude: 10,500 ft (6.1) vs 10,000 ft (9.13); MR time table has heat shield 295:06:45, drogue :46, main 295:07:34.
- A15 blackout start printed 295:59:13 in both MR and SP-TL (typo, ~294:59:13).
- A15 recovery fix 26 deg 7 min 30 s N 158 deg 9 min W (MR 13.x) vs computer 26 deg 7 min 48 s N 158 deg 7 min 12 s W (MR 6.x) vs 158 deg 8 min 24 s W (MR 1.0).
- A17 plane change: SP-TL RCS 20.05 s vs MR17 OCR "Service propulsion" 23.1 s.
- A17 and A16 share max heating 346 and heat load 27,939 in SP-ENT (likely a copied cell).
- MR17 text says landing "December 19, 1973" (typo for 1972).
- A16 SP-ENT peak g 7.19 vs AFJ16 PAD predicted 6.87; A15 6.23 vs PAD 6.2.
- A15 MR OCR "Entry 12 953" mass is the weight at entry after SM separation; its table header only says "lb".

## Not found
- Entry postflight analysis for any of the three (none exists in the MR supplement lists); hence no reconstructed hypersonic L/D beyond the SP-ENT 0.290 / 0.286 / 0.290, no relative vs inertial range split, no first/second maximum or minimum load factor.
- Drogue and main deploy altitudes (A16, A17); measured descent rate under the chutes (A15 two-main landing speed only as garbled AFJ text; A16/A17 none).
- A16 subsatellite orbit elements; A17 SIM-bay "no subsatellite" is by absence, not a quote.
- A17 transearth EVA purpose quote and A17 AFJ entry/TEI pages (AFJ17 index ends at day 9).
- A17 CM entry mass (only OCR of "after separation").
- A16/A17 CM/SM sep and EI lat/lon in non-OCR form beyond SP-ENT; "crew back in CM" for A16 is not a discrete event in any source read.
- Stable I/II for A17 only from MR12.x and SP-TL "apex-up"; no uprighting event.
