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
import { isAllowedLicense } from './license-allowlist.js';

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
const issModuleSchema = loadSchema('iss-module.schema.json');
const issModuleOverlaySchema = loadSchema('iss-module-overlay.schema.json');
// ADR-046 Milestone C — image provenance + license stewardship.
const imageProvenanceSchema = loadSchema('image-provenance.schema.json');
const licenseWaiversSchema = loadSchema('license-waivers.schema.json');
// ADR-046 Milestone D — public credits page manifests.
const sourceLogosSchema = loadSchema('source-logos.schema.json');
const textSourcesSchema = loadSchema('text-sources.schema.json');

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
const validateIssModules = ajv.compile(issModuleSchema);
const validateIssModuleOverlay = ajv.compile(issModuleOverlaySchema);
const validateImageProvenance = ajv.compile(imageProvenanceSchema);
const validateLicenseWaivers = ajv.compile(licenseWaiversSchema);
const validateSourceLogos = ajv.compile(sourceLogosSchema);
const validateTextSources = ajv.compile(textSourcesSchema);

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
validateFile(join(DATA_ROOT, 'iss-modules.json'), validateIssModules);
// ADR-046 Milestone C: image provenance + license waivers.
validateFile(join(DATA_ROOT, 'image-provenance.json'), validateImageProvenance);
validateFile(join(DATA_ROOT, 'license-waivers.json'), validateLicenseWaivers);
// ADR-046 Milestone D: public /credits manifests.
validateFile(join(DATA_ROOT, 'source-logos.json'), validateSourceLogos);
validateFile(join(DATA_ROOT, 'text-sources.json'), validateTextSources);

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
    // ISS module overlays (PRD-010 / ADR-017)
    const issOvDir = join(i18nDir, locale, 'iss-modules');
    if (existsSync(issOvDir)) {
      for (const file of listJson(issOvDir)) {
        validateFile(file, validateIssModuleOverlay);
      }
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

// ──────────────────────────────────────────────────────────────────────
// ADR-046 Milestone C — image provenance integrity
//
// On top of the JSON-schema check, enforce three runtime invariants:
//   1. Every license_short is in scripts/license-allowlist.ts OR
//      covered by a waiver in static/data/license-waivers.json.
//   2. Every entry.path resolves to a real file under static/.
//   3. No duplicate entry.path values.
// Any failure exits non-zero so CI / pre-build hooks fail closed.
// ──────────────────────────────────────────────────────────────────────

let provenanceFailed = 0;

const PROVENANCE_PATH = join(DATA_ROOT, 'image-provenance.json');
if (existsSync(PROVENANCE_PATH)) {
  console.log('\nValidating image-provenance integrity (ADR-046 Milestone C)...');

  type WaiverRow = {
    license_short: string;
    scope: string;
  };
  type ProvenanceRow = {
    path: string;
    license_short: string;
  };

  const waiversRaw = existsSync(join(DATA_ROOT, 'license-waivers.json'))
    ? ((
        JSON.parse(readFileSync(join(DATA_ROOT, 'license-waivers.json'), 'utf8')) as {
          waivers?: WaiverRow[];
        }
      ).waivers ?? [])
    : [];
  const manifest = JSON.parse(readFileSync(PROVENANCE_PATH, 'utf8')) as {
    entries: ProvenanceRow[];
  };

  function isWaived(licenseShort: string, path: string): boolean {
    return waiversRaw.some((w) => {
      if (w.license_short !== licenseShort) return false;
      if (w.scope === 'all') return true;
      if (w.scope === path) return true;
      if (w.scope.endsWith('/*')) return path.startsWith(w.scope.slice(0, -2));
      return false;
    });
  }

  const seenPaths = new Set<string>();
  let licenseFails = 0;
  let missingFiles = 0;
  let duplicates = 0;
  for (const e of manifest.entries) {
    if (seenPaths.has(e.path)) {
      duplicates++;
      console.error(`  ✗ duplicate manifest entry: ${e.path}`);
    } else {
      seenPaths.add(e.path);
    }
    if (!isAllowedLicense(e.license_short) && !isWaived(e.license_short, e.path)) {
      licenseFails++;
      console.error(`  ✗ ${e.path}: license '${e.license_short}' not in allowlist and not waived`);
    }
    // Manifest paths look like /images/foo.jpg → check static/images/foo.jpg.
    const onDiskPath = join('static', e.path.replace(/^\//, ''));
    if (!existsSync(onDiskPath)) {
      missingFiles++;
      console.error(`  ✗ ${e.path}: manifest entry references missing file ${onDiskPath}`);
    }
  }
  provenanceFailed = duplicates + licenseFails + missingFiles;
  if (provenanceFailed === 0) {
    console.log(
      `  ✓ ${manifest.entries.length} provenance entries — licenses allowed, files on disk, no duplicates`,
    );
  } else {
    console.error(
      `  ${provenanceFailed} provenance integrity failure(s) (${duplicates} duplicate, ${licenseFails} license, ${missingFiles} missing-file)`,
    );
  }
}

// ──────────────────────────────────────────────────────────────────────
// ADR-046 Milestone D — text-sources + source-logos integrity
//
// Same fail-closed model as image-provenance:
//   1. Every text-sources license_short must be in the allowlist or
//      have a matching license-waivers row (or be Orrery-Original).
//   2. Every source-logos `id` must be unique.
//   3. Every source-logos `logo_path` (when set) must exist under static/.
// ──────────────────────────────────────────────────────────────────────

let credBomFailed = 0;
const TEXT_SOURCES_PATH = join(DATA_ROOT, 'text-sources.json');
if (existsSync(TEXT_SOURCES_PATH)) {
  console.log('\nValidating text-sources integrity (ADR-046 Milestone D)...');
  type TextRow = { id: string; license_short: string };
  const textSources = JSON.parse(readFileSync(TEXT_SOURCES_PATH, 'utf8')) as {
    entries: TextRow[];
  };
  const seenIds = new Set<string>();
  let dupes = 0;
  let licenseFails = 0;
  for (const e of textSources.entries) {
    if (seenIds.has(e.id)) {
      dupes++;
      console.error(`  ✗ duplicate text-source id: ${e.id}`);
    } else {
      seenIds.add(e.id);
    }
    if (!isAllowedLicense(e.license_short)) {
      licenseFails++;
      console.error(`  ✗ ${e.id}: license '${e.license_short}' not in allowlist`);
    }
  }
  credBomFailed += dupes + licenseFails;
  if (dupes + licenseFails === 0) {
    console.log(
      `  ✓ ${textSources.entries.length} text-source entries — licenses allowed, no duplicates`,
    );
  }
}

const SOURCE_LOGOS_PATH = join(DATA_ROOT, 'source-logos.json');
if (existsSync(SOURCE_LOGOS_PATH)) {
  console.log('\nValidating source-logos integrity (ADR-046 Milestone D)...');
  type LogoRow = { id: string; logo_path?: string };
  const data = JSON.parse(readFileSync(SOURCE_LOGOS_PATH, 'utf8')) as { sources: LogoRow[] };
  const seen = new Set<string>();
  let dupes = 0;
  let missing = 0;
  for (const s of data.sources) {
    if (seen.has(s.id)) {
      dupes++;
      console.error(`  ✗ duplicate source-logo id: ${s.id}`);
    } else {
      seen.add(s.id);
    }
    if (s.logo_path) {
      const onDisk = join('static', s.logo_path.replace(/^\//, ''));
      if (!existsSync(onDisk)) {
        missing++;
        console.error(`  ✗ ${s.id}: logo_path '${s.logo_path}' not found at ${onDisk}`);
      }
    }
  }
  credBomFailed += dupes + missing;
  if (dupes + missing === 0) {
    console.log(`  ✓ ${data.sources.length} source-logo entries — ids unique, logo files on disk`);
  }
}

if (failed + docFailed + missionDriftFailed + provenanceFailed + credBomFailed > 0) process.exit(1);
