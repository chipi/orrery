// AR narrator auto-play (#211 / RFC-021 §6, anchor N-B / NE-B).
//
// After the user places the scene, the Curator/Guide episode auto-plays 2s later
// (NE-B: let them look first). Two things are pure reuse, not new code:
//  • Omniscient voice (N-B): the narrator is the existing stereo <audio> element,
//    centred in the head — NOT a PannerNode child — so it stays central as the
//    user walks around. Nothing to position.
//  • Ducking (§6.1): the sensory audio-engine already ducks under audio-bus
//    'play'; AR's spatial panners hang off the SAME master gain, so they duck
//    too — automatically, no AR-specific mechanism.
//
// This module only owns the per-scene Guide-episode mapping + the 2s scheduler.

import type { ArSceneType } from './ar-scene';

const GUIDE_EPISODE: Record<ArSceneType, string> = {
  explore: 'guide-explore',
  earth: 'guide-earth',
  moon: 'guide-moon',
  mars: 'guide-mars',
};

/** The Guide episode id anchoring a globe scene's AR narration. */
export function guideEpisodeId(scene: ArSceneType): string {
  return GUIDE_EPISODE[scene];
}

export interface ArNarratorHandle {
  cancel(): void;
}

/**
 * Schedule the scene's Guide narration to auto-play `delayMs` (default 2s) after
 * placement. `play(episodeId)` loads + plays via the audio system — ducking then
 * follows automatically via the audio-bus contract.
 */
export function scheduleArNarration(
  scene: ArSceneType,
  play: (episodeId: string) => void,
  delayMs = 2000,
): ArNarratorHandle {
  const timer = setTimeout(() => play(guideEpisodeId(scene)), delayMs);
  return { cancel: () => clearTimeout(timer) };
}
