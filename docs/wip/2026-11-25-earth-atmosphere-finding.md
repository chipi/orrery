# B1 (c): the Earth atmosphere is why the lunar-return first pulse reads high

The descent engine flies Earth on a single exponential, ρ = 1.225·exp(−h / 8.5 km)
(`descent-physics-constants.ts`). Against the US Standard Atmosphere 1976 it is about 3.5× too dense at
60 km and 16× at 100 km, so an entry decelerates higher and earlier than it did.

**Source of the table:** US Standard Atmosphere 1976 (NOAA-S/T 76-1562), as tabulated by Public Domain
Aeronautical Software, https://www.pdas.com/bigtables.html (Table 1, SI, 5 km steps; geometric
altitude Z, pressure Pa, density kg/m³). 0–150 km kept; it agrees with the 0–86 km table at
https://www.pdas.com/atmosTable1SI.html on the 10 km rows.

## Experiment (2026-11-25, not committed)

The table dropped into `ATM_PROFILE.earth` (the mechanism Venus, Titan and Jupiter already use), every
Earth descent flown before and after (`zz-earth-atm.tmp.test.ts`, kept in the session scratchpad):

| Splashdown | first pulse now | with 1976 | flown | splashdown now | with 1976 | flown |
|---|---|---|---|---|---|---|
| Apollo 11 | 8.01 g | 6.64 g | 6.73 g | 935 s | 879 s | 929 s |
| Apollo 12 | 7.62 | 6.44 | 6.57 | 840 | 795 | 846 |
| Apollo 14 | 7.47 | 6.27 | 6.76 | 825 | 776 | 853 |
| Apollo 15 | 7.94 | 6.59 | 6.23 | 829 | 783 | 810 (three mains) |
| Apollo 16 | 8.16 | 6.79 | 7.19 | 817 | 769 | 814 |
| Apollo 17 | 7.83 | 6.54 | 6.49 | 809 | 763 | 801 |

The first pulse closes to within 8% on all six. Splashdown comes 5–9% early.

The other 33 Earth descents all move, because their inputs were tuned against the old air:

- Gemini 3, 4, 8 go from about 4.4 g to 10.2 g; Gemini 6A and 7 to 5.6–5.7 g; Gemini 12 to 8 g. Their
  target downrange (2,700 km) and entry angle are ESTIMATES. The guidance digs in to hit a range that
  the thinner upper air would overshoot.
- Mercury, Vostok and Voskhod (ballistic) gain about 1 g, and their range grows 15–20%. Their entry
  angles are estimates.
- Inspiration4 and Polaris Dawn go from 5.7 g to 8.4 g (estimated target and angle).
- Apollo 8's skip goes from 1,658 s to 4,343 s to touchdown, and from 7,523 km to 28,097 km of range.
- Starship Flight 5 barely moves.

## Plan

1. The flown reference per flight (peak g, entry to drogue and to landing, range):
   `2026-11-25-earth-entry-references-sourced.md` (research running).
2. Switch Earth to the 1976 table, then retune only the ESTIMATED inputs (entry angle, target
   downrange, CdA) of each flight to its flown references; sourced inputs stay.
3. Tighten the test bands (the Apollo first-pulse band was widened for the model limit; it can come
   back to ±10%) and rewrite the "model limit" provenance notes in the six splashdown profiles.
4. Apollo 8's skip is its own check: it must still skip, with the flown range.

## Result (2026-11-25, committed)

Earth flies the 1976 table (`ATM_PROFILE.earth`). Per flight, only inputs marked estimated moved
(tuner `zz-tune.tmp.test.ts`, session scratchpad: bisection on one knob to one target):

| Flights | Knob | Target | Result |
|---|---|---|---|
| Gemini IV, XII | entry angle 1.5° → 1.585°, 1.575° | flown 7.7, 6.2–6.4 g | 7.71, 6.30 g |
| Gemini 3, 8; Skylab 2–4; Shenzhou 1; Soyuz 11; Inspiration4; Polaris Dawn | entry angle 1.5° → 1.59–1.81° | the peak before the switch (no flown peak found) | unchanged to 0.02 g |
| Gemini 6A, 7 | target range 2,225 → 2,368, 2,385 km | the peak before | 4.38, 4.35 g |
| Apollo 7, 9 | target range → the flown 2,952, 3,398 km (SP-4029, now sourced) | — | 3.33, 3.66 g (flown 3.33, 3.35); splash 980, 1,035 s (flown 937, 1,004) |
| MR-3, MR-4 | entry speed 2,300 → 1,725, 1,731 m/s (now marked estimated) | flown 11.0, 11.1 g | exact; splash 488, 512 s |
| Voskhod 2 | entry angle 3.33° → 2.48° | the 10 g before | 10.0 g |
| Starship Flight 5 | Cd·A 280 → 300 m² | sourced flip T+1:05:15, splash T+1:05:40 | flip 1,034 s, splash 1,057 s |

Left as they were, with what they now read:

- **Apollo 11–17 splashdowns:** every input sourced except the Cd·A, which the Apollo CM ballistic
  coefficient (313.5) fixes. The first pulse reads 6.0–6.8 g and the larger of the two pulses is
  within 8% of the flown maximum (was 10–27% high), but drogues come 25–80 s early and splashdown is
  3–9% early (879 vs 929 s on Apollo 11). Test bands: maxima ±10%, splashdown −10%/+5%.
- **Mercury orbital, Vostok, Voskhod 1, Soyuz 1 (ballistic):** in the real air no shallow angle
  takes a lift-free capsule below ~8.5 g (the tuner bracketed 0.3–2× the angle), so they read
  8.5–9.2 g; Mercury flew 7.6–7.7 g, which its summary puts down to lift in entry. Ranges grow
  15–20%.
- **Apollo 8 (decided 2026-11-25: fly the flown range, below):** the fixed-lift-up skip of ADR-089 balloons: 26 min / 7,523 km
  → 72 min / 28,097 km. Flown (SP-4029): range 1,292 n mi (2,393 km), 6.84 g, splash 869 s after
  entry. Given that range as its target, the model flies 6.5 g, 811 s and does not skip. That
  would retire Apollo 8 as the skip demonstrator ADR-089 names, so it is the operator's call.
- **Apollo-Soyuz:** 4.13 → 4.05 g, left.

Apollo 8, decided: it flies its flown range as a guided target: 6.5 g, splashdown 811 s, no skip (ADR-089 amendment).
