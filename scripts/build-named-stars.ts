// Build-time generator for the curated named-star catalog (/explore v2 Slice 1).
//
// The Slice-0 shells are anonymous tuples; this emits the ~60 notable stars that
// get a marker, a label, and a full Panel — resolved from the HYG catalogue by
// their IAU proper name. Curated by brightness + fame + the nearby-star story, and
// globally representative (the diverse cultural significance is carried in the
// per-locale overlays, not just the brightest headline stars).
//
//   npx tsx scripts/build-named-stars.ts --from /tmp/hyg_v41.csv
//   npx tsx scripts/build-named-stars.ts            # downloads HYG
//
// Output: static/data/universe/named-stars.json (base) — per-locale editorial
// overlays live under i18n-src/<locale>/universe/named-stars/<id>.json.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const SCRIPT_VERSION = 'build-named-stars@1.0.0';
const HYG_URL =
  'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv';
const OUT_PATH = 'static/data/universe/named-stars.json';

// HYG column indices (0-based).
const COL = {
  hip: 1,
  proper: 6,
  dist: 9,
  mag: 13,
  absmag: 14,
  spect: 15,
  ci: 16,
  x: 17,
  y: 18,
  z: 19,
  con: 29,
} as const;

// Curated set — { slug, name } where `name` is the exact HYG `proper` string.
// Grouped for readability; order here doesn't matter (output is sorted by magnitude).
const CURATED: Array<{ slug: string; name: string }> = [
  // The brightest stars in Earth's sky.
  { slug: 'sirius', name: 'Sirius' },
  { slug: 'canopus', name: 'Canopus' },
  { slug: 'rigil-kentaurus', name: 'Rigil Kentaurus' },
  { slug: 'arcturus', name: 'Arcturus' },
  { slug: 'vega', name: 'Vega' },
  { slug: 'capella', name: 'Capella' },
  { slug: 'rigel', name: 'Rigel' },
  { slug: 'procyon', name: 'Procyon' },
  { slug: 'achernar', name: 'Achernar' },
  { slug: 'betelgeuse', name: 'Betelgeuse' },
  { slug: 'hadar', name: 'Hadar' },
  { slug: 'altair', name: 'Altair' },
  { slug: 'acrux', name: 'Acrux' },
  { slug: 'aldebaran', name: 'Aldebaran' },
  { slug: 'antares', name: 'Antares' },
  { slug: 'spica', name: 'Spica' },
  { slug: 'pollux', name: 'Pollux' },
  { slug: 'fomalhaut', name: 'Fomalhaut' },
  { slug: 'deneb', name: 'Deneb' },
  { slug: 'mimosa', name: 'Mimosa' },
  { slug: 'regulus', name: 'Regulus' },
  { slug: 'adhara', name: 'Adhara' },
  { slug: 'castor', name: 'Castor' },
  { slug: 'gacrux', name: 'Gacrux' },
  { slug: 'bellatrix', name: 'Bellatrix' },
  { slug: 'elnath', name: 'Elnath' },
  { slug: 'miaplacidus', name: 'Miaplacidus' },
  { slug: 'alnilam', name: 'Alnilam' },
  { slug: 'alnair', name: 'Alnair' },
  { slug: 'alnitak', name: 'Alnitak' },
  { slug: 'alioth', name: 'Alioth' },
  { slug: 'dubhe', name: 'Dubhe' },
  { slug: 'mirfak', name: 'Mirfak' },
  { slug: 'wezen', name: 'Wezen' },
  { slug: 'kaus-australis', name: 'Kaus Australis' },
  { slug: 'alkaid', name: 'Alkaid' },
  { slug: 'sargas', name: 'Sargas' },
  { slug: 'avior', name: 'Avior' },
  { slug: 'menkalinan', name: 'Menkalinan' },
  { slug: 'atria', name: 'Atria' },
  { slug: 'alhena', name: 'Alhena' },
  { slug: 'peacock', name: 'Peacock' },
  { slug: 'polaris', name: 'Polaris' },
  { slug: 'alphard', name: 'Alphard' },
  { slug: 'hamal', name: 'Hamal' },
  { slug: 'diphda', name: 'Diphda' },
  { slug: 'nunki', name: 'Nunki' },
  { slug: 'alpheratz', name: 'Alpheratz' },
  { slug: 'saiph', name: 'Saiph' },
  { slug: 'mintaka', name: 'Mintaka' },
  { slug: 'sadr', name: 'Sadr' },
  { slug: 'menkent', name: 'Menkent' },
  { slug: 'denebola', name: 'Denebola' },
  { slug: 'alphecca', name: 'Alphecca' },
  { slug: 'rasalhague', name: 'Rasalhague' },
  { slug: 'algol', name: 'Algol' },
  { slug: 'almach', name: 'Almach' },
  // Nearby-star story — dim but famous for being among our closest neighbours.
  { slug: 'proxima-centauri', name: 'Proxima Centauri' },
  { slug: 'barnards-star', name: "Barnard's Star" },
  { slug: 'lalande-21185', name: 'Lalande 21185' },
  { slug: 'luytens-star', name: "Luyten's Star" },
  { slug: 'van-maanens-star', name: "Van Maanen's Star" },
];

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ',') {
      out.push(field);
      field = '';
    } else field += ch;
  }
  out.push(field);
  return out;
}

const num = (s: string | undefined): number =>
  s === undefined || s.trim() === '' ? Number.NaN : Number(s);
const round = (v: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

async function loadCsv(): Promise<string> {
  const i = process.argv.indexOf('--from');
  if (i !== -1 && process.argv[i + 1]) {
    console.log(`Reading HYG from ${process.argv[i + 1]}`);
    return readFileSync(process.argv[i + 1], 'utf8');
  }
  console.log(`Downloading HYG: ${HYG_URL}`);
  const res = await fetch(HYG_URL);
  if (!res.ok) throw new Error(`HYG download failed: HTTP ${res.status}`);
  return res.text();
}

async function main(): Promise<void> {
  const lines = (await loadCsv()).split('\n');
  const byProper = new Map<string, string[]>();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const cols = splitCsvLine(lines[i]);
    const proper = cols[COL.proper];
    if (proper && proper.trim() !== '') byProper.set(proper, cols);
  }

  const stars: Array<Record<string, unknown>> = [];
  const missing: string[] = [];
  for (const { slug, name } of CURATED) {
    const cols = byProper.get(name);
    if (!cols) {
      missing.push(name);
      continue;
    }
    const hip = num(cols[COL.hip]);
    stars.push({
      id: slug,
      hip: Number.isFinite(hip) ? hip : null,
      proper: name,
      con: cols[COL.con] || null,
      spect: cols[COL.spect] || null,
      dist_pc: round(num(cols[COL.dist]), 3),
      mag: round(num(cols[COL.mag]), 2),
      absmag: round(num(cols[COL.absmag]), 2),
      bv: Number.isFinite(num(cols[COL.ci])) ? round(num(cols[COL.ci]), 3) : null,
      x: round(num(cols[COL.x]), 4),
      y: round(num(cols[COL.y]), 4),
      z: round(num(cols[COL.z]), 4),
    });
  }

  if (missing.length) {
    console.error(`✗ ${missing.length} curated names not found in HYG: ${missing.join(', ')}`);
    process.exit(1);
  }

  stars.sort((a, b) => (a.mag as number) - (b.mag as number));
  const doc = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    script_version: SCRIPT_VERSION,
    catalog: 'HYG Database v4.1 (astronexus)',
    count: stars.length,
    stars,
  };
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(doc, null, 2) + '\n', 'utf8');
  console.log(`✓ ${stars.length} named stars → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
