# W9 crewed dockings: build plan (2026-11-27)

Operator decisions 2026-11-27 #13-15: ISS both Soyuz TM-31 (Expedition 1) and Crew Dragon Demo-2;
Mir both STS-71 and Soyuz T-15; Tiangong Shenzhou 12. Shortlist research:
`2026-11-26-w9-docking-shortlist.md` (mostly Wikipedia); primary-source pass:
`2026-11-27-w9-docking-timelines-sourced.md` (in progress).

## What exists

- Chasers as showcase models: `crew-dragon` (capsules-commercial), `shenzhou` (station-freighters),
  `soyuz-tm`, `soyuz-t` (capsules-classic); the Shuttle orbiter with an opening bay (`winged.ts`).
- Targets: /iss and /tiangong draw diagram stations (`iss-proxy-model.ts`, 1 unit = 12.7 m;
  `tiangong-proxy-model.ts`) with an assembly walker that shows the station on a date. Mir has a
  fleet entry, no model. No mission records for the five flights.
- The pattern to copy: the deploy (W10) plays its own scene between the launch and the coast
  (`DeployScene`, `startDeploy` in /fly), pure pose and camera in scene time, real MET on the HUD.

## Decisions taken (operator may overturn)

1. **Its own scene, after the launch, before the Earth-orbit coast** (as the deploy). A docking is
   hours to two days after launch; the coast that follows shows the stay in orbit.
2. **Target models at docking scale only where the camera goes close:** a detailed, real-size model
   of the port end (Demo-2: Harmony forward, PMA-2, IDA-2; TM-31: Zvezda aft; Shenzhou 12: Tianhe's
   forward node; T-15: the whole Mir core, it was alone; STS-71: Kristall's APAS end), with the rest
   of the station from the diagram models scaled to metres for the wide shots, configured for the
   date. Not a rebuild of the ISS or Tiangong (W3 stays its own decision).
3. **Data:** `static/data/docking-profiles/<missionId>.json` (chaser showcase id, target and port,
   the date's station configuration, the approach: corridor, hold points with ranges, closing
   speed, METs of the last burns, contact, capture, hard dock, hatch; `estimatedFields`,
   `provenance`), validator in `$lib/fly/docking-profile.ts`.
4. **Beats:** far approach (station grows), hold point(s), final approach on the axis, contact
   (Dragon/Shenzhou: soft capture ring; Soyuz: probe into drogue; STS-71: APAS rings), retraction
   and hard dock, hatch open. Real MET with "~" on estimates, compressed time on the HUD.

## Build order

1. Crew Dragon Demo-2 (best-published approach, best chaser model): profile, scene, Harmony/PMA-2
   end, mission record (14 locales), /fly wiring, tests and frames at 1280x800 and 390x844.
2. Shenzhou 12 (Tianhe forward node; the U-turn to the forward port).
3. Soyuz TM-31 (Zvezda aft, probe and drogue; the station of November 2000).
4. Soyuz T-15 (Mir core alone, 1986; the Mir to Salyut 7 transfer as a caption, not a scene).
5. STS-71 (Mir 1995 with Kristall, the orbiter with its docking system in the bay, R-bar approach).

Each step: sourced profile first, science review (sonnet) of the record, then the build.

## Step 1 built: Crew Dragon Demo-2 (2026-11-27)

- Mission `crew-dragon-demo-2` (Earth, FLOWN, 14 locales, three NASA photos, card, orbit thumbnail;
  the crew-dragon fleet row `demo-2` now points at it).
- Data: `static/data/docking-profiles/crew-dragon-demo-2.json` (`$lib/fly/docking-profile.ts`).
  Sourced: the approach initiation burn (12:11 UTC, ~90 s), the waypoint ranges (400 / 220 / 20 m),
  the go/no-go hold at WP2, soft capture 14:16, hard capture 14:27 (12 hooks), 421 km; the sizes of
  Harmony, PMA-2 (NASA ISS elements reference), IDA, HTV. Estimated: the waypoint times (spaced as
  the pre-launch plan spaced them before capture), WP1/WP2 on the axis, the path, the ring travel,
  the nose cone's side and angle, the Sun's direction.
- Scene: `fly-docking-scene.ts` in the deploy slot (`DeployScene.svelte`, `?dock=1`); the /iss
  diagram station scaled to metres as of 31 May 2020, the port end at real size
  (`iss-docking-end.ts`), HTV-9 on Harmony nadir, Crew Dragon with its nose cone open
  (`setNoseOpen`, `dockingPort` on the showcase model). Earth at 1/50.
- After it: the coast (1,024 orbits, launch to splashdown) and the splashdown off Pensacola
  (descent profile; entry figures from the Inspiration4 profile, marked estimates). Falcon 9:
  booster on OCISLY and Dragon separation from the pre-launch timeline (`timeClass: approx`).
- Science review (sonnet): no blockers; fixed the "first by a commercial provider" wording, the
  manual-control clause, the booster source line, the PMA source, the nose-cone timing note.

Open: the rest of the station (Soyuz MS-16, Progress 74/75: ports not sourced) is not drawn; the
diagram station's modules are low-poly beside the real-size port end; the coast MET restarts after
the docking (as after the deploys); no native translation review; no e2e run.
