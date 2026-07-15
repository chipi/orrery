/**
 * Deep-sky billboard/glint layer for /explore v2 (Slice 4).
 *
 * Renders the Messier set + curated-gallery NGC/IC objects on the neighborhood
 * celestial sphere. SUBTLE by default: each object is a faint category-coloured
 * glint sized by real angular size; the starfield stays primary. Labels appear
 * on hover/selection only. Photo billboards + distance-driven LOD bloom land in
 * Part 3 (this file owns the glint foundation + picking + toggle).
 *
 * WebGL builder — coverage-excluded (see vite.config.ts). The pure colour /
 * glint-sizing / placement maths live in deep-sky-visual.ts (unit-tested).
 */
import * as THREE from 'three';
import type { DeepSkyObject } from '$lib/data';
import {
  categoryColor,
  angularSizeFactor,
  directionToPosition,
  DEEP_SKY_RADIUS,
} from './deep-sky-visual';
import { deepSkyGlintBloom } from './deep-sky-lod';

export interface DeepSkyLayerHandle {
  group: THREE.Group;
  /** Raycast targets — each glint sprite carries userData.deepSkyId. */
  pickables: THREE.Object3D[];
  setVisible(on: boolean): void;
  /** Emphasize one object (hover/selection) + reveal its label, or clear. */
  highlight(id: string | null): void;
  /** Focus one object for the approach warp — its glint blooms per `approach`. */
  setFocus(id: string | null): void;
  /** Approach ramp 0 → 1 for the focused object (drives its 3D bloom). */
  setApproach(a: number): void;
  /** Scene position of an object (for warp targeting), or null. */
  objectPosition(id: string): THREE.Vector3 | null;
  objectById(id: string): DeepSkyObject | null;
  /** Per-frame reveal + screen-constant sizing. */
  update(camDistPc: number, camera: THREE.Camera): void;
  dispose(): void;
}

/** Baseline glint opacity when the layer is on — deliberately low so the deep
 *  sky reads as a faint backdrop the starfield sits in front of. */
const GLINT_BASE_OPACITY = 0.5;
/** Glint world size per unit of camera distance (screen-constant). Small — a
 *  glint is a soft fuzzy hint (distinct from a crisp point-star), not a sticker.
 *  Multiplied by the angular-size factor. */
const GLINT_SIZE_K = 0.02;

