/**
 * The Local Group schematic scene for /explore v2 (Slice 8).
 *
 * A schematic 3-D model of our galaxy neighbourhood — honest, labelled, NOT to
 * scale (PRD-030 principle 2). The Milky Way and Andromeda are the two big spirals
 * (procedural log-spiral particle disks), Triangulum a third, the Magellanic Clouds
 * + ~30 real dwarf galaxies as glowing glints clustered around their parents. Unlike
 * the Milky Way scene's screen-constant pins, galaxy glows are sized in WORLD units
 * (∝ real diameter, schematic) so Andromeda looms larger than a dwarf and grows as
 * you approach — only the labels and rings stay screen-constant so they stay readable.
 *
 * WebGL builder — coverage-excluded (see vite.config.ts). Shares the Milky-Way
 * scene's bloom-composer idiom; reuses logSpiralPoint / makeRng (unit-tested).
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { logSpiralPoint, makeRng } from './milky-way-visual';
import type { LocalGroupData, LocalGroupMember, LocalGroupKind } from '$lib/data';
import { labelSprite, radialTexture, ringTexture, createRing } from './scene-pin-sprites';
import {
  LABEL_SPRITE_PX,
  RING_PX,
  applyRing,
  cameraFov,
  labelOffset,
  liftOnScreen,
  labelRect,
  newLabelSlot,
  placeLabels,
  snapshotPins,
  viewDepth,
  worldPerPx,
  type LabelSlot,
  type PinsSnapshot,
} from './scene-pins';

export interface LocalGroupScene {
  scene: THREE.Scene;
  pickables: THREE.Object3D[];
  objectPosition(id: string): THREE.Vector3 | null;
  /** `id` is the hovered pin, `selectedId` the selected one: both show their ring and label. */
  highlight(id: string | null, selectedId?: string | null): void;
  update(camera: THREE.Camera, viewportH: number): void;
  /** Probe for the e2e specs: every label and ring as it is on screen (client px). */
  pinsSnapshot(camera: THREE.Camera, w: number, h: number): PinsSnapshot;
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
// The composer ends in an OutputPass (sRGB encode lifts dim bloom), so the glow is tuned against
// that output: the same warm, unclipped cores as the Milky Way scene (strength 0.8 / threshold 0.5).
const DEFAULT_BLOOM: LocalGroupBloomOptions = {
  enabled: true,
  strength: 0.8,
  radius: 0.8,
  threshold: 0.5,
};

/** Scene units per schematic layout unit (the MW↔Andromeda gap is 2.5 layout units). */
const LG_SCALE = 42;
/** The radius the whole layout occupies — the page frames the entry camera by this. */
export const LG_SCENE_RADIUS = 150;

