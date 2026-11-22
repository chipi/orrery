# Starship Flight 5 (13 Oct 2024), from sources (0.9.11 F3, 2026-11-22)

The operator chose Flight 5 for F3 (2026-11-22): of the three Super Heavy tower catches (Flights
5, 7, 8; Space.com, NSF), it is the only one whose ship completed its flight. Flight 8 (6 Mar
2025, the latest catch) lost its ship about 8 minutes in (several Raptors shut down, the vehicle
tumbled; SpaceX's mishap finding via AIAA, 27 May 2025); Flight 7's ship was also lost. Flight 15
(13-14 Nov 2026) caught the *ship* after 22 h while the booster was lost.

## Vehicle and trajectory

- Booster 12 and Ship 30 (Wikipedia "Starship flight test 5", infobox and lead).
- Launch 2024-10-13 12:25 UTC, Starbase OLP-1. Booster separation at 69 km. The ship reached a
  suborbital trajectory of about **-15 x 212 km x 26.2 deg**, re-entered over the Indian Ocean,
  made a controlled landing burn with water touchdown **1 h 5 m** after launch; a large fireball
  about **16 s** after it hit the water (McDowell, Jonathan's Space Report No. 838,
  https://planet4589.org/space/jsr/back/news.838.txt, primary for the orbit).
- Ship 30 was never intended to be recovered; it splashed down near a pre-positioned buoy that
  filmed it (Wikipedia, citing JSR 838 and the NSF broadcast).

## Timeline (T+ from liftoff)

SpaceX's mission page timeline (https://www.spacex.com/launches/mission/?missionId=starship-flight-5)
as the Wikipedia article's mission-timeline table carries it. spacex.com and its archived copies
are script-rendered and gave no text from this machine (2026-11-22), so these times are
**secondary (relayed)**; the splashdown time agrees with JSR 838's 1 h 5 m.

| Event | T+ |
| --- | --- |
| Liftoff | 00:00:02 in SpaceX's count (T-0 at engine ignition -3 s) |
| Max-Q throttle down | 00:01:02 |
| Super Heavy MECO | 00:02:35 |
| Hot staging (ship ignition, separation) | 00:02:40 |
| Boostback burn | 00:02:45 - 00:03:41 |
| Hot-stage jettison | 00:03:43 |
| Super Heavy landing burn start | 00:06:30 |
| Landing burn shutdown and **catch** | 00:06:54 |
| Ship SECO | 00:08:27 |
| Ship atmospheric re-entry | 00:48:03 |
| Transonic / subsonic | 01:02:34 / 01:03:43 |
| **Landing flip** | 01:05:15 |
| **Landing burn** | 01:05:20 |
| **Splashdown** (Indian Ocean) | 01:05:40 |

## Searches

3 WebSearch (catch list, Flight 8 outcome, Flight 5 timeline), Wikipedia raw text and JSR 838 by
curl, spacex.com (no text).

## Clock, and the science review (2026-11-22)

SpaceX's timeline puts liftoff at T+00:00:02 (T-0 is engine ignition). /fly's clock starts at
liftoff, so the shipped data and text use **time from liftoff = SpaceX T+ minus 2 s**: landing burn
6:28, catch 6:52 (412 s), SECO 8:25 (505 s), re-entry 48:01, splashdown 1:05:38. Intervals (the
coast's 2376 s, the descent's 1032 / 1057 s after re-entry) are unchanged.

`science-reviewer` (Sonnet, 2026-11-22): FIX-THEN-SHIP, 0 blockers. Fixed: the delta_v field
showed an entry *speed* (7.4 km/s, my estimate) as a delta-v (now "not published"); the 2 s clock;
"three catches" cited to a Flight-5-only Fortune article (the F2 provenance row); "broke it apart
... as expected" (the sources say only that a fireball erupted about 16 s after splashdown); "about"
on the orbit; booster separation "about 70 km" (secondary); "two arms" (the sources say "arms").
Kept: `round_trip: true` (the flight ends back on Earth; the ship is not recovered, said in the
text). Not found: the splash coordinates (one search: only "Indian Ocean", on target, near a
buoy) — the descent profile's `landingSite` and entry speed are declared in `estimatedFields`.
