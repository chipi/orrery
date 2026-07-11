// Haptic output for the sensory layer (PRD-017 / RFC-020 §5).
//
// Path selection: Capacitor Haptics when wrapped (iOS Taptic / Android), the web
// Vibration API on Android web, silent no-op on iOS web + desktop. Coarse by
// design — the original 12 ms-level patterns collapse to 5 semantic kinds that
// map cleanly onto Capacitor's impact/notification styles.

import { Capacitor } from '@capacitor/core';

export type HapticKind = 'light' | 'medium' | 'heavy' | 'success' | 'warning';

/** Web Vibration API fallback patterns (ms), Android web only. */
const WEB_PATTERN: Record<HapticKind, number | number[]> = {
  light: 10,
  medium: 18,
  heavy: 28,
  success: [10, 30, 10],
  warning: [28, 40, 28],
};

export function pulse(kind: HapticKind): void {
  if (typeof window === 'undefined') return;

  if (Capacitor.isNativePlatform()) {
    void import('@capacitor/haptics')
      .then(({ Haptics, ImpactStyle, NotificationType }) => {
        if (kind === 'success') return Haptics.notification({ type: NotificationType.Success });
        if (kind === 'warning') return Haptics.notification({ type: NotificationType.Warning });
        const style =
          kind === 'heavy'
            ? ImpactStyle.Heavy
            : kind === 'medium'
              ? ImpactStyle.Medium
              : ImpactStyle.Light;
        return Haptics.impact({ style });
      })
      // Optional native plugin — degrade silently (web build / missing bridge).
      .catch(() => {});
    return;
  }

  if ('vibrate' in navigator) {
    navigator.vibrate(WEB_PATTERN[kind]);
  }
  // iOS web / desktop: no haptics path — silent no-op.
}
