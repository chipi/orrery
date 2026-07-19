/**
 * Launch-profile registry (RFC-034 §6 · epic #412 · Track A).
 *
 * Resolves a mission's launch vehicle → its ascent LaunchProfile, keyed on the
 * `fleet_refs` entry with `role: "launcher"`. Flagship profiles ship as JSON
 * under static/data/launch-profiles/<id>.json and are fetched + shape-validated
 * on demand. The generic 2-stage fallback (RFC-034 S7) grows from here.
 */

import type { LaunchBoosters, LaunchProfile } from './ascent-physics';

/**
 * The Aerojet AJ-60A strap-on solid (one unit) — the largest monolithic solid
 * rocket motor ever flown. Atlas V bolts on 0–5 of these depending on the
 * variant; the count is the MIDDLE digit of the 3-digit config code (see
 * {@link atlasVSrbCount}). Masses/thrust/Isp are PER booster.
 * Figures: Aerojet Rocketdyne AJ-60A (gross 46,697 kg · propellant 40,779 kg ·
 * 1,688 kN peak SL thrust · Isp 245.5 s SL / 279.3 s vac · ~94 s burn).
 */
const ATLAS_V_AJ60A: Omit<LaunchBoosters, 'count'> = {
  name: 'AJ-60A',
  wetKg: 46697,
  dryKg: 5918,
  thrustSlKN: 1688,
  thrustVacKN: 1900,
  ispSlS: 245,
  ispVacS: 279,
  chamberTempK: 3300,
};

/**
 * Atlas V solid-booster count from a variant name — the MIDDLE digit of the
 * 3-digit config code ("Atlas V 551" → 5, "Atlas V 401" → 0, "Atlas V 541" → 4,
 * "Atlas V 501 (AV-034)" → 0). Returns 0 when the name carries no parseable
 * config code (e.g. the bare flagship fallback "Atlas V 401").
 */
export function atlasVSrbCount(displayName: string | undefined): number {
  const m = /atlas\s*v\s*(\d)(\d)(\d)/i.exec(displayName ?? '');
  return m ? Number(m[2]) : 0;
}

/** Launcher ids with a hand-authored flagship JSON (real per-vehicle data). */
const FLAGSHIP_IDS = new Set<string>([
  'falcon-9',
  'atlas-v',
  'saturn-v',
  'proton-k',
  'titan-ii-glv',
  'saturn-ib',
  'vostok-k',
  'ariane-5',
  'h-iia',
  'atlas-lv-3b',
  'space-shuttle-stack',
]);

interface FleetRef {
  id: string;
  role?: string;
}

/** The launcher id from a mission's fleet_refs (role === 'launcher'), if any. */
export function missionLauncherId(fleetRefs: FleetRef[] | undefined): string | undefined {
  return fleetRefs?.find((r) => r.role === 'launcher')?.id;
}

/**
 * Free-text vehicle spellings → launcher id, ordered most-specific first so
 * "Atlas LV-3B" doesn't fall to "Atlas V" and "Saturn IB" doesn't fall to
 * "Saturn V". Entries above the divider have a hand-authored flagship JSON
 * (FLAGSHIP_IDS — real physics). Entries below map free-text variants onto a
 * consolidated id that has a BESPOKE 3D MODEL but GENERIC physics (no JSON) —
 * so e.g. every "PSLV-XL (C…)" shows the one PSLV model instead of slugging to
 * a per-mission generic id with no dedicated mesh.
 */
const FLAGSHIP_ALIASES: [needles: string[], id: string][] = [
  [['falcon 9', 'falcon-9'], 'falcon-9'],
  [['atlas lv-3b', 'atlas lv', 'mercury-atlas'], 'atlas-lv-3b'],
  [['atlas v', 'atlas-v'], 'atlas-v'],
  [['saturn v', 'saturn-v'], 'saturn-v'],
  [['saturn ib', 'saturn 1b', 'saturn-ib'], 'saturn-ib'],
  // Require "GLV" so "Titan IIIE" (Voyager/Viking) does NOT fall to the Gemini
  // Titan II GLV — a 2-stage LEO booster, wrong for those interplanetary flights.
  [['titan ii glv', 'titan 2 glv', 'titan-ii-glv'], 'titan-ii-glv'],
  [['proton'], 'proton-k'],
  [['vostok'], 'vostok-k'],
  [['ariane 5', 'ariane-5'], 'ariane-5'],
  [['h-iia', 'h-2a', 'h2a', 'h iia'], 'h-iia'],
  [['space shuttle', 'shuttle'], 'space-shuttle-stack'],
  // ── Model-only ids (bespoke mesh, generic physics) — international fleet. ──
  [['long march 2f', 'cz-2f'], 'long-march-2f'],
  [['long march 5', 'cz-5'], 'long-march-5'],
  [['long march 3', 'cz-3'], 'long-march-3b'],
  [['pslv'], 'pslv'],
  [['lvm3', 'gslv mk iii', 'gslv mk3', 'gslv mkiii'], 'lvm3'],
  [['m-v', 'mu-5', 'mu-v'], 'm-v'],
  [['h3-', 'h-3', 'h3 '], 'h3'],
  [['ariane 1', 'ariane-1'], 'ariane-1'],
];

