/**
 * The Scientific Instrument Module (SIM) bay of the Apollo J-mission service module (Apollo 15,
 * 16, 17): service-module sector 1 with its skin panel gone (the door was jettisoned on the way
 * to the Moon), an open recess in the radial planes of the sector's two beams, and the
 * instruments inside, looking out at the Moon.
 *
 * Frame: the CSM model's own (y up, the sector's centre on +z, z outward). `buildSimBay` returns
 * the group 'sim-bay'; named parts:
 *  - 'sim-bay-recess' (floor, ceiling, back wall, two side walls),
 *  - Apollo 15 / 16: 'subsatellite-launcher' (holding 'pfs-subsatellite' until released),
 *    'mapping-camera' (with 'stellar-camera'), 'laser-altimeter', 'panoramic-camera',
 *    'xray-spectrometer', 'alpha-particle-spectrometer', 'gamma-ray-boom' > 'gamma-ray-spectrometer',
 *    'mass-spec-boom' > 'mass-spectrometer',
 *  - Apollo 17: 'mapping-camera', 'laser-altimeter', 'panoramic-camera', 'lunar-sounder',
 *    'infrared-radiometer', 'uv-spectrometer' (no spectrometer booms, no subsatellite).
 * `userData.setBoomExtension(gamma, mass)` slides the two spectrometer booms out from stowed (0)
 * to the 7.5 m they flew at (1); `userData.releaseSubsatellite()` returns the subsatellite,
 * removed from the launcher with its transform set to the world one it had.
 *
 * Sources: NASA Apollo 15 Mission Report / Press Kit and the Apollo Lunar Surface Journal for what
 * flew where; Wikipedia "Apollo 15" for the 7.5 m (24 ft) spectrometer booms and the door
 * jettisoned in translunar coast; Itek 24-inch (610 mm) panoramic camera (Wikipedia, "Apollo
 * command and service module"). Photos: AS15-88-11972 (Endeavour, SIM bay open, from the LM) and
 * AS16-122-19533. ESTIMATES, not read from drawings: the bay's depth (1.0 m back wall), its
 * height, every instrument's size and its slot in the bay, the boom directions.
 */
import * as THREE from 'three';
import { box, mat } from './kit';
import { buildPfsSubsatellite } from './pfs-subsatellite';

export interface SimBayGeometry {
  /** Outer radius of the service module skin. */
  R: number;
  /** Bottom and top of the open bay (y). */
  yLo: number;
  yHi: number;
  /** Half the sector's angular width (radians): the walls lie in the planes at +-halfArc. */
  halfArc: number;
}

export interface SimBayOptions {
  /** 15 and 16 carry the spectrometers and the subsatellite; 17 the sounder and radiometer. */
  mission?: 15 | 16 | 17;
  /** The subsatellite still in its launcher (default true for 15 and 16). */
  subsatellite?: boolean;
}

export const SIM_BACK_WALL_Z = 1.0; // estimate: the bay's depth is R - 1.0 at its centre
export const SIM_BOOM_M = 7.5; // Wikipedia "Apollo 15": 24 ft booms for the mass and gamma-ray spectrometers

