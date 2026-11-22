/**
 * Engine exhaust meshes, shared by the ascent scene and the /fly booster-landing inset
 * (0.9.11 F2). Each is an open cone pointing up its +Y axis; the caller flips it under a nozzle.
 */
import * as THREE from 'three';

/** One flame layer: an open cone, additive by default, drawing no depth. */
export function plumeCone(
  r: number,
  len: number,
  color: number,
  opacity: number,
  blending: THREE.Blending = THREE.AdditiveBlending,
): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.ConeGeometry(r, len, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending,
      depthWrite: false,
    }),
  );
  // After the launch-ground patch (renderOrder 2): the flame writes no depth, so a patch
  // drawn later painted over it wherever the ground sat behind it on screen.
  m.renderOrder = 3;
  return m;
}

/**
 * The white-hot core just under the bell, blended normally: the additive layers vanish against a
 * sunlit desert or bright sky (Soyuz and Proton at Baikonur read flameless). Its wide end sits at
 * the nozzle, where the outer cone's wide end is. `vehLen` is the scene's vehicle length.
 */
export function plumeCore(r: number, vehLen: number): THREE.Mesh {
  const len = vehLen * 0.11;
  const m = plumeCone(r, len, 0xfff1d0, 0.85, THREE.NormalBlending);
  m.position.y = -(vehLen * 0.13 - len / 2);
  m.renderOrder = 4;
  return m;
}
