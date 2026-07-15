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
 * Output: scripts/data-snapshots/messier-catalog.json
 */
import fs from 'node:fs';
import path from 'node:path';

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
    name: 'Cartwheel Galaxy',
    ra: 9.42542,
    dec: -33.71639,
    type: 'G',
    con: 'Scl',
    size: 1.1,
  }, // 00:37:42.1 -33:42:59
  {
    designation: 'Gum 29',
    name: 'Westerlund 2 (Gum 29)',
    ra: 155.9917,
    dec: -57.7636,
    type: 'OCl+N',
    con: 'Car',
    size: 8,
  }, // 10:23:58 -57:45:49
  {
    designation: 'Cygnus Loop',
    name: 'Cygnus Loop / Veil Nebula',
    ra: 312.75,
    dec: 30.7167,
    type: 'SNR',
    con: 'Cyg',
    size: 180,
  }, // 20:51:00 +30:43
  {
    designation: 'SN 1572',
    name: "Tycho's Supernova Remnant",
    ra: 6.325,
    dec: 64.1447,
    type: 'SNR',
    con: 'Cas',
    size: 8,
  }, // 00:25:18 +64:08:41
  {
    designation: 'Perseus Cluster',
    name: 'Perseus Cluster (Abell 426)',
    ra: 49.9508,
    dec: 41.5117,
    type: 'GCl',
    con: 'Per',
    size: 60,
  }, // 03:19:48 +41:30:42
  {
    designation: 'Barnard 33',
    name: 'Horsehead Nebula (Barnard 33)',
    ra: 85.2458,
    dec: -2.4589,
    type: 'DrkN',
    con: 'Ori',
    size: 8,
  }, // 05:40:59 -02:27:32
  {
    designation: 'Serpens Nebula',
    name: 'Serpens Nebula',
    ra: 277.4958,
    dec: 1.25,
    type: 'Neb',
    con: 'Ser',
    size: 15,
  }, // 18:29:59 +01:15
  {
    designation: 'Cas A',
    name: 'Cassiopeia A',
    ra: 350.85,
    dec: 58.815,
    type: 'SNR',
    con: 'Cas',
    size: 5,
  }, // 23:23:24 +58:48:54
  {
    designation: 'Rho Ophiuchi',
    name: 'Rho Ophiuchi cloud complex',
    ra: 246.3958,
    dec: -23.4472,
    type: 'Neb',
    con: 'Oph',
    size: 240,
  }, // 16:25:35 -23:26:50
  {
    designation: 'WR 124',
    name: 'WR 124 / M1-67',
    ra: 287.8792,
    dec: 16.8606,
    type: 'WR*',
    con: 'Sge',
    size: 2,
  }, // 19:11:31 +16:51:38
  {
    designation: 'Hen 2-104',
    name: 'Southern Crab (Hen 2-104)',
    ra: 212.9667,
    dec: -51.44,
    type: 'PN',
    con: 'Cen',
    size: 2,
  }, // 14:11:52 -51:26:24
  {
    designation: 'V838 Mon',
    name: 'V838 Monocerotis',
    ra: 106.0167,
    dec: -3.8419,
    type: 'V*',
    con: 'Mon',
    size: 1,
  }, // 07:04:04 -03:50:31
];

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

async function loadCsv() {
  const local = process.env.OPENNGC_CSV;
  if (local && fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
  const cached = '/tmp/openngc-ngc.csv';
  if (fs.existsSync(cached)) {
    console.log(`Using cached ${cached}`);
    return fs.readFileSync(cached, 'utf8');
  }
  console.log(`Fetching ${OPENNGC_URL} …`);
  const res = await fetch(OPENNGC_URL);
  if (!res.ok) throw new Error(`OpenNGC fetch ${res.status}`);
  const text = await res.text();
  fs.writeFileSync(cached, text);
  return text;
}

function main() {
  return loadCsv().then((csv) => {
    const lines = csv.split('\n').filter((l) => l.trim());
    const header = lines[0].split(';');
    const col = (n) => header.indexOf(n);
    const cName = col('Name'),
      cType = col('Type'),
      cRA = col('RA'),
      cDec = col('Dec'),
      cCon = col('Const'),
      cVMag = col('V-Mag'),
      cBMag = col('B-Mag'),
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
        ra: +pos.ra.toFixed(5),
        dec: +pos.dec.toFixed(5),
        type: f[cType] || '',
        con: f[cCon] || '',
        mag: f[cVMag] ? +f[cVMag] : f[cBMag] ? +f[cBMag] : null,
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
        mag: null,
        size: e.size ?? null,
        common: e.name,
      });
    }

    objects.sort((a, b) => a.designation.localeCompare(b.designation, 'en', { numeric: true }));

    const out = {
      _source: 'OpenNGC (Mattia Verga), CC-BY-SA-4.0, github.com/mattiaverga/OpenNGC',
      _note:
        'Vendored snapshot for /explore v2 Slice 4. Messier set + gallery NGC/IC designations from OpenNGC; a dozen famous non-catalogue objects carry explicit J2000 positions (see refresh-messier-catalog.mjs EXPLICIT). Refresh: node scripts/refresh-messier-catalog.mjs',
      _count: objects.length,
      objects,
    };
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
    console.log(`✓ wrote ${objects.length} objects → ${path.relative(ROOT, OUT)}`);
    console.log(`  Messier: ${messier.size}, explicit: ${EXPLICIT.length}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
