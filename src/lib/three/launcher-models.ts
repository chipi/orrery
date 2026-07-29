import * as THREE from 'three';
import { heroGold, heroWhite, heroDark, heroMetal } from './hero-materials';
import { getLauncherEngines } from '$lib/orbital/launcher-engines';
import {
  agencyPalette,
  ringFrames,
  vStringers,
  raceway,
  sweptFin,
  engineCluster,
  livery,
  stringerRoughness,
} from './launcher-detail';

/**
 * Per-launcher procedural rocket models for /fly's Scene 0 (RFC-034 §8 S11).
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
  /** Strap-on boosters that jettison SEPARATELY (before core staging) — e.g.
   *  Atlas V's variable AJ-60A count. Undefined when the vehicle has none or
   *  models them as part of the core `booster` group (Soyuz / Ariane / H-IIA). */
  strapOns?: THREE.Group;
  /** Intermediate serial stage that jettisons at the SECOND core staging — the
   *  stage BETWEEN `booster` (first stage) and `upperStage` (final stage), e.g.
   *  Saturn V's S-II sitting between the S-IC and the S-IVB. Undefined for
   *  2-stage vehicles. Any 3+ serial-stage builder can populate it and the scene
   *  drops it on the second core staging event, matching the physics. */
  midStage?: THREE.Group;
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
function fairingHalf(
  rBody: number,
  vehLen: number,
  thetaStart: number,
  mat: THREE.Material,
): THREE.Mesh {
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
function buildGeneric(vehLen: number, boosterCount = 0): LauncherModel {
  const p = palette();
  const rBody = vehLen * 0.05;
  const root = new THREE.Group();

  // ── Booster (first stage): body + octaweb + 9 engines + legs + grid fins.
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(
    new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.55, 40),
    p.body,
  );
  stage1.position.y = vehLen * 0.305;
  booster.add(stage1);

  const octaweb = new THREE.Mesh(
    new THREE.CylinderGeometry(rBody, rBody * 0.94, vehLen * 0.03, 40),
    p.dark,
  );
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
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.045, 40),
    p.dark,
  );
  interstage.position.y = vehLen * 0.6;
  booster.add(interstage);
  root.add(booster);

  // ── Strap-on boosters (e.g. Atlas V's 0–5 AJ-60A solids). Built in their OWN
  //    group so the scene jettisons them at strap-on burnout, before core
  //    staging. Clustered around the core base, ~2/3 the core height.
  let strapOnGroup: THREE.Group | undefined;
  if (boosterCount > 0) {
    strapOnGroup = new THREE.Group();
    strapOns(strapOnGroup, boosterCount, rBody, vehLen * 0.42, vehLen, p.accent, p.eng);
    root.add(strapOnGroup);
  }

  // ── Upper stage: body + vacuum bell.
  const upperStageBaseY = vehLen * 0.735;
  const upperStage = new THREE.Group();
  const stage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(rBody, rBody, vehLen * 0.22, 40),
    p.body,
  );
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
    strapOns: strapOnGroup,
  };
}

/** A ring of `n` downward engine bells on a base. */
function engineRing(
  n: number,
  ringR: number,
  bellR: number,
  bellLen: number,
  y: number,
  mat: THREE.Material,
): THREE.Group {
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
  const spec = getLauncherEngines('saturn-v')!;
  const pal = agencyPalette('NASA');
  const r = vehLen * 0.075; // stout
  const root = new THREE.Group();

  // S-IC body wears the NASA livery (roll pattern + USA + flag); a ribbed
  // roughness map + ring frames + a systems tunnel give the tank real skin.
  const livMat = new THREE.MeshStandardMaterial({
    map: livery({
      rollPattern: true,
      wordmark: { text: 'U S A', color: '#14161b', size: 0.11, y: 0.7 },
      flag: 'usa',
    }),
    roughness: 0.5,
    metalness: 0.15,
    roughnessMap: stringerRoughness(80),
  });

  // ── S-IC (Stage 1) → booster ──────────────────────────────────────────────
  const booster = new THREE.Group();
  const sic = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.42, 64), livMat);
  sic.position.y = vehLen * 0.23;
  booster.add(sic);
  booster.add(ringFrames(r, vehLen * 0.04, vehLen * 0.43, 12, pal.frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.42, pal.dark));
  const boat = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, vehLen * 0.05, 64), pal.frame);
  boat.position.y = vehLen * 0.02;
  booster.add(boat);
  booster.add(
    engineCluster(
      spec.stages[0].arrangement,
      spec.stages[0].mainNozzles,
      r,
      vehLen * 0.08,
      0,
      pal.frame,
      pal.eng,
    ),
  );
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    booster.add(sweptFin(r * 1.02, vehLen * 0.12, vehLen * 0.11, r * 0.7, a, pal.dark));
  }
  root.add(booster);

  // ── S-II (Stage 2) → midStage (jettisons at the SECOND core staging) ───────
  const midStage = new THREE.Group();
  const inter = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.99, r, vehLen * 0.055, 64),
    pal.dark,
  );
  inter.position.y = vehLen * 0.462;
  midStage.add(inter);
  midStage.add(vStringers(r * 0.99, vehLen * 0.438, vehLen * 0.488, 28, pal.frame));
  const sii = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.99, r * 0.99, vehLen * 0.22, 64),
    pal.body,
  );
  sii.position.y = vehLen * 0.6;
  midStage.add(sii);
  midStage.add(ringFrames(r * 0.99, vehLen * 0.5, vehLen * 0.7, 7, pal.frame));
  midStage.add(raceway(r * 0.99, vehLen * 0.5, vehLen * 0.7, pal.dark));
  midStage.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r * 0.9,
      vehLen * 0.05,
      vehLen * 0.487,
      pal.frame,
      pal.eng,
    ),
  );
  root.add(midStage);

  // ── S-IVB (Stage 3) → upperStage ──────────────────────────────────────────
  const upperStage = new THREE.Group();
  const s4t = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.6, r * 0.99, vehLen * 0.06, 64),
    pal.body,
  );
  s4t.position.y = vehLen * 0.745;
  const s4b = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.6, r * 0.6, vehLen * 0.14, 64),
    pal.body,
  );
  s4b.position.y = vehLen * 0.85;
  const foilBand = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.61, r * 0.61, vehLen * 0.03, 48),
    heroGold(0xcaa658),
  );
  foilBand.position.y = vehLen * 0.79;
  upperStage.add(s4t, s4b, foilBand);
  upperStage.add(
    engineCluster(
      spec.stages[2].arrangement,
      spec.stages[2].mainNozzles,
      r * 0.6,
      vehLen * 0.05,
      vehLen * 0.775,
      pal.frame,
      pal.eng,
    ),
  );
  root.add(upperStage);

  // ── Apollo stack as the "fairing": SLA shells + CSM + BPC + LES tower ──────
  const fairingBaseY = vehLen * 0.9;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.6, vehLen * 0.09, 24, 1, true, theta, Math.PI),
      pal.body,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const sm = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.32, r * 0.32, vehLen * 0.05, 40),
    pal.frame,
  );
  sm.position.y = vehLen * 0.99;
  const cm = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.15, r * 0.32, vehLen * 0.05, 40),
    pal.body,
  );
  cm.position.y = vehLen * 1.035;
  const bpc = new THREE.Mesh(
    new THREE.ConeGeometry(r * 0.15, vehLen * 0.06, 32),
    heroWhite(0xdfe2e6),
  );
  bpc.position.y = vehLen * 1.08;
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.028, r * 0.028, vehLen * 0.1, 10),
    pal.dark,
  );
  tower.position.y = vehLen * 1.15;
  const esc = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.08, r * 0.1, vehLen * 0.055, 20),
    heroDark(0x2a2622),
  );
  esc.position.y = vehLen * 1.21;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, sm, cm, bpc, tower, esc);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: sic,
    upperStage,
    upperPlumeAnchor: sii,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY: vehLen * 0.6,
    fairingBaseY,
    payloadMountY: vehLen * 0.9,
    midStage,
  };
}