// Glow gradient per galaxy kind — spirals cool+bright, dwarfs faint (old stars warm,
// irregulars a touch blue). Never pure white; the core reads as glow not blowout.
const GLOW_STOPS: Record<LocalGroupKind, Array<[number, string]>> = {
  spiral: [
    [0, 'rgba(228,236,232,0.42)'],
    [0.3, 'rgba(120,206,196,0.22)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
    [0.62, 'rgba(92,182,176,0.08)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
    [1, 'rgba(70,160,158,0)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
  ],
  irregular: [
    [0, 'rgba(194,234,226,0.4)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
    [0.45, 'rgba(120,202,192,0.15)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
    [1, 'rgba(96,182,176,0)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
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
    [0, 'rgba(198,232,226,0.38)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
    [0.5, 'rgba(128,200,192,0.12)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
    [1, 'rgba(108,182,176,0)'], // a3-keep: universe scene colour coding (star, galaxy, structure), palette review at the end
  ],
};

const ARM_COL = new THREE.Color(0.82, 0.93, 0.96); // teal-white (brand), not blue
const CORE_COL = new THREE.Color(0.98, 0.86, 0.6); // warm gold core

interface Pin {
  id: string;
  glow: THREE.Sprite;
  disk?: THREE.Points;
  /** Every pin has one; it shows on hover or selection (the Milky Way: always, gold). */
  ring: THREE.Sprite;
  anchor: boolean;
  slot: LabelSlot;
  position: THREE.Vector3;
  glowSize: number;
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
  const slots: LabelSlot[] = [];
  const ringTex = track(ringTexture());

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

    // Every pin has a ring (hover / selection); the Milky Way's is the gold "you are here"
    // anchor and stays up. Screen-constant, like the labels.
    const anchor = m.id === 'milky-way';
    const ring = createRing(ringTex, anchor);
    track(ring.material as THREE.SpriteMaterial);
    ring.position.copy(position);
    ring.renderOrder = 9;
    scene.add(ring);

    const labelColor = m.headliner ? 'rgba(223,236,247,0.96)' : 'rgba(180,196,224,0.72)';
    const {
      sprite: label,
      texture: labelTex,
      aspect,
    } = labelSprite(m.name, { color: labelColor, weight: m.headliner ? 'bold' : 'normal' });
    disposables.push(labelTex, label.material as THREE.SpriteMaterial);
    label.position.copy(position);
    label.renderOrder = 11;
    scene.add(label);

    const alwaysLabel = m.headliner && (m.kind === 'spiral' || m.parent === 'independent');
    // Label priority when two collide (lower wins): the anchor, the other spirals, the
    // independent headliner, then the hover-only dwarfs.
    const slot = newLabelSlot(
      label,
      aspect,
      anchor ? 0 : m.kind === 'spiral' ? 1 : alwaysLabel ? 2 : 10,
    );
    slots.push(slot);
    const pin: Pin = {
      id: m.id,
      glow,
      disk,
      ring,
      anchor,
      slot,
      position,
      glowSize,
      // Keep the always-on label set small (the spirals + the lone independent
      // headliner) so the overview reads; the famous dwarfs (LMC/SMC) reveal on hover.
      alwaysLabel,
    };
    pins.push(pin);
    byId.set(m.id, pin);
  }

  let highlightId: string | null = null;
  let selectedId: string | null = null;
  const _tmp = new THREE.Vector3();

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
    composer.addPass(new OutputPass());
    boundRenderer = renderer;
  }

  return {
    scene,
    pickables,
    objectPosition(id) {
      return byId.get(id)?.position.clone() ?? null;
    },
    highlight(id, sel = null) {
      highlightId = id;
      selectedId = sel;
    },
    update(camera, viewportH) {
      camera.updateMatrixWorld();
      const fov = cameraFov(camera);
      for (const pin of pins) {
        const dist = Math.max(1, viewDepth(camera, pin.position));
        const wpp = worldPerPx(dist, fov, viewportH);
        const hi = pin.id === highlightId || pin.id === selectedId;
        applyRing(pin.ring, pin.anchor, hi, wpp);
        // Only headliners carry an always-on label; the ~30 dwarfs stay glints and
        // reveal their name on hover/selection, so the census reads without clutter.
        const slot = pin.slot;
        slot.force = hi;
        slot.visible = false;
        if (pin.alwaysLabel || hi) {
          const lh = wpp * LABEL_SPRITE_PX;
          slot.sprite.scale.set(lh * slot.aspect, lh, 1);
          liftOnScreen(
            slot.sprite.position,
            pin.position,
            camera,
            labelOffset(pin.glowSize, lh, wpp * (RING_PX / 2), 0.62),
          );
          (slot.sprite.material as THREE.SpriteMaterial).opacity = hi ? 1 : 0.94;
          slot.visible = labelRect(slot.sprite, camera, slot.rect, _tmp);
        }
        if (pin.disk) pin.disk.rotation.y = (pin.disk.rotation.y + 0.0006) % (Math.PI * 2);
      }
      placeLabels(slots);
    },
    pinsSnapshot(camera, w, h) {
      return snapshotPins('local-group', pins, camera, w, h);
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
