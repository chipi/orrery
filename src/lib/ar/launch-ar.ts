// Launch an AR scene from a flat route (#213/#208 integration). Creates a full-
// screen transparent canvas, starts the AR session, and tears everything down on
// exit or on failure — the flat scene underneath is the graceful fallback.
//
// The AR scene chunk is dynamic-imported so it never weighs on the flat bundle.

import type { ArSceneType } from './ar-scene';
import { audio } from '../audio-state.svelte';
import { audioRegistry } from '../audio-registry.svelte';

let active: {
  canvas: HTMLCanvasElement;
  exitBtn: HTMLButtonElement;
  hint: HTMLDivElement;
  stop: () => void;
} | null = null;

// What the user is placing, for the on-screen instruction.
const SCENE_LABEL: Record<ArSceneType, string> = {
  explore: 'the Solar System',
  earth: 'Earth',
  moon: 'the Moon',
  mars: 'Mars',
};

/** Remove the AR overlay DOM + restore the page (idempotent). */
function teardownArDom(
  canvas: HTMLCanvasElement,
  exitBtn: HTMLButtonElement,
  hint: HTMLDivElement,
): void {
  canvas.remove();
  exitBtn.remove();
  hint.remove();
  document.documentElement.classList.remove('ar-active');
}

/** Load + play the scene's Guide episode through the app's real audio player
 *  (the mounted AudioOverlay drives the <audio> element off this state, and the
 *  audio-bus 'play' ducks the AR spatial voices automatically). Resolves the
 *  episode by its guide id, falling back to the route's Guide piece. */
async function playGuideNarration(type: ArSceneType, episodeId: string): Promise<void> {
  await audioRegistry.load();
  const route = type === 'explore' ? '/explore' : `/${type}`;
  const ep =
    audioRegistry.byId(episodeId) ??
    audioRegistry.forRoute(route).find((e) => e.persona === 'guide');
  if (!ep) return;
  audio.loadEpisode(ep);
  audio.play();
}

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

  // Exit-AR affordance (there's no other way out once immersed).
  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'ar-exit-btn';
  exitBtn.textContent = 'Exit AR';
  exitBtn.onclick = () => exitArScene();
  document.body.appendChild(exitBtn);

  // Placement instruction — dismissed once the user taps a surface (onPlaced).
  const hint = document.createElement('div');
  hint.className = 'ar-hint';
  hint.textContent = `Point at a surface and tap to place ${SCENE_LABEL[type]}`;
  document.body.appendChild(hint);

  // Make the page transparent + hide the flat app content so the native ARKit
  // camera (rendered behind the transparent WebView) shows through. Removed on
  // teardown. See `.ar-active` rules in app.css.
  document.documentElement.classList.add('ar-active');

  const { createArScene } = await import('./ar-scene');
  const cleanup = () => {
    teardownArDom(canvas, exitBtn, hint);
    active = null;
  };
  const handle = createArScene(type, canvas, {
    onExit: cleanup,
    playNarration: (id) => void playGuideNarration(type, id),
    onPlaced: () => hint.remove(),
  });

  const ok = await handle.start();
  if (!ok) {
    cleanup();
    return false;
  }
  active = { canvas, exitBtn, hint, stop: handle.stop };
  return true;
}

/** Force-exit the active AR scene (Exit-AR button / route change). */
export function exitArScene(): void {
  // Null `active` before the async stop() so a re-entrant launchArScene during
  // teardown never sees a stale handle (stop()'s endSession resolves later).
  const current = active;
  active = null;
  if (!current) return;
  current.stop();
  teardownArDom(current.canvas, current.exitBtn, current.hint);
}
