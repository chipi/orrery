/**
 * MoonSite is now an alias of the generic SurfaceSite (PRD-009 / RFC-012).
 * The generic type covers /moon and /mars uniformly. Existing imports of
 * MoonSite, MoonAgency, Nation, SurfaceStatus continue to work.
 *
 * Per the v0.4 backfill (issue #40 Phase 3) /moon now also carries
 * `kind: 'orbiter'` entries (LRO, Clementine, Chandrayaan-1, Chang'e 1/2,
 * etc.) — the legacy `kind: 'surface'` shape stays the default.
 */
export type {
  SurfaceSite as MoonSite,
  SurfaceAgency as MoonAgency,
  SurfaceNation as Nation,
  SurfaceStatus,
} from './surface-site';
