import type { FlyAct, FlightPhaseState } from '$lib/fly/flight-phase-controller';
import type { FlyUpdaters } from '$lib/three/fly-updaters';

/**
 * `/fly` scene-host contract (RFC-036 WS-B · #441).
 *
 * The typed seam between the phase controller (WS-A) and the 3D scene layer.
 * WS-A made *what act is active* a pure reducer; WS-B makes *rendering that act*
 * a host that owns the Three.js scene graph, the two cameras, and the per-frame
 * `onFrame` — extracted from the ~4,875-line `onMount` closure in
 * `src/routes/fly/+page.svelte` (B0 map: docs/wip/2026-08-05-fly-restructure-plan.md).
 *
 * Data-flow is ONE-WAY, matching the RFC §4 invariant:
 *   controller/page  ──(FlyFrameInputs, per rAF)──▶  host.frame()  ──▶  renders
 *   host  ──(FlySceneHostEvents callbacks)──▶  page  ──▶  controller.dispatch()
 * The host NEVER mutates phase. It reads the composed inputs and renders; when a
 * scene event occurs (touchdown, ascent-complete) it reports it through a
 * callback the page routes into `dispatchPhase(...)`.
 *
 * This module is **types-only** at B1 — the same staging `fly-updaters.ts` used
 * (its closures lived in `onMount` until the contract stabilised). B2 (helio
 * assembly) → B3 (cislunar assembly) → B4 (`onFrame` → keyed updaters) → B5 (thin
 * the page) implement `createFlySceneHost` against this contract; each lands
 * behind green `/fly` e2e + per-act visual parity.
 *
 * NOTE — reconciling RFC §4 with the WS-A reality:
 * - **Clock stays in the page.** RFC §4 sketched `clock` *inside* the controller
 *   state; WS-A deliberately kept the continuous clock (`simDay`/`launchT`/…) in
 *   the page (the controller owns only the ACT). So the clock arrives as part of
 *   {@link FlyFrameInputs} each frame — sourced from the page's live `$state`,
 *   not the reducer.
 * - **`act` is the 6-member {@link FlyAct}, not RFC §4's 8-member sketch.** The
 *   RFC's `cislunar` / `flyby` are NOT phase acts — they are a `viewMode` and a
 *   camera sub-state of the `cruise` act. The host keys scene selection on
 *   (`act`, `viewMode`): `cruise` + `viewMode==='cislunar'` → the cislunar scene;
 *   `cruise` + `viewMode==='heliocentric'` → the helio scene (a flyby is a helio
 *   camera state within it). This keeps the act machine minimal + the mapping in
 *   the render layer, where it belongs.
 */

/** The continuous playback clock the page owns and advances (the reducer owns the
 *  ACT, not the clock). Passed into {@link FlySceneHost.frame} every rAF tick. */
export interface FlyClock {
  /** Heliocentric/cruise sim time in absolute days (arc dep_day .. arr_day+). */
  simDay: number;
  /** Ascent MET (s) the LaunchScene renders to during the `ascent` act. */
  launchT: number;
  /** Earth-orbit coast MET (days) advanced across the `coast` act. */
  coastMetDays: number;
  /** Entry-descent-landing MET (s) advanced across the `descent` act. */
  descentT: number;
  /** Master play/pause — gates every clock advance in `onFrame`. */
  playing: boolean;
}

/**
 * The composite the host reads each frame — the WS-B seam's render context.
 * Assembled by the page from the controller's derived {@link FlightPhaseState},
 * the page-owned {@link FlyClock}, and the reactive render knobs the frame body
 * consumes. B4 finalises the exact field set as it moves the `onFrame` sub-blocks
 * (science-layer toggles, cinematic-beat state, montage, gyro) out of the page;
 * B1 fixes only the stable core so the two layers agree on the seam shape.
 */
export interface FlyFrameInputs {
  /** The controller's read-only view — the active act + viewMode + show* flags. */
  phase: FlightPhaseState;
  /** The page-owned continuous clock (see {@link FlyClock}). */
  clock: FlyClock;
  /** Wall-clock delta (s) for this frame, already clamped by `createAnimateLoop`
   *  (R7). The host must not re-derive dt from `performance.now()`. */
  dt: number;
  /** Wall-clock timestamp (ms) for this frame, from the shared animate loop. */
  now: number;
}

/**
 * Events the host reports back to the page (one-way: host → page → controller).
 * The page wires each to a `dispatchPhase(...)` call so a scene-driven transition
 * (a landing completing, a launch cinematic finishing) routes through the same
 * reducer as a user action — the host never touches phase state itself.
 */
export interface FlySceneHostEvents {
  /** DescentScene reached the surface → page dispatches `{ type: 'touchdown' }`. */
  onTouchdown?: () => void;
  /** LaunchScene cinematic completed → page dispatches `{ type: 'launchComplete' }`. */
  onAscentComplete?: () => void;
  /** Earth-orbit coast reached the deorbit seam → `{ type: 'coastComplete' }`. */
  onCoastComplete?: () => void;
}

/** Construction options for {@link createFlySceneHost}. The full option surface
 *  (quality config, debug bridges, layer subscriptions) is finalised in B2 as the
 *  helio/cislunar assembly moves in; B1 fixes the container + event callbacks. */
export interface FlySceneHostOptions extends FlySceneHostEvents {
  /** The DOM element the renderer canvas mounts into (`renderer.domElement`). */
  container: HTMLElement;
}

/**
 * The host handle the page holds in place of the ~50 closure-captured scene vars
 * (renderer, both scenes, both cameras, every mesh/material/group, camera-orbit
 * state, the 2D-canvas ctx) the B0 map enumerated. The page keeps the clock + the
 * reactive UI state and drives the host through this narrow surface.
 */
export interface FlySceneHost {
  /** The existing per-frame + per-mission updater seam (helio.* / cislunar.*),
   *  now produced by the host's factories instead of inline `onMount` closures.
   *  Unchanged contract → the page's mission-swap `$effect`s keep calling it. */
  readonly updaters: FlyUpdaters;
  /** React to an act transition — set per-scene visibility for the new act
   *  (which scene renders, which overlays show). Called from the page whenever
   *  `flyAct` changes. Pure visibility; no clock advance. */
  applyAct(phase: FlightPhaseState): void;
  /** Run exactly one animation frame for the given inputs: advance the active
   *  scene, update cameras, render the correct target (cislunar / helio-post /
   *  helio-direct), and project the HUD screen-space markers. Byte-identical to
   *  the legacy inline `onFrame` body (B0 region (e), lines 5654–7324). */
  frame(inputs: FlyFrameInputs): void;
  /** Tear down: dispose both scenes, the renderer (+ forceContextLoss), the LOD
   *  textures, unsubscribe every layer listener, remove the canvas. Mirrors the
   *  legacy `onMount` cleanup (B0 region (g), lines 7329–7393). */
  dispose(): void;
}

/**
 * Build the `/fly` scene host: assemble both 3D scenes over the existing
 * `buildHelioScene` / `buildCislunarScene` seam plus the remaining inline objects,
 * wire input listeners, and return the {@link FlySceneHost} handle.
 *
 * Implemented across B2–B5. B1 declares the signature so the contract is fixed
 * before any WebGL code moves. (Types-only until then — see the module docstring.)
 */
export type CreateFlySceneHost = (opts: FlySceneHostOptions) => FlySceneHost;

/** Re-export for callers that key scene selection on the act (see the module
 *  docstring's RFC-§4 reconciliation note). */
export type { FlyAct };
