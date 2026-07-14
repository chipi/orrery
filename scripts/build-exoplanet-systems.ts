// Build-time normaliser for the exoplanet-system catalog (/explore v2 Slice 2).
//
// Reads the vendored NASA Exoplanet Archive snapshot (refresh-exoplanet-archive.mjs)
// and emits `static/data/universe/exoplanet-systems.json`: one entry per host star,
// each carrying the host's placement (equatorial cartesian pc) + its planets on real
// Keplerian elements (period / semi-major axis / eccentricity). Hosts already in the
// curated named-star catalog reuse their HYG xyz; iconic hosts not in that set
// (TRAPPIST-1, 51 Peg, TOI-700) are placed from the archive's ra/dec/distance.
//
// Run: tsx scripts/build-exoplanet-systems.ts
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const snap = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'scripts/data-snapshots/exoplanet-archive.json'), 'utf8'),
);
const named = JSON.parse(
  fs.readFileSync(path.join(ROOT, 'static/data/universe/named-stars.json'), 'utf8'),
).stars as Array<Record<string, number | string>>;
const byHip = new Map(named.filter((s) => s.hip).map((s) => [`HIP ${s.hip}`, s]));

// Iconic hosts not in the curated 62 — stable id + display name.
const ICONIC: Record<string, { id: string; name: string }> = {
  '51 Peg': { id: '51-pegasi', name: '51 Pegasi' },
  'TRAPPIST-1': { id: 'trappist-1', name: 'TRAPPIST-1' },
  'TOI-700': { id: 'toi-700', name: 'TOI-700' },
  'Kepler-16': { id: 'kepler-16', name: 'Kepler-16' },
  'Kepler-16 (AB)': { id: 'kepler-16', name: 'Kepler-16' },
};

const D2R = Math.PI / 180;
const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' ? null : Number(v);
const round = (n: number, d: number) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

const groups = new Map<string, Array<Record<string, unknown>>>();
for (const r of snap.rows as Array<Record<string, unknown>>) {
  const h = r.hostname as string;
  if (!groups.has(h)) groups.set(h, []);
  groups.get(h)!.push(r);
}

function buildSystem(hostname: string, rows: Array<Record<string, unknown>>) {
  const r0 = rows[0];
  const star = byHip.get(r0.hip_name as string) as Record<string, number | string> | undefined;
  let hostId: string;
  let hostName: string;
  let sx: number;
  let sy: number;
  let sz: number;
  let spect: string;
  let dist: number;
  let bv: number | null;
  let con: string | null;
  if (star) {
    hostId = star.id as string;
    hostName = star.proper as string;
    sx = star.x as number;
    sy = star.y as number;
    sz = star.z as number;
    spect = (star.spect as string) ?? '';
    dist = star.dist_pc as number;
    bv = (star.bv as number) ?? null;
    con = (star.con as string) ?? null;
  } else {
    const ic = ICONIC[hostname] ?? { id: slug(hostname), name: hostname };
    hostId = ic.id;
    hostName = ic.name;
    dist = num(r0.sy_dist) ?? 0;
    const ra = (num(r0.ra) ?? 0) * D2R;
    const dec = (num(r0.dec) ?? 0) * D2R;
    sx = dist * Math.cos(dec) * Math.cos(ra);
    sy = dist * Math.cos(dec) * Math.sin(ra);
    sz = dist * Math.sin(dec);
    spect = ((r0.st_spectype as string) ?? '').trim();
    bv = null;
    con = null;
  }
  const planets = rows
    .map((r) => ({
      id: slug(r.pl_name as string),
      letter: (r.pl_letter as string) || (r.pl_name as string).split(' ').pop()!,
      name: r.pl_name as string,
      period_days: num(r.pl_orbper),
      a_au: num(r.pl_orbsmax),
      e: num(r.pl_orbeccen) ?? 0,
      radius_earth: num(r.pl_rade),
      mass_earth: num(r.pl_bmasse),
      disc_year: num(r.disc_year),
      disc_method: (r.discoverymethod as string) || null,
    }))
    .filter((p) => p.a_au != null && p.period_days != null)
    .sort((a, b) => a.a_au! - b.a_au!);
  if (!planets.length) return null;
  return {
    hostId,
    hip: (star?.hip as number) ?? null,
    star: {
      name: hostName,
      spect,
      dist_pc: round(dist, 4),
      bv,
      con,
      x: round(sx, 4),
      y: round(sy, 4),
      z: round(sz, 4),
      iconic: !star,
    },
    planets,
  };
}

const systems = [...groups.entries()]
  .map(([h, rows]) => buildSystem(h, rows))
  .filter((s): s is NonNullable<typeof s> => s !== null)
  .sort((a, b) => a.star.dist_pc - b.star.dist_pc);

const out = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  script_version: 'build-exoplanet-systems@1.0.0',
  source: snap.source,
  source_url: snap.source_url,
  count: systems.length,
  planet_count: systems.reduce((n, s) => n + s.planets.length, 0),
  systems,
};
fs.writeFileSync(
  path.join(ROOT, 'static/data/universe/exoplanet-systems.json'),
  JSON.stringify(out, null, 2) + '\n',
);
console.log(
  `[exo] ${systems.length} systems, ${out.planet_count} planets → static/data/universe/exoplanet-systems.json`,
);
for (const s of systems)
  console.log(
    `  ${s.hostId.padEnd(18)} ${String(s.planets.length).padStart(2)}p  ${(s.star.spect || '?').padEnd(9)} ${s.star.dist_pc}pc${s.star.iconic ? '  [iconic]' : ''}`,
  );
