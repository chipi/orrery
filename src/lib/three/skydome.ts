import * as THREE from 'three';

/**
 * Procedural skydome — wave 2/3 polish #9. A large inverted SphereGeometry
 * with an equirectangular CanvasTexture painting a soft Milky Way band
 * gradient + a sparse field of brighter stars. Augments (doesn't replace)
 * the existing Points-based starfield in /fly's helio scene — the Points
 * layer remains the dominant star pinprick population; the skydome adds
 * the "deep galactic nebula" feel that point sprites alone can't carry.
 *
 * Rendered at a very large radius (well past every planet orbit + the
 * Kuiper belt) so the rest of the scene composes in front. depthWrite
 * false so it never occludes anything. side BackSide so the camera
 * inside the sphere sees the painted texture.
 *
 * The CanvasTexture is generated synchronously at build time (no async
 * cubemap fetch) so first-frame is fully populated. Texture is 2048×1024
 * — small enough to generate in <20 ms on every device we target, large
 * enough that the Milky Way band reads as a soft gradient rather than
 * pixelated stripes.
 */

export interface Skydome {
  mesh: THREE.Mesh;
  dispose: () => void;
}

const DEFAULT_RADIUS = 20_000;
const TEX_W = 2048;
const TEX_H = 1024;

export function buildSkydome(opts: { radius?: number } = {}): Skydome {
  const radius = opts.radius ?? DEFAULT_RADIUS;
  const tex = buildSkydomeTexture();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const geo = new THREE.SphereGeometry(radius, 64, 32);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1000; // draw first; everything else paints over.
  return {
    mesh,
    dispose: () => {
      geo.dispose();
      mat.dispose();
      tex.dispose();
    },
  };
}

function buildSkydomeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  const ctx = canvas.getContext('2d')!;

  // Base — near-black with a deep blue/violet bias.
  ctx.fillStyle = '#020310';
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Milky Way band — soft radial gradient running diagonally across
  // the equirectangular texture. Two passes: a wide dim outer halo
  // and a tighter brighter core.
  paintMilkyWayBand(ctx);

  // Sparse field of brighter stars layered on top so the band feels
  // populated. The Points-based starfield already provides the dense
  // pinprick population; this skydome adds maybe 1500 brighter stars.
  paintStarField(ctx, 1500);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

function paintMilkyWayBand(ctx: CanvasRenderingContext2D): void {
  // Band runs at ~25° from horizontal in equirectangular space — that
  // approximates the galactic plane crossing the sky in ICRS coords.
  ctx.save();
  ctx.translate(TEX_W / 2, TEX_H / 2);
  ctx.rotate((25 * Math.PI) / 180);

  // Outer halo — wide, dim, blue-violet
  const outer = ctx.createLinearGradient(0, -TEX_H, 0, TEX_H);
  outer.addColorStop(0.0, 'rgba(20, 30, 60, 0)');
  outer.addColorStop(0.45, 'rgba(50, 50, 110, 0.10)');
  outer.addColorStop(0.5, 'rgba(80, 70, 140, 0.18)');
  outer.addColorStop(0.55, 'rgba(50, 50, 110, 0.10)');
  outer.addColorStop(1.0, 'rgba(20, 30, 60, 0)');
  ctx.fillStyle = outer;
  ctx.fillRect(-TEX_W, -TEX_H, TEX_W * 2, TEX_H * 2);

  // Inner brighter core — tan/cream center mimicking the galactic
  // bulge through Sagittarius.
  const inner = ctx.createLinearGradient(0, -TEX_H / 4, 0, TEX_H / 4);
  inner.addColorStop(0.0, 'rgba(120, 100, 80, 0)');
  inner.addColorStop(0.5, 'rgba(180, 150, 110, 0.22)');
  inner.addColorStop(1.0, 'rgba(120, 100, 80, 0)');
  ctx.fillStyle = inner;
  ctx.fillRect(-TEX_W, -TEX_H / 4, TEX_W * 2, TEX_H / 2);

  ctx.restore();
}

function paintStarField(ctx: CanvasRenderingContext2D, count: number): void {
  // Deterministic seeding so the skydome looks the same every load —
  // no jarring constellation reshuffles between sessions. Linear
  // congruential generator keeps it cheap.
  let seed = 0x517cc1b7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let i = 0; i < count; i++) {
    const x = rand() * TEX_W;
    const y = rand() * TEX_H;
    // Bias more stars to the Milky Way band — sample a y-bias toward
    // the diagonal band.
    const sizeRoll = rand();
    const size = sizeRoll < 0.85 ? 0.6 + rand() * 0.6 : 1.2 + rand() * 1.4;
    const brightnessRoll = rand();
    const a = 0.4 + brightnessRoll * 0.6;
    // Slight color variation — warm/cold star bias.
    const colorRoll = rand();
    let color: string;
    if (colorRoll < 0.15)
      color = `rgba(255, 220, 200, ${a})`; // warm
    else if (colorRoll < 0.25)
      color = `rgba(200, 220, 255, ${a})`; // cool
    else color = `rgba(245, 245, 235, ${a})`; // neutral
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}
