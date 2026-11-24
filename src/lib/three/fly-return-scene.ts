/**
 * The /fly "way home" scene (Apollo 11 first): the LM ascent stage lifts off the Moon and leaves its
 * descent stage standing, reaches orbit, rendezvouses with the CSM, docks (with close-ups of the
 * probe entering the drogue), is jettisoned, and the CSM fires the SPS for trans-Earth injection.
 * Full frame, in its own scene; the pose and the camera are pure functions of scene time, so a
 * scrub is exact (the booster-return-scene.ts / descent-scene.ts pattern).
 *
 * Time is COMPRESSED, and the HUD says so: the real GET table (`getAt`) is piecewise linear through
 * the sourced event times (return-profile.ts), the scene seconds between them are editorial.
 * Sourced (Apollo 11 Mission Report, static/data/return-profiles/apollo11.json): every GET, the
 * 10 s vertical rise, the burn lengths, the insertion altitude. ESTIMATES (named in the profile's
 * `estimatedFields`): the vertical-rise acceleration, the shape of the ascent path and the pitch-over,
 * the rendezvous ranges and approach directions (not to scale), the docking closing speed, the
 * jettison drift, the attitude after insertion, the RCS puff pattern and every camera move.
 *
 * Frame: the anchor is the LM ascent stage's centre, local up is radial. The Moon sits below it
 * (`moonRel`), the descent stage on its surface (`descentRel`), so every number stays small
 * (millimetre precision at the docking close-up whatever the altitude).
 */
import * as THREE from 'three';
import type { RendezvousBurn, ReturnProfile } from '$lib/fly/return-profile';
import { plumeCone } from './engine-plume';

export const MOON_R_M = 1_737_400;
const FT = 0.3048;

/** Scene seconds of each beat start. Compressed; the sourced GETs are in `getAt`. */
export const RT = {
  hold: 0,
  ignition: 2.5,
  pitchOver: 12.5,
  insertion: 26,
  csi: 28,
  cdh: 31,
  tpi: 34,
  terminal: 37,
  dockWide: 42,
  approach: 46,
  closeUp: 52,
  contact: 57,
  hardDock: 58.6,
  pullBack: 60.8,
  jettison: 64,
  separate: 66,
  teiCoast: 72,
  teiBurn: 75.5,
  teiEnd: 80.5,
  end: 82,
} as const;

/** One real second of an RCS rendezvous burn is shown as this many scene seconds' worth: 1/16. */
const BURN_SCALE = 1 / 16;

export type ReturnBeat =
  | 'surface'
  | 'liftoff'
  | 'ascent'
  | 'insertion'
  | 'vernier'
  | 'csi'
  | 'cdh'
  | 'tpi'
  | 'terminal'
  | 'dock_wide'
  | 'dock_approach'
  | 'dock_closeup'
  | 'soft_capture'
  | 'hard_dock'
  | 'dock_pullback'
  | 'jettison'
  | 'tei_coast'
  | 'tei_burn'
  | 'fade';

/** Beats in order with their start (scene s). */
export const BEATS: readonly { id: ReturnBeat; t: number }[] = [
  { id: 'surface', t: RT.hold },
  { id: 'liftoff', t: RT.ignition },
  { id: 'ascent', t: RT.pitchOver },
  { id: 'insertion', t: RT.insertion },
  { id: 'csi', t: RT.csi },
  { id: 'cdh', t: RT.cdh },
  { id: 'tpi', t: RT.tpi },
  { id: 'terminal', t: RT.terminal },
  { id: 'dock_wide', t: RT.dockWide },
  { id: 'dock_approach', t: RT.approach },
  { id: 'dock_closeup', t: RT.closeUp },
  { id: 'soft_capture', t: RT.contact },
  { id: 'hard_dock', t: RT.hardDock },
  { id: 'dock_pullback', t: RT.pullBack },
  { id: 'jettison', t: RT.jettison },
  { id: 'tei_coast', t: RT.teiCoast },
  { id: 'tei_burn', t: RT.teiBurn },
  { id: 'fade', t: RT.teiEnd },
];

/** The beat a rendezvous burn plays under (the last burn is the terminal-phase finalisation). */
const BURN_BEAT: Record<RendezvousBurn['id'], ReturnBeat> = {
  vernier: 'vernier',
  csi: 'csi',
  cdh: 'cdh',
  tpi: 'tpi',
  tpf: 'terminal',
};

/** Scene time of each rendezvous burn's beat: the first at RT.csi, the last at RT.terminal, the
 *  rest evenly between (four burns land on csi, cdh, tpi, terminal exactly). */
export function burnSlots(
  p: Pick<ReturnProfile, 'rendezvous'>,
): { id: RendezvousBurn['id']; t: number }[] {
  const n = p.rendezvous.length;
  return p.rendezvous.map((b, i) => ({
    id: b.id,
    t: n === 1 ? RT.csi : RT.csi + ((RT.terminal - RT.csi) * i) / (n - 1),
  }));
}

/** The beats of one mission, in order: the rendezvous beats come from its profile's burn list. */
export function beatsFor(
  p?: Pick<ReturnProfile, 'rendezvous'>,
): readonly { id: ReturnBeat; t: number }[] {
  if (!p) return BEATS;
  const rend = burnSlots(p).map((b) => ({ id: BURN_BEAT[b.id], t: b.t }));
  const i0 = BEATS.findIndex((b) => b.id === 'csi');
  const i1 = BEATS.findIndex((b) => b.id === 'terminal');
  return [...BEATS.slice(0, i0), ...rend, ...BEATS.slice(i1 + 1)];
}

