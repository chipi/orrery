import { error } from '@sveltejs/kit';
import { getProgram, getMissionIndex, getMission, getBadges } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad, EntryGenerator } from './$types';

export const prerender = true;

// Hardcoded program ids for the prerender (universal module — no node:fs).
// Add a program's id here + its programs/{id}.json + overlay simultaneously;
// validate-data.ts fails if a declared program's files are missing.
const PROGRAM_IDS = ['apollo', 'mercury', 'gemini', 'vostok', 'voskhod', 'soyuz', 'soviet-lunar', 'skylab', 'salyut', 'mir', 'space-shuttle', 'buran', 'ariane', 'esa-human', 'iss', 'tiangong', 'shenzhou', 'spacex', 'starlink', 'starship', 'kuiper', 'artemis', 'hayabusa', 'jaxa-robotic', 'chandrayaan', 'mangalyaan', 'great-observatories', 'jwst'];

export const entries: EntryGenerator = () => PROGRAM_IDS.map((id) => ({ id }));

export interface RosterMissionDetail {
  name: string;
  year: number;
  agency: string;
  type?: string;
  blurb: string;
  hero: string;
  href: string;
}

export const load: PageLoad = async ({ params, fetch }) => {
  const program = await getProgram(params.id, getLocale(), fetch);
  if (!program) throw error(404, `Unknown program: ${params.id}`);

  // Compact summaries for the roster's linked missions — rendered in the
  // master-detail pane beside the timeline (no navigation away). Built at
  // prerender; falls back gracefully if a mission can't be resolved.
  const index = await getMissionIndex(fetch);
  const destById = new Map(index.map((mi) => [mi.id, mi.dest]));
  const missionDetails: Record<string, RosterMissionDetail> = {};
  for (const r of program.roster) {
    if (r.ref !== 'mission' || !r.linked_id) continue;
    const dest = destById.get(r.linked_id);
    if (!dest) continue;
    const mission = await getMission(r.linked_id, dest, getLocale(), fetch);
    if (!mission) continue;
    missionDetails[r.linked_id] = {
      name: mission.name ?? r.linked_id,
      year: mission.year,
      agency: mission.agency,
      type: mission.type,
      blurb: mission.first ?? mission.description ?? '',
      hero: `missions/${r.linked_id}/01`,
      href: `/missions?id=${r.linked_id}`,
    };
  }

  // Insignia map (PRD-029) — gate badge <img> so entries without a sourced
  // badge render nothing (no 404). Mercury flights predate mission patches, so
  // its roster carries none; only the program insignia resolves.
  const badges = await getBadges(fetch);

  return { program, missionDetails, badges };
};
