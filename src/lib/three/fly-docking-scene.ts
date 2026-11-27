/**
 * The /fly docking (W9): a crewed craft's last approach to a station, from its last burn to the
 * hard capture. Demo-2 first: Crew Dragon Endeavour fires its approach initiation burn, rises to
 * Waypoint 0 below the ISS, swings out ahead onto the docking axis at Waypoint 1, closes to
 * Waypoint 2, holds for the go/no-go poll, flies in to IDA-2 on Harmony's forward end, the soft
 * capture ring latches and retracts, and the hooks close. Pose and camera are pure functions of
 * scene time (the fly-deploy-scene.ts pattern), so a scrub is exact.
 *
 * Time is COMPRESSED and the HUD says so. Sourced (the profile's `provenance`): the burn's time and
 * length, the waypoint ranges, the hold at Waypoint 2, the soft- and hard-capture times. ESTIMATES
 * (`estimatedFields`, the HUD marks them "~"): the times at the waypoints, the path between them,
 * the closing speed, the ring's travel, the open nose cone, every camera move.
 *
 * Frame: world metres, the /iss diagram station's axes (iss-proxy-model.ts): +x the station's
 * direction of flight (Harmony forward), +y zenith (the Earth below), z the orbit's normal. The
 * station is the diagram model scaled to metres and drawn as of the profile's `stationDate`; the
 * port end is iss-docking-end.ts at its sourced sizes.
 */
import * as THREE from 'three';
import type { DockingProfile } from '$lib/fly/docking-profile';
import { addDeployBackdrop } from './fly-deploy-scene';
import { portraitFit } from './phone-framing';
import { buildHarmonyForwardEnd, buildHtv } from './iss-docking-end';

/** The diagram station's unit (iss-proxy-model.ts: 1 unit = 12.7 m). */
export const ISS_UNIT_M = 12.7;
/** Harmony's forward end face on the diagram station (its centre 0.66 + half its 0.57 length). */
const HARMONY_FWD_X = (0.66 + 0.57 / 2) * ISS_UNIT_M;
const HARMONY_X = 0.66 * ISS_UNIT_M;
const HARMONY_R = 0.173 * ISS_UNIT_M;
const NMI_PER_KM = 1 / 1.852;
const MIN = 60;

export type DockingBeat =
  'establish' | 'burn' | 'wp0' | 'wp1' | 'wp2' | 'hold' | 'final' | 'capture' | 'hardDock';

type Phase =
  | 'establish'
  | 'burn'
  | 'toWp0'
  | 'toWp1'
  | 'toWp2'
  | 'hold'
  | 'final'
  | 'capture'
  | 'retract'
  | 'docked';

export interface DockingStep {
  phase: Phase;
  beat?: DockingBeat;
  t0: number;
  t1: number;
  /** The step's clock runs between two sourced times (not marked "~"). */
  sourced?: boolean;
}

export function dockingSteps(): DockingStep[] {
  return [
    { phase: 'establish', t0: 0, t1: 5 },
    { phase: 'burn', beat: 'burn', t0: 5, t1: 9, sourced: true },
    { phase: 'toWp0', beat: 'wp0', t0: 9.5, t1: 17 },
    { phase: 'toWp1', beat: 'wp1', t0: 17.5, t1: 26 },
    { phase: 'toWp2', beat: 'wp2', t0: 26.5, t1: 33 },
    { phase: 'hold', beat: 'hold', t0: 33, t1: 37 },
    { phase: 'final', beat: 'final', t0: 37, t1: 45 },
    { phase: 'capture', beat: 'capture', t0: 45, t1: 47, sourced: true },
    { phase: 'retract', t0: 47, t1: 53, sourced: true },
    { phase: 'docked', beat: 'hardDock', t0: 53, t1: 57 },
  ];
}

export const dockingEnd = (): number => dockingSteps()[dockingSteps().length - 1].t1;

const stepOf = (ph: Phase) => dockingSteps().find((s) => s.phase === ph)!;

export function dockingBeatsFor(): { id: DockingBeat; t: number }[] {
  return [
    { id: 'establish', t: 0 },
    ...dockingSteps()
      .filter((s) => s.beat)
      .map((s) => ({ id: s.beat!, t: s.t0 })),
  ];
}

export function dockingBeatAt(t: number): DockingBeat {
  let id: DockingBeat = 'establish';
  for (const b of dockingBeatsFor()) if (t >= b.t) id = b.id;
  return id;
}

/** True while the HUD clock is an estimate: everywhere but the burn and capture to hard capture. */
export function dockingMetIsEstimate(t: number): boolean {
  const s = dockingSteps().find((x) => t >= x.t0 && t <= x.t1);
  return !s?.sourced;
}

/**
 * The real MET (s) on the HUD: piecewise linear through the burn, the waypoints, the capture and
 * the hard capture. The waypoint times are ESTIMATES spaced before the capture as the pre-launch
 * plan spaced them (WP0 76 min, WP1 51 min, WP2 10 min; the hold ends 4 min before).
 */
