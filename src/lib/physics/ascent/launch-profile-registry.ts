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
 * The Delta II 7925H's nine GEM-46 strap-ons (6 ground-lit + 3 air-lit), PER booster:
 * 19,040 kg / 2,035 kg, 608.1 kN ground-lit, 284 s air-lit Isp, ~76 s burn (Delta II —
 * Wikipedia; Delta II Payload Planners Guide: ground-lit to T+77, air-lit T+79 to T+157).
 * The two published ground-lit Isp figures disagree (224 vs 277.8 s); 265 s matches the
 * published burn time.
 */
const DELTA_II_GEM46: LaunchBoosters = {
  name: 'GEM-46',
  count: 9,
  airLitCount: 3,
  wetKg: 19040,
  dryKg: 2035,
  thrustSlKN: 608.1,
  thrustVacKN: 628.5,
  ispSlS: 265,
  ispVacS: 284,
  chamberTempK: 3300,
};

/** A Delta II "H" (heavy, GEM-46) variant from its name ("Delta II 7925H-9.5"). */
export function isDeltaIIHeavy(displayName: string | undefined): boolean {
  return /\b79\d\dH\b|delta ii .*heavy/i.test(displayName ?? '');
}

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

/** Launcher ids with a hand-authored flagship JSON (real per-vehicle data).
 *  MUST list every file under static/data/launch-profiles/ — an id here but no
 *  file (or a file but not here) means the mission silently falls back to the
 *  generic profile. The launch-profile-registry test guards this both ways. */
export const FLAGSHIP_IDS = new Set<string>([
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
  'starship',
  // These flagship JSONs existed but were absent from the allowlist, so missions
  // silently fell back to the generic 2-stage profile — losing the real strap-on
  // separation (e.g. Long March 2F's boosters + the R-7 Korolev cross). 2026-07.
  'long-march-2f',
  'soyuz',
  'voskhod-11a57',
  'mercury-redstone',
  // Every Artemis flight references it; without a JSON they flew the generic
  // 1-engine 2-stage stand-in (4,100 kN at liftoff vs SLS's ~39 MN). 2026-11.
  'sls-block-1',
  // Sourced profiles for vehicles that only had a model and generic physics. 2026-11.
  'long-march-3a',
  'long-march-3b',
  'long-march-5',
  'pslv',
  'lvm3',
  'h3',
  'm-v',
  'ariane-1',
  'delta-ii',
  'atlas-centaur',
  'atlas-agena',
  'titan-ii-g',
  'titan-iiie-centaur',
  'titan-ivb-centaur',
  'falcon-heavy',
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
 * "Saturn V". Each maps the free-text variants onto the one id that keys the
 * vehicle's model and profile, so e.g. every "PSLV-XL (C…)" flies the one PSLV
 * instead of slugging to a per-mission generic id. An id with no flagship JSON
 * (FLAGSHIP_IDS) flies the generic profile.
 */
const FLAGSHIP_ALIASES: [needles: string[], id: string][] = [
  [['falcon heavy', 'falcon-heavy'], 'falcon-heavy'],
  [['falcon 9', 'falcon-9'], 'falcon-9'],
  // Agena and Centaur upper stages before the bare Atlas: Mariner 4 flew Atlas-Agena, not
  // the Mercury-Atlas; Mariners 9/10 and the Pioneers flew Atlas-Centaur.
  [['agena'], 'atlas-agena'],
  [['atlas slv-3c', 'atlas slv-3d', 'atlas-centaur', 'atlas centaur'], 'atlas-centaur'],
  [['atlas lv-3b', 'atlas lv', 'mercury-atlas'], 'atlas-lv-3b'],
  [['atlas v', 'atlas-v'], 'atlas-v'],
  [['saturn v', 'saturn-v'], 'saturn-v'],
  [['saturn ib', 'saturn 1b', 'saturn-ib'], 'saturn-ib'],
  // Require "GLV" so "Titan IIIE" (Voyager/Viking) does NOT fall to the Gemini
  // Titan II GLV — a 2-stage LEO booster, wrong for those interplanetary flights.
  [['titan ii glv', 'titan 2 glv', 'titan-ii-glv'], 'titan-ii-glv'],
  [['titan ii g', 'titan 23g', 'titan-ii-g'], 'titan-ii-g'],
  [['titan iiie', 'titan 3e', 'titan-iiie'], 'titan-iiie-centaur'],
  [['titan ivb', 'titan iv', 'titan-ivb'], 'titan-ivb-centaur'],
  [['delta iv heavy', 'delta-iv-heavy'], 'delta-iv-heavy'],
  [['delta ii', 'delta-ii'], 'delta-ii'],
  [['molniya'], 'molniya-m'],
  [['athena ii', 'athena-ii'], 'athena-ii'],
  [['new glenn', 'new-glenn'], 'new-glenn'],
  [['proton'], 'proton-k'],
  [['vostok'], 'vostok-k'],
  [['ariane 5', 'ariane-5'], 'ariane-5'],
  [['h-iia', 'h-2a', 'h2a', 'h iia'], 'h-iia'],
  [['space shuttle', 'shuttle'], 'space-shuttle-stack'],
  [['sls block 1', 'space launch system', 'sls-block-1'], 'sls-block-1'],
  // ── International fleet. ──
  [['long march 2f', 'cz-2f'], 'long-march-2f'],
  [['long march 5', 'cz-5'], 'long-march-5'],
  // Long March 3A flies with no strap-ons (Chang'e 1); the 3B/3C family with them.
  [['long march 3a', 'cz-3a'], 'long-march-3a'],
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
/**
 * Canonicalise variant fleet-ref launcher ids onto the id the registry actually
 * keys its dedicated 3D model + profile/boosters under. A mission's `fleet_refs`
 * may carry a sub-variant ("pslv-xl", "soyuz-fg") while the model + booster pack
 * live under the family id ("pslv", "soyuz") — without this the variant falls
 * through to the generic model with no strap-on staging (e.g. Chandrayaan-1's
 * "pslv-xl" showed no PSOM separation).
 */
const LAUNCHER_ID_CANON: Record<string, string> = {
  'pslv-xl': 'pslv',
  'soyuz-fg': 'soyuz',
  'r-7-vostok': 'vostok-k',
  'proton-m': 'proton-k',
  'atlas-slv-3d': 'atlas-centaur',
  'atlas-slv-3c': 'atlas-centaur',
};

export function resolveLauncher(
  fleetRefs: FleetRef[] | undefined,
  vehicle: string | undefined,
): { id: string; name: string } | null {
  const raw =
    missionLauncherId(fleetRefs) ?? (vehicle ? (matchFlagship(vehicle) ?? slug(vehicle)) : null);
  if (raw == null) return null;
  const id = LAUNCHER_ID_CANON[raw] ?? raw;
  return { id, name: vehicle ?? prettyName(id) };
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
          // The Delta II 7925H flew the larger GEM-46 strap-ons (Opportunity, MESSENGER,
          // Dawn); the flagship JSON is the GEM-40 7925.
          if (launcherId === 'delta-ii' && isDeltaIIHeavy(displayName)) {
            profile = { ...profile, boosters: { ...DELTA_II_GEM46 } };
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