/** Add `n` tapered conical strap-on boosters around a core, into `booster`. */
function strapOns(
  booster: THREE.Group,
  n: number,
  coreR: number,
  len: number,
  vehLen: number,
  mat: THREE.Material,
  engMat: THREE.Material,
): void {
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const gr = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(coreR * 0.32, coreR * 0.5, len, 20),
      mat,
    );
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
  root.add(booster);
  // The four R-7 strap-ons jettison at the "Korolev cross" (~118 s), before the
  // core burns out — their own group so the scene drops them at booster-sep.
  const strapOnGroup = new THREE.Group();
  strapOns(strapOnGroup, 4, r, vehLen * 0.34, vehLen, p.accent, p.eng);
  root.add(strapOnGroup);

  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, vehLen * 0.2, 32), p.body);
  s2.position.y = vehLen * 0.64;
  upperStage.add(s2, bell(r * 0.4, vehLen * 0.05, p.eng, vehLen * 0.53));
  root.add(upperStage);

  const fairingBaseY = vehLen * 0.82;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.95, vehLen * 0.18, 20, 1, true, theta, Math.PI),
      p.body,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY: vehLen * 0.64,
    fairingBaseY,
    payloadMountY: vehLen * 0.74,
    strapOns: strapOnGroup,
  };
}

/** Two tall side boosters flanking a core + bulbous fairing (Ariane 5 / H-IIA). */
function buildSideBooster(
  vehLen: number,
  opts: { boosterLen: number; fairingR: number; body: number; boost: number },
): LauncherModel {
  const p = palette(opts.body, opts.boost);
  const r = vehLen * 0.045;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.6, 32), p.body);
  core.position.y = vehLen * 0.33;
  booster.add(core, nozzle(r * 0.5, vehLen * 0.05, p.eng));
  root.add(booster);
  // The two solid/liquid side boosters jettison well before the core (EAP at
  // ~140 s, SRB-A similar) — their own group so the scene drops them at
  // booster-sep, not at core MECO.
  const strapOnGroup = new THREE.Group();
  for (const sx of [-1, 1]) {
    const gr = new THREE.Group();
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.55, r * 0.55, vehLen * opts.boosterLen, 24),
      p.accent,
    );
    b.position.y = (vehLen * opts.boosterLen) / 2 + vehLen * 0.02;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, vehLen * 0.08, 24), p.accent);
    nose.position.y = vehLen * opts.boosterLen + vehLen * 0.06;
    gr.add(b, nose, nozzle(r * 0.32, vehLen * 0.04, p.eng));
    gr.position.set(sx * r * 1.5, 0, 0);
    strapOnGroup.add(gr);
  }
  root.add(strapOnGroup);

  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r, vehLen * 0.16, 32), p.body);
  s2.position.y = vehLen * 0.71;
  upperStage.add(s2, bell(r * 0.35, vehLen * 0.05, p.eng, vehLen * 0.62));
  root.add(upperStage);

  const fairingBaseY = vehLen * 0.83;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * opts.fairingR, vehLen * 0.2, 24, 1, true, theta, Math.PI),
      p.body,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY: vehLen * 0.71,
    fairingBaseY,
    payloadMountY: vehLen * 0.76,
    strapOns: strapOnGroup,
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
  const white = new THREE.MeshStandardMaterial({
    color: 0xeef0f3,
    roughness: 0.5,
    metalness: 0.08,
  });
  const tank = new THREE.MeshStandardMaterial({
    color: 0xb15c22,
    roughness: 0.92,
    metalness: 0.03,
  }); // foam
  const tile = new THREE.MeshStandardMaterial({
    color: 0x191b20,
    roughness: 0.68,
    metalness: 0.12,
  }); // TPS
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
  const etNose = new THREE.Mesh(
    new THREE.SphereGeometry(rET, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    tank,
  );
  etNose.scale.y = 1.6;
  etNose.position.y = vehLen * 0.05 + etLen;
  booster.add(et, etNose);

  root.add(booster);

  // ── Two SRBs flanking the tank (±X), white, segmented, pointed nose + nozzle.
  //    They jettison at ~124 s — long before the ET at MECO — so they live in
  //    their own group the scene drops at booster-sep.
  const strapOnGroup = new THREE.Group();
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
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(rSRB * 1.03, rSRB * 1.03, vehLen * 0.01, 24),
        dark,
      );
      band.position.y = vehLen * 0.05 + srbLen * f;
      srb.add(band);
    }
    srb.position.set(sx * (rET + rSRB * 0.98), 0, -rET * 0.12);
    strapOnGroup.add(srb);
  }
  root.add(strapOnGroup);

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
    strapOns: strapOnGroup,
  };
}