export function beatAt(t: number, p?: Pick<ReturnProfile, 'rendezvous'>): ReturnBeat {
  const beats = beatsFor(p);
  let id = beats[0].id;
  for (const b of beats) if (t >= b.t) id = b.id;
  return id;
}

export type ReturnShot =
  | 'ground'
  | 'chase'
  | 'orbit_wide'
  | 'rendezvous'
  | 'dock_wide'
  | 'dock_approach'
  | 'dock_close'
  | 'dock_pull'
  | 'jettison_track'
  | 'tei_side'
  // Per-mission styles (the profile's camera.shots picks them):
  | 'ground_low'
  | 'ground_tele'
  | 'chase_high'
  | 'chase_long'
  | 'orbit_nadir'
  | 'rendezvous_over'
  | 'rendezvous_side'
  | 'dock_csm'
  | 'jettison_high'
  | 'tei_front'
  | 'tei_high';

const SHOT_IDS: ReadonlySet<string> = new Set<ReturnShot>([
  'ground',
  'chase',
  'orbit_wide',
  'rendezvous',
  'dock_wide',
  'dock_approach',
  'dock_close',
  'dock_pull',
  'jettison_track',
  'tei_side',
  'ground_low',
  'ground_tele',
  'chase_high',
  'chase_long',
  'orbit_nadir',
  'rendezvous_over',
  'rendezvous_side',
  'dock_csm',
  'jettison_high',
  'tei_front',
  'tei_high',
]);

/** True when the name is a shot the scene can play (a profile's camera.shots is checked with it). */
export const isReturnShot = (v: string): v is ReturnShot => SHOT_IDS.has(v);

/** The shot of a beat for one mission: the profile's camera style over the default table. */
export function shotFor(beat: ReturnBeat, p?: Pick<ReturnProfile, 'camera'>): ReturnShot {
  const v = p?.camera?.shots?.[beat];
  return v !== undefined && isReturnShot(v) ? v : BEAT_SHOT[beat];
}

