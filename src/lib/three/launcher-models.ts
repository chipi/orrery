import * as THREE from 'three';

/**
 * Per-launcher procedural rocket models for /fly's Scene 0 (RFC-033 §8 S11).
 * Each builder composes Three.js primitives into a recognisable silhouette —
 * Saturn V's tapered stack, Soyuz's four strap-ons, Ariane 5's side boosters —
 * so a launch shows the actual vehicle instead of a generic body, the same
 * treatment `interplanetary-spacecraft-models.ts` gives the spacecraft fleet.
 *
 * Every builder returns the SAME part structure (`LauncherModel`) so the scene's
 * separation choreography (booster drop, fairing clamshell, plume, payload
 * spring) drives any vehicle uniformly. All geometry is scaled to `vehLen`.
 */

export interface LauncherModel {
  /** Whole rocket, added to the scene's vehicle group. */
  root: THREE.Group;
  /** First stage (+ strap-ons + interstage) — detaches and tumbles at staging. */
  booster: THREE.Group;
  /** The mesh the exhaust plume attaches to while the booster fires. */
  boosterPlumeAnchor: THREE.Object3D;
  /** Upper stage — continues after staging, drifts back at payload separation. */
  upperStage: THREE.Group;
  /** The mesh the plume attaches to while the upper stage fires. */
  upperPlumeAnchor: THREE.Object3D;
  /** Fairing clamshell halves (−X / +X) that split at jettison. */
  fairingL: THREE.Mesh;
  fairingR: THREE.Mesh;
  fairingGroup: THREE.Group;
  /** Base Y positions (scene units) before separation offsets are applied. */
  upperStageBaseY: number;
  fairingBaseY: number;
  payloadMountY: number;
}

interface Palette {
  body: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  eng: THREE.MeshStandardMaterial;
  accent: THREE.MeshStandardMaterial;
}

function palette(bodyColor = 0xeef2f7, accentColor = 0xd8dde3): Palette {
  return {
    body: new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.42, metalness: 0.18 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.55, metalness: 0.35 }),
    eng: new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.7 }),
    accent: new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5, metalness: 0.2 }),
  };
}

/** A downward-firing engine bell. */
function nozzle(r: number, len: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, len, 14, 1, true), mat);
  m.rotation.x = Math.PI;
  return m;
}

/** A downward-firing engine bell placed at body-axis height `y`. */
function bell(r: number, len: number, mat: THREE.Material, y: number): THREE.Mesh {
  const m = nozzle(r, len, mat);
  m.position.y = y;
  return m;
}

/** A clamshell fairing half (cone sector), positioned at `baseY`. */
function fairingHalf(rBody: number, vehLen: number, thetaStart: number, mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.ConeGeometry(rBody * 1.02, vehLen * 0.17, 24, 1, true, thetaStart, Math.PI),
    mat,
  );
}

/**
 * Generic stylised booster — a Falcon-9-like slender two-stage body. The
 * fallback for launchers without a dedicated builder, and the base other
 * builders start from.
 */