/**
 * Falcon 9 — identical to the generic body (octaweb + 9 engines + legs +
 * grid fins) but registered under its own key so the scene picks it up
 * explicitly instead of relying on the fallback.
 */
function buildFalcon9(vehLen: number): LauncherModel {
  const spec = getLauncherEngines('falcon-9')!;
  const white = heroWhite(0xf2f4f6);
  const black = heroDark(0x1a1c20);
  const frame = heroMetal(0xbfc4ca, 0.3);
  const eng = heroMetal(0x3a3f47, 0.5);
  const r = vehLen * 0.045; // slender
  const root = new THREE.Group();
  const livMat = new THREE.MeshStandardMaterial({
    map: livery({
      base: '#f2f4f6',
      wordmark: { text: 'S P A C E X', color: '#18191c', size: 0.05, y: 0.58 },
      flag: 'usa',
    }),
    roughness: 0.5,
    metalness: 0.12,
    roughnessMap: stringerRoughness(60),
  });

  // ── Stage 1: white body + black interstage, 9-Merlin octaweb, legs + grid fins.
  const booster = new THREE.Group();
  const s1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.5, 48), livMat);
  s1.position.y = vehLen * 0.28;
  booster.add(s1);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.5, 6, frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.5, black));
  const octaweb = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.94, vehLen * 0.03, 48), black);
  octaweb.position.y = vehLen * 0.025;
  booster.add(octaweb);
  booster.add(
    engineCluster(
      spec.stages[0].arrangement,
      spec.stages[0].mainNozzles,
      r,
      vehLen * 0.04,
      vehLen * 0.005,
      frame,
      eng,
    ),
  );
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.BoxGeometry(r * 0.12, vehLen * 0.18, r * 0.08), frame);
    leg.position.set(Math.cos(a) * r * 1.02, vehLen * 0.11, Math.sin(a) * r * 1.02);
    leg.rotation.y = -a;
    booster.add(leg);
    const af = a + Math.PI / 4;
    const gf = new THREE.Mesh(new THREE.BoxGeometry(r * 0.4, vehLen * 0.015, r * 0.12), frame);
    gf.position.set(Math.cos(af) * r * 1.12, vehLen * 0.48, Math.sin(af) * r * 1.12);
    gf.rotation.y = -af;
    booster.add(gf);
  }
  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.04, 48), black);
  interstage.position.y = vehLen * 0.55;
  booster.add(interstage);
  root.add(booster);

  // ── Stage 2: single Merlin Vacuum.
  const upperStageBaseY = vehLen * 0.67;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.2, 48), white);
  s2.position.y = upperStageBaseY;
  upperStage.add(s2);
  upperStage.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.06,
      vehLen * 0.56,
      frame,
      eng,
    ),
  );
  root.add(upperStage);

  // ── Fairing clamshell.
  const fairingBaseY = vehLen * 0.85;
  const fairingL = fairingHalf(r, vehLen, Math.PI / 2, white);
  const fairingR = fairingHalf(r, vehLen, -Math.PI / 2, white);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: s1,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.8,
  };
}

/**
 * Atlas V — wide expendable core (no legs, no grid fins), a twin RD-180 at
 * the base (two bells side by side), a narrower Centaur upper stage with a
 * single vacuum bell, and a wide bulbous fairing wider than the core.
 */
