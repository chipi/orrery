/**
 * Launch-pad models for the launch scene (G4): five families in the same low-detail style as
 * the generic lattice tower (boxes and cylinders, four materials), sized in metres against the
 * vehicle's real length, so a tower stands at its true height relative to the rocket.
 *
 *   apollo-shuttle  LC-39: the Launch Umbilical Tower (Apollo, SLS), or the Fixed and Rotating
 *                   Service Structures + water tower (Shuttle), flame trench.
 *   soviet          R-7 pad: four support arms that fall away at T+0, retracted service
 *                   cabins, lightning masts, flame pit; Proton: a fixed service tower.
 *   spacex          the transporter-erector that tilts away at liftoff; 39A / SLC-40 towers.
 *   ula             the mobile launch platform and umbilical tower (the VIF is off pad: omitted).
 *   service-tower   Cape mobile-service-tower pads, Kourou, Chinese pads, Tanegashima,
 *                   Sriharikota: a service tower with per-site proportions.
 *
 * The vehicle stands at the origin on y = 0, the main tower to +x, the flame trench along z.
 * Every moving part is a pure function of the mission time `update(t)` (T+0 = 0), so a scrubbed
 * or paused launch shows the right pose. Static geometry is merged per material (one draw call
 * per material), each moving part is its own small group.
 */

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PadSpec } from '$lib/launches/pad-family';

export interface PadBuild {
  /** In scene units, vehicle at the origin. */
  group: THREE.Group;
  /** Pose every moving part at mission time t (T+0 = 0). */
  update(t: number): void;
  dispose(): void;
}

const FT = 0.3048;

/** Heights of the main tower relative to the vehicle: variants whose height is not a fixed
 *  published figure. Approximate; see the pad-model table in docs (NOT VERIFIED rows). */
const CHINESE_REL: Record<string, number> = {
  'xichang-lc-2': 1.45,
  'xichang-lc-3': 1.5,
  'wenchang-lc-101': 1.6,
  'wenchang-lc-201': 1.5,
  'taiyuan-lc-9': 1.45,
};

/** Chinese towers with a published height, metres. Jiuquan's umbilical tower is 105.52 m with
 *  its 16 m lightning rod (CMSE, 2015-09-11), so 89.5 m of tower. */
const CHINESE_FIXED_M: Record<string, number> = {
  'jiuquan-slc-43': 89.5,
};

/** Proton's service tower: 60 m, rolled back about 340 m from the rocket 5-6 hours before launch
 *  (RussianSpaceWeb, "Proton launch complex", the service tower). At liftoff the rocket stands
 *  alone; its umbilicals part at the base in the first second, so no arms are drawn. */
const PROTON_TOWER_M = 60;
const PROTON_TOWER_ROLLBACK_M = 340;

/** Main-tower height above the vehicle's base, metres, for a pad and a vehicle of vehM metres.
 *  Fixed figures: LUT 380 ft (Wikipedia, Launch Complex 39), 39A FSS + mast 350 ft, the SLS
 *  Mobile Launcher tower 108 m (NASA gives both 345 and 355 ft), SLC-40's crew tower about
 *  300 ft (FAA written re-evaluation), the Starbase tower 480 ft (FAA PEA), Tanegashima's
 *  mobile launcher 65.5 m (JAXA Tanegashima guide). */
export function padTowerHeightM(spec: PadSpec, vehM: number): number {
  switch (spec.variant) {
    case 'apollo-lut':
      return 380 * FT;
    case 'shuttle':
      return 350 * FT;
    case 'sls':
      return 108;
    case 'soyuz':
      return 1.6 * vehM;
    case 'proton':
      return PROTON_TOWER_M;
    case 'f9-39a':
      return 350 * FT;
    case 'f9-cat':
      return 300 * FT;
    case 'f9-te':
      return 0.9 * vehM;
    case 'starbase':
      return 146;
    case 'atlas-v':
      return 1.15 * vehM;
    case 'cape-classic':
      return 1.1 * vehM;
    case 'kourou-a5':
      return 0.95 * vehM;
    case 'kourou-a6':
      return 0.95 * vehM;
    case 'chinese-fst':
      return CHINESE_FIXED_M[spec.siteId] ?? (CHINESE_REL[spec.siteId] ?? 1.5) * vehM;
    case 'tanegashima':
      return 65.5;
    case 'sriharikota':
      return 0.9 * vehM;
  }
}

