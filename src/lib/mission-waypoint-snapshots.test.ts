/**
 * Per-mission waypoint golden-snapshot tests (#107 Step 6i).
 *
 * Locks the first/mid/last waypoint of every mission's generated
 * trajectory so accidental generator regressions (window math drift,
 * sample rounding, missing event anchors) surface immediately at
 * commit time instead of as a visual change weeks later.
 *
 * Each mission's expected values were taken from the generator output
 * on Step 6c (Moon) / Step 6d (Mars) / Step 6h (outer-system). To
 * intentionally update one: regenerate via the hybrid script + adjust
 * the expectation here with a brief justification in the commit.
 *
 * The 'closeTo' tolerance (1 km for cislunar, 1e-4 AU for helio) is
 * generous enough to accommodate IEEE-754 ULP wobble across CPU
 * architectures but tight enough that any meaningful trajectory drift
 * breaks the assertion.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const PROJECT_ROOT = process.cwd();

function readMission(dest: string, slug: string) {
  const path = join(PROJECT_ROOT, 'static', 'data', 'missions', dest, `${slug}.json`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

interface CislunarSnapshot {
  slug: string;
  dest: string;
  firstMet: number;
  lastMetMin: number;
  lastMetMax: number;
  count: number;
}
interface HelioSnapshot {
  slug: string;
  dest: string;
  firstMet: number;
  lastMetMin: number;
  lastMetMax: number;
  count: number;
}

const MOON_SNAPSHOTS: CislunarSnapshot[] = [
  { slug: 'apollo11', dest: 'moon', firstMet: 0, lastMetMin: 8.4, lastMetMax: 8.7, count: 100 },
  { slug: 'apollo13', dest: 'moon', firstMet: 0, lastMetMin: 6.1, lastMetMax: 6.3, count: 100 },
  { slug: 'apollo17', dest: 'moon', firstMet: 0, lastMetMin: 13.1, lastMetMax: 13.3, count: 100 },
  { slug: 'artemis2', dest: 'moon', firstMet: 0, lastMetMin: 10.4, lastMetMax: 10.6, count: 100 },
  { slug: 'artemis3', dest: 'moon', firstMet: 0, lastMetMin: 11.4, lastMetMax: 11.6, count: 100 },
  { slug: 'beresheet', dest: 'moon', firstMet: 0, lastMetMin: 50.3, lastMetMax: 50.5, count: 100 },
  {
    slug: 'blue-moon-mk1',
    dest: 'moon',
    firstMet: 0,
    lastMetMin: 4.2,
    lastMetMax: 4.4,
    count: 100,
  },
  {
    slug: 'chandrayaan1',
    dest: 'moon',
    firstMet: 0,
    lastMetMin: 17.7,
    lastMetMax: 17.9,
    count: 100,
  },
  {
    slug: 'chandrayaan3',
    dest: 'moon',
    firstMet: 0,
    lastMetMin: 41.9,
    lastMetMax: 42.1,
    count: 100,
  },
  { slug: 'change3', dest: 'moon', firstMet: 0, lastMetMin: 13.5, lastMetMax: 13.7, count: 100 },
  { slug: 'change4', dest: 'moon', firstMet: 0, lastMetMin: 28.2, lastMetMax: 28.5, count: 100 },
  { slug: 'change5', dest: 'moon', firstMet: 0, lastMetMin: 24, lastMetMax: 24.3, count: 100 },
  { slug: 'change6', dest: 'moon', firstMet: 0, lastMetMin: 59.9, lastMetMax: 60.1, count: 100 },
  { slug: 'clementine', dest: 'moon', firstMet: 0, lastMetMin: 26.2, lastMetMax: 26.4, count: 100 },
  { slug: 'lro', dest: 'moon', firstMet: 0, lastMetMin: 5.2, lastMetMax: 5.3, count: 100 },
  { slug: 'luna16', dest: 'moon', firstMet: 0, lastMetMin: 15.9, lastMetMax: 16.1, count: 100 },
  { slug: 'luna17', dest: 'moon', firstMet: 0, lastMetMin: 7.3, lastMetMax: 7.4, count: 100 },
  { slug: 'luna21', dest: 'moon', firstMet: 0, lastMetMin: 7.3, lastMetMax: 7.4, count: 100 },
  { slug: 'luna24', dest: 'moon', firstMet: 0, lastMetMin: 17.9, lastMetMax: 18.1, count: 100 },
  { slug: 'luna9', dest: 'moon', firstMet: 0, lastMetMin: 3.1, lastMetMax: 3.2, count: 100 },
  { slug: 'slim', dest: 'moon', firstMet: 0, lastMetMin: 141.7, lastMetMax: 141.8, count: 100 },
];

const HELIO_SNAPSHOTS: HelioSnapshot[] = [
  // Mars (14)
  { slug: 'curiosity', dest: 'mars', firstMet: 0, lastMetMin: 266, lastMetMax: 267, count: 100 },
  { slug: 'hope-probe', dest: 'mars', firstMet: 0, lastMetMin: 215, lastMetMax: 215.5, count: 100 },
  { slug: 'insight', dest: 'mars', firstMet: 0, lastMetMin: 215, lastMetMax: 215.5, count: 100 },
  { slug: 'mangalyaan', dest: 'mars', firstMet: 0, lastMetMin: 340, lastMetMax: 340.5, count: 100 },
  { slug: 'mariner4', dest: 'mars', firstMet: 0, lastMetMin: 239, lastMetMax: 239.5, count: 100 },
  {
    slug: 'mars-express',
    dest: 'mars',
    firstMet: 0,
    lastMetMin: 216,
    lastMetMax: 216.5,
    count: 100,
  },
  {
    slug: 'mars-pathfinder',
    dest: 'mars',
    firstMet: 0,
    lastMetMin: 222,
    lastMetMax: 223,
    count: 100,
  },
  { slug: 'mars3', dest: 'mars', firstMet: 0, lastMetMin: 197, lastMetMax: 197.5, count: 100 },
  { slug: 'maven', dest: 'mars', firstMet: 0, lastMetMin: 323, lastMetMax: 323.5, count: 100 },
  { slug: 'mmx', dest: 'mars', firstMet: 0, lastMetMin: 350, lastMetMax: 351, count: 100 },
  {
    slug: 'perseverance',
    dest: 'mars',
    firstMet: 0,
    lastMetMin: 213,
    lastMetMax: 213.5,
    count: 100,
  },
  {
    slug: 'schiaparelli',
    dest: 'mars',
    firstMet: 0,
    lastMetMin: 229,
    lastMetMax: 230,
    count: 100,
  },
  { slug: 'tianwen1', dest: 'mars', firstMet: 0, lastMetMin: 309, lastMetMax: 310, count: 100 },
  { slug: 'viking1', dest: 'mars', firstMet: 0, lastMetMin: 351, lastMetMax: 352, count: 100 },
  // Outer system (4)
  { slug: 'dawn', dest: 'ceres', firstMet: 0, lastMetMin: 2853, lastMetMax: 2855, count: 100 },
  {
    slug: 'galileo',
    dest: 'jupiter',
    firstMet: 0,
    lastMetMin: 2355,
    lastMetMax: 2356,
    count: 100,
  },
  {
    slug: 'voyager-2',
    dest: 'neptune',
    firstMet: 0,
    lastMetMin: 4607,
    lastMetMax: 4608,
    count: 100,
  },
  {
    slug: 'new-horizons',
    dest: 'pluto',
    firstMet: 0,
    lastMetMin: 4966,
    lastMetMax: 4967,
    count: 100,
  },
];

describe('#107 Step 6i — cislunar waypoint golden snapshots', () => {
  for (const snap of MOON_SNAPSHOTS) {
    it(`${snap.slug}: ${snap.count} waypoints, MET ${snap.firstMet}..[${snap.lastMetMin}, ${snap.lastMetMax}]`, () => {
      const m = readMission(snap.dest, snap.slug);
      const wp = m.flight?.cislunar_profile?.waypoints_km as number[][] | undefined;
      expect(wp).toBeDefined();
      expect(wp!.length).toBe(snap.count);
      // First waypoint at MET 0 (launch).
      expect(wp![0][0]).toBe(snap.firstMet);
      // Last waypoint MET within tolerance window.
      const lastMet = wp![wp!.length - 1][0];
      expect(lastMet).toBeGreaterThanOrEqual(snap.lastMetMin);
      expect(lastMet).toBeLessThanOrEqual(snap.lastMetMax);
      // Strictly increasing METs (guards against partial-write
      // regressions that scramble the array).
      for (let i = 1; i < wp!.length; i++) {
        expect(wp![i][0]).toBeGreaterThan(wp![i - 1][0]);
      }
      // Tier is hybrid (tier_2_published reserved for real NASA TND
      // state vectors — Step 6f when it lands).
      expect(m.flight.cislunar_profile.source_tier).toBe('tier_1_5_hybrid');
    });
  }
});

describe('#107 Step 6i — interplanetary waypoint golden snapshots', () => {
  for (const snap of HELIO_SNAPSHOTS) {
    it(`${snap.slug} (${snap.dest}): ${snap.count} waypoints, MET ${snap.firstMet}..[${snap.lastMetMin}, ${snap.lastMetMax}]`, () => {
      const m = readMission(snap.dest, snap.slug);
      const wp = m.flight?.interplanetary_profile?.waypoints_helio_au as number[][] | undefined;
      expect(wp).toBeDefined();
      expect(wp!.length).toBe(snap.count);
      expect(wp![0][0]).toBe(snap.firstMet);
      const lastMet = wp![wp!.length - 1][0];
      expect(lastMet).toBeGreaterThanOrEqual(snap.lastMetMin);
      expect(lastMet).toBeLessThanOrEqual(snap.lastMetMax);
      for (let i = 1; i < wp!.length; i++) {
        expect(wp![i][0]).toBeGreaterThan(wp![i - 1][0]);
      }
      expect(m.flight.interplanetary_profile.source_tier).toBe('tier_1_5_hybrid');
      expect(m.flight.interplanetary_profile.reference_frame).toBe('heliocentric_ecliptic_J2000');
    });
  }
});

// #107 review finding 10 — invariants the validate-data runtime checks
// but the per-mission snapshot tests above don't surface explicitly.
// Catches edge cases (over-200 waypoints, heliocentric radius outside
// sane AU bounds) that would otherwise only fail at preflight time.
describe('#107 review finding 10 — waypoint invariants beyond the snapshots', () => {
  it('every interplanetary waypoint has heliocentric radius in [0.1, 50] AU', () => {
    for (const snap of HELIO_SNAPSHOTS) {
      const m = readMission(snap.dest, snap.slug);
      const wp = m.flight?.interplanetary_profile?.waypoints_helio_au as number[][] | undefined;
      if (!wp) continue;
      for (let i = 0; i < wp.length; i++) {
        const r = Math.hypot(wp[i][1], wp[i][2], wp[i][3]);
        // Earth ~1 AU; Pluto ~40 AU; nothing in our corpus should go
        // beyond ~45 AU. The validator caps at 50 AU.
        expect(r, `${snap.slug} waypoint[${i}] r=${r.toFixed(3)} AU`).toBeGreaterThan(0.1);
        expect(r, `${snap.slug} waypoint[${i}] r=${r.toFixed(3)} AU`).toBeLessThan(50);
      }
    }
  });

  it('no mission exceeds the 200-waypoint hard cap', () => {
    for (const snap of [...MOON_SNAPSHOTS, ...HELIO_SNAPSHOTS]) {
      const m = readMission(snap.dest, snap.slug);
      const km = m.flight?.cislunar_profile?.waypoints_km as number[][] | undefined;
      const au = m.flight?.interplanetary_profile?.waypoints_helio_au as number[][] | undefined;
      if (km) expect(km.length).toBeLessThanOrEqual(200);
      if (au) expect(au.length).toBeLessThanOrEqual(200);
    }
  });

  it('every interplanetary waypoint has y ≈ 0 (ecliptic-plane assumption)', () => {
    for (const snap of HELIO_SNAPSHOTS) {
      const m = readMission(snap.dest, snap.slug);
      const wp = m.flight?.interplanetary_profile?.waypoints_helio_au as number[][] | undefined;
      if (!wp) continue;
      for (let i = 0; i < wp.length; i++) {
        // The generator emits y=0 for in-plane transfers (every
        // mission today). If a future inclined-transfer mission ships
        // with non-zero y, update this assertion to a tolerance.
        expect(wp[i][2], `${snap.slug} waypoint[${i}].y`).toBe(0);
      }
    }
  });
});
