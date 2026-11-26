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
| BepiColombo | Earth 538, Venus 726/1025, Mercury 1077/1342/1703/2146/2234/2272 | 12,700 km; 10,720; 552; 199; 200; 236; 165; 37,626; no figure | craft a 1-2 px speck throughout; #1 establish and #6 establish/approach show the previous flyby (F6) |
| | Mercury OI 2954 | planned 2026-11-21 | establish: dot; **approach: no Mercury in frame** (F5) |
| Rosetta | Earth 367/1351/2082, Mars 1090 | 1,955; 5,301; 2,481; 250 km | Earth frames good; Mars not looked at in full |
| | Steins 1648 | 2008-09-05, 800 km | **shows Earth + Moon** (F2) |
| | Lutetia 2321 | 2010-07-10, 3,162 km | **all four beats empty black** (F2) |
| | 67P OI 3809 | 2014-08-06 | hero: nucleus ball + hard yellow wedge (F9) |
| Juno | Earth 796 | 2013-10-09, 559 km | best phone hero of the set (craft large) |
| | Jupiter OI 1796 | 2016-07-05 | hero: planet only, no craft; depart banner on scene |
| JUICE | Earth+Moon 493 | Aug 2024, Moon 700 km, Earth 6,800 km | Earth hero; Moon not in frame at hero |
| | Venus 870, Earth #2 1263, Earth #3 2106 | 5,088 km; 8,641 km; no figure | craft a speck; Venus depart: Sun + dark Venus |
| | Jupiter OI 3020 | planned 2031-07 | not looked at in detail |
| Parker | Venus 1 (52), VGA 4 (923), VGA 6 (1835) | 2018-10-03; 2021-02-20; 2023-08-21 | only VGA 1 plays; 923 and 1835 render the same P1 epilogue frame (F4) |
| | P1 85 `arrival`, P8 990, P22 2326 | | P1 hero: probe at the Sun, banner over HUD (F8); P8 and P22 not shot separately (events after "arrival" at 85 d) |

Other missions (hero frames only, phone; desktop sheets exist but were not read, Lucy not read at all): Mariner 4 Mars hero good; Mariner 10 Venus and Mercury heroes good, Mercury establish shows Venus depart (F6); Ulysses Jupiter hero good; Vega 1/2 Venus hero good, **Halley hero shows only the craft and a label, no nucleus** (F2); Giotto Halley hero: craft only, no nucleus; Hayabusa 1 Earth hero: empty frame with a dot (F2/F7); NEAR Mathilde: craft cropped at the edge, no asteroid; NEAR Earth hero: craft huge at top (F7); Dawn, Escapade, Psyche OI, Europa Clipper, Hera, Solar Orbiter: planet or body ok but yellow wedge at Ceres, Psyche and Mars (F9); Escapade Earth flybys: black frame; Escapade, Dawn, OSIRIS-REx, Psyche, Europa Clipper OI and Lucy Eurybates/Polymele share overlapping windows (F6). Solar Orbiter heroes: Sun at the top, craft tiny.

## Findings by kind

Code bug (C) or taste call (T) after each. Viewport: D desktop, P phone, B both. Sheet names are `sheet-fb-<id>-<d|p>.png`.

**F1. Wrong body appearance** (C). Voyager 2 at Saturn (flyby 2, all beats, B; `sheet-fb-voyager-2-d/p`): Saturn has no rings. The rings are built once and parented to `destinationMesh`, visible only when the destination is Saturn (`fly-helio-scene.ts:1050-1056`); a Saturn flyby on a mission bound elsewhere (V2, Cassini after Saturn is not affected) gets the bare context sphere. Pioneer 11, Voyager 1 and Cassini OI have rings.

**F2. Body not in frame / wrong body** (C). The flyby planet is parsed from the event label (`find-flyby-planet.ts`); labels that are not in its list fall back to the nearest planet. Asteroid and comet events therefore show the wrong thing or nothing: Galileo Gaspra and Ida, Rosetta Steins and Lutetia, NEAR Mathilde, Lucy's asteroids not in the list (Dinkinesh) show Earth+Moon, belt squares or black; Halley at Vega 1/2 and Giotto shows only the craft. Sheets: `sheet-fb-galileo-*`, `sheet-fb-rosetta-*`, `sheet-fb-near-shoemaker-*`, `sheet-fb-vega-1-*`, `sheet-fb-giotto-*`. Beats: all four. Viewport B.

