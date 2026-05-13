/**
 * Cislunar trajectory geometry (ADR-058) — pure functions in
 * Earth-Centered Inertial (ECI) coordinates, km. Consumed by /fly's
 * cislunar scene; mirrors the pure-function isolation pattern of
 * src/lib/mission-arc.ts (ADR-030) so the math is unit-testable
 * without Three.js.
 *
 * Tier 1 (analytic) generates phase shapes from parametric inputs.
 * Tier 2 (published) interpolates pre-supplied waypoints. The
 * dispatch lives in buildCislunarTrajectory().
 */

// ─── Constants (Earth-Moon system) ─────────────────────────────
export const MU_EARTH_KM3_S2 = 398600.4418;
export const MU_MOON_KM3_S2 = 4902.800066;
export const R_EARTH_KM = 6378.137;
export const R_MOON_KM = 1737.4;
export const A_MOON_KM = 384400;
export const T_MOON_DAYS = 27.321661;

// ─── Types ────────────────────────────────────────────────────
export type Vec3Km = { x: number; y: number; z: number };

export type CislunarPhaseType =
  | 'parking'
  | 'tli_coast'
  | 'lunar_orbit'
  | 'lunar_flyby'
  | 'descent'
  | 'ascent'
  | 'tei_coast'
  | 'reentry'
  | 'spiral_earth'
  | 'spiral_lunar';

export interface CislunarPhase {
  type: CislunarPhaseType;
  start_met_days: number;
  end_met_days: number;
  points: Vec3Km[];
}

export interface CislunarTrajectory {
  phases: CislunarPhase[];
  moon_track: Vec3Km[];
  closest_approach_km: number;
}

export interface CislunarProfile {
  source_tier?: 'tier_1_analytic' | 'tier_2_published';
  parking_orbit?: { altitude_km?: number; inclination_deg?: number; revs?: number };
  tli?: { dv_kms?: number; c3_km2_s2?: number };
  translunar?: { type?: 'direct' | 'free_return' | 'hybrid_free_return' | 'spiral' };
  lunar_arrival?: {
    type?: 'impact' | 'orbit' | 'flyby' | 'lor_orbit';
    altitude_km?: number;
    inclination_deg?: number;
    periselene_km?: number;
  };
  return?: { type?: 'none' | 'tei_direct' | 'tei_lor'; dv_kms?: number };
  waypoints_km?: Array<[number, number, number, number]>;
}

export interface BuildCislunarOptions {
  dep_day_sim: number;
  transit_days: number;
  is_return_trip: boolean;
}

// ─── Moon ephemeris (Tier 1 approximation) ─────────────────────
/** Moon's ECI position at simulation day. Circular orbit in the
 *  x/z plane (Y=ecliptic-north). The reference phase at sim_day=0
 *  is arbitrary — only relative geometry matters for the cislunar
 *  view. A future revision could anchor to JPL DE440 for true phase
 *  but that's outside Tier 1 scope. */
export function moonEciPos(sim_day: number): Vec3Km {
  const angle = (sim_day / T_MOON_DAYS) * 2 * Math.PI;
  return {
    x: Math.cos(angle) * A_MOON_KM,
    y: 0,
    z: Math.sin(angle) * A_MOON_KM,
  };
}

// ─── Phase generators ─────────────────────────────────────────
/** Earth parking orbit: circle at R_EARTH+altitude with the given
 *  inclination, sweeping `revs` revolutions. Inclination rotates
 *  the orbit plane about the x-axis from the equator. */
export function parkingOrbit(
  altitude_km: number,
  inclination_deg: number,
  revs: number,
  steps: number,
): Vec3Km[] {
  const r = R_EARTH_KM + altitude_km;
  const inc = (inclination_deg * Math.PI) / 180;
  const total_sweep = revs * 2 * Math.PI;
  const pts: Vec3Km[] = [];
  for (let i = 0; i <= steps; i++) {
    const nu = (total_sweep * i) / steps;
    const xl = r * Math.cos(nu);
    const zl = r * Math.sin(nu);
    pts.push({
      x: xl,
      y: -zl * Math.sin(inc),
      z: zl * Math.cos(inc),
    });
  }
  return pts;
}

