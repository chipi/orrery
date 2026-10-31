/**
 * Localized labels for the status codes in the data (`ACTIVE`, `FLOWN`, …).
 * The code stays the data value and drives CSS (`status-<code>`); only the
 * visible text goes through these. One function per thing being labelled,
 * because gendered languages agree the word with it (es misión ACTIVA,
 * vehículo ACTIVO).
 */
import * as m from '$lib/paraglide/messages';
import type { MissionStatus } from '$types/mission';
import type { FleetStatus } from '$types/fleet';
import type { ProgramStatus } from '$types/program';
import type { ObjectStatus } from '$types/earth-object';
import type { SiteStatus } from '$types/surface-site';

const MISSION: Record<MissionStatus, () => string> = {
  ACTIVE: m.mission_status_active,
  FLOWN: m.mission_status_flown,
  PLANNED: m.mission_status_planned,
  CANCELLED: m.mission_status_cancelled,
};

const FLEET: Record<FleetStatus, () => string> = {
  ACTIVE: m.fleet_status_active,
  FLOWN: m.fleet_status_flown,
  RETIRED: m.fleet_status_retired,
  FAILED: m.fleet_status_failed,
  PLANNED: m.fleet_status_planned,
};

const PROGRAM: Record<ProgramStatus, () => string> = {
  PLANNED: m.program_status_planned,
  ACTIVE: m.program_status_active,
  COMPLETED: m.program_status_completed,
  CANCELLED: m.program_status_cancelled,
};

/** Surface sites (moon/mars/earth pads) and earth objects share one list. */
const SURFACE: Record<SiteStatus | ObjectStatus, () => string> = {
  ACTIVE: m.surface_status_active,
  FLOWN: m.surface_status_flown,
  PLANNED: m.surface_status_planned,
  RETIRED: m.surface_status_retired,
  ENDED: m.surface_status_ended,
  CRASHED: m.surface_status_crashed,
  LOST: m.surface_status_lost,
};

function pick(table: Record<string, () => string>, code: string): string {
  return Object.hasOwn(table, code) ? table[code]!() : code;
}

export const missionStatusLabel = (s: MissionStatus | string): string => pick(MISSION, s);
export const fleetStatusLabel = (s: FleetStatus | string): string => pick(FLEET, s);
export const programStatusLabel = (s: ProgramStatus | string): string => pick(PROGRAM, s);
export const surfaceStatusLabel = (s: SiteStatus | ObjectStatus | string): string =>
  pick(SURFACE, s);
