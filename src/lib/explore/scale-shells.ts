/**
 * The eight /explore scale levels, one record each (UXD-027). The nav dropdown, the /explore hub,
 * the home grid, the level picker, the "what you are looking at" card and the Science Lens story all
 * read this table, so a level is named, drawn and described in one place. Order is `CTX_ORDER`.
 *
 * Message keys are the ones those surfaces already used: this table moved them, it did not rename or
 * add text. `science` holds language-neutral `tab/section` slugs (the shape `refsFromSlugs` reads);
 * the first one is the level's own section, the rest are the neighbours the card offers. The
 * headings come from `science-index.<locale>.json` at the point of use.
 */
import * as m from '$lib/paraglide/messages';
import { CTX_ORDER, type ShellId } from './scale-shell-controller';

export interface ScaleShell {
  id: ShellId;
  /** The deep-link query that jumps to the level (`?context=<id>`). */
  query: string;
  /** The `ScaleGlyph` id: the level's own id. */
  glyph: ShellId;
  /** The level's name: the picker chip and rungs, the card header. */
  name: () => string;
  /** The nav dropdown and hub label: the name, but "Explore" for the Solar System. */
  navName: () => string;
  /** The hub and home-grid card title. */
  title: () => string;
  /** The home-grid / hub card text: what the level is, in a sentence or two. */
  desc: () => string;
  /** The Science Lens story (title and body) the level carries. */
  storyTitle: () => string;
  storyBody: () => string;
  /** At most five `tab/section` slugs; the first is the level's own. */
  science: readonly string[];
}

export const SCALE_SHELLS: Record<ShellId, ScaleShell> = {
  'solar-system': {
    id: 'solar-system',
    query: '?context=solar-system',
    glyph: 'solar-system',
    name: m.explore_ctx_solar_system,
    navName: m.nav_explore,
    title: m.landing_card_explore_title,
    desc: m.landing_card_explore_desc,
    storyTitle: m.explore_2d_view_title,
    storyBody: m.explore_lens_solar_system_body,
    science: [
      'orbits/keplerian-orbit',
      'orbits/keplers-laws',
      'planets/planetary-stats',
      'planets/moons-of-the-system',
      'planets/asteroid-belt',
    ],
  },
  neighborhood: {
    id: 'neighborhood',
    query: '?context=neighborhood',
    glyph: 'neighborhood',
    name: m.explore_ctx_stellar_neighborhood,
    navName: m.explore_ctx_stellar_neighborhood,
    title: m.explore_hub_shortcut_neighborhood,
    desc: m.explore_hub_desc_neighborhood,
    storyTitle: m.explore_lens_story_nb_title,
    storyBody: m.explore_lens_story_nb_body,
    science: [
      'observation/hertzsprung-russell',
      'cosmology/cosmic-distance-ladder',
      'scales-time/light-minute',
      'exoplanets/habitable-zone',
    ],
  },
  'milky-way': {
    id: 'milky-way',
    query: '?context=milky-way',
    glyph: 'milky-way',
    name: m.explore_ctx_milky_way,
    navName: m.explore_ctx_milky_way,
    title: m.explore_hub_shortcut_milkyway,
    desc: m.explore_hub_desc_milkyway,
    storyTitle: m.explore_lens_story_mw_title,
    storyBody: m.explore_lens_story_mw_body,
    science: ['observation/our-galaxy', 'observation/black-holes', 'observation/galaxy-types'],
  },
  'local-group': {
    id: 'local-group',
    query: '?context=local-group',
    glyph: 'local-group',
    name: m.explore_ctx_local_group,
    navName: m.explore_ctx_local_group,
    title: m.explore_hub_shortcut_localgroup,
    desc: m.explore_hub_desc_localgroup,
    storyTitle: m.explore_lens_story_lg_title,
    storyBody: m.explore_lens_story_lg_body,
    science: [
      'observation/local-group',
      'observation/andromeda-galaxy',
      'observation/magellanic-clouds',
      'observation/dwarf-spheroidals',
    ],
  },
  'local-sheet': {
    id: 'local-sheet',
    query: '?context=local-sheet',
    glyph: 'local-sheet',
    name: m.explore_ctx_local_sheet,
    navName: m.explore_ctx_local_sheet,
    title: m.explore_lens_story_ls_title,
    desc: m.explore_hub_desc_localsheet,
    storyTitle: m.explore_lens_story_ls_title,
    storyBody: m.explore_lens_story_ls_body,
    science: [
      'observation/galaxy-types',
      'observation/local-group',
      'cosmology/cosmic-distance-ladder',
    ],
  },
  virgo: {
    id: 'virgo',
    query: '?context=virgo',
    glyph: 'virgo',
    name: m.explore_ctx_virgo,
    navName: m.explore_ctx_virgo,
    title: m.explore_lens_story_virgo_title,
    desc: m.explore_hub_desc_virgo,
    storyTitle: m.explore_lens_story_virgo_title,
    storyBody: m.explore_lens_story_virgo_body,
    science: [
      'cosmology/large-scale-structure',
      'observation/galaxy-types',
      'cosmology/cosmic-distance-ladder',
    ],
  },
  laniakea: {
    id: 'laniakea',
    query: '?context=laniakea',
    glyph: 'laniakea',
    name: m.explore_ctx_laniakea,
    navName: m.explore_ctx_laniakea,
    title: m.explore_lens_story_laniakea_title,
    desc: m.explore_hub_desc_laniakea,
    storyTitle: m.explore_lens_story_laniakea_title,
    storyBody: m.explore_lens_story_laniakea_body,
    science: [
      'cosmology/laniakea-and-the-great-attractor',
      'cosmology/large-scale-structure',
      'cosmology/cosmic-distance-ladder',
    ],
  },
  'cosmic-web': {
    id: 'cosmic-web',
    query: '?context=cosmic-web',
    glyph: 'cosmic-web',
    name: m.explore_ctx_cosmic_web,
    navName: m.explore_ctx_cosmic_web,
    title: m.explore_lens_story_cosmic_web_title,
    desc: m.explore_hub_desc_cosmicweb,
    storyTitle: m.explore_lens_story_cosmic_web_title,
    storyBody: m.explore_lens_story_cosmic_web_body,
    science: [
      'cosmology/large-scale-structure',
      'cosmology/laniakea-and-the-great-attractor',
      'cosmology/cosmic-distance-ladder',
    ],
  },
};

/** The levels innermost → outermost, the order of the ladder. */
export const SCALE_SHELL_LIST: readonly ScaleShell[] = CTX_ORDER.map((id) => SCALE_SHELLS[id]);

/** `tab/section` → `{ tab, section }`; the only place a slug is split for these lists. */
export function shellScienceRefs(id: ShellId): { tab: string; section: string }[] {
  return SCALE_SHELLS[id].science.map((slug) => {
    const [tab, section] = slug.split('/');
    return { tab, section };
  });
}
