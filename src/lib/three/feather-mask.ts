import * as THREE from 'three';

const cache = new Map<number, THREE.Texture>();

/**
 * Shared alpha mask for a square UV patch: opaque centre, smoothstep fade over
 * the outer `edge` fraction to each side, so imagery drawn over the globe ends
 * without a hard line. `alphaMap` reads the green channel.
 *
 * Each call returns its own texture over one cached pixel buffer: materials
 * are torn down with disposeObject3d, which disposes their alphaMap, and one
 * shared texture disposed by a single patch left every other patch drawing
 * white (Earth pads at close zoom, #641).
 */
export function featherMask(edge = 0.18): THREE.Texture {
  const hit = cache.get(edge);
  if (hit) return fresh(hit);
  const n = 256;
  const data = new Uint8Array(n * n * 4);
  const ramp = (t: number) => {
    const c = Math.max(0, Math.min(1, Math.min(t, 1 - t) / edge));
    return c * c * (3 - 2 * c);
  };
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = Math.round(255 * ramp((x + 0.5) / n) * ramp((y + 0.5) / n));
      const i = (y * n + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = a;
      data[i + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, n, n, THREE.RGBAFormat);
  tex.needsUpdate = true;
  cache.set(edge, tex);
  return fresh(tex);
}

function fresh(base: THREE.Texture): THREE.Texture {
  const t = base.clone();
  t.needsUpdate = true;
  return t;
}
