import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fleetMissionRows } from './fleet-missions';
import type { FleetFlight } from '$types/fleet';

const FLEET = join(process.cwd(), 'static/data/fleet');
const index = JSON.parse(
  readFileSync(join(process.cwd(), 'static/data/missions/index.json'), 'utf8'),
) as { id: string; year: number; agency: string }[];
const ids = new Set(index.map((x) => x.id));

type Entry = {
  id: string;
  flights?: FleetFlight[];
  linked_missions?: string[];
};

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return name.endsWith('.json') && name !== 'index.json' ? [p] : [];
  });
}
const entries = files(FLEET).map((p) => JSON.parse(readFileSync(p, 'utf8')) as Entry);
const byId = (id: string) => entries.find((e) => e.id === id)!;
const rowsOf = (e: Entry) => fleetMissionRows(e, index, (id) => `Name of ${id}`);
const linked = (e: Entry) => rowsOf(e).filter((r) => r.missionId);

describe('fleetMissionRows over the fleet data', () => {
  it('has one row per distinct mission in flights and linked_missions', () => {
    for (const e of entries) {
      const union = new Set([
        ...(e.flights ?? []).map((f) => f.mission_id),
        ...(e.linked_missions ?? []),
      ]);
      expect(rowsOf(e).length, e.id).toBe(union.size);
    }
  });

  it('keys are unique per entry (the panel keys its each-block on them)', () => {
    for (const e of entries) {
      const keys = rowsOf(e).map((r) => r.key);
      expect(new Set(keys).size, e.id).toBe(keys.length);
    }
  });

  it('gives a mission id only to missions that exist', () => {
    for (const e of entries) {
      for (const r of rowsOf(e)) if (r.missionId) expect(ids.has(r.missionId), e.id).toBe(true);
    }
  });

  it('no flight names a mission that exists only after its hyphens are stripped', () => {
    const bare = new Map([...ids].map((id) => [id.replace(/-/g, ''), id]));
    const off = entries.flatMap((e) =>
      (e.flights ?? [])
        .filter((f) => !ids.has(f.mission_id) && bare.has(f.mission_id.replace(/-/g, '')))
        .map((f) => `${e.id}: ${f.mission_id}`),
    );
    expect(off).toEqual([]);
  });

  it('Crew Dragon: 5 rows, 2 with a mission, in date order', () => {
    const rows = rowsOf(byId('crew-dragon'));
    expect(rows).toHaveLength(5);
    expect(linked(byId('crew-dragon')).map((r) => r.missionId)).toEqual([
      'inspiration4',
      'polaris-dawn',
    ]);
    expect(rows.map((r) => r.key).slice(0, 3)).toEqual(['demo-2', 'crew-1', 'inspiration4']);
  });

  it('Gemini: 10 rows, 6 with a mission', () => {
    expect(rowsOf(byId('gemini'))).toHaveLength(10);
    expect(linked(byId('gemini'))).toHaveLength(6);
  });

  it('Soyuz 7K-OK and the Shuttle orbiter list their flights', () => {
    expect(rowsOf(byId('soyuz-7k-ok'))).toHaveLength(7);
    expect(linked(byId('soyuz-7k-ok'))).toHaveLength(3);
    expect(rowsOf(byId('space-shuttle-orbiter'))).toHaveLength(8);
    expect(linked(byId('space-shuttle-orbiter'))).toHaveLength(2);
  });

  it('a row without a mission is plain text: the designation, the crew as names', () => {
    const demo = rowsOf(byId('crew-dragon')).find((r) => r.key === 'demo-2')!;
    expect(demo.missionId).toBeNull();
    expect(demo.title).toBe('Demo-2 (2020-05-30)');
    expect(demo.sub).toBe('first commercial human spaceflight');
    expect(demo.crew).toEqual(['Doug Hurley', 'Bob Behnken']);
  });

  it('a row with a mission carries the mission name and its year, and the flight crew', () => {
    const i4 = rowsOf(byId('crew-dragon')).find((r) => r.key === 'inspiration4')!;
    expect(i4.title).toBe('Name of inspiration4');
    expect(i4.sub).toBe(String(index.find((x) => x.id === 'inspiration4')!.year));
    expect(i4.crew).toHaveLength(4);
  });

  it('an entry with one linked mission gets exactly one row, with the mission', () => {
    const one = entries.find((e) => !e.flights && e.linked_missions?.length === 1)!;
    const rows = rowsOf(one);
    expect(rows).toHaveLength(1);
    expect(rows[0].missionId).toBe(one.linked_missions![0]);
  });
});