export function buildSimBay(geo: SimBayGeometry, opts: SimBayOptions = {}): THREE.Group {
  const { R, yLo, yHi, halfArc } = geo;
  const mission = opts.mission ?? 15;
  const j17 = mission === 17;
  const g = new THREE.Group();
  g.name = 'sim-bay';
  const wall = mat(0x6b6e74, 0.5, 0.6);
  const wallLight = mat(0x9a9da3, 0.5, 0.5);
  const foil = mat(0xc9a24a, 0.6, 0.4, true);
  const black = mat(0x16171a, 0.4, 0.6);
  const alu = mat(0xcdd0d5, 0.6, 0.35);
  const white = mat(0xe4e2dc, 0.3, 0.5);
  const glass = mat(0x05080f, 0.2, 0.2);
  const B = SIM_BACK_WALL_Z;
  const wb = B * Math.tan(halfArc);
  const H = yHi - yLo;
  const yc = (yLo + yHi) / 2;

  // --- the recess
  const rec = new THREE.Group();
  rec.name = 'sim-bay-recess';
  g.add(rec);
  const slabShape = new THREE.Shape([
    new THREE.Vector2(-wb, B),
    new THREE.Vector2(wb, B),
    new THREE.Vector2(R * Math.sin(halfArc), R * Math.cos(halfArc)),
    new THREE.Vector2(-R * Math.sin(halfArc), R * Math.cos(halfArc)),
  ]);
  for (const [y, name] of [
    [yLo, 'floor'],
    [yHi, 'ceiling'],
  ] as const) {
    const slab = new THREE.Mesh(
      new THREE.ExtrudeGeometry(slabShape, { depth: 0.05, bevelEnabled: false }),
      wall,
    );
    slab.name = name;
    slab.rotation.x = Math.PI / 2;
    slab.position.y = y + (name === 'floor' ? 0.05 : 0.0);
    rec.add(slab);
  }
  const back = box(rec, wallLight, 2 * wb, H, 0.04, 0, yc, B);
  back.name = 'back-wall';
  for (const s of [-1, 1]) {
    const rIn = B / Math.cos(halfArc);
    const len = R - rIn;
    const side = new THREE.Group();
    side.rotation.y = s * halfArc;
    const w = box(side, wall, 0.04, H, len, 0, yc, (rIn + R) / 2);
    w.name = s < 0 ? 'side-wall-0' : 'side-wall-1';
    rec.add(side);
  }
  // shelves across the back wall, one under each instrument slot
  for (const dy of [0.5, 1.75, 3.05]) box(rec, wall, 2 * wb, 0.04, 0.2, 0, yHi - dy, B + 0.1);

  // lateral extent of the bay at depth z
  const hw = (z: number): number => z * Math.tan(halfArc) - 0.05;
  const top = yHi;

  // an instrument box with a black aperture face looking out (+z)
  const inst = (
    name: string,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    body = alu,
  ): THREE.Group => {
    const t = new THREE.Group();
    t.name = name;
    t.position.set(x, y, z);
    box(t, body, w, h, d, 0, 0, 0);
    box(t, black, w * 0.55, h * 0.3, 0.012, 0, h * 0.18, d / 2 + 0.003);
    box(t, wall, w * 1.02, 0.03, d * 1.02, 0, -h * 0.34, 0);
    g.add(t);
    return t;
  };
  const tube = (
    p: THREE.Object3D,
    m: THREE.Material,
    r: number,
    len: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh => {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, len, 20),
      m as THREE.MeshStandardMaterial,
    );
    c.rotation.x = Math.PI / 2; // axis along z (out of the bay)
    c.position.set(x, y, z);
    p.add(c);
    return c;
  };

  // --- top slot: the subsatellite in its launcher (15, 16) or the radiometer and UV spectrometer (17)
  if (!j17) {
    const launcher = new THREE.Group();
    launcher.name = 'subsatellite-launcher';
    launcher.position.set(0, top - 0.3, B + 0.22);
    box(launcher, alu, 0.92, 0.42, 0.4, 0, 0, 0);
    box(launcher, black, 0.9, 0.34, 0.01, 0, 0, 0.205);
    for (const s of [-1, 1]) box(launcher, foil, 0.05, 0.44, 0.42, s * 0.48, 0, 0);
    g.add(launcher);
    if (opts.subsatellite !== false) {
      const pfs = buildPfsSubsatellite({ deployed: false });
      // lying along x in the launcher, boom end toward -x
      pfs.rotation.z = Math.PI / 2;
      pfs.position.set(-0.39, 0, 0.0);
      pfs.scale.setScalar(0.92);
      launcher.add(pfs);
    }
  } else {
    inst('infrared-radiometer', 0.4, 0.34, 0.34, -0.2, top - 0.3, B + 0.2, white);
    inst('uv-spectrometer', 0.34, 0.34, 0.3, 0.22, top - 0.3, B + 0.18, alu);
  }

  // --- mapping camera assembly + laser altimeter
  const mapY = top - 1.2;
  const mc = inst('mapping-camera', 0.5, 0.7, 0.46, -0.2, mapY, B + 0.26, alu);
  tube(mc, black, 0.1, 0.22, 0, -0.1, 0.34);
  const stellar = new THREE.Group();
  stellar.name = 'stellar-camera';
  tube(stellar, black, 0.045, 0.24, 0, 0, 0);
  stellar.position.set(0.15, 0.25, 0.1);
  stellar.rotation.y = -0.5;
  mc.add(stellar);
  const la = new THREE.Group();
  la.name = 'laser-altimeter';
  la.position.set(0.3, mapY, B + 0.22);
  tube(la, alu, 0.11, 0.34, 0, 0, 0);
  tube(la, glass, 0.085, 0.01, 0, 0, 0.18);
  g.add(la);

  // --- panoramic camera: the biggest unit, a foil-wrapped body and the scan head's window
  const pcY = top - 2.5;
  const pc = inst(
    'panoramic-camera',
    Math.min(0.92, 2 * hw(B + 0.3)),
    1.15,
    0.6,
    0,
    pcY,
    B + 0.32,
    foil,
  );
  const win = box(pc, glass, 0.3, 0.8, 0.012, 0, 0, 0.306);
  win.name = 'scan-window';
  box(pc, alu, 0.36, 0.86, 0.01, 0, 0, 0.3);
  for (const s of [-1, 1])
    box(pc, foil, 0.02, 1.0, 0.52, (s * Math.min(0.92, 2 * hw(B + 0.3))) / 2, 0, -0.02);
  box(pc, foil, 0.5, 0.02, 0.5, 0, 0.58, 0);

  // --- low slots
  const lowY = top - 3.3;
  if (!j17) {
    inst('xray-spectrometer', 0.46, 0.42, 0.36, -0.3, lowY, B + 0.2, white);
    inst('alpha-particle-spectrometer', 0.4, 0.42, 0.36, 0.3, lowY, B + 0.2, alu);
    const booms: { arm: THREE.Mesh; tip: THREE.Group; dir: THREE.Vector3; base: THREE.Vector3 }[] =
      [];
    const mkBoom = (
      name: string,
      instName: string,
      x: number,
      dir: THREE.Vector3,
      instr: THREE.Group,
    ) => {
      const b = new THREE.Group();
      b.name = name;
      const base = new THREE.Vector3(x, yLo + 0.18, B + 0.3);
      b.position.copy(base);
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), alu);
      arm.rotation.x = Math.PI / 2;
      const tip = new THREE.Group();
      tip.name = instName;
      tip.add(instr);
      b.add(arm, tip);
      g.add(b);
      booms.push({ arm, tip, dir, base });
    };
    const grs = new THREE.Group();
    tube(grs, alu, 0.14, 0.5, 0, 0, 0);
    tube(grs, black, 0.1, 0.01, 0, 0, 0.26);
    const ms = new THREE.Group();
    box(ms, white, 0.26, 0.26, 0.3, 0, 0, 0);
    tube(ms, black, 0.05, 0.12, 0, 0, 0.2);
    mkBoom(
      'gamma-ray-boom',
      'gamma-ray-spectrometer',
      -0.3,
      new THREE.Vector3(-0.25, -0.05, 1).normalize(),
      grs,
    );
    mkBoom(
      'mass-spec-boom',
      'mass-spectrometer',
      0.3,
      new THREE.Vector3(0.25, -0.05, 1).normalize(),
      ms,
    );
    const setBoomExtension = (gamma: number, mass: number): void => {
      [gamma, mass].forEach((u, i) => {
        const bm = booms[i];
        const len = 0.1 + (SIM_BOOM_M - 0.1) * THREE.MathUtils.clamp(u, 0, 1);
        bm.arm.scale.y = len;
        bm.arm.position.z = len / 2;
        bm.tip.position.z = len + 0.25;
      });
    };
    g.userData.setBoomExtension = setBoomExtension;
    setBoomExtension(0, 0);
  } else {
    inst('lunar-sounder', 0.7, 0.5, 0.4, 0, lowY, B + 0.22, white);
  }
  g.userData.releaseSubsatellite = (): THREE.Object3D | null => {
    const pfs = g.getObjectByName('pfs-subsatellite');
    if (!pfs) return null;
    g.updateMatrixWorld(true);
    const world = pfs.matrixWorld.clone();
    pfs.removeFromParent();
    world.decompose(pfs.position, pfs.quaternion, pfs.scale);
    return pfs;
  };
  return g;
}
