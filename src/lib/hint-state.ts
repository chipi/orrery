/**
 * When the welcome hint (E1/W1, UXD-027) goes away: the first time the viewer does what it asks
 * (a wheel turn, a pinch, a drag, a tap on the canvas), when they close it, or after `HINT_TIMEOUT_MS`. Nothing is
 * stored: it shows again on the next visit until they interact. Pure, so it is unit-tested.
 */
export const HINT_TIMEOUT_MS = 12_000;

/** Pointer travel (CSS px) that makes a press a drag rather than a tap. */
export const HINT_DRAG_PX = 6;

export type HintEvent =
  | { type: 'wheel' }
  | { type: 'pinch' }
  | { type: 'tap' }
  | { type: 'drag'; travelPx: number }
  | { type: 'close' }
  | { type: 'timeout'; elapsedMs: number };

export function dismissesHint(e: HintEvent): boolean {
  switch (e.type) {
    case 'wheel':
    case 'pinch':
    case 'tap':
    case 'close':
      return true;
    case 'drag':
      return e.travelPx >= HINT_DRAG_PX;
    case 'timeout':
      return e.elapsedMs >= HINT_TIMEOUT_MS;
  }
}