interface Mats {
  steel: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  paint: THREE.MeshStandardMaterial;
}

const smooth01 = (x: number): number => {
  const c = Math.min(1, Math.max(0, x));
  return c * c * (3 - 2 * c);
};

/** Collects boxes and cylinders (metres, local to one group) and merges them per material. */
class Acc {
  private geos = new Map<THREE.Material, THREE.BufferGeometry[]>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  constructor(readonly mats: Mats) {}
  private push(g: THREE.BufferGeometry, mat: THREE.Material): void {
    const l = this.geos.get(mat) ?? [];
    l.push(g);
    this.geos.set(mat, l);
  }
  /** A box centred at (x, y, z), sizes (sx, sy, sz), rotated about z then y. */
  box(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    mat: THREE.Material,
    rz = 0,
    ry = 0,
  ): void {
    const g = new THREE.BoxGeometry(1, 1, 1);
    this.e.set(0, ry, rz, 'YXZ');
    this.q.setFromEuler(this.e);
    this.m.compose(new THREE.Vector3(x, y, z), this.q, new THREE.Vector3(sx, sy, sz));
    g.applyMatrix4(this.m);
    this.push(g, mat);
  }
  /** An upright cylinder from y0 to y1. */
  cyl(x: number, z: number, y0: number, y1: number, r: number, mat: THREE.Material): void {
    const g = new THREE.CylinderGeometry(r, r, y1 - y0, 12);
    g.translate(x, (y0 + y1) / 2, z);
    this.push(g, mat);
  }
  /** A square-section lattice tower: four posts, rings, diagonals on the two z faces. */
  lattice(
    cx: number,
    cz: number,
    w: number,
    d: number,
    h: number,
    mat: THREE.Material,
    y0 = 0,
  ): void {
    const t = Math.max(0.3, Math.min(1.0, Math.min(w, d) * 0.07));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        this.box(cx + (sx * w) / 2, y0 + h / 2, cz + (sz * d) / 2, t, h, t, mat);
    const bays = Math.max(4, Math.min(14, Math.round(h / (Math.max(w, d) * 1.1))));
    const bay = h / bays;
    for (let i = 0; i <= bays; i++) {
      const y = y0 + i * bay;
      this.box(cx, y, cz + d / 2, w, t * 0.8, t * 0.8, mat);
      this.box(cx, y, cz - d / 2, w, t * 0.8, t * 0.8, mat);
      this.box(cx + w / 2, y, cz, t * 0.8, t * 0.8, d, mat);
      this.box(cx - w / 2, y, cz, t * 0.8, t * 0.8, d, mat);
      if (i < bays) {
        const len = Math.hypot(w, bay);
        const ang = Math.atan2(bay, w) * (i % 2 ? 1 : -1);
        this.box(cx, y + bay / 2, cz + d / 2, len, t * 0.6, t * 0.6, mat, ang);
        this.box(cx, y + bay / 2, cz - d / 2, len, t * 0.6, t * 0.6, mat, -ang);
      }
    }
  }
  /** A tapering lattice mast: one post with a few cross bars. */
  mast(x: number, z: number, h: number, mat: THREE.Material): void {
    const t = Math.max(0.25, h * 0.006);
    this.box(x, h / 2, z, t, h, t, mat);
    for (let i = 1; i <= 3; i++) this.box(x, (h * i) / 4, z, t * 6 * (1 - i / 5), t, t, mat);
  }
  build(name?: string): THREE.Group {
    const g = new THREE.Group();
    if (name) g.name = name;
    for (const [mat, list] of this.geos) {
      const merged = mergeGeometries(list, false);
      for (const l of list) l.dispose();
      if (merged) g.add(new THREE.Mesh(merged, mat));
    }
    this.geos.clear();
    return g;
  }
}

