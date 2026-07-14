/**
 * Refresh the vendored NASA Exoplanet Archive snapshot (/explore v2 Slice 2).
 *
 * Queries the Archive TAP service (pscomppars — one row per planet, composite
 * best-available parameters) for confirmed planets whose host is one of our 62
 * curated named stars (matched by HIP) OR one of the iconic milestone systems
 * (TRAPPIST-1, 51 Peg, TOI-700). Writes the raw rows to a committed snapshot so
 * builds are reproducible + offline; `build-exoplanet-systems.ts` normalises it.
 *
 * On-demand only. Run: node scripts/refresh-exoplanet-archive.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const HIPS = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'static/data/universe/named-stars.json'), 'utf8'),
)
  .stars.filter((s) => s.hip)
  .map((s) => `HIP ${s.hip}`);
const ICONIC = ['TRAPPIST-1', '51 Peg', 'TOI-700', 'Kepler-16', 'Kepler-16 (AB)'];

const cols = [
  'hostname',
  'hip_name',
  'pl_name',
  'pl_letter',
  'pl_orbper',
  'pl_orbsmax',
  'pl_orbeccen',
  'pl_rade',
  'pl_bmasse',
  'disc_year',
  'discoverymethod',
  'sy_dist',
  'ra',
  'dec',
  'st_spectype',
].join(',');
const quote = (a) => a.map((s) => `'${s.replace(/'/g, "''")}'`).join(',');
const adql =
  `SELECT ${cols} FROM pscomppars ` +
  `WHERE hip_name IN (${quote(HIPS)}) OR hostname IN (${quote(ICONIC)}) ` +
  `ORDER BY hostname, pl_orbsmax`;

const url = 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync';
console.log(`[exo] querying pscomppars for ${HIPS.length} HIP hosts + ${ICONIC.length} iconic…`);
const res = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ query: adql, format: 'json' }),
});
if (!res.ok) {
  console.error(`[exo] HTTP ${res.status}: ${(await res.text()).slice(0, 400)}`);
  process.exit(1);
}
const rows = await res.json();
const out = {
  source: 'NASA Exoplanet Archive · pscomppars (Composite Planet Parameters)',
  source_url: 'https://exoplanetarchive.ipac.caltech.edu/',
  query: adql,
  row_count: rows.length,
  rows,
};
const dst = path.join(ROOT, 'scripts/data-snapshots/exoplanet-archive.json');
fs.writeFileSync(dst, JSON.stringify(out, null, 2) + '\n');
const hosts = [...new Set(rows.map((r) => r.hostname))].sort();
console.log(
  `[exo] ${rows.length} planets across ${hosts.length} hosts → ${path.relative(ROOT, dst)}`,
);
console.log('[exo] hosts:', hosts.join(', '));
