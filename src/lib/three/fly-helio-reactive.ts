import * as THREE from 'three';
import { SCALE_3D } from '$lib/fly-scene-constants';
import {
  buildSoIRing,
  soiRadiusInScene,
  buildGravityArrow,
  buildCoastLine,
} from '$lib/orbit-overlays';
import { BoldArrow } from '$lib/three/bold-arrow';
import { findApsidesIndices } from '$lib/orbital/find-apsides';
import { onLayerChange } from '$lib/science-layers';
import { earthPos, type Vec2 } from '$lib/orbital/mission-arc';

/**
 * `/fly` heliocentric REACTIVE overlay layer (RFC-036 WS-B — scene-host teardown).
 *
 * The mission-overlay meshes that carry live science-layer state + per-frame
 * updates: SoI rings, gravity/velocity/centripetal arrows, coast-preview line,
 * apsides markers, and the Moon mesh. Extracted verbatim from the `onMount` closure
 * in `src/routes/fly/+page.svelte`. Unlike the pure builders in fly-helio-overlays,
 * this owns the science-layer subscriptions (which fire SYNCHRONOUSLY on subscribe,
 * so ordering + live reads matter) and the three flags the per-frame loop shares
 * with the overlays:
 *   - `soiLayerOn`  — written by the SoI listener, read each frame for the
 *     destination-gated Mars/Moon SoI visibility split,
 *   - `cinemaForceMoons` — written by the frame loop (flyby cinema enter/exit),
 *     read by the moons listener,
 *   - `lastLayerMoonsOn` — written by the moons listener, read by the frame loop.
 * They live here as factory-internal state exposed on the handle via get/set, so the
 * listeners close over them and the page's frame loop reads/writes them through the
 * handle (shared by reference — no snapshot). Byte-identical to the inline code.
 */

/** The subset of the helio scene handle this layer drives (Hill/Lagrange/etc.). */
export interface HelioReactiveDeps {
  scene: THREE.Scene;
  setHillSpheresVisible: (v: boolean) => void;
  setLagrangePointsVisible: (v: boolean) => void;
  setMagnetospheresVisible: (v: boolean) => void;
  setMoonsVisible: (v: boolean) => void;
  /** Base path for the Moon texture URL. */
  base: string;
  /** Live reads (the overlays + listeners consult current reactive state). */
  getIsMoonMission: () => boolean;
  getActiveDestination: () => string;
  getSimDay: () => number;
  getOutPts: () => Vec2[];
}

/** The handle the page holds — the overlay meshes + the shared flags + cleanup. */
export interface HelioReactiveOverlays {
  earthSoI: THREE.Group;
  marsSoI: THREE.Group;
  moonSoI: THREE.Group;
  gravArrowEarth: BoldArrow;
  gravArrowSun: BoldArrow;
  velocityArrow: BoldArrow;
  centripetalArrow: BoldArrow;
  coastLine: THREE.Line;
  periMarker: THREE.Mesh;
  apoMarker: THREE.Mesh;
  moonMesh: THREE.Mesh;
  /** Recompute the apsides marker positions from the live outbound arc. */
  recomputeApsides: () => void;
  /** SoI layer on-state (set by the SoI listener, read each frame). */
  soiLayerOn: boolean;
  /** Flyby-cinema force-moons override (set by the frame loop, read by the listener). */
  cinemaForceMoons: boolean;
  /** Last moons-layer toggle state (set by the listener, read by the frame loop). */
  lastLayerMoonsOn: boolean;
  /** Unsubscribe every science-layer listener. */
  dispose: () => void;
}

/** Build the helio reactive overlay layer, add it to `scene`, and return the handle.
 *  Mirrors the inline construction + listener wiring 1:1. */
