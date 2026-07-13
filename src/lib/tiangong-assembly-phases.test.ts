import { describe, expect, it } from 'vitest';
import { TIANGONG_DOCK_EVENTS } from './tiangong-assembly-phases';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

describe('TIANGONG_DOCK_EVENTS', () => {
  it('is non-empty', () => {
    expect(TIANGONG_DOCK_EVENTS.length).toBeGreaterThan(0);
  });

  it('all entries have the required fields populated', () => {
    for (const e of TIANGONG_DOCK_EVENTS) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.launcher).toBeTruthy();
      expect(e.launch_date).toBeTruthy();
    }
  });

  it('all ids carry the "dock-" prefix for the animation mapper', () => {
    for (const e of TIANGONG_DOCK_EVENTS) {
      expect(e.id.startsWith('dock-')).toBe(true);
    }
  });

  it('ids are unique', () => {
    const ids = TIANGONG_DOCK_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('launch_date values are ISO YYYY-MM-DD and parseable', () => {
    for (const e of TIANGONG_DOCK_EVENTS) {
      expect(e.launch_date).toMatch(ISO_DATE_RE);
      expect(Number.isFinite(Date.parse(e.launch_date))).toBe(true);
    }
  });

  it('dates are in ascending chronological order (assembly walker assumption)', () => {
    let prev = -Infinity;
    for (const e of TIANGONG_DOCK_EVENTS) {
      const epoch = Date.parse(e.launch_date);
      expect(epoch).toBeGreaterThanOrEqual(prev);
      prev = epoch;
    }
  });
});