/** The shot the camera cuts to on each beat (the descent-director BEAT_SHOT pattern). */
export const BEAT_SHOT: Record<ReturnBeat, ReturnShot> = {
  surface: 'ground',
  liftoff: 'ground',
  ascent: 'chase',
  insertion: 'orbit_wide',
  vernier: 'rendezvous',
  csi: 'rendezvous',
  cdh: 'rendezvous',
  tpi: 'rendezvous',
  terminal: 'rendezvous',
  dock_wide: 'dock_wide',
  dock_approach: 'dock_approach',
  dock_closeup: 'dock_close',
  soft_capture: 'dock_close',
  hard_dock: 'dock_close',
  dock_pullback: 'dock_pull',
  jettison: 'jettison_track',
  tei_coast: 'tei_side',
  tei_burn: 'tei_side',
  fade: 'tei_side',
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The real GET (s) shown on the HUD: piecewise linear through the sourced event times. */
export function getAt(t: number, p: ReturnProfile): number {
  const knots: [number, number][] = [
    [0, p.liftoffS - RT.ignition],
    [RT.ignition, p.liftoffS],
    [RT.pitchOver, p.liftoffS + p.verticalRiseS],
    [RT.insertion, p.insertionS],
    ...burnSlots(p).map((b): [number, number] => [b.t, p.rendezvousS[b.id]!]),
    [RT.contact, p.dockingS],
    [RT.separate, p.jettisonS],
    [RT.teiBurn, p.teiS],
    [RT.teiEnd, p.teiS + p.tei.burnS],
    [RT.end, p.teiS + p.tei.burnS + 20],
  ];
  if (t <= knots[0][0]) return knots[0][1] - (knots[0][0] - t);
  for (let i = 1; i < knots.length; i++) {
    if (t <= knots[i][0]) {
      const [t0, g0] = knots[i - 1];
      const [t1, g1] = knots[i];
      return lerp(g0, g1, (t - t0) / (t1 - t0));
    }
  }
  return knots[knots.length - 1][1];
}

/** Where the scene's craft sit in the model frames; measured from the built models (defaults for tests). */
export interface ReturnRig {
  /** Height of the LM ascent stage centre above the footpads (m). */
  stageY0: number;
  /** The drogue anchor in the stage-centre frame (m). */
  drogue: THREE.Vector3;
  /** Probe tip to the CSM centre (m), along the CSM axis. */
  tipToCentre: number;
  /** How far the probe tip goes below the drogue plane at hard dock (m). */
  probeLen: number;
}

export const DEFAULT_RIG: ReturnRig = {
  stageY0: 4.9,
  drogue: new THREE.Vector3(0, 2.7, 0.2),
  tipToCentre: 5.6,
  probeLen: 0.9,
};

/** ESTIMATE: vertical rise acceleration (m/s^2): ascent-engine thrust over a ~4.7 t stage less lunar g. */
const RISE_ACCEL = 1.9;
/** ESTIMATE: the pitch-over reaches this angle from vertical by insertion. */
const PITCH_AT_INSERTION = (75 * Math.PI) / 180;

export interface ReturnPose {
  beat: ReturnBeat;
  shot: ReturnShot;
  /** Real GET (s) for the HUD clock. */
  get: number;
  /** Anchor height above the surface at the landing site's footpad plane (m). */
  altM: number;
  /** Ground angle swept from the landing site (rad): slides the Moon under the craft. */
  theta: number;
  /** LM ascent stage pitch from local vertical (rad, about z). */
  lmTilt: number;
  /** The ascent engine burns (ascent, then nothing else: the rendezvous burns are RCS). */
  lmEngine: boolean;
  /** LM RCS quads firing, 0..1 (the CSI, CDH, TPI and TPF burns, shown at 1/16 length). */
  lmRcs: number;
  /** The CSM is in the scene. */
  csmVisible: boolean;
  /** Probe tip relative to the drogue anchor, in the local frame, before the probe's insertion (m). */
  csmRel: [number, number, number];
  /** 0..1 how far the probe has gone into the drogue (1 = hard dock). */
  engage: number;
  /** Small misalignment of the CSM axis (rad) and roll about it. */
  csmTilt: [number, number];
  csmRoll: number;
  /** CSM nose rotation about z for TEI (rad); 0 = nose down on the LM. */
  csmNose: number;
  /** One flag per CSM RCS nozzle (rcs-<q>-<n>, index q * 4 + n). */
  csmRcs: boolean[];
  spsBurn: boolean;
  /** The ascent stage is attached to the CSM (soft capture to separation). */
  docked: boolean;
  /** 0..1 black fade over the end. */
  fade: number;
}

/** Cold-gas puffs: 0.25 s slots, `density` of a fixed pseudo-random set lit. */
function rcsFlags(t: number, n: number, density: number, seed: number): boolean[] {
  const slot = Math.floor(t / 0.25);
  return Array.from({ length: n }, (_, i) => {
    const h = Math.imul(slot * 31 + i * 17 + seed, 2654435761) >>> 0;
    return (h >>> 8) % 100 < density * 100;
  });
}

/** ESTIMATE: ranges of the rendezvous beats (m, not to scale), log-interpolated. */
const RANGE_KNOTS: [number, number][] = [
  [RT.csi, 90],
  [RT.cdh, 70],
  [RT.tpi, 55],
  [RT.terminal, 42],
  [RT.dockWide, 30],
  [RT.approach, 24],
  [RT.closeUp, 6],
];
/** ESTIMATE: the direction to the CSM at the start of the rendezvous (unit, from the LM). */
const DIR0 = new THREE.Vector3(0.93, 0.1, 0.35).normalize();

function rangeAt(t: number): number {
  if (t <= RANGE_KNOTS[0][0]) return RANGE_KNOTS[0][1];
  for (let i = 1; i < RANGE_KNOTS.length; i++) {
    if (t <= RANGE_KNOTS[i][0]) {
      const [t0, r0] = RANGE_KNOTS[i - 1];
      const [t1, r1] = RANGE_KNOTS[i];
      return Math.exp(lerp(Math.log(r0), Math.log(r1), smooth((t - t0) / (t1 - t0))));
    }
  }
  return RANGE_KNOTS[RANGE_KNOTS.length - 1][1];
}

/** The rendezvous burns' windows in scene time: each starts 0.1 s into its beat, 1/16 the real length. */
export function burnWindow(id: RendezvousBurn['id'], p: ReturnProfile): [number, number] {
  const start = burnSlots(p).find((b) => b.id === id)!.t + 0.1;
  const b = p.rendezvous.find((r) => r.id === id)!;
  // A short APS burn (Apollo 14's 3.6 s TPI) is held long enough to read.
  return [start, start + Math.max(b.burnS * BURN_SCALE, b.engine === 'aps' ? 0.7 : 0)];
}

/** Distance of the CSM's axis point from the LM: closing along the radial line for the last metres. */
export function returnPose(t: number, p: ReturnProfile): ReturnPose {
  const beat = beatAt(t, p);
  const ground = t < RT.insertion;
  // Altitude and ground angle: the 10 s vertical rise (real time), then the compressed ascent.
  const alt0 = DEFAULT_RIG.stageY0;
  const riseT = clamp01((t - RT.ignition) / (RT.pitchOver - RT.ignition)) * p.verticalRiseS;
  const lift = 0.5 * RISE_ACCEL * riseT * riseT;
  const u = clamp01((t - RT.pitchOver) / (RT.insertion - RT.pitchOver));
  const insAlt = p.insertion.altitudeFt * FT;
  const burnAlt = lerp(lift + alt0, insAlt, u ** 1.8);
  // After insertion the LM's burns lift it toward the CSM's orbit (sourced mean of 62 x 56 n.mi).
  const csmAlt = ((p.csmOrbitNmi[0] + p.csmOrbitNmi[1]) / 2) * 1852;
  const altM =
    t < RT.pitchOver
      ? alt0 + lift
      : t < RT.insertion
        ? burnAlt
        : lerp(insAlt, csmAlt, smooth((t - RT.insertion) / (RT.terminal - RT.insertion)));
  // Downrange: half the sourced end speed over the sourced burn (a linear speed ramp).
  const downrange = 0.5 * p.insertion.downrangeFts * FT * p.ascentBurnS;
  const thetaIns = downrange / MOON_R_M;
  const theta =
    t < RT.pitchOver
      ? 0
      : t < RT.insertion
        ? thetaIns * u * u
        : thetaIns + (t - RT.insertion) * 0.0006;
  const lmTilt =
    t < RT.pitchOver
      ? 0
      : t < RT.insertion
        ? PITCH_AT_INSERTION * u ** 0.7
        : PITCH_AT_INSERTION * (1 - smooth((t - RT.insertion) / 1.8));

  // LM RCS during the rendezvous burns.
  let lmRcs = 0;
  let apsBurn = false;
  for (const burn of p.rendezvous) {
    const [a, b] = burnWindow(burn.id, p);
    if (t >= a && t < b) {
      if (burn.engine === 'aps') apsBurn = true;
      else lmRcs = 1;
    }
  }

  // The CSM: a path to the radial line, then the sourced-pace-free docking approach.
  const csmVisible = t >= RT.csi - 0.5;
  let rel: [number, number, number] = [0, 0, 0];
  let engage = 0;
  let tilt: [number, number] = [0, 0];
  let roll = 0;
  let nose = 0;
  if (csmVisible) {
    if (t < RT.closeUp) {
      const r = rangeAt(t);
      // Mostly along-track until the dock-wide shot, then it swings onto the radial line.
      const k = smooth((t - RT.dockWide) / (RT.closeUp - RT.dockWide));
      const dir = DIR0.clone()
        .lerp(new THREE.Vector3(0, 1, 0), k)
        .normalize();
      rel = [dir.x * r, dir.y * r, dir.z * r];
      tilt = [0.05 * (1 - k), -0.04 * (1 - k)];
      roll = 0.35 * (1 - k);
    } else if (t < RT.contact) {
      // 6 m to contact: closing slows to a crawl; the last misalignment decays.
      const s = (t - RT.closeUp) / (RT.contact - RT.closeUp);
      const gap = 6 * (1 - s) ** 1.7;
      const lat = 0.12 * (1 - s) ** 2;
      rel = [lat * Math.cos(1.3), gap, lat * Math.sin(1.3)];
      tilt = [0.012 * (1 - s), -0.01 * (1 - s)];
      roll = 0.06 * (1 - s);
    } else if (t < RT.separate) {
      // Soft capture: the probe head enters the drogue, the probe retracts, the pair settles.
      const c = t - RT.contact;
      const soft = smooth(c / 1.0) * 0.45;
      const hard = smooth((t - RT.hardDock) / 0.9);
      const settle =
        t > RT.hardDock + 0.4
          ? 0.025 * Math.exp(-(t - RT.hardDock - 0.4) / 0.45) * Math.sin((t - RT.hardDock) * 9)
          : 0;
      engage = (t < RT.hardDock ? soft : lerp(0.45, 1, hard)) + settle;
      rel = [0, 0, 0];
    } else {
      // LM jettison: the probe withdraws, the CSM backs off on RCS, then turns for TEI.
      const j = t - RT.separate;
      engage = 1 - smooth(j / 0.8);
      const gap = 0.9 * Math.max(0, j - 0.4) ** 1.6;
      const burn = Math.max(0, t - RT.teiBurn);
      // ESTIMATE: the burn's real mean acceleration (999 m/s over 151 s), shown for 5 s.
      rel = [0.5 * 6.6 * burn * burn, gap, 0];
      nose = smooth((t - RT.teiCoast) / (RT.teiBurn - RT.teiCoast - 0.4)) * (Math.PI / 2);
    }
  }

  const teiBurning = t >= RT.teiBurn && t < RT.teiEnd;
  let rcs = new Array<boolean>(16).fill(false);
  if (csmVisible) {
    const quiet =
      (t >= RT.contact - 12 && t < RT.contact - 1) ||
      (t >= RT.separate + 0.4 && t < RT.teiBurn - 0.5);
    if (quiet) rcs = rcsFlags(t, 16, 0.22, 11);
  }

  return {
    beat,
    shot: shotFor(beat, p),
    get: getAt(t, p),
    altM,
    theta,
    lmTilt,
    lmEngine: (ground && t >= RT.ignition) || apsBurn,
    lmRcs,
    csmVisible,
    csmRel: rel,
    engage,
    csmTilt: tilt,
    csmRoll: roll,
    csmNose: nose,
    csmRcs: rcs,
    spsBurn: teiBurning,
    docked: t >= RT.contact && t < RT.separate,
    fade: smooth((t - RT.teiEnd) / (RT.end - RT.teiEnd)),
  };
}

/** Probe tip relative to the anchor (local frame), with the probe's insertion into the drogue. */
export function tipFromAnchor(pose: ReturnPose, rig: ReturnRig): THREE.Vector3 {
  const d = rig.drogue.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), pose.lmTilt);
  const [x, y, z] = pose.csmRel;
  return d.add(new THREE.Vector3(x, y - pose.engage * rig.probeLen, z));
}