function buildAtlasV(vehLen: number, boosterCount = 3): LauncherModel {
  const spec = getLauncherEngines('atlas-v')!;
  const cream = new THREE.MeshStandardMaterial({
    map: livery({
      base: '#efe9dc',
      wordmark: { text: 'A T L A S  V', color: '#3a4a63', size: 0.042, y: 0.6 },
      flag: 'usa',
    }),
    roughness: 0.5,
    metalness: 0.14,
    roughnessMap: stringerRoughness(60),
  });
  const body = heroWhite(0xefe9dc);
  const frame = heroMetal(0xc7c2b6, 0.32);
  const dark = heroDark(0x1e2127);
  const eng = heroMetal(0x40454d, 0.5);
  const r = vehLen * 0.06; // wider than generic
  const root = new THREE.Group();

  // ── First stage (CCB): uniform cylinder, RD-180 twin-bell at the base.
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.54, 48), cream);
  stage1.position.y = vehLen * 0.3;
  booster.add(stage1);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.56, 7, frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.55, dark));
  // RD-180 — one engine, two nozzles (data-driven pair).
  booster.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.06,
      0,
      frame,
      eng,
    ),
  );
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.82, r, vehLen * 0.04, 48),
    dark,
  );
  interstage.position.y = vehLen * 0.59;
  booster.add(interstage);
  root.add(booster);

  // AJ-60A solid strap-ons — the SRB variants (411/541/551) fly 1–5, the 401/501
  // fly none. In their OWN group (sibling of the core) so the scene jettisons them
  // at strap-on burnout — BEFORE core MECO. `boosterCount` is the real per-variant.
  const strapOnGroup = new THREE.Group();
  if (boosterCount > 0)
    strapOns(strapOnGroup, boosterCount, r, vehLen * 0.4, vehLen, heroWhite(0xe6e2d8), eng);
  root.add(strapOnGroup);

  // ── Centaur upper stage: narrower, single RL-10 vacuum bell.
  const upperStageBaseY = vehLen * 0.73;
  const upperStage = new THREE.Group();
  const centaur = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.82, r * 0.82, vehLen * 0.2, 48),
    body,
  );
  centaur.position.y = upperStageBaseY;
  upperStage.add(centaur);
  upperStage.add(
    engineCluster(
      spec.stages[2].arrangement,
      spec.stages[2].mainNozzles,
      r * 0.82,
      vehLen * 0.07,
      vehLen * 0.61,
      frame,
      eng,
    ),
  );
  root.add(upperStage);

  // ── Wide bulbous payload shroud (wider than the core) with an ogive nose —
  //    Atlas V's most recognisable feature, not a slender pointed fairing.
  const fairingBaseY = vehLen * 0.87;
  const fR = r * 1.4;
  const shH = vehLen * 0.16;
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.CylinderGeometry(fR, fR, shH, 24, 1, true, theta, Math.PI), body);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  // Shared ogive nose cap crowning the shroud.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(fR, vehLen * 0.11, 24), body);
  nose.position.y = fairingBaseY + shH / 2 + vehLen * 0.05;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, nose);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: stage1,
    upperStage,
    upperPlumeAnchor: centaur,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.85,
    strapOns: strapOnGroup,
  };
}

/**
 * Proton-K / Proton-M — Soviet/Russian heavy. Distinctive cluster: a central
 * oxidizer core with six outboard fuel tanks at the base, each carrying its
 * own engine bell. Narrower 2nd and 3rd stages taper above.
 */
function buildProtonK(vehLen: number): LauncherModel {
  const p = palette(0xdfe4dd, 0x9aaa9d); // grey-green Proton livery
  const r = vehLen * 0.065; // stout
  const root = new THREE.Group();

  // ── First stage: central oxidizer tank + 6 outboard fuel tanks with bells.
  const booster = new THREE.Group();
  const core1 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.62, r * 0.62, vehLen * 0.42, 32),
    p.body,
  );
  core1.position.y = vehLen * 0.24;
  booster.add(core1);
  // Six outboard tanks, each with an RD-253 bell.
  const nTanks = 6;
  const tankR = r * 0.28;
  const tankLen = vehLen * 0.28;
  for (let i = 0; i < nTanks; i++) {
    const a = (i / nTanks) * Math.PI * 2;
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(tankR, tankR * 1.06, tankLen, 20),
      p.accent,
    );
    tank.position.set(Math.cos(a) * r * 0.94, tankLen / 2, Math.sin(a) * r * 0.94);
    const tankBell = nozzle(tankR * 0.68, vehLen * 0.045, p.eng);
    tankBell.position.set(Math.cos(a) * r * 0.94, 0, Math.sin(a) * r * 0.94);
    booster.add(tank, tankBell);
  }
  root.add(booster);

  // ── Second stage (mid): own group so the 3-stage serial staging is visible —
  //    drops at the SECOND core staging, between stage 1 and stage 3.
  const upperStageBaseY = vehLen * 0.5;
  const midStage = new THREE.Group();
  const stage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.55, r * 0.62, vehLen * 0.22, 32),
    p.body,
  );
  stage2.position.y = upperStageBaseY + vehLen * 0.11;
  midStage.add(stage2, bell(r * 0.32, vehLen * 0.05, p.eng, upperStageBaseY));
  root.add(midStage);
  // ── Third stage: the final stage, carries the payload. Tapers above.
  const upperStage = new THREE.Group();
  const stage3 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.42, r * 0.55, vehLen * 0.14, 32),
    p.body,
  );
  stage3.position.y = vehLen * 0.79;
  upperStage.add(stage3, bell(r * 0.24, vehLen * 0.04, p.eng, vehLen * 0.72));
  root.add(upperStage);

  // ── Small fairing atop the third stage.
  const fairingBaseY = vehLen * 0.88;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.44, vehLen * 0.15, 20, 1, true, theta, Math.PI),
      p.body,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core1,
    upperStage,
    upperPlumeAnchor: stage2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.82,
    midStage,
  };
}

/**
 * Titan II GLV — Gemini's slender two-stage launcher. Uniform diameter top
 * to bottom; first stage has two gimballed engine bells side by side, second
 * stage has one. No fairing: the "fairing" slot holds a short Gemini capsule
 * cone sitting on the second stage.
 */
