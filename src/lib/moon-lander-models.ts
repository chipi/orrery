import * as THREE from 'three';

/**
 * Per-mission 3D model builders for surface markers on /moon. Mirrors
 * the pattern from `earth-satellite-models.ts`: each known mission id
 * gets a recognisable silhouette built from Three.js primitives;
 * unknown ids fall back to a category-based generic shape so the
 * marker still reads as a lander / rover / sample-return etc.
 *
 * Scale convention: the /moon scene has `moonRadius = 30` world units,
 * and markers sit at y=0 (surface) and rise upward in +Y after the
 * scene transform orients +Y along the local surface normal. Marker
 * silhouettes are sized so the tallest element reaches ~1.0–1.5 world
 * units above the surface — large enough to read against the lit moon
 * face at default camera distance, small enough not to occlude the
 * neighbouring sites at Apollo-era density (~10 km between Apollo 12
 * and Surveyor 3, ~120 km between Apollo 11 and Luna 5).
 *
 * Reference shapes verified against:
 *   - NASA 3D Resources (Apollo LM, J-mission LRV)
 *   - Roscosmos / Lavochkin Luna programme imagery (Luna 9/16/17)
 *   - CMSA Chang'e public-release imagery (Chang'e 3/4/5/6, Yutu)
 *   - ISRO Chandrayaan-3 Vikram + Pragyan reference photos
 *   - JAXA SLIM public-release imagery (post-tip "Moon Sniper" pose)
 */

const MLI_WHITE = 0xeeeeee;
const SILVER = 0xb8b8b8;
const GOLD = 0xd4af37;
const DARK = 0x1a1a1a;
const SOLAR = 0x0b1840;

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

// ─── Apollo Lunar Module family ─────────────────────────────────────

/** Apollo descent stage (LM lower half). Octagonal gold-foil-wrapped
 *  body, four splayed landing legs with footpads. Used as the base for
 *  every Apollo LM marker. Caller adds the ascent stage on top + the
 *  US flag pole + (for J-missions) the LRV. */
function buildApolloDescentStage(): THREE.Group {
  const g = new THREE.Group();
  // Octagonal descent body wrapped in gold thermal blanket — sits at
  // y≈0.2 so the legs span y=0..0.4.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.34, 0.32, 8), goldMat());
  body.position.y = 0.32;
  g.add(body);
  // 4 landing legs splayed outward at 45° from each cardinal corner.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.32, 0.22, Math.sin(ang) * 0.32);
    // Tilt outward.
    leg.rotation.z = -Math.cos(ang) * 0.45;
    leg.rotation.x = Math.sin(ang) * 0.45;
    g.add(leg);
    // Footpad — flat circular disc at the base of each leg.
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.5, 0.02, Math.sin(ang) * 0.5);
    g.add(pad);
  }
  // Descent engine nozzle — short black cone underneath.
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.12, 8), darkMat());
  nozzle.rotation.x = Math.PI;
  nozzle.position.y = 0.1;
  g.add(nozzle);
  return g;
}

function buildUSFlag(color: string): THREE.Group {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.8, 4), silverMat());
  pole.position.set(0.55, 0.4, 0);
  g.add(pole);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.015), accentMat(color));
  flag.position.set(0.72, 0.7, 0);
  g.add(flag);
  return g;
}

/** Apollo 11/12/14 — descent stage left on surface after ascent. No
 *  rover; flag planted nearby. */
function buildApolloLM(color: string): THREE.Group {
  const g = new THREE.Group();
  g.add(buildApolloDescentStage());
  g.add(buildUSFlag(color));
  // Faint accent ring around descent stage for agency-colour read at scale.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 6, 24), accentMat(color));
  ring.position.y = 0.16;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

/** Apollo 15/16/17 (J-missions) — descent stage + flag + LRV (lunar
 *  roving vehicle) parked beside it. LRV is a low open-frame
 *  4-wheeled cart with two seats and a high-gain dish. */
function buildApolloLMExtended(color: string): THREE.Group {
  const g = new THREE.Group();
  g.add(buildApolloDescentStage());
  g.add(buildUSFlag(color));
  // LRV — small open-frame rover parked ~0.6u from the LM.
  const rover = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.18), silverMat());
  chassis.position.y = 0.12;
  rover.add(chassis);
  // 4 wheels.
  for (const dx of [-0.13, 0.13]) {
    for (const dz of [-0.11, 0.11]) {
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), darkMat());
      wheel.position.set(dx, 0.05, dz);
      rover.add(wheel);
    }
  }
  // Two upright seat backs.
  for (const dx of [-0.06, 0.06]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.06), bodyMat(color));
    seat.position.set(dx, 0.21, 0);
    rover.add(seat);
  }
  // High-gain dish on a short mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 4), silverMat());
  mast.position.set(0.16, 0.21, 0);
  rover.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.012, 12), silverMat());
  dish.position.set(0.16, 0.3, 0);
  dish.rotation.x = Math.PI / 2;
  rover.add(dish);
  rover.position.set(-0.55, 0, 0.3);
  g.add(rover);
  // Accent ring on descent stage.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 6, 24), accentMat(color));
  ring.position.y = 0.16;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── Luna programme (USSR) ──────────────────────────────────────────

