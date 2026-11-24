/**
 * The Apollo 15 / 16 Particles and Fields Subsatellite (PFS-1, PFS-2): a hexagonal prism spun up
 * and ejected from the service module's SIM bay just before the trans-Earth injection, three
 * hinged booms on one end and a short spin-up cylinder on the other.
 *
 * Stands on its spin-up end: axis along +y, the boom end on top, centred on x = 0, z = 0. Named
 * parts: 'pfs-body' (the prism), 'boom-0..2' (hinge groups at the boom-end corners, each holding
 * its 'boom-N-arm'; 'boom-0' ends in the 'magnetometer', 'boom-1'/'boom-2' in 'tip-mass-N'),
 * 'spin-up-cylinder', 's-band-antenna'. `userData.setDeploy(u)` folds the booms from stowed
 * (u = 0, alongside the body) to deployed (u = 1, radial in the end-platform plane).
 *
 * Sources: NSSDCA, Apollo 15 Subsatellite (1971-063D): hexagonal cylinder 78 cm long, about 36 cm
 * across opposite corners, 36.3 kg, three 1.5 m deployable booms hinged to one end platform, a
 * fluxgate magnetometer on one boom and tip masses on the other two, a short spin-up cylinder on
 * the opposite platform, an S-band antenna on the panel opposite the booms, solar cells on the
 * side panels. The cylinder's and antenna's sizes, the hinge blocks and the cell grid are
 * estimates from the artist's drawings (the NASA subsatellite sketches). Apollo 15 Mission Report
 * (https://ntrs.nasa.gov/citations/19720021182, A.4.2): "hexagonal in shape, 30 inches in length,
 * and weighs approximately 85 pounds ... three equally-spaced booms ... deployed ... to a length of
 * 5 feet"; the Press Kit says 31 in, a 14-in hexagon and 78.5 lb: the sources disagree on the mass
 * and by an inch on the length, NSSDCA's figures stand.
 */
import * as THREE from 'three';
import { add, box, mat, strut } from './kit';

export const PFS_LENGTH_M = 0.78;
export const PFS_ACROSS_CORNERS_M = 0.36;
export const PFS_BOOM_M = 1.5;
export const PFS_MASS_KG = 36.3;

export interface PfsOptions {
  /** Booms out (default) or folded against the body as when it sat in the launcher. */
  deployed?: boolean;
}

export function buildPfsSubsatellite(opts: PfsOptions = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = 'pfs-subsatellite';
  const cell = mat(0x1d2a4a, 0.6, 0.35);
  const frame = mat(0xb9bcc2, 0.7, 0.4);
  const gold = mat(0xc8962f, 0.6, 0.4, true);
  const dark = mat(0x23252a, 0.5, 0.6);
  const white = mat(0xe4e2dc, 0.3, 0.5);
  const R = PFS_ACROSS_CORNERS_M / 2;
  const L = PFS_LENGTH_M;

  const body = new THREE.Group();
  body.name = 'pfs-body';
  g.add(body);
  // six solar panels, each a cell sheet in a frame; a corner points along +x
  const flat = R * Math.cos(Math.PI / 6);
  const side = R; // a regular hexagon's side equals its corner radius
  for (let i = 0; i < 6; i++) {
    const a = (i + 0.5) * (Math.PI / 3);
    const panel = new THREE.Group();
    panel.rotation.y = -a + Math.PI / 2;
    panel.position.set(Math.cos(a) * flat, L / 2, Math.sin(a) * flat);
    box(panel, frame, side, L, 0.012, 0, 0, 0);
    box(panel, cell, side * 0.92, L * 0.94, 0.014, 0, 0, 0);
    for (let k = 1; k < 6; k++)
      box(panel, frame, 0.004, L * 0.94, 0.016, (k / 6 - 0.5) * side, 0, 0);
    for (let k = 1; k < 8; k++)
      box(panel, frame, side * 0.92, 0.004, 0.016, 0, (k / 8 - 0.5) * L, 0);
    body.add(panel);
  }
  for (const y of [0.006, L - 0.006]) {
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(R, R, 0.012, 6), frame);
    cap.position.y = y;
    cap.rotation.y = Math.PI / 6;
    body.add(cap);
  }

  // short spin-up cylinder under the platform, S-band antenna on the same end
  const spin = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.08, 20), gold);
  spin.name = 'spin-up-cylinder';
  spin.position.y = -0.04;
  g.add(spin);
  const ant = new THREE.Group();
  ant.name = 's-band-antenna';
  strut(ant, white, new THREE.Vector3(0.1, 0, 0), new THREE.Vector3(0.1, -0.12, 0), 0.006, 6);
  add(ant, new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), white)).position.set(
    0.1,
    -0.12,
    0,
  );
  g.add(ant);

  // three booms, hinged at alternate corners of the boom-end platform
  const booms: THREE.Group[] = [];
  for (let i = 0; i < 3; i++) {
    const th = (i / 3) * Math.PI * 2;
    const hinge = new THREE.Group();
    hinge.name = `boom-${i}`;
    hinge.position.set(Math.cos(th) * R, L, Math.sin(th) * R);
    hinge.rotation.y = -th; // local +x is radial
    box(hinge, dark, 0.05, 0.03, 0.04, 0.0, 0.015, 0);
    const arm = new THREE.Group();
    arm.name = `boom-${i}-arm`;
    arm.position.y = 0.03;
    strut(arm, frame, new THREE.Vector3(0, 0, 0), new THREE.Vector3(PFS_BOOM_M, 0, 0), 0.006, 6);
    if (i === 0) {
      const mag = box(arm, dark, 0.07, 0.035, 0.035, PFS_BOOM_M, 0, 0);
      mag.name = 'magnetometer';
    } else {
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), frame);
      tip.name = `tip-mass-${i}`;
      tip.rotation.z = Math.PI / 2;
      tip.position.x = PFS_BOOM_M;
      arm.add(tip);
    }
    hinge.add(arm);
    g.add(hinge);
    booms.push(arm);
  }
  const setDeploy = (u: number): void => {
    const k = THREE.MathUtils.clamp(u, 0, 1);
    for (const arm of booms) {
      arm.rotation.z = -(Math.PI / 2) * (1 - k);
      // stowed, the 1.5 m booms are half length so they lie within the 78 cm body (estimate:
      // the real ones folded; no source gives how)
      arm.scale.x = 0.5 + 0.5 * k;
    }
  };
  g.userData.setDeploy = setDeploy;
  g.userData.massKg = PFS_MASS_KG;
  setDeploy(opts.deployed === false ? 0 : 1);
  return g;
}
