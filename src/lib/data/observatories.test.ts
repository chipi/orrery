import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { __resetCache } from '../data';
import { getObservatories, observatoriesBase, observatoriesForArticle } from './observatories';
import type { Observatory } from '$types/observatory';

// Same disk-backed fetch as data.test.ts: /data/<path> → static/data/<path>.
const originalFetch = globalThis.fetch;
beforeAll(() => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    try {
      const content = readFileSync(join('static/data', url.replace(/^.*?\/data\//, '')), 'utf8');
      return new Response(content, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch {
      return new Response('not found', { status: 404 });
    }
  }) as typeof fetch;
});
afterAll(() => {
  globalThis.fetch = originalFetch;
});
beforeEach(() => __resetCache());

describe('getObservatories', () => {
  it('merges every observatory with its en-US text', async () => {
    const base = await observatoriesBase();
    const list = await getObservatories();
    expect(list).toHaveLength(base.length);
    const vla = list.find((o) => o.id === 'vla');
    expect(vla?.highlights.length).toBeGreaterThan(0);
    expect(vla?.films).toEqual(['contact']);
    expect(vla?.film).toContain('Contact');
  });

  it('falls back to en-US for a locale with no overlay', async () => {
    const list = await getObservatories('xx-TEST');
    expect(list.find((o) => o.id === 'parkes')?.film).toContain('The Dish');
  });
});

const mk = (id: string, country: string, science: string[]): Observatory => ({
  id,
  country,
  lat: 0,
  lon: 0,
  website: 'https://x.example',
  kind: 'radio',
  status: 'active',
  science,
  evidence: 'https://e.example',
  name: id,
  place: 'p',
  description: 'd',
  highlights: ['h'],
});

describe('observatoriesForArticle', () => {
  const list = [
    mk('vla', 'US', ['/science/observation/interferometry']),
    mk('alma', 'CL', ['/science/observation/interferometry', '/science/observation/black-holes']),
    mk('fast', 'CN', ['/science/observation/our-galaxy']),
  ];
  it('returns the observatories linking the article, by country', () => {
    expect(
      observatoriesForArticle(list, '/science/observation/interferometry').map((o) => o.id),
    ).toEqual(['alma', 'vla']);
  });
  it('returns nothing for an article no observatory links', () => {
    expect(observatoriesForArticle(list, '/science/orbits/vis-viva')).toEqual([]);
  });
});
