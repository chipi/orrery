// =============================================================================
// AUDIO TOUR DECLARATIONS — single source of truth.
//
// Everything you'd want to edit about the Curator Full Tour and the per-
// episode stage hooks lives in this one file. No JSON, no markdown frontmatter
// edits needed for tour tuning.
//
// Two things you can tune here:
//   1. CURATOR_FULL_TOUR — the ordered episode-id list that "Take the
//      Curator Tour" plays through. Reorder, add, or remove ids to change
//      the listening flow.
//   2. EPISODE_STAGES — per-episode timed UI affordances. When an episode
//      plays (tour or direct inventory click) the AudioOverlay fires each
//      stage as the audio position passes its `at_sec`. Flash an element,
//      scroll to a marker, click a button. Each stage fires once per play
//      and resets when the episode is reloaded.
//
// Stage selectors should point at stable DOM hooks. The convention is a
// `data-audio-stage="<name>"` attribute on the target element so the audio
// system doesn't latch onto CSS classes that may churn for styling reasons.
// =============================================================================

// Action types — see executor in AudioOverlay.svelte for runtime behaviour.
//   flash       — pulse a warm-gold glow around the target element (1.8 s).
//   scroll-to   — smooth-scroll the target element into view.
//   click       — programmatically click the target.
//   open-tab    — alias for click; semantic intent on tab buttons.
//   cue         — show a directive banner inside the overlay (target = msg).
//   drag        — dispatch CustomEvent('audio-stage-drag') on the target.
//                 Canvas-driven routes listen and rotate their camera.
//                 Optional `params.rotateRad` + `params.durationMs`.
//   zoom        — dispatch CustomEvent('audio-stage-zoom') on the target.
//                 Optional `params.factor` (e.g. 0.55 = closer) + `durationMs`.
//   navigate    — SvelteKit goto(`target`). `target` is the URL path/query
//                 (e.g. `/missions?q=apollo`), NOT a CSS selector. Used to
//                 demonstrate search/filter affordances by pushing URL-bound
//                 state. Optional `params.replaceState` (1 = replace history).
export type AudioStageAction =
  'flash' | 'scroll-to' | 'click' | 'open-tab' | 'cue' | 'drag' | 'zoom' | 'navigate';

export interface AudioStage {
  /** Seconds into the episode when this stage fires. */
  at_sec: number;
  /** What to do when this stage fires.
   *   flash       — pulse a warm-gold glow around the target element (1.8 s).
   *   scroll-to   — smooth-scroll the target element into view.
   *   click       — programmatically click the target (opens panels, etc.).
   *   open-tab    — alias for click; semantic intent on tab buttons.
   *   cue         — show a directive banner inside the overlay. `target` is
   *                 the message text (NOT a CSS selector). No DOM hook
   *                 required — works on every route, including 3D canvases.
   *   navigate    — SvelteKit goto. `target` is the URL path/query.
   */
  action: AudioStageAction;
  /** For DOM actions: CSS selector. For `cue`: the message text.
   *  For `navigate`: the URL path/query (e.g. `/missions?q=apollo`). */
  target: string;
  /** Optional duration in ms — semantics depend on action:
   *  cue     → banner visibility (default 6000 ms).
   *  drag    → animation duration (default 1500 ms).
   *  zoom    → animation duration (default 1500 ms). */
  duration_ms?: number;
  /** Optional extra parameters for `drag` / `zoom` / `navigate` actions.
   *  For drag/zoom: passed as the CustomEvent's `detail`. Examples:
   *    `{ rotateRad: 1.57 }` — drag rotates camera by 90°
   *    `{ factor: 0.55 }`    — zoom multiplies camera radius by 0.55
   *  For navigate:
   *    `{ replaceState: 1 }` — replace history entry instead of push
   */
  params?: Record<string, number | string>;
  /** Optional authoring note — surfaced in dev console only. */
  note?: string;
}

// =============================================================================
// EPISODE_STAGES — keyed by episode id. Add entries as you wire up affordances.
// Missing keys / empty arrays are fine; the episode plays normally without
// side-effects. Selectors that don't resolve on the current page no-op.
// =============================================================================

