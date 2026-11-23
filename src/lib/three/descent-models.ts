import * as THREE from 'three';
import { buildMslDescentStage } from './showcase/msl-edl';
import type { DescentBody } from '$lib/physics/descent/descent-physics';
import { buildMoonLanderModel } from '../moon-lander-models';
import { buildMarsLanderModel } from '../mars-lander-models';
import { buildCapsuleById } from './capsule-models';
import { getEarthOrbitCoast } from '../orbital/earth-orbit-registry';
import { buildLanderCruiseCraft } from './lander-cruise-models';
import { buildInterplanetarySpacecraft } from './interplanetary-spacecraft-models';
import {
  detailedDescentLander,
  detailedProbe,
  detailedReturnCapsule,
  dockedApolloCsm,
} from './descent-landers';

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
  /** Orbiting mothership that UNDOCKS before the descent (Apollo CSM). Empty
   *  group for missions with no separate orbiter. */
  orbiter: THREE.Group;
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

/**
 * A 70° sphere-cone heat-shield (the real Mars/entry aeroshell forebody): a
 * SHALLOW blunt cone with a spherically-rounded nose, not a steep point. Built
 * nose-up (rim at y=0, tip at +y) so the scene's rotation.x=π puts the blunt
 * nose forward. Concentric ablator tile rings + a bright structural rim give it
 * real surface detail instead of reading as a smooth balloon.
 */
function sphereConeHeatshield(
  radius: number,
  mat: THREE.Material,
  rimMat: THREE.Material,
): THREE.Mesh {
  const depth = radius * 0.4; // shallow — 70° sphere-cone, not a tall cone
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(radius, 0), // rim (max diameter, the joint)
    new THREE.Vector2(radius * 0.9, depth * 0.28),
    new THREE.Vector2(radius * 0.7, depth * 0.54),
    new THREE.Vector2(radius * 0.44, depth * 0.78),
    new THREE.Vector2(radius * 0.2, depth * 0.94),
    new THREE.Vector2(0, depth), // rounded nose
  ];
  const m = new THREE.Mesh(new THREE.LatheGeometry(prof, 44), mat);
  // Concentric ablator tile grooves.
  const groove = new THREE.MeshStandardMaterial({
    color: 0x3a2817,
    roughness: 0.9,
    metalness: 0.08,
  });
  for (const f of [0.32, 0.56, 0.78]) {
    const yr = depth * (1 - f) * 0.72;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * f, radius * 0.01, 6, 44), groove);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yr;
    m.add(ring);
  }
  // Bright structural rim at the max-diameter joint.
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, radius * 0.03, 8, 48), rimMat);
  rim.rotation.x = Math.PI / 2;
  m.add(rim);
  return m;
}

/** A striped canopy dome (no lines) — a shallow, wider-than-tall spherical cap,
 *  like a real ringsail/ribbon canopy at full inflation, not a balloon. */
function canopyDome(radius: number, p: Palette): THREE.Group {
  const g = new THREE.Group();
  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    p.chute,
  );
  g.add(canopy);
  // Two contrasting bands so the canopy reads as a striped recovery chute.
  for (const [t0, t1] of [
    [0.5, 0.62],
    [0.76, 0.88],
  ] as const) {
    const band = new THREE.Mesh(
      new THREE.SphereGeometry(
        radius * 1.004,
        32,
        8,
        0,
        Math.PI * 2,
        (Math.PI / 2) * t0,
        (Math.PI / 2) * (t1 - t0),
      ),
      p.chuteBand,
    );
    g.add(band);
  }
  g.scale.y = 0.62; // flatten the hemisphere into a shallow dome
  return g;
}

/** Thin suspension lines fanning from a canopy rim (centred on `apex`, rim
 *  radius `rimR`) down to a shared confluence knot. Long + fine, like the real
 *  thing — never a fat short cone. */
