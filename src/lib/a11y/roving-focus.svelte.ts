/**
 * Shared roving / spatial focus engine (RFC-031 S1).
 *
 * One focus model for three surfaces — desktop keyboard, screen reader, and the
 * Google-TV D-pad remote (a remote *is* a keyboard: ←→↑↓ + Enter/Back). Used by
 * both:
 *   - **lists** (nav, missions, fleet, station modules) — order-based movement;
 *   - **canvas mirrors** (the hidden `<button>` per planet/module, ADR-025 /
 *     ADR-056) — geometry-based movement between on-screen positions.
 *
 * Roving tabindex: exactly one item in the group is tabbable (`tabindex=0`), the
 * rest are `-1`, so Tab enters/leaves the group as a single stop and arrows move
 * *within* it (WAI-ARIA roving-tabindex pattern; WCAG 2.4.3 focus order).
 *
 * The movement math is pure + exported for unit tests; the reactive wrapper
 * (`createRovingFocus`) binds it to Svelte-5 `$state`.
 */

export type Direction = 'up' | 'down' | 'left' | 'right' | 'next' | 'prev';

export interface RovingItem {
  id: string;
  /** Screen-space centre for spatial (canvas) navigation; omit for list mode. */
  pos?: { x: number; y: number };
  /** Explicit order for list mode; defaults to registration order. */
  order?: number;
  disabled?: boolean;
}

export interface RovingFocusOptions {
  /** `list` = order-based (default), `spatial` = nearest-in-direction by geometry. */
  mode?: 'list' | 'spatial';
  /** List mode: which arrow axis moves. Ignored in spatial mode (all 4 move). */
  orientation?: 'vertical' | 'horizontal' | 'both';
  /** Wrap around the ends (list mode). */
  wrap?: boolean;
  onActivate?: (id: string) => void;
  onChange?: (id: string | null) => void;
}

// ─── Pure movement logic (unit-tested, no DOM) ───────────────────────────────

const enabled = (items: RovingItem[]) => items.filter((i) => !i.disabled);

const ordered = (items: RovingItem[]) =>
  enabled(items)
    .map((it, i) => ({ it, order: it.order ?? i }))
    .sort((a, b) => a.order - b.order)
    .map((x) => x.it);

/** List mode: step to the next/prev enabled item, optionally wrapping. */
export function stepInOrder(
  items: RovingItem[],
  currentId: string | null,
  step: 1 | -1,
  wrap = false,
): string | null {
  const list = ordered(items);
  if (list.length === 0) return null;
  const idx = list.findIndex((i) => i.id === currentId);
  if (idx === -1) return list[0].id;
  let next = idx + step;
  if (next < 0) next = wrap ? list.length - 1 : 0;
  else if (next >= list.length) next = wrap ? 0 : list.length - 1;
  return list[next].id;
}

/**
 * Spatial mode: nearest enabled item in `dir` from the current one, by screen
 * geometry. Candidates must lie in the half-plane of the direction; score
 * favours travel along the primary axis and penalises cross-axis drift (the
 * standard TV / CSS-spatial-navigation nearest-neighbour heuristic).
 */
export function nearestInDirection(
  items: RovingItem[],
  currentId: string | null,
  dir: 'up' | 'down' | 'left' | 'right',
): string | null {
  const list = enabled(items).filter((i) => i.pos);
  if (list.length === 0) return null;
  const cur = list.find((i) => i.id === currentId);
  if (!cur?.pos) return list[0].id;

  const CROSS_PENALTY = 2;
  let best: { id: string; score: number } | null = null;
  for (const it of list) {
    if (it.id === currentId || !it.pos) continue;
    const dx = it.pos.x - cur.pos.x;
    const dy = it.pos.y - cur.pos.y;
    // Primary-axis progress must be positive in the chosen direction.
    let along: number, cross: number;
    if (dir === 'right') (along = dx), (cross = dy);
    else if (dir === 'left') (along = -dx), (cross = dy);
    else if (dir === 'down') (along = dy), (cross = dx);
    else (along = -dy), (cross = dx); // up
    if (along <= 0) continue;
    const score = along + Math.abs(cross) * CROSS_PENALTY;
    if (!best || score < best.score) best = { id: it.id, score };
  }
  return best?.id ?? null;
}

// ─── Reactive wrapper (Svelte 5) ─────────────────────────────────────────────

export function createRovingFocus(opts: RovingFocusOptions = {}) {
  const mode = opts.mode ?? 'list';
  const orientation = opts.orientation ?? 'vertical';
  const wrap = opts.wrap ?? false;

  let items = $state<RovingItem[]>([]);
  let currentId = $state<string | null>(null);

  const setCurrent = (id: string | null) => {
    if (id === currentId) return;
    currentId = id;
    opts.onChange?.(id);
  };

  const resolve = (dir: Direction): string | null => {
    if (dir === 'next') return stepInOrder(items, currentId, 1, wrap);
    if (dir === 'prev') return stepInOrder(items, currentId, -1, wrap);
    if (mode === 'spatial') return nearestInDirection(items, currentId, dir);
    // List mode maps arrows onto next/prev along the configured axis.
    const forward = dir === 'down' || dir === 'right';
    const axisMatches =
      orientation === 'both' ||
      (orientation === 'vertical' && (dir === 'up' || dir === 'down')) ||
      (orientation === 'horizontal' && (dir === 'left' || dir === 'right'));
    if (!axisMatches) return currentId;
    return stepInOrder(items, currentId, forward ? 1 : -1, wrap);
  };

  return {
    get items() {
      return items;
    },
    get currentId() {
      return currentId;
    },
    register(item: RovingItem) {
      const i = items.findIndex((x) => x.id === item.id);
      if (i === -1) items.push(item);
      else items[i] = item;
      if (currentId === null && !item.disabled) setCurrent(item.id);
    },
    update(id: string, patch: Partial<RovingItem>) {
      const i = items.findIndex((x) => x.id === id);
      if (i !== -1) items[i] = { ...items[i], ...patch };
    },
    unregister(id: string) {
      items = items.filter((x) => x.id !== id);
      if (currentId === id) setCurrent(items[0]?.id ?? null);
    },
    setCurrent,
    /** Move focus in a direction; returns the new current id (or unchanged). */
    move(dir: Direction): string | null {
      const next = resolve(dir);
      if (next) setCurrent(next);
      return next;
    },
    activate() {
      if (currentId) opts.onActivate?.(currentId);
    },
    /** Roving tabindex: 0 for the current item, -1 for the rest. */
    tabindexFor(id: string): 0 | -1 {
      return id === currentId ? 0 : -1;
    },
    /**
     * Keydown handler for the group container. Returns true if it consumed the
     * event (caller should then `preventDefault`). Maps arrows → move,
     * Enter/Space → activate, Home/End → first/last.
     */
    handleKeydown(e: KeyboardEvent): boolean {
      switch (e.key) {
        case 'ArrowUp':
          return this.move('up') !== null;
        case 'ArrowDown':
          return this.move('down') !== null;
        case 'ArrowLeft':
          return this.move('left') !== null;
        case 'ArrowRight':
          return this.move('right') !== null;
        case 'Home':
          setCurrent(ordered(items)[0]?.id ?? null);
          return true;
        case 'End': {
          const l = ordered(items);
          setCurrent(l[l.length - 1]?.id ?? null);
          return true;
        }
        case 'Enter':
        case ' ':
          this.activate();
          return true;
        default:
          return false;
      }
    },
  };
}
