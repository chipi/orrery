# Apollo 11's way home: sourced figures (2026-11-24)

Research for the way-home act (`2026-11-24-apollo-way-home-plan.md`). Read-only research by a sonnet
agent; quotes are from the fetched pages, OCR spacing normalised.

Sources:
- **MR**: Apollo 11 Mission Report MSC-00171 (Nov 1969),
  https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf
- **SP-4029**: NASA Apollo 11 chronology,
  https://www.nasa.gov/wp-content/uploads/static/history/SP-4029/Apollo_11a_Summary.htm and
  `Apollo_11h_Transearth_Phase.htm` (read through a summariser; numbers match MR).
- **AFJ**: Apollo Flight Journal, https://apollojournals.org/afj/ap11fj/ (pages `19day6-rendezvs-dock`,
  `20day6-reboard-lmjett`, `21day6-tei`, `27day9-entry`).

Range zero 13:32:00 GMT, 16 July 1969 (MR Table 3-I). UTC marked "derived" = range zero + GET.

| Event | GET | Values | Source | Quote |
|---|---|---|---|---|
| LM liftoff | 124:22:00.8 | 17:54:00 GMT 21 Jul (SP-4029); 10 s vertical rise first | MR Table 3-I, §5.6 | "Lift-off from the lunar surface occurred on time at 124:22:00.8" |
| Ascent burn | to 124:29:15.7 | 434.9 s; Δv 6,070.1 ft/s | MR Table 7-V, §9.9 | "fired for 435 seconds from lunar lift-off to orbital insertion" |
| Insertion orbit | 124:29:15.7 | 48.0 × 9.4 n.mi (Table 7-V: 9.1); 60,300 ft, radial 32 ft/s, downrange 5,537.0 ft/s | MR §3, Table 5-V | "inserted into a 48.0- by 9.4-mile orbit" |
| CSI | 125:19:35.5 | 47.0 s, 51.5 ft/s; 49.3 × 45.7 | MR Table 7-V | |
| CDH | 126:17:49.6 | 17.8 s, 19.9 ft/s; 47.4 × 42.1 (LM held ~15 n.mi below the CSM) | MR Table 7-V; AFJ | |
| TPI | 127:03:51.8 | 22.7 s, 25.3 ft/s; 61.7 × 43.7 | MR Table 7-V | |
| Terminal phase finalize | 127:46:09.8 | 28.4 s, 31.4 ft/s; 63.0 × 56.5 | MR Table 7-V | |
| CSM orbit | | 62 × 56 n.mi (AFJ: 56.6 × 62.5) | MR §5.7; AFJ | "(62 by 56 miles)" |
| Docking | 128:03:00 | ~4.5 h after liftoff | MR Table 3-I | "Docking 128:03:00" |
| Crew back in the CM | 129:51:02 | probe and drogue stowed in the LM | AFJ 20day6 | "We're all three back inside. The hatch is installed." |
| LM ascent stage jettison | 130:09:31.2 | at 61.6 n.mi; CSM separation burn 130:30:01, 7.2 s, 2.2 ft/s | MR Table 3-I, Table 7-V; SP-4029 | "Ascent stage jettison 130:09:31.2" |
| TEI | 135:23:42.3 | SPS, 151.4 s, Δv 3,279.0 ft/s (~999.5 m/s); behind the Moon, start of rev 31; AOS 135:34:05 | MR Table 7-VI; AFJ 21day6 | "Transearth injection Service propulsion 135:23:42.3 151.4 3279.0" |
| Midcourse correction (MCC-5) | 150:29:57.4 | SM RCS, 4.8 ft/s, the only one on the way home | MR §7.4.9 | "the first and only transearth midcourse correction of 4.8 ft/sec" |
| CM/SM separation | 194:49:12.7 | ~15 min before entry | MR Table 3-I | "Command module/service module separation 194:49:12.7" |
| Entry interface (400,000 ft) | 195:03:05.7 | 36,194.4 ft/s (~11,032 m/s); −6.48°; 3.19 S, 171.96 E; peak 6.56 g | MR Table 7-VII, §4.19 | "195:03:05.7 … 36 194.4 … -6.48" |
| Drogues | 195:12:06.9 | altitude not in MR | MR Table 7-VII via AFJ | "the drogues were deployed at 195:12:06.9" |
| Mains | ~195:13:22 (AFJ, not measured) | ~3 km (10,000 ft), barometric switch | AFJ 27day9 | "about 3 km (10,000 feet) altitude" |
| Splashdown | 195:18:35 | 16:50:35 GMT 24 Jul; 13.30 N, 169.15 W; USS Hornet | MR Table 3-I, §7.5; SP-4029 | "Landing 195:18:35" |
| After splashdown | | apex down (Stable II), uprighted in under 8 min | MR §4.20 | "rotated the command module into the apex down (stable II) flotation position" |

## Disagreements
- Splashdown GET: MR 195:18:35 (official) vs PAO's unofficial 195:18:21. Use MR.
- Insertion perilune: 9.4 (MR summary, SP-4029) vs 9.1 n.mi (MR Table 7-V).
- TEI length: 151.4 s (Table 7-VI) vs "150-second" (MR summary) vs 148 s (PAD). Use 151.4.
- MCC length: 11.2 s (MR Table 7-VI) vs 10.0 s (SP-4029).

## Not found
Drogue deploy altitude; a measured main-chute GET; a single insertion-velocity scalar (MR gives radial
and downrange components only); UTC beyond liftoff and splashdown (others derived).
