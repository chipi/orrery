/**
 * Showcase lander models (no fleet-entry specs, so plain exported builders like the early probes
 * in orbiters.ts): Intuitive Machines Nova-C, the IM-1 "Odysseus" craft. Metres, upright, the
 * landing-leg feet on y = 0, front facing +z.
 *
 * Sources: the Intuitive Machines IM-1 press kit (2024) — height 4.3 m, hull diameter 1.6 m,
 * landing-gear diameter 4.6 m, a liquid-methane / liquid-oxygen main engine, top-deck and side
 * solar arrays (NASA TM-20250010290 gives 3.9 m tall by 1.6 m, hexagonal); Wikipedia for the six
 * legs and the VR900 engine (3,100 N). Search-backlog row S27. The body height and deck detail
 * are schematic.
 */
import * as THREE from 'three';

type Mat = THREE.MeshStandardMaterial;

const mat = (color: number, metalness = 0.3, roughness = 0.6, double = false): Mat =>
  new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    side: double ? THREE.DoubleSide : THREE.FrontSide,
  });

function strut(g: THREE.Object3D, m: Mat, a: THREE.Vector3, b: THREE.Vector3, r: number): void {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8), m);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  g.add(mesh);
}

export const NOVA_C_HEIGHT_M = 4.3;
export const NOVA_C_WIDTH_M = 1.6;
/** Landing-gear diameter 4.6 m (press kit): feet on a 2.3 m radius. */
const NOVA_C_FOOT_RADIUS_M = 2.3;

