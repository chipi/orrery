import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { __resetCache } from '../data';
import { getMuseums, museumsBase, museumsForObject, holdingNotYetOpen } from './museums';
import type { Museum } from '$types/museum';

// Same disk-backed fetch as data.test.ts: /data/<path> → static/data/<path>.
const originalFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    try {
      const content = readFileSync(join('static/data', url.replace(/^.*?\/data\//, '')), 'utf8');
      return new Response(content, { status: 200, headers: { 'content-type': 'application/json' } });
    } catch {
      return new Response('not found', { status: 404 });
    }
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});
beforeEach(() => __resetCache());

describe('getMuseums', () => {
  it('merges every museum with its en-US text', async () => {
    const base = await museumsBase();
    const list = await getMuseums();
    expect(list).toHaveLength(base.length);
    const nasm = list.find((m) => m.id === 'nasm-washington');
    expect(nasm?.name).toBe('National Air and Space Museum');
    expect(nasm?.items['apollo-csm-block-ii']).toContain('Columbia');
    for (const m of list) for (const h of m.holds) expect(m.items[h.ref]).toBeTruthy();
  });

  it('uses the locale text when it exists', async () => {
    const de = await getMuseums('de');
    const en = await getMuseums('en-US');
    const d = de.find((m) => m.id === 'nasm-washington');
    const e = en.find((m) => m.id === 'nasm-washington');
    expect(d?.description).not.toBe(e?.description);
  });

  it('falls back to en-US for a locale with no overlay', async () => {
    const list = await getMuseums('xx-TEST');
    expect(list.find((m) => m.id === 'nasm-washington')?.name).toBe(
      'National Air and Space Museum',
    );
  });
});

const mk = (id: string, country: string, city: string, refs: string[]): Museum => ({
  id,
  country,
  lat: 0,
  lon: 0,
  website: `https://${id}.example`,
  holds: refs.map((ref) => ({ ref, kind: 'flown', evidence: 'https://e.example', checked: '2026-10-22' })),
  name: id,
  city,
  description: 'd',
  items: Object.fromEntries(refs.map((r) => [r, `${id} has ${r}`])),
});

describe('museumsForObject', () => {
  const list = [
    mk('b', 'US', 'Washington', ['gemini']),
    mk('a', 'US', 'Houston', ['gemini', 'saturn-v']),
    mk('c', 'GB', 'London', ['gemini']),
    mk('d', 'JP', 'Tokyo', ['hayabusa']),
  ];

  it('returns only museums holding the object, by country then city', () => {
    const rows = museumsForObject(list, 'gemini');
    expect(rows.map((r) => r.museum.id)).toEqual(['c', 'a', 'b']);
    expect(rows[1].item).toBe('a has gemini');
  });

  it('returns nothing for an object no museum holds', () => {
    expect(museumsForObject(list, 'voyager-1')).toEqual([]);
  });
});

describe('holdingNotYetOpen', () => {
  const today = new Date('2026-10-22T10:00:00Z');
  it('is true before the opening date and false on or after it', () => {
    expect(holdingNotYetOpen({ from: '2026-11-13' }, today)).toBe(true);
    expect(holdingNotYetOpen({ from: '2026-10-22' }, today)).toBe(false);
    expect(holdingNotYetOpen({ from: '2025-01-01' }, today)).toBe(false);
  });
  it('is false when there is no opening date', () => {
    expect(holdingNotYetOpen({}, today)).toBe(false);
  });
});
