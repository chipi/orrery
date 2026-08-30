/**
 * Orbit-insertion burn resolver (RFC-034 §12) — guards the null path
 * (landers + flybys), the per-destination label/tag wording, the generic
 * fallback, and the dvKms pass-through.
 */
import { describe, it, expect } from 'vitest';
import { resolveOrbitInsertion } from './orbit-insertion';

// ─── Null / absent path ──────────────────────────────────────────────

describe('resolveOrbitInsertion — null / absent cases', () => {
  it('returns null when oiDvKms is null', () => {
    expect(resolveOrbitInsertion('MARS', null)).toBeNull();
  });

  it('returns null when oiDvKms is undefined', () => {
    expect(resolveOrbitInsertion('MARS', undefined)).toBeNull();
  });

  it('returns null when oiDvKms is 0', () => {
    expect(resolveOrbitInsertion('MARS', 0)).toBeNull();
  });

  it('returns null when oiDvKms is negative', () => {
    expect(resolveOrbitInsertion('MARS', -0.5)).toBeNull();
  });

  it('returns null when dest is undefined and oiDvKms is null (lander/flyby)', () => {
    expect(resolveOrbitInsertion(undefined, null)).toBeNull();
  });

  it('returns null when dest is undefined and oiDvKms is undefined', () => {
    expect(resolveOrbitInsertion(undefined, undefined)).toBeNull();
  });
});

// ─── Per-destination label + tag wording ─────────────────────────────

describe('resolveOrbitInsertion — known destination labels', () => {
  it('MARS → MOI / MARS ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('MARS', 0.9);
    expect(r).not.toBeNull();
    expect(r!.tag).toBe('MOI');
    expect(r!.label).toBe('MARS ORBIT INSERTION');
    expect(r!.dvKms).toBe(0.9);
  });

  it('MOON → LOI / LUNAR ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('MOON', 0.85);
    expect(r!.tag).toBe('LOI');
    expect(r!.label).toBe('LUNAR ORBIT INSERTION');
    expect(r!.dvKms).toBe(0.85);
  });

  it('VENUS → VOI / VENUS ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('VENUS', 1.0);
    expect(r!.tag).toBe('VOI');
    expect(r!.label).toBe('VENUS ORBIT INSERTION');
  });

  it('MERCURY → MOI / MERCURY ORBIT INSERTION (not ambiguous with Mars)', () => {
    const r = resolveOrbitInsertion('MERCURY', 0.86);
    expect(r!.tag).toBe('MOI');
    expect(r!.label).toBe('MERCURY ORBIT INSERTION');
  });

  it('JUPITER → JOI / JUPITER ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('JUPITER', 0.6);
    expect(r!.tag).toBe('JOI');
    expect(r!.label).toBe('JUPITER ORBIT INSERTION');
  });

  it('SATURN → SOI / SATURN ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('SATURN', 0.62);
    expect(r!.tag).toBe('SOI');
    expect(r!.label).toBe('SATURN ORBIT INSERTION');
  });

  it('URANUS → UOI / URANUS ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('URANUS', 0.5);
    expect(r!.tag).toBe('UOI');
    expect(r!.label).toBe('URANUS ORBIT INSERTION');
  });

  it('NEPTUNE → NOI / NEPTUNE ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('NEPTUNE', 0.55);
    expect(r!.tag).toBe('NOI');
    expect(r!.label).toBe('NEPTUNE ORBIT INSERTION');
  });

  it('CERES → COI / CERES ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('CERES', 0.15);
    expect(r!.tag).toBe('COI');
    expect(r!.label).toBe('CERES ORBIT INSERTION');
  });

  it('VESTA → VOI / VESTA ORBIT INSERTION', () => {
    const r = resolveOrbitInsertion('VESTA', 0.12);
    expect(r!.tag).toBe('VOI');
    expect(r!.label).toBe('VESTA ORBIT INSERTION');
  });
});

// ─── Generic fallback ────────────────────────────────────────────────

describe('resolveOrbitInsertion — generic fallback', () => {
  it('falls back to OI / ORBIT INSERTION for an unknown destination', () => {
    // PLUTO has no OI_BY_DEST entry.
    const r = resolveOrbitInsertion('PLUTO', 0.3);
    expect(r).not.toBeNull();
    expect(r!.tag).toBe('OI');
    expect(r!.label).toBe('ORBIT INSERTION');
    expect(r!.dvKms).toBe(0.3);
  });

  it('falls back to OI / ORBIT INSERTION when dest is undefined but dv is positive', () => {
    const r = resolveOrbitInsertion(undefined, 1.2);
    expect(r!.tag).toBe('OI');
    expect(r!.label).toBe('ORBIT INSERTION');
    expect(r!.dvKms).toBe(1.2);
  });

  it('falls back for COMET (no OI entry)', () => {
    const r = resolveOrbitInsertion('COMET', 0.2);
    expect(r!.tag).toBe('OI');
    expect(r!.label).toBe('ORBIT INSERTION');
  });

  it('falls back for ASTEROID (no OI entry)', () => {
    const r = resolveOrbitInsertion('ASTEROID', 0.05);
    expect(r!.tag).toBe('OI');
    expect(r!.label).toBe('ORBIT INSERTION');
  });
});

// ─── dvKms pass-through ──────────────────────────────────────────────

describe('resolveOrbitInsertion — dvKms field', () => {
  it('passes the authored dv through unchanged for a known destination', () => {
    const r = resolveOrbitInsertion('SATURN', 0.622);
    expect(r!.dvKms).toBe(0.622);
  });

  it('passes the authored dv through for the generic fallback', () => {
    const r = resolveOrbitInsertion('PLUTO', 1.111);
    expect(r!.dvKms).toBe(1.111);
  });
});
