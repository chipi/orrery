/**
 * Hero picker — resolves the canonical hero image URL for a detail-
 * panel entity, honouring an optional per-surface override JSON when
 * present (#5 Phase 4/5).
 *
 * Default convention is the universal `<surface>/<id>/01.jpg` that
 * Phase 0 established. Override JSON lets the operator bless a
 * different slot per entity without moving files on disk — reversible,
 * trackable in git as a JSON diff, no data drift.
 *
 * Override file shape (`static/data/<surface>-hero-overrides.json`):
 *
 *   {
 *     "version": "1.0",
 *     "overrides": {
 *       "dawn": {
 *         "slot": "01.jpg",
 *         "reason": "Canonical agency render — no clean photo exists",
 *         "approved_at": "2026-06-12"
 *       },
 *       "perseverance": {
 *         "slot": "04.jpg",
 *         "reason": "01.jpg is mis-sourced — Curiosity photo. 04.jpg is the real Perseverance shot.",
 *         "approved_at": "2026-06-12"
 *       }
 *     }
 *   }
 *
 * Loader semantics mirror `image-vision.ts`: SSR-safe (empty on the
 * server), fetched once per surface on first call from the browser,
 * cached after that. Callers fall back to the default path until the
 * load resolves. Missing override file = empty cache, default path
 * applies everywhere.
 */
import { browser } from '$app/environment';
import { base } from '$app/paths';

export type HeroSurface =
  | 'missions'
  | 'fleet'
  | 'moon-sites'
  | 'mars-sites'
  | 'earth-objects';

const SURFACE_TO_DIR: Record<HeroSurface, string> = {
  missions: 'missions',
  fleet: 'fleet-galleries',
  'moon-sites': 'moon-sites',
  'mars-sites': 'mars-sites',
  'earth-objects': 'earth-objects',
};

const DEFAULT_SLOT = '01.jpg';

export interface HeroOverride {
  slot: string;
  reason?: string;
  approved_at?: string;
}

export interface HeroOverrideFile {
  version: '1.0';
  overrides: Record<string, HeroOverride>;
}

const overrideCache = new Map<HeroSurface, HeroOverrideFile | null>();
const inflight = new Map<HeroSurface, Promise<HeroOverrideFile | null>>();

/**
 * Eagerly load (or re-use cached) override file for a surface. SSR-safe:
 * returns null on the server. Errors / 404s collapse to null silently —
 * absence of override file is the default, not a failure.
 */
export function loadHeroOverrides(
  surface: HeroSurface,
): Promise<HeroOverrideFile | null> {
  if (overrideCache.has(surface)) {
    return Promise.resolve(overrideCache.get(surface) ?? null);
  }
  if (!browser) {
    overrideCache.set(surface, null);
    return Promise.resolve(null);
  }
  const existing = inflight.get(surface);
  if (existing) return existing;
  const p = (async () => {
    try {
      const res = await fetch(`${base}/data/${surface}-hero-overrides.json`);
      if (!res.ok) {
        overrideCache.set(surface, null);
        return null;
      }
      const json = (await res.json()) as HeroOverrideFile;
      overrideCache.set(surface, json);
      return json;
    } catch {
      overrideCache.set(surface, null);
      return null;
    } finally {
      inflight.delete(surface);
    }
  })();
  inflight.set(surface, p);
  return p;
}

/**
 * Synchronous hero URL. Returns the override-blessed path if the
 * overrides for this surface have been pre-loaded via
 * `loadHeroOverrides(surface)` AND include an entry for this id;
 * otherwise returns the universal default
 * (`<base>/images/<surface>/<id>/01.jpg`).
 *
 * Callers that want override resolution to apply on first paint
 * should `await loadHeroOverrides(surface)` in their +page.ts /
 * onMount before rendering. Callers that fall back to default on
 * the first frame and re-render once the override loads can call
 * `pickHero` directly; Svelte's reactive re-render kicks in when
 * the override cache fills.
 */
export function pickHero(surface: HeroSurface, id: string): string {
  const cached = overrideCache.get(surface);
  const slot = cached?.overrides?.[id]?.slot ?? DEFAULT_SLOT;
  return `${base}/images/${SURFACE_TO_DIR[surface]}/${id}/${slot}`;
}

/** Test seam: clear the override cache so the next loadHeroOverrides
 *  call re-fetches. Only intended for vitest. */
export function _resetHeroOverrideCache(): void {
  overrideCache.clear();
  inflight.clear();
}
