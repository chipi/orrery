import { get, type FetchLike } from './core';

export type BodyKind = 'planet' | 'moon' | 'small-body';

/** An /science section a body's record points at, with the body-specific reason (overlay text). */
export interface BodyScienceRef {
  tab: string;
  section: string;
  why?: string;
}

/** The numbers the panels show, raw: orbit, size, tilt, discovery. */
export interface BodyStats {
  /** Semi-major axis: AU around the Sun, km around a planet. */
  semiMajorAxisAu?: number;
  semiMajorAxisKm?: number;
  eccentricity?: number;
  inclinationDeg?: number;
  periodDays?: number;
  radiusKm?: number;
  axialTiltDeg?: number;
  discovered?: string;
}

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
  stats: BodyStats;
  science: BodyScienceRef[];
}

interface Overlay {
  name?: string;
  type?: string;
  fact?: string;
  bio?: string;
  description?: string;
  surface_composition?: string;
  mission_visits?: string[];
  science_sections?: BodyScienceRef[];
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

  const planets = await get<{
    planets: {
      name: string;
      a: number;
      e: number;
      T: number;
      incl: number;
      axialTilt?: number;
      mission_visits?: string[];
      science_sections?: BodyScienceRef[];
    }[];
  }>('planets.json', fetchFn);
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
      stats: {
        semiMajorAxisAu: planet.a,
        eccentricity: planet.e,
        inclinationDeg: planet.incl,
        periodDays: planet.T,
        axialTiltDeg: planet.axialTilt,
      },
      science: o.science_sections ?? planet.science_sections ?? [],
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
      radius_km?: number;
      semi_major_axis_km?: number;
      orbital_period_days?: number;
      axial_tilt_deg?: number;
      discovered?: string;
      science_sections?: BodyScienceRef[];
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
      stats: {
        radiusKm: sat.radius_km,
        semiMajorAxisKm: sat.semi_major_axis_km,
        periodDays: sat.orbital_period_days,
        axialTiltDeg: sat.axial_tilt_deg,
        discovered: sat.discovered,
      },
      science: o.science_sections ?? sat.science_sections ?? [],
    };
  }

  const smalls = await get<{
    bodies: {
      id: string;
      name: string;
      description?: string;
      mission_visits?: string[];
      a: number;
      e: number;
      T: number;
      incl: number;
      radius_km?: number;
      discovered?: string;
      science_sections?: BodyScienceRef[];
    }[];
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
      stats: {
        semiMajorAxisAu: body.a,
        eccentricity: body.e,
        inclinationDeg: body.incl,
        periodDays: body.T,
        radiusKm: body.radius_km,
        discovered: body.discovered,
      },
      science: o.science_sections ?? body.science_sections ?? [],
    };
  }
  return null;
}
