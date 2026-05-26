/**
 * Background star-field generator for 3D scenes (#42, lifted across
 * 7 routes).
 *
 * /earth, /moon, /mars, /iss, /tiangong, /fly, /explore all painted
 * their own background star sphere with the same uniform-on-sphere
 * algorithm — only count and shell radius differed. Pulled into one
 * place so future tweaks (HDR mode, parallax, twinkle) land once.
 *
 * Algorithm: rejection-free uniform sampling on a sphere via
 * t = U(0, 2π), p = acos(2U(0,1) - 1). Each star sits at a random
 * distance in [radius, radius+jitter].
 *
 * Returns a `THREE.Points` the caller adds to its scene. The points
 * material disables `sizeAttenuation` so stars stay 1-2px regardless
 * of camera distance (no flicker on zoom, matches a real star map).
 */
import * as THREE from 'three';

export function createStarField({
  count = 1500,
  radius = 200,
  jitter = 80,
  color = 0xdde4ff,
  size = 1.0,
  opacity = 0.55,
}: {
  count?: number;
  radius?: number;
  jitter?: number;
  color?: number;
  size?: number;
  opacity?: number;
} = {}): THREE.Points {
  const sp = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = radius + Math.random() * jitter;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    sp[i * 3] = r * Math.sin(p) * Math.cos(t);
    sp[i * 3 + 1] = r * Math.sin(p) * Math.sin(t);
    sp[i * 3 + 2] = r * Math.cos(p);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color,
      size,
      sizeAttenuation: false,
      transparent: true,
      opacity,
    }),
  );
}
