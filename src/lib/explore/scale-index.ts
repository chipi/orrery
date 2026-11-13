/**
 * The INDEX of every /explore scale (UXD-017): one row model and one filter set for all eight
 * scale shells. Pure and framework-free: the server builds the rows (`getScaleIndexRows` in
 * `$lib/server/entity-index`) and `ScaleIndex.svelte` renders them. A row is one selectable
 * object of the scene; `href` is set when that object has an entity page.
 */
import { constellationName } from '$lib/universe/iau-constellations';
import { deepSkyTitle } from './deep-sky-title';
import { PLANET_STATS } from '$lib/physics/util/planet-stats';
import type { LocaleCode } from '$lib/locale';
import {
  SATELLITE_STATS,
  beltIndexMeta,
  moonIndexMeta,
  planetIndexMeta,
  smallBodyIndexMeta,
} from './format';
import type { ShellId } from './scale-shell-controller';

export type IndexSection =
  | 'stars'
  | 'deep-sky'
  | 'planets'
  | 'small-bodies'
  | 'moons'
  | 'belts'
  | 'objects'
  | 'globulars'
  | 'satellites'
  | 'arms'
  | 'black-holes'
  | 'fiction';

export type IndexBadge = 'system' | 'culture' | 'headliner' | 'black-hole';

export interface ScaleIndexRow {
  /** The scene id the select function takes (`m13`, `virgo-cluster`, `mercury`). */
  id: string;
  name: string;
  /** The data's own kind (`spiral`, `supercluster`, `globular-cluster`, a deep-sky category …). */
  kind: string;
  section?: IndexSection;
  /**
   * One short line after the name (constellation; on the solar system distance, size and moons,
   * built per request locale); the kind label when absent.
   */
  meta?: string;
  badges?: IndexBadge[];
  /** Locale-free path of the object's entity page, absent when it has none. */
  href?: string;
  /** A moon's parent planet id (the select function takes both). */
  parent?: string;
  /** Dot colour of a solar-system row, set by the page. */
  color?: string;
  /** False for a row whose object the scene does not draw. */
  selectable: boolean;
}

export type ScaleIndexRows = Record<ShellId, ScaleIndexRow[]>;

/** The solar system also lists in the 2D view; every other scale is a 3D scene. */
export const INDEX_NEEDS_3D: Record<ShellId, boolean> = {
  'solar-system': false,
  neighborhood: true,
  'milky-way': true,
  'local-group': true,
  'local-sheet': true,
  virgo: true,
  laniakea: true,
  'cosmic-web': true,
};

export type IndexFilterId =
  | 'system'
  | 'culture'
  | 'deep-sky'
  | 'headliner'
  | 'planet'
  | 'dwarf'
  | 'asteroid'
  | 'moon'
  | 'comet'
  | 'globular'
  | 'satellite'
  | 'arm'
  | 'black-hole'
  | 'spiral'
  | 'irregular'
  | 'dwarf-galaxy'
  | 'group'
  | 'cloud'
  | 'cluster'
  | 'supercluster'
  | 'attractor'
  | 'wall'
  | 'void'
  | 'concentration';

const hasBadge =
  (b: IndexBadge) =>
  (r: ScaleIndexRow): boolean =>
    r.badges?.includes(b) ?? false;
const isKind =
  (...kinds: string[]) =>
  (r: ScaleIndexRow): boolean =>
    kinds.includes(r.kind);