function suspensionLines(
  rimR: number,
  apex: THREE.Vector3,
  confluence: THREE.Vector3,
  count = 22,
): THREE.LineSegments {
  const mat = new THREE.LineBasicMaterial({ color: 0xd9dde2, transparent: true, opacity: 0.5 });
  const pts: number[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    pts.push(
      apex.x + Math.cos(a) * rimR,
      apex.y,
      apex.z + Math.sin(a) * rimR,
      confluence.x,
      confluence.y,
      confluence.z,
    );
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  return new THREE.LineSegments(geo, mat);
}

/** A single centred parachute (canopy + fine lines to a knot at `mountY`) —
 *  used by the planetary aeroshell stacks (Mars / Venus / Titan / Jupiter). */
/**
 * A disk-gap-band parachute at its real size against the aeroshell (operator 2026-11-23: the
 * chute was "too tiny, too close"). Origin at the riser attachment on the backshell; the disk,
 * the open gap and the band rise above it on `lines` suspension lines. Sizes in metres, drawn
 * at `k` scene units per metre. Gores alternate white and orange in fours, as on the MSL test
 * canopies (NASA PIA11993).
 */
function dgbParachute(
  k: number,
  o: { diameterM: number; totalM: number; lines: number },
): THREE.Group {
  const g = new THREE.Group();
  const R = o.diameterM / 2;
  const bandH = o.diameterM * 0.121; // DGB band ≈ 12 % of the nominal diameter
  const gapH = o.diameterM * 0.042;
  const capRs = R * 1.12; // the inflated disk: a spherical cap
  const capTheta = Math.asin(R / capRs);
  const diskH = capRs * (1 - Math.cos(capTheta));
  const bandBot = o.totalM - diskH - gapH - bandH;
  const white = new THREE.Color(0xf2efe8);
  const orange = new THREE.Color(0xd2642a);
  const goreColour = (x: number, z: number): THREE.Color => {
    const a = (Math.atan2(z, x) + Math.PI * 2) % (Math.PI * 2);
    const gore = Math.floor((a / (Math.PI * 2)) * o.lines);
    return Math.floor(gore / 4) % 2 === 0 ? white : orange;
  };
  const paint = (geo: THREE.BufferGeometry): THREE.BufferGeometry => {
    const flat = geo.toNonIndexed();
    const p = flat.attributes.position;
    const c = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i += 3) {
      const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;
      const z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3;
      const col = goreColour(x, z);
      for (let j = 0; j < 3; j++) col.toArray(c, (i + j) * 3);
    }
    flat.setAttribute('color', new THREE.BufferAttribute(c, 3));
    flat.computeVertexNormals();
    return flat;
  };
  const cloth = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  const disk = new THREE.Mesh(
    paint(new THREE.SphereGeometry(capRs, o.lines, 10, 0, Math.PI * 2, 0, capTheta)),
    cloth,
  );
  disk.position.y = o.totalM - capRs;
  g.add(disk);
  const band = new THREE.Mesh(
    paint(new THREE.CylinderGeometry(R * 0.97, R * 0.9, bandH, o.lines, 2, true)),
    cloth,
  );
  band.position.y = bandBot + bandH / 2;
  g.add(band);
  // Suspension lines from the band's skirt to the riser, then the riser to the backshell.
  const riserTop = new THREE.Vector3(0, o.totalM * 0.06, 0);
  g.add(suspensionLines(R * 0.9, new THREE.Vector3(0, bandBot, 0), riserTop, o.lines));
  const riser = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), riserTop]);
  g.add(new THREE.Line(riser, new THREE.LineBasicMaterial({ color: 0xd9dde2 })));
  g.scale.setScalar(k);
  const out = new THREE.Group();
  out.add(g);
  return out;
}

function parachuteCanopy(radius: number, p: Palette, mountY: number): THREE.Group {
  const g = new THREE.Group();
  g.add(canopyDome(radius, p));
  g.add(
    suspensionLines(radius * 0.9, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, mountY, 0), 18),
  );
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
/**
 * Hayabusa / OSIRIS-REx asteroid-sampler bus — flat rectangular bus with two
 * thin solar-panel wings, a downward sample horn, and a small high-gain dish.
 * Airless touch-and-go; no aeroshell, no legs.
 */
function buildAsteroidSamplerBus(): THREE.Group {
  const g = new THREE.Group();
  const foil = new THREE.MeshStandardMaterial({ color: 0xc9a45a, roughness: 0.5, metalness: 0.65 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x2a3655, roughness: 0.6, metalness: 0.3 });
  const metal = new THREE.MeshStandardMaterial({
    color: 0xb9bfc7,
    roughness: 0.45,
    metalness: 0.6,
  });
  // Main bus body.
  const bus = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.3), foil);
  g.add(bus);
  // Solar wings extending +/-X.
  for (const sign of [-1, 1] as const) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.28), panel);
    wing.position.set(sign * 0.45, 0, 0);
    g.add(wing);
  }
  // Sample horn pointing -Y.
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.25, 12), metal);
  horn.position.set(0, -0.195, 0);
  g.add(horn);
  // High-gain dish on top.
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    metal,
  );
  dish.rotation.x = Math.PI;
  dish.position.set(0, 0.09, 0);
  g.add(dish);
  return g;
}

