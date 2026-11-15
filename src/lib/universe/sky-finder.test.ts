import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  raDecToHyg,
  angularSeparationDeg,
  nearestNamedStar,
  bestMonths,
  maxAltitude,
  altitudeBand,
  eyeBand,
  figureVertices,
  formatRa,
  formatDec,
} from './sky-finder';
import { IAU_CONSTELLATIONS } from './iau-constellations';

type Ds = {
  id: string;
  ra: number;
  dec: number;
  x: number;
  y: number;
  z: number;
  mag: number | null;
  con: string;
};
const read = (f: string) => JSON.parse(readFileSync(`static/data/universe/${f}`, 'utf8'));
const objects: Ds[] = read('deep-sky-objects.json').objects;
const stars: { id: string; proper: string; x: number; y: number; z: number }[] =
  read('named-stars.json').stars;
const figures: { con: string; vertices: number[] }[] = read(
  'constellation-lines.json',
).constellations;
const obj = (id: string) => {
  const o = objects.find((x) => x.id === id);
  if (!o) throw new Error(`no object ${id}`);
  return o;
};

describe('raDecToHyg (the frame trap)', () => {
  it('maps the axes: RA 0 Dec 0 is +x, RA 90 Dec 0 is +y, Dec 90 is +z (the pole is z in HYG)', () => {
    const near = (a: readonly number[], b: number[]) =>
      a.forEach((v, i) => expect(v).toBeCloseTo(b[i], 9));
    near(raDecToHyg(0, 0), [1, 0, 0]);
    near(raDecToHyg(90, 0), [0, 1, 0]);
    near(raDecToHyg(0, 90), [0, 0, 1]);
  });

  it('agrees with every catalogue object: scene (x, y, z) is HYG (x, z, y)', () => {
    expect(objects.length).toBeGreaterThan(100);
    for (const o of objects) {
      const [hx, hy, hz] = raDecToHyg(o.ra, o.dec);
      expect(hx, o.id).toBeCloseTo(o.x, 2);
      expect(hy, o.id).toBeCloseTo(o.z, 2);
      expect(hz, o.id).toBeCloseTo(o.y, 2);
    }
  });

  it('puts M42, M31 and Sirius in the frame the named stars and figures use', () => {
    // M31 (Andromeda): the figure's vertices read RA about 31, Dec about +42; M31 is at 10.7, +41.3.
    const m31 = raDecToHyg(obj('m31').ra, obj('m31').dec);
    const and = figureVertices(figures, 'And')!;
    const [vx, vy, vz] = [and[0], and[1], and[2]];
    const figDir = [vx, vy, vz].map((v) => v / Math.hypot(vx, vy, vz));
    expect(angularSeparationDeg(m31, figDir as [number, number, number])).toBeLessThan(40);
    // Sirius: a named star placed from the same catalogue; its own RA 101.3, Dec -16.7.
    const sirius = stars.find((s) => s.id === 'sirius')!;
    expect(
      angularSeparationDeg(raDecToHyg(101.287, -16.716), [sirius.x, sirius.y, sirius.z]),
    ).toBeLessThan(0.1);
  });
});

describe('angularSeparationDeg', () => {
  it('is 0, 90 and 180 for the same, orthogonal and opposite directions, whatever the length', () => {
    expect(angularSeparationDeg([2, 0, 0], [5, 0, 0])).toBeCloseTo(0, 6);
    expect(angularSeparationDeg([1, 0, 0], [0, 3, 0])).toBeCloseTo(90, 9);
    expect(angularSeparationDeg([1, 0, 0], [-1, 0, 0])).toBeCloseTo(180, 9);
  });
  it('is NaN for a zero vector', () => {
    expect(angularSeparationDeg([0, 0, 0], [1, 0, 0])).toBeNaN();
  });
});

describe('nearestNamedStar', () => {
  it('hops from M42 to Alnitak, about 3.7 degrees (the brief measured 3.7)', () => {
    const m42 = obj('m42');
    const hit = nearestNamedStar(raDecToHyg(m42.ra, m42.dec), stars);
    expect(hit?.star.id).toBe('alnitak');
    expect(hit!.sepDeg).toBeGreaterThan(3.3);
    expect(hit!.sepDeg).toBeLessThan(4.1);
  });
  it('hops from M31 to Alpheratz, about 14 degrees', () => {
    const m31 = obj('m31');
    const hit = nearestNamedStar(raDecToHyg(m31.ra, m31.dec), stars);
    expect(hit?.star.id).toBe('alpheratz');
    expect(hit!.sepDeg).toBeGreaterThan(13.5);
    expect(hit!.sepDeg).toBeLessThan(14.5);
  });
  it('returns null beyond the limit and keeps the nearest within it', () => {
    const m31 = obj('m31');
    const dir = raDecToHyg(m31.ra, m31.dec);
    expect(nearestNamedStar(dir, stars, 10)).toBeNull();
    expect(nearestNamedStar(dir, stars, 15)).not.toBeNull();
    expect(nearestNamedStar(dir, [], 15)).toBeNull();
  });
  it('leaves a southern object without a row when no named star is within 15 degrees', () => {
    const dor = obj('30-doradus');
    expect(nearestNamedStar(raDecToHyg(dor.ra, dor.dec), stars)).toBeNull();
  });
  it('104 of the 143 objects have a named star within 15 degrees (the brief counted 104)', () => {
    const n = objects.filter((o) => nearestNamedStar(raDecToHyg(o.ra, o.dec), stars)).length;
    expect(n).toBe(104);
  });
});

