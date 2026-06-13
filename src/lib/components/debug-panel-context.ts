/**
 * Svelte context for the root-layout DebugPanel.
 *
 * Two parallel registration slots — the panel reads both via the
 * same context object and surfaces whichever the active route has
 * mounted.
 *
 *   1. **Page content** — a free-form snippet a route can register
 *      to drive the "Page" tab (e.g. /fly's FlybyDebugViewer). See
 *      `DebugPanelRegistrar.svelte`.
 *
 *   2. **Rendering registration** — a 3D route's `renderer`, live
 *      `quality` config, and the resolution `qualitySource`. Drives
 *      the "Rendering" tab (#334): tier + source attribution, live
 *      renderer.info readout, and (slice 29) per-feature toggles.
 *      See `RenderingDebugRegistrar.svelte`.
 *
 * Both slots are optional. Routes that don't register a 3D scene
 * leave the rendering slot null and the Rendering tab stays hidden.
 *
 * The reactivity contract: the layout owns both slots' backing
 * `$state` containers and passes them into `createDebugPanelContext`.
 * The setters mutate the boxed values so any descendant reading
 * through `getDebugPanelContext()` sees the change reactively.
 */

import { getContext, setContext } from 'svelte';
import type { Snippet } from 'svelte';
import type * as THREE from 'three';
import type { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { QualityConfig } from '$lib/quality/quality-tier';

const DEBUG_PANEL_KEY = Symbol('debug-panel-page-content');

export interface PageDebugRegistration {
  label: string;
  content: Snippet | null;
}

/** Source attribution for the resolved quality tier — surfaced in
 *  the Rendering tab so the user knows whether the active tier came
 *  from a URL override, their saved choice, the detect-gpu auto
 *  result, or the medium fallback. Mirrors the precedence inside
 *  `resolveQualitySync`. */
export type QualitySource = 'url' | 'user-choice' | 'detect-gpu' | 'fallback';

export interface RenderingDebugRegistration {
  renderer: THREE.WebGLRenderer;
  quality: QualityConfig;
  qualitySource: QualitySource;
  /** Optional reference to the route's live UnrealBloomPass. When
   *  present, the Rendering tab surfaces threshold / strength / radius
   *  sliders + an ON/OFF toggle that mutate `bloomPass.enabled` and
   *  the three uniforms in-place (no composer rebuild required). */
  bloomPass?: UnrealBloomPass | null;
}

/** Boxed reactive slot for the rendering registration. The layout
 *  creates this as `$state({ value: null })` so the setter can
 *  reassign `.value` and any descendant reading via the context sees
 *  it reactively. */
export interface RenderingRegistrationSlot {
  value: RenderingDebugRegistration | null;
}

interface DebugPanelContext {
  registration: PageDebugRegistration;
  rendering: RenderingRegistrationSlot;
}

export function createDebugPanelContext(
  pageReg: PageDebugRegistration,
  renderingSlot: RenderingRegistrationSlot,
): DebugPanelContext {
  const ctx: DebugPanelContext = {
    registration: pageReg,
    rendering: renderingSlot,
  };
  setContext(DEBUG_PANEL_KEY, ctx);
  return ctx;
}

export function getDebugPanelContext(): DebugPanelContext | null {
  return getContext<DebugPanelContext | null>(DEBUG_PANEL_KEY) ?? null;
}

export function setPageDebugContent(reg: PageDebugRegistration): void {
  const ctx = getDebugPanelContext();
  if (!ctx) return;
  ctx.registration.label = reg.label;
  ctx.registration.content = reg.content;
}

export function setRenderingDebugRegistration(reg: RenderingDebugRegistration | null): void {
  const ctx = getDebugPanelContext();
  if (!ctx) return;
  ctx.rendering.value = reg;
}
