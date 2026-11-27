/**
 * The /fly docking (W9): a crewed craft's last approach to a station, to the hard capture. The
 * steps come from the profile's holds: Demo-2's approach initiation burn, Waypoint 0 below the
 * ISS, Waypoint 1 and 2 out on the docking axis, the go/no-go hold, the final approach to IDA-2;
 * Shenzhou 12 passing ahead of Tianhe, turning round, parking 200 m out and closing on the forward
 * port. Then contact, the ring drawn in, the hooks or latches closed. Pose and camera are pure
 * functions of scene time (the fly-deploy-scene.ts pattern), so a scrub is exact.
 *
 * Time is COMPRESSED and the HUD says so. Sourced (the profile's `provenance`): what each profile
 * times (Demo-2: the burn, the soft and hard capture; Shenzhou 12: the docking), the hold ranges,
 * the holds themselves. ESTIMATES (`estimatedFields`, the HUD marks them "~"): every time a
 * profile gives as minutes before the capture, the path between the points, the closing speed,
 * the ring's travel, the turn, every camera move.
 *
 * Frame: world metres, the station's axes: +x its direction of flight (the port faces it), +y
 * zenith (the Earth below), z the orbit's normal, the origin on the station's centre. The ISS is
 * the /iss diagram model scaled to metres and drawn as of the profile's `stationDate`, its port
 * end at its sourced sizes (iss-docking-end.ts); Tianhe is drawn whole (tiangong-docking-end.ts).
 */
import * as THREE from 'three';
import type { DockingHold, DockingProfile } from '$lib/fly/docking-profile';
import { parseGet } from '$lib/fly/return-profile';
import { addDeployBackdrop } from './fly-deploy-scene';
import { portraitFit } from './phone-framing';
import { buildHarmonyForwardEnd, buildHtv, buildZvezdaAftEnd } from './iss-docking-end';
import { TIANHE_LEN_M, type TianheModel } from './tiangong-docking-end';

/** The diagram station's unit (iss-proxy-model.ts: 1 unit = 12.7 m). */
export const ISS_UNIT_M = 12.7;
/** Harmony's forward end face on the diagram station (its centre 0.66 + half its 0.57 length). */
const HARMONY_FWD_X = (0.66 + 0.57 / 2) * ISS_UNIT_M;
const HARMONY_X = 0.66 * ISS_UNIT_M;
const HARMONY_R = 0.173 * ISS_UNIT_M;
const NMI_PER_KM = 1 / 1.852;
/** The Russian ports on the diagram station (its units; iss-proxy-model.ts MODULE_BOXES): Poisk
 *  zenith and Pirs nadir on Zvezda (x -2.58), Zvezda's aft end, Rassvet nadir on Zarya. */
const RUSSIAN_PORTS = {
  'poisk-zenith': { pos: [-2.58, 0.531, 0], out: 'plusY' },
  'pirs-nadir': { pos: [-2.58, -0.531, 0], out: 'minusY' },
  'zvezda-aft': { pos: [-3.095, 0, 0], out: 'minusX' },
  'rassvet-nadir': { pos: [-1.53, -0.67, 0], out: 'minusY' },
} as const;
/** Tianzhou's length, its docking face to its aft end (showcase/station-freighters.ts). */
const TIANZHOU_LEN_M = 10.6;
const MIN = 60;

/** Zvezda's aft end on the diagram station (its centre -2.58 less half its 1.03 length). */
const ZVEZDA_AFT_X = (2.58 + 1.03 / 2) * ISS_UNIT_M;

/** Which way the port faces (+1 forward, the direction of flight; -1 aft) and how far its face
 *  stands from the station's centre along that way (m). */
export function portFacing(p: DockingProfile): { dir: 1 | -1; back: number } {
  if (p.port === 'zvezda-aft') return { dir: -1, back: ZVEZDA_AFT_X };
  return { dir: 1, back: p.target === 'tiangong' ? TIANHE_LEN_M / 2 : HARMONY_FWD_X };
}

/** 'establish', 'burn', 'uturn', a hold's id ('wp0', 'parking'), 'hold', 'final', 'capture',
 *  'hardDock': the HUD's label keys. */
export type DockingBeat = string;

type Phase =
  'establish' | 'burn' | 'uturn' | 'leg' | 'hold' | 'final' | 'capture' | 'retract' | 'docked';

