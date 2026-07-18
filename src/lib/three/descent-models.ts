import * as THREE from 'three';
import type { DescentBody } from '../orbital/descent-physics';
import { buildMoonLanderModel } from '../moon-lander-models';
import { buildMarsLanderModel } from '../mars-lander-models';

/**
 * Per-mission procedural EDL-stack models for /fly's descent act (RFC-034 §9) —
 * the inverse of launcher-models.ts. Each builder composes Three.js primitives
 * into the recognisable descent hardware (heat-shield aeroshell, parachute,
 * skycrane / retro stage / airbags) wrapped around the mission's real landed
 * lander, so the descent shows the actual EDL choreography instead of a generic
 * body.
 *
 * Every builder returns the SAME part structure (`DescentModel`) so the scene's
 * separation choreography (heat-shield jettison, chute deploy + cut, backshell
 * sep, skycrane lower, airbag bounce, retro plume) drives any vehicle uniformly.
 * The terminal `lander` part is the existing landed model (buildMoon/MarsLander
 * / Venera), so a descent and its /moon /mars surface view show the same craft.
 * All geometry is authored around a unit stack and scaled to `vehLen`.
 */

export interface DescentModel {
  /** Whole stack, added to the scene's vehicle group. */
  root: THREE.Group;
  /** Forward sphere-cone heat-shield — jettisoned after peak heating. */
  heatshield: THREE.Mesh;
  /** Aft backshell (+ parachute mortar) — jettisoned at the terminal handoff. */
  backshell: THREE.Group;
  /** Parachute canopy + risers — deployed then cut. */
  parachute: THREE.Group;
  /** Retro / skycrane / airbag descent apparatus. */
  descentStage: THREE.Group;
  /** Retro-rocket nozzles; the plume anchors here while braking. */
  retro: THREE.Group;
  /** Skycrane tether lines (empty group for non-skycrane vehicles). */
  skycraneRigging: THREE.Group;
  /** Airbag envelope (empty group for non-airbag vehicles). */
  airbags: THREE.Group;
  /** The terminal landed craft (reused surface model). */
  lander: THREE.Group;
  /** The object the retro plume attaches to while braking. */
  retroPlumeAnchor: THREE.Object3D;
  /** Base Y positions (scene units) before the scene applies sep offsets. */
  heatshieldBaseY: number;
  backshellBaseY: number;
  parachuteBaseY: number;
  landerMountY: number;
}

interface Palette {
  shield: THREE.MeshStandardMaterial;
  shell: THREE.MeshStandardMaterial;
  chute: THREE.MeshStandardMaterial;
  chuteBand: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  eng: THREE.MeshStandardMaterial;
  bag: THREE.MeshStandardMaterial;
}

function palette(): Palette {
  return {
    // Ablator — charred bronze/umber.
    shield: new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 0.85, metalness: 0.1 }),
    shell: new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: 0.6, metalness: 0.15 }),
    chute: new THREE.MeshStandardMaterial({
      color: 0xf3f0ea,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
    chuteBand: new THREE.MeshStandardMaterial({
      color: 0xd94a3d,
      roughness: 0.9,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
    metal: new THREE.MeshStandardMaterial({ color: 0xb9bfc7, roughness: 0.45, metalness: 0.6 }),
    eng: new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.75 }),
    bag: new THREE.MeshStandardMaterial({ color: 0xe8e8ea, roughness: 0.7, metalness: 0.05 }),
  };
}

/** A 70°-half-angle sphere-cone heat-shield, apex pointing DOWN (into the flow). */
function sphereConeHeatshield(radius: number, mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.ConeGeometry(radius, radius * 0.55, 32, 1, false);
  const m = new THREE.Mesh(geo, mat);
  m.rotation.x = Math.PI; // apex down
  return m;
}

