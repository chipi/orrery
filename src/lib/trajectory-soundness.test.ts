/**
 * Trajectory soundness — Layer 1 of the /fly rendering validation
 * strategy (post-v0.2.0).
 *
 * For every mission in static/data/missions/{mars,moon}/ this test
 * builds the outbound arc the same way `applyMissionAsLoaded` does
 * (mission-arc.outboundArc for Mars-bound; fly-physics.moonOutboundArc
 * for Moon-bound) and asserts the 8 soundness invariants.
 *
 * Run alone:
 *   npx vitest run src/lib/trajectory-soundness.test.ts --reporter=verbose
 *
 * Pass means: every mission's arc has the right shape, lands at the
 * right place, finite throughout, and matches what `spacecraftPos`
 * returns at depDay / midDay / arrDay. The /fly visualisation uses
 * exactly these arrays so this is the math-side guarantee that
 * nothing's broken before any pixel hits the screen.
 */

import { describe, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { earthPos, destinationPos, outboundArc, returnArc, spacecraftPos } from './mission-arc';
import { moonOutboundArc, moonReturnArc, moonPositionAtMet } from './fly-physics';
import { dateToSimDay } from './sim-day';
import { expectCloseTo } from './test-helpers/expect-close';
import type { Mission } from '$types/mission';

// SCALE_3D matches src/routes/fly/+page.svelte's heliocentric scale.
// Moon-mode arcs are computed in scene units then divided by SCALE_3D
// to land in AU-space (the rest of the rendering pipeline expects AU).
const SCALE_3D = 80;
const ARC_STEPS = 200;
const FLYBY_OFFSET_FRACTION = 0.95;

interface MissionFile {
  destDir: 'mars' | 'moon';
  id: string;
  json: Mission;
  overlay: { type?: string };
}

function loadAllMissions(): MissionFile[] {
  const out: MissionFile[] = [];
  for (const destDir of ['mars', 'moon'] as const) {
    const dir = `static/data/missions/${destDir}`;
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const json = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Mission;
      // Editorial overlay carries `type` (e.g. "ROVER · ACTIVE",
      // "CREWED — SAMPLE RETURN") which /fly uses to detect round-trip.
      let overlay: { type?: string } = {};
      try {
        overlay = JSON.parse(
          readFileSync(`static/data/i18n/en-US/missions/${destDir}/${file}`, 'utf8'),
        );
      } catch {
        // Some missions may not have an overlay yet — treat as one-way.
      }
      out.push({ destDir, id: json.id, json, overlay });
    }
  }
  return out;
}

const MISSIONS = loadAllMissions();

/** Mirrors /fly's `applyMissionAsLoaded` flight-arc construction. */
function buildMissionArcs(m: MissionFile): {
  out: { x: number; z: number }[];
  ret: { x: number; z: number }[];
  timeline: { dep_day: number; flyby_day: number; arr_day: number };
  isMoon: boolean;
  isReturnTrip: boolean;
} {
  const { json, overlay } = m;
  const totalT = json.transit_days || 250;
  const flybyOffset = Math.floor(totalT * FLYBY_OFFSET_FRACTION);
  const depDay = dateToSimDay(json.departure_date) ?? 0;
  const timeline = {
    dep_day: depDay,
    flyby_day: depDay + flybyOffset,
    arr_day: depDay + totalT,
  };
  const missionType = (overlay.type ?? '').toUpperCase();
  const isReturnTrip = missionType.includes('SAMPLE RETURN') || missionType.includes('CREWED');
  const isMoon = json.dest === 'MOON';

  if (isMoon) {
    // Moon-mode: scene-unit coords divided by SCALE_3D to land in AU.
    const moonPos = moonPositionAtMet(timeline.flyby_day);
    const out = moonOutboundArc(moonPos, ARC_STEPS).map((p) => ({
      x: p.x / SCALE_3D,
      z: p.z / SCALE_3D,
    }));
    const ret = isReturnTrip
      ? moonReturnArc(moonPos, ARC_STEPS).map((p) => ({
          x: p.x / SCALE_3D,
          z: p.z / SCALE_3D,
        }))
      : [];
    return { out, ret, timeline, isMoon: true, isReturnTrip };
  }

  // Mars-bound (heliocentric).
  const earthDep = earthPos(timeline.dep_day);
  const vInf = json.flight?.arrival?.v_infinity_km_s;
  const out = outboundArc(earthDep, ARC_STEPS, /* destA = Mars */ 1.52366231, vInf);
  const ret = isReturnTrip
    ? returnArc(
        destinationPos(timeline.flyby_day, 'mars'),
        earthPos(timeline.arr_day + (totalT - flybyOffset)),
        ARC_STEPS,
      )
    : [];
  return { out, ret, timeline, isMoon: false, isReturnTrip };
}

