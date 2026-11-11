import { describe, it, expect } from 'vitest';
import { statusTone } from './status-tone';

describe('statusTone', () => {
  it('labels each status from the message catalog', () => {
    expect(statusTone('ACTIVE').label).toBe('ACTIVE');
    expect(statusTone('ACTIVE', 'orbiter').label).toBe('IN ORBIT');
    expect(statusTone('CRASHED').label).toBe('CRASHED');
    expect(statusTone('LOST').label).toBe('LOST');
    expect(statusTone('PLANNED').label).toBe('PLANNED');
    expect(statusTone('ENDED').label).toBe('ENDED');
    expect(statusTone('FLOWN').label).toBe('FLOWN');
  });

  it('PLANNED is drawn dashed, every other status solid', () => {
    expect(statusTone('PLANNED').outline).toBe('dashed');
    for (const s of ['ACTIVE', 'CRASHED', 'LOST', 'ENDED', 'FLOWN']) {
      expect(statusTone(s).outline).toBe('solid');
    }
  });

  it('a launch pad that ended service reads RETIRED', () => {
    expect(statusTone('ENDED', 'surface', 'launch-pad').label).toBe('RETIRED');
    expect(statusTone('ACTIVE', 'surface', 'launch-pad').label).toBe('ACTIVE');
  });
});
