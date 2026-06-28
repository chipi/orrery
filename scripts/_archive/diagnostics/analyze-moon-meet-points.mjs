#!/usr/bin/env node
/**
 * Analyse cislunar trajectory phase connection points for every Moon
 * mission. Reports for each mission:
 *   - Phase sequence as built by buildCislunarTrajectory()
 *   - Max gap between adjacent phase endpoints (should be ~0 km)
 *   - Outbound→return meet point: altitude above lunar surface +
 *     where the connection happens (lunar_orbit→tei_coast, flyby
 *     periselene, lunar surface for landers, etc.)
 *
 * Run: npx tsx scripts/analyze-moon-meet-points.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildCislunarTrajectory, R_MOON_KM, moonEciPos } from '../src/lib/cislunar-geometry.ts';

const MISSIONS_DIR = path.resolve('static/data/missions/moon');
const I18N_DIR = path.resolve('static/data/i18n/en-US/missions/moon');

const order = [
  'apollo11.json',
  'apollo13.json',
  'apollo17.json',
  'artemis2.json',
  'artemis3.json',
  'luna9.json',
  'luna17.json',
  'luna24.json',
  'lro.json',
  'clementine.json',
  'chandrayaan1.json',
  'chandrayaan3.json',
  'change4.json',
  'change5.json',
  'change6.json',
  'slim.json',
  'blue-moon-mk1.json',
];

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function fmt(n, w = 8) {
  if (!Number.isFinite(n)) return String(n).padStart(w);
  if (Math.abs(n) >= 1000) return Math.round(n).toLocaleString().padStart(w);
  return n.toFixed(1).padStart(w);
}

console.log('');
console.log('Per-mission cislunar trajectory connection analysis (ADR-058 Tier 1)');
console.log('');
console.log(
  'mission              translunar       phases                                          phase gap (km)   meet point',
);
console.log('─'.repeat(170));

for (const f of order) {
  const mPath = path.join(MISSIONS_DIR, f);
  if (!fs.existsSync(mPath)) continue;
  const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
  let overlay = {};
  try {
    overlay = JSON.parse(fs.readFileSync(path.join(I18N_DIR, f), 'utf8'));
  } catch {
    // Missing en-US overlay is benign here — mission goes through with
    // an empty overlay (type='' → isReturnTrip=false), which suits
    // orbiter/lander entries without editorial copy.
  }
  const missionType = (overlay.type ?? '').toUpperCase();
  const isReturnTrip =
    missionType.includes('SAMPLE RETURN') ||
    missionType.includes('CREWED') ||
    missionType.includes('FLYBY');

  const traj = buildCislunarTrajectory(m.flight?.cislunar_profile, {
    dep_day_sim: 0,
    transit_days: m.transit_days ?? 4,
    is_return_trip: isReturnTrip,
  });

  const phases = traj.phases.map((p) => p.type);
  const flybyDay = m.transit_days ?? 4;
  const moon = moonEciPos(flybyDay);

  // Effective (rendered) gap: lunar-local phases are rendered with a
  // (currentMoon - moonAtFlyby) offset via the moonFrameGroup, and the
  // time-consistency shift already baked that delta into tei_coast's
  // raw first point. So at render time the connection is seamless;
  // the raw-coord gap is just the Moon's orbital motion during the
  // lunar phase. We measure the effective gap here.
  const LUNAR_LOCAL = new Set(['lunar_orbit', 'spiral_lunar', 'lunar_flyby', 'descent', 'ascent']);
  const moonRefForRender = moonEciPos(flybyDay);
  function effectivePoint(point, phase, time_met) {
    if (!LUNAR_LOCAL.has(phase.type)) return point;
    const moonAtTime = moonEciPos(time_met);
    return {
      x: point.x + (moonAtTime.x - moonRefForRender.x),
      y: point.y + (moonAtTime.y - moonRefForRender.y),
      z: point.z + (moonAtTime.z - moonRefForRender.z),
    };
  }
  let maxGap = 0;
  for (let i = 0; i < traj.phases.length - 1; i++) {
    const phaseA = traj.phases[i];
    const phaseB = traj.phases[i + 1];
    const endA = effectivePoint(
      phaseA.points[phaseA.points.length - 1],
      phaseA,
      phaseA.end_met_days,
    );
    const startB = effectivePoint(phaseB.points[0], phaseB, phaseB.start_met_days);
    maxGap = Math.max(maxGap, dist(endA, startB));
  }

  const tliIdx = phases.indexOf('tli_coast');
  const teiIdx = phases.indexOf('tei_coast');
  const orbitIdx = phases.indexOf('lunar_orbit');
  const spiralLunIdx = phases.indexOf('spiral_lunar');
  const descentIdx = phases.indexOf('descent');

  let meetPoint = null;
  let meetType = '';
  if (tliIdx >= 0 && teiIdx >= 0) {
    if (orbitIdx >= 0) {
      meetPoint = traj.phases[orbitIdx].points[traj.phases[orbitIdx].points.length - 1];
      meetType = 'orbit→tei';
    } else if (spiralLunIdx >= 0) {
      meetPoint = traj.phases[spiralLunIdx].points[traj.phases[spiralLunIdx].points.length - 1];
      meetType = 'spiral_lunar→tei';
    } else {
      meetPoint = traj.phases[tliIdx].points[traj.phases[tliIdx].points.length - 1];
      meetType = 'flyby periselene';
    }
  } else if (descentIdx >= 0) {
    meetPoint = traj.phases[descentIdx].points[traj.phases[descentIdx].points.length - 1];
    meetType = 'lunar surface';
  } else if (traj.phases.length > 0) {
    const last = traj.phases[traj.phases.length - 1];
    meetPoint = last.points[last.points.length - 1];
    meetType = `ends in ${last.type}`;
  }

  let desc = '—';
  if (meetPoint) {
    const dm = dist(meetPoint, moon) - R_MOON_KM;
    desc = `${fmt(dm, 6)} km above lunar surface (${meetType})`;
  }

  console.log(
    `${m.id.padEnd(20)} ${(m.flight?.cislunar_profile?.translunar?.type ?? '?').padEnd(16)} ${phases.join(' → ').padEnd(60)} ${('max ' + fmt(maxGap, 7)).padEnd(16)} ${desc}`,
  );
}
console.log('');
