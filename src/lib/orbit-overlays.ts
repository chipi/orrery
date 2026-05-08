import * as THREE from 'three';

/**
 * Orbit-overlay helpers — Phase G of the /science integration roadmap.
 *
 * Each helper returns a THREE.Group ready to add to a scene, with
 * `userData.layerKey` set so the consuming page can wire it to the
 * matching `onLayerChange()` subscription. Builders are idempotent and
 * stateless — the page owns mounting / disposing.
 *
 * Pattern matches src/lib/microgravity-axes.ts (Phase F).
 */

/** Sphere-of-influence radii in km — canonical values from JPL.
 *  - Earth: 924 000 km (used for /fly cruise transitions)
 *  - Mars:  577 000 km
 *  - Moon:   66 100 km (Earth-relative; not used at /fly heliocentric scale)
 */
export const SOI_KM: Record<'earth' | 'mars' | 'moon', number> = {
  earth: 924_000,
  mars: 577_000,
  moon: 66_100,
};

/** km per AU — duplicated from orbital.ts to keep this file
 *  framework-agnostic; tests can stub. */
const AU_TO_KM = 149_597_870.7;

/**
 * Compute the SoI radius in scene units, given a scene-scale factor.
 * scaleAuToScene defines how many scene units represent 1 AU; on /fly
 * this is 80 (SCALE_3D), so Earth's SoI of 924 000 km becomes
 * 924000/149597870 × 80 ≈ 0.49 scene units.
 */
export function soiRadiusInScene(body: 'earth' | 'mars' | 'moon', scaleAuToScene: number): number {
  return (SOI_KM[body] / AU_TO_KM) * scaleAuToScene;
}

/**
 * Build a translucent SoI ring around a body. Caller supplies the
 * radius in their scene's units. Returns a THREE.Group containing a
 * wireframe sphere + a bright equatorial ring.
 *
 * The page positions the group at the body's coordinate each frame and
 * toggles `group.visible` from the layer subscription.
 */
export function buildSoIRing(
  body: 'earth' | 'mars' | 'moon',
  radius: number,
  color = 0xffc850,
  segments = 48,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `soi_${body}`;
  group.userData.layerKey = 'soi';

  // Wireframe sphere: cheap, distinct from solid bodies, visible from
  // any camera angle.
  const sphereGeo = new THREE.SphereGeometry(radius, segments, Math.max(8, segments / 4));
  const sphereMat = new THREE.MeshBasicMaterial({
    color,
    wireframe: true,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  const sphere = new THREE.Mesh(sphereGeo, sphereMat);
  group.add(sphere);

  // Bright equatorial circle for stronger silhouette in the ecliptic.
  const ringGeo = new THREE.RingGeometry(radius * 0.999, radius * 1.001, segments);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  // Lay flat on the ecliptic (XZ plane on /fly).
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  group.visible = false;
  return group;
}

/**
 * Build a single gravity-vector arrow on the spacecraft pointing toward
 * a source body. Length is set by the caller per frame based on a log
 * scaling so multiple arrows of vastly different magnitudes coexist.
 *
 * Returns a THREE.ArrowHelper pre-configured with style; the caller
 * sets direction + length each frame via `setDirection()` + `setLength()`.
 */
export function buildGravityArrow(label: 'earth' | 'sun', color = 0x6aa9ff): THREE.ArrowHelper {
  const dir = new THREE.Vector3(1, 0, 0);
  const origin = new THREE.Vector3(0, 0, 0);
  const arrow = new THREE.ArrowHelper(dir, origin, 1, color, 0.18, 0.1);
  arrow.name = `gravity_${label}`;
  arrow.userData.layerKey = 'gravity';
  arrow.visible = false;
  return arrow;
}

/**
 * Compute log-scaled arrow length given a force magnitude. Used to fit
 * gravity vectors of vastly different magnitude (Sun-on-craft vs
 * Earth-on-craft inside its SoI) into a comparable visual range.
 *
 * Returns a length in scene units between `minLen` and `maxLen`.
 */
export function logScaleLength(
  forceN: number,
  minLen = 0.05,
  maxLen = 0.6,
  refMin = 1e-6,
  refMax = 1e2,
): number {
  if (forceN <= 0) return minLen;
  const logF = Math.log10(forceN);
  const logMin = Math.log10(refMin);
  const logMax = Math.log10(refMax);
  const t = Math.max(0, Math.min(1, (logF - logMin) / (logMax - logMin)));
  return minLen + t * (maxLen - minLen);
}

/**
 * Compute the Newtonian gravitational force magnitude at distance r km
 * from a body of mass M kg. Returns force per unit mass (i.e. acceleration
 * in m/s²) — overlay length is derived from this scalar so it doesn't
 * depend on spacecraft mass.
 *
 * G = 6.674e-11 N m²/kg²
 *   = 6.674e-11 × 1e-6 N km² /kg²
 */
export function gravityAccel(massKg: number, distanceKm: number): number {
  const G = 6.674e-11;
  const distanceM = distanceKm * 1000;
  if (distanceM <= 0) return 0;
  return (G * massKg) / (distanceM * distanceM);
}

/** Body masses (kg) — used by gravityAccel for the on-spacecraft layer. */
export const BODY_MASS_KG: Record<'sun' | 'earth' | 'mars' | 'moon', number> = {
  sun: 1.989e30,
  earth: 5.972e24,
  mars: 6.39e23,
  moon: 7.342e22,
};

/**
 * Build a dashed line for the engine-off coast preview. Caller updates
 * the geometry's positions per frame via setCoastGeometry().
 *
 * Returns a THREE.Line ready to add to a scene; uses LineDashedMaterial
 * so dashes render after computeLineDistances() is called on the new
 * geometry. Caller must invoke `coastLine.computeLineDistances()` after
 * each setCoastGeometry() to refresh the dash pattern.
 */
export function buildCoastLine(color = 0xffc850): THREE.Line {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(0), 3));
  const mat = new THREE.LineDashedMaterial({
    color,
    dashSize: 1.5,
    gapSize: 1.0,
    transparent: true,
    opacity: 0.7,
    linewidth: 1,
  });
  const line = new THREE.Line(geom, mat);
  line.name = 'engine_off_coast';
  line.userData.layerKey = 'coast';
  line.visible = false;
  return line;
}