function buildTitanIIGLV(vehLen: number): LauncherModel {
  const p = palette(0xf5f5f2, 0x222222);
  const r = vehLen * 0.045; // slender, uniform
  const root = new THREE.Group();

  // ── First stage: uniform cylinder + two LR-87 bells.
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.54, 32), p.body);
  stage1.position.y = vehLen * 0.3;
  booster.add(stage1);
  for (const bx of [-r * 0.44, r * 0.44]) {
    const b = nozzle(r * 0.28, vehLen * 0.05, p.eng);
    b.position.set(bx, 0, 0);
    booster.add(b);
  }
  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.03, 32), p.dark);
  interstage.position.y = vehLen * 0.585;
  booster.add(interstage);
  root.add(booster);

  // ── Second stage: same diameter, single LR-91 vacuum bell.
  const upperStageBaseY = vehLen * 0.72;
  const upperStage = new THREE.Group();
  const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.24, 32), p.body);
  stage2.position.y = upperStageBaseY;
  const s2nozzle = nozzle(r * 0.45, vehLen * 0.055, p.eng);
  s2nozzle.position.y = vehLen * 0.595;
  upperStage.add(stage2, s2nozzle);
  root.add(upperStage);

  // ── Gemini capsule as the "fairing" — short truncated cone (wide base, narrow
  //    top) riding directly atop the second stage.
  const fairingBaseY = vehLen * 0.86;
  const capsuleR = r * 1.08;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(capsuleR, vehLen * 0.1, 20, 1, true, theta, Math.PI),
      p.accent,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
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
    payloadMountY: vehLen * 0.88,
  };
}

/**
 * Atlas LV-3B (Mercury-Atlas) — "stage-and-a-half" balloon tank. Wider at
 * the base skirt, three engine bells in the booster skirt (two large outboard
 * boosters + one central sustainer), small Mercury capsule + escape tower on
 * top as the fairing.
 */
function buildAtlasLV3B(vehLen: number): LauncherModel {
  const p = palette(0xf0f2ef, 0xc0bfba);
  // Balloon tank tapers slightly: wider at base, same radius through most of body.
  const rBase = vehLen * 0.058;
  const rTop = vehLen * 0.052;
  const root = new THREE.Group();

  // ── Booster skirt + balloon tank. No staging — the skirt drops at ~119 s
  //    (booster-engine cutoff), the sustainer keeps burning. Model the whole
  //    first-stage body as the `booster` group for drop choreography.
  const booster = new THREE.Group();
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBase, vehLen * 0.72, 36), p.body);
  tank.position.y = vehLen * 0.4;
  // Distinctive flared booster skirt at the very base — noticeably wider than
  //    the balloon tank, the Atlas silhouette's signature.
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(rBase * 1.12, rBase * 1.5, vehLen * 0.09, 36),
    p.dark,
  );
  skirt.position.y = vehLen * 0.045;
  booster.add(tank, skirt);
  // Two large outboard booster bells (spread to the skirt edge) + a central
  //    sustainer between them.
  for (const bx of [-rBase * 1.0, rBase * 1.0]) {
    const b = nozzle(rBase * 0.38, vehLen * 0.07, p.eng);
    b.position.set(bx, -vehLen * 0.005, 0);
    booster.add(b);
  }
  const sustainer = nozzle(rBase * 0.24, vehLen * 0.05, p.eng);
  booster.add(sustainer);
  root.add(booster);

  // ── No true upper stage; sustainer keeps the tank group flying. Use a minimal
  //    invisible group so the LauncherModel shape stays complete.
  const upperStageBaseY = vehLen * 0.78;
  const upperStage = new THREE.Group();
  const sustainerBody = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rTop, vehLen * 0.01, 8),
    p.body,
  );
  sustainerBody.position.y = upperStageBaseY;
  upperStage.add(sustainerBody);
  root.add(upperStage);

  // ── Mercury capsule as the "fairing". Short truncated cone (bell-shape) +
  //    thin escape tower spike above it (mirrors Saturn V escape tower).
  const fairingBaseY = vehLen * 0.81;
  const capR = rTop * 1.4;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(capR, vehLen * 0.14, 20, 1, true, theta, Math.PI),
      p.accent,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  // Escape tower: thin tall cylinder rising above the capsule nose.
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop * 0.05, rTop * 0.05, vehLen * 0.12, 8),
    p.dark,
  );
  tower.position.y = fairingBaseY + vehLen * 0.115;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, tower);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: tank,
    upperStage,
    upperPlumeAnchor: sustainerBody,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.83,
  };
}

/**
 * Long March 2F — Chinese crewed launcher (Shenzhou). Central core + four
 * tapered liquid strap-ons + launch-escape tower with capsule above the fairing.
 */
function buildLongMarch2F(vehLen: number): LauncherModel {
  const p = palette(0xf0f2f4, 0xc8ccd2); // pale grey/white
  const r = vehLen * 0.052;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.52, 32), p.body);
  core.position.y = vehLen * 0.29;
  booster.add(core, nozzle(r * 0.48, vehLen * 0.05, p.eng));
  root.add(booster);
  // Four liquid strap-ons in their OWN group (not glued to the core) so the scene
  // jettisons them at strap-on burnout, before core staging.
  const strapOnGroup = new THREE.Group();
  strapOns(strapOnGroup, 4, r, vehLen * 0.32, vehLen, p.accent, p.eng);
  root.add(strapOnGroup);

  const upperStageBaseY = vehLen * 0.66;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r, vehLen * 0.18, 32), p.body);
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.38, vehLen * 0.05, p.eng, vehLen * 0.56));
  root.add(upperStage);

  // Capsule half-shells (Shenzhou) + escape tower above — mirrors Saturn V idiom.
  const fairingBaseY = vehLen * 0.86;
  const capsuleR = r * 1.06;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(capsuleR, vehLen * 0.1, 20, 1, true, theta, Math.PI),
      p.accent,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  // Spiky escape tower rising above the capsule nose.
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.04, r * 0.04, vehLen * 0.09, 8),
    p.dark,
  );
  tower.position.y = fairingBaseY + vehLen * 0.1;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, tower);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.84,
    strapOns: strapOnGroup,
  };
}

