/**
 * The Local Sheet / Local Volume scene for /explore (WS-1, RFC-037) — the shell
 * one step out from the Local Group. A SCHEMATIC, NOT TO SCALE model (PRD-030
 * principle 2): each neighbouring galaxy group is a soft glowing blob at its
 * schematic position, with the Local Group at the centre as the "you are here"
 * anchor (a teal ring, like the Milky Way ring in the Local Group scene).
 *
 * WebGL builder — coverage-excluded (see vite.config.ts).
 */
import * as THREE from 'three';
import type { LocalSheetData, LocalSheetMember } from '$lib/data';

export interface LocalSheetScene {
  scene: THREE.Scene;
  pickables: THREE.Object3D[];
  objectPosition(id: string): THREE.Vector3 | null;
  highlight(id: string | null): void;
  update(camera: THREE.Camera): void;
  render(renderer: THREE.WebGLRenderer, camera: THREE.Camera): void;
  setSize(w: number, h: number): void;
  dispose(): void;
}

export const LS_SCENE_RADIUS = 150;

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
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}

function labelSprite(text: string): {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  aspect: number;
} {
  const upper = text.toUpperCase();
  const font = '400 24px "Space Mono", monospace';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  measure.letterSpacing = '2px';
  const pad = 12;
  const w = Math.ceil(measure.measureText(upper).width) + pad * 2;
  const h = 40;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.font = font;
  ctx.letterSpacing = '2px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 5;
  ctx.fillStyle = 'rgba(200,214,255,0.9)';
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

interface Pin {
  id: string;
  glow: THREE.Sprite;
  ring?: THREE.Sprite;
  label: THREE.Sprite;
  labelAspect: number;
  position: THREE.Vector3;
  baseScale: number;
  alwaysLabel: boolean;
}

export function createLocalSheetScene(data: LocalSheetData): LocalSheetScene {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x03050c);
  const disposables: Array<{ dispose(): void }> = [];
  const track = <T extends { dispose(): void }>(o: T): T => {
    disposables.push(o);
    return o;
  };

  const R = LS_SCENE_RADIUS;
  // Members are laid out in Mpc-ish schematic units; scale so the extent fits.
  const scale = R / (data.extent_mpc || 10);
  const toScene = (m: LocalSheetMember) => new THREE.Vector3(m.x * scale, m.y * scale, m.z * scale);

  // Faint sheet aura.
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

  for (const m of data.members) {
    const position = toScene(m);
    const isAnchor = m.id === 'local-group';
    const glow = new THREE.Sprite(
      track(
        new THREE.SpriteMaterial({
          map: track(
            radialTexture(
              isAnchor
                ? [
                    [0, 'rgba(120,240,230,0.7)'],
                    [0.5, 'rgba(90,210,200,0.3)'],
                    [1, 'rgba(78,205,196,0)'],
                  ]
                : [
                    [0, 'rgba(214,226,255,0.65)'],
                    [0.5, 'rgba(180,205,255,0.3)'],
                    [1, 'rgba(160,190,255,0)'],
                  ],
            ),
          ),
          transparent: true,
          depthTest: false,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
      ),
    );
    glow.position.copy(position);
    glow.userData.lsId = m.id;
    glow.renderOrder = 10;
    scene.add(glow);
    pickables.push(glow);

    // The Local Group anchor gets a "you are here" teal ring.
    let ring: THREE.Sprite | undefined;
    if (isAnchor) {
      ring = new THREE.Sprite(
        track(
          new THREE.SpriteMaterial({
            map: track(
              radialTexture([
                [0, 'rgba(78,205,196,0)'],
                [0.72, 'rgba(78,205,196,0)'],
                [0.82, 'rgba(78,205,196,0.9)'],
                [0.92, 'rgba(78,205,196,0)'],
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
      ring.renderOrder = 9;
      scene.add(ring);
    }

    const { sprite: label, texture: labelTex, aspect } = labelSprite(m.name);
    disposables.push(labelTex, label.material as THREE.SpriteMaterial);
    label.position.copy(position);
    label.renderOrder = 11;
    scene.add(label);

    // Blob size scales with the group's diameter, clamped for legibility.
    const baseScale = Math.max(0.05, Math.min(0.16, Math.sqrt(m.diam_mly) * 0.03));
    const pin: Pin = {
      id: m.id,
      glow,
      ring,
      label,
      labelAspect: aspect,
      position,
      baseScale,
      alwaysLabel: m.headliner || isAnchor,
    };
    pins.push(pin);
    byId.set(m.id, pin);
  }

  let highlightId: string | null = null;
  const _cam = new THREE.Vector3();

  return {
    scene,
    pickables,
    objectPosition: (id) => byId.get(id)?.position.clone() ?? null,
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
        pin.label.visible = pin.alwaysLabel || hi;
        const lh = dist * 0.03;
        pin.label.scale.set(lh * pin.labelAspect, lh, 1);
        pin.label.position.set(pin.position.x, pin.position.y + g * 0.9 + lh * 0.7, pin.position.z);
      }
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
