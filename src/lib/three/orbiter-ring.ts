/**
 * Tilted-ring mesh for an orbital marker (#42).
 *
 * Both /moon and /mars draw a faint translucent ring per orbiter at
 * its altitude-scaled radius, tilted around the X axis for
 * inclination. Pre-extraction each route inlined the same 10-line
 * geometry + material + mesh + rotation block — only the active /
 * dimmed opacity defaults differed (mars 0.18/0.35, moon 0.2/0.4).
 */
import * as THREE from 'three';

export function createOrbiterRing({
  ringRadius,
  inclinationRad,
  color,
  dimmed,
  activeOpacity = 0.4,
  dimmedOpacity = 0.2,
  ringThickness = 0.06,
  segments = 96,
}: {
  ringRadius: number;
  inclinationRad: number;
  color: string;
  dimmed: boolean;
  activeOpacity?: number;
  dimmedOpacity?: number;
  ringThickness?: number;
  segments?: number;
}): THREE.Mesh {
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: dimmed ? dimmedOpacity : activeOpacity,
    side: THREE.DoubleSide,
  });
  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(ringRadius - ringThickness, ringRadius + ringThickness, segments),
    ringMat,
  );
  // RingGeometry lies in the XY plane. Add π/2 to lay it flat into the XZ
  // (equatorial) plane FIRST, then the inclination tilts it — so inc=0 is a
  // horizontal equatorial ring and inc=90° is a polar ring. This matches the
  // dot's XZ-plane parametrisation in tickOrbiterDot (the dot was off the
  // ring before this — the ring was vertical while the dot orbited flat).
  ringMesh.rotation.x = Math.PI / 2 + inclinationRad;
  return ringMesh;
}
