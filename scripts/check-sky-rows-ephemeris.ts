/**
 * Compare the deep-sky IN THE SKY rows (best months and highest altitude,
 * src/lib/universe/sky-finder.ts) with independent references, for a sample of deep-sky objects
 * across declination at three latitudes (UXD-049, L42).
 *
 * References, all fetched from the services directly:
 *  - JPL Horizons observer tables for the Sun at each site, every 15 minutes for the whole of
 *    2026: the Sun's apparent topocentric elevation (the darkness) and the local apparent sidereal
 *    time (the object's hour angle). From them each object's dark hours above 20 degrees night
 *    by night, the monthly averages, the window and the highest altitude are rebuilt without the
 *    daily Sun table, the solar-time sampling or the geocentric Sun of the model under test.
 *  - Horizons again, REFRACTED against AIRLESS Sun elevations: checks the refraction model.
 *  - USNO Astronomical Applications celestial-navigation API (aa.usno.navy.mil/api/celnav): the
 *    computed altitude (Hc) and the apparent Dec / GHA of the navigational stars, against the
 *    altitude and the precessed position this module computes from the HYG J2000 position.
 *
 * Writes scripts/data-snapshots/sky-rows-reference.json (what the unit test pins; no network in
 * tests) and docs/wip/2026-11-15-sky-rows-ephemeris-check.md. Raw Horizons replies are cached under
 * ~/.cache/orrery/horizons-sky (SKY_REFRESH=1 refetches).
 *
 *   Run: npx tsx scripts/check-sky-rows-ephemeris.ts
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as prettier from 'prettier';
import { fetchHorizons, parseHorizonsCsv } from './lib/horizons.mjs';
import {
  WELL_PLACED,
  maxAltitude,
  monthlyNightHours,
  refractionDeg,
  toDate,
  windowOfMonthlyHours,
  type MonthWindow,
} from '../src/lib/universe/sky-finder';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(os.homedir(), '.cache', 'orrery', 'horizons-sky');
const SNAPSHOT = path.join(ROOT, 'scripts', 'data-snapshots', 'sky-rows-reference.json');
const REPORT = path.join(ROOT, 'docs', 'wip', '2026-11-15-sky-rows-ephemeris-check.md');
const UNIVERSE = path.join(ROOT, 'static', 'data', 'universe');
const DEG = Math.PI / 180;
const DAY = 86_400_000;
const USER_AGENT = 'orrery-sky-ephemeris (+https://github.com/chipi/orrery)';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// The night of table day d is centred on the site's local midnight of that date; at longitude 0 that
// is the table's own 00:00 UT, at 180 E it is 12 hours earlier (the Sun's table is read 12 h away).
const SITES = [
  { name: '52.5 N', lat: 52.5, lon: 0 },
  { name: '20 N', lat: 20, lon: 0 },
  { name: '34 S', lat: -34, lon: 0 },
  { name: '52.5 N, 180 E', lat: 52.5, lon: 180 },
];
const FIRST = Date.UTC(2025, 11, 31, 12); // night 0 spans 2025-12-31 12:00 to 2026-01-01 12:00 UT
const LAST = Date.UTC(2026, 11, 31, 12);
const STEP_MIN = 15;
const firstOf = (site: { lon: number }) => FIRST - (site.lon / 15) * 3_600_000;
const FORCED = ['m42', 'm31', '30-doradus', 'cas-a', 'm44', 'm13', 'm8'];

const readJson = (f: string) => JSON.parse(fs.readFileSync(path.join(UNIVERSE, f), 'utf8'));
const sun = readJson('sun-ephemeris.json');
const catalogue: { id: string; designation: string; ra: number; dec: number }[] =
  readJson('deep-sky-objects.json').objects;
const namedStars: { id: string; proper: string; x: number; y: number; z: number }[] =
  readJson('named-stars.json').stars;

// ── fetching with a cache ───────────────────────────────────────────────────────────────

fs.mkdirSync(CACHE, { recursive: true });
const stamp = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');

async function horizonsCached(key: string, params: Record<string, string>): Promise<string> {
  const file = path.join(CACHE, `${key}.txt`);
  if (!process.env.SKY_REFRESH && fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  const { text } = await fetchHorizons(params);
  fs.writeFileSync(file, text);
  return text;
}

function siteParams(site: { lat: number; lon: number }, startMs: number, stopMs: number) {
  return {
    COMMAND: '10',
    OBJ_DATA: 'NO',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'OBSERVER',
    CENTER: 'coord@399',
    COORD_TYPE: 'GEODETIC',
    SITE_COORD: `${site.lon},${site.lat},0`,
    START_TIME: stamp(startMs),
    STOP_TIME: stamp(stopMs),
    STEP_SIZE: `${STEP_MIN}m`,
    QUANTITIES: '4,7',
    ANG_FORMAT: 'DEG',
    CSV_FORMAT: 'YES',
  };
}

const MON = Object.fromEntries(MONTHS.map((m, i) => [m, i]));
function parseStamp(s: string): number {
  const m = /^(\d{4})-(\w{3})-(\d{2}) (\d{2}):(\d{2})$/.exec(s);
  if (!m) throw new Error(`bad Horizons time ${s}`);
  return Date.UTC(+m[1], MON[m[2]], +m[3], +m[4], +m[5]);
}

type Series = { t: number[]; sunEl: number[]; lastDeg: number[] };

function parseSeries(text: string): { t: number; el: number; lastDeg: number }[] {
  const header = text.split('\n').find((l) => /Date__\(UT\)/.test(l)) ?? '';
  const cols = header.split(',').map((c) => c.trim());
  const iEl = cols.findIndex((c) => /^Elev_/.test(c));
  const iLast = cols.findIndex((c) => /^L_Ap_Sid_Time/.test(c));
  if (iEl < 0 || iLast < 0) throw new Error(`unexpected Horizons columns: ${header}`);
  return (parseHorizonsCsv(text) as string[][]).map((r) => ({
    t: parseStamp(r[0]),
    el: Number(r[iEl]),
    lastDeg: Number(r[iLast]) * 15,
  }));
}

async function loadSeries(site: (typeof SITES)[number]): Promise<Series> {
  const byTime = new Map<number, { el: number; lastDeg: number }>();
  const chunk = 28 * DAY;
  const first = firstOf(site);
  const last = first + (LAST - FIRST);
  for (let s = first, c = 0; s < last; s += chunk, c++) {
    const stop = Math.min(s + chunk, last);
    const text = await horizonsCached(
      `sun-${site.lat}-${site.lon}-${c}`,
      siteParams(site, s, stop),
    );
    for (const r of parseSeries(text)) byTime.set(r.t, r);
  }
  const t = [...byTime.keys()].sort((a, b) => a - b);
  const expected = (LAST - FIRST) / (STEP_MIN * 60_000) + 1;
  if (t.length !== expected)
    throw new Error(`${site.name}: ${t.length} rows, expected ${expected}`);
  return {
    t,
    sunEl: t.map((k) => byTime.get(k)!.el),
    lastDeg: t.map((k) => byTime.get(k)!.lastDeg),
  };
}

// ── the reference rows from the series ───────────────────────────────────────────────────

const MONTH_OF_NIGHT = Array.from({ length: 365 }, (_, d) =>
  new Date(Date.UTC(2026, 0, 1 + d)).getUTCMonth(),
);

function referenceRow(
  series: Series,
  site: { lat: number; lon: number },
  raDate: number,
  decDate: number,
) {
  const lat = site.lat;
  const first = firstOf(site);
  const sinLat = Math.sin(lat * DEG);
  const cosLat = Math.cos(lat * DEG);
  const sinDec = Math.sin(decDate * DEG);
  const cosDec = Math.cos(decDate * DEG);
  const sinUp = Math.sin((WELL_PLACED.minAltDeg - refractionDeg(WELL_PLACED.minAltDeg)) * DEG);
  const perNight = new Array<number>(365).fill(0);
  let maxTrue = -90;
  for (let i = 0; i < series.t.length; i++) {
    const h = (series.lastDeg[i] - raDate) * DEG;
    const sinAlt = sinLat * sinDec + cosLat * cosDec * Math.cos(h);
    maxTrue = Math.max(maxTrue, Math.asin(sinAlt) / DEG);
    if (series.sunEl[i] >= WELL_PLACED.sunBelowDeg || sinAlt < sinUp) continue;
    const night = Math.floor((series.t[i] - first) / DAY);
    if (night >= 0 && night < 365) perNight[night] += STEP_MIN / 60;
  }
  const sum = new Array<number>(12).fill(0);
  const days = new Array<number>(12).fill(0);
  perNight.forEach((hrs, d) => {
    sum[MONTH_OF_NIGHT[d]] += hrs;
    days[MONTH_OF_NIGHT[d]]++;
  });
  const hours = sum.map((s, m) => s / days[m]);
  return { hours, window: windowOfMonthlyHours(hours), maxAlt: maxTrue + refractionDeg(maxTrue) };
}

// ── the sample of objects ───────────────────────────────────────────────────────────────

function pickObjects() {
  const sorted = [...catalogue].sort((a, b) => a.dec - b.dec);
  const ids = new Set<string>(FORCED.filter((id) => catalogue.some((o) => o.id === id)));
  const n = 24;
  for (let i = 0; i < n; i++) ids.add(sorted[Math.round((i * (sorted.length - 1)) / (n - 1))].id);
  return sorted.filter((o) => ids.has(o.id));
}

// ── refraction against Horizons' own model ───────────────────────────────────────────────

async function refractionCheck() {
  const site = SITES[0];
  const start = Date.UTC(2026, 2, 1);
  const stop = start + 28 * DAY;
  const air = parseSeries(await horizonsCached('refr-air', siteParams(site, start, stop)));
  const ref = parseSeries(
    await horizonsCached('refr-ref', { ...siteParams(site, start, stop), APPARENT: 'REFRACTED' }),
  );
  let worst = 0;
  let worstAt = 0;
  let n = 0;
  let worstAbove5 = 0;
  for (let i = 0; i < air.length; i++) {
    const a = air[i].el;
    if (a < -1 || a > 90) continue;
    const model = a + refractionDeg(a);
    const d = Math.abs(ref[i].el - model);
    n++;
    if (d > worst) {
      worst = d;
      worstAt = a;
    }
    if (a >= 5) worstAbove5 = Math.max(worstAbove5, d);
  }
  return { n, worstDeg: worst, atAltDeg: worstAt, worstAbove5Deg: worstAbove5 };
}

// ── USNO celestial navigation ───────────────────────────────────────────────────────────

const USNO_TIMES = ['2026-03-20', '2026-06-15', '2026-09-20', '2026-12-15'];

async function usnoCached(date: string, lat: number, lon: number) {
  const file = path.join(CACHE, `usno-${date}-${lat}-${lon}.json`);
  if (!process.env.SKY_REFRESH && fs.existsSync(file))
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  const url = `https://aa.usno.navy.mil/api/celnav?date=${date}&time=22:00:00&coords=${lat},${lon}`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const doc = await res.json();
  fs.writeFileSync(file, JSON.stringify(doc));
  return doc;
}

function starEq(s: { x: number; y: number; z: number }) {
  const ra = (((Math.atan2(s.y, s.x) / DEG) % 360) + 360) % 360;
  const dec = Math.asin(s.z / Math.hypot(s.x, s.y, s.z)) / DEG;
  return { ra, dec };
}

async function usnoCheck() {
  const rows: {
    site: string;
    date: string;
    star: string;
    usnoHc: number;
    oursAlt: number;
    usnoDec: number;
    oursDec: number;
    usnoRa: number;
    lst: number;
    oursRa: number;
  }[] = [];
  const unmatched = new Set<string>();
  for (const site of SITES) {
    for (const date of USNO_TIMES) {
      const doc = await usnoCached(date, site.lat, site.lon);
      const data: {
        object: string;
        almanac_data: { gha: number; dec?: number; hc?: number };
      }[] = doc.properties.data;
      const aries = data.find((d) => d.object.toUpperCase() === 'ARIES')?.almanac_data.gha;
      if (aries === undefined) throw new Error('no ARIES in the USNO reply');
      for (const d of data) {
        if (d.almanac_data.hc === undefined || d.almanac_data.dec === undefined) continue;
        const star = namedStars.find((s) => s.proper.toUpperCase() === d.object.toUpperCase());
        if (!star) {
          if (
            !['SUN', 'MOON', 'VENUS', 'JUPITER', 'MARS', 'SATURN'].includes(d.object.toUpperCase())
          )
            unmatched.add(d.object);
          continue;
        }
        const j2000 = starEq(star);
        const now = toDate(j2000.ra, j2000.dec);
        const lst = (((aries + site.lon) % 360) + 360) % 360;
        const h = (lst - now.ra) * DEG;
        const sinAlt =
          Math.sin(site.lat * DEG) * Math.sin(now.dec * DEG) +
          Math.cos(site.lat * DEG) * Math.cos(now.dec * DEG) * Math.cos(h);
        rows.push({
          site: site.name,
          date,
          star: star.proper,
          usnoHc: d.almanac_data.hc,
          oursAlt: Math.asin(sinAlt) / DEG,
          usnoDec: d.almanac_data.dec,
          oursDec: now.dec,
          usnoRa: (((aries - d.almanac_data.gha) % 360) + 360) % 360,
          oursRa: now.ra,
          lst,
        });
      }
    }
  }
  return { rows, unmatched: [...unmatched] };
}

// ── main ─────────────────────────────────────────────────────────────────────────────────

const cyc = (a: number, b: number) => Math.min((a - b + 12) % 12, (b - a + 12) % 12);
const fmtWin = (w: MonthWindow | null) =>
  w ? (w.from === w.to ? MONTHS[w.from] : `${MONTHS[w.from]}–${MONTHS[w.to]}`) : 'none';
const f1 = (x: number) => (Math.round(x * 10) / 10).toFixed(1);
const f2 = (x: number) => (Math.round(x * 100) / 100).toFixed(2);

async function main() {
  const objects = pickObjects();
  const series = new Map<string, Series>();
  for (const site of SITES) series.set(site.name, await loadSeries(site));

  const rows: {
    id: string;
    designation: string;
    ra: number;
    dec: number;
    site: string;
    lat: number;
    ref: { hours: number[]; window: MonthWindow | null; maxAlt: number };
    ours: { hours: number[]; window: MonthWindow | null; maxAlt: number };
    maxHoursDelta: number;
    edgeDelta: number;
    altDelta: number;
  }[] = [];
  for (const o of objects) {
    const eq = toDate(o.ra, o.dec);
    for (const site of SITES) {
      const ref = referenceRow(series.get(site.name)!, site, eq.ra, eq.dec);
      const hours = monthlyNightHours(eq.ra, eq.dec, site.lat, sun);
      const ours = {
        hours,
        window: windowOfMonthlyHours(hours),
        maxAlt: maxAltitude(eq.dec, site.lat),
      };
      const edgeDelta =
        ours.window && ref.window
          ? Math.max(cyc(ours.window.from, ref.window.from), cyc(ours.window.to, ref.window.to))
          : ours.window || ref.window
            ? 12
            : 0;
      rows.push({
        id: o.id,
        designation: o.designation,
        ra: o.ra,
        dec: o.dec,
        site: site.name,
        lat: site.lat,
        ref,
        ours,
        maxHoursDelta: Math.max(...hours.map((h, m) => Math.abs(h - ref.hours[m]))),
        edgeDelta,
        altDelta: ours.maxAlt - ref.maxAlt,
      });
    }
  }
  const refraction = await refractionCheck();
  const usno = await usnoCheck();

  const stat = (xs: number[]) => ({
    max: Math.max(...xs),
    mean: xs.reduce((a, b) => a + b, 0) / xs.length,
  });
  const sHours = stat(rows.map((r) => r.maxHoursDelta));
  const sAlt = stat(rows.map((r) => Math.abs(r.altDelta)));
  const sEdge = stat(rows.map((r) => r.edgeDelta));
  const usnoAlt = stat(usno.rows.map((r) => Math.abs(r.oursAlt - r.usnoHc)));
  const usnoDec = stat(usno.rows.map((r) => Math.abs(r.oursDec - r.usnoDec)));
  const usnoRa = stat(
    usno.rows.map(
      (r) => Math.abs(((r.oursRa - r.usnoRa + 540) % 360) - 180) * Math.cos(r.usnoDec * DEG),
    ),
  );
  const exact = rows.filter((r) => r.edgeDelta === 0).length;
  const edgeOne = rows.filter((r) => r.edgeDelta === 1).length;
  const edgeBad = rows.filter((r) => r.edgeDelta > 1);

  const snapshot = {
    _source:
      'JPL Horizons (observer tables of the Sun at four sites, 15 min, 2026) and USNO AA celnav API; rebuilt by scripts/check-sky-rows-ephemeris.ts',
    _retrieved: new Date().toISOString().slice(0, 10),
    _thresholds: WELL_PLACED,
    _horizons_query: { ...siteParams(SITES[0], FIRST, LAST), SITE_COORD: 'lon,lat,0 per site' },
    _usno_query: 'https://aa.usno.navy.mil/api/celnav?date=<date>&time=22:00:00&coords=<lat>,<lon>',
    sites: SITES,
    objects: objects.map((o) => ({ id: o.id, designation: o.designation, ra: o.ra, dec: o.dec })),
    rows: rows.map((r) => ({
      id: r.id,
      site: r.site,
      lat: r.lat,
      hours: r.ref.hours.map((h) => Math.round(h * 100) / 100),
      window: r.ref.window,
      maxAlt: Math.round(r.ref.maxAlt * 1000) / 1000,
    })),
    usno: usno.rows.map((r) => ({
      site: r.site,
      lat: SITES.find((s) => s.name === r.site)!.lat,
      date: r.date,
      star: r.star,
      hc: r.usnoHc,
      dec: r.usnoDec,
      ra: Math.round(r.usnoRa * 1e4) / 1e4,
      lst: Math.round(r.lst * 1e5) / 1e5,
    })),
  };
  fs.writeFileSync(
    SNAPSHOT,
    await prettier.format(JSON.stringify(snapshot), {
      parser: 'json',
      ...((await prettier.resolveConfig(SNAPSHOT)) ?? {}),
      printWidth: 100,
    }),
  );

  const md: string[] = [];
  md.push('# Sky rows: the deep-sky best months and altitudes against JPL Horizons and USNO', '');
  md.push(
    `Generated by \`npx tsx scripts/check-sky-rows-ephemeris.ts\` on ${snapshot._retrieved}. Rule under test: \`src/lib/universe/sky-finder.ts\` (UXD-049, plan L42). Pinned by \`src/lib/universe/sky-finder.test.ts\` from \`scripts/data-snapshots/sky-rows-reference.json\`.`,
    '',
  );
  md.push('## The rule', '');
  md.push(
    `- Source: JPL Horizons, the Sun's apparent RA / Dec at 00:00 UT of each day of 2026 (\`static/data/universe/sun-ephemeris.json\`, \`scripts/refresh-sun-ephemeris.mjs\`).`,
    `- A night scores the hours in which the object is at least ${WELL_PLACED.minAltDeg} degrees up (apparent altitude, refraction included) while the Sun is below ${WELL_PLACED.sunBelowDeg} degrees (astronomical darkness). A month is well placed when its nights average at least ${WELL_PLACED.minHours} such hours; the window is the run of well-placed months around the best one, none when no month qualifies.`,
    `- Highest altitude: 90 − |lat − dec of date| plus Saemundsson refraction (1010 hPa, 10 °C).`,
    `- Object position: the catalogue's J2000 RA / Dec precessed to mid-2026 (IAU 1976 angles): up to 0.41° in RA and 0.15° in Dec (nutation, aberration and proper motion, a few hundredths of a degree, are not applied).`,
    '',
  );
  md.push('## References', '');
  md.push(
    "1. **JPL Horizons observer tables** (`ssd.jpl.nasa.gov/api/horizons.api`, `EPHEM_TYPE=OBSERVER`, `CENTER=coord@399`, quantities 4 and 7): the Sun's apparent topocentric elevation and the local apparent sidereal time every 15 minutes from 2025-12-31 12:00 to 2026-12-31 12:00 UT at 52.5 N, 20 N and 34 S (longitude 0) and, to read the Sun's table 12 hours from the night it describes, at 52.5 N 180 E. Each object's dark hours above 20° are rebuilt from them night by night. Independent of the model under test: the topocentric Sun, the time of day and the sidereal time. Shared with it: the 20° / −18° / 4 h thresholds, the precession of the object, the refraction formula, the spherical-triangle altitude.",
    '2. **Horizons REFRACTED vs AIRLESS** Sun elevations (March 2026, 52.5 N): the refraction model.',
    '3. **USNO Astronomical Applications celestial-navigation API** (`aa.usno.navy.mil/api/celnav`): computed altitude (Hc) and the apparent Dec and GHA of the navigational stars at 22:00 UT on four dates and the four sites. Independent of the model: the position of date (precession, nutation, aberration), the sidereal time and the altitude. Only the stars of the named-star list that the API lists (above the horizon) can be compared.',
    '',
  );
  md.push('## Result', '');
  md.push(
    `- **Windows** (${rows.length} object × latitude rows, ${objects.length} objects, declination ${f1(objects[0].dec)}° to ${f1(objects[objects.length - 1].dec)}°): ${exact} identical, ${edgeOne} differ by one month at one edge, ${edgeBad.length} differ by more. Largest edge difference ${sEdge.max} month, mean ${f2(sEdge.mean)}.`,
    `- **Monthly dark hours above 20°**: largest difference in any month ${f2(sHours.max)} h, mean of the per-row largest ${f2(sHours.mean)} h.`,
    `- **Highest altitude**: largest difference ${f2(sAlt.max)}°, mean ${f2(sAlt.mean)}° (the 15-minute grid underestimates a flat maximum by under 0.1°).`,
    `- **Refraction against Horizons' own model**, ${refraction.n} Sun elevations from −1° to 90°: largest difference ${f2(refraction.worstDeg)}° (at ${f1(refraction.atAltDeg)}° altitude), ${f2(refraction.worstAbove5Deg)}° above 5° altitude.`,
    `- **USNO**, ${usno.rows.length} star × site × date comparisons: altitude largest difference ${f2(usnoAlt.max)}°, mean ${f2(usnoAlt.mean)}°; Dec of date largest ${f2(usnoDec.max)}°; RA of date largest ${f2(usnoRa.max)}° on the sky (RA difference times cos Dec; the raw RA difference of Polaris, 0.6°, is only its 89° declination magnifying a 0.01° position difference).`,
    '',
  );
  if (edgeBad.length) {
    md.push('Rows whose window differs by more than one month:', '');
    for (const r of edgeBad)
      md.push(
        `- ${r.designation} at ${r.site}: ours ${fmtWin(r.ours.window)}, reference ${fmtWin(r.ref.window)}`,
      );
    md.push('');
  }
  md.push('## What this does not show', '');
  md.push(
    "- No planetarium program was run, and no service gives the rise, transit and set of an arbitrary fixed RA / Dec: Horizons has no fixed-position target and the USNO API lists only the Sun, Moon, planets and 57 navigational stars. The deep-sky windows are therefore compared with a reference rebuilt from Horizons' Sun and sidereal time, not with a tool that knows the deep-sky object. The altitude of a position is checked against USNO on stars only.",
    "- The thresholds (20 degrees, Sun below −18, four hours a night on average) are the module's choice, shared by the reference; the comparison tests the ephemeris and the geometry, not whether the thresholds suit every reader.",
    '- The highest altitude is a closed form; the Horizons-built maximum agrees to the 15-minute grid by construction of the sidereal time, so the independent altitude check is the USNO Hc column.',
    "- Horizons' REFRACTED model agrees with the Saemundsson formula to better than 0.001 degree (the two give the same numbers, so this confirms the formula is the one Horizons applies, not that it is right for any sky); real refraction at the horizon varies by tens of arcminutes with weather.",
    '- Nutation, annual aberration and proper motion of the object are not applied (USNO shows the sum is under 0.03 degree in altitude); the Sun table is for 2026 and the pattern shifts by under a day over the leap cycle.',
    '- Moonlight, twilight brightness other than astronomical, horizon obstructions and light pollution are not modelled.',
    '',
  );
  md.push('## Windows and altitudes, ours against the Horizons-built reference', '');
  md.push(
    '| Object | Dec | Latitude | Window (ours) | Window (reference) | Edge Δ (months) | Max Δ hours | Max alt (ours) | Max alt (ref) | Δ alt |',
    '|---|---:|---:|---|---|---:|---:|---:|---:|---:|',
  );
  for (const r of rows) {
    md.push(
      `| ${r.designation} | ${f1(r.dec)}° | ${r.site} | ${fmtWin(r.ours.window)} | ${fmtWin(r.ref.window)} | ${r.edgeDelta} | ${f2(r.maxHoursDelta)} | ${f1(r.ours.maxAlt)}° | ${f1(r.ref.maxAlt)}° | ${f2(r.altDelta)}° |`,
    );
  }
  md.push('', '## USNO celestial-navigation comparison (stars)', '');
  md.push(
    '| Star | Site | Date 22:00 UT | Hc USNO | Alt ours | Δ alt | Dec USNO | Dec ours | RA USNO | RA ours |',
    '|---|---|---|---:|---:|---:|---:|---:|---:|---:|',
  );
  for (const r of usno.rows) {
    md.push(
      `| ${r.star} | ${r.site} | ${r.date} | ${f2(r.usnoHc)}° | ${f2(r.oursAlt)}° | ${f2(r.oursAlt - r.usnoHc)}° | ${f2(r.usnoDec)}° | ${f2(r.oursDec)}° | ${f2(r.usnoRa)}° | ${f2(r.oursRa)}° |`,
    );
  }
  if (usno.unmatched.length)
    md.push(
      '',
      `Navigational stars the API listed that are not in the 62-star named list (not compared): ${usno.unmatched.join(', ')}.`,
    );
  fs.writeFileSync(REPORT, md.join('\n') + '\n');
  console.log(
    JSON.stringify(
      {
        rows: rows.length,
        objects: objects.length,
        exact,
        edgeOne,
        edgeBad: edgeBad.length,
        sHours,
        sAlt,
        sEdge,
        refraction,
        usno: { n: usno.rows.length, usnoAlt, usnoDec, usnoRa, unmatched: usno.unmatched },
      },
      null,
      1,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
