import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { mergeRoster, rosterKey } from './program-roster-overlay.js';
import type { ProgramRosterItem } from '../types/program';

const roster: ProgramRosterItem[] = [
  {
    linked_id: 'cassini',
    ref: 'mission',
    role: 'Saturn orbiter',
    year: 2004,
    note: 'orbited Saturn',
  },
  { linked_id: 'cassini', ref: 'fleet', role: 'Saturn orbiter', note: 'the craft' },
  { name: 'STS-1', year: 1981, note: 'the first orbital flight' },
  {
    name: 'Challenger (STS-51-L)',
    year: 1986,
    note: 'lost after launch',
    link: { ref: 'fleet', id: 'challenger' },
  },
  { linked_id: 'galileo', ref: 'mission', year: 1989 },
];

describe('rosterKey', () => {
  it('keys a linked row by ref and id, so a mission and its craft do not collide', () => {
    expect(rosterKey(roster[0])).toBe('mission:cassini');
    expect(rosterKey(roster[1])).toBe('fleet:cassini');
  });

  it('keys a name-only row by its English name', () => {
    expect(rosterKey(roster[2])).toBe('STS-1');
  });
});

describe('mergeRoster', () => {
  it('returns the base roster untouched without an overlay', () => {
    expect(mergeRoster(roster, undefined)).toBe(roster);
  });

  it('replaces the note of the row the key names and leaves the rest alone', () => {
    const out = mergeRoster(roster, { 'mission:galileo': { note: 'vom Shuttle ausgesetzt' } });
    expect(out[4]).toEqual({ ...roster[4], note: 'vom Shuttle ausgesetzt' });
    expect(out.slice(0, 4)).toEqual(roster.slice(0, 4));
  });

  it('translates the name of a name-only row, never the name of a linked row', () => {
    const out = mergeRoster(roster, {
      'STS-1': { name: 'STS-1 (erster Flug)', note: 'der erste Flug' },
      'mission:cassini': { name: 'IGNORED', note: 'umkreiste Saturn' },
    });
    expect(out[2]).toMatchObject({ name: 'STS-1 (erster Flug)', note: 'der erste Flug' });
    expect(out[0].name).toBeUndefined();
    expect(out[0].note).toBe('umkreiste Saturn');
  });

  it('follows the row, not its position, when a row is inserted ahead of it', () => {
    const overlay = { STS_X: { note: 'x' }, 'mission:galileo': { note: 'G' } };
    const shifted = [{ name: 'STS_X', year: 1 }, ...roster];
    const out = mergeRoster(shifted, overlay);
    expect(out[0].note).toBe('x');
    expect(out.find((r) => r.linked_id === 'galileo')?.note).toBe('G');
  });

  it('ignores an overlay key with no row and an empty overlay value', () => {
    const out = mergeRoster(roster, { 'mission:gone': { note: 'orphan' }, 'STS-1': { note: '' } });
    expect(out).toEqual(roster);
  });

  it('does not mutate the base roster', () => {
    const before = JSON.stringify(roster);
    mergeRoster(roster, { 'STS-1': { note: 'neu' } });
    expect(JSON.stringify(roster)).toBe(before);
  });
});

describe('program roster keys, real data', () => {
  const dir = 'static/data/programs';
  const programs = readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => [f, JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))] as const);

  it('every roster row of every program has a key no other row of its program shares', () => {
    for (const [f, p] of programs) {
      const keys = (p.roster as ProgramRosterItem[]).map(rosterKey);
      expect(keys.every(Boolean), f).toBe(true);
      expect(new Set(keys).size, f).toBe(keys.length);
    }
  });

  it('every locale roster overlay key names a row of its program', () => {
    const base = new Map(
      programs.map(([f, p]) => [f, new Set((p.roster as ProgramRosterItem[]).map(rosterKey))]),
    );
    for (const loc of readdirSync('i18n-src')) {
      for (const [f, keys] of base) {
        let overlay: { roster?: Record<string, unknown> };
        try {
          overlay = JSON.parse(readFileSync(`i18n-src/${loc}/programs/${f}`, 'utf8'));
        } catch {
          continue;
        }
        for (const k of Object.keys(overlay.roster ?? {}))
          expect(keys.has(k), `${loc} ${f} ${k}`).toBe(true);
      }
    }
  });
});