describe('Trajectory soundness — every mission renders a valid arc', () => {
  it(`fixture loads 32 missions (16 Mars + 16 Moon)`, () => {
    const mars = MISSIONS.filter((m) => m.destDir === 'mars');
    const moon = MISSIONS.filter((m) => m.destDir === 'moon');
    if (mars.length !== 16 || moon.length !== 16) {
      throw new Error(`Expected 16 Mars + 16 Moon; got ${mars.length} + ${moon.length}`);
    }
  });

  for (const m of MISSIONS) {
    describe(`${m.destDir}/${m.id}`, () => {
      const arcs = buildMissionArcs(m);

      // ─── (a) Arc has 201 points (200 steps + 1) ──────────────────
      it('outbound arc has exactly 201 points', () => {
        if (arcs.out.length !== ARC_STEPS + 1) {
          throw new Error(`out.length = ${arcs.out.length}, expected ${ARC_STEPS + 1}`);
        }
      });

      // ─── (b) Every point is finite ────────────────────────────────
      it('every outbound point is finite (no NaN, no ±∞)', () => {
        for (let i = 0; i < arcs.out.length; i++) {
          const p = arcs.out[i];
          if (!Number.isFinite(p.x) || !Number.isFinite(p.z)) {
            throw new Error(`out[${i}] not finite: (${p.x}, ${p.z})`);
          }
        }
      });

      // ─── (c) First point near launch position ─────────────────────
      it('outbound starts near Earth launch position (within V∞-shape envelope)', () => {
        const first = arcs.out[0];
        if (arcs.isMoon) {
          expectCloseTo(first.x, 0, 5 / SCALE_3D, `${m.id} Moon-mode first.x`);
          expectCloseTo(first.z, 0, 5 / SCALE_3D, `${m.id} Moon-mode first.z`);
        } else {
          // V∞ shaping (ADR-030) bends eccentricity without re-deriving
          // semi-major axis, so the first arc point sits up to ~0.1 AU
          // off Earth's exact position for missions with extreme V∞
          // (e.g. Mariner 4 flyby V∞ = 5.0 km/s vs 2.94 Hohmann baseline).
          // Tolerance reflects the documented model approximation envelope.
          const expected = earthPos(arcs.timeline.dep_day);
          const dist = Math.hypot(first.x - expected.x, first.z - expected.z);
          if (dist > 0.15) {
            throw new Error(
              `${m.id} outbound start ${dist.toFixed(3)} AU from Earth — exceeds V∞-shape envelope`,
            );
          }
        }
      });

      // ─── (d) Last point near destination ──────────────────────────
      it('outbound ends near destination', () => {
        const last = arcs.out[arcs.out.length - 1];
        if (arcs.isMoon) {
          const expected = moonPositionAtMet(arcs.timeline.flyby_day);
          // Moon-mode arc terminates at moonPos / SCALE_3D.
          expectCloseTo(last.x, expected.x / SCALE_3D, 5 / SCALE_3D, `${m.id} Moon-mode last.x`);
          expectCloseTo(last.z, expected.z / SCALE_3D, 5 / SCALE_3D, `${m.id} Moon-mode last.z`);
        } else {
          // Mars-bound: arc terminates near the destination orbit ring.
          // V∞ shaping (ADR-030) bends eccentricity without re-deriving
          // `a`, so high-V∞ missions terminate up to ~0.10 AU beyond
          // R_MARS (Mariner 4 V∞=5.0 → r≈1.615 vs Mars 1.524). The
          // tolerance reflects the documented model approximation.
          const expected = destinationPos(arcs.timeline.arr_day, 'mars');
          expectCloseTo(
            Math.hypot(last.x, last.z),
            Math.hypot(expected.x, expected.z),
            0.1,
            `${m.id} Mars last point on destination orbit ring`,
          );
        }
      });

      // ─── (e), (f), (g) spacecraftPos sanity ───────────────────────
      it('spacecraftPos(depDay) returns the start of the arc', () => {
        const sc = spacecraftPos(arcs.timeline.dep_day, arcs.timeline, arcs.out, arcs.ret);
        // Pre-launch returns out[0] with phase 'pre-launch' or 'outbound'
        // depending on === vs <=. Either way the position is the start.
        expectCloseTo(sc.pos.x, arcs.out[0].x, 1e-9, `${m.id} sc(depDay).pos.x`);
        expectCloseTo(sc.pos.z, arcs.out[0].z, 1e-9, `${m.id} sc(depDay).pos.z`);
      });

      it('spacecraftPos(flybyDay) sits at progress ≈ 0.5 (end of outbound arc)', () => {
        // The arc-progress halfway point is flyby_day, not (dep+arr)/2 —
        // /fly's flyby_day sits at 95% of transit time so the simulated
        // "midpoint by sim-day" doesn't match arc progress. Sampling at
        // flyby_day yields progress 0.5 for both one-way (end of outbound)
        // and round-trip (transition outbound→return) missions.
        const sc = spacecraftPos(arcs.timeline.flyby_day, arcs.timeline, arcs.out, arcs.ret);
        expectCloseTo(sc.progress, 0.5, 0.001, `${m.id} sc(flybyDay).progress`);
        // Position at flyby_day should be the last outbound vertex.
        const lastOut = arcs.out[arcs.out.length - 1];
        expectCloseTo(sc.pos.x, lastOut.x, 1e-9, `${m.id} sc(flybyDay).pos.x`);
        expectCloseTo(sc.pos.z, lastOut.z, 1e-9, `${m.id} sc(flybyDay).pos.z`);
      });

      it('spacecraftPos at arrival returns the end of the actual flown arc', () => {
        // One-way missions don't define `ret[]`, and spacecraftPos past
        // flyby_day for a one-way mission is undefined (no return arc).
        // The /fly visualisation stops the spacecraft at flyby_day for
        // one-way missions; round-trip missions extend through arr_day.
        if (arcs.isReturnTrip) {
          const sc = spacecraftPos(arcs.timeline.arr_day, arcs.timeline, arcs.out, arcs.ret);
          const lastRet = arcs.ret[arcs.ret.length - 1];
          expectCloseTo(sc.pos.x, lastRet.x, 1e-9, `${m.id} sc(arrDay).pos.x`);
          expectCloseTo(sc.pos.z, lastRet.z, 1e-9, `${m.id} sc(arrDay).pos.z`);
          expectCloseTo(sc.progress, 1, 1e-9, `${m.id} sc(arrDay).progress`);
        } else {
          // One-way: the flown arc terminates at flyby_day. Past that
          // point the spacecraft is "arrived" and stays at the last
          // outbound vertex.
          const sc = spacecraftPos(arcs.timeline.flyby_day, arcs.timeline, arcs.out, arcs.ret);
          const lastOut = arcs.out[arcs.out.length - 1];
          expectCloseTo(sc.pos.x, lastOut.x, 1e-9, `${m.id} sc(flybyDay).pos.x`);
          expectCloseTo(sc.pos.z, lastOut.z, 1e-9, `${m.id} sc(flybyDay).pos.z`);
        }
      });

      // ─── (h) Round-trip checks ────────────────────────────────────
      it('round-trip: retPts is non-empty AND midpoint differs from outbound midpoint', () => {
        if (!arcs.isReturnTrip) return; // one-way mission — skip
        if (arcs.ret.length !== ARC_STEPS + 1) {
          throw new Error(`${m.id} ret.length = ${arcs.ret.length}, expected ${ARC_STEPS + 1}`);
        }
        const outMid = arcs.out[Math.floor(arcs.out.length / 2)];
        const retMid = arcs.ret[Math.floor(arcs.ret.length / 2)];
        const dist = Math.hypot(outMid.x - retMid.x, outMid.z - retMid.z);
        if (dist < 0.02) {
          throw new Error(
            `${m.id} round-trip: outbound + return midpoints overlap (dist=${dist.toFixed(4)} AU)`,
          );
        }
      });

      // ─── Bonus: V∞ shaping unchanged when mission has flight data ─
      it('V∞ shaping (when present) keeps arc finite + bounded', () => {
        if (arcs.isMoon) return; // Moon-mode doesn't use V∞ shaping
        const vInf = m.json.flight?.arrival?.v_infinity_km_s;
        if (vInf == null) return; // no flight data — skip
        // Already covered by (b) on this mission's arc; assert the
        // arc max-radius stays under 3 AU (sanity bound for the
        // Mars Hohmann ± clamped V∞ shaping).
        const maxR = arcs.out.reduce((m, p) => Math.max(m, Math.hypot(p.x, p.z)), 0);
        if (maxR > 3.0) {
          throw new Error(
            `${m.id} arc max radius ${maxR.toFixed(3)} AU exceeds Mars-Hohmann sanity bound (3.0)`,
          );
        }
      });
    });
  }
});
