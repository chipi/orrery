import {
  getDeepSkyI18n,
  getGalaxyI18n,
  getStructureI18n,
  type OuterTextOverlay,
} from '$lib/data/universe';
import { getLocale } from '$lib/paraglide/runtime';
import type { OuterOverlayIds } from '$lib/data/outer-entity';

/** What the panel of an outer scale has selected; `galaxy` is a Local Group member. */
export type OuterTarget = { kind: 'galaxy' | 'structure'; id: string } | null;

/**
 * The request for a selection's text, or null when there is none to ask for: only an id the page
 * listed (the files decide, so no 404 for the rest). A Local Group member that is a deep-sky
 * object shows that object's text.
 */
export function overlayRequest(
  t: OuterTarget,
  ids: OuterOverlayIds,
  locale: string,
): Promise<OuterTextOverlay | null> | null {
  if (!t) return null;
  if (t.kind === 'structure')
    return ids.structure.includes(t.id) ? getStructureI18n(locale, t.id, fetch) : null;
  if (ids.galaxy.includes(t.id)) return getGalaxyI18n(locale, t.id, fetch);
  const twin = ids.deepSky[t.id];
  return twin ? getDeepSkyI18n(locale, twin, fetch) : null;
}

/**
 * The reviewed fact and bio of the selected galaxy or structure in the reader's language, or null
 * while it loads or when none exists, for the six outer-scale panels (as the deep-sky panel's
 * overlay). Call during component init: it holds an effect.
 */
export function outerOverlay(target: () => OuterTarget, ids: () => OuterOverlayIds) {
  let current = $state<OuterTextOverlay | null>(null);
  $effect(() => {
    const load = overlayRequest(target(), ids(), getLocale());
    current = null;
    if (!load) return;
    let stale = false;
    load
      .then((o) => {
        if (!stale) current = o;
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  });
  return {
    get current() {
      return current;
    },
  };
}