export const FILTER_TESTS: Record<IndexFilterId, (r: ScaleIndexRow) => boolean> = {
  system: hasBadge('system'),
  culture: hasBadge('culture'),
  'deep-sky': (r) => r.section === 'deep-sky',
  headliner: hasBadge('headliner'),
  planet: isKind('planet'),
  dwarf: isKind('dwarf'),
  asteroid: isKind('asteroid', 'kbo'),
  moon: isKind('moon'),
  comet: isKind('comet', 'interstellar'),
  globular: isKind('globular-cluster'),
  satellite: isKind('satellite-galaxy'),
  arm: isKind('spiral-arm'),
  'black-hole': hasBadge('black-hole'),
  spiral: isKind('spiral'),
  irregular: isKind('irregular'),
  'dwarf-galaxy': isKind('dwarf-elliptical', 'dwarf-spheroidal', 'dwarf-irregular'),
  group: isKind('group'),
  cloud: isKind('cloud'),
  cluster: isKind('cluster'),
  supercluster: isKind('supercluster'),
  attractor: isKind('attractor'),
  wall: isKind('wall'),
  void: isKind('void'),
  concentration: isKind('concentration'),
};

/** The chips of each scale after All: kind chips, plus Highlights where a row is a headliner. */
export const SCALE_FILTERS: Record<ShellId, IndexFilterId[]> = {
  'solar-system': ['planet', 'dwarf', 'asteroid', 'moon', 'comet'],
  neighborhood: ['system', 'culture', 'deep-sky'],
  'milky-way': ['headliner', 'globular', 'satellite', 'arm', 'black-hole'],
  'local-group': ['headliner', 'spiral', 'irregular', 'dwarf-galaxy'],
  'local-sheet': ['headliner', 'group', 'cloud'],
  virgo: ['headliner', 'group', 'cluster', 'cloud'],
  laniakea: ['headliner', 'supercluster', 'attractor', 'cluster'],
  'cosmic-web': ['headliner', 'supercluster', 'wall', 'void', 'concentration'],
};

/** The words of a meta line the search box reads: a moon's planet, a kind ("Star"), never the
 *  measurements, so "km" or "2" does not match every row. */
export const metaWords = (meta: string): string =>
  meta
    .split(' · ')
    .filter((p) => !/\d/.test(p))
    .join(' · ');

/** The rows a chip (null = All) and the search box leave, in list order. */
export function filterRows(
  rows: ScaleIndexRow[],
  filter: IndexFilterId | null,
  query: string,
  metaOf: (r: ScaleIndexRow) => string = (r) => r.meta ?? '',
): ScaleIndexRow[] {
  const q = query.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (filter === null || FILTER_TESTS[filter](r)) &&
      (!q || r.name.toLowerCase().includes(q) || metaWords(metaOf(r)).toLowerCase().includes(q)),
  );
}

/** Consecutive rows of one section, in list order (rows without a section lead the list). */
export function groupBySection(
  rows: ScaleIndexRow[],
): { section: IndexSection | undefined; rows: ScaleIndexRow[] }[] {
  const groups: { section: IndexSection | undefined; rows: ScaleIndexRow[] }[] = [];
  for (const r of rows) {
    const last = groups[groups.length - 1];
    if (last && last.section === r.section) last.rows.push(r);
    else groups.push({ section: r.section, rows: [r] });
  }
  return groups;
}

// ─── Row builders ─────────────────────────────────────────────────────────────

