import { describe, expect, it } from 'vitest';
import { ISS_DOCK_EVENTS, ISS_TRUSS_PHASES } from './iss-assembly-phases';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

describe('ISS_DOCK_EVENTS', () => {
  it('is non-empty', () => {
    expect(ISS_DOCK_EVENTS.length).toBeGreaterThan(0);
  });

  it('has the 7 first-arrival visiting-craft families', () => {
    expect(ISS_DOCK_EVENTS).toHaveLength(7);
  });

  it('all entries have the required fields populated', () => {
    for (const e of ISS_DOCK_EVENTS) {
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.launcher).toBeTruthy();
      expect(e.launch_date).toBeTruthy();
    }
  });

  it('all ids carry the "dock-" prefix for the animation mapper', () => {
    for (const e of ISS_DOCK_EVENTS) {
      expect(e.id.startsWith('dock-')).toBe(true);
    }
  });

  it('ids are unique', () => {
    const ids = ISS_DOCK_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('launch_date values are ISO YYYY-MM-DD and parseable', () => {
    for (const e of ISS_DOCK_EVENTS) {
      expect(e.launch_date).toMatch(ISO_DATE_RE);
      expect(Number.isFinite(Date.parse(e.launch_date))).toBe(true);
    }
  });
});

describe('ISS_TRUSS_PHASES', () => {
  it('is non-empty', () => {
    expect(ISS_TRUSS_PHASES.length).toBeGreaterThan(0);
  });

  it('has 10 STS truss installs + 3 iROSA roll-out campaigns = 13 phases', () => {
    expect(ISS_TRUSS_PHASES).toHaveLength(13);
    const iROSAs = ISS_TRUSS_PHASES.filter((p) => p.id.startsWith('truss-irosa-'));
    expect(iROSAs).toHaveLength(3);
  });

  it('all entries have the required fields populated', () => {
    for (const p of ISS_TRUSS_PHASES) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.launcher).toBeTruthy();
      expect(p.launch_date).toBeTruthy();
    }
  });

  it('all ids carry the "truss-" prefix', () => {
    for (const p of ISS_TRUSS_PHASES) {
      expect(p.id.startsWith('truss-')).toBe(true);
    }
  });

  it('ids are unique', () => {
    const ids = ISS_TRUSS_PHASES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('launch_date values are ISO YYYY-MM-DD and parseable', () => {
    for (const p of ISS_TRUSS_PHASES) {
      expect(p.launch_date).toMatch(ISO_DATE_RE);
      expect(Number.isFinite(Date.parse(p.launch_date))).toBe(true);
    }
  });

  it('phases are in chronological order (assembly walker assumption)', () => {
    let prev = -Infinity;
    for (const p of ISS_TRUSS_PHASES) {
      const epoch = Date.parse(p.launch_date);
      expect(epoch).toBeGreaterThanOrEqual(prev);
      prev = epoch;
    }
  });
});

describe('cross-array invariants', () => {
  it('dock and truss id namespaces do not collide', () => {
    const dockIds = new Set(ISS_DOCK_EVENTS.map((e) => e.id));
    const trussIds = new Set(ISS_TRUSS_PHASES.map((p) => p.id));
    for (const id of dockIds) {
      expect(trussIds.has(id)).toBe(false);
    }
  });
});