function buildGeneric(vehLen: number): LauncherModel {
  const p = palette();
  const rBody = vehLen * 0.05;
  const root = new THREE.Group();

  // ── Booster (first stage): body + octaweb + 9 engines + legs + grid fins.
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.55, 40), p.body);
  stage1.position.y = vehLen * 0.305;
  booster.add(stage1);

  const octaweb = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody * 0.94, vehLen * 0.03, 40), p.dark);
  octaweb.position.y = vehLen * 0.02;
  booster.add(octaweb);
  const merlinGeo = new THREE.ConeGeometry(rBody * 0.22, vehLen * 0.04, 12, 1, true);
  const mkEng = (x: number, z: number): THREE.Mesh => {
    const m = new THREE.Mesh(merlinGeo, p.eng);
    m.position.set(x, -vehLen * 0.008, z);
    m.rotation.x = Math.PI;
    return m;
  };
  booster.add(mkEng(0, 0));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    booster.add(mkEng(Math.cos(a) * rBody * 0.55, Math.sin(a) * rBody * 0.55));
  }

  const legGeo = new THREE.BoxGeometry(rBody * 0.14, vehLen * 0.2, rBody * 0.08);
  const finGeo = new THREE.BoxGeometry(rBody * 0.5, vehLen * 0.02, rBody * 0.14);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const leg = new THREE.Mesh(legGeo, p.dark);
    leg.position.set(Math.cos(a) * rBody * 1.02, vehLen * 0.11, Math.sin(a) * rBody * 1.02);
    booster.add(leg);
    const af = a + Math.PI / 4;
    const fin = new THREE.Mesh(finGeo, p.dark);
    fin.position.set(Math.cos(af) * rBody * 1.15, vehLen * 0.5, Math.sin(af) * rBody * 1.15);
    fin.rotation.y = -af;
    booster.add(fin);
  }
  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.045, 40), p.dark);
  interstage.position.y = vehLen * 0.6;
  booster.add(interstage);
  root.add(booster);

  // ── Upper stage: body + vacuum bell.
  const upperStageBaseY = vehLen * 0.735;
  const upperStage = new THREE.Group();
  const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.22, 40), p.body);
  stage2.position.y = upperStageBaseY;
  const s2nozzle = nozzle(rBody * 0.55, vehLen * 0.06, p.eng);
  s2nozzle.position.y = vehLen * 0.6;
  upperStage.add(stage2, s2nozzle);
  root.add(upperStage);

  // ── Fairing clamshell.
  const fairingBaseY = vehLen * 0.93;
  const fairingL = fairingHalf(rBody, vehLen, Math.PI / 2, p.body);
  const fairingR = fairingHalf(rBody, vehLen, -Math.PI / 2, p.body);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: stage1,
    upperStage,
    upperPlumeAnchor: stage2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.85,
  };
}

/** A ring of `n` downward engine bells on a base. */
function engineRing(n: number, ringR: number, bellR: number, bellLen: number, y: number, mat: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const add = (x: number, z: number): void => {
    const b = nozzle(bellR, bellLen, mat);
    b.position.set(x, y, z);
    g.add(b);
  };
  if (n % 2 === 1) add(0, 0);
  const ring = n % 2 === 1 ? n - 1 : n;
  for (let i = 0; i < ring; i++) {
    const a = (i / ring) * Math.PI * 2;
    add(Math.cos(a) * ringR, Math.sin(a) * ringR);
  }
  return g;
}

/**
 * Saturn V — the unmistakable tapering three-stage stack: a very wide S-IC with
 * five F-1 bells, a narrower S-II, a slim S-IVB, capped by the Apollo CSM and
 * the spindly launch-escape tower.
 */
function buildSaturnV(vehLen: number): LauncherModel {
  const p = palette(0xf2f2ee, 0x1a1a1a);
  const r = vehLen * 0.075; // stout
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const sic = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.42, 40), p.body);
  sic.position.y = vehLen * 0.23;
  // black roll-pattern band near the base
  const band = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.01, vehLen * 0.05, 40), p.dark);
  band.position.y = vehLen * 0.08;
  const fins = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(r * 0.5, vehLen * 0.1, r * 0.12), p.dark);
    fin.position.set(Math.cos(a) * r * 1.1, vehLen * 0.05, Math.sin(a) * r * 1.1);
    fin.rotation.y = -a;
    fins.add(fin);
  }
  booster.add(sic, band, fins, engineRing(5, r * 0.55, r * 0.2, vehLen * 0.05, vehLen * 0.0, p.eng));
  root.add(booster);

  const upperStage = new THREE.Group();
  const sii = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r, vehLen * 0.05, 40), p.body); // interstage taper
  sii.position.y = vehLen * 0.47;
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.62, r * 0.62, vehLen * 0.22, 40), p.body);
  s2.position.y = vehLen * 0.6;
  const s4b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.62, vehLen * 0.16, 40), p.body);
  s4b.position.y = vehLen * 0.79;
  upperStage.add(sii, s2, s4b, bell(r * 0.3, vehLen * 0.05, p.eng, vehLen * 0.47));
  root.add(upperStage);

  // The Apollo stack rides as the "fairing": a conical CSM + a thin escape tower.
  const fairingBaseY = vehLen * 0.88;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, vehLen * 0.14, 20, 1, true, theta, Math.PI), p.accent);
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.04, r * 0.04, vehLen * 0.1, 8), p.dark);
  tower.position.y = fairingBaseY + vehLen * 0.13;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, tower);
  root.add(fairingGroup);

  return {
    root, booster, boosterPlumeAnchor: sic, upperStage, upperPlumeAnchor: s2,
    fairingL, fairingR, fairingGroup,
    upperStageBaseY: vehLen * 0.6, fairingBaseY, payloadMountY: vehLen * 0.82,
  };
}

