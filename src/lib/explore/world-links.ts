/**
 * The way between /explore and the four world pages (UXD-028, D5 = an explicit link both ways,
 * never a switch on zoom). One table feeds both directions: the Explore panels' "go to the
 * world" chip and the Worlds' "Back to Explore" chip. Keyed by the world's id as the page's
 * `SurfaceSceneConfig.planet` and the panels write it (the Moon is the satellite `moon`).
 * `explore` is the `?id=` the Explore page resolves through `resolveBodyRef`, so the return
 * lands on the body's panel with the camera on it (UXD-019); the Moon is the satellite key
 * `earth:moon`, a bare `moon` is not an id. Paths here are locale-free: the caller wraps them
 * in `localHref`. A fifth world is one row, plus its label.
 */
import * as m from '$lib/paraglide/messages';

export interface WorldLink {
  /** The world page. */
  world: string;
  /** The `?id=` value of the same body on /explore. */
  explore: string;
}

export const WORLD_LINKS: Readonly<Record<string, WorldLink>> = {
  earth: { world: '/earth', explore: 'earth' },
  moon: { world: '/moon', explore: 'earth:moon' },
  mars: { world: '/mars', explore: 'mars' },
  venus: { world: '/venus', explore: 'venus' },
};

/** The world page of a body, or null for a body with no world page. */
export function worldPathFor(bodyId: string | null | undefined): string | null {
  return (bodyId && WORLD_LINKS[bodyId]?.world) || null;
}

/** The /explore URL (path and query) that opens and focuses a world's body, or null. */
export function explorePathFor(worldId: string | null | undefined): string | null {
  const link = worldId ? WORLD_LINKS[worldId] : undefined;
  return link ? `/explore?id=${link.explore}` : null;
}

const LABELS: Readonly<Record<string, () => string>> = {
  earth: m.panel_action_world_earth,
  moon: m.panel_action_world_moon,
  mars: m.panel_action_world_mars,
  venus: m.panel_action_world_venus,
};

/** The chip's words: "Go to Mars", with the body's name in the case its language needs. */
export function worldLinkLabel(bodyId: string): string {
  return LABELS[bodyId]?.() ?? '';
}
