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

/** AU → /fly scene units. /fly uses 1 scene-unit = 1 AU heliocentric. */
function auToScene(au: number): number {
  return au;
}

/** km → /fly scene units, via AU. */
function kmToScene(km: number): number {
  return auToScene(km / AU_TO_KM);
}

/**
 * Build a translucent SoI ring around a body, sized to its physical
 * sphere-of-influence radius in /fly scene units (1 unit = 1 AU).
 *
 * Returned as a THREE.Group containing a wireframe sphere; the page
 * positions the group at the body's heliocentric coordinate each frame
 * and toggles `group.visible` from the layer subscription.
 */
export function buildSoIRing(
  body: 'earth' | 'mars' | 'moon',
  color = 0xffc850,
  segments = 48,
): THREE.Group {
  const group = new THREE.Group();
  group.name = `soi_${body}`;
  group.userData.layerKey = 'soi';

  const radius = kmToScene(SOI_KM[body]);

  // Wireframe sphere: cheap, distinct from solid bodies, visible from
  // any camera angle. Two great circles + a sphere outline give the
  // "soap bubble" look.
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

  // Bright equatorial circle for stronger silhouette.
  const ringGeo = new THREE.RingGeometry(radius * 0.999, radius * 1.001, segments);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  // Lay flat on the ecliptic (XZ plane in /fly's scene).
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
export function buildGravityArrow(
  label: 'earth' | 'sun',
  color = 0x6aa9ff,
): THREE.ArrowHelper {
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
