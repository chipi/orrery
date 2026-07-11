import { Capacitor } from '@capacitor/core';

/**
 * Android hardware/gesture back handling (S7 / #194, RFC-018 §10.3).
 *
 * With History-API routing the WebView already treats back as "pop the history
 * stack", so the only reason to intercept is the empty-stack case: instead of
 * the WebView swallowing the gesture (and appearing frozen), pop while there's
 * history and call `App.exitApp()` once there's nothing left to pop.
 *
 * iOS has no hardware back button — the `backButton` event only ever fires on
 * Android — and the whole thing is a no-op in the browser build.
 */

/** The action a back press maps to, given whether the WebView can go back. */
export type BackAction = 'back' | 'exit';

/** Pure decision: with history left we pop it, otherwise we exit the app. */
export function backAction(canGoBack: boolean): BackAction {
  return canGoBack ? 'back' : 'exit';
}

export function initBackButton(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let removeListener: (() => void) | undefined;
  let disposed = false;

  void import('@capacitor/app')
    .then(({ App }) => {
      if (disposed) return;
      void App.addListener('backButton', ({ canGoBack }) => {
        if (backAction(canGoBack) === 'back') window.history.back();
        else void App.exitApp();
      }).then((handle) => {
        removeListener = () => void handle.remove();
      });
    })
    // Optional native plugin — a load failure (web build, missing bridge)
    // must degrade silently, never surface as an unhandled rejection.
    .catch(() => {});

  return () => {
    disposed = true;
    removeListener?.();
  };
}