export function buildHelioReactiveOverlays(deps: HelioReactiveDeps): HelioReactiveOverlays {
  const { scene } = deps;

  // ─── SoI rings (Earth always; Mars/Moon destination-gated) ───────
  const SOI_VISUAL_BOOST = 8;
  const earthSoI = buildSoIRing(
    'earth',
    soiRadiusInScene('earth', SCALE_3D) * SOI_VISUAL_BOOST,
    0x6aa9ff,
  );
  const marsSoI = buildSoIRing(
    'mars',
    soiRadiusInScene('mars', SCALE_3D) * SOI_VISUAL_BOOST,
    0xff8866,
  );
  const moonSoI = buildSoIRing('moon', 3.0, 0xcfcfcf);
  scene.add(earthSoI);
  scene.add(marsSoI);
  scene.add(moonSoI);

  // ─── Gravity + velocity + centripetal arrows ─────────────────────
  const gravArrowEarth = buildGravityArrow('earth', 0x6aa9ff);
  const gravArrowSun = buildGravityArrow('sun', 0xffc850);
  gravArrowEarth.setLabel('EARTH g', '#a8caff');
  gravArrowSun.setLabel('SUN g', '#ffdf9a');
  scene.add(gravArrowEarth);
  scene.add(gravArrowSun);

  const velocityArrow = new BoldArrow(
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    8,
    0x4ecdc4,
    1.4,
    0.8,
  );
  const centripetalArrow = new BoldArrow(
    new THREE.Vector3(-1, 0, 0),
    new THREE.Vector3(0, 0, 0),
    8,
    0xff6b6b,
    1.4,
    0.8,
  );
  velocityArrow.setLabel('VELOCITY', '#bfeaff');
  centripetalArrow.setLabel('CENTRIPETAL', '#ffb3b3');
  velocityArrow.userData.layerKey = 'velocity';
  centripetalArrow.userData.layerKey = 'centripetal';
  velocityArrow.visible = false;
  centripetalArrow.visible = false;
  scene.add(velocityArrow);
  scene.add(centripetalArrow);

  // Shared flags (see the module docstring). Held as internal state; the listeners
  // close over them and the handle exposes them via get/set.
  let soiLayerOn = false;
  let cinemaForceMoons = false;
  let lastLayerMoonsOn = false;

  const stops: Array<(() => void) | undefined> = [];
  stops.push(
    onLayerChange('soi', (on) => {
      soiLayerOn = on;
      earthSoI.visible = on;
      marsSoI.visible = on && !deps.getIsMoonMission() && deps.getActiveDestination() === 'mars';
      moonSoI.visible = on && deps.getIsMoonMission();
    }),
  );
  stops.push(
    onLayerChange('gravity', (on) => {
      gravArrowEarth.visible = on;
      gravArrowSun.visible = on;
    }),
  );
  stops.push(onLayerChange('velocity', (on) => (velocityArrow.visible = on)));
  stops.push(onLayerChange('centripetal', (on) => (centripetalArrow.visible = on)));

  // ─── Coast preview line ──────────────────────────────────────────
  const coastLine = buildCoastLine(0xffc850);
  scene.add(coastLine);
  stops.push(onLayerChange('coast', (on) => (coastLine.visible = on)));

  // ─── Apsides markers ─────────────────────────────────────────────
  const periMarker = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    }),
  );
  const apoMarker = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0x6aa9ff,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    }),
  );
  periMarker.renderOrder = 999;
  apoMarker.renderOrder = 999;
  periMarker.userData.layerKey = 'apsides';
  apoMarker.userData.layerKey = 'apsides';
  periMarker.visible = false;
  apoMarker.visible = false;
  scene.add(periMarker);
  scene.add(apoMarker);

  function recomputeApsides(): void {
    const centreX = deps.getIsMoonMission() ? earthPos(deps.getSimDay()).x : 0;
    const centreZ = deps.getIsMoonMission() ? earthPos(deps.getSimDay()).z : 0;
    const outPts = deps.getOutPts();
    const apsides = findApsidesIndices(outPts, centreX, centreZ);
    if (!apsides) return;
    const peri = outPts[apsides.periIdx];
    const apo = outPts[apsides.apoIdx];
    periMarker.position.set(peri.x * SCALE_3D, 0, peri.z * SCALE_3D);
    apoMarker.position.set(apo.x * SCALE_3D, 0, apo.z * SCALE_3D);
  }
  recomputeApsides();
  stops.push(
    onLayerChange('apsides', (on) => {
      periMarker.visible = on;
      apoMarker.visible = on;
    }),
  );

  // Hill / Lagrange / magnetosphere / moons overlays delegate to the helio handle.
  stops.push(onLayerChange('hill-sphere', (on) => deps.setHillSpheresVisible(on)));
  stops.push(onLayerChange('lagrange-points', (on) => deps.setLagrangePointsVisible(on)));
  stops.push(onLayerChange('magnetosphere', (on) => deps.setMagnetospheresVisible(on)));
  stops.push(
    onLayerChange('moons', (on) => {
      lastLayerMoonsOn = on;
      if (!cinemaForceMoons) deps.setMoonsVisible(on);
    }),
  );

  // ─── Moon mesh (Moon-mission mode) ───────────────────────────────
  const moonTex = new THREE.TextureLoader().load(`${deps.base}/textures/2k_moon.jpg`);
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 32, 32),
    new THREE.MeshPhongMaterial({ map: moonTex, color: 0xffffff, shininess: 4 }),
  );
  moonMesh.visible = false;
  scene.add(moonMesh);

  return {
    earthSoI,
    marsSoI,
    moonSoI,
    gravArrowEarth,
    gravArrowSun,
    velocityArrow,
    centripetalArrow,
    coastLine,
    periMarker,
    apoMarker,
    moonMesh,
    recomputeApsides,
    get soiLayerOn() {
      return soiLayerOn;
    },
    set soiLayerOn(v: boolean) {
      soiLayerOn = v;
    },
    get cinemaForceMoons() {
      return cinemaForceMoons;
    },
    set cinemaForceMoons(v: boolean) {
      cinemaForceMoons = v;
    },
    get lastLayerMoonsOn() {
      return lastLayerMoonsOn;
    },
    set lastLayerMoonsOn(v: boolean) {
      lastLayerMoonsOn = v;
    },
    dispose() {
      for (const s of stops) s?.();
    },
  };
}
