import { describe, expect, it } from 'vitest';
import { nextHotspotsMode, resolveInitialHotspotsMode } from './hotspots-mode';

describe('nextHotspotsMode', () => {
  it('cycles auto → low → high → auto', () => {
    expect(nextHotspotsMode('auto')).toBe('low');
    expect(nextHotspotsMode('low')).toBe('high');
    expect(nextHotspotsMode('high')).toBe('auto');
  });
});

describe('resolveInitialHotspotsMode', () => {
  it('honours an explicit ?hotspots= URL param', () => {
    expect(resolveInitialHotspotsMode(new URL('https://x/?hotspots=low'))).toBe('low');
    expect(resolveInitialHotspotsMode(new URL('https://x/?hotspots=high'))).toBe('high');
    expect(resolveInitialHotspotsMode(new URL('https://x/?hotspots=auto'))).toBe('auto');
  });

  it('ignores unknown values and falls through', () => {
    // No window in vitest node env → falls through to 'auto'.
    expect(resolveInitialHotspotsMode(new URL('https://x/?hotspots=xyz'))).toBe('auto');
  });

  it('returns auto when no param + no browser environment hints', () => {
    expect(resolveInitialHotspotsMode(new URL('https://x/'))).toBe('auto');
  });
});
