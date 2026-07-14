// Build-time generator for the /explore v2 "Stellar Neighborhood" star field
// (PRD-030 / RFC-032 · Slice 0). Fetches the HYG stellar catalogue, normalizes
// every usable star to a compact { x, y, z (pc), mag, B−V } record via the
// shared pure transform ($lib/universe/star-normalize), and tiles the result
// into distance shells under static/data/universe/stars/ for streaming.
//
// Network-fetching + committed-output pattern (mirrors build-image-provenance /
// fetch-station-tles): run manually to (re)generate, commit the output, and let
// `npm run validate-data` gate it. NOT part of `npm run build` (no network in CI).
//
//   npx tsx scripts/build-universe-stars.ts            # download fresh
//   npx tsx scripts/build-universe-stars.ts --from <path>   # use a local CSV
//
// Provenance: HYG Database v4.1 (astronexus), CC-BY-SA-4.0.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeStar, type NormalizedStar, type RawHygStar } from '../src/lib/universe/star-normalize.ts';

const SCRIPT_VERSION = 'build-universe-stars@1.0.0';
const HYG_URL =
  'https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv';
const HYG_CATALOG = 'HYG Database v4.1 (astronexus)';
const OUT_DIR = 'static/data/universe/stars';

// Outer edge (parsecs) of each distance shell; the last shell catches the rest.
// Nearest shells are small + sparse so they stream first for the boundary reveal.
const SHELL_EDGES_PC = [10, 25, 50, 100, 250, 500, 1000];

// HYG column indices (0-based) for the fields we consume.
const COL = { id: 0, dist: 9, mag: 13, ci: 16, x: 17, y: 18, z: 19 } as const;

/** Quote-aware split of a single CSV line (HYG quotes some string fields). */
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
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      out.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  out.push(field);
  return out;
}

function numOrNaN(s: string | undefined): number {
  if (s === undefined || s.trim() === '') return Number.NaN;
  return Number(s);
}

function toRaw(cols: string[]): RawHygStar {
  const ciStr = cols[COL.ci];
  return {
    id: numOrNaN(cols[COL.id]),
    distPc: numOrNaN(cols[COL.dist]),
    mag: numOrNaN(cols[COL.mag]),
    ci: ciStr !== undefined && ciStr.trim() !== '' ? Number(ciStr) : null,
    x: numOrNaN(cols[COL.x]),
    y: numOrNaN(cols[COL.y]),
    z: numOrNaN(cols[COL.z]),
  };
}

/** Index of the distance shell a star at `distPc` belongs to. */
function shellIndexFor(distPc: number): number {
  for (let i = 0; i < SHELL_EDGES_PC.length; i++) {
    if (distPc <= SHELL_EDGES_PC[i]) return i;
  }
  return SHELL_EDGES_PC.length; // outermost catch-all
}

const round = (v: number, dp: number): number => {
  const f = 10 ** dp;
  return Math.round(v * f) / f;
};

/** Compact per-star tuple: [x, y, z, mag, ci]. */
type StarTuple = [number, number, number, number, number];

function toTuple(s: NormalizedStar): StarTuple {
  return [round(s.x, 4), round(s.y, 4), round(s.z, 4), round(s.mag, 2), round(s.ci, 3)];
}

async function loadCsv(): Promise<string> {
  const fromFlag = process.argv.indexOf('--from');
  if (fromFlag !== -1 && process.argv[fromFlag + 1]) {
    const path = process.argv[fromFlag + 1];
    console.log(`Reading HYG catalogue from local file: ${path}`);
    return readFileSync(path, 'utf8');
  }
  console.log(`Downloading HYG catalogue: ${HYG_URL}`);
  const res = await fetch(HYG_URL);
  if (!res.ok) throw new Error(`HYG download failed: HTTP ${res.status}`);
  return res.text();
}

async function main(): Promise<void> {
  const csv = await loadCsv();
  const lines = csv.split('\n');
  // Distance (pc) of a star travels alongside its tuple so we can shell + sort.
  const stars: Array<{ dist: number; tuple: StarTuple }> = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const norm = normalizeStar(toRaw(splitCsvLine(line)));
    if (!norm) continue;
    stars.push({ dist: Math.hypot(norm.x, norm.y, norm.z), tuple: toTuple(norm) });
  }

  const shellCount = SHELL_EDGES_PC.length + 1;
  const shells: Array<{ dist: number; tuple: StarTuple }>[] = Array.from(
    { length: shellCount },
    () => [],
  );
  for (const s of stars) shells[shellIndexFor(s.dist)].push(s);

  mkdirSync(OUT_DIR, { recursive: true });

  const shellManifest: Array<{
    shell: number;
    r_min_pc: number;
    r_max_pc: number | null;
    count: number;
    file: string;
  }> = [];

  for (let i = 0; i < shells.length; i++) {
    // Brightest first: streaming a prefix of a shell yields the "N brightest" LOD.
    const sorted = shells[i].sort((a, b) => a.tuple[3] - b.tuple[3]);
    const rMin = i === 0 ? 0 : SHELL_EDGES_PC[i - 1];
    const rMax = i < SHELL_EDGES_PC.length ? SHELL_EDGES_PC[i] : null;
    const file = `shell-${String(i).padStart(3, '0')}.json`;
    const shellDoc = {
      shell: i,
      r_min_pc: rMin,
      r_max_pc: rMax,
      count: sorted.length,
      stars: sorted.map((s) => s.tuple),
    };
    writeFileSync(join(OUT_DIR, file), JSON.stringify(shellDoc) + '\n', 'utf8');
    shellManifest.push({ shell: i, r_min_pc: rMin, r_max_pc: rMax, count: sorted.length, file });
  }

  const generatedAt = new Date().toISOString();
  const index = {
    schema_version: 1,
    generated_at: generatedAt,
    script_version: SCRIPT_VERSION,
    catalog: HYG_CATALOG,
    star_count: stars.length,
    shells: shellManifest,
  };
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');

  const sources = {
    schema_version: 1,
    generated_at: generatedAt,
    script_version: SCRIPT_VERSION,
    dataset: 'universe/stars',
    catalog: HYG_CATALOG,
    catalog_version: 'v4.1',
    source_url: 'https://github.com/astronexus/HYG-Database',
    license_short: 'CC-BY-SA-4.0',
    license_url: 'https://creativecommons.org/licenses/by-sa/4.0/',
    license_rationale:
      'HYG Database is published by astronexus under Creative Commons Attribution-ShareAlike 4.0 International.',
    derivation:
      'Dropped the Sun (id 0) and stars without usable parallax (dist ≥ 100000). Kept equatorial cartesian x/y/z (pc), apparent magnitude, and B−V; tiled by distance shell. Star color is derived from B−V at render time (bv-to-rgb).',
  };
  writeFileSync(join(OUT_DIR, 'sources.json'), JSON.stringify(sources, null, 2) + '\n', 'utf8');

  console.log(
    `✓ ${stars.length} stars across ${shells.length} shells → ${OUT_DIR}/ ` +
      `(${shellManifest.map((s) => s.count).join(' / ')})`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
