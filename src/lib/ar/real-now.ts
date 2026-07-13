// "Real-now" AR enhancements powered by $lib/astronomy:
//   • buildRealNowEarth (#402) — an AR Earth lit by the REAL current Sun so the
//     day/night terminator is where it actually is this minute, with the
//     sub-solar point + your location pinned.
//   • positionPlanetsRealNow (#403) — snap the AR /explore planets to their TRUE
//     current heliocentric positions (the real configuration of the system now).
//
// Device-only (runs inside the AR render loop); verify on iPhone.

import * as THREE from 'three';
import { latLonToUnitSphere } from '../moon-projection';
import { skyPosition, julianDay } from '../astronomy';
import { gmstRad } from '../astronomy/time';
import { heliocentric, type PlanetId } from '../astronomy/planets';
import { PLANETS, type SolarSystem } from '../explore-scene';

const DEG = 180 / Math.PI;
const EARTH_RADIUS = 0.14; // matches the tabletop globe (TABLE_RADIUS * 0.7)

// ── #402 — real-now Earth ────────────────────────────────────────────────────

export interface RealNowEarth {
  group: THREE.Group;
  /** Re-aim the Sun light + sub-solar pin for the given time. */
  updateSun(date: Date): void;
  /** Drop / move the "you are here" pin. */
  setUserPin(latDeg: number, lonDeg: number): void;
  dispose(): void;
}

/** Sub-solar geographic point (where the Sun is overhead) at `date`. */
function subSolar(date: Date): { latDeg: number; lonDeg: number } {
  const sun = skyPosition('sun', date, 0, 0); // RA/Dec are observer-independent
  const gmstDeg = gmstRad(julianDay(date)) * DEG;
  let lon = (sun.raHours * 15 - gmstDeg) % 360;
  if (lon > 180) lon -= 360;
  if (lon < -180) lon += 360;
  return { latDeg: sun.decDeg, lonDeg: lon };
}

/** Textured Earth lit by the real Sun (upright — the Sun's declination already
 *  carries the seasonal tilt), with sub-solar + user pins. */
export function buildRealNowEarth(
  loadTexture: (file: string) => THREE.Texture,
  date: Date,
): RealNowEarth {
  const group = new THREE.Group();

  const globe = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS, 64, 64),
    new THREE.MeshStandardMaterial({
      map: loadTexture('2k_earth_daymap.jpg'),
      emissive: 0xffffff,
      emissiveMap: loadTexture('2k_earth_nightmap.jpg'),
      emissiveIntensity: 0.9, // city lights glow on the unlit hemisphere
      roughness: 1,
      metalness: 0,
    }),
  );
  globe.name = 'earth';
  group.add(globe);

  // Real Sun as a directional light; faint ambient so the night side reads.
  const sun = new THREE.DirectionalLight(0xfff6e8, 2.4);
  group.add(sun);
  group.add(sun.target);
  group.add(new THREE.HemisphereLight(0x223344, 0x0a0a12, 0.25));

  const subSolarPin = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 0.05, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd24a }),
  );
  group.add(subSolarPin);

  const userPin = new THREE.Mesh(
    new THREE.SphereGeometry(EARTH_RADIUS * 0.05, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x4ecdc4 }),
  );
  userPin.visible = false;
  group.add(userPin);

  function updateSun(d: Date): void {
    const ss = subSolar(d);
    const dir = latLonToUnitSphere(ss.latDeg, ss.lonDeg);
    sun.position.set(dir.x, dir.y, dir.z).multiplyScalar(5);
    sun.target.position.set(0, 0, 0);
    subSolarPin.position.set(dir.x, dir.y, dir.z).multiplyScalar(EARTH_RADIUS * 1.02);
  }
  function setUserPin(latDeg: number, lonDeg: number): void {
    const u = latLonToUnitSphere(latDeg, lonDeg);
    userPin.position.set(u.x, u.y, u.z).multiplyScalar(EARTH_RADIUS * 1.02);
    userPin.visible = true;
  }
  function dispose(): void {
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      const mat = m.material as THREE.Material | undefined;
      mat?.dispose?.();
    });
  }

  updateSun(date);
  return { group, updateSun, setUserPin, dispose };
}

// ── #403 — real-now Explore ──────────────────────────────────────────────────

// explore-scene planet ids that the astronomy ephemeris covers (Pluto is left at
// its scene position — not in the JPL major-planet set).
const REAL_IDS = new Set<string>([
  'mercury',
  'venus',
  'earth',
  'mars',
  'jupiter',
  'saturn',
  'uranus',
  'neptune',
]);

/**
 * Move the /explore AR planets to their TRUE current heliocentric positions on
 * the (compressed) orbit rings — the real configuration of the Solar System now.
 * Call periodically so it tracks live. `scale` is the tabletop scale factor.
 */
export function positionPlanetsRealNow(solar: SolarSystem, scale: number, date: Date): void {
  const jd = julianDay(date);
  for (const p of PLANETS) {
    if (!REAL_IDS.has(p.id)) continue;
    const g = solar.planetById.get(p.id);
    if (!g) continue;
    const h = heliocentric(p.id as PlanetId, jd);
    const lon = Math.atan2(h.y, h.x); // true heliocentric ecliptic longitude
    const inc = (p.inc * Math.PI) / 180;
    const x = Math.cos(lon) * p.orbitR * scale;
    const zf = Math.sin(lon) * p.orbitR * scale;
    g.position.set(x, zf * Math.sin(inc), zf * Math.cos(inc));
  }
}
