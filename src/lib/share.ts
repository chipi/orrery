import { Capacitor } from '@capacitor/core';
import { STREAM_ORIGIN } from './asset-url';

/**
 * The URL to share. On Capacitor `location.href` is the internal
 * `capacitor://localhost` (Android: `https://localhost`) origin — useless to a
 * recipient — so rebuild a public URL against the deployed origin. Pure —
 * unit-tested. `loc` is a `Location`-shaped object.
 */
export function publicShareUrl(
  loc: Pick<Location, 'href' | 'pathname' | 'search' | 'hash'>,
  mobile: boolean,
): string {
  return mobile ? `${STREAM_ORIGIN}${loc.pathname}${loc.search}${loc.hash}` : loc.href;
}

/**
 * Share the current view (S4 / PRD-015 S1 — "Share this mission arc"). Shares
 * the current URL, which deep-links back to the exact route + query (e.g.
 * `/fly?mission=curiosity`). Three tiers:
 *   - Capacitor  → native share sheet via @capacitor/share (+ a light haptic)
 *   - Web share  → navigator.share where available
 *   - Fallback   → copy the link to the clipboard
 *
 * Returns 'shared' | 'copied' | 'cancelled' so the caller can surface feedback.
 */
export async function shareCurrent(): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = publicShareUrl(window.location, Capacitor.isNativePlatform());
  const title = document.title || 'Orrery';

  if (Capacitor.isNativePlatform()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* haptics unavailable */
    }
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share({ title, text: title, url, dialogTitle: title });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }

  try {
    await navigator.clipboard?.writeText(url);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
