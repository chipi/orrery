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
  monthlyNightHours,
  refractionDeg,
  toDate,
  windowOfMonthlyHours,
  type MonthWindow,
  type SunEphemeris,
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
const DEG = Math.PI / 180;
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

// The Sun table (JPL Horizons) and the reference rows (Horizons observer tables and USNO, rebuilt
// by scripts/check-sky-rows-ephemeris.ts; docs/wip/2026-11-15-sky-rows-ephemeris-check.md).
const sun: SunEphemeris = read('sun-ephemeris.json');
const reference = JSON.parse(
  readFileSync('scripts/data-snapshots/sky-rows-reference.json', 'utf8'),
) as {
  sites: { name: string; lat: number; lon: number }[];
  objects: { id: string; ra: number; dec: number }[];
  rows: {
    id: string;
    site: string;
    lat: number;
    hours: number[];
    window: MonthWindow | null;
    maxAlt: number;
  }[];
  usno: {
    site: string;
    lat: number;
    date: string;
    star: string;
    hc: number;
    dec: number;
    ra: number;
    lst: number;
  }[];
};
const ofDate = (id: string) => {
  const o = obj(id);
  return toDate(o.ra, o.dec);
};
const monthsAt = (id: string, lat: number) => {
  const e = ofDate(id);
  return bestMonths(e.ra, e.dec, lat, sun);
};
const cyc = (a: number, b: number) => Math.min((a - b + 12) % 12, (b - a + 12) % 12);

