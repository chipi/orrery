import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { missionRows, milestoneRows } from './program-page';
import { thumbOf } from './entity-thumb';
import type { ProgramBase, ProgramIndexEntry, ProgramRosterItem } from '$types/program';

const rj = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const programs = rj<ProgramIndexEntry[]>('static/data/programs/index.json').map((e) =>
  rj<ProgramBase>(`static/data/programs/${e.id}.json`),
);

const missionIds = new Set(
  rj<{ id: string }[]>('static/data/missions/index.json').map((m) => m.id),
);
const fleetIdx = rj<{ id: string; name: string }[]>('static/data/fleet/index.json');
const fleetIds = new Set(fleetIdx.map((f) => f.id));
const stationModules: Record<string, Set<string>> = {
  iss: new Set(rj<{ id: string }[]>('static/data/iss-modules.json').map((m) => m.id)),
  tiangong: new Set(rj<{ id: string }[]>('static/data/tiangong-modules.json').map((m) => m.id)),
};

/** Mission names live in the English overlay, one file per mission under a destination folder. */
function missionNames(): Map<string, string> {
  const out = new Map<string, string>();
  const root = 'i18n-src/en-US/missions';
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    for (const f of readdirSync(`${root}/${dir.name}`)) {
      const id = f.replace(/\.json$/, '');
      if (missionIds.has(id)) out.set(id, rj<{ name: string }>(`${root}/${dir.name}/${f}`).name);
    }
  }
  return out;
}
const missionName = missionNames();

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
/** The part of a row's name before a parenthesis, an em dash or an arrow. */
const coreName = (s: string) => s.split(/ [(—→]/)[0] ?? s;

describe('program rosters (E2): every row that names an existing entry links to it', () => {
  it('resolves every linked_id to a mission, a craft or a station module', () => {
    for (const p of programs) {
      for (const r of p.roster) {
        if (!r.linked_id) continue;
        const where = `${p.id} ${r.ref}:${r.linked_id}`;
        if (r.ref === 'mission') expect(missionIds.has(r.linked_id), where).toBe(true);
        else if (r.ref === 'fleet') expect(fleetIds.has(r.linked_id), where).toBe(true);
        else if (r.ref === 'module')
          expect(
            stationModules.iss.has(r.linked_id) || stationModules.tiangong.has(r.linked_id),
            where,
          ).toBe(true);
        else throw new Error(`${where}: unknown ref`);
      }
    }
  });

  it('resolves every link to a craft, or to a module of the station it names', () => {
    let links = 0;
    for (const p of programs) {
      for (const r of p.roster) {
        if (!r.link) continue;
        links++;
        const where = `${p.id} ${r.name} -> ${r.link.ref}:${r.link.id}`;
        expect(r.linked_id, `${where}: a row is linked or has a link, not both`).toBeUndefined();
        expect(r.name, where).toBeTruthy();
        if (r.link.ref === 'fleet') expect(fleetIds.has(r.link.id), where).toBe(true);
        else {
          expect(r.link.station, where).toBeTruthy();
          expect(stationModules[r.link.station as string]?.has(r.link.id), where).toBe(true);
        }
      }
    }
    // Challenger (STS-51-L) and Columbia (STS-107) became linked mission rows, no longer name-only rows with a craft link; so did Shenzhou 5 (content 7).
    expect(links).toBeGreaterThanOrEqual(5);
  });

  it('has no name-only row that is the name or id of an existing mission, craft or module', () => {
    const byName = new Map<string, string>();
    for (const [id, n] of missionName) byName.set(norm(n), `mission:${id}`);
    for (const id of missionIds) byName.set(norm(id), `mission:${id}`);
    for (const f of fleetIdx) {
      byName.set(norm(f.name), `fleet:${f.id}`);
      byName.set(norm(f.name.replace(/^Space Shuttle /, '')), `fleet:${f.id}`);
      byName.set(norm(f.id), `fleet:${f.id}`);
    }
    for (const set of Object.values(stationModules))
      for (const id of set) byName.set(norm(id), `module:${id}`);
    const misses: string[] = [];
    for (const p of programs) {
      for (const r of p.roster) {
        if (r.linked_id || r.link || !r.name) continue;
        const hit = byName.get(norm(coreName(r.name)));
        if (hit) misses.push(`${p.id}: "${r.name}" is ${hit}`);
      }
    }
    expect(misses).toEqual([]);
  });

  it('lists no mission, craft or module twice in one program', () => {
    for (const p of programs) {
      const seen = new Set<string>();
      for (const r of p.roster) {
        const key = r.linked_id ? `${r.ref}:${r.linked_id}` : null;
        if (!key) continue;
        expect(seen.has(key), `${p.id} lists ${key} twice`).toBe(false);
        seen.add(key);
      }
    }
  });

  it('gives every linked mission a round photo in the thumbs manifest', () => {
    for (const p of programs) {
      for (const r of p.roster) {
        if (r.ref !== 'mission' || !r.linked_id) continue;
        expect(thumbOf('missions', r.linked_id), `${p.id} ${r.linked_id}`).not.toBeNull();
      }
    }
  });
});

describe('milestone rows (E2)', () => {
  const rows = (p: ProgramBase): ProgramRosterItem[] => p.roster.filter((r) => r.milestone);

  it('are name-only: a milestone names an episode, never an entry', () => {
    let n = 0;
    for (const p of programs) {
      for (const r of rows(p)) {
        n++;
        expect(r.milestone, p.id).toBe(true);
        expect(r.name, `${p.id} milestone has a name`).toBeTruthy();
        expect(r.linked_id, `${p.id} ${r.name}`).toBeUndefined();
        expect(r.link, `${p.id} ${r.name}`).toBeUndefined();
      }
    }
    expect(n).toBeGreaterThanOrEqual(40);
  });

  it('keeps every row in exactly one of Missions and Milestones', () => {
    for (const p of programs) {
      const mission = missionRows(p.roster);
      const miles = milestoneRows(p.roster);
      expect(
        mission.some((r) => r.milestone),
        p.id,
      ).toBe(false);
      expect(
        miles.every((r) => r.milestone),
        p.id,
      ).toBe(true);
      expect(miles.length, p.id).toBe(rows(p).length);
    }
  });

  it('turns Cassini into two mission rows (both linked) and two milestones', () => {
    const cassini = programs.find((p) => p.id === 'cassini') as ProgramBase;
    expect(missionRows(cassini.roster).map((r) => r.linked_id)).toEqual(['cassini', 'huygens']);
    expect(milestoneRows(cassini.roster).map((r) => r.name)).toEqual([
      'The geysers of Enceladus',
      'The Grand Finale',
    ]);
  });
});
