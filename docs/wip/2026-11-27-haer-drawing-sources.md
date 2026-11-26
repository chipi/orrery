# HAER measured drawings for other models (2026-11-27)

Library of Congress HAER sheets (public domain), found through their Wikimedia Commons mirror
(loc.gov answers scripted requests with a Cloudflare challenge). Each is a scaled, dimensioned
drawing that can be overlaid the way TX-116-A was for the orbiter.

| Sheet | What it gives | Model it serves |
|---|---|---|
| TX-116 sheet 3, *Full stack elevations* (3/32" = 1'-0") | top, starboard, forward, aft views of the stack; dimensioned: height 56.40 m, SRB 45.72 m, SRB centres 6.36 m apart, span over the SRBs 18.01 m, orbiter 37.04 m | `launcher-models.ts` `buildSpaceShuttle` (today proportional: `r = vehLen * 0.05`, its own simplified orbiter) |
| TX-116-K sheet 3, *Solid Rocket Boosters* (3/16" = 1'-0") | longitudinal section: 45.72 m, 12'-2" OD, segment lengths, nose cap / frustum / skirt, nozzle 12'-5" exit, aft skirt 17'-4" | SRBs in the same stack |
| TX-116-J sheets 2–3, *External Tank* isometric and details | ET shape, intertank, feedline, attach points | ET in the same stack |
| TX-116-I, *Space Shuttle Main Engine* (2 sheets) | SSME | orbiter engines, stack |
| TX-116-A sheets 11, 12, 13 | payload bay and RMS; OMS/RCS; thermal protection (tile layout) | RMS missions; orbiter tile and panel detail |
| AL-129-C sheet 18, *Shaker Placement, Saturn V* (1:192) | SA-500D full elevation: 363'-0" (110.64 m), 33'-0" and 21'-8" diameters, every stage length, the LES, fins and F-1s | `launcher-models.ts` `buildSaturnV` (proportional today) |

Not found on Commons: drawings of the Lunar Module, Apollo CSM, Mercury or Gemini capsules,
Hubble, the crawler-transporter or the mobile launcher. The launch-complex HAER sets (LC-39,
Vandenberg SLC-3, Cape LC-17) are pads and towers, not vehicles.
