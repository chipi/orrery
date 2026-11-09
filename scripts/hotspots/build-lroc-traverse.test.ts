import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { joinTrack, type LatLon } from './build-lroc-traverse';

const MOON_R = 1737400;
const K = (Math.PI / 180) * MOON_R;
const metres = (a: number[], b: number[]) =>
  Math.hypot((b[1] - a[1]) * K * Math.cos((a[0] * Math.PI) / 180), (b[0] - a[0]) * K);

describe('change4.json drive order', () => {
  const doc = JSON.parse(readFileSync('static/data/moon-traverses/change4.json', 'utf8')) as {
    points: [number, number][];
  };
  const site = [-45.4561, 177.5885];

  it('starts at the lander', () => {
    expect(metres(doc.points[0], site)).toBeLessThan(30);
  });

  it('has no jump longer than 60 m between consecutive points', () => {
    const jumps: Array<[number, number]> = [];
    for (let i = 1; i < doc.points.length; i++) {
      const s = metres(doc.points[i - 1], doc.points[i]);
      if (s > 60) jumps.push([i - 1, Math.round(s)]);
    }
    expect(jumps).toEqual([]);
  });
});

describe('joinTrack', () => {
  const site: LatLon = [0, 0];
  const e = (m: number): LatLon => [0, m / K];

  it('chains pieces in drive order, flipping reversed ones, and drops unlinked ones', () => {
    const pieces: LatLon[][] = [
      [e(300), e(200)],
      [e(400), e(305)],
      [e(5), e(100)],
      [e(100), e(200)],
      [e(2000), e(2100)],
    ];
    const r = joinTrack(pieces, site, 25);
    expect(r.used).toEqual([2, 3, 0, 1]);
    expect(r.dropped).toEqual([4]);
    for (let i = 1; i < r.points.length; i++)
      expect(metres(r.points[i - 1], r.points[i])).toBeLessThan(110);
  });

  it('is independent of the order of the pieces in the file', () => {
    const pieces: LatLon[][] = [
      [e(100), e(200)],
      [e(5), e(100)],
      [e(400), e(300)],
      [e(300), e(200)],
    ];
    expect(joinTrack(pieces, site, 25).points).toEqual(
      joinTrack([...pieces].reverse(), site, 25).points,
    );
  });
});
