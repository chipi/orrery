import * as THREE from 'three';
import { categoriseMarsMarker, type MarsMarkerCategory } from './mars-marker-category';

/**
 * Per-mission 3D model builders for surface markers on /mars. Mirrors
 * `moon-lander-models.ts`: each known mission id gets a recognisable
 * silhouette built from Three.js primitives; unknown ids fall back to a
 * category-based generic shape so the marker still reads as a lander /
 * rover / Soviet petal-capsule.
 *
 * Scale convention: the /mars scene anchors markers at `marsMesh` with
 * the surface normal as +Y; tallest silhouette element ≈ 1.0–1.5 world
 * units above the surface, matching the Moon convention. Caller still
 * applies the per-site quaternion + position; this module returns a
 * Three.Group rooted at the surface.
 *
 * Reference shapes verified against:
 *   - NASA mission press kits + JPL engineering drawings
 *     (Viking 1/2, Pathfinder, Sojourner, Spirit, Opportunity,
 *      Curiosity, Perseverance, Ingenuity, Phoenix, InSight)
 *   - NSSDCA Mars 2/3 / Venera-lineage diagrams (Soviet petal capsule)
 *   - ESA Beagle 2 + Schiaparelli reference (incl. HiRISE-visible
 *     partial-deployment / crash signatures for ghost variants)
 *
 * V0.6 scope: Tier 0+1 only — the hand-coded models. Tier 2 LROC/HiRISE
 * texture patches are tracked in #112 follow-ups.
 */

const MLI_WHITE = 0xeeeeee;
const SILVER = 0xb8b8b8;
const GOLD = 0xd4af37;
const DARK = 0x1a1a1a;
const SOLAR = 0x0b1840;
const RUST = 0x9c4a2a;

function bodyMat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: MLI_WHITE,
    metalness: 0.18,
    roughness: 0.55,
    emissive: color,
    emissiveIntensity: 0.08,
  });
}

function accentMat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.3,
    roughness: 0.45,
    emissive: color,
    emissiveIntensity: 0.22,
  });
}

function silverMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SILVER, metalness: 0.85, roughness: 0.25 });
}

function goldMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: GOLD,
    metalness: 0.9,
    roughness: 0.35,
    emissive: GOLD,
    emissiveIntensity: 0.1,
  });
}

function panelMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: SOLAR, metalness: 0.4, roughness: 0.3 });
}

function darkMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: DARK, metalness: 0.5, roughness: 0.5 });
}

function rustMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: RUST, metalness: 0.25, roughness: 0.7 });
}

// ─── Viking tripod (Vikings 1 + 2) ──────────────────────────────────

/** Viking 1/2 — hexagonal bus on three splayed legs, distinctive S-band
 *  high-gain dish on a boom, top-mounted RTG cube, surface-sampler arm
 *  to one side. */
function buildVikingTripod(color: string): THREE.Group {
  const g = new THREE.Group();
  // Hexagonal bus.
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 6), bodyMat(color));
  bus.position.y = 0.32;
  g.add(bus);
  // Three splayed legs.
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.4, 0.2, Math.sin(ang) * 0.4);
    leg.rotation.z = -Math.cos(ang) * 0.45;
    leg.rotation.x = Math.sin(ang) * 0.45;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.6, 0.02, Math.sin(ang) * 0.6);
    g.add(pad);
  }
  // S-band high-gain dish on a boom.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.55, 4), silverMat());
  boom.position.set(0.3, 0.65, 0);
  boom.rotation.z = -0.7;
  g.add(boom);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 12), goldMat());
  dish.position.set(0.55, 0.95, 0);
  dish.rotation.x = -0.6;
  g.add(dish);
  // RTG cube on top.
  const rtg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.18), darkMat());
  rtg.position.set(-0.18, 0.55, 0);
  g.add(rtg);
  // Surface-sampler arm — short articulated boom out the front.
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 4), silverMat());
  arm.position.set(0, 0.45, 0.4);
  arm.rotation.x = Math.PI / 2;
  g.add(arm);
  // Accent ring at base.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.014, 6, 18), accentMat(color));
  ring.position.y = 0.22;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── Pathfinder + Sojourner ─────────────────────────────────────────

/** Mars Pathfinder — tetrahedral lander with 4 open petals, central
 *  electronics box, and the tiny Sojourner rover parked beside it on
 *  the surface. First successful Mars rover deployment, 1997. */
