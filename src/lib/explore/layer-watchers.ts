import { onLayerChange } from '$lib/science-layers';

export const MW_LENS_KEYS = ['rotation-curve', 'dark-matter-halo', 'stellar-populations'] as const;
export type MwLensKey = (typeof MW_LENS_KEYS)[number];

/** Where each /explore teaching layer lands: page state and/or a scene fn pointer. */
export interface ExploreLayerTargets {
  setConstellations(on: boolean): void;
  setDeepSky(on: boolean): void;
  hrOpen(): boolean;
  toggleHr(): void;
  causalityOpen(): boolean;
  setCausalityOpen(on: boolean): void;
  openCausality(): void;
  setMwLens(key: MwLensKey, on: boolean): void;
  setMassPeriodOpen(on: boolean): void;
  setBhCurvature(on: boolean): void;
  setBhTimeLens(on: boolean): void;
}

// WS-3 (RFC-039 Contract D) — the /explore teaching layers are now standard
// science-layer keys, driven uniformly through the ScienceLayersPanel lens.
// Each subscription mirrors the effective (lens-coupled) layer state onto the
// existing scene wiring. Constellations + deep-sky feed page state that the
// neighborhood scene reads at build time (host §nbScene sync); HR + light-cones
// drive their overlays; the three Milky Way overlays reach the scene directly.
// Each stop fn goes to `add` in registration order (the route lifecycle drains
// LIFO). onLayerChange emits once on subscribe.
export function watchExploreLayers(t: ExploreLayerTargets, add: (stop: () => void) => void): void {
  const addLayerWatch = (stop: (() => void) | undefined) => {
    if (stop) add(stop);
  };
  addLayerWatch(onLayerChange('constellations', (on) => t.setConstellations(on)));
  addLayerWatch(onLayerChange('deep-sky', (on) => t.setDeepSky(on)));
  addLayerWatch(
    onLayerChange('hr-diagram', (on) => {
      if (on !== t.hrOpen()) t.toggleHr();
    }),
  );
  addLayerWatch(
    onLayerChange('light-cones', (on) => {
      if (on !== t.causalityOpen()) {
        t.setCausalityOpen(on);
        if (on) t.openCausality();
      }
    }),
  );
  for (const key of MW_LENS_KEYS) {
    addLayerWatch(onLayerChange(key, (on) => t.setMwLens(key, on)));
  }
  // Mass–period plot (body-scene) — lens-layer driven since 2026-09-11
  // (was a bespoke chip). The chart's own close button writes the layer
  // off via setLayer so panel toggle + chart stay in sync.
  addLayerWatch(onLayerChange('mass-period', (on) => t.setMassPeriodOpen(on)));
  // Black-hole physics lenses — layer-driven since the same audit
  // (were bespoke chips gated only on the takeover, not on the lens).
  addLayerWatch(onLayerChange('bh-curvature', (on) => t.setBhCurvature(on)));
  addLayerWatch(onLayerChange('bh-time-dilation', (on) => t.setBhTimeLens(on)));
}