export interface DockingStep {
  /** Unique: 'burn', 'uturn:parking', 'to:wp0', 'hold:wp2', 'final', 'capture', ... */
  id: string;
  phase: Phase;
  beat?: DockingBeat;
  t0: number;
  t1: number;
  /** The step's clock runs between two sourced times (not marked "~"). */
  sourced?: boolean;
  hold?: DockingHold;
}

/** The ring's travel from soft to hard capture (ESTIMATE). */
const RING_TRAVEL_M = 0.3;
/** Contact to the latches when no source times them apart (ESTIMATE). */
const LATCH_EST_S = 8 * MIN;
/** The turn ends this long before the craft reaches the point after it (ESTIMATE). */
const UTURN_LEAD_S = 8 * MIN;

const stepCache = new WeakMap<DockingProfile, DockingStep[]>();

export function dockingSteps(p: DockingProfile): DockingStep[] {
  const hit = stepCache.get(p);
  if (hit) return hit;
  const steps: DockingStep[] = [];
  let t = 0;
  const push = (s: Omit<DockingStep, 't0' | 't1'>, len: number, gap = 0) => {
    steps.push({ ...s, t0: t, t1: t + len });
    t += len + gap;
  };
  push({ id: 'establish', phase: 'establish' }, 5);
  if (p.lastBurn) push({ id: 'burn', phase: 'burn', beat: 'burn', sourced: true }, 4, 0.5);
  for (const h of p.holds) {
    if (h.uTurn) push({ id: `uturn:${h.id}`, phase: 'uturn', beat: 'uturn', hold: h }, 8);
    // A stop's own name (Shenzhou's parking point, Soyuz's hover) shows once the craft is there;
    // a waypoint's (Dragon's) from the leg toward it, its go/no-go stop after it.
    const named = h.hold && !h.goNoGo;
    push(
      { id: `to:${h.id}`, phase: 'leg', beat: named ? undefined : h.id, hold: h },
      7.5,
      h.hold ? 0 : 0.5,
    );
    if (h.hold)
      push({ id: `hold:${h.id}`, phase: 'hold', beat: h.goNoGo ? 'hold' : h.id, hold: h }, 4);
  }
  const firm = p.hardDockS != null;
  push({ id: 'final', phase: 'final', beat: 'final' }, 8);
  push({ id: 'capture', phase: 'capture', beat: 'capture', sourced: firm }, 2);
  push({ id: 'retract', phase: 'retract', sourced: firm }, 6);
  // the IDSS closes hooks; China's mechanism latches (twelve of them)
  push({ id: 'docked', phase: 'docked', beat: p.mechanism === 'cdm' ? 'latches' : 'hardDock' }, 4);
  stepCache.set(p, steps);
  return steps;
}

export const dockingEnd = (p: DockingProfile): number => {
  const s = dockingSteps(p);
  return s[s.length - 1].t1;
};

const stepOf = (p: DockingProfile, id: string) => dockingSteps(p).find((s) => s.id === id)!;

export function dockingBeatsFor(p: DockingProfile): { id: DockingBeat; t: number }[] {
  return [
    { id: 'establish', t: 0 },
    ...dockingSteps(p)
      .filter((s) => s.beat)
      .map((s) => ({ id: s.beat!, t: s.t0 })),
  ];
}

export function dockingBeatAt(t: number, p: DockingProfile): DockingBeat {
  let id: DockingBeat = 'establish';
  for (const b of dockingBeatsFor(p)) if (t >= b.t) id = b.id;
  return id;
}

/** True while the HUD clock is an estimate: outside the steps that run between sourced times. */
export function dockingMetIsEstimate(t: number, p: DockingProfile): boolean {
  const s = dockingSteps(p).find((x) => t >= x.t0 && t <= x.t1);
  return !s?.sourced;
}

/** When the craft reaches a hold: its sourced MET, else its estimate before the capture. */
const arrival = (h: DockingHold, p: DockingProfile): number =>
  h.met !== undefined ? parseGet(h.met)! : p.captureS - h.minBeforeCapture! * MIN;

/**
 * The real MET (s) on the HUD: piecewise linear through the burn, each hold's arrival and end,
 * the capture and the hard capture (each as the profile times it, sourced or estimated).
 */
