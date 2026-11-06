/**
 * Which fleet anatomy drawings a surface site's panel shows (#641): the craft
 * that came down, then any rover it carried (`role: 'payload'`). A site's
 * fleet_refs also name sister craft (Luna 24 → Luna 16, Viking 2 → Viking 1)
 * and vehicles that stayed in orbit (the Apollo CSM, Orion, a Mars 2
 * orbiter); those are left out — a landing site shows only what is on its
 * surface (operator, 2026-11-06: Apollo 15–17 = the LM and the LRV, no CSM).
 */
import { spacecraftDiagramPath, launcherCutawayPath } from '$lib/spacecraft-diagrams';
import { assetOrigin } from '$lib/asset-url';
import sequenceIds from '$lib/landing-sequence-ids.json';
import type { SurfaceSite } from '$types/surface-site';

/** Fleet ids that never touched the surface they are linked from. */
const STAYED_IN_ORBIT = /(^|-)orbiter($|-)|orbiter$|^apollo-csm|^orion$/;

const norm = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * A site whose lander is a variant of a fleet entry drawn as something else: the fleet
 * entry's own drawings would show the wrong craft. Artemis IV lands in Starship HLS, but the
 * `starship` fleet drawings are the whole launch stack with its Super Heavy booster, which
 * never reaches the Moon (operator, 2026-11-06) — so the site shows the HLS drawing, no
 * exploded view, and still links to the Starship fleet entry.
 */
const SITE_DRAWINGS: Record<string, Array<{ fleetId: string; anatomyId: string }>> = {
  artemis4: [{ fleetId: 'starship', anatomyId: 'starship-hls' }],
};

export interface SiteAnatomy {
  fleetId: string;
  src: string;
  /** The craft's exploded cutaway, when it has one. */
  exploded: string | null;
}

export function siteAnatomy(
  site: Pick<SurfaceSite, 'id' | 'fleet_refs'>,
  pathFor: (id: string) => string | null = spacecraftDiagramPath,
  explodedFor: (id: string) => string | null = launcherCutawayPath,
): SiteAnatomy[] {
  const special = SITE_DRAWINGS[site.id];
  if (special) {
    return special
      .filter((d) => pathFor(d.anatomyId) != null)
      .map((d) => ({ fleetId: d.fleetId, src: pathFor(d.anatomyId)!, exploded: null }));
  }
  const refs = (site.fleet_refs ?? []).filter(
    (r) => !STAYED_IN_ORBIT.test(r.id) && pathFor(r.id) != null,
  );
  const craft = refs.filter((r) => r.role !== 'payload');
  const primary = craft.find((r) => norm(r.id) === norm(site.id)) ?? craft[0];
  const picked = [...(primary ? [primary] : []), ...refs.filter((r) => r.role === 'payload')];
  return picked.map((r) => ({ fleetId: r.id, src: pathFor(r.id)!, exploded: explodedFor(r.id) }));
}

const SEQUENCES = new Set<string>(sequenceIds);

/** The site's landing-sequence sheet (entry → descent → touchdown → after), or null. */
export function siteLandingSequence(siteId: string): string | null {
  return SEQUENCES.has(siteId) ? `${assetOrigin}/images/landing-sequences/${siteId}.webp` : null;
}
