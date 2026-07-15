/**
 * The Milky Way schematic scene for /explore v2 (Slice 5).
 *
 * A face-on procedural spiral MODEL — honest, labelled, NOT to scale (PRD-030
 * principle 2). A THREE.Points particle disk (4 log-spiral arms + bulge + faint
 * inter-arm field) drawn flat in the XZ plane, with a glowing Sagittarius A* pin
 * at the centre and a ringed Sun pin on the Orion Spur. Arm + pin labels are
 * always on — it's a diagram, not a starfield.
 *
 * WebGL builder — coverage-excluded (see vite.config.ts). The pure spiral /
 * placement maths live in milky-way-visual.ts (unit-tested).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { MilkyWaySchematic } from '$lib/data';
import {
  galacticToScene,
  logSpiralPoint,
  armStartAngle,
  kpcToScene,
  makeRng,
  MW_DISK_RADIUS_SCENE,
  MW_ARMS,
  MW_ARM_GROWTH,
} from './milky-way-visual';

export interface MilkyWayScene {
  scene: THREE.Scene;
  /** Raycast targets — Sun + Sag A* pins, each with userData.mwObjectId. */
  pickables: THREE.Object3D[];
  objectPosition(id: string): THREE.Vector3 | null;
  /** Emphasize one pin (hover/selection), or clear with null. */
  highlight(id: string | null): void;
  /** Per-frame: keep pins screen-constant + pulse the highlight. */
  update(camera: THREE.Camera): void;
  /** Render with the cinematic bloom composer (call instead of renderer.render).
   *  Falls back to a plain render if bloom is disabled for the device tier. */
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void;
  /** Keep the composer's internal targets sized to the canvas. */
  setSize(w: number, h: number): void;
  dispose(): void;
}

/** Bloom tuning per the fly-scene convention — strength / radius / threshold.
 *  The core + HII knots sit above the threshold so they bleed light; the faint
 *  disk stays crisp. */
export interface MilkyWayBloomOptions {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
}
const DEFAULT_BLOOM: MilkyWayBloomOptions = {
  enabled: true,
  strength: 0.34,
  radius: 0.62,
  threshold: 0.7,
};

const COOL = [0.72, 0.8, 1.0]; // arm star colour (blue-white)
const WARM = [1.0, 0.86, 0.6]; // bulge / inner colour

function radialTexture(stops: Array<[number, string]>, size = 128): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d')!;
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  for (const [o, col] of stops) g.addColorStop(o, col);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  const t = new THREE.CanvasTexture(cvs);
  t.needsUpdate = true;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function labelSprite(
  text: string,
  color: string,
  weight: 'bold' | 'normal',
): { sprite: THREE.Sprite; texture: THREE.CanvasTexture; aspect: number } {
  const upper = text.toUpperCase();
  const font = `${weight} 26px "Space Mono", monospace`;
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const pad = 12;
  const w = Math.ceil(measure.measureText(upper).width) + pad * 2;
  const h = 40;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = color;
  ctx.fillText(upper, w / 2, h / 2);
  const texture = new THREE.CanvasTexture(cvs);
  texture.needsUpdate = true;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    }),
  );
  return { sprite, texture, aspect: w / h };
}

interface Pin {
  id: string;
  glow: THREE.Sprite;
  ring?: THREE.Sprite;
  label: THREE.Sprite;
  labelAspect: number;
  position: THREE.Vector3;
  baseScale: number;
}

