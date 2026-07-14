/**
 * validate-universe-stars — schema + integrity check for the tiled HYG star
 * field (PRD-030 / RFC-032, Slice 0) under static/data/universe/stars/.
 *
 * On top of JSON-schema validation of index / shells / sources, enforces:
 *   1. Every shell referenced by index.json exists and validates.
 *   2. Each shell's declared `count` matches its actual star array length.
 *   3. index.star_count equals the sum of shell counts.
 *   4. Every star tuple is [x, y, z, mag, ci] with finite numbers and a
 *      distance consistent with its shell's [r_min_pc, r_max_pc) band.
 *   5. The provenance license is on the project allowlist.
 *
 * Exits non-zero on any failure so the validate-data runner fails closed.
 * Skips silently when the dataset is absent (nothing generated yet).
 */
import Ajv, { type AnySchema } from 'ajv';
import addFormats from 'ajv-formats';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isAllowedLicense } from './license-allowlist.js';
import { IAU_CONSTELLATIONS } from '../src/lib/universe/iau-constellations.ts';

const DATA_ROOT = 'static/data';
const STARS_DIR = join(DATA_ROOT, 'universe', 'stars');
const INDEX_PATH = join(STARS_DIR, 'index.json');
const SOURCES_PATH = join(STARS_DIR, 'sources.json');

if (!existsSync(INDEX_PATH)) {
  console.log('validate-universe-stars: no dataset at static/data/universe/stars/ — skipping.');
  process.exit(0);
}

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

function loadSchema(name: string): AnySchema {
  return JSON.parse(readFileSync(join(DATA_ROOT, 'schemas', name), 'utf8'));
}
const validateIndex = ajv.compile(loadSchema('universe-stars-index.schema.json'));
const validateShell = ajv.compile(loadSchema('universe-stars-shell.schema.json'));
const validateSources = ajv.compile(loadSchema('universe-stars-sources.schema.json'));
const validateNamedStars = ajv.compile(loadSchema('named-star.schema.json'));

const errors: string[] = [];
const readJson = (p: string): unknown => JSON.parse(readFileSync(p, 'utf8'));

interface ShellRef {
  shell: number;
  r_min_pc: number;
  r_max_pc: number | null;
  count: number;
  file: string;
}
interface IndexDoc {
  star_count: number;
  shells: ShellRef[];
}
interface ShellDoc {
  shell: number;
  r_min_pc: number;
  r_max_pc: number | null;
  count: number;
  stars: number[][];
}

const index = readJson(INDEX_PATH) as IndexDoc;
if (!validateIndex(index)) {
  for (const e of validateIndex.errors ?? []) {
    errors.push(`index.json ${e.instancePath || '/'} ${e.message ?? 'error'}`);
  }
}

// Provenance.
if (!existsSync(SOURCES_PATH)) {
  errors.push('sources.json missing — provenance is mandatory');
} else {
  const sources = readJson(SOURCES_PATH) as { license_short?: string };
  if (!validateSources(sources)) {
    for (const e of validateSources.errors ?? []) {
      errors.push(`sources.json ${e.instancePath || '/'} ${e.message ?? 'error'}`);
    }
  } else if (!isAllowedLicense(sources.license_short ?? '')) {
    errors.push(`sources.json license '${sources.license_short}' is not on the allowlist`);
  }
}

// Shells: existence, schema, count + distance-band integrity.
let starTotal = 0;
// Rounding to 4 dp can nudge a star a hair across a shell edge; allow a small slack.
const EDGE_SLACK_PC = 0.01;
for (const ref of index.shells ?? []) {
  const path = join(STARS_DIR, ref.file);
  if (!existsSync(path)) {
    errors.push(`shell ${ref.shell}: file ${ref.file} referenced by index.json is missing`);
    continue;
  }
  const shell = readJson(path) as ShellDoc;
  if (!validateShell(shell)) {
    for (const e of validateShell.errors ?? []) {
      errors.push(`${ref.file} ${e.instancePath || '/'} ${e.message ?? 'error'}`);
    }
    continue;
  }
  if (shell.count !== shell.stars.length) {
    errors.push(`${ref.file}: declared count ${shell.count} ≠ actual ${shell.stars.length}`);
  }
  if (shell.count !== ref.count) {
    errors.push(`${ref.file}: count ${shell.count} disagrees with index count ${ref.count}`);
  }
  starTotal += shell.stars.length;

  const rMax = ref.r_max_pc ?? Number.POSITIVE_INFINITY;
  for (let i = 0; i < shell.stars.length; i++) {
    const [x, y, z] = shell.stars[i];
    const dist = Math.hypot(x, y, z);
    if (!Number.isFinite(dist)) {
      errors.push(`${ref.file}[${i}]: non-finite position`);
      break;
    }
    if (dist < ref.r_min_pc - EDGE_SLACK_PC || dist > rMax + EDGE_SLACK_PC) {
      errors.push(
        `${ref.file}[${i}]: distance ${dist.toFixed(3)} pc outside shell band [${ref.r_min_pc}, ${ref.r_max_pc ?? '∞'})`,
      );
      break; // one report per shell is enough to flag the drift
    }
  }
}

if (starTotal !== index.star_count) {
  errors.push(`index.star_count ${index.star_count} ≠ sum of shell stars ${starTotal}`);
}

// Named-star catalog (Slice 1): schema + unique ids + valid IAU constellation codes.
const NAMED_PATH = join(STARS_DIR, 'named-stars.json');
if (existsSync(NAMED_PATH)) {
  const named = readJson(NAMED_PATH) as {
    count: number;
    stars: Array<{ id: string; con: string | null; dist_pc: number }>;
  };
  if (!validateNamedStars(named)) {
    for (const e of validateNamedStars.errors ?? []) {
      errors.push(`named-stars.json ${e.instancePath || '/'} ${e.message ?? 'error'}`);
    }
  } else {
    if (named.count !== named.stars.length) {
      errors.push(`named-stars.json: count ${named.count} ≠ actual ${named.stars.length}`);
    }
    const seen = new Set<string>();
    for (const s of named.stars) {
      if (seen.has(s.id)) errors.push(`named-stars.json: duplicate id "${s.id}"`);
      seen.add(s.id);
      if (s.con && !(s.con in IAU_CONSTELLATIONS)) {
        errors.push(`named-stars.json: "${s.id}" has unknown constellation code "${s.con}"`);
      }
    }
  }
}

if (errors.length > 0) {
  console.log(`validate-universe-stars: ${errors.length} error(s):`);
  for (const e of errors) console.log(`    ✗ ${e}`);
  process.exit(1);
}
console.log(
  `validate-universe-stars: ✓ ${index.star_count} stars across ${index.shells.length} shells, provenance + integrity OK`,
);
