/**
 * Which fleet anatomy drawings a surface site's panel shows (#641): the craft
 * that came down, then any rover it carried (`role: 'payload'`). A site's
 * fleet_refs also name sister craft (Luna 24 → Luna 16, Viking 2 → Viking 1)
 * and vehicles that stayed in orbit (the Apollo CSM, Orion, a Mars 2
 * orbiter); those are left out — a landing site shows only what is on its
 * surface (operator, 2026-11-06: Apollo 15–17 = the LM and the LRV, no CSM).
 */
import { spacecraftDiagramPath } from '$lib/spacecraft-diagrams';
import type { SurfaceSite } from '$types/surface-site';

/** Fleet ids that never touched the surface they are linked from. */
const STAYED_IN_ORBIT = /(^|-)orbiter($|-)|orbiter$|^apollo-csm|^orion$/;

const norm = (id: string) => id.toLowerCase().replace(/[^a-z0-9]/g, '');

export interface SiteAnatomy {
  fleetId: string;
  src: string;
}

export function siteAnatomy(
  site: Pick<SurfaceSite, 'id' | 'fleet_refs'>,
  pathFor: (id: string) => string | null = spacecraftDiagramPath,
): SiteAnatomy[] {
  const refs = (site.fleet_refs ?? []).filter(
    (r) => !STAYED_IN_ORBIT.test(r.id) && pathFor(r.id) != null,
  );
  const craft = refs.filter((r) => r.role !== 'payload');
  const primary = craft.find((r) => norm(r.id) === norm(site.id)) ?? craft[0];
  const picked = [...(primary ? [primary] : []), ...refs.filter((r) => r.role === 'payload')];
  return picked.map((r) => ({ fleetId: r.id, src: pathFor(r.id)! }));
}
