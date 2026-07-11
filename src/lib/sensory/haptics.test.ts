// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pulse, type HapticKind } from './haptics';

// jsdom isn't a Capacitor native platform, so pulse() takes the web
// navigator.vibrate path. Stub it to exercise the pattern lookup.
const vibrate = vi.fn();
beforeEach(() => {
  vi.stubGlobal('navigator', { ...navigator, vibrate });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vibrate.mockClear();
});

describe('haptics.pulse', () => {
  it('maps every semantic kind to a web vibration pattern', () => {
    const kinds: HapticKind[] = ['light', 'medium', 'heavy', 'success', 'warning'];
    for (const k of kinds) expect(() => pulse(k)).not.toThrow();
    expect(vibrate).toHaveBeenCalledTimes(kinds.length);
  });
});