/**
 * Long March 3B — Chinese GTO launcher (Chang'e). Central core + four liquid
 * strap-ons + standard payload fairing (bulbous ogive shroud, no escape tower).
 */
function buildLongMarch3B(vehLen: number): LauncherModel {
  const p = palette(0xeef1f5, 0xc4c8d0);
  const r = vehLen * 0.05;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.5, 32), p.body);
  core.position.y = vehLen * 0.28;
  booster.add(core, nozzle(r * 0.46, vehLen * 0.05, p.eng));
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.88, r, vehLen * 0.03, 32),
    p.dark,
  );
  interstage.position.y = vehLen * 0.545;
  booster.add(interstage);
  root.add(booster);
  // Four liquid strap-ons in their OWN group — jettison at strap-on burnout.
  const strapOnGroup = new THREE.Group();
  strapOns(strapOnGroup, 4, r, vehLen * 0.3, vehLen, p.accent, p.eng);
  root.add(strapOnGroup);

  const upperStageBaseY = vehLen * 0.68;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.88, r * 0.88, vehLen * 0.22, 32),
    p.body,
  );
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.34, vehLen * 0.05, p.eng, vehLen * 0.565));
  root.add(upperStage);

  // Bulbous cylindrical shroud + ogive nose cap (wider-than-core, LM-3B style).
  const fairingBaseY = vehLen * 0.845;
  const fR = r * 1.3;
  const shH = vehLen * 0.14;
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.CylinderGeometry(fR, fR, shH, 24, 1, true, theta, Math.PI), p.body);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(fR, vehLen * 0.1, 24), p.body);
  nose.position.y = fairingBaseY + shH / 2 + vehLen * 0.05;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, nose);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.86,
    strapOns: strapOnGroup,
  };
}

/**
 * Long March 5 ("Fat Five") — Chinese heavy-lift. Notably fat cryogenic core +
 * four LARGE liquid strap-on boosters reaching ~60% of core height + wide
 * bulbous fairing.
 */
function buildLongMarch5(vehLen: number): LauncherModel {
  const p = palette(0xedf2f7, 0xbcc4ce); // pale, hint of cryo blue-white
  const r = vehLen * 0.07; // stout fat core
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.52, 36), p.body);
  core.position.y = vehLen * 0.3;
  booster.add(core);
  // Two YF-77 bells at the base (twin-engine cryogenic core stage).
  for (const bx of [-r * 0.42, r * 0.42]) {
    const b = nozzle(r * 0.3, vehLen * 0.055, p.eng);
    b.position.set(bx, 0, 0);
    booster.add(b);
  }
  // Four large strap-ons — in their OWN group so the scene jettisons them at
  // strap-on burnout (before core staging), not glued to the fat core.
  const strapOnGroup = new THREE.Group();
  const soLen = vehLen * 0.36;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const gr = new THREE.Group();
    const sbody = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.44, r * 0.6, soLen, 24),
      p.accent,
    );
    sbody.position.y = soLen / 2;
    const snose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.44, soLen * 0.3, 24), p.accent);
    snose.position.y = soLen + soLen * 0.15;
    gr.add(sbody, snose, nozzle(r * 0.3, vehLen * 0.05, p.eng));
    gr.position.set(Math.cos(a) * r * 1.3, 0, Math.sin(a) * r * 1.3);
    strapOnGroup.add(gr);
  }
  root.add(strapOnGroup);
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.8, r, vehLen * 0.035, 36),
    p.dark,
  );
  interstage.position.y = vehLen * 0.565;
  booster.add(interstage);
  root.add(booster);

  const upperStageBaseY = vehLen * 0.69;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r * 0.8, vehLen * 0.2, 36), p.body);
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.38, vehLen * 0.06, p.eng, vehLen * 0.58));
  root.add(upperStage);

  // Wide bulbous fairing — the "Fat Five" has a notably wide 5.2 m shroud.
  const fairingBaseY = vehLen * 0.845;
  const fR = r * 1.45;
  const shH = vehLen * 0.17;
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.CylinderGeometry(fR, fR, shH, 24, 1, true, theta, Math.PI), p.body);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(fR, vehLen * 0.12, 24), p.body);
  nose.position.y = fairingBaseY + shH / 2 + vehLen * 0.06;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, nose);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.87,
    strapOns: strapOnGroup,
  };
}

/**
 * PSLV — Indian Polar Satellite Launch Vehicle. Slender core with SIX solid
 * strap-on boosters at the base (its signature), slim 4-stage stack, small fairing.
 */
