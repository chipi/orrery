/**
 * The /plan → /fly rocket handoff (UXD-042, ADR-026). /plan writes `rocket=<rockets.json id>`;
 * /fly reads it through `resolveRocketHandoff`, the one place that turns a plan rocket into
 * the vehicle name and the `fleet_refs` launcher ref a flight carries.
 *
 * Three rocket ids differ from the launch registry's ids (`atlas-v-541`, `soyuz-fregat`,
 * `proton-m`), so every rocket is mapped explicitly here, and the unit test pins each one to
 * the launcher `resolveLauncher` picks for it. `vehicle` is the name /plan shows (the
 * registry's alias list matches "Atlas V 541" to the Atlas V profile with four solids and
 * "Soyuz-FG / Fregat" to the Fregat profile); `fleetId` is the fleet entry the flight links to.
 */

interface RocketRow {
  vehicle: string;
  fleetId: string;
}

const ROCKETS: Record<string, RocketRow> = {
  'falcon-heavy': { vehicle: 'Falcon Heavy', fleetId: 'falcon-heavy' },
  starship: { vehicle: 'Starship', fleetId: 'starship' },
  'sls-block-1': { vehicle: 'SLS Block 1', fleetId: 'sls-block-1' },
  'atlas-v-541': { vehicle: 'Atlas V 541', fleetId: 'atlas-v' },
  'long-march-5': { vehicle: 'Long March 5', fleetId: 'long-march-5' },
  'ariane-6': { vehicle: 'Ariane 6', fleetId: 'ariane-6' },
  lvm3: { vehicle: 'LVM3', fleetId: 'lvm3' },
  'pslv-xl': { vehicle: 'PSLV-XL', fleetId: 'pslv-xl' },
  h3: { vehicle: 'H3', fleetId: 'h3' },
  'h-iia': { vehicle: 'H-IIA', fleetId: 'h-iia' },
  'long-march-3b': { vehicle: 'Long March 3B', fleetId: 'long-march-3b' },
  'soyuz-fregat': { vehicle: 'Soyuz-FG / Fregat', fleetId: 'soyuz-2' },
  'proton-m': { vehicle: 'Proton-M', fleetId: 'proton-m' },
};

/** rocket id → fleet entry id (what /plan links the chosen rocket to). */
export const ROCKET_FLEET_ID: Record<string, string> = Object.fromEntries(
  Object.entries(ROCKETS).map(([id, r]) => [id, r.fleetId]),
);

export interface RocketHandoff {
  rocketId: string;
  vehicle: string;
  fleetRefs: Array<{ id: string; role: 'launcher' }>;
}

/** A plan rocket id → what a /fly plan flight carries, or null for an unknown id. */
export function resolveRocketHandoff(rocketId: string | null | undefined): RocketHandoff | null {
  const id = (rocketId ?? '').trim().toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(ROCKETS, id)) return null;
  const r = ROCKETS[id];
  return { rocketId: id, vehicle: r.vehicle, fleetRefs: [{ id: r.fleetId, role: 'launcher' }] };
}

/** The plan rocket ids, in /plan's list order. */
export const PLAN_ROCKET_IDS = Object.keys(ROCKETS);
