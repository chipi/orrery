import { describe, it, expect } from 'vitest';
import { formatDisplayVersion } from './version';

describe('formatDisplayVersion', () => {
  it('keeps the pre-release suffix and drops a .0 patch', () => {
    expect(formatDisplayVersion('0.8.0-wip')).toBe('0.8-wip');
  });

  it('keeps a non-zero patch on a release', () => {
    expect(formatDisplayVersion('0.7.3')).toBe('0.7.3');
  });

  it('drops a .0 patch on a plain release', () => {
    expect(formatDisplayVersion('0.8.0')).toBe('0.8');
  });

  it('preserves multi-part pre-release suffixes', () => {
    expect(formatDisplayVersion('0.9.0-rc.1')).toBe('0.9-rc.1');
    expect(formatDisplayVersion('1.2.3-rc.1')).toBe('1.2.3-rc.1');
  });
});
