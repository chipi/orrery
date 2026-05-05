/**
 * Validates all data files under static/data/ against their JSON schemas (ADR-019).
 *
 * Run via: npm run validate-data
 * CI: blocks PR on any validation failure.
 */

import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DATA_ROOT = 'static/data';
// strictRequired:false allows the surface-site schema's if/then conditional
// required (lat/lon for surface; altitude_km/inclination_deg for orbiter)
// to reference properties declared on the parent rather than re-declaring
// them inside each branch. Other strict checks remain enabled.
const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);

function loadSchema(name: string): AnySchema {
  return JSON.parse(readFileSync(join(DATA_ROOT, 'schemas', name), 'utf8'));
}

const missionSchema = loadSchema('mission.schema.json');
const missionIndexSchema = loadSchema('mission-index.schema.json');
const missionOverlaySchema = loadSchema('mission-overlay.schema.json');
const planetsSchema = loadSchema('planets.schema.json');
const rocketSchema = loadSchema('rocket.schema.json');
const rocketOverlaySchema = loadSchema('rocket-overlay.schema.json');
const earthObjectSchema = loadSchema('earth-object.schema.json');
const earthObjectOverlaySchema = loadSchema('earth-object-overlay.schema.json');
// Generic surface-site schema (PRD-009 / RFC-012). Replaces the body-specific
// moon-site / mars-site schemas — both bodies share the same site shape with
// a `kind: 'surface' | 'orbiter'` discriminator.
const surfaceSiteSchema = loadSchema('surface-site.schema.json');
const surfaceSiteOverlaySchema = loadSchema('surface-site-overlay.schema.json');
const planetOverlaySchema = loadSchema('planet-overlay.schema.json');
const sunSchema = loadSchema('sun.schema.json');
const sunOverlaySchema = loadSchema('sun-overlay.schema.json');
const scenarioSchema = loadSchema('scenario.schema.json');
const scenarioOverlaySchema = loadSchema('scenario-overlay.schema.json');
const porkchopSchema = loadSchema('porkchop.schema.json');

const validateMission = ajv.compile(missionSchema);
const validateMissionIndex = ajv.compile(missionIndexSchema);
const validateMissionOverlay = ajv.compile(missionOverlaySchema);
const validatePlanets = ajv.compile(planetsSchema);
const validateRockets = ajv.compile(rocketSchema);
const validateRocketOverlay = ajv.compile(rocketOverlaySchema);
const validateEarthObjects = ajv.compile(earthObjectSchema);
const validateEarthObjectOverlay = ajv.compile(earthObjectOverlaySchema);
const validateSurfaceSites = ajv.compile(surfaceSiteSchema);
const validateSurfaceSiteOverlay = ajv.compile(surfaceSiteOverlaySchema);
const validatePlanetOverlay = ajv.compile(planetOverlaySchema);
const validateSun = ajv.compile(sunSchema);
const validateSunOverlay = ajv.compile(sunOverlaySchema);
const validateScenario = ajv.compile(scenarioSchema);
const validateScenarioOverlay = ajv.compile(scenarioOverlaySchema);
const validatePorkchop = ajv.compile(porkchopSchema);

let failed = 0;
let passed = 0;

function report(file: string, errors: ErrorObject[] | null | undefined) {
  if (!errors || errors.length === 0) return;
  console.error(`\n  ✗ ${file}`);
  for (const err of errors) {
    console.error(`      ${err.instancePath || '/'} ${err.message ?? 'error'}`);
    if (err.params && Object.keys(err.params).length > 0) {
      console.error(`        params: ${JSON.stringify(err.params)}`);
    }
  }
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function validateFile(path: string, validator: ValidateFunction): void {
  if (!existsSync(path)) return;
  const ok = validator(readJson(path));
  if (ok) {
    passed++;
  } else {
    failed++;
    report(path, validator.errors);
  }
}

/** Every subdirectory of `missions/` (excludes loose files like index.json). */
function listMissionDataDirs(): string[] {
  const root = join(DATA_ROOT, 'missions');
  return readdirSync(root).filter((name) => {
    if (name === 'index.json') return false;
    try {
      return statSync(join(root, name)).isDirectory();
    } catch {
      return false;
    }
  });
}

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f));
}

console.log('Validating data...');

// 0. Reference data
validateFile(join(DATA_ROOT, 'planets.json'), validatePlanets);
validateFile(join(DATA_ROOT, 'rockets.json'), validateRockets);
validateFile(join(DATA_ROOT, 'earth-objects.json'), validateEarthObjects);
validateFile(join(DATA_ROOT, 'moon-sites.json'), validateSurfaceSites);
validateFile(join(DATA_ROOT, 'mars-sites.json'), validateSurfaceSites);
validateFile(join(DATA_ROOT, 'sun.json'), validateSun);

// Scenario base records
for (const file of listJson(join(DATA_ROOT, 'scenarios'))) {
  validateFile(file, validateScenario);
}

// Pre-computed porkchop grids (v0.1.6 / ADR-026). Generated by
// scripts/precompute-porkchops.ts; consumed by /plan via getPorkchopGrid.
for (const file of listJson(join(DATA_ROOT, 'porkchop'))) {
  validateFile(file, validatePorkchop);
}

// 1. Mission index
validateFile(join(DATA_ROOT, 'missions/index.json'), validateMissionIndex);

