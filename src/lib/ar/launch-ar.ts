// Launch an AR scene from a flat route (#213/#208 integration). Creates a full-
// screen transparent canvas, starts the AR session, and tears everything down on
// exit or on failure — the flat scene underneath is the graceful fallback.
//
// The AR scene chunk is dynamic-imported so it never weighs on the flat bundle.

import type { ArSceneType } from './ar-scene';
import type { StationId, Pass } from '../satellite';
import { audio } from '../audio-state.svelte';
import { audioRegistry } from '../audio-registry.svelte';
import * as m from '$lib/paraglide/messages';

// Station-pass summary for the sky-mode hint (#405). Exported for unit testing —
// pure helpers, no DOM/session state.
const COMPASS8 = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const;
export function compass8(deg: number): (typeof COMPASS8)[number] {
  return COMPASS8[Math.round((((deg % 360) + 360) % 360) / 45) % 8];
}
const COMPASS_LABEL: Record<(typeof COMPASS8)[number], () => string> = {
  N: m.ar_compass_n,
  NE: m.ar_compass_ne,
  E: m.ar_compass_e,
  SE: m.ar_compass_se,
  S: m.ar_compass_s,
  SW: m.ar_compass_sw,
  W: m.ar_compass_w,
  NW: m.ar_compass_nw,
};
// Matches iss-pass `staleAfterDays` (H5): past this the propagated position
// drifts enough to disclose rather than show a confidently-wrong marker.
const STALE_TLE_DAYS = 14;

export function formatPass(id: StationId, pass: Pass | null, epochAgeDays = 0): string {
  const name = id === 'iss' ? 'ISS' : 'Tiangong';
  // The marker is propagated from an element set; if that set is old (offline /
  // un-redeployed), say so instead of implying pinpoint accuracy (H-b · #464).
  const stale =
    epochAgeDays > STALE_TLE_DAYS
      ? ` — ${m.ar_pass_stale({ days: Math.round(epochAgeDays) })}`
      : '';
  if (!pass) return `${m.ar_pass_none({ name })}${stale}`;
  const mins = Math.max(0, Math.round((pass.start.getTime() - Date.now()) / 60_000));
  const args = {
    name,
    when: mins === 0 ? m.ar_pass_now() : m.ar_pass_in_minutes({ minutes: mins }),
    direction: COMPASS_LABEL[compass8(pass.startAzimuthDeg)](),
    altitude: Math.round(pass.maxAltitudeDeg),
  };
  return `${pass.visible ? m.ar_pass_visible(args) : m.ar_pass_daytime(args)}${stale}`;
}

let active: {
  canvas: HTMLCanvasElement;
  exitBtn: HTMLButtonElement;
  hint: HTMLDivElement;
  stop: () => void;
  /** Extra overlay nodes to remove on teardown (e.g. the sky-mode layer toggles). */
  extra?: HTMLElement[];
} | null = null;

// True while a launch is mid-flight (between the guard and `active` being set).
// A mobile double-tap fires the second handler during the first launch's awaits
// (`import()` + `start()`), which would otherwise pass the `active` check and
// start a second canvas / renderer / session. Guarded in both launchers.
let launching = false;

// The on-screen placement instruction — one whole sentence per scene, because
// the object's grammatical case changes the noun in many of the 14 locales.
const PLACE_HINT: Record<ArSceneType, () => string> = {
  explore: m.ar_hint_place_explore,
  earth: m.ar_hint_place_earth,
  moon: m.ar_hint_place_moon,
  mars: m.ar_hint_place_mars,
  iss: m.ar_hint_place_iss,
  tiangong: m.ar_hint_place_tiangong,
};

