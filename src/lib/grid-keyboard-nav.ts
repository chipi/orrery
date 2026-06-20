/**
 * Shared 2-D roving keyboard navigation for the entity card grids
 * (/missions + /fleet — both `<ul class="entity-card-grid">` of
 * `<button class="card">`).
 *
 * Same model as the station/legend list nav: arrows move DOM FOCUS ONLY
 * (the committed selection + open panel stay put until Enter/click), and
 * moving focus scrolls the target card into view — so the keyboard
 * "drives the scroll" instead of the browser's default arrow-scroll.
 * Enter/Space open the focused card via its native onclick.
 *
 *   ← / →   previous / next card (clamped at the grid ends)
 *   ↑ / ↓   one row up / down (column count read live from layout)
 *   Home    first card        End   last card
 *   Esc     onEscape() (close the detail panel)
 *
 * The row stride is derived at keypress time by counting the cards that
 * share the first card's offsetTop — i.e. the live column count of the
 * responsive grid — so it stays correct across viewport sizes without a
 * resize observer.
 *
 * Wire on each card button: `onkeydown={(e) => handleGridKeydown(e, closePanel)}`.
 */
export function handleGridKeydown(e: KeyboardEvent, onEscape: () => void): void {
  const btn = e.currentTarget as HTMLButtonElement | null;
  if (!btn) return;

  if (e.key === 'Escape') {
    onEscape();
    return;
  }

  const grid = btn.closest('ul.entity-card-grid');
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll<HTMLButtonElement>('button.card'));
  const n = cards.length;
  const cur = cards.indexOf(btn);
  if (n === 0 || cur === -1) return;

  // Live column count: how many leading cards share row 1's top edge.
  // Use viewport-relative getBoundingClientRect().top, NOT offsetTop —
  // each card's offsetParent is its own positioned <li>, so offsetTop is
  // identical for every card and useless for row detection. Round to
  // absorb sub-pixel layout jitter.
  const rowTop = (el: HTMLElement) => Math.round(el.getBoundingClientRect().top);
  const firstTop = rowTop(cards[0]);
  let cols = 0;
  for (const c of cards) {
    if (rowTop(c) === firstTop) cols++;
    else break;
  }
  if (cols < 1) cols = 1;

  let next = cur;
  switch (e.key) {
    case 'ArrowRight':
      next = Math.min(cur + 1, n - 1);
      break;
    case 'ArrowLeft':
      next = Math.max(cur - 1, 0);
      break;
    case 'ArrowDown':
      // Down a row; if there's no card directly below, stay put.
      next = cur + cols < n ? cur + cols : cur;
      break;
    case 'ArrowUp':
      next = cur - cols >= 0 ? cur - cols : cur;
      break;
    case 'Home':
      next = 0;
      break;
    case 'End':
      next = n - 1;
      break;
    default:
      return;
  }

  e.preventDefault(); // suppress the default arrow-scroll; focus() scrolls precisely
  if (next !== cur) cards[next]?.focus();
}