export function createMilkyWayScene(
  data: MilkyWaySchematic,
  bloom: MilkyWayBloomOptions = DEFAULT_BLOOM,
): MilkyWayScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);

  const diskR = data.disk_radius_kpc;
  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  const R = MW_DISK_RADIUS_SCENE;
  const rng = makeRng(0x5eed);
  const scale = R / diskR; // scene units per kpc
  const thickness = R * 0.012; // slight out-of-plane spread
  const softSprite = (tex: THREE.Texture, size: number, opacity = 1) => {
    const s = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          opacity,
          depthWrite: false,
          depthTest: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    s.scale.setScalar(size);
    scene.add(s);
    return s;
  };

  // ── Galactic halo + layered bulge — warm, restrained, never pure white so
  // the core reads as a natural glow rather than a blown-out highlight. ──────
  softSprite(
    track(
      radialTexture([
        [0, 'rgba(120,150,220,0.06)'],
        [0.5, 'rgba(100,130,210,0.03)'],
        [1, 'rgba(80,110,200,0)'],
      ]),
    ),
    R * 2.6,
  ); // faint aura so the disk sits in a glow, not on black
  softSprite(
    track(
      radialTexture([
        [0, 'rgba(255,214,160,0.26)'],
        [0.4, 'rgba(250,186,124,0.13)'],
        [0.75, 'rgba(230,155,98,0.05)'],
        [1, 'rgba(210,135,88,0)'],
      ]),
    ),
    R * 0.82,
  ); // warm outer bulge (soft, low peak — stays under the bloom threshold)
  softSprite(
    track(
      radialTexture([
        [0, 'rgba(255,230,195,0.3)'],
        [0.4, 'rgba(252,212,165,0.15)'],
        [1, 'rgba(245,195,150,0)'],
      ]),
    ),
    R * 0.3,
    0.5,
  ); // inner core — kept dim so the summed centre sits below the bloom threshold

  // ── Particle disk: 4 log-spiral arms + inter-arm field, rich gradient ────
  const positions: number[] = [];
  const colors: number[] = [];
  // Bright knots (HII regions + young clusters) drawn as a second, larger layer.
  const knotPos: number[] = [];
  const knotCol: number[] = [];

  // Inner fade — additive particles piling up at r≈0 clip to white, so the disk
  // stars ramp in from zero across the inner region and the (soft, non-clipping)
  // bulge sprite carries the core glow instead. 0 inside 12% R → 1 by 30% R.
  const INNER0 = R * 0.12;
  const INNER1 = R * 0.3;
  const innerFade = (pr: number): number => {
    if (pr <= INNER0) return 0;
    if (pr >= INNER1) return 1;
    const t = (pr - INNER0) / (INNER1 - INNER0);
    return t * t * (3 - 2 * t);
  };

  const PER_ARM = 2200;
  for (let a = 0; a < MW_ARMS; a++) {
    const start = armStartAngle(a, MW_ARMS);
    for (let i = 0; i < PER_ARM; i++) {
      const theta = 0.3 + (i / PER_ARM) * 8.6;
      const p = logSpiralPoint(1.6 * scale, MW_ARM_GROWTH, theta, start);
      const pr = Math.hypot(p.x, p.z);
      if (pr > R) break;
      const fade = innerFade(pr);
      if (fade <= 0) continue; // no stars piling into the core
      const jit = pr * 0.1;
      const x = p.x + (rng() - 0.5) * jit;
      const z = p.z + (rng() - 0.5) * jit;
      const y = (rng() - 0.5) * thickness;
      positions.push(x, y, z);
      // Colour: golden near the core → blue-white in the arms, with variation.
      const rr = Math.min(1, Math.hypot(x, z) / R);
      const warmMix = Math.max(0, 0.5 - rr) / 0.5; // 1 at centre → 0 outward
      const b = (0.6 + rng() * 0.45) * fade; // brightness variation × inner fade
      colors.push(
        (COOL[0] + (WARM[0] - COOL[0]) * warmMix) * b,
        (COOL[1] + (WARM[1] - COOL[1]) * warmMix) * b,
        (COOL[2] + (WARM[2] - COOL[2]) * warmMix) * b,
      );
      // ~4% of arm points seed a bright knot; the outer arms get pink HII.
      if (rr > 0.3 && rng() < 0.04) {
        knotPos.push(x, y, z);
        if (rng() < 0.6) {
          knotCol.push(0.85, 0.42, 0.6); // HII pink
        } else if (rng() < 0.5) {
          knotCol.push(0.6, 0.72, 0.9); // young blue cluster
        } else {
          knotCol.push(0.85, 0.82, 0.78); // white
        }
      }
    }
  }
  for (let i = 0; i < 3200; i++) {
    const ang = rng() * Math.PI * 2;
    const r = Math.pow(rng(), 0.5) * R;
    const fade = innerFade(r);
    if (fade <= 0) continue;
    positions.push(Math.cos(ang) * r, (rng() - 0.5) * thickness, Math.sin(ang) * r);
    const d = (0.4 + rng() * 0.3) * fade;
    colors.push(COOL[0] * d, COOL[1] * d, COOL[2] * d);
  }

  const addPoints = (
    pos: number[],
    col: number[],
    size: number,
    opacity: number,
    tex?: THREE.Texture,
  ) => {
    const g = track(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), R * 1.2);
    const m = track(
      new THREE.PointsMaterial({
        size,
        map: tex,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    scene.add(new THREE.Points(g, m));
  };
  const dotTex = track(
    radialTexture([
      [0, 'rgba(255,255,255,1)'],
      [0.5, 'rgba(255,255,255,0.5)'],
      [1, 'rgba(255,255,255,0)'],
    ]),
  );
  addPoints(positions, colors, R * 0.008, 0.68, dotTex); // main disk
  addPoints(knotPos, knotCol, R * 0.028, 0.72, dotTex); // bright HII / cluster knots

  // ── Star-forming nebula blobs — soft pink glows along the outer arms, the
  // signature "spiral galaxy photo" pop (star nurseries lighting up the arms). ──
  const hiiTex = track(
    radialTexture([
      [0, 'rgba(255,180,205,0.9)'],
      [0.4, 'rgba(255,120,170,0.35)'],
      [1, 'rgba(230,90,150,0)'],
    ]),
  );
  const blueTex = track(
    radialTexture([
      [0, 'rgba(190,220,255,0.85)'],
      [0.45, 'rgba(140,180,255,0.28)'],
      [1, 'rgba(120,160,255,0)'],
    ]),
  );
  for (let a = 0; a < MW_ARMS; a++) {
    const start = armStartAngle(a, MW_ARMS);
    const count = 5;
    for (let k = 0; k < count; k++) {
      const theta = 2.4 + rng() * 5.8;
      const p = logSpiralPoint(0.9 * scale, MW_ARM_GROWTH, theta, start);
      const pr = Math.hypot(p.x, p.z);
      if (pr > R * 0.98) continue;
      const jit = pr * 0.06;
      const s = softSprite(
        rng() < 0.7 ? hiiTex : blueTex,
        R * (0.05 + rng() * 0.05),
        0.7 + rng() * 0.3,
      );
      s.position.set(
        p.x + (rng() - 0.5) * jit,
        (rng() - 0.5) * thickness,
        p.z + (rng() - 0.5) * jit,
      );
      s.renderOrder = 3;
    }
  }

  // ── Dust lanes — dark spiral streaks on a disk-plane overlay ────────────
  // Real galaxies read as "photographic" largely because of the dark dust
  // threading the arms. Drawn as a normal-blended dark texture just inside the
  // bright arms so it occludes the additive glow beneath.
  const dust = document.createElement('canvas');
  dust.width = dust.height = 1024;
  const dctx = dust.getContext('2d')!;
  const dc = 512;
  const dscale = 512 / R;
  dctx.lineCap = 'round';
  for (let a = 0; a < MW_ARMS; a++) {
    const start = armStartAngle(a, MW_ARMS) + 0.28; // trail just inside the arm
    dctx.strokeStyle = 'rgba(8,5,10,0.6)';
    dctx.shadowColor = 'rgba(8,5,10,0.5)';
    dctx.shadowBlur = 10;
    dctx.beginPath();
    for (let i = 0; i <= 160; i++) {
      const theta = 0.5 + (i / 160) * 8.2;
      const p = logSpiralPoint(0.9 * scale, MW_ARM_GROWTH, theta, start);
      if (Math.hypot(p.x, p.z) > R) break;
      const px = dc + p.x * dscale;
      const py = dc + p.z * dscale;
      const w = Math.max(1, 9 * (1 - Math.hypot(p.x, p.z) / R));
      dctx.lineWidth = w;
      if (i) dctx.lineTo(px, py);
      else dctx.moveTo(px, py);
    }
    dctx.stroke();
  }
  const dustTex = track(new THREE.CanvasTexture(dust));
  dustTex.needsUpdate = true;
  const dustPlane = new THREE.Mesh(
    track(new THREE.PlaneGeometry(R * 2, R * 2)),
    track(
      new THREE.MeshBasicMaterial({
        map: dustTex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      }),
    ),
  );
  dustPlane.rotation.x = -Math.PI / 2; // lay flat in the XZ disk plane
  dustPlane.renderOrder = 4;
  scene.add(dustPlane);

  // ── Arm labels (always on, faint) ───────────────────────────────────────
  for (const arm of data.arms) {
    if (arm.id === 'orion-spur') continue; // labelled at the Sun pin instead
    const [lx, , lz] = galacticToScene(arm.label_x, arm.label_z, diskR);
    const { sprite, texture, aspect } = labelSprite(arm.name, 'rgba(190,210,255,0.62)', 'normal');
    disposables.push(texture, sprite.material as THREE.SpriteMaterial);
    const h = MW_DISK_RADIUS_SCENE * 0.05;
    sprite.scale.set(h * aspect, h, 1);
    sprite.position.set(lx, 0, lz);
    sprite.renderOrder = 5;
    scene.add(sprite);
  }

  // ── Pins: Sagittarius A* (centre) + the Sun (Orion Spur) ────────────────
  const pins: Pin[] = [];
  const byId = new Map<string, Pin>();
  const pickables: THREE.Object3D[] = [];

  for (const obj of data.objects) {
    const [x, , z] = galacticToScene(obj.x, obj.z, diskR);
    const position = new THREE.Vector3(x, 0, z);
    const isBH = obj.kind === 'supermassive-black-hole';

    const glowTex = track(
      isBH
        ? radialTexture([
            [0, 'rgba(255,236,198,0.78)'],
            [0.35, 'rgba(255,206,140,0.34)'],
            [1, 'rgba(255,190,120,0)'],
          ])
        : radialTexture([
            [0, 'rgba(240,248,255,0.85)'],
            [0.5, 'rgba(200,228,255,0.5)'],
            [1, 'rgba(160,200,255,0)'],
          ]),
    );
    const glow = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    glow.position.copy(position);
    glow.userData.mwObjectId = obj.id;
    glow.renderOrder = 10;
    scene.add(glow);
    pickables.push(glow);

    // Sun gets a discoverable selection ring (teal), like the named-star markers.
    let ring: THREE.Sprite | undefined;
    if (!isBH) {
      const ringTex = track(
        radialTexture([
          [0, 'rgba(78,205,196,0)'],
          [0.72, 'rgba(78,205,196,0)'],
          [0.82, 'rgba(78,205,196,0.9)'],
          [0.92, 'rgba(78,205,196,0)'],
          [1, 'rgba(78,205,196,0)'],
        ]),
      );
      ring = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: ringTex,
            transparent: true,
            depthTest: false,
            depthWrite: false,
          }),
        ),
      );
      ring.position.copy(position);
      ring.renderOrder = 9;
      scene.add(ring);
    }

    const {
      sprite: label,
      texture: labelTex,
      aspect,
    } = labelSprite(obj.name, isBH ? 'rgba(255,214,122,0.95)' : 'rgba(78,205,196,0.95)', 'bold');
    disposables.push(labelTex, label.material as THREE.SpriteMaterial);
    label.position.copy(position);
    label.renderOrder = 11;
    scene.add(label);

    const pin: Pin = {
      id: obj.id,
      glow,
      ring,
      label,
      labelAspect: aspect,
      position,
      baseScale: isBH ? 0.07 : 0.08,
    };
    pins.push(pin);
    byId.set(obj.id, pin);
  }

  let highlightId: string | null = null;
  const _cam = new THREE.Vector3();

  // ── Cinematic bloom composer (self-contained; only this scene blooms) ────
  // Built lazily on first render so it binds to the live renderer. The core +
  // HII knots sit above the bloom threshold, so they bleed light into a glow
  // while the faint disk stays crisp. Disabled tiers fall back to a plain render.
  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  let boundRenderer: THREE.WebGLRenderer | null = null;
  let sizeW = 1;
  let sizeH = 1;
  function buildComposer(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void {
    const size = renderer.getSize(new THREE.Vector2());
    sizeW = Math.max(1, size.x);
    sizeH = Math.max(1, size.y);
    composer = new EffectComposer(renderer);
    composer.setSize(sizeW, sizeH);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(sizeW, sizeH),
      bloom.strength,
      bloom.radius,
      bloom.threshold,
    );
    composer.addPass(bloomPass);
    boundRenderer = renderer;
  }

  return {
    scene,
    pickables,
    objectPosition(id) {
      return byId.get(id)?.position.clone() ?? null;
    },
    highlight(id) {
      highlightId = id;
    },
    update(camera) {
      camera.getWorldPosition(_cam);
      for (const pin of pins) {
        const dist = Math.max(1, _cam.distanceTo(pin.position));
        const hi = pin.id === highlightId;
        const g = dist * pin.baseScale * (hi ? 1.5 : 1);
        pin.glow.scale.setScalar(g);
        if (pin.ring) pin.ring.scale.setScalar(g * 1.6);
        const lh = dist * 0.05;
        pin.label.scale.set(lh * pin.labelAspect, lh, 1);
        pin.label.position.set(pin.position.x, pin.position.y + g * 0.9 + lh * 0.7, pin.position.z);
      }
    },
    render(renderer, camera) {
      if (!bloom.enabled) {
        renderer.render(scene, camera);
        return;
      }
      if (!composer || boundRenderer !== renderer) buildComposer(renderer, camera);
      composer!.render();
    },
    setSize(w, h) {
      sizeW = Math.max(1, w);
      sizeH = Math.max(1, h);
      composer?.setSize(sizeW, sizeH);
      bloomPass?.setSize(sizeW, sizeH);
    },
    dispose() {
      for (const d of disposables) d.dispose();
      composer?.dispose();
    },
  };
}

/** The scene radius the schematic disk occupies — the page uses this to frame
 *  the entry camera. */
export const MW_SCENE_RADIUS = MW_DISK_RADIUS_SCENE;
/** Convenience re-export for the page's framing math. */
export { kpcToScene };