/**
 * Galileo probe descent module — a squat instrument pressure vessel with a
 * small ring vent band. Probe-only; never touches a surface.
 */
function buildJupiterDescentModule(): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bfc7, roughness: 0.3, metalness: 0.7 });
  const vent = new THREE.MeshStandardMaterial({ color: 0x8a9098, roughness: 0.5, metalness: 0.55 });
  // Instrument pressure can.
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.16, 24), metal);
  g.add(can);
  // Ring vent band.
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 8, 24), vent);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.04;
  g.add(band);
  return g;
}

/**
 * Huygens probe — a shallow lens/disk probe (Titan atmosphere; no landing).
 * Gold-foil finish; no legs.
 */
function buildHuygensProbe(): THREE.Group {
  const g = new THREE.Group();
  const foil = new THREE.MeshStandardMaterial({ color: 0xd4a84b, roughness: 0.5, metalness: 0.6 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bfc7, roughness: 0.4, metalness: 0.6 });
  // Disk body — flattened sphere.
  const disk = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 14), foil);
  disk.scale.y = 0.36; // flatten to ~0.1 h
  g.add(disk);
  // Small instrument ring on top.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 20), metal);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.12;
  g.add(ring);
  return g;
}

/**
 * Philae lander on comet 67P — boxy body, hex solar-panel lid, three splayed
 * legs, and a downward harpoon anchor stub.
 */
function buildPhilaeLander(): THREE.Group {
  const g = new THREE.Group();
  const foil = new THREE.MeshStandardMaterial({
    color: 0xc9a45a,
    roughness: 0.55,
    metalness: 0.55,
  });
  const grey = new THREE.MeshStandardMaterial({ color: 0x9aa0a8, roughness: 0.5, metalness: 0.45 });
  const panel = new THREE.MeshStandardMaterial({ color: 0x2a3655, roughness: 0.6, metalness: 0.3 });
  // Main box body.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.24), foil);
  g.add(body);
  // Hex solar panel lid on top (approximated as a thin cylinder).
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 6), panel);
  lid.position.y = 0.11;
  g.add(lid);
  // Three splayed landing legs.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 8), grey);
    leg.position.set(Math.cos(a) * 0.14, -0.16, Math.sin(a) * 0.14);
    leg.rotation.z = (Math.PI / 2) * 0.5 * Math.sign(Math.cos(a) || 1);
    leg.rotation.x = (Math.PI / 2) * 0.5 * Math.sign(Math.sin(a) || 1);
    g.add(leg);
  }
  // Harpoon/anchor stub pointing -Y.
  const harpoon = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.14, 8), grey);
  harpoon.position.y = -0.17;
  g.add(harpoon);
  return g;
}

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

// Earth re-entries with no LEO coast entry (lunar returns) name their capsule here.
const LUNAR_RETURN_CAPSULE: Record<string, string> = { apollo8: 'apollo-cm' };

