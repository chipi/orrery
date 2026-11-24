/**
 * The Scientific Instrument Module (SIM) bay of the Apollo J-mission service module (Apollo 15,
 * 16, 17): service-module sector 1 with its skin panel gone (the door was jettisoned on the way
 * to the Moon), an open recess in the radial planes of the sector's two beams, and the
 * instruments inside, looking out at the Moon.
 *
 * Frame: the CSM model's own (y up, the sector's centre on +z, z outward). `buildSimBay` returns
 * the group 'sim-bay'; named parts:
 *  - 'sim-bay-recess' (floor, ceiling, back wall, two side walls, two curved shelves),
 *  - Apollo 15 / 16: 'subsatellite-launcher' (holding 'pfs-subsatellite' until released),
 *    'mapping-camera' (with 'stellar-camera'), 'laser-altimeter', 'panoramic-camera',
 *    'xray-spectrometer', 'alpha-particle-spectrometer', 'gamma-ray-boom' > 'gamma-ray-spectrometer',
 *    'mass-spec-boom' > 'mass-spectrometer',
 *  - Apollo 17: 'mapping-camera', 'laser-altimeter', 'panoramic-camera', 'lunar-sounder',
 *    'infrared-radiometer', 'uv-spectrometer' (no spectrometer booms, no subsatellite).
 * `userData.setBoomExtension(gamma, mass)` slides the two spectrometer booms out from stowed (0)
 * to the lengths they flew at (1); `userData.releaseSubsatellite()` returns the subsatellite,
 * removed from the launcher with its transform set to the world one it had.
 *
 * SOURCED (the layout comes from the Apollo 15 Mission Report's figure A-1, "Apollo 15 scientific
 * instrument module", read as a picture, and from the photographs AS15-88-11972 and AS17-145-22254):
 *  - Sector 1, bolted "to radial beams 1 and 6, to the new cryogenic tank panel, and to the aft
 *    bulkhead"; "sides ... aluminum stiffened sheet, and the shelves that supported the
 *    instruments were made of bonded aluminum sandwich" (Apollo 15 Mission Report, NASA TM X-68394,
 *    A.1.1, https://ntrs.nasa.gov/citations/19720021182). Two shelves cut the bay in three
 *    compartments, at about 18 % and 74 % of its height from the top (figure A-1 and the A17 photo).
 *  - Top compartment: mapping camera (with the stellar camera "integrated into a single unit
 *    which was deployed on a rail-type mechanism") and the laser altimeter; middle: the 24-inch
 *    panoramic camera and, on 15/16, the subsatellite launcher beside it; bottom: the X-ray /
 *    alpha-particle spectrometer "housed in the same enclosure", the gamma-ray spectrometer and
 *    the mass spectrometer (same report, A.4.2 and figure A-1).
 *  - Gamma-ray spectrometer "mounted on a 25-foot boom" (7.62 m); mass spectrometer "on a 24-foot
 *    boom" (7.32 m) (same report, A.4.2). The report's 25 ft vs Wikipedia's 24 ft for both: the
 *    mission report wins.
 *  - Inside surfaces coated with a paint of absorptivity/emissivity 0.3/0.85 (light), beams and
 *    their faces 0.05/0.4 (bright metal); "protective covers and thermal blankets" over the
 *    instruments, in the photographs dark crinkled mylar over the cameras, white painted boxes for
 *    the spectrometers and the sounder electronics, olive-tan for the subsatellite housing.
 *  - Panoramic camera: "The camera assembly envelope is 25 x 29 x 60 inches" (0.64 x 0.74 x 1.52 m),
 *    film cassette "19 inches in diameter and 7 inches wide", mounted "on rails ... attached to
 *    shelves in the SIM with the centerline of the camera displaced 8.25 inches from the
 *    centerline of the SIM" (Apollo 15 SIM Bay Photographic Equipment and Mission Summary,
 *    https://pds-geosciences.wustl.edu/lunar/urn-nasa-pds-apollodoc/document_a15/photographic_support/ap15_sim_photo_equip.pdf).
 *    Mapping camera subsystem (camera, stellar camera, altimeter, rails): "8 x 22 x 51 inches",
 *    film container "11 inches in diameter by 9 inches wide", "mounted on the forward side of the
 *    SIM shelf parallel to the centerline", the laser altimeter "hard mounted to the Mapping
 *    [camera]" (same document).
 *  - Subsatellite "housed in a container resembling a rural mailbox ... 31 inches long, has a
 *    14-inch hexagonal diameter" (Apollo 15 Press Kit, https://ntrs.nasa.gov/citations/20130009855).
 *    "Sector I ... J-mission SIM bay", the RCS packages sit in sectors II, III, V and VI (same).
 *  - Apollo 17: "The radar and optical recorder are located in the lower portions of the SIM
 *    bay"; the infrared radiometer and the UV spectrometer "mounted on the bottom shelf"; the
 *    UV spectrometer "0.5 meter (20 inches) focal-length"; two HF dipole booms of 410 in (10.4 m)
 *    each "deploy from the base of the SIM" (Apollo 17 Press Kit,
 *    https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A17_PressKit.pdf, and Mission
 *    Report 15.1.3: "tubular antenna 410 inches in length"); they stay stowed here.
 *  - Apollo 17: the sounder and radiometer replace the spectrometers and the subsatellite (Apollo
 *    17 Mission Report, https://ntrs.nasa.gov/citations/19730015117, 10.11 and 10.12).
 * NOT FOUND in any source: the bay's own depth and height (the 1.0 m back wall and the sector's
 * extent are the CSM model's), the compartments' exact heights (read off the figure and photos),
 * the gamma-ray detector can, X-ray/alpha housing, mass-spectrometer, sounder and radiometer box
 * sizes, which of 25 / 29 in is the pan camera's width, the boom directions and diameters, the
 * subsatellite's orientation in its launcher (end-on, boom end out, from figure A-1's hexagon
 * with the hinge blocks showing).
 */
