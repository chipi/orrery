import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/paraglide/runtime')>()),
  getLocale: () => 'de',
}));

const { localHref } = await import('./locale');

// Panel and page links were built as `${base}/x`, which is the English page,
// so a German reader left German on every cross-link.
describe('localHref on a German page', () => {
  it('prefixes the locale and keeps query and hash', () => {
    expect(localHref('/fleet?id=mariner-4')).toBe('/de/fleet?id=mariner-4');
    expect(localHref('/science/orbits/keplers-laws#first')).toBe(
      '/de/science/orbits/keplers-laws#first',
    );
    expect(localHref('/')).toBe('/de/');
  });
});
