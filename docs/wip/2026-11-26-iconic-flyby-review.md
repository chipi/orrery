# Iconic flyby review (2026-11-26)

Scope from W6 "Added (operator 2026-11-25)". Tool: `docs/wip/2026-11-23-pass2-tools/flyby-shot.mjs` (plus `sheet-wide.mjs`, `sheet-pick.mjs`).
Frames and sheets are in `SHOT_DIR` = `/tmp/claude-1000/-work-orrery-worktrees-0-9-5/481b34be-6701-4a16-8979-4b12c6f8cb7f/scratchpad/flyby-shots` (not committed). Per-frame state (wanted MET, `__flyDebug.activeFlybyMet`, sub-phase, camR, settled) is in `fb-<mission>-<d|p>.json` there.

## How the frames were taken

- Beats from `DEFAULT_FLYBY_SCHEDULE` (`src/lib/orbital/flyby-shot-schedule.ts`): establish -60..-20 d, approach -20..-1.5, hero -1.5..+1.5, depart +1.5..+30. The tool shoots at -40 / -10 / 0 / +10 d of each flyby event (arrival events: -35 / -10 / 0 / +10, the OI window opens 40 d out). One cruise frame at the midpoint before the first event and between events, one at `transit_days` when it is after the last event.
- Sim time set with `window.__flySetSimDay(met)` (pauses). A frame counts as settled when `__flyDebugFrame.simDay`, `camR` and camera target move < 0.2 % over three polls 250 ms apart. The active shot kind is not exposed outside Svelte `$state`; the tool checks `__flyDebug.activeFlybyMet === peak` instead and records mismatches. Montage shot kind is inferred from the offset.
- Desktop 1280x800 and phone 390x844. Dev server 5174. The swiftshader "Performance" hint is dismissed before every frame.
- Beat frames shot at hero, depart etc. were not captured in motion; these are still frames, so camera glides within a beat (ease 0.22 per frame) and the cuts between beats are not judged except by comparing consecutive frames.

## Sheets

Per mission, desktop `sheet-fb-<id>-d.png` (4 cols) and phone `sheet-fb-<id>-p.png` (6 cols), all in SHOT_DIR.
In scope (13): voyager-1, voyager-2, pioneer-10, pioneer-11, galileo, cassini, new-horizons, messenger, bepicolombo, rosetta, juno, juice, parker-solar-probe.
Others with at least one flyby event (17): mariner4, mariner10, ulysses, vega-1, vega-2, giotto, near-shoemaker, hayabusa1, hayabusa2, osiris-rex, dawn, hera, psyche-mission, europa-clipper, escapade, solar-orbiter, lucy.
Hero overviews: `view-oth-hero-p1.png`, `view-oth-hero-p2.png`. Reading slices: `view-<id>-<d|p>-<n>.png`.
Not shot: huygens (same flight data as cassini, identical events), apollo10, apollo13, artemis1, artemis2 (cislunar camera, not the helio montage; covered by W6 call 1).

## Per mission: flybys and what each beat shows

"Data" is the closest approach as the event text states it. All 26 desktop sheets are the same layout: cruise-out, then per flyby establish, approach, hero, depart, cruise-between.