function buildPSLV(vehLen: number): LauncherModel {
  const p = palette(0xf2f0ec, 0xd4c8a8); // warm off-white / khaki accent
  const r = vehLen * 0.046; // slender
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.48, 32), p.body);
  core.position.y = vehLen * 0.27;
  booster.add(core, nozzle(r * 0.44, vehLen * 0.05, p.eng));
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.84, r, vehLen * 0.025, 32),
    p.dark,
  );
  interstage.position.y = vehLen * 0.525;
  booster.add(interstage);
  root.add(booster);
  // Six PSOM solid strap-ons in their OWN group — jettison at strap-on burnout.
  const strapOnGroup = new THREE.Group();
  strapOns(strapOnGroup, 6, r, vehLen * 0.22, vehLen, p.accent, p.eng);
  root.add(strapOnGroup);

  // PS2 / PS3 / PS4 stacked above as upper stage (slimmer).
  const upperStageBaseY = vehLen * 0.65;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.84, r * 0.84, vehLen * 0.24, 32),
    p.body,
  );
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.32, vehLen * 0.045, p.eng, vehLen * 0.525));
  root.add(upperStage);

  // Small ogive fairing atop the slim upper stage.
  const fairingBaseY = vehLen * 0.84;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.96, vehLen * 0.16, 20, 1, true, theta, Math.PI),
      p.body,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.79,
    strapOns: strapOnGroup,
  };
}

/**
 * LVM3 (GSLV Mk III) — Indian heavy. A cryogenic core flanked by two very
 * large S200 solid boosters — fat, nearly as tall as the core, one each side.
 * Squat, powerful silhouette.
 */
function buildLVM3(vehLen: number): LauncherModel {
  const p = palette(0xeff2f5, 0xc0baba);
  const r = vehLen * 0.052;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.52, 32), p.body);
  core.position.y = vehLen * 0.3;
  booster.add(core, nozzle(r * 0.44, vehLen * 0.05, p.eng));
  root.add(booster);

  // Two large S200 solid boosters — fat (r*0.72) and nearly as tall as the core.
  const strapOnGroup = new THREE.Group();
  const s200Len = vehLen * 0.46;
  for (const sx of [-1, 1]) {
    const gr = new THREE.Group();
    const sbody = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.72, r * 0.72, s200Len, 24),
      p.accent,
    );
    sbody.position.y = s200Len / 2 + vehLen * 0.02;
    const snose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, vehLen * 0.1, 24), p.accent);
    snose.position.y = s200Len + vehLen * 0.07;
    gr.add(sbody, snose, nozzle(r * 0.5, vehLen * 0.05, p.eng));
    gr.position.set(sx * r * 1.74, 0, 0);
    strapOnGroup.add(gr);
  }
  root.add(strapOnGroup);

  const upperStageBaseY = vehLen * 0.67;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, vehLen * 0.18, 32), p.body);
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.36, vehLen * 0.055, p.eng, vehLen * 0.575));
  root.add(upperStage);

  const fairingBaseY = vehLen * 0.84;
  const fR = r * 1.2;
  const shH = vehLen * 0.12;
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.CylinderGeometry(fR, fR, shH, 24, 1, true, theta, Math.PI), p.body);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(fR, vehLen * 0.09, 24), p.body);
  nose.position.y = fairingBaseY + shH / 2 + vehLen * 0.045;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, nose);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.85,
    strapOns: strapOnGroup,
  };
}

/**
 * M-V — Japanese all-solid 3-stage. Blunt, stubby, tapering three-segment
 * stack, no strap-ons, single bell per stage, olive/dark body.
 */
function buildMV(vehLen: number): LauncherModel {
  const p = palette(0x5a6040, 0x7a8060); // olive dark
  const r = vehLen * 0.058; // stubby
  const root = new THREE.Group();

  // First stage — wide solid segment with a single bell.
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.4, 32), p.body);
  stage1.position.y = vehLen * 0.23;
  booster.add(stage1, nozzle(r * 0.52, vehLen * 0.06, p.eng));
  const interstage1 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.78, r, vehLen * 0.03, 32),
    p.dark,
  );
  interstage1.position.y = vehLen * 0.445;
  booster.add(interstage1);
  root.add(booster);

  // Second + third stages stacked above, tapering to slim nose.
  const upperStageBaseY = vehLen * 0.54;
  const upperStage = new THREE.Group();
  const stage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.78, r * 0.78, vehLen * 0.24, 32),
    p.body,
  );
  stage2.position.y = upperStageBaseY;
  const stage3 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.54, r * 0.78, vehLen * 0.14, 32),
    p.body,
  );
  stage3.position.y = vehLen * 0.78;
  upperStage.add(
    stage2,
    bell(r * 0.42, vehLen * 0.05, p.eng, vehLen * 0.46),
    stage3,
    bell(r * 0.28, vehLen * 0.04, p.eng, vehLen * 0.7),
  );
  root.add(upperStage);

  // Small blunt nose fairing.
  const fairingBaseY = vehLen * 0.875;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.56, vehLen * 0.125, 20, 1, true, theta, Math.PI),
      p.accent,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
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
    payloadMountY: vehLen * 0.82,
  };
}

/**
 * H3 — Japanese cryogenic launcher. Slender core + two (or four) solid strap-on
 * boosters at the base, slim upper stage, bulbous fairing. Warm tan lower core.
 */