/** Soft radial-gradient disc, category-coloured. Cached per colour. */
function makeGlintTexture(color: string): THREE.CanvasTexture {
  const s = 64;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = s;
  const ctx = cvs.getContext('2d')!;
  const c = s / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, color);
  g.addColorStop(0.35, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(c, c, c, 0, Math.PI * 2);
  ctx.fill();
  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/** Camera-facing text label (canvas). Caller sizes + toggles it. */
function makeLabelSprite(text: string): {
  sprite: THREE.Sprite;
  texture: THREE.CanvasTexture;
  aspect: number;
} {
  const upper = text.toUpperCase();
  const font = 'bold 22px "Space Mono", monospace';
  const measure = document.createElement('canvas').getContext('2d')!;
  measure.font = font;
  const pad = 8;
  const w = Math.ceil(measure.measureText(upper).width) + pad * 2;
  const h = 34;
  const cvs = document.createElement('canvas');
  cvs.width = w;
  cvs.height = h;
  const ctx = cvs.getContext('2d')!;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.95)';
  ctx.shadowBlur = 4;
  ctx.fillStyle = 'rgba(233,238,252,0.96)';
  ctx.fillText(upper, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.visible = false;
  return { sprite, texture: tex, aspect: w / h };
}

interface Entry {
  obj: DeepSkyObject;
  glint: THREE.Sprite;
  label: THREE.Sprite;
  labelAspect: number;
  sizeFactor: number;
  position: THREE.Vector3;
}

/** Faint reveal as the camera pulls back into the neighborhood — mirrors the
 *  starfield reveal so the deep sky fades in with the stars, never pops. */
function revealFactor(camDistPc: number): number {
  return Math.min(1, Math.max(0, (camDistPc - 0.05) / (2 - 0.05)));
}

export function buildDeepSkyLayer(objects: DeepSkyObject[]): DeepSkyLayerHandle {
  const group = new THREE.Group();
  group.name = 'deep-sky';
  group.visible = false;
  group.renderOrder = 90; // under the Local-Group galaxy sprites (100)

  const glintTextures = new Map<string, THREE.CanvasTexture>();
  const labelTextures: THREE.CanvasTexture[] = [];
  const materials: THREE.SpriteMaterial[] = [];
  const entries: Entry[] = [];
  const pickables: THREE.Object3D[] = [];
  const byId = new Map<string, Entry>();

  for (const obj of objects) {
    const color = categoryColor(obj.category);
    let tex = glintTextures.get(color);
    if (!tex) {
      tex = makeGlintTexture(color);
      glintTextures.set(color, tex);
    }
    const mat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });
    materials.push(mat);
    const glint = new THREE.Sprite(mat);
    const [x, y, z] = directionToPosition(obj.x, obj.y, obj.z, DEEP_SKY_RADIUS);
    glint.position.set(x, y, z);
    glint.userData.deepSkyId = obj.id;
    glint.renderOrder = 91;

    const { sprite: label, texture: labelTex, aspect } = makeLabelSprite(obj.name);
    labelTextures.push(labelTex);
    glint.add(label);

    const entry: Entry = {
      obj,
      glint,
      label,
      labelAspect: aspect,
      sizeFactor: angularSizeFactor(obj.size_arcmin),
      position: glint.position.clone(),
    };
    entries.push(entry);
    byId.set(obj.id, entry);
    pickables.push(glint);
    group.add(glint);
  }

  let highlightId: string | null = null;
  let focusId: string | null = null;
  let approach = 0;
  const _camPos = new THREE.Vector3();

  return {
    group,
    pickables,
    setVisible(on: boolean) {
      group.visible = on;
    },
    highlight(id: string | null) {
      highlightId = id;
    },
    setFocus(id: string | null) {
      focusId = id;
      if (!id) approach = 0;
    },
    setApproach(a: number) {
      approach = Math.min(1, Math.max(0, a));
    },
    objectPosition(id: string) {
      const e = byId.get(id);
      return e ? e.position.clone() : null;
    },
    objectById(id: string) {
      return byId.get(id)?.obj ?? null;
    },
    update(camDistPc: number, camera: THREE.Camera) {
      if (!group.visible) return;
      camera.getWorldPosition(_camPos);
      const reveal = revealFactor(camDistPc);
      for (const e of entries) {
        const hi = e.obj.id === highlightId;
        const focused = e.obj.id === focusId;
        const distToCam = Math.max(1, _camPos.distanceTo(e.position));
        const base = distToCam * GLINT_SIZE_K * e.sizeFactor;
        // Focused object blooms with the approach ramp; else a small hover pop.
        const bloom = focused ? deepSkyGlintBloom(approach) : hi ? 2.1 : 1;
        const scale = base * bloom;
        e.glint.scale.set(scale, scale, 1);
        (e.glint.material as THREE.SpriteMaterial).opacity = focused
          ? Math.min(1, reveal + approach)
          : reveal * (hi ? 0.98 : GLINT_BASE_OPACITY);
        // Label: hover/selection only, placed just above the glint.
        e.label.visible = hi;
        if (hi) {
          const lh = base * 0.9;
          e.label.scale.set(lh * e.labelAspect, lh, 1);
          e.label.position.set(0, scale * 0.65 + lh * 0.6, 0);
        }
      }
    },
    dispose() {
      for (const m of materials) m.dispose();
      for (const t of glintTextures.values()) t.dispose();
      for (const t of labelTextures) t.dispose();
      for (const e of entries) (e.label.material as THREE.SpriteMaterial).dispose();
    },
  };
}
