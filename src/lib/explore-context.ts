import { writable } from 'svelte/store';

/**
 * The live /explore scale-shell context (PRD-030 / RFC-032).
 *
 * `/explore` drives the active scale from 3D zoom/warp — it's page state
 * (`contextId`), NOT the URL: the `?context=` param is a one-shot deep-link
 * trigger that the page clears right after the jump. So the global Nav can't
 * read the active scale from the URL. `/explore` pushes `contextId` here on
 * every change; the Nav subscribes to highlight the matching scale-shell menu
 * item. `null` whenever we're not on `/explore` (Nav then falls back to plain
 * path matching).
 */
export type ExploreContextId =
  | 'solar-system'
  | 'neighborhood'
  | 'milky-way'
  | 'local-group'
  | 'local-sheet'
  | 'virgo'
  | 'body-scene';

export const exploreContext = writable<ExploreContextId | null>(null);
