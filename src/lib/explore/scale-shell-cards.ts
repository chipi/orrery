/**
 * What the /explore hub and the home grid add to a scale level's nav row: the card title and the
 * sentence under it. Separate from `scale-shells.ts` so those two pages do not load the Science
 * Lens story of all eight levels.
 */
import * as m from '$lib/paraglide/messages';
import { SCALE_SHELL_NAV, type ScaleShellNav } from './scale-shell-nav';
import { CTX_ORDER, type ShellId } from './scale-shell-controller';

export interface ScaleShellCard extends ScaleShellNav {
  /** The hub and home-grid card title. */
  title: () => string;
  /** The home-grid / hub card text: what the level is, in a sentence or two. */
  desc: () => string;
}

const CARD_TEXTS: Record<ShellId, { title: () => string; desc: () => string }> = {
  'solar-system': { title: m.landing_card_explore_title, desc: m.landing_card_explore_desc },
  neighborhood: {
    title: m.explore_hub_shortcut_neighborhood,
    desc: m.explore_hub_desc_neighborhood,
  },
  'milky-way': { title: m.explore_hub_shortcut_milkyway, desc: m.explore_hub_desc_milkyway },
  'local-group': { title: m.explore_hub_shortcut_localgroup, desc: m.explore_hub_desc_localgroup },
  'local-sheet': { title: m.explore_lens_story_ls_title, desc: m.explore_hub_desc_localsheet },
  virgo: { title: m.explore_lens_story_virgo_title, desc: m.explore_hub_desc_virgo },
  laniakea: { title: m.explore_lens_story_laniakea_title, desc: m.explore_hub_desc_laniakea },
  'cosmic-web': {
    title: m.explore_lens_story_cosmic_web_title,
    desc: m.explore_hub_desc_cosmicweb,
  },
};

export const SCALE_SHELL_CARDS = Object.fromEntries(
  CTX_ORDER.map((id) => [id, { ...SCALE_SHELL_NAV[id], ...CARD_TEXTS[id] }]),
) as Record<ShellId, ScaleShellCard>;

/** The levels innermost → outermost, the order of the ladder. */
export const SCALE_SHELL_CARD_LIST: readonly ScaleShellCard[] = CTX_ORDER.map(
  (id) => SCALE_SHELL_CARDS[id],
);
