/**
 * What the deep-sky BEST MONTHS row says at a set of reader latitudes: for each object, the
 * window (or "no row") and its highest altitude. A review aid for the WELL_PLACED thresholds
 * (search backlog P1 close-out, 2026-11-19).
 *
 *   npx tsx scripts/sky-rows-review.ts                 # default objects and latitudes
 *   npx tsx scripts/sky-rows-review.ts --lat=52,60 --ids=m13,m57
 */
import { readFileSync } from 'node:fs';
import { bestMonths, maxAltitude, toDate, type SunEphemeris } from '../src/lib/universe/sky-finder';

const arg = (k: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const lats = (arg('lat') ?? '-35,0,35,45,52,60').split(',').map(Number);
const want = (arg('ids') ?? 'm13,m57,m27,m8,m17,m31,m42,m45,m51,m81').split(',');
const sun = JSON.parse(
  readFileSync('static/data/universe/sun-ephemeris.json', 'utf-8'),
) as SunEphemeris;
const { objects: all } = JSON.parse(
  readFileSync('static/data/universe/deep-sky-objects.json', 'utf-8'),
) as {
  objects: {
    id: string;
    ra: number;
    dec: number;
  }[];
};
const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const objs = all.filter((o) => want.includes(o.id));
console.log(['object', 'dec', ...lats.map((l) => `${l}°`)].join('\t'));
for (const o of objs) {
  const eq = toDate(o.ra, o.dec);
  const cells = lats.map((lat) => {
    const w = bestMonths(eq.ra, eq.dec, lat, sun);
    const alt = Math.round(maxAltitude(eq.dec, lat));
    return `${w ? (w.from === w.to ? M[w.from] : `${M[w.from]}-${M[w.to]}`) : 'no row'} (${alt}°)`;
  });
  console.log([o.id, o.dec.toFixed(0), ...cells].join('\t'));
}
