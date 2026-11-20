/**
 * Write a Moon mission's flight.cislunar_profile.waypoints_km from a published ephemeris
 * (JPL Horizons), as source_tier tier_2_published. First user: Artemis I (Horizons -1023,
 * backlog F11): the analytic model has no distant-retrograde-orbit arrival, so its path was a
 * schematic chord.
 *
 *   npx tsx scripts/cislunar/ingest-horizons-waypoints.ts static/data/missions/moon/artemis1.json \
 *     --target=-1023 --launch=2022-11-16T06:47:44Z --start="2022-11-16 08:50" --stop="2022-12-11 17:20" \
 *     [--cache=<dir>] [--dry-run]
 *
 * Horizons: geocentric (500@399) ICRF state vectors of the craft and the Moon (301) on the same
 * epochs. Hourly over the flight; the two closest lunar approaches are re-fetched at 10 min.
 * Kept: every 10 min within 2 h of a closest approach, hourly within 12 h, every 6 h elsewhere,
 * plus the MET 0 parking-orbit anchor the other Moon missions use; at most 200 waypoints (the
 * validator's cap). Each sample goes through toSchematicFrame (horizons-frame.ts).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { toSchematicFrame, scaledMoonDistance, type V3 } from './horizons-frame';

type Row = { jd: number; t: number; p: V3; v: V3 };

const args = Object.fromEntries(
  process.argv.slice(3).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=');
    return [k, v.join('=') || 'true'];
  }),
);
const missionPath = process.argv[2];
if (!missionPath || !args.target || !args.launch || !args.start || !args.stop) {
  console.error(
    'usage: ingest-horizons-waypoints.ts <mission.json> --target=<id> --launch=<ISO> --start=<UTC> --stop=<UTC> [--cache=<dir>] [--dry-run]',
  );
  process.exit(2);
}
const launchMs = Date.parse(args.launch);
const cache = args.cache;

async function horizons(obj: string, start: string, stop: string, step: string): Promise<Row[]> {
  const key = `${obj}_${start}_${stop}_${step}`.replace(/[^\w.-]+/g, '_');
  const file = cache ? join(cache, `${key}.txt`) : '';
  let text: string;
  if (file && existsSync(file)) text = readFileSync(file, 'utf8');
  else {
    const q = new URLSearchParams({
      format: 'text',
      COMMAND: `'${obj}'`,
      OBJ_DATA: 'NO',
      MAKE_EPHEM: 'YES',
      EPHEM_TYPE: 'VECTORS',
      CENTER: "'500@399'",
      START_TIME: `'${start}'`,
      STOP_TIME: `'${stop}'`,
      STEP_SIZE: `'${step}'`,
      VEC_TABLE: "'2'",
      REF_PLANE: "'FRAME'",
      REF_SYSTEM: "'ICRF'",
      OUT_UNITS: "'KM-S'",
      CSV_FORMAT: "'YES'",
      VEC_LABELS: "'NO'",
    });
    // Three tries: a parallel pair of requests failed once mid-run (2026-11-17), the rerun passed.
    let last: unknown;
    let got: string | undefined;
    for (let attempt = 1; attempt <= 3 && got === undefined; attempt++) {
      try {
        const res = await fetch(`https://ssd.jpl.nasa.gov/api/horizons.api?${q}`, {
          headers: { 'user-agent': 'orrery (github.com/chipi/orrery)' },
        });
        if (!res.ok) throw new Error(`Horizons ${obj}: HTTP ${res.status}`);
        got = await res.text();
      } catch (e) {
        last = e;
        await new Promise((r) => setTimeout(r, attempt * 2000));
      }
    }
    if (got === undefined) throw last;
    text = got;
    if (file) {
      mkdirSync(cache, { recursive: true });
      writeFileSync(file, text);
    }
  }
  const body = text.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!body) throw new Error(`Horizons ${obj}: no ephemeris block\n${text.slice(0, 600)}`);
  return body
    .trim()
    .split('\n')
    .map((line) => {
      const c = line.split(',').map((s) => s.trim());
      const jd = Number(c[0]);
      const [x, y, z, vx, vy, vz] = c.slice(2, 8).map(Number);
      return { jd, t: (jd - 2440587.5) * 86400000, p: { x, y, z }, v: { x: vx, y: vy, z: vz } };
    });
}

const utc = (ms: number) => new Date(ms).toISOString().slice(0, 16).replace('T', ' ');
const metDays = (ms: number) => (ms - launchMs) / 86400000;

async function pairs(start: string, stop: string, step: string) {
  const [craft, moon] = await Promise.all([
    horizons(args.target, start, stop, step),
    horizons('301', start, stop, step),
  ]);
  if (craft.length !== moon.length) throw new Error('craft and Moon epochs differ');
  return craft.map((c, i) => ({ t: c.t, craft: c.p, moon: moon[i].p, moonVel: moon[i].v }));
}

const hourly = await pairs(args.start, args.stop, '1h');
// Closest lunar approaches: local minima of the craft-Moon distance under 50,000 km.
const d = hourly.map((s) => scaledMoonDistance(s.craft, s.moon));
const ca = hourly.filter(
  (_, i) => i > 0 && i < d.length - 1 && d[i] < d[i - 1] && d[i] <= d[i + 1] && d[i] < 50_000,
);
const fine = (
  await Promise.all(ca.map((s) => pairs(utc(s.t - 2 * 3600e3), utc(s.t + 2 * 3600e3), '10m')))
).flat();
const caTimes = fine.length
  ? ca.map((s) => {
      const near = fine.filter((f) => Math.abs(f.t - s.t) <= 2 * 3600e3);
      return near.reduce((a, b) =>
        scaledMoonDistance(a.craft, a.moon) < scaledMoonDistance(b.craft, b.moon) ? a : b,
      ).t;
    })
  : [];

const all = [...hourly, ...fine].sort((a, b) => a.t - b.t);
const kept: typeof all = [];
let lastSix = -Infinity;
for (const s of all) {
  if (kept.length && Math.abs(s.t - kept[kept.length - 1].t) < 60e3) continue;
  const toCa = Math.min(...caTimes.map((c) => Math.abs(s.t - c)), Infinity);
  const onHour =
    Math.abs(((s.t / 3600e3) % 1) - 0) < 1e-6 || Math.abs(((s.t / 3600e3) % 1) - 1) < 1e-6;
  const keep =
    toCa <= 2 * 3600e3 ||
    (toCa <= 12 * 3600e3 && onHour) ||
    s.t - lastSix >= 6 * 3600e3 - 60e3 ||
    s === all[all.length - 1];
  if (!keep) continue;
  if (toCa > 12 * 3600e3) lastSix = s.t;
  kept.push(s);
}

const waypoints: Array<[number, number, number, number]> = [[0, 6569, 0, 0]];
for (const s of kept) {
  const met = metDays(s.t);
  const w = toSchematicFrame(s.craft, s.moon, s.moonVel, met);
  waypoints.push([Number(met.toFixed(4)), Math.round(w.x), Math.round(w.y), Math.round(w.z)]);
}
if (waypoints.length > 200) throw new Error(`${waypoints.length} waypoints, over the 200 cap`);

const closest = Math.min(...kept.map((s) => scaledMoonDistance(s.craft, s.moon)));
const far = Math.max(...kept.map((s) => Math.hypot(s.craft.x, s.craft.y, s.craft.z)));
console.log(
  `${waypoints.length} waypoints, MET ${waypoints[1][0]}..${waypoints[waypoints.length - 1][0]} d; ` +
    `closest approaches ${caTimes.map((t) => `${utc(t)} (MET ${metDays(t).toFixed(3)})`).join(', ')}; ` +
    `closest sampled ${Math.round(closest)} km from the Moon centre (scaled); farthest from Earth ${Math.round(far)} km (unscaled)`,
);

if (args['dry-run'] === 'true') process.exit(0);
const mission = JSON.parse(readFileSync(missionPath, 'utf8'));
const prof = (mission.flight.cislunar_profile ??= {});
prof.source_tier = 'tier_2_published';
prof.waypoints_km = waypoints;
prof.waypoints_source = `JPL Horizons ${args.target}: geocentric ICRF state vectors of the craft and the Moon, ${args.start} to ${args.stop} UTC, retrieved ${new Date().toISOString().slice(0, 10)}; mapped through the Earth-Moon rotating frame onto the schematic Moon (scripts/cislunar/ingest-horizons-waypoints.ts)`;
writeFileSync(missionPath, JSON.stringify(mission, null, 2) + '\n');
console.log(`wrote ${missionPath}`);
