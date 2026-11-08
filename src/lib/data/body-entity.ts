import { get, type FetchLike } from './core';

export type BodyKind = 'planet' | 'moon' | 'small-body';

/** What a /explore/<id> page shows, from the base record + its locale overlay. */
export interface BodyEntity {
  id: string;
  kind: BodyKind;
  name: string;
  /** "Terrestrial planet", "Moon of Jupiter" … (overlay `type`), when present. */
  type?: string;
  /** One-line fact, then the longer text (planet bio / moon or small-body description). */
  fact?: string;
  text?: string;
  surface?: string;
  /** Parent planet id for moons (in-app view /explore?id=<parent>:<id>). */
  parent?: string;
  /** Visits, one line each ("Juno — USA, 2022 (…)"), only in the page's language. */
  visits: string[];
}

interface Overlay {
  name?: string;
  type?: string;
  fact?: string;
  bio?: string;
  description?: string;
  surface_composition?: string;
  mission_visits?: string[];
}

/**
 * One planet, moon or small body for its /explore/<id> page (0.9.8 SEO): base
 * record + locale overlay (en-US fallback). Small bodies with a planets/ overlay
 * (arrokoth, didymos …) take its fact / bio too. Takes the prerender `fetch`.
 */
export async function getBodyEntity(
  id: string,
  locale: string,
  fetchFn: FetchLike = fetch,
): Promise<BodyEntity | null> {
  const overlay = async (dir: string): Promise<Overlay> =>
    (await get<Overlay>(`i18n/${locale}/${dir}/${id}.json`, fetchFn).catch(() => null)) ??
    (locale === 'en-US'
      ? null
      : await get<Overlay>(`i18n/en-US/${dir}/${id}.json`, fetchFn).catch(() => null)) ??
    {};

  const planets = await get<{ planets: { name: string; mission_visits?: string[] }[] }>(
    'planets.json',
    fetchFn,
  );
  const planet = planets.planets.find((p) => p.name.toLowerCase() === id);
  if (planet) {
    const o = await overlay('planets');
    return {
      id,
      kind: 'planet',
      name: o.name ?? planet.name,
      type: o.type,
      fact: o.fact,
      text: o.bio,
      visits: locale === 'en-US' ? (planet.mission_visits ?? []) : [],
    };
  }

  const sats = await get<{
    satellites: {
      id: string;
      name: string;
      parent_planet_id: string;
      description?: string;
      surface_composition?: string;
      mission_visits?: string[];
    }[];
  }>('satellites.json', fetchFn);
  const sat = sats.satellites.find((s) => s.id === id);
  if (sat) {
    const o = await overlay('satellites');
    return {
      id,
      kind: 'moon',
      name: o.name ?? sat.name,
      text: o.description ?? sat.description,
      surface: o.surface_composition ?? sat.surface_composition,
      parent: sat.parent_planet_id,
      visits: o.mission_visits ?? (locale === 'en-US' ? (sat.mission_visits ?? []) : []),
    };
  }

  const smalls = await get<{
    bodies: { id: string; name: string; description?: string; mission_visits?: string[] }[];
  }>('small-bodies.json', fetchFn);
  const body = smalls.bodies.find((b) => b.id === id);
  if (body) {
    const [o, p] = await Promise.all([overlay('small-bodies'), overlay('planets')]);
    return {
      id,
      kind: 'small-body',
      name: p.name ?? o.name ?? body.name,
      type: p.type,
      fact: p.fact,
      text: o.description ?? body.description,
      visits: o.mission_visits ?? (locale === 'en-US' ? (body.mission_visits ?? []) : []),
    };
  }
  return null;
}
