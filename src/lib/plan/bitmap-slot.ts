/**
 * Holds the /plan heatmap ImageBitmap across async rebuilds (#564).
 *
 * The old code closed the previous bitmap, then awaited `createImageBitmap` — a
 * redraw during that await (resize, hover) drew the closed bitmap and threw
 * `InvalidStateError: … Passed-in ImageBitmap is closed` (prod ORRERY-PROD-14).
 * Here the current bitmap stays drawable until its replacement exists, a
 * superseded build's bitmap is closed instead of shown, and `dispose()` clears
 * the reference before closing.
 */
export interface BitmapSlot<B extends { close(): void }> {
  /** The bitmap to draw, or null. Never a closed one. */
  readonly current: B | null;
  /** Swap in the result of `make()`; returns false if a newer build won. */
  replace(make: () => Promise<B>): Promise<boolean>;
  dispose(): void;
}

export function createBitmapSlot<B extends { close(): void }>(): BitmapSlot<B> {
  let current: B | null = null;
  let generation = 0;
  let disposed = false;
  return {
    get current() {
      return current;
    },
    async replace(make) {
      const mine = ++generation;
      const next = await make();
      if (disposed || mine !== generation) {
        next.close();
        return false;
      }
      const prev = current;
      current = next;
      prev?.close();
      return true;
    },
    dispose() {
      disposed = true;
      const prev = current;
      current = null;
      prev?.close();
    },
  };
}
