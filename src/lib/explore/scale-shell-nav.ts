/**
 * The part of a scale level the always-loaded shell needs: the nav dropdown's row (name, deep link,
 * glyph). Kept apart from `scale-shells.ts` because that table carries the hub/home/story texts of
 * all eight levels, ~27 KB brotli of message catalogue the nav must not drag into every page.
 */
import * as m from '$lib/paraglide/messages';
import { CTX_ORDER, type ShellId } from './scale-shell-controller';

export interface ScaleShellNav {
  id: ShellId;
  /** The deep-link query that jumps to the level (`?context=<id>`). */
  query: string;
  /** The `ScaleGlyph` id: the level's own id. */
  glyph: ShellId;
  /** The level's name: the picker chip and rungs, the card header. */
  name: () => string;
  /** The nav dropdown and hub label: the name, but "Explore" for the Solar System. */
  navName: () => string;
}

const level = (id: ShellId, name: () => string, navName: () => string = name): ScaleShellNav => ({
  id,
  query: `?context=${id}`,
  glyph: id,
  name,
  navName,
});

export const SCALE_SHELL_NAV: Record<ShellId, ScaleShellNav> = {
  'solar-system': level('solar-system', m.explore_ctx_solar_system, m.nav_explore),
  neighborhood: level('neighborhood', m.explore_ctx_stellar_neighborhood),
  'milky-way': level('milky-way', m.explore_ctx_milky_way),
  'local-group': level('local-group', m.explore_ctx_local_group),
  'local-sheet': level('local-sheet', m.explore_ctx_local_sheet),
  virgo: level('virgo', m.explore_ctx_virgo),
  laniakea: level('laniakea', m.explore_ctx_laniakea),
  'cosmic-web': level('cosmic-web', m.explore_ctx_cosmic_web),
};

/** The levels innermost → outermost, the order of the ladder. */
export const SCALE_SHELL_NAV_LIST: readonly ScaleShellNav[] = CTX_ORDER.map(
  (id) => SCALE_SHELL_NAV[id],
);
