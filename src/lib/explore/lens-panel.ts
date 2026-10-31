import * as m from '$lib/paraglide/messages';
import type { LayerKey } from '$lib/science-layers';
import type { ExploreContextId } from '$lib/three/explore-scene-host';
import type { ScienceTabId } from '$types/science';

// WS-3 (RFC-039 Contract D) — the science lens is now uniform across every scale
// shell. One ScienceLayersPanel, its props derived from the active shell: each
// shell gets a lens-story (title + body + a → science learn link) and the set of
// teaching layers that make sense at that scale. Solar-system keeps its Kepler/
// Newton historical foundations; the outer shells surface their overlays or, where
// the per-tier lens is still to come (WS-5), just the story + learn link.
export type LensPanelProps = {
  title?: string;
  body?: string;
  tab?: ScienceTabId;
  section?: string;
  available: LayerKey[];
  historicalFoundations?: Array<{ tab: ScienceTabId; section: string; label: string }>;
};
export type LensPanelInput = {
  blackHoleActive: boolean;
  contextId: ExploreContextId;
  activeBodyHostId: string | null | undefined;
  exoplanetHostIds: ReadonlySet<string>;
};
export function computeLensPanel({
  blackHoleActive,
  contextId,
  activeBodyHostId,
  exoplanetHostIds,
}: LensPanelInput): LensPanelProps {
  // Black-hole takeover overrides whatever shell it was entered from
  // (2026-09-11 consistency audit): its two physics lenses (curvature
  // grid + time dilation) are standard layers now, not bespoke chips.
  if (blackHoleActive) {
    return {
      title: m.explore_lens_story_bh_title(),
      body: m.explore_lens_story_bh_body(),
      tab: 'observation',
      section: 'black-holes',
      available: ['bh-curvature', 'bh-time-dilation'],
    };
  }
  switch (contextId) {
    case 'neighborhood':
      return {
        title: m.explore_lens_story_nb_title(),
        body: m.explore_lens_story_nb_body(),
        tab: 'observation',
        section: 'hertzsprung-russell',
        // One region, one lens (2026-09-11): the same five layers inside
        // an exoplanet system — mass–period is item 5 here too.
        available: ['constellations', 'deep-sky', 'hr-diagram', 'light-cones', 'mass-period'],
      };
    case 'milky-way':
      return {
        title: m.explore_lens_story_mw_title(),
        body: m.explore_lens_story_mw_body(),
        tab: 'observation',
        section: 'our-galaxy',
        available: ['rotation-curve', 'dark-matter-halo', 'stellar-populations'],
      };
    case 'local-group':
      return {
        title: m.explore_lens_story_lg_title(),
        body: m.explore_lens_story_lg_body(),
        tab: 'observation',
        section: 'local-group',
        available: [],
      };
    case 'local-sheet':
      return {
        title: m.explore_lens_story_ls_title(),
        body: m.explore_lens_story_ls_body(),
        tab: 'observation',
        section: 'galaxy-types',
        available: [],
      };
    case 'virgo':
      return {
        title: m.explore_lens_story_virgo_title(),
        body: m.explore_lens_story_virgo_body(),
        tab: 'cosmology',
        section: 'large-scale-structure',
        available: [],
      };
    case 'laniakea':
      return {
        title: m.explore_lens_story_laniakea_title(),
        body: m.explore_lens_story_laniakea_body(),
        tab: 'cosmology',
        section: 'laniakea-and-the-great-attractor',
        available: [],
      };
    case 'cosmic-web':
      return {
        title: m.explore_lens_story_cosmic_web_title(),
        body: m.explore_lens_story_cosmic_web_body(),
        tab: 'cosmology',
        section: 'large-scale-structure',
        available: [],
      };
    case 'solar-system':
      return {
        title: m.explore_2d_view_title(),
        body: m.explore_lens_solar_system_body(),
        tab: 'orbits',
        section: 'keplerian-orbit',
        available: [
          'hover',
          'gravity',
          'velocity',
          'centripetal',
          'galaxies',
          'hill-sphere',
          'lagrange-points',
          'magnetosphere',
          'sub-solar',
          'planet-stats',
        ],
        historicalFoundations: [
          { tab: 'history', section: 'keplers-laws-1609', label: "Kepler's three laws, 1609" },
          { tab: 'history', section: 'newton-principia-1687', label: 'Newton · Principia, 1687' },
        ],
      };
    case 'body-scene':
      // One region, one lens (2026-09-11 operator direction): inside an
      // exoplanet system the lens is IDENTICAL to the stellar
      // neighbourhood's — same story, same five layers, mass–period as
      // item 5. The three charts open here too (screen-space overlays);
      // constellations/deep-sky store the preference and apply the moment
      // the user is back in the neighbourhood field. Solar-system body
      // scenes keep no lens surface.
      if (activeBodyHostId && exoplanetHostIds.has(activeBodyHostId)) {
        return {
          title: m.explore_lens_story_nb_title(),
          body: m.explore_lens_story_nb_body(),
          tab: 'observation',
          section: 'hertzsprung-russell',
          available: ['constellations', 'deep-sky', 'hr-diagram', 'light-cones', 'mass-period'],
        };
      }
      return { available: [] };
    default:
      // black-hole takeovers own the viewport; no lens surface.
      return { available: [] };
  }
}

export type ScaleNavExit =
  | 'black-hole'
  | 'body-scene'
  | 'deep-sky'
  | 'neighborhood'
  | 'milky-way'
  | 'local-group'
  | 'local-sheet'
  | 'virgo'
  | 'laniakea'
  | 'cosmic-web';

// #45 — the top scale-navigator's back affordance. Walks OUT one shell level,
// or exits the current full-screen takeover (black-hole / body-scene / deep-sky).
// Returns null at the solar system (innermost shell — nowhere further in). The
// page maps `exit` to its exit-fn pointer at click time, so those pointers
// don't need to be reactive.
export function scaleNavBackTarget(
  contextId: ExploreContextId,
  blackHoleActive: boolean,
  deepSkyActive: boolean,
): { exit: ScaleNavExit; label: string } | null {
  if (blackHoleActive) return { exit: 'black-hole', label: m.explore_ctx_back() };
  if (contextId === 'body-scene')
    return { exit: 'body-scene', label: m.explore_ctx_stellar_neighborhood() };
  if (deepSkyActive) return { exit: 'deep-sky', label: m.explore_ctx_stellar_neighborhood() };
  switch (contextId) {
    case 'neighborhood':
      return { exit: 'neighborhood', label: m.explore_ctx_solar_system() };
    case 'milky-way':
      return { exit: 'milky-way', label: m.explore_ctx_stellar_neighborhood() };
    case 'local-group':
      return { exit: 'local-group', label: m.explore_ctx_milky_way() };
    case 'local-sheet':
      return { exit: 'local-sheet', label: m.explore_ctx_local_group() };
    case 'virgo':
      return { exit: 'virgo', label: m.explore_ctx_local_sheet() };
    case 'laniakea':
      return { exit: 'laniakea', label: m.explore_ctx_virgo() };
    case 'cosmic-web':
      return { exit: 'cosmic-web', label: m.explore_ctx_laniakea() };
    default:
      return null;
  }
}
