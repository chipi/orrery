/**
 * The orbit ruler's fold (UXD-024): remembered in localStorage like the Moon/Mars imagery card
 * (`orrery.surface.tierCardExpanded`), the one UI preference besides it that survives a reload.
 * Without a saved choice the ruler starts folded on short windows, where it would cover the scene.
 */
export const RULER_COLLAPSE_KEY = 'orrery.ruler.collapsed';
export const RULER_SHORT_VIEWPORT_PX = 560;

type Store = Pick<Storage, 'getItem' | 'setItem'>;

export function initialCollapsed(
  viewportH: number,
  store: Store | null = typeof localStorage === 'undefined' ? null : localStorage,
): boolean {
  try {
    const saved = store?.getItem(RULER_COLLAPSE_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    /* storage blocked: fall through to the default */
  }
  return viewportH < RULER_SHORT_VIEWPORT_PX;
}

export function saveCollapsed(
  collapsed: boolean,
  store: Store | null = typeof localStorage === 'undefined' ? null : localStorage,
): void {
  try {
    store?.setItem(RULER_COLLAPSE_KEY, collapsed ? '1' : '0');
  } catch {
    /* storage blocked: the fold lives for this view only */
  }
}