/** The CSM centre relative to the anchor (it turns about this point for TEI, the nose turn aside). */
export function csmCentreFromAnchor(pose: ReturnPose, rig: ReturnRig): THREE.Vector3 {
  return tipFromAnchor(pose, rig).add(new THREE.Vector3(0, rig.tipToCentre, 0));
}

/** Where the descent stage's footpad origin sits relative to the anchor (local frame). */
export function descentRel(pose: ReturnPose): THREE.Vector3 {
  const th = pose.theta;
  return new THREE.Vector3(
    -MOON_R_M * Math.sin(th),
    -(MOON_R_M + pose.altM) + MOON_R_M * Math.cos(th),
    0,
  );
}

export interface ReturnCamera {
  pos: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
/** Half angles (rad) of the horizontal and vertical field of view. */
export function halfFov(fovDeg: number, aspect: number): { h: number; v: number } {
  const v = (fovDeg * Math.PI) / 360;
  return { v, h: Math.atan(Math.tan(v) * aspect) };
}
/** A phone's tall frame backs the camera off to keep the craft in shot. */
const aspectK = (aspect: number) => (aspect < 1 ? 1 + 0.7 * (1 / aspect - 1) : 1);

/** The camera of one scene time: a cut per beat (BEAT_SHOT), with moves inside each shot. */
export function returnCamera(
  t: number,
  aspect: number,
  pose: ReturnPose,
  rig: ReturnRig = DEFAULT_RIG,
): ReturnCamera {
  const k = aspectK(aspect);
  const tip = tipFromAnchor(pose, rig);
  const drogue = rig.drogue.clone();
  switch (pose.shot) {
    case 'ground': {
      // From the surface, following the stage up so it stays large; the look point leaves the
      // descent stage over the first seconds, which stays in frame while it is near.
      const dr = descentRel(pose);
      const up = pose.altM - rig.stageY0;
      const w = 0.5 * (1 - smooth((t - RT.ignition) / 8));
      const look = V(0, 0, 0).lerp(dr.clone().add(V(0, 1.5, 0)), w);
      const D = (30 + 0.3 * up) * k;
      return { pos: look.clone().add(V(0.42 * D, 0.1 * D, 0.9 * D)), look, fov: 38 };
    }
    case 'chase': {
      const s = smooth((t - RT.pitchOver) / (RT.insertion - RT.pitchOver));
      return {
        pos: V(lerp(-14, -34, s) * k, lerp(-4, 8, s), lerp(30, 58, s) * k),
        look: V(0, 0, 0),
        fov: 38,
      };
    }
    case 'orbit_wide':
      return { pos: V(-55 * k, 22, 100 * k), look: V(0, -6, 0), fov: 44 };
    case 'rendezvous': {
      // From behind the LM toward the CSM: the LM large in the foreground, the CSM beyond it
      // growing as it closes; aimed a little down so the Moon's limb sits in the lower frame.
      const csm = V(...pose.csmRel);
      const u = csm.clone().normalize();
      const { h, v } = halfFov(24 + 12, aspect);
      const c = 15 * k;
      const side = new THREE.Vector3().crossVectors(u, V(0, 1, 0)).normalize();
      const pos = u
        .clone()
        .multiplyScalar(-c)
        .addScaledVector(side, c * Math.tan(h * 0.45))
        .add(V(0, c * Math.tan(v * 0.25), 0));
      const aim = u.clone().applyAxisAngle(side, -0.14).normalize();
      return { pos, look: pos.clone().addScaledVector(aim, 100), fov: 36 };
    }
    case 'dock_wide':
    case 'dock_approach': {
      // A side two-shot framed by angle on both craft, a little above so the limb is below.
      const a0 = drogue;
      const b0 = V(0, Math.max(tip.y, drogue.y), 0).add(V(tip.x, 0, tip.z));
      const mid = a0.clone().add(b0).multiplyScalar(0.5);
      const sep = a0.distanceTo(b0);
      const { h, v } = halfFov(40, aspect);
      const D = ((sep / 2 + 7) / Math.tan(Math.min(h, v)) + sep / 2) * 1.05;
      return { pos: mid.clone().add(V(0.45 * D, 0.1 * D, 0.89 * D)), look: mid, fov: 40 };
    }
    case 'dock_close': {
      // The probe tip against the drogue: from the side and above, so the LM roof is the backdrop;
      // it starts wide enough for the tip's last 6 m and closes to a ~1.5 m window.
      const gap = Math.max(0, tip.y - drogue.y);
      const g = Math.min(gap, 6);
      const look = drogue.clone().add(V(0, g * 0.5 + 0.15, 0));
      const d = (2.2 + 2.4 * g) * (0.8 + 0.2 * k);
      return { pos: look.clone().add(V(0.5 * d, 0.24 * d, 0.84 * d)), look, fov: 30 };
    }
    case 'dock_pull': {
      const s = smooth((t - RT.pullBack) / (RT.jettison - RT.pullBack));
      const centre = V(0, drogue.y + rig.tipToCentre * 0.5 - rig.probeLen * 0.5, 0.2);
      const from = drogue.clone().add(V(1.1, 0.4, 1.7));
      const to = centre.clone().add(V(14 * k, 1.5, 22 * k));
      return { pos: from.lerp(to, s), look: drogue.clone().lerp(centre, s), fov: 30 };
    }
    case 'jettison_track': {
      const c = csmCentreFromAnchor(pose, rig);
      const mid = c.clone().multiplyScalar(0.5);
      const d = (28 + 1.4 * Math.hypot(c.x, c.y)) * k;
      return { pos: mid.clone().add(V(0.5 * d, 0.1 * d, 0.86 * d)), look: mid, fov: 32 };
    }
    case 'tei_side': {
      const c = csmCentreFromAnchor(pose, rig);
      const s = smooth((t - RT.teiCoast) / (RT.end - RT.teiCoast));
      const off = V(lerp(-12, -24, s) * k, lerp(2.5, 3.5, s), lerp(26, 38, s) * k);
      return { pos: c.clone().add(off), look: c, fov: 34 };
    }
    // ─ Per-mission styles (profile camera.shots). Every number below is an editorial ESTIMATE. ─
    case 'ground_low': {
      // Low across the regolith (a lens at about 1.5 m, the Surveyor 3 crater site's flat floor):
      // it pulls back as the stage climbs, aimed 45% of the way up so the horizon stays in frame.
      const dr = descentRel(pose);
      const up = pose.altM - rig.stageY0;
      const D = (36 + 0.6 * up) * k;
      const eye = dr.y + 1.5;
      return {
        pos: V(-0.5 * D, eye, 0.86 * D),
        look: V(0, eye * 0.55, 0),
        fov: 46 + 6 * smooth(up / 90),
      };
    }
    case 'ground_tele': {
      // A long lens from the far side and well back: the stage rises out of the hills.
      const dr = descentRel(pose);
      const up = pose.altM - rig.stageY0;
      const w = 0.5 * (1 - smooth((t - RT.ignition) / 8));
      const look = V(0, 0, 0).lerp(dr.clone().add(V(0, 1.5, 0)), w);
      const D = (70 + 0.55 * up) * k;
      return { pos: look.clone().add(V(-0.7 * D, 0.14 * D, -0.7 * D)), look, fov: 26 };
    }
    case 'chase_high': {
      // From behind and above: the Moon fills the lower frame and the stage runs away from us.
      const s = smooth((t - RT.pitchOver) / (RT.insertion - RT.pitchOver));
      return {
        pos: V(lerp(16, 38, s) * k, lerp(16, 34, s), lerp(34, 60, s) * k),
        look: V(lerp(-3, -8, s), 0, 0),
        fov: 40,
      };
    }
    case 'chase_long': {
      // One slow move from the end of the vertical rise through insertion: no cut to a wide shot.
      const s = smooth((t - RT.pitchOver) / (RT.csi - RT.pitchOver));
      return {
        pos: V(lerp(-14, -34, s) * k, lerp(-4, 9, s), lerp(30, 46, s) * k),
        look: V(lerp(0, 3, s), 0, 0),
        fov: 38,
      };
    }
    case 'orbit_nadir':
      // Straight down on the stage with the Moon filling the frame behind it.
      return { pos: V(-18 * k, 70, 44 * k), look: V(0, -22, 0), fov: 44 };
    case 'rendezvous_over': {
      // From the CSM's side of the gap, behind and above it, looking back across to the rising LM
      // with the Moon below: the CSM large in the foreground, the LM beyond.
      const c = csmCentreFromAnchor(pose, rig);
      const u = c.clone().normalize();
      const side = new THREE.Vector3().crossVectors(u, V(0, 1, 0)).normalize();
      const pos = c
        .clone()
        .addScaledVector(u, 38 * k)
        .addScaledVector(side, 14 * k)
        .add(V(0, 12 + 4 * k, 0));
      const look = c.clone().multiplyScalar(0.45);
      return { pos, look, fov: 40 };
    }
    case 'rendezvous_side': {
      // Close from the LM's side, level with it, the CSM ahead across the gap.
      const c = csmCentreFromAnchor(pose, rig);
      const u = c.clone().normalize();
      const side = new THREE.Vector3().crossVectors(u, V(0, 1, 0)).normalize();
      const { h, v } = halfFov(50, aspect);
      const sep = c.length();
      const d = ((sep / 2 + 8) / Math.tan(Math.min(h, v))) * 0.95;
      const mid = c.clone().multiplyScalar(0.5);
      return {
        pos: mid
          .clone()
          .addScaledVector(side, d * 0.85)
          .add(V(0, 0.2 * d, 0)),
        look: mid,
        fov: 50,
      };
    }
    case 'dock_csm': {
      // Roosa's view: from the CSM's side window, just behind the probe, down at the drogue (used
      // from the close-up on, once the CSM sits on the radial line above the LM).
      const gap = Math.max(0, tip.y - drogue.y);
      const look = drogue.clone().add(V(0, Math.min(gap, 4) * 0.2, 0));
      const pos = tip.clone().add(V(2.3 * (0.8 + 0.2 * k), 1.9 + 0.04 * Math.min(gap, 24), 0.9));
      return { pos, look, fov: 50 };
    }
    case 'jettison_high': {
      // From the other side and above: the ascent stage drops away below the CSM.
      const c = csmCentreFromAnchor(pose, rig);
      const mid = c.clone().multiplyScalar(0.5);
      const d = (28 + 1.4 * Math.hypot(c.x, c.y)) * k;
      return { pos: mid.clone().add(V(-0.62 * d, 0.5 * d, 0.6 * d)), look: mid, fov: 34 };
    }
    case 'tei_front': {
      // Ahead of the burn and a little below, the nose coming at the lens.
      const c = csmCentreFromAnchor(pose, rig);
      const s = smooth((t - RT.teiCoast) / (RT.end - RT.teiCoast));
      const off = V(lerp(36, 30, s) * k, lerp(-2, -5, s), lerp(18, 26, s) * k);
      return { pos: c.clone().add(off), look: c, fov: 36 };
    }
    case 'tei_high': {
      // From above and behind: the Moon below the CSM as it pulls away.
      const c = csmCentreFromAnchor(pose, rig);
      const s = smooth((t - RT.teiCoast) / (RT.end - RT.teiCoast));
      const off = V(lerp(-10, -20, s) * k, lerp(16, 22, s), lerp(24, 34, s) * k);
      return { pos: c.clone().add(off), look: c, fov: 36 };
    }
  }
}

// ─── the scene ──────────────────────────────────────────────────────────────────────────────

export interface FlyReturnModels {
  /** buildApolloLunarModule(): footpads on y = 0. */
  lm: THREE.Group;
  /** apollo-csm-block-ii: engine exit at y = 0, the probe tip the highest point on the axis. */
  csm: THREE.Group;
}

export interface FlyReturnOptions {
  /** The Moon map (static/textures/2k_moon.jpg); a plain grey sphere without it. */
  moonTextureUrl?: string;
  /** The landing site, to turn the Moon map under the craft. */
  site?: { lat: number; lon: number };
  /** The ground detail texture (descent-ground.ts), null without a DOM. */
  groundTexture?: THREE.Texture | null;
  /** Patch the cap's material with the detail layers (browser only). */
  applyGround?: (mat: THREE.MeshStandardMaterial, tex: THREE.Texture, unitsPerKm: number) => void;
}

export interface FlyReturn {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  profile: ReturnProfile;
  rig: ReturnRig;
  /** Pose and frame the scene for scene time `t`. */
  update: (t: number, aspect: number) => ReturnPose;
  dispose: () => void;
}

/** A flame: additive cones with a hotter core, apex at the origin, opening along +y.
 *  `opacity` scales both; the materials are kept in userData for the per-frame flash. */
function exhaust(
  r: number,
  len: number,
  hot = 0xfff0c8,
  cool = 0xff9a4a,
  opacity = 1,
): THREE.Group {
  const g = new THREE.Group();
  const mats: [THREE.MeshBasicMaterial, number][] = [];
  for (const [rr, ll, c, o] of [
    [r, len, cool, 0.5 * opacity],
    [r * 0.45, len * 0.55, hot, 0.85 * opacity],
  ] as const) {
    const cone = plumeCone(rr, ll, c, o);
    cone.rotation.x = Math.PI; // apex to the nozzle
    cone.position.y = ll / 2;
    g.add(cone);
    mats.push([cone.material as THREE.MeshBasicMaterial, o]);
  }
  g.userData.mats = mats;
  g.visible = false;
  return g;
}

/** A hypergolic engine in vacuum: a short, faint, pale glow (Aerozine 50 / N2O4 has almost no
 *  visible plume), brighter for the first moments after ignition. */
function setGlow(g: THREE.Group, flash: number): void {
  for (const [m, base] of g.userData.mats as [THREE.MeshBasicMaterial, number][]) {
    m.opacity = Math.min(1, base * (1 + 5 * flash));
  }
}

export function createFlyReturn(
  profile: ReturnProfile,
  models: FlyReturnModels,
  opts: FlyReturnOptions = {},
): FlyReturn {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const sun = new THREE.DirectionalLight(0xfff6ea, 3.6);
  sun.position.set(-60, 75, 95);
  scene.add(sun, new THREE.HemisphereLight(0x9fa9c4, 0x2a2724, 0.4));

  // Stars: one draw call, kept centred on the camera.
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const a = Math.imul(i + 1, 2654435761) >>> 0;
    const b = Math.imul(i + 7, 40503) >>> 0;
    const lon = (a / 4294967296) * Math.PI * 2;
    const y = (b / 4294967296) * 2 - 1;
    const rr = Math.sqrt(1 - y * y);
    sp.set([Math.cos(lon) * rr * 3e6, y * 3e6, Math.sin(lon) * rr * 3e6], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false }),
  );
  stars.frustumCulled = false;
  scene.add(stars);

  // The Moon: the whole sphere for orbit, a local cap round the landing site for the surface.
  const moon = new THREE.Group();
  const moonMat = new THREE.MeshStandardMaterial({ color: 0x8e8c88, roughness: 1, metalness: 0 });
  let moonTex: THREE.Texture | null = null;
  if (opts.moonTextureUrl) {
    const tex = new THREE.TextureLoader().load(opts.moonTextureUrl, () => {
      moonMat.color.set(0xffffff);
      moonMat.needsUpdate = true;
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    moonMat.map = tex;
    moonTex = tex;
  }
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(MOON_R_M, 192, 96), moonMat);
  if (opts.site) {
    // Equirectangular map: put the landing site's direction on +y, where the cap and the descent stage are.
    const { lat, lon } = opts.site;
    const u = (lon + 180) / 360;
    const cl = Math.cos((lat * Math.PI) / 180);
    const dir = new THREE.Vector3(
      -Math.cos(2 * Math.PI * u) * cl,
      Math.sin((lat * Math.PI) / 180),
      Math.sin(2 * Math.PI * u) * cl,
    );
    sphere.quaternion.setFromUnitVectors(dir, new THREE.Vector3(0, 1, 0));
  }
  moon.add(sphere);
  /** The local cap (ground detail) is used below this altitude, the whole sphere above it. */
  const CAP_ALT_M = 26_000;
  // 0.4 rad (700 km) reaches past the insertion point (367 km downrange) and its horizon.
  const CAP_REACH = 0.4;
  const capMat = new THREE.MeshStandardMaterial({ color: 0x9a9792, roughness: 1, metalness: 0 });
  if (opts.groundTexture && opts.applyGround) opts.applyGround(capMat, opts.groundTexture, 1000);
  const capGeo = new THREE.SphereGeometry(MOON_R_M, 128, 72, 0, Math.PI * 2, 0, CAP_REACH);
  capGeo.translate(0, -MOON_R_M, 0);
  const cap = new THREE.Mesh(capGeo, capMat);
  cap.position.y = MOON_R_M;
  // Above 3 km the same cap with 8x coarser detail tiles, so craters still read from orbit.
  const capFarMat = capMat.clone();
  if (opts.groundTexture && opts.applyGround) opts.applyGround(capFarMat, opts.groundTexture, 8000);
  const capFar = new THREE.Mesh(capGeo, capFarMat);
  capFar.position.y = MOON_R_M;
  moon.add(cap, capFar);
  scene.add(moon);

  // The LM: the descent stage stays where it landed; the ascent stage becomes the anchor.
  const lmRoot = models.lm;
  lmRoot.updateMatrixWorld(true);
  const asc = lmRoot.getObjectByName('ascent-stage')!;
  const c = new THREE.Box3().setFromObject(asc).getCenter(new THREE.Vector3());
  const ascent = new THREE.Group();
  ascent.position.copy(c);
  lmRoot.add(ascent);
  ascent.updateMatrixWorld(true);
  ascent.attach(asc);
  ascent.removeFromParent();
  scene.add(lmRoot, ascent);
  const drogueAnchor = asc.getObjectByName('docking-drogue')!;
  ascent.updateMatrixWorld(true);
  const rig: ReturnRig = {
    ...DEFAULT_RIG,
    stageY0: c.y,
    drogue: drogueAnchor.getWorldPosition(new THREE.Vector3()).sub(ascent.position),
  };

  // The CSM, pivoting about its middle.
  const csmHolder = new THREE.Group();
  const csm = models.csm;
  csm.updateMatrixWorld(true);
  const tipObj = csm.getObjectByName('probe-tip')!;
  const tipY = tipObj.getWorldPosition(new THREE.Vector3()).y;
  const probeBaseY = csm.getObjectByName('docking-probe')!.getWorldPosition(new THREE.Vector3()).y;
  csm.position.y = -tipY / 2;
  csmHolder.add(csm);
  csmHolder.visible = false;
  scene.add(csmHolder);
  rig.tipToCentre = tipY / 2;
  rig.probeLen = tipY - probeBaseY;

  // Flames: the ascent engine and the SPS on their exit anchors (+y along the exhaust).
  const ascentFlame = exhaust(0.35, 2.6, 0xffffff, 0xc8d4ff, 0.22);
  asc.getObjectByName('ascent-engine-exit')!.add(ascentFlame);
  const spsFlame = exhaust(1.1, 5.5, 0xffffff, 0xc8d4ff, 0.22);
  csm.getObjectByName('engine-exit')!.add(spsFlame);
  // RCS puffs: cold white, at the CSM's named nozzles and the LM's four quads.
  const puff = (r: number, len: number) => {
    const g = exhaust(r, len, 0xffffff, 0xdfe8ff);
    return g;
  };
  const csmPuffs = Array.from({ length: 16 }, (_, i) => {
    const q = Math.floor(i / 4);
    const n = i % 4;
    const p = puff(0.1, 1.1);
    csm.getObjectByName(`rcs-${q}-${n}`)?.add(p);
    return p;
  });
  const lmQuads = [0, 1, 2, 3].map((i) => asc.getObjectByName(`lm-rcs-quad-${i}`)!);
  const lmPuffs = lmQuads.map(() => {
    const p = puff(0.12, 1.4);
    p.rotation.z = Math.PI / 2; // +y to -x: thrusting prograde
    scene.add(p);
    return p;
  });

  const camera = new THREE.PerspectiveCamera(36, 1.6, 0.05, 6_000_000);
  const qTmp = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const Y180 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);

  return {
    scene,
    camera,
    profile,
    rig,
    update: (t, aspect) => {
      const pose = returnPose(t, profile);
      const alt = pose.altM;
      moon.position.set(0, -(MOON_R_M + alt), 0);
      moon.rotation.z = pose.theta;
      cap.visible = alt < 3000;
      capFar.visible = alt >= 3000 && alt < CAP_ALT_M;
      sphere.visible = alt >= CAP_ALT_M;
      lmRoot.position.copy(descentRel(pose));
      lmRoot.visible = alt < 8000;
      ascent.position.set(0, 0, 0);
      ascent.rotation.set(0, 0, pose.lmTilt);
      ascentFlame.visible = pose.lmEngine;
      const flick = 0.82 + 0.18 * Math.sin(t * 53);
      // The ascent engine fires over the descent stage: the flame is only as long as the clear
      // height at first, then the full length.
      const clear = Math.min(1, (alt - rig.stageY0 + 1.2) / 9);
      ascentFlame.scale.set(1, flick * Math.max(0.3, clear), 1);
      setGlow(ascentFlame, Math.max(0, 1 - (t - RT.ignition) / 0.6));
      lmPuffs.forEach((p, i) => {
        p.visible = pose.lmRcs > 0 && ((Math.floor(t / 0.2) + i) & 1) === 0;
        if (p.visible) lmQuads[i].getWorldPosition(p.position);
      });

      csmHolder.visible = pose.csmVisible;
      if (pose.csmVisible) {
        // Nose down on the LM (a half turn about x), turned about z for TEI, with the small
        // misalignment and roll of the approach.
        eul.set(pose.csmTilt[0], pose.csmRoll, pose.csmTilt[1]);
        qTmp.setFromAxisAngle(new THREE.Vector3(0, 0, 1), pose.csmNose + pose.lmTilt);
        csmHolder.quaternion.copy(qTmp).multiply(new THREE.Quaternion().setFromEuler(eul));
        csmHolder.quaternion.multiply(Y180);
        csmHolder.position.copy(csmCentreFromAnchor(pose, rig));
      }
      csmPuffs.forEach((p, i) => (p.visible = pose.csmRcs[i]));
      spsFlame.visible = pose.spsBurn;
      spsFlame.scale.set(1, flick, 1);
      setGlow(spsFlame, Math.max(0, 1 - (t - RT.teiBurn) / 0.6));

      const cam = returnCamera(t, aspect, pose, rig);
      camera.position.copy(cam.pos);
      camera.lookAt(cam.look);
      camera.fov = cam.fov;
      camera.aspect = aspect;
      camera.near = Math.max(0.05, cam.pos.distanceTo(cam.look) * 0.04);
      camera.updateProjectionMatrix();
      stars.position.copy(cam.pos);
      return pose;
    },
    dispose: () => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
      });
      moonTex?.dispose();
      opts.groundTexture?.dispose();
    },
  };
}
