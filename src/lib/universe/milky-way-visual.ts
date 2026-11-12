/**
 * Pure visual/placement math for the /explore v2 Milky Way schematic (Slice 5).
 *
 * The WebGL builder (`milky-way-scene.ts`, coverage-excluded) consumes these.
 * Keeping the maths here makes the spiral geometry + galactic→scene placement
 * unit-testable without a GPU. The Milky Way view is an honest labelled MODEL
 * (PRD-030 principle 2), so these are schematic-but-consistent, not to scale.
 */

/** Scene radius (world units) the schematic disk is drawn at. Sized so the disk
 *  fills the framing camera without dwarfing the HUD, matching the approved mock. */
export const MW_DISK_RADIUS_SCENE = 340;

/** Number of major spiral arms in the schematic (Milky Way is a 4-armed barred
 *  spiral; the Sun's minor Orion Spur is drawn separately). */
export const MW_ARMS = 4;

/** Log-spiral growth rate (schematic pitch). Loose enough to read as a spiral at
 *  a glance while still winding several turns across the disk. */
export const MW_ARM_GROWTH = 0.25;

/** Map a galactocentric distance (kpc) to scene units, given the data's disk
 *  radius. Linear — the schematic disk is uniform. */
export function kpcToScene(
  kpc: number,
  diskRadiusKpc: number,
  sceneRadius = MW_DISK_RADIUS_SCENE,
): number {
  return (kpc / diskRadiusKpc) * sceneRadius;
}

/** Map a galactic-plane point (x,z kpc, Sag A* at origin) to a scene position on
 *  the flat disk (y = 0; the scene group applies the face-on tilt). */
export function galacticToScene(
  xKpc: number,
  zKpc: number,
  diskRadiusKpc: number,
  sceneRadius = MW_DISK_RADIUS_SCENE,
): [number, number, number] {
  const s = sceneRadius / diskRadiusKpc;
  return [xKpc * s, 0, zKpc * s];
}

/** Log-spiral radius at angle theta (radians): r = inner · e^(growth·theta). */
export function logSpiralRadius(innerRadius: number, growth: number, theta: number): number {
  return innerRadius * Math.exp(growth * theta);
}

/** A point on a log-spiral arm, in scene-plane coords (x,z; y handled by caller).
 *  `startAngle` offsets the arm around the disk so N arms are evenly spaced. */
export function logSpiralPoint(
  innerRadius: number,
  growth: number,
  theta: number,
  startAngle: number,
): { x: number; z: number; r: number } {
  const r = logSpiralRadius(innerRadius, growth, theta);
  const a = theta + startAngle;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, r };
}

/** Even angular offset (radians) for arm `index` of `arms`. */
export function armStartAngle(index: number, arms: number): number {
  return (index / arms) * Math.PI * 2;
}

/** Deterministic seeded RNG (mulberry32) — stable particle jitter across renders
 *  so the schematic looks identical every load (and is testable). */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEG = Math.PI / 180;

/**
 * Galactic longitude and latitude (degrees, l in 0..360) of an equatorial J2000 position, by the
 * IAU rotation: the north galactic pole at (192.85948°, +27.12825°), l of the north celestial
 * pole 122.93192°.
 */
export function equatorialToGalactic(raDeg: number, decDeg: number): { l: number; b: number } {
  const aG = 192.85948 * DEG;
  const dG = 27.12825 * DEG;
  const lNcp = 122.93192 * DEG;
  const ra = raDeg * DEG;
  const dec = decDeg * DEG;
  const sinB = Math.sin(dec) * Math.sin(dG) + Math.cos(dec) * Math.cos(dG) * Math.cos(ra - aG);
  const y = Math.cos(dec) * Math.sin(ra - aG);
  const x = Math.sin(dec) * Math.cos(dG) - Math.cos(dec) * Math.sin(dG) * Math.cos(ra - aG);
  const l = ((((lNcp - Math.atan2(y, x)) / DEG) % 360) + 360) % 360;
  return { l, b: Math.asin(Math.max(-1, Math.min(1, sinB))) / DEG };
}

/**
 * Schematic placement of an object seen from the Sun (galactic l, b, distance in kpc) on the
 * face-on disk: Sagittarius A* at the origin, the Sun where the schematic puts it, l = 0
 * towards the centre and l growing the way the schematic's arms are labelled (Perseus at
 * l ~ 65 deg lies at a smaller angle than the Sun-centre line). In-plane distance is d cos b.
 */
export function galacticPlanePin(
  lDeg: number,
  bDeg: number,
  distKpc: number,
  sun: { x: number; z: number },
): { x: number; z: number } {
  const toCentre = Math.atan2(-sun.z, -sun.x);
  const theta = toCentre - lDeg * DEG;
  const inPlane = distKpc * Math.cos(bDeg * DEG);
  return { x: sun.x + inPlane * Math.cos(theta), z: sun.z + inPlane * Math.sin(theta) };
}
