/**
 * Collectible cards (#547) — the CardSpec contract + per-type resolvers.
 *
 * ONE data shape feeds every card template. Templates are pure HTML/CSS
 * (`CollectibleCard.svelte`); restyling is a template edit that applies to
 * every card instantly — nothing is ever pre-generated per entity
 * (operator direction 2026-09-12: Higgsfield was design consultation only;
 * production cards are live markup).
 *
 * Resolvers are pure mappings over data the app already loads — panel
 * descriptions (translated), structured stats, pickHero imagery, computed
 * figure assets (e.g. the mission trajectory thumbnails). Adding a card
 * type = adding a resolver; no new content authoring.
 */
import type { Mission, MissionIndex } from '$types/mission';
import type { FleetEntry, FleetIndexEntry } from '$types/fleet';
import type { SurfaceSite } from '$types/surface-site';
import type { LocalizedPlanet } from '$types/planet';
import type { SatelliteEntry } from '$lib/data/small-bodies';
import { PLANET_STATS } from '$lib/physics/util/planet-stats';
import * as m from '$lib/paraglide/messages';

export interface CardStat {
  label: string;
  value: string;
}

export interface CardSpec {
  /** Collection name, uppercase — 'MISSIONS', 'FLEET', 'DEEP SPACE'… */
  collection: string;
  /** Position within the collection, e.g. '012/125'. */
  number: string;
  title: string;
  /** One-line context under the title: 'NASA · CREWED LANDER · 1969'. */
  kicker: string;
  /** 1–2 sentence story (from the translated panel description). */
  story: string;
  /** Up to 6 label/value pairs. Values carry the visual weight. */
  stats: CardStat[];
  /** The footer highlight line. `factLabel` names its register — 'FIRST'
   *  for milestone facts (the mission `first` field), 'FACT' otherwise. */
  fact?: string;
  factLabel?: string;
  heroUrl?: string;
  /** The figure slot — a computed visual (trajectory thumbnail, orbit
   *  glyph…). Rendered monochrome by the template. */
  figureUrl?: string;
  figureCaption?: string;
  creditLine: string;
  /** Human-readable share slug shown on the card. */
  slug: string;
  /** Build-generated PNG of this card (S2 generator) — the Share-card
   *  file + og:image. Root-relative; may not exist yet for new entities
   *  (the overlay probes and degrades to link-only). */
  imagePath?: string;
  /** Share-stub path (S3) — '/c/<kind>/<id>', the prerendered page that
   *  carries the Open Graph card and forwards into the app view. */
  shareHref?: string;
}

/** Lead of a paragraph: up to `n` sentences, but never past ~`maxChars` —
 *  falls back to fewer sentences when the join runs long (card real estate
 *  is fixed; a 5-line story crowds the grid). */
function leadSentences(text: string, n: number, maxChars = 190): string {
  const parts = text.split(/(?<=[.!?])\s+/);
  let out = '';
  for (const part of parts.slice(0, n)) {
    const next = out ? `${out} ${part}` : part;
    if (out && next.length > maxChars) break;
    out = next;
  }
  return out.trim();
}

/** Shorten a data value for a stat chip — strip parentheticals, cut on a
 *  word boundary (never mid-word). */
function chip(value: string, max = 26): string {
  const cleaned = value.replace(/\s*\([^)]*\)/g, '').trim();
  if (cleaned.length <= max) return cleaned;
  const cut = cleaned.slice(0, max);
  const boundary = cut.lastIndexOf(' ');
  return `${(boundary > 8 ? cut.slice(0, boundary) : cut).trimEnd()}…`;
}

/** Leading quantity of a spec string: '46782 kg launched (CSM…)' → '46,782 KG'. */
function leadQuantity(value: string): string | null {
  const m = /^~?([\d][\d,.]*)\s*(kg|t|lb|km\/s|m\/s)/i.exec(value.trim());
  if (!m) return null;
  const num = Number(m[1].replace(/,/g, ''));
  const formatted = Number.isFinite(num) ? num.toLocaleString('en-US') : m[1];
  return `${value.trim().startsWith('~') ? '~' : ''}${formatted} ${m[2].toUpperCase()}`;
}