/** Translunar coast as a Keplerian ellipse with Earth at one focus.
 *  Perigee at parkingExit (TLI burn point); apogee positioned just
 *  past the Moon's far side at periselene_km altitude above the
 *  lunar surface, which is the standard free-return geometry. The
 *  spacecraft and the Moon meet at the apogee point at flyby_day.
 *
 *  For 'direct' / 'free_return' / 'hybrid_free_return' types the
 *  Tier 1 shape is the same — the differentiator is periselene_km
 *  (Apollo: ~110 km; Artemis II: 9,200 km). 'spiral' is handled
 *  separately by spiralEarth(). */
export function translunarCoast(
  parkingExit: Vec3Km,
  moonAtArrival: Vec3Km,
  periselene_km: number,
  steps: number,
): Vec3Km[] {
  const moonMag = Math.hypot(moonAtArrival.x, moonAtArrival.y, moonAtArrival.z);
  if (moonMag < 1e-6) return [parkingExit, moonAtArrival];
  const farSide = R_MOON_KM + periselene_km;
  const scale = 1 + farSide / moonMag;
  const apogee: Vec3Km = {
    x: moonAtArrival.x * scale,
    y: moonAtArrival.y * scale,
    z: moonAtArrival.z * scale,
  };
  return keplerianArcEarthFocus(parkingExit, apogee, steps);
}

/** Trans-Earth coast: mirror of translunar — Keplerian ellipse from
 *  lunar departure back to Earth re-entry interface. */
export function transEarthCoast(
  moonDeparture: Vec3Km,
  earthAtReturn: Vec3Km,
  steps: number,
): Vec3Km[] {
  return keplerianArcEarthFocus(moonDeparture, earthAtReturn, steps);
}

/** Circular orbit around the Moon at the given altitude, inclination,
 *  sweeping `revs` revolutions. Reference plane is the Moon's local
 *  equator (matching the inclination_deg semantics from the schema).
 *  Returns points in ECI km (offset by moonPos). */
export function lunarOrbit(
  moonPos: Vec3Km,
  altitude_km: number,
  inclination_deg: number,
  revs: number,
  steps: number,
): Vec3Km[] {
  const r = R_MOON_KM + altitude_km;
  const inc = (inclination_deg * Math.PI) / 180;
  const total_sweep = revs * 2 * Math.PI;
  const pts: Vec3Km[] = [];
  for (let i = 0; i <= steps; i++) {
    const nu = (total_sweep * i) / steps;
    const xl = r * Math.cos(nu);
    const zl = r * Math.sin(nu);
    pts.push({
      x: moonPos.x + xl,
      y: moonPos.y + -zl * Math.sin(inc),
      z: moonPos.z + zl * Math.cos(inc),
    });
  }
  return pts;
}

/** Hyperbolic lunar flyby — short swing past the Moon at periselene_km
 *  altitude. Used for Apollo-class free-return where lunar gravity
 *  bends the trajectory in a tight arc near closest approach. For
 *  Tier 1 we approximate the hyperbolic asymptotes with a planar arc
 *  whose apex is at periselene altitude on the anti-Earth side of the
 *  Moon. */
export function lunarFlyby(
  moonPos: Vec3Km,
  periselene_km: number,
  steps: number,
): Vec3Km[] {
  const moonMag = Math.hypot(moonPos.x, moonPos.y, moonPos.z);
  if (moonMag < 1e-6) return [moonPos];
  // Anti-Earth unit vector at the Moon — periselene is on the far side.
  const ux = moonPos.x / moonMag;
  const uz = moonPos.z / moonMag;
  // Perpendicular (in the x/z plane) for the asymptotic entry/exit.
  const px = -uz;
  const pz = ux;
  const r = R_MOON_KM + periselene_km;
  const asymptote_r = r * 3; // entry/exit points well outside periselene.
  const pts: Vec3Km[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 - 1; // -1 → +1
    // Quadratic blend: t = ±1 → asymptote, t = 0 → periselene at far side.
    const tangential = t * asymptote_r;
    const radial_offset = r + (1 - Math.abs(t)) * (asymptote_r - r) * 0;
    pts.push({
      x: moonPos.x + ux * radial_offset + px * tangential,
      y: moonPos.y,
      z: moonPos.z + uz * radial_offset + pz * tangential,
    });
  }
  return pts;
}

