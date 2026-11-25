# F8: the activity clock — before and after

Operator 2026-11-25: "minutes of material that are just boring, can we scale time in monotonic
fashion on launch/landing in logarithmic manner (clock ticks faster when not much is changing)";
"Ok on F8".

`src/lib/fly/activity-clock.ts`: from the flight's samples, a play rate over mission time:
- busy (altitude, speed or felt load changing ~10 %/s) plays at the speed pill (1×), calm
  (0.1 %/s or less) at up to 30× that, on a log scale between;
- the separations, chutes and touchdown keep the old slow-motion beat (0.22× at the event);
- the rate is slew-limited in wall time (from 1× to 30× takes at least 2 real seconds, before an
  event as after it), so the clock eases;
- it scales only the clock's advance: the clock stays mission time, a scrub is exact, the MET
  readout is real. Positive everywhere: it never stops or runs back.

Phase 1 (this commit) replaces, for play, the separation slow-motion, Earth's fixed 30 s entry,
and the Shuttle's compressed coast. The scrubber layout (descent-timewarp, launch-coast-warp)
stays as it was.

Wall seconds at the default speed pills (launch 5×, descent 3×), computed from the flight
summaries (`zz-clock-report*.tmp.test.ts` in the session scratchpad). In the browser the dev
page clamps a frame to 0.05 s, so a software-rendered test browser under 20 fps plays everything
proportionally slower (Apollo 11's landing timed at 115 s there against 68 s here, Curiosity 169 s
against 98 s: the same ratio for both).

**The one that gets longer:** an Earth entry played in a fixed 33–35 s; it now takes 60–140 s.
Operator 2026-11-25: "cap them". `EARTH_ENTRY_PLAY_CAP_S` (35 s at the default 3×): an Earth entry's clock is sped up evenly to fit, so the event beats keep their shape but play proportionally faster (`fly-clock-earth-cap.test.ts`).

## Launches

| Launch profile | mission s | today | activity clock |
|---|---|---|---|
| ariane-1 | 704 | 150 | 40 |
| ariane-5 | 851 | 179 | 40 |
| ariane-5g | 676 | 142 | 37 |
| athena-ii | 424 | 94 | 39 |
| atlas-agena | 517 | 113 | 38 |
| atlas-centaur | 687 | 146 | 40 |
| atlas-lv-3b | 391 | 83 | 31 |
| atlas-v | 797 | 168 | 41 |
| delta-ii | 709 | 153 | 43 |
| delta-iv-heavy | 735 | 156 | 42 |
| falcon-9 | 589 | 125 | 36 |
| falcon-heavy | 567 | 122 | 38 |
| h-iia | 837 | 176 | 42 |
| h3 | 730 | 155 | 41 |
| long-march-2f | 524 | 112 | 36 |
| long-march-3a | 694 | 148 | 40 |
| long-march-3b | 685 | 148 | 41 |
| long-march-5 | 771 | 163 | 42 |
| lvm3 | 1018 | 213 | 45 |
| m-v | 483 | 108 | 38 |
| mercury-redstone | 142 | 29 | 20 |
| molniya-m | 665 | 142 | 41 |
| new-glenn | 863 | 179 | 41 |
| proton-k | 658 | 141 | 40 |
| proton-m-briz-m | 1095 | 230 | 46 |
| pslv | 684 | 153 | 46 |
| saturn-ib | 712 | 147 | 36 |
| saturn-v | 763 | 162 | 41 |
| sls-block-1 | 569 | 121 | 37 |
| soyuz-fg-fregat | 621 | 133 | 39 |
| soyuz | 627 | 132 | 37 |
| space-shuttle-stack | 2297 | 161 | 48 |
| sputnik-8k71ps | 385 | 82 | 31 |
| starship | 601 | 125 | 34 |
| titan-ii-g | 412 | 89 | 35 |
| titan-ii-glv | 426 | 90 | 32 |
| titan-iiie-centaur | 687 | 149 | 43 |
| titan-ivb-centaur | 861 | 184 | 46 |
| voskhod-11a57 | 616 | 130 | 37 |
| vostok-k | 732 | 155 | 41 |

Where a launch's time goes (Falcon 9 / Saturn V, wall s today → activity): the first 15 s 3.0 →
2.8 / 3.0 → 2.7 (the liftoff unchanged); 15–60 s 9 → 7; 60–180 s 29 → 16 / 26 → 14; the
upper-stage burn 180–400 s 44 → 4 / 46 → 7.5; the rest 40 → 5 / 77 → 10.

## Descents

