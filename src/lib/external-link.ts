import { Capacitor } from '@capacitor/core';

/**
 * Open an external URL (S5 / RFC-018 §7). Under Capacitor the app WebView is
 * locked to app-bound domains (capacitor.config `limitsNavigationsToAppBoundDomains`),
 * so a normal navigation to an off-origin link is blocked. Route it through
 * `@capacitor/browser` (SFSafariViewController / Chrome Custom Tab) so the user
 * stays in the app and can return. In the browser build this is a normal
 * new-tab `window.open`, unchanged.
 */
// Only ever hand a navigable web/contact scheme to the opener. Blocks
// `javascript:`, `data:`, `file:`, `vbscript:` etc. from reaching window.open /
// the in-app browser — defence-in-depth even though today's callers pass only
// curated hrefs.
const SAFE_SCHEME = /^(https?|mailto|tel):/i;

export async function openExternal(url: string): Promise<void> {
  if (!SAFE_SCHEME.test(url)) return;
  if (!Capacitor.isNativePlatform()) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  // Light tactile confirmation on the tap (S4 haptics). Best-effort.
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* haptics unavailable — ignore */
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url, presentationStyle: 'popover' });
}