/** A parachute: a hemispherical canopy with an alternating disk-gap-band look. */
function parachuteCanopy(radius: number, p: Palette, mountY: number): THREE.Group {
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    p.chute,
  );
  g.add(canopy);
  // Two red bands so the chute reads as a Mars disk-gap-band chute.
  for (const [t0, t1] of [
    [0.62, 0.74],
    [0.86, 0.98],
  ] as const) {
    const band = new THREE.Mesh(
      new THREE.SphereGeometry(
        radius * 1.002,
        24,
        6,
        0,
        Math.PI * 2,
        (Math.PI / 2) * t0,
        (Math.PI / 2) * (t1 - t0),
      ),
      p.chuteBand,
    );
    g.add(band);
  }
  // Risers converging to the mount below.
  const riserMat = new THREE.LineBasicMaterial({ color: 0xcfd3d8 });
  const riser = new THREE.BufferGeometry();
  const pts: number[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    pts.push(Math.cos(a) * radius * 0.9, 0, Math.sin(a) * radius * 0.9, 0, mountY, 0);
  }
  riser.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.add(new THREE.LineSegments(riser, riserMat));
  return g;
}

/** A ring of `n` downward-firing retro nozzles at radius `r`. */
function retroNozzles(n: number, r: number, len: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const geo = new THREE.ConeGeometry(len * 0.5, len, 12, 1, true);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const m = new THREE.Mesh(geo, mat);
    m.position.set(Math.cos(a) * r, -len * 0.5, Math.sin(a) * r);
    m.rotation.x = Math.PI;
    g.add(m);
  }
  return g;
}

/**
 * The Venera/Vega descent lander — the spherical titanium descent module that
 * actually reaches the Venus surface (a distinctive ball on a toroidal landing
 * ring with the ring-shaped aerobrake on top). NOT the solar-panelled cruise
 * bus (that stayed in orbit) — a descent shows only what descends.
 */
function buildVenusDescentLander(): THREE.Group {
  const g = new THREE.Group();
  const foil = new THREE.MeshStandardMaterial({ color: 0xc9a45a, roughness: 0.5, metalness: 0.6 });
  const ring = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.5, metalness: 0.55 });
  // Pressure sphere — the dominant feature.
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 14), foil);
  sphere.position.y = 0.14;
  g.add(sphere);
  // Toroidal landing ring (crush-ring) at the base.
  const landRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.05, 10, 24), ring);
  landRing.rotation.x = Math.PI / 2;
  landRing.position.y = -0.08;
  g.add(landRing);
  // Ring-shaped aerobrake disk on top (the terminal Venera drag brake).
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24), ring);
  brake.position.y = 0.4;
  g.add(brake);
  return g;
}

/** Resolve the terminal landed craft for a mission (the reused surface model). */
function resolveLander(siteId: string, body: DescentBody): THREE.Group {
  if (body === 'moon') return buildMoonLanderModel(siteId, 'lander', '#c9ccd2');
  if (body === 'venus') return buildVenusDescentLander();
  return buildMarsLanderModel(siteId, 'lander', undefined, '#d0a884');
}

/** Common empty-parts scaffold so every builder returns a full DescentModel. */
function scaffold(lander: THREE.Group): DescentModel {
  const root = new THREE.Group();
  const heatshield = new THREE.Mesh();
  const backshell = new THREE.Group();
  const parachute = new THREE.Group();
  const descentStage = new THREE.Group();
  const retro = new THREE.Group();
  const skycraneRigging = new THREE.Group();
  const airbags = new THREE.Group();
  const retroPlumeAnchor = new THREE.Object3D();
  return {
    root,
    heatshield,
    backshell,
    parachute,
    descentStage,
    retro,
    skycraneRigging,
    airbags,
    lander,
    retroPlumeAnchor,
    heatshieldBaseY: 0,
    backshellBaseY: 0,
    parachuteBaseY: 0,
    landerMountY: 0,
  };
}

// ─── Archetype stack builders ───────────────────────────────────────

/** Lunar / vacuum powered descent — no aeroshell or chute, just the lander on
 *  its descent-stage bell with the retro plume beneath (Apollo LM, Chang'e…). */
function buildLunarStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  m.landerMountY = 0;
  lander.position.y = 0;
  m.root.add(lander);

  // A downward retro bell + plume anchor beneath the descent stage.
  m.retro = retroNozzles(1, 0, vehLen * 0.14, p.eng);
  m.retro.position.y = -vehLen * 0.04;
  m.root.add(m.retro);
  m.retroPlumeAnchor.position.y = -vehLen * 0.14;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

/** Build the aeroshell (heat-shield + backshell) enclosing a lander, shared by
 *  all atmospheric-entry archetypes. */
function addAeroshell(m: DescentModel, p: Palette, vehLen: number): void {
  const r = vehLen * 0.42;
  m.heatshield = sphereConeHeatshield(r, p.shield);
  m.heatshieldBaseY = -vehLen * 0.24;
  m.heatshield.position.y = m.heatshieldBaseY;
  m.root.add(m.heatshield);

  m.backshell = new THREE.Group();
  const cover = new THREE.Mesh(
    new THREE.SphereGeometry(r * 0.98, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
    p.shell,
  );
  cover.position.y = vehLen * 0.04;
  m.backshell.add(cover);
  m.backshellBaseY = 0;
  m.root.add(m.backshell);
}

/** Mars parachute + retro (Viking / Phoenix / InSight / Mars-3). */
function buildMarsRetroStack(lander: THREE.Group, vehLen: number, legs = 3): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  addAeroshell(m, p, vehLen);

  m.parachuteBaseY = vehLen * 0.9;
  m.parachute = parachuteCanopy(vehLen * 0.6, p, -vehLen * 0.86);
  m.parachute.position.y = m.parachuteBaseY;
  m.root.add(m.parachute);

  lander.position.y = -vehLen * 0.02;
  m.root.add(lander);
  m.retro = retroNozzles(legs, vehLen * 0.12, vehLen * 0.1, p.eng);
  m.retro.position.y = -vehLen * 0.08;
  m.root.add(m.retro);
  m.retroPlumeAnchor.position.y = -vehLen * 0.16;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

/** Mars airbag (Pathfinder / Spirit / Opportunity) — tetrahedral airbag cluster. */
function buildAirbagStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  addAeroshell(m, p, vehLen);

  m.parachuteBaseY = vehLen * 0.9;
  m.parachute = parachuteCanopy(vehLen * 0.55, p, -vehLen * 0.86);
  m.parachute.position.y = m.parachuteBaseY;
  m.root.add(m.parachute);

  lander.position.y = 0;
  m.root.add(lander);

  // A cluster of lobed airbag spheres bundled around the lander (hidden until deploy).
  const bagGeo = new THREE.SphereGeometry(vehLen * 0.2, 14, 10);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const bag = new THREE.Mesh(bagGeo, p.bag);
    bag.position.set(
      Math.cos(a) * vehLen * 0.16,
      -vehLen * 0.05 + (i % 2) * vehLen * 0.12,
      Math.sin(a) * vehLen * 0.16,
    );
    m.airbags.add(bag);
  }
  m.airbags.visible = false;
  m.root.add(m.airbags);
  m.retroPlumeAnchor.position.y = -vehLen * 0.1;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