export function dockingMetAt(t: number, p: DockingProfile): number {
  const c = p.captureS;
  const k: [number, number][] = [
    [0, p.lastBurnS - 10 * MIN],
    [stepOf('burn').t0, p.lastBurnS],
    [stepOf('burn').t1, p.lastBurnS + p.lastBurn.burnS],
    [stepOf('toWp0').t1, c - 76 * MIN],
    [stepOf('toWp1').t1, c - 51 * MIN],
    [stepOf('toWp2').t1, c - 10 * MIN],
    [stepOf('hold').t1, c - 4 * MIN],
    [stepOf('capture').t0, c],
    [stepOf('retract').t1, p.hardDockS],
    [dockingEnd(), p.hardDockS + 4 * MIN],
  ];
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
  /** The chaser's docking ring, relative to the station's port face (m, station axes). */
  offset: THREE.Vector3;
  /** Range from ring to port (m). */
  rangeM: number;
  /** Seconds into the burn while it fires, else null. */
  burn: number | null;
  /** 0 contact .. 1 the ring fully retracted (hard capture). */
  retract: number;
}

/** The ring's travel from soft to hard capture (ESTIMATE). */
const RING_TRAVEL_M = 0.3;

/**
 * Where the chaser's ring sits relative to the port, by phase: from far behind and below, up to
 * WP0 below the station, round onto the docking axis at WP1 and in.
 */
export function dockingOffset(t: number, p: DockingProfile): THREE.Vector3 {
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const wp = (id: string) => p.holds.find((h) => h.id === id)!;
  const r0 = wp('wp0').rangeM;
  const r1 = wp('wp1').rangeM;
  const r2 = wp('wp2').rangeM;
  // WP0 is below the station's centre (Harmony's forward end is HARMONY_FWD_X ahead of it)
  const W0 = V(-HARMONY_FWD_X, -r0, 0);
  const START = V(-HARMONY_FWD_X - 900, -r0 - 500, 0);
  const AFTER_BURN = V(-HARMONY_FWD_X - 820, -r0 - 420, 0);
  const W1 = V(r1, 0, 0);
  const W2 = V(r2, 0, 0);
  const k = (ph: Phase) => smooth((t - stepOf(ph).t0) / (stepOf(ph).t1 - stepOf(ph).t0));
  if (t < stepOf('burn').t0) return START.clone().lerp(AFTER_BURN, 0.15 * (t / stepOf('burn').t0));
  if (t < stepOf('toWp0').t0) return START.clone().lerp(AFTER_BURN, lerp(0.15, 1, k('burn')));
  if (t < stepOf('toWp1').t0) return AFTER_BURN.clone().lerp(W0, k('toWp0'));
  if (t < stepOf('toWp2').t0) {
    // round from below onto the axis ahead: an arc through a point ahead and below
    const u = k('toWp1');
    const mid = V(r1 * 0.9, -r0 * 0.75, 0);
    const a = W0.clone().lerp(mid, u);
    const b = mid.clone().lerp(W1, u);
    return a.lerp(b, u);
  }
  if (t < stepOf('hold').t0) return W1.clone().lerp(W2, k('toWp2'));
  if (t < stepOf('final').t0) return W2.clone();
  if (t < stepOf('capture').t0) return W2.clone().lerp(V(0, 0, 0), k('final'));
  if (t < stepOf('retract').t0) return V(0, 0, 0);
  return V(-RING_TRAVEL_M * k('retract'), 0, 0);
}

export function dockingPose(t: number, p: DockingProfile): DockingPose {
  const offset = dockingOffset(t, p);
  const b = stepOf('burn');
  const r = stepOf('retract');
  return {
    t,
    met: dockingMetAt(t, p),
    beat: dockingBeatAt(t),
    offset,
    rangeM: Math.max(0, offset.length()),
    burn: t >= b.t0 && t <= b.t1 ? ((t - b.t0) / (b.t1 - b.t0)) * p.lastBurn.burnS : null,
    retract: smooth((t - r.t0) / (r.t1 - r.t0)),
  };
}

