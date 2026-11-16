/**
 * The eight /explore scale levels, one record each (UXD-027). The nav dropdown, the /explore hub,
 * the home grid, the level picker, the "what you are looking at" card and the Science Lens story all
 * read this table, so a level is named, drawn and described in one place. Order is `CTX_ORDER`.
 *
 * Three files, one record: `scale-shell-nav.ts` holds the name, deep link and glyph (the nav is in
 * every page's shell), `scale-shell-cards.ts` adds the hub/home card text, and this file adds the
 * Science Lens story and links. The split is by who may load the texts: the nav and the home page
 * must not pull in ~27 KB brotli of story catalogue they never show. Read the narrowest one you can.
 *
 * Message keys are the ones those surfaces already used: this table moved them, it did not rename or
 * add text. `science` holds language-neutral `tab/section` slugs (the shape `refsFromSlugs` reads);
 * the first one is the level's own section, the rest are the neighbours the card offers. The
 * headings come from `science-index.<locale>.json` at the point of use.
 */
import * as m from '$lib/paraglide/messages';
import { SCALE_SHELL_CARDS, type ScaleShellCard } from './scale-shell-cards';
import { CTX_ORDER, type ShellId } from './scale-shell-controller';

export interface ScaleShell extends ScaleShellCard {
  /** The Science Lens story (title and body) the level carries. */
  storyTitle: () => string;
  storyBody: () => string;
  /** At most five `tab/section` slugs; the first is the level's own. */
  science: readonly string[];
}

type ShellStory = Omit<ScaleShell, keyof ScaleShellCard>;

const STORIES: Record<ShellId, ShellStory> = {
  'solar-system': {
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
    storyTitle: m.explore_lens_story_mw_title,
    storyBody: m.explore_lens_story_mw_body,
    science: ['observation/our-galaxy', 'observation/black-holes', 'observation/galaxy-types'],
  },
  'local-group': {
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
    storyTitle: m.explore_lens_story_ls_title,
    storyBody: m.explore_lens_story_ls_body,
    science: [
      'observation/galaxy-types',
      'observation/local-group',
      'cosmology/cosmic-distance-ladder',
    ],
  },
  virgo: {
    storyTitle: m.explore_lens_story_virgo_title,
    storyBody: m.explore_lens_story_virgo_body,
    science: [
      'cosmology/large-scale-structure',
      'observation/galaxy-types',
      'cosmology/cosmic-distance-ladder',
    ],
  },
  laniakea: {
    storyTitle: m.explore_lens_story_laniakea_title,
    storyBody: m.explore_lens_story_laniakea_body,
    science: [
      'cosmology/laniakea-and-the-great-attractor',
      'cosmology/large-scale-structure',
      'cosmology/cosmic-distance-ladder',
    ],
  },
  'cosmic-web': {
    storyTitle: m.explore_lens_story_cosmic_web_title,
    storyBody: m.explore_lens_story_cosmic_web_body,
    science: [
      'cosmology/large-scale-structure',
      'cosmology/laniakea-and-the-great-attractor',
      'cosmology/cosmic-distance-ladder',
    ],
  },
};

export const SCALE_SHELLS = Object.fromEntries(
  CTX_ORDER.map((id) => [id, { ...SCALE_SHELL_CARDS[id], ...STORIES[id] }]),
) as Record<ShellId, ScaleShell>;

/** The levels innermost → outermost, the order of the ladder. */
export const SCALE_SHELL_LIST: readonly ScaleShell[] = CTX_ORDER.map((id) => SCALE_SHELLS[id]);

/** `tab/section` → `{ tab, section }`; the only place a slug is split for these lists. */
export function shellScienceRefs(id: ShellId): { tab: string; section: string }[] {
  return SCALE_SHELLS[id].science.map((slug) => {
    const [tab, section] = slug.split('/');
    return { tab, section };
  });
}