export interface ScaleIndexSource {
  /** Sorts the star and deep-sky lists. */
  locale: string;
  /** Display names in the reader's language, by id; a missing id falls back to the data's name. */
  names: {
    body: Record<string, string>;
    star: Record<string, string>;
    blackHole: Record<string, string>;
    belt: Record<string, string>;
    /** Glossary names of the Local Group members and of the outer structures (the data's name where there is none). */
    galaxy: Record<string, string>;
    structure: Record<string, string>;
    sun?: string;
  };
  /**
   * Ids that have an entity page: /explore/<id>, /explore/stars/<id>, /explore/black-holes/<id>,
   * /explore/deep-sky/<id>, /explore/galaxies/<id>, /explore/structures/<id>.
   */
  pages: {
    body: ReadonlySet<string>;
    star: ReadonlySet<string>;
    blackHole: ReadonlySet<string>;
    deepSky: ReadonlySet<string>;
    galaxy: ReadonlySet<string>;
    structure: ReadonlySet<string>;
  };
  /** Scene ids that name a deep-sky object under another id (andromeda → m31): they link its page. */
  deepSkyAlias: Readonly<Record<string, string>>;
  planets: { name: string; a: number }[];
  smallBodies: { id: string; name: string; type: string; a: number; radius_km?: number }[];
  satellites: {
    id: string;
    name: string;
    parent_planet_id: string;
    parent_planet_name: string;
    radius_km: number;
  }[];
  belts: { id: string; name: string; inner_au: number; outer_au: number }[];
  namedStars: { id: string; proper: string; con: string | null }[];
  hostSystems: { hostId: string; star: { name: string; con: string | null } }[];
  deepSky: { id: string; designation: string; name: string; category: string }[];
  cultureIds: ReadonlySet<string>;
  milkyWay: {
    objects: { id: string; name: string; kind: string }[];
    globulars?: { id: string; name: string; headliner: boolean }[];
    magellanic?: { id: string; name: string }[];
    arms: { id: string; name: string }[];
  };
  localGroup: Member[];
  localSheet: Member[];
  virgo: Member[];
  laniakea: Member[];
  cosmicWeb: Member[];
  blackHoles: { id: string; name: string; kind: string }[];
}

type Member = { id: string; name: string; kind: string; headliner: boolean; parent?: string } & (
  { dist_mly: number } | { dist_mpc: number }
);

const dist = (m: Member): number => ('dist_mly' in m ? m.dist_mly : m.dist_mpc);

type PageOf = (id: string, name: string) => { href: string; name: string } | null;

/** Members nearest first; the data files list them in the order they were authored. */
function memberRows(
  members: Member[],
  names: Record<string, string>,
  pageOf?: PageOf,
): ScaleIndexRow[] {
  return [...members]
    .sort((a, b) => dist(a) - dist(b))
    .map((m) => {
      const name = names[m.id] ?? m.name;
      const page = pageOf?.(m.id, name);
      return {
        id: m.id,
        name: page?.name ?? name,
        kind: m.kind,
        parent: m.parent,
        badges: m.headliner ? ['headliner'] : undefined,
        href: page?.href,
        selectable: true,
      };
    });
}

type PageSource = Pick<ScaleIndexSource, 'deepSky' | 'deepSkyAlias'> & {
  pages: Pick<ScaleIndexSource['pages'], 'deepSky' | 'galaxy' | 'structure'>;
};

/**
 * The deep-sky page an INDEX row of another scale links: one real object, one page, so a Milky Way
 * globular or Local Group member that is the same object as a deep-sky one (DEEP_SKY_ALIAS, or the
 * same id) shares its page, and is named as the page names it (UXD-017).
 */
function deepSkyPageOf(src: PageSource): (id: string) => { href: string; name: string } | null {
  const byId = new Map(src.deepSky.map((o) => [o.id, o]));
  return (id) => {
    const alias = src.deepSkyAlias[id];
    const page = src.pages.deepSky.has(id)
      ? id
      : alias && src.pages.deepSky.has(alias)
        ? alias
        : null;
    const o = page ? byId.get(page) : undefined;
    return page && o ? { href: `/explore/deep-sky/${page}`, name: deepSkyTitle(o) } : null;
  };
}

/**
 * The page of a Local Group member (the deep-sky page of a twin, else /explore/galaxies/<id>) and
 * of a structure (/explore/structures/<id>), for the INDEX rows and for a page's Related list.
 * `name` is the data's name for a member that is not a twin.
 */
export function outerPageOf(src: PageSource): { galaxy: PageOf; structure: PageOf } {
  const twin = deepSkyPageOf(src);
  return {
    galaxy: (id, name) =>
      twin(id) ?? (src.pages.galaxy.has(id) ? { href: `/explore/galaxies/${id}`, name } : null),
    structure: (id, name) =>
      src.pages.structure.has(id) ? { href: `/explore/structures/${id}`, name } : null,
  };
}

