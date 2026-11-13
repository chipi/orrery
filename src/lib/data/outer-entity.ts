import type { FetchLike } from './core';
import type { CatalogueEntry } from '$lib/catalogue';
import { outerPageOf } from '$lib/explore/scale-index';
import {
  getCosmicWeb,
  getDeepSkyObjects,
  getGalaxyI18n,
  getLaniakea,
  getLocalGroup,
  getLocalSheet,
  getStructureI18n,
  getVirgo,
  type LocalGroupKind,
  type OuterTextOverlay,
} from './universe';
import {
  DEEP_SKY_ALIAS,
  deepSkyPageIds,
  galaxyPageIds,
  structurePageIds,
} from '../../../scripts/site-routes.mjs';

type Link = NonNullable<OuterTextOverlay['links']>[number];

/** The scales /explore?context= takes for the five outer scales. */
export type OuterScale = 'local-group' | 'local-sheet' | 'virgo' | 'laniakea' | 'cosmic-web';

export interface RelatedLink {
  /** Locale-free path. */
  href: string;
  name: string;
}
/** `part-of`: what it belongs to; `members`: what belongs to it; `same-scale`: its neighbours in the INDEX. */
export interface RelatedGroup {
  kind: 'part-of' | 'members' | 'same-scale';
  links: RelatedLink[];
}

interface OuterText {
  id: string;
  /** The data's own name: English in every locale until the glossary names land. */
  name: string;
  fact: string;
  bio: string;
  links: Link[];
  related: RelatedGroup[];
  /** The scale /explore?context=<scale>&pick=<id> opens this entity in. */
  scale: OuterScale;
}

/** What a /explore/galaxies/<id> page shows. */
export interface GalaxyEntity extends OuterText {
  kind: LocalGroupKind;
  /** The host galaxy's id; the galaxy's own id for an anchor, `independent` for a free dwarf. */
  parent: string;
  distMly: number;
  diamKly: number;
  /** McConnachie 2012 entry for the distance (#658); the Milky Way has none. */
  catalogue: { dist_mly?: CatalogueEntry };
}

/** What a /explore/structures/<id> page shows. */
export interface StructureEntity extends OuterText {
  kind: string;
  distMpc: number;
  diamMly: number;
}

/** The ids that have a page of each type: the overlay files decide (`site-routes.mjs`). */
export interface OuterPages {
  galaxy: ReadonlySet<string>;
  structure: ReadonlySet<string>;
  deepSky: ReadonlySet<string>;
}

const pagesNow = (): OuterPages => ({
  galaxy: new Set<string>(galaxyPageIds()),
  structure: new Set<string>(structurePageIds()),
  deepSky: new Set<string>(deepSkyPageIds()),
});

type StructureMember = { id: string; name: string; kind: string; dist_mpc: number; diam_mly: number };

/**
 * The structure scales, innermost first, with the structure each is the view of. A member of a scale
 * is part of that structure: the Local Group and the Virgo clouds are part of the Virgo Supercluster,
 * the Virgo Supercluster and the Laniakea members part of Laniakea. The Local Sheet and the Cosmic
 * web have no structure of their own to be part of.
 */
const SCALES = [
  { scale: 'local-sheet', anchor: null },
  { scale: 'virgo', anchor: 'virgo-supercluster' },
  { scale: 'laniakea', anchor: 'laniakea' },
  { scale: 'cosmic-web', anchor: null },
] as const;

async function structureScales(fetchFn: FetchLike) {
  const [sheet, virgo, laniakea, web] = await Promise.all([
    getLocalSheet(fetchFn),
    getVirgo(fetchFn),
    getLaniakea(fetchFn),
    getCosmicWeb(fetchFn),
  ]);
  const members: StructureMember[][] = [sheet, virgo, laniakea, web].map(
    (d) => d?.members ?? [],
  );
  return SCALES.map((s, i) => ({ ...s, members: members[i] }));
}

/**
 * One Local Group galaxy for its /explore/galaxies/<id> page: the census record, the overlay
 * (en-US fallback) and a Related list computed from the data. A galaxy with no overlay has no
 * page, so it is null; so is a twin, whose page is a deep-sky one. `pages` is the set of ids that
 * have a page of each type, by default the overlay files.
 */
