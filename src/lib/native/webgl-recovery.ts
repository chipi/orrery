import { Capacitor } from '@capacitor/core';

/**
 * WebGL context-loss recovery (S8 / #195, RFC-018 §11.2).
 *
 * iOS WKWebView aggressively drops the WebGL context when the app backgrounds;
 * Three.js does not auto-restore, so a user who leaves a 3D route (`/explore`,
 * `/fly`, `/earth`, `/moon`, `/mars`, `/iss`, `/tiangong`) and returns finds a
 * blank or frozen scene.
 *
 * The smooth fix is a per-scene `reinit()` factor-out across all 7 scenes (the
 * epic's 7 sub-tasks) — deferred. This MVP recovery is blunt but reliable: when
 * a lost context is detected (on the `webglcontextlost`/`restored` events, or on
 * app foreground), reload the route so the scene rebuilds cleanly. No blank
 * scene; the cost is a reload flash + loss of in-scene camera state.
 *
 * No-op in the browser build.
 */
export function initWebglRecovery(): () => void {
  if (!Capacitor.isNativePlatform()) return () => {};

  let disposed = false;

  const anyContextLost = (): boolean => {
    for (const c of document.querySelectorAll('canvas')) {
      const gl = c.getContext('webgl2') ?? c.getContext('webgl');
      if (gl && (gl as WebGLRenderingContext).isContextLost()) return true;
    }
    return false;
  };

  const reload = () => {
    if (!disposed) window.location.reload();
  };

  // preventDefault signals the browser to attempt restoration; the follow-up
  // `restored` event fires once the GL objects are gone — reload to rebuild.
  const onLost = (e: Event) => e.preventDefault();
  document.addEventListener('webglcontextlost', onLost, true);
  document.addEventListener('webglcontextrestored', reload, true);

  let removeAppListener: (() => void) | undefined;
  void import('@capacitor/app')
    .then(({ App }) => {
      if (disposed) return;
      void App.addListener('appStateChange', ({ isActive }) => {
        if (isActive && anyContextLost()) reload();
      }).then((handle) => {
        removeAppListener = () => void handle.remove();
      });
    })
    // Optional native plugin — a load failure (web build, missing bridge)
    // must degrade silently, never surface as an unhandled rejection.
    .catch(() => {});

  return () => {
    disposed = true;
    document.removeEventListener('webglcontextlost', onLost, true);
    document.removeEventListener('webglcontextrestored', reload, true);
    removeAppListener?.();
  };
}
