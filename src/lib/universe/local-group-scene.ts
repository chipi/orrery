/**
 * The Local Group schematic scene for /explore v2 (Slice 8).
 *
 * A schematic 3-D model of our galaxy neighbourhood — honest, labelled, NOT to
 * scale (PRD-030 principle 2). The Milky Way and Andromeda are the two big spirals
 * (procedural log-spiral particle disks), Triangulum a third, the Magellanic Clouds
 * + ~30 real dwarf galaxies as glowing glints clustered around their parents. Unlike
 * the Milky Way scene's screen-constant pins, galaxy glows are sized in WORLD units
 * (∝ real diameter, schematic) so Andromeda looms larger than a dwarf and grows as
 * you approach — only the labels stay screen-constant so they stay readable.
 *
 * WebGL builder — coverage-excluded (see vite.config.ts). Shares the Milky-Way
 * scene's bloom-composer idiom; reuses logSpiralPoint / makeRng (unit-tested).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { logSpiralPoint, makeRng } from './milky-way-visual';
import type { LocalGroupData, LocalGroupMember, LocalGroupKind } from '$lib/data';

export interface LocalGroupScene {
  scene: THREE.Scene;
  pickables: THREE.Object3D[];
  objectPosition(id: string): THREE.Vector3 | null;
  highlight(id: string | null): void;
  update(camera: THREE.Camera): void;
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void;
  setSize(w: number, h: number): void;
  dispose(): void;
}

export interface LocalGroupBloomOptions {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
}
// Matched to the Milky Way scene's restrained bloom (strength 0.34 / threshold 0.70)
// so the Local Group reads with the same warmth, not blown-out white cores.
const DEFAULT_BLOOM: LocalGroupBloomOptions = {
  enabled: true,
  strength: 0.34,
  radius: 0.62,
  threshold: 0.7,
};

/** Scene units per schematic layout unit (the MW↔Andromeda gap is 2.5 layout units). */
const LG_SCALE = 42;
/** The radius the whole layout occupies — the page frames the entry camera by this. */
export const LG_SCENE_RADIUS = 150;

