/**
 * Window-level ESC key handler for panorama (ground-view) exit (#42).
 *
 * Both /moon and /mars listen for ESC while panorama is active and
 * call their per-route exit function. Window-scoped so the user can
 * be focused on the detail-panel button bar and still hit ESC.
 *
 * Returns a teardown function the caller wires into its cleanup.
 */
export function bindPanoramaEscape({
  isActive,
  onExit,
}: {
  isActive: () => boolean;
  onExit: () => void;
}): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isActive()) onExit();
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}