/** Luna 9 — the world's first soft landing on the Moon. Spherical
 *  capsule (~58 cm) that opened four petal-shaped covers after
 *  touchdown. Iconic flower-on-the-regolith silhouette. */
function buildLuna9(color: string): THREE.Group {
  const g = new THREE.Group();
  // Central capsule body.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), silverMat());
  body.position.y = 0.28;
  g.add(body);
  // 4 open petals — flat triangles around the equator angled outward.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const petal = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 0.36, 3),
      new THREE.MeshStandardMaterial({
        color: SILVER,
        metalness: 0.7,
        roughness: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    petal.position.set(Math.cos(ang) * 0.42, 0.18, Math.sin(ang) * 0.42);
    // Lay petal nearly flat, pointing outward.
    petal.rotation.z = -Math.cos(ang) * 1.35;
    petal.rotation.x = Math.sin(ang) * 1.35;
    g.add(petal);
  }
  // Antennas — 4 thin wire whiskers reaching outward + up.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 3), silverMat());
    whisker.position.set(Math.cos(ang) * 0.2, 0.55, Math.sin(ang) * 0.2);
    whisker.rotation.z = -Math.cos(ang) * 0.6;
    whisker.rotation.x = Math.sin(ang) * 0.6;
    g.add(whisker);
  }
  // Accent ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 24), accentMat(color));
  ring.position.y = 0.28;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

/** Luna 16/20/24 sample-return descent stage. Four-legged platform
 *  with a vertical ascent stage rising from the centre — the ascent
 *  stage launched the sample capsule back to Earth, leaving this
 *  stub on the surface. */
function buildLunaSampleReturn(color: string): THREE.Group {
  const g = new THREE.Group();
  // Descent platform — short hex bus.
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.22, 6), silverMat());
  platform.position.y = 0.22;
  g.add(platform);
  // 4 splayed legs.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.45, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.32, 0.18, Math.sin(ang) * 0.32);
    leg.rotation.z = -Math.cos(ang) * 0.4;
    leg.rotation.x = Math.sin(ang) * 0.4;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.025, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.45, 0.02, Math.sin(ang) * 0.45);
    g.add(pad);
  }
  // Ascent stub — vertical cylinder with a spherical sample capsule
  // perched on top (where the real one was before it launched home).
  const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.5, 8), bodyMat(color));
  stub.position.y = 0.55;
  g.add(stub);
  const capsule = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 8), goldMat());
  capsule.position.y = 0.85;
  g.add(capsule);
  // Faint vertical return-trail spike rising above (the sample left here).
  const spike = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.06, 1.1, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
  );
  spike.position.y = 1.55;
  g.add(spike);
  return g;
}

/** Lunokhod 1/2 — bathtub-shaped tub with hinged conical lid (left
 *  open to expose solar cells), 8 wire-spoke wheels along the sides.
 *  Used for Luna 17 + Luna 21. */
function buildLunokhod(color: string): THREE.Group {
  const g = new THREE.Group();
  // Bathtub hull.
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.22, 16), bodyMat(color));
  hull.position.y = 0.22;
  g.add(hull);
  // Conical lid hinged open at the back, exposing solar cells inside.
  const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.34, 0.3, 16, 1, true), panelMat());
  lid.position.set(-0.05, 0.5, -0.18);
  lid.rotation.x = -0.7;
  g.add(lid);
  // 8 wire-spoke wheels — 4 per side.
  for (const dz of [-0.22, 0.22]) {
    for (const dx of [-0.21, -0.07, 0.07, 0.21]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 4, 8), silverMat());
      wheel.position.set(dx, 0.1, dz);
      wheel.rotation.y = Math.PI / 2;
      g.add(wheel);
    }
  }
  // Forward-mounted instrument boom + camera turret.
  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.18, 4), silverMat());
  boom.position.set(0.32, 0.4, 0);
  g.add(boom);
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.08), darkMat());
  cam.position.set(0.32, 0.5, 0);
  g.add(cam);
  // Accent stripe along the side for agency colour.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.02), accentMat(color));
  stripe.position.set(0, 0.31, 0.38);
  g.add(stripe);
  return g;
}