export const EPISODE_STAGES: Record<string, AudioStage[]> = {
  // ── / · guide-home — landing-page card tour. The narration names every
  //    route card in order; flash each as it's spoken (was 0 stages — the
  //    whole 200 s episode played with no automation). route-card-<slug>
  //    is templated onto the grid (card.route.slice(1)). ────────────────
  'guide-home': [
    // VTT 00:00:22.4 "Look at the cards on this page."
    { at_sec: 22, action: 'scroll-to', target: '[data-audio-stage="route-grid"]' },
    { at_sec: 24, action: 'flash', target: '[data-audio-stage="route-grid"]' },
    // VTT 00:00:28.2 "Explore opens the whole solar system…"
    { at_sec: 29, action: 'flash', target: '[data-audio-stage="route-card-explore"]' },
    // VTT 00:00:35.4 "Earth, Moon, and Mars are the places we know best…"
    // (9 s sentence — spaced ~3 s each for breathing room, not crammed.)
    { at_sec: 37, action: 'flash', target: '[data-audio-stage="route-card-earth"]' },
    { at_sec: 40, action: 'flash', target: '[data-audio-stage="route-card-moon"]' },
    { at_sec: 43, action: 'flash', target: '[data-audio-stage="route-card-mars"]' },
    // VTT 00:00:44.3 "ISS and Tiangong are the two space stations…"
    { at_sec: 46, action: 'flash', target: '[data-audio-stage="route-card-iss"]' },
    { at_sec: 50, action: 'flash', target: '[data-audio-stage="route-card-tiangong"]' },
    // VTT 00:00:51.9 "Missions is the catalogue…"
    { at_sec: 54, action: 'flash', target: '[data-audio-stage="route-card-missions"]' },
    // VTT 00:00:58.3 "Fleet shows the hardware itself…"
    { at_sec: 60, action: 'flash', target: '[data-audio-stage="route-card-fleet"]' },
    // VTT 00:01:05.9 "Science is the in-app encyclopedia…"
    { at_sec: 68, action: 'flash', target: '[data-audio-stage="route-card-science"]' },
    // VTT 00:01:13.4 "Plan and Fly let you design a transfer trajectory…"
    { at_sec: 76, action: 'flash', target: '[data-audio-stage="route-card-plan"]' },
    { at_sec: 80, action: 'flash', target: '[data-audio-stage="route-card-fly"]' },
    // VTT 00:01:48 "Take any card."
    { at_sec: 109, action: 'flash', target: '[data-audio-stage="route-grid"]' },
  ],
  // ── / · pale-blue-dot — Curator tour open (PILOT for stage authoring,
  //    RFC-019 §12). Mixed sequence: scroll-to + flash + cue across the
  //    115 s narration. Anchored to data-audio-stage attrs on +page.svelte. ─
  'pale-blue-dot': [
    {
      at_sec: 4,
      action: 'cue',
      target: 'On February 14th, 1990 — Voyager 1 turned around to look back at Earth.',
      duration_ms: 7000,
      note: 'Scene-setter while Sagan-register opening prose plays.',
    },
    // VTT § 00:00:21.7 "Turn around. Look back…" — scroll-to has to
    // come first so the illustration is in viewport when the flash
    // pulses on the "Turn around" beat. The whole back half of
    // pale-blue-dot was authored against SSML 115 s target but actual
    // VTT is 90 s; every stage from t=30 onward drifted 8–30 s late.
    {
      at_sec: 19,
      action: 'scroll-to',
      target: '[data-audio-stage="hero-illustration"]',
      note: 'Bring the orrery illustration into view before "Turn around. Look back" lands.',
    },
    {
      at_sec: 21,
      action: 'flash',
      target: '[data-audio-stage="hero-illustration"]',
      note: 'Pulse the illustration on "Turn around. Look back."',
    },
    // VTT § 00:00:38.95 "That dot is Earth." — flat-family hero is a
    // single .webp without an isolatable EARTH label anchor (commit
    // e12039461). The earlier flash at t=21 already pulses the whole
    // illustration; the second beat is dropped as the asset doesn't
    // support a precise label target. Honest degradation > a flash
    // pointing at nothing.
    // VTT § 00:01:07.0 "You are looking at it now."
    {
      at_sec: 65,
      action: 'cue',
      target: 'Scroll down — every screen Orrery has lives in the grid below.',
      duration_ms: 7000,
    },
    {
      at_sec: 67,
      action: 'scroll-to',
      target: '[data-audio-stage="route-grid"]',
      note: 'Reveal the route grid as "You are looking at it now" lands.',
    },
    // VTT § 00:01:26.7 "Take the tour. See where we are."
    {
      at_sec: 86,
      action: 'flash',
      target: '[data-audio-stage="route-grid"]',
      note: 'Pulse the whole grid to anchor where the tour will travel.',
    },
    {
      at_sec: 87,
      action: 'flash',
      target: '[data-audio-stage="route-card-explore"]',
      note: 'Pulse the /explore card on "Take the tour. See where we are."',
    },
  ],

  // ── /explore · guide-explore ───────────────────────────────────────
  'guide-explore': [
    {
      at_sec: 6,
      action: 'cue',
      target: 'Drag the view to rotate the solar system around the Sun.',
    },
    { at_sec: 6, action: 'scroll-to', target: '[data-audio-stage="explore-hud"]' },
    { at_sec: 8, action: 'flash', target: '[data-audio-stage="explore-hud"]' },
    // Timings derived directly from the VTT caption track (the
    // SSML-target-duration is 240 s; actual ElevenLabs audio runs ~140 s).
    // VTT § 00:00:17.8 — "Drag to rotate the view." → camera rotates ~60°.
    {
      at_sec: 17,
      action: 'drag',
      target: '[data-audio-stage="explore-scene"]',
      duration_ms: 1800,
      params: { rotateRad: 1.05 },
    },
    // VTT § 00:00:19.6 — "Scroll to zoom in and out." → camera zooms in then back.
    {
      at_sec: 19,
      action: 'zoom',
      target: '[data-audio-stage="explore-scene"]',
      duration_ms: 1500,
      params: { factor: 0.6 },
    },
    {
      at_sec: 22,
      action: 'zoom',
      target: '[data-audio-stage="explore-scene"]',
      duration_ms: 1500,
      params: { factor: 1.67 },
      note: 'Zoom back out so the Saturn click below has the full system in frame.',
    },
    // VTT § 00:00:21.5 — "Click any planet, and the right panel opens
    // with its physical data, orbit parameters, and gallery."
    // Demo: open Saturn → switch to the TECHNICAL tab so the listener
    // sees the orbit parameters the narrator just named.
    { at_sec: 24, action: 'cue', target: 'Click any planet — like this.', duration_ms: 4000 },
    // 2026-06-19 user direction — open Saturn right after the cue
    // (was 29 s, pulled to 25 s) so the click lands on the narrator's
    // "like this" beat.
    { at_sec: 25, action: 'click', target: '[data-audio-stage="explore-select-saturn"]' },
    {
      at_sec: 27,
      action: 'click',
      target: '[data-audio-stage="planet-tab-technical"]',
      note: 'Reveal the actual orbit parameters mid-sentence so "orbit parameters" lands on real numbers. Pulled from 31 s → 27 s so the technical view is up before the orbital-period roll-call starts.',
    },
    // VTT § 00:00:30.5 – 43.9 — orbital-period roll-call. Narration
    // names Mercury (88 days) → Mars (1.88 years) → Saturn (29.5
    // years) → Neptune (165 years) as illustrative orbit-period
    // examples.
    //
    // 2026-06-19 (v3) — the planets are 3-5 s apart in narration, too
    // rapid to fit the "open panel → linger seconds → reset view →
    // next" rhythm the rest of the tour follows. Earlier iteration
    // (v2) tried `click` on each but the panel swap was so fast the
    // listener had no time to read anything before the next swap
    // ("panels do not open and close at all" — actually they did, but
    // each lived for ~3 s). Settled-on approach:
    //
    //   • Saturn panel stays open throughout the roll-call (29 s →
    //     47 s = 18 s) so its Technical-tab data is readable for the
    //     full duration of the example.
    //   • Mercury / Mars / Neptune become CUES — short text overlays
    //     that surface each name + period over the canvas without
    //     swapping the panel. Matches what the listener expects from
    //     a "1-2 s callout" beat that the original flashes were
    //     trying (and failing) to deliver.
    //   • 47 s `explore-reset-view` click closes Saturn AND resets
    //     the camera in one action — the canvas re-emerges for the
    //     PATHS-layer beat at 76 s, and the listener understands
    //     "we're going back to the overview".
    // 2026-06-19 — Mercury pulled from 32 s → 30 s; Saturn re-click at
    // 39 s dropped (Saturn is already the open panel from 25 s and
    // narrator returns to it after Mars without us needing to swap
    // back). Mars + Neptune keep their VTT-aligned beats.
    { at_sec: 30, action: 'click', target: '[data-audio-stage="explore-select-mercury"]' },
    { at_sec: 35, action: 'click', target: '[data-audio-stage="explore-select-mars"]' },
    { at_sec: 43, action: 'click', target: '[data-audio-stage="explore-select-neptune"]' },
    { at_sec: 47, action: 'click', target: '[data-audio-stage="explore-reset-view"]' },
    // VTT 00:00:56.3 "Watch the planets move." → 00:01:05.8 "Pause it on
    // any date and read off the positions." The time controls shipped
    // (#351), so this beat now drives them live: flash the panel, step the
    // speed up 1×→10×→100× as the narrator counts "one day, ten days, a
    // hundred", then pause on a date + flash the readout, then reset to
    // today and resume at the default 10× before the PATHS beat at 76 s.
    // (Narration still says "time slider"; we shipped speed pills — close
    // enough that a re-record isn't worth it. Positions are real now too,
    // so "read off the positions" at 00:00:09 is finally honest.)
    { at_sec: 56, action: 'flash', target: '[data-audio-stage="explore-time"]' },
    {
      at_sec: 58,
      action: 'cue',
      target: 'The speed controls — one day, ten, or a hundred per second.',
      duration_ms: 6000,
    },
    { at_sec: 59, action: 'click', target: '[data-audio-stage="explore-speed-1"]' },
    { at_sec: 61, action: 'click', target: '[data-audio-stage="explore-speed-10"]' },
    { at_sec: 64, action: 'click', target: '[data-audio-stage="explore-speed-100"]' },
    // "Pause it on any date and read off the positions." (00:01:05.8)
    { at_sec: 66, action: 'click', target: '[data-audio-stage="explore-time-pause"]' },
    { at_sec: 67, action: 'flash', target: '[data-audio-stage="explore-sim-date"]' },
    // Reset to today + resume at the default 10× so the canvas is live and
    // today-accurate for the Voyager 2 / PATHS beat at 76 s.
    { at_sec: 72, action: 'click', target: '[data-audio-stage="explore-time-today"]' },
    { at_sec: 73, action: 'click', target: '[data-audio-stage="explore-speed-10"]' },
    // Voyager 2 PATHS-layer demo (#306 Slice A). Lands during the
    // Neptune beat (~38 s in VTT, "Neptune takes one hundred sixty-five
    // [years]"); shows that the spacecraft we sent past every outer
    // planet is still drawing an arc through them — and into
    // interstellar space.
    { at_sec: 76, action: 'flash', target: '[data-audio-stage="explore-layer-paths"]' },
    { at_sec: 78, action: 'click', target: '[data-audio-stage="explore-layer-paths"]' },
    {
      at_sec: 80,
      action: 'cue',
      target:
        'And the spacecraft that travelled every outer planet — Voyager 2, now in interstellar space.',
      duration_ms: 6000,
    },
    // 2026-06-19 — select Voyager 2 in the PATHS legend so its
    // trajectory and mission panel surface alongside the cue.
    // Previously the cue named Voyager 2 but nothing on screen
    // pointed at it.
    { at_sec: 82, action: 'click', target: '[data-audio-stage="iconic-mission-voyager-2"]' },
    {
      at_sec: 90,
      action: 'zoom',
      target: '[data-audio-stage="explore-scene"]',
      duration_ms: 2000,
      params: { factor: 1.55 },
      note: "Zoom out so the full Voyager 2 trajectory reads against Neptune's orbit.",
    },
    // Close the Voyager 2 mission panel + reset camera so the
    // canvas is clean before the Science Lens beat. Also toggle the
    // PATHS layer back OFF so the Voyager 2 arc isn't still drawn
    // through the next beats.
    { at_sec: 92, action: 'click', target: '[data-audio-stage="explore-reset-view"]' },
    { at_sec: 93, action: 'click', target: '[data-audio-stage="explore-layer-paths"]' },
    // Science Lens beat — moved 4 s earlier (was 99/101 → now 95/97)
    // so there's enough room for the layer-checkbox demo + the
    // collapse + the post-lens-OFF planet-Technical-tab demo before
    // the Sun beat at 121 s. (2026-06-19 user directions #2 → #5.)
    { at_sec: 95, action: 'flash', target: '[data-audio-stage="science-lens-toggle"]' },
    { at_sec: 97, action: 'click', target: '[data-audio-stage="science-lens-toggle"]' },
    // Turn on 5 representative lens layers so the canvas demonstrates
    // the gamut of effects (per-planet arrows + magnetosphere shell +
    // the tactical-scan stat overlay). Then collapse the lens panel
    // so its UI doesn't sit over the canvas while the effects render.
    { at_sec: 99, action: 'click', target: '[data-audio-stage="science-layer-gravity"]' },
    { at_sec: 101, action: 'click', target: '[data-audio-stage="science-layer-velocity"]' },
    { at_sec: 103, action: 'click', target: '[data-audio-stage="science-layer-centripetal"]' },
    { at_sec: 105, action: 'click', target: '[data-audio-stage="science-layer-planet-stats"]' },
    { at_sec: 107, action: 'click', target: '[data-audio-stage="science-layer-hill-sphere"]' },
    { at_sec: 109, action: 'click', target: '[data-audio-stage="science-lens-collapse"]' },
    // Lens OFF — the canvas-overlay effects disappear so the next
    // planet click reads clean.
    { at_sec: 113, action: 'click', target: '[data-audio-stage="science-lens-toggle"]' },
    // Demonstrate the planet's Technical tab — the per-planet
    // tactical-scan data (mass, surface gravity, atmospheric
    // pressure, rotation period) that the lens overlay was hinting
    // at. Jupiter chosen because its magnetosphere + Galilean moons
    // make for a busier visual than a smaller planet. Reset at 118 s
    // before the Sun beat. (2026-06-19 user directions #4 + #5.)
    { at_sec: 114, action: 'click', target: '[data-audio-stage="explore-select-jupiter"]' },
    { at_sec: 116, action: 'click', target: '[data-audio-stage="planet-tab-technical"]' },
    { at_sec: 118, action: 'click', target: '[data-audio-stage="explore-reset-view"]' },
    // VTT § 00:02:01.5 — "Click the Sun." / § 00:02:02.6 — "Then click any planet."
    { at_sec: 121, action: 'cue', target: 'Click the Sun — read its panel.', duration_ms: 4000 },
    { at_sec: 122, action: 'click', target: '[data-audio-stage="explore-select-sun"]' },
    // Allocate ~5 s on the Sun panel, then reset before the Earth
    // beat so each click starts from a clean state ("open → linger
    // → reset → next" — 2026-06-19 user direction).
    { at_sec: 127, action: 'click', target: '[data-audio-stage="explore-reset-view"]' },
    { at_sec: 129, action: 'cue', target: 'Then click any planet.', duration_ms: 3500 },
    { at_sec: 132, action: 'click', target: '[data-audio-stage="explore-select-earth"]' },
    // Reset before episode fade-out so the listener ends on the
    // canvas, not on a panel.
    { at_sec: 137, action: 'click', target: '[data-audio-stage="explore-reset-view"]' },
  ],

  // ── /explore · saturn-rings — Enthusiast, VTT 102 s (Extended Tour) ─
  'saturn-rings': [
    // VTT § 00:00:00.0 "Click Saturn"
    { at_sec: 0, action: 'click', target: '[data-audio-stage="explore-select-saturn"]' },
    // VTT § 00:00:00.8 "Look at the rings"
    { at_sec: 3, action: 'click', target: '[data-audio-stage="planet-tab-technical"]' },
    {
      at_sec: 4,
      action: 'cue',
      target: 'Saturn open — see the ring data on the Technical tab.',
      duration_ms: 4000,
    },
    // VTT § 00:00:21.8 "Ten meters." — the iconic ratio beat.
    {
      at_sec: 22,
      action: 'cue',
      target: 'Ten meters thick. A two-story building.',
      duration_ms: 4500,
    },
    // VTT § 00:00:43.5 "Pieces near the inner edge orbit Saturn in about five hours."
    {
      at_sec: 44,
      action: 'cue',
      target: 'Inner rings orbit in 5 h. Outer rings, 14.',
      duration_ms: 4500,
    },
    // VTT § 00:00:52.8 "The Cassini Division" — was cue@47 (5 s early).
    {
      at_sec: 53,
      action: 'cue',
      target: 'The Cassini Division — swept clear by Mimas in 2:1 resonance.',
      duration_ms: 5000,
    },
    // VTT § 00:01:42.1 "Those photographs are what you see when you look at the rings"
    // — zoom into the Saturn render as the listener is told they're
    // looking at the real Cassini imagery.
    {
      at_sec: 103,
      action: 'zoom',
      target: '[data-audio-stage="explore-scene"]',
      duration_ms: 2000,
      params: { factor: 0.5 },
    },
  ],

  // ── /explore · jupiter-storm — Enthusiast, VTT 115 s (Extended Tour) ─
  'jupiter-storm': [
    // VTT § 00:00:00.0 "Click Jupiter"
    { at_sec: 0, action: 'click', target: '[data-audio-stage="explore-select-jupiter"]' },
    // VTT § 00:00:01.0 "Find the Great Red Spot — the oval, southern hemisphere"
    {
      at_sec: 2,
      action: 'cue',
      target: 'Find the Great Red Spot — the oval in the southern hemisphere.',
      duration_ms: 5000,
    },
    // VTT § 00:00:18.3 "It has been there, continuously, for at least 350 years."
    {
      at_sec: 19,
      action: 'cue',
      target: 'A single storm. 350 years and counting.',
      duration_ms: 5000,
    },
    // VTT § 00:00:39.3 "Jupiter rotates once every nine hours fifty-five minutes"
    {
      at_sec: 39,
      action: 'cue',
      target: 'Jupiter rotates once every 9 h 55 min.',
      duration_ms: 4500,
    },
    // VTT § 00:01:00.5 "The spot has been shrinking. In 1879 it was 40,000…"
    {
      at_sec: 61,
      action: 'cue',
      target: '40,000 km in 1879. 15,000 today. Still shrinking.',
      duration_ms: 5000,
    },
    // VTT § 00:01:18.8 "Juno arrived in 2016." — Juno mission named.
    {
      at_sec: 79,
      action: 'cue',
      target: 'Juno arrived in 2016 — polar orbit, first of its kind for Jupiter.',
      duration_ms: 5000,
    },
    // VTT § 00:01:46.2 "Jupiter has had the same hurricane for three and a half centuries"
    {
      at_sec: 106,
      action: 'cue',
      target: 'The same hurricane for 350 years. Triple Earth’s strongest.',
      duration_ms: 5000,
    },
  ],

  // ── /plan · guide-plan — VTT 149 s ─────────────────────────────────
  'guide-plan': [
    // VTT § 00:00:02.2 "You pick a destination — Mars, Venus, Mercury…"
    { at_sec: 2, action: 'scroll-to', target: '[data-audio-stage="plan-selector-bar"]' },
    { at_sec: 4, action: 'flash', target: '[data-audio-stage="plan-selector-bar"]' },
    {
      at_sec: 6,
      action: 'cue',
      target: 'Pick a destination — Mars is the default.',
      duration_ms: 4000,
    },
    // VTT § 00:00:23.3 "Look at the chart"
    { at_sec: 23, action: 'scroll-to', target: '[data-audio-stage="porkchop-plot"]' },
    { at_sec: 25, action: 'flash', target: '[data-audio-stage="porkchop-plot"]' },
    // VTT § 00:00:44.1 "Click anywhere on the chart"
    {
      at_sec: 44,
      action: 'cue',
      target: 'Click anywhere on the C-shape; the panel reads the numbers.',
      duration_ms: 4000,
    },
    // VTT § 00:01:25.8 "Try a different destination"
    {
      at_sec: 86,
      action: 'cue',
      target: 'Try Jupiter or Mercury — notice how the geometry shifts.',
      duration_ms: 4000,
    },
    { at_sec: 88, action: 'flash', target: '[data-audio-stage="plan-selector-bar"]' },
    // VTT § 00:02:25.1 "Pick a destination. Click the chart."
    {
      at_sec: 145,
      action: 'cue',
      target: 'Pick a destination. Click the chart.',
      duration_ms: 4000,
    },
  ],

  // ── /plan · porkchop — Enthusiast, VTT 120 s ──────────────────────
  porkchop: [
    // VTT § 00:00:00.0 "This chart is called a porkchop plot"
    { at_sec: 1, action: 'scroll-to', target: '[data-audio-stage="porkchop-plot"]' },
    { at_sec: 3, action: 'flash', target: '[data-audio-stage="porkchop-plot"]' },
    // VTT § 00:01:11.5 "Trace the bottom of the C."
    {
      at_sec: 71,
      action: 'cue',
      target: 'Trace the bottom of the C with your eye — that is the cheap window.',
      duration_ms: 4500,
    },
    { at_sec: 73, action: 'flash', target: '[data-audio-stage="porkchop-plot"]' },
    // VTT § 00:01:42.5 "Every Mars launch in history sits on the bottom of one of these C-shapes"
    {
      at_sec: 102,
      action: 'cue',
      target: 'Every Mars launch in history sits on the bottom of one of these.',
      duration_ms: 5000,
    },
  ],

  // ── /fly · guide-fly — VTT 143 s ───────────────────────────────────
  'guide-fly': [
    // VTT § 00:00:16.0 "Look at the arc"
    { at_sec: 16, action: 'scroll-to', target: '[data-audio-stage="fly-hud"]' },
    { at_sec: 18, action: 'flash', target: '[data-audio-stage="fly-hud"]' },
    // VTT 00:00:31.4 "That total velocity puts the spacecraft on a Keplerian
    // ellipse… perihelion at Earth's distance, aphelion at Mars." Turn the
    // Science Lens ON so the orbital-mechanics overlays show while the
    // narrator describes the ellipse (user direction: toggle the lens).
    { at_sec: 33, action: 'click', target: '[data-audio-stage="science-lens-toggle"]' },
    // VTT § 00:00:44.8 "Press play. Watch the spacecraft slide along the arc."
    {
      at_sec: 44,
      action: 'cue',
      target: 'Press play — watch the spacecraft slide along the arc.',
      duration_ms: 4000,
    },
    { at_sec: 46, action: 'click', target: '[data-audio-stage="fly-play"]' },
    // Lens back OFF before the porkchop / cislunar explanation.
    { at_sec: 65, action: 'click', target: '[data-audio-stage="science-lens-toggle"]' },
    // VTT 00:01:20.5 "Some missions add a cislunar view — switchable from
    // the toolbar. Earth-centered, not Sun-centered." (Cislunar is mission-
    // conditional, so this is a cue rather than a toggle on the default arc.)
    {
      at_sec: 73,
      action: 'cue',
      target: 'Cislunar view — Earth-centered, switchable per mission.',
      duration_ms: 5000,
    },
    // VTT § 00:01:59.8 "Click any phase chip"
    {
      at_sec: 119,
      action: 'cue',
      target: 'Click any phase chip to jump to that moment.',
      duration_ms: 4000,
    },
    { at_sec: 121, action: 'flash', target: '[data-audio-stage="fly-hud"]' },
  ],

  // ── /fly · cislunar-frame — Enthusiast, VTT 118 s ─────────────────
  'cislunar-frame': [
    {
      at_sec: 5,
      action: 'cue',
      target: 'Open a Mars mission, then a Moon mission. Watch the frames change.',
    },
    // VTT § 00:01:41.2 "Use the toolbar to switch frames on any mission."
    // Was t=70 (31 s early — the episode is 13 s longer than SSML target
    // AND the "toolbar" beat is in the closing third, not the middle).
    // t=99 caps within the Google variant's 100.6 s duration; EL gets
    // it 19 s before the line, which is fine for a permanent cue.
    {
      at_sec: 99,
      action: 'cue',
      target: 'Use the toolbar to switch frames on any mission yourself.',
    },
  ],

  // ── /missions · guide-missions — VTT 136 s ────────────────────────
  'guide-missions': [
    // VTT § 00:00:20.6 "Use the filters at the top"
    { at_sec: 20, action: 'scroll-to', target: '[data-audio-stage="missions-filters"]' },
    { at_sec: 22, action: 'flash', target: '[data-audio-stage="missions-filters"]' },
    {
      at_sec: 23,
      action: 'cue',
      target: 'Filter by status, destination, agency.',
      duration_ms: 4000,
    },
    // Demonstrate the filters for real (user direction) — the catalogue is
    // URL-driven, so `navigate` re-filters the live grid as the narrator
    // names each filter type, then the "status = failed" combination.
    // VTT 00:00:22.0 "Filter by status — flown, active, planned, concept."
    {
      at_sec: 25,
      action: 'navigate',
      target: '/missions?status=FLOWN',
      params: { replaceState: 1 },
    },
    // VTT 00:00:25.9 "Filter by destination — Moon, Mars, Venus…"
    { at_sec: 29, action: 'navigate', target: '/missions?dest=MARS', params: { replaceState: 1 } },
    // VTT 00:00:31.1 "Filter by agency — NASA, ESA, JAXA…"
    { at_sec: 33, action: 'navigate', target: '/missions?agency=ESA', params: { replaceState: 1 } },
    // VTT § 00:00:38.3 "Try this combination. Filter status equals failed."
    {
      at_sec: 38,
      action: 'cue',
      target: 'Try it — status = failed.',
      duration_ms: 4000,
    },
    {
      at_sec: 39,
      action: 'navigate',
      target: '/missions?status=FAILED',
      params: { replaceState: 1 },
    },
    // VTT § 00:00:41.7 "You'll see Mars 2. Schiaparelli. Beresheet…" — flash
    // the catalogued ones inside the now-filtered grid. (mars-2 / hakuto-r /
    // vikram-cy2 / hitomi aren't catalogued yet, so honestly skipped.)
    { at_sec: 44, action: 'flash', target: '[data-audio-stage="missions-select-schiaparelli"]' },
    { at_sec: 45, action: 'flash', target: '[data-audio-stage="missions-select-beresheet"]' },
    // Clear the filter before the redemption-arc card clicks (they need the
    // full catalogue). VTT 00:00:50 "the redemption-arc layer of spaceflight."
    { at_sec: 48, action: 'navigate', target: '/missions', params: { replaceState: 1 } },
    // VTT § 00:00:59.4 – 01:18 — redemption-arc story. Walk the panel
    // through "failure → successor → failure → successor → first
    // catastrophic failure → first iconic success." Each click replaces
    // the panel ~4–5 s after the previous one — pacing matches the
    // narration's beat per pair.
    // VTT § 00:01:02.9 "Chandrayaan-3 landed Vikram's twin"
    { at_sec: 63, action: 'click', target: '[data-audio-stage="missions-select-chandrayaan3"]' },
    // VTT § 00:01:04.6 "Beresheet hit the surface in 2019."
    { at_sec: 65, action: 'click', target: '[data-audio-stage="missions-select-beresheet"]' },
    // VTT § 00:01:09.6 "Apollo 1 killed three astronauts on the launch pad"
    { at_sec: 70, action: 'click', target: '[data-audio-stage="missions-select-apollo-1"]' },
    // VTT § 00:01:14.1 "Apollo 11 walked on the Moon two and a half years later."
    // Was previously clicked at t=84 (10 s late, on the generic "Click any
    // card" demo); pulled forward so the click lands ON the redemption
    // payoff line, not on the post-story housekeeping.
    { at_sec: 74, action: 'click', target: '[data-audio-stage="missions-select-apollo11"]' },
    // Close the Apollo 11 panel before the "Click any card" cue +
    // grid scroll so the listener's eye lands on the grid as the
    // narrator says it, not on a panel obscuring the bottom half of
    // the screen. (2026-06-19 open-then-close sweep.)
    { at_sec: 77, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT § 00:01:18.5 "Click any mission card"
    {
      at_sec: 78,
      action: 'cue',
      target: 'Click any card — read the record.',
      duration_ms: 4000,
    },
    { at_sec: 80, action: 'scroll-to', target: '[data-audio-stage="missions-grid"]' },
    { at_sec: 82, action: 'flash', target: '[data-audio-stage="missions-grid"]' },
    // VTT 00:01:18 "The right panel opens with the full record — launch
    // vehicle, payload mass, crew or instruments, key events, gallery of
    // images, links." Open a rich card (Curiosity) and cycle its tabs so
    // each part the narrator lists is actually shown (user direction).
    { at_sec: 83, action: 'click', target: '[data-audio-stage="missions-select-curiosity"]' },
    { at_sec: 85, action: 'click', target: '[data-audio-stage="mission-tab-flight"]' },
    { at_sec: 87, action: 'click', target: '[data-audio-stage="mission-tab-gallery"]' },
    { at_sec: 89, action: 'click', target: '[data-audio-stage="mission-tab-science"]' },
    { at_sec: 91, action: 'click', target: '[data-audio-stage="mission-tab-overview"]' },
    // Close before the timeline beat so it's visible.
    { at_sec: 100, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT § 00:01:42.9 "Look at the timeline"
    {
      at_sec: 103,
      action: 'cue',
      target: 'Look at the timeline — notice the gaps.',
      duration_ms: 3500,
    },
    // VTT 00:01:40 "Look at the timeline. Notice the gaps." Bring the epoch
    // timeline into view + flash it as the narrator walks the Apollo→Luna
    // gap and Chang'e-1 reopening.
    { at_sec: 104, action: 'scroll-to', target: '[data-audio-stage="missions-epoch-timeline"]' },
    { at_sec: 106, action: 'flash', target: '[data-audio-stage="missions-epoch-timeline"]' },
    // VTT 00:02:10 "Filter, click, read. See where you stand on the ladder."
    { at_sec: 130, action: 'flash', target: '[data-audio-stage="missions-filters"]' },
  ],

  // ── /missions · voyager-grand-tour — Enthusiast, VTT 134 s (Extended Tour) ─
  'voyager-grand-tour': [
    { at_sec: 4, action: 'scroll-to', target: '[data-audio-stage="missions-grid"]' },
    { at_sec: 6, action: 'flash', target: '[data-audio-stage="missions-grid"]' },
    // VTT § 00:00:34.1 "Thomas Jefferson's presidency" → § 37.5 "next one in twenty-second century"
    {
      at_sec: 35,
      action: 'cue',
      target: 'Last alignment: Jefferson’s presidency. Next: 22nd century.',
      duration_ms: 5000,
    },
    // VTT § 00:00:41.0 "Voyager 1 and Voyager 2 launched in 1977"
    { at_sec: 41, action: 'click', target: '[data-audio-stage="missions-select-voyager-2"]' },
    {
      at_sec: 43,
      action: 'cue',
      target: 'Voyager 2 — past Jupiter, Saturn, Uranus, Neptune.',
      duration_ms: 5000,
    },
    // VTT § 00:01:04.3 "Voyager 1 is the most distant human-made object"
    // V2 panel was open since t=41; swap to V1 panel as narration shifts
    // to V1. Previously fired at t=110 (40 s late — VTT was misread
    // during the Phase 2 commit before VTT verification).
    { at_sec: 66, action: 'click', target: '[data-audio-stage="missions-select-voyager-1"]' },
    {
      at_sec: 69,
      action: 'cue',
      target: 'Voyager 1 — ~24 billion km from the Sun, still transmitting.',
      duration_ms: 5000,
    },
    // VTT § 00:01:19.6 "Each spacecraft carries the Golden Record"
    {
      at_sec: 95,
      action: 'cue',
      target: 'The Golden Record — Sagan’s gift to the universe.',
      duration_ms: 5000,
    },
  ],

  // ── /missions · cassini-finale — Enthusiast, VTT 132 s (Extended Tour) ─
  'cassini-finale': [
    // VTT § 00:00:00.0 "Cassini launched in October 1997"
    { at_sec: 1, action: 'click', target: '[data-audio-stage="missions-select-cassini"]' },
    // VTT § 00:00:21.0 "It dropped the Huygens probe onto Titan"
    {
      at_sec: 22,
      action: 'cue',
      target: 'Huygens — first soft landing on a moon of another planet.',
      duration_ms: 5000,
    },
    // VTT § 00:00:29.0 "It discovered that Enceladus shoots geysers"
    // — was cue@25 (4 s early before VTT verification).
    {
      at_sec: 30,
      action: 'cue',
      target: 'Enceladus — geysers of water from the south pole.',
      duration_ms: 5000,
    },
    // VTT § 00:01:03.1 "So they planned the Grand Finale" → 01:05.7 "Twenty-two orbits…"
    // — was cue@56 (8 s early).
    {
      at_sec: 65,
      action: 'cue',
      target: 'The Grand Finale — 22 orbits through the ring gap.',
      duration_ms: 5000,
    },
    // VTT § 00:01:48.1 "Then it disintegrated."
    {
      at_sec: 89,
      action: 'cue',
      target: 'Then it disintegrated.',
      duration_ms: 4000,
    },
    // VTT § 00:01:52.8 "No spacecraft has been at Saturn since"
    // — was cue@94 (16 s early).
    {
      at_sec: 93,
      action: 'cue',
      target: 'No spacecraft has been at Saturn since.',
      duration_ms: 4500,
    },
    // VTT § 00:01:57.9 "The next planned arrival, Dragonfly to Titan, will launch in 2028"
    {
      at_sec: 99,
      action: 'cue',
      target: 'Dragonfly to Titan — 2028.',
      duration_ms: 4500,
    },
  ],

  // ── /earth · guide-earth — VTT 161 s ──────────────────────────────
  'guide-earth': [
    // VTT § 00:00:13.6 "Look at the bottom of the diagram" / ISS+Tiangong
    { at_sec: 13, action: 'scroll-to', target: '[data-audio-stage="surface-hud"]' },
    { at_sec: 15, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    {
      at_sec: 16,
      action: 'cue',
      target: 'ISS and Tiangong at ~400 km altitude.',
      duration_ms: 5000,
    },
    // VTT § 00:00:23.5 "…and slightly higher, Tiangong." Tiangong hook
    // existed but the original tour never opened the panel. Land the
    // click as the name lands so the listener sees the actual entity.
    { at_sec: 24, action: 'click', target: '[data-audio-stage="earth-select-tiangong"]' },
    // VTT § 00:00:33.2 "Look slightly higher" / Hubble at 550 km
    {
      at_sec: 34,
      action: 'cue',
      target: 'Higher — Hubble at 550 km.',
      duration_ms: 4000,
    },
    { at_sec: 35, action: 'click', target: '[data-audio-stage="earth-select-hubble"]' },
    // Close the Hubble panel ~5 s after it opens so the canvas can
    // breathe during the long narration gap (35 s → 96 s = 61 s of
    // science beats about Hubble's altitude / atmospheric drag /
    // servicing-mission history). 2026-06-19 — first sweep applying
    // the "open-then-close" pattern across guide-earth.
    { at_sec: 40, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT 00:00:45.9 "Higher still — ~20,000 km — the navigation
    // constellations: GPS, Galileo, GLONASS, BeiDou." Focus each as it's
    // named so the nav band is showcased (CORE-2 flies the camera in).
    {
      at_sec: 46,
      action: 'cue',
      target: 'Navigation — GPS · Galileo · GLONASS · BeiDou, ~20,000 km up.',
      duration_ms: 7000,
    },
    { at_sec: 47, action: 'click', target: '[data-audio-stage="earth-select-gps"]' },
    { at_sec: 50, action: 'click', target: '[data-audio-stage="earth-select-galileo"]' },
    { at_sec: 52, action: 'click', target: '[data-audio-stage="earth-select-glonass"]' },
    { at_sec: 54, action: 'click', target: '[data-audio-stage="earth-select-beidou"]' },
    // VTT 00:00:58.1 "36,000 km — geostationary orbit … 24-hour period."
    { at_sec: 59, action: 'click', target: '[data-audio-stage="earth-select-geo"]' },
    // VTT 00:01:16.1 "Every weather satellite, every direct-broadcast TV
    // satellite, lives here." — GOES (weather) + Inmarsat (broadcast).
    { at_sec: 77, action: 'click', target: '[data-audio-stage="earth-select-goes"]' },
    { at_sec: 80, action: 'click', target: '[data-audio-stage="earth-select-inmarsat"]' },
    { at_sec: 83, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT § 00:01:33.8 "JWST orbits there"
    {
      at_sec: 95,
      action: 'cue',
      target: 'Top of the view — JWST at the Sun-Earth L2, 1.5 million km out.',
      duration_ms: 5000,
    },
    { at_sec: 96, action: 'click', target: '[data-audio-stage="earth-select-jwst"]' },
    // VTT 00:01:39.5 "So does ESA's Gaia, mapping a billion stars."
    { at_sec: 100, action: 'click', target: '[data-audio-stage="earth-select-gaia"]' },
    // Close the Gaia panel, then pull the camera back to the full-system
    // overview (user direction: reset after Gaia for a cleaner flow) so the
    // "log scale" + "Click any spacecraft" outro plays over the wide view.
    { at_sec: 105, action: 'click', target: '[data-audio-stage="panel-close"]' },
    { at_sec: 106, action: 'click', target: '[data-audio-stage="surface-reset-view"]' },
    // VTT § 00:02:09.8 "Click any spacecraft"
    {
      at_sec: 132,
      action: 'cue',
      target: 'Click any spacecraft for its story — like this.',
      duration_ms: 4000,
    },
    // Open ISS and KEEP it open through the end of the episode (user
    // direction) — the listener fades out on the station's record rather
    // than an empty canvas.
    { at_sec: 133, action: 'click', target: '[data-audio-stage="earth-select-iss"]' },
  ],

  // ── /earth · jwst-l2-halo — Enthusiast, VTT 122 s (Extended Tour) ─
  'jwst-l2-halo': [
    // VTT § 00:00:00.0 "Look at the diagram"
    { at_sec: 1, action: 'scroll-to', target: '[data-audio-stage="surface-hud"]' },
    { at_sec: 3, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    // VTT § 00:00:50.3 "JWST orbits around L2 in a slow loop"
    {
      at_sec: 50,
      action: 'cue',
      target: 'JWST — orbits L2, not sits at it. Six-month halo loop.',
      duration_ms: 5000,
    },
    { at_sec: 52, action: 'click', target: '[data-audio-stage="earth-select-jwst"]' },
    // VTT § 00:01:20.6 "JWST operates at forty Kelvin"
    {
      at_sec: 80,
      action: 'cue',
      target: 'Forty Kelvin — the heat shield keeps the cold side cold.',
      duration_ms: 5000,
    },
    // VTT § 00:01:43.7 "Hubble lives in low Earth orbit" — explicit
    // Hubble/JWST contrast. Swap panels as each is named.
    { at_sec: 104, action: 'click', target: '[data-audio-stage="earth-select-hubble"]' },
    // VTT § 00:01:52.1 "JWST lives at L2"
    { at_sec: 113, action: 'click', target: '[data-audio-stage="earth-select-jwst"]' },
    // VTT § 00:01:58.5 – 02:01.9 "Different problem. Different orbit. Same universe."
    {
      at_sec: 119,
      action: 'cue',
      target: 'Different problem. Different orbit. Same universe.',
      duration_ms: 4500,
    },
  ],

  // ── /moon · guide-moon — VTT 161 s ────────────────────────────────
  'guide-moon': [
    // VTT § 00:00:06.6 "Drag to rotate"
    { at_sec: 6, action: 'scroll-to', target: '[data-audio-stage="surface-hud"]' },
    {
      // Demonstrate the drag on "Drag to rotate" — must target the CANVAS
      // (surface-scene), which owns the audio-stage-drag listener; the old
      // surface-hud target fired on the HUD overlay and nothing rotated.
      at_sec: 7,
      action: 'drag',
      target: '[data-audio-stage="surface-scene"]',
      params: { rotateRad: 0.7 },
      duration_ms: 1800,
    },
    {
      at_sec: 10,
      action: 'cue',
      target: 'Drag the sphere — each yellow marker is a landing site.',
      duration_ms: 4000,
    },
    // VTT 00:00:11.7 "Luna 9, in 1966, was the first soft landing on
    // another world." Focus it as the narrator names it (CORE flies in).
    {
      at_sec: 12,
      action: 'cue',
      target: 'The first soft landing on another world — Luna 9, 1966.',
      duration_ms: 4000,
    },
    { at_sec: 13, action: 'click', target: '[data-audio-stage="moon-select-luna9"]' },
    // VTT § 00:00:22.7 "Tranquillity Base"
    {
      at_sec: 23,
      action: 'cue',
      target: 'Find Tranquillity Base — Apollo 11.',
      duration_ms: 4000,
    },
    { at_sec: 24, action: 'click', target: '[data-audio-stage="moon-select-apollo11"]' },
    // VTT 00:00:30.1 "Chang'e 4 landed on the lunar far side in 2019 — the
    // first soft landing there in human history."
    {
      at_sec: 31,
      action: 'cue',
      target: 'First far-side landing — Chang’e 4, 2019.',
      duration_ms: 4000,
    },
    { at_sec: 32, action: 'click', target: '[data-audio-stage="moon-select-change4"]' },
    // VTT § 00:00:42.4 "Chandrayaan-3 placed the Vikram lander near the south pole"
    {
      at_sec: 43,
      action: 'cue',
      target: 'Near the south pole — Chandrayaan-3, 2023.',
      duration_ms: 4000,
    },
    { at_sec: 44, action: 'click', target: '[data-audio-stage="moon-select-chandrayaan3"]' },
    // VTT § 00:00:54.6 "Click any marker"
    {
      at_sec: 54,
      action: 'cue',
      target: 'Click any marker to read its mission record.',
      duration_ms: 4000,
    },
    // Close the Chandrayaan-3 panel once the narrator leaves it (user
    // direction: it lingered too long) — narration has moved to the
    // generic "Click any marker" beat.
    { at_sec: 55, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT § 00:01:32 "That's where the Apollo program landed…" — descend
    // into Apollo 11 (Tranquillity Base) so the listener stands at the
    // cluster the narrator is describing. Panorama held to 00:01:45.6,
    // when the line ends.
    { at_sec: 87, action: 'click', target: '[data-audio-stage="moon-select-apollo11"]' },
    { at_sec: 90, action: 'click', target: '[data-audio-stage="surface-stand-at-site"]' },
    { at_sec: 105, action: 'click', target: '[data-audio-stage="surface-exit-panorama"]' },
    // VTT 00:01:45.6 "Look at the south pole. That's where Artemis is
    // going next." Focus the planned Artemis 3 south-pole landing site.
    {
      at_sec: 106,
      action: 'cue',
      target: 'The south pole — where Artemis is going next.',
      duration_ms: 4000,
    },
    { at_sec: 107, action: 'click', target: '[data-audio-stage="moon-select-artemis3"]' },
    { at_sec: 115, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT 00:02:15.2 "Twelve people have walked on this surface." Descend
    // back into Tranquillity Base to celebrate Apollo 11, held through
    // "…softly since the last Apollo" (00:02:23) — user direction: really
    // celebrate it.
    { at_sec: 134, action: 'click', target: '[data-audio-stage="moon-select-apollo11"]' },
    { at_sec: 135, action: 'click', target: '[data-audio-stage="surface-stand-at-site"]' },
    { at_sec: 144, action: 'click', target: '[data-audio-stage="surface-exit-panorama"]' },
  ],

  // ── /moon · moon-one-lifetime — Curator, VTT 154 s ────────────────
  'moon-one-lifetime': [
    // VTT § 00:02:13.6 "Look at the map"
    {
      at_sec: 133,
      action: 'cue',
      target: 'Look at the cluster of Apollo sites on the near side.',
      duration_ms: 4000,
    },
    { at_sec: 135, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    // VTT § 00:02:20.4 "Fifty-two years since the last footstep — until Artemis."
    {
      at_sec: 140,
      action: 'cue',
      target: 'Six landings in 3.5 years. Then half a century of silence.',
      duration_ms: 4500,
    },
    // Apollo 17 — the last footstep on the Moon — anchors the "half a
    // century of silence" beat (audit gap).
    { at_sec: 142, action: 'click', target: '[data-audio-stage="moon-select-apollo17"]' },
  ],

  // ── /moon · cernan-last-words — Guide (Atmospheric Move), VTT 111 s ─
  // The descent. Map → Apollo 17 panel → panorama (Cernan's quote read
  // over the actual Taurus-Littrow vista, half-century arc plays over the
  // surface view) → back to map for the "twelve markers represent a
  // closed chapter" coda.
  'cernan-last-words': [
    // VTT § 00:00:00.0 "Look at this map of the Moon"
    { at_sec: 0, action: 'scroll-to', target: '[data-audio-stage="surface-hud"]' },
    { at_sec: 2, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    // VTT § 00:00:16.1 "Taurus-Littrow"
    {
      at_sec: 17,
      action: 'cue',
      target: 'Find Taurus-Littrow — Apollo 17, the last footstep.',
      duration_ms: 4500,
    },
    { at_sec: 18, action: 'click', target: '[data-audio-stage="moon-select-apollo17"]' },
    // VTT § 00:00:36.3 — Cernan's last-words reading begins. Apollo 17
    // panel has been open for 24 s by now; the stand-at-site button is in
    // the DOM. Enter the panorama just before Cernan starts speaking so
    // the quote lands ON the Taurus-Littrow vista, not on the map view.
    {
      at_sec: 37,
      action: 'cue',
      target: 'Stand where Cernan stood.',
      duration_ms: 4000,
    },
    { at_sec: 38, action: 'click', target: '[data-audio-stage="surface-stand-at-site"]' },
    // VTT § 00:01:04.4 — Cernan quote ends ~t=59; auto-tour the
    // panorama starting at t=65 so the camera pans through Apollo 17's
    // three authored annotations (South Massif → Camelot Crater rim →
    // LRV) during the "fifty years have passed / three Mars rovers /
    // nobody has been back to the Moon" half-century arc. Tour
    // duration = 3 × 4.5 s = ~13.5 s; ends at t=78.5, 21.5 s before
    // the exit-panorama at t=100. exit-panorama also force-stops the
    // auto-tour if it's still running (active=false → cleanup), so
    // subsequent stages — and the next episode — are never blocked.
    { at_sec: 65, action: 'click', target: '[data-audio-stage="surface-panorama-tour-play"]' },
    // VTT § 00:01:42.0 — return to map view before "twelve markers
    // represent a closed chapter" (t≈102) so the listener sees the full
    // landing-site cluster on the close. Panorama held for ~60 s:
    // Cernan's quote → "December 14th, 1972" → "fifty years have passed"
    // → "three Mars rovers / two stations / one probe interstellar /
    // nobody back to the Moon" → "Artemis II is in flight planning".
    { at_sec: 100, action: 'click', target: '[data-audio-stage="surface-exit-panorama"]' },
  ],

  // ── /moon · far-side — Guide (Atmospheric Move), VTT 115 s ────────
  'far-side': [
    // VTT § 00:00:10.7 "The other side — the far side — permanently turned away"
    { at_sec: 10, action: 'scroll-to', target: '[data-audio-stage="surface-hud"]' },
    { at_sec: 12, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    // VTT § 00:00:44.0 "You can rotate this map and see the far side"
    {
      at_sec: 44,
      action: 'cue',
      target: 'Rotate the sphere to the far side.',
      duration_ms: 4000,
    },
    {
      at_sec: 46,
      action: 'drag',
      target: '[data-audio-stage="surface-hud"]',
      params: { rotateRad: 3.14 },
      duration_ms: 2200,
    },
    // VTT § 00:00:52.0 "Chang'e 4 made the first soft landing on the far side, inside Von Kármán crater"
    {
      at_sec: 53,
      action: 'cue',
      target: "Find Von Kármán crater — Chang'e 4 lives there.",
      duration_ms: 4500,
    },
    { at_sec: 54, action: 'click', target: '[data-audio-stage="moon-select-change4"]' },
    // Descend into Chang'e 4's panorama — the actual first-ever
    // transmitted photograph from the lunar far side (panorama_metadata
    // caption: "First panorama ever transmitted from the lunar farside.
    // Von Kármán crater within South Pole–Aitken Basin"). Auto-tour
    // pans through 3 annotations (Yutu-2 + lander shadow + horizon
    // ridge) during the "first soft landing there in human history"
    // narration arc. Exit before the closing "No human has ever set
    // foot…" cue lands so the close plays on the rotated map view.
    { at_sec: 58, action: 'click', target: '[data-audio-stage="surface-stand-at-site"]' },
    { at_sec: 62, action: 'click', target: '[data-audio-stage="surface-panorama-tour-play"]' },
    { at_sec: 104, action: 'click', target: '[data-audio-stage="surface-exit-panorama"]' },
    // VTT 00:01:45 "Artemis has chosen the south pole." Show where the next
    // crewed mission lands — the far-side past → future bridge (audit gap).
    { at_sec: 107, action: 'click', target: '[data-audio-stage="moon-select-artemis3"]' },
    // VTT § 00:01:52.8 "Look at this map and pick the spot"
    {
      at_sec: 112,
      action: 'cue',
      target: 'No human has ever set foot on the side you are looking at.',
      duration_ms: 5000,
    },
  ],

  // ── /moon · queqiao-magpie — Enthusiast, VTT 134 s (Extended Tour) ─
  // Queqiao itself isn't a clickable surface site — it's a sat in halo
  // orbit at Earth-Moon L2. Treatment is scroll-to surface-hud + drag
  // to face the far side; cues do the heavy lifting.
  'queqiao-magpie': [
    { at_sec: 1, action: 'scroll-to', target: '[data-audio-stage="surface-hud"]' },
    {
      at_sec: 3,
      action: 'drag',
      target: '[data-audio-stage="surface-hud"]',
      params: { rotateRad: 3.14 },
      duration_ms: 2200,
    },
    // VTT § 00:00:00.0 "Before Chang'e 4 could land on the far side"
    // Open the Chang'e 4 panel as the narration names it.
    { at_sec: 7, action: 'click', target: '[data-audio-stage="moon-select-change4"]' },
    // VTT § 00:00:22.5 "A relay satellite called Queqiao"
    {
      at_sec: 23,
      action: 'cue',
      target: 'Queqiao — the magpie bridge. Earth-Moon L2.',
      duration_ms: 5000,
    },
    // VTT § 00:00:43.2 "Queqiao has line-of-sight to both Earth and the Moon's far side"
    {
      at_sec: 44,
      action: 'cue',
      target: 'Line-of-sight to both Earth and the far side — at once.',
      duration_ms: 5000,
    },
    // VTT § 00:01:01.5 "Why is it called the magpie bridge?" → folklore beat
    {
      at_sec: 62,
      action: 'cue',
      target: 'A weaver girl. A cowherd. A river of stars.',
      duration_ms: 5000,
    },
    // VTT § 00:01:27.2 "The lovers are the orbits of Earth and Moon. Queqiao is the bridge."
    {
      at_sec: 88,
      action: 'cue',
      target: 'Earth and Moon — the lovers. Queqiao — the bridge.',
      duration_ms: 5000,
    },
    // VTT § 00:01:36.5 "Chang'e 6 ... used Queqiao 2 in 2024"
    {
      at_sec: 97,
      action: 'cue',
      target: "Chang'e 6 — first samples from the far side, 2024.",
      duration_ms: 5000,
    },
    // Switch from Chang'e 4 to Chang'e 6 — the far-side sample-return
    // successor the narrator just named (audit gap).
    { at_sec: 98, action: 'click', target: '[data-audio-stage="moon-select-change6"]' },
  ],

  // ── /mars · guide-mars — VTT 152 s ────────────────────────────────
  'guide-mars': [
    { at_sec: 4, action: 'scroll-to', target: '[data-audio-stage="surface-hud"]' },
    { at_sec: 6, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    {
      at_sec: 8,
      action: 'cue',
      target: 'Drag to rotate Mars. Every marker is a spacecraft we sent.',
      duration_ms: 4500,
    },
    // VTT § 00:00:14.6 "Mars 2, a Soviet lander, crashed here in 1971."
    // VTT § 00:00:18.0 "Mars 3 made the first soft landing"
    // VTT § 00:00:23.6 "Viking 1 and Viking 2, in 1976"
    // Early-mission roll-call: flash each marker as it's named. Mariner 4
    // is named at VTT t=8 but isn't a surface site (it was a flyby — no
    // marker), so its flash is honestly skipped.
    // Open each early lander's panel as the narrator names it (user
    // direction: focus + details, not a flash — a flash is invisible once
    // a prior focus has zoomed in). Each select replaces the last, so the
    // camera walks lander-by-lander. VTT: Mars 2 00:14.9, Mars 3 00:18.4,
    // Viking 1+2 00:24.1.
    { at_sec: 15, action: 'click', target: '[data-audio-stage="mars-select-mars2"]' },
    { at_sec: 19, action: 'click', target: '[data-audio-stage="mars-select-mars3"]' },
    { at_sec: 24, action: 'click', target: '[data-audio-stage="mars-select-viking1-lander"]' },
    { at_sec: 26, action: 'click', target: '[data-audio-stage="mars-select-viking2-lander"]' },
    // VTT § 00:00:29.2 "Click Pathfinder's marker"
    { at_sec: 29, action: 'click', target: '[data-audio-stage="mars-select-pathfinder"]' },
    // VTT § 00:00:48.9 "Click Curiosity, in Gale Crater"
    {
      at_sec: 49,
      action: 'cue',
      target: 'Find Curiosity at Gale Crater — still operating.',
      duration_ms: 4500,
    },
    { at_sec: 50, action: 'click', target: '[data-audio-stage="mars-select-curiosity"]' },
    // Brief 10 s panorama descent into Gale Crater while narration says
    // "It has driven over thirty kilometers across the floor of Gale
    // Crater and up the lower slopes of Mount Sharp" (VTT 00:00:55.3).
    // Mirror of the Apollo 11 descent in guide-moon (Phase 12) — short
    // peek, no auto-tour, exit before the next Perseverance beat.
    { at_sec: 53, action: 'click', target: '[data-audio-stage="surface-stand-at-site"]' },
    { at_sec: 63, action: 'click', target: '[data-audio-stage="surface-exit-panorama"]' },
    // VTT § 00:01:06.5 "Click Perseverance, in Jezero Crater"
    {
      at_sec: 67,
      action: 'cue',
      target: 'Perseverance at Jezero — the sample-cache rover.',
      duration_ms: 4500,
    },
    { at_sec: 68, action: 'click', target: '[data-audio-stage="mars-select-perseverance"]' },
    // VTT § 00:01:29.9 "Look at the orbiters around Mars." Reset to the
    // full planet view first (user direction), then go orbiter-by-orbiter
    // — focus each as the narrator names it (focus flies the camera in;
    // freeze-on-select holds it). The orbiter rings now sit correctly under
    // each dot so each lands framed with its orbit.
    {
      at_sec: 89,
      action: 'cue',
      target: 'Look at the orbiters around Mars.',
      duration_ms: 4000,
    },
    { at_sec: 90, action: 'click', target: '[data-audio-stage="surface-reset-view"]' },
    // Focus only the most notable orbiters, spaced ~5-6 s so each detail
    // panel lingers (user direction — 1 s clicks were too rapid). One per
    // space power, telling the "Mars is global now" story; the others
    // (Mars Express, MAVEN, Odyssey, TGO) are still named by the narrator
    // but not flown to. The last two land during the "eleven orbiters work
    // in the sky" summary (VTT 00:01:48+).
    // VTT § 00:01:32.0 "Mars Reconnaissance Orbiter" — NASA workhorse.
    { at_sec: 94, action: 'click', target: '[data-audio-stage="mars-select-mro"]' },
    // VTT § 00:01:40.0 "Mangalyaan from India".
    { at_sec: 100, action: 'click', target: '[data-audio-stage="mars-select-mangalyaan"]' },
    // VTT § 00:01:42.7 "Hope from the United Arab Emirates".
    { at_sec: 106, action: 'click', target: '[data-audio-stage="mars-select-hope"]' },
    // VTT § 00:01:44.2 "Tianwen-1 from China".
    { at_sec: 111, action: 'click', target: '[data-audio-stage="mars-select-tianwen1"]' },
    // VTT § 00:02:07.4 "Zoom in to Curiosity in Gale Crater to see its full route"
    {
      at_sec: 127,
      action: 'cue',
      target: 'Zoom in to Curiosity — the thin line is twelve years of driving.',
      duration_ms: 5000,
    },
    {
      at_sec: 130,
      action: 'zoom',
      target: '[data-audio-stage="surface-hud"]',
      params: { factor: 0.35 },
      duration_ms: 2000,
    },
  ],

  // ── /mars · mars-what-for — Curator, VTT 139 s ────────────────────
  'mars-what-for': [
    // VTT § 00:00:38.9 "Every rover, every orbiter… is, in some sense,
    // a rehearsal." Was cue@24 (14 s early — anchored to the wrong
    // narration line; "Look at the screens in this orrery" at 00:26.9
    // doesn't carry the "rehearsal" theme).
    {
      at_sec: 38,
      action: 'cue',
      target: 'Every Moon base, every ISS module — rehearsal for here.',
      duration_ms: 5000,
    },
    { at_sec: 40, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    // VTT § 00:01:52.7 "Look at the rovers already on it — silent, persistent"
    {
      at_sec: 112,
      action: 'cue',
      target: 'Look at the rovers on the map. Silent. But there.',
      // (Curiosity focused below — open a named rover on the finale beat;
      //  audit gap, replaces the generic HUD flash.)
      duration_ms: 5000,
    },
    { at_sec: 114, action: 'click', target: '[data-audio-stage="mars-select-curiosity"]' },
  ],

  // ── /mars · signal-delay — Enthusiast, VTT 79 s ───────────────────
  // Panorama descent: the episode's thesis ("no human has ever driven
  // Curiosity in real time") lands ON the actual Gale Crater surface
  // the listener is standing in. Open Curiosity panel early so the
  // stand-at-site button mounts before the descent.
  'signal-delay': [
    { at_sec: 6, action: 'scroll-to', target: '[data-audio-stage="surface-hud"]' },
    { at_sec: 8, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    { at_sec: 15, action: 'click', target: '[data-audio-stage="mars-select-curiosity"]' },
    { at_sec: 18, action: 'click', target: '[data-audio-stage="surface-stand-at-site"]' },
    // VTT § 00:00:29.1 "This is why no human on Earth has ever driven Curiosity in real time"
    {
      at_sec: 29,
      action: 'cue',
      target: 'No human has ever driven Curiosity in real time.',
      duration_ms: 4500,
    },
    // VTT § 00:00:48.2 "Each Martian day — each sol — the team at JPL sends a sequence"
    {
      at_sec: 48,
      action: 'cue',
      target: 'No joystick. A planner. Each sol — one sequence at a time.',
      duration_ms: 5000,
    },
    // Exit panorama before episode-end so auto-advance to one-way-light-
    // time starts from the map view. one-way-light-time is the same
    // thematic territory (rover communication latency) but doesn't need
    // its own descent — listener is fresh off the Gale-surface beat.
    { at_sec: 70, action: 'click', target: '[data-audio-stage="surface-exit-panorama"]' },
  ],

  // ── /mars · one-way-light-time — Enthusiast, VTT 97 s ─────────────
  'one-way-light-time': [
    // VTT § 00:00:47.8 "Now imagine you tried to drive a Mars rover"
    // Was at_sec 39 (8 s early — anchored to SSML 86 s target before
    // actual VTT was 97 s).
    {
      at_sec: 47,
      action: 'cue',
      target: 'Apollo had 1.3-second light-time. Mars has 14 minutes.',
      duration_ms: 5000,
    },
    { at_sec: 49, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    // VTT § 00:01:15.0 "This is why there is no manual mode on the rover"
    {
      at_sec: 75,
      action: 'cue',
      target: 'There is no manual mode on the rover. There cannot be.',
      duration_ms: 5000,
    },
  ],

  // ── /mars · curiosity-persistence — Enthusiast, VTT 102 s ─────────
  // The descent. Map → Curiosity panel → panorama. "Alone." lands the
  // panorama, then the narration walks the sol-by-sol loneliness on the
  // Gale Crater vista, building to "Every photograph it sends back is
  // from a place no other being has ever stood" — the line which IS the
  // photograph the listener is standing in. Episode ends on the panorama;
  // auto-advance dismounts.
  'curiosity-persistence': [
    // VTT § 00:00:00.0 "Curiosity drives at a top speed of about four centimeters per second"
    {
      at_sec: 1,
      action: 'cue',
      target: 'Four centimeters per second. A baby crawls faster.',
      duration_ms: 5000,
    },
    { at_sec: 3, action: 'flash', target: '[data-audio-stage="surface-hud"]' },
    // VTT § 00:00:32.0 "Curiosity landed in August 2012" — open the
    // panel so the stand-at-site button mounts in time for the t=50
    // descent. Was t=29 (3 s early).
    { at_sec: 32, action: 'click', target: '[data-audio-stage="mars-select-curiosity"]' },
    // VTT § 00:00:49.6 — "Alone." Single-word emphatic beat. The pivot
    // moment of the episode; descend onto Gale Crater's surface.
    // Was cue@45 / click@46 (4 s early).
    {
      at_sec: 49,
      action: 'cue',
      target: 'Twelve years. Thirty-five kilometers. Alone.',
      duration_ms: 5000,
    },
    { at_sec: 50, action: 'click', target: '[data-audio-stage="surface-stand-at-site"]' },
    // VTT § 00:00:59.9 "no day since August 6th, 2012, on which
    // Curiosity did not exist alone on Mars" → auto-tour the panorama
    // starting at t=68 so the camera pans through Curiosity's three
    // authored annotations (Gediz Vallis channel → Robotic arm → Mt.
    // Sharp lower flank) during the "no relief shift / no vacation /
    // no partner" arc. Tour duration = ~13.5 s; ends at t=81.5. The
    // "every photograph it sends back is from a place no other being
    // has ever stood" line at VTT 86.2 lands on the static Mt. Sharp
    // view — the final annotation the auto-tour settled on. exit-
    // panorama at t=98 force-stops the auto-tour if anything overran.
    { at_sec: 68, action: 'click', target: '[data-audio-stage="surface-panorama-tour-play"]' },
    // Soft exit before the route transition to /fly. The "Every
    // photograph it sends back is from a place no other being has ever
    // stood" line at VTT 86.2 lands fully on the panorama; we hold ~3 s
    // past that (~89 s total inside the skybox), then close at t=98 so
    // the closing line "persistence at four centimeters per second"
    // settles on the map view. The route transition to guide-fly then
    // happens map → cislunar — a softer cut than panorama → cislunar.
    { at_sec: 98, action: 'click', target: '[data-audio-stage="surface-exit-panorama"]' },
  ],

  // ── /iss · guide-iss — VTT 152 s ──────────────────────────────────
  'guide-iss': [
    // VTT § 00:00:17.7 "Drag to rotate. Each module is clickable."
    { at_sec: 15, action: 'scroll-to', target: '[data-audio-stage="iss-module-list"]' },
    { at_sec: 17, action: 'flash', target: '[data-audio-stage="iss-module-list"]' },
    {
      at_sec: 19,
      action: 'cue',
      target: 'Drag to rotate. Each module is clickable.',
      duration_ms: 4000,
    },
    // VTT § 00:00:28.8 "Zarya — the Functional Cargo Block — was the first module"
    {
      at_sec: 29,
      action: 'cue',
      target: 'Find Zarya — the back end. The first module.',
      duration_ms: 4000,
    },
    { at_sec: 30, action: 'click', target: '[data-audio-stage="iss-select-zarya"]' },
    // While Zarya is open (long 22 s beat) cycle its panel tabs to show the
    // tabbed record — builder/launch on overview, then gallery, then back
    // (user direction: "click each tab"). Tabs that a module lacks no-op.
    { at_sec: 37, action: 'click', target: '[data-audio-stage="station-tab-gallery"]' },
    { at_sec: 43, action: 'click', target: '[data-audio-stage="station-tab-learn"]' },
    { at_sec: 48, action: 'click', target: '[data-audio-stage="station-tab-overview"]' },
    // VTT § 00:00:52.8 "Unity — also called Node 1 — was the second module."
    // The narration names Unity explicitly before moving to the lab modules;
    // open the Unity panel so the second-most-important historical module
    // gets the same treatment as Zarya/Destiny/Kibo/Columbus.
    {
      at_sec: 52,
      action: 'cue',
      target: 'Unity — Node 1. The second module.',
      duration_ms: 4000,
    },
    { at_sec: 53, action: 'click', target: '[data-audio-stage="iss-select-unity"]' },
    // VTT § 00:01:07.0 "Click Destiny" / 01:19.5 "Click Columbus" / 01:25.2 "Click Kibo"
    {
      at_sec: 68,
      action: 'cue',
      target: 'Click Destiny — the US lab.',
      duration_ms: 4000,
    },
    { at_sec: 69, action: 'click', target: '[data-audio-stage="iss-select-destiny"]' },
    { at_sec: 79, action: 'click', target: '[data-audio-stage="iss-select-columbus"]' },
    { at_sec: 86, action: 'click', target: '[data-audio-stage="iss-select-kibo"]' },
    // Close Kibo panel so the canvas + module list are visible for
    // the 50-second "eighteen modules / twenty-six countries / people
    // living there now" outro. The Kibo beat ends at ~86 s and the
    // next cue is at 136 s — without a close, the panel sits open
    // for almost a minute over irrelevant narration.
    { at_sec: 91, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT 00:01:33.7 "Look at the solar arrays. Eight of them… about two
    // hundred forty kilowatts — a hundred and twenty homes."
    {
      at_sec: 95,
      action: 'cue',
      target: 'Eight solar arrays — about 240 kW, enough for ~120 homes.',
      duration_ms: 6000,
    },
    // VTT 00:01:52.8 "Look at the trusses… It was assembled segment by
    // segment by Shuttle crews between 2000 and 2011." Play the assembly
    // animation so the listener watches the station build up segment by
    // segment as the narrator describes exactly that.
    {
      at_sec: 114,
      action: 'cue',
      target: 'The truss — the station’s skeleton, built segment by segment.',
      duration_ms: 5000,
    },
    { at_sec: 119, action: 'click', target: '[data-audio-stage="iss-assembly-toggle"]' },
    // VTT § 00:02:16.3 "Eighteen pressurized modules"
    {
      at_sec: 136,
      action: 'cue',
      target: 'Eighteen modules. Twenty-six countries. People living there now.',
      duration_ms: 5000,
    },
  ],

  // ── /iss · zarya-first-module — Enthusiast, VTT 118 s (Extended Tour) ─
  'zarya-first-module': [
    // VTT § 00:00:00.0 "Look at the back of the ISS — the Russian end"
    { at_sec: 1, action: 'scroll-to', target: '[data-audio-stage="iss-module-list"]' },
    { at_sec: 3, action: 'flash', target: '[data-audio-stage="iss-module-list"]' },
    // VTT § 00:00:04.8 "The module furthest back ... is called Zarya"
    { at_sec: 5, action: 'click', target: '[data-audio-stage="iss-select-zarya"]' },
    // VTT § 00:00:30.5 "But Zarya isn't really a Russian module"
    {
      at_sec: 31,
      action: 'cue',
      target: 'Russian-built. American-owned. NASA paid the bill.',
      duration_ms: 5000,
    },
    // VTT § 00:01:17.0 "Endeavour launched on STS-88 carrying Unity"
    {
      at_sec: 77,
      action: 'cue',
      target: 'Two weeks later — Unity. The first on-orbit assembly.',
      duration_ms: 5000,
    },
    // VTT § 00:01:23.0 — "Two weeks after Zarya reached orbit, Endeavour
    // launched on STS-88 carrying Unity." The assembly visualization is
    // the visual proof of what the next 40 s of narration walks through
    // ("twelve and a half years, twenty more modules joined them, one
    // Shuttle flight at a time"). The toggle button starts playback in
    // the same click — listener watches Zarya → Unity → Zvezda → Destiny
    // appear as the narration names the assembly arc. Fixed 50 s playback;
    // episode ends at ~127 s — close the panel just before so the
    // /tiangong transition starts from the ISS module list, not from a
    // mid-playback frame that's about to dismount.
    { at_sec: 80, action: 'click', target: '[data-audio-stage="iss-assembly-toggle"]' },
    { at_sec: 125, action: 'click', target: '[data-audio-stage="iss-assembly-toggle"]' },
  ],

  // ── /tiangong · guide-tiangong — VTT 136 s ────────────────────────
  'guide-tiangong': [
    // VTT § 00:00:18.7 "Drag to rotate. Three modules."
    { at_sec: 16, action: 'scroll-to', target: '[data-audio-stage="tiangong-module-list"]' },
    { at_sec: 18, action: 'flash', target: '[data-audio-stage="tiangong-module-list"]' },
    {
      at_sec: 20,
      action: 'cue',
      target: 'Rotate the T-shape. Three modules, four solar arrays.',
      duration_ms: 4000,
    },
    // VTT § 00:00:22.1 "The core of the T is Tianhe"
    {
      at_sec: 23,
      action: 'cue',
      target: 'Tianhe — the upright of the T. The core module.',
      duration_ms: 4000,
    },
    { at_sec: 24, action: 'click', target: '[data-audio-stage="tiangong-select-tianhe"]' },
    // VTT § 00:00:37.3 "Click Wentian — the arm to one side" / 00:55.4 "Click Mengtian"
    { at_sec: 39, action: 'click', target: '[data-audio-stage="tiangong-select-wentian"]' },
    { at_sec: 57, action: 'click', target: '[data-audio-stage="tiangong-select-mengtian"]' },
    // Close the Mengtian panel once its beat ends (00:01:07.8) so the
    // canvas is clear for the arrays + docking-port beats.
    { at_sec: 68, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT 00:01:07.8 "Look at the solar arrays. Four large panels… ~100 kW."
    {
      at_sec: 70,
      action: 'cue',
      target: 'Four solar arrays — about 100 kilowatts.',
      duration_ms: 6000,
    },
    // VTT 00:01:22.3 "Crews arrive on Shenzhou…" — open the crew vehicle.
    { at_sec: 83, action: 'click', target: '[data-audio-stage="tiangong-select-shenzhou"]' },
    // VTT 00:01:37.7 "Cargo arrives on Tianzhou ships."
    { at_sec: 95, action: 'click', target: '[data-audio-stage="tiangong-select-tianzhou"]' },
    { at_sec: 100, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT 00:01:40.9 "Tiangong was assembled in seventeen months." Play the
    // assembly timeline so the listener watches it build up (fills the gap
    // to the outro).
    { at_sec: 102, action: 'click', target: '[data-audio-stage="tiangong-assembly-toggle"]' },
    // VTT § 00:01:55.7 "Click any module"
    {
      at_sec: 115,
      action: 'cue',
      target: 'Click any module — three modules, twelve flights, seventeen months.',
      duration_ms: 5000,
    },
  ],

  // ── /tiangong · tianhe-core — Enthusiast, VTT 115 s (Extended Tour) ─
  'tianhe-core': [
    // VTT § 00:00:00.0 "Tianhe — the core module of Tiangong — launched April 29th, 2021"
    { at_sec: 1, action: 'scroll-to', target: '[data-audio-stage="tiangong-module-list"]' },
    { at_sec: 5, action: 'click', target: '[data-audio-stage="tiangong-select-tianhe"]' },
    // VTT § 00:00:19.6 "Pressurized volume around 50 m³"
    {
      at_sec: 20,
      action: 'cue',
      target: '~50 m³ pressurized — half Zvezda’s volume.',
      duration_ms: 4500,
    },
    // VTT § 00:00:50.9 "Wentian, meaning 'quest for the heavens' — joined…"
    { at_sec: 51, action: 'click', target: '[data-audio-stage="tiangong-select-wentian"]' },
    // VTT § 00:00:58.8 "The second lab — Mengtian, 'dreaming of the heavens'"
    { at_sec: 60, action: 'click', target: '[data-audio-stage="tiangong-select-mengtian"]' },
    // VTT § 00:01:05.0 "Total assembly time…: seventeen months."
    {
      at_sec: 66,
      action: 'cue',
      target: 'Seventeen months — first module to fully assembled.',
      duration_ms: 4500,
    },
    // VTT § 00:01:11.9 "Compare to the ISS, which took twelve years…"
    {
      at_sec: 75,
      action: 'cue',
      target: 'Twelve years for ISS. Seventeen months for Tiangong.',
      duration_ms: 5000,
    },
    // Open the assembly playback as the "twelve years vs seventeen
    // months" contrast lands. Tiangong playback is 24 s fixed (vs ISS's
    // 50 s); ends at t=104 — just in time for the "Look at the T" close
    // to land on the fully-assembled station. Mirror of the
    // zarya-first-module wiring (Phase 1) — same pattern, tighter window.
    { at_sec: 80, action: 'click', target: '[data-audio-stage="tiangong-assembly-toggle"]' },
    // VTT § 00:01:28.6 "Look at the T-shape on screen"
    {
      at_sec: 105,
      action: 'cue',
      target: 'Look at the T — Tianhe is the upright.',
      duration_ms: 4500,
    },
    // Close before episode-end so the auto-advance to guide-missions
    // doesn't unmount mid-playback. The playback is already over by
    // t=104 (started at 80 + 24 s); this click just dismisses the
    // panel.
    { at_sec: 112, action: 'click', target: '[data-audio-stage="tiangong-assembly-toggle"]' },
  ],

  // ── /science · guide-science — VTT 135 s ──────────────────────────
  // Opening roll-call: the narration name-drops Hohmann / Lambert /
  // Vis-viva / Free-return / Tsiolkovsky / C3 / Delta-V / V-infinity in
  // rapid succession at t=3.8 – 9. Of these, ElevenLabs only voices four
  // (Vis-viva, C3, Delta-V, V-infinity render as silent gaps in the VTT).
  // We navigate to /science/transfers at t=2 so the right rail populates
  // with the four voiced sections (three from transfers + Tsiolkovsky on
  // propulsion). The transfers rail has Hohmann, Lambert, Free-return as
  // section cards — flash each as it's spoken. Tsiolkovsky lives on the
  // propulsion tab; honestly skipped (a second navigate to /science/
  // propulsion for one 1.5 s flash would yank the page). Return to
  // /science home at t=12 before the "ten tabs across the top" beat.
  //
  // Tab roll-call at t=25 – 33 ("Orbits. Maneuvers. Propulsion. Re-entry.
  // Solar System. Stars. Astrophysics. Instruments. Life support.
  // Operations.") is dead due to SSML drift: the 2026-06-06 SCIENCE_TABS
  // reorder + rename means only "Orbits" and "Propulsion" still match
  // current tab IDs. "Maneuvers" → 'transfers', "Solar System"/"Stars"/
  // "Astrophysics" don't exist, "Life support" → 'life-in-space'.
  // Flashing only the matching subset would lie by omission. Keep the
  // existing container-level science-tabs flash at t=20; skip per-tab.
  'guide-science': [
    // VTT § 00:00:02 — preload transfers tab right rail for the section
    // roll-call burst. `keepFocus: true` is the default in our executor
    // so focus stays on the audio overlay.
    { at_sec: 2, action: 'navigate', target: '/science/transfers' },
    // VTT § 00:00:03.8 "Hohmann transfers"
    { at_sec: 4, action: 'flash', target: '[data-audio-stage="science-section-hohmann-transfer"]' },
    // VTT § 00:00:05.1 "Lambert solutions"
    { at_sec: 5, action: 'flash', target: '[data-audio-stage="science-section-lambert-problem"]' },
    // VTT § 00:00:07.1 "Free-return geometry"
    { at_sec: 7, action: 'flash', target: '[data-audio-stage="science-section-free-return"]' },
    // Stay on /science/transfers for the rest of the episode — the
    // science-tabs left rail and search button are visible on every
    // sub-route, so the "ten tabs" + "Cmd-K" beats still fire cleanly.
    // The previous t=12 navigate-back to /science yanked any listener
    // who'd started reading a section in the right rail.
    // VTT § 00:00:20.7 "The encyclopedia is organized into ten tabs across the top"
    { at_sec: 18, action: 'scroll-to', target: '[data-audio-stage="science-tabs"]' },
    { at_sec: 20, action: 'flash', target: '[data-audio-stage="science-tabs"]' },
    {
      at_sec: 21,
      action: 'cue',
      target: 'Ten tabs across the top — every physics domain.',
      duration_ms: 4500,
    },
    // VTT § 00:00:37.4 "Click any section card"
    {
      at_sec: 37,
      action: 'cue',
      target: 'Click any section card — math rendered, diagrams hand-drawn.',
      duration_ms: 4500,
    },
    // VTT § 00:01:23.4 "Try the search" / 00:01:24.4 "Press Cmd-K"
    {
      at_sec: 83,
      action: 'cue',
      target: 'Press Cmd-K — full text search across every section.',
      duration_ms: 4500,
    },
    { at_sec: 85, action: 'flash', target: '[data-audio-stage="science-search-button"]' },
    // VTT § 00:02:13.1 "Pick a tab"
    {
      at_sec: 133,
      action: 'cue',
      target: 'Pick a tab. Read the section. Click the chip back into the orrery.',
      duration_ms: 5000,
    },
  ],

  // ── /science · vis-viva — Enthusiast, VTT 123 s (Extended Tour) ───
  'vis-viva': [
    // VTT § 00:00:00.0 "Open the Orbits tab"
    { at_sec: 0, action: 'scroll-to', target: '[data-audio-stage="science-tabs"]' },
    { at_sec: 1, action: 'flash', target: '[data-audio-stage="science-tab-orbits"]' },
    { at_sec: 2, action: 'click', target: '[data-audio-stage="science-tab-orbits"]' },
    // VTT § 00:00:01.4 "Find the section called Vis-viva"
    { at_sec: 4, action: 'flash', target: '[data-audio-stage="science-section-vis-viva"]' },
    { at_sec: 6, action: 'click', target: '[data-audio-stage="science-section-vis-viva"]' },
    {
      at_sec: 8,
      action: 'cue',
      target: 'Vis-viva — one equation; three variables; six decades of spaceflight.',
      duration_ms: 6000,
    },
    // VTT § 00:01:15.5 "Kepler's second law — equal areas in equal times
    // — falls right out of this." Flash the keplers-laws section card in
    // the right rail. We're on /science/orbits/vis-viva — the orbits
    // right rail lists every orbits section, including keplers-laws.
    { at_sec: 76, action: 'flash', target: '[data-audio-stage="science-section-keplers-laws"]' },
  ],

  // ── /fleet · guide-fleet — VTT 167 s ──────────────────────────────
  // The filters panel + epoch timeline are inside `{#if filtersExpanded}`
  // and default-collapsed. The original tour fired scroll/flash at
  // fleet-filters without opening the panel first, so the selectors
  // didn't exist in the DOM and the stages silently no-opped. Fix: click
  // the filters-toggle at t=18 to expand, THEN the panel + epoch strip
  // are mounted for every later stage.
  'guide-fleet': [
    // VTT § 00:00:18 — narration just finished "The catalogue is organized
    // into nine categories along the left." Open the filters panel so the
    // category list (and the epoch strip) are visible.
    { at_sec: 18, action: 'click', target: '[data-audio-stage="fleet-filters-toggle"]' },
    // VTT § 00:00:22.0 – 29.4 — categories roll-call. The narration walks
    // every category name; flash the filters panel as a whole (per-category
    // filter buttons don't currently have stable data-audio-stage hooks —
    // adding 9 would be cheap follow-up if we want per-category flashes).
    { at_sec: 22, action: 'scroll-to', target: '[data-audio-stage="fleet-filters"]' },
    { at_sec: 24, action: 'flash', target: '[data-audio-stage="fleet-filters"]' },
    {
      at_sec: 28,
      action: 'cue',
      target: 'Nine categories — Launchers, Crewed, Cargo, Stations…',
      duration_ms: 4500,
    },
    // VTT § 00:00:33.8 "Try crewed spacecraft. Vostok at the top."
    // Filter the grid to crewed-spacecraft via URL — the route's q+filter
    // state is URL-bound, so navigate sets it without a DOM click. After
    // the navigate, the visible grid drops to ~13 cards and the crewed
    // roll-call flashes land on cards that are actually on screen.
    { at_sec: 33, action: 'navigate', target: '/fleet?category=crewed-spacecraft' },
    { at_sec: 34, action: 'scroll-to', target: '[data-audio-stage="fleet-grid"]' },
    // VTT § 00:00:34.0 – 53.4 — Vostok → Voskhod → Mercury → Gemini →
    // Apollo CSM → Soyuz → Shuttle → Shenzhou → Crew Dragon → Starliner →
    // Orion → Gaganyaan. Twelve flashes in ~20 s; the rapid stomp pacing
    // matches the staccato narration. soyuz-7k-ok stands in for "Soyuz, in
    // its many generations — Seven K, T, TM, TMA, MS" — one Soyuz card
    // flashed rather than five rapid-fire on near-identical cards.
    { at_sec: 35, action: 'flash', target: '[data-audio-stage="fleet-select-vostok"]' },
    { at_sec: 41, action: 'flash', target: '[data-audio-stage="fleet-select-voskhod"]' },
    { at_sec: 42, action: 'flash', target: '[data-audio-stage="fleet-select-mercury-capsule"]' },
    { at_sec: 43, action: 'flash', target: '[data-audio-stage="fleet-select-gemini"]' },
    {
      at_sec: 44,
      action: 'flash',
      target: '[data-audio-stage="fleet-select-apollo-csm-block-ii"]',
    },
    { at_sec: 45, action: 'flash', target: '[data-audio-stage="fleet-select-soyuz-7k-ok"]' },
    {
      at_sec: 48,
      action: 'flash',
      target: '[data-audio-stage="fleet-select-space-shuttle-orbiter"]',
    },
    { at_sec: 49, action: 'flash', target: '[data-audio-stage="fleet-select-shenzhou"]' },
    { at_sec: 50, action: 'flash', target: '[data-audio-stage="fleet-select-crew-dragon"]' },
    { at_sec: 51, action: 'flash', target: '[data-audio-stage="fleet-select-starliner"]' },
    { at_sec: 52, action: 'flash', target: '[data-audio-stage="fleet-select-orion"]' },
    { at_sec: 53, action: 'flash', target: '[data-audio-stage="fleet-select-gaganyaan"]' },
    // VTT § 00:01:07.8 "Click Saturn V" — clear filter so the launcher
    // category becomes visible, then click. Was at t=77 (10 s late from
    // VTT); pulled forward to land on the narration.
    { at_sec: 66, action: 'navigate', target: '/fleet' },
    {
      at_sec: 67,
      action: 'cue',
      target: 'Click Saturn V — read the anatomy diagram.',
      duration_ms: 4000,
    },
    { at_sec: 68, action: 'click', target: '[data-audio-stage="fleet-select-saturn-v"]' },
    // The Saturn V narration walks the tabs explicitly — cycle them so each
    // is shown as it's named (user direction). VTT: "anatomy" 00:01:07.8,
    // "the flights tab" 00:01:16.5, "the links tab" 00:01:26.0.
    { at_sec: 72, action: 'click', target: '[data-audio-stage="fleet-tab-anatomy"]' },
    { at_sec: 78, action: 'click', target: '[data-audio-stage="fleet-tab-missions"]' },
    // ANATOMY+LEARN merged into one tab — the "links tab" beat re-shows it.
    { at_sec: 88, action: 'click', target: '[data-audio-stage="fleet-tab-anatomy"]' },
    { at_sec: 93, action: 'click', target: '[data-audio-stage="panel-close"]' },
    // VTT 00:01:33.9 "Try filtering by status. Failed." — drive the live
    // status filter, then clear before the epoch-timeline beat.
    { at_sec: 95, action: 'navigate', target: '/fleet?status=failed' },
    { at_sec: 108, action: 'navigate', target: '/fleet' },
    // VTT § 00:01:52.8 "Try the epoch timeline at the top" — was at t=118
    // (5 s late) and flashed fleet-filters (wrong UI region — that's the
    // category list, not the epoch strip). Re-targeted to the new
    // fleet-epoch-timeline hook and re-timed to land on the narration.
    {
      at_sec: 113,
      action: 'cue',
      target: 'Try the epoch timeline — compare 1965 to 2025.',
      duration_ms: 4500,
    },
    { at_sec: 115, action: 'flash', target: '[data-audio-stage="fleet-epoch-timeline"]' },
  ],

  // ── /fleet · saturn-v-anchor — Enthusiast, VTT 134 s (Extended Tour) ─
  'saturn-v-anchor': [
    // VTT § 00:00:00.0 "Click Saturn V" → 00:00:01.1 "Look at the diagram"
    { at_sec: 1, action: 'click', target: '[data-audio-stage="fleet-select-saturn-v"]' },
    // VTT § 00:00:02.7 – 11.9 "110.6 meters tall. 36 stories. 3,000 metric tons."
    {
      at_sec: 8,
      action: 'cue',
      target: '110 m tall. 36 stories. 3,000 tons.',
      duration_ms: 5000,
    },
    // VTT § 00:00:44.0 "Thirteen for thirteen." — was cue@31 (14 s early
    // before VTT verification — the count line is at t=44, not t=31).
    {
      at_sec: 45,
      action: 'cue',
      target: 'Thirteen for thirteen. No catastrophic failures.',
      duration_ms: 5000,
    },
    // VTT § 00:01:44.1 "No rocket since has equaled Saturn V's lift capacity"
    {
      at_sec: 104,
      action: 'cue',
      target: 'No rocket since has equalled Saturn V to LEO or the Moon.',
      duration_ms: 5000,
    },
    // VTT § 00:01:50.7 "SLS Block 1, the rocket flying Artemis, is comparable"
    { at_sec: 111, action: 'flash', target: '[data-audio-stage="fleet-select-sls-block-1"]' },
    // VTT § 00:01:58.6 "Starship and Super Heavy may eventually exceed it."
    { at_sec: 119, action: 'flash', target: '[data-audio-stage="fleet-select-starship"]' },
    // VTT § 00:02:06.4 "Look at the ladder of launchers in this catalogue,
    // and notice which step has been empty for fifty years." — was
    // cue@122 (10 s early; the "ladder" + "empty step" beat is at t=132).
    {
      at_sec: 132,
      action: 'cue',
      target: 'Notice which step on the ladder has been empty for fifty years.',
      duration_ms: 5000,
    },
  ],

  // ── / · capability-ladder-close — Curator tour close, VTT 106 s ───
  'capability-ladder-close': [
    // VTT § 00:00:35.5 — agency roll-call begins ("NASA … ESA …
    // Roscosmos … CNSA …"). Was t=30 (5 s early).
    {
      at_sec: 35,
      action: 'cue',
      target: 'NASA · ESA · Roscosmos · CNSA · ISRO · JAXA · CSA · SpaceIL.',
      duration_ms: 5000,
    },
    // VTT § 00:01:35.3 (EL) / 01:25 (Google) "It is a map of what we
    // now know is possible…" Anchor to the Google variant's last 10 % so
    // the close still fires when the listener picks the shorter variant
    // (Google = 95.3 s, EL = 106 s). On EL the visual lands 7–10 s
    // before the line — banner stays up, so the early-firing reads as
    // "anchor the reveal" rather than "miss". Phase 16 fix.
    {
      at_sec: 88,
      action: 'cue',
      target: 'End of the tour. Pick a card and begin your own visit.',
      duration_ms: 5000,
    },
    { at_sec: 90, action: 'scroll-to', target: '[data-audio-stage="route-grid"]' },
    { at_sec: 92, action: 'flash', target: '[data-audio-stage="route-grid"]' },
  ],
};

// =============================================================================
// CURATOR_FULL_TOUR — the ordered sequence "Take the Curator Tour" plays.
// 21 episodes · ~66 min · documentary order from Sagan open to capability close.
//
// Default-active provider when an episode has multiple variants:
// audio-registry.svelte.ts PROVIDER_PRIORITY puts ElevenLabs first
// (museum-grade prosody), Google second (free-tier baseline). The user
// can toggle mid-playback via the AudioOverlay variant switcher; change
// the priority array if you want Google as the default-active instead.
// =============================================================================

export const CURATOR_FULL_TOUR: string[] = [
  'pale-blue-dot', //           Curator open — pale blue dot
  'guide-explore', //           The whole solar system
  'guide-earth', //             Earth's orbital neighborhood
  'guide-moon', //              Moon map
  'moon-one-lifetime', //       Curator deep-time: Kitty Hawk → Tranquillity
  'cernan-last-words', //       Apollo 17 + the half-century of silence
  'far-side', //                Chang'e 4 + Queqiao
  'guide-iss', //               ISS modules
  'guide-tiangong', //          Tiangong
  'guide-missions', //          60 years of going places
  'guide-mars', //              Mars surface map
  'mars-what-for', //           Curator: Mars as the organizing question
  'signal-delay', //            Light-time
  'one-way-light-time', //      Category error
  'curiosity-persistence', //   4 cm/s across years
  'guide-fly', //               Transfer ellipse
  'guide-plan', //              Mission Configurator
  'porkchop', //                C-shape contour
  'guide-fleet', //             Hardware story
  'guide-science', //           Physics behind everything
  'capability-ladder-close', // Curator close
];

// =============================================================================
// CURATOR_EXTENDED_TOUR — the longer ride (#305).
//
// Interleaves the 10 enthusiast deep-dive episodes right after the related
// guide/curator segment that names their topic. The listener gets
// "overview → deep dive on the thing the narrator just mentioned" pacing.
// 31 episodes total · ~87 min (vs Curator Tour's 21 · ~66 min).
//
// Each `[+]` entry is enthusiast; the rest mirror CURATOR_FULL_TOUR.
// =============================================================================

export const CURATOR_EXTENDED_TOUR: string[] = [
  'pale-blue-dot',
  'guide-explore',
  'saturn-rings', //            [+] enthusiast — rings + Cassini Division
  'jupiter-storm', //           [+] enthusiast — Great Red Spot, 350-year hurricane
  'guide-earth',
  'jwst-l2-halo', //            [+] enthusiast — L2 halo orbit, 40 K detectors
  'guide-moon',
  'moon-one-lifetime',
  'cernan-last-words',
  'far-side',
  'queqiao-magpie', //          [+] enthusiast — magpie bridge to the far side
  'guide-iss',
  'zarya-first-module', //      [+] enthusiast — Russian-built, US-owned
  'guide-tiangong',
  'tianhe-core', //             [+] enthusiast — core module + Wentian/Mengtian
  'guide-missions',
  'voyager-grand-tour', //      [+] enthusiast — outer-system gravity assist
  'cassini-finale', //          [+] enthusiast — 22 orbits, Enceladus, the dive
  'guide-mars',
  'mars-what-for',
  'signal-delay',
  'one-way-light-time',
  'curiosity-persistence',
  'guide-fly',
  'guide-plan',
  'porkchop',
  'guide-fleet',
  'saturn-v-anchor', //         [+] enthusiast — 13 for 13, no catastrophic loss
  'guide-science',
  'vis-viva', //                [+] enthusiast — one equation, three variables
  'capability-ladder-close',
];

// =============================================================================
// Helpers (runtime queries — do not edit these unless extending the system)
// =============================================================================

export function stagesForEpisode(episodeId: string): AudioStage[] {
  return EPISODE_STAGES[episodeId] ?? [];
}
