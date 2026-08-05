import { get } from './core';
import type { LocalizedPlanet, PlanetOverlay, PlanetsData } from '$types/planet';
import type { LocalizedSun, Sun, SunOverlay } from '$types/sun';
import type { Rocket } from '$types/rocket';
import type { EarthObject } from '$types/earth-object';
import type { OrbitRegime } from '$types/orbit-regime';

export async function planets(): Promise<PlanetsData> {
  return get<PlanetsData>('planets.json');
}

/**
 * Returns the 8 planets merged with their per-locale editorial overlay.
 * Order matches `planets.json` (Mercury → Neptune). The id is the
 * lowercase planet name and is used as the URL slug & overlay filename.
 *
 * If a locale overlay is missing, falls back to en-US. If en-US itself
 * is missing for any planet, a hard error is thrown — overlays are part
 * of the editorial contract, not optional decoration.
 */
export async function getPlanets(locale = 'en-US'): Promise<LocalizedPlanet[]> {
  const baseData = await planets();
  const merged: LocalizedPlanet[] = [];
  for (const p of baseData.planets) {
    const id = p.name.toLowerCase();
    const overlay = await get<PlanetOverlay>(`i18n/${locale}/planets/${id}.json`).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<PlanetOverlay>(`i18n/en-US/planets/${id}.json`).catch(() => null));
    if (!fallback) {
      throw new Error(`Missing planet overlay for ${id} (locale ${locale}, no en-US fallback)`);
    }
    merged.push({ ...p, ...fallback, id });
  }
  return merged;
}

export async function rockets(): Promise<Rocket[]> {
  return get<Rocket[]>('rockets.json');
}

/**
 * Rockets merged with their per-locale editorial overlay (name, type,
 * first, description). Fallback chain mirrors getPlanets / getMission.
 */
export async function getRockets(locale = 'en-US'): Promise<Rocket[]> {
  const baseList = await rockets();
  const merged: Rocket[] = [];
  for (const r of baseList) {
    const overlay = await get<Partial<Rocket>>(`i18n/${locale}/rockets/${r.id}.json`).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<Partial<Rocket>>(`i18n/en-US/rockets/${r.id}.json`).catch(() => null));
    merged.push(fallback ? { ...r, ...fallback } : r);
  }
  return merged;
}

export async function earthObjects(): Promise<EarthObject[]> {
  return get<EarthObject[]>('earth-objects.json');
}

/**
 * Earth-orbit objects merged with their per-locale editorial overlay
 * (name, short, description, scale_fact). Used by /earth.
 */
export async function getEarthObjects(locale = 'en-US'): Promise<EarthObject[]> {
  const baseList = await earthObjects();
  const merged: EarthObject[] = [];
  for (const o of baseList) {
    const overlay = await get<Partial<EarthObject>>(
      `i18n/${locale}/earth-objects/${o.id}.json`,
    ).catch(() => null);
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<Partial<EarthObject>>(`i18n/en-US/earth-objects/${o.id}.json`).catch(
            () => null,
          ));
    merged.push(fallback ? { ...o, ...fallback } : o);
  }
  return merged;
}

/**
 * Orbit-regime reference data for the orbit-ruler + regime panel
 * pattern (#354 /earth, #355 /moon, #356 /mars). Base JSON carries the
 * immutable numeric fields (altitude_km, color); per-locale overlays
 * under `i18n/<locale>/<bundle>/` add the story / residents / firsts /
 * science-cross-link.
 *
 * `bundle` is the on-disk slug for both the base file and the overlay
 * directory:
 *   - 'orbit-regimes'      → /earth (file: orbit-regimes.json)
 *   - 'orbit-regimes-moon' → /moon  (file: orbit-regimes-moon.json)
 *   - 'orbit-regimes-mars' → /mars  (file: orbit-regimes-mars.json)
 */
async function loadOrbitRegimes(bundle: string, locale: string): Promise<OrbitRegime[]> {
  const base = await get<OrbitRegime[]>(`${bundle}.json`);
  const merged: OrbitRegime[] = [];
  for (const r of base) {
    const overlay = await get<Partial<OrbitRegime>>(`i18n/${locale}/${bundle}/${r.id}.json`).catch(
      () => null,
    );
    const fallback =
      overlay ??
      (locale === 'en-US'
        ? null
        : await get<Partial<OrbitRegime>>(`i18n/en-US/${bundle}/${r.id}.json`).catch(() => null));
    merged.push(fallback ? { ...r, ...fallback } : r);
  }
  return merged;
}

export async function getOrbitRegimes(locale = 'en-US'): Promise<OrbitRegime[]> {
  return loadOrbitRegimes('orbit-regimes', locale);
}

export async function getOrbitRegimesMoon(locale = 'en-US'): Promise<OrbitRegime[]> {
  return loadOrbitRegimes('orbit-regimes-moon', locale);
}

export async function getOrbitRegimesMars(locale = 'en-US'): Promise<OrbitRegime[]> {
  return loadOrbitRegimes('orbit-regimes-mars', locale);
}

/** Heliocentric zones for /explore's scale ruler (#357). Same overlay
 *  shape as the surface-route regimes; the data file uses `distance_au`
 *  instead of `altitude_km` since /explore zones are heliocentric. */
export async function getOrbitRegimesExplore(locale = 'en-US'): Promise<OrbitRegime[]> {
  return loadOrbitRegimes('orbit-regimes-explore', locale);
}

/**
 * Returns the Sun's astrophysical figures merged with its locale
 * overlay. Falls back to en-US when a locale overlay is missing.
 */
export async function getSun(locale = 'en-US'): Promise<LocalizedSun> {
  const baseRecord = await get<Sun>('sun.json');
  const overlay = await get<SunOverlay>(`i18n/${locale}/sun.json`).catch(() => null);
  const fallback =
    overlay ??
    (locale === 'en-US' ? null : await get<SunOverlay>('i18n/en-US/sun.json').catch(() => null));
  if (!fallback) {
    throw new Error(`Missing Sun overlay (locale ${locale}, no en-US fallback)`);
  }
  return { ...baseRecord, ...fallback };
}
