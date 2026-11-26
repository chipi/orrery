/**
 * The /fly winged return (W12, STS-1 first): the deorbit burn, the entry at a high angle of attack
 * with its roll reversals, then a cut to the runway: the energy-management leg, the heading
 * alignment turn, the steep final approach, the preflare, gear down, main-gear touchdown, the nose
 * coming down and the rollout to the stop. Full frame, in its own scene, after the Earth-orbit
 * coast; pose and camera are pure functions of scene time (the fly-deploy-scene.ts pattern).
 *
 * Time is COMPRESSED, and the HUD says so; the real MET (`metAt`) runs through the profile's
 * times, of which only the touchdown is flown (the rest are the press kit's plan offsets, so the
 * clock reads "~" everywhere else). Sourced (winged-profile.ts): the deorbit burn length, the
 * entry interface height, the Mach numbers of the roll reversals, the TAEM point, the 20 deg and
 * 1.5 deg glideslopes, the preflare and gear-down heights, the touchdown speed and the runway
 * distances (mains, nose gear, stop). ESTIMATES: the attitudes (40 deg alpha early, the bank
 * angles, the pitch at touchdown), the heading alignment turn's radius and sweep, the outer
 * glideslope's aim point, the ground track before it, the sky, and every camera move.
 *
 * Two frames. The entry: the orbiter at the origin, the Earth at 1/1000 of its size and distance
 * below. The runway (from TAEM): metres, the landing threshold at the origin, the runway along +z,
 * the craft hung from its main-gear contact point so the touchdown and derotation pivot there.
 */
import * as THREE from 'three';
import type { WingedProfile } from '$lib/fly/winged-profile';
import { plumeCone } from './engine-plume';
import { portraitFit } from './phone-framing';

const FT = 0.3048;
const NMI = 1852;
const EARTH_R_M = 6_371_000;
const EARTH_SCALE = 1 / 1000;
const DEG = Math.PI / 180;

/** Scene seconds of each beat start. */
export const WT = {
  deorbit: 0,
  coast: 8,
  entry: 14,
  rev1: 30,
  rev2: 34,
  rev3: 38,
  rev4: 41,
  taem: 44,
  hac: 50,
  final: 60,
  preflare: 74,
  gear: 79,
  touchdown: 84,
  nose: 88,
  rollout: 90,
  stop: 100,
  end: 103,
} as const;

export type WingedBeat =
  | 'deorbit'
  | 'coast'
  | 'entry'
  | 'reversal'
  | 'taem'
  | 'hac'
  | 'final'
  | 'preflare'
  | 'gear'
  | 'touchdown'
  | 'nose'
  | 'rollout';

const BEATS: { id: WingedBeat; t: number }[] = [
  { id: 'deorbit', t: WT.deorbit },
  { id: 'coast', t: WT.coast },
  { id: 'entry', t: WT.entry },
  { id: 'reversal', t: WT.rev1 },
  { id: 'taem', t: WT.taem },
  { id: 'hac', t: WT.hac },
  { id: 'final', t: WT.final },
  { id: 'preflare', t: WT.preflare },
  { id: 'gear', t: WT.gear },
  { id: 'touchdown', t: WT.touchdown },
  { id: 'nose', t: WT.nose },
  { id: 'rollout', t: WT.rollout },
];
const REV_T = [WT.rev1, WT.rev2, WT.rev3, WT.rev4];

export function beatsFor(): readonly { id: WingedBeat; t: number }[] {
  return BEATS;
}

export function beatAt(t: number): WingedBeat {
  let id: WingedBeat = 'deorbit';
  for (const b of BEATS) if (t >= b.t) id = b.id;
  return id;
}