interface Kit {
  mats: Mats;
  root: THREE.Group;
  vehM: number;
  /** A ground slab thickness that clears the scene's ground overlay. */
  slab: number;
  moving: ((t: number) => void)[];
}

function addStatic(kit: Kit, fn: (a: Acc) => void, name?: string): THREE.Group {
  const a = new Acc(kit.mats);
  fn(a);
  const g = a.build(name);
  kit.root.add(g);
  return g;
}

/** Pad slab and the flame trench / pit (a dark strip along z). */
function ground(kit: Kit, slabW: number, slabD: number, trenchW: number, trenchL: number): void {
  const s = kit.slab;
  addStatic(kit, (a) => {
    a.box(0, s / 2, 0, slabW, s, slabD, kit.mats.concrete);
    a.box(0, s * 0.62, 0, trenchW, s * 1.25, trenchL, kit.mats.dark);
  });
}

/** A group hinged at (x, y, z) whose pose `pose(t, group)` is driven by the mission time. */
function hinged(
  kit: Kit,
  x: number,
  y: number,
  z: number,
  fill: (a: Acc) => void,
  pose: (t: number, g: THREE.Group) => void,
): THREE.Group {
  const a = new Acc(kit.mats);
  fill(a);
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(a.build());
  kit.root.add(g);
  kit.moving.push((t) => pose(t, g));
  pose(-10, g);
  return g;
}

/** Swing arms from a tower's face toward the vehicle: each rotates away about a vertical hinge. */
function swingArms(
  kit: Kit,
  hingeX: number,
  hingeZ: number,
  heights: number[],
  len: number,
  thick: number,
  openAt = 0,
  openFor = 1.2,
): void {
  for (const y of heights)
    hinged(
      kit,
      hingeX,
      y,
      hingeZ,
      (a) => a.box(-len / 2, 0, 0, len, thick, thick * 0.9, kit.mats.steel),
      (t, g) => {
        g.rotation.y = smooth01((t - openAt) / openFor) * 1.45;
      },
    );
}

function apolloLut(kit: Kit, rel: { towerM: number; masts: boolean }): void {
  const { mats } = kit;
  ground(kit, 20, 20, 18, 137);
  addStatic(kit, (a) => a.box(0, 0.35, 0, 49, 0.7, 41, mats.concrete));
  addStatic(
    kit,
    (a) => {
      a.lattice(22, 0, 12, 12, rel.towerM - 6, mats.steel);
      a.mast(22, 0, 6, mats.steel);
      a.box(22, rel.towerM - 6, 0, 14, 2.5, 14, mats.paint);
    },
    'pad-tower',
  );
  const top = rel.towerM;
  swingArms(
    kit,
    16.5,
    -5,
    [0.1, 0.22, 0.34, 0.47, 0.6, 0.72, 0.83, 0.93].map((f) => f * top),
    11,
    2.2,
  );
  if (rel.masts) {
    addStatic(kit, (a) => {
      for (const [x, z] of [
        [-150, 60],
        [60, -150],
        [150, 100],
      ] as const)
        a.lattice(x, z, 3, 3, 183, mats.steel);
    });
  }
}

function shuttle(kit: Kit): void {
  const { mats } = kit;
  ground(kit, 30, 30, 18, 137);
  addStatic(kit, (a) => a.box(0, 3.8, 0, 49, 0.5, 41, mats.concrete)); // mobile launcher platform seen from the side
  addStatic(
    kit,
    (a) => {
      a.lattice(22, 0, 12, 12, 350 * FT - 31.4, mats.steel);
      a.cyl(22, 0, 350 * FT - 31.4, 350 * FT, 0.5, mats.steel); // lightning mast
      a.box(22, 247 * FT - 1, 0, 14, 2, 14, mats.paint); // top deck
    },
    'pad-tower',
  );
  // the Rotating Service Structure, swung back off the stack
  addStatic(kit, (a) => {
    a.lattice(24, 22, 15, 31, 189 * FT, mats.steel);
    a.box(24, 189 * FT, 22, 17, 2, 33, mats.paint);
  });
  // the water tower, set back: 290 ft
  addStatic(kit, (a) => {
    a.lattice(-110, -70, 6, 6, 63, mats.steel);
    a.cyl(-110, -70, 63, 88, 9, mats.concrete);
  });
}