export async function getGalaxyEntity(
  id: string,
  locale: string,
  fetchFn: FetchLike = fetch,
  pages: OuterPages = pagesNow(),
): Promise<GalaxyEntity | null> {
  if (!pages.galaxy.has(id)) return null;
  const [lg, sheet, overlay, deepSky] = await Promise.all([
    getLocalGroup(fetchFn),
    getLocalSheet(fetchFn),
    getGalaxyI18n(locale, id, fetchFn),
    getDeepSkyObjects(fetchFn),
  ]);
  const g = lg?.members.find((m) => m.id === id);
  const twin = Object.hasOwn(DEEP_SKY_ALIAS, id) || deepSky.some((o) => o.id === id);
  if (!g || twin || !overlay?.fact || !overlay.bio) return null;
  const { galaxy, structure } = outerPageOf({ deepSky, deepSkyAlias: DEEP_SKY_ALIAS, pages });
  const link = (l: RelatedLink | null): RelatedLink[] => (l ? [l] : []);
  const host = lg!.members.find((m) => m.id === g.parent && m.id !== id);
  const group = sheet?.members.find((m) => m.id === 'local-group');
  const related = (
    [
      {
        kind: 'part-of',
        links: [
          ...(host ? link(galaxy(host.id, host.name)) : []),
          ...(group ? link(structure(group.id, group.name)) : []),
        ],
      },
      {
        kind: 'members',
        links: lg!.members
          .filter((m) => m.parent === id && m.id !== id)
          .flatMap((m) => link(galaxy(m.id, m.name))),
      },
    ] as RelatedGroup[]
  ).filter((r) => r.links.length > 0);
  return {
    id,
    name: g.name,
    kind: g.kind,
    parent: g.parent,
    distMly: g.dist_mly,
    diamKly: g.diam_kly,
    catalogue: g.catalogue ?? {},
    fact: overlay.fact,
    bio: overlay.bio,
    links: overlay.links ?? [],
    related,
    scale: 'local-group',
  };
}

/**
 * One structure (group, cloud, cluster, supercluster, attractor, concentration, wall, void) for its
 * /explore/structures/<id> page: the record of the first scale that lists it, the overlay and a
 * Related list computed from the data. A structure with no overlay has no page, so it is null.
 */
export async function getStructureEntity(
  id: string,
  locale: string,
  fetchFn: FetchLike = fetch,
  pages: OuterPages = pagesNow(),
): Promise<StructureEntity | null> {
  if (!pages.structure.has(id)) return null;
  const [scales, overlay, lg, deepSky] = await Promise.all([
    structureScales(fetchFn),
    getStructureI18n(locale, id, fetchFn),
    getLocalGroup(fetchFn),
    getDeepSkyObjects(fetchFn),
  ]);
  const own = scales.filter((s) => s.members.some((m) => m.id === id));
  const m = own[0]?.members.find((x) => x.id === id);
  if (!m || !overlay?.fact || !overlay.bio) return null;
  const { galaxy, structure } = outerPageOf({ deepSky, deepSkyAlias: DEEP_SKY_ALIAS, pages });
  const seen = new Set<string>([`/explore/structures/${id}`]);
  const unseen = (r: RelatedLink | null): RelatedLink[] => {
    if (!r || seen.has(r.href)) return [];
    seen.add(r.href);
    return [r];
  };
  // The structure a scale is the view of, and what is in it.
  const partOf = own.flatMap((s) =>
    s.anchor && s.anchor !== id ? unseen(structure(s.anchor, nameOf(scales, s.anchor))) : [],
  );
  const viewOf = scales.find((s) => s.anchor === id);
  const members =
    id === 'local-group'
      ? (lg?.members ?? []).flatMap((g) => unseen(galaxy(g.id, g.name)))
      : (viewOf?.members ?? []).flatMap((x) => (x.id === id ? [] : unseen(structure(x.id, x.name))));
  const sameScale = own.flatMap((s) =>
    [...s.members]
      .sort((a, b) => a.dist_mpc - b.dist_mpc)
      .flatMap((x) => unseen(structure(x.id, x.name))),
  );
  const related: RelatedGroup[] = (
    [
      { kind: 'part-of', links: partOf },
      { kind: 'members', links: members },
      { kind: 'same-scale', links: sameScale },
    ] as RelatedGroup[]
  ).filter((r) => r.links.length > 0);
  return {
    id,
    name: m.name,
    kind: m.kind,
    distMpc: m.dist_mpc,
    diamMly: m.diam_mly,
    fact: overlay.fact,
    bio: overlay.bio,
    links: overlay.links ?? [],
    related,
    scale: own[0].scale,
  };
}

function nameOf(scales: { members: StructureMember[] }[], id: string): string {
  for (const s of scales) {
    const m = s.members.find((x) => x.id === id);
    if (m) return m.name;
  }
  return id;
}
