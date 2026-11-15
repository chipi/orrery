# Launcher staging timelines: model against the real nominal flight (2026-11-15)

Operator request: fix the Space Shuttle ascent timeline, then check every launcher for the last
stage separating too late. Tool: the repo's own integrator (`integrateAscent`), one run per
profile in `static/data/launch-profiles/`, events read from `AscentSummary.events`. The pinned
rows are in `src/lib/physics/ascent/launch-timeline.test.ts`.

Tolerances: booster / stage separation, MECO and fairing ±10 s; SECO / orbit ±30 s.
Sources are the documents fetched on 2026-11-15 (web search was exhausted, so direct fetches
only). "Primary" = an agency or launch-provider document; "secondary" = Wikipedia or
spaceflight101. Anything not sourced is UNVERIFIED and left as it was.

## Findings

1. **The last stage is not burnt to depletion.** `integrateAscent` already cuts the final stage
   at the orbit gate (osculating perigee at or above 140 km, "SECO on target"), keeping the rest
   as margin. Where a real SECO time is sourced the model is inside tolerance: Delta II 619 s
   (real 617), Delta IV Heavy 645 s (637), Saturn V 673 s (682), Proton-M / Briz-M 1008 s
   (T+16 min, an "xx" range). The suspicion is not borne out by the sourced vehicles.
2. **What was wrong, shared cause A: solid boosters flew at peak thrust.** A booster modelled at
   its peak thrust burns out early: Space Shuttle SRB 94 s (real 123 s), Atlas V AJ-60A 63 s
   (real burn 94 s), PSLV PSOM-XL 48.6 s. Fix: burn-average thrust (constant mass flow, so
   burnout lands on the published burn time; the peak stays in `liftoffThrustKN`), the same
   approach the SLS profile already used.
3. **Shared cause B: a burnt-out booster or stage was jettisoned at burnout.** Real casings
   ride on for seconds: Atlas V 23 s (T+94 burnout, T+117 jettison), PSLV 20 s, Delta II 3 s,
   Delta IV Heavy 11.5 s, Ariane 5 ECA 23 s, the Shuttle tank 18 s after MECO, the Atlas V
   booster section 8 s after BECO, the Delta II first stage 8 s after MECO. New fields
   `LaunchBoosters.separationDelayS` and `LaunchStage.separationDelayS` model it (the spent mass
   stays on, no thrust, then the STAGE SEP beat).
4. **Shared cause C: the fairing was jettisoned by altitude, the real one by time.** The
   free-molecular-heating criterion lands on a fixed time: Delta II T+303 s (model 155 s), Delta
   IV Heavy T+365 s (model 315 s), Atlas V T+210 s (model 139 s), Saturn V LET T+187 s (model
   179 s). New field `LaunchProfile.fairingJettisonS` (takes precedence over the altitude).
5. **Saturn V S-IC was too heavy:** 2,290 t / 130 t against the manual's 4,792,200 lb / 305,100
   lb (2,173.7 t / 138.4 t), so it burnt 164.6 s; now 155.1 s (real 151.0 s).
6. **Payload separation is placed at SECO for every non-Shuttle vehicle that has no injection
   beat.** Real separations come later: Atlas V 401 LEO 169 s after MECO1 (Table 2.4.1-1: MECO1
   1015 s, separation 1184 s), Delta II 250 s after SECO-2. This is the opposite of "too late"
   (the model separates too early) and is NOT changed: it needs a payload-separation time per
   profile that the scene, the HUD beats and the director all read. See NOT DONE.
7. **Fixes that broke the orbit were not shipped.** H-IIA (SRB-A burn 100 s, jettison 110 s;
   model 73 s) and Ariane 5 ECA first attempts, and Proton-M's real fairing time (T+345 s),
   all lose the orbit gate or push the Briz-M cutoff 90 s late; the closed-loop lofted
   insertion has a thin margin on the lowest-thrust upper stages. Ariane 5 ECA was recovered
   with a steeper pitch table; H-IIA and Proton-M were not (backlog rows S10 to S12).

## Space Shuttle, before and after