| Descent profile | body | mission s | today | activity clock |
|---|---|---|---|---|
| apollo11 | moon | 758 | 266 | 68 |
| apollo12 | moon | 716 | 251 | 67 |
| apollo14 | moon | 773 | 271 | 69 |
| apollo15 | moon | 747 | 262 | 68 |
| apollo16 | moon | 741 | 260 | 68 |
| apollo17 | moon | 731 | 257 | 68 |
| luna9 | moon | 212 | 81 | 63 |
| luna16 | moon | 362 | 127 | 56 |
| luna17 | moon | 355 | 125 | 54 |
| luna21 | moon | 355 | 125 | 54 |
| luna24 | moon | 358 | 126 | 52 |
| change3 | moon | 712 | 263 | 71 |
| change4 | moon | 712 | 263 | 71 |
| change5 | moon | 841 | 310 | 74 |
| change6 | moon | 959 | 354 | 74 |
| chandrayaan2 | moon | 924 | 324 | 52 |
| chandrayaan3 | moon | 1270 | 491 | 93 |
| slim | moon | 1026 | 370 | 75 |
| beresheet | moon | 18 | 10 | 10 |
| artemis4 | moon | 100 | 37 | 32 |
| artemis5 | moon | 100 | 37 | 32 |
| blue-moon-mk1 | moon | 100 | 37 | 32 |
| viking1 | mars | 250 | 103 | 80 |
| mars3 | mars | 354 | 137 | 82 |
| mars-pathfinder | mars | 396 | 176 | 106 |
| spirit | mars | 400 | 179 | 100 |
| opportunity | mars | 401 | 180 | 100 |
| phoenix | mars | 456 | 196 | 99 |
| curiosity | mars | 436 | 179 | 98 |
| insight | mars | 404 | 177 | 96 |
| schiaparelli | mars | 321 | 120 | 69 |
| mars-express | mars | 377 | 159 | 98 |
| tianwen1 | mars | 662 | 268 | 104 |
| perseverance | mars | 405 | 174 | 98 |
| starship-demo | mars | 543 | 194 | 90 |
| starship-mars-crew | mars | 464 | 166 | 88 |
| venera-13 | venus | 3776 | 1417 | 99 |
| vega-1 | venus | 3407 | 1278 | 98 |
| vega-2 | venus | 3289 | 1234 | 97 |
| hayabusa1 | itokawa | 557 | 202 | 20 |
| osiris-rex | bennu | 563 | 204 | 20 |
| galileo | jupiter | 3691 | 1296 | 103 |
| hayabusa2 | ryugu | 1338 | 483 | 25 |
| rosetta | comet_67p | 2137 | 783 | 57 |
| huygens | titan | 9153 | 3274 | 187 |
| near-shoemaker | eros | 1419 | 498 | 49 |
| friendship-7 | earth | 821 | 35 | 93 |
| vostok-1 | earth | 970 | 33 | 91 |
| apollo7 | earth | 967 | 35 | 96 |
| apollo8 | earth | 1688 | 35 | 135 |
| aurora-7 | earth | 837 | 35 | 92 |
| sigma-7 | earth | 838 | 35 | 93 |
| faith-7 | earth | 752 | 35 | 92 |
| freedom-7 | earth | 483 | 35 | 75 |
| liberty-bell-7 | earth | 564 | 36 | 78 |
| gemini3 | earth | 853 | 33 | 85 |
| gemini4 | earth | 873 | 33 | 86 |
| gemini6a | earth | 824 | 33 | 85 |
| gemini7 | earth | 822 | 33 | 85 |
| gemini8 | earth | 842 | 33 | 85 |
| gemini12 | earth | 858 | 33 | 85 |
| vostok-2 | earth | 992 | 33 | 91 |
| vostok-3 | earth | 899 | 33 | 90 |
| vostok-4 | earth | 992 | 33 | 91 |
| vostok-5 | earth | 992 | 33 | 91 |
| vostok-6 | earth | 938 | 33 | 91 |
| voskhod-1 | earth | 992 | 33 | 91 |
| voskhod-2 | earth | 837 | 33 | 90 |
| apollo9 | earth | 1004 | 33 | 90 |
| apollo-soyuz | earth | 1055 | 33 | 87 |
| skylab-2 | earth | 1184 | 33 | 92 |
| skylab-3 | earth | 1184 | 33 | 92 |
| skylab-4 | earth | 1184 | 33 | 92 |
| soyuz-1 | earth | 714 | 33 | 80 |
| soyuz-11 | earth | 1126 | 35 | 95 |
| inspiration4 | earth | 834 | 33 | 86 |
| polaris-dawn | earth | 834 | 33 | 86 |
| starship-flight-5 | earth | 1054 | 32 | 79 |
| shenzhou-1 | earth | 1146 | 35 | 96 |