/** Resolve the terminal landed craft for a mission (the reused surface model). */
function resolveLander(siteId: string, body: DescentBody): THREE.Group {
  if (body === 'moon') {
    const tier0 = buildMoonLanderModel(siteId, 'lander', '#c9ccd2');
    return detailedDescentLander(siteId, tier0) ?? tier0;
  }
  const probe = (old: THREE.Group): THREE.Group => detailedProbe(body, siteId, old) ?? old;
  if (body === 'venus') return probe(buildVenusDescentLander());
  if (body === 'itokawa' || body === 'ryugu' || body === 'bennu' || body === 'eros') {
    // The mission's own craft (Hayabusa, Hayabusa2, NEAR, OSIRIS-REx), at the generic sampler's size.
    const generic = buildAsteroidSamplerBus();
    const own = buildLanderCruiseCraft(siteId) ?? buildInterplanetarySpacecraft(siteId);
    if (!own) return generic;
    const size = (o: THREE.Object3D): number => {
      const v = new THREE.Box3().setFromObject(o).getSize(new THREE.Vector3());
      return Math.max(v.x, v.y, v.z) || 1;
    };
    const box = new THREE.Box3().setFromObject(own);
    const k = size(generic) / size(own);
    own.scale.setScalar(k);
    own.position.y = -box.min.y * k; // base on the surface, like the sampler bus
    const holder = new THREE.Group();
    holder.add(own);
    return probe(holder);
  }
  if (body === 'jupiter') return probe(buildJupiterDescentModule());
  if (body === 'titan') return probe(buildHuygensProbe());
  if (body === 'comet_67p') return probe(buildPhilaeLander());
  // Tier-1: the earth descent profile's siteId is the mission id — look up its
  // capsule family from the coast registry (falls back to Mercury).
  if (body === 'earth') {
    const capsuleId =
      getEarthOrbitCoast(siteId)?.capsuleId ?? LUNAR_RETURN_CAPSULE[siteId] ?? 'mercury';
    const cap = buildCapsuleById(capsuleId);
    cap.userData.capsuleId = capsuleId; // read by buildEarthCapsuleStack for chute count
    return detailedReturnCapsule(capsuleId, cap) ?? cap;
  }
  const tier0 = buildMarsLanderModel(siteId, 'lander', undefined, '#d0a884');
  return detailedDescentLander(siteId, tier0) ?? tier0;
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
  const orbiter = new THREE.Group();
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
    orbiter,
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

  // A downward retro bell + plume anchor beneath the descent stage — or, for a detailed lander
  // with its own engine bell, the plume from that bell's exit.
  const exitY = lander.userData.engineExitY as number | undefined;
  if (exitY != null) {
    m.retro = new THREE.Group();
    m.retro.position.y = exitY;
  } else {
    m.retro = retroNozzles(1, 0, vehLen * 0.14, p.eng);
    m.retro.position.y = -vehLen * 0.04;
  }
  m.root.add(m.retro);
  m.retroPlumeAnchor.position.y = exitY ?? -vehLen * 0.14;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

/** The Apollo CSM (Command + Service Module) — a compact orbiter that stays in
 *  lunar orbit: a conical command module, a cylindrical service module with the
 *  SPS bell, and the docking probe that mates to the LM. */
function buildApolloCSM(vehLen: number): THREE.Group {
  const g = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({
    color: 0xd7dbe0,
    roughness: 0.42,
    metalness: 0.55,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.5, metalness: 0.6 });
  const r = vehLen * 0.16;
  // Service module (cylinder) + SPS engine bell at the aft.
  const sm = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.34, 24), white);
  sm.position.y = vehLen * 0.17;
  const sps = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.34, r * 0.16, vehLen * 0.12, 16, 1, true),
    dark,
  );
  sps.position.y = -vehLen * 0.02;
  // Command module (blunt cone) on top.
  const cm = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.4, r, vehLen * 0.16, 24), white);
  cm.position.y = vehLen * 0.42;
  // Docking probe on the CM apex (points DOWN toward the LM when docked).
  const probe = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.06, r * 0.06, vehLen * 0.06, 8),
    dark,
  );
  probe.position.y = -vehLen * 0.03;
  g.add(sm, sps, cm, probe);
  return g;
}

/** Apollo lunar stack — the LM descent, plus the CSM docked above it that UNDOCKS
 *  at the start of the descent (the scene animates it pulling away). */
function buildApolloLunarStack(lander: THREE.Group, vehLen: number): DescentModel {
  const m = buildLunarStack(lander, vehLen);
  const dockY = lander.userData.dockY as number | undefined;
  const k = lander.userData.metresToScene as number | undefined;
  if (dockY != null && k != null) {
    // The detailed CSM, at the LM's own scale, docked on its tunnel.
    m.orbiter.add(dockedApolloCsm(dockY, k));
    m.root.add(m.orbiter);
    return m;
  }
  const csm = buildApolloCSM(vehLen);
  // Docked above the LM ascent stage via a short docking tunnel (a clear gap so
  // the CSM reads as a separate craft, not part of the LM).
  csm.position.y = vehLen * 0.62;
  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(vehLen * 0.06, vehLen * 0.06, vehLen * 0.14, 12),
    new THREE.MeshStandardMaterial({ color: 0xc4c9cf, roughness: 0.5, metalness: 0.5 }),
  );
  tunnel.position.y = vehLen * 0.5;
  m.orbiter.add(csm, tunnel);
  m.root.add(m.orbiter);
  return m;
}

/** Build the aeroshell (heat-shield + backshell) enclosing a lander, shared by
 *  all atmospheric-entry archetypes. */