function soviet(kit: Kit, variant: 'soyuz' | 'proton'): void {
  const { mats, vehM } = kit;
  if (variant === 'soyuz') {
    ground(kit, 70, 70, 12, 70);
    // the four support arms hold the core at its waist, and fall outward at T+0
    const holdY = 0.36 * vehM;
    const r0 = 6;
    const rHold = 2.7;
    const L = Math.hypot(holdY, r0 - rHold);
    const lean = Math.atan2(r0 - rHold, holdY);
    for (const [dx, dz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ] as const) {
      const dir = new THREE.Vector3(dx, 0, dz).normalize();
      const axis = new THREE.Vector3(-dir.z, 0, dir.x);
      hinged(
        kit,
        dir.x * r0,
        0,
        dir.z * r0,
        (a) => {
          a.lattice(0, 0, 1.6, 1.6, L, mats.steel);
        },
        (t, g) => {
          const fall = smooth01(t / 3.2);
          g.quaternion.setFromAxisAngle(axis, lean - fall * (lean + 1.35));
        },
      );
    }
    // the two service cabins, rolled back
    addStatic(kit, (a) => {
      a.lattice(34, 8, 7, 7, 0.62 * vehM, mats.steel);
      a.lattice(-34, 8, 7, 7, 0.62 * vehM, mats.steel);
      a.box(34, 0.62 * vehM + 1, 8, 9, 2, 9, mats.paint);
      a.box(-34, 0.62 * vehM + 1, 8, 9, 2, 9, mats.paint);
    });
    addStatic(
      kit,
      (a) => {
        for (const [x, z] of [
          [-52, -40],
          [52, -40],
          [-52, 40],
          [52, 40],
        ] as const)
          a.mast(x, z, 1.6 * vehM, mats.steel);
      },
      'pad-tower',
    );
  } else {
    ground(kit, 60, 60, 14, 80);
    const h = PROTON_TOWER_M - 2.5;
    const x = PROTON_TOWER_ROLLBACK_M;
    addStatic(
      kit,
      (a) => {
        a.lattice(x, 0, 14, 14, h, mats.steel);
        a.box(x, h + 1.25, 0, 16, 2.5, 16, mats.paint);
      },
      'pad-tower',
    );
    addStatic(kit, (a) => {
      a.mast(-40, 40, 1.4 * vehM, mats.steel);
      a.mast(-40, -40, 1.4 * vehM, mats.steel);
    });
  }
}

/** The strongback rests against the stack and tilts away: 1.5 degrees before liftoff, 45 at it. */
function strongback(kit: Kit, h: number, side: number): THREE.Group {
  const { mats } = kit;
  return hinged(
    kit,
    side * 4.6,
    0,
    0,
    (a) => {
      a.lattice(0, 0, 3.6, 4.6, h, mats.paint);
      a.box(0, h + 0.8, 0, 4.4, 1.6, 5.4, mats.steel);
    },
    (t, g) => {
      const ang = 0.026 + smooth01(t / 2.2) * (0.785 - 0.026);
      g.rotation.z = side > 0 ? -ang : ang;
    },
  );
}