import * as THREE from 'three';
import { box, crinkle, mat } from './kit';
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
export const SIM_GAMMA_BOOM_M = 25 * 0.3048; // Apollo 15 Mission Report A.4.2: "25-foot boom"
export const SIM_MASS_BOOM_M = 24 * 0.3048; // Apollo 15 Mission Report A.4.2: "24-foot boom"
export const SIM_BOOM_M = SIM_GAMMA_BOOM_M; // kept for the earlier single-length name

/** Shelf heights as fractions of the bay height from its top (figure A-1; the A17 photo agrees). */
const SHELF_FRAC = [0.18, 0.74] as const;

export function buildSimBay(geo: SimBayGeometry, opts: SimBayOptions = {}): THREE.Group {
  const { R, yLo, yHi, halfArc } = geo;
  const mission = opts.mission ?? 15;
  const j17 = mission === 17;
  const g = new THREE.Group();
  g.name = 'sim-bay';
  const wall = mat(0x9a9b98, 0.3, 0.65);
  const wallLight = mat(0xb4b4ae, 0.3, 0.65);
  const rail = mat(0x9ea2a8, 0.7, 0.35);
  const metal = mat(0xb4b8bf, 0.65, 0.35);
  const blanket = mat(0x1c1d22, 0.55, 0.45, true);
  const white = mat(0xdcdad2, 0.25, 0.5);
  const olive = mat(0x6b6445, 0.3, 0.65);
  const black = mat(0x101114, 0.4, 0.55);
  const glass = mat(0x05080f, 0.2, 0.2);
  const B = SIM_BACK_WALL_Z;
  const wb = B * Math.tan(halfArc);
  const H = yHi - yLo;
  const yc = (yLo + yHi) / 2;
  const shelfY = SHELF_FRAC.map((f) => yHi - f * H);

  // --- the recess: floor, ceiling and two shelves are curved to the skin, like the real ones
  const rec = new THREE.Group();
  rec.name = 'sim-bay-recess';
  g.add(rec);
  const ptsOf = (rFront: number): THREE.Vector2[] => {
    const pts = [new THREE.Vector2(-wb, B), new THREE.Vector2(wb, B)];
    for (let i = 0; i <= 10; i++) {
      const a = halfArc - (2 * halfArc * i) / 10;
      pts.push(new THREE.Vector2(rFront * Math.sin(a), rFront * Math.cos(a)));
    }
    return pts;
  };
  const slabShape = new THREE.Shape(ptsOf(R - 0.01));
  const shelfShape = new THREE.Shape(ptsOf(R - 0.04));
  const slabs: [number, string, THREE.Shape, THREE.Material][] = [
    [yLo, 'floor', slabShape, wall],
    [yHi, 'ceiling', slabShape, wall],
    [shelfY[0], 'shelf-0', shelfShape, wallLight],
    [shelfY[1], 'shelf-1', shelfShape, wallLight],
  ];
  for (const [y, name, shape, m] of slabs) {
    const slab = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false }),
      m,
    );
    slab.name = name;
    slab.rotation.x = Math.PI / 2;
    slab.position.y = y + (name === 'ceiling' ? 0.0 : 0.05);
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
    // the extravehicular handrail along the side, a metre-ish clear of the skin
    const hr = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, H - 0.2, 6), rail);
    const zr = R * Math.cos(halfArc) - 0.16;
    hr.position.set(s * (zr * Math.tan(halfArc) - 0.05), yc, zr);
    rec.add(hr);
  }

  const top = yHi;

  // a thermal-blanket-wrapped box: crinkled mylar, dark
  const wrap = (
    p: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh => {
    const m = new THREE.Mesh(crinkle(new THREE.BoxGeometry(w, h, d, 4, 4, 4), 0.01), blanket);
    m.position.set(x, y, z);
    p.add(m);
    return m;
  };
  const tube = (
    p: THREE.Object3D,
    m: THREE.Material,
    r: number,
    len: number,
    x: number,
    y: number,
    z: number,
    seg = 20,
  ): THREE.Mesh => {
    const c = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, len, seg),
      m as THREE.MeshStandardMaterial,
    );
    c.rotation.x = Math.PI / 2; // axis along z (out of the bay)
    c.position.set(x, y, z);
    p.add(c);
    return c;
  };
  const unit = (name: string, x: number, y: number, z: number): THREE.Group => {
    const t = new THREE.Group();
    t.name = name;
    t.position.set(x, y, z);
    g.add(t);
    return t;
  };
  const handle = (p: THREE.Object3D, w: number, x: number, y: number, z: number): void => {
    box(p, rail, w, 0.025, 0.035, x, y, z);
  };

  // --- top compartment: mapping camera + stellar camera on its rail, and the laser altimeter
  const topY = (top + shelfY[0]) / 2;
  // body 22 in wide, 11 in film container high, along the bay's centreline (subsystem 8 x 22 x 51 in)
  const mc = unit('mapping-camera', 0.1, topY - 0.02, B + 0.4);
  wrap(mc, 0.56, 0.28, 0.7, 0, 0, 0);
  tube(mc, black, 0.12, 0.14, 0, 0, 0.42);
  tube(mc, glass, 0.09, 0.01, 0, 0, 0.495);
  box(mc, metal, 0.6, 0.03, 0.7, 0, -0.155, 0); // the carriage on its rails
  const stellar = new THREE.Group();
  stellar.name = 'stellar-camera';
  tube(stellar, black, 0.05, 0.24, 0, 0, 0);
  stellar.position.set(0.15, 0.2, 0.1);
  stellar.rotation.y = -0.5;
  mc.add(stellar);
  const la = unit('laser-altimeter', -0.36, topY - 0.02, B + 0.3);
  tube(la, black, 0.12, 0.42, 0, 0, 0);
  tube(la, metal, 0.125, 0.04, 0, 0, 0.13);
  tube(la, glass, 0.09, 0.01, 0, 0, 0.215);

  // --- middle compartment: the panoramic camera, the biggest unit (a 24-inch Itek)
  const midTop = shelfY[0];
  const midBot = shelfY[1];
  // envelope 25 x 29 x 60 in, its centreline 8.25 in off the bay's (+x here, on every mission)
  const pcH = 1.524;
  const pcW = 0.74;
  const pcD = 0.64;
  const pc = unit('panoramic-camera', 0.21, (midTop + midBot) / 2, B + 0.07 + pcD / 2);
  box(pc, white, pcW, pcH, pcD, 0, 0, 0); // main frame
  wrap(pc, pcW + 0.04, pcH * 0.34, pcD + 0.04, 0, pcH * 0.33, 0);
  handle(pc, 0.16, 0, pcH * 0.33 - 0.1, pcD / 2 + 0.04);
  wrap(pc, pcW + 0.04, pcH * 0.16, pcD + 0.04, 0, -pcH * 0.42, 0);
  handle(pc, 0.16, 0, -pcH * 0.42, pcD / 2 + 0.04);
  box(pc, metal, pcW * 0.9, pcH * 0.22, 0.02, 0, -0.05, pcD / 2 + 0.01); // the film cassette's cover
  // the scan head: a round port with a rim
  tube(pc, metal, 0.19, 0.04, 0, -pcH * 0.2, pcD / 2 + 0.03);
  const win = tube(pc, glass, 0.15, 0.012, 0, -pcH * 0.2, pcD / 2 + 0.05);
  win.name = 'scan-window';
  // the rails it rides on, bolted to the two shelves
  for (const s of [-1, 1]) {
    box(g, rail, 0.07, 0.1, 0.55, 0.21 + s * 0.3, midTop - 0.07, B + 0.07 + pcD / 2);
    box(g, rail, 0.07, 0.1, 0.55, 0.21 + s * 0.3, midBot + 0.08, B + 0.07 + pcD / 2);
  }

  // --- bottom compartment
  const lowY = (shelfY[1] + yLo) / 2 + 0.03;
  if (!j17) {
    const xr = unit('xray-spectrometer', -0.08, lowY, B + 0.3);
    box(xr, white, 0.4, 0.5, 0.42, 0, 0, 0);
    box(xr, black, 0.3, 0.05, 0.02, 0, 0.1, 0.22); // the detector's protective cover
    const al = unit('alpha-particle-spectrometer', 0.25, lowY, B + 0.3);
    box(al, white, 0.28, 0.5, 0.42, 0, 0, 0);
    box(al, black, 0.2, 0.05, 0.02, 0, 0.1, 0.22);
    const booms: { arm: THREE.Mesh; tip: THREE.Group; len: number }[] = [];
    const mkBoom = (
      name: string,
      instName: string,
      stow: THREE.Vector3,
      dir: THREE.Vector3,
      len: number,
      instr: THREE.Group,
    ) => {
      const b = new THREE.Group();
      b.name = name;
      // the instrument sits 0.35 m along the boom at u = 0: put the root behind it
      b.position.copy(stow).addScaledVector(dir, -0.35);
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 8), metal);
      arm.rotation.x = Math.PI / 2;
      const tip = new THREE.Group();
      tip.name = instName;
      tip.add(instr);
      b.add(arm, tip);
      g.add(b);
      booms.push({ arm, tip, len });
    };
    // gamma-ray spectrometer: the hatched silver detector can on the end of the 25-ft boom
    const grs = new THREE.Group();
    tube(grs, metal, 0.14, 0.5, 0, 0, 0);
    for (const z of [-0.15, 0, 0.15]) tube(grs, black, 0.145, 0.03, 0, 0, z);
    tube(grs, black, 0.1, 0.01, 0, 0, 0.255);
    // mass spectrometer: the white electronics box with the ion source in front, on the 24-ft boom
    const ms = new THREE.Group();
    box(ms, white, 0.24, 0.3, 0.3, 0, 0, 0);
    tube(ms, black, 0.06, 0.14, 0, 0, 0.2);
    handle(ms, 0.1, 0, 0.17, 0);
    mkBoom(
      'gamma-ray-boom',
      'gamma-ray-spectrometer',
      new THREE.Vector3(-0.44, lowY - 0.02, B + 0.6),
      new THREE.Vector3(-0.25, -0.05, 1).normalize(),
      SIM_GAMMA_BOOM_M,
      grs,
    );
    mkBoom(
      'mass-spec-boom',
      'mass-spectrometer',
      new THREE.Vector3(0.5, lowY + 0.05, B + 0.5),
      new THREE.Vector3(0.25, -0.05, 1).normalize(),
      SIM_MASS_BOOM_M,
      ms,
    );
    const setBoomExtension = (gamma: number, mass: number): void => {
      [gamma, mass].forEach((u, i) => {
        const bm = booms[i];
        const len = 0.1 + (bm.len - 0.1) * THREE.MathUtils.clamp(u, 0, 1);
        bm.arm.scale.y = len;
        bm.arm.position.z = len / 2;
        bm.tip.position.z = len + 0.25;
      });
    };
    g.userData.setBoomExtension = setBoomExtension;
    setBoomExtension(0, 0);

    // --- the subsatellite launcher, left of the panoramic camera in the middle compartment
    // 31 x 14 in hexagon in "a container resembling a rural mailbox": a box with an arched top
    const launcher = unit('subsatellite-launcher', -0.44, midBot + 0.36, B + 0.5);
    box(launcher, olive, 0.5, 0.3, 0.82, 0, -0.1, 0);
    const arch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 0.82, 16, 1, false, Math.PI / 2, Math.PI),
      olive,
    );
    arch.rotation.x = Math.PI / 2;
    arch.position.y = 0.05;
    launcher.add(arch);
    for (const s of [-1, 1]) box(launcher, metal, 0.02, 0.32, 0.84, s * 0.255, -0.1, 0); // flanges
    // the hinged door swung open, with its three ejection ribs
    const door = new THREE.Group();
    door.position.set(-0.25, -0.25, 0.0);
    door.rotation.z = 0.9;
    box(door, olive, 0.5, 0.02, 0.82, 0.25, 0, 0);
    for (const x of [0.12, 0.25, 0.38]) box(door, metal, 0.03, 0.03, 0.66, x, 0.02, 0);
    launcher.add(door);
    if (opts.subsatellite !== false) {
      const pfs = buildPfsSubsatellite({ deployed: false });
      // end-on: boom end out (+z), as figure A-1 shows the hexagon with the hinge blocks
      pfs.rotation.x = Math.PI / 2;
      pfs.position.set(0, 0, -0.37);
      pfs.scale.setScalar(0.96);
      launcher.add(pfs);
    }
  } else {
    // Apollo 17: the lunar sounder's white electronics boxes and the two scanners, aft end
    const aftY = (shelfY[1] + yLo) / 2 + 0.03;
    const ls = unit('lunar-sounder', 0.0, aftY, B + 0.38);
    box(ls, white, 0.5, 0.78, 0.5, 0.0, 0.0, 0);
    box(ls, metal, 0.52, 0.03, 0.52, 0, 0.405, 0);
    box(ls, white, 0.34, 0.34, 0.3, 0.42, -0.1, -0.04);
    const ir = unit('infrared-radiometer', -0.45, aftY - 0.1, B + 0.3);
    wrap(ir, 0.34, 0.5, 0.4, 0, 0, 0);
    tube(ir, black, 0.07, 0.1, 0, 0.05, 0.24);
    const uv = unit('uv-spectrometer', 0.48, aftY + 0.15, B + 0.35);
    box(uv, white, 0.26, 0.3, 0.5, 0, 0, 0); // 0.5 m focal length Ebert spectrometer
    tube(uv, black, 0.05, 0.08, 0, 0, 0.29);
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
