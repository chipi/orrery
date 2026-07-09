/**
 * `use:roving` — drop-in roving-tabindex + arrow-key navigation for a list
 * container (RFC-031 S1). Turns a group of focusable children into a single Tab
 * stop where arrows move *within* the group (WAI-ARIA roving-tabindex; WCAG
 * 2.4.3). A TV D-pad emits the same arrow/Enter events, so this is the remote
 * navigation for these lists too.
 *
 *   <div use:roving={{ orientation: 'vertical' }}>
 *     <button>…</button> <button>…</button> …
 *   </div>
 *
 * DOM-based (reads live children + their geometry) so it composes with dynamic
 * `{#each}` lists without per-item bookkeeping. For canvas mirrors that need
 * reactive projected positions, use `createRovingFocus` instead.
 */
import { stepInOrder, nearestInDirection, type RovingItem } from './roving-focus.svelte';

export interface RovingActionOptions {
  /** `list` (order-based, default) or `spatial` (nearest-by-geometry). */
  mode?: 'list' | 'spatial';
  /** List mode: which arrow axis moves focus. */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Wrap past the ends (list mode). */
  wrap?: boolean;
  /** CSS selector for the focusable items. Defaults to enabled buttons/links/[tabindex]. */
  itemSelector?: string;
}

const DEFAULT_SELECTOR =
  'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"]):not([disabled]), [role="button"]:not([aria-disabled="true"])';

export function roving(node: HTMLElement, options: RovingActionOptions = {}) {
  let opts = { mode: 'list' as const, orientation: 'vertical' as const, wrap: false, ...options };

  const els = (): HTMLElement[] =>
    Array.from(node.querySelectorAll<HTMLElement>(opts.itemSelector ?? DEFAULT_SELECTOR)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );

  const idOf = (el: HTMLElement, i: number) => el.id || `roving-${i}`;

  /** Snapshot the current items as engine `RovingItem`s (with geometry for spatial). */
  const snapshot = (): { items: RovingItem[]; map: Map<string, HTMLElement> } => {
    const map = new Map<string, HTMLElement>();
    const items = els().map((el, i) => {
      const id = idOf(el, i);
      map.set(id, el);
      if (opts.mode === 'spatial') {
        const r = el.getBoundingClientRect();
        return { id, pos: { x: r.left + r.width / 2, y: r.top + r.height / 2 } };
      }
      return { id };
    });
    return { items, map };
  };

  /** Make `el` the sole tabbable item (roving tabindex) without stealing focus. */
  const setRoving = (current: HTMLElement | null) => {
    const list = els();
    const target = current && list.includes(current) ? current : list[0];
    for (const el of list) el.tabIndex = el === target ? 0 : -1;
  };

  const currentEl = (): HTMLElement | null => {
    const a = document.activeElement as HTMLElement | null;
    return a && node.contains(a) ? a : null;
  };

  const onKeydown = (e: KeyboardEvent) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const dirKey: Record<string, 'up' | 'down' | 'left' | 'right'> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
    };
    const cur = currentEl();
    const { items, map } = snapshot();
    const curId = cur ? ([...map.entries()].find(([, el]) => el === cur)?.[0] ?? null) : null;

    if (e.key in dirKey) {
      const dir = dirKey[e.key];
      let nextId: string | null;
      if (opts.mode === 'spatial') {
        nextId = nearestInDirection(items, curId, dir);
      } else {
        const axisMatch =
          opts.orientation === 'both' ||
          (opts.orientation === 'vertical' && (dir === 'up' || dir === 'down')) ||
          (opts.orientation === 'horizontal' && (dir === 'left' || dir === 'right'));
        if (!axisMatch) return;
        nextId = stepInOrder(items, curId, dir === 'down' || dir === 'right' ? 1 : -1, opts.wrap);
      }
      const el = nextId ? map.get(nextId) : null;
      if (el) {
        e.preventDefault();
        setRoving(el);
        el.focus();
      }
    } else if (e.key === 'Home' || e.key === 'End') {
      const el = e.key === 'Home' ? els()[0] : els().at(-1);
      if (el) {
        e.preventDefault();
        setRoving(el);
        el.focus();
      }
    }
  };

  // Keep the tabbable item in sync as focus moves (e.g. via mouse/tap).
  const onFocusin = (e: FocusEvent) => {
    const t = e.target as HTMLElement;
    if (els().includes(t)) setRoving(t);
  };

  // Re-init roving when the list changes (dynamic {#each}).
  const observer = new MutationObserver(() => setRoving(currentEl()));
  observer.observe(node, { childList: true, subtree: true });

  node.addEventListener('keydown', onKeydown);
  node.addEventListener('focusin', onFocusin);
  setRoving(null);

  return {
    update(next: RovingActionOptions) {
      opts = { mode: 'list', orientation: 'vertical', wrap: false, ...next };
      setRoving(currentEl());
    },
    destroy() {
      observer.disconnect();
      node.removeEventListener('keydown', onKeydown);
      node.removeEventListener('focusin', onFocusin);
    },
  };
}