/** ISO date → the card's mono register: '1969-07-16' → 'JUL 16 1969'. */
function cardDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d
    .toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .replace(',', '')
    .toUpperCase();
}

export function cardForMission(
  mission: Mission,
  index: MissionIndex[],
  heroUrl?: string,
): CardSpec {
  const pos = index.findIndex((mi) => mi.id === mission.id);
  const total = index.length;
  const number = pos >= 0 ? `${String(pos + 1).padStart(3, '0')}/${total}` : `—/${total}`;

  const year = mission.year ? String(mission.year) : '';
  // The overlay `type` often ends '· <STATUS>' ('CREWED LANDER · FLOWN');
  // the stat grid already carries STATUS — strip the dupe from the kicker.
  const typeLine = (mission.type ?? mission.dest)
    .replace(new RegExp(`\\s*·\\s*${mission.status}\\s*$`, 'i'), '')
    .trim();
  const kicker = [mission.agency, typeLine, year].filter(Boolean).join(' · ');

  const stats: CardStat[] = [];
  if (mission.departure_date)
    stats.push({ label: m.card_stat_launch(), value: cardDate(mission.departure_date) });
  if (mission.vehicle) stats.push({ label: m.card_stat_vehicle(), value: chip(mission.vehicle) });
  if (mission.transit_days)
    stats.push({ label: m.card_stat_transit(), value: `${mission.transit_days} D` });
  if (mission.delta_v) stats.push({ label: 'ΔV', value: chip(mission.delta_v, 18) });
  if (mission.payload)
    stats.push({
      label: m.card_stat_payload(),
      value: leadQuantity(mission.payload) ?? chip(mission.payload),
    });
  stats.push({ label: m.card_stat_status(), value: mission.status });

  return {
    collection: m.card_collection_missions(),
    number,
    title: mission.name ?? mission.id,
    kicker,
    story: mission.description ? leadSentences(mission.description, 2) : '',
    stats: stats.slice(0, 6),
    fact: mission.first,
    factLabel: mission.first ? m.card_fact_first() : undefined,
    heroUrl,
    figureUrl: `/images/missions/thumbnails/${mission.id}.webp`,
    figureCaption: m.card_caption_trajectory(),
    creditLine: mission.credit ? `SOURCES: ${chip(mission.credit, 60)}` : '',
    slug: `orrery.day/c/mission/${mission.id}`,
    imagePath: `/images/cards/mission/${mission.id}.jpg`,
    shareHref: `/c/mission/${mission.id}`,
  };
}

/**
 * True when a fleet entry shares its id with a mission — the same real thing
 * on two surfaces (Perseverance the rover IS Perseverance the mission; 47
 * craft overlap this way). The mission card is canonical for those: it has
 * the richer spec set (launch, ΔV, transit, trajectory figure) and one
 * collectible per real thing keeps the collection honest. Panels alias to
 * the mission card; the generator + share stubs skip the fleet duplicate.
 */
export function fleetAliasesMission(fleetId: string, missionIndex: MissionIndex[]): boolean {
  return missionIndex.some((mi) => mi.id === fleetId);
}

const FLEET_CATEGORY_LABEL: Record<string, () => string> = {
  launcher: m.card_cat_launcher,
  'crewed-spacecraft': m.card_cat_crewed_spacecraft,
  'cargo-spacecraft': m.card_cat_cargo_spacecraft,
  engine: m.card_cat_engine,
  lander: m.card_cat_lander,
  'launch-site': m.card_cat_launch_site,
  observatory: m.card_cat_observatory,
  orbiter: m.card_cat_orbiter,
  rover: m.card_cat_rover,
  'space-suit': m.card_cat_space_suit,
  station: m.card_cat_station,
  constellation: m.card_cat_constellation,
};