// ─── Chang'e (CNSA) ─────────────────────────────────────────────────

/** Chang'e 3/4 lander — hex bus with four splayed legs, two long
 *  gold solar wings deployed flat. Used for the stationary lander
 *  portion of Chang'e 3 (Yutu) and Chang'e 4 (Yutu-2). Caller can
 *  pair with a Yutu rover marker for the deployed-rover version. */
function buildChangeLander(color: string): THREE.Group {
  const g = new THREE.Group();
  // Hex bus body.
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.26, 6), goldMat());
  body.position.y = 0.32;
  g.add(body);
  // 4 splayed landing legs.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.3, 0.22, Math.sin(ang) * 0.3);
    leg.rotation.z = -Math.cos(ang) * 0.45;
    leg.rotation.x = Math.sin(ang) * 0.45;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.48, 0.02, Math.sin(ang) * 0.48);
    g.add(pad);
  }
  // Two long solar wings deployed horizontally.
  for (const dx of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.32), panelMat());
    wing.position.set(dx * 0.55, 0.42, 0);
    g.add(wing);
  }
  // Top-mounted camera mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.4, 4), silverMat());
  mast.position.y = 0.65;
  g.add(mast);
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.05), darkMat());
  cam.position.y = 0.88;
  g.add(cam);
  // Accent ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 6, 24), accentMat(color));
  ring.position.y = 0.18;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

/** Chang'e 5/6 sample-return — taller stack: descent stage + ascent
 *  stage perched on top (the part that launched the sample home),
 *  with vertical return-trail spike to mark the sample left Earth-side. */
function buildChangeSampleReturn(color: string): THREE.Group {
  const g = new THREE.Group();
  // Descent stage — hex bus with legs (similar to Chang'e 3/4).
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.24, 6), goldMat());
  body.position.y = 0.32;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.52, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.32, 0.22, Math.sin(ang) * 0.32);
    leg.rotation.z = -Math.cos(ang) * 0.45;
    leg.rotation.x = Math.sin(ang) * 0.45;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.5, 0.02, Math.sin(ang) * 0.5);
    g.add(pad);
  }
  // Ascent stage stub — short cylinder + capsule on top (left behind
  // after the ascent stage launched the sample container home).
  const ascent = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.4, 8), bodyMat(color));
  ascent.position.y = 0.64;
  g.add(ascent);
  // Faint return-trail spike.
  const spike = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.07, 1.2, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
  );
  spike.position.y = 1.5;
  g.add(spike);
  return g;
}

/** Yutu / Yutu-2 — small 6-wheel rover deployed by Chang'e 3/4. Box
 *  body with two upright gold solar panels on top. */
function buildYutuRover(color: string): THREE.Group {
  const g = new THREE.Group();
  // Chassis.
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.28), bodyMat(color));
  chassis.position.y = 0.15;
  g.add(chassis);
  // 6 wheels (3 per side).
  for (const dz of [-0.16, 0.16]) {
    for (const dx of [-0.16, 0, 0.16]) {
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), darkMat());
      wheel.position.set(dx, 0.07, dz);
      g.add(wheel);
    }
  }
  // Two upright gold solar panels above the chassis.
  for (const dx of [-0.08, 0.08]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.02), panelMat());
    panel.position.set(dx, 0.32, 0);
    panel.rotation.z = dx > 0 ? -0.3 : 0.3;
    g.add(panel);
  }
  // Camera mast.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 4), silverMat());
  mast.position.set(0.18, 0.34, 0);
  g.add(mast);
  const cam = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.05), darkMat());
  cam.position.set(0.18, 0.48, 0);
  g.add(cam);
  // Accent stripe.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.02), accentMat(color));
  stripe.position.set(0, 0.23, 0.15);
  g.add(stripe);
  return g;
}

// ─── Chandrayaan-3 (ISRO) ───────────────────────────────────────────

/** Vikram lander (Chandrayaan-3) — box bus with four splayed legs +
 *  paired solar panels, Pragyan rover parked beside it. First south-
 *  polar landing (Aug 2023). */