export interface FlyDockingModels {
  /** The /iss diagram station (buildIssProxyStation), at its own 1 unit = 12.7 m. */
  station: THREE.Group;
  /** The chaser's showcase model, standing nose up (+y): userData.dockingPort, setNoseOpen. */
  chaser: THREE.Group;
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
    // PMA-2 and Harmony's forward blanket wrap: the docking end is drawn at its real size instead
    if (o.name === 'pma2' || o.name === 'mli_harmony') {
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

export function createFlyDocking(
  profile: DockingProfile,
  models: FlyDockingModels,
  opts: { earthTextureUrl?: string; epochs?: ReadonlyMap<string, number> } = {},
): FlyDocking {
  const scene = new THREE.Scene();
  const km = profile.altitudeKm * NMI_PER_KM;
  const { stars, earthTex } = addDeployBackdrop(scene, [km, km], opts.earthTextureUrl, 1 / 50);

  // The Sun on the orbit-normal side the cameras take (-z), a little above and ahead (ESTIMATE:
  // the Sun's direction at the docking is not modelled), so the craft and the port face it.
  scene.traverse((o) => {
    if ((o as THREE.DirectionalLight).isDirectionalLight) o.position.set(260, 200, -620);
  });
  const station = models.station;
  station.scale.setScalar(ISS_UNIT_M);
  configureStation(station, opts.epochs ?? new Map(), Date.parse(profile.stationDate));
  scene.add(station);
  const end = buildHarmonyForwardEnd();
  end.position.x = HARMONY_FWD_X;
  scene.add(end);
  for (const n of profile.neighbours) {
    if (n.id !== 'htv') continue;
    const htv = buildHtv();
    htv.position.set(HARMONY_X, -HARMONY_R, 0);
    scene.add(htv);
  }
  scene.updateMatrixWorld(true);
  const portWorld = end.userData.dockingPort.getWorldPosition(new THREE.Vector3());

  // The chaser: its nose (+y in its model) turned to -x, toward the port; its ring at `offset`.
  const chaser = models.chaser;
  const cu = chaser.userData as {
    dockingPort: THREE.Object3D;
    setNoseOpen?: (k: number) => void;
  };
  // the nose cone opened before the approach (ESTIMATE: when). Rolled so the open cone stands on
  // the zenith side, clear of IDA-2's targets either side of the port (ESTIMATE: the roll).
  cu.setNoseOpen?.(1);
  chaser.rotation.y = -Math.PI / 2;
  chaser.updateMatrixWorld(true);
  const portLocal = cu.dockingPort.getWorldPosition(new THREE.Vector3());
  // measured standing, in the model's own frame, before it is turned
  const chaserBox = new THREE.Box3().setFromObject(chaser);
  const holder = new THREE.Group();
  const attitude = new THREE.Group();
  attitude.rotation.z = Math.PI / 2;
  attitude.add(chaser);
  holder.add(attitude);
  scene.add(holder);
  attitude.updateMatrixWorld(true);
  const portInHolder = portLocal.clone().applyQuaternion(attitude.quaternion);
  const chaserCentre = chaserBox
    .getCenter(new THREE.Vector3())
    .applyQuaternion(attitude.quaternion);
  const chaserLen = chaserBox.getSize(new THREE.Vector3()).y;

  // Four Draco plumes on the capsule's flank (ESTIMATE: which thrusters fired, and their direction).
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xd6e6ff,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  });
  const plumes: THREE.Mesh[] = [];
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

  // The 1/50 Earth's horizon lies ~46 km off: the stars sit beyond it, the far plane past them.
  stars.scale.setScalar(5);
  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 2e5);
  const total = dockingEnd();

  const update = (tIn: number, aspect: number): DockingPose => {
    const t = Math.min(total, Math.max(0, tIn));
    const pose = dockingPose(t, profile);
    holder.position.copy(portWorld).add(pose.offset).sub(portInHolder);
    holder.updateMatrixWorld(true);
    for (const pl of plumes) pl.visible = pose.burn != null;

    const fit = portraitFit(aspect);
    const portrait = aspect < 1;
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const cc = holder.position.clone().add(chaserCentre);
    // The shots. Far out, beside the craft on its sunlit side with the Earth's limb below (the
    // station is a speck that far); from Waypoint 0, side views that frame the craft and the port
    // end together; at the port, close in.
    const beside = (off: THREE.Vector3, fov: number) => ({
      position: cc.clone().addScaledVector(portrait ? V(off.x * 0.6, off.y, off.z) : off, fit),
      look: cc.clone().add(V(4, -1.5, 0)),
      fov,
    });
    // Over the craft's shoulder toward the port (on the sunlit -z side): the craft near and large,
    // the station beyond it.
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
      return { position: look.clone().addScaledVector(o, sep * 1.5 * fit), look, fov };
    };
    const shots: [number, ReturnType<typeof beside>][] = [
      [0, beside(V(-16, 5, -24), 44)],
      [stepOf('burn').t0, beside(V(-11, 4, -17), 44)],
      [stepOf('toWp0').t0, shoulder(30, 42)],
      [stepOf('toWp1').t0, shoulder(30, 42)],
      [stepOf('toWp2').t0, shoulder(26, 42)],
      [stepOf('hold').t0, pair(0.45, V(0.5, 0.35, -1), 38, 26)],
      [stepOf('final').t0, pair(0.5, V(0.35, 0.3, -1), 38, 16)],
      [stepOf('capture').t0, pair(0.5, V(0.6, 0.45, -1), 36, 11)],
      [
        stepOf('docked').t0,
        {
          position: portWorld.clone().add(V(48, 16, -38).multiplyScalar(fit)),
          look: portWorld.clone().add(V(-4, -1, 0)),
          fov: 40,
        },
      ],
    ];
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
    parts: { station, chaser: holder, port: end.userData.dockingPort },
    update,
    dispose,
  };
}
