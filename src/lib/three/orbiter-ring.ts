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
  ringMesh.rotation.x = inclinationRad;
  return ringMesh;
}