/** The roll reversal under way at `t` (0-based), or -1. */
export function reversalAt(t: number, p: Pick<WingedProfile, 'entry'>): number {
  let k = -1;
  for (let i = 0; i < Math.min(REV_T.length, p.entry.reversalsMach.length); i++)
    if (t >= REV_T[i]) k = i;
  return t < WT.taem ? k : -1;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const c = clamp01(x);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ramp = (t: number, t0: number, t1: number) => smooth((t - t0) / (t1 - t0));

/** Real rollout length (s) after the touchdown, for the clock: ESTIMATE (not found flown). */
const ROLLOUT_S = 60;

/** The real MET (s) on the HUD, piecewise linear through the profile's times. */
export function metAt(t: number, p: WingedProfile): number {
  const k: [number, number][] = [
    [WT.deorbit + 1, p.deorbitS],
    [WT.deorbit + 7, p.deorbitS + p.deorbit.burnS],
    [WT.entry, p.entryS],
    [WT.taem, p.taemS],
    [WT.touchdown, p.touchdownS],
    [WT.stop, p.touchdownS + ROLLOUT_S],
  ];
  if (t <= k[0][0]) return k[0][1] - (k[0][0] - t);
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const [t0, g0] = k[i - 1];
      const [t1, g1] = k[i];
      return lerp(g0, g1, (t - t0) / (t1 - t0));
    }
  }
  return k[k.length - 1][1] + (t - k[k.length - 1][0]);
}

/** The clock is flown only at the touchdown; elsewhere it is the plan's offsets ("~"). */
export const metIsEstimate = (t: number): boolean => Math.abs(t - WT.touchdown) > 0.25;

// ── the runway leg: a ground track and a height profile ──

/** Heading alignment turn: left-hand (STS-1 plan), radius and sweep ESTIMATES. */
const HAC_R_M = 6000;
const HAC_SWEEP = 210 * DEG;
/** The final approach starts at 10,000 ft (the A/L interface); the outer glideslope's aim point
 *  lies this far before the touchdown point: ESTIMATE. */
const FINAL_START_FT = 10_000;
const OGS_AIM_M = 2200;
/** Body pitch on the outer glideslope and at touchdown (deg): ESTIMATES. */
const PITCH_FINAL = -12;
const PITCH_TOUCHDOWN = 8;

export interface RunwayLeg {
  /** Touchdown point (m past the threshold) and the stop. */
  zTd: number;
  zNose: number;
  zStop: number;
  /** Along-track length of the final approach to the touchdown (m). */
  dFinal: number;
  /** The TAEM leg (straight) and the turn's arc (m). */
  lTaem: number;
  lArc: number;
  hacCentre: THREE.Vector2;
  phi0: number;
  taemStart: THREE.Vector3;
  taemDir: THREE.Vector2;
}

/** Height (m) on the final approach `d` metres before the touchdown: the 20 deg outer glideslope
 *  eased into the 1.5 deg inner one (a smooth maximum of the two lines). */
export function finalHeight(d: number, p: Pick<WingedProfile, 'approach'>): number {
  const inner = Math.max(0, d) * Math.tan(p.approach.innerGlideDeg * DEG);
  const outer = (d - OGS_AIM_M) * Math.tan(p.approach.outerGlideDeg * DEG);
  const k = 60;
  const smoothMax = (a: number, b: number) => (a + b + Math.sqrt((a - b) ** 2 + k * k)) / 2;
  if (d <= 0) return 0;
  // less the smooth maximum's offset at d = 0, so the wheels meet the ground at the touchdown point
  const at0 = smoothMax(0, -OGS_AIM_M * Math.tan(p.approach.outerGlideDeg * DEG));
  return smoothMax(inner, outer) - at0;
}

export function runwayLeg(p: WingedProfile): RunwayLeg {
  const zTd = p.touchdown.mainFt * FT;
  const zNose = (p.touchdown.mainFt + p.touchdown.noseAfterMainFt) * FT;
  const zStop = p.rollout.stopFt * FT;
  const tanO = Math.tan(p.approach.outerGlideDeg * DEG);
  const dFinal = OGS_AIM_M + (FINAL_START_FT * FT) / tanO;
  const zF = zTd - dFinal;
  // Left-hand turn ending on the runway heading (+z) at (0, zF): the centre to the left (+x).
  const hacCentre = new THREE.Vector2(HAC_R_M, zF);
  const phi0 = Math.PI + HAC_SWEEP;
  const lArc = HAC_R_M * HAC_SWEEP;
  const lTaem = Math.max(5000, p.taem.rangeNmi * NMI - lArc - dFinal);
  const entry = new THREE.Vector2(
    hacCentre.x + HAC_R_M * Math.cos(phi0),
    hacCentre.y + HAC_R_M * Math.sin(phi0),
  );
  // travelling with decreasing phi: direction (sin phi, -cos phi)
  const taemDir = new THREE.Vector2(Math.sin(phi0), -Math.cos(phi0)).normalize();
  const taemStart = new THREE.Vector3(
    entry.x - taemDir.x * lTaem,
    p.taem.altFt * FT,
    entry.y - taemDir.y * lTaem,
  );
  return { zTd, zNose, zStop, dFinal, lTaem, lArc, hacCentre, phi0, taemStart, taemDir };
}

