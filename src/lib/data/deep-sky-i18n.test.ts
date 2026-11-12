import { existsSync, readFileSync } from 'node:fs';
import { describe, it, expect, vi } from 'vitest';

// The real i18n-src overlays, without the bundle/fetch machinery of ./core.
vi.mock('./core', () => ({
  get: vi.fn(async (path: string) => {
    const file = path.startsWith('i18n/') ? `i18n-src/${path.slice(5)}` : `static/data/${path}`;
    if (!existsSync(file)) throw new Error(`404 ${path}`);
    return JSON.parse(readFileSync(file, 'utf8'));
  }),
}));

import { getDeepSkyI18n } from './universe';

describe('getDeepSkyI18n', () => {
  it('returns the en-US fact and bio', async () => {
    const o = await getDeepSkyI18n('en-US', 'm13');
    expect(o?.fact).toContain('Hercules Cluster');
    expect(o?.bio).toContain('Edmond Halley');
  });

  it('returns the reader’s locale, not the English text', async () => {
    const de = await getDeepSkyI18n('de', 'm13');
    expect(de?.fact).toContain('Herkuleshaufen');
    expect(de?.bio).toContain('Blue Straggler');
  });

  it('falls back to en-US when the locale has no overlay', async () => {
    const o = await getDeepSkyI18n('xx', 'm13');
    expect(o?.fact).toContain('Hercules Cluster');
  });

  it('is null when no locale has an overlay for the object', async () => {
    expect(await getDeepSkyI18n('de', 'no-such-object')).toBeNull();
    expect(await getDeepSkyI18n('en-US', 'no-such-object')).toBeNull();
  });
});