| Mission | Flyby (MET d) | Date, closest approach (data) | Beats seen |
|---|---|---|---|
| Voyager 1 | Jupiter 546 | 1979-03-05, 348,890 km | establish: small planet, craft a speck; approach: craft + blue event diamond ahead of planet; hero: planet fills, craft small at top; depart: planet + craft right. Fine. |
| | Saturn 1164 | 1980-11-12, 124,000 km (Titan 6,500 km) | Rings present (destination mesh). Hero strong. Depart is past arrival: "ARRIVED" and the "MISSION FLIGHT PATH" banner sits on the scene. |
| Voyager 2 | Jupiter 688 | 1979-07-09, 721,670 km | good, as V1 |
| | Saturn 1467 | 1981-08-26, 101,000 km | **no rings** on all four beats (F1) |
| | Uranus 3079 | 1986-01-24, 81,500 km | pale sphere; phone approach: craft not visible (F3) |
| | Neptune 4388 | 1989-08-25, 4,950 km | hero good; depart is "ARRIVED" with banner over the frame |
| Pioneer 10 | Jupiter 641 | 1973-12-04, 132,252 km | approach/hero good (craft in front of disc); depart: Jupiter nearly black (night side) + the Sun in the corner |
| Pioneer 11 | Jupiter 606 | 1974-12-03, 42,800 km | good; depart: dark disc |
| | Saturn 2339 | 1979-09-01, 20,900 km | rings present, best Saturn frames |
| Galileo | Venus 115 | 1990-02-10, 16,000 km | good |
| | Earth #1 416 | 1990-12-08, 960 km | good; Moon in frame |
| | Gaspra 741 | 1991-10-29, 1,600 km | **shows Earth and Moon**, no asteroid (F2) |
| | Earth #2 1147 | 1992-12-08, 304 km | good |
| | Ida + Dactyl 1410 | 1993-08-28, 2,400 km | approach/hero: brown squares (belt particles), no Ida, craft not visible (F2) |
| | Jupiter OI 2242 | 1995-12-07 | hero ok, flare smear on limb; probe release event (2094, `arrival`) not shot |
| Cassini | Venus #1 193, Venus #2 617 | 1998-04-26 284 km; 1999-06-24 623 km | Cassini model reads well; hero craft in front of disc |
| | Earth 672 | 1999-08-18, 1,171 km | hero good; **establish shows Venus #2 depart** (F6) |
| | Jupiter 1172 | 2000-12-30, 9.85 M km | good |
| | Saturn OI 2451 | 2004-07-01 | rings, SOI card; HUD hidden in 3 of 4 beats (F11) |
| New Horizons | Jupiter 405 | 2007-02-28, 2.3 M km | good |
| | Pluto 3463 | 2015-07-14, 12,500 km | establish: dot; approach/hero: Pluto + Charon, **no craft**, no label; depart: "ARRIVED" banner |
| | Arrokoth 4730 | 2019-01-01, 3,538 km | **black frame**, only the epilogue banner and "PLUTO" label (F4) |
| MESSENGER | Earth 364 | 2005-08-02, 2,348 km | hero: craft at top, label stack "LAUNCH" over "EARTH" |
| | Venus #1 812, #2 1036 | 3,000 km; 338 km | both labels stacked at the planet |
| | Mercury #1/#2/#3 1259/1525/1883 | 200, 200, 228 km | craft readable at hero; Sun huge beside Mercury on #2/#3 depart; #3 approach has no craft |
| | Mercury OI 2418.03 | 2011-03-18 | hero fine, two banners overlap; **depart: Mercury out of frame** (F5) |
| BepiColombo | Earth 538 | 12,700 km | establish: Earth night side + Moon, craft not visible; approach: Earth half-lit, blue diamond; hero: lit Earth, **craft is a ~8 px white bar above the disc** (not a 1-2 px speck as the first pass said); depart: Earth near-black, a sliver of Moon at the right edge. Desktop `sheet-fb-bepicolombo-d` frames 2-5 |
| | Venus 726 / 1025 | 10,720 km; 552 km | hero: Venus fills 70 % of the frame, craft a bar at the top, label across the disc; depart: dark Venus, Sun cropped behind the HUD toggles (#1) or behind the left HUD panel (#2/Mercury #1 depart). Frames 7-15 |
| | Mercury 1077 / 1342 / 1703 / 2146 / 2234 / 2272 | 199; 200; 236; 165; 37,626; no figure | each hero: grey Mercury ~25 % of the frame, craft bar at the top edge, stacked labels (#1 + #2, #3 + #4, #5 + #6) across the disc. Departs: dark crescent, Sun filling the top (#3, #4, #5 depart: Sun about 30 % of the frame). Frames 16-45. Establish/approach of #1, #6 (frames 17, 42, 43) show the previous flyby (F6) |
| | Mercury OI 2954 | planned 2026-11-21 | establish: Venus, Earth+Moon and a huge Sun, craft not visible; **approach: black frame, a craft speck, no Mercury** (F5); hero: half-lit Mercury, craft at the apex of a hard yellow wedge (F9); depart: ARRIVED, Mercury cropped to a sliver in the bottom-right corner. HUD hidden on frames 46-49 (F11) |
| Rosetta | Earth 367 / 1351 / 2082 | 1,955; 5,301; 2,481 km | establish: Earth + Moon, craft not visible; approach: night-side Earth; hero: lit Earth, **no craft at #1 hero** (label only), craft at the top edge at #2/#3; depart: dark Earth, Moon, Sun. Fine otherwise |
| | Mars 1090 | 250 km | best Rosetta set: establish small Mars, approach crescent, hero large Mars with the craft at the top edge, depart dark Mars + Deimos/Phobos ball. Phone the same |
| | Steins 1648 | 2008-09-05, 800 km | **shows Earth + Moon** at all four beats, a "STEINS" label at the right edge (F2) |
| | Lutetia 2321 | 2010-07-10, 3,162 km | **all four beats empty black**: a thin trajectory line, a tiny orange dot at depart (F2) |
| | 67P OI 3809 | 2014-08-06 | establish and approach: empty star field (HUD hidden); hero: tan ball + hard yellow wedge, craft a dot at the wedge apex, HUD half-faded (F9, F11); depart: "ARRIVED", the body is out of frame, only its label at the left edge (F5) |
| Juno | Earth 796 | 2013-10-09, 559 km | best phone hero of the set (craft large); desktop hero: craft in front of the top of the disc, depart: crescent Earth + Moon cropped at the bottom |
| | Jupiter OI 1796 | 2016-07-05 | establish: planet + four moons (HUD hidden); approach: night-side Jupiter fills the frame; hero: planet only, no craft, JOI card; depart: ARRIVED, banner on scene, label across the planet. Cruise-between (MET 1296) is blue ribbons only (F9) |
| JUICE | Earth+Moon 493 | Aug 2024, Moon 700 km, Earth 6,800 km | establish: night Earth + Moon; approach: Moon cropped at lower right; hero: Earth only, craft (panels visible, ~20 px) over the disc; depart: Moon cropped at the left edge. **Moon is never in frame at hero** |
| | Venus 870 | 5,088 km | approach: Venus fills the frame (cropped); hero: lit Venus, label across the disc, no visible craft; depart: dark Venus + Sun at top |
| | Earth #2 1263, Earth #3 2106 | 8,641 km; no figure | hero: lit Earth, craft at the top edge (#3 craft readable); #2 approach and depart: Moon at the frame edge |
| | Jupiter OI 3020 | planned 2031-07 | establish/approach/hero: HUD hidden, Jupiter + 4 moons, **no craft**; hero has a small pale wedge at the upper left of the disc (F9); depart: ARRIVED, banner, label across the disc |
| Parker | Venus 1 (52) | 2018-10-03 | establish: Earth + Moon small, no craft; approach: Venus night limb at right, craft large (wedge shield) at the left; hero: Venus fills the frame, craft at the top cropped by the frame, Earth + Moon behind; depart: craft + Venus + Moon. Best Parker set |
| | VGA 4 (923), VGA 6 (1835), P8 (990), P22 (2326) | 2021-02-20; 2023-08-21 | all frames (6-20) are the post-arrival epilogue: craft with the "FIRST PERIHELION (P1)" label across it, Sun cropped at the left, "MISSION FLIGHT PATH" banner; VGA 4 and VGA 6 are the same picture; P22 (17-20) is the Sun in the middle with no craft and ARRIVAL/APPROACH markers (F4). Phone frames 13-20 the same, banner overlaps the HUD pill (F8) |

### The 17 other missions plus Lucy

Desktop sheets read frame by frame in the second pass (`sheet-fb-<id>-d.png`; Lucy via slices `sl-lucy-d-a..d.png`). The first pass's phone hero notes stand: Mariner 4 Mars hero good; Mariner 10 Venus and Mercury heroes good; Ulysses Jupiter hero good; Vega 1/2 Venus hero good; Hayabusa 1 Earth hero an empty frame with a dot; NEAR Mathilde craft cropped at the edge, no asteroid; NEAR Earth hero craft huge at the top; Solar Orbiter heroes Sun at the top, craft tiny. The desktop frames confirm them and add:

| Mission | Flyby (MET d) | Beats seen |
|---|---|---|
| Mariner 4 | Mars 229 | establish: small Mars + moon ring; approach: Mars, craft, blue diamond; hero: Mars, craft over the disc, banner "MARS - FIRST SUCCESSFUL FLYBY" across the craft; depart: large lit Mars, ARRIVED, banner on scene, the performance hint is in frame (dismiss missed). Good |
| Mariner 10 | Venus 94 | good: hero pale Venus fills the frame, label across the craft; depart lit Venus, craft at the right |
| | Mercury 146 | **establish (frame 7) is still Venus** (`peakMismatch`, F6); approach: dark Mercury + craft; hero: grey Mercury, craft at the top, label across the disc; depart: dark Mercury, Sun at the top right behind the HUD toggles (F7) |
| Ulysses | Jupiter 490 | good: establish Jupiter + Galileans; approach/hero: large planet, craft at the top, blue diamond and label across the disc; depart: dark-side Jupiter, label across the disc |
| Vega 1, Vega 2 | Venus 178 / 176 | good: establish small Venus; approach craft in front of the limb; hero Venus with a label strip, Earth in the corner; depart dark Venus, Sun at the right edge |
| | Halley 446 / 443 | **no nucleus**. Frames 6-10 are the epilogue (ARRIVED, banner): establish (Vega 1 frame 7) shows a cropped Venus at the top; approach, hero, depart are the craft alone on black with the **Venus** label "VENUS - FLYBY + LANDER + BALLOON" beside it, the label of the other event (F2, F4, F14). Vega 2 identical |
| Giotto | Halley 255 | establish: Sun, planet dot, labels, no nucleus; approach: only ribbon and labels; hero: empty (a "HALLEY" label at the right edge); depart: a grey-brown sphere (nearest planet, wrong body) + Mars at the top edge (F2) |
| | Earth 1826, Grigg-Skjellerup 2565 | frames 6-15 are the epilogue: craft alone on black, stale label "HALLEY - CLOSEST COMET ENCOUNTER", banner; **no Earth and no comet**. The JSON `flybyId` of the Grigg-Skjellerup frames is earth, then mercury, with nothing of either on screen (F2, F4) |
| NEAR Shoemaker | Mathilde 496 | **shows Earth + Moon** (nearest planet): establish Earth + Moon + craft; approach Earth + craft cropped at the right edge; hero Earth + craft cropped at the right edge; depart Earth + craft. No asteroid (F2) |
| | Earth 706 | good: hero Earth fills the frame, craft huge at the top (F7); depart dark Earth, craft in front |
| | Eros OI 1822 | establish: tiny tan sphere, no craft; approach: tan sphere; hero: craft (large) over the sphere; depart: ARRIVED, banner, no body (F5) |
| Hayabusa 1 | Earth 376 | **no Earth in frame at approach and hero**: black frames with a trajectory arc; depart: wide solar system with Earth + Moon tiny at the left (F5) |
| | Itokawa OI 925 | establish: ARRIVED banner, empty; approach: empty; hero: tan sphere, **no craft**; depart: wide solar system. Anomaly Monitor reads CAUTION on frames 9-10 (data state, not diagnosed) |
| Hayabusa 2 | Earth 365 | as Hayabusa 1: approach and hero are empty (arc only); establish and depart are wide views (F5) |
| | Ryugu OI 1302 | establish: big Sun lower right and a tiny ball, HUD hidden; approach: empty black, HUD hidden; hero: small tan sphere, label across it, craft not visible, HUD hidden (F11); depart: wide system, ARRIVED, banner |
| OSIRIS-REx | Earth 379 | establish: wide view; approach: a tan/pale ball at the left edge, not Earth-blue; hero: small tan ball at the top; depart: wide view, Earth + craft small. The Earth flyby shows no Earth-coloured planet at approach and hero (not diagnosed) |
| | Bennu OI 1503 | the JSON `flybyId` changes inside this one event: didymos (establish), earth (approach, hero), ryugu (depart). Frames: establish: Sun-orbit view; approach: tan ball; hero: **Earth + Moon, no Bennu**; depart: Earth + Moon small (F2, F14) |
| Dawn | Mars 510 | good: hero Mars fills the frame; depart dark Mars |
| | Ceres OI 2717 | all four beats `peakMismatch` (F6). establish: belt squares + grey ball, no craft; approach: large grey sphere at the right + label; hero: Ceres with the **hard yellow wedge** from a small orange body at the upper left (F9); depart: black frame, a sliver at the right edge (F5) |
| Hera | Mars 156 | good: hero Mars, craft at the top edge; approach Mars + moon; depart dark Mars |
| | Didymos OI 782 | tan sphere only, no Dimorphos; establish tiny, approach large; hero: sphere, craft above it, OI card; depart: empty frame, a label at the left edge (F5) |
| Psyche | Mars 945 | good: hero Mars large, craft a dot at the top; depart dark Mars + Phobos |
| | Psyche OI 2118 | all four `peakMismatch`. establish: belt squares; approach: squares, no body; hero: pale sphere + a **huge yellow wedge crossing the left HUD** (F9); depart: black, banner only (F5) |
| Europa Clipper | Mars 138, Earth 780 | both good (Earth hero fills the frame, craft at the top; depart dark Earth + craft) |
| | Jupiter OI 2005 | all four `peakMismatch`. establish and approach: HUD hidden (F11), Jupiter + moons; hero: JOI card over the top of the planet, **no craft**; depart: ARRIVED, banner, label across the disc. Cruise-between (frame 11): ribbons only (F9) |
| Escapade | Earth Blue 359, Gold 361 | the weakest frames of the set: establish: wide Sun-centred view, pair tiny; approach/hero: near-black frame, a thin arc and a label at the edge, **no Earth**; depart: wide. **Gold (frames 7-10) repeats the Blue frames** (`peakMismatch`, F6) |
| | Mars OI 663 | establish: small Mars + craft speck; approach: large Mars, **large craft** (red body, panels) + label; hero: Mars + craft + yellow wedge (F9); depart: ARRIVED, Mars cropped at the right |
| Solar Orbiter | VGA 2 937, VGA 3 1835, P5 2200 | the mission is in the epilogue ("ARRIVED") from frame 1 (arrival is P1 at 126 d), so all 15 frames are the craft alone with the label "FIRST PERIHELION (P1)", the banner, Sun cropped at the top left (VGA 2) or the bottom (P5). **No Venus in any frame** (F4) |
| Lucy | Earth 365 (EGA-1), 1154 (EGA-2) | good: hero Earth fills the frame, craft above the disc, label across it; depart Earth + Moon |
| | Dinkinesh 746 | **shows Earth + Moon** at all four beats, the "DINKINESH" label at the right edge (F2) |
| | Donaldjohanson 1282 | establish: belt squares + label; approach: brown ball at the upper left + squares; hero: ball at the right edge behind the HUD, no craft; depart: dark ball + label (F2/F5) |
| | Eurybates 2126 | all four beats `peakMismatch` (frames 22-25; Polymele 27-28 too, F6). HUD hidden on establish, approach, hero (F11): establish black with an arc; approach a craft speck; hero brown sphere, craft above it. Depart (frame 25) is already ARRIVED (arrival is Eurybates) |
| | Polymele 2160, Leucus 2376, Orus 2583, Earth 3358, Patroclus OI 4155 | frames 26-50 (25 frames) are the epilogue: craft alone, label "EURYBATES + QUETA", banner, no asteroid and no Earth; the JSON `flybyId` still names polymele, leucus, orus, earth, patroclus (F4). Cruise-between 31, 36, 41, 46: wide Sun view, no craft |


## Findings by kind

Code bug (C) or taste call (T) after each. Viewport: D desktop, P phone, B both. Sheet names are `sheet-fb-<id>-<d|p>.png`.

**F1. Wrong body appearance** (C). Voyager 2 at Saturn (flyby 2, all beats, B; `sheet-fb-voyager-2-d/p`): Saturn has no rings. The rings are built once and parented to `destinationMesh`, visible only when the destination is Saturn (`fly-helio-scene.ts:1050-1056`); a Saturn flyby on a mission bound elsewhere (V2, Cassini after Saturn is not affected) gets the bare context sphere. Pioneer 11, Voyager 1 and Cassini OI have rings.

**F2. Body not in frame / wrong body** (C). The flyby planet is parsed from the event label (`find-flyby-planet.ts`); labels that are not in its list fall back to the nearest planet. Asteroid and comet events therefore show the wrong thing or nothing: Galileo Gaspra and Ida, Rosetta Steins and Lutetia, NEAR Mathilde, Lucy's asteroids not in the list (Dinkinesh) show Earth+Moon, belt squares or black; Halley at Vega 1/2 and Giotto shows only the craft. Sheets: `sheet-fb-galileo-*`, `sheet-fb-rosetta-*`, `sheet-fb-near-shoemaker-*`, `sheet-fb-vega-1-*`, `sheet-fb-giotto-*`. Beats: all four. Viewport B.

Second pass, desktop frames: Lucy's Dinkinesh (746 d, `sheet-fb-lucy-d` frames 7-10) is Earth + Moon, as predicted. But the first pass's "Lucy's asteroids not in the list" is only true for Dinkinesh: the JSON `flybyId` for the other Lucy targets is donaldjohanson, eurybates, polymele, leucus, orus and patroclus, so they are in the list; they show as plain tan/brown spheres, or nothing (Donaldjohanson frames 17-20, Eurybates 22-24 on desktop; see F4 for the later ones). Also in the list: Itokawa, Ryugu, Eros, Didymos, Psyche, Ceres. Mathilde (NEAR frames 2-5, desktop) is Earth + Moon; Steins (Rosetta frames 17-20) is Earth + Moon with a "STEINS" label at the edge; Lutetia (Rosetta frames 27-30) is black; Bennu (OSIRIS-REx OI, frames 7-10) is not in the list and the frames show Earth + Moon (see F14). Hayabusa 1, Hayabusa 2 and Escapade Earth flybys (`sheet-fb-hayabusa1-d` frames 3-4, `sheet-fb-hayabusa2-d` frames 3-4, `sheet-fb-escapade-d` frames 3-4, 8-9) have no Earth in frame at approach and hero although Earth is in the list: the camera points at empty space (see F5). Halley at Vega 1/2 and Giotto has no nucleus mesh at all (F4 explains why those frames are craft-only).

**F3. Craft missing or too small** (T, with C for the speck sizes). The craft glyph at a flyby is 1-4 px for BepiColombo, JUICE, Hayabusa 1, Escapade (`sheet-fb-bepicolombo-*`); large and readable for Cassini, Juno, Parker, Pioneer, Giotto. New Horizons has no craft at Pluto hero (B). Voyager 2 Uranus approach on phone: craft not visible. Establish and approach frames mostly show the craft as a speck on all missions. Mission-model scale is inconsistent between missions.

Second pass corrections (desktop frames): BepiColombo's craft at hero is not a 1-2 px speck but an ~8 px white bar above the disc (`sheet-fb-bepicolombo-d` frames 4, 9, 14, 19, 24, 29, 34, 39, 44; phone `p-04`, `p-09`, `p-29`, `p-34`: about 10 px). It is small, and it is only visible at hero; at establish and approach it is a 1-2 px dot or absent. JUICE's craft is readable at hero (~20 px, panels visible; Earth #1, #2, #3 and its phone frames). Craft absent at hero: Rosetta Earth #1 (frame 4), JUICE Venus hero (frame 9), Juno OI, Europa Clipper OI, JUICE OI, Hayabusa 1 OI, Hayabusa 2 OI, Dawn OI, Donaldjohanson, Eurybates establish. Craft large and good: Parker (Venus 1 approach and hero), Escapade Mars OI, NEAR Eros OI, Giotto (but with no target), Vega (no target).

**F4. Black or frozen frames from the arrival clamp** (C). Events after the mission's arrival time are rendered in the epilogue state: New Horizons Arrokoth (4730 > transit 3463) is black with a banner; Parker VGA 4, VGA 6, P8, P22 (all after the 85-day "arrival") repeat the same P1 tableau. `sheet-fb-new-horizons-d/p` frames 11-15, `sheet-fb-parker-solar-probe-d/p` frames 6-20.

Second pass, the same cause is much larger than the first pass saw, and it is the largest single defect of the set. A mission is in the epilogue state from its arrival event on, so every later event renders as a craft alone on black (or on a cropped Sun) with the "MISSION FLIGHT PATH" banner and one stale label: Solar Orbiter all 15 frames (arrival is P1 at 126 d; `sheet-fb-solar-orbiter-d` frames 1-15, label "FIRST PERIHELION (P1)", no Venus in any frame); Vega 1/2 Halley, frames 6-10 of each (label "VENUS - FLYBY + LANDER + BALLOON"); Giotto Earth and Grigg-Skjellerup, frames 6-15 (label "HALLEY - CLOSEST COMET ENCOUNTER"); Lucy Polymele, Leucus, Orus, Earth 3358 and Patroclus, frames 25-50 (label "EURYBATES + QUETA"), because Lucy's arrival is Eurybates; Parker as in the first pass. In total 76 of the 120 desktop frames of those five missions (Solar Orbiter 15 of 15, Vega 1 and 2 5 of 10 each, Giotto 10 of 15, Lucy 26 of 50, Parker 15 of 20) show no flyby target. Phone: same (Parker p-13..p-20, JUICE p-25 show the banner on the HUD pill). The JSON `flybyId` of these frames still names the intended body (Lucy polymele, leucus, orus, earth, patroclus; Giotto earth, mercury), so the lookup works and the epilogue state wins over it. Depart beats of Pioneer 10/11, Voyagers, Galileo and others also land in "ARRIVED" with the "MISSION FLIGHT PATH" banner (P: banner overlaps the top HUD pill; F8).

**F5. Arrival weak / planet out of frame** (C). MESSENGER OI depart (B): Mercury off screen, only an event label at the edge. BepiColombo OI approach (B): no Mercury, craft speck. Hayabusa 1 and Rosetta OI: body small. `sheet-fb-messenger-d/p` frames 34-35, `sheet-fb-bepicolombo-p` frame 48.

Second pass: the target body is also missing at the Earth gravity assist of Hayabusa 1 (`sheet-fb-hayabusa1-d` 3-4), Hayabusa 2 (3-4) and Escapade Blue/Gold (3-4, 8-9): approach and hero are black frames with a trajectory arc, no Earth. BepiColombo OI depart (`sheet-fb-bepicolombo-d` frame 50): Mercury is a sliver in the bottom-right corner (desktop), as MESSENGER OI depart. Out of frame or no body at the OI depart: Dawn (frame 10), Psyche (10), NEAR Eros (15), Hera (10, label only), Rosetta 67P (35, label only), Hayabusa 2 (10, wide view), Hayabusa 1 (10, wide view). Rosetta 67P OI establish and approach (32-33) and Hayabusa 2 OI approach (8) show an empty star field. Body small: Itokawa, Ryugu and Eros at establish.

**F6. Wrong-time artefact: overlapping event windows** (C). `findActiveFlybyMet` returns the first matching event in array order, so a second flyby that starts inside the first one's 30-day depart window never gets its own establish/approach. Computed from the data (`overlap.mjs`, same logic): Cassini Earth establish shows Venus 2; BepiColombo Mercury 1 establish shows Venus 2, Mercury 6 establish and approach show Mercury 5; Mariner 10 Mercury establish shows Venus; Parker P1 establish and approach show VGA 1; Solar Orbiter P5 shows VGA 3; Escapade Gold flyby shows Blue; OSIRIS-REx, Dawn, Europa Clipper, Psyche, Escapade, Lucy OI/arrival events 0.005 d after an arrival event show the arrival event's shots. Seen in frames for Cassini, BepiColombo, and (flagged by `peakMismatch` in the JSONs) the others.

Second pass, seen in frames and checked against the JSON `peakMismatch` flags: Mariner 10 Mercury establish is Venus (`sheet-fb-mariner10-d` frame 7, flag true); BepiColombo Mercury 1 establish shows Venus 2 (frame 17, flag true), Mercury 6 establish and approach show Mercury 5 (frames 42-43, flag true); Escapade Gold flyby is the Blue sequence again (frames 7-10, all four flagged true, the images repeat frames 2-5); Dawn Ceres OI (7-10), Psyche OI (7-10), Europa Clipper Jupiter OI (12-15) and Escapade Mars OI (12-15) are flagged on all four beats; Lucy Eurybates (22-25) and Polymele establish/approach (27-28) are flagged. For the OI cases the images do show the arrival body (Ceres, Psyche, Jupiter, Mars), so the flag marks a shot-kind mismatch more than a wrong picture; I did not check which shot kind was active. OSIRIS-REx OI is not flagged but is wrong in another way (F14).

**F7. Wrong scale** (T/C). NEAR Earth flyby hero: craft is huge at the top of the frame; Juno/Cassini craft large vs BepiColombo/JUICE specks (same as F3). Sun beside Mercury on MESSENGER #2/#3 and BepiColombo #5 depart fills a third of the frame, which reads as a real Sun but pushes the planet to a crescent.

Second pass: the Sun also covers UI. BepiColombo Mercury #1 depart (frame 20) has the Sun filling the top left behind the vehicle panel; Mercury #3 depart (frame 30) the same; Venus depart for BepiColombo (10), Vega 1/2 (5), JUICE (10) and Mariner 10 Mercury depart (10) put the Sun behind the HUD/CAP/2D toggles at the top right. Mercury discs on phone are about 100 px wide at hero (BepiColombo `p-29`, `p-34`), the craft a ~10 px bar.

**F8. Label and banner overlap** (C for the banners, T for labels). Event labels are drawn across the planet disc and across the craft at hero (all missions); events close in time stack their labels (MESSENGER Venus #1/#2, Mercury #1-#3, BepiColombo Mercury #1-#6, Galileo Earth #1/#2, "CRUISE"/"SEPARATION" labels over the cruise-out frames, B). On phone the "MISSION FLIGHT PATH <name>" banner collides with the HUD pill (New Horizons, Parker, Pioneer, MESSENGER OI, Rosetta, Juno). The MESSENGER OI "MOI" card overlaps the banner (D).

Second pass: stale labels (a label of another event shown at a beat that has no body) are in F4/F14. On phone, long event labels are cut at the screen edge ("EARTH - GRAVITY ..." BepiColombo `p-02`, `p-05`, "MERCURY #3 - GRAVITY" `p-30`, Rosetta `p-02`, `p-03`, `p-07`); BepiColombo Mercury #2-#4 stack three labels at the top right on `p-30`. The Parker phone banner confirmed on `sheet-fb-parker-solar-probe-p` frames 13-20: the two-line "PARKER SOLAR PROBE" banner overlaps the HUD pill's "MISSION FLIGHT PATH" word. JUICE `p-25` banner also overlaps the pill. The page's performance hint stays in frame on Mariner 4 d-05, BepiColombo d-08 and p-29, Rosetta d-08 and d-35 (the tool's dismissal missed).

**F9. Artefacts** (C). Hard-edged yellow wedge at 67P (Rosetta hero), Ceres (Dawn), Psyche, Mars OI (Escapade): a flat cone with no falloff. Thick blue trajectory ribbons fill the frame on the late cruise frames of MESSENGER (MET 2151), BepiColombo (2613) and Juno (1296). Galileo OI hero has a white flare smear on the limb.

Second pass: the wedge is also at BepiColombo Mercury OI hero (`sheet-fb-bepicolombo-d` frame 49), Escapade Mars OI hero (14), Dawn Ceres OI hero (9), Psyche OI hero (9, where it is huge and crosses the left HUD panel) and, smaller and paler, JUICE Jupiter OI hero (24). Its apex sits on the craft, so it is probably the thruster plume or a burn cone; it has no falloff and is much larger than the craft. Not at Hera Didymos OI, Europa Clipper OI, Juno OI. Ribbons fill the frame at BepiColombo 46, JUICE 21, Europa Clipper 11, Lucy 21, Rosetta 31 (right edge) as well.

**F10. Cruise empty** (T). The cruise-out frame is a tiny solar system (craft not visible) on every mission; cruise-between frames show the trajectory line with no craft (Cassini MET 1811, Juno 1296, Pioneer 10 320, Voyager 2 2273 on phone). Some cruise-between frames fall inside the previous flyby's depart window (Cassini 645, Pioneer 11 1472 is clean).

**F11. HUD hidden in some frames** (not diagnosed). New Horizons Pluto beats and Cassini OI beats have no HUD panels (footer only), unlike neighbours. Possibly chrome auto-hide after idle; not verified.

Second pass: far more frames than the first pass saw, always in runs that start at a cruise-between or OI-establish frame: Juno 6-9, Hayabusa 2 7-9, Europa Clipper 11-14, Lucy 21-24, Rosetta 31-34, JUICE 22-24, BepiColombo 46-49 (desktop). In each run the page shows the footer links instead of the HUD panels, and the next frame (OI depart, "ARRIVED") has them back. Rosetta frame 34 (`sheet-fb-rosetta-d`) shows the HUD text ghosted at low opacity, i.e. caught mid-fade, which supports a chrome auto-hide that fades in or out rather than a layout bug. Not verified: whether the hide is the idle timer, a response to the long jump in sim time, or the tool's waiting. On phone the same frames (JUICE `p-21..p-24`) show a "More" button in place of the timeline. This explains a good part of the "empty frame" look of the OI establish/approach frames, but not the missing bodies in them.

**F12. Camera jumps between beats** (T). From consecutive frames: establish is a wide pair frame, approach a chase from behind the craft, hero a planet-dominant frame, depart a wide off-axis frame, so every cut changes both framing and planet scale. Planet size goes about 80 px, 250 px, 400 px, 200 px on Voyager 1. This is the montage's design; flagged only because the depart beat often shows the planet night side (Pioneer 10/11, Venus on MESSENGER, JUICE) as a near-black disc. Not captured: the cuts in motion.

**F13. Phone framing** (T). Phone frames use the same beats at a wider field of view (W6 call 2); heroes fit. Planets that overflow on phone: Saturn (rings cropped at the sides), Jupiter OI. Establish beats leave the planet in the upper half with a lot of empty space below.

Second pass, phone: BepiColombo (1-12, 25-36), Rosetta 1-12, JUICE 13-25, Parker 13-20 read. Heroes fit; Earth, Venus and Mars heroes fill the width (Rosetta Mars `p-09`, JUICE Earth `p-14`, `p-19`), Mercury is small (~100 px), the craft a small bar everywhere except Parker's large shield. JUICE Jupiter OI (`p-22..p-24`) frames are tidy. The labels run off the screen edge (F8). Nothing contradicts the first pass.

Phone sheets of the 17 other missions and Lucy, read in the second pass (`sheet-fb-<id>-p.png`; Lucy via `sl-lucy-p-a/b.png`): they match the desktop findings frame for frame. Differences: heroes of Mars, Earth and Venus fill the 390 px width and read well (Mariner 4, Mariner 10 Venus/Mercury, Ulysses, Vega Venus, Hera Mars, Psyche Mars, Europa Clipper Mars/Earth, Dawn Mars, NEAR Earth, Lucy Earth); the craft is a small bar except NEAR (huge) and Escapade Mars OI (large red body, wedge). Epilogue frames (Solar Orbiter 1-15, Vega 7-10, Giotto 7-15, Lucy 25-50) put the two-line banner "SOLAR ORBITER" / "NEAR SHOEMAKER" over the HUD pill and, for Solar Orbiter VGA 2, over the Sun (`p-02..p-05`). Hayabusa 1/2 and Escapade Earth approach and hero (`p-03`, `p-04`) are black with a trajectory arc, as on desktop. Dawn Ceres hero (`p-09`) and Psyche OI hero (`p-09`) show the yellow wedge across half the frame width. Hayabusa 2 `p-06..p-09`, Europa Clipper `p-11..p-13`, JUICE `p-21..p-24`, Lucy `p-21..p-24` show a "More" button instead of the timeline (the HUD-hidden state of F11 on phone). The performance hint is in frame on NEAR `p-05`, Hayabusa 1 `p-01`, Hayabusa 2 `p-05`.

**F14. Body identity changes inside one event, and the label of another event stays** (C). The JSON `flybyId` is not constant over the four beats of one event, so the body shown depends on the sim time, not on the event. OSIRIS-REx Bennu OI (peak 1503): didymos, earth, earth, ryugu over the four beats (`fb-osiris-rex-d.json`; frames 7-10 show a Sun-orbit view, a tan ball, Earth + Moon with no Bennu, Earth + Moon small). Giotto Grigg-Skjellerup (peak 2565): earth, mercury, mercury, mercury. Rosetta Lutetia: didymos on all four. Mariner 10 Mercury establish: venus. BepiColombo Mercury 1 (peak 1077): the establish is venus. In the epilogue frames the label drawn is the one of another event: Vega Halley shows the Venus label, Giotto Earth/Grigg-Skjellerup the Halley label, Lucy the Eurybates label, Solar Orbiter and Parker the P1 label. Looks like a nearest-planet-to-craft lookup per frame, not per event; I did not read the code. Sheets: `sheet-fb-osiris-rex-d`, `sheet-fb-giotto-d`, `sheet-fb-rosetta-d`, `sheet-fb-vega-1-d`.

**F15. Small-body targets are featureless spheres** (T). Itokawa, Ryugu, Eros, Didymos, Psyche, Donaldjohanson, Eurybates and Ceres are plain tan, grey or brown balls of the same style (`sheet-fb-hayabusa1-d` 9, `sheet-fb-hayabusa2-d` 9, `sheet-fb-near-shoemaker-d` 14, `sheet-fb-hera-d` 9, `sheet-fb-psyche-mission-d` 9, `sheet-fb-lucy-d` 19, 24, `sheet-fb-dawn-d` 9). Didymos has no Dimorphos, Eurybates no Queta. The belt squares drawn at establish for Dawn, Psyche and Lucy read as debris. Taste: stylised is acceptable if every small body is drawn the same way and the label says which.

## Calls for the operator

1. Fix the label-to-body mapping for asteroid and comet flybys (F2): add Gaspra, Ida, Mathilde, Steins, Lutetia, Dinkinesh, Bennu, Halley (Vega, Giotto) and Grigg-Skjellerup to the parser and give them a stylised body, or show a stylised "small body" placeholder; stop falling back to the nearest planet. The Lucy, Itokawa, Ryugu, Eros, Didymos, Psyche and Ceres targets are already in the list.
2. Give the Saturn rings to any Saturn mesh, not only the destination (F1). **Done 2026-11-26 (3efd7bb17c2)**, checked on Voyager 2's Saturn hero frame.
3. Let events after the arrival clamp play their own montage (F4). Changed by the second pass: not only New Horizons Arrokoth and Parker VGA 4/6, P8, P22, but Solar Orbiter (all frames), Vega 1/2 Halley, Giotto Earth and Grigg-Skjellerup, and Lucy from Polymele on (26 of 50 frames). This is the biggest visible defect of the review; 76 of 120 desktop frames of those five missions show no target.
4. Make `findActiveFlybyMet` pick the event whose window is nearest (not the first in the array), and shorten a window when the next event is close (F6); and pin the flyby body to the event, not to the frame (F14).
5. Keep the target body in frame on the OI depart and OI approach (F5): MESSENGER, BepiColombo, Dawn, Psyche, Eros, Hera, Rosetta 67P, Hayabusa 2; and on the Earth gravity assist of Hayabusa 1, Hayabusa 2 and Escapade.
6. One minimum on-screen craft size for flyby shots (F3, F7), so BepiColombo, JUICE and Hayabusa read like Cassini and Juno. Taste: which size. (The second pass found BepiColombo and JUICE are readable at hero, only small; the missing craft at the OI heroes of Juno, Europa Clipper, JUICE, Hayabusa, Dawn is a separate point.)
7. Phone banner and label rules (F8): move the "MISSION FLIGHT PATH" banner below the HUD pill; one label per body at a flyby, not a stack; label not over the craft at hero; keep labels inside the screen on phone.
8. Replace the hard yellow wedge (F9) (BepiColombo, Escapade, Dawn, Psyche, Rosetta, JUICE) and thin the trajectory ribbons on the cruise frames (BepiColombo, JUICE, Europa Clipper, Lucy, Rosetta, Juno).
9. Cruise frames: pick a craft-led frame like the cislunar coast (F10). Taste.
10. Depart beat: light the planet (move the camera to the lit side or a fixed light) for Pioneer, Venus, Mercury and JUICE (F12). Taste.
11. Diagnose the hidden HUD (F11) before deciding: it is now on seven missions in OI/cruise runs (Juno, Hayabusa 2, Europa Clipper, Lucy, Rosetta, JUICE, BepiColombo) plus New Horizons and Cassini. A half-faded frame (Rosetta 34) points to an auto-hide fade.
12. Sun behind UI on depart beats (F7): keep the Sun out of the HUD toggle area, or accept it. Taste.
13. Decide whether small-body targets get a shared stylised look (F15). Taste.

Counts: 15 finding groups (F1-F15), 13 calls. Code bugs: F1, F2, F4, F5, F6, F9, F14, banner part of F8. Taste: F3, F7, F10, F12, F13, F15, label part of F8. Unknown: F11.

## What I could not shoot or read

Frames read: every desktop sheet of the 26 missions (first pass 13 in full; second pass BepiColombo, Rosetta, Juno, JUICE, Parker, the 17 others and Lucy, all frames) and every phone sheet (first pass: the 13 in-scope missions except the slices listed in F13; second pass: those slices plus the phone sheets of the 17 others and Lucy). Frames were looked at in contact sheets at reduced size (about 230 to 640 px wide per frame); fine detail (a 1-2 px craft, small label text) may be missed.

Still not read:

- Nothing in the 26 sheets is unread now. Phone BepiColombo 13-24 and 37-50, Rosetta 13-35, JUICE 1-12 and Parker 1-12 were read by the first pass and not re-read.
- Moving cuts between beats: still frames only, so camera jumps are inferred from consecutive frames.
- Play-mode extras (peak-hold freeze, slow-motion, caption timing) are not reproduced by `__flySetSimDay`.
- Galileo probe release, Parker P1/P8 and the other `arrival` events were not shot as their own beats; only the last arrival/OI event of each mission has beats.
- Not diagnosed (no code read, only frames and JSON): why the OSIRIS-REx Earth flyby shows no Earth-coloured planet, why the HUD hides (F11), why Hayabusa 1/2 and Escapade Earth passes have no Earth in frame, what shot kind was active where `peakMismatch` is true on arrival events.
- Unsettled frames (JSON `settled: false`), desktop: New Horizons 2; Parker 6, 11, 12, 16; Vega 1 and 2 6-7 each; Giotto 6; OSIRIS-REx 6; Solar Orbiter 2, 6, 11; Lucy 27, 31, 36, 41, 46. Phone: Parker 6, 11, 12; Lucy 31, 36, 41, 46. They are cruise or arrival frames that were still gliding after 30 s. The first pass listed "Parker 3-4, Solar Orbiter 3, Lucy 4-5" from a different run; the JSON in `SHOT_DIR` is the later one. Several first frames needed a page reload (navigation during load) and were retried.
- Machine load was 10 to 17 during the runs; the page's performance hint fired on some frames, was dismissed before capture, and is still in frame on the ones named in F8.