describe('the Sun table (JPL Horizons)', () => {
  it('is 365 days from 2026-01-01, with the provenance of the query', () => {
    expect(sun.ra_deg).toHaveLength(365);
    expect(sun.dec_deg).toHaveLength(365);
    const doc = read('sun-ephemeris.json');
    expect(doc._query_url).toMatch(/^https:\/\/ssd\.jpl\.nasa\.gov\/api\/horizons\.api\?/);
    expect(doc._query.COMMAND).toBe('10');
    expect(doc._source).toMatch(/JPL Horizons/);
    expect(doc._retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('carries the Horizons values of 1 January and crosses the equator at the March equinox', () => {
    expect(sun.ra_deg[0]).toBeCloseTo(281.4947, 4);
    expect(sun.dec_deg[0]).toBeCloseTo(-23.01725, 4);
    const day = sun.dec_deg.findIndex((d, i) => i > 0 && sun.dec_deg[i - 1] < 0 && d >= 0);
    expect(new Date(Date.UTC(2026, 0, 1 + day)).toISOString().slice(0, 10)).toBe('2026-03-21');
    expect(Math.max(...sun.dec_deg)).toBeCloseTo(23.43, 1);
    expect(Math.min(...sun.dec_deg)).toBeCloseTo(-23.44, 1);
  });
  it('advances in right ascension every day, one turn a year', () => {
    let turns = 0;
    for (let i = 1; i < 365; i++) {
      const step = (sun.ra_deg[i] - sun.ra_deg[i - 1] + 360) % 360;
      expect(step).toBeGreaterThan(0.85);
      expect(step).toBeLessThan(1.15);
      if (sun.ra_deg[i] < sun.ra_deg[i - 1]) turns++;
    }
    expect(turns).toBe(1);
  });
});

describe('toDate (J2000 to the table year) and refractionDeg', () => {
  it('moves a position by the general precession: about 0.33 to 0.41 degree in RA at the equator', () => {
    const e = toDate(0, 0);
    expect(e.ra).toBeGreaterThan(0.3);
    expect(e.ra).toBeLessThan(0.45);
    expect(e.dec).toBeGreaterThan(0.1);
    expect(e.dec).toBeLessThan(0.17);
    const near = toDate(359.9, 0);
    expect(near.ra).toBeGreaterThan(0);
    expect(near.ra).toBeLessThan(0.5);
  });
  it('keeps RA in 0..360 and Dec within 90 for any catalogue position', () => {
    for (const o of objects) {
      const e = toDate(o.ra, o.dec);
      expect(e.ra).toBeGreaterThanOrEqual(0);
      expect(e.ra).toBeLessThan(360);
      expect(Math.abs(e.dec)).toBeLessThanOrEqual(90);
      expect(angularSeparationDeg(raDecToHyg(o.ra, o.dec), raDecToHyg(e.ra, e.dec))).toBeLessThan(
        0.42,
      );
    }
  });
  it('refraction: 29 arcmin at a true altitude of 0, 1 at 45, none near the zenith or far below', () => {
    expect(refractionDeg(0) * 60).toBeCloseTo(28.97, 1);
    expect(refractionDeg(45) * 60).toBeCloseTo(0.99, 1);
    expect(refractionDeg(20) * 60).toBeCloseTo(2.74, 1);
    expect(refractionDeg(90)).toBe(0);
    expect(refractionDeg(-5)).toBe(0);
    expect(refractionDeg(NaN)).toBe(0);
  });
});

describe('bestMonths (opposite the Sun within 3 h of RA, above 20 degrees; backlog P1)', () => {
  it('the summer objects are summer objects from the north (the old rule said Feb-Apr for M13)', () => {
    expect(monthsAt('m13', 52.5)).toEqual({ from: 4, mid: 5, to: 6 });
    expect(monthsAt('m13', 60)).toEqual({ from: 4, mid: 5, to: 6 });
    expect(monthsAt('m57', 52.5)?.mid).toBe(6);
    expect(monthsAt('m27', 52.5)?.mid).toBe(6);
  });
  it('M42 is a December object and M31 an October one, at every latitude it rises at', () => {
    for (const lat of [52.5, 20, -34]) expect(monthsAt('m42', lat)?.mid).toBe(11);
    for (const lat of [52.5, 20]) expect(monthsAt('m31', lat)?.mid).toBe(9);
  });
  it('a window is three months and can run across the year end', () => {
    const w = monthsAt('m42', 52.5)!;
    expect(w).toEqual({ from: 10, mid: 11, to: 0 });
  });
  it('no row where the object never climbs 20 degrees: 30 Doradus from 52.5 N and 20 N, M31 from 34 S', () => {
    expect(monthsAt('30-doradus', 52.5)).toBeNull();
    expect(monthsAt('30-doradus', 20)).toBeNull();
    expect(monthsAt('m31', -34)).toBeNull();
  });
  it('there is no astronomical darkness at 52.5 N in June, so every object scores 0 then', () => {
    for (const o of objects) {
      const e = toDate(o.ra, o.dec);
      expect(monthlyNightHours(e.ra, e.dec, 52.5, sun)[5]).toBe(0);
    }
  });
  it('windowOfMonthlyHours: the run around the best month, none under four hours, the whole year', () => {
    const h = (...v: number[]) => [...v, ...new Array<number>(12 - v.length).fill(0)];
    expect(windowOfMonthlyHours(h(0, 0, 0, 0, 5, 7, 4, 3.9))).toEqual({ from: 4, mid: 5, to: 6 });
    expect(windowOfMonthlyHours(h(3.99, 1))).toBeNull();
    expect(windowOfMonthlyHours([5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5.5])).toEqual({
      from: 11,
      mid: 11,
      to: 0,
    });
    expect(windowOfMonthlyHours(new Array<number>(12).fill(6))).toEqual({
      from: 0,
      mid: 0,
      to: 11,
    });
  });
  it('is quick enough to run on every panel open', () => {
    const t = performance.now();
    for (let i = 0; i < 20; i++) bestMonths(80 + i, -5 + i, 52.5, sun);
    expect((performance.now() - t) / 20).toBeLessThan(25);
  });
});

describe('against the Horizons observer-table reference (30 objects, 3 latitudes + 180 E)', () => {
  it('covers at least 20 objects across declination, circumpolar and never-rising cases, 3 latitudes', () => {
    const decs = reference.objects.map((o) => o.dec);
    expect(reference.objects.length).toBeGreaterThanOrEqual(20);
    expect(Math.min(...decs)).toBeLessThan(-60);
    expect(Math.max(...decs)).toBeGreaterThan(60);
    expect(new Set(reference.rows.map((r) => r.lat)).size).toBe(3);
    expect(reference.rows.some((r) => r.window === null)).toBe(true);
    expect(reference.rows.some((r) => r.window?.from === 0 && r.window.to === 11)).toBe(true);
    expect(reference.rows.some((r) => r.lat > 50 && r.maxAlt > 80)).toBe(true);
  });
  it('every window matches to the month, or by one month at an edge; none matches none', () => {
    const off: string[] = [];
    for (const r of reference.rows) {
      const o = reference.objects.find((x) => x.id === r.id)!;
      const e = toDate(o.ra, o.dec);
      const ours = windowOfMonthlyHours(monthlyNightHours(e.ra, e.dec, r.lat, sun));
      if (!ours || !r.window) {
        if (ours || r.window)
          off.push(`${r.id}@${r.site}: ${JSON.stringify(ours)} vs ${JSON.stringify(r.window)}`);
        continue;
      }
      if (cyc(ours.from, r.window.from) > 1 || cyc(ours.to, r.window.to) > 1) {
        off.push(`${r.id}@${r.site}: ${JSON.stringify(ours)} vs ${JSON.stringify(r.window)}`);
      }
    }
    expect(off).toEqual([]);
  });
  it('the monthly dark hours match to 0.3 hour; all but a few windows are identical', () => {
    let worst = 0;
    let identical = 0;
    for (const r of reference.rows) {
      const o = reference.objects.find((x) => x.id === r.id)!;
      const e = toDate(o.ra, o.dec);
      const hours = monthlyNightHours(e.ra, e.dec, r.lat, sun);
      worst = Math.max(worst, ...hours.map((h, m) => Math.abs(h - r.hours[m])));
      const ours = windowOfMonthlyHours(monthlyNightHours(e.ra, e.dec, r.lat, sun));
      if (
        JSON.stringify(ours?.from) === JSON.stringify(r.window?.from) &&
        ours?.to === r.window?.to
      )
        identical++;
      else if (!ours && !r.window) identical++;
    }
    expect(worst).toBeLessThan(0.3);
    expect(identical).toBeGreaterThanOrEqual(reference.rows.length - 4);
  });
  it('the highest altitude matches to 0.5 degree', () => {
    for (const r of reference.rows) {
      const o = reference.objects.find((x) => x.id === r.id)!;
      const e = toDate(o.ra, o.dec);
      expect(Math.abs(maxAltitude(e.dec, r.lat) - r.maxAlt), `${r.id}@${r.site}`).toBeLessThan(0.5);
    }
  });
});

describe('against the USNO celestial-navigation reference (stars)', () => {
  const rows = reference.usno;
  const starEq = (name: string) => {
    const s = stars.find((x) => x.proper === name)!;
    return {
      ra: (((Math.atan2(s.y, s.x) / DEG) % 360) + 360) % 360,
      dec: Math.asin(s.z / Math.hypot(s.x, s.y, s.z)) / DEG,
    };
  };
  it('has at least 20 stars over three latitudes', () => {
    expect(new Set(rows.map((r) => r.star)).size).toBeGreaterThanOrEqual(20);
    expect(new Set(rows.map((r) => r.lat)).size).toBe(3);
  });
  it('the altitude is within 0.1 degree, the position of date within 0.05 degree', () => {
    for (const r of rows) {
      const e = starEq(r.star);
      const d = toDate(e.ra, e.dec);
      const h = (r.lst - d.ra) * DEG;
      const alt =
        Math.asin(
          Math.sin(r.lat * DEG) * Math.sin(d.dec * DEG) +
            Math.cos(r.lat * DEG) * Math.cos(d.dec * DEG) * Math.cos(h),
        ) / DEG;
      const tag = `${r.star}@${r.site} ${r.date}`;
      expect(Math.abs(alt - r.hc), tag).toBeLessThan(0.1);
      expect(Math.abs(d.dec - r.dec), tag).toBeLessThan(0.05);
      const dra = Math.abs(((d.ra - r.ra + 540) % 360) - 180) * Math.cos(r.dec * DEG);
      expect(dra, tag).toBeLessThan(0.05);
    }
  });
});

describe('maxAltitude and altitudeBand', () => {
  it('is 90 when dec equals latitude, 90 - lat at dec 0 (plus 0.02 degree of refraction), and below the horizon beyond', () => {
    expect(maxAltitude(41.3, 41.3)).toBeCloseTo(90, 9);
    expect(maxAltitude(0, 52)).toBeCloseTo(38.02, 2);
    expect(maxAltitude(-69, 52)).toBeCloseTo(-31, 9);
  });
  it('refraction lifts a body just below the horizon into view, and counts as nothing deeper than 1 degree down', () => {
    expect(maxAltitude(0, 90.3)).toBeGreaterThan(0);
    expect(maxAltitude(0, 91.1)).toBeCloseTo(-1.1, 9);
  });
  it('M31 (dec +41) is high from 52 N and low from 34 S; 30 Doradus never rises from 52 N', () => {
    const m31 = ofDate('m31');
    expect(altitudeBand(maxAltitude(m31.dec, 52))).toBe('high');
    expect(altitudeBand(maxAltitude(m31.dec, -34))).toBe('low');
    expect(altitudeBand(maxAltitude(m31.dec, -10))).toBeNull();
    expect(altitudeBand(maxAltitude(ofDate('30-doradus').dec, 52))).toBe('never');
    expect(altitudeBand(maxAltitude(ofDate('30-doradus').dec, -60))).toBe('high');
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
      const e = toDate(o.ra, o.dec);
      for (const lat of [-60, 0, 45, 70]) {
        const w = bestMonths(e.ra, e.dec, lat, sun);
        if (w) for (const v of [w.from, w.mid, w.to]) expect(Number.isInteger(v), o.id).toBe(true);
      }
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
