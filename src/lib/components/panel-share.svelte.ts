import { getContext, setContext } from 'svelte';

/**
 * Share lives in the panel's action row, not the header (operator 2026-11-13, UXD-018): Panel
 * provides its onShare here, every PanelActions inside draws it as its last chip, and Panel draws
 * an action row of its own for Share when no PanelActions is mounted.
 */
export type PanelShare = {
  readonly share: (() => void) | undefined;
  /** How many PanelActions rows are mounted inside this panel. */
  rows: number;
};

const KEY = Symbol('panel-share');

export function providePanelShare(getShare: () => (() => void) | undefined): PanelShare {
  const state = $state({ rows: 0 });
  const ctx: PanelShare = {
    get share() {
      return getShare();
    },
    get rows() {
      return state.rows;
    },
    set rows(n: number) {
      state.rows = n;
    },
  };
  setContext(KEY, ctx);
  return ctx;
}

export const usePanelShare = (): PanelShare | undefined => getContext<PanelShare>(KEY);