function buildH3(vehLen: number): LauncherModel {
  const p = palette(0xd98a4a, 0xe8e0d5); // orange-tan core hint
  const r = vehLen * 0.048;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.54, 32), p.body);
  core.position.y = vehLen * 0.3;
  booster.add(core);
  // LE-9 engines — two bells side by side.
  for (const bx of [-r * 0.4, r * 0.4]) {
    const b = nozzle(r * 0.28, vehLen * 0.055, p.eng);
    b.position.set(bx, 0, 0);
    booster.add(b);
  }
  // Two SRB-3 solid strap-ons flanking the base (standard H3-22 config).
  const strapOnGroup = new THREE.Group();
  const srbLen = vehLen * 0.3;
  for (const sx of [-1, 1]) {
    const gr = new THREE.Group();
    const sbody = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.5, r * 0.5, srbLen, 20),
      p.accent,
    );
    sbody.position.y = srbLen / 2 + vehLen * 0.015;
    const snose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, vehLen * 0.07, 20), p.accent);
    snose.position.y = srbLen + vehLen * 0.05;
    gr.add(sbody, snose, nozzle(r * 0.3, vehLen * 0.04, p.eng));
    gr.position.set(sx * r * 1.52, 0, 0);
    strapOnGroup.add(gr);
  }
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.86, r, vehLen * 0.03, 32),
    p.dark,
  );
  interstage.position.y = vehLen * 0.575;
  booster.add(interstage);
  root.add(booster);
  root.add(strapOnGroup);

  const upperStageBaseY = vehLen * 0.715;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.86, r * 0.86, vehLen * 0.19, 32),
    p.body,
  );
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.36, vehLen * 0.05, p.eng, vehLen * 0.6));
  root.add(upperStage);

  // Bulbous 5.4 m-class fairing — wider than the core.
  const fairingBaseY = vehLen * 0.865;
  const fR = r * 1.35;
  const shH = vehLen * 0.14;
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.CylinderGeometry(fR, fR, shH, 24, 1, true, theta, Math.PI), p.body);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const nose = new THREE.Mesh(new THREE.ConeGeometry(fR, vehLen * 0.1, 24), p.body);
  nose.position.y = fairingBaseY + shH / 2 + vehLen * 0.05;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, nose);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: core,
    upperStage,
    upperPlumeAnchor: s2,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.87,
    strapOns: strapOnGroup,
  };
}

/**
 * Ariane 1 — European 1979 three-stage stack. Clean, slender, no strap-ons,
 * single first-stage bell, tapering toward the top. White body.
 */
function buildAriane1(vehLen: number): LauncherModel {
  const p = palette(0xf6f6f4, 0x222228); // plain white, dark accent
  const r = vehLen * 0.05;
  const root = new THREE.Group();

  // First stage (L140): uniform cylinder, single Viking bell.
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.44, 32), p.body);
  stage1.position.y = vehLen * 0.25;
  booster.add(stage1, nozzle(r * 0.46, vehLen * 0.055, p.eng));
  const is1 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r, vehLen * 0.025, 32), p.dark);
  is1.position.y = vehLen * 0.485;
  booster.add(is1);
  root.add(booster);

  // Second (L33) + third (H8) stages — progressively slimmer.
  const upperStageBaseY = vehLen * 0.625;
  const upperStage = new THREE.Group();
  const stage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.88, r * 0.88, vehLen * 0.2, 32),
    p.body,
  );
  stage2.position.y = upperStageBaseY;
  const stage3 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.65, r * 0.88, vehLen * 0.12, 32),
    p.body,
  );
  stage3.position.y = vehLen * 0.785;
  upperStage.add(
    stage2,
    bell(r * 0.36, vehLen * 0.05, p.eng, vehLen * 0.515),
    stage3,
    bell(r * 0.26, vehLen * 0.04, p.eng, vehLen * 0.72),
  );
  root.add(upperStage);

  // Small slim conical fairing — the minimalist 1979 look.
  const fairingBaseY = vehLen * 0.875;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.66, vehLen * 0.13, 20, 1, true, theta, Math.PI),
      p.body,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
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
    payloadMountY: vehLen * 0.82,
  };
}

/** Dispatch table — a dedicated silhouette per launcher; the rest fall back generic. */
const BUILDERS: Record<string, (vehLen: number, boosterCount?: number) => LauncherModel> = {
  'falcon-9': buildFalcon9,
  'saturn-v': buildSaturnV,
  'saturn-ib': buildSaturnV,
  'vostok-k': buildSoyuz,
  'voskhod-11a57': buildSoyuz,
  soyuz: buildSoyuz,
  'atlas-v': buildAtlasV,
  'proton-k': buildProtonK,
  'titan-ii-glv': buildTitanIIGLV,
  'atlas-lv-3b': buildAtlasLV3B,
  'ariane-5': (v) =>
    buildSideBooster(v, { boosterLen: 0.62, fairingR: 1.35, body: 0xeae6da, boost: 0xd8d2c4 }),
  'h-iia': (v) =>
    buildSideBooster(v, { boosterLen: 0.38, fairingR: 1.15, body: 0xf0f0f0, boost: 0xdedede }),
  'space-shuttle-stack': buildSpaceShuttle,
  'long-march-2f': buildLongMarch2F,
  'long-march-3b': buildLongMarch3B,
  'long-march-5': buildLongMarch5,
  pslv: buildPSLV,
  lvm3: buildLVM3,
  'm-v': buildMV,
  h3: buildH3,
  'ariane-1': buildAriane1,
};

/**
 * The 3D model for a launcher id (its dedicated silhouette if one exists, else
 * the generic body). `vehLen` scales the whole rocket.
 */
export function buildLauncherModel(
  launcherId: string | undefined,
  vehLen: number,
  boosterCount = 0,
): LauncherModel {
  const build = launcherId ? BUILDERS[launcherId] : undefined;
  // Both the dedicated silhouettes and the generic body receive the profile's real
  // per-variant `boosterCount`, so strap-on vehicles draw their strap-ons into a
  // separable group and the scene jettisons them at strap-on burnout (Atlas V's
  // variable 1–5 AJ-60As; 0 = a boosterless variant). Builders that ignore the arg
  // model a fixed cluster (e.g. Soyuz's 4).
  return build ? build(vehLen, boosterCount) : buildGeneric(vehLen, boosterCount);
}
