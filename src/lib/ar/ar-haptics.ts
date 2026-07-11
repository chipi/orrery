// AR-specific haptics (#212 / RFC-021 §8). Reuses the sensory haptics dispatcher
// (Capacitor Haptics / navigator.vibrate / no-op — device capability handled
// there). AR adds three functional feedback moments on top of RFC-020 §5.2:
//
//   anchor-placed    → light  (confirms the tap landed on a surface)
//   narrator-section → light  (a section transition in the guide)
//   narrator-end     → success (the episode finished)
//
// These are AR-mode confirmation cues, so they fire whenever AR is active
// (gated only by device capability inside pulse()), independent of the sensory
// master toggle — placement feedback must work even if the ambient layer is off.
// (Narrator episode START intentionally has no pulse — the voice is the cue.)

import { pulse } from '../sensory/haptics';

export type ArHapticEvent = 'anchor-placed' | 'narrator-section' | 'narrator-end';

export function arHaptic(event: ArHapticEvent): void {
  switch (event) {
    case 'anchor-placed':
    case 'narrator-section':
      pulse('light');
      break;
    case 'narrator-end':
      pulse('success');
      break;
  }
}
