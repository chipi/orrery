/**
 * Deep-sky catalogue refresh (/explore v2 Slice 4).
 *
 * Pulls the OpenNGC catalogue (Mattia Verga, CC-BY-SA-4.0) and distils a
 * *vendored snapshot* of the objects /explore needs: the full Messier set
 * (M1–M110) plus the specific NGC/IC designations used by the curated
 * `static/data/deep-sky.json` gallery. A handful of famous gallery objects
 * have no NGC/IC entry (Cartwheel, Tycho's SNR, the Horsehead, Cas A …);
 * those carry explicit J2000 positions from their standard catalogue entries.
 *
 * Same reproducible pattern as the S2 exoplanet snapshot: run on demand,
 * commit the JSON, so the build never depends on a live network fetch.
 *
 *   Run: node scripts/refresh-messier-catalog.mjs
 *   Offline: OPENNGC_CSV=/path/to/NGC.csv node scripts/refresh-messier-catalog.mjs
 *
 * Catalogue layer (GitHub #658): after the OpenNGC pass every object is enriched with sourced
 * values — a `catalogue` map of { value, source, bibcode, record_url, note? } per field and
 * `records` (SIMBAD / NED object pages). Single-band V magnitudes (Harris V_t for globular
 * clusters, SIMBAD V, then OpenNGC V-Mag; never B), distances from Baumgardt & Vasiliev 2021,
 * Hunt & Reffert 2023, Cosmicflows-4 or SIMBAD. Which catalogue answers what, and why:
 * scripts/lib/deep-sky-catalogues.mjs and docs/wip/2026-11-12-catalogue-layer-brief.md.
 * Downloaded tables are cached under `~/.cache/orrery`; CATALOGUE_REFRESH=1 refetches them.
 *
 * Output: scripts/data-snapshots/messier-catalog.json
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as prettier from 'prettier';
import {
  BAUMGARDT_TABLE,
  HARRIS_FILE,
  fetchMcConnachie,
  fetchText,
  nedLookup,
  parseBaumgardt,
  parseHarris,
  simbadIdentCandidates,
  simbadQuery,
  vizierQuery,
  ongcToDesignation,
} from './lib/catalogue-sources.mjs';
import { enrichObject } from './lib/deep-sky-catalogues.mjs';
import { applyDistanceOverride } from './lib/deep-sky-distance-overrides.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'scripts', 'data-snapshots', 'messier-catalog.json');
const OPENNGC_URL =
  'https://raw.githubusercontent.com/mattiaverga/OpenNGC/master/database_files/NGC.csv';

// Named gallery objects with no NGC/IC catalogue entry → explicit J2000
// positions from their standard catalogue designations. These are canonical
// coordinates (SIMBAD/NED), not estimates.
// size = approximate major-axis angular size in arcmin (for glint sizing).
const EXPLICIT = [
  {
    designation: 'ESO 350-40',
    simbadId: 'NAME Cartwheel Galaxy',
    kind: 'galaxy',
    name: 'Cartwheel Galaxy',
    ra: 9.42542,
    dec: -33.71639,
    type: 'G',
    con: 'Scl',
    size: 1.1,
  }, // 00:37:42.1 -33:42:59
  {
    designation: 'Gum 29',
    simbadId: 'Cl Westerlund    2',
    name: 'Westerlund 2 (Gum 29)',
    ra: 155.9917,
    dec: -57.7636,
    type: 'OCl+N',
    con: 'Car',
    size: 8,
  }, // 10:23:58 -57:45:49
  {
    designation: 'Cygnus Loop',
    simbadId: 'NAME Cygnus Loop',
    name: 'Cygnus Loop / Veil Nebula',
    ra: 312.75,
    dec: 30.7167,
    type: 'SNR',
    con: 'Cyg',
    size: 180,
  }, // 20:51:00 +30:43
  {
    designation: 'SN 1572',
    simbadId: 'SN 1572',
    name: "Tycho's Supernova Remnant",
    ra: 6.325,
    dec: 64.1447,
    type: 'SNR',
    con: 'Cas',
    size: 8,
  }, // 00:25:18 +64:08:41
  {
    designation: 'Perseus Cluster',
    simbadId: 'ACO   426',
    kind: 'galaxy-cluster',
    name: 'Perseus Cluster (Abell 426)',
    ra: 49.9508,
    dec: 41.5117,
    type: 'GCl',
    con: 'Per',
    size: 60,
  }, // 03:19:48 +41:30:42
  {
    designation: 'Barnard 33',
    simbadId: 'Barnard  33',
    name: 'Horsehead Nebula (Barnard 33)',
    ra: 85.2458,
    dec: -2.4589,
    type: 'DrkN',
    con: 'Ori',
    size: 8,
  }, // 05:40:59 -02:27:32
  {
    designation: 'Serpens Nebula',
    simbadId: 'NAME Serpens Nebula',
    name: 'Serpens Nebula',
    ra: 277.4958,
    dec: 1.25,
    type: 'Neb',
    con: 'Ser',
    size: 15,
  }, // 18:29:59 +01:15
  {
    designation: 'Cas A',
    simbadId: 'NAME Cas A',
    name: 'Cassiopeia A',
    ra: 350.85,
    dec: 58.815,
    type: 'SNR',
    con: 'Cas',
    size: 5,
  }, // 23:23:24 +58:48:54
  {
    designation: 'Rho Ophiuchi',
    simbadId: 'NAME rho Oph Cloud',
    name: 'Rho Ophiuchi cloud complex',
    ra: 246.3958,
    dec: -23.4472,
    type: 'Neb',
    con: 'Oph',
    size: 240,
  }, // 16:25:35 -23:26:50
  {
    designation: 'WR 124',
    simbadId: 'WR 124',
    kind: 'star',
    name: 'WR 124 / M1-67',
    ra: 287.8792,
    dec: 16.8606,
    type: 'WR*',
    con: 'Sge',
    size: 2,
  }, // 19:11:31 +16:51:38
  {
    designation: 'Hen 2-104',
    simbadId: 'Hen 2-104',
    name: 'Southern Crab (Hen 2-104)',
    ra: 212.9667,
    dec: -51.44,
    type: 'PN',
    con: 'Cen',
    size: 2,
  }, // 14:11:52 -51:26:24
  {
    designation: 'V838 Mon',
    simbadId: 'V* V838 Mon',
    kind: 'star',
    name: 'V838 Monocerotis',
    ra: 106.0167,
    dec: -3.8419,
    type: 'V*',
    con: 'Mon',
    size: 1,
  }, // 07:04:04 -03:50:31
];

// Local Group members take their own McConnachie 2012 distance; clusters and nebulae inside
// the Magellanic Clouds and M33 take the host galaxy's. Names as McConnachie writes them.
const LG_MEMBER = { M31: 'Andromeda', M32: 'M32', M33: 'Triangulum', M110: 'NGC 205' };
const LG_HOST = {
  '30 Doradus': 'LMC',
  'NGC 2014 / 2020': 'LMC',
  'NGC 346': 'SMC',
  'NGC 602': 'SMC',
  'NGC 604': 'Triangulum',
};

// Gallery designations that are NGC/IC objects but written non-canonically,
// mapped to the OpenNGC `Name` key we should look up.
const NGC_ALIAS = {
  'HCG 92': 'NGC7318', // Stephan's Quintet (NGC 7318 core)
  '30 Doradus': 'NGC2070', // Tarantula Nebula
  'Carina Nebula': 'NGC3372',
  'NGC 4038/4039': 'NGC4038', // Antennae (NGC 4038 primary)
  'NGC 2014 / 2020': 'NGC2014',
  'IC 342': 'IC0342',
};

function parseHms(ra, dec) {
  const [h, m, s] = ra.split(':').map(Number);
  const raDeg = (h + m / 60 + s / 3600) * 15;
  const neg = dec.trim().startsWith('-');
  const [d, dm, ds] = dec.replace('+', '').replace('-', '').split(':').map(Number);
  const decDeg = (neg ? -1 : 1) * (d + dm / 60 + ds / 3600);
  return { ra: raDeg, dec: decDeg };
}

const CACHE_DIR = path.join(
  process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), '.cache'),
  'orrery',
);

/** A downloaded table, reused across runs from a per-user cache (not os.tmpdir()). */
async function cached(file, fetcher) {
  const f = path.join(CACHE_DIR, file);
  if (!process.env.CATALOGUE_REFRESH) {
    try {
      const text = fs.readFileSync(f, 'utf8');
      console.log(`Using cached ${f}`);
      return text;
    } catch (e) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
  console.log(`Fetching ${file} …`);
  const text = await fetcher();
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(f, text);
  return text;
}

async function loadCsv() {
  const local = process.env.OPENNGC_CSV;
  if (local && fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
  return cached('openngc-ngc.csv', () => fetchText(OPENNGC_URL));
}

const chunk = (a, n) =>
  Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const sqlList = (a) => a.map((x) => `'${String(x).replace(/'/g, "''")}'`).join(',');

/** Hunt & Reffert 2023 / Cantat-Gaudin 2020 whole tables (a few thousand rows each). */
async function loadClusterTables() {
  const hrText = await cached('hunt-reffert-2023.json', async () => {
    const t = await vizierQuery('J/A+A/673/A114/clusters', [
      ['-out.max', 'unlimited'],
      ['-out', 'Name'],
      ['-out', 'Type'],
      ['-out', '_RA.icrs'],
      ['-out', '_DE.icrs'],
      ['-out', 'dist50'],
    ]);
    return JSON.stringify(t.rows);
  });
  const cgText = await cached('cantat-gaudin-2020.json', async () => {
    const t = await vizierQuery('J/A+A/640/A1/table1', [
      ['-out.max', 'unlimited'],
      ['-out', 'Cluster'],
      ['-out', '_RA.icrs'],
      ['-out', '_DE.icrs'],
      ['-out', 'DistPc'],
    ]);
    return JSON.stringify(t.rows);
  });
  const hr = JSON.parse(hrText).map((r) => ({
    name: r.Name,
    type: r.Type,
    ra: Number(r['_RA.icrs']),
    dec: Number(r['_DE.icrs']),
    distPc: r.dist50 === '' ? NaN : Number(r.dist50),
  }));
  const cg = JSON.parse(cgText).map((r) => ({
    name: r.Cluster,
    type: 'o',
    ra: Number(r['_RA.icrs']),
    dec: Number(r['_DE.icrs']),
    distPc: r.DistPc === '' ? NaN : Number(r.DistPc),
  }));
  return { hr, cg };
}

/** SIMBAD: resolve every object's identifier, then its V fluxes, distances and ICRS position. */
async function loadSimbad(objects) {
  const wanted = objects.map((o) => ({
    o,
    ids: o.simbadId
      ? [o.simbadId]
      : simbadIdentCandidates(o.designation).concat(
          o.ongc ? simbadIdentCandidates(ongcToDesignation(o.ongc)) : [],
        ),
  }));
  const idToOid = new Map();
  for (const part of chunk([...new Set(wanted.flatMap((w) => w.ids))], 150)) {
    const rows = await simbadQuery(`SELECT id, oidref FROM ident WHERE id IN (${sqlList(part)})`);
    for (const r of rows) idToOid.set(r.id.toUpperCase(), Number(r.oidref));
  }
  const oidOf = new Map();
  for (const w of wanted) {
    const id = w.ids.find((i) => idToOid.has(i.toUpperCase()));
    if (id) oidOf.set(w.o.designation, idToOid.get(id.toUpperCase()));
  }
  const oids = [...new Set(oidOf.values())];
  const basic = new Map();
  const vRows = new Map();
  const distRows = new Map();
  for (const part of chunk(oids, 120)) {
    const list = part.join(',');
    for (const r of await simbadQuery(
      `SELECT oid, main_id, ra, dec FROM basic WHERE oid IN (${list})`,
    ))
      basic.set(Number(r.oid), r);
    for (const r of await simbadQuery(
      `SELECT oidref, filter, flux, bibcode FROM flux WHERE filter='V' AND oidref IN (${list})`,
    ))
      (vRows.get(Number(r.oidref)) ?? vRows.set(Number(r.oidref), []).get(Number(r.oidref))).push(
        r,
      );
    for (const r of await simbadQuery(
      `SELECT oidref, dist, unit, method, bibcode FROM mesdistance WHERE oidref IN (${list})`,
    ))
      (
        distRows.get(Number(r.oidref)) ?? distRows.set(Number(r.oidref), []).get(Number(r.oidref))
      ).push(r);
  }
  const out = new Map();
  for (const [designation, oid] of oidOf) {
    const b = basic.get(oid);
    if (!b) continue;
    out.set(designation, {
      oid,
      mainId: b.main_id,
      ra: Number(b.ra),
      dec: Number(b.dec),
      vRows: vRows.get(oid) ?? [],
      distRows: distRows.get(oid) ?? [],
    });
  }
  return out;
}

/** Cosmicflows-4: nearest galaxy within 30 arcsec of each galaxy's position. */
async function loadCf4(galaxies) {
  const out = new Map();
  for (const o of galaxies) {
    // The CfA mirror sometimes answers a cone with an empty table (a galaxy Cosmicflows-4 does
    // list came back empty in one run and found in the next), so an empty answer is asked up to
    // three times before it counts as "not in the catalogue".
    let t = { rows: [] };
    for (let attempt = 0; attempt < 3 && t.rows.length === 0; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, 700));
      t = await vizierQuery('J/ApJ/944/94/table2', [
        ['-c', `${o.ra} ${o.dec >= 0 ? '+' : ''}${o.dec}`],
        ['-c.rs', '30'],
        ['-out', 'PGC'],
        ['-out', 'DM'],
        ['-out', 'e_DM'],
        ['-out', '_r'],
      ]);
    }
    const rows = t.rows
      .map((r) => ({
        pgc: r.PGC,
        dm: Number(r.DM),
        eDm: Number(r.e_DM) || 0,
        sepArcsec: Number(r._r),
      }))
      .filter((r) => Number.isFinite(r.dm))
      .sort((a, b) => a.sepArcsec - b.sepArcsec);
    out.set(o.designation, rows[0] ?? null);
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

/** NED's preferred name per extragalactic object, for the record link. */
async function loadNed(objects) {
  const out = new Map();
  for (const o of objects) {
    const n = await nedLookup(o.designation === 'NGC 4038/4039' ? 'NGC 4038' : o.designation);
    out.set(o.designation, n && n.type !== 'Q' ? { name: n.name } : null);
    await new Promise((r) => setTimeout(r, 250));
  }
  return out;
}

async function main() {
  const csv = await loadCsv();
  const lines = csv.split('\n').filter((l) => l.trim());
  const header = lines[0].split(';');
  const col = (n) => header.indexOf(n);
  const cName = col('Name'),
    cType = col('Type'),
    cRA = col('RA'),
    cDec = col('Dec'),
    cCon = col('Const'),
    cVMag = col('V-Mag'),
    cMajAx = col('MajAx'),
    cM = col('M'),
    cCommon = col('Common names');

  // Index every row by Name for alias lookups.
  const byName = new Map();
  const messier = new Map(); // M-number → row

  for (let i = 1; i < lines.length; i++) {
    const f = lines[i].split(';');
    const name = f[cName];
    if (!name || !f[cRA] || !f[cDec]) continue;
    const pos = parseHms(f[cRA], f[cDec]);
    const rec = {
      name,
      ongc: name,
      ra: +pos.ra.toFixed(5),
      dec: +pos.dec.toFixed(5),
      type: f[cType] || '',
      con: f[cCon] || '',
      vmag: f[cVMag] ? +f[cVMag] : null, // V band only: B-Mag is never substituted
      size: f[cMajAx] ? +(+f[cMajAx]).toFixed(2) : null, // major axis, arcmin
      common: f[cCommon] || '',
    };
    byName.set(name, rec);
    const mnum = f[cM];
    if (mnum && !messier.has(mnum)) messier.set(mnum, rec);
  }

  const objects = [];
  const seen = new Set();
  const push = (designation, rec) => {
    if (!rec || seen.has(designation)) return;
    seen.add(designation);
    objects.push({ designation, ...rec });
  };

  // 1. Full Messier set as M1…M110.
  for (const [mnum, rec] of [...messier.entries()].sort((a, b) => +a[0] - +b[0])) {
    push(`M${+mnum}`, rec);
  }

  // 2. Aliased NGC/IC gallery objects.
  for (const [designation, key] of Object.entries(NGC_ALIAS)) {
    const rec = byName.get(key);
    if (!rec) {
      console.warn(`⚠ alias miss: ${designation} → ${key}`);
      continue;
    }
    push(designation, rec);
  }

  // 3. Plain NGC/IC gallery designations (e.g. "NGC 3324" → NGC3324).
  const gallery = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'static', 'data', 'deep-sky.json'), 'utf8'),
  );
  const galleryRows = Array.isArray(gallery)
    ? gallery
    : gallery.images || Object.values(gallery).find(Array.isArray);
  for (const row of galleryRows) {
    const d = (row.designation || '').trim();
    const m = /^(NGC|IC)\s+(\d+)/.exec(d);
    if (!m) continue;
    const key = m[1] + String(m[2]).padStart(4, '0');
    const rec = byName.get(key);
    if (rec) push(d, rec);
  }

  // 4. Explicit-coordinate famous objects with no NGC/IC entry.
  for (const e of EXPLICIT) {
    push(e.designation, {
      name: e.name,
      ra: e.ra,
      dec: e.dec,
      type: e.type,
      con: e.con,
      vmag: null,
      size: e.size ?? null,
      common: e.name,
      explicit: true,
      simbadId: e.simbadId,
      kind: e.kind,
    });
  }

  // 5. Catalogue layer: tables, SIMBAD, Cosmicflows-4, NED.
  for (const o of objects) {
    if (LG_MEMBER[o.designation]) o.lg = LG_MEMBER[o.designation];
    if (LG_HOST[o.designation]) o.lgHost = LG_HOST[o.designation];
  }
  const lg = await fetchMcConnachie();
  const harris = parseHarris(await cached('harris-mwgc.dat', () => fetchText(HARRIS_FILE)));
  const baumgardt = parseBaumgardt(
    await cached('baumgardt-orbits-table.txt', () => fetchText(BAUMGARDT_TABLE)),
  );
  const { hr, cg } = await loadClusterTables();
  const simbad = await loadSimbad(objects);
  const isGalaxy = (o) =>
    ['G', 'GPair', 'GGroup', 'GTrpl'].includes(o.type) ||
    o.kind === 'galaxy' ||
    o.kind === 'galaxy-cluster';
  const galaxies = objects.filter(isGalaxy);
  const cf4 = await loadCf4(galaxies);
  const ned = await loadNed(galaxies);
  const data = { harris, baumgardt, hr, cg, lg, simbad, cf4, ned };

  const enriched = objects.map((o) => {
    const e = enrichObject(o, data);
    const {
      vmag: _v,
      explicit: _e,
      simbadId: _s,
      kind: _k,
      ongc,
      lg: _lg,
      lgHost: _h,
      ...base
    } = o;
    return {
      ...base,
      ...(ongc ? { ongc } : {}),
      ra: e.ra,
      dec: e.dec,
      mag: e.mag,
      records: e.records,
      catalogue: applyDistanceOverride(o.designation, e.catalogue),
    };
  });
  enriched.sort((a, b) => a.designation.localeCompare(b.designation, 'en', { numeric: true }));

  const out = {
    _source: 'OpenNGC (Mattia Verga), CC-BY-SA-4.0, github.com/mattiaverga/OpenNGC',
    _note:
      'Vendored snapshot for /explore v2 Slice 4. Messier set + gallery NGC/IC designations from OpenNGC; a dozen famous non-catalogue objects carry explicit J2000 positions (see refresh-messier-catalog.mjs EXPLICIT). Each object carries a catalogue map (value, source, bibcode, record_url) from Harris, Baumgardt & Vasiliev, Hunt & Reffert, Cosmicflows-4 and SIMBAD. Refresh: node scripts/refresh-messier-catalog.mjs',
    _retrieved: new Date().toISOString().slice(0, 10),
    _count: enriched.length,
    objects: enriched,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  // The snapshot sits outside .prettierignore's data/, so it is written the way `prettier --check` wants it.
  const text = JSON.stringify(out, null, 2) + '\n';
  const config = (await prettier.resolveConfig(OUT)) ?? {};
  fs.writeFileSync(OUT, await prettier.format(text, { ...config, parser: 'json' }));
  console.log(`✓ wrote ${enriched.length} objects → ${path.relative(ROOT, OUT)}`);
  console.log(`  Messier: ${messier.size}, explicit: ${EXPLICIT.length}`);
  const count = (f) => enriched.filter((o) => o.catalogue[f]).length;
  console.log(
    `  sourced: mag ${count('mag')}, dist_ly ${count('dist_ly')}, position ${count('position')}, size ${count('size_arcmin')}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
