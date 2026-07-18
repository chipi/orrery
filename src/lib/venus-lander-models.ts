import * as THREE from 'three';

/**
 * Per-mission Venus surface-lander glyphs for /venus (RFC-034 §12). The three
 * Soviet Venus landers — Venera 13 and the two Vega landers — are near-identical
 * craft: a pressurised spherical instrument body on a toroidal crush-ring, a
 * ring-shaped aerobrake disk up top, a helical scan antenna and a surface
 * sampling arm. One builder covers all three (they were the same bus).
 *
 * Signature matches `LanderModelBuilder` (siteId, missionType, color, agency?).
 */

function mat(color: string, rough = 0.5, metal = 0.6): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}

/** Build the Venera/Vega surface lander. */
export function buildVenusLanderModel(
  _siteId: string,
  _missionType: string | undefined,
  color: string,
  _agency?: string,
): THREE.Group {
  const g = new THREE.Group();
  const foil = mat(color || '#c9a45a', 0.45, 0.65);
  const metal = mat('#9aa0a8', 0.5, 0.55);
  const dark = mat('#2b2f36', 0.4, 0.7);

  // Pressure sphere — the dominant instrument body.
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.24, 22, 16), foil);
  sphere.position.y = 0.28;
  g.add(sphere);

  // Toroidal crush-ring / landing ring at the base.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.055, 12, 26), metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.06;
  g.add(ring);

  // Ring-shaped aerobrake disk on top (the terminal drag brake, now landed).
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 26), metal);
  brake.position.y = 0.56;
  g.add(brake);

  // Helical scan / imaging antenna mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), metal);
  mast.position.set(0.16, 0.5, 0);
  g.add(mast);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: '#eaeaea', roughness: 0.6, side: THREE.DoubleSide }),
  );
  dish.position.set(0.16, 0.68, 0);
  dish.rotation.x = Math.PI;
  g.add(dish);

  // Surface sampling arm reaching to the ground.
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 5), dark);
  arm.position.set(-0.2, 0.14, 0);
  arm.rotation.z = 0.7;
  g.add(arm);

  return g;
}

/** Exposed for tests. */
export const KNOWN_VENUS_LANDER_IDS = ['venera-13', 'vega-1', 'vega-2'];