export interface WingedPose {
  t: number;
  met: number;
  beat: WingedBeat;
  /** 'entry' frame (Earth below the craft) or 'runway' frame (metres from the threshold). */
  frame: 'entry' | 'runway';
  /** Entry frame: altitude (m). Runway frame: the main-gear contact point. */
  altM: number;
  pos: THREE.Vector3;
  /** Heading (rad, 0 = +z), pitch (deg, nose up +), bank (deg, right wing down +). */
  yaw: number;
  pitchDeg: number;
  bankDeg: number;
  gear: number;
  /** Entry heating glow 0..1. */
  plasma: number;
  oms: boolean;
  onGround: boolean;
}

function entryPose(t: number, p: WingedProfile): Omit<WingedPose, 't' | 'met' | 'beat'> {
  const orbitAltM = 300_000;
  const eiAltM = p.entry.altFt * FT;
  const taemAltM = p.taem.altFt * FT;
  const u = (t - WT.entry) / (WT.taem - WT.entry);
  const altM =
    t < WT.entry
      ? lerp(orbitAltM, eiAltM, ramp(t, WT.coast - 2, WT.entry))
      : lerp(eiAltM, taemAltM, 0.65 * clamp01(u) + 0.35 * smooth(u));
  // Tail first for the burn, then turned round and pitched up to 40 deg (ESTIMATE), easing to the
  // 14 deg of the workbook's Mach 2.5 row by TAEM.
  const turn = ramp(t, WT.coast, WT.coast + 4);
  const yaw = Math.PI * (1 - turn);
  const alpha = t < WT.rev3 ? 40 : lerp(40, 14, ramp(t, WT.rev3, WT.taem));
  const pitchDeg = lerp(0, alpha, turn);
  // Bank: 37 deg above Mach 10, 20 deg below (workbook crossrange figures; the sign flips at each
  // reversal), entered after the entry interface.
  let sign = 1;
  for (let i = 0; i < REV_T.length && i < p.entry.reversalsMach.length; i++) {
    sign = lerp(sign, -sign, ramp(t, REV_T[i], REV_T[i] + 1.6));
  }
  const mag = t < WT.rev2 ? 37 : 20;
  const bankDeg = sign * mag * ramp(t, WT.entry + 2, WT.entry + 5);
  const plasma = ramp(t, WT.entry, WT.entry + 4) * (1 - ramp(t, WT.rev2 - 1, WT.rev3 + 2));
  return {
    frame: 'entry',
    altM,
    pos: new THREE.Vector3(),
    yaw,
    pitchDeg,
    bankDeg,
    gear: 0,
    plasma,
    oms: t >= WT.deorbit + 1 && t < WT.deorbit + 7,
    onGround: false,
  };
}