/**
 * Classify a Keplerian conic section from heliocentric (r, v) state.
 *
 * Inputs in AU + AU/day; output describes the orbit type plus its
 * canonical shape parameters:
 *   - shape:   'circle' | 'ellipse' | 'parabola' | 'hyperbola'
 *   - a:       semi-major axis (AU); negative for hyperbolic
 *   - e:       eccentricity (dimensionless); 1 for parabolic
 *   - epsilon: specific orbital energy (AU²/day²)
 *
 * Classification rules:
 *   ε < 0  → bound (ellipse). e ≈ 0 → circle.
 *   ε ≈ 0  → parabolic (escape velocity exactly).
 *   ε > 0  → hyperbolic (escape with leftover speed).
 *
 * The "ε ≈ 0" parabolic window is narrow in practice; we tag it when
 * |ε| / (μ/r) < `parabolicTol` to avoid flickering between ellipse
 * and hyperbola at the boundary.
 */
export function classifyConic(
  r: { x: number; y: number; z: number },
  v: { x: number; y: number; z: number },
  parabolicTol = 0.005,
  circularTol = 0.001,
): {
  shape: 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
  a: number;
  e: number;
  epsilon: number;
} {
  // μ_sun in AU³/day² (matches integrateCoast above).
  const MU = (4 * Math.PI * Math.PI) / (365.25 * 365.25);
  const rMag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
  const vMag2 = v.x * v.x + v.y * v.y + v.z * v.z;
  const epsilon = vMag2 / 2 - MU / rMag;

  // Specific angular momentum vector h = r × v.
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  const hz = r.x * v.y - r.y * v.x;
  const h2 = hx * hx + hy * hy + hz * hz;

  // Eccentricity from energy + angular momentum:
  //   e² = 1 + 2εh²/μ²
  const eSquared = 1 + (2 * epsilon * h2) / (MU * MU);
  const e = Math.sqrt(Math.max(0, eSquared));

  // Semi-major axis from energy: a = -μ/(2ε). Diverges at ε = 0.
  const a = epsilon !== 0 ? -MU / (2 * epsilon) : Infinity;

  // Classification with hysteresis-friendly tolerances.
  const refScale = MU / rMag; // characteristic energy scale at this r
  let shape: 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
  if (Math.abs(epsilon) < parabolicTol * refScale) shape = 'parabola';
  else if (epsilon > 0) shape = 'hyperbola';
  else if (e < circularTol) shape = 'circle';
  else shape = 'ellipse';

  return { shape, a, e, epsilon };
}

/**
 * Numerically integrate a Sun-only Keplerian coast from (r, v) for N
 * days, sampled at `steps` points. r in AU, v in AU/day. Returns
 * positions as a flat Float32Array of (x, y, z) triplets (in AU).
 *
 * Caller multiplies through their scene scale and feeds the result to
 * the coastLine geometry.
 *
 * Symplectic semi-implicit Euler — fine for visualisation accuracy
 * over a few hundred days; not for production trajectory work.
 */
export function integrateCoast(
  r0: { x: number; y: number; z: number },
  v0: { x: number; y: number; z: number },
  days: number,
  steps: number,
): Float32Array {
  // μ_sun in AU³/day²: μ in AU³/yr² is 4π²; per day = 4π²/365.25².
  const MU_PER_DAY2 = (4 * Math.PI * Math.PI) / (365.25 * 365.25);
  const dt = days / steps;
  const out = new Float32Array((steps + 1) * 3);
  let rx = r0.x;
  let ry = r0.y;
  let rz = r0.z;
  let vx = v0.x;
  let vy = v0.y;
  let vz = v0.z;
  out[0] = rx;
  out[1] = ry;
  out[2] = rz;
  for (let i = 1; i <= steps; i++) {
    const r2 = rx * rx + ry * ry + rz * rz;
    const r = Math.sqrt(r2);
    const aFactor = -MU_PER_DAY2 / (r2 * r);
    vx += aFactor * rx * dt;
    vy += aFactor * ry * dt;
    vz += aFactor * rz * dt;
    rx += vx * dt;
    ry += vy * dt;
    rz += vz * dt;
    out[i * 3] = rx;
    out[i * 3 + 1] = ry;
    out[i * 3 + 2] = rz;
  }
  return out;
}
