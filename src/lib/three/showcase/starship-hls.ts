/**
 * Showcase model: Starship HLS, the Human Landing System SpaceX builds for NASA's Artemis
 * landings. Drawn from NASA's renders of the lander (Wikimedia Commons "Starship HLS.png"):
 * the Starship ship without flaps and without heat-shield tiles, painted white over most of its
 * length, a ring of landing thrusters high on the body, a row of crew windows and the airlock
 * near the nose, the crew elevator running down the side, landing legs at the base.
 *
 * Landed: legs down, footpads on y = 0, front (windows, elevator) facing +z.
 * `userData.thrusterSites` lists the landing thrusters' exits (metres, model frame): the descent
 * burn comes from them, not from the Raptors.
 */
import * as THREE from 'three';
import { box, lathe, mat, strut, type Mat } from './kit';

// Metres. Height and diameter: the Starship ship, 50 m x 9 m (Wikipedia, Starship); the rest is
// read off the NASA render and marked estimate.
const R = 4.5;
const HEIGHT = 50;
const BODY_BASE = 2; // estimate: the engine skirt below the tank
const NOSE_BASE = 36; // estimate: where the ogive starts (about 30 % of the height)
const STAINLESS_TOP = 14; // estimate: bare stainless below, white paint above
const THRUSTER_Y = 33; // estimate: "about two-thirds up", just under the nose seam
const THRUSTER_COUNT = 12; // estimate
const LEG_COUNT = 6; // estimate: Starship's landing legs
const PAD_R = 8.5; // estimate: footpad radius from the axis

function nosePts(): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const s = i / 24;
    pts.push([
      Math.max(0.25, R * Math.pow(Math.cos((s * Math.PI) / 2), 0.7)),
      NOSE_BASE + s * (HEIGHT - NOSE_BASE),
    ]);
  }
  return pts;
}

/** A point on the hull at angle `a` (0 = +z, towards +x) and height y, pushed out by `out`. */
function onHull(a: number, y: number, out = 0): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(a) * (R + out), y, Math.cos(a) * (R + out));
}

export function buildStarshipHls(): THREE.Group {
  const g = new THREE.Group();
  const M: Record<string, Mat> = {
    white: mat(0xf0f1f2, 0.25, 0.5),
    steel: mat(0xc3c7cc, 0.6, 0.35),
    seam: mat(0xaeb2b8, 0.5, 0.4),
    dark: mat(0x1a1c20, 0.4, 0.5),
    glass: mat(0x0b0d12, 0.7, 0.15),
    pod: mat(0x8b9097, 0.5, 0.45),
    bell: mat(0x55595f, 0.7, 0.4),
    gold: mat(0xb7933e, 0.7, 0.35),
  };

  // Hull: stainless to STAINLESS_TOP, white above, the ogive white.
  lathe(g, M.steel, [
    [R, BODY_BASE],
    [R, STAINLESS_TOP],
  ]);
  lathe(g, M.white, [
    [R * 1.002, STAINLESS_TOP],
    [R * 1.002, NOSE_BASE],
  ]);
  lathe(g, M.white, nosePts());
  lathe(
    g,
    M.dark,
    [
      [R * 0.8, BODY_BASE - 0.3],
      [R * 0.8, BODY_BASE],
    ],
    24,
  );
  // Tank ring welds, drawn as raised bands.
  for (const y of [STAINLESS_TOP, 22, 28, NOSE_BASE - 1.2]) {
    lathe(g, M.seam, [
      [R * 1.006, y - 0.12],
      [R * 1.006, y + 0.12],
    ]);
  }

  // Engine bay: three sea-level and three vacuum Raptor bells under the skirt (as Starship).
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 1.8, 16, 1, true), M.bell);
    c.position.set(Math.sin(a) * 1.2, BODY_BASE + 0.1, Math.cos(a) * 1.2);
    g.add(c);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.7, 2.6, 20, 1, true), M.bell);
    v.position.set(
      Math.sin(a + Math.PI / 3) * 3.1,
      BODY_BASE - 0.1,
      Math.cos(a + Math.PI / 3) * 3.1,
    );
    g.add(v);
  }

  // Landing legs: a slanted strut from the hull above the skirt to a footpad on y = 0.
  for (let i = 0; i < LEG_COUNT; i++) {
    const a = (i / LEG_COUNT) * Math.PI * 2 + Math.PI / LEG_COUNT;
    const foot = new THREE.Vector3(Math.sin(a) * PAD_R, 0.5, Math.cos(a) * PAD_R);
    strut(g, M.steel, onHull(a, 7.5, 0.1), foot, 0.32);
    strut(g, M.pod, onHull(a, 3.5, 0.1), foot, 0.18);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.5, 20), M.steel);
    pad.position.set(foot.x, 0.25, foot.z);
    g.add(pad);
    const hinge = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.9), M.seam);
    hinge.position.copy(onHull(a, 7, 0.2));
    hinge.rotation.y = a;
    g.add(hinge);
  }

  // Landing thrusters: a ring of pods on the hull, a nozzle under each.
  const sites: THREE.Vector3[] = [];
  for (let i = 0; i < THRUSTER_COUNT; i++) {
    const a = ((i + 0.5) / THRUSTER_COUNT) * Math.PI * 2;
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.8, 0.8), M.pod);
    pod.position.copy(onHull(a, THRUSTER_Y, 0.25));
    pod.rotation.y = a;
    g.add(pod);
    const nz = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.2, 0.9, 12, 1, true), M.bell);
    const q = onHull(a, THRUSTER_Y - 1.3, 0.45);
    nz.position.copy(q);
    g.add(nz);
    sites.push(new THREE.Vector3(q.x, q.y - 0.45, q.z));
  }
  g.userData.thrusterSites = sites;

  // Crew windows: four dark ovals above the thruster ring, on the +z face (as in the render).
  for (let i = 0; i < 4; i++) {
    const a = (-1.5 + i) * 0.085;
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.12, 20), M.glass);
    w.scale.set(1, 1, 1.5);
    w.position.copy(onHull(a, 40.2, 0.02));
    w.rotation.order = 'YXZ';
    w.rotation.set(Math.PI / 2, a, 0);
    g.add(w);
  }
  // Airlock hatch above the windows.
  const lock = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.6, 0.3), M.dark);
  lock.position.copy(onHull(0, 43.8, 0.03));
  g.add(lock);

  // Crew elevator: three rails down the +z face from the airlock, the car parked part way down.
  for (const x of [-1.1, 0, 1.1]) {
    box(g, M.seam, 0.5, 32, 0.4, x, 21.5, Math.sqrt(R * R - x * x) + 0.1);
  }
  box(g, M.steel, 2.8, 0.25, 1.9, 0, 12, R + 0.9); // car floor, estimate: parked mid-way
  box(g, M.seam, 2.8, 1.1, 0.15, 0, 12.7, R + 1.8);

  // Docking port at the nose tip.
  const port = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.3, 16), M.gold);
  port.position.set(0, HEIGHT - 0.1, 0);
  g.add(port);

  return g;
}

/**
 * Sources: Wikipedia "Starship HLS" (about 50 m x 9 m, no flaps, no heat shield) and NASA's
 * render on Wikimedia Commons (File:Starship_HLS.png). Not in SHOWCASE yet: the craft viewer
 * keys models by fleet entry and Starship HLS has none.
 */
export const STARSHIP_HLS_HEIGHT_M = HEIGHT;
