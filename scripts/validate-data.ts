/**
 * Validates all data files in data/ against their JSON schemas (ADR-019).
 *
 * Slice 2a scope: mission base files + mission-index + mission overlays.
 * Slice 2b will extend this to validate planet, rocket, earth-object, and
 * moon-site records and their overlays as those schemas are written.
 *
 * Run via: npm run validate-data
 * CI: blocks PR on any validation failure.
 */

import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);

function loadSchema(name: string): AnySchema {
  return JSON.parse(readFileSync(join('data/schemas', name), 'utf8'));
}

const missionSchema = loadSchema('mission.schema.json');
const missionIndexSchema = loadSchema('mission-index.schema.json');
const missionOverlaySchema = loadSchema('mission-overlay.schema.json');
const planetsSchema = loadSchema('planets.schema.json');
const rocketSchema = loadSchema('rocket.schema.json');
const rocketOverlaySchema = loadSchema('rocket-overlay.schema.json');
const earthObjectSchema = loadSchema('earth-object.schema.json');
const earthObjectOverlaySchema = loadSchema('earth-object-overlay.schema.json');
const moonSiteSchema = loadSchema('moon-site.schema.json');
const moonSiteOverlaySchema = loadSchema('moon-site-overlay.schema.json');

const validateMission = ajv.compile(missionSchema);
const validateMissionIndex = ajv.compile(missionIndexSchema);
const validateMissionOverlay = ajv.compile(missionOverlaySchema);
const validatePlanets = ajv.compile(planetsSchema);
const validateRockets = ajv.compile(rocketSchema);
const validateRocketOverlay = ajv.compile(rocketOverlaySchema);
const validateEarthObjects = ajv.compile(earthObjectSchema);
const validateEarthObjectOverlay = ajv.compile(earthObjectOverlaySchema);
const validateMoonSites = ajv.compile(moonSiteSchema);
const validateMoonSiteOverlay = ajv.compile(moonSiteOverlaySchema);

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

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => join(dir, f));
}

console.log('Validating data...');

// 0. Reference data
validateFile('data/planets.json', validatePlanets);
validateFile('data/rockets.json', validateRockets);
validateFile('data/earth-objects.json', validateEarthObjects);
validateFile('data/moon-sites.json', validateMoonSites);

// 1. Mission index
validateFile('data/missions/index.json', validateMissionIndex);

// 2. Mission base files (per destination)
for (const dest of ['mars', 'moon']) {
  for (const file of listJson(`data/missions/${dest}`)) {
    validateFile(file, validateMission);
  }
}

// 3. Mission overlay files (per locale, per destination)
const i18nDir = 'data/i18n';
if (existsSync(i18nDir)) {
  for (const locale of readdirSync(i18nDir)) {
    for (const dest of ['mars', 'moon']) {
      for (const file of listJson(join(i18nDir, locale, 'missions', dest))) {
        validateFile(file, validateMissionOverlay);
      }
    }
  }
}

// 4. Rocket overlay files (per locale)
if (existsSync(i18nDir)) {
  for (const locale of readdirSync(i18nDir)) {
    for (const file of listJson(join(i18nDir, locale, 'rockets'))) {
      validateFile(file, validateRocketOverlay);
    }
  }
}

// 5. Earth-object overlay files (per locale)
if (existsSync(i18nDir)) {
  for (const locale of readdirSync(i18nDir)) {
    for (const file of listJson(join(i18nDir, locale, 'earth-objects'))) {
      validateFile(file, validateEarthObjectOverlay);
    }
  }
}

// 6. Moon-site overlay files (per locale)
if (existsSync(i18nDir)) {
  for (const locale of readdirSync(i18nDir)) {
    for (const file of listJson(join(i18nDir, locale, 'moon-sites'))) {
      validateFile(file, validateMoonSiteOverlay);
    }
  }
}

console.log(`\n${passed} files passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