function blackHoleRow(
  src: ScaleIndexSource,
  id: string,
  section: IndexSection | undefined,
): ScaleIndexRow {
  const hole = src.blackHoles.find((h) => h.id === id);
  if (!hole) throw new Error(`black hole ${id} is not in black-holes.json`);
  return {
    id,
    name: src.names.blackHole[id] ?? hole.name,
    kind: hole.kind,
    section,
    badges: ['black-hole'],
    href: src.pages.blackHole.has(id) ? `/explore/black-holes/${id}` : undefined,
    selectable: true,
  };
}

function solarRows(src: ScaleIndexSource): ScaleIndexRow[] {
  const rows: ScaleIndexRow[] = [];
  // Pluto is in planets.json and in small-bodies.json: the planet row wins, as in the scene.
  const seen = new Set<string>();
  const page = (id: string) => (src.pages.body.has(id) ? `/explore/${id}` : undefined);
  const bodyName = (id: string, fallback: string) => src.names.body[id] ?? fallback;
  rows.push({
    id: 'sun',
    name: src.names.sun ?? 'Sun',
    kind: 'sun',
    selectable: true,
  });
  seen.add('sun');
  const locale = src.locale as LocaleCode;
  for (const p of src.planets) {
    const id = p.name.toLowerCase();
    seen.add(id);
    const stats = PLANET_STATS[id];
    if (!stats) throw new Error(`planet ${id} has no PLANET_STATS diameter`);
    rows.push({
      id,
      name: bodyName(id, p.name),
      kind: 'planet',
      section: 'planets',
      meta: planetIndexMeta(
        {
          au: p.a,
          diameterKm: stats.diameterKm,
          moons: src.satellites.filter((s) => s.parent_planet_id === id).length,
        },
        locale,
      ),
      href: page(id),
      selectable: true,
    });
  }
  for (const b of src.smallBodies) {
    if (seen.has(b.id)) continue;
    seen.add(b.id);
    rows.push({
      id: b.id,
      name: bodyName(b.id, b.name),
      kind: b.type,
      section: 'small-bodies',
      // A comet prints its distance only (its nucleus is no size anyone sees); ʻOumuamua's orbit is
      // open (a < 0), so it has no distance and the row shows the kind label.
      meta:
        b.type === 'interstellar'
          ? undefined
          : smallBodyIndexMeta(
              {
                au: b.a,
                diameterKm: b.type === 'comet' || !b.radius_km ? undefined : b.radius_km * 2,
              },
              locale,
            ),
      href: page(b.id),
      selectable: true,
    });
  }
  for (const s of src.satellites) {
    const diameterKm = SATELLITE_STATS[s.id]?.diameterKm ?? s.radius_km * 2;
    rows.push({
      id: s.id,
      name: bodyName(s.id, s.name),
      kind: 'moon',
      section: 'moons',
      meta: moonIndexMeta(bodyName(s.parent_planet_id, s.parent_planet_name), diameterKm, locale),
      parent: s.parent_planet_id,
      href: page(s.id),
      selectable: true,
    });
  }
  for (const b of src.belts) {
    rows.push({
      id: b.id,
      name: src.names.belt[b.id] ?? b.name,
      kind: 'belt',
      section: 'belts',
      meta: beltIndexMeta(b.inner_au, b.outer_au, locale),
      selectable: true,
    });
  }
  return rows;
}

