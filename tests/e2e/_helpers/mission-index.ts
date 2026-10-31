import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Counts from `static/data/missions/index.json`, so a spec that checks
 * "every mission card renders" follows the catalogue instead of a
 * literal that goes stale with each added mission.
 */
const index: Array<{ id: string; status: string; dest: string }> = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'static/data/missions/index.json'), 'utf8'),
);

export const MISSION_COUNT = index.length;

export function missionCountWhere(pred: (m: { status: string; dest: string }) => boolean): number {
  return index.filter(pred).length;
}
