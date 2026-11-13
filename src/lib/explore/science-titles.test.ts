import { describe, expect, it, vi } from 'vitest';

vi.mock('$app/paths', () => ({ base: '' }));

import { loadScienceTitles } from './science-titles';

const entries = (title: string) => [{ tab: 'observation', section: 'our-galaxy', title }];
const ok = (body: unknown) => ({ ok: true, json: async () => body }) as Response;

describe('loadScienceTitles', () => {
  it('reads the locale index and maps tab/section to the title', async () => {
    const fetchFn = vi.fn(async () => ok(entries('Unsere Galaxie')));
    const t = await loadScienceTitles('de', fetchFn as unknown as typeof fetch);
    expect(t.get('observation/our-galaxy')).toBe('Unsere Galaxie');
    expect(fetchFn).toHaveBeenCalledWith('/data/science-index.de.json');
  });

  it('asks once per locale and keeps the answer', async () => {
    const fetchFn = vi.fn(async () => ok(entries('Our galaxy')));
    await loadScienceTitles('fr', fetchFn as unknown as typeof fetch);
    await loadScienceTitles('fr', fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('falls back to the English index when the locale one is missing or throws', async () => {
    const fetchFn = vi.fn(async (url: string) => {
      if (url.includes('science-index.es.json')) return { ok: false } as Response;
      if (url.includes('science-index.it.json')) throw new Error('offline');
      return ok(entries('Our galaxy'));
    });
    const es = await loadScienceTitles('es', fetchFn as unknown as typeof fetch);
    expect(es.get('observation/our-galaxy')).toBe('Our galaxy');
    const it = await loadScienceTitles('it', fetchFn as unknown as typeof fetch);
    expect(it.get('observation/our-galaxy')).toBe('Our galaxy');
  });

  it('reads only the English index for en-US, and gives an empty map when nothing loads', async () => {
    const fetchFn = vi.fn(async () => ({ ok: false }) as Response);
    const t = await loadScienceTitles('en-US', fetchFn as unknown as typeof fetch);
    expect(t.size).toBe(0);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchFn).toHaveBeenCalledWith('/data/science-index.json');
  });
});
