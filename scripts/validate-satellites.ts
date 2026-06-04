/**
 * validate-satellites — schema + coverage check for the natural-
 * satellite layer (#304 Slice 7).
 *
 * Catches drift between:
 *   - static/data/satellites.json (canonical English content)
 *   - static/data/satellite-galleries.json (per-id image counts)
 *   - static/data/i18n/<locale>/satellites/<id>.json (per-locale
 *     overlay files)
 *
 * Exits non-zero on any error so the preflight runner flags broken
 * data before a PR can merge.
 */
import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SATS_JSON = join(ROOT, 'static', 'data', 'satellites.json');
const GALLERIES_JSON = join(ROOT, 'static', 'data', 'satellite-galleries.json');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

type Library = { id: string; label: string; url: string; tier: string; kind: string };
type Sat = {
  id: string;
  name: string;
  parent_planet_id: string;
  parent_planet_name: string;
  radius_km: number;
  mass_kg: number;
  semi_major_axis_km: number;
  orbital_period_days: number;
  discovered: string;
  mission_visits: string[];
  description: string;
  surface_composition?: string;
  wiki?: string;
  library?: Library[];
};

const errors: string[] = [];
const warnings: string[] = [];

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

const satsRaw = JSON.parse(await readFile(SATS_JSON, 'utf-8'));
const sats: Sat[] = satsRaw.satellites;
if (!Array.isArray(sats)) {
  console.error('satellites.json: missing `satellites` array');
  process.exit(1);
}

const required = [
  'id',
  'name',
  'parent_planet_id',
  'parent_planet_name',
  'radius_km',
  'mass_kg',
  'semi_major_axis_km',
  'orbital_period_days',
  'discovered',
  'mission_visits',
  'description',
] as const;

const seenIds = new Set<string>();
for (const s of sats) {
  for (const k of required) {
    if (s[k as keyof Sat] === undefined || s[k as keyof Sat] === null) {
      errors.push(`satellites.json[${s.id ?? '???'}]: missing required field "${k}"`);
    }
  }
  if (seenIds.has(s.id)) errors.push(`satellites.json: duplicate id "${s.id}"`);
  seenIds.add(s.id);
  if (s.library) {
    const libIds = new Set<string>();
    for (const l of s.library) {
      if (!l.id || !l.label || !l.url || !l.tier || !l.kind) {
        errors.push(`satellites.json[${s.id}]: library entry missing required field`);
      }
      if (libIds.has(l.id)) errors.push(`satellites.json[${s.id}]: duplicate library id "${l.id}"`);
      libIds.add(l.id);
      if (!['intro', 'core', 'extra'].includes(l.tier)) {
        errors.push(`satellites.json[${s.id}/${l.id}]: invalid tier "${l.tier}"`);
      }
      if (!['wikipedia', 'nasa', 'mission', 'video', 'article'].includes(l.kind)) {
        errors.push(`satellites.json[${s.id}/${l.id}]: invalid kind "${l.kind}"`);
      }
    }
  }
}

// Gallery manifest coverage: every satellite must appear (count may be 0).
const galleries = JSON.parse(await readFile(GALLERIES_JSON, 'utf-8')) as Record<string, number>;
for (const s of sats) {
  if (galleries[s.id] === undefined) {
    errors.push(`satellite-galleries.json: missing entry for "${s.id}"`);
  }
}
for (const k of Object.keys(galleries)) {
  if (!seenIds.has(k)) {
    warnings.push(`satellite-galleries.json: orphan entry "${k}" not in satellites.json`);
  }
}

// i18n overlay coverage: every locale must have an overlay file per
// satellite (may be `{}` for un-translated locales).
const locales = (await readdir(I18N_ROOT)).filter(
  (d) => !d.startsWith('.') && d !== 'packed-lines',
);
for (const loc of locales) {
  const satDir = join(I18N_ROOT, loc, 'satellites');
  if (!(await exists(satDir))) {
    warnings.push(
      `i18n/${loc}: missing satellites/ directory (locale skipped from coverage check)`,
    );
    continue;
  }
  for (const s of sats) {
    const f = join(satDir, `${s.id}.json`);
    if (!(await exists(f))) {
      errors.push(`i18n/${loc}/satellites/${s.id}.json: missing overlay file`);
    }
  }
}

console.log(
  `validate-satellites: ${sats.length} satellites, ${locales.length} locales, ${galleries ? Object.keys(galleries).length : 0} gallery entries.`,
);
if (warnings.length > 0) {
  console.log(`  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`    ! ${w}`);
}
if (errors.length > 0) {
  console.log(`  ${errors.length} error(s):`);
  for (const e of errors) console.log(`    ✗ ${e}`);
  process.exit(1);
}
console.log(`  ✓ all checks passed`);
