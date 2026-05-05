/**
 * MarsSite is an alias of the generic SurfaceSite (PRD-009 / RFC-012).
 * Same shape as MoonSite — both bodies share the surface + orbiter
 * catalogue schema. Mars adds `kind: 'orbiter'` entries (Mars Odyssey,
 * MRO, MAVEN, TGO, Mars Express, Tianwen-1 orbiter, Hope, Mangalyaan,
 * plus the 1970s Soviet/American historical orbiters).
 */
export type {
  SurfaceSite as MarsSite,
  SurfaceAgency as MarsAgency,
  SurfaceNation as MarsNation,
  Traverse,
} from './surface-site';
