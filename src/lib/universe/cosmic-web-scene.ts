/**
 * The Cosmic Web scene for /explore (WS-5d, RFC-039) — the largest, outermost
 * shell. A HEAVILY SCHEMATIC MODEL, NOT TO SCALE and not a survey (PRD-030
 * principle 2 + the Gpc-honesty risk): Laniakea sits at the origin as the "you
 * are here" anchor, the great named structures are glowing nodes, and the great
 * voids render as faint empty rings — the absence of galaxies made visible.
 *
 * WebGL builder — coverage-excluded (see vite.config.ts).
 */
import * as THREE from 'three';
import type { CosmicWebData, CosmicWebMember } from '$lib/data';
import { labelSprite, radialTexture, ringTexture, createRing } from './scene-pin-sprites';
import {
  LABEL_SPRITE_PX,
  RING_PX,
  applyRing,
  cameraFov,
  labelOffset,
  labelRect,
  newLabelSlot,
  placeLabels,
  snapshotPins,
  worldPerPx,
  type LabelSlot,
  type PinsSnapshot,
} from './scene-pins';

export interface CosmicWebScene {
  scene: THREE.Scene;
  pickables: THREE.Object3D[];
  objectPosition(id: string): THREE.Vector3 | null;
  highlight(id: string | null): void;
  update(camera: THREE.Camera, viewportH: number): void;
  /** Probe for the e2e specs: every label and ring as it is on screen (client px). */
  pinsSnapshot(camera: THREE.Camera, w: number, h: number): PinsSnapshot;
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void;
  setSize(w: number, h: number): void;
  dispose(): void;
}

export const COSMIC_WEB_SCENE_RADIUS = 150;

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
  isVoid: boolean;
}

export function createCosmicWebScene(data: CosmicWebData): CosmicWebScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03050c);
  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  const R = COSMIC_WEB_SCENE_RADIUS;
  const scale = R / (data.extent_mpc || 320);
  const toScene = (m: CosmicWebMember) => new THREE.Vector3(m.x * scale, m.y * scale, m.z * scale);

  // Faint web aura.
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

  // A soft empty-ring texture for the voids (a faint annulus — absence, not mass).
  const voidRingTex = track(
    radialTexture([
      [0, 'rgba(150,165,205,0)'],
      [0.66, 'rgba(150,165,205,0)'],
      [0.8, 'rgba(150,165,205,0.4)'],
      [0.92, 'rgba(150,165,205,0)'],
      [1, 'rgba(150,165,205,0)'],
    ]),
  );

  const pins: Pin[] = [];
  const byId = new Map<string, Pin>();
  const pickables: THREE.Object3D[] = [];
  const slots: LabelSlot[] = [];
  const ringTex = track(ringTexture());

  for (const m of data.members) {
    const position = toScene(m);
    const isAnchor = m.id === 'laniakea';
    const isConcentration = m.kind === 'concentration';
    const isWall = m.kind === 'wall';
    const isVoid = m.kind === 'void';

    // Voids are rendered as a faint empty ring; everything else glows.
    const stops: Array<[number, string]> = isAnchor
      ? [
          [0, 'rgba(236,242,255,0.7)'],
          [0.5, 'rgba(206,222,255,0.3)'],
          [1, 'rgba(190,210,255,0)'],
        ]
      : isConcentration
        ? [
            [0, 'rgba(255,206,170,0.85)'],
            [0.45, 'rgba(255,178,132,0.4)'],
            [1, 'rgba(255,160,110,0)'],
          ]
        : isWall
          ? [
              [0, 'rgba(224,232,255,0.7)'],
              [0.5, 'rgba(190,212,255,0.32)'],
              [1, 'rgba(170,198,255,0)'],
            ]
          : [
              [0, 'rgba(206,220,255,0.55)'],
              [0.5, 'rgba(176,202,255,0.25)'],
              [1, 'rgba(160,190,255,0)'],
            ];

    const glow = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: isVoid ? voidRingTex : track(radialTexture(stops)),
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: isVoid ? THREE.NormalBlending : THREE.AdditiveBlending,
          opacity: isVoid ? 0.85 : 1,
        }),
      ),
    );
    glow.position.copy(position);
    glow.userData.cosmicWebId = m.id;
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

    const baseScale = Math.max(0.05, Math.min(0.26, Math.sqrt(m.diam_mly) * 0.011));
    const pin: Pin = {
      id: m.id,
      glow,
      ring,
      anchor: isAnchor,
      slot,
      position,
      baseScale,
      alwaysLabel: m.headliner || isAnchor,
      isVoid,
    };
    pins.push(pin);
    byId.set(m.id, pin);
  }

  let highlightId: string | null = null;
  const _cam = new THREE.Vector3();
  const _tmp = new THREE.Vector3();

  return {
    scene,
    pickables,
    objectPosition: (id) => byId.get(id)?.position.clone() ?? null,
    highlight(id) {
      highlightId = id;
    },
    update(camera, viewportH) {
      camera.getWorldPosition(_cam);
      const fov = cameraFov(camera);
      for (const pin of pins) {
        const dist = Math.max(1, _cam.distanceTo(pin.position));
        const wpp = worldPerPx(dist, fov, viewportH);
        const hi = pin.id === highlightId;
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
          slot.sprite.position.set(
            pin.position.x,
            pin.position.y + labelOffset(g0, lh, wpp * (RING_PX / 2)),
            pin.position.z,
          );
          slot.visible = labelRect(slot.sprite, camera, _cam, slot.rect, _tmp);
        }
      }
      placeLabels(slots);
    },
    pinsSnapshot(camera, w, h) {
      return snapshotPins('cosmic-web', pins, camera, w, h);
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