function spacex(kit: Kit, variant: 'f9-39a' | 'f9-cat' | 'f9-te' | 'starbase'): void {
  const { mats, vehM } = kit;
  if (variant === 'starbase') {
    ground(kit, 40, 40, 16, 60);
    addStatic(
      kit,
      (a) => {
        a.lattice(24, 0, 10, 10, 146, mats.steel);
        a.box(24, 146 + 1, 0, 12, 2, 12, mats.paint);
      },
      'pad-tower',
    );
    for (const sz of [-1, 1])
      hinged(
        kit,
        18,
        0.8 * vehM,
        sz * 3,
        (a) => a.box(-18, 0, 0, 36, 2.2, 1.6, mats.paint),
        (_t, g) => {
          g.rotation.y = -sz * 1.2;
        },
      );
    return;
  }
  ground(kit, 36, 36, 10, 60);
  if (variant === 'f9-39a') {
    addStatic(
      kit,
      (a) => {
        a.lattice(26, 0, 12, 12, 350 * FT, mats.steel);
        a.box(26, 350 * FT, 0, 14, 2, 14, mats.paint);
      },
      'pad-tower',
    );
    addStatic(kit, (a) => {
      a.lattice(-110, -70, 6, 6, 63, mats.steel);
      a.cyl(-110, -70, 63, 88, 9, mats.concrete);
    });
    strongback(kit, 0.86 * vehM, -1);
  } else if (variant === 'f9-cat') {
    addStatic(
      kit,
      (a) => {
        a.lattice(22, 0, 9, 9, 300 * FT, mats.steel);
        a.box(22, 300 * FT, 0, 11, 2, 11, mats.paint);
      },
      'pad-tower',
    );
    strongback(kit, 0.86 * vehM, -1);
  } else {
    addStatic(kit, (a) => {
      a.mast(-38, -30, 0.9 * vehM, mats.steel);
      a.mast(38, -30, 0.9 * vehM, mats.steel);
    });
    strongback(kit, 0.9 * vehM, 1).name = 'pad-tower';
  }
}

function ula(kit: Kit): void {
  const { mats, vehM } = kit;
  ground(kit, 40, 40, 10, 50);
  addStatic(kit, (a) => a.box(0, 0.5, 0, 18, 1, 18, mats.dark)); // the mobile launch platform
  const h = 1.15 * vehM;
  addStatic(
    kit,
    (a) => {
      a.lattice(11, 0, 6, 6, h, mats.steel);
      a.box(11, h, 0, 8, 1.6, 8, mats.paint);
    },
    'pad-tower',
  );
  swingArms(
    kit,
    8,
    -3,
    [0.16, 0.45, 0.78].map((f) => f * vehM),
    6,
    1.6,
  );
  addStatic(kit, (a) => {
    for (const [x, z] of [
      [-48, -48],
      [48, -48],
      [-48, 48],
      [48, 48],
    ] as const)
      a.mast(x, z, 1.5 * vehM, mats.steel);
  });
}

function serviceTower(kit: Kit, spec: PadSpec): void {
  const { mats, vehM } = kit;
  const h = padTowerHeightM(spec, vehM);
  const v = spec.variant;
  ground(kit, 44, 44, 11, 60);
  const wide = v === 'chinese-fst' ? 10 : v === 'cape-classic' ? 8 : 6;
  const x = v === 'chinese-fst' ? 18 : 12;
  addStatic(
    kit,
    (a) => {
      a.lattice(x, 0, wide, wide, h, mats.steel);
      if (v === 'chinese-fst') a.cyl(x, 0, h, h + 8, 0.45, mats.steel);
      a.box(x, h, 0, wide + 2, 1.5, wide + 2, mats.paint);
    },
    'pad-tower',
  );
  const arms =
    v === 'chinese-fst'
      ? [0.2, 0.4, 0.6, 0.8]
      : v === 'cape-classic'
        ? [0.25, 0.55, 0.85]
        : [0.3, 0.7];
  swingArms(
    kit,
    x - wide / 2 - 0.5,
    -wide / 3,
    arms.map((f) => f * vehM),
    Math.max(4, x - wide / 2 - 3),
    1.7,
  );
  if (v === 'kourou-a5') {
    addStatic(kit, (a) => {
      for (const [mx, mz] of [
        [-55, -55],
        [55, -55],
        [-55, 55],
        [55, 55],
      ] as const)
        a.mast(mx, mz, 1.7 * vehM, mats.steel);
    });
  } else if (v === 'kourou-a6') {
    addStatic(kit, (a) => {
      a.lattice(-170, 0, 24, 24, 1.45 * vehM, mats.steel);
      a.box(-170, 1.45 * vehM, 0, 26, 3, 26, mats.paint);
      for (const mz of [-50, 50]) a.mast(-45, mz, 1.6 * vehM, mats.steel);
    });
  } else if (v === 'tanegashima') {
    addStatic(kit, (a) => {
      a.mast(-60, -40, 74.5, mats.steel);
    });
  } else if (v === 'sriharikota') {
    addStatic(kit, (a) => {
      a.lattice(190, 0, 20, 20, 1.7 * vehM, mats.steel);
      a.box(190, 1.7 * vehM, 0, 22, 3, 22, mats.paint);
      a.mast(-50, -50, 1.6 * vehM, mats.steel);
    });
  }
}

