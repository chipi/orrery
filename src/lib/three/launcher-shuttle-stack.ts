import * as THREE from 'three';
import { heroWhite, heroDark, heroMetal } from './hero-materials';
import { stringerRoughness } from './launcher-detail';
import type { LauncherLook, LauncherModel, StackOrbiter } from './launcher-models';
import type { OrbiterLook } from './showcase/orbiter-stance';

/**
 * Space Shuttle (space-shuttle-stack), from the HAER measured drawings: TX-116 sheet 3 (the full
 * stack, dimensioned: 56.40 m, the tank 46.69 m, SRB centres 6.36 m off the tank's axis) and
 * TX-116-K sheet 3 (the SRB: 45.72 m, 12'-2" case, 17'-4" aft skirt, 12'-5" nozzle exit). Read
 * at 32.74 px/m (docs/wip/2026-11-27-haer-drawing-sources.md). Authored in metres, y up from the
 * SRB nozzle exits, then scaled to `vehLen`. The ET is the `booster` (dropped at MECO), the SRBs
 * the strap-ons (jettisoned at ~124 s), the orbiter the `upperStage`: the HAER orbiter
 * (showcase/winged.ts) once preloadLauncherModel has loaded it, else a coarse stand-in. Its own
 * chunk, loaded by preloadLauncherModel with the orbiter: it kept /fly's static JS over budget.
 */
const STACK_H = 56.4;
/** The orbiter's reference line (winged.ts z = 0) off the tank's axis, and its fin tip's height. */
const ORBITER_Z = 7.68;
const ORBITER_Y = 2.95;

/** The tank's outline (radius, height), m: the aft dome, the barrel, the LO2 ogive (sheet 3). */
const ET_PROFILE: [number, number][] = [
  ...Array.from({ length: 9 }, (_, i): [number, number] => {
    const t = (i / 8) * (Math.PI / 2);
    return [4.2 * Math.sin(t), 12.2 - 2.49 * Math.cos(t)];
  }),
  [4.2, 46.4],
  [4.17, 46.9],
  [4.11, 47.4],
  [4.03, 47.9],
  [3.93, 48.4],
  [3.8, 48.9],
  [3.67, 49.4],
  [3.54, 49.9],
  [3.38, 50.4],
  [3.19, 50.9],
  [3.01, 51.4],
  [2.75, 51.9],
  [2.53, 52.4],
  [2.25, 52.9],
  [1.94, 53.4],
  [1.65, 53.9],
  [1.28, 54.4],
  [0.9, 54.9],
  [0.55, 55.4],
  [0.11, 55.9],
  [0, 55.92],
];

/** The SRB case, skirt and nose (radius, height), m (TX-116-K sheet 3). */
const SRB_PROFILE: [number, number][] = [
  [1.5, 1.42],
  [2.64, 1.4],
  [2.7, 1.6],
  [2.57, 2.0],
  [2.33, 2.8],
  [2.09, 3.6],
  [1.95, 4.0],
  [1.87, 4.3],
  [1.87, 40.85],
  [1.72, 41.2],
  [1.2, 42.8],
  [0.8, 44.0],
  [0.44, 45.2],
  [0.22, 45.62],
  [0, 45.72],
];
/** Field and factory joints, forward skirt and frustum rings (heights, m). */
const SRB_JOINTS = [12.99, 21.18, 29.37, 38.6, 40.85];

function lathe(profile: [number, number][], mat: THREE.Material, seg = 48): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.LatheGeometry(
      profile.map(([r, y]) => new THREE.Vector2(r, y)),
      seg,
    ),
    mat,
  );
}

/** A coarse orbiter (winged.ts frame: nose +y at 37.07, belly +z) for when it is not preloaded. */
function coarseOrbiter(white: THREE.Material, tile: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(5.3, 31, 5.9), white);
  body.position.set(0, 20.5, -0.75);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(2.6, 5, 16), white);
  nose.position.set(0, 34.5, -0.6);
  const wing = new THREE.Shape();
  wing.moveTo(-2.2, 30.6);
  wing.lineTo(-4.96, 16);
  wing.lineTo(-11.9, 8.7);
  wing.lineTo(-11.9, 6.4);
  wing.lineTo(11.9, 6.4);
  wing.lineTo(11.9, 8.7);
  wing.lineTo(4.96, 16);
  wing.lineTo(2.2, 30.6);
  wing.closePath();
  const wingGeo = new THREE.ExtrudeGeometry(wing, { depth: 0.6, bevelEnabled: false });
  const w = new THREE.Mesh(wingGeo, tile);
  w.position.z = 1.7;
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 7.9), white);
  fin.position.set(0, 4.5, -7.8);
  g.add(body, nose, w, fin);
  return g;
}

