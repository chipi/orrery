/**
 * URL deep-link sync for the Tier-3 panorama view (PRD-022 / ADR-074,
 * #286 Phase 3B).
 *
 * Active panorama state (entry id, camera yaw/pitch) is reflected
 * into URL query params `?pano=<entry-id>&yaw=<deg>&pitch=<deg>` so:
 *   - reload while inside panorama mode restores the exact view
 *   - share-link captures the slice the sender was looking at
 *   - back-button navigates away cleanly (replaceState — no entry
 *     per yaw drag)
 *
 * Behaviour mirrors `hotspots-url-sync.ts`:
 *   - replaceState (no history pollution)
 *   - keepFocus + noScroll
 *   - default = strip params (panorama not active → URL stays clean)
 *
 * Throttle the write at the caller — yaw/pitch update per-frame
 * while dragging; we don't want 60 URL writes per second.
 *
 * Uses SvelteKit's SHALLOW `replaceState` (not `goto`). The docstring
 * always intended "replaceState — no history pollution", but the impl
 * used `goto(url, { replaceState: true })`, which is a FULL client
 * navigation: it re-runs the page load and re-initialises the surface
 * scene. On panorama EXIT that reset `selected` and closed the detail
 * panel — which, under a loaded docker-e2e runner, failed to re-open in
 * time, so the Stand-at-site button never came back (mars-tier3 e2e).
 * Shallow `replaceState` updates the URL + page.state without any
 * navigation, so the scene + selection stay intact and the button
 * restores from `panoramaActive = false` alone. It also fixes the
 * per-drag-frame full-navigation the docstring warned about.
 */
import { replaceState } from '$app/navigation';
import { page } from '$app/state';

export interface PanoramaUrlState {
  entryId: string | null;
  yawDeg: number;
  pitchDeg: number;
}

/**
 * Write panorama state into the URL. Caller is expected to throttle
 * for drag events. Pass `null` for entryId to strip ALL three params
 * (panorama exit).
 */
export function syncPanoramaUrl(currentUrl: URL, state: PanoramaUrlState | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(currentUrl);
  const currentPano = url.searchParams.get('pano');
  const currentYaw = url.searchParams.get('yaw');
  const currentPitch = url.searchParams.get('pitch');

  if (state === null || state.entryId === null) {
    if (currentPano === null && currentYaw === null && currentPitch === null) return;
    url.searchParams.delete('pano');
    url.searchParams.delete('yaw');
    url.searchParams.delete('pitch');
    replaceState(url, page.state);
    return;
  }

  // Round yaw/pitch to 1 decimal — enough precision for re-positioning
  // (~6 ′ angular resolution) without param churn from sub-degree
  // floating noise.
  const yawStr = state.yawDeg.toFixed(1);
  const pitchStr = state.pitchDeg.toFixed(1);

  if (currentPano === state.entryId && currentYaw === yawStr && currentPitch === pitchStr) return;

  url.searchParams.set('pano', state.entryId);
  url.searchParams.set('yaw', yawStr);
  url.searchParams.set('pitch', pitchStr);
  replaceState(url, page.state);
}

/**
 * Parse panorama state from a URL. Returns null when no params present
 * or when params are malformed (caller falls back to defaults).
 */
export function readPanoramaUrlState(url: URL): PanoramaUrlState | null {
  const entryId = url.searchParams.get('pano');
  const yawRaw = url.searchParams.get('yaw');
  const pitchRaw = url.searchParams.get('pitch');
  // entryId is optional — older URLs might carry only yaw/pitch from a
  // single-pano site. Treat absent entryId as "use default entry".
  if (yawRaw === null && pitchRaw === null && entryId === null) return null;
  const yawDeg = yawRaw !== null ? Number.parseFloat(yawRaw) : 0;
  const pitchDeg = pitchRaw !== null ? Number.parseFloat(pitchRaw) : 0;
  if (!Number.isFinite(yawDeg) || !Number.isFinite(pitchDeg)) return null;
  return { entryId: entryId ?? null, yawDeg, pitchDeg };
}
