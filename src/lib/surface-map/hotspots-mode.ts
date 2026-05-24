/**
 * Surface Hotspots quality mode shared by /moon + /mars (#42).
 *
 * Three levels:
 *   - 'auto': zoom-dispatcher picks tier per camera distance (default)
 *   - 'low':  force tier 0/1 only, skip texture fetches (save data/CPU)
 *   - 'high': preload everything aggressively (data-rich operators)
 *
 * URL contract: `?hotspots=low|high|auto` round-trips to state.
 * Reduced-motion + Save-Data users default to 'low' for the gentler
 * experience without an explicit choice.
 */

// Re-export HotspotMode from the dispatcher (single source of truth).
export type { HotspotMode } from '$lib/hotspot-lod-dispatcher';
import type { HotspotMode } from '$lib/hotspot-lod-dispatcher';

export function resolveInitialHotspotsMode(url: URL): HotspotMode {
  const param = url.searchParams.get('hotspots');
  if (param === 'low' || param === 'high' || param === 'auto') return param;
  // Reduced-motion users → LOW (less GPU work + lower visual motion
  // as zoom triggers tier swaps). Save-Data (Chromium) → LOW (skips
  // texture fetches).
  if (typeof window !== 'undefined') {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const saveData = conn?.saveData === true;
    if (reduced || saveData) return 'low';
  }
  return 'auto';
}

/** Cycle auto → low → high → auto. */
export function nextHotspotsMode(current: HotspotMode): HotspotMode {
  return current === 'auto' ? 'low' : current === 'low' ? 'high' : 'auto';
}