export function cardForFleet(
  entry: FleetEntry,
  index: FleetIndexEntry[],
  heroUrl?: string,
  /** Anatomy/cutaway illustration when one exists (caller resolves via
   *  spacecraftDiagramPath — kept out of this module so it stays pure). */
  figureUrl?: string,
): CardSpec {
  const pos = index.findIndex((fi) => fi.id === entry.id);
  const total = index.length;
  const number = pos >= 0 ? `${String(pos + 1).padStart(3, '0')}/${total}` : `—/${total}`;

  const year = entry.first_flight ? entry.first_flight.slice(0, 4) : '';
  const category =
    FLEET_CATEGORY_LABEL[entry.category]?.() ?? entry.category.replace(/-/g, ' ').toUpperCase();
  const kicker = [entry.agency, category, year].filter(Boolean).join(' · ');

  const stats: CardStat[] = [];
  if (entry.first_flight)
    stats.push({ label: m.card_stat_first_flight(), value: cardDate(entry.first_flight) });
  // Multi-contractor strings ('Boeing / North American / Douglas') double-
  // truncate in the half-width stat cell — lead with the prime contractor.
  if (entry.manufacturer)
    stats.push({ label: m.card_stat_builder(), value: chip(entry.manufacturer.split(' / ')[0]) });
  if (entry.country) stats.push({ label: m.card_stat_country(), value: chip(entry.country) });
  if (entry.era) stats.push({ label: m.card_stat_era(), value: entry.era });
  if (entry.linked_missions?.length)
    stats.push({ label: m.card_stat_missions(), value: String(entry.linked_missions.length) });
  stats.push({ label: m.card_stat_status(), value: entry.status });

  return {
    collection: m.card_collection_fleet(),
    number,
    title: entry.name,
    kicker,
    story: entry.description
      ? leadSentences(entry.description, 2)
      : (entry.tagline ?? entry.best_known_for ?? ''),
    stats: stats.slice(0, 6),
    fact: entry.best_known_for,
    factLabel: entry.best_known_for ? m.card_fact_known_for() : undefined,
    heroUrl,
    figureUrl,
    figureCaption: figureUrl ? m.card_caption_anatomy() : undefined,
    creditLine: `SOURCES: ${chip(entry.agency, 60)}`,
    slug: `orrery.day/c/fleet/${entry.id}`,
    imagePath: `/images/cards/fleet/${entry.id}.jpg`,
    shareHref: `/c/fleet/${entry.id}`,
  };
}

/**
 * Mission id a surface site aliases to, or null. Most moon/mars/venus sites
 * ARE missions (Apollo 11 the site is Apollo 11 the mission) — matched by
 * `mission_id` first, id parity second (same rule the panels' crossSite
 * lookup uses). Aliased sites show the canonical mission card; only the
 * handful without a mission record (45 of 54 alias) get a site card.
 */
export function siteAliasMissionId(
  site: { id: string; mission_id?: string },
  missionIndex: MissionIndex[],
): string | null {
  if (site.mission_id && missionIndex.some((mi) => mi.id === site.mission_id))
    return site.mission_id;
  if (missionIndex.some((mi) => mi.id === site.id)) return site.id;
  return null;
}

/** '47.7°N 134.3°E' — the card register for site coordinates. */
function cardCoords(lat: number, lon: number): string {
  const la = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lo = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
  return `${la} ${lo}`;
}

