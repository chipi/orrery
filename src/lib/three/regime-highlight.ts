/**
 * The orbit ruler's regime drawn in the scene (UXD-024): a band is a translucent annulus with two
 * edge lines, one altitude is one 2 px line, a Hill sphere is three great circles, a Lagrange
 * point is the UXD-020 pin ring on each of its residents. All in the highlight blue (RING_BLUE);
 * the regime colour stays on the ruler dot. Hover shows a regime at 0.9, the open panel's regime
 * pulses 0.55 to 0.9 (steady under prefers-reduced-motion). The plane is XZ: the equator on the
 * Worlds, the ecliptic on /explore. Shapes come from `orbit-regime-geometry.ts`.
 */
import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { RegimeShape } from '$lib/orbit-regime-geometry';
import { RING_BLUE, cameraFov, screenPxToWorld, viewDepth } from '$lib/universe/scene-pins';
import { applyRing } from '$lib/universe/scene-pins';
import { createRing, ringTexture } from '$lib/universe/scene-pin-sprites';

const SEGMENTS = 128;
const FILL_OPACITY = 0.14;
const HOVER_LEVEL = 0.9;
const PULSE_LOW = 0.55;
const PULSE_PERIOD_MS = 1600;

export interface RegimeHighlight {
  group: THREE.Group;
  /** The regime under the pointer or keyboard focus, and the regime whose panel is open. */
  set(hover: string | null, active: string | null): void;
  /** `ID:hover`, `ID:active` or '' — the e2e hook, published as `data-regime-highlight`. */
  state(): string;
  /** Per frame: pulse, line resolution, marker ring sizes. */
  update(camera: THREE.Camera, viewW: number, viewH: number, timeMs: number, still: boolean): void;
  dispose(): void;
}

export interface RegimeHighlightOpts {
  shapes: Record<string, RegimeShape>;
  /** World positions a `marker` regime rings (its residents); empty when none are drawn. */
  markerPoints?: (id: string) => THREE.Vector3[];
}

interface Entry {
  group: THREE.Group;
  lines: LineMaterial[];
  fill: THREE.MeshBasicMaterial | null;
  rings: THREE.Sprite[];
  shape: RegimeShape;
}

function circle(r: number, plane: 'xz' | 'xy' | 'yz'): Float32Array {
  const a = new Float32Array((SEGMENTS + 1) * 3);
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = (i / SEGMENTS) * Math.PI * 2;
    const c = Math.cos(t) * r;
    const s = Math.sin(t) * r;
    if (plane === 'xz') a.set([c, 0, s], i * 3);
    else if (plane === 'xy') a.set([c, s, 0], i * 3);
    else a.set([0, c, s], i * 3);
  }
  return a;
}

export function buildRegimeHighlight(opts: RegimeHighlightOpts): RegimeHighlight {
  const group = new THREE.Group();
  group.name = 'regime-highlight';
  group.visible = false;
  const entries = new Map<string, Entry>();
  const disposables: { dispose(): void }[] = [];
  let ringTex: THREE.CanvasTexture | null = null;
  let hover: string | null = null;
  let active: string | null = null;

  const addLine = (e: Entry, pts: Float32Array, width: number) => {
    const geo = new LineGeometry();
    geo.setPositions(pts);
    const mat = new LineMaterial({
      color: RING_BLUE,
      linewidth: width,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      dashed: !!e.shape.schematic,
      dashSize: Math.max(1, e.shape.outer * 0.012),
      gapSize: Math.max(1, e.shape.outer * 0.01),
    });
    const line = new Line2(geo, mat);
    if (e.shape.schematic) line.computeLineDistances();
    line.renderOrder = 8;
    line.frustumCulled = false;
    e.group.add(line);
    e.lines.push(mat);
    disposables.push(geo, mat);
  };

  for (const [id, shape] of Object.entries(opts.shapes)) {
    const e: Entry = { group: new THREE.Group(), lines: [], fill: null, rings: [], shape };
    e.group.visible = false;
    if (shape.kind === 'band') {
      const geo = new THREE.RingGeometry(shape.inner, shape.outer, SEGMENTS, 1);
      geo.rotateX(-Math.PI / 2);
      const fill = new THREE.MeshBasicMaterial({
        color: RING_BLUE,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, fill);
      mesh.renderOrder = 7;
      e.group.add(mesh);
      e.fill = fill;
      disposables.push(geo, fill);
      addLine(e, circle(shape.inner, 'xz'), 1.5);
      addLine(e, circle(shape.outer, 'xz'), 1.5);
    } else if (shape.kind === 'ring') {
      addLine(e, circle(shape.inner, 'xz'), 2);
    } else if (shape.kind === 'shell') {
      addLine(e, circle(shape.inner, 'xz'), 1.2);
      addLine(e, circle(shape.inner, 'xy'), 1.2);
      addLine(e, circle(shape.inner, 'yz'), 1.2);
    }
    entries.set(id, e);
    group.add(e.group);
  }

  const tmp = new THREE.Vector3();

  return {
    group,
    set(h, a) {
      hover = h;
      active = a;
    },
    state() {
      if (hover && entries.has(hover)) return `${hover}:hover`;
      if (active && entries.has(active)) return `${active}:active`;
      return '';
    },
    update(camera, viewW, viewH, timeMs, still) {
      const pulse = still ? 0.5 : 0.5 + 0.5 * Math.sin((timeMs / PULSE_PERIOD_MS) * Math.PI * 2);
      const activeLevel = PULSE_LOW + (HOVER_LEVEL - PULSE_LOW) * pulse;
      let any = false;
      for (const [id, e] of entries) {
        const isHover = id === hover;
        const isActive = id === active;
        const on = isHover || isActive;
        e.group.visible = on;
        if (!on) continue;
        any = true;
        const level = isHover ? HOVER_LEVEL : activeLevel;
        for (const m of e.lines) {
          m.opacity = level;
          m.resolution.set(viewW, viewH);
        }
        if (e.fill) e.fill.opacity = FILL_OPACITY * (level / HOVER_LEVEL);
        if (e.shape.kind === 'marker') {
          const pts = opts.markerPoints?.(id) ?? [];
          ringTex ??= ringTexture();
          while (e.rings.length < pts.length) {
            const ring = createRing(ringTex, false);
            e.rings.push(ring);
            e.group.add(ring);
          }
          camera.updateMatrixWorld();
          const fov = cameraFov(camera);
          e.rings.forEach((ring, i) => {
            const p = pts[i];
            ring.visible = !!p;
            if (!p) return;
            ring.position.copy(p);
            const wpp = screenPxToWorld(
              1,
              Math.max(0.01, viewDepth(camera, tmp.copy(p))),
              fov,
              viewH,
            );
            applyRing(ring, false, true, wpp);
            (ring.material as THREE.SpriteMaterial).opacity = level;
          });
        }
      }
      group.visible = any;
    },
    dispose() {
      for (const d of disposables) d.dispose();
      for (const e of entries.values()) {
        for (const r of e.rings) (r.material as THREE.SpriteMaterial).dispose();
      }
      ringTex?.dispose();
      group.removeFromParent();
    },
  };
}
