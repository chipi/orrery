import { Capacitor } from '@capacitor/core';

/**
 * Open an external URL (S5 / RFC-018 §7). Under Capacitor the app WebView is
 * locked to app-bound domains (capacitor.config `limitsNavigationsToAppBoundDomains`),
 * so a normal navigation to an off-origin link is blocked. Route it through
 * `@capacitor/browser` (SFSafariViewController / Chrome Custom Tab) so the user
 * stays in the app and can return. In the browser build this is a normal
 * new-tab `window.open`, unchanged.
 */
export async function openExternal(url: string): Promise<void> {
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