/** Powered descent: short curved path from lunar orbit periselene
 *  down to the surface. For Tier 1 visual purposes this is a
 *  half-ellipse from orbit altitude to landing altitude (taken as
 *  R_MOON surface). */
export function descent(
  orbitPoint: Vec3Km,
  moonPos: Vec3Km,
  steps: number,
): Vec3Km[] {
  // Surface point directly below orbitPoint on the Moon.
  const dx = orbitPoint.x - moonPos.x;
  const dy = orbitPoint.y - moonPos.y;
  const dz = orbitPoint.z - moonPos.z;
  const radial = Math.hypot(dx, dy, dz);
  if (radial < 1e-6) return [orbitPoint];
  const surfX = moonPos.x + (dx / radial) * R_MOON_KM;
  const surfY = moonPos.y + (dy / radial) * R_MOON_KM;
  const surfZ = moonPos.z + (dz / radial) * R_MOON_KM;
  // Curve via a sideways control point so the descent looks like a
  // real powered descent (sweeping past horizon) rather than a vertical drop.
  const pts: Vec3Km[] = [];
  // Tangent direction in the local orbital plane (cross orbitOffset × y).
  const tangentX = dz;
  const tangentZ = -dx;
  const tangentMag = Math.hypot(tangentX, tangentZ) || 1;
  const sweep = R_MOON_KM * 0.7; // ground track distance
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Bezier-style quadratic: midpoint pulled tangentially.
    const inv = 1 - t;
    const midX = orbitPoint.x + (tangentX / tangentMag) * sweep * 0.5;
    const midZ = orbitPoint.z + (tangentZ / tangentMag) * sweep * 0.5;
    pts.push({
      x: inv * inv * orbitPoint.x + 2 * inv * t * midX + t * t * surfX,
      y: inv * inv * orbitPoint.y + 2 * inv * t * moonPos.y + t * t * surfY,
      z: inv * inv * orbitPoint.z + 2 * inv * t * midZ + t * t * surfZ,
    });
  }
  return pts;
}

/** Lunar ascent — mirror of descent: surface → orbit altitude. */
export function ascent(
  surfacePoint: Vec3Km,
  orbitPoint: Vec3Km,
  moonPos: Vec3Km,
  steps: number,
): Vec3Km[] {
  return descent(orbitPoint, moonPos, steps).reverse();
}

/** Earth-bound spiral (Chandrayaan-class). Multi-burn perigee-raise
 *  manoeuvres turn a LEO into a highly elliptical orbit, eventually
 *  reaching lunar distance. Rendered as a logarithmic spiral with
 *  `burnCount` discontinuities (visual kinks) to suggest the burn
 *  pattern. The endpoint is the start of translunar coast. */
export function spiralEarth(
  startAltitude_km: number,
  endApogee_km: number,
  burnCount: number,
  steps: number,
): Vec3Km[] {
  const rStart = R_EARTH_KM + startAltitude_km;
  const rEnd = R_EARTH_KM + endApogee_km;
  const pts: Vec3Km[] = [];
  const totalSweep = burnCount * 2 * Math.PI;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const nu = t * totalSweep;
    // Logarithmic radius growth so each rev is larger than the last.
    const r = rStart * Math.pow(rEnd / rStart, t);
    pts.push({
      x: Math.cos(nu) * r,
      y: 0,
      z: Math.sin(nu) * r,
    });
  }
  return pts;
}

