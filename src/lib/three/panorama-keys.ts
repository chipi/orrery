/**
 * Window-level ESC key handler for panorama (ground-view) exit (#42).
 *
 * Both /moon and /mars listen for ESC while panorama is active and
 * call their per-route exit function. Window-scoped so the user can
 * be focused on the detail-panel button bar and still hit ESC.
 *
 * Capture phase + stopPropagation: the detail Panel that HOSTS the
 * Stand-at-site / exit-panorama button also wires a window Escape-to-close
 * (Panel.svelte). A single Escape meant to leave the panorama would then
 * both exit the panorama AND close the panel — dropping the Stand-at-site
 * button (mars-tier3 e2e failed on CI: "element(s) not found" after exit,
 * because the panel closed). Handling Escape in the CAPTURE phase lets us
 * exit the panorama and stop the event BEFORE it reaches Panel's
 * bubble-phase listener, order-independently. When no panorama is active
 * we don't touch the event, so Escape still closes the panel normally.
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
    if (e.key === 'Escape' && isActive()) {
      e.stopPropagation();
      onExit();
    }
  };
  window.addEventListener('keydown', handler, { capture: true });
  return () => window.removeEventListener('keydown', handler, { capture: true });
}
