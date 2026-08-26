// Launch an AR scene from a flat route (#213/#208 integration). Creates a full-
// screen transparent canvas, starts the AR session, and tears everything down on
// exit or on failure — the flat scene underneath is the graceful fallback.
//
// The AR scene chunk is dynamic-imported so it never weighs on the flat bundle.

import type { ArSceneType } from './ar-scene';
import type { StationId, Pass } from '../satellite';
import { audio } from '../audio-state.svelte';
import { audioRegistry } from '../audio-registry.svelte';

// Station-pass summary for the sky-mode hint (#405). Exported for unit testing —
// pure helpers, no DOM/session state.
const COMPASS8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
export function compass8(deg: number): string {
  return COMPASS8[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
export function formatPass(id: StationId, pass: Pass | null): string {
  const name = id === 'iss' ? 'ISS' : 'Tiangong';
  if (!pass) return `${name}: no pass in 24 h`;
  const mins = Math.max(0, Math.round((pass.start.getTime() - Date.now()) / 60_000));
  const when = mins === 0 ? 'now' : `in ${mins} min`;
  return `${name}: ${pass.visible ? 'visible' : 'daytime'} pass ${when}, ${compass8(
    pass.startAzimuthDeg,
  )}, max ${Math.round(pass.maxAltitudeDeg)}°`;
}

let active: {
  canvas: HTMLCanvasElement;
  exitBtn: HTMLButtonElement;
  hint: HTMLDivElement;
  stop: () => void;
} | null = null;

// True while a launch is mid-flight (between the guard and `active` being set).
// A mobile double-tap fires the second handler during the first launch's awaits
// (`import()` + `start()`), which would otherwise pass the `active` check and
// start a second canvas / renderer / session. Guarded in both launchers.
let launching = false;

// What the user is placing, for the on-screen instruction.
const SCENE_LABEL: Record<ArSceneType, string> = {
  explore: 'the Solar System',
  earth: 'Earth',
  moon: 'the Moon',
  mars: 'Mars',
  iss: 'the ISS',
  tiangong: 'Tiangong',
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
  if (active || launching || typeof document === 'undefined') return false;
  launching = true;

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

  // A rejected start() (WebXR permission denial, unsupported device) must NOT
  // propagate — otherwise cleanup never runs, `.ar-active` stays on <html> (the
  // whole app is visibility:hidden), and the app is bricked until reload. Always
  // stop() the handle on failure so its renderer/session are disposed (not leaked).
  const ok = await handle.start().catch(() => false);
  launching = false;
  if (!ok) {
    handle.stop();
    cleanup();
    return false;
  }
  active = { canvas, exitBtn, hint, stop: handle.stop };
  return true;
}

/**
 * Enter the sky-pointing AR mode (#393): hold the phone up and the Sun, Moon and
 * planets are marked where they actually are in your sky (from your location +
 * time). The substrate is picked per device (sky-view.ts): a heading-aligned
 * ARKit session, WebXR + compass correction, or the non-XR magic window (camera
 * feed + compass). Idempotent with the tabletop launcher — one AR view at a time.
 */
export async function launchSkyScene(): Promise<boolean> {
  if (active || launching || typeof document === 'undefined') return false;
  launching = true;

  const canvas = document.createElement('canvas');
  canvas.className = 'ar-canvas';
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;z-index:9997;background:transparent;';
  document.body.appendChild(canvas);

  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'ar-exit-btn';
  exitBtn.textContent = 'Exit AR';
  exitBtn.onclick = () => exitArScene();
  document.body.appendChild(exitBtn);

  const hint = document.createElement('div');
  hint.className = 'ar-hint';
  hint.textContent =
    'Point your phone at the sky — Sun, Moon, planets, constellations & stars, plus the ISS & Tiangong';
  document.body.appendChild(hint);

  document.documentElement.classList.add('ar-active');

  const { createSkyScene } = await import('./sky-scene');
  const cleanup = () => {
    teardownArDom(canvas, exitBtn, hint);
    active = null;
  };

  // Once fresh TLEs resolve, replace the instruction with the next-pass summary.
  const passLines = new Map<StationId, string>();
  const hintTimer = setTimeout(() => hint.remove(), 8000);
  const handle = createSkyScene(canvas, {
    onExit: cleanup,
    onPass: (id, pass) => {
      passLines.set(id, formatPass(id, pass));
      clearTimeout(hintTimer);
      if (!hint.isConnected) document.body.appendChild(hint);
      hint.textContent = [...passLines.values()].join('   ·   ');
    },
  });

  // See launchArScene: a rejected/failed start must tear down fully (dispose the
  // WebGL context + the appended .ar-find-arrows layer via stop(), clear the
  // hint timer, drop .ar-active) so a retry starts clean and the app isn't bricked.
  const ok = await handle.start().catch(() => false);
  launching = false;
  if (!ok) {
    handle.stop();
    clearTimeout(hintTimer);
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
