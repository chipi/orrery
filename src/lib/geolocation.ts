/**
 * Observer geolocation for the sky-pointing AR mode (#393).
 *
 * Prefers a precise fix from the browser Geolocation API — which works inside
 * the Capacitor WKWebView once Info.plist carries NSLocationWhenInUseUsageDescription
 * (iOS) / the AndroidManifest carries ACCESS_COARSE_LOCATION (wrapped Android),
 * and needs no extra Capacitor plugin. Falls back to a coarse timezone-derived
 * lat/lon (`viewerLatLon`), then to [0,0]. Precision only matters at the ~1°
 * level for the Moon's parallax; city-level is fine for "point roughly there".
 */
import { viewerLatLon } from './viewer-location';

export interface ObserverLocation {
  latDeg: number;
  lonDeg: number;
  /** How the fix was obtained — surfaced in the UI so the user knows. */
  source: 'gps' | 'timezone' | 'default';
}

const TIMEOUT_MS = 8000;

/** Best available observer location, resolving the fallback chain. */
export async function getObserverLocation(): Promise<ObserverLocation> {
  const precise = await getPreciseLocation();
  if (precise) return { ...precise, source: 'gps' };

  const tz = viewerLatLon();
  if (tz) return { latDeg: tz.latDeg, lonDeg: tz.lonDeg, source: 'timezone' };

  return { latDeg: 0, lonDeg: 0, source: 'default' };
}

/** A precise fix, or null if unavailable / denied / timed out. */
function getPreciseLocation(): Promise<{ latDeg: number; lonDeg: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latDeg: p.coords.latitude, lonDeg: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 300_000 },
    );
  });
}