export function cardForSite(
  site: SurfaceSite,
  sites: SurfaceSite[],
  body: 'moon' | 'mars',
  heroUrl?: string,
): CardSpec {
  const pos = sites.findIndex((s) => s.id === site.id);
  const total = sites.length;
  const number = pos >= 0 ? `${String(pos + 1).padStart(3, '0')}/${total}` : `—/${total}`;

  // Overlay mission_type reads 'Uncrewed Lander · Mission Complete' — the
  // stat grid carries status, so the kicker takes the vehicle class only.
  const typeLine = (site.mission_type?.split('·')[0].trim() ?? site.kind).toUpperCase();
  const kicker = [site.agency, typeLine, site.year ? String(site.year) : '']
    .filter(Boolean)
    .join(' · ');

  const stats: CardStat[] = [];
  if (site.kind === 'surface') {
    if (site.landing_date)
      stats.push({ label: m.card_stat_landed(), value: cardDate(site.landing_date) });
    if (site.lat != null && site.lon != null)
      stats.push({ label: m.card_stat_coords(), value: cardCoords(site.lat, site.lon) });
    if (site.surface_duration_days)
      stats.push({
        label: m.card_stat_surface(),
        value: `${site.surface_duration_days.toLocaleString('en-US')} D`,
      });
    if (site.samples_kg)
      stats.push({ label: m.card_stat_samples(), value: `${site.samples_kg} KG` });
  } else {
    if (site.altitude_km)
      stats.push({
        label: m.card_stat_orbit(),
        value: `${site.altitude_km.toLocaleString('en-US')} KM`,
      });
    if (site.inclination_deg != null)
      stats.push({ label: m.card_stat_inclination(), value: `${site.inclination_deg}°` });
  }
  if (site.nation) stats.push({ label: m.card_stat_nation(), value: site.nation });
  stats.push({ label: m.card_stat_status(), value: site.status });

  return {
    collection: body === 'moon' ? m.card_collection_moon_sites() : m.card_collection_mars_sites(),
    number,
    title: site.name ?? site.id,
    kicker,
    story: site.fact ? leadSentences(site.fact, 2) : (site.left ?? ''),
    stats: stats.slice(0, 6),
    fact: site.site_name ?? site.capability,
    factLabel: site.site_name
      ? m.card_fact_site()
      : site.capability
        ? m.card_fact_role()
        : undefined,
    heroUrl,
    creditLine: `SOURCES: ${chip(site.credit.replace(/^©\s*/, ''), 60)}`,
    slug: `orrery.day/c/${body}-site/${site.id}`,
    imagePath: `/images/cards/${body}-site/${site.id}.jpg`,
    shareHref: `/c/${body}-site/${site.id}`,
  };
}

const SURFACE_KIND_LABEL: Record<string, () => string> = {
  rocky: m.card_kind_rocky_planet,
  'rocky-liquid': m.card_kind_rocky_planet,
  'rocky-ice': m.card_kind_rocky_planet,
  'gas-giant': m.card_kind_gas_giant,
  'ice-giant': m.card_kind_ice_giant,
};

/**
 * Planet cards cover the 8 classical planets (+Earth). Pluto is excluded:
 * its /explore detail panel is the SmallBodyPanel (small-body wins the ?id=
 * resolution), so its canonical card belongs to the small-body kind.
 */
export function planetCardList(planets: LocalizedPlanet[]): LocalizedPlanet[] {
  return planets.filter((p) => p.id !== 'pluto');
}

