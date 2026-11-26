# Operator decisions, 2026-11-27 (morning)

Answers to the decision list after the night of 2026-11-26. Numbers are the list's.

| # | Question | Answer |
|---|---|---|
| 1 | W11 level-of-detail standard before model rework? | (b), confirmed after the explanation: rebuild the Shuttle orbiter now to the lander bar; the operator asked what "the standard catches up later" means (answered in chat: the written W11 standard is drafted from the models already rebuilt, then applied to the rest) |
| 2 | Roman and SPHEREx to the lander bar? | Show them first (renders sent 2026-11-27) |
| 3 | Buran on /fly | (ii) source and build an Energia launch profile, "do your best" |
| 4 | X-37B: no airspeed on the HUD, track "~" | OK |
| 5 | Runway ends (STS-1 23 sourced; X-37B Vandenberg 12, KSC 15/33; Buran 06 estimated) | Yes |
| 6 | Which observatories become missions | Build the robotic arm (RMS release); all of them become missions |
| 7 | Deploy as its own scene or a master-scrubber band | (a) its own scene, as built (after the explanation in chat); one later change could put the deploy, the way home and the winged returns on the bar together |
| 8 | Where the Roadster mission lives | (a) `missions/sun/` |
| 9 | Full-frame booster return only for flights with both side-booster landings sourced | OK |
| 10 | Falcon Heavy demo timeline | Use the planned METs, labelled as planned |
| 11 | Brand marks on the Roadster | No marks, OK; but bring the model up to the lander standard |
| 12 | Roman mass | Use NASA's figure |
| 13 | W9 ISS docking | Both: Soyuz TM-31 / Expedition 1 and Crew Dragon Demo-2 |
| 14 | W9 Mir docking | Both: STS-71 and Soyuz T-15 |
| 15 | W9 Tiangong docking | Shenzhou 12 (first crew) |
| 16 | Artist-impression waivers: Isar Spectrum, HyImpulse SR75, ICEYE | Yes (operator, 2026-11-27) |
| 17 | Flyby review code bugs (calls 1, 3, 4, 5, 8 and the banner part of 8) | Fix them |
| 18 | Flyby review taste calls (6, 9, 10, 12, 13, label rules of 7) | Show options for each |

## Work order from these answers

1. Shuttle orbiter rebuild to the lander bar (feeds W10, W12, W9 STS-71, the RMS).
2. Flyby code bugs (17); option renders for the taste calls (18).
3. F11 waivers (16); Roman mass from a NASA page (12).
4. W13 (Roadster model to the lander bar, `missions/sun/`, planned timeline, full-frame FH return).
5. The RMS and the observatory missions (6); W9 dockings (13-15); X-37B returns (4, 5); Buran with
   an Energia launch (3).
