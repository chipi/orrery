// The Stellar Neighborhood context scene for /explore v2 (RFC-032 §1/§3).
//
// A self-contained THREE.Scene holding the real HYG star field (PointField) plus
// the Sun rendered as a single luminous sprite at the origin. This is context-1:
// units are parsecs (1 pc = 1 world unit). The caller drives `update(camDistPc)`
// to play the boundary reveal — the field fades in and the Sun shrinks to a dot
// as the camera pulls back — and renders this scene with the shared camera when
// the ContextGraph's active context is 'neighborhood'.
//
// Coverage-excluded (WebGL, like point-field.ts / explore-scene.ts). Its pure
// inputs (star selection, budget, context math) are tested separately.

import * as THREE from 'three';
import { selectVisibleStars, type ShellData } from './star-selection';
import { createPointField, type PointFieldHandle } from './point-field';
import { tierToStarBudget } from './budget';
import type { QualityTier } from '$lib/quality/quality-tier';

export interface NeighborhoodScene {
  scene: THREE.Scene;
  starCount: number;
  /** Reveal state from camera distance to origin (parsecs). */
  update(camDistPc: number): void;
  dispose(): void;
}

export interface NeighborhoodOptions {
  shells: ShellData[];
  tier?: QualityTier;
  pixelRatio?: number;
}

/** Fetch the tiled HYG shells from static/data/universe/stars/ via the app base. */
export async function loadNeighborhoodShells(
  fetchFn: typeof fetch,
  base = '',
): Promise<ShellData[]> {
  const index = (await (await fetchFn(`${base}/data/universe/stars/index.json`)).json()) as {
    shells: { file: string }[];
  };
  return Promise.all(
    index.shells.map(async (s) => {
      const doc = (await (await fetchFn(`${base}/data/universe/stars/${s.file}`)).json()) as {
        stars: number[][];
      };
      return { stars: doc.stars } satisfies ShellData;
    }),
  );
}

function makeSunSprite(): THREE.Sprite {
  const size = 128;
  const cvs = document.createElement('canvas');
  cvs.width = cvs.height = size;
  const ctx = cvs.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,246,1)');
  g.addColorStop(0.25, 'rgba(255,245,216,0.95)');
  g.addColorStop(0.5, 'rgba(255,226,164,0.34)');
  g.addColorStop(1, 'rgba(255,222,150,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(cvs);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Sprite(mat);
}

/** Field reveal opacity for a given camera distance (pc). Faint at the boundary,
 *  full by ~0.5 pc as the camera pulls back into the neighborhood. */
function revealOpacity(camDistPc: number): number {
  return Math.min(1, Math.max(0, (camDistPc - 0.04) / (0.5 - 0.04)));
}

export function createNeighborhoodScene(opts: NeighborhoodOptions): NeighborhoodScene {
  const { shells, tier = 'high', pixelRatio = 1 } = opts;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x05070f);

  const sun = makeSunSprite();
  sun.scale.setScalar(0.02); // world units (pc) — collapses to a dot as camera recedes
  scene.add(sun);

  const data = selectVisibleStars(shells, tierToStarBudget(tier));
  const field: PointFieldHandle = createPointField(data, { sceneScale: 1, pixelRatio });
  field.setOpacity(0);
  scene.add(field.object);

  return {
    scene,
    starCount: data.count,
    update(camDistPc: number) {
      field.setOpacity(revealOpacity(camDistPc));
    },
    dispose() {
      field.dispose();
      sun.material.map?.dispose();
      sun.material.dispose();
    },
  };
}
