/**
 * Shared state between the "What you're seeing" list (site panel) and the rings
 * (flat view + 3D detail patch): which annotation is highlighted, which one has
 * its explanation open. Rune-store singleton, same shape as viewport.svelte.ts.
 */
export const annotationUi = $state<{ highlightId: string | null; openId: string | null }>({
  highlightId: null,
  openId: null,
});

export function resetAnnotationUi(): void {
  annotationUi.highlightId = null;
  annotationUi.openId = null;
}
