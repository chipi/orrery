import { describe, expect, it, vi } from 'vitest';
import type { Pass } from '../satellite';

vi.mock('$lib/paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/paraglide/runtime')>()),
  getLocale: () => 'de',
}));

const { formatPass } = await import('./launch-ar');

const pass = (over: Partial<Pass> = {}): Pass => ({
  start: new Date(Date.now() + 30 * 60_000),
  culmination: new Date(Date.now() + 33 * 60_000),
  end: new Date(Date.now() + 36 * 60_000),
  maxAltitudeDeg: 42,
  startAzimuthDeg: 90,
  visible: true,
  ...over,
});

// The AR overlay was English-only in every locale (#608 item 36).
describe('formatPass in a non-English locale', () => {
  it('renders the pass line, compass point and stale note from the de bundle', () => {
    const s = formatPass('iss', pass(), 48);
    expect(s).toContain('sichtbarer Überflug');
    // East is "O" (Ost) in German, not the English "E".
    expect(s).toMatch(/, O, /);
    expect(s).toContain('48 Tage alt');
    expect(s).not.toMatch(/visible|approx|old TLE/);
  });
});