function addAeroshell(m: DescentModel, p: Palette, vehLen: number): void {
  const r = vehLen * 0.42;
  const joint = vehLen * 0.04; // max-diameter joint where the two halves meet
  // Heat-shield (front, 70° sphere-cone) — its wide rim sits AT the joint (nose
  // down after rotation.x=π), closing the capsule around the stowed lander.
  m.heatshield = sphereConeHeatshield(r, p.shield, p.metal);
  m.heatshieldBaseY = joint;
  m.heatshield.position.y = m.heatshieldBaseY;
  m.heatshield.rotation.x = Math.PI; // blunt nose forward (down)
  m.root.add(m.heatshield);

  // Backshell (aft) — a truncated cone tapering to the parachute-cover cone, with
  // longeron panel lines. Not a smooth hemisphere balloon.
  m.backshell = new THREE.Group();
  const frustumH = vehLen * 0.34;
  const topR = r * 0.42;
  const frustum = new THREE.Mesh(
    new THREE.CylinderGeometry(topR, r, frustumH, 32, 1, true),
    p.shell,
  );
  frustum.position.y = joint + frustumH / 2;
  m.backshell.add(frustum);
  // Parachute-cover cone cap on top.
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(topR * 0.4, topR, vehLen * 0.08, 32),
    p.shell,
  );
  cap.position.y = joint + frustumH + vehLen * 0.03;
  m.backshell.add(cap);
  // Structural seam rings around the backshell (lie flat on the cone).
  const line = new THREE.MeshStandardMaterial({ color: 0x9a958a, roughness: 0.7, metalness: 0.25 });
  for (const f of [0.28, 0.62]) {
    const ry = joint + frustumH * f;
    const rr = r + (topR - r) * f; // cone radius at this height
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * 1.005, r * 0.012, 6, 40), line);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = ry;
    m.backshell.add(ring);
  }
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
/** MSL's bridles: the rover hung 7.5 m below the descent stage (NASA MSL landing press kit). */
const MSL_BRIDLE_M = 7.5;

/** Top of what flies (scene units, in the parent's frame): surface-only parts left out. */
function flyingTop(o: THREE.Object3D): number {
  o.updateMatrixWorld(true);
  const inv = o.parent ? o.parent.matrixWorld.clone().invert() : new THREE.Matrix4();
  let top = -Infinity;
  o.traverse((c) => {
    const mesh = c as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (let p: THREE.Object3D | null = mesh; p; p = p.parent) if (p.userData.surfaceOnly) return;
    mesh.geometry.computeBoundingBox();
    const b = mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld).applyMatrix4(inv);
    top = Math.max(top, b.max.y);
  });
  return Number.isFinite(top) ? top : 0;
}

function collectNamed(root: THREE.Object3D, name: string): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  root.traverse((o) => void (o.name === name && out.push(o)));
  return out;
}

function buildSkycraneStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  addAeroshell(m, p, vehLen);

  // MSL's chute: one 21.35 m disk-gap-band, 80 lines, over 50 m long, on a 4.5 m aeroshell
  // (NASA NTRS 20130012763; JPL PIA16813). Hung from the backshell's top.
  const kChute = (vehLen * 0.84) / 4.5; // the aeroshell is drawn 0.84 vehLen across
  m.parachuteBaseY = vehLen * 0.47;
  m.parachute = dgbParachute(kChute, { diameterM: 21.35, totalM: 50, lines: 80 });
  m.parachute.position.y = m.parachuteBaseY;
  m.root.add(m.parachute);

  // The rover rides tucked under the MSL descent stage (showcase/msl-edl.ts), at the rover's
  // own metre scale; at skycrane_lower the scene lowers it 7.5 m on three bridles, and after
  // touchdown the stage flies away. The stage's eight canted engines carry their own plumes,
  // so the central retro plume is not used (it fired through the rover).
  m.landerMountY = -vehLen * 0.28;
  lander.position.y = m.landerMountY;
  m.root.add(lander);
  const k = (lander.userData.metresToScene as number | undefined) ?? (vehLen * 0.34) / 3.2;
  const roverTop = flyingTop(lander);
  m.descentStage = new THREE.Group();
  const stage = buildMslDescentStage();
  stage.scale.setScalar(k);
  m.descentStage.add(stage);
  m.descentStage.position.y = roverTop + 0.04 * k;
  m.descentStage.userData.restY = m.descentStage.position.y;
  m.descentStage.userData.bridleLength = MSL_BRIDLE_M * k;
  m.descentStage.userData.plumes = collectNamed(stage, 'mlePlume');
  m.root.add(m.descentStage);
  m.retro = new THREE.Group();

  // Three bridles and the umbilical, from the rover's deck to the bridle-umbilical device; the
  // scene stretches them (scale.y = the gap) as the rover is lowered.
  const tg = new THREE.BufferGeometry();
  const tp: number[] = [];
  for (const [x, z] of [
    [0.45, 0.55],
    [-0.45, 0.55],
    [0, -0.6],
    [0.1, 0],
  ]) {
    tp.push(x * k, 0, z * k, 0, 1, 0);
  }
  tg.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  m.skycraneRigging.add(
    new THREE.LineSegments(tg, new THREE.LineBasicMaterial({ color: 0xd4d6da })),
  );
  m.skycraneRigging.position.y = roverTop;
  m.skycraneRigging.scale.y = 0.04 * k;
  m.root.add(m.skycraneRigging);
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