export function cardForPlanet(
  planet: LocalizedPlanet,
  planets: LocalizedPlanet[],
  heroUrl?: string,
): CardSpec {
  const list = planetCardList(planets);
  const pos = list.findIndex((p) => p.id === planet.id);
  const total = list.length;
  const number = pos >= 0 ? `${String(pos + 1).padStart(3, '0')}/${total}` : `—/${total}`;

  const phys = PLANET_STATS[planet.id];
  const kindLabel = phys
    ? (SURFACE_KIND_LABEL[phys.surfaceKind]?.() ?? m.card_kind_planet())
    : m.card_kind_planet();
  const kicker = `${kindLabel} · ${planet.a.toFixed(2)} AU`;

  const stats: CardStat[] = [];
  if (phys) {
    stats.push({
      label: m.card_stat_diameter(),
      value: `${phys.diameterKm.toLocaleString('en-US')} KM`,
    });
    stats.push({ label: m.card_stat_gravity(), value: `${phys.surfaceGravityG} G` });
  }
  // rotPeriod is in Earth days — hours reads better for fast rotators
  // (Mars 24.6 H), days for the slow ones (Venus 243 D).
  if (planet.rotPeriod)
    stats.push({
      label: m.card_stat_day(),
      value:
        planet.rotPeriod < 3
          ? `${(planet.rotPeriod * 24).toFixed(1)} H`
          : `${Math.round(planet.rotPeriod)} D`,
    });
  if (planet.T)
    stats.push({
      label: m.card_stat_year(),
      value: planet.T < 1000 ? `${Math.round(planet.T)} D` : `${(planet.T / 365.25).toFixed(1)} Y`,
    });
  if (phys) {
    stats.push({ label: m.card_stat_temp(), value: `${Math.round(phys.surfaceTempK - 273.15)}°C` });
    stats.push({ label: m.card_stat_escape(), value: `${phys.escapeKms} KM/S` });
  }

  return {
    collection: m.card_collection_planets(),
    number,
    title: planet.name,
    kicker,
    story: planet.bio ? leadSentences(planet.bio, 2) : '',
    stats: stats.slice(0, 6),
    fact: planet.fact ? leadSentences(planet.fact, 1) : undefined,
    factLabel: planet.fact ? m.card_fact_fact() : undefined,
    heroUrl,
    creditLine: 'SOURCES: NASA / ESA',
    slug: `orrery.day/c/planet/${planet.id}`,
    imagePath: `/images/cards/planet/${planet.id}.jpg`,
    shareHref: `/c/planet/${planet.id}`,
  };
}

/** Leading 4-digit year of a discovery string ('1610 by Galileo Galilei'). */
function discoveryYear(discovered?: string): string | null {
  const m = /\b(\d{4})\b/.exec(discovered ?? '');
  return m ? m[1] : null;
}

export function cardForSatellite(
  entry: SatelliteEntry,
  satellites: SatelliteEntry[],
  heroUrl?: string,
): CardSpec {
  const pos = satellites.findIndex((s) => s.id === entry.id);
  const total = satellites.length;
  const number = pos >= 0 ? `${String(pos + 1).padStart(3, '0')}/${total}` : `—/${total}`;

  const year = discoveryYear(entry.discovered);
  const kicker = [entry.parent_planet_name.toUpperCase(), m.card_kicker_moon(), year ?? '']
    .filter(Boolean)
    .join(' · ');

  const stats: CardStat[] = [];
  if (entry.radius_km)
    stats.push({
      label: m.card_stat_radius(),
      value: `${entry.radius_km.toLocaleString('en-US')} KM`,
    });
  if (entry.semi_major_axis_km)
    stats.push({
      label: m.card_stat_orbit(),
      value: `${Math.round(entry.semi_major_axis_km).toLocaleString('en-US')} KM`,
    });
  if (entry.orbital_period_days)
    stats.push({ label: m.card_stat_period(), value: `${entry.orbital_period_days} D` });
  stats.push({ label: m.card_stat_parent(), value: entry.parent_planet_name });
  if (year) stats.push({ label: m.card_stat_discovered(), value: year });
  if (entry.mission_visits?.length)
    stats.push({ label: m.card_stat_visits(), value: String(entry.mission_visits.length) });

  return {
    collection: m.card_collection_moons(),
    number,
    title: entry.name,
    kicker,
    story: entry.description ? leadSentences(entry.description, 2) : '',
    stats: stats.slice(0, 6),
    fact: entry.surface_composition,
    factLabel: entry.surface_composition ? m.card_stat_surface() : undefined,
    heroUrl,
    creditLine: 'SOURCES: NASA / ESA',
    slug: `orrery.day/c/moon/${entry.id}`,
    imagePath: `/images/cards/moon/${entry.id}.jpg`,
    shareHref: `/c/moon/${entry.id}`,
  };
}

/** Structural shape of /explore's small-body records (the full type lives
 *  inline in SmallBodyPanel; resolvers only need these fields). */
