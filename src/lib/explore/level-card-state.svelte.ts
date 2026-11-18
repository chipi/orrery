// The /explore level card's open/folded state (UXD-027), shared by its fold chip in the scale
// navigator row and the card body that hangs under that row (plan D15: one control, not two).
// Open on a pointer device, folded on a touch one or a small window; the choice is remembered.

/** The card body's id, for the fold chip's aria-controls. */
export const levelCardBodyId = 'explore-level-card-body';

const STORE_KEY = 'orrery.explore.levelCardExpanded';

function initialExpanded(): boolean {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved === '1') return true;
    if (saved === '0') return false;
  } catch {
    /* storage blocked: fall through to the default */
  }
  const tight =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.(
      '(hover: none), (pointer: coarse), (max-width: 899px), (max-height: 559px)',
    ).matches;
  return !tight;
}

export type LevelCardState = { readonly expanded: boolean; toggle: () => void };

export function createLevelCardState(): LevelCardState {
  let expanded = $state(initialExpanded());
  return {
    get expanded() {
      return expanded;
    },
    toggle() {
      expanded = !expanded;
      try {
        localStorage.setItem(STORE_KEY, expanded ? '1' : '0');
      } catch {
        /* storage blocked: the choice lives for this view only */
      }
    },
  };
}