/** Add `n` tapered conical strap-on boosters around a core, into `booster`. */
function strapOns(booster: THREE.Group, n: number, coreR: number, len: number, vehLen: number, mat: THREE.Material, engMat: THREE.Material): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const gr = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(coreR * 0.32, coreR * 0.5, len, 20), mat);
    body.position.y = len / 2;
    // tapered nose cone
    const nose = new THREE.Mesh(new THREE.ConeGeometry(coreR * 0.32, len * 0.35, 20), mat);
    nose.position.y = len + len * 0.17;
    gr.add(body, nose, nozzle(coreR * 0.22, vehLen * 0.04, engMat));
    gr.position.set(Math.cos(a) * coreR * 1.25, 0, Math.sin(a) * coreR * 1.25);
    booster.add(gr);
  }
}

/**
 * Soyuz / R-7 (vostok-k) — the iconic "Korolev cross": a central core with a
 * tapered nose, wrapped by four tapered conical strap-on boosters.
 */
function buildSoyuz(vehLen: number): LauncherModel {
  const p = palette(0xdfe4ea, 0x9aa3ad);
  const r = vehLen * 0.05;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.5, 32), p.body);
  core.position.y = vehLen * 0.28;
  booster.add(core, nozzle(r * 0.5, vehLen * 0.05, p.eng));
  strapOns(booster, 4, r, vehLen * 0.34, vehLen, p.accent, p.eng);
  root.add(booster);

  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, vehLen * 0.2, 32), p.body);
  s2.position.y = vehLen * 0.64;
  upperStage.add(s2, bell(r * 0.4, vehLen * 0.05, p.eng, vehLen * 0.53));
  root.add(upperStage);

  const fairingBaseY = vehLen * 0.82;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.ConeGeometry(r * 0.95, vehLen * 0.18, 20, 1, true, theta, Math.PI), p.body);
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root, booster, boosterPlumeAnchor: core, upperStage, upperPlumeAnchor: s2,
    fairingL, fairingR, fairingGroup,
    upperStageBaseY: vehLen * 0.64, fairingBaseY, payloadMountY: vehLen * 0.74,
  };
}

/** Two tall side boosters flanking a core + bulbous fairing (Ariane 5 / H-IIA). */
function buildSideBooster(vehLen: number, opts: { boosterLen: number; fairingR: number; body: number; boost: number }): LauncherModel {
  const p = palette(opts.body, opts.boost);
  const r = vehLen * 0.045;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.6, 32), p.body);
  core.position.y = vehLen * 0.33;
  booster.add(core, nozzle(r * 0.5, vehLen * 0.05, p.eng));
  for (const sx of [-1, 1]) {
    const gr = new THREE.Group();
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.55, r * 0.55, vehLen * opts.boosterLen, 24), p.accent);
    b.position.y = (vehLen * opts.boosterLen) / 2 + vehLen * 0.02;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, vehLen * 0.08, 24), p.accent);
    nose.position.y = vehLen * opts.boosterLen + vehLen * 0.06;
    gr.add(b, nose, nozzle(r * 0.32, vehLen * 0.04, p.eng));
    gr.position.set(sx * r * 1.5, 0, 0);
    booster.add(gr);
  }
  root.add(booster);

  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r, vehLen * 0.16, 32), p.body);
  s2.position.y = vehLen * 0.71;
  upperStage.add(s2, bell(r * 0.35, vehLen * 0.05, p.eng, vehLen * 0.62));
  root.add(upperStage);

  const fairingBaseY = vehLen * 0.83;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.ConeGeometry(r * opts.fairingR, vehLen * 0.2, 24, 1, true, theta, Math.PI), p.body);
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root, booster, boosterPlumeAnchor: core, upperStage, upperPlumeAnchor: s2,
    fairingL, fairingR, fairingGroup,
    upperStageBaseY: vehLen * 0.71, fairingBaseY, payloadMountY: vehLen * 0.76,
  };
}

/**
 * Space Shuttle (space-shuttle-stack) — the unmistakable side-mount stack:
 * a rust-orange External Tank spine, two white Solid Rocket Boosters flanking
 * it, and the white delta-wing Orbiter riding its side with three SSME bells.
 * The ET + SRBs are the `booster` (drop at staging = ET jettison); the Orbiter
 * is the `upperStage` (flies on to deploy the payload).
 */
