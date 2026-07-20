/**
 * SeparationBurst — the visible "event" at a stage / fairing / payload /
 * heat-shield separation: a quick bright flash + a radial puff of frost/debris
 * particles. Real separations fire pushers or pyros that vent a ring of gas +
 * scatter debris; without it a separation reads as a silent drift.
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

export interface SeparationBurstOptions {
  /** Overall scale in scene units (roughly the vehicle diameter). */
  scale: number;
  /** Particle count (default 26). */
  count?: number;
  /** Tint for the debris/frost points (default cool white). */
  particleColor?: THREE.ColorRepresentation;
}

export class SeparationBurst extends THREE.Object3D {
  private readonly flash: THREE.Sprite;
  private readonly points: THREE.Points;
  private readonly dirs: Float32Array;
  private readonly basePos: Float32Array;
  private readonly count: number;
  private readonly spread: number;

  constructor(opts: SeparationBurstOptions) {
    super();
    this.count = opts.count ?? 26;
    this.spread = opts.scale * 2.4;

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

    // Debris/frost — deterministic radial scatter (biased along ±axis so it
    // reads as a ring venting off the separation plane, not a uniform ball).
    this.dirs = new Float32Array(this.count * 3);
    this.basePos = new Float32Array(this.count * 3);
    for (let i = 0; i < this.count; i++) {
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
        size: opts.scale * 0.22,
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
    // Flash: pops to full in the first ~15%, gone by ~45%.
    const fp = Math.min(1, progress / 0.45);
    const flashScale = this.spread * (0.4 + fp * 1.4);
    this.flash.scale.set(flashScale, flashScale, 1);
    (this.flash.material as THREE.SpriteMaterial).opacity = Math.max(0, 1 - fp) ** 0.7;
    // Particles: expand radially, decelerating (sqrt) + fading.
    const reach = this.spread * Math.sqrt(progress);
    const attr = this.points.geometry.attributes.position as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < this.count; i++) {
      arr[i * 3] = this.dirs[i * 3] * reach;
      arr[i * 3 + 1] = this.dirs[i * 3 + 1] * reach;
      arr[i * 3 + 2] = this.dirs[i * 3 + 2] * reach;
    }
    attr.needsUpdate = true;
    (this.points.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - progress) ** 0.8;
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
  }
}