describe('bestMonths (mean-Sun rule)', () => {
  it('puts M42 in December, M31 in September, M13 in May, M8 in June', () => {
    expect(bestMonths(obj('m42').ra).mid).toBe(11);
    expect(bestMonths(obj('m31').ra).mid).toBe(8);
    expect(bestMonths(obj('m13').ra).mid).toBe(4);
    expect(bestMonths(obj('m8').ra).mid).toBe(5);
  });
  it('wraps the window across the year end and start', () => {
    expect(bestMonths(obj('m42').ra)).toEqual({ from: 10, mid: 11, to: 0 });
    const jan = bestMonths(110); // opposite RA 290 deg: day ~ 79 + 293.6 = 372.6 -> day 7 of January
    expect(jan.mid).toBe(0);
    expect(jan.from).toBe(11);
    expect(jan.to).toBe(1);
  });
  it('accepts RA outside 0..360 and always returns months 0..11', () => {
    for (const ra of [-30, 0, 359.9, 360, 725]) {
      const r = bestMonths(ra);
      for (const v of [r.from, r.mid, r.to]) {
        expect(Number.isInteger(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(11);
      }
    }
  });
});

describe('maxAltitude and altitudeBand', () => {
  it('is 90 when dec equals latitude, 90 - lat at dec 0, and negative beyond the pole side', () => {
    expect(maxAltitude(41.3, 41.3)).toBeCloseTo(90, 9);
    expect(maxAltitude(0, 52)).toBeCloseTo(38, 9);
    expect(maxAltitude(-69, 52)).toBeCloseTo(-31, 9);
  });
  it('M31 (dec +41) is high from 52 N and low from 34 S; 30 Doradus never rises from 52 N', () => {
    const m31 = obj('m31');
    expect(altitudeBand(maxAltitude(m31.dec, 52))).toBe('high');
    expect(altitudeBand(maxAltitude(m31.dec, -34))).toBe('low');
    expect(altitudeBand(maxAltitude(m31.dec, -10))).toBeNull();
    expect(altitudeBand(maxAltitude(obj('30-doradus').dec, 52))).toBe('never');
    expect(altitudeBand(maxAltitude(obj('30-doradus').dec, -60))).toBe('high');
  });
  it('band edges: 60 and 20 say nothing, just beyond them say high and low, 0 never rises', () => {
    expect(altitudeBand(60)).toBeNull();
    expect(altitudeBand(60.1)).toBe('high');
    expect(altitudeBand(20)).toBeNull();
    expect(altitudeBand(19.9)).toBe('low');
    expect(altitudeBand(0)).toBe('never');
    expect(altitudeBand(0.1)).toBe('low');
    expect(altitudeBand(NaN)).toBeNull();
  });
});

describe('eyeBand (a magnitude rule)', () => {
  it('edges: 6 is naked eye, 6.1 binoculars, 9 binoculars, 9.1 telescope', () => {
    expect(eyeBand(6)).toBe('naked');
    expect(eyeBand(6.1)).toBe('binoculars');
    expect(eyeBand(9)).toBe('binoculars');
    expect(eyeBand(9.1)).toBe('telescope');
    expect(eyeBand(-1)).toBe('naked');
  });
  it('has no band without a magnitude', () => {
    expect(eyeBand(null)).toBeNull();
    expect(eyeBand(undefined)).toBeNull();
    expect(eyeBand(NaN)).toBeNull();
  });
  it('splits the catalogue 29 / 61 / 32+1 with 20 without a magnitude (the brief counted)', () => {
    const c = { naked: 0, binoculars: 0, telescope: 0, none: 0 };
    for (const o of objects) c[eyeBand(o.mag) ?? 'none']++;
    expect(c).toEqual({ naked: 29, binoculars: 61, telescope: 33, none: 20 });
  });
});

describe('figureVertices (Serpens has two parts)', () => {
  it('returns null for an unknown code and the single entry for most codes', () => {
    expect(figureVertices(figures, 'Xyz')).toBeNull();
    expect(figureVertices(figures, 'Ori')).toBe(figures.find((f) => f.con === 'Ori')!.vertices);
  });
  it('merges both halves of Serpens, whole segments only', () => {
    const parts = figures.filter((f) => f.con === 'Ser');
    expect(parts).toHaveLength(2);
    const merged = figureVertices(figures, 'Ser')!;
    expect(merged.length).toBe(parts[0].vertices.length + parts[1].vertices.length);
    expect(merged.length % 6).toBe(0);
  });
});

describe('every deep-sky object resolves', () => {
  it('has a line figure for its constellation code and finite computed rows', () => {
    for (const o of objects) {
      expect(IAU_CONSTELLATIONS[o.con], o.id).toBeDefined();
      expect(figureVertices(figures, o.con), o.id).not.toBeNull();
      expect(Number.isFinite(maxAltitude(o.dec, 45)), o.id).toBe(true);
      expect(bestMonths(o.ra).mid, o.id).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('formatRa and formatDec', () => {
  it('formats M42 as 5h 35m and -5 degrees', () => {
    expect(formatRa(obj('m42').ra)).toBe('5h 35m');
    expect(formatDec(obj('m42').dec)).toBe('−5°');
  });
  it('wraps 24 h to 0 and signs positive declinations', () => {
    expect(formatRa(359.9999)).toBe('0h 00m');
    expect(formatDec(41.27)).toBe('+41°');
    expect(formatDec(0.2)).toBe('0°');
  });
});
