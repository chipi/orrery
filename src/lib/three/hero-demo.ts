import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { heroGold, heroMetal, heroSolar, heroWhite, heroDark } from './hero-materials';

/**
 * Tier-B calibration demo — a Mars-cruise-configuration craft (bus + aeroshell
 * + solar wings + high-gain dish) rebuilt at "hero" fidelity: PBR materials
 * (gold MLI with a crinkle roughness map, textured solar cells, true metal
 * dish), beveled edges (RoundedBoxGeometry), and greeble detail (thrusters,
 * struts, antenna boom, sun sensors). Rendered under the image-based-lighting
 * environment from hero-materials. Compare against the flat MeshPhong
 * `buildViking1Cruise` to calibrate the polish target before rollout.
 */
export function buildHeroDemoCraft(): THREE.Group {
  const g = new THREE.Group();

  // ── Equipment bus — gold-foil MLI, beveled box. ──
  const busGeo = new RoundedBoxGeometry(0.9, 0.42, 0.9, 4, 0.06);
  const bus = new THREE.Mesh(busGeo, heroGold());
  bus.position.y = 0.55;
  g.add(bus);
  // Bus detail: a white radiator panel + a dark instrument box.
  const rad = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.03, 0.62, 3, 0.01), heroWhite());
  rad.position.y = 0.77;
  const instr = new THREE.Mesh(
    new RoundedBoxGeometry(0.24, 0.2, 0.3, 3, 0.03),
    heroWhite(0xdadfe4),
  );
  instr.position.set(0.28, 0.55, 0.28);
  g.add(rad, instr);

  // ── Solar wings — textured cell arrays on thin metal spars. ──
  const wingGeo = new THREE.BoxGeometry(1.4, 0.015, 0.55);
  for (const sx of [-1, 1]) {
    const wing = new THREE.Mesh(wingGeo, heroSolar(4));
    wing.position.set(sx * 1.15, 0.55, 0);
    g.add(wing);
    const spar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.9, 8),
      heroMetal(0x9aa0a8),
    );
    spar.rotation.z = Math.PI / 2;
    spar.position.set(sx * 0.65, 0.55, 0);
    g.add(spar);
  }

  // ── High-gain dish on a gimbal mast, mounted CLEAR ABOVE the bus (top face
  //    is y≈0.76) so it reads as a separate antenna instead of being buried in
  //    the hull. Concave open cap → double-sided so it isn't see-through. ──
  const dishMat = heroWhite(0xeef0f2);
  dishMat.side = THREE.DoubleSide;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.34, 12),
    heroMetal(0x9aa0a8),
  );
  mast.position.set(-0.24, 0.95, 0.24);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 30, 18, 0, Math.PI * 2, 0, Math.PI / 2.4),
    dishMat,
  );
  dish.position.set(-0.24, 1.18, 0.24);
  dish.rotation.x = -Math.PI / 3.4; // face up + forward
  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 8), heroMetal());
  feed.position.set(-0.24, 1.24, 0.35);
  feed.rotation.x = -Math.PI / 3.4;
  g.add(mast, dish, feed);

  // ── Aeroshell — a short backshell cone + a heat-shield saucer. Both are
  //    CLOSED SOLID geometry (a truncated cone has end caps; the shield is a
  //    flattened FULL sphere, not an open cap) so nothing shows through them.
  //    Carries the lander inside during cruise. ──
  const backshell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.58, 0.26, 44),
    heroWhite(0xc7b494),
  );
  backshell.position.y = 0.2;
  const shield = new THREE.Mesh(new THREE.SphereGeometry(0.6, 44, 24), heroWhite(0xbfae90));
  shield.scale.y = 0.4; // flatten the sphere into a solid saucer
  shield.position.y = 0.0;
  g.add(backshell, shield);

  // ── Greebles: RCS thruster quads, struts, antenna boom, sun sensors. ──
  const quadMat = heroMetal(0x8b8f96);
  for (const [x, z] of [
    [0.42, 0.42],
    [-0.42, 0.42],
    [0.42, -0.42],
    [-0.42, -0.42],
  ] as const) {
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 10), quadMat);
    pod.position.set(x, 0.55, z);
    // two little thruster cones on the pod
    for (const dx of [-0.03, 0.03]) {
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.05, 8), heroDark());
      t.position.set(x + dx, 0.5, z);
      t.rotation.x = Math.PI;
      g.add(t);
    }
    g.add(pod);
    // strut down to the aeroshell
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 6), quadMat);
    strut.position.set(x * 0.9, 0.33, z * 0.9);
    g.add(strut);
  }
  // Low-gain antenna boom + tip.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), heroMetal());
  boom.position.set(-0.3, 0.9, -0.2);
  boom.rotation.z = 0.4;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), heroWhite());
  tip.position.set(-0.5, 1.05, -0.2);
  g.add(boom, tip);

  return g;
}