/** Nova-C (IM-1 Odysseus, 2024): a tall hexagonal body on six splayed legs, the engine below. */
export function buildNovaC(): THREE.Group {
  const g = new THREE.Group();
  const hull = mat(0xc9ccd2, 0.55, 0.4);
  const trim = mat(0x8a6a22, 0.6, 0.5);
  const gold = mat(0xc59a3c, 0.85, 0.3);
  const metal = mat(0x9a9ea5, 0.7, 0.4);
  const dark = mat(0x1b1c20, 0.4, 0.6);
  const cell = mat(0x1a2a55, 0.6, 0.3, true);
  const white = mat(0xe8e8e4, 0.2, 0.6);

  const R = NOVA_C_WIDTH_M / 2;
  const apothem = R * Math.cos(Math.PI / 6);
  const yBot = 1.15;
  const yTop = 3.85;

  // hexagonal body (a flat face toward +x and -x), with a gold-foil band at each end
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R, R, yTop - yBot, 6), hull);
  body.position.y = (yBot + yTop) / 2;
  g.add(body);
  for (const y of [yBot + 0.1, yTop - 0.1]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.02, R * 1.02, 0.2, 6), gold);
    band.position.y = y;
    g.add(band);
  }
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.04, R * 1.04, 0.08, 6), trim);
  deck.position.y = yTop + 0.04;
  g.add(deck);

  // two body solar panels, on opposite faces
  for (const side of [1, -1]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.7, 0.95), cell);
    p.position.set(side * (apothem + 0.03), (yBot + yTop) / 2 + 0.05, 0);
    p.userData.solarArray = true;
    g.add(p);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.78, 1.03), metal);
    frame.position.set(side * (apothem + 0.012), (yBot + yTop) / 2 + 0.05, 0);
    g.add(frame);
  }
  // top-deck solar panel and the payload items on it
  const topPanel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.88, R * 0.88, 0.03, 6), cell);
  topPanel.position.y = yTop + 0.095;
  topPanel.userData.solarArray = true;
  g.add(topPanel);
  const dishM = mat(0xe3e4e6, 0.35, 0.4, true);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2.4),
    dishM,
  );
  dish.position.set(0.3, yTop + 0.12, 0.25);
  dish.rotation.x = -0.5;
  g.add(dish);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.25), white);
  box.position.set(-0.3, yTop + 0.16, 0.1);
  g.add(box);
  strut(
    g,
    metal,
    new THREE.Vector3(-0.1, yTop + 0.1, -0.35),
    new THREE.Vector3(-0.1, NOVA_C_HEIGHT_M, -0.35),
    0.012,
  );

  // gold foil over the four faces without a solar panel (faces centred at 30° + k·60°)
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    if (Math.abs(Math.sin(a)) > 0.99) continue; // the ±x faces carry the panels
    const f = new THREE.Mesh(new THREE.BoxGeometry(R * 0.9, (yTop - yBot) * 0.72, 0.012), gold);
    f.position.set(
      Math.sin(a) * (apothem + 0.008),
      (yBot + yTop) / 2,
      Math.cos(a) * (apothem + 0.008),
    );
    f.rotation.y = a;
    g.add(f);
  }

  // reaction-control thruster pods on the upper corners, two nozzles each
  const nozzleM = mat(0x55575c, 0.7, 0.4, true);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const pod = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.1), dark);
    pod.position.set(Math.sin(a) * (R + 0.03), yTop - 0.35, Math.cos(a) * (R + 0.03));
    g.add(pod);
    for (const s of [-1, 1]) {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.03, 0.06, 10, 1, true), nozzleM);
      n.position.set(
        Math.sin(a) * (R + 0.11) + Math.cos(a) * s * 0.03,
        yTop - 0.35,
        Math.cos(a) * (R + 0.11) - Math.sin(a) * s * 0.03,
      );
      n.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-Math.sin(a), 0, -Math.cos(a)),
      );
      g.add(n);
    }
  }

  // the externally mounted helium tank (Odysseus came to rest on it, Wikipedia IM-1) and a
  // sensor box low on the hull (schematic placement)
  const tankM = mat(0xb9bcc2, 0.6, 0.35);
  const he = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.7, 8, 16), tankM);
  he.position.set(
    Math.sin(Math.PI / 6) * (apothem + 0.2),
    1.9,
    Math.cos(Math.PI / 6) * (apothem + 0.2),
  );
  g.add(he);
  for (const y of [1.65, 2.15])
    strut(
      g,
      metal,
      new THREE.Vector3(Math.sin(Math.PI / 6) * apothem, y, Math.cos(Math.PI / 6) * apothem),
      new THREE.Vector3(
        Math.sin(Math.PI / 6) * (apothem + 0.12),
        y,
        Math.cos(Math.PI / 6) * (apothem + 0.12),
      ),
      0.015,
    );
  const sensor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.14), dark);
  sensor.position.set(0, yBot + 0.25, -(apothem + 0.07));
  g.add(sensor);

  // the main engine: a gimbaled bell under the body
  const bell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.1, 0.62, 24, 1, true),
    mat(0x2a2b30, 0.6, 0.5, true),
  );
  bell.position.y = yBot - 0.31;
  g.add(bell);
  // where the descent scene lights the braking plume (the bell's exit)
  g.userData.engineExitY = yBot - 0.62;
  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 16), metal);
  mount.position.y = yBot - 0.02;
  g.add(mount);

  // six landing legs: each splays from the lower body to a footpad, with an upper brace
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i * Math.PI) / 3;
    const dir = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const foot = dir.clone().multiplyScalar(NOVA_C_FOOT_RADIUS_M).setY(0.05);
    const lower = dir
      .clone()
      .multiplyScalar(R * 0.9)
      .setY(yBot + 0.15);
    const upper = dir
      .clone()
      .multiplyScalar(R * 0.95)
      .setY(2.45);
    strut(g, metal, lower, foot, 0.04);
    strut(g, metal, upper, foot.clone().lerp(lower, 0.55), 0.025);
    // the shock-absorbing sleeve on the main strut and the knee where the brace meets it
    strut(g, dark, lower.clone().lerp(foot, 0.25), lower.clone().lerp(foot, 0.5), 0.06);
    const knee = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), metal);
    knee.position.copy(foot.clone().lerp(lower, 0.55));
    g.add(knee);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.05, 20), dark);
    pad.position.copy(foot).setY(0.025);
    g.add(pad);
  }
  return g;
}
