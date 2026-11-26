# Orbiter geometry from the HAER measured drawings (2026-11-27)

Source: Historic American Engineering Record TX-116-A, *Space Transportation System, Orbiter
Discovery (OV-103)*, sheets 5 (forward and aft elevations), 6 (port elevation) and 7 (top plan),
delineated by John Wachtel and Joseph Klimek, Library of Congress (public domain, via Wikimedia
Commons). Scale 3/16" = 1'-0". Read at 3840 px per sheet width: 65.63 px/m from the 23.80 m span
dimension (the metre scale bar gives 65.4).

Measured by gridding each sheet in metres (`docs/wip/2026-11-23-pass2-tools/.grid.tmp.mjs`, temporary);
readings are good to about ±0.05 m on clean lines and ±0.15 m where tile hatching blurs an edge.
x is metres aft of the nose tip; y is metres above the main wheels' ground line, with the
fuselage reference level (the drawing's attitude); h is metres out from the centreline.

## Checks against published figures

| Item | Drawing | Published |
|---|---|---|
| Span | 23.80 m (dimensioned) | 23.79 m |
| Nose to fin tip (overall length) | 37.07 m | 37.24 m |
| Fin tip above the main ground | 16.57 m | 16.55 m (dimensioned on sheet 5) |
| Main gear track | 6.96 m (dimensioned 22'-10 1/4") | |
| SSME exit diameter | 2.38 m | 2.38 m |

## Findings against the 0.9.12 model

- The model put 37.24 m between the nose and the body flap. The real orbiter is 35.4 m from the
  nose to the body flap's trailing edge; the 37.24 m runs to the fin tip, whose trailing edge
  sweeps aft over the engines. The forward fuselage was ~2.5 m too long.
- The fuselage was ~1.1 m too shallow: the real mid-fuselage stands from y 2.5–2.9 (belly) to
  8.6 (the bay doors' crown), 5.9 m deep.
- The fin was too small and too far forward: its leading edge runs at 45° from (27.9, 10.0) to
  (34.45, 16.46), the tip chord from x 34.45 to 37.0 at y 16.55, the trailing edge down to
  (34.3, 10.4).
- The OMS pods were about half size: x 27.3–33.3, y 6.7–9.65, out to h 3.86.
- The SSMEs sat 1.3–2.2 m low: upper at y 8.18, lower pair at h ±1.52, y 5.03.
- The main gear was ~6 m forward: real at x 23.86; nose gear at x 3.55.
- The wing sat ~2 m forward.
- The orbiter stands 3.16° nose-down on its gear: the nose wheels touch at y 1.12 in the drawing's
  attitude, 20.31 m ahead of the mains.

## Side elevation (sheet 6)

Upper line: tip y 4.5; x 0.25: 5.08; 0.5: 5.46; 1.0: 5.9; 1.5: 6.19; 2.0: 6.41; 3.0: 6.69;
4.0: 6.95; 5.0: 7.23 (windshield base); 5.5: 7.68; 6.0: 8.25; 6.5: 8.53; 7.0 to 28.3: 8.6.

Lower line: x 0.25: 4.0; 0.5: 3.68; 1.0: 3.6; 1.5: 3.49; 2.0: 3.36; 3.0: 3.17; 4.0: 3.07;
5.0: 3.0; 7.0: 2.92; 10: 2.86; 15: 2.73; 20: 2.62; 25: 2.52; 28: 2.5; aft face bottom x 33: 3.3.

Tile line (black below): nose cap (RCC, grey) x < 0.5; 1.0–3.4: y 5.9 rising to 6.6 (forward
RCS); 3.4–7.6: y 5.6; aft of 7.6: y 4.05, falling to ~3.9 by x 27.

Features: windshield x 5.1–6.4; crew hatch centre (7.0, 5.2), rim 1.1 m; payload-bay door line
x 8.6–28.3; aft face (heat shield) x 33.0; body flap x 33–35.4; OMS pod x 27.3–33.3, y 6.7–9.65,
nozzle exit x 34.0, centre y 8.3; upper SSME exit x 34.85, lower exits x 35.4; main gear well
door x 20.4–24.3; nose gear doors x 1.0–4.1; rudder/speed-brake hinge at 58 % of the fin chord.

Fin: leading edge (with the root fillet) 26.6 at y 8.6, 27.3 at 9.0, 27.55 at 9.5, 27.9 at
10.0, 34.45 at 16.46; trailing edge 33.3 at 8.6, 33.6 at 9.0, 34.3 at 10.44, 36.95 at 16.08,
37.0 at 16.55.

## Top plan (sheet 7)

Fuselage half-width: x 0.25: 0.5; 0.5: 0.78; 1: 1.0; 1.5: 1.2; 2: 1.4; 3: 1.69; 4: 1.85;
5: 1.98; 6: 2.15; 7: 2.3; 8: 2.45; 9: 2.6; 10–27: 2.65; OMS pods to h 3.6 at x 29.5–33.

Wing: leading edge (glove) from (x 6.5, h 2.2) straight to (17.4, 4.2); kink (19.3, 4.6),
(21.1, 4.96); main leading edge to (26.3, 10.9); tip to (28.4, 11.9). Trailing edge (elevons)
x 30.3 at h 11.9 to 32.0 at h 3.9; the elevon split at h ~7.8.

## Forward and aft elevations (sheet 5)

Mid-fuselage: flat belly near y 2.5, vertical sides at h 2.7 from y 4.4 to 7.3, round crown
(the bay doors) to 8.6. Nose cap centre y 4.5, half-width 0.75. Wing dihedral ~3.5°, tip near
y 3.8. Fin half-thickness 0.33 at its root, ~0.15 at the tip.

Aft: upper SSME exit centre (0, 8.18), radius 1.19; lower SSMEs (±1.52, 5.03), radius 1.17;
OMS nozzles (±2.33, 8.69), radius 0.6; OMS pods out to h 3.86, top 9.67; aft fuselage sides
h 3.05–3.3 from y 6.45 down to 3.3; body flap y 3.3 to 2.3.

## Model frame

Station a = 37.07 − x (the fin tip's trailing corner, the aft-most point, at a = 0; the nose at 37.07); vehicle-up
v = y − 4.85 (the belly near v = −2.3, the main ground at v = −4.85).