**F3. Craft missing or too small** (T, with C for the speck sizes). The craft glyph at a flyby is 1-4 px for BepiColombo, JUICE, Hayabusa 1, Escapade (`sheet-fb-bepicolombo-*`); large and readable for Cassini, Juno, Parker, Pioneer, Giotto. New Horizons has no craft at Pluto hero (B). Voyager 2 Uranus approach on phone: craft not visible. Establish and approach frames mostly show the craft as a speck on all missions. Mission-model scale is inconsistent between missions.

**F4. Black or frozen frames from the arrival clamp** (C). Events after the mission's arrival time are rendered in the epilogue state: New Horizons Arrokoth (4730 > transit 3463) is black with a banner; Parker VGA 4, VGA 6, P8, P22 (all after the 85-day "arrival") repeat the same P1 tableau. `sheet-fb-new-horizons-d/p` frames 11-15, `sheet-fb-parker-solar-probe-d/p` frames 6-20. Depart beats of Pioneer 10/11, Voyagers, Galileo and others also land in "ARRIVED" with the "MISSION FLIGHT PATH" banner (P: banner overlaps the top HUD pill; F8).

**F5. Arrival weak / planet out of frame** (C). MESSENGER OI depart (B): Mercury off screen, only an event label at the edge. BepiColombo OI approach (B): no Mercury, craft speck. Hayabusa 1 and Rosetta OI: body small. `sheet-fb-messenger-d/p` frames 34-35, `sheet-fb-bepicolombo-p` frame 48.

**F6. Wrong-time artefact: overlapping event windows** (C). `findActiveFlybyMet` returns the first matching event in array order, so a second flyby that starts inside the first one's 30-day depart window never gets its own establish/approach. Computed from the data (`overlap.mjs`, same logic): Cassini Earth establish shows Venus 2; BepiColombo Mercury 1 establish shows Venus 2, Mercury 6 establish and approach show Mercury 5; Mariner 10 Mercury establish shows Venus; Parker P1 establish and approach show VGA 1; Solar Orbiter P5 shows VGA 3; Escapade Gold flyby shows Blue; OSIRIS-REx, Dawn, Europa Clipper, Psyche, Escapade, Lucy OI/arrival events 0.005 d after an arrival event show the arrival event's shots. Seen in frames for Cassini, BepiColombo, and (flagged by `peakMismatch` in the JSONs) the others.

**F7. Wrong scale** (T/C). NEAR Earth flyby hero: craft is huge at the top of the frame; Juno/Cassini craft large vs BepiColombo/JUICE specks (same as F3). Sun beside Mercury on MESSENGER #2/#3 and BepiColombo #5 depart fills a third of the frame, which reads as a real Sun but pushes the planet to a crescent.

