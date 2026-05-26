/**
 * Standard ambient + sun directional light pair for surface routes (#42).
 *
 * Each surface body picks its own ambient tint (Moon's neutral grey-
 * blue, Mars's warm dust tone) and intensity. Sun colour + position
 * are consistent across all routes — gives every scene the same
 * sun direction so a viewer flying between them feels coherent.
 *
 * Returns the sun light so the caller can also use it as a marker
 * for sun-tracked geometry (panels, etc.).
 */
import * as THREE from 'three';

export function addSurfaceLights({
  scene,
  ambientColor,
  ambientIntensity,
  sunColor = 0xfff4d0,
  sunIntensity = 1.2,
  sunPosition = [120, 60, 100],
}: {
  scene: THREE.Scene;
  ambientColor: number;
  ambientIntensity: number;
  sunColor?: number;
  sunIntensity?: number;
  sunPosition?: [number, number, number];
}): { sun: THREE.DirectionalLight } {
  scene.add(new THREE.AmbientLight(ambientColor, ambientIntensity));
  const sun = new THREE.DirectionalLight(sunColor, sunIntensity);
  sun.position.set(sunPosition[0], sunPosition[1], sunPosition[2]);
  scene.add(sun);
  return { sun };
}