function runwayPose(t: number, p: WingedProfile): Omit<WingedPose, 't' | 'met' | 'beat'> {
  const L = runwayLeg(p);
  let pos: THREE.Vector3;
  let yaw = 0;
  let bankDeg = 0;
  let pitchDeg: number;
  const hacEnd = L.lTaem + L.lArc;
  const finalStartAlt = FINAL_START_FT * FT;
  if (t < WT.final) {
    // TAEM leg then the turn, at an even pace; height linear from the TAEM point to 10,000 ft.
    const s = lerp(0, hacEnd, (t - WT.taem) / (WT.final - WT.taem));
    const h = lerp(L.taemStart.y, finalStartAlt, s / hacEnd);
    if (s < L.lTaem) {
      pos = new THREE.Vector3(L.taemStart.x + L.taemDir.x * s, h, L.taemStart.z + L.taemDir.y * s);
      yaw = Math.atan2(L.taemDir.x, L.taemDir.y);
    } else {
      const phi = L.phi0 - (s - L.lTaem) / HAC_R_M;
      pos = new THREE.Vector3(
        L.hacCentre.x + HAC_R_M * Math.cos(phi),
        h,
        L.hacCentre.y + HAC_R_M * Math.sin(phi),
      );
      yaw = Math.atan2(Math.sin(phi), -Math.cos(phi));
      bankDeg = -40 * ramp(s, L.lTaem, L.lTaem + 1500) * (1 - ramp(s, hacEnd - 1500, hacEnd));
    }
    pitchDeg = lerp(4, PITCH_FINAL, ramp(t, WT.hac, WT.final));
  } else if (t < WT.touchdown) {
    // Final: along the runway centreline, decelerating into the flare.
    const u = (t - WT.final) / (WT.touchdown - WT.final);
    const d = L.dFinal * (1 - u) * (1 - 0.45 * u);
    pos = new THREE.Vector3(0, finalHeight(d, p), L.zTd - d);
    pitchDeg = lerp(PITCH_FINAL, PITCH_TOUCHDOWN, ramp(t, WT.preflare, WT.touchdown - 0.5));
  } else {
    // Rollout: decelerating to the stop; the nose comes down by the nose-gear distance.
    const u = clamp01((t - WT.touchdown) / (WT.stop - WT.touchdown));
    const z = L.zTd + (L.zStop - L.zTd) * (1 - (1 - u) ** 2);
    pos = new THREE.Vector3(0, 0, z);
    pitchDeg = PITCH_TOUCHDOWN * (1 - smooth((z - L.zTd) / (L.zNose - L.zTd)));
  }
  return {
    frame: 'runway',
    altM: pos.y,
    pos,
    yaw,
    pitchDeg,
    bankDeg,
    gear: ramp(t, WT.gear, WT.gear + 2.5),
    plasma: 0,
    oms: false,
    onGround: t >= WT.touchdown,
  };
}

export function wingedPose(t: number, p: WingedProfile): WingedPose {
  const base = t < WT.taem ? entryPose(t, p) : runwayPose(t, p);
  return { ...base, t, met: metAt(t, p), beat: beatAt(t) };
}

export interface WingedCamera {
  position: THREE.Vector3;
  look: THREE.Vector3;
  fov: number;
}

/** The craft's forward and left vectors for a pose (yaw only). */
function axes(pose: WingedPose) {
  const fwd = new THREE.Vector3(Math.sin(pose.yaw), 0, Math.cos(pose.yaw));
  const left = new THREE.Vector3(fwd.z, 0, -fwd.x);
  return { fwd, left };
}

export function wingedCamera(t: number, aspect: number, pose: WingedPose): WingedCamera {
  const fit = portraitFit(aspect);
  const c = pose.pos.clone().add(new THREE.Vector3(0, pose.frame === 'runway' ? 3 : 0, 0));
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const shot = (pos: THREE.Vector3, look: THREE.Vector3, fov = 40): WingedCamera => ({
    position: pos,
    look,
    fov,
  });
  const off = (o: THREE.Vector3) => c.clone().addScaledVector(o, fit);
  const { fwd, left } = axes(pose);
  const shots: [number, () => WingedCamera][] = [
    [WT.deorbit, () => shot(off(V(30, 14, 58)), c)],
    [WT.coast, () => shot(off(V(52, 16, 10)), c)],
    [WT.entry, () => shot(off(V(-58, 10, -24)), c)],
    [WT.rev1, () => shot(off(V(14, 24, -72)), c)],
    [
      WT.taem,
      () =>
        shot(
          c
            .clone()
            .addScaledVector(fwd, -140 * fit)
            .add(V(0, 45 * fit, 0)),
          c.clone().addScaledVector(fwd, 300),
        ),
    ],
    [
      WT.final,
      () =>
        shot(
          c
            .clone()
            .addScaledVector(left, 170 * fit)
            .add(V(0, 25, 60)),
          c,
          34,
        ),
    ],
    // From the flare on the camera rides beside the craft (the left side, the turn's inside).
    [
      WT.preflare,
      () =>
        shot(
          c
            .clone()
            .addScaledVector(left, 70 * fit)
            .add(V(0, 6, -25)),
          c,
          34,
        ),
    ],
    [
      WT.touchdown,
      () =>
        shot(
          c
            .clone()
            .addScaledVector(left, 48 * fit)
            .add(V(0, 2.5, 30 * fit)),
          c,
          36,
        ),
    ],
    [WT.rollout, () => shot(c.clone().add(V(60 * fit, 7, -45 * fit)), c, 36)],
  ];
  let i = shots.length - 1;
  while (i > 0 && t < shots[i][0]) i--;
  const cur = shots[i][1]();
  // The cut from the entry to the runway frame is a cut, not a pan.
  if (i === 0 || shots[i][0] === WT.taem) return cur;
  const k = smooth((t - shots[i][0]) / 1.6);
  if (k >= 1) return cur;
  const prev = shots[i - 1][1]();
  return {
    position: prev.position.clone().lerp(cur.position, k),
    look: prev.look.clone().lerp(cur.look, k),
    fov: lerp(prev.fov, cur.fov, k),
  };
}

