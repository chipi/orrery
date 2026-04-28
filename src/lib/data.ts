import type { Mission, MissionIndex } from '$types/mission';
import type { Planet } from '$types/planet';

/**
 * Data client stubs — Slice 1.
 *
 * Full implementations land in Slice 2 with fetch + cache + locale overlay merge
 * per ADR-017. These stubs exist so screens can import the API surface without
 * waiting for the data layer.
 */

export async function getMissionIndex(): Promise<MissionIndex[]> {
  return [];
}

export async function getMission(_id: string, _dest: string): Promise<Mission | null> {
  return null;
}

export async function planets(): Promise<Planet[]> {
  return [];
}
