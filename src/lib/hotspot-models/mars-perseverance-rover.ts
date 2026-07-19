import * as THREE from 'three';

/**
 * Perseverance Tier 1 engineering model — MSL-derived rover, Mars 2020.
 * (PRD-014 / RFC-017 §S4, ADR-062).
 *
 * Perseverance is MSL-class (6-wheel rocker-bogie) but visually distinct
 * from Curiosity in four major ways modelled here:
 *   1. Mastcam-Z + SuperCam: larger "head" box atop the mast.
 *   2. Robotic arm folded at front with PIXL/SHERLOC turret.
 *   3. Sample-caching bay (rectangular recess) on the lower chassis
 *      with sample tube stubs visible.
 *   4. MMRTG (RTG) mounted at the rear at ≈12° downward cant — same as
 *      Curiosity's but the cant and fin count (8 radial pairs) differ.
 *
 * Dimensions from NASA Mars 2020 Press Kit (Feb 2021) + rover fact sheet.
 * Width (wheel-to-wheel): ~2.7 m; modelled ≈ 1.5 u wide.
 */

const MSL_BODY = 0xa8a8a8;
const RTG_GRAY = 0x4a4a4a;
const TYRE = 0x282828;
const ALU = 0x9a9a9a;
const GOLD = 0xc8a020; // MLI gold foil on sample system

function bodyMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: MSL_BODY, metalness: 0.65, roughness: 0.5 });
}
function rtgMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: RTG_GRAY,
    metalness: 0.7,
    roughness: 0.4,
    emissive: 0x331111,
    emissiveIntensity: 0.15, // RTG emits ~2 kW heat — subtle warm glow
  });
}
function tyreMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: TYRE, metalness: 0.3, roughness: 0.85 });
}
function aluMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: ALU, metalness: 0.75, roughness: 0.4 });
}
function goldMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: GOLD, metalness: 0.6, roughness: 0.35 });
}

export function buildPerseveranceRoverHotspot(accentColor: string): THREE.Group {
  void accentColor; // reserved for future accent-colour theming

  const g = new THREE.Group();
  const wheelR = 0.065; // slightly larger wheels than Curiosity

  // Warm electronics box (WEB) — the main chassis.
  const web = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.33), bodyMat());
  web.position.y = wheelR + 0.1;
  g.add(web);

  // ── MMRTG (RTG) — rear, canted ~12° downward ──────────────────────────
  const rtgGroup = new THREE.Group();
  const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.22, 16), rtgMat());
  rtg.rotation.z = Math.PI / 2;
  rtgGroup.add(rtg);
  // 8 pairs of cooling fins around the RTG body.
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.005, 0.05), rtgMat());
    fin.rotation.x = ang;
    rtgGroup.add(fin);
  }
  rtgGroup.position.set(-0.33, wheelR + 0.12, 0);
  rtgGroup.rotation.z = 0.21; // ~12° cant rearward-downward
  g.add(rtgGroup);

  // ── 6 wheels — rocker-bogie (3 per side) ──────────────────────────────
  // dx = fore/aft position: front, mid, rear
  // dz = port/starboard
  for (const dx of [-0.19, 0, 0.19]) {
    for (const dz of [-0.2, 0.2]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(wheelR, wheelR, 0.065, 16), tyreMat());
      w.rotation.z = Math.PI / 2;
      w.position.set(dx, wheelR, dz);
      g.add(w);
      // Short bogie axle stub connecting wheel to chassis.
      const axle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.008, Math.abs(dz) - 0.16, 6),
        aluMat(),
      );
      axle.rotation.z = Math.PI / 2;
      axle.position.set(dx, wheelR, dz * 0.6);
      g.add(axle);
    }
  }

  // ── Camera mast — Mastcam-Z + SuperCam head ────────────────────────────
  // The Perseverance mast head is noticeably larger / boxier than Curiosity's
  // single cylindrical head — it carries two zoom-camera pairs + laser.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.42, 4), aluMat());
  mast.position.set(0.18, wheelR + 0.37, 0);
  g.add(mast);
  // Large Mastcam-Z / SuperCam head — wider box.
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.055, 0.055), bodyMat());
  head.position.set(0.18, wheelR + 0.6, 0);
  g.add(head);
  // SuperCam laser port — small front protrusion on the head.
  const superCam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 6), aluMat());
  superCam.rotation.z = Math.PI / 2;
  superCam.position.set(0.31, wheelR + 0.6, 0);
  g.add(superCam);

  // ── Robotic arm — stowed along forward-right edge ─────────────────────
  // Arm upper segment.
  const armUpper = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.055, 0.22), aluMat());
  armUpper.position.set(0.1, wheelR + 0.11, 0.27);
  armUpper.rotation.x = -0.35;
  g.add(armUpper);
  // Arm lower segment / elbow.
  const armLower = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.15), aluMat());
  armLower.position.set(0.1, wheelR + 0.02, 0.38);
  armLower.rotation.x = 0.3;
  g.add(armLower);
  // PIXL / SHERLOC turret on the end of the arm.
  const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 8), aluMat());
  turret.position.set(0.1, wheelR - 0.02, 0.46);
  g.add(turret);

  // ── Sample-caching system — visible from front / underside ────────────
  // Gold MLI-wrapped enclosure on the lower-front chassis.
  const cacheBay = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.1), goldMat());
  cacheBay.position.set(0.22, wheelR + 0.05, 0.08);
  g.add(cacheBay);
  // Three sample tube stubs protruding from the front face of the cache bay.
  for (let i = -1; i <= 1; i++) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 6), aluMat());
    tube.rotation.z = Math.PI / 2;
    tube.position.set(0.31, wheelR + 0.05, i * 0.025 + 0.08);
    g.add(tube);
  }

  // ── High-gain antenna — rear-port deck, tilted toward Earth ───────────
  const hga = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 12), aluMat());
  hga.position.set(-0.16, wheelR + 0.2, 0.17);
  hga.rotation.x = Math.PI / 2.4;
  g.add(hga);

  return g;
}