| Event | Before | After | Real | Source |
| --- | --- | --- | --- | --- |
| SRB separation | T+94.1 s | T+123.0 s | ~T+123 s, ~45 km | Wikipedia "Space Shuttle Solid Rocket Booster" (secondary, cites NASA): burn 123 s, jettison at about 146,000 ft |
| MECO | T+510.8 s | T+510.4 s | T+8:30 (510 s) | Wikipedia "Space Shuttle external tank" (secondary) |
| ET separation | T+510.8 s (with MECO) | T+528.4 s | MECO + 18 s | Wikipedia "Space Shuttle" (secondary, cites NASA); the external-tank article says "just over 10 seconds", a disagreement between two secondary pages, the 18 s is the operator's figure too |
| SECO | beat at T+533.5 s | none (silent bookkeeping event) | none: the OMS burns come later | Wikipedia "Space Shuttle" (OMS used after MECO for insertion) |
| ORBIT | T+533.5 s | T+559.5 s (OMS burn 31 s after tank separation, the model's orbit gate) | OMS-2, later | not modelled further |

The beat list is now LIFTOFF, MAX-Q, STAGE SEP (SRBs), MECO, STAGE SEP (tank), ORBIT. Max-Q moved
from T+57 s to T+77 s (real about T+60 s, UNVERIFIED here): the burn-average thrust is lower than
the real early thrust, so the vehicle accelerates more slowly early. The label says STAGE SEP,
not "ET SEP": a new HUD label would need 14 locales and `journey-markers` keys on STAGE SEP.

## Every profile

"Before / after" are model times (s). `-` = the event does not exist for that vehicle.
V = verified against the named source, U = UNVERIFIED (no source fetched; left as it was).

| Vehicle | Event | Before | After | Real | V / U and source |
| --- | --- | --- | --- | --- | --- |
| space-shuttle-stack | see the table above | | | | V (secondary) |
| atlas-v (541) | AJ-60A jettison | 63.2 | 117.0 | 116-118 | V, Atlas V Users Guide Rev 11 Table 2.4.1-1 (521/531 columns; the 541 is not tabulated) |
| | fairing | 139.2 | 210.0 | 206-212 | V, same |
| | BECO | 226.7 | 251.9 | 249-252 | V, same |
| | Centaur separation | 226.7 | 259.9 | 257-260 | V, same |
| | SECO (orbit at 500 km) | 833.0 | 878.6 | not tabulated for this mission | U |
| delta-ii (7925) | ground-lit GEM sep | 63.3 | 66.3 | 66 | V, Delta II PPG Dec 2006 Table 2-1 |
| | air-lit GEM sep | 126.6 | 132.7 | 132 | V, same |
| | MECO | 270.1 | 270.1 | 264 | V, same (+6, inside ±10) |
| | stage I/II sep | 270.1 | 278.1 | 272 (M+8) | V, same |
| | fairing | 154.7 | 303.0 | 303 (M+39) | V, same |
| | SECO-1 | 601.8 | 618.8 | 617 | V, same, Figure 2-5 |
| saturn-v | S-IC cutoff | 164.6 | 155.1 | 151.0 | V, SA-503 flight manual (Apollo 8) |
| | LET jettison | 178.8 | 187.0 | 187.2 | V, same |
| | S-II cutoff / sep | 530.9 | 521.4 | 520.1 / 521.0 | V, same |
| | S-IVB first-burn cutoff | 659.8 | 673.4 | 681.7 | V, same (-8) |
| pslv (XL) | PSOM-XL ground-lit sep | 48.6 | 68.6 | 69.94 | V, ISRO PSLV-C25 flight events |
| | PSOM-XL air-lit sep | 73.3 | 93.4 | 92.04 | V, same |
| | PS1 burnout | 98.0 | 103.1 | 103 (burn time) | V, same |
| | PS1 sep | 98.0 | 112.9 | 112.75 | V, same |
| | fairing | 125.6 | 118.0 | 117.95 | V, same |
| | PS2 sep | 249.1 | 264.0 | 264.74 | V, same |
| | PS3 burnout / sep | 359.0 | 373.9 | 583.6 (the Mars Orbiter's PS3 separation after a long coast) | U for a LEO flight; C25 is not comparable |
| | PS4 cutoff | 575.8 | 594.4 | 2619.7 (Mars mission, long coast) | U |
| delta-iv-heavy | booster jettison | 226.0 | 237.5 | 237.6 | V, ULA Parker Solar Probe booklet |
| | core separation | 339.8 | 339.8 | 342.4 | V, same |
| | fairing | 315.4 | 365.0 | 365.4 | V, same |
| | MECO-1 / SECO | 615.4 | 645.0 | 637.1 | V, same (+8) |
| ariane-5 (ECA) | EAP jettison | 119.8 | 142.8 | 143 | V (secondary), spaceflight101 |
| | EPC cutoff | 520.9 | 520.9 | not fetched | U |
| | SECO | 764.3 | 756.5 | not fetched | U |
| ariane-5g (G+) | EAP jettison | 129.9 | 129.9 | ~139 | V (ESA, Rosetta: "around 139 seconds"); -9, inside ±10, unchanged |
| | EPC cutoff | 586.1 | 586.1 | about 560 ("another 7 minutes" after the EAP) | U, an "around" figure, model is 26 s later, not changed |
| proton-m-briz-m | stage 1 sep | 119.6 | 119.6 | 119.7 | V (secondary), ExoMars 2016 timeline |
| | stage 2 sep | 329.8 | 329.8 | 327 | V, same |
| | stage 3 cutoff | 571.5 | 571.5 | 571 | V, same |
| | fairing | 173.7 | 173.7 | 345 | V, same: WRONG by 171 s, not fixed (S12) |
| | Briz-M cutoff | 1007.8 | 1007.8 | T+16:xx | V (loose), inside ±30 |
| long-march-2f | booster jettison | 131.2 | 131.2 | 126 | V (secondary) |
| | core burnout | 161.8 | 161.8 | 166 burn time | V (secondary) |
| long-march-5 | core cutoff | 495.7 | 495.7 | 490 burn time | V (secondary, Chang'e 5 page) |
| | stage-2 shutdown / SECO | 720.4 | 720.4 | 752 (12:32) | V (secondary): -32, just outside ±30, not fixed (S10) |
| sls-block-1 | SRB sep | 110.4 | 110.4 | "approximately two minutes" | V (NASA SLS reference guide), -10 |
| | core MECO | 478.9 | 478.9 | about 8 min | V, same |
| h-iia (202) | SRB-A jettison | 73.1 | 73.1 | 110 (burn 100 s + 10 s) | V (secondary): WRONG by 37 s, not fixed (S11) |
| | first stage cutoff | 392.0 | 392.0 | 390 burn time | V (secondary) |
| falcon-9 | MECO / stage sep | 150.6 | 150.6 | 150-170 (first-stage burn, spaceflight101) | V (secondary), at the low end |
| ariane-1, athena-ii, atlas-agena, atlas-centaur, atlas-lv-3b, falcon-heavy, h3, lvm3, long-march-3a, long-march-3b, m-v, mercury-redstone, molniya-m, new-glenn, proton-k, saturn-ib, soyuz, soyuz-fg-fregat, sputnik-8k71ps, starship, titan-ii-g, titan-ii-glv, titan-iiie-centaur, titan-ivb-centaur, voskhod-11a57, vostok-k | every event | unchanged | unchanged | not fetched | U (backlog S13) |

Model events for every profile are listed in the scratch files `audit-before.txt` and
`audit-after.txt` (not committed); the script is `audit.ts`, a read-only call of
`integrateAscent` per file.

## Not verified, not done

- Payload separation after SECO (finding 6).
- The 26 unsourced vehicles above, and the SECO of Atlas V 541, Ariane 5 ECA, Ariane 5G+.
- Space Shuttle max-Q (T+77 s against about T+60 s), OMS-2 timing, ET separation at +18 s
  against the external-tank article's "just over 10 s".
- A real SRB thrust curve (front-loaded, tail-off). The burn-average model puts burnout on the
  right second and loses the early thrust; H-IIA could not take it without losing the orbit.
