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

export type AudioStageAction = 'flash' | 'scroll-to' | 'click' | 'open-tab';

export interface AudioStage {
  /** Seconds into the episode when this stage fires. */
  at_sec: number;
  /** What to do when this stage fires. */
  action: AudioStageAction;
  /** CSS selector for the target element on the route's page. */
  target: string;
  /** Optional authoring note — surfaced in dev console only. */
  note?: string;
}

// =============================================================================
// EPISODE_STAGES — keyed by episode id. Add entries as you wire up affordances.
// Missing keys / empty arrays are fine; the episode plays normally without
// side-effects. Selectors that don't resolve on the current page no-op.
// =============================================================================

export const EPISODE_STAGES: Record<string, AudioStage[]> = {
  // ── / (home) ──────────────────────────────────────────────────────────
  'pale-blue-dot': [
    {
      at_sec: 80,
      action: 'flash',
      target: '[data-audio-stage="orrery-context"]',
      note: 'flash the orrery hero block at "You are looking at it now"',
    },
  ],

  // ── /explore ──────────────────────────────────────────────────────────
  'guide-explore': [
    {
      at_sec: 28,
      action: 'flash',
      target: '[data-audio-stage="explore-sun"]',
      note: 'highlight the Sun at "Sun at the center"',
    },
    {
      at_sec: 75,
      action: 'flash',
      target: '[data-audio-stage="explore-saturn"]',
      note: '"Saturn takes 29.5 Earth years"',
    },
  ],
  'saturn-rings': [
    {
      at_sec: 3,
      action: 'click',
      target: '[data-audio-stage="explore-saturn"]',
      note: 'auto-click Saturn so panel opens at "Click Saturn"',
    },
    {
      at_sec: 18,
      action: 'flash',
      target: '[data-audio-stage="explore-saturn"]',
      note: 'flash rings at the "ten meters thick" reveal',
    },
  ],
  'jupiter-storm': [
    {
      at_sec: 3,
      action: 'click',
      target: '[data-audio-stage="explore-jupiter"]',
      note: 'auto-click Jupiter so panel opens at "Click Jupiter"',
    },
  ],

  // ── /mars ─────────────────────────────────────────────────────────────
  'guide-mars': [
    {
      at_sec: 22,
      action: 'flash',
      target: '[data-audio-stage="mars-marker-perseverance"]',
      note: 'flash Perseverance marker',
    },
    {
      at_sec: 95,
      action: 'flash',
      target: '[data-audio-stage="mars-marker-curiosity"]',
      note: 'flash Curiosity marker',
    },
  ],
};

// =============================================================================
// CURATOR_FULL_TOUR — the ordered sequence "Take the Curator Tour" plays.
// 21 episodes · ~70 min · documentary order from Sagan open to capability close.
// =============================================================================

export const CURATOR_FULL_TOUR: string[] = [
  'pale-blue-dot', //           Curator open — pale blue dot
  'guide-explore', //           The whole solar system
  'guide-earth', //             Earth's orbital neighborhood
  'guide-moon', //              Moon map
  'moon-one-lifetime', //       Curator deep-time: Kitty Hawk → Tranquillity
  'cernan-last-words', //       Apollo 17 + the 50-year silence
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