/** Mars skycrane (Curiosity / Perseverance) — descent stage lowers the rover on tethers. */
function buildSkycraneStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  addAeroshell(m, p, vehLen);

  m.parachuteBaseY = vehLen * 0.95;
  m.parachute = parachuteCanopy(vehLen * 0.62, p, -vehLen * 0.9);
  m.parachute.position.y = m.parachuteBaseY;
  m.root.add(m.parachute);

  // Skycrane descent stage: a platform with 8 throttleable nozzles.
  m.descentStage = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(vehLen * 0.34, vehLen * 0.09, vehLen * 0.34),
    p.metal,
  );
  m.descentStage.add(deck);
  m.retro = retroNozzles(8, vehLen * 0.15, vehLen * 0.08, p.eng);
  m.retro.position.y = -vehLen * 0.05;
  m.descentStage.add(m.retro);
  m.descentStage.position.y = vehLen * 0.05;
  m.root.add(m.descentStage);

  // Rover slung below the deck on four tethers (extended by the scene at lower).
  m.landerMountY = -vehLen * 0.28;
  lander.position.y = m.landerMountY;
  m.root.add(lander);
  const tetherMat = new THREE.LineBasicMaterial({ color: 0xb7bcc4 });
  const tg = new THREE.BufferGeometry();
  const tp: number[] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    tp.push(
      Math.cos(a) * vehLen * 0.12,
      0,
      Math.sin(a) * vehLen * 0.12,
      Math.cos(a) * vehLen * 0.08,
      m.landerMountY,
      Math.sin(a) * vehLen * 0.08,
    );
  }
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  m.skycraneRigging.add(new THREE.LineSegments(tg, tetherMat));
  m.root.add(m.skycraneRigging);

  m.retroPlumeAnchor.position.y = -vehLen * 0.1;
  m.descentStage.add(m.retroPlumeAnchor);
  return m;
}

/** Venus sphere-cone aeroshell (Venera / Vega) — dense-atmosphere entry capsule.
 *  Fleshed out in D9; this base gives the named parts the scene needs. */
function buildVenusStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  addAeroshell(m, p, vehLen);

  // Small drogue high-altitude chute (cut early on Venus).
  m.parachuteBaseY = vehLen * 0.8;
  m.parachute = parachuteCanopy(vehLen * 0.4, p, -vehLen * 0.76);
  m.parachute.position.y = m.parachuteBaseY;
  m.root.add(m.parachute);

  lander.position.y = 0;
  m.root.add(lander);

  // A ring-shaped drag disk that brakes the lander in the dense lower atmosphere.
  const disk = new THREE.Mesh(
    new THREE.TorusGeometry(vehLen * 0.42, vehLen * 0.05, 10, 28),
    p.metal,
  );
  disk.rotation.x = Math.PI / 2;
  disk.position.y = vehLen * 0.28;
  m.descentStage.add(disk);
  m.root.add(m.descentStage);
  m.retroPlumeAnchor.position.y = -vehLen * 0.1;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

// ─── Dispatch ───────────────────────────────────────────────────────

type StackBuilder = (lander: THREE.Group, vehLen: number) => DescentModel;

/** siteId → dedicated stack builder. Falls back per-body when absent. */
const BUILDERS: Record<string, StackBuilder> = {
  // Skycrane
  curiosity: buildSkycraneStack,
  perseverance: buildSkycraneStack,
  // Airbag
  'mars-pathfinder': buildAirbagStack,
  spirit: buildAirbagStack,
  opportunity: buildAirbagStack,
  // Mars retro
  'viking1-lander': (l, v) => buildMarsRetroStack(l, v, 3),
  phoenix: (l, v) => buildMarsRetroStack(l, v, 12),
  insight: (l, v) => buildMarsRetroStack(l, v, 12),
  mars3: (l, v) => buildMarsRetroStack(l, v, 4),
  zhurong: (l, v) => buildMarsRetroStack(l, v, 4),
  schiaparelli: (l, v) => buildMarsRetroStack(l, v, 3),
};

/** Per-body generic stack for missions without a dedicated builder. */
function genericFor(body: DescentBody): StackBuilder {
  if (body === 'moon') return buildLunarStack;
  if (body === 'venus') return buildVenusStack;
  return (l, v) => buildMarsRetroStack(l, v, 3);
}

/**
 * Build the full EDL descent stack for a mission. `siteId` selects the terminal
 * lander model + any dedicated stack builder; `body` picks the generic fallback.
 * `vehLen` scales the whole stack (scene units).
 */
export function buildDescentModel(siteId: string, body: DescentBody, vehLen = 1): DescentModel {
  const lander = resolveLander(siteId, body);
  const build = BUILDERS[siteId] ?? genericFor(body);
  const model = build(lander, vehLen);
  return model;
}

/** Exposed for tests: site ids with a dedicated descent-stack builder. */
export const KNOWN_DESCENT_STACK_IDS = Object.keys(BUILDERS);