export function dockingMetAt(t: number, p: DockingProfile): number {
  const c = p.captureS;
  const k: [number, number][] = [];
  for (const s of dockingSteps(p)) {
    if (s.phase === 'burn') {
      k.push([s.t0, p.lastBurnS!], [s.t1, p.lastBurnS! + p.lastBurn!.burnS]);
    } else if (s.phase === 'uturn') k.push([s.t1, arrival(s.hold!, p) - UTURN_LEAD_S]);
    else if (s.phase === 'leg') k.push([s.t1, arrival(s.hold!, p)]);
    else if (s.phase === 'hold') k.push([s.t1, c - s.hold!.holdUntilMinBeforeCapture! * MIN]);
    else if (s.phase === 'capture') k.push([s.t0, c]);
    else if (s.phase === 'retract') k.push([s.t1, p.hardDockS ?? c + LATCH_EST_S]);
  }
  const end = dockingEnd(p);
  k.push([end, k[k.length - 1][1] + 4 * MIN]);
  // before the first time: ten minutes ahead of the burn, else half an hour of closing
  k.unshift([0, k[0][1] - (p.lastBurn ? 10 : 30) * MIN]);
  if (t <= 0) return k[0][1] + t;
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const [t0, g0] = k[i - 1];
      const [t1, g1] = k[i];
      return t1 === t0 ? g1 : g0 + ((g1 - g0) * (t - t0)) / (t1 - t0);
    }
  }
  const [tl, gl] = k[k.length - 1];
  return gl + (t - tl);
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export interface DockingPose {
  t: number;
  met: number;
  beat: DockingBeat;
  /** The chaser's docking ring, relative to the station's port face, in the port's frame: +x out
   *  of the port along its axis, +y zenith (m). */
  offset: THREE.Vector3;
  /** Range from ring to port (m). */
  rangeM: number;
  /** Seconds into the burn while it fires, else null. */
  burn: number | null;
  /** 0 contact .. 1 the ring fully retracted (hard capture). */
  retract: number;
  /** The craft's turn about the zenith: PI nose forward (before a U-turn), 0 nose to the port. */
  yaw: number;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** A hold's point from the port face: below the station's centre, or out on the docking axis. */
const holdPoint = (h: DockingHold, back: number) =>
  h.from === 'below' ? V(-back, -h.rangeM, 0) : V(h.rangeM, 0, 0);
/** Where a U-turn happens: ahead of the point it leads to and below the axis (ESTIMATE). */
const turnPoint = (h: DockingHold) => V(h.rangeM * 1.6, -h.rangeM * 0.7, 0);

interface Leg {
  step: DockingStep;
  from: THREE.Vector3;
  to: THREE.Vector3;
  /** An arc through this point (from below the station round onto the axis). */
  via?: THREE.Vector3;
}

const legCache = new WeakMap<DockingProfile, Leg[]>();

/** Each step's path, from far behind and below (the chaser comes up from a lower orbit). */
function legs(p: DockingProfile): Leg[] {
  const hit = legCache.get(p);
  if (hit) return hit;
  const { dir, back } = portFacing(p);
  const first = p.holds[0];
  const below = first.from === 'below' ? first.rangeM : 400;
  // the chaser comes up from behind the station (-x in the world, whichever way the port faces)
  const W = (x: number, y: number) => V(dir * (-dir * back + x), y, 0);
  const START = W(-900, -below - 500);
  const AFTER_BURN = W(-820, -below - 420);
  const steps = dockingSteps(p);
  const firstTarget = first.uTurn ? turnPoint(first) : holdPoint(first, back);
  const out: Leg[] = [];
  let at = START;
  for (const s of steps) {
    let to = at;
    let via: THREE.Vector3 | undefined;
    if (s.phase === 'establish')
      to = p.lastBurn ? START.clone().lerp(AFTER_BURN, 0.15) : START.clone().lerp(firstTarget, 0.1);
    else if (s.phase === 'burn') to = AFTER_BURN;
    else if (s.phase === 'uturn') to = turnPoint(s.hold!);
    else if (s.phase === 'leg') {
      to = holdPoint(s.hold!, back);
      if (at.y < -1 && s.hold!.from === 'axis' && !s.hold!.uTurn)
        via = V(to.x * 0.9, at.y * 0.75, 0);
    } else if (s.phase === 'final') to = V(0, 0, 0);
    else if (s.phase === 'retract') to = V(-RING_TRAVEL_M, 0, 0);
    out.push({ step: s, from: at, to, via });
    at = to;
  }
  legCache.set(p, out);
  return out;
}

/** Where the chaser's ring sits relative to the port, by step. */
export function dockingOffset(t: number, p: DockingProfile): THREE.Vector3 {
  const all = legs(p);
  for (const l of all) {
    const { t0, t1, phase } = l.step;
    if (t < t0) return l.from.clone();
    if (t > t1) continue;
    const span = (t - t0) / (t1 - t0);
    // the establishing drift is steady; the turn's move ends before it turns
    const u = phase === 'establish' ? clamp01(span) : smooth(phase === 'uturn' ? span / 0.6 : span);
    if (l.via) {
      const a = l.from.clone().lerp(l.via, u);
      return a.lerp(l.via.clone().lerp(l.to, u), u);
    }
    return l.from.clone().lerp(l.to, u);
  }
  return all[all.length - 1].to.clone();
}

/** The craft's yaw: nose forward until its U-turn, which it makes over the turn's last part. */
export function dockingYaw(t: number, p: DockingProfile): number {
  const turn = dockingSteps(p).find((s) => s.phase === 'uturn');
  if (!turn) return 0;
  return Math.PI * (1 - smooth((t - lerp(turn.t0, turn.t1, 0.55)) / ((turn.t1 - turn.t0) * 0.45)));
}

export function dockingPose(t: number, p: DockingProfile): DockingPose {
  const offset = dockingOffset(t, p);
  const b = p.lastBurn ? stepOf(p, 'burn') : null;
  const r = stepOf(p, 'retract');
  return {
    t,
    met: dockingMetAt(t, p),
    beat: dockingBeatAt(t, p),
    offset,
    rangeM: Math.max(0, offset.length()),
    burn: b && t >= b.t0 && t <= b.t1 ? ((t - b.t0) / (b.t1 - b.t0)) * p.lastBurn!.burnS : null,
    retract: smooth((t - r.t0) / (r.t1 - r.t0)),
    yaw: dockingYaw(t, p),
  };
}

export interface FlyDockingModels {
  /** The ISS: the /iss diagram station (buildIssProxyStation), at its own 1 unit = 12.7 m.
   *  Tiangong: Tianhe in metres (buildTianhe2021). */
  station: THREE.Group;
  /** The chaser's showcase model, standing nose up (+y): userData.dockingPort, and setNoseOpen
   *  (Dragon) or setRingRetract (Shenzhou). */
  chaser: THREE.Group;
  /** The ships docked on the date: the /iss diagram's ('soyuz_ms', 'progress_ms';
   *  `buildIssVisitor`), Tianzhou's showcase model ('tianzhou'). */
  visitor?: (id: string) => THREE.Group | null | undefined;
}

export interface FlyDocking {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  profile: DockingProfile;
  end: number;
  parts: { station: THREE.Object3D; chaser: THREE.Object3D; port: THREE.Object3D };
  update: (t: number, aspect: number) => DockingPose;
  dispose: () => void;
}

/**
 * Show the diagram station as it stood on `dateMs`: each part with a launch epoch after it is
 * hidden; the visiting ships of the /iss model (`dock-*`), its PMA-2 and Harmony's forward wrap
 * (the docking end is drawn here at its real size) are hidden always.
 */
export function configureStation(
  station: THREE.Object3D,
  epochs: ReadonlyMap<string, number>,
  dateMs: number,
): void {
  station.traverse((o) => {
    if (o === station) return;
    // PMA-2 and Harmony's forward blanket wrap: the docking end is drawn at its real size instead.
    // The model's dashed approach corridors belong to its present-day visitors.
    if (o.name === 'pma2' || o.name === 'mli_harmony' || o.name.startsWith('corridor_')) {
      o.visible = false;
      return;
    }
    const id = (o.userData.animModuleId ?? o.userData.moduleId) as string | undefined;
    if (!id) return;
    if (id.startsWith('dock-')) {
      o.visible = false;
      return;
    }
    const e = epochs.get(id);
    if (e !== undefined && e > dateMs) o.visible = false;
  });
}

/** The ISS as of the date, its forward port end, and the ships on its other ports. */
function rigIss(
  scene: THREE.Scene,
  profile: DockingProfile,
  models: FlyDockingModels,
  epochs: ReadonlyMap<string, number>,
): THREE.Object3D {
  const station = models.station;
  station.scale.setScalar(ISS_UNIT_M);
  configureStation(station, epochs, Date.parse(profile.stationDate));
  scene.add(station);
  // Before Destiny (February 2001) PMA-2 sat on Unity's forward port and PMA-3 (October 2000) on
  // its nadir port; the diagram draws them where they are now.
  const dateMs = Date.parse(profile.stationDate);
  const destiny = epochs.get('destiny');
  if (destiny !== undefined && dateMs < destiny) {
    const unityFwd = -0.59 + 0.43 / 2 + 0.075;
    station.traverse((o) => {
      if (o.name === 'pma2') {
        o.visible = true;
        o.position.set(unityFwd, 0, 0);
      } else if (o.name === 'pma3') {
        o.visible = dateMs >= (epochs.get('truss-z1') ?? Infinity);
        o.position.set(-0.59, -(0.18 + 0.075), 0);
      }
    });
  }
  let end;
  if (profile.port === 'zvezda-aft') {
    // the diagram's engine bell sits on the docking axis: the docking unit replaces it
    station.traverse((o) => {
      if (o.name === 'zvezda_engine_bell') o.visible = false;
    });
    end = buildZvezdaAftEnd();
    end.rotation.y = Math.PI;
    end.position.x = -ZVEZDA_AFT_X - 0.32;
  } else {
    end = buildHarmonyForwardEnd();
    end.position.x = HARMONY_FWD_X;
  }
  scene.add(end);
  for (const n of profile.neighbours) {
    if (n.id === 'htv') {
      const htv = buildHtv();
      htv.position.set(HARMONY_X, -HARMONY_R, 0);
      scene.add(htv);
      continue;
    }
    // The Soyuz and Progress: the diagram's own ships on the diagram's ports, scaled with it.
    const ship = models.visitor?.(n.id === 'soyuz-ms' ? 'soyuz_ms' : 'progress_ms');
    const at = RUSSIAN_PORTS[n.port as keyof typeof RUSSIAN_PORTS];
    if (!ship || !at) continue;
    ship.position.set(at.pos[0], at.pos[1], at.pos[2]);
    if (at.out === 'minusY') ship.rotation.x = Math.PI;
    else if (at.out === 'minusX') ship.rotation.z = Math.PI / 2;
    ship.name = `neighbour-${n.port}`;
    station.add(ship);
    // Pirs was still on Zvezda's nadir port in 2020; the diagram no longer draws it (deorbited
    // 2021), so it is drawn here at the diagram's Pirs size when a ship sits on it.
    if (n.port === 'pirs-nadir') {
      const pirs = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 0.32, 20),
        new THREE.MeshStandardMaterial({ color: 0xe8e8ec, roughness: 0.6 }),
      );
      pirs.name = 'pirs-2020';
      pirs.position.set(-2.58, -0.371, 0);
      station.add(pirs);
    }
  }
  return end.userData.dockingPort;
}