function buildPathfinder(color: string): THREE.Group {
  const g = new THREE.Group();
  // Central electronics box (the lander's inner pyramid that the petals
  // surround once opened).
  const core = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.32), bodyMat(color));
  core.position.y = 0.2;
  g.add(core);
  // 4 deployed petals — flat panels splayed flat on the ground around
  // the core. Solar cells on the upper face.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const petal = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.025, 0.32), panelMat());
    petal.position.set(Math.cos(ang) * 0.38, 0.04, Math.sin(ang) * 0.38);
    petal.rotation.y = ang;
    g.add(petal);
  }
  // Imager mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.45, 4), silverMat());
  mast.position.set(0, 0.55, 0);
  g.add(mast);
  const camera = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.08), darkMat());
  camera.position.set(0, 0.82, 0);
  g.add(camera);
  // Sojourner — tiny microwave-oven-sized 6-wheel rover beside.
  const soj = new THREE.Group();
  const sojBody = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.16), panelMat());
  sojBody.position.y = 0.09;
  soj.add(sojBody);
  for (const dz of [-0.07, 0.07]) {
    for (const dx of [-0.085, 0, 0.085]) {
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), darkMat());
      wheel.position.set(dx, 0.035, dz);
      soj.add(wheel);
    }
  }
  soj.position.set(0.55, 0, 0.1);
  g.add(soj);
  // Accent ring around the deployment footprint.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.012, 6, 24), accentMat(color));
  ring.position.y = 0.015;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── MER (Spirit + Opportunity) ─────────────────────────────────────

/** Mars Exploration Rover — Spirit / Opportunity. Solar-panel deck on a
 *  6-wheel rocker-bogie chassis, Pancam mast, low-gain antenna stub. */
function buildMERRover(color: string): THREE.Group {
  const g = new THREE.Group();
  // Solar deck on top.
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.55), panelMat());
  deck.position.y = 0.35;
  g.add(deck);
  // Body slab below the deck.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.4), bodyMat(color));
  body.position.y = 0.25;
  g.add(body);
  // 6 wheels on the rocker-bogie.
  for (const dz of [-0.22, 0.22]) {
    for (const dx of [-0.22, 0, 0.22]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 10), darkMat());
      wheel.position.set(dx, 0.08, dz);
      wheel.rotation.z = Math.PI / 2;
      g.add(wheel);
    }
  }
  // Pancam mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.55, 4), silverMat());
  mast.position.set(0.18, 0.62, 0);
  g.add(mast);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.08), darkMat());
  head.position.set(0.18, 0.92, 0);
  g.add(head);
  // Low-gain antenna stub.
  const lga = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.2, 4), silverMat());
  lga.position.set(-0.2, 0.5, 0);
  g.add(lga);
  // Accent ring around the rover footprint.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 6, 18), accentMat(color));
  ring.position.y = 0.015;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── Curiosity / Perseverance (MSL-class) ───────────────────────────

/** MSL-class rover (Curiosity, Perseverance). 6-wheel rocker-bogie,
 *  squared-off MMRTG box at the back, distinctive tall mast with
 *  Mastcam-Z / Mastcam head. `withHelicopter` adds an Ingenuity
 *  rotorcraft beside the rover (Perseverance only). */
function buildMSLClass(color: string, withHelicopter: boolean): THREE.Group {
  const g = new THREE.Group();
  // Main rover body — wider + taller than MER.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.22, 0.5), bodyMat(color));
  body.position.y = 0.32;
  g.add(body);
  // RTG box at the back.
  const rtg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.2), rustMat());
  rtg.position.set(-0.4, 0.36, 0);
  g.add(rtg);
  // RTG fin radiators — 6 thin vertical fins.
  for (let i = 0; i < 6; i++) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.18, 0.22), silverMat());
    fin.position.set(-0.51 + i * 0.02, 0.36, 0);
    g.add(fin);
  }
  // 6 large wheels on the rocker-bogie.
  for (const dz of [-0.28, 0.28]) {
    for (const dx of [-0.28, 0, 0.28]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.08, 12), darkMat());
      wheel.position.set(dx, 0.1, dz);
      wheel.rotation.z = Math.PI / 2;
      g.add(wheel);
    }
  }
  // Tall mast with camera head.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.7, 4), silverMat());
  mast.position.set(0.22, 0.78, 0);
  g.add(mast);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.1), darkMat());
  head.position.set(0.22, 1.16, 0);
  g.add(head);
  // High-gain antenna dish.
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 12), goldMat());
  dish.position.set(0.1, 0.5, -0.22);
  dish.rotation.x = -0.5;
  g.add(dish);
  // Robotic arm — folded against the front in stow pose.
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.45, 4), silverMat());
  arm.position.set(0.42, 0.32, 0.18);
  arm.rotation.z = 0.5;
  g.add(arm);
  // Accent ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.014, 6, 20), accentMat(color));
  ring.position.y = 0.02;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  if (withHelicopter) {
    g.add(buildIngenuity(color));
  }
  return g;
}

/** Ingenuity Mars helicopter — small cuboid with twin coaxial blades.
 *  Parked beside the Perseverance marker as a separate sub-group. */
