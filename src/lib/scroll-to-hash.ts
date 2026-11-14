/**
 * Scroll to the element `location.hash` names. A page whose sections draw after an async
 * fetch (/credits, /colophon) calls this once they are in the DOM: the browser's own hash
 * scroll fired at load, before the target existed. A hash that names nothing is ignored.
 *
 * The scroll is repeated after two frames: on /credits the first one lands 1,751 px short
 * on a phone (the blocks above the target are re-measured after their first paint; a second
 * scrollIntoView holds, measured 2026-11-14).
 */
export async function scrollToHash(): Promise<void> {
  const raw = location.hash.slice(1);
  if (!raw) return;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // a malformed escape: try the raw text
  }
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView();
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  el.scrollIntoView();
}