/** Tianhe, its centre on the origin (its own origin is the forward port's face), and Tianzhou-2
 *  on its aft port. */
function rigTiangong(
  scene: THREE.Scene,
  profile: DockingProfile,
  models: FlyDockingModels,
): THREE.Object3D {
  const station = models.station as TianheModel;
  station.position.x = TIANHE_LEN_M / 2;
  scene.add(station);
  for (const n of profile.neighbours) {
    const ship = n.id === 'tianzhou' ? models.visitor?.('tianzhou') : null;
    if (!ship) continue;
    // standing on its docking face, nose up: turned so it points forward, into the aft port
    ship.rotation.z = -Math.PI / 2;
    ship.position.x = station.userData.aftPort.position.x - TIANZHOU_LEN_M;
    ship.name = `neighbour-${n.port}`;
    station.add(ship);
  }
  return station.userData.dockingPort;
}

export function createFlyDocking(
  profile: DockingProfile,
  models: FlyDockingModels,
  opts: { earthTextureUrl?: string; epochs?: ReadonlyMap<string, number> } = {},
): FlyDocking {
  const scene = new THREE.Scene();
  const km = profile.altitudeKm * NMI_PER_KM;
  const { stars, earthTex } = addDeployBackdrop(scene, [km, km], opts.earthTextureUrl, 1 / 50);
  const steps = dockingSteps(profile);
  const at = (id: string) => stepOf(profile, id);

  // The Sun on the orbit-normal side the cameras take (-z), a little above and ahead (ESTIMATE:
  // the Sun's direction at the docking is not modelled), so the craft and the port face it.
  scene.traverse((o) => {
    if ((o as THREE.DirectionalLight).isDirectionalLight) o.position.set(260, 200, -620);
  });
  const station = models.station;
  const { dir } = portFacing(profile);
  const portObj =
    profile.target === 'tiangong'
      ? rigTiangong(scene, profile, models)
      : rigIss(scene, profile, models, opts.epochs ?? new Map());
  scene.updateMatrixWorld(true);
  const portWorld = portObj.getWorldPosition(new THREE.Vector3());

  // The chaser: its nose (+y in its model) turned to -x, toward the port; its ring at `offset`.
  const chaser = models.chaser;
  const cu = chaser.userData as {
    dockingPort: THREE.Object3D;
    setNoseOpen?: (k: number) => void;
    setRingRetract?: (k: number) => void;
  };
  if (cu.setNoseOpen) {
    // Dragon's nose cone opened before the approach (ESTIMATE: when). Rolled so the open cone
    // stands on the zenith side, clear of IDA-2's targets either side of the port (ESTIMATE).
    cu.setNoseOpen(1);
    chaser.rotation.y = -Math.PI / 2;
  }
  cu.setRingRetract?.(0);
  chaser.updateMatrixWorld(true);
  const portLocal = cu.dockingPort.getWorldPosition(new THREE.Vector3());
  // measured standing, in the model's own frame, before it is turned
  const chaserBox = new THREE.Box3().setFromObject(chaser);
  const holder = new THREE.Group();
  const yawG = new THREE.Group();
  const attitude = new THREE.Group();
  attitude.rotation.z = Math.PI / 2;
  attitude.add(chaser);
  yawG.add(attitude);
  holder.add(yawG);
  scene.add(holder);
  attitude.updateMatrixWorld(true);
  const portInYaw = portLocal.clone().applyQuaternion(attitude.quaternion);
  const centreInYaw = chaserBox.getCenter(new THREE.Vector3()).applyQuaternion(attitude.quaternion);
  const chaserLen = chaserBox.getSize(new THREE.Vector3()).y;
  const UP = new THREE.Vector3(0, 1, 0);
  // the same, turned round, for an aft port
  const portInAft = portInYaw.clone().applyAxisAngle(UP, Math.PI);
  const centreInAft = centreInYaw.clone().applyAxisAngle(UP, Math.PI);

  // Four Draco plumes on the capsule's flank while the burn fires (ESTIMATE: which thrusters
  // fired, and their direction).
  const plumes: THREE.Mesh[] = [];
  if (profile.lastBurn) {
    const plumeMat = new THREE.MeshBasicMaterial({
      color: 0xd6e6ff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const plumeY = chaserBox.max.y - chaserLen * 0.36;
    for (const a of [Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.22, 2.2, 10, 1, true), plumeMat);
      const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      c.position.copy(out.clone().multiplyScalar(1.95)).setY(plumeY);
      c.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), out);
      c.position.addScaledVector(out, 1.1);
      c.visible = false;
      chaser.add(c);
      plumes.push(c);
    }
  }

  // The 1/50 Earth's horizon lies ~46 km off: the stars sit beyond it, the far plane past them.
  stars.scale.setScalar(5);
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 2e5);
  const total = dockingEnd(profile);
  const lastHold = profile.holds[profile.holds.length - 1];
  // A long final approach (Shenzhou's from 200 m) is followed over the shoulder until 40 m out.
  const finalStep = at('final');
  let tClose = finalStep.t0;
  if (lastHold.rangeM > 60) {
    while (tClose < finalStep.t1 && dockingOffset(tClose, profile).length() > 40) tClose += 0.05;
  }

  const update = (tIn: number, aspect: number): DockingPose => {
    const t = Math.min(total, Math.max(0, tIn));
    const pose = dockingPose(t, profile);
    // The craft turns about its centre: placed by where the centre stands once turned to the port.
    // nose to the port: toward -x at a forward port, turned round at an aft one
    const yaw = pose.yaw + (dir < 0 ? Math.PI : 0);
    yawG.rotation.y = yaw;
    const centreNow = centreInYaw.clone().applyAxisAngle(UP, yaw);
    const docked = (dir < 0 ? portInAft : portInYaw).clone();
    const centreAt = dir < 0 ? centreInAft : centreInYaw;
    const off = V(dir * pose.offset.x, pose.offset.y, pose.offset.z);
    const centre = portWorld.clone().add(off).sub(docked).add(centreAt);
    holder.position.copy(centre).sub(centreNow);
    holder.updateMatrixWorld(true);
    cu.setRingRetract?.(pose.retract);
    for (const pl of plumes) pl.visible = pose.burn != null;

    const fit = portraitFit(aspect);
    const portrait = aspect < 1;
    const cc = centre;
    // The shots. Far out, beside the craft on its sunlit side with the Earth's limb below (the
    // station is a speck that far); on the way in, over the craft's shoulder toward the port; at
    // the port, side views that frame the craft and the port end together.
    const beside = (off: THREE.Vector3, fov: number, lead = V(4, -1.5, 0)) => ({
      position: cc.clone().addScaledVector(portrait ? V(off.x * 0.6, off.y, off.z) : off, fit),
      look: cc.clone().add(lead),
      fov,
    });
    // Over the craft's shoulder toward the port (on the sunlit -z side): the craft near and large,
    // the station beyond it. From a long way out (Shenzhou's 200 m), a long lens from further
    // back, so the station is more than a speck.
    const shoulder = (back: number, fov: number) => {
      const u = portWorld.clone().sub(cc).normalize();
      const eye = cc
        .clone()
        .addScaledVector(u, -back * fit)
        .add(V(0, 4, portrait ? -4 : -11));
      return { position: eye, look: cc.clone().lerp(portWorld, 0.5), fov };
    };
    const pair = (lookK: number, off: THREE.Vector3, fov: number, min: number) => {
      const look = cc.clone().lerp(portWorld, lookK);
      const sep = Math.max(min, cc.distanceTo(portWorld));
      // on a phone the eye swings toward the docking axis, foreshortening the craft-to-port line
      const o = (portrait ? V(off.x + 0.9, off.y, off.z) : off.clone()).normalize();
      o.x *= dir;
      return { position: look.clone().addScaledVector(o, sep * 1.5 * fit), look, fov };
    };
    const legSteps = steps.filter((s) => s.phase === 'leg');
    const shots: [number, ReturnType<typeof beside>][] = [[0, beside(V(-16, 5, -24), 44)]];
    for (const s of steps) {
      if (s.phase === 'burn') shots.push([s.t0, beside(V(-11, 4, -17), 44)]);
      // the craft turns about its centre: the shot holds on it
      else if (s.phase === 'uturn') shots.push([s.t0, beside(V(-12, 6, -26), 46, V(0, -1, 0))]);
      else if (s.phase === 'leg')
        shots.push([s.t0, shoulder(s === legSteps[legSteps.length - 1] ? 26 : 30, 42)]);
      else if (s.phase === 'hold')
        shots.push([
          s.t0,
          s.hold!.rangeM > 60 ? shoulder(70, 15) : pair(0.45, V(0.5, 0.35, -1), 38, 26),
        ]);
      else if (s.phase === 'final') {
        if (tClose > s.t0) shots.push([s.t0, shoulder(70, 15)]);
        shots.push([tClose, pair(0.5, V(0.35, 0.3, -1), 38, 16)]);
      } else if (s.phase === 'capture') shots.push([s.t0, pair(0.5, V(0.6, 0.45, -1), 36, 11)]);
      else if (s.phase === 'docked')
        shots.push([
          s.t0,
          {
            position: portWorld.clone().add(V(dir * 48, 16, -38).multiplyScalar(fit)),
            look: portWorld.clone().add(V(-dir * 4, -1, 0)),
            fov: 40,
          },
        ]);
    }
    let i = shots.length - 1;
    while (i > 0 && t < shots[i][0]) i--;
    let cam = shots[i][1];
    if (i > 0) {
      const prev = shots[i - 1][1];
      // the previous shot evaluated now (it follows the craft), blended into this one
      const kk = smooth((t - shots[i][0]) / 1.8);
      cam = {
        position: prev.position.clone().lerp(cam.position, kk),
        look: prev.look.clone().lerp(cam.look, kk),
        fov: lerp(prev.fov, cam.fov, kk),
      };
    }
    camera.position.copy(cam.position);
    camera.fov = cam.fov;
    camera.aspect = aspect;
    camera.lookAt(cam.look);
    camera.updateProjectionMatrix();
    stars.position.copy(camera.position);
    return pose;
  };

  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else mat?.dispose();
    });
    earthTex?.dispose();
  };

  return {
    scene,
    camera,
    profile,
    end: total,
    parts: { station, chaser: holder, port: portObj },
    update,
    dispose,
  };
}