function buildVikram(color: string): THREE.Group {
  const g = new THREE.Group();
  // Lander box bus.
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.42), goldMat());
  body.position.y = 0.35;
  g.add(body);
  // 4 splayed legs.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.5, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.35, 0.22, Math.sin(ang) * 0.35);
    leg.rotation.z = -Math.cos(ang) * 0.5;
    leg.rotation.x = Math.sin(ang) * 0.5;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.55, 0.02, Math.sin(ang) * 0.55);
    g.add(pad);
  }
  // 2 solar panels mounted on top, angled.
  for (const dx of [-0.3, 0.3]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.3), panelMat());
    panel.position.set(dx, 0.55, 0);
    panel.rotation.z = dx > 0 ? -0.4 : 0.4;
    g.add(panel);
  }
  // High-gain antenna on top.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15, 4), silverMat());
  mast.position.set(0, 0.62, 0);
  g.add(mast);
  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.015, 12), silverMat());
  dish.position.set(0, 0.72, 0);
  dish.rotation.x = Math.PI / 2;
  g.add(dish);
  // Pragyan rover parked beside Vikram — small 6-wheeled box.
  const rover = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.14), bodyMat(color));
  chassis.position.y = 0.1;
  rover.add(chassis);
  for (const dz of [-0.08, 0.08]) {
    for (const dx of [-0.07, 0, 0.07]) {
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), darkMat());
      wheel.position.set(dx, 0.04, dz);
      rover.add(wheel);
    }
  }
  // Pragyan's flat-top solar panel.
  const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.12), panelMat());
  panel.position.y = 0.16;
  rover.add(panel);
  rover.position.set(-0.55, 0, 0.25);
  g.add(rover);
  // Accent ring.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.012, 6, 24), accentMat(color));
  ring.position.y = 0.18;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── SLIM (JAXA) ────────────────────────────────────────────────────

/** SLIM — "Moon Sniper". Small 2.4 m lander that famously tipped onto
 *  its nose after a soft landing, ending up face-down with its solar
 *  panels pointing west. Distinctive sideways-on-the-ground silhouette. */
function buildSLIM(color: string): THREE.Group {
  const g = new THREE.Group();
  // Main body — short cylinder lying on its side, tilted nose-down.
  const body = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 12), bodyMat(color));
  hull.rotation.z = Math.PI / 2;
  body.add(hull);
  // Solar panels on one face — flat dark rectangles.
  for (const dz of [-0.13, 0.13]) {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.12), panelMat());
    panel.position.set(0, 0.18, dz);
    body.add(panel);
  }
  // Sample of legs — only 1-2 remain visible in the tipped pose.
  const leg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), silverMat());
  leg1.position.set(-0.25, -0.08, 0.18);
  leg1.rotation.z = 0.5;
  body.add(leg1);
  const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 4), silverMat());
  leg2.position.set(0.25, -0.08, -0.18);
  leg2.rotation.z = -0.5;
  body.add(leg2);
  // Tip the whole body forward to match the famous nose-down pose.
  body.rotation.z = -0.4;
  body.position.y = 0.22;
  g.add(body);
  // Accent stripe.
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.02), accentMat(color));
  stripe.position.set(0, 0.32, 0);
  stripe.rotation.z = -0.4;
  g.add(stripe);
  return g;
}

// ─── Artemis III (NASA, planned) ────────────────────────────────────

/** Artemis III — future HLS-derived crewed lander. Tall vertical
 *  cylinder with crew elevator + flag (US). Rendered with a slightly
 *  translucent "future" treatment so it visually reads as not-yet-flown. */
function buildArtemis(color: string): THREE.Group {
  const g = new THREE.Group();
  // Tall lander cylinder.
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.4, 1.3, 12),
    new THREE.MeshStandardMaterial({
      color: MLI_WHITE,
      metalness: 0.25,
      roughness: 0.5,
      emissive: color,
      emissiveIntensity: 0.12,
      transparent: true,
      opacity: 0.85,
    }),
  );
  body.position.y = 0.8;
  g.add(body);
  // 4 splayed landing legs.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.55, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.38, 0.22, Math.sin(ang) * 0.38);
    leg.rotation.z = -Math.cos(ang) * 0.4;
    leg.rotation.x = Math.sin(ang) * 0.4;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.55, 0.02, Math.sin(ang) * 0.55);
    g.add(pad);
  }
  // Crew elevator (the famous side-mounted lift).
  const elevator = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.16), darkMat());
  elevator.position.set(0.4, 0.7, 0);
  g.add(elevator);
  // US flag.
  g.add(buildUSFlag(color));
  // Accent ring at the base.
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 24), accentMat(color));
  ring.position.y = 0.2;
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  return g;
}

// ─── Category-based fallbacks ───────────────────────────────────────

/** Generic crewed silhouette — only used if a future Apollo-class
 *  mission lands and we haven't authored a dedicated builder for it.
 *  Closer to the LM shape than the previous tall-cone marker. */