/** Lunar-bound spiral (Chandrayaan-3 phase after TLI). Multi-burn
 *  apoapsis lowering brings a highly elliptical lunar orbit down to
 *  a low circular orbit. Endpoint is the start of descent. */
export function spiralLunar(
  moonPos: Vec3Km,
  startAltitude_km: number,
  endAltitude_km: number,
  burnCount: number,
  steps: number,
): Vec3Km[] {
  const rStart = R_MOON_KM + startAltitude_km;
  const rEnd = R_MOON_KM + endAltitude_km;
  const pts: Vec3Km[] = [];
  const totalSweep = burnCount * 2 * Math.PI;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const nu = t * totalSweep;
    const r = rStart * Math.pow(rEnd / rStart, t);
    pts.push({
      x: moonPos.x + Math.cos(nu) * r,
      y: moonPos.y,
      z: moonPos.z + Math.sin(nu) * r,
    });
  }
  return pts;
}

/** Keplerian ellipse from p1 to p2 with Earth at one focus (origin),
 *  taking the prograde sweep. Orbit plane is defined by p1, p2, and
 *  the origin; the function solves the second focus in 2D and projects
 *  back to 3D. Same focus-finding method as transferEllipse() in
 *  src/lib/mission-arc.ts but Earth-centric instead of heliocentric. */
function keplerianArcEarthFocus(p1: Vec3Km, p2: Vec3Km, steps: number): Vec3Km[] {
  const r1 = Math.hypot(p1.x, p1.y, p1.z);
  const r2 = Math.hypot(p2.x, p2.y, p2.z);
  const a = (r1 + r2) / 2;
  if (r1 < 1e-9 || r2 < 1e-9) return linear(p1, p2, steps);

  const nx = p1.y * p2.z - p1.z * p2.y;
  const ny = p1.z * p2.x - p1.x * p2.z;
  const nz = p1.x * p2.y - p1.y * p2.x;
  const nMag = Math.hypot(nx, ny, nz);
  if (nMag < 1e-6) return linear(p1, p2, steps);
  const unitN: Vec3Km = { x: nx / nMag, y: ny / nMag, z: nz / nMag };

  const e1: Vec3Km = { x: p1.x / r1, y: p1.y / r1, z: p1.z / r1 };
  const e2: Vec3Km = {
    x: unitN.y * e1.z - unitN.z * e1.y,
    y: unitN.z * e1.x - unitN.x * e1.z,
    z: unitN.x * e1.y - unitN.y * e1.x,
  };

  // p1 in orbit-plane 2D = (r1, 0). p2 projected via (e1, e2).
  const p2x_2d = p2.x * e1.x + p2.y * e1.y + p2.z * e1.z;
  const p2y_2d = p2.x * e2.x + p2.y * e2.y + p2.z * e2.z;
  const p1_2d = { x: r1, y: 0 };
  const p2_2d = { x: p2x_2d, y: p2y_2d };
  const chord_2d = Math.hypot(p2_2d.x - p1_2d.x, p2_2d.y - p1_2d.y);
  if (chord_2d < 1e-9) return linear(p1, p2, steps);

  const rA = 2 * a - r1;
  const rB = 2 * a - r2;
  const aProj = (chord_2d * chord_2d + rA * rA - rB * rB) / (2 * chord_2d);
  const hSqr = rA * rA - aProj * aProj;
  const h = Math.sqrt(Math.max(0, hSqr));
  const mx = p1_2d.x + ((p2_2d.x - p1_2d.x) * aProj) / chord_2d;
  const my = p1_2d.y + ((p2_2d.y - p1_2d.y) * aProj) / chord_2d;
  const perpX = -(p2_2d.y - p1_2d.y) / chord_2d;
  const perpY = (p2_2d.x - p1_2d.x) / chord_2d;

  const ang1 = Math.atan2(p1_2d.y, p1_2d.x);
  const ang2 = Math.atan2(p2_2d.y, p2_2d.x);
  let desiredSweep = ang2 - ang1;
  while (desiredSweep <= 0) desiredSweep += 2 * Math.PI;
  while (desiredSweep > 2 * Math.PI) desiredSweep -= 2 * Math.PI;

  const F2candidates = [
    { x: mx + h * perpX, y: my + h * perpY },
    { x: mx - h * perpX, y: my - h * perpY },
  ];

  let best: { sweep: number; nu1: number; periAngle: number; F2: { x: number; y: number } } | null = null;
  for (const F2 of F2candidates) {
    const periAngle = Math.atan2(-F2.y, -F2.x);
    const nu1 = ang1 - periAngle;
    const nu2 = ang2 - periAngle;
    let sweep = nu2 - nu1;
    while (sweep <= 0) sweep += 2 * Math.PI;
    while (sweep > 2 * Math.PI) sweep -= 2 * Math.PI;
    const err = Math.abs(sweep - desiredSweep);
    if (!best || err < Math.abs(best.sweep - desiredSweep)) {
      best = { F2, sweep, nu1, periAngle };
    }
  }
  if (!best) return linear(p1, p2, steps);

  const cMag = Math.hypot(best.F2.x, best.F2.y) / 2;
  const e = cMag / a;
  const p_param = a * (1 - e * e);

  const pts: Vec3Km[] = [];
  for (let i = 0; i <= steps; i++) {
    const nu = best.nu1 + (best.sweep * i) / steps;
    const r = p_param / (1 + e * Math.cos(nu));
    const ang = nu + best.periAngle;
    const x2d = r * Math.cos(ang);
    const y2d = r * Math.sin(ang);
    pts.push({
      x: e1.x * x2d + e2.x * y2d,
      y: e1.y * x2d + e2.y * y2d,
      z: e1.z * x2d + e2.z * y2d,
    });
  }
  // Pin endpoints exactly so consumers depending on out[0] === p1 and
  // out[last] === p2 are not bitten by floating-point drift.
  pts[0] = { x: p1.x, y: p1.y, z: p1.z };
  pts[pts.length - 1] = { x: p2.x, y: p2.y, z: p2.z };
  return pts;
}