function radialTexture(stops: Array<[number, string]>, size = 128): THREE.CanvasTexture {
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d')!;
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  for (const [stop, color] of stops) g.addColorStop(stop, color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(cvs);
  t.needsUpdate = true;
  return t;
}

function labelSprite(
  text: string,
  color: string,
  weight: 'bold' | 'normal',
): { sprite: THREE.Sprite; texture: THREE.CanvasTexture; aspect: number } {
  const upper = text.toUpperCase();
  // Lighter weight + wide tracking (matches the neighborhood + Milky Way labels).
  const font = `${weight === 'bold' ? '500' : '400'} 24px "Space Mono", monospace`;
  const tracking = '2px';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  measure.letterSpacing = tracking;
  const pad = 12;
  const w = Math.ceil(measure.measureText(upper).width) + pad * 2;
  const h = 40;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.font = font;
  ctx.letterSpacing = tracking;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = color;
  ctx.fillText(upper, w / 2, h / 2);
  const texture = new THREE.CanvasTexture(cvs);
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

// Glow gradient per galaxy kind — spirals cool+bright, dwarfs faint (old stars warm,
// irregulars a touch blue). Never pure white; the core reads as glow not blowout.
const GLOW_STOPS: Record<LocalGroupKind, Array<[number, string]>> = {
  spiral: [
    [0, 'rgba(228,236,232,0.42)'],
    [0.3, 'rgba(120,206,196,0.22)'],
    [0.62, 'rgba(92,182,176,0.08)'],
    [1, 'rgba(70,160,158,0)'],
  ],
  irregular: [
    [0, 'rgba(194,234,226,0.4)'],
    [0.45, 'rgba(120,202,192,0.15)'],
    [1, 'rgba(96,182,176,0)'],
  ],
  'dwarf-elliptical': [
    [0, 'rgba(250,222,172,0.44)'],
    [0.45, 'rgba(238,194,138,0.15)'],
    [1, 'rgba(220,170,120,0)'],
  ],
  'dwarf-spheroidal': [
    [0, 'rgba(250,220,178,0.36)'],
    [0.5, 'rgba(234,190,148,0.11)'],
    [1, 'rgba(210,168,124,0)'],
  ],
  'dwarf-irregular': [
    [0, 'rgba(198,232,226,0.38)'],
    [0.5, 'rgba(128,200,192,0.12)'],
    [1, 'rgba(108,182,176,0)'],
  ],
};

const ARM_COL = new THREE.Color(0.82, 0.93, 0.96); // teal-white (brand), not blue
const CORE_COL = new THREE.Color(0.98, 0.86, 0.6); // warm gold core

interface Pin {
  id: string;
  glow: THREE.Sprite;
  disk?: THREE.Points;
  ring?: THREE.Sprite;
  label: THREE.Sprite;
  labelAspect: number;
  position: THREE.Vector3;
  glowSize: number;
  headliner: boolean;
  alwaysLabel: boolean;
}

export function createLocalGroupScene(
  data: LocalGroupData,
  bloom: LocalGroupBloomOptions = DEFAULT_BLOOM,
): LocalGroupScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x04060d);

  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  // Centre the whole layout on its centroid so the scene sits at the origin — the
  // page orbits a fixed focus point, and the Milky Way + Andromeda frame together.
  const n = data.members.length || 1;
  const cxN = data.members.reduce((a, m) => a + m.x, 0) / n;
  const cyN = data.members.reduce((a, m) => a + m.y, 0) / n;
  const czN = data.members.reduce((a, m) => a + m.z, 0) / n;
  const toScene = (m: LocalGroupMember) =>
    new THREE.Vector3((m.x - cxN) * LG_SCALE, (m.y - cyN) * LG_SCALE, (m.z - czN) * LG_SCALE);

  // Faint group aura so the members sit in a glow, not on flat black.
  const aura = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: track(
          radialTexture([
            [0, 'rgba(90,120,200,0.05)'],
            [0.6, 'rgba(80,110,190,0.02)'],
            [1, 'rgba(70,100,180,0)'],
          ]),
        ),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  aura.scale.setScalar(LG_SCENE_RADIUS * 3);
  scene.add(aura);

  const pins: Pin[] = [];
  const byId = new Map<string, Pin>();
  const pickables: THREE.Object3D[] = [];

  // Build a small procedural spiral-galaxy particle disk (2 arms + warm core),
  // tilted for a 3-D read. Radius in scene units.
  function spiralDisk(radius: number, seed: number): THREE.Points {
    const rng = makeRng(seed);
    const arms = 2;
    const pos: number[] = [];
    const col: number[] = [];
    const inner = radius * 0.12;
    for (let a = 0; a < arms; a++) {
      const start = (a / arms) * Math.PI * 2;
      const n = 320;
      for (let i = 0; i < n; i++) {
        const theta = (i / n) * Math.PI * 3.0;
        const p = logSpiralPoint(inner, 0.24, theta, start);
        const jitter = radius * 0.06 * (rng() - 0.5);
        const r = Math.min(radius, p.r);
        const x = Math.cos(theta + start) * r + jitter;
        const z = Math.sin(theta + start) * r + jitter;
        const y = radius * 0.05 * (rng() - 0.5);
        pos.push(x, y, z);
        const t = r / radius;
        const c = CORE_COL.clone().lerp(ARM_COL, Math.min(1, t * 1.3));
        col.push(c.r, c.g, c.b);
      }
    }
    // scattered core stars
    for (let i = 0; i < 140; i++) {
      const rr = inner * (0.2 + rng() * 3.2);
      const ang = rng() * Math.PI * 2;
      pos.push(Math.cos(ang) * rr, radius * 0.04 * (rng() - 0.5), Math.sin(ang) * rr);
      col.push(CORE_COL.r, CORE_COL.g, CORE_COL.b);
    }
    const geo = track(new THREE.BufferGeometry());
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const mat = track(
      new THREE.PointsMaterial({
        size: radius * 0.024,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    );
    return new THREE.Points(geo, mat);
  }

  for (const m of data.members) {
    const position = toScene(m);
    // World-space glow size ∝ √diameter (schematic), clamped so dwarfs stay visible
    // and spirals stay prominent but not overwhelming.
    const glowSize = Math.min(46, Math.max(6, Math.sqrt(m.diam_kly) * 2.9));

    const glowTex = track(radialTexture(GLOW_STOPS[m.kind]));
    const glow = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    glow.position.copy(position);
    glow.scale.setScalar(glowSize);
    glow.userData.lgId = m.id;
    scene.add(glow);
    pickables.push(glow);

    // The three big spirals get a particle disk on top of the glow.
    let disk: THREE.Points | undefined;
    if (m.kind === 'spiral') {
      disk = spiralDisk(glowSize * 0.62, 0x1000 + pins.length * 7);
      disk.position.copy(position);
      // schematic tilt so they don't all lie in one plane
      disk.rotation.set(
        m.id === 'milky-way' ? 0.5 : m.id === 'andromeda' ? 1.05 : -0.7,
        pins.length * 0.6,
        m.id === 'andromeda' ? 0.35 : -0.2,
      );
      scene.add(disk);
    }

    // "You are here" teal ring on the Milky Way.
    let ring: THREE.Sprite | undefined;
    if (m.id === 'milky-way') {
      ring = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: track(
              radialTexture([
                [0, 'rgba(78,205,196,0)'],
                [0.74, 'rgba(78,205,196,0)'],
                [0.84, 'rgba(78,205,196,0.9)'],
                [0.94, 'rgba(78,205,196,0)'],
                [1, 'rgba(78,205,196,0)'],
              ]),
            ),
            transparent: true,
            depthTest: false,
            depthWrite: false,
          }),
        ),
      );
      ring.position.copy(position);
      ring.scale.setScalar(glowSize * 2.1);
      ring.renderOrder = 9;
      scene.add(ring);
    }

    const labelColor = m.headliner ? 'rgba(120,214,255,0.96)' : 'rgba(180,196,224,0.72)';
    const {
      sprite: label,
      texture: labelTex,
      aspect,
    } = labelSprite(m.name, labelColor, m.headliner ? 'bold' : 'normal');
    disposables.push(labelTex, label.material as THREE.SpriteMaterial);
    label.position.copy(position);
    label.renderOrder = 11;
    scene.add(label);

    const pin: Pin = {
      id: m.id,
      glow,
      disk,
      ring,
      label,
      labelAspect: aspect,
      position,
      glowSize,
      headliner: m.headliner,
      // Keep the always-on label set small (the spirals + the lone independent
      // headliner) so the overview reads; the famous dwarfs (LMC/SMC) reveal on hover.
      alwaysLabel: m.headliner && (m.kind === 'spiral' || m.parent === 'independent'),
    };
    pins.push(pin);
    byId.set(m.id, pin);
  }

  let highlightId: string | null = null;
  const _cam = new THREE.Vector3();

  let composer: EffectComposer | null = null;
  let bloomPass: UnrealBloomPass | null = null;
  let boundRenderer: THREE.WebGLRenderer | null = null;
  function buildComposer(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void {
    const size = renderer.getSize(new THREE.Vector2());
    composer = new EffectComposer(renderer);
    composer.setSize(Math.max(1, size.x), Math.max(1, size.y));
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(Math.max(1, size.x), Math.max(1, size.y)),
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
        if (pin.ring) pin.ring.scale.setScalar(pin.glowSize * 2.1 * (hi ? 1.15 : 1));
        // Only headliners carry an always-on label; the ~30 dwarfs stay glints and
        // reveal their name on hover/selection, so the census reads without clutter.
        pin.label.visible = pin.alwaysLabel || hi;
        if (pin.label.visible) {
          const lh = dist * (pin.headliner ? 0.038 : 0.032);
          pin.label.scale.set(lh * pin.labelAspect, lh, 1);
          pin.label.position.set(
            pin.position.x,
            pin.position.y + pin.glowSize * 0.62 + lh * 0.7,
            pin.position.z,
          );
          (pin.label.material as THREE.SpriteMaterial).opacity = hi ? 1 : 0.94;
        }
        if (pin.disk) pin.disk.rotation.y = (pin.disk.rotation.y + 0.0006) % (Math.PI * 2);
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
      composer?.setSize(Math.max(1, w), Math.max(1, h));
      bloomPass?.setSize(Math.max(1, w), Math.max(1, h));
    },
    dispose() {
      for (const d of disposables) d.dispose();
      composer?.dispose();
    },
  };
}
