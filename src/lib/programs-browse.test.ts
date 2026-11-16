import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  agencyColorsByEra,
  programAgencies,
  programEra,
  programStatusClass,
  programsByAgency,
  programsByEra,
  sortPrograms,
} from './programs-browse';
import type { ProgramIndexEntry } from '../types/program';

const index = JSON.parse(
  readFileSync(join(process.cwd(), 'static/data/programs/index.json'), 'utf8'),
) as ProgramIndexEntry[];

const prog = (o: Partial<ProgramIndexEntry>): ProgramIndexEntry => ({
  id: 'x',
  name: 'X',
  tagline: '',
  kind: 'crewed-campaign',
  agency: 'NASA',
  country: 'USA',
  epoch: 'first-steps',
  status: 'COMPLETED',
  ...o,
});

describe('programEra', () => {
  it('buckets by the start year, the boundary year in the earlier era', () => {
    expect(programEra(prog({ start_year: 1961 }))).toBe('first-steps');
    expect(programEra(prog({ start_year: 1962 }))).toBe('space-race');
    expect(programEra(prog({ start_year: 1972 }))).toBe('lunar-era');
    expect(programEra(prog({ start_year: 1981 }))).toBe('shuttle-and-mir');
    expect(programEra(prog({ start_year: 2027 }))).toBe('lunar-return');
    expect(programEra(prog({ start_year: 2031 }))).toBe('mars-era');
  });
  it('is null for a program with no start year', () => {
    expect(programEra(prog({ start_year: undefined }))).toBeNull();
  });
});

describe('the programs index', () => {
  it('puts every program in an era, so the nine tiles add up to the catalogue', () => {
    const counts = programsByEra(index);
    expect([...counts.values()].reduce((a, b) => a + b, 0)).toBe(index.length);
    expect(index.every((p) => typeof p.start_year === 'number')).toBe(true);
  });
  it('counts a program once per agency, and every agency of the index is a chip', () => {
    const by = programsByAgency(index);
    for (const p of index) for (const a of programAgencies(p)) expect(by.has(a)).toBe(true);
    expect(by.get('NASA')).toBe(index.filter((p) => programAgencies(p).includes('NASA')).length);
  });
  it('gives an era tile the colours of its agencies, the busiest first, none repeated', () => {
    const colors = agencyColorsByEra(index);
    const first = colors.get('first-steps') ?? [];
    expect(first.length).toBeGreaterThan(0);
    expect(new Set(first).size).toBe(first.length);
  });
});

describe('sortPrograms', () => {
  const list = [
    prog({ id: 'b', name: 'Beta', start_year: 1990 }),
    prog({ id: 'a', name: 'Alpha', start_year: 1970 }),
    prog({ id: 'c', name: 'Gamma', start_year: 1990 }),
  ];
  it('newest first, then by name', () => {
    expect(sortPrograms(list, 'chrono-desc').map((p) => p.id)).toEqual(['b', 'c', 'a']);
  });
  it('oldest first', () => {
    expect(sortPrograms(list, 'chrono-asc').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
  it('alphabetical', () => {
    expect(sortPrograms(list, 'alpha').map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });
  it('does not reorder the input', () => {
    sortPrograms(list, 'alpha');
    expect(list.map((p) => p.id)).toEqual(['b', 'a', 'c']);
  });
});

describe('programStatusClass', () => {
  it('draws a completed program like a flown mission and keeps the rest', () => {
    expect(programStatusClass('COMPLETED')).toBe('flown');
    expect(programStatusClass('ACTIVE')).toBe('active');
    expect(programStatusClass('PLANNED')).toBe('planned');
    expect(programStatusClass('CANCELLED')).toBe('cancelled');
  });
});