/**
 * The Starbase launch tower and the orbital launch mount on their own, in metres (ground at y = 0,
 * the mount at the origin, the tower 24 m off along -x), for the /fly booster-catch inset
 * (0.9.11 F3). Same lattice and materials as the `starbase` pad variant; the catch arms are the
 * inset's own (they close on the booster).
 */
export function buildStarbaseTowerM(): THREE.Group {
  const mk = (color: number, rough = 0.8, metal = 0.2): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const mats: Mats = {
    steel: mk(0x8a8e98),
    dark: mk(0x1d1f24, 0.9, 0.1),
    concrete: mk(0x9b9a93, 0.9, 0.05),
    paint: mk(0xc9cbce, 0.7, 0.15),
  };
  const a = new Acc(mats);
  a.lattice(-24, 0, 10, 10, 146, mats.steel);
  a.box(-24, 147, 0, 12, 2, 12, mats.paint);
  // Orbital launch mount: a ring table on six legs, about 20 m tall.
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2;
    a.box(Math.cos(ang) * 8, 9, Math.sin(ang) * 8, 2.4, 18, 2.4, mats.steel);
  }
  a.box(0, 19, 0, 20, 2.4, 20, mats.paint);
  a.box(0, 0.4, 0, 46, 0.8, 46, mats.concrete);
  return a.build('starbase-tower');
}

/** A pad with a plain white stand-in vehicle on it, for the /dev/models gallery and /colophon. */
export function buildPadShowcase(spec: PadSpec, vehM: number): THREE.Group {
  const len = 1;
  const b = buildPad(spec, vehM, len);
  const g = new THREE.Group();
  g.add(b.group);
  const r = 0.035 * len;
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r, len, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.6, metalness: 0.1 }),
  );
  body.position.y = len / 2 + 0.016 * len;
  g.add(body);
  b.update(-5);
  return g;
}

/** Build the pad of `spec` for a vehicle of `vehM` metres drawn `vehLen` scene units long. */
export function buildPad(spec: PadSpec, vehM: number, vehLen: number): PadBuild {
  const mk = (color: number, rough = 0.8, metal = 0.2): THREE.MeshStandardMaterial =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  const mats: Mats = {
    steel: mk(0x8a8e98),
    dark: mk(0x1d1f24, 0.9, 0.1),
    concrete: mk(0x9b9a93, 0.9, 0.05),
    paint: mk(spec.family === 'spacex' ? 0xc9cbce : 0xa9532f, 0.7, 0.15),
  };
  const root = new THREE.Group();
  root.name = `pad-${spec.variant}`;
  root.scale.setScalar(vehLen / vehM);
  const kit: Kit = { mats, root, vehM, slab: 0.016 * vehM, moving: [] };
  switch (spec.variant) {
    case 'apollo-lut':
      apolloLut(kit, { towerM: padTowerHeightM(spec, vehM), masts: false });
      break;
    case 'sls':
      apolloLut(kit, { towerM: padTowerHeightM(spec, vehM), masts: true });
      break;
    case 'shuttle':
      shuttle(kit);
      break;
    case 'soyuz':
    case 'proton':
      soviet(kit, spec.variant);
      break;
    case 'f9-39a':
    case 'f9-cat':
    case 'f9-te':
    case 'starbase':
      spacex(kit, spec.variant);
      break;
    case 'atlas-v':
      ula(kit);
      break;
    default:
      serviceTower(kit, spec);
  }
  const moving = kit.moving;
  return {
    group: root,
    update(t) {
      for (const f of moving) f(t);
    },
    dispose() {
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) (o.geometry as THREE.BufferGeometry).dispose();
      });
      for (const m of Object.values(mats)) m.dispose();
    },
  };
}