/** Asteroid/small-body touch-and-go (Hayabusa / OSIRIS-REx) — no aeroshell,
 *  no chute, no legs. The sampler bus IS the whole craft; a TAG-contact retro
 *  puff fires from the horn tip. */
function buildAsteroidSamplerStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  m.landerMountY = 0;
  lander.position.y = 0;
  m.root.add(lander);

  // Single retro/gas-jet at the horn tip.
  m.retro = retroNozzles(1, 0, vehLen * 0.08, p.eng);
  m.retro.position.y = -vehLen * 0.22;
  m.root.add(m.retro);
  m.retroPlumeAnchor.position.y = -vehLen * 0.22;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

/** Comet lander (Philae / 67P) — no aeroshell, no chute, unpowered micro-g
 *  touchdown. The harpoon rig lives in the airbags group slot. */
function buildCometLanderStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  m.landerMountY = 0;
  lander.position.y = 0;
  m.root.add(lander);

  // Harpoon anchor rig in the airbags slot.
  const harpoon = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, vehLen * 0.18, 8), p.eng);
  harpoon.position.y = -vehLen * 0.12;
  m.airbags.add(harpoon);
  m.airbags.visible = true;
  m.root.add(m.airbags);

  m.retroPlumeAnchor.position.y = -vehLen * 0.12;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

/** Jupiter probe stack (Galileo) — sphere-cone aeroshell + single parachute +
 *  instrument module. Never touches a surface. */
function buildJupiterProbeStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  addAeroshell(m, p, vehLen);

  m.parachuteBaseY = vehLen * 0.86;
  m.parachute = parachuteCanopy(vehLen * 0.5, p, -vehLen * 0.86);
  m.parachute.position.y = m.parachuteBaseY;
  m.root.add(m.parachute);

  lander.position.y = 0;
  m.root.add(lander);
  m.retroPlumeAnchor.position.y = -vehLen * 0.1;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

/** Titan parachute stack (Huygens / Cassini-Huygens) — aeroshell + large
 *  parachute (Titan's thick atmosphere needs it). */
function buildTitanParachuteStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  addAeroshell(m, p, vehLen);

  // Titan's main chute is notably large.
  m.parachuteBaseY = vehLen * 0.9;
  m.parachute = parachuteCanopy(vehLen * 0.7, p, -vehLen * 0.9);
  m.parachute.position.y = m.parachuteBaseY;
  m.root.add(m.parachute);

  lander.position.y = 0;
  m.root.add(lander);
  m.retroPlumeAnchor.position.y = -vehLen * 0.1;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

// ─── Dispatch ───────────────────────────────────────────────────────

type StackBuilder = (lander: THREE.Group, vehLen: number) => DescentModel;

/** siteId → dedicated stack builder. Falls back per-body when absent. */
/** Starship's return to Earth (Flight 5, 0.9.11 F3): the ship is its own heat shield, so no
 *  aeroshell and no chute — the ship scaled to the vehicle length, the landing-burn plume at its
 *  Raptors. The scene turns it belly-first for entry and upright at the landing flip. */