// 2. Mission base files (per destination)
const missionDataDirs = listMissionDataDirs();
for (const dest of missionDataDirs) {
  for (const file of listJson(join(DATA_ROOT, 'missions', dest))) {
    validateFile(file, validateMission);
  }
}

// 3. Locale overlays
const i18nDir = join(DATA_ROOT, 'i18n');
if (existsSync(i18nDir)) {
  for (const locale of readdirSync(i18nDir)) {
    // Mission overlays
    for (const dest of missionDataDirs) {
      for (const file of listJson(join(i18nDir, locale, 'missions', dest))) {
        validateFile(file, validateMissionOverlay);
      }
    }
    // Rocket overlays
    for (const file of listJson(join(i18nDir, locale, 'rockets'))) {
      validateFile(file, validateRocketOverlay);
    }
    // Earth-object overlays
    for (const file of listJson(join(i18nDir, locale, 'earth-objects'))) {
      validateFile(file, validateEarthObjectOverlay);
    }
    // Moon-site + Mars-site overlays — both bodies share the surface-site overlay schema.
    for (const file of listJson(join(i18nDir, locale, 'moon-sites'))) {
      validateFile(file, validateSurfaceSiteOverlay);
    }
    for (const file of listJson(join(i18nDir, locale, 'mars-sites'))) {
      validateFile(file, validateSurfaceSiteOverlay);
    }
    // Planet overlays
    for (const file of listJson(join(i18nDir, locale, 'planets'))) {
      validateFile(file, validatePlanetOverlay);
    }
    // Sun overlay
    validateFile(join(i18nDir, locale, 'sun.json'), validateSunOverlay);
    // Scenario overlays
    for (const file of listJson(join(i18nDir, locale, 'scenarios'))) {
      validateFile(file, validateScenarioOverlay);
    }
  }
}

console.log(`\n${passed} files passed, ${failed} failed.`);

// ──────────────────────────────────────────────────────────────────────
// Doc-system gating-sentence checks (Slice 6 / RFC-005 closure).
//
// PRDs must answer "Why this is a PRD"; RFCs must answer "Why this is
// an RFC"; ADRs must carry a "Status" field. These are scriptable
// versions of the doc-discipline rules — a PR that strips them fails
// CI here instead of in human review.
// ──────────────────────────────────────────────────────────────────────

let docFailed = 0;

function checkDocsHaveText(
  globDir: string,
  mustInclude: string,
  label: string,
  options: { skipClosedDecided?: boolean; excludeFiles?: string[] } = {},
) {
  if (!existsSync(globDir)) return;
  const exclude = new Set(['index.md', ...(options.excludeFiles ?? [])]);
  const files = readdirSync(globDir).filter((f) => f.endsWith('.md') && !exclude.has(f));
  for (const f of files) {
    const path = join(globDir, f);
    const content = readFileSync(path, 'utf8');
    // Some early RFCs predate the gating-sentence template and are
    // already Closed / Decided / Superseded — they shouldn't be
    // re-templated retroactively. Skip them when the option is set.
    if (options.skipClosedDecided && /Status\s*·\s*(Closed|Decided|Superseded)/i.test(content)) {
      continue;
    }
    if (!content.includes(mustInclude)) {
      console.error(`\n  ✗ ${path}\n      missing required ${label}: "${mustInclude}"`);
      docFailed++;
    }
  }
}

console.log('\nValidating doc-system gating sentences...');
checkDocsHaveText('docs/prd', 'Why this is a PRD', 'PRD gating sentence', {
  // PA.md is the Product Authority reference (mirrors TA.md), not a PRD.
  excludeFiles: ['PA.md'],
});
checkDocsHaveText('docs/rfc', 'Why this is an RFC', 'RFC gating sentence', {
  skipClosedDecided: true,
});
// ADRs must carry a `> Status ·` line at the top per the project's
// ADR template. TA.md isn't an ADR — it's the Technical Authority
// reference doc that lives in the same folder.
checkDocsHaveText('docs/adr', '> Status ·', 'ADR Status field', {
  excludeFiles: ['TA.md'],
});

if (docFailed > 0) {
  console.error(`\n${docFailed} doc-system check(s) failed.`);
}

// ─── Mission flight-data consistency (v0.1.10 / issue #31) ─────────
// For each mission with a populated `flight.cruise.tcm_count`, the
// number of `events[].type === 'tcm'` must match. Catches drift when
// one side is updated without the other.
let missionDriftFailed = 0;
console.log('\nValidating mission flight-data consistency (v0.1.10)...');
for (const dest of missionDataDirs) {
  const dir = join(DATA_ROOT, 'missions', dest);
  if (!existsSync(dir)) continue;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const m = JSON.parse(readFileSync(join(dir, file), 'utf8')) as {
      flight?: {
        cruise?: { tcm_count?: number };
        events?: Array<{ type: string }>;
      };
    };
    const target = m.flight?.cruise?.tcm_count;
    if (target == null) continue;
    const events = m.flight?.events ?? [];
    const actual = events.filter((e) => e.type === 'tcm').length;
    if (actual !== target) {
      console.error(`  ✗ ${dest}/${file}: tcm_count=${target} but events.tcm.length=${actual}`);
      missionDriftFailed++;
    }
  }
}
if (missionDriftFailed === 0) {
  console.log('  ✓ All flight-data tcm-counts consistent');
}

if (failed + docFailed + missionDriftFailed > 0) process.exit(1);