function buildSpaceShuttle(vehLen: number): LauncherModel {
  const white = new THREE.MeshStandardMaterial({ color: 0xeef0f3, roughness: 0.5, metalness: 0.08 });
  const tank = new THREE.MeshStandardMaterial({ color: 0xb15c22, roughness: 0.92, metalness: 0.03 }); // foam
  const tile = new THREE.MeshStandardMaterial({ color: 0x191b20, roughness: 0.68, metalness: 0.12 }); // TPS
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a2d33, roughness: 0.5, metalness: 0.4 });
  const eng = new THREE.MeshStandardMaterial({ color: 0x2b2f36, roughness: 0.4, metalness: 0.7 });
  const r = vehLen * 0.05;
  const root = new THREE.Group();

  // ── External Tank — the rust spine with an ogive nose. (in `booster`.)
  const booster = new THREE.Group();
  const rET = r * 1.15;
  const etLen = vehLen * 0.74;
  const et = new THREE.Mesh(new THREE.CylinderGeometry(rET * 0.97, rET, etLen, 32), tank);
  et.position.y = vehLen * 0.05 + etLen / 2;
  const etNose = new THREE.Mesh(new THREE.SphereGeometry(rET, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), tank);
  etNose.scale.y = 1.6;
  etNose.position.y = vehLen * 0.05 + etLen;
  booster.add(et, etNose);

  // ── Two SRBs flanking the tank (±X), white, segmented, pointed nose + nozzle.
  const rSRB = r * 0.6;
  const srbLen = vehLen * 0.64;
  for (const sx of [-1, 1]) {
    const srb = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(rSRB, rSRB, srbLen, 24), white);
    body.position.y = vehLen * 0.05 + srbLen / 2;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(rSRB, vehLen * 0.12, 24), white);
    nose.position.y = vehLen * 0.05 + srbLen + vehLen * 0.06;
    srb.add(body, nose, bell(rSRB * 0.82, vehLen * 0.05, eng, vehLen * 0.03));
    for (const f of [0.32, 0.55, 0.78]) {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(rSRB * 1.03, rSRB * 1.03, vehLen * 0.01, 24), dark);
      band.position.y = vehLen * 0.05 + srbLen * f;
      srb.add(band);
    }
    srb.position.set(sx * (rET + rSRB * 0.98), 0, -rET * 0.12);
    booster.add(srb);
  }
  root.add(booster);

  // ── Orbiter — the delta-wing spaceplane, mounted nose-up on the tank's +Z
  //    face (belly to the tank, so the black underside is hidden against it).
  //    Proportioned to the Enterprise free-flight profile: a long slender body,
  //    a pointed black nose, a big low double-delta over the aft half, a tall
  //    swept tail. NOT a fat blob and NOT a pencil.
  const orbiter = new THREE.Group();
  const rFus = r * 0.86; // chunky, wide body
  const oz = rET + rFus * 0.66; // belly nestles against the tank
  const yA = vehLen * 0.055; // aft (engine plane)
  const bodyLen = vehLen * 0.34; // SHORT fuselage: aft → nose base
  const yNoseBase = yA + bodyLen;

  // Fuselage — a short, wide, flattened white body (much wider than deep).
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(rFus * 0.82, rFus, bodyLen, 24), white);
  fus.scale.set(1.45, 1, 0.78);
  fus.position.set(0, yA + bodyLen / 2, oz);
  // Short chunky black-tile nose.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(rFus * 0.92, vehLen * 0.12, 24), tile);
  nose.scale.set(1.45, 1, 0.78);
  nose.position.set(0, yNoseBase + vehLen * 0.05, oz);

  // Big low double-delta wing — a shape in the body plane (span X, chord Y),
  // extruded thin in Z; it rides ALONG the aft half of the body and sweeps
  // back. White on top, a black delta tucked just beneath for the tiled
  // underside. A glove kink gives the double-delta leading edge.
  const span = r * 3.7;
  const yGlove = yA + bodyLen * 0.98; // glove LE meets the body high & forward
  const yWingTE = yA + vehLen * 0.001; // straight trailing edge across the aft
  const h = yGlove - yWingTE;
  const wingShape = new THREE.Shape();
  wingShape.moveTo(rFus * 0.5, yGlove); // glove root, forward
  wingShape.lineTo(rFus * 0.5, yWingTE); // root trailing
  wingShape.lineTo(span, yWingTE); // wingtip trailing (aft-outboard)
  wingShape.lineTo(span, yWingTE + h * 0.16); // squared wingtip
  wingShape.lineTo(span * 0.52, yWingTE + h * 0.34); // main-panel leading edge
  wingShape.lineTo(rFus * 1.5, yWingTE + h * 0.74); // glove kink (double-delta)
  wingShape.closePath();
  const thick = r * 0.12;
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: thick, bevelEnabled: false });
  wingGeo.translate(0, 0, -thick / 2);
  const mkWing = (sx: number, mat: THREE.Material, dz = 0): THREE.Mesh => {
    const w = new THREE.Mesh(wingGeo, mat);
    w.scale.x = sx;
    w.position.set(0, 0, oz + dz);
    return w;
  };

  // Tall swept vertical stabiliser at the aft, standing off the spine (+Z).
  const tailShape = new THREE.Shape();
  tailShape.moveTo(0, yA + vehLen * 0.02);
  tailShape.lineTo(vehLen * 0.13, yA + vehLen * 0.02);
  tailShape.lineTo(vehLen * 0.045, yA + vehLen * 0.24);
  tailShape.lineTo(0, yA + vehLen * 0.24);
  tailShape.closePath();
  const tailGeo = new THREE.ExtrudeGeometry(tailShape, { depth: r * 0.05, bevelEnabled: false });
  tailGeo.rotateY(-Math.PI / 2); // fin in the Y-Z plane, thin in X
  const tail = new THREE.Mesh(tailGeo, white);
  tail.position.set(0, 0, oz + rFus * 0.42);

  // OMS pods — two bumps flanking the tail base.
  const oms = new THREE.Group();
  for (const sx of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(rFus * 0.24, vehLen * 0.05, 6, 10), white);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(sx * rFus * 0.6, yA + vehLen * 0.05, oz + rFus * 0.28);
    oms.add(pod);
  }

  // Three SSME bells clustered at the aft base.
  const ssme = engineRing(3, rFus * 0.46, rFus * 0.3, vehLen * 0.05, 0, eng);
  ssme.position.set(0, yA - vehLen * 0.004, oz);

  orbiter.add(
    fus,
    nose,
    mkWing(1, tile, -thick * 0.85), // black underside, tucked toward the belly
    mkWing(-1, tile, -thick * 0.85),
    mkWing(1, white),
    mkWing(-1, white),
    tail,
    oms,
    ssme,
  );
  root.add(orbiter);

  // No fairing — the payload rides in the Orbiter bay. Tiny hidden shells keep
  // the clamshell choreography a no-op.
  const hidden = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 });
  const fairingL = new THREE.Mesh(new THREE.ConeGeometry(r * 0.02, r * 0.02, 4), hidden);
  const fairingR = new THREE.Mesh(new THREE.ConeGeometry(r * 0.02, r * 0.02, 4), hidden);
  const fairingGroup = new THREE.Group();
  fairingGroup.visible = false;
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: et, // liftoff plume blooms from the SRB + SSME cluster
    upperStage: orbiter,
    upperPlumeAnchor: fus,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY: yA + bodyLen / 2,
    fairingBaseY: vehLen * 0.9,
    payloadMountY: vehLen * 0.5,
  };
}

/** Dispatch table — a dedicated silhouette per launcher; the rest fall back generic. */
const BUILDERS: Record<string, (vehLen: number) => LauncherModel> = {
  'saturn-v': buildSaturnV,
  'saturn-ib': buildSaturnV,
  'vostok-k': buildSoyuz,
  'ariane-5': (v) => buildSideBooster(v, { boosterLen: 0.62, fairingR: 1.35, body: 0xeae6da, boost: 0xd8d2c4 }),
  'h-iia': (v) => buildSideBooster(v, { boosterLen: 0.38, fairingR: 1.15, body: 0xf0f0f0, boost: 0xdedede }),
  'space-shuttle-stack': buildSpaceShuttle,
};

/**
 * The 3D model for a launcher id (its dedicated silhouette if one exists, else
 * the generic body). `vehLen` scales the whole rocket.
 */
export function buildLauncherModel(launcherId: string | undefined, vehLen: number): LauncherModel {
  const build = (launcherId && BUILDERS[launcherId]) || buildGeneric;
  return build(vehLen);
}
