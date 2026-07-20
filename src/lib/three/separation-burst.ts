/**
 * SeparationBurst — the visible "event" at a stage / fairing / payload /
 * heat-shield separation: a bright flash, an expanding shockwave ring, and a
 * radial puff of frost/debris that lingers as smoke. Real separations fire
 * pushers or pyros that vent a ring of gas + scatter debris; without it a
 * separation reads as a silent drift.
 *
 * Scrub-safe: `update(progress)` is a pure function of the burst progress (0→1
 * over the burst duration, derived from `sepProgress(t, eventT, BURST_S)`), so
 * scrubbing the timeline back and forth replays it exactly — same contract as
 * every other /fly separation animation.
 */
import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

function flashTexture(): THREE.CanvasTexture {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,240,210,0.85)');
  g.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

/** A thin bright annulus — the shockwave ring that expands off the sep plane. */
function ringTexture(): THREE.CanvasTexture {
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S;
  c.height = S;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  // Transparent core, a bright thin band near the rim, transparent edge.
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.62, 'rgba(255,246,224,0)');
  g.addColorStop(0.8, 'rgba(255,242,214,0.95)');
  g.addColorStop(0.9, 'rgba(255,230,190,0.5)');
  g.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

export interface SeparationBurstOptions {
  /** Overall scale in scene units (roughly the vehicle diameter). */
  scale: number;
  /** Particle count (default 30). */
  count?: number;
  /** Tint for the debris/frost points (default cool white). */
  particleColor?: THREE.ColorRepresentation;
}

export class SeparationBurst extends THREE.Object3D {
  private readonly flash: THREE.Sprite;
  private readonly ring: THREE.Sprite;
  private readonly points: THREE.Points;
  private readonly dirs: Float32Array;
  private readonly basePos: Float32Array;
  private readonly ptCount: number;
  private readonly spread: number;

  constructor(opts: SeparationBurstOptions) {
    super();
    this.ptCount = opts.count ?? 30;
    this.spread = opts.scale * 2.6;

    // Flash — a bright additive sprite that pops then fades fast.
    this.flash = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: flashTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.add(this.flash);

    // Shockwave ring — expands fast off the sep plane then fades. Billboarded
    // like the flash (a sprite), which reads as a clean expanding halo at any
    // camera angle without orienting a real torus.
    this.ring = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: ringTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    this.add(this.ring);

    // Debris/frost — deterministic radial scatter (biased along ±axis so it
    // reads as a ring venting off the separation plane, not a uniform ball).
    this.dirs = new Float32Array(this.ptCount * 3);
    this.basePos = new Float32Array(this.ptCount * 3);
    for (let i = 0; i < this.ptCount; i++) {
      const a = i * 2.399963; // golden angle
      const ring = Math.sin(i * 1.7) * 0.5 + 0.5; // 0..1
      const y = (i % 2 === 0 ? 1 : -1) * (0.25 + 0.75 * ((i * 0.37) % 1));
      const r = 0.4 + 0.6 * ring;
      this.dirs[i * 3] = Math.cos(a) * r;
      this.dirs[i * 3 + 1] = y;
      this.dirs[i * 3 + 2] = Math.sin(a) * r;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.basePos.slice(), 3));
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: opts.particleColor ?? 0xdfe8ff,
        size: opts.scale * 0.24,
        sizeAttenuation: true,
        transparent: true,
        depthWrite: false,
      }),
    );
    this.add(this.points);

    this.visible = false;
  }

  /** Drive the burst. `progress` outside (0,1) hides it. */
  update(progress: number): void {
    if (progress <= 0 || progress >= 1) {
      this.visible = false;
      return;
    }
    this.visible = true;

    // Flash: pops to full in the first ~12%, gone by ~40% — a hard bright hit.
    const fp = Math.min(1, progress / 0.4);
    const flashScale = this.spread * (0.5 + fp * 1.9);
    this.flash.scale.set(flashScale, flashScale, 1);
    (this.flash.material as THREE.SpriteMaterial).opacity = (1 - fp) ** 0.6;

    // Shockwave ring: expands past the flash, decelerating, fading by ~55%.
    const rp = Math.min(1, progress / 0.55);
    const ringScale = this.spread * (0.6 + Math.sqrt(rp) * 3.2);
    this.ring.scale.set(ringScale, ringScale, 1);
    (this.ring.material as THREE.SpriteMaterial).opacity = (1 - rp) ** 0.8 * 0.9;

    // Particles: expand radially, decelerating (sqrt), lingering as smoke — a
    // slower fade than the flash so a wisp hangs at the sep plane.
    const reach = this.spread * Math.sqrt(progress);
    const attr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < this.ptCount; i++) {
      arr[i * 3] = this.dirs[i * 3] * reach;
      arr[i * 3 + 1] = this.dirs[i * 3 + 1] * reach;
      arr[i * 3 + 2] = this.dirs[i * 3 + 2] * reach;
    }
    attr.needsUpdate = true;
    const pm = this.points.material as THREE.PointsMaterial;
    pm.opacity = Math.max(0, 1 - progress) ** 0.9;
    pm.size = this.spread * 0.09 * (1 + progress * 1.6); // grow as they cool into smoke
  }

  /** Orient the burst's ±axis along `dir` (the separation direction). */
  setAxis(dir: THREE.Vector3): void {
    this.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    (this.flash.material as THREE.SpriteMaterial).map?.dispose();
    (this.flash.material as THREE.Material).dispose();
    (this.ring.material as THREE.SpriteMaterial).map?.dispose();
    (this.ring.material as THREE.Material).dispose();
  }
}