**F8. Label and banner overlap** (C for the banners, T for labels). Event labels are drawn across the planet disc and across the craft at hero (all missions); events close in time stack their labels (MESSENGER Venus #1/#2, Mercury #1-#3, BepiColombo Mercury #1-#6, Galileo Earth #1/#2, "CRUISE"/"SEPARATION" labels over the cruise-out frames, B). On phone the "MISSION FLIGHT PATH <name>" banner collides with the HUD pill (New Horizons, Parker, Pioneer, MESSENGER OI, Rosetta, Juno). The MESSENGER OI "MOI" card overlaps the banner (D).

**F9. Artefacts** (C). Hard-edged yellow wedge at 67P (Rosetta hero), Ceres (Dawn), Psyche, Mars OI (Escapade): a flat cone with no falloff. Thick blue trajectory ribbons fill the frame on the late cruise frames of MESSENGER (MET 2151), BepiColombo (2613) and Juno (1296). Galileo OI hero has a white flare smear on the limb.

**F10. Cruise empty** (T). The cruise-out frame is a tiny solar system (craft not visible) on every mission; cruise-between frames show the trajectory line with no craft (Cassini MET 1811, Juno 1296, Pioneer 10 320, Voyager 2 2273 on phone). Some cruise-between frames fall inside the previous flyby's depart window (Cassini 645, Pioneer 11 1472 is clean).

**F11. HUD hidden in some frames** (not diagnosed). New Horizons Pluto beats and Cassini OI beats have no HUD panels (footer only), unlike neighbours. Possibly chrome auto-hide after idle; not verified.

**F12. Camera jumps between beats** (T). From consecutive frames: establish is a wide pair frame, approach a chase from behind the craft, hero a planet-dominant frame, depart a wide off-axis frame, so every cut changes both framing and planet scale. Planet size goes about 80 px, 250 px, 400 px, 200 px on Voyager 1. This is the montage's design; flagged only because the depart beat often shows the planet night side (Pioneer 10/11, Venus on MESSENGER, JUICE) as a near-black disc. Not captured: the cuts in motion.

**F13. Phone framing** (T). Phone frames use the same beats at a wider field of view (W6 call 2); heroes fit. Planets that overflow on phone: Saturn (rings cropped at the sides), Jupiter OI. Establish beats leave the planet in the upper half with a lot of empty space below.

## Calls for the operator

1. Fix the label-to-body mapping for asteroid and comet flybys (F2): add Gaspra, Ida, Mathilde, Steins, Lutetia, Dinkinesh, Halley (Vega) to the parser and give them a stylised body, or show a stylised "small body" placeholder; stop falling back to the nearest planet.
2. Give the Saturn rings to any Saturn mesh, not only the destination (F1).
3. Let events after the arrival clamp play their own montage (New Horizons Arrokoth, Parker VGA 4/6, P8, P22), or mark the epilogue state's sim time as the real mission end (F4).
4. Make `findActiveFlybyMet` pick the event whose window is nearest (not the first in the array), and shorten a window when the next event is close (F6).
5. Keep the target body in frame on the OI depart and on OI approach for MESSENGER and BepiColombo (F5).
6. One minimum on-screen craft size for flyby shots (F3, F7), so BepiColombo, JUICE and Hayabusa read like Cassini and Juno. Taste: which size.
7. Phone banner and label rules (F8): move the "MISSION FLIGHT PATH" banner below the HUD pill; one label per body at a flyby, not a stack; label not over the craft at hero.
8. Replace the hard yellow wedge (F9) and thin the trajectory ribbons on the cruise frames.
9. Cruise frames: pick a craft-led frame like the cislunar coast (F10). Taste.
10. Depart beat: light the planet (move the camera to the lit side or a fixed light) for Pioneer, Venus and JUICE (F12). Taste.
11. Diagnose the hidden HUD in the New Horizons and Cassini frames (F11) before deciding.

Counts: 13 finding groups (F1-F13), 11 calls. Code bugs: F1, F2, F4, F5, F6, F9, banner part of F8. Taste: F3, F7, F10, F12, F13, label part of F8. Unknown: F11.

## What I could not shoot or read

- Moving cuts between beats: still frames only, so camera jumps are inferred from consecutive frames.
- Play-mode extras (peak-hold freeze, slow-motion, caption timing) are not reproduced by `__flySetSimDay`.
- Galileo probe release, Parker P1/P8 and the other `arrival` events were not shot as their own beats; only the last arrival/OI event of each mission has beats.
- Not read, though the frames exist: the desktop sheets for BepiColombo, Rosetta, Juno, JUICE and Parker P1-VGA 4 first slice; the phone sheets for BepiColombo frames 1-12 and 25-36, Rosetta 1-12, JUICE 13-25, Parker 13-20; the desktop sheets of the 17 other missions; Lucy entirely (50 frames each viewport, 5 unsettled, 6 peak mismatches in the JSON).
- Unsettled frames: New Horizons 2, Parker 3-4, Vega 2 each, Giotto, OSIRIS-REx, Solar Orbiter 3, Lucy 4-5. They are cruise or arrival frames that were still gliding after 30 s. Several first frames needed a page reload (navigation during load) and were retried.
- Machine load was 10 to 17 during the runs; the page's performance hint fired on some frames and was dismissed before capture.