function buildStarshipReturnStack(lander: THREE.Group, vehLen: number): DescentModel {
  const m = scaffold(lander);
  const box = new THREE.Box3().setFromObject(lander);
  const h = Math.max(1e-6, box.max.y - box.min.y);
  const k = (vehLen * 1.4) / h;
  lander.scale.setScalar(k);
  // Centred on the vehicle origin, so the belly-first attitude turns it about its middle.
  lander.position.y = -((box.min.y + box.max.y) / 2) * k;
  m.root.add(lander);
  m.retroPlumeAnchor.position.y = -vehLen * 0.72;
  m.root.add(m.retroPlumeAnchor);
  return m;
}

const BUILDERS: Record<string, StackBuilder> = {
  'starship-flight-5': buildStarshipReturnStack,
  // Apollo lunar landings — the LM descent with the CSM undock beat.
  apollo11: buildApolloLunarStack,
  apollo12: buildApolloLunarStack,
  apollo14: buildApolloLunarStack,
  apollo15: buildApolloLunarStack,
  apollo16: buildApolloLunarStack,
  apollo17: buildApolloLunarStack,
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
  // Asteroid touch-and-go
  hayabusa1: buildAsteroidSamplerStack,
  'osiris-rex': buildAsteroidSamplerStack,
  // Jupiter probe
  'galileo-probe': buildJupiterProbeStack,
};

/** Earth capsule re-entry (Tier-1: Mercury/Gemini/Apollo CM/Soyuz/Dragon) — an
 *  ablative aeroshell entry, then drogue + main canopies to a splashdown/ground
 *  touchdown. No retro (aerodynamic; a Soyuz soft-landing burst can be added). */
/** Main-chute count per capsule — real recovery configurations. */
/**
 * Earth-return main parachutes, by capsule family: count, and the nominal diameter where it is
 * sourced (with the capsule height that sets the scale for the older capsule models).
 * Mercury: one 63 ft ringsail (Smithsonian NASM A19720466000). Gemini: one 84.2 ft ringsail
 * (NASA, Gemini parachute landing system). Apollo: three 83.6 ft ringsails (NASA NTRS
 * 19700026594); CM 3.23 m tall. Soyuz: one main of about 1,000 m² (Rostec), about 35.7 m across.
 * Vostok, Voskhod, Dragon, Shenzhou: count only, size not yet sourced.
 */
const CAPSULE_MAINS: Record<
  string,
  { count: number; diameterM?: number; capsuleHeightM?: number }
> = {
  mercury: { count: 1, diameterM: 19.2 },
  gemini: { count: 1, diameterM: 25.7 },
  'apollo-cm': { count: 3, diameterM: 25.5, capsuleHeightM: 3.23 },
  soyuz: { count: 1, diameterM: 35.7 },
  vostok: { count: 1 },
  voskhod: { count: 1 },
  dragon: { count: 4 },
  shenzhou: { count: 1 },
};

function buildEarthCapsuleStack(lander: THREE.Group, vehLen: number): DescentModel {
  const p = palette();
  const m = scaffold(lander);
  addAeroshell(m, p, vehLen);

  // Recovery mains: ringsail canopies (concentric sails with open slots, orange and white gores),
  // at their real size and count where it is sourced (operator 2026-11-23: the striped half-dome
  // "looks like in a cartoon"). The capsule hangs far below on lines about a canopy-width long.
  const capsuleId = (lander.userData.capsuleId as string | undefined) ?? 'mercury';
  const spec = CAPSULE_MAINS[capsuleId];
  const n = spec?.count ?? 1;
  const capTop = new THREE.Box3().setFromObject(lander).max.y;
  const k =
    (lander.userData.metresToScene as number | undefined) ??
    (spec?.capsuleHeightM ? landerHeight(lander) / spec.capsuleHeightM : undefined);
  // Unsourced size: the old proportions (a canopy about three capsule heights across).
  const D = spec?.diameterM && k ? spec.diameterM * k : vehLen * (n >= 3 ? 2.0 : 2.8);
  const lineLen = D * 1.1;
  const confluence = new THREE.Vector3(0, capTop + D * 0.12, 0);
  // A cluster's canopies sit side by side, their skirts just touching.
  const spread = n > 1 ? (D * 0.5) / Math.sin(Math.PI / n) : 0;
  const chutes = new THREE.Group();
  const riser = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, capTop, 0),
    confluence,
  ]);
  chutes.add(new THREE.Line(riser, new THREE.LineBasicMaterial({ color: 0xd9dde2 })));
  for (let c = 0; c < n; c++) {
    const ang = n > 1 ? (c / n) * Math.PI * 2 : 0;
    const off = new THREE.Vector3(Math.cos(ang) * spread, 0, Math.sin(ang) * spread);
    const skirtY = confluence.y + Math.sqrt(Math.max(0, lineLen * lineLen - off.lengthSq()));
    const canopy = ringsailCanopy(D);
    canopy.position.set(off.x, skirtY, off.z);
    if (n > 1) {
      canopy.rotation.z = -Math.cos(ang) * 0.14; // the cluster fans outward
      canopy.rotation.x = Math.sin(ang) * 0.14;
    }
    chutes.add(canopy);
    chutes.add(suspensionLines(D * 0.47, new THREE.Vector3(off.x, skirtY, off.z), confluence, 32));
  }
  m.parachute = chutes;
  m.parachuteBaseY = 0; // canopies already placed inside the group
  m.root.add(m.parachute);

  lander.position.y = -vehLen * 0.02;
  m.root.add(lander);
  return m;
}

