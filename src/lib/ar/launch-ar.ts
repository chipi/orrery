// Launch an AR scene from a flat route (#213/#208 integration). Creates a full-
// screen transparent canvas, starts the AR session, and tears everything down on
// exit or on failure — the flat scene underneath is the graceful fallback.
//
// The AR scene chunk is dynamic-imported so it never weighs on the flat bundle.

import type { ArSceneType } from './ar-scene';

let active: { canvas: HTMLCanvasElement; stop: () => void } | null = null;

/**
 * Enter AR for a globe scene. Returns true if the session started, false if the
 * device turned out not to support it (caller can surface a hint; the flat view
 * is unaffected either way). Idempotent — a second call while active is a no-op.
 */
export async function launchArScene(type: ArSceneType): Promise<boolean> {
  if (active || typeof document === 'undefined') return false;

  const canvas = document.createElement('canvas');
  canvas.className = 'ar-canvas';
  // Above the scene, below nothing — this IS the AR view.
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;z-index:9997;background:transparent;';
  document.body.appendChild(canvas);

  const { createArScene } = await import('./ar-scene');
  const cleanup = () => {
    canvas.remove();
    active = null;
  };
  const handle = createArScene(type, canvas, { onExit: cleanup });

  const ok = await handle.start();
  if (!ok) {
    cleanup();
    return false;
  }
  active = { canvas, stop: handle.stop };
  return true;
}

/** Force-exit the active AR scene (e.g. a route change). */
export function exitArScene(): void {
  active?.stop();
  active?.canvas.remove();
  active = null;
}
