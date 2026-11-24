import * as THREE from 'three';

/**
 * Near-ground detail for the planetary /fly descents. The body sphere carries a 2k map (one texel
 * is ~4 km on the Moon), so the last kilometres of a descent showed a flat tint. This adds a
 * procedural tiling detail texture (fbm relief + crater stamps + patches + ripples) sampled at four
 * scales from world position and faded by view distance, so the horizon keeps the plain map, plus a
 * single instanced scatter of rocks round the touchdown point. Scene units are km.
 */

export type GroundBody = 'moon' | 'mars' | 'venus' | 'titan' | 'earth';

interface GroundLook {
  craters: number;
  /** 0 flat .. 1 deep relief shading */
  relief: number;
  /** per-channel albedo gain from the patch channel (basalt on Mars, ejecta/ray brightness on the Moon) */
  patch: [number, number, number];
  ripples: number;
  rocks: number;
  rockColor: number;
  /** Earth: oceans carry no detail; mask by how blue the map is. */
  waterMask: boolean;
}

const LOOK: Record<GroundBody, GroundLook> = {
  moon: {
    craters: 900,
    relief: 1,
    patch: [0.45, 0.45, 0.45],
    ripples: 0,
    rocks: 170,
    rockColor: 0x8a8884,
    waterMask: false,
  },
  mars: {
    craters: 380,
    relief: 0.8,
    patch: [-0.55, -0.5, -0.4],
    ripples: 1,
    rocks: 230,
    rockColor: 0x6a4130,
    waterMask: false,
  },
  venus: {
    craters: 60,
    relief: 0.6,
    patch: [-0.3, -0.3, -0.25],
    ripples: 0,
    rocks: 90,
    rockColor: 0x6b5a45,
    waterMask: false,
  },
  titan: {
    craters: 20,
    relief: 0.45,
    patch: [-0.35, -0.3, -0.2],
    ripples: 1,
    rocks: 80,
    rockColor: 0x6a4a28,
    waterMask: false,
  },
  earth: {
    craters: 0,
    relief: 0.5,
    patch: [-0.25, 0.1, -0.3],
    ripples: 0,
    rocks: 0,
    rockColor: 0x6a5a48,
    waterMask: true,
  },
};