export interface FlyWingedModels {
  /** buildOrbiter({ ..., gear: 'animated' }): nose +y, belly +z, wheels at z = 6.5 m. */
  orbiter: THREE.Group;
  /** buildRunway(profile.runway). */
  runway: THREE.Group;
}

export interface FlyWingedOptions {
  earthTextureUrl?: string;
}

export interface FlyWinged {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  profile: WingedProfile;
  end: number;
  parts: { craft: THREE.Object3D };
  update: (t: number, aspect: number) => WingedPose;
  dispose: () => void;
}

/** Where the main wheels touch, in the orbiter's authored frame before its length scale
 *  (winged.ts: mains at station 17.8, the ground plane of the gear at z = 6.5). */
const MAIN_CONTACT = new THREE.Vector3(0, 17.8, 6.5);

export function createFlyWinged(
  profile: WingedProfile,
  models: FlyWingedModels,
  opts: FlyWingedOptions = {},
): FlyWinged {
  const scene = new THREE.Scene();
  const sun = new THREE.DirectionalLight(0xfff6ea, 3.2);
  sun.position.set(-50, 80, 30);
  scene.add(sun, new THREE.HemisphereLight(0xa9c4e8, 0x4a4032, 0.9));

  // Entry frame: stars and the Earth at 1/1000.
  const entryGroup = new THREE.Group();
  scene.add(entryGroup);
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(900 * 3);
  for (let i = 0; i < 900; i++) {
    const a = Math.imul(i + 1, 2654435761) >>> 0;
    const b = Math.imul(i + 7, 40503) >>> 0;
    const lon = (a / 4294967296) * Math.PI * 2;
    const y = (b / 4294967296) * 2 - 1;
    const rr = Math.sqrt(1 - y * y);
    sp.set([Math.cos(lon) * rr * 3e4, y * 3e4, Math.sin(lon) * rr * 3e4], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.6,
    sizeAttenuation: false,
    fog: false,
    transparent: true,
  });
  const stars = new THREE.Points(starGeo, starMat);
  stars.frustumCulled = false;
  entryGroup.add(stars);
  const earthMat = new THREE.MeshStandardMaterial({ color: 0x2f5d8a, roughness: 0.9, fog: false });
  let earthTex: THREE.Texture | null = null;
  if (opts.earthTextureUrl) {
    earthTex = new THREE.TextureLoader().load(opts.earthTextureUrl, () => {
      earthMat.color.set(0xffffff);
      earthMat.needsUpdate = true;
    });
    earthTex.colorSpace = THREE.SRGBColorSpace;
    earthMat.map = earthTex;
  }
  const earth = new THREE.Mesh(new THREE.SphereGeometry(EARTH_R_M * EARTH_SCALE, 96, 64), earthMat);
  entryGroup.add(earth);

  // Runway frame: the runway, a wide ground under it and fog to the horizon.
  const runwayGroup = new THREE.Group();
  runwayGroup.add(models.runway);
  const far = new THREE.Mesh(
    new THREE.PlaneGeometry(600_000, 600_000),
    new THREE.MeshStandardMaterial({ roughness: 1 }),
  );
  const near = models.runway.getObjectByName('ground') as THREE.Mesh | undefined;
  const nearColor = (near?.material as THREE.MeshStandardMaterial | undefined)?.color;
  (far.material as THREE.MeshStandardMaterial).color.set(nearColor ?? 0xcdbb98);
  far.rotation.x = -Math.PI / 2;
  far.position.y = -8; // well below the runway ground, which it meets only far out: no depth fight
  runwayGroup.add(far);
  scene.add(runwayGroup);
  // A soft shadow under the craft near the ground, the only cue on a featureless lakebed of how
  // high the wheels are (ESTIMATE: an overhead sun).
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 32), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(11, 17, 1);
  runwayGroup.add(shadow);
  const fog = new THREE.Fog(0xb9cde0, 20_000, 140_000);

  // The craft: hung from the main-gear contact point, nose +z, belly down.
  const craft = new THREE.Group();
  const orbiter = models.orbiter;
  orbiter.rotation.x = Math.PI / 2;
  const g0 = orbiter.children[0];
  orbiter.position
    .copy(MAIN_CONTACT)
    .multiplyScalar(g0.scale.x)
    .applyEuler(new THREE.Euler(Math.PI / 2, 0, 0))
    .negate();
  craft.add(orbiter);
  craft.rotation.order = 'YXZ';
  scene.add(craft);
  const setGear = orbiter.userData.setGear as ((t: number) => void) | undefined;

  // OMS flames at the nozzles (model frame, firing aft along -y), and the entry glow under the belly.
  const oms: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const f = new THREE.Group();
    for (const [r, l, c, o] of [
      [0.4, 4, 0x8fa8ff, 0.45],
      [0.18, 2.2, 0xe8eeff, 0.85],
    ] as const) {
      const cone = plumeCone(r, l, c, o);
      cone.rotation.x = Math.PI;
      cone.position.y = -l / 2;
      f.add(cone);
    }
    f.position.set(s * 1.75, 1.2, -2.35);
    f.visible = false;
    g0.add(f);
    oms.push(f);
  }
  // The entry heating: an orange light under the belly, which faces the flow at this angle of attack.
  const glow = new THREE.PointLight(0xff6a2a, 0, 60, 1.2);
  glow.position.set(0, -9, 6);
  craft.add(glow);

  const camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.5, 4e5);
  const space = new THREE.Color(0x000000);
  const dusk = new THREE.Color(0x0e2140);
  const day = new THREE.Color(0xb9cde0);
  const sky = new THREE.Color();
  const end = WT.end;

  const update = (tIn: number, aspect: number): WingedPose => {
    const t = Math.min(end, Math.max(0, tIn));
    const pose = wingedPose(t, profile);
    const inEntry = pose.frame === 'entry';
    entryGroup.visible = inEntry;
    runwayGroup.visible = !inEntry;
    scene.fog = inEntry ? null : fog;
    if (inEntry) {
      earth.position.set(0, -(EARTH_R_M + pose.altM) * EARTH_SCALE, 0);
      earth.rotation.set(0.3 + t * 0.004, 1.1, 0);
      const k = clamp01((80_000 - pose.altM) / 55_000);
      sky.copy(space).lerp(dusk, k);
      starMat.opacity = 1 - k;
    } else {
      sky.copy(dusk).lerp(day, clamp01(1 - pose.altM / 25_000));
    }
    scene.background = sky;
    fog.color.copy(sky);
    craft.position.copy(pose.pos);
    shadow.position.set(pose.pos.x, 0.05, pose.pos.z - 6 * Math.cos(pose.yaw));
    shadow.rotation.z = pose.yaw;
    shadowMat.opacity = inEntry ? 0 : 0.35 * clamp01(1 - pose.altM / 80);
    craft.rotation.set(-pose.pitchDeg * DEG, pose.yaw, pose.bankDeg * DEG);
    setGear?.(pose.gear);
    for (const f of oms) f.visible = pose.oms;
    glow.intensity = 2500 * pose.plasma;

    const cam = wingedCamera(t, aspect, pose);
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

  return { scene, camera, profile, end, parts: { craft }, update, dispose };
}
