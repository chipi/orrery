/**
 * Sun ephemeris refresh (L42, the deep-sky IN THE SKY tab's best months and altitudes).
 *
 * Asks JPL Horizons (NASA/JPL Solar System Dynamics, DE441) for the Sun's apparent right
 * ascension and declination (true equator and equinox of date, geocentric) at 00:00 UT on
 * every day of 2026, and vendors it as static/data/universe/sun-ephemeris.json with the query,
 * the URL and the retrieval date. The Sun is the only moving part of the rule: which nights an
 * object stands high in the dark sky follows from where the Sun is.
 *
 * Same reproducible pattern as the deep-sky snapshot: run on demand, commit the JSON, so the
 * build and the reader never depend on a live network fetch.
 *
 *   Run: node scripts/refresh-sun-ephemeris.mjs
 *
 * The rule built on it is src/lib/universe/sky-finder.ts; the comparison with an independent
 * reference is scripts/check-sky-rows-ephemeris.mjs (docs/wip/2026-11-15-sky-rows-ephemeris-check.md).
 */
import fs from 'node:fs';
import path from 'node:path';
import * as prettier from 'prettier';
import { fetchHorizons, parseHorizonsCsv } from './lib/horizons.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'static', 'data', 'universe', 'sun-ephemeris.json');

const YEAR = 2026;
const QUERY = {
  COMMAND: '10',
  OBJ_DATA: 'NO',
  MAKE_EPHEM: 'YES',
  EPHEM_TYPE: 'OBSERVER',
  CENTER: '500@399',
  START_TIME: `${YEAR}-01-01`,
  STOP_TIME: `${YEAR}-12-31`,
  STEP_SIZE: '1d',
  QUANTITIES: '2',
  ANG_FORMAT: 'DEG',
  CSV_FORMAT: 'YES',
};

async function main() {
  const { url, text } = await fetchHorizons(QUERY);
  const target = /Target body name: (.*?)\s{2,}/.exec(text)?.[1];
  const model = /Target body name: .*\{source: (.*?)\}/.exec(text)?.[1];
  if (!/^Sun \(10\)/.test(target ?? '')) throw new Error(`unexpected target: ${target}`);
  const rows = parseHorizonsCsv(text);
  const expected = YEAR % 4 === 0 ? 366 : 365;
  if (rows.length !== expected) throw new Error(`${rows.length} rows, expected ${expected}`);
  const ra = [];
  const dec = [];
  rows.forEach((r, i) => {
    const day = new Date(Date.UTC(YEAR, 0, 1 + i));
    const stamp = `${YEAR}-${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][day.getUTCMonth()]}-${String(day.getUTCDate()).padStart(2, '0')} 00:00`;
    if (r[0] !== stamp) throw new Error(`row ${i}: ${r[0]} is not ${stamp}`);
    ra.push(Number(r[3]));
    dec.push(Number(r[4]));
  });
  if (![...ra, ...dec].every(Number.isFinite)) throw new Error('a non-numeric RA or Dec');

  const doc = {
    _source: `NASA/JPL Horizons (Solar System Dynamics Group, ${model ?? 'DE441'}), ssd.jpl.nasa.gov/horizons/`,
    _note:
      "The Sun's apparent right ascension and declination (degrees, true equator and equinox of date, geocentric, no refraction) at 00:00 UT on each day of the year from 2026-01-01. Vendored for the deep-sky IN THE SKY tab's best months (src/lib/universe/sky-finder.ts, UXD-049). The Sun's position repeats within a quarter of a day over the four-year leap cycle, so the 2026 table serves any year. Refresh: node scripts/refresh-sun-ephemeris.mjs",
    _retrieved: new Date().toISOString().slice(0, 10),
    _query_url: url,
    _query: QUERY,
    year: YEAR,
    first_day_utc: `${YEAR}-01-01`,
    step: '1 d',
    count: ra.length,
    ra_deg: ra,
    dec_deg: dec,
  };
  const formatted = await prettier.format(JSON.stringify(doc), {
    parser: 'json',
    ...((await prettier.resolveConfig(OUT)) ?? {}),
    printWidth: 100,
  });
  fs.writeFileSync(OUT, formatted);
  console.log(`✓ wrote ${ra.length} days → ${path.relative(ROOT, OUT)} (${model})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