function buildIngenuity(color: string): THREE.Group {
  const h = new THREE.Group();
  // 4 thin legs.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.06, 0.08, Math.sin(ang) * 0.06);
    g_addTiltedLeg(leg, ang, 0.25);
    h.add(leg);
  }
  // Body cube.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), accentMat(color));
  body.position.y = 0.18;
  h.add(body);
  // Mast for the blades.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 4), silverMat());
  mast.position.y = 0.27;
  h.add(mast);
  // Twin coaxial blade bars.
  for (const y of [0.31, 0.34]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.005, 0.014), silverMat());
    blade.position.y = y;
    h.add(blade);
  }
  h.position.set(0.62, 0, 0.18);
  return h;
}

function g_addTiltedLeg(leg: THREE.Mesh, ang: number, tilt: number) {
  leg.rotation.z = -Math.cos(ang) * tilt;
  leg.rotation.x = Math.sin(ang) * tilt;
}

// ─── Phoenix / InSight static-lander class ──────────────────────────

/** Phoenix-class static lander (Phoenix, InSight). Three-legged bus
 *  with two large round solar arrays sticking out laterally, top-deck
 *  instruments, robotic arm at the front. */
function buildPhoenixClass(color: string): THREE.Group {
  const g = new THREE.Group();
  // Hex bus.
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.18, 6), bodyMat(color));
  bus.position.y = 0.32;
  g.add(bus);
  // 3 legs.
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.5, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.32, 0.18, Math.sin(ang) * 0.32);
    leg.rotation.z = -Math.cos(ang) * 0.45;
    leg.rotation.x = Math.sin(ang) * 0.45;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.5, 0.02, Math.sin(ang) * 0.5);
    g.add(pad);
  }
  // Two large round solar arrays on opposite sides.
  for (const dx of [-1, 1]) {
    const array = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.025, 16), panelMat());
    array.position.set(dx * 0.55, 0.4, 0);
    array.rotation.x = Math.PI / 2;
    g.add(array);
  }
  // Robotic arm — folded to the front.
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.45, 4), silverMat());
  arm.position.set(0, 0.4, 0.34);
  arm.rotation.x = 1.0;
  g.add(arm);
  // Instrument dome on top.
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 8), darkMat());
  dome.position.set(0, 0.5, 0);
  g.add(dome);
  // Accent ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.012, 6, 18), accentMat(color));
  ring.position.y = 0.21;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── Soviet petal capsule (Mars 2/3/6) ──────────────────────────────

/** Soviet petal-capsule — central spherical body with four splayed
 *  petal panels around the base. Iconic Venera-lineage descent design;
 *  Mars 2 crashed, Mars 3 transmitted 14.5 seconds then died, Mars 6
 *  hit hard. Hardware silhouette stays the same; failure status is
 *  conveyed via the opacity overlay applied externally. */
function buildSovietPetal(color: string): THREE.Group {
  const g = new THREE.Group();
  // Central spherical capsule.
  const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.36, 16, 12), bodyMat(color));
  capsule.position.y = 0.42;
  g.add(capsule);
  // 4 deployed petals — flat triangular panels splayed out at ground
  // level around the base.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const petal = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.34), silverMat());
    petal.position.set(Math.cos(ang) * 0.42, 0.05, Math.sin(ang) * 0.42);
    petal.rotation.y = ang;
    petal.rotation.z = -0.35;
    g.add(petal);
  }
  // Antenna whip on top.
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 4), silverMat());
  antenna.position.y = 0.95;
  g.add(antenna);
  // Accent ring at base.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.014, 6, 20), accentMat(color));
  ring.position.y = 0.04;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── Beagle 2 (partial-deployment clamshell) ────────────────────────

/** Beagle 2 — UK / ESA lander that landed safely on Mars in 2003 but
 *  never communicated; HiRISE found it in 2015 with petals only
 *  partially deployed. We render the actual partial-petal state
 *  HiRISE imaged: 2 of 4 petals open, central disc visible. */
function buildBeagle2(color: string): THREE.Group {
  const g = new THREE.Group();
  // Central wok-shape disc (the iconic Beagle 2 silhouette).
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.1, 16), bodyMat(color));
  disc.position.y = 0.08;
  g.add(disc);
  // 2 of 4 petals open — only "north" and "east" deployed; the other
  // two stuck closed (matches HiRISE observation).
  for (const ang of [0, Math.PI / 2]) {
    const petal = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.02, 0.26), panelMat());
    petal.position.set(Math.cos(ang) * 0.36, 0.04, Math.sin(ang) * 0.36);
    petal.rotation.y = ang;
    g.add(petal);
  }
  // 2 petals stuck closed — represented as raised quarter-segments
  // around the disc.
  for (const ang of [Math.PI, (3 * Math.PI) / 2]) {
    const stuck = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.16), silverMat());
    stuck.position.set(Math.cos(ang) * 0.22, 0.14, Math.sin(ang) * 0.22);
    stuck.rotation.y = ang;
    g.add(stuck);
  }
  // Tiny instrument arm — Beagle 2 had the famous PAW (Position
  // Adjustable Workbench). Render as a stubby arm out the front.
  const paw = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4), darkMat());
  paw.position.set(0.18, 0.18, 0);
  paw.rotation.z = 1.0;
  g.add(paw);
  return g;
}