export function buildShuttleStack(
  vehLen: number,
  look: LauncherLook | undefined,
  stackOrbiter: StackOrbiter | null,
  stackLook: ((orbiter?: string, date?: string) => OrbiterLook) | null,
): LauncherModel {
  const s = vehLen / STACK_H;
  const o: OrbiterLook = stackLook?.(look?.orbiterId, look?.date) ?? {
    variant: 'shuttle',
    silts: true,
    whiteTank: false,
  };
  const white = heroWhite(0xeef0f3);
  const foam = new THREE.MeshStandardMaterial({
    // STS-1 and STS-2 flew a white-painted tank; from STS-3 the bare orange-brown foam
    color: o.whiteTank ? 0xebe8df : 0xc0703a,
    roughness: 0.95,
    metalness: 0.02,
  });
  const ribbed = new THREE.MeshStandardMaterial({
    color: o.whiteTank ? 0xdedbd2 : 0xae6331,
    roughness: 0.9,
    metalness: 0.05,
    roughnessMap: stringerRoughness(120),
  });
  const tile = heroDark(0x17191e);
  const metal = heroMetal(0xc4c9cf, 0.32);
  const eng = heroMetal(0x33373e, 0.5);
  const root = new THREE.Group();
  const metres = (): THREE.Group => {
    const g = new THREE.Group();
    g.scale.setScalar(s);
    return g;
  };

  // ── External Tank (the `booster`): one lathe, the ribbed intertank, the lines down its face.
  const booster = new THREE.Group();
  const et = metres();
  booster.add(et);
  et.add(lathe(ET_PROFILE, foam, 64));
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.5, 8), metal);
  tip.position.y = 56.15;
  et.add(tip);
  const intertank = new THREE.Mesh(
    new THREE.CylinderGeometry(4.23, 4.23, 42.8 - 35.9, 64, 1, true),
    ribbed,
  );
  intertank.position.y = (35.9 + 42.8) / 2;
  et.add(intertank);
  // The LO2 feedline down the starboard face (the orbiter's right, stack -x), the cable tray
  // to port, the GO2 pressurisation line up the ogive.
  const tube = (r: number, pts: THREE.Vector3[], mat: THREE.Material): THREE.Mesh =>
    new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, r, 8, false), mat);
  const onFace = (x: number, y: number, r: number, off: number): THREE.Vector3 =>
    new THREE.Vector3(x, y, Math.sqrt(Math.max(0, r * r - x * x)) + off);
  et.add(
    tube(
      0.22,
      [onFace(-1.6, 36.2, 4.2, 0.28), onFace(-1.6, 24, 4.2, 0.28), onFace(-1.6, 12.6, 4.2, 0.28)],
      foam,
    ),
  );
  const tray = new THREE.Mesh(new THREE.BoxGeometry(0.34, 42.6 - 12.6, 0.16), foam);
  tray.position.copy(onFace(1.2, (42.6 + 12.6) / 2, 4.2, 0.1));
  et.add(tray);
  const ogiveR = (y: number): number => {
    for (let i = 1; i < ET_PROFILE.length; i++) {
      const [r1, y1] = ET_PROFILE[i];
      const [r0, y0] = ET_PROFILE[i - 1];
      if (y <= y1 && y >= y0) return r0 + ((r1 - r0) * (y - y0)) / (y1 - y0 || 1);
    }
    return 4.2;
  };
  const press: THREE.Vector3[] = [];
  for (let y = 42.8; y <= 55.2; y += 0.6) {
    const r = ogiveR(y) + 0.14;
    press.push(new THREE.Vector3(r * Math.sin(0.12), y, r * Math.cos(0.12)));
  }
  et.add(tube(0.1, press, foam));
  // The orbiter's attach points: the forward bipod and the aft crossbeam struts.
  const strut = (a: THREE.Vector3, b: THREE.Vector3, r: number): THREE.Mesh => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), metal);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return m;
  };
  for (const sx of [-1, 1]) {
    et.add(strut(new THREE.Vector3(sx * 0.9, 35.8, 4.1), new THREE.Vector3(0, 35.6, 5.5), 0.09));
    et.add(
      strut(new THREE.Vector3(sx * 1.6, 12.4, 3.85), new THREE.Vector3(sx * 1.2, 11.6, 5.5), 0.16),
    );
  }
  root.add(booster);

  // ── Two SRBs (the strap-ons), centres 6.36 m off the tank's axis on ±x.
  const strapOnGroup = new THREE.Group();
  for (const sx of [-1, 1]) {
    const srb = new THREE.Group();
    srb.position.set(sx * 6.36 * s, 0, 0);
    const m = metres();
    srb.add(m);
    m.add(lathe(SRB_PROFILE, white));
    for (const y of SRB_JOINTS) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.885, 0.035, 6, 48), metal);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      m.add(ring);
    }
    // Nozzle: the exit below the skirt, 12'-5" across.
    const noz = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.89, 1.45, 32, 1, true), eng);
    noz.position.y = 0.72;
    m.add(noz);
    // The systems tunnel down the outboard side.
    const tunnel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 40.6 - 4.6, 0.34), white);
    tunnel.position.set(sx * 1.94, (40.6 + 4.6) / 2, 0);
    m.add(tunnel);
    // Forward and aft separation motors (two of each cluster of four, outboard-facing).
    for (const [y, r] of [
      [42.3, 1.38],
      [2.5, 2.45],
    ] as const) {
      for (const dz of [-0.45, 0.45]) {
        const bsm = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 10), metal);
        bsm.position.set(sx * r, y, dz);
        m.add(bsm);
      }
    }
    // Attach struts to the tank: the forward thrust fitting, the three aft struts.
    m.add(
      strut(new THREE.Vector3(-sx * 1.85, 40.3, 0), new THREE.Vector3(-sx * 2.3, 40.3, 0), 0.18),
    );
    for (const [y, dz] of [
      [12.6, 0],
      [12.0, 0.7],
      [12.0, -0.7],
    ] as const) {
      m.add(
        strut(new THREE.Vector3(-sx * 1.85, y, dz), new THREE.Vector3(-sx * 2.3, y, dz * 0.4), 0.1),
      );
    }
    strapOnGroup.add(srb);
  }
  root.add(strapOnGroup);

  // ── Orbiter (the `upperStage`): winged.ts's frame turned to face the tank with its belly.
  const orbiter = new THREE.Group();
  const om = metres();
  orbiter.add(om);
  const og = new THREE.Group();
  og.rotation.y = Math.PI;
  og.position.set(0, ORBITER_Y, ORBITER_Z);
  om.add(og);
  og.add(stackOrbiter ? stackOrbiter(o.variant, o.silts) : coarseOrbiter(white, tile));
  // The plume anchor: a hidden box over the three SSME bells (winged.ts: exits at stations 34.85
  // and 35.4 m, the upper at v 3.33 m, the lower pair at ±1.52 m, v 0.18 m, 1.19 m radius),
  // in scene units: the scene measures an anchor in its own frame, so it is not under `om`.
  const ssme = new THREE.Group();
  ssme.position.set(0, (ORBITER_Y + 3.1) * s, (ORBITER_Z + 1.75) * s);
  const ssmeBox = new THREE.Mesh(
    new THREE.BoxGeometry(5.42 * s, 2.9 * s, 5.53 * s),
    new THREE.MeshBasicMaterial(),
  );
  ssmeBox.visible = false;
  ssme.add(ssmeBox);
  orbiter.add(ssme);
  root.add(orbiter);

  // No fairing — the payload rides in the Orbiter bay. Tiny hidden shells keep the clamshell
  // choreography a no-op.
  const hidden = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  const fairingL = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.01, 4), hidden);
  const fairingR = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.01, 4), hidden);
  const fairingGroup = new THREE.Group();
  fairingGroup.visible = false;
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  // Mid-bay (winged.ts stations 9.07 to 27.47 m, ~1.5 m above the reference line), turned into
  // the stack frame; the doors open on the side away from the tank (+z).
  const bayY = (ORBITER_Y + 18.27) * s;
  return {
    root,
    booster,
    // The SRBs carry their own flames (strap-ons); the core plume is the three SSMEs on the
    // orbiter's tail, not the tank.
    boosterPlumeAnchor: ssme,
    upperStage: orbiter,
    upperPlumeAnchor: ssme,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY: ORBITER_Y * s,
    fairingBaseY: vehLen * 0.9,
    payloadMountY: bayY,
    payloadBay: { center: [0, bayY, (ORBITER_Z + 1.5) * s], deployDir: [0, 0.3, 1] },
    strapOns: strapOnGroup,
  };
}