export function hasGroundDetail(body: string): body is GroundBody {
  return body in LOOK;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tileable value noise, `cells` lattice cells across the N-px tile, summed over octaves. */
function fbm(N: number, baseCells: number, octaves: number, rand: () => number): Float32Array {
  const out = new Float32Array(N * N);
  let amp = 1;
  let total = 0;
  for (let o = 0; o < octaves; o++) {
    const c = baseCells << o;
    const lat = new Float32Array(c * c);
    for (let i = 0; i < lat.length; i++) lat[i] = rand();
    const k = c / N;
    for (let y = 0; y < N; y++) {
      const fy = y * k;
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      const ya = (y0 % c) * c;
      const yb = ((y0 + 1) % c) * c;
      for (let x = 0; x < N; x++) {
        const fx = x * k;
        const x0 = Math.floor(fx);
        const tx = fx - x0;
        const sx = tx * tx * (3 - 2 * tx);
        const xa = x0 % c;
        const xb = (x0 + 1) % c;
        const a = lat[ya + xa] + (lat[ya + xb] - lat[ya + xa]) * sx;
        const b = lat[yb + xa] + (lat[yb + xb] - lat[yb + xa]) * sx;
        out[y * N + x] += (a + (b - a) * sy) * amp;
      }
    }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** R: relief (fbm + bowl-and-rim craters), G: patches + ejecta halos, B: ripples. Tiles in x and y. */
export function makeGroundTexture(body: GroundBody): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const look = LOOK[body];
  const N = 1024;
  const rand = rng(body.length * 7919 + body.charCodeAt(0));
  const h = fbm(N, 4, 6, rand);
  const g = fbm(N, 3, 3, rand);
  const stampAt = (cx: number, cy: number, r: number, depth: number) => {
    const reach = Math.ceil(r * 1.9);
    for (let dy = -reach; dy <= reach; dy++) {
      const yy = (((cy + dy) % N) + N) % N;
      for (let dx = -reach; dx <= reach; dx++) {
        const d = Math.hypot(dx, dy) / r;
        if (d > 1.9) continue;
        const xx = (((cx + dx) % N) + N) % N;
        const i = yy * N + xx;
        if (d < 1) {
          // parabolic bowl dropping to the floor, raised rim at d=1
          h[i] += depth * (d * d * 1.25 - 1) * 0.5;
        } else {
          const e = Math.exp(-(d - 1) * 3.2);
          h[i] += depth * 0.22 * e;
          g[i] += 0.16 * e * (1.9 - d);
        }
      }
    }
  };
  for (let n = 0; n < look.craters; n++) {
    // power-law radii: many small, few large
    const r = 3 + 70 * Math.pow(rand(), 3.2);
    stampAt((rand() * N) | 0, (rand() * N) | 0, r, 0.18 + 0.1 * rand());
  }
  const data = new Uint8ClampedArray(N * N * 4);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = y * N + x;
      let rip = 0.5;
      if (look.ripples) {
        // long dune/ripple crests, warped by the noise so they are not ruled lines. Integer
        // frequencies along the tile axes keep the stripes seamless.
        const warp = (g[i] - 0.5) * 3.2;
        rip = 0.5 + 0.5 * Math.sin(((19 * x + 8 * y) / N + warp) * Math.PI * 2);
      }
      data[i * 4] = Math.max(0, Math.min(255, h[i] * 255 + 20));
      data[i * 4 + 1] = Math.max(0, Math.min(255, g[i] * 255));
      data[i * 4 + 2] = rip * 255;
      data[i * 4 + 3] = 255;
    }
  }
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(N, N);
  img.data.set(data);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

/** Layer periods in km: ~5 km, 500 m, 50 m, 5 m per texture tile. */
const PERIODS = [5, 0.5, 0.05, 0.005];

/** Patch the body sphere's standard material so its albedo carries the detail layers. */
export function applyGroundDetail(
  mat: THREE.MeshStandardMaterial,
  body: GroundBody,
  tex: THREE.Texture,
): void {
  const look = LOOK[body];
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uDetail = { value: tex };
    sh.uniforms.uPatch = { value: new THREE.Vector3(...look.patch) };
    sh.uniforms.uRelief = { value: look.relief };
    sh.uniforms.uRipples = { value: look.ripples };
    sh.uniforms.uWater = { value: look.waterMask ? 1 : 0 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGW;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvGW = (modelMatrix * vec4(position, 1.0)).xyz;',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vGW;
uniform sampler2D uDetail;
uniform vec3 uPatch;
uniform float uRelief;
uniform float uRipples;
uniform float uWater;
const float PER[4] = float[4](${PERIODS.map((p) => p.toFixed(4)).join(', ')});`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
{
  float dist = length(vViewPosition);
  float hh = 0.0; float pp = 0.0; float rr = 0.0; float wsum = 0.0;
  for (int i = 0; i < 4; i++) {
    float P = PER[i];
    float w = 1.0 - smoothstep(18.0 * P, 70.0 * P, dist);
    if (w <= 0.001) continue;
    float a = 0.7 * float(i) + 0.3;
    vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * vGW.xz / P + vec2(0.37 * float(i), 0.61);
    vec3 t = texture2D(uDetail, q).rgb;
    // one extra tap toward the sun gives a bump-style slope term, brighter on sun-facing walls
    float t2 = texture2D(uDetail, q + vec2(0.0012, 0.0026)).r;
    float lw = w * (i == 0 ? 0.8 : 1.0);
    hh += lw * ((t.r - 0.5) * 1.6 + (t.r - t2) * 34.0);
    pp += lw * (t.g - 0.5);
    rr += lw * (t.b - 0.5) * (i >= 2 ? 1.0 : 0.4);
    wsum += w;
  }
  float land = 1.0 - uWater * clamp((diffuseColor.b - diffuseColor.r) * 6.0, 0.0, 1.0);
  float shade = 1.0 + uRelief * 0.55 * hh + uRipples * 0.35 * rr;
  vec3 tint = vec3(1.0) + uPatch * pp * 2.0;
  diffuseColor.rgb *= mix(vec3(1.0), clamp(tint, 0.25, 2.0) * clamp(shade, 0.25, 1.9), land);
}`,
      );
  };
  mat.customProgramCacheKey = () => `ground-${body}`;
}

/** Rocks scattered round the touchdown point: one instanced draw call. */
export function makeGroundRocks(body: GroundBody): THREE.InstancedMesh | null {
  const look = LOOK[body];
  if (!look.rocks) return null;
  const rand = rng(1234 + body.length);
  const mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({
      color: look.rockColor,
      roughness: 0.95,
      flatShading: true,
    }),
    look.rocks,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const sc = new THREE.Vector3();
  const pos = new THREE.Vector3();
  for (let i = 0; i < look.rocks; i++) {
    // 12 m clear round the pad; density thins out to ~250 m
    const r = 0.012 + 0.24 * Math.pow(rand(), 1.4);
    const a = rand() * Math.PI * 2;
    const s = 0.0003 + 0.0028 * Math.pow(rand(), 3);
    e.set(rand() * 3, rand() * 6, rand() * 3);
    q.setFromEuler(e);
    sc.set(s * (0.8 + 0.5 * rand()), s * (0.5 + 0.4 * rand()), s * (0.8 + 0.5 * rand()));
    pos.set(Math.cos(a) * r, -s * 0.15, Math.sin(a) * r);
    m.compose(pos, q, sc);
    mesh.setMatrixAt(i, m);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.frustumCulled = false;
  return mesh;
}
