/**
 * Mission blueprints (#641): a hand-drafted planning sheet per mission — the trajectory computed
 * from real ephemeris data, the launcher, the spacecraft and the key equations. Served from
 * /images/blueprints/{mission}.webp; ids from src/lib/blueprint-ids.json (scripts/build-anatomy-webp.mjs).
 */
import { assetOrigin } from '$lib/asset-url';
import blueprintIds from '$lib/blueprint-ids.json';

const BLUEPRINTS = new Set<string>(blueprintIds);

/** The mission's blueprint, or null when it has none. */
export function missionBlueprint(missionId: string): string | null {
  return BLUEPRINTS.has(missionId) ? `${assetOrigin}/images/blueprints/${missionId}.webp` : null;
}