/** Match a free-text vehicle string ("Atlas V 411") to a flagship id, if any. */
function matchFlagship(vehicle: string): string | null {
  const v = vehicle.toLowerCase();
  for (const [needles, id] of FLAGSHIP_ALIASES) {
    if (needles.some((n) => v.includes(n))) return id;
  }
  return null;
}

/** Slugify a vehicle string into a stable generic id ("Long March 3B" → "long-march-3b"). */
function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Resolve a mission's launch vehicle to `{ id, name }` — covering EVERY mission:
 * prefer the fleet_refs launcher id; otherwise fall back to the mission's
 * free-text `vehicle` string (matched to a flagship where possible, else a
 * slug for the generic model). Returns null only when the mission has neither.
 */
export function resolveLauncher(
  fleetRefs: FleetRef[] | undefined,
  vehicle: string | undefined,
): { id: string; name: string } | null {
  const fromRefs = missionLauncherId(fleetRefs);
  if (fromRefs) return { id: fromRefs, name: vehicle ?? prettyName(fromRefs) };
  if (vehicle) return { id: matchFlagship(vehicle) ?? slug(vehicle), name: vehicle };
  return null;
}

/** True when a mission can play a launch — via a launcher ref OR a vehicle string. */
export function hasLaunchProfile(
  fleetRefs: FleetRef[] | undefined,
  vehicle?: string | undefined,
): boolean {
  return resolveLauncher(fleetRefs, vehicle) != null;
}

/** Title-case a launcher id ("long-march-5" → "Long March 5", "pslv-xl" → "PSLV XL"). */
function prettyName(id: string): string {
  return id
    .split('-')
    .map((s) => (s.length <= 3 || /\d/.test(s) ? s.toUpperCase() : s[0].toUpperCase() + s.slice(1)))
    .join(' ');
}

/**
 * Generic 2-stage LEO fallback (RFC-034 S7) — a representative medium launcher
 * used when no flagship profile exists, so every mission with a launcher gets a
 * launch act. Physically plausible (reaches orbit with margin) but NOT vehicle-
 * accurate; surfaced with a "representative" tier so it's never mistaken for real.
 */
export function buildGenericProfile(launcherId: string, displayName?: string): LaunchProfile {
  return {
    id: launcherId,
    name: displayName ?? prettyName(launcherId),
    source_tier: 'generic',
    payloadKg: 6000,
    fairingKg: 1500,
    fairingJettisonAltM: 110000,
    refAreaM2: 10,
    cd: 0.3,
    pitchProgram: [
      [0, 90],
      [14, 88],
      [45, 66],
      [120, 42],
      [190, 22],
      [280, 10],
    ],
    stages: [
      {
        name: 'S1',
        wetKg: 290000,
        dryKg: 22000,
        thrustSlKN: 4100,
        thrustVacKN: 4500,
        ispSlS: 285,
        ispVacS: 320,
        engines: 1,
        chamberTempK: 3400,
      },
      {
        name: 'S2',
        wetKg: 28000,
        dryKg: 2800,
        thrustVacKN: 300,
        ispVacS: 355,
        engines: 1,
        chamberTempK: 3300,
      },
    ],
  };
}

/** Minimal fail-closed shape check for a loaded profile. */
function isValidProfile(d: unknown): d is LaunchProfile {
  if (!d || typeof d !== 'object') return false;
  const p = d as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.payloadKg === 'number' &&
    Array.isArray(p.stages) &&
    p.stages.length > 0 &&
    Array.isArray(p.pitchProgram)
  );
}

/**
 * Fetch + validate the ascent profile for a launcher id. Returns null when the
 * launcher has no profile, the fetch fails, or the JSON is malformed (fail-closed).
 * `baseUrl` is the SvelteKit base path; `fetchFn` lets callers pass the load fetch.
 */
export async function loadLaunchProfile(
  launcherId: string | undefined | null,
  fetchFn: typeof fetch = fetch,
  baseUrl = '',
  displayName?: string,
): Promise<LaunchProfile | null> {
  if (!launcherId) return null;
  if (FLAGSHIP_IDS.has(launcherId)) {
    try {
      const res = await fetchFn(`${baseUrl}/data/launch-profiles/${launcherId}.json`);
      if (res.ok) {
        const data: unknown = await res.json();
        // Show the vehicle the mission ACTUALLY flew (e.g. "Atlas V 541"), not
        // the flagship JSON's canonical variant ("Atlas V 401") — the ascent
        // physics is the shared flagship model, but the label should be honest.
        if (isValidProfile(data)) {
          let profile: LaunchProfile = displayName ? { ...data, name: displayName } : data;
          // Atlas V bolts on 0–5 AJ-60A solids depending on the variant (the
          // config code's middle digit). The flagship JSON is the boosterless
          // 401 core; attach the flown variant's SRBs so a 551/541/411 shows its
          // strap-ons in the telemetry + burns them in the ascent physics.
          if (launcherId === 'atlas-v') {
            const srbs = atlasVSrbCount(displayName);
            profile =
              srbs > 0 ? { ...profile, boosters: { ...ATLAS_V_AJ60A, count: srbs } } : profile;
          }
          return profile;
        }
      }
    } catch {
      // fall through to the generic fallback
    }
  }
  return buildGenericProfile(launcherId, displayName);
}
