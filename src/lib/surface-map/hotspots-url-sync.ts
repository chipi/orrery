/**
 * URL deep-link sync for the surface-map hotspots LOD toggle (#42).
 *
 * /moon and /mars both reflect the current HotspotMode into a
 * `?hotspots=` query param so the choice survives reload + share. Pre-
 * extraction each route inlined the same 14-line block inside its
 * mode-sync $effect.
 *
 * The $effect itself stays in the route (Svelte requires effects to
 * run in component scope and we want `setHotspotMode` adjacent to the
 * URL write). The pure URL-mutation half lives here.
 *
 * Behaviour: default mode 'auto' strips the param entirely; any other
 * mode writes it explicitly. replaceState + keepFocus + noScroll so
 * the back-button history stays clean and the canvas keeps focus.
 */
import { goto } from '$app/navigation';
import type { HotspotMode } from '$lib/hotspot-lod-dispatcher';

export function syncHotspotsModeUrl(currentUrl: URL, mode: HotspotMode): void {
  if (typeof window === 'undefined') return;
  const url = new URL(currentUrl);
  const current = url.searchParams.get('hotspots');
  if (mode === 'auto') {
    if (current !== null) {
      url.searchParams.delete('hotspots');
      void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
    }
  } else if (current !== mode) {
    url.searchParams.set('hotspots', mode);
    void goto(url, { replaceState: true, keepFocus: true, noScroll: true });
  }
}