function buildGenericCrewed(color: string): THREE.Group {
  const g = new THREE.Group();
  g.add(buildApolloDescentStage());
  g.add(buildUSFlag(color));
  return g;
}

/** Generic rover — wheeled chassis (used as a fallback when an
 *  unknown rover mission lands). */
function buildGenericRover(color: string): THREE.Group {
  const g = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.32), bodyMat(color));
  chassis.position.y = 0.17;
  g.add(chassis);
  for (const dz of [-0.18, 0.18]) {
    for (const dx of [-0.2, 0, 0.2]) {
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), darkMat());
      wheel.position.set(dx, 0.08, dz);
      g.add(wheel);
    }
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.3, 4), silverMat());
  mast.position.set(0.15, 0.41, 0);
  g.add(mast);
  return g;
}

/** Generic sample-return — descent stub + return-trail spike. Used
 *  when a sample-return mission id has no dedicated builder. */
function buildGenericSampleReturn(color: string): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.22, 6), silverMat());
  base.position.y = 0.22;
  g.add(base);
  const spike = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.07, 1.3, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 }),
  );
  spike.position.y = 1.45;
  g.add(spike);
  return g;
}

/** Generic stationary lander — octagonal bus with 4 legs + antenna.
 *  Used when an unknown lander id lands on the Moon. */
function buildGenericLander(color: string): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.26, 8), bodyMat(color));
  body.position.y = 0.32;
  g.add(body);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), silverMat());
    leg.position.set(Math.cos(ang) * 0.28, 0.22, Math.sin(ang) * 0.28);
    leg.rotation.z = -Math.cos(ang) * 0.5;
    leg.rotation.x = Math.sin(ang) * 0.5;
    g.add(leg);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.022, 8), silverMat());
    pad.position.set(Math.cos(ang) * 0.45, 0.02, Math.sin(ang) * 0.45);
    g.add(pad);
  }
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), silverMat());
  antenna.position.y = 0.65;
  g.add(antenna);
  const accent = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.012, 6, 24), accentMat(color));
  accent.position.y = 0.18;
  accent.rotation.x = Math.PI / 2;
  g.add(accent);
  return g;
}

// ─── Dispatch ───────────────────────────────────────────────────────

import { categoriseMoonMarker, type MoonMarkerCategory } from './moon-marker-category';

const BUILDERS: Record<string, (color: string) => THREE.Group> = {
  // Apollo (NASA)
  apollo11: buildApolloLM,
  apollo12: buildApolloLM,
  apollo14: buildApolloLM,
  apollo15: buildApolloLMExtended,
  apollo16: buildApolloLMExtended,
  apollo17: buildApolloLMExtended,
  artemis3: buildArtemis,
  // Luna programme (USSR)
  luna9: buildLuna9,
  luna16: buildLunaSampleReturn,
  luna20: buildLunaSampleReturn,
  luna24: buildLunaSampleReturn,
  luna17: buildLunokhod,
  luna21: buildLunokhod,
  // Chang'e (CNSA)
  change3: buildChangeLander,
  change4: buildChangeLander,
  change5: buildChangeSampleReturn,
  change6: buildChangeSampleReturn,
  // Yutu rovers (deployed by Chang'e 3/4 — typically marked at the
  // same site as the lander; included for completeness in case data
  // ever lists them separately.)
  yutu: buildYutuRover,
  'yutu-2': buildYutuRover,
  // Chandrayaan-3 (ISRO) — Vikram + Pragyan packaged together.
  chandrayaan3: buildVikram,
  // SLIM (JAXA)
  slim: buildSLIM,
};

const CATEGORY_FALLBACKS: Record<MoonMarkerCategory, (color: string) => THREE.Group> = {
  crewed: buildGenericCrewed,
  rover: buildGenericRover,
  'sample-return': buildGenericSampleReturn,
  orbiter: buildGenericLander, // orbiters are handled separately by buildSatelliteModel; this is a safety fallback
  lander: buildGenericLander,
};

/** Build a per-mission moon-surface marker for `siteId`. Falls back
 *  to a category-based silhouette (lander/rover/sample-return/crewed)
 *  for ids without a dedicated builder. Caller supplies the agency
 *  colour for accent tinting. */
export function buildMoonLanderModel(
  siteId: string,
  missionType: string | undefined,
  color: string,
): THREE.Group {
  const builder = BUILDERS[siteId];
  if (builder) return builder(color);
  const category = categoriseMoonMarker(missionType);
  return CATEGORY_FALLBACKS[category](color);
}

/** Exposed for tests: list of ids that have a dedicated builder. */
export const KNOWN_MOON_LANDER_IDS = Object.keys(BUILDERS);