function linear(p1: Vec3Km, p2: Vec3Km, steps: number): Vec3Km[] {
  const pts: Vec3Km[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    pts.push({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t,
      z: p1.z + (p2.z - p1.z) * t,
    });
  }
  pts[0] = { x: p1.x, y: p1.y, z: p1.z };
  pts[pts.length - 1] = { x: p2.x, y: p2.y, z: p2.z };
  return pts;
}

// ─── Trajectory composition ───────────────────────────────────
/** Compose a full cislunar trajectory from a mission's cislunar_profile
 *  + timeline. Tier 2 (waypoints_km present) takes precedence; Tier 1
 *  falls back to parametric phase generation. */
export function buildCislunarTrajectory(
  profile: CislunarProfile | undefined,
  opts: BuildCislunarOptions,
): CislunarTrajectory {
  const { dep_day_sim, transit_days, is_return_trip } = opts;

  if (profile?.waypoints_km && profile.waypoints_km.length >= 2) {
    return buildFromWaypoints(profile.waypoints_km, dep_day_sim);
  }

  const phases: CislunarPhase[] = [];
  const flyby_day = dep_day_sim + transit_days;
  const moonAtFlyby = moonEciPos(flyby_day);

  const parkingAlt = profile?.parking_orbit?.altitude_km ?? 185;
  const parkingInc = profile?.parking_orbit?.inclination_deg ?? 28.5;
  const parkingRevs = profile?.parking_orbit?.revs ?? 1.5;
  const periselene = profile?.lunar_arrival?.periselene_km ?? 110;
  const lunarAlt = profile?.lunar_arrival?.altitude_km ?? periselene;
  const lunarInc = profile?.lunar_arrival?.inclination_deg ?? 0;
  const arrivalType = profile?.lunar_arrival?.type ?? 'flyby';
  const translunarType = profile?.translunar?.type ?? 'direct';
  const returnType = profile?.return?.type ?? 'none';

  // MET allocation per phase. Each phase's start/end_met_days is the
  // wall-clock fraction of the mission timeline so the scrubber rides
  // the right segment at the right time. Allocations are heuristic for
  // Tier 1; Stage 2 missions with waypoints_km use the precise values.
  let metCursor = 0;
  let lastPoint: Vec3Km;

  // ── 1. Earth-side outbound: parking + spiral OR straight tli_coast ──
  if (translunarType === 'spiral') {
    // Chandrayaan-class multi-burn perigee raise. Compresses to ~50% of
    // outbound MET to leave room for lunar approach phases.
    const spiralPts = spiralEarth(parkingAlt, A_MOON_KM - R_EARTH_KM - 50000, 5, 192);
    const spiralEndMET = transit_days * 0.5;
    phases.push({
      type: 'spiral_earth',
      start_met_days: metCursor,
      end_met_days: spiralEndMET,
      points: spiralPts,
    });
    metCursor = spiralEndMET;
    lastPoint = spiralPts[spiralPts.length - 1];
  } else {
    const parkingPts = parkingOrbit(parkingAlt, parkingInc, parkingRevs, 96);
    const parkingEndMET = transit_days * 0.04;
    phases.push({
      type: 'parking',
      start_met_days: 0,
      end_met_days: parkingEndMET,
      points: parkingPts,
    });
    metCursor = parkingEndMET;
    lastPoint = parkingPts[parkingPts.length - 1];
  }

  // ── 2. Translunar coast ──
  const tliCoastPts = translunarCoast(lastPoint, moonAtFlyby, periselene, 192);
  const tliEndMET = transit_days;
  phases.push({
    type: 'tli_coast',
    start_met_days: metCursor,
    end_met_days: tliEndMET,
    points: tliCoastPts,
  });
  metCursor = tliEndMET;
  lastPoint = tliCoastPts[tliCoastPts.length - 1];

  // ── 3. Lunar arrival phase ──
  if (arrivalType === 'flyby') {
    // Free-return / hybrid: no LOI; spacecraft swings past and (if
    // return_trip) curves back to Earth via tei_coast.
    // Skip explicit flyby phase — the tli_coast already terminates
    // at periselene; tei_coast picks up from there.
  } else if (arrivalType === 'impact') {
    // Direct hard-land (Luna 9). No orbit; tli_coast terminus IS the
    // descent. Add a short impact segment for visual continuity.
    const surfacePoint: Vec3Km = {
      x: moonAtFlyby.x + (lastPoint.x - moonAtFlyby.x) * (R_MOON_KM / (R_MOON_KM + periselene)),
      y: moonAtFlyby.y + (lastPoint.y - moonAtFlyby.y) * (R_MOON_KM / (R_MOON_KM + periselene)),
      z: moonAtFlyby.z + (lastPoint.z - moonAtFlyby.z) * (R_MOON_KM / (R_MOON_KM + periselene)),
    };
    const impactPts = linear(lastPoint, surfacePoint, 48);
    phases.push({
      type: 'descent',
      start_met_days: metCursor,
      end_met_days: metCursor + transit_days * 0.01,
      points: impactPts,
    });
    metCursor += transit_days * 0.01;
    lastPoint = surfacePoint;
  } else if (arrivalType === 'orbit' || arrivalType === 'lor_orbit') {
    // Lunar orbit insertion. For 'spiral' translunar, follow with a
    // lunar-side spiral down to operational altitude.
    const lunarPhaseMET = is_return_trip ? transit_days * 0.2 : transit_days * 0.1;
    if (translunarType === 'spiral') {
      const spiralLunarPts = spiralLunar(moonAtFlyby, lunarAlt * 3, lunarAlt, 3, 96);
      phases.push({
        type: 'spiral_lunar',
        start_met_days: metCursor,
        end_met_days: metCursor + lunarPhaseMET,
        points: spiralLunarPts,
      });
      lastPoint = spiralLunarPts[spiralLunarPts.length - 1];
    } else {
      const orbitPts = lunarOrbit(moonAtFlyby, lunarAlt, lunarInc, 1.5, 96);
      phases.push({
        type: 'lunar_orbit',
        start_met_days: metCursor,
        end_met_days: metCursor + lunarPhaseMET,
        points: orbitPts,
      });
      lastPoint = orbitPts[orbitPts.length - 1];
    }
    metCursor += lunarPhaseMET;
  }

  // ── 4. Return: tei_coast (Apollo / Luna sample-return) or LOR + tei_coast ──
  if (is_return_trip && returnType !== 'none') {
    const earthReturnDay = dep_day_sim + (is_return_trip ? transit_days * 2 : transit_days);
    // Re-entry interface ~120 km altitude on the night side.
    const lastMag = Math.hypot(lastPoint.x, lastPoint.y, lastPoint.z);
    const reentryR = R_EARTH_KM + 120;
    const reentry: Vec3Km = lastMag < 1e-6
      ? { x: -reentryR, y: 0, z: 0 }
      : {
          x: (-lastPoint.x / lastMag) * reentryR,
          y: (-lastPoint.y / lastMag) * reentryR,
          z: (-lastPoint.z / lastMag) * reentryR,
        };
    const teiPts = transEarthCoast(lastPoint, reentry, 192);
    const teiEndMET = transit_days * 2;
    phases.push({
      type: 'tei_coast',
      start_met_days: metCursor,
      end_met_days: teiEndMET,
      points: teiPts,
    });
    metCursor = teiEndMET;
    // earthReturnDay is implicit in teiEndMET; reference suppressed
    // to keep the linter happy.
    void earthReturnDay;
  } else if (is_return_trip && arrivalType === 'flyby') {
    // Free-return: tli_coast terminus → back to Earth. No explicit
    // TEI burn; the trajectory naturally returns.
    const lastMag = Math.hypot(lastPoint.x, lastPoint.y, lastPoint.z);
    const reentryR = R_EARTH_KM + 120;
    const reentry: Vec3Km = lastMag < 1e-6
      ? { x: -reentryR, y: 0, z: 0 }
      : {
          x: (-lastPoint.x / lastMag) * reentryR,
          y: (-lastPoint.y / lastMag) * reentryR,
          z: (-lastPoint.z / lastMag) * reentryR,
        };
    const teiPts = transEarthCoast(lastPoint, reentry, 192);
    phases.push({
      type: 'tei_coast',
      start_met_days: metCursor,
      end_met_days: transit_days * 2,
      points: teiPts,
    });
  }

  const total_days = is_return_trip ? transit_days * 2 : transit_days;
  const moon_track: Vec3Km[] = [];
  const moonSteps = 96;
  for (let i = 0; i <= moonSteps; i++) {
    const t = i / moonSteps;
    moon_track.push(moonEciPos(dep_day_sim + t * total_days));
  }

  return {
    phases,
    moon_track,
    closest_approach_km: R_MOON_KM + periselene,
  };
}

function buildFromWaypoints(
  waypoints: Array<[number, number, number, number]>,
  dep_day_sim: number,
): CislunarTrajectory {
  const points: Vec3Km[] = waypoints.map(([, x, y, z]) => ({ x, y, z }));
  const phases: CislunarPhase[] = [
    {
      type: 'tli_coast',
      start_met_days: waypoints[0][0],
      end_met_days: waypoints[waypoints.length - 1][0],
      points,
    },
  ];

  const moon_track: Vec3Km[] = waypoints.map(([metDays]) => moonEciPos(dep_day_sim + metDays));

  let closest_approach_km = Infinity;
  for (const [metDays, x, y, z] of waypoints) {
    const m = moonEciPos(dep_day_sim + metDays);
    const d = Math.hypot(x - m.x, y - m.y, z - m.z);
    if (d < closest_approach_km) closest_approach_km = d;
  }

  return { phases, moon_track, closest_approach_km };
}