/** Remove the AR overlay DOM + restore the page (idempotent). */
function teardownArDom(
  canvas: HTMLCanvasElement,
  exitBtn: HTMLButtonElement,
  hint: HTMLDivElement,
  extra: HTMLElement[] = [],
): void {
  canvas.remove();
  exitBtn.remove();
  hint.remove();
  for (const el of extra) el.remove();
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
  exitBtn.textContent = m.ar_exit();
  exitBtn.onclick = () => exitArScene();
  document.body.appendChild(exitBtn);

  // Placement instruction — dismissed once the user taps a surface (onPlaced).
  const hint = document.createElement('div');
  hint.className = 'ar-hint';
  hint.textContent = PLACE_HINT[type]();
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
  // Fade the 3D overlay in over the camera feed (P12) — reduced-motion collapses
  // the transition via the global @media rule in app.css.
  canvas.style.cssText =
    'position:fixed;inset:0;width:100vw;height:100vh;z-index:9997;background:transparent;opacity:0;transition:opacity 0.45s ease;';
  document.body.appendChild(canvas);
  requestAnimationFrame(() => {
    canvas.style.opacity = '1';
  });

  const exitBtn = document.createElement('button');
  exitBtn.type = 'button';
  exitBtn.className = 'ar-exit-btn';
  exitBtn.textContent = m.ar_exit();
  exitBtn.onclick = () => exitArScene();
  document.body.appendChild(exitBtn);

  const hint = document.createElement('div');
  hint.className = 'ar-hint';
  hint.textContent = m.ar_hint_sky();
  document.body.appendChild(hint);

  document.documentElement.classList.add('ar-active');

  const { createSkyScene } = await import('./sky-scene');
  // AR diagnostic HUD (#54) — built only when debug mode is on (read once at
  // launch; the nav is hidden in AR so it can't toggle mid-session). Whitelisted
  // in the `.ar-active` chrome-hide rule so it survives the AR blanket.
  const { debugMode } = await import('$lib/debug-mode.svelte');
  const debugHud = debugMode.enabled ? buildSkyDebugHud() : null;
  if (debugHud) document.body.appendChild(debugHud);

  // The layer-toggle control (RFC-041 S3) is built after the handle exists (it wires
  // the handle's setters); cleanup removes it alongside the rest of the overlay.
  let layers: HTMLElement | null = null;
  const extras = (): HTMLElement[] => [layers, debugHud].filter((e): e is HTMLElement => !!e);
  const cleanup = () => {
    teardownArDom(canvas, exitBtn, hint, extras());
    active = null;
  };

  // Once fresh TLEs resolve, replace the instruction with the next-pass summary.
  const passLines = new Map<StationId, string>();
  const hintTimer = setTimeout(() => hint.remove(), 8000);
  const handle = createSkyScene(canvas, {
    onExit: cleanup,
    onPass: (id, pass, epochAgeDays) => {
      passLines.set(id, formatPass(id, pass, epochAgeDays));
      clearTimeout(hintTimer);
      if (!hint.isConnected) document.body.appendChild(hint);
      hint.textContent = [...passLines.values()].join('   ·   ');
    },
    onDebug: debugHud ? (d) => updateSkyDebugHud(debugHud, d) : undefined,
  });

  // Layer toggles: everything is on by default; tap to declutter (RFC-041 S3).
  layers = buildSkyLayerToggles(handle);
  document.body.appendChild(layers);

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
  active = { canvas, exitBtn, hint, stop: handle.stop, extra: extras() };
  return true;
}

/** Build the AR diagnostic HUD (#54) — a small monospace readout, top-left. */
function buildSkyDebugHud(): HTMLDivElement {
  const el = document.createElement('div');
  el.className = 'ar-debug-hud';
  el.textContent = 'AR DEBUG · waiting…';
  return el;
}

/** Repaint the AR debug HUD from a diagnostics tick. */
function updateSkyDebugHud(el: HTMLElement, d: import('./sky-scene').SkyDebugData): void {
  el.textContent =
    `AR DEBUG\n` +
    `substrate  ${d.substrate}\n` +
    `heading    ${d.headingDeg.toFixed(1)}°\n` +
    `pitch/roll ${d.pitchDeg.toFixed(1)}° / ${d.rollDeg.toFixed(1)}°\n` +
    `observer   ${d.latDeg.toFixed(2)}, ${d.lonDeg.toFixed(2)}\n` +
    `up bodies  ${d.upBodies}   fov ${d.fovDeg.toFixed(0)}°`;
}

/** Build the sky-mode layer toggles (RFC-041): a single dark-glass strip of text
 *  buttons — no emoji, no per-chip borders. On = teal text + a teal dot; off =
 *  dim. Everything starts on except All-names + Below-horizon. Styled via
 *  `.ar-layers` / `.ar-layer-btn` in app.css, whitelisted in the chrome-hide rule. */
function buildSkyLayerToggles(handle: {
  setPlanetsVisible(on: boolean): void;
  setConstellationsVisible(on: boolean): void;
  setStarsVisible(on: boolean): void;
  setDeepSkyVisible(on: boolean): void;
  setSunEventsVisible(on: boolean): void;
  setStationsVisible(on: boolean): void;
  setAllLabelsVisible(on: boolean): void;
  setBelowHorizonVisible(on: boolean): void;
}): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.className = 'ar-layers';
  const mk = (label: string, set: (on: boolean) => void, initialOn = true) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ar-layer-btn';
    b.textContent = label;
    let on = initialOn;
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('off', !on);
    b.onclick = () => {
      on = !on;
      set(on);
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('off', !on);
    };
    return b;
  };
  wrap.append(
    mk(m.ar_layer_planets(), (v) => handle.setPlanetsVisible(v)),
    mk(m.ar_layer_stars(), (v) => handle.setStarsVisible(v)),
    mk(m.ar_layer_figures(), (v) => handle.setConstellationsVisible(v)),
    mk(m.ar_layer_nebulae(), (v) => handle.setDeepSkyVisible(v)),
    mk(m.ar_layer_rise_set(), (v) => handle.setSunEventsVisible(v)),
    mk(m.ar_layer_stations(), (v) => handle.setStationsVisible(v)),
    // Off by default: reveal every label; show the sub-horizon sky.
    mk(m.ar_layer_all_names(), (v) => handle.setAllLabelsVisible(v), false),
    mk(m.ar_layer_below_horizon(), (v) => handle.setBelowHorizonVisible(v), false),
  );
  return wrap;
}

/** Force-exit the active AR scene (Exit-AR button / route change). */
export function exitArScene(): void {
  // Null `active` before the async stop() so a re-entrant launchArScene during
  // teardown never sees a stale handle (stop()'s endSession resolves later).
  const current = active;
  active = null;
  if (!current) return;
  current.stop();
  teardownArDom(current.canvas, current.exitBtn, current.hint, current.extra);
}
