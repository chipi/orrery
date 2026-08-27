# src/lib/ar — module map

AR experiences (globe-on-a-surface and sky-pointing) shared by the routes
that offer AR entry. Two scene families, two platform substrates:

- **Surface-anchored scenes** — `ar-scene.ts` builds the three single-globe
  AR scenes (pure builder; texture loader injected so it tests without a
  DOM). `ar-assembly.ts` is the tabletop station-assembly replay for the
  ISS/Tiangong proxies (reuses the routes' assembly primitives).
- **Sky-pointing scenes** — `sky-scene.ts` renders the whole night sky at
  true ENU directions: Sun/Moon/planet/station markers **plus** the RFC-041
  content layers (constellation figures + stars + deep-sky + horizon +
  rise/set). `celestial-sky.ts` holds the pure, unit-tested coordinate math +
  data loaders (equatorial-XYZ → ENU, deep-sky filter, sunrise/sunset scan).
  `planet-bake.ts` bakes the shipped `2k_*.jpg` maps into the planet marker
  sprites (real textures, phases, Saturn rings) via one-time render targets.
  `sky-view.ts` is the substrate-agnostic seam that supplies camera pose +
  ENU→world rotation; `sky-orientation.ts` owns the orientation-vs-true-north
  math (ENU frame: +x East, +y Up, North −z).
- **Platform substrates** — `webxr.ts` (WebXR: web/Android) and
  `arkit-capacitor.ts` (ARKit via Capacitor: iOS) implement the same
  session/hit-test/pose duties for their platform. `sky-view.ts` picks the
  substrate; feature code should depend on the seam, not on either substrate.
- **Session lifecycle** — `launch-ar.ts` enters/tears down the AR overlay
  DOM around a session (idempotent teardown).
- **Support** — `ar-audio.ts` (listener basis for spatial audio),
  `ar-haptics.ts`, `ar-narrator.ts` (anchors a scene to its Guide episode),
  `real-now.ts` (live Sun aim + "you are here" pin).

Why AR is structured this way: see the ADRs referenced from TA.md §AR.
