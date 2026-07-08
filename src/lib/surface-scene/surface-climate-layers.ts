/**
 * Climate-bands layer (#386 diagram E) — "Sun is life".
 *
 * Latitude climate zones on the surface globe, from sun angle:
 * tropical (|lat| < 23.5°) → temperate → polar (|lat| > 66.5°).
 *   - Earth: vivid, living bands.
 *   - Mars:  same geometry, a cold/frozen palette — the air can't hold heat.
 *   - Moon:  no bands. No atmosphere to move heat, so there is no climate,
 *            only day-side scorch and night-side freeze. The absence is
 *            the lesson (the insolation readout carries that story).
 *
 * Attaches to planetMesh (rotates with the surface). Gated on the
 * `climate` science-lens layer. Mirrors the gate() pattern in the other
 * surface-scene lens builders.
 */
import * as THREE from 'three';
import { onLayerChange, type LayerKey } from '$lib/science-layers';

const DEG = Math.PI / 180;

export interface ClimateHandle {
  object: THREE.Object3D;
  dispose: () => void;
}

function gate(
  object: THREE.Object3D,
  key: LayerKey,
  disposables: Array<{ dispose: () => void }>,
): ClimateHandle {
  object.userData.layerKey = key;
  object.visible = false;
  const stop = onLayerChange(key, (on) => {
    object.visible = on;
  });
  return {
    object,
    dispose: () => {
      stop?.();
      for (const d of disposables) d.dispose();
    },
  };
}

interface ZonePalette {
  tropical: number;
  temperate: number;
  polar: number;
}

// null = no climate (airless body). Mars uses a colder palette than Earth
// to read as "same zones, but frozen".
const CLIMATE: Record<string, ZonePalette | null> = {
  earth: { tropical: 0x2e8b57, temperate: 0x4a90a4, polar: 0xdfeeff },
  mars: { tropical: 0xb0673c, temperate: 0x8390a6, polar: 0xe6eefb },
  moon: null,
};

export function buildClimateBands(opts: { planetRadius: number; bodyKey: string }): ClimateHandle {
  const R = opts.planetRadius * 1.004;
  const pal = CLIMATE[opts.bodyKey] ?? null;
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  if (pal) {
    // [thetaStart°, thetaLength°, colour] — theta measured from +Y (N pole).
    // Boundaries at the real Arctic (66.5°) + Tropic (23.5°) circles.
    const zones: Array<[number, number, number]> = [
      [0, 23.5, pal.polar],
      [23.5, 43, pal.temperate],
      [66.5, 47, pal.tropical],
      [113.5, 43, pal.temperate],
      [156.5, 23.5, pal.polar],
    ];
    for (const [ts, tl, color] of zones) {
      const geo = new THREE.SphereGeometry(R, 48, 24, 0, Math.PI * 2, ts * DEG, tl * DEG);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.24,
        side: THREE.FrontSide,
        depthWrite: false,
      });
      disposables.push(geo, mat);
      group.add(new THREE.Mesh(geo, mat));
    }
    // Thin boundary rings at the tropic + polar circles for definition.
    const lineMat = new THREE.LineBasicMaterial({
      color: pal.polar,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    disposables.push(lineMat);
    for (const latDeg of [66.5, 23.5, -23.5, -66.5]) {
      const lat = latDeg * DEG;
      const r = R * 1.002 * Math.cos(lat);
      const y = R * 1.002 * Math.sin(lat);
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      disposables.push(g);
      group.add(new THREE.LineLoop(g, lineMat));
    }
  }

  return gate(group, 'climate', disposables);
}
