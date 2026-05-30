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

export type AudioStageAction = 'flash' | 'scroll-to' | 'click' | 'open-tab' | 'cue';

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
   */
  action: AudioStageAction;
  /** For DOM actions: CSS selector. For `cue`: the message text. */
  target: string;
  /** Optional duration in ms for `cue` banner (default 6000 ms). */
  duration_ms?: number;
  /** Optional authoring note — surfaced in dev console only. */
  note?: string;
}

// =============================================================================
// EPISODE_STAGES — keyed by episode id. Add entries as you wire up affordances.
// Missing keys / empty arrays are fine; the episode plays normally without
// side-effects. Selectors that don't resolve on the current page no-op.
// =============================================================================

export const EPISODE_STAGES: Record<string, AudioStage[]> = {
  // ── / · pale-blue-dot — Curator tour open ───────────────────────────
  'pale-blue-dot': [
    {
      at_sec: 4,
      action: 'cue',
      target: 'Take in the route grid in front of you — every screen Orrery has.',
    },
    {
      at_sec: 80,
      action: 'cue',
      target: 'You are looking at this orrery now — the same view Voyager had, scaled down.',
    },
  ],

  // ── /explore · guide-explore ───────────────────────────────────────
  'guide-explore': [
    {
      at_sec: 6,
      action: 'cue',
      target: 'Drag the view to rotate the solar system around the Sun.',
    },
    { at_sec: 70, action: 'cue', target: 'Watch Saturn — one orbit takes 29.5 years.' },
    {
      at_sec: 130,
      action: 'cue',
      target: 'Try the time slider at the bottom — speed up the simulation.',
    },
    { at_sec: 200, action: 'cue', target: 'Click any planet for its detail panel.' },
  ],

  // ── /explore · saturn-rings — Enthusiast ──────────────────────────
  'saturn-rings': [
    { at_sec: 3, action: 'cue', target: 'Click Saturn in the orrery.' },
    {
      at_sec: 20,
      action: 'cue',
      target: 'Two hundred eighty thousand kilometers wide — ten meters thick.',
    },
  ],

  // ── /explore · jupiter-storm — Enthusiast ─────────────────────────
  'jupiter-storm': [
    {
      at_sec: 3,
      action: 'cue',
      target: 'Click Jupiter — find the Great Red Spot in the southern hemisphere.',
    },
    {
      at_sec: 90,
      action: 'cue',
      target: "The same hurricane for 350 years. Triple Earth's strongest.",
    },
  ],

  // ── /plan · guide-plan ─────────────────────────────────────────────
  'guide-plan': [
    { at_sec: 6, action: 'cue', target: 'Pick a destination — Mars is the default.' },
    {
      at_sec: 60,
      action: 'cue',
      target: 'Click anywhere on the C-shape; the panel reads the numbers.',
    },
    {
      at_sec: 150,
      action: 'cue',
      target: 'Try Jupiter or Mercury — notice how the geometry shifts.',
    },
  ],

  // ── /plan · porkchop — Enthusiast ─────────────────────────────────
  porkchop: [
    {
      at_sec: 40,
      action: 'cue',
      target: 'Trace the bottom of the C with your eye — that is the cheap window.',
    },
    {
      at_sec: 100,
      action: 'cue',
      target: 'Every Mars launch in history sits on the bottom of one of these.',
    },
  ],

  // ── /fly · guide-fly ───────────────────────────────────────────────
  'guide-fly': [
    { at_sec: 6, action: 'cue', target: 'Press play. Watch the spacecraft slide along the arc.' },
    { at_sec: 80, action: 'cue', target: 'Try the cislunar view toggle in the toolbar.' },
    { at_sec: 150, action: 'cue', target: 'Click any phase chip below to jump to that moment.' },
  ],

  // ── /fly · cislunar-frame — Enthusiast ────────────────────────────
  'cislunar-frame': [
    {
      at_sec: 5,
      action: 'cue',
      target: 'Open a Mars mission, then a Moon mission. Watch the frames change.',
    },
    {
      at_sec: 70,
      action: 'cue',
      target: 'Use the toolbar to switch frames on any mission yourself.',
    },
  ],

  // ── /missions · guide-missions ────────────────────────────────────
  'guide-missions': [
    {
      at_sec: 6,
      action: 'cue',
      target: 'Try the filter chips at the top — status, destination, agency.',
    },
    {
      at_sec: 70,
      action: 'cue',
      target: 'Filter status = FAILED. See the redemption-arc pairings.',
    },
    { at_sec: 160, action: 'cue', target: 'Click any card to open the full mission panel.' },
  ],

  // ── /missions · voyager-grand-tour — Enthusiast ───────────────────
  'voyager-grand-tour': [
    { at_sec: 30, action: 'cue', target: 'Find Voyager 1 and Voyager 2 in the catalogue.' },
    {
      at_sec: 90,
      action: 'cue',
      target: 'Their current trajectories — still operating, still transmitting.',
    },
  ],

  // ── /missions · cassini-finale — Enthusiast ───────────────────────
  'cassini-finale': [
    { at_sec: 5, action: 'cue', target: 'Find Cassini in the mission catalogue.' },
    { at_sec: 60, action: 'cue', target: 'The Grand Finale — 22 orbits through the ring gap.' },
  ],

  // ── /earth · guide-earth ──────────────────────────────────────────
  'guide-earth': [
    {
      at_sec: 6,
      action: 'cue',
      target: 'Look at the bottom — ISS and Tiangong at 400 km altitude.',
    },
    { at_sec: 60, action: 'cue', target: 'Higher — Hubble at 550 km.' },
    {
      at_sec: 100,
      action: 'cue',
      target: 'Top of the view — JWST at the Sun-Earth L2, 1.5 million km out.',
    },
    { at_sec: 170, action: 'cue', target: 'Click any spacecraft for its story.' },
  ],

  // ── /earth · jwst-l2-halo — Enthusiast ────────────────────────────
  'jwst-l2-halo': [
    { at_sec: 5, action: 'cue', target: 'Find JWST in the diagram — at the top, far above Earth.' },
    { at_sec: 60, action: 'cue', target: 'L2 is 1.5 million km out, along the Sun-Earth line.' },
  ],

  // ── /moon · guide-moon ────────────────────────────────────────────
  'guide-moon': [
    { at_sec: 6, action: 'cue', target: 'Drag the sphere — each yellow marker is a landing site.' },
    { at_sec: 50, action: 'cue', target: 'Find Tranquillity Base — Apollo 11.' },
    { at_sec: 130, action: 'cue', target: 'Now look near the south pole — Chandrayaan-3, 2023.' },
    { at_sec: 200, action: 'cue', target: 'Click any marker to read its mission record.' },
  ],

  // ── /moon · moon-one-lifetime — Curator ───────────────────────────
  'moon-one-lifetime': [
    { at_sec: 60, action: 'cue', target: 'Look at the cluster of Apollo sites on the near side.' },
    {
      at_sec: 100,
      action: 'cue',
      target: 'Six landings in 3.5 years. Then a half-century of silence.',
    },
  ],

  // ── /moon · cernan-last-words — Guide (anchored Atmospheric Move) ─
  'cernan-last-words': [
    { at_sec: 5, action: 'cue', target: 'Find Taurus-Littrow — Apollo 17, the last footstep.' },
    {
      at_sec: 100,
      action: 'cue',
      target: 'Apollo 17 left in December 1972. The footprint has been alone since.',
    },
  ],

  // ── /moon · far-side — Guide (anchored Atmospheric Move) ──────────
  'far-side': [
    { at_sec: 8, action: 'cue', target: 'Rotate the sphere to the far side.' },
    { at_sec: 90, action: 'cue', target: "Find Von Kármán crater — Chang'e 4 lives there." },
    {
      at_sec: 150,
      action: 'cue',
      target: 'No human has ever set foot on the side you are looking at.',
    },
  ],

  // ── /moon · queqiao-magpie — Enthusiast ───────────────────────────
  'queqiao-magpie': [
    {
      at_sec: 30,
      action: 'cue',
      target: 'The Moon is in the way of any signal from the far side.',
    },
    {
      at_sec: 60,
      action: 'cue',
      target: 'Queqiao orbits Earth-Moon L2 — 65,000 km past the Moon.',
    },
  ],

  // ── /mars · guide-mars ────────────────────────────────────────────
  'guide-mars': [
    {
      at_sec: 6,
      action: 'cue',
      target: 'Drag to rotate Mars. Every marker is a spacecraft we sent.',
    },
    {
      at_sec: 50,
      action: 'cue',
      target: 'Find Curiosity at Gale Crater — center-south, still operating.',
    },
    {
      at_sec: 110,
      action: 'cue',
      target: 'Look for Perseverance at Jezero — the sample-cache rover.',
    },
    {
      at_sec: 180,
      action: 'cue',
      target: 'Zoom in to Curiosity — the thin line is twelve years of driving.',
    },
  ],

  // ── /mars · mars-what-for — Curator ───────────────────────────────
  'mars-what-for': [
    { at_sec: 50, action: 'cue', target: 'Look at the rovers on the map. Silent. But there.' },
    {
      at_sec: 130,
      action: 'cue',
      target: 'Every Moon base, every ISS module, every reusable booster — rehearsal.',
    },
  ],

  // ── /mars · signal-delay — Enthusiast ─────────────────────────────
  'signal-delay': [
    {
      at_sec: 30,
      action: 'cue',
      target: 'Imagine pressing a button now. Fourteen minutes until anything happens.',
    },
    {
      at_sec: 80,
      action: 'cue',
      target: 'No joystick. A planner. Each sol — one sequence at a time.',
    },
  ],

  // ── /mars · one-way-light-time — Enthusiast ───────────────────────
  'one-way-light-time': [
    { at_sec: 35, action: 'cue', target: 'Apollo had 1.3-second light-time. Mars has 14 minutes.' },
    { at_sec: 90, action: 'cue', target: 'There is no manual mode on the rover. There cannot be.' },
  ],

  // ── /mars · curiosity-persistence — Enthusiast ────────────────────
  'curiosity-persistence': [
    { at_sec: 25, action: 'cue', target: 'Four centimeters per second. A baby crawls faster.' },
    { at_sec: 80, action: 'cue', target: 'Twelve years. Thirty-five kilometers. Alone.' },
  ],

  // ── /iss · guide-iss ──────────────────────────────────────────────
  'guide-iss': [
    { at_sec: 5, action: 'cue', target: 'Drag to rotate the station. Each module is clickable.' },
    { at_sec: 50, action: 'cue', target: 'Find Zarya — the back end. The first module.' },
    { at_sec: 130, action: 'cue', target: 'Click Destiny — the US lab. Or Kibo — the Japanese.' },
    {
      at_sec: 190,
      action: 'cue',
      target: 'Eighteen modules. Twenty-six countries. People living there now.',
    },
  ],

  // ── /iss · zarya-first-module — Enthusiast ────────────────────────
  'zarya-first-module': [
    { at_sec: 5, action: 'cue', target: 'Click Zarya in the rotating station — the back module.' },
    { at_sec: 70, action: 'cue', target: 'Russian-built. American-owned. NASA paid the bill.' },
  ],

  // ── /tiangong · guide-tiangong ────────────────────────────────────
  'guide-tiangong': [
    { at_sec: 5, action: 'cue', target: 'Rotate the T-shape. Three modules, four solar arrays.' },
    { at_sec: 60, action: 'cue', target: 'Click Tianhe — the upright of the T. The core module.' },
    { at_sec: 130, action: 'cue', target: 'Click Wentian or Mengtian — the two laboratories.' },
  ],

  // ── /tiangong · tianhe-core — Enthusiast ──────────────────────────
  'tianhe-core': [
    { at_sec: 5, action: 'cue', target: 'Click Tianhe — the core module of the T.' },
    {
      at_sec: 70,
      action: 'cue',
      target: 'Seventeen months for the whole station. ISS took twelve years.',
    },
  ],

  // ── /science · guide-science ──────────────────────────────────────
  'guide-science': [
    {
      at_sec: 6,
      action: 'cue',
      target: 'Look at the ten tabs across the top — every physics domain.',
    },
    { at_sec: 60, action: 'cue', target: 'Press Cmd-K — full text search across every section.' },
    {
      at_sec: 130,
      action: 'cue',
      target: 'Click any section card — math rendered, diagrams hand-drawn.',
    },
  ],

  // ── /science · vis-viva — Enthusiast ──────────────────────────────
  'vis-viva': [
    { at_sec: 5, action: 'cue', target: 'Open the Orbits tab. Find the Vis-viva section.' },
    {
      at_sec: 70,
      action: 'cue',
      target: 'One equation. Three variables. Six decades of spaceflight.',
    },
  ],

  // ── /fleet · guide-fleet ──────────────────────────────────────────
  'guide-fleet': [
    {
      at_sec: 6,
      action: 'cue',
      target: 'Use the category list on the left — Launchers, Crewed, Cargo...',
    },
    { at_sec: 60, action: 'cue', target: 'Filter to Crewed Spacecraft. Vostok at the top.' },
    { at_sec: 90, action: 'cue', target: 'Click Saturn V. Read the anatomy diagram.' },
    { at_sec: 160, action: 'cue', target: 'Try the epoch timeline — compare 1965 to 2025.' },
  ],

  // ── /fleet · saturn-v-anchor — Enthusiast ─────────────────────────
  'saturn-v-anchor': [
    { at_sec: 5, action: 'cue', target: 'Click Saturn V in the fleet grid.' },
    { at_sec: 100, action: 'cue', target: 'Thirteen for thirteen. No catastrophic failures.' },
    {
      at_sec: 130,
      action: 'cue',
      target: 'Notice which step on the ladder has been empty for fifty years.',
    },
  ],

  // ── / · capability-ladder-close — Curator tour close ──────────────
  'capability-ladder-close': [
    {
      at_sec: 40,
      action: 'cue',
      target: 'NASA · ESA · Roscosmos · CNSA · ISRO · JAXA · CSA · SpaceIL.',
    },
    {
      at_sec: 110,
      action: 'cue',
      target: 'End of the tour. Pick a card and begin your own visit.',
    },
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
// Helpers (runtime queries — do not edit these unless extending the system)
// =============================================================================

export function stagesForEpisode(episodeId: string): AudioStage[] {
  return EPISODE_STAGES[episodeId] ?? [];
}