function neighborhoodRows(src: ScaleIndexSource): ScaleIndexRow[] {
  const hostIds = new Set(src.hostSystems.map((s) => s.hostId));
  const stars = new Map<string, { name: string; con: string | null }>();
  for (const s of src.namedStars) stars.set(s.id, { name: s.proper, con: s.con });
  for (const s of src.hostSystems)
    if (!stars.has(s.hostId)) stars.set(s.hostId, { name: s.star.name, con: s.star.con });
  const badgesOf = (id: string): IndexBadge[] | undefined => {
    const badges: IndexBadge[] = [];
    if (hostIds.has(id)) badges.push('system');
    if (src.cultureIds.has(id)) badges.push('culture');
    return badges.length > 0 ? badges : undefined;
  };
  const collator = new Intl.Collator(src.locale);
  const byName = (a: ScaleIndexRow, b: ScaleIndexRow) => collator.compare(a.name, b.name);
  const starRows: ScaleIndexRow[] = [...stars.entries()]
    .map(([id, s]) => ({
      id,
      name: src.names.star[id] ?? s.name,
      kind: 'star',
      section: 'stars' as const,
      meta: s.con ? constellationName(s.con) : undefined,
      badges: badgesOf(id),
      href: src.pages.star.has(id) ? `/explore/stars/${id}` : undefined,
      selectable: true,
    }))
    .sort(byName);
  const deepSkyPage = deepSkyPageOf(src);
  const deepRows: ScaleIndexRow[] = src.deepSky
    .map((o) => ({
      id: o.id,
      name: deepSkyTitle(o),
      kind: o.category,
      section: 'deep-sky' as const,
      badges: badgesOf(o.id),
      href: deepSkyPage(o.id)?.href,
      selectable: true,
    }))
    .sort(byName);
  return [...starRows, ...deepRows];
}

function milkyWayRows(src: ScaleIndexSource): ScaleIndexRow[] {
  const mw = src.milkyWay;
  const rows: ScaleIndexRow[] = [];
  for (const o of mw.objects) {
    rows.push(
      o.id === 'sagittarius-a-star'
        ? blackHoleRow(src, o.id, 'objects')
        : { id: o.id, name: o.name, kind: o.kind, section: 'objects', selectable: true },
    );
  }
  rows.push(blackHoleRow(src, 'cygnus-x-1', 'objects'));
  const deepSkyPage = deepSkyPageOf(src);
  for (const g of mw.globulars ?? []) {
    const page = deepSkyPage(g.id);
    rows.push({
      id: g.id,
      name: page?.name ?? g.name,
      kind: 'globular-cluster',
      section: 'globulars',
      badges: g.headliner ? ['headliner'] : undefined,
      href: page?.href,
      selectable: true,
    });
  }
  const galaxyPage = outerPageOf(src).galaxy;
  for (const s of mw.magellanic ?? []) {
    const name = src.names.galaxy[s.id] ?? s.name;
    const page = galaxyPage(s.id, name);
    rows.push({
      id: s.id,
      name: page?.name ?? name,
      kind: 'satellite-galaxy',
      section: 'satellites',
      href: page?.href,
      selectable: true,
    });
  }
  for (const a of mw.arms)
    rows.push({ id: a.id, name: a.name, kind: 'spiral-arm', section: 'arms', selectable: true });
  return rows;
}

/**
 * Every scale's rows from the data files. Where a black hole sits follows its distance
 * (UXD-017): Sagittarius A* and Cygnus X-1 in the Milky Way, M87* in Virgo, the fictional
 * Gargantua after everything real, at the foot of the Cosmic web.
 */
export function buildScaleIndexRows(src: ScaleIndexSource): ScaleIndexRows {
  const { galaxy, structure } = outerPageOf(src);
  return {
    'solar-system': solarRows(src),
    neighborhood: neighborhoodRows(src),
    'milky-way': milkyWayRows(src),
    'local-group': memberRows(src.localGroup, src.names.galaxy, galaxy),
    'local-sheet': memberRows(src.localSheet, src.names.structure, structure),
    virgo: [
      ...memberRows(src.virgo, src.names.structure, structure),
      blackHoleRow(src, 'm87-star', 'black-holes'),
    ],
    laniakea: memberRows(src.laniakea, src.names.structure, structure),
    'cosmic-web': [
      ...memberRows(src.cosmicWeb, src.names.structure, structure),
      blackHoleRow(src, 'gargantua', 'fiction'),
    ],
  };
}
