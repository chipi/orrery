/**
 * The Laniakea Supercluster scene for /explore (WS-5c, RFC-039) — the shell one
 * step out from the Virgo Supercluster. A SCHEMATIC, NOT TO SCALE model (PRD-030
 * principle 2): each constituent supercluster/cluster is a soft glowing blob at
 * its schematic position, with the Virgo Supercluster at the origin as the "you
 * are here" anchor (a gold ring) and the Great Attractor rendered as the dominant
 * warm focus — the gravitational basin toward which the whole of Laniakea flows.
 *
 * WebGL builder — coverage-excluded (see vite.config.ts).
 */
import * as THREE from 'three';
import type { LaniakeaData, LaniakeaMember } from '$lib/data';
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

export interface LaniakeaScene {
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

export const LANIAKEA_SCENE_RADIUS = 150;

interface Pin {
  id: string;
  glow: THREE.Sprite;
  /** Every pin has one; it shows on hover or selection (the anchor: always, gold). */
  ring: THREE.Sprite;
  anchor: boolean;
  slot: LabelSlot;
  position: THREE.Vector3;
  baseScale: number;
  alwaysLabel: boolean;
}

export function createLaniakeaScene(data: LaniakeaData): LaniakeaScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03050c);
  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  const R = LANIAKEA_SCENE_RADIUS;
  const scale = R / (data.extent_mpc || 160);
  const toScene = (m: LaniakeaMember) => new THREE.Vector3(m.x * scale, m.y * scale, m.z * scale);

  // Faint basin aura.
  const aura = new THREE.Sprite(
    track(
      new THREE.SpriteMaterial({
        map: track(
          radialTexture([
            [0, 'rgba(80,110,190,0.05)'],
            [0.6, 'rgba(70,100,180,0.02)'],
            [1, 'rgba(60,90,170,0)'],
          ]),
        ),
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
      }),
    ),
  );
  aura.scale.setScalar(R * 3);
  scene.add(aura);

  const pins: Pin[] = [];
  const byId = new Map<string, Pin>();
  const pickables: THREE.Object3D[] = [];
  const slots: LabelSlot[] = [];
  const ringTex = track(ringTexture());

  for (const m of data.members) {
    const position = toScene(m);
    const isAnchor = m.id === 'virgo-supercluster';
    const isFocus = m.kind === 'attractor';
    // Anchor = neutral blue-white; the Great Attractor gets the brightest, warmest glow (the
    // gravitational focus); superclusters a cool white, clusters a dimmer white.
    const stops: Array<[number, string]> = isAnchor
      ? [
          [0, 'rgba(236,242,255,0.7)'],
          [0.5, 'rgba(206,222,255,0.3)'],
          [1, 'rgba(190,210,255,0)'],
        ]
      : isFocus
        ? [
            [0, 'rgba(255,214,180,0.85)'],
            [0.45, 'rgba(255,184,140,0.4)'],
            [1, 'rgba(255,168,120,0)'],
          ]
        : [
            [0, 'rgba(214,226,255,0.62)'],
            [0.5, 'rgba(180,205,255,0.28)'],
            [1, 'rgba(160,190,255,0)'],
          ];
    const glow = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: track(radialTexture(stops)),
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    glow.position.copy(position);
    glow.userData.laniakeaId = m.id;
    glow.renderOrder = 10;
    scene.add(glow);
    pickables.push(glow);

    // Every pin has a ring (hover / selection); the anchor's is the gold "you are here" ring
    // and stays up. Screen-constant, like the labels.
    const ring = createRing(ringTex, isAnchor);
    track(ring.material as THREE.SpriteMaterial);
    ring.position.copy(position);
    ring.renderOrder = 9;
    scene.add(ring);

    const {
      sprite: label,
      texture: labelTex,
      aspect,
    } = labelSprite(m.name, { color: 'rgba(200,214,255,0.9)' });
    disposables.push(labelTex, label.material as THREE.SpriteMaterial);
    label.position.copy(position);
    label.renderOrder = 11;
    scene.add(label);
    // Label priority when two collide (lower wins): the anchor, the headliners, the rest.
    const slot = newLabelSlot(label, aspect, isAnchor ? 0 : m.headliner ? 1 : 10);
    slots.push(slot);

    const baseScale = Math.max(0.05, Math.min(0.22, Math.sqrt(m.diam_mly) * 0.024));
    const pin: Pin = {
      id: m.id,
      glow,
      ring,
      anchor: isAnchor,
      slot,
      position,
      baseScale,
      alwaysLabel: m.headliner || isAnchor,
    };
    pins.push(pin);
    byId.set(m.id, pin);
  }

  let highlightId: string | null = null;
  let selectedId: string | null = null;
  const _tmp = new THREE.Vector3();

  return {
    scene,
    pickables,
    objectPosition: (id) => byId.get(id)?.position.clone() ?? null,
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
        // g0 is the STEADY glow: the hover grows the glow and the ring, never the label offset.
        const g0 = dist * pin.baseScale;
        pin.glow.scale.setScalar(g0 * (hi ? 1.5 : 1));
        applyRing(pin.ring, pin.anchor, hi, wpp);
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
            labelOffset(g0, lh, wpp * (RING_PX / 2)),
          );
          slot.visible = labelRect(slot.sprite, camera, slot.rect, _tmp);
        }
      }
      placeLabels(slots);
    },
    pinsSnapshot(camera, w, h) {
      return snapshotPins('laniakea', pins, camera, w, h);
    },
    render(renderer, camera) {
      renderer.render(scene, camera);
    },
    setSize() {},
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}
