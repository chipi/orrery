/**
 * Showcase model: Blue Moon Mk 2, Blue Origin's crewed lunar lander (NASA's Artemis V lander).
 * Drawn from NASA's render of the lander (Wikimedia Commons "NASA 2 HLS (cropped) Blue Moon
 * MK2.jpg") and the full-size cabin prototype at Johnson (Commons "Blue Moon Mk 2 lander
 * full-size prototype May 2026"): four gold-foil-wrapped landing legs with round pads, a black
 * thermal skirt over the BE-7 engine bay, the grey crew deck with its round side hatch, windows
 * and the folding service ladder, two pale tank domes held in an open truss, and the white
 * ascent cabin on top with its blue band, NASA roundel panel and antenna dishes.
 *
 * Landed: legs down, footpads on y = 0, front (windows, flag, ladder) facing +z.
 * `userData.thrusterSites` lists the BE-7 exits (metres, model frame): the descent burn comes
 * from them.
 */
import * as THREE from 'three';
import { box, crinkle, dish, lathe, mat, strut, type Mat } from './kit';

// Metres. Overall height ~16 m: Blue Origin's stated figure for the Mk 2 as the brief gave it
// (the cabin alone is "over 5 m", NASA caption on the prototype photo); everything else is read
// off the render and marked estimate.
export const BLUE_MOON_MK2_HEIGHT_M = 16;
const R = 3.5; // estimate: the render's body is about 3.5 m in radius
const ENGINE_Y = 2.2; // estimate: top of the skirt / bottom of the gold band
const DECK_Y = 3.6; // estimate: base of the crew deck
const DECK_TOP = 7.4; // estimate
const TANK_TOP = 11.2; // estimate: the truss between deck and cabin
const CABIN_BASE = 10.6;
const BE7_COUNT = 3; // estimate: the Mk 2 descent engines are BE-7s; the count is not read off a source here
const LEG_COUNT = 4; // render: four visible legs
const PAD_R = 6.6; // estimate

function onHull(a: number, y: number, out = 0): THREE.Vector3 {
  return new THREE.Vector3(Math.sin(a) * (R + out), y, Math.cos(a) * (R + out));
}

/** The RCS quads puff in turn through the powered descent; pure in t, so a scrub is exact. */
export function blueMoonRcs(
  lander: THREE.Object3D,
  t: number,
  firing: boolean,
  frame: number,
): void {
  const quads = lander.userData.rcsQuads as THREE.Object3D[] | undefined;
  (quads ?? []).forEach((q, i) => {
    q.visible = firing && Math.sin(t * 1.3 + i * 1.7) > 0.35;
    if (q.visible) q.scale.setScalar(1 + 0.25 * Math.sin(frame * 1.3 + i));
  });
}

