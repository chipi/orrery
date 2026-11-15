# UXD-047 — The launch draws the pad of its launch site and era

- **Status**: accepted (built; unit tests green, see Verification; renders read, see Not done)
- **Date**: 2026-11-15
- **Decider**: the operator, 2026-11-15 — "Yes" to plan row L58 ("are our launch pads rendered as the real ones?"), then "we would add pads to colophon as 3D models"
- **Answers**: L58 (G4)
- **Builds on**: [UXD-046](UXD-046-the-launch-runs-a-seeded-camera-director.md) (the launch director and its conditions rig), RFC-034 §7
- **Changes**: `src/lib/launches/pad-family.ts`, `pad-gallery.json`, `launch-instant.ts`, `src/lib/three/launch-pads.ts`, `launch-conditions-scene.ts`, `launch-director-rig.ts`, `LaunchScene.svelte`, `/fly` `+page.svelte`, `/dev/models`, `scripts/build-original-work.mjs` (the /colophon list)

## Context

Every launch drew one generic lattice tower scaled to the vehicle; only the ground under it was real (the 12 EOX Sentinel-2 site crops). A Saturn V and a Soyuz stood beside the same tower.

## Decision

1. **Sixteen pad models in five families**, in the same low-detail style as the tower (boxes and cylinders, four materials, merged per material so a pad is a handful of draw calls): apollo-shuttle (Launch Umbilical Tower, Shuttle Fixed and Rotating Service Structures, SLS Mobile Launcher with lightning towers), soviet (the R-7 pad with four support arms, the Proton service tower), spacex (the transporter-erector at 39A, SLC-40 with and without the crew tower, SLC-4E, Starbase), ula (SLC-41), service-tower (Cape mobile-service-tower pads, Kourou ELA-2/3 and ELA-4, the Chinese service towers, Tanegashima, Sriharikota).
2. **True scale against the vehicle.** The pad is built in metres and scaled by the vehicle's drawn length over its real height, so a tower stands at its real height relative to the rocket (the LUT at 1.05 times a Saturn V).
3. **The pad comes from the launch-site fleet record and the launch year.** `src/lib/launches/pad-family.ts` maps every launch-site fleet record to an era rule (a test lists the directory, so a new record must get a row): LC-39A is the Apollo tower before 1976, the Shuttle structures to 2011, the Falcon pad after; SLC-40 is the Cape tower before 2010, the bare transporter-erector to 2022, the crew tower from 2023; SLC-41 is the Atlas pad from 2002. The pad of the mission's launch-site ref, else the launches entry's, else the profile's site name. A site with no row (twelve of 42) keeps the generic tower.
4. **Moving parts are a pure function of the mission time**: the Soviet support arms fall outward over 3.2 s from T+0, the Apollo and tower swing arms swing away after T+0, the Falcon strongback leans 1.5 degrees before liftoff and 45 degrees at it. Scrubbing and pausing never jump.
5. **/colophon lists each pad model** as one of the site's 3D models next to the spacecraft and launchers (thumbnails from the `/dev/models` gallery), with its sources and which sizes are approximate.

## Not done here

- Dimensions are verified only for the LC-39 figures (LUT 380 ft, Mobile Launcher 160 x 135 x 25 ft, flame trench 43 x 59 x 449 ft, water tower 290 ft, 350 ft for the 39A tower) and the Falcon strongback motion (Wikipedia, plain dimensions); every other height is an approximation from general knowledge, listed in the search backlog for agency pages. No reference photograph was fetched.
- No Vertical Integration Facility, mobile service tower in its parked position (except Ariane 6 and Sriharikota), crawler way, propellant spheres or catenary wires.
- Frame time on a real GPU.