export interface SmallBodyLike {
  id: string;
  name: string;
  type: 'dwarf' | 'comet' | 'interstellar' | 'asteroid' | 'kbo';
  a: number;
  e: number;
  T: number;
  incl: number;
  radius_km?: number;
  discovered?: string;
  mission_visited?: string | null;
  description?: string;
}

const SMALL_BODY_TYPE_LABEL: Record<SmallBodyLike['type'], () => string> = {
  dwarf: m.card_kind_dwarf,
  comet: m.card_kind_comet,
  interstellar: m.card_kind_interstellar,
  asteroid: m.card_kind_asteroid,
  kbo: m.card_kind_kbo,
};

export function cardForSmallBody(
  body: SmallBodyLike,
  bodies: SmallBodyLike[],
  heroUrl?: string,
): CardSpec {
  const pos = bodies.findIndex((b) => b.id === body.id);
  const total = bodies.length;
  const number = pos >= 0 ? `${String(pos + 1).padStart(3, '0')}/${total}` : `—/${total}`;

  const typeLabel = SMALL_BODY_TYPE_LABEL[body.type]();
  // Hyperbolic interlopers ('Oumuamua) have no meaningful semi-major axis.
  const boundOrbit = body.type !== 'interstellar' && body.a > 0;
  const kicker = boundOrbit ? `${typeLabel} · ${body.a.toFixed(2)} AU` : typeLabel;

  const stats: CardStat[] = [];
  if (body.radius_km)
    stats.push({
      label: m.card_stat_radius(),
      value: `${body.radius_km.toLocaleString('en-US')} KM`,
    });
  if (boundOrbit) {
    stats.push({ label: m.card_stat_orbit(), value: `${body.a.toFixed(2)} AU` });
    stats.push({
      label: m.card_stat_period(),
      value: body.T < 1000 ? `${Math.round(body.T)} D` : `${(body.T / 365.25).toFixed(1)} Y`,
    });
  }
  if (body.incl != null)
    stats.push({ label: m.card_stat_inclination(), value: `${body.incl.toFixed(1)}°` });
  const year = discoveryYear(body.discovered ?? undefined);
  if (year) stats.push({ label: m.card_stat_discovered(), value: year });
  stats.push({ label: m.card_stat_eccentricity(), value: body.e.toFixed(2) });

  return {
    collection: m.card_collection_small_bodies(),
    number,
    title: body.name,
    kicker,
    story: body.description ? leadSentences(body.description, 2) : '',
    stats: stats.slice(0, 6),
    fact: body.mission_visited ? chip(body.mission_visited, 60) : undefined,
    factLabel: body.mission_visited ? m.card_fact_visited_by() : undefined,
    heroUrl,
    creditLine: 'SOURCES: NASA / ESA',
    slug: `orrery.day/c/small-body/${body.id}`,
    imagePath: `/images/cards/small-body/${body.id}.jpg`,
    shareHref: `/c/small-body/${body.id}`,
  };
}

/**
 * Canonical card for an /earth (or /moon-ring) orbital object. Nearly every
 * earth-object IS something that already has a card: lunar orbiters are
 * missions (id parity, guarded by dest↔body so the Galileo GNSS
 * constellation never aliases the Galileo Jupiter mission), and
 * constellations/stations/observatories carry fleet_refs to their fleet
 * entry (ISS, Starlink, JWST…). Objects matching neither (the generic GEO
 * belt marker) get no card.
 */
export function earthObjectCardAlias(
  eo: { id: string; body?: string; fleet_refs?: Array<{ id: string }> },
  missionIndex: MissionIndex[],
  fleetIndex: FleetIndexEntry[],
): { kind: 'mission' | 'fleet'; id: string } | null {
  const mi = missionIndex.find((r) => r.id === eo.id);
  if (mi && mi.dest === eo.body) return { kind: 'mission', id: eo.id };
  const fref = eo.fleet_refs?.find((r) => fleetIndex.some((fi) => fi.id === r.id));
  if (fref) return { kind: 'fleet', id: fref.id };
  return null;
}