export function buildBlueMoonMk2(): THREE.Group {
  const g = new THREE.Group();
  const M: Record<string, Mat> = {
    white: mat(0xf1f2f3, 0.15, 0.55),
    grey: mat(0xcfd0d2, 0.25, 0.5),
    cream: mat(0xe6e1d2, 0.1, 0.7),
    gold: mat(0xb08a3a, 0.75, 0.4),
    black: mat(0x14161a, 0.3, 0.7),
    steel: mat(0xaeb3b9, 0.7, 0.35),
    bell: mat(0x55595f, 0.7, 0.4),
    glass: mat(0xe8c27a, 0.2, 0.3),
    blue: mat(0x2a4fb0, 0.3, 0.5),
    yellow: mat(0xc9a02a, 0.4, 0.5),
  };

  // Engine bay: BE-7 bells under the black thermal skirt.
  const sites: THREE.Vector3[] = [];
  for (let i = 0; i < BE7_COUNT; i++) {
    const a = (i / BE7_COUNT) * Math.PI * 2;
    const x = Math.sin(a) * 1.4;
    const z = Math.cos(a) * 1.4;
    const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.3, 1.8, 20, 1, true), M.bell);
    bell.position.set(x, 1.4, z);
    g.add(bell);
    sites.push(new THREE.Vector3(x, 0.5, z));
  }
  const skirt = new THREE.Mesh(
    crinkle(new THREE.CylinderGeometry(R, R * 0.92, ENGINE_Y - 0.9, 36, 2, true), 0.03),
    M.black,
  );
  skirt.position.y = (ENGINE_Y + 0.9) / 2 + 0.2;
  g.add(skirt);
  // Gold foil band between the skirt and the crew deck.
  const band = new THREE.Mesh(
    crinkle(new THREE.CylinderGeometry(R * 1.01, R * 1.01, DECK_Y - ENGINE_Y, 40, 3, true), 0.05),
    M.gold,
  );
  band.position.y = (DECK_Y + ENGINE_Y) / 2;
  g.add(band);
  lathe(g, M.black, [
    [R * 0.9, ENGINE_Y + 0.2],
    [R * 0.9, ENGINE_Y + 0.25],
  ]);

  // Crew deck: grey drum, rounded top edge.
  lathe(g, M.grey, [
    [R * 1.02, DECK_Y],
    [R * 1.02, DECK_TOP - 0.25],
    [R * 0.98, DECK_TOP],
    [R * 0.6, DECK_TOP + 0.05],
  ]);
  lathe(g, M.steel, [
    [R * 1.04, DECK_TOP - 0.55],
    [R * 1.04, DECK_TOP - 0.4],
  ]);
  // Windows, flag and the lettering panel on the front (+z).
  for (const x of [-0.9, 0.9]) {
    const w = box(g, M.glass, 0.95, 0.8, 0.12, x, 6.2, Math.sqrt(R * R - x * x) * 1.02 + 0.04);
    w.rotation.y = Math.asin(x / R);
  }
  box(g, M.white, 1.7, 0.9, 0.06, 2.0, 5.9, Math.sqrt(R * R - 4) * 1.02 + 0.04).rotation.y =
    Math.asin(2 / R);
  box(g, M.blue, 1.7, 0.35, 0.07, 2.0, 6.1, Math.sqrt(R * R - 4) * 1.02 + 0.05).rotation.y =
    Math.asin(2 / R);
  // Round side hatch at the left of the front, above the ladder.
  {
    const a = -0.62;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.18, 28), M.cream);
    h.position.copy(onHull(a, 5.6, 0.06));
    h.rotation.order = 'YXZ';
    h.rotation.set(Math.PI / 2, a, 0);
    g.add(h);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.07, 8, 28), M.steel);
    ring.position.copy(onHull(a, 5.6, 0.1));
    ring.rotation.y = a;
    g.add(ring);
    // Ladder: two rails and rungs from the deck down to the regolith, leaning on the hull.
    const top = onHull(a, 4.6, 0.55);
    const foot = onHull(a - 0.28, 0.2, 2.6);
    for (const s of [-0.4, 0.4]) {
      const t = new THREE.Vector3(Math.cos(a) * s, 0, -Math.sin(a) * s);
      strut(g, M.yellow, top.clone().add(t), foot.clone().add(t), 0.05, 6);
    }
    for (let i = 0; i <= 9; i++) {
      const p = top.clone().lerp(foot, i / 9);
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.84, 6), M.yellow);
      rung.position.copy(p);
      rung.rotation.order = 'YXZ';
      rung.rotation.set(0, a, Math.PI / 2);
      g.add(rung);
    }
  }

  // Tanks: two pale domes in an open truss between deck and cabin.
  for (const [y, h] of [
    [DECK_TOP + 1.0, 1.9],
    [DECK_TOP + 2.9, 1.9],
  ] as const) {
    const t = new THREE.Mesh(crinkle(new THREE.SphereGeometry(R * 0.93, 28, 14), 0.03), M.cream);
    t.scale.y = h / (R * 0.93);
    t.position.y = y;
    g.add(t);
  }
  lathe(g, M.steel, [
    [R * 1.06, DECK_TOP + 1.95],
    [R * 1.06, DECK_TOP + 2.15],
  ]);
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2;
    const a1 = ((i + 1) / 12) * Math.PI * 2;
    strut(g, M.steel, onHull(a0, DECK_TOP, 0), onHull(a1, CABIN_BASE, 0), 0.05, 6);
    strut(g, M.steel, onHull(a1, DECK_TOP, 0), onHull(a0, CABIN_BASE, 0), 0.05, 6);
  }

  // Ascent cabin: a faceted, flared silver shroud, wider at the bottom, with the NASA roundel on
  // its front face and a blue line near the top (estimate, read off the render).
  const shroudMat = mat(0xb9bcc0, 0.55, 0.45);
  shroudMat.flatShading = true;
  const shroud = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        [R * 1.16, CABIN_BASE - 0.3],
        [R * 1.12, CABIN_BASE + 0.5],
        [R * 0.8, TANK_TOP + 3.1],
        [R * 0.76, TANK_TOP + 3.7],
        [R * 0.5, BLUE_MOON_MK2_HEIGHT_M - 0.4],
        [0.05, BLUE_MOON_MK2_HEIGHT_M],
      ].map(([x, y]) => new THREE.Vector2(x, y)),
      10,
    ),
    shroudMat,
  );
  shroud.rotation.y = Math.PI / 10; // a flat facet, not an edge, faces the front
  g.add(shroud);
  lathe(g, M.blue, [
    [R * 0.83, TANK_TOP + 3.2],
    [R * 0.83, TANK_TOP + 3.38],
  ]);
  const roundel = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24), M.blue);
  roundel.rotation.x = Math.PI / 2 - 0.33; // its normal follows the flare
  roundel.position.set(0, 13.0, R * 0.93 + 0.04);
  g.add(roundel);
  for (const s of [-1, 1]) {
    const d = dish(M.white, M.black, 0.45);
    d.position.set(s * 2.2, BLUE_MOON_MK2_HEIGHT_M - 0.8, 0.6);
    d.rotation.set(0.7, s * 0.7, 0);
    g.add(d);
  }

  // Landing legs: gold-wrapped strut from the engine-bay ring to a round pad, a pale lower brace.
  for (let i = 0; i < LEG_COUNT; i++) {
    const a = (i / LEG_COUNT) * Math.PI * 2 + Math.PI / 4;
    const foot = new THREE.Vector3(Math.sin(a) * PAD_R, 0.3, Math.cos(a) * PAD_R);
    strut(g, M.gold, onHull(a, DECK_TOP - 0.8, 0.15), foot, 0.2);
    strut(g, M.steel, onHull(a, ENGINE_Y + 0.2, 0.1), foot.clone().setY(1.4), 0.1);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.3, 24), M.steel);
    pad.position.set(foot.x, 0.15, foot.z);
    g.add(pad);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.6, 12), M.steel);
    collar.position.copy(onHull(a, DECK_TOP - 0.8, 0.2));
    g.add(collar);
  }

  // RCS thruster quads: four pods high on the cabin, four small nozzles each (estimate).
  const quads: THREE.Object3D[] = [];
  const plumeMat = new THREE.MeshBasicMaterial({
    color: 0xdfe8ff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const p = onHull(a, CABIN_BASE + 2.2, R * 0.1 + 0.08);
    const pod = box(g, M.black, 0.5, 0.5, 0.25, p.x, p.y, p.z);
    pod.rotation.y = a;
    const t = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
    const puff = new THREE.Group();
    puff.visible = false;
    g.add(puff);
    quads.push(puff);
    for (const [dx, dy] of [
      [-0.14, 0.14],
      [0.14, 0.14],
      [-0.14, -0.14],
      [0.14, -0.14],
    ]) {
      const n = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.16, 8, 1, true), M.bell);
      n.position.copy(p).addScaledVector(t, dx).addScaledVector(out, 0.18);
      n.position.y += dy;
      n.rotation.order = 'YXZ';
      n.rotation.set(Math.PI / 2, a, 0);
      g.add(n);
      const geo = new THREE.ConeGeometry(0.07, 0.7, 8, 1, true);
      geo.translate(0, 0.35, 0);
      const plume = new THREE.Mesh(geo, plumeMat);
      plume.position.copy(n.position).addScaledVector(out, 0.08);
      plume.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), out);
      puff.add(plume);
    }
  }

  g.userData.rcsQuads = quads;
  g.userData.thrusterSites = sites;
  return g;
}

/**
 * Sources: NASA's render (Wikimedia Commons File:NASA_2_HLS_(cropped)_Blue_Moon_MK2.jpg) and the
 * full-size cabin prototype photo (File:Blue_Moon_Mk_2_lander_full-size_prototype_May_2026.webp).
 * Height ~16 m: the figure given for this item, not independently verified; all other sizes
 * estimate, read off the two images.
 */
export const BLUE_MOON_MK2_REFS = [
  {
    l: 'NASA render of the Blue Moon Mk 2 (Wikimedia Commons)',
    u: 'https://commons.wikimedia.org/wiki/File:NASA_2_HLS_(cropped)_Blue_Moon_MK2.jpg',
  },
  {
    l: 'Full-size Mk 2 cabin prototype, May 2026 (Wikimedia Commons)',
    u: 'https://commons.wikimedia.org/wiki/File:Blue_Moon_Mk_2_lander_full-size_prototype_May_2026.webp',
  },
];