// ─── Schiaparelli (crashed) ─────────────────────────────────────────

/** Schiaparelli (ExoMars EDM) — ESA / Roscosmos 2016 demo lander.
 *  Impacted at ~134 m/s when the parachute deployed early and the
 *  retro-rockets shut down 1 s after firing. HiRISE imaged the impact
 *  crater + chute + heat-shield + back-shell separately. We render the
 *  intended pre-crash hardware (squat hex bus with crush bumper); the
 *  external opacity overlay marks it as failed. */
function buildSchiaparelli(color: string): THREE.Group {
  const g = new THREE.Group();
  // Hex bus.
  const bus = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.22, 6), bodyMat(color));
  bus.position.y = 0.22;
  g.add(bus);
  // Crush-bumper skirt around the base.
  const bumper = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 6), rustMat());
  bumper.position.y = 0.04;
  g.add(bumper);
  // Top-mounted antenna.
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.36, 4), silverMat());
  antenna.position.y = 0.55;
  g.add(antenna);
  // Accent ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.012, 6, 20), accentMat(color));
  ring.position.y = 0.075;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── Category-based fallbacks ───────────────────────────────────────

/** Generic Western lander — octahedron probe with antenna. Used when
 *  an unknown lander id lands on Mars. */
function buildGenericLander(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), bodyMat(color));
  body.position.y = 0.5;
  g.add(body);
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), silverMat());
  antenna.position.y = 1.05;
  g.add(antenna);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.012, 6, 18), accentMat(color));
  ring.position.y = 0.02;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

/** Generic rover — wheeled chassis fallback. Closer to the MER
 *  silhouette than the MSL one (fewer wheels makes it readable at
 *  smaller scale). */
function buildGenericRover(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.22, 0.45), bodyMat(color));
  body.position.y = 0.28;
  g.add(body);
  for (const dz of [-0.22, 0.22]) {
    for (const dx of [-0.22, 0.22]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 10), darkMat());
      wheel.position.set(dx, 0.08, dz);
      wheel.rotation.z = Math.PI / 2;
      g.add(wheel);
    }
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.32, 4), silverMat());
  mast.position.set(0.16, 0.5, 0);
  g.add(mast);
  return g;
}

const BUILDERS: Record<string, (color: string) => THREE.Group> = {
  // Vikings — identical hardware.
  'viking1-lander': buildVikingTripod,
  'viking2-lander': buildVikingTripod,
  // Pathfinder (with Sojourner companion in the same builder).
  'mars-pathfinder': buildPathfinder,
  // MER twins.
  spirit: buildMERRover,
  opportunity: buildMERRover,
  // MSL-class.
  curiosity: (color) => buildMSLClass(color, false),
  perseverance: (color) => buildMSLClass(color, true),
  // Phoenix-class static landers.
  phoenix: buildPhoenixClass,
  insight: buildPhoenixClass,
  // Soviet petal capsules (Mars 2/3/6).
  mars2: buildSovietPetal,
  mars3: buildSovietPetal,
  mars6: buildSovietPetal,
  // ESA / UK ghosts.
  beagle2: buildBeagle2,
  schiaparelli: buildSchiaparelli,
};

const CATEGORY_FALLBACKS: Record<MarsMarkerCategory, (color: string) => THREE.Group> = {
  rover: buildGenericRover,
  lander: buildGenericLander,
  'soviet-petal': buildSovietPetal,
};

/** Build a per-mission Mars-surface marker for `siteId`. Falls back to
 *  a category-based silhouette (rover / lander / Soviet petal) for ids
 *  without a dedicated builder. Caller supplies the agency colour for
 *  accent tinting and handles the surface position + quaternion + the
 *  failure-status opacity overlay externally. */
export function buildMarsLanderModel(
  siteId: string,
  missionType: string | undefined,
  agency: string | undefined,
  color: string,
): THREE.Group {
  const builder = BUILDERS[siteId];
  if (builder) return builder(color);
  const category = categoriseMarsMarker(missionType, agency);
  return CATEGORY_FALLBACKS[category](color);
}

/** Exposed for tests: list of ids that have a dedicated builder. */
export const KNOWN_MARS_LANDER_IDS = Object.keys(BUILDERS);
