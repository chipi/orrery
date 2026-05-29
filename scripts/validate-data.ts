/**
 * Validates all data files under static/data/ against their JSON schemas (ADR-019).
 *
 * Run via: npm run validate-data
 * CI: blocks PR on any validation failure.
 */

import Ajv, { type AnySchema, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { execSync } from 'node:child_process';
import {
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
  openSync,
  readSync,
  closeSync,
} from 'node:fs';
import { join } from 'node:path';
import { isAllowedLicense } from './license-allowlist.js';
import { isJpegBytes } from './lib/image-bytes.ts';
import {
  findBidirectionalFleetMissionDrift,
  findBidirectionalFleetSiteDrift,
  findProvenanceFailures,
  findLaunchesMissingPrimaryProvenance,
  findLaunchesMissingCitations,
  findLaunchesOrphanLauncherRefs,
  findLaunchesOrphanRocketMappingTargets,
  type FleetRef,
  type LicenseWaiver,
  type SiteType,
  type ProvenanceRow,
  type LaunchEntryMinimal,
} from './validate-data-helpers.js';

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
const issVisitorSchema = loadSchema('iss-visitor.schema.json');
// PRD-011 / ADR-049 — Tiangong Explorer.
const tiangongModuleSchema = loadSchema('tiangong-module.schema.json');
const tiangongModuleOverlaySchema = loadSchema('tiangong-module-overlay.schema.json');
const tiangongVisitorSchema = loadSchema('tiangong-visitor.schema.json');
// PRD-008 / ADR-034 — /science encyclopedia.
const scienceSectionSchema = loadSchema('science-section.schema.json');
const scienceSectionOverlaySchema = loadSchema('science-section-overlay.schema.json');
const scienceTabIntroSchema = loadSchema('science-tab-intro.schema.json');
const scienceLandingSchema = loadSchema('science-landing.schema.json');
// ADR-046 Milestone C — image provenance + license stewardship.
const imageProvenanceSchema = loadSchema('image-provenance.schema.json');
const licenseWaiversSchema = loadSchema('license-waivers.schema.json');
// ADR-046 Milestone D — public credits page manifests.
const sourceLogosSchema = loadSchema('source-logos.schema.json');
const textSourcesSchema = loadSchema('text-sources.schema.json');
// ADR-051 Milestone L-B — outbound LEARN-link provenance.
const linkProvenanceSchema = loadSchema('link-provenance.schema.json');
// PRD-012 v0.2 / RFC-016 v0.2 — Spaceflight Fleet (/fleet).
const fleetEntrySchema = loadSchema('fleet-entry.schema.json');
const fleetIndexSchema = loadSchema('fleet-index.schema.json');
const fleetOverlaySchema = loadSchema('fleet-overlay.schema.json');
// PRD-020 / RFC-023 — Launches Calendar (multi-source agency-first pipeline).
const launchSchema = loadSchema('launch.schema.json');
const launchesCurationSchema = loadSchema('launches-curation.schema.json');
const launchesRocketMappingSchema = loadSchema('launches-rocket-mapping.schema.json');

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
const validateIssVisitors = ajv.compile(issVisitorSchema);
const validateTiangongModules = ajv.compile(tiangongModuleSchema);
const validateTiangongModuleOverlay = ajv.compile(tiangongModuleOverlaySchema);
const validateTiangongVisitors = ajv.compile(tiangongVisitorSchema);
const validateScienceSection = ajv.compile(scienceSectionSchema);
const validateScienceSectionOverlay = ajv.compile(scienceSectionOverlaySchema);
const validateScienceTabIntro = ajv.compile(scienceTabIntroSchema);
const validateScienceLanding = ajv.compile(scienceLandingSchema);
const validateImageProvenance = ajv.compile(imageProvenanceSchema);
const validateLicenseWaivers = ajv.compile(licenseWaiversSchema);
const validateSourceLogos = ajv.compile(sourceLogosSchema);
const validateTextSources = ajv.compile(textSourcesSchema);
const validateLinkProvenance = ajv.compile(linkProvenanceSchema);
const validateFleetEntry = ajv.compile(fleetEntrySchema);
const validateFleetIndex = ajv.compile(fleetIndexSchema);
const validateFleetOverlay = ajv.compile(fleetOverlaySchema);
const validateLaunches = ajv.compile(launchSchema);
const validateLaunchesCuration = ajv.compile(launchesCurationSchema);
const validateLaunchesRocketMapping = ajv.compile(launchesRocketMappingSchema);

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

// ADR-058 / GH #107 — Tier 2 cislunar trajectory consistency checks.
// JSON Schema catches shape (array-of-4-tuple-of-number). The shape
// alone permits malformed sequences (unsorted, missing launch anchor,
// last-point past round-trip duration). These three invariants are
// what the renderer's buildFromWaypoints assumes — violating any of
// them produces a silently-wrong trajectory rather than a crash.
//
// Skipped when waypoints_km absent (Tier 1 analytic missions are
// parametric, no waypoint array). When waypoints_km IS present, the
// invariants apply regardless of source_tier (tier_1_5_hybrid +
// tier_2_published both populate waypoints_km).
function checkCislunarWaypoints(file: string): void {
  const m = readJson(file) as {
    id?: string;
    transit_days?: number; // top-level per mission schema
    flight?: {
      events?: Array<{ met_days?: number; type?: string }>;
      arrival?: { type?: string };
      cislunar_profile?: {
        source_tier?: string;
        return?: { type?: string };
        waypoints_km?: Array<[number, number, number, number]>;
      };
    };
  };
  const profile = m.flight?.cislunar_profile;
  if (!profile?.waypoints_km) return;
  const wp = profile.waypoints_km;
  if (wp.length < 2) {
    failed++;
    console.error(`\n  ✗ ${file}`);
    console.error(`      /flight/cislunar_profile waypoints_km requires ≥2 entries when present`);
    return;
  }
  const violations: string[] = [];
  // Sort: strictly increasing met_days.
  for (let i = 1; i < wp.length; i++) {
    if (wp[i][0] <= wp[i - 1][0]) {
      violations.push(
        `waypoints_km[${i}].met_days (${wp[i][0]}) must be > waypoints_km[${i - 1}].met_days (${wp[i - 1][0]})`,
      );
      break; // one error per file is enough; the operator can re-sort
    }
  }
  // Endpoint 1: launch anchor at MET 0.
  if (wp[0][0] !== 0) {
    violations.push(`waypoints_km[0].met_days must be 0 (launch), got ${wp[0][0]}`);
  }
  // Endpoint 2: last sample within mission window.
  // Round-trip missions (return.type=tei_*) cap at 2× transit_days; one-way at 1×.
  // transit_days is the outbound-only duration in the mission schema and
  // lives at the top of the mission JSON (not under flight).
  // Some published timelines extend beyond transit × multiplier (Apollo 13
  // free-return swing; Apollo 17 surface stay; etc.). The generator extends
  // the window to cover the latest event MET — the validator allows the
  // same: cap = max(transit × multiplier × 1.05, latest_event_met × 1.1).
  const transit = m.transit_days;
  if (typeof transit === 'number' && transit > 0) {
    const isRoundTrip =
      m.flight?.arrival?.type === 'landing' ||
      (m.flight?.cislunar_profile?.return?.type &&
        m.flight.cislunar_profile.return.type !== 'none');
    const transitCap = (isRoundTrip ? transit * 2 : transit) * 1.05;
    const latestEventMet = (m.flight?.events ?? [])
      .map((e) => e.met_days)
      .filter((v): v is number => typeof v === 'number')
      .reduce((max, v) => (v > max ? v : max), 0);
    const eventCap = latestEventMet * 1.1;
    const cap = Math.max(transitCap, eventCap);
    const lastMet = wp[wp.length - 1][0];
    if (lastMet > cap) {
      violations.push(
        `waypoints_km[last].met_days (${lastMet}) exceeds mission window cap (${cap.toFixed(2)} = max(transit×${isRoundTrip ? 2 : 1}×1.05, latest_event_met×1.1))`,
      );
    }
  }
  // Budget: GH #107 specifies ~50-100 waypoints. Hard cap at 200 to
  // catch accidental over-sampling (memory + render cost).
  if (wp.length > 200) {
    violations.push(`waypoints_km has ${wp.length} entries; cap is 200`);
  }
  if (violations.length > 0) {
    failed++;
    console.error(`\n  ✗ ${file}`);
    for (const v of violations) console.error(`      ${v}`);
  } else {
    passed++;
  }
}

// #107 Step 6d — interplanetary waypoint invariants. Parallels
// checkCislunarWaypoints but for flight.interplanetary_profile
// .waypoints_helio_au (Mars + outer-system missions). Same gating
// pattern: skipped when waypoints_helio_au absent.
function checkInterplanetaryWaypoints(file: string): void {
  const m = readJson(file) as {
    id?: string;
    transit_days?: number;
    flight?: {
      events?: Array<{ met_days?: number; type?: string }>;
      interplanetary_profile?: {
        source_tier?: string;
        waypoints_helio_au?: Array<[number, number, number, number]>;
      };
    };
  };
  const profile = m.flight?.interplanetary_profile;
  if (!profile?.waypoints_helio_au) return;
  const wp = profile.waypoints_helio_au;
  if (wp.length < 2) {
    failed++;
    console.error(`\n  ✗ ${file}`);
    console.error(
      `      /flight/interplanetary_profile waypoints_helio_au requires ≥2 entries when present`,
    );
    return;
  }
  const violations: string[] = [];
  // Strictly-increasing MET.
  for (let i = 1; i < wp.length; i++) {
    if (wp[i][0] <= wp[i - 1][0]) {
      violations.push(
        `waypoints_helio_au[${i}].met_days (${wp[i][0]}) must be > waypoints_helio_au[${i - 1}].met_days (${wp[i - 1][0]})`,
      );
      break;
    }
  }
  // Launch anchor at MET 0.
  if (wp[0][0] !== 0) {
    violations.push(`waypoints_helio_au[0].met_days must be 0 (launch), got ${wp[0][0]}`);
  }
  // Mission window: max(transit_days × 1, latest_event_met × 1.1).
  // No round-trip multiplier — Mars/outer-system are one-way today
  // (Step 6h opens that door when sample-return missions land).
  const transit = m.transit_days;
  if (typeof transit === 'number' && transit > 0) {
    const latestEventMet = (m.flight?.events ?? [])
      .map((e) => e.met_days)
      .filter((v): v is number => typeof v === 'number')
      .reduce((max, v) => (v > max ? v : max), 0);
    const cap = Math.max(transit * 1.05, latestEventMet * 1.1);
    const lastMet = wp[wp.length - 1][0];
    if (lastMet > cap) {
      violations.push(
        `waypoints_helio_au[last].met_days (${lastMet}) exceeds mission window cap (${cap.toFixed(2)} = max(transit_days × 1.05, latest_event_met × 1.1))`,
      );
    }
  }
  // Coordinate sanity: heliocentric AU magnitudes should be < 50 (Pluto ~40 AU).
  for (let i = 0; i < wp.length; i++) {
    const r = Math.hypot(wp[i][1], wp[i][2], wp[i][3]);
    if (!Number.isFinite(r) || r > 50 || r < 0.1) {
      violations.push(
        `waypoints_helio_au[${i}] heliocentric radius ${r.toFixed(3)} AU is outside [0.1, 50] AU`,
      );
      break;
    }
  }
  if (wp.length > 200) {
    violations.push(`waypoints_helio_au has ${wp.length} entries; cap is 200`);
  }
  if (violations.length > 0) {
    failed++;
    console.error(`\n  ✗ ${file}`);
    for (const v of violations) console.error(`      ${v}`);
  } else {
    passed++;
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
validateFile(join(DATA_ROOT, 'iss-visitors.json'), validateIssVisitors);
validateFile(join(DATA_ROOT, 'tiangong-modules.json'), validateTiangongModules);
validateFile(join(DATA_ROOT, 'tiangong-visitors.json'), validateTiangongVisitors);
// ADR-046 Milestone C: image provenance + license waivers.
validateFile(join(DATA_ROOT, 'image-provenance.json'), validateImageProvenance);
validateFile(join(DATA_ROOT, 'license-waivers.json'), validateLicenseWaivers);
// ADR-046 Milestone D: public /credits manifests.
validateFile(join(DATA_ROOT, 'source-logos.json'), validateSourceLogos);
validateFile(join(DATA_ROOT, 'text-sources.json'), validateTextSources);
// ADR-051 Milestone L-B: outbound LEARN-link provenance manifest.
validateFile(join(DATA_ROOT, 'link-provenance.json'), validateLinkProvenance);
// PRD-020 / RFC-023: launches manifest + curation override + rocket mapping.
validateFile(join(DATA_ROOT, 'launches.json'), validateLaunches);
validateFile(join(DATA_ROOT, 'launches-curation.json'), validateLaunchesCuration);
validateFile(join(DATA_ROOT, 'launches-rocket-mapping.json'), validateLaunchesRocketMapping);

// Scenario base records
for (const file of listJson(join(DATA_ROOT, 'scenarios'))) {
  validateFile(file, validateScenario);
}

// /science encyclopedia (PRD-008 / ADR-034) — base sections under
// science/[tab]/[id].json. Skip _index.json files which have a
// different shape.
const SCIENCE_TABS_DIR = join(DATA_ROOT, 'science');
if (existsSync(SCIENCE_TABS_DIR)) {
  for (const tab of readdirSync(SCIENCE_TABS_DIR)) {
    const tabDir = join(SCIENCE_TABS_DIR, tab);
    if (!statSync(tabDir).isDirectory()) continue;
    for (const file of listJson(tabDir)) {
      if (file.endsWith('_index.json')) continue;
      validateFile(file, validateScienceSection);
    }
  }
}

// Pre-computed porkchop grids (v0.1.6 / ADR-026). Generated by
// scripts/precompute-porkchops.ts; consumed by /plan via getPorkchopGrid.
for (const file of listJson(join(DATA_ROOT, 'porkchop'))) {
  validateFile(file, validatePorkchop);
}

// PRD-012 v0.2 — Spaceflight Fleet index + per-entry detail files.
// Index lives at static/data/fleet/index.json; per-entry files under
// static/data/fleet/{category}/{id}.json. Categories follow the
// fleet-entry schema's enum (launcher / crewed-spacecraft / etc).
const FLEET_DIR = join(DATA_ROOT, 'fleet');
const FLEET_INDEX_PATH = join(FLEET_DIR, 'index.json');
validateFile(FLEET_INDEX_PATH, validateFleetIndex);

const FLEET_CATEGORIES = [
  'launcher',
  'crewed-spacecraft',
  'cargo-spacecraft',
  'station',
  'rover',
  'lander',
  'orbiter',
  'observatory',
  'space-suit',
  'constellation',
];

type FleetLinkedSite = { type: 'moon' | 'mars' | 'earth-object'; site_id: string };
const fleetEntries: Array<{
  id: string;
  category: string;
  linked_missions?: string[];
  linked_sites?: FleetLinkedSite[];
}> = [];
for (const category of FLEET_CATEGORIES) {
  for (const file of listJson(join(FLEET_DIR, category))) {
    validateFile(file, validateFleetEntry);
    try {
      const entry = readJson(file) as {
        id: string;
        category: string;
        linked_missions?: string[];
        linked_sites?: FleetLinkedSite[];
      };
      fleetEntries.push(entry);
    } catch {
      // schema validation already reported the parse error
    }
  }
}

// Fleet integrity: index records and per-entry files must match 1:1 by id.
if (existsSync(FLEET_INDEX_PATH)) {
  try {
    const indexRecords = readJson(FLEET_INDEX_PATH) as Array<{ id: string; category: string }>;
    const indexIds = new Set(indexRecords.map((r) => r.id));
    const entryIds = new Set(fleetEntries.map((e) => e.id));
    const missingDetail = [...indexIds].filter((id) => !entryIds.has(id));
    const orphanDetail = [...entryIds].filter((id) => !indexIds.has(id));
    if (missingDetail.length > 0) {
      console.error(
        `\n  ✗ fleet/index.json: ${missingDetail.length} index entries lack a detail file`,
      );
      console.error(`      missing: ${missingDetail.join(', ')}`);
      failed += 1;
    }
    if (orphanDetail.length > 0) {
      console.error(`\n  ✗ fleet detail files: ${orphanDetail.length} entries not in index.json`);
      console.error(`      orphans: ${orphanDetail.join(', ')}`);
      failed += 1;
    }
    // Category mismatch: index says "launcher" but file lives under "rover/".
    const indexById = new Map(indexRecords.map((r) => [r.id, r.category]));
    for (const entry of fleetEntries) {
      const idxCat = indexById.get(entry.id);
      if (idxCat && idxCat !== entry.category) {
        console.error(`\n  ✗ fleet/${entry.category}/${entry.id}.json: category mismatch`);
        console.error(`      index says "${idxCat}", entry says "${entry.category}"`);
        failed += 1;
      }
    }
  } catch {
    // index parse error already reported by validateFile above
  }
}

// 1. Mission index
validateFile(join(DATA_ROOT, 'missions/index.json'), validateMissionIndex);

// 2. Mission base files (per destination)
const missionDataDirs = listMissionDataDirs();
const missionIds = new Set<string>();
const missionFleetRefs = new Map<string, FleetRef[]>();
for (const dest of missionDataDirs) {
  for (const file of listJson(join(DATA_ROOT, 'missions', dest))) {
    validateFile(file, validateMission);
    checkCislunarWaypoints(file);
    checkInterplanetaryWaypoints(file);
    try {
      const mission = readJson(file) as { id: string; fleet_refs?: FleetRef[] };
      missionIds.add(mission.id);
      if (mission.fleet_refs && mission.fleet_refs.length > 0) {
        missionFleetRefs.set(mission.id, mission.fleet_refs);
      }
    } catch {
      // schema validation already reported the parse error
    }
  }
}

// PRD-012 v0.2 / RFC-016 v0.2 OQ-2 — fleet ↔ missions BIDIRECTIONAL
// cross-reference integrity (pure detector in `validate-data-helpers.ts`,
// console templating below). Three checks:
//
//   1. Every fleet_entry.linked_missions[*] resolves to a real mission.
//   2. Every mission.fleet_refs[*].id resolves to a real fleet entry.
//   3. SYMMETRY: if mission M references fleet F via fleet_refs, then
//      F's linked_missions MUST include M.
const missionDrift = findBidirectionalFleetMissionDrift({
  missionIds,
  missionFleetRefs,
  fleetEntries,
});
// Aggregate Check-1 errors per fleet entry so the existing
// "X unresolved IDs · dangling: a, b, c" message shape is preserved.
const linkedMissionFailsByFleetId = new Map<string, { category: string; missing: string[] }>();
for (const err of missionDrift) {
  if (err.kind === 'fleet-linked-mission-unresolved') {
    const existing = linkedMissionFailsByFleetId.get(err.fleet_id);
    if (existing) {
      existing.missing.push(err.missing_mission_id);
    } else {
      linkedMissionFailsByFleetId.set(err.fleet_id, {
        category: err.fleet_category,
        missing: [err.missing_mission_id],
      });
    }
  }
}
for (const [fleetId, { category, missing }] of linkedMissionFailsByFleetId) {
  console.error(
    `\n  ✗ fleet/${category}/${fleetId}.json: linked_missions has ${missing.length} unresolved IDs`,
  );
  console.error(`      dangling: ${missing.join(', ')}`);
  failed += 1;
}
for (const err of missionDrift) {
  if (err.kind === 'mission-fleet-ref-unresolved') {
    console.error(
      `\n  ✗ mission ${err.mission_id}: fleet_refs id "${err.fleet_id}" (role ${err.role}) does not resolve to fleet/index.json`,
    );
    failed += 1;
  } else if (err.kind === 'bidirectional-drift-mission') {
    console.error(
      `\n  ✗ bidirectional drift: mission ${err.mission_id} references fleet ${err.fleet_id} (${err.role}), but ${err.fleet_id}.linked_missions does not include ${err.mission_id}`,
    );
    console.error(
      `      fix: re-run \`npx tsx scripts/migrate-fleet-linked-missions.ts\` to derive linked_missions from fleet_refs`,
    );
    failed += 1;
  }
}

// PRD-012 v0.2 / RFC-016 v0.2 OQ-16 — fleet ↔ surface markers / orbital
// objects BIDIRECTIONAL cross-reference integrity (Phase K). Pure detector
// in `validate-data-helpers.ts`; this block loads the data + formats the
// console output.
type SiteSource = { type: SiteType; path: string };
const SITE_SOURCES: SiteSource[] = [
  { type: 'moon', path: join(DATA_ROOT, 'moon-sites.json') },
  { type: 'mars', path: join(DATA_ROOT, 'mars-sites.json') },
  { type: 'earth-object', path: join(DATA_ROOT, 'earth-objects.json') },
];

const siteFleetRefs = new Map<string, Array<{ type: SiteType; refs: FleetRef[] }>>();
const siteIdsByType = new Map<SiteType, Set<string>>();
for (const src of SITE_SOURCES) {
  if (!existsSync(src.path)) continue;
  const records = readJson(src.path) as Array<{ id: string; fleet_refs?: FleetRef[] }>;
  const ids = new Set<string>();
  for (const rec of records) {
    ids.add(rec.id);
    if (!rec.fleet_refs || rec.fleet_refs.length === 0) continue;
    const existing = siteFleetRefs.get(rec.id) ?? [];
    existing.push({ type: src.type, refs: rec.fleet_refs });
    siteFleetRefs.set(rec.id, existing);
  }
  siteIdsByType.set(src.type, ids);
}

const siteDrift = findBidirectionalFleetSiteDrift({
  siteIdsByType,
  siteFleetRefs,
  fleetEntries,
});
for (const err of siteDrift) {
  if (err.kind === 'fleet-linked-site-unresolved') {
    console.error(
      `\n  ✗ fleet/${err.fleet_category}/${err.fleet_id}.json: linked_sites entry ${err.site_type}::${err.site_id} does not resolve`,
    );
    failed += 1;
  } else if (err.kind === 'site-fleet-ref-unresolved') {
    console.error(
      `\n  ✗ ${err.site_type} site ${err.site_id}: fleet_refs id "${err.fleet_id}" (role ${err.role}) does not resolve to fleet/index.json`,
    );
    failed += 1;
  } else if (err.kind === 'bidirectional-drift-site') {
    console.error(
      `\n  ✗ bidirectional drift: ${err.site_type} site ${err.site_id} references fleet ${err.fleet_id} (${err.role}), but ${err.fleet_id}.linked_sites does not include {type:"${err.site_type}", site_id:"${err.site_id}"}`,
    );
    console.error(
      `      fix: re-run \`npx tsx scripts/migrate-fleet-linked-sites.ts\` to derive linked_sites from fleet_refs`,
    );
    failed += 1;
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
    // ISS visitor overlays (same overlay shape as modules)
    const issVisitorOvDir = join(i18nDir, locale, 'iss-visitors');
    if (existsSync(issVisitorOvDir)) {
      for (const file of listJson(issVisitorOvDir)) {
        validateFile(file, validateIssModuleOverlay);
      }
    }
    // Tiangong module overlays (PRD-011 / ADR-049)
    const tiangongOvDir = join(i18nDir, locale, 'tiangong-modules');
    if (existsSync(tiangongOvDir)) {
      for (const file of listJson(tiangongOvDir)) {
        validateFile(file, validateTiangongModuleOverlay);
      }
    }
    // Tiangong visitor overlays (same overlay shape as modules)
    const tiangongVisitorOvDir = join(i18nDir, locale, 'tiangong-visitors');
    if (existsSync(tiangongVisitorOvDir)) {
      for (const file of listJson(tiangongVisitorOvDir)) {
        validateFile(file, validateTiangongModuleOverlay);
      }
    }
    // Fleet overlays per locale (PRD-012 v0.2 Phase G). Nested by
    // category subdirectory matching static/data/fleet/{category}/{id}.json.
    const fleetOvDir = join(i18nDir, locale, 'fleet');
    if (existsSync(fleetOvDir)) {
      for (const cat of readdirSync(fleetOvDir)) {
        const catDir = join(fleetOvDir, cat);
        if (!statSync(catDir).isDirectory()) continue;
        for (const file of listJson(catDir)) {
          validateFile(file, validateFleetOverlay);
        }
      }
    }
    // /science overlays per locale (PRD-008 / ADR-017): nested by tab.
    // _intro.json holds the tab-level 101 lead-in and validates against a
    // separate schema; everything else in the tab dir is a section overlay.
    // _landing.json (at the top of /science/) is the editorial Space-101
    // narrative and validates against its own schema.
    const scienceOvDir = join(i18nDir, locale, 'science');
    if (existsSync(scienceOvDir)) {
      // Top-level loose files (currently just _landing.json).
      for (const file of listJson(scienceOvDir)) {
        if (file.endsWith('/_landing.json')) {
          validateFile(file, validateScienceLanding);
        }
      }
      for (const tab of readdirSync(scienceOvDir)) {
        const tabOvDir = join(scienceOvDir, tab);
        if (!statSync(tabOvDir).isDirectory()) continue;
        for (const file of listJson(tabOvDir)) {
          if (file.endsWith('/_intro.json')) {
            validateFile(file, validateScienceTabIntro);
          } else {
            validateFile(file, validateScienceSectionOverlay);
          }
        }
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

// Files git is actually tracking under each docs subdir. Built once
// and cached so repeated calls don't fork `git ls-files` per check.
// Scoping to tracked files (issue #136) means untracked drafts a
// parallel agent left in your worktree don't block your push — the
// pre-push hook only refuses checked-in files that miss the gating
// sentence. Staged-but-uncommitted files are still tracked (they
// appear in `git ls-files`), so a contributor staging a non-conformant
// PRD still gets blocked.
let trackedDocFilesCache: Set<string> | null = null;
function trackedDocFiles(): Set<string> {
  if (trackedDocFilesCache) return trackedDocFilesCache;
  try {
    const out = execSync('git ls-files docs/prd docs/rfc docs/adr', {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    trackedDocFilesCache = new Set(
      out
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean),
    );
  } catch {
    // Not in a git checkout (e.g. CI shallow clone failure) — fall
    // back to the filesystem walk so the check still catches gating-
    // sentence regressions. The untracked-drafts escape hatch is a
    // nice-to-have, gating-sentence enforcement is mandatory.
    trackedDocFilesCache = null;
  }
  return trackedDocFilesCache ?? new Set();
}

function checkDocsHaveText(
  globDir: string,
  mustInclude: string,
  label: string,
  options: { skipClosedDecided?: boolean; excludeFiles?: string[] } = {},
) {
  if (!existsSync(globDir)) return;
  const exclude = new Set(['index.md', ...(options.excludeFiles ?? [])]);
  const tracked = trackedDocFiles();
  // When git ls-files succeeded, scope to the intersection of (tracked
  // files) and (files on disk under globDir). When it failed (no git
  // metadata), fall back to the filesystem-only walk.
  const onDisk = readdirSync(globDir).filter((f) => f.endsWith('.md') && !exclude.has(f));
  const files = tracked.size > 0 ? onDisk.filter((f) => tracked.has(`${globDir}/${f}`)) : onDisk;
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

  const waiversRaw: LicenseWaiver[] = existsSync(join(DATA_ROOT, 'license-waivers.json'))
    ? ((
        JSON.parse(readFileSync(join(DATA_ROOT, 'license-waivers.json'), 'utf8')) as {
          waivers?: LicenseWaiver[];
        }
      ).waivers ?? [])
    : [];
  const manifest = JSON.parse(readFileSync(PROVENANCE_PATH, 'utf8')) as {
    entries: ProvenanceRow[];
  };

  const provenanceFailures = findProvenanceFailures({
    entries: manifest.entries,
    waivers: waiversRaw,
    isAllowed: isAllowedLicense,
    existsOnDisk: existsSync,
  });
  let duplicates = 0;
  let licenseFails = 0;
  let missingFiles = 0;
  for (const f of provenanceFailures) {
    if (f.kind === 'duplicate-path') {
      duplicates++;
      console.error(`  ✗ duplicate manifest entry: ${f.path}`);
    } else if (f.kind === 'license-not-allowed') {
      licenseFails++;
      console.error(`  ✗ ${f.path}: license '${f.license_short}' not in allowlist and not waived`);
    } else if (f.kind === 'missing-file') {
      missingFiles++;
      console.error(`  ✗ ${f.path}: manifest entry references missing file ${f.on_disk_path}`);
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

// ──────────────────────────────────────────────────────────────────────
// ADR-051 Milestone L-B — outbound LEARN-link provenance integrity
//
// On top of the JSON-schema check, enforce four runtime invariants:
//   1. Every entry.source_id resolves in source-logos.json.
//   2. Every entry.url has been canonicalised — no surviving tracker
//      params (utm_*, fbclid, etc.) and no AMP suffix.
//   3. No duplicate (entity_id, url) pairs.
//   4. Every entry.language is BCP-47 (or '*' for multi-lingual).
// L-E adds (below): a soft freshness audit — every intro/core entry
// should have last_verified within FRESHNESS_DAYS, and the link-check
// report should exist. Reported as a warning, not a hard fail, so a
// stale CI doesn't break PR builds; the npm fetch chain re-runs the
// checker which refreshes the field.
// ──────────────────────────────────────────────────────────────────────

let linkProvenanceFailed = 0;
const LINK_PROVENANCE_PATH = join(DATA_ROOT, 'link-provenance.json');
if (existsSync(LINK_PROVENANCE_PATH)) {
  console.log('\nValidating link-provenance integrity (ADR-051 Milestone L-B)...');

  type LinkRow = {
    id: string;
    entity_id: string;
    url: string;
    source_id: string;
    language: string;
  };

  const SOURCE_LOGOS_PATH_LOCAL = join(DATA_ROOT, 'source-logos.json');
  const knownSources: Set<string> = (() => {
    if (!existsSync(SOURCE_LOGOS_PATH_LOCAL)) return new Set();
    const j = JSON.parse(readFileSync(SOURCE_LOGOS_PATH_LOCAL, 'utf8')) as {
      sources: { id: string }[];
    };
    return new Set(j.sources.map((s) => s.id));
  })();

  const manifest = JSON.parse(readFileSync(LINK_PROVENANCE_PATH, 'utf8')) as {
    entries: LinkRow[];
  };

  const seenKeys = new Set<string>();
  let unknownSources = 0;
  let trackerSurvivors = 0;
  let duplicates = 0;
  let badLanguages = 0;
  // BCP-47 tag pattern (loose): primary subtag 2-3 letters, optional region/variant.
  const bcp47 = /^([a-z]{2,3}(-[A-Z][a-z]{3})?(-[A-Z]{2}|[0-9]{3})?(-[A-Za-z0-9]{5,8})*|\*)$/;
  const tracker = /[?&](utm_[a-z]+|fbclid|gclid|mc_[ce]id|_ga)=/i;

  for (const e of manifest.entries) {
    const key = `${e.entity_id}__${e.url}`;
    if (seenKeys.has(key)) {
      duplicates++;
      console.error(`  ✗ duplicate (entity_id, url): ${key}`);
    } else {
      seenKeys.add(key);
    }
    if (!knownSources.has(e.source_id)) {
      unknownSources++;
      console.error(`  ✗ ${e.id}: source_id '${e.source_id}' not in source-logos.json`);
    }
    if (tracker.test(e.url) || /\/amp\/?($|\?)/i.test(e.url)) {
      trackerSurvivors++;
      console.error(`  ✗ ${e.id}: url '${e.url}' carries tracker params or /amp suffix`);
    }
    if (!bcp47.test(e.language)) {
      badLanguages++;
      console.error(`  ✗ ${e.id}: language '${e.language}' is not BCP-47 (or '*')`);
    }
  }
  linkProvenanceFailed = unknownSources + trackerSurvivors + duplicates + badLanguages;
  if (linkProvenanceFailed === 0) {
    console.log(
      `  ✓ ${manifest.entries.length} link-provenance entries — sources resolved, URLs canonical, no duplicates, languages BCP-47`,
    );
  } else {
    console.error(
      `  ${linkProvenanceFailed} link-provenance integrity failure(s) (${duplicates} dupes, ${unknownSources} unknown source, ${trackerSurvivors} tracker survivors, ${badLanguages} bad language)`,
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // L-E freshness audit (soft) — every intro/core entry should have
  // last_verified within the policy window. Logged as a warning so a
  // stale `last-link-check.md` doesn't block PR builds; the CI nightly
  // job (`npm run fetch`) regenerates the field. The hard rule lives
  // outside ajv because it's a temporal property, not a schema one.
  // ────────────────────────────────────────────────────────────────────
  const FRESHNESS_DAYS = 180;
  const FRESHNESS_REPORT = join('docs/provenance', 'last-link-check.md');
  type LinkRowFresh = LinkRow & {
    tier: 'intro' | 'core' | 'deep';
    last_verified: string;
  };
  const fullManifest = manifest as { entries: LinkRowFresh[] };
  const cutoff = new Date(Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000);
  const stale = fullManifest.entries.filter((e) => {
    if (e.tier === 'deep') return false;
    const t = new Date(e.last_verified);
    return Number.isFinite(t.getTime()) && t < cutoff;
  });
  if (stale.length > 0) {
    console.warn(
      `  ⚠ ${stale.length} intro/core entry/-ies with last_verified older than ${FRESHNESS_DAYS} days — run \`npm run check-learn-links -- --update\` (warning only).`,
    );
  } else {
    console.log(`  ✓ all intro/core entries verified within ${FRESHNESS_DAYS} days`);
  }
  if (!existsSync(FRESHNESS_REPORT)) {
    console.warn(
      `  ⚠ ${FRESHNESS_REPORT} missing — link checker has never run. Run \`npm run check-learn-links\` (warning only).`,
    );
  }
}

// ──────────────────────────────────────────────────────────────────────
// PRD-020 / RFC-023 — Launches manifest integrity (S1 gates)
//
// Schema validation already happens in the top reference-data block.
// These runtime gates layer on the constraints schema can't easily
// express:
//   1. Every launch entry's provenance_chain must contain ≥ 1 entry
//      with role ∈ { 'primary', 'fallback-primary' }. Catches the
//      future bug where a provider strips the role.
//   2. CC-BY compliance: every distinct `source` value referenced by
//      any entry must have a corresponding text-sources.json entry
//      keyed as `launches.source.<source-name>`. This is the McDowell-
//      citation ship-gate from PRD-020 M14.
//   3. Every non-null orrery_launcher_ref must resolve to a real
//      fleet launcher file (catches mapping bugs early).
//   4. Every launches-rocket-mapping target id must exist as a
//      fleet launcher file.
//   5. Curation file: every override launch_id is a syntactically
//      valid stable id (covered by schema); referenced ids that
//      don't yet exist in the manifest are a WARN, not a fail
//      (a curated upcoming launch can slip to historic between
//      fetches — RFC-023 §13).
// ──────────────────────────────────────────────────────────────────────

let launchesFailed = 0;
const LAUNCHES_PATH = join(DATA_ROOT, 'launches.json');
const LAUNCHES_CURATION_PATH = join(DATA_ROOT, 'launches-curation.json');
const LAUNCHES_ROCKET_MAPPING_PATH = join(DATA_ROOT, 'launches-rocket-mapping.json');
const TEXT_SOURCES_PATH_FOR_LAUNCHES = join(DATA_ROOT, 'text-sources.json');

function fleetLauncherExists(launcherId: string): boolean {
  return existsSync(join(DATA_ROOT, 'fleet', 'launcher', `${launcherId}.json`));
}

if (existsSync(LAUNCHES_PATH)) {
  console.log('\nValidating launches integrity (PRD-020 / RFC-023)...');

  const launches = readJson(LAUNCHES_PATH) as {
    entries: Record<string, LaunchEntryMinimal>;
  };
  const entries = Object.values(launches.entries);

  const knownTextSourceIds: Set<string> = existsSync(TEXT_SOURCES_PATH_FOR_LAUNCHES)
    ? new Set(
        (
          readJson(TEXT_SOURCES_PATH_FOR_LAUNCHES) as {
            entries: Array<{ id: string }>;
          }
        ).entries.map((e) => e.id),
      )
    : new Set();

  const failures = [
    ...findLaunchesMissingPrimaryProvenance(entries),
    ...findLaunchesMissingCitations(entries, knownTextSourceIds),
    ...findLaunchesOrphanLauncherRefs(entries, fleetLauncherExists),
  ];
  let missingPrimary = 0;
  let missingCitations = 0;
  let orphanLauncherRefs = 0;
  for (const f of failures) {
    if (f.kind === 'missing-primary-provenance') {
      missingPrimary++;
      console.error(
        `  ✗ launches[${f.launch_id}]: provenance_chain has no entry with role 'primary' or 'fallback-primary'`,
      );
    } else if (f.kind === 'missing-citation') {
      missingCitations++;
      console.error(
        `  ✗ launches: source '${f.source}' missing citation — text-sources.json needs entry id '${f.expected_text_source_id}'`,
      );
    } else if (f.kind === 'orphan-launcher-ref') {
      orphanLauncherRefs++;
      console.error(
        `  ✗ launches[${f.launch_id}]: orrery_launcher_ref '${f.orrery_launcher_ref}' does not resolve to a fleet launcher`,
      );
    }
  }

  launchesFailed = missingPrimary + missingCitations + orphanLauncherRefs;
  if (launchesFailed === 0) {
    console.log(
      `  ✓ ${entries.length} launch entries — primary provenance present, citations registered, launcher refs resolve`,
    );
  } else {
    console.error(
      `  ${launchesFailed} launches integrity failure(s) (${missingPrimary} missing primary, ${missingCitations} missing citation, ${orphanLauncherRefs} orphan launcher ref)`,
    );
  }
}

// Gate 4: rocket-mapping targets must exist as fleet launcher files.
if (existsSync(LAUNCHES_ROCKET_MAPPING_PATH)) {
  const mapping = readJson(LAUNCHES_ROCKET_MAPPING_PATH) as {
    families: Record<string, string>;
    config_exceptions?: Record<string, string>;
  };
  const orphanTargets = findLaunchesOrphanRocketMappingTargets(mapping, fleetLauncherExists);
  for (const f of orphanTargets) {
    if (f.kind === 'orphan-rocket-mapping-target') {
      console.error(
        `  ✗ launches-rocket-mapping.json[${f.mapping_key}] = '${f.launcher_id}' does not resolve to a fleet launcher`,
      );
    }
  }
  launchesFailed += orphanTargets.length;
  const targetCount =
    Object.keys(mapping.families).length + Object.keys(mapping.config_exceptions ?? {}).length;
  if (orphanTargets.length === 0 && targetCount > 0) {
    console.log(`  ✓ ${targetCount} rocket-mapping target(s) resolve to fleet launchers`);
  }
}

// Gate 5: curation overrides reference known launches (WARN only).
if (existsSync(LAUNCHES_CURATION_PATH) && existsSync(LAUNCHES_PATH)) {
  const curation = readJson(LAUNCHES_CURATION_PATH) as {
    featured: Array<{ launch_id: string }>;
    demoted: Array<{ launch_id: string }>;
  };
  const launches = readJson(LAUNCHES_PATH) as { entries: Record<string, unknown> };
  const knownLaunchIds = new Set(Object.keys(launches.entries));
  for (const [list, name] of [
    [curation.featured, 'featured'],
    [curation.demoted, 'demoted'],
  ] as const) {
    for (const ov of list) {
      if (!knownLaunchIds.has(ov.launch_id)) {
        console.warn(
          `  ⚠ launches-curation.json[${name}]: launch_id '${ov.launch_id}' not in current manifest (override re-applies once launch reappears)`,
        );
      }
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Asset-size guard — fail any image under static/images/ that exceeds
// the workbox precache cap configured in vite.config.ts. Without this
// the build silently fails late, after lint + tests + most of vite's
// own work has already happened. Catching it here gives a clear error
// at the validate-data step.
//
// The cap below MUST stay in sync with `maximumFileSizeToCacheInBytes`
// in vite.config.ts. Bump both together when adding hi-res hero
// imagery that exceeds the current ceiling.
// ──────────────────────────────────────────────────────────────────────

const WORKBOX_CACHE_LIMIT_BYTES = 8 * 1024 * 1024;
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
const IMAGE_ROOT = 'static/images';

function* walkImages(dir: string): Generator<string> {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkImages(full);
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      const ext = lower.slice(lower.lastIndexOf('.'));
      if (IMAGE_EXTS.has(ext)) yield full;
    }
  }
}

let assetSizeFailed = 0;
console.log('\nValidating image asset sizes (workbox precache cap)...');
const oversized: { path: string; bytes: number }[] = [];
for (const file of walkImages(IMAGE_ROOT)) {
  const sz = statSync(file).size;
  if (sz > WORKBOX_CACHE_LIMIT_BYTES) {
    oversized.push({ path: file, bytes: sz });
  }
}
if (oversized.length === 0) {
  console.log(`  ✓ all images under ${WORKBOX_CACHE_LIMIT_BYTES / 1024 / 1024} MiB cap`);
} else {
  assetSizeFailed = oversized.length;
  for (const { path, bytes } of oversized) {
    console.error(
      `  ✗ ${path}: ${(bytes / 1024 / 1024).toFixed(2)} MB exceeds ${WORKBOX_CACHE_LIMIT_BYTES / 1024 / 1024} MiB workbox cap`,
    );
  }
  console.error(
    `  ${assetSizeFailed} oversized image(s) — either resize OR bump maximumFileSizeToCacheInBytes in vite.config.ts (and this script) together`,
  );
}

// ──────────────────────────────────────────────────────────────────────
// Image mime/extension match (GH #251). Walks .jpg files only and
// confirms each starts with the JPEG SOI marker (ff d8 ff). Anthropic's
// vision API strict-checks declared mime; mismatched files (PNG bytes
// with .jpg extension etc.) silently break vision scoring. Browsers +
// sharp sniff and render anyway, so the mismatch is otherwise invisible.
// Repair: `npx tsx scripts/audit-image-mime.ts --repair`.
// ──────────────────────────────────────────────────────────────────────

let imageMimeFailed = 0;
console.log('\nValidating image mime/extension match (.jpg files start with JPEG SOI)...');
const mimeMismatched: string[] = [];
for (const file of walkImages(IMAGE_ROOT)) {
  const lower = file.toLowerCase();
  if (!(lower.endsWith('.jpg') || lower.endsWith('.jpeg'))) continue;
  const fd = openSync(file, 'r');
  try {
    const buf = Buffer.alloc(3);
    readSync(fd, buf, 0, 3, 0);
    if (!isJpegBytes(buf)) mimeMismatched.push(file);
  } finally {
    closeSync(fd);
  }
}
if (mimeMismatched.length === 0) {
  console.log(`  ✓ all .jpg files have valid JPEG magic bytes`);
} else {
  imageMimeFailed = mimeMismatched.length;
  for (const path of mimeMismatched) {
    console.error(`  ✗ ${path}: .jpg extension but non-JPEG bytes`);
  }
  console.error(
    `  ${imageMimeFailed} mime/extension mismatch(es) — fix: npx tsx scripts/audit-image-mime.ts --repair`,
  );
}

// Image Pipeline v2 — schema sanity for image-vision.json + image-curation.json
// (PRD-018 M8, RFC-022 §6). Lightweight structural checks; full JSON-Schema
// validation can be added later if drift becomes a problem.
let imagePipelineFailed = 0;
console.log('\nValidating image-pipeline v2 manifests (image-vision + image-curation)...');
{
  const visionPath = join(DATA_ROOT, 'image-vision.json');
  const curationPath = join(DATA_ROOT, 'image-curation.json');
  const problems: string[] = [];
  try {
    const raw = readFileSync(visionPath, 'utf-8');
    const m = JSON.parse(raw) as {
      version?: string;
      entries?: Record<string, { score: number; subject: string; category: string }>;
    };
    if (!m.version) problems.push('image-vision.json: missing top-level "version"');
    if (!m.entries || typeof m.entries !== 'object') {
      problems.push('image-vision.json: missing "entries" object');
    } else {
      let bad = 0;
      for (const [p, e] of Object.entries(m.entries)) {
        if (typeof e.score !== 'number' || e.score < 0 || e.score > 10) bad++;
        // Any leading `/` path is fine — corpus includes /images/, /textures/, /logos/
        if (!p.startsWith('/')) bad++;
      }
      if (bad > 0) problems.push(`image-vision.json: ${bad} malformed entries`);
    }
  } catch (err) {
    problems.push(`image-vision.json: ${(err as Error).message}`);
  }
  try {
    const raw = readFileSync(curationPath, 'utf-8');
    const c = JSON.parse(raw) as {
      version?: string;
      entries?: Array<{ path: string; reason: string; flaggedAt: string }>;
    };
    if (!c.version) problems.push('image-curation.json: missing top-level "version"');
    if (!Array.isArray(c.entries)) {
      problems.push('image-curation.json: "entries" must be an array');
    } else {
      let bad = 0;
      for (const e of c.entries) {
        if (!e.path?.startsWith('/images/')) bad++;
        if (!e.reason || typeof e.reason !== 'string') bad++;
        if (!e.flaggedAt || isNaN(Date.parse(e.flaggedAt))) bad++;
      }
      if (bad > 0) problems.push(`image-curation.json: ${bad} malformed entries`);
    }
  } catch (err) {
    problems.push(`image-curation.json: ${(err as Error).message}`);
  }
  if (problems.length === 0) {
    console.log('  ✓ image-vision + image-curation manifests structurally valid');
  } else {
    for (const p of problems) console.log(`  ✗ ${p}`);
    imagePipelineFailed = problems.length;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Overlay-completeness check (AGENTS.md non-negotiable, GH #83 follow-up).
//
// History: GH #83 added 11 constellation entries to earth-objects.json but
// missed the corresponding en-US overlay files. CI e2e caught the runtime
// 404s — preflight did NOT. This check closes that gap so a missing
// overlay fails validate-data (and therefore preflight + pre-push) BEFORE
// the push lands on origin.
//
// Other locales fall back to en-US per the existing i18n loader, so we
// only verify en-US presence here. Translation completeness is handled
// by the separate i18n pipeline.
console.log('\nValidating overlay-completeness (AGENTS.md non-negotiable)...');
let overlayFailed = 0;
{
  const I18N_EN = join(DATA_ROOT, 'i18n', 'en-US');
  const problems: string[] = [];

  // (a) earth-objects.json (flat array, id field) → i18n/en-US/earth-objects/{id}.json
  try {
    const raw = readFileSync(join(DATA_ROOT, 'earth-objects.json'), 'utf-8');
    const items = JSON.parse(raw) as Array<{ id: string }>;
    for (const o of items) {
      const overlayPath = join(I18N_EN, 'earth-objects', `${o.id}.json`);
      if (!existsSync(overlayPath)) {
        problems.push(
          `earth-objects "${o.id}" missing en-US overlay at i18n/en-US/earth-objects/${o.id}.json`,
        );
      }
    }
  } catch (err) {
    problems.push(`earth-objects.json read error: ${(err as Error).message}`);
  }

  // (b) fleet/index.json (flat array, id+category) → i18n/en-US/fleet/{category}/{id}.json
  try {
    const raw = readFileSync(FLEET_INDEX_PATH, 'utf-8');
    const items = JSON.parse(raw) as Array<{ id: string; category: string }>;
    for (const f of items) {
      const overlayPath = join(I18N_EN, 'fleet', f.category, `${f.id}.json`);
      if (!existsSync(overlayPath)) {
        problems.push(
          `fleet "${f.id}" (${f.category}) missing en-US overlay at i18n/en-US/fleet/${f.category}/${f.id}.json`,
        );
      }
    }
  } catch (err) {
    problems.push(`fleet/index.json read error: ${(err as Error).message}`);
  }

  // (c) moon-sites.json (flat array, id) → i18n/en-US/moon-sites/{id}.json
  try {
    const raw = readFileSync(join(DATA_ROOT, 'moon-sites.json'), 'utf-8');
    const items = JSON.parse(raw) as Array<{ id: string }>;
    for (const s of items) {
      const overlayPath = join(I18N_EN, 'moon-sites', `${s.id}.json`);
      if (!existsSync(overlayPath)) {
        problems.push(
          `moon-sites "${s.id}" missing en-US overlay at i18n/en-US/moon-sites/${s.id}.json`,
        );
      }
    }
  } catch (err) {
    problems.push(`moon-sites.json read error: ${(err as Error).message}`);
  }

  // (d) mars-sites.json (flat array, id) → i18n/en-US/mars-sites/{id}.json
  try {
    const raw = readFileSync(join(DATA_ROOT, 'mars-sites.json'), 'utf-8');
    const items = JSON.parse(raw) as Array<{ id: string }>;
    for (const s of items) {
      const overlayPath = join(I18N_EN, 'mars-sites', `${s.id}.json`);
      if (!existsSync(overlayPath)) {
        problems.push(
          `mars-sites "${s.id}" missing en-US overlay at i18n/en-US/mars-sites/${s.id}.json`,
        );
      }
    }
  } catch (err) {
    problems.push(`mars-sites.json read error: ${(err as Error).message}`);
  }

  // (e) science/{tab}/_index.json (object with `ids` array) → both the base
  // per-id file AND the i18n/en-US/science/{tab}/{id}.json overlay.
  const scienceDir = join(DATA_ROOT, 'science');
  if (existsSync(scienceDir)) {
    for (const tab of readdirSync(scienceDir)) {
      const indexFile = join(scienceDir, tab, '_index.json');
      if (!existsSync(indexFile)) continue;
      try {
        const raw = readFileSync(indexFile, 'utf-8');
        const index = JSON.parse(raw) as { ids?: string[] };
        for (const id of index.ids ?? []) {
          const baseFile = join(scienceDir, tab, `${id}.json`);
          if (!existsSync(baseFile)) {
            problems.push(`science/${tab} "${id}" missing base file at science/${tab}/${id}.json`);
          }
          const overlayFile = join(I18N_EN, 'science', tab, `${id}.json`);
          if (!existsSync(overlayFile)) {
            problems.push(
              `science/${tab} "${id}" missing en-US overlay at i18n/en-US/science/${tab}/${id}.json`,
            );
          }
        }
      } catch (err) {
        problems.push(`science/${tab}/_index.json read error: ${(err as Error).message}`);
      }
    }
  }

  // (f) fleet-galleries.json — every fleet/index.json id must have either
  // a fleet-galleries.json entry (count ≥1 + matching /01.jpg on disk) or
  // be explicitly opt-out via count 0. GH #83 follow-up: 15 constellation
  // fleet entries shipped without any gallery, causing fleet:40 + fleet:110
  // e2e 404s on /images/fleet-galleries/<id>/01.jpg.
  try {
    const fleetIndexRaw = readFileSync(FLEET_INDEX_PATH, 'utf-8');
    const fleetEntries = JSON.parse(fleetIndexRaw) as Array<{ id: string; category: string }>;
    const galleriesPath = join(DATA_ROOT, 'fleet-galleries.json');
    let galleries: Record<string, number> = {};
    try {
      galleries = JSON.parse(readFileSync(galleriesPath, 'utf-8')) as Record<string, number>;
    } catch {
      problems.push('fleet-galleries.json missing or unparseable');
    }
    for (const f of fleetEntries) {
      const count = galleries[f.id];
      if (count === undefined) {
        problems.push(
          `fleet "${f.id}" (${f.category}) missing gallery entry in fleet-galleries.json (set 0 to opt out, ≥1 to declare)`,
        );
        continue;
      }
      if (count >= 1) {
        const heroPath = join(DATA_ROOT, '..', 'images', 'fleet-galleries', f.id, '01.jpg');
        if (!existsSync(heroPath)) {
          problems.push(
            `fleet "${f.id}" declares count ${count} but /images/fleet-galleries/${f.id}/01.jpg missing on disk`,
          );
        }
      }
    }
  } catch (err) {
    problems.push(`fleet-galleries cross-check error: ${(err as Error).message}`);
  }

  if (problems.length === 0) {
    console.log('  ✓ every registry ID has its required en-US overlay');
  } else {
    for (const p of problems) console.log(`  ✗ ${p}`);
    overlayFailed = problems.length;
  }
}

if (
  failed +
    docFailed +
    missionDriftFailed +
    provenanceFailed +
    credBomFailed +
    linkProvenanceFailed +
    launchesFailed +
    assetSizeFailed +
    imageMimeFailed +
    imagePipelineFailed +
    overlayFailed >
  0
)
  process.exit(1);