function landerHeight(o: THREE.Object3D): number {
  const b = new THREE.Box3().setFromObject(o);
  return b.max.y - b.min.y;
}

/**
 * A ringsail canopy `D` across (scene units), origin at the centre of its skirt: a shallow
 * crown of concentric sails with open slots between them and a vent at the apex, its gores
 * alternating orange and white.
 */
function ringsailCanopy(D: number): THREE.Group {
  const g = new THREE.Group();
  const R = D / 2;
  const height = D * 0.32; // inflated crown height above the skirt
  const gores = 24;
  const rings = 7;
  const orange = new THREE.Color(0xe0662a);
  const white = new THREE.Color(0xf1eee6);
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.85,
    side: THREE.DoubleSide,
  });
  // The crown profile: radius r(t) and height y(t) for t from the vent (0) to the skirt (1).
  const at = (t: number): [number, number] => {
    const a = (0.12 + 0.88 * t) * (Math.PI / 2) * 0.92;
    return [(R * Math.sin(a)) / Math.sin((Math.PI / 2) * 0.92), (height * Math.cos(a)) / 1];
  };
  for (let ring = 0; ring < rings; ring++) {
    // Each sail covers most of its band; the rest is the open slot below it.
    const t0 = ring / rings;
    const t1 = t0 + (1 / rings) * 0.8;
    const pos: number[] = [];
    const col: number[] = [];
    for (let k = 0; k < gores; k++) {
      const a0 = (k / gores) * Math.PI * 2;
      const a1 = ((k + 1) / gores) * Math.PI * 2;
      const c = k % 2 === 0 ? orange : white;
      const [r0, y0] = at(t0);
      const [r1, y1] = at(t1);
      // Gores billow: the mid-gore bulges a little outward.
      const am = (a0 + a1) / 2;
      const quad = [
        [Math.cos(a0) * r0, y0, Math.sin(a0) * r0],
        [Math.cos(a1) * r0, y0, Math.sin(a1) * r0],
        [Math.cos(a1) * r1, y1, Math.sin(a1) * r1],
        [Math.cos(a0) * r1, y1, Math.sin(a0) * r1],
        [Math.cos(am) * r0 * 1.03, y0 + height * 0.01, Math.sin(am) * r0 * 1.03],
        [Math.cos(am) * r1 * 1.03, y1 + height * 0.01, Math.sin(am) * r1 * 1.03],
      ];
      for (const [a, b, e] of [
        [0, 4, 5],
        [0, 5, 3],
        [4, 1, 2],
        [4, 2, 5],
      ]) {
        for (const v of [a, b, e]) {
          pos.push(...quad[v]);
          col.push(c.r, c.g, c.b);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, mat));
  }
  // The skirt sits at y = 0: shift the crown down so its lowest ring is the skirt.
  g.children.forEach((c) => (c.position.y = -at(1)[1]));
  return g;
}

/** Per-body generic stack for missions without a dedicated builder. */
function genericFor(body: DescentBody): StackBuilder {
  if (body === 'moon') return buildLunarStack;
  if (body === 'venus') return buildVenusStack;
  if (body === 'earth') return buildEarthCapsuleStack;
  if (body === 'itokawa' || body === 'ryugu' || body === 'bennu' || body === 'eros')
    return buildAsteroidSamplerStack;
  if (body === 'jupiter') return buildJupiterProbeStack;
  if (body === 'titan') return buildTitanParachuteStack;
  if (body === 'comet_67p') return buildCometLanderStack;
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
