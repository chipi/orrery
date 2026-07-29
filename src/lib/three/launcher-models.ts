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
  detailBell,
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

/**
 * Saturn IB — the Apollo LEO workhorse (Apollo 7, Skylab ferries, ASTP). A
 * two-stage stack: the clustered S-IB first stage (eight H-1 engines in an
 * octagon, its tanks built from Redstone/Jupiter bodies giving a banded look)
 * and the same S-IVB as Saturn V's third stage, capped by the Apollo CSM.
 */
function buildSaturnIB(vehLen: number): LauncherModel {
  const spec = getLauncherEngines('saturn-ib')!;
  const pal = agencyPalette('NASA');
  const r = vehLen * 0.05;
  const root = new THREE.Group();
  const livMat = new THREE.MeshStandardMaterial({
    map: livery({
      rollPattern: true,
      wordmark: { text: 'U S A', color: '#14161b', size: 0.08, y: 0.66 },
      flag: 'usa',
    }),
    roughness: 0.5,
    metalness: 0.15,
    roughnessMap: stringerRoughness(70),
  });

  // ── S-IB first stage: clustered-tank body + 8 H-1 in an octagon.
  const booster = new THREE.Group();
  const sib = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.44, 56), livMat);
  sib.position.y = vehLen * 0.24;
  booster.add(sib);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.45, 9, pal.frame)); // banded cluster tanks
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.44, pal.dark));
  const skirt = new THREE.Mesh(
    new THREE.CylinderGeometry(r, r * 1.05, vehLen * 0.05, 56),
    pal.dark,
  );
  skirt.position.y = vehLen * 0.03;
  booster.add(skirt);
  booster.add(
    engineCluster(
      spec.stages[0].arrangement,
      spec.stages[0].mainNozzles,
      r,
      vehLen * 0.06,
      0,
      pal.frame,
      pal.eng,
    ),
  );
  // 8 aft fins.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    booster.add(sweptFin(r * 1.02, vehLen * 0.08, vehLen * 0.07, r * 0.5, a, pal.dark));
  }
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.86, r, vehLen * 0.05, 56),
    pal.dark,
  );
  interstage.position.y = vehLen * 0.485;
  booster.add(interstage);
  root.add(booster);

  // ── S-IVB upper stage + single J-2.
  const upperStageBaseY = vehLen * 0.63;
  const upperStage = new THREE.Group();
  const s4b = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.86, r * 0.86, vehLen * 0.24, 56),
    pal.body,
  );
  s4b.position.y = upperStageBaseY;
  upperStage.add(s4b);
  upperStage.add(ringFrames(r * 0.86, vehLen * 0.52, vehLen * 0.74, 5, pal.frame));
  const foilBand = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.87, r * 0.87, vehLen * 0.03, 48),
    heroGold(0xcaa658),
  );
  foilBand.position.y = vehLen * 0.53;
  upperStage.add(foilBand);
  upperStage.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r * 0.86,
      vehLen * 0.055,
      vehLen * 0.51,
      pal.frame,
      pal.eng,
    ),
  );
  root.add(upperStage);

  // ── Apollo CSM + LES as the "fairing".
  const fairingBaseY = vehLen * 0.78;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.86, vehLen * 0.09, 24, 1, true, theta, Math.PI),
      pal.body,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const sm = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.42, r * 0.42, vehLen * 0.06, 40),
    pal.frame,
  );
  sm.position.y = vehLen * 0.87;
  const cm = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.2, r * 0.42, vehLen * 0.05, 40),
    pal.body,
  );
  cm.position.y = vehLen * 0.925;
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.03, r * 0.03, vehLen * 0.1, 10),
    pal.dark,
  );
  tower.position.y = vehLen * 1.0;
  const esc = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.09, r * 0.11, vehLen * 0.05, 20),
    heroDark(0x2a2622),
  );
  esc.position.y = vehLen * 1.06;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, sm, cm, tower, esc);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: sib,
    upperStage,
    upperPlumeAnchor: s4b,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.78,
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
  // Roscosmos grey-white R-7 livery + Russian flag. Shared by soyuz / vostok-k /
  // voskhod-11a57 — the visible R-7 first stage is identical across them.
  const body = new THREE.MeshStandardMaterial({
    map: livery({ base: '#dfe4ea', flag: 'rus' }),
    roughness: 0.52,
    metalness: 0.14,
    roughnessMap: stringerRoughness(50),
  });
  const plain = heroWhite(0xdfe4ea);
  const frame = heroMetal(0xaab0b8, 0.3);
  const eng = heroMetal(0x3a3f47, 0.5);
  const r = vehLen * 0.05;
  const root = new THREE.Group();

  // RD-108 core: 4 main chambers (quad) + 4 verniers at the base.
  const rd = (
    g: THREE.Group,
    stageR: number,
    bellR: number,
    mains: number,
    verniers: number,
  ): void => {
    const hs = new THREE.Mesh(
      new THREE.CylinderGeometry(stageR * 0.98, stageR * 0.9, vehLen * 0.01, 24),
      heroDark(0x24262b),
    );
    g.add(hs);
    for (let i = 0; i < mains; i++) {
      const a = (i / mains) * Math.PI * 2 + Math.PI / 4;
      const e = detailBell(bellR, vehLen * 0.05, frame, eng);
      e.position.set(Math.cos(a) * stageR * 0.5, 0, Math.sin(a) * stageR * 0.5);
      g.add(e);
    }
    for (let i = 0; i < verniers; i++) {
      const a = (i / verniers) * Math.PI * 2;
      const v = nozzle(bellR * 0.34, vehLen * 0.03, eng);
      v.position.set(Math.cos(a) * stageR * 0.85, vehLen * 0.005, Math.sin(a) * stageR * 0.85);
      g.add(v);
    }
  };

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.5, 48), body);
  core.position.y = vehLen * 0.28;
  booster.add(core);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.5, 5, frame));
  const coreEng = new THREE.Group();
  coreEng.position.y = vehLen * 0.03;
  rd(coreEng, r, r * 0.2, 4, 4); // RD-108
  booster.add(coreEng);
  root.add(booster);

  // The four R-7 strap-ons (Blok B–D): tapered cones, each an RD-107 = 4 mains +
  // 2 verniers. Jettison at the "Korolev cross" (~118 s), before core burnout.
  const strapOnGroup = new THREE.Group();
  const soLen = vehLen * 0.36;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const gr = new THREE.Group();
    const sb = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.42, r * 0.56, soLen, 32), plain);
    sb.position.y = soLen / 2;
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, soLen * 0.42, 32), plain);
    sn.position.y = soLen + soLen * 0.2;
    gr.add(sb, sn);
    const se = new THREE.Group();
    rd(se, r * 0.56, r * 0.15, 4, 2); // RD-107
    gr.add(se);
    gr.position.set(Math.cos(a) * r * 1.28, 0, Math.sin(a) * r * 1.28);
    strapOnGroup.add(gr);
  }
  root.add(strapOnGroup);

  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, vehLen * 0.2, 48), plain);
  s2.position.y = vehLen * 0.64;
  upperStage.add(s2);
  // Blok-I engine: RD-0110/0107 = 4 main chambers + 4 verniers (soyuz/voskhod);
  // vostok-k's RD-0109 is single, but the shared quad reads correct for the pair.
  const upperEng = new THREE.Group();
  upperEng.position.y = vehLen * 0.54;
  rd(upperEng, r * 0.9, r * 0.16, 4, 4);
  upperStage.add(upperEng);
  root.add(upperStage);

  const fairingBaseY = vehLen * 0.82;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.95, vehLen * 0.18, 20, 1, true, theta, Math.PI),
      plain,
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
  opts: {
    boosterLen: number;
    fairingR: number;
    body: number;
    boost: number;
    base: string;
    boostHex: string;
    flag: 'esa' | 'jpn';
    stack?: string[];
  },
): LauncherModel {
  const bodyMat = new THREE.MeshStandardMaterial({
    map: livery({
      base: opts.base,
      stack: opts.stack ? { chars: opts.stack, color: '#c1121f', size: 0.05, y: 0.34 } : undefined,
      flag: opts.flag,
    }),
    roughness: 0.5,
    metalness: 0.14,
    roughnessMap: stringerRoughness(50),
  });
  const boostMat = heroWhite(Number(`0x${opts.boostHex}`));
  const frame = heroMetal(0xc4c8ce, 0.3);
  const dark = heroDark(0x1c1f24);
  const eng = heroMetal(0x40454d, 0.5);
  const r = vehLen * 0.045;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.6, 48), bodyMat);
  core.position.y = vehLen * 0.33;
  booster.add(core);
  booster.add(ringFrames(r, vehLen * 0.06, vehLen * 0.62, 7, frame));
  booster.add(raceway(r, vehLen * 0.07, vehLen * 0.6, dark));
  booster.add(detailBell(r * 0.42, vehLen * 0.055, frame, eng)); // single core engine
  root.add(booster);
  // The two solid boosters jettison well before the core (EAP ~140 s, SRB-A
  // similar) — their own group so the scene drops them at booster-sep.
  const strapOnGroup = new THREE.Group();
  for (const sx of [-1, 1]) {
    const gr = new THREE.Group();
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.55, r * 0.55, vehLen * opts.boosterLen, 28),
      boostMat,
    );
    b.position.y = (vehLen * opts.boosterLen) / 2 + vehLen * 0.02;
    const nose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, vehLen * 0.09, 28), boostMat);
    nose.position.y = vehLen * opts.boosterLen + vehLen * 0.07;
    gr.add(b, nose, detailBell(r * 0.34, vehLen * 0.045, frame, eng));
    gr.position.set(sx * r * 1.5, 0, 0);
    strapOnGroup.add(gr);
  }
  root.add(strapOnGroup);

  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r, vehLen * 0.16, 48), boostMat);
  s2.position.y = vehLen * 0.71;
  upperStage.add(s2, bell(r * 0.35, vehLen * 0.05, eng, vehLen * 0.62));
  root.add(upperStage);

  // Bulbous ogive bullet shroud (lathe) + boat-tail.
  const fairingBaseY = vehLen * 0.81;
  const fR = r * opts.fairingR;
  const shH = vehLen * 0.32;
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(fR, 0),
    new THREE.Vector2(fR, shH * 0.44),
    new THREE.Vector2(fR * 0.92, shH * 0.64),
    new THREE.Vector2(fR * 0.64, shH * 0.83),
    new THREE.Vector2(fR * 0.28, shH * 0.96),
    new THREE.Vector2(0, shH * 1.03),
  ];
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.LatheGeometry(prof, 40, theta, Math.PI), boostMat);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const boatTail = new THREE.Mesh(
    new THREE.CylinderGeometry(fR, r * 0.95, vehLen * 0.05, 40, 1, true),
    boostMat,
  );
  boatTail.position.y = fairingBaseY - vehLen * 0.025;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, boatTail);
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
  const white = heroWhite(0xeef0f3);
  const tank = new THREE.MeshStandardMaterial({
    color: 0xbf6a2c,
    roughness: 0.95,
    metalness: 0.02,
    roughnessMap: stringerRoughness(60), // sprayed-on foam texture
  });
  const tile = heroDark(0x17191e); // TPS black
  const metal = heroMetal(0xc4c9cf, 0.32);
  const eng = heroMetal(0x33373e, 0.5);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x0a0e16,
    metalness: 0.9,
    roughness: 0.12,
  });
  const r = vehLen * 0.05;
  const root = new THREE.Group();

  // ── External Tank — ribbed foam spine, ogive nose + tip, intertank band, and
  //    the LO2 feedline + cable tray running down the +X face. (in `booster`.)
  const booster = new THREE.Group();
  const rET = r * 1.15;
  const etLen = vehLen * 0.74;
  const etY = vehLen * 0.05;
  const et = new THREE.Mesh(new THREE.CylinderGeometry(rET * 0.97, rET, etLen, 40), tank);
  et.position.y = etY + etLen / 2;
  // Ogive LOX-tank nose (tapered) + a metal tip.
  const etNose = new THREE.Mesh(
    new THREE.SphereGeometry(rET, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    tank,
  );
  etNose.scale.y = 1.7;
  etNose.position.y = etY + etLen;
  const etTip = new THREE.Mesh(new THREE.ConeGeometry(rET * 0.12, vehLen * 0.04, 12), metal);
  etTip.position.y = etY + etLen + rET * 1.7;
  // Intertank band (ribbed metal ring between LOX + LH2 tanks).
  const intertank = new THREE.Mesh(
    new THREE.CylinderGeometry(rET * 1.01, rET * 1.01, vehLen * 0.06, 40),
    tank,
  );
  intertank.position.y = etY + etLen * 0.62;
  booster.add(et, etNose, etTip, intertank);
  booster.add(ringFrames(rET, etY + etLen * 0.58, etY + etLen * 0.66, 4, heroDark(0x8a5a30)));
  // LO2 feedline + cable tray down the tank face toward the orbiter (+Z).
  const feed = new THREE.Mesh(new THREE.CapsuleGeometry(rET * 0.1, etLen * 0.8, 6, 12), metal);
  feed.position.set(rET * 0.5, etY + etLen * 0.5, rET * 0.78);
  const tray = new THREE.Mesh(
    new THREE.BoxGeometry(rET * 0.14, etLen * 0.82, rET * 0.08),
    heroDark(0x7a4d28),
  );
  tray.position.set(-rET * 0.55, etY + etLen * 0.5, rET * 0.74);
  booster.add(feed, tray);
  root.add(booster);

  // ── Two SRBs flanking the tank (±X): segmented case, flared aft skirt, forward
  //    nose cap + frustum + separation-motor cluster, canted gimbal nozzle. They
  //    jettison at ~124 s (before ET MECO) — own group for booster-sep.
  const strapOnGroup = new THREE.Group();
  const rSRB = r * 0.6;
  const srbLen = vehLen * 0.64;
  for (const sx of [-1, 1]) {
    const srb = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(rSRB, rSRB, srbLen, 32), white);
    body.position.y = etY + srbLen / 2;
    // Forward frustum + ogive nose cap (holds the separation motors + chute).
    const frustum = new THREE.Mesh(
      new THREE.CylinderGeometry(rSRB * 0.62, rSRB, vehLen * 0.05, 32),
      white,
    );
    frustum.position.y = etY + srbLen + vehLen * 0.025;
    const noseCap = new THREE.Mesh(new THREE.ConeGeometry(rSRB * 0.62, vehLen * 0.09, 32), white);
    noseCap.position.y = etY + srbLen + vehLen * 0.095;
    // Segment field-joint rings (the SRB's signature banding).
    srb.add(body, frustum, noseCap);
    for (const f of [0.22, 0.42, 0.62, 0.82]) {
      const joint = new THREE.Mesh(new THREE.TorusGeometry(rSRB * 1.01, rSRB * 0.03, 8, 32), metal);
      joint.rotation.x = Math.PI / 2;
      joint.position.y = etY + srbLen * f;
      srb.add(joint);
    }
    // Flared aft skirt + a canted gimbal nozzle.
    const skirt = new THREE.Mesh(
      new THREE.CylinderGeometry(rSRB, rSRB * 1.24, vehLen * 0.08, 32),
      white,
    );
    skirt.position.y = etY + vehLen * 0.02;
    srb.add(skirt);
    const noz = detailBell(rSRB * 0.66, vehLen * 0.06, metal, eng);
    noz.position.y = etY - vehLen * 0.02;
    srb.add(noz);
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
  // Forward fuselage — a BLUNT, rounded ogive (the orbiter nose is rounded, not a
  // sharp cone), lathe-turned so it curves to a small rounded tip. White body
  // with the black RCC cap only at the very tip + chin.
  const noseLen = vehLen * 0.15;
  const nprof: THREE.Vector2[] = [
    new THREE.Vector2(rFus * 0.82, 0),
    new THREE.Vector2(rFus * 0.8, noseLen * 0.22),
    new THREE.Vector2(rFus * 0.72, noseLen * 0.44),
    new THREE.Vector2(rFus * 0.58, noseLen * 0.64),
    new THREE.Vector2(rFus * 0.4, noseLen * 0.82),
    new THREE.Vector2(rFus * 0.22, noseLen * 0.94),
    new THREE.Vector2(rFus * 0.09, noseLen), // blunt rounded tip, not a point
  ];
  const nose = new THREE.Mesh(new THREE.LatheGeometry(nprof, 28), white);
  nose.scale.set(1.45, 1, 0.78);
  nose.position.set(0, yNoseBase, oz);
  // Black RCC nose cap over the rounded tip.
  const noseCap = new THREE.Mesh(
    new THREE.SphereGeometry(rFus * 0.24, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    tile,
  );
  noseCap.scale.set(1.45, 1.1, 0.78);
  noseCap.position.set(0, yNoseBase + noseLen * 0.82, oz);
  // Cockpit — the wraparound windshield: a row of individual glass panes set into
  //    a black frame on the forward-upper fuselage (outboard +Z), so the crew
  //    cabin reads as windows, not a black smudge.
  const windows = new THREE.Group();
  const winY = yNoseBase + noseLen * 0.42;
  const frame = new THREE.Mesh(
    new THREE.CylinderGeometry(
      rFus * 0.73,
      rFus * 0.8,
      vehLen * 0.05,
      28,
      1,
      true,
      Math.PI * 0.24,
      Math.PI * 0.52,
    ),
    tile,
  );
  frame.scale.set(1.45, 1, 0.78);
  frame.position.set(0, winY, oz);
  windows.add(frame);
  // Six forward panes across the windshield arc.
  for (let i = 0; i < 6; i++) {
    const a = Math.PI * 0.29 + (i / 5) * Math.PI * 0.42;
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(rFus * 0.16, vehLen * 0.03, rFus * 0.04),
      glass,
    );
    pane.position.set(
      Math.cos(a) * rFus * 0.82 * 1.45,
      winY,
      oz + Math.sin(a) * rFus * 0.82 * 0.78,
    );
    pane.lookAt(pane.position.x * 1.6, winY, oz + (pane.position.z - oz) * 1.6);
    windows.add(pane);
  }

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

  // OMS/RCS pods — two bumps flanking the tail base, each with a small black
  //    OMS nozzle poking aft.
  const oms = new THREE.Group();
  for (const sx of [-1, 1]) {
    const pod = new THREE.Mesh(new THREE.CapsuleGeometry(rFus * 0.24, vehLen * 0.05, 6, 10), white);
    pod.rotation.x = Math.PI / 2;
    pod.position.set(sx * rFus * 0.6, yA + vehLen * 0.05, oz + rFus * 0.28);
    const omsNoz = new THREE.Mesh(
      new THREE.CylinderGeometry(rFus * 0.09, rFus * 0.12, vehLen * 0.03, 12),
      tile,
    );
    omsNoz.rotation.x = Math.PI;
    omsNoz.position.set(sx * rFus * 0.6, yA + vehLen * 0.02, oz + rFus * 0.02);
    oms.add(pod, omsNoz);
  }

  // Three SSME bells in the aft triangle (1 upper + 2 lower) — detailed nozzles.
  const ssme = engineCluster('triple', 3, rFus * 0.62, vehLen * 0.05, 0, metal, eng);
  ssme.position.set(0, yA - vehLen * 0.004, oz);

  // Body flap below the SSMEs + black wing leading edges (RCC).
  const bodyFlap = new THREE.Mesh(
    new THREE.BoxGeometry(rFus * 1.4, vehLen * 0.03, rFus * 0.12),
    tile,
  );
  bodyFlap.position.set(0, yA - vehLen * 0.02, oz - rFus * 0.2);

  // ── Payload bay — the twin dorsal (+Z, outward) doors, shown cracked OPEN so
  //    the bay + gold-foil radiators read (closed for launch; ajar to show the
  //    doors articulate). Hinges run along the longerons parallel to the stack.
  const bay = new THREE.Group();
  const bayY0 = yA + bodyLen * 0.3;
  const bayY1 = yA + bodyLen * 0.92;
  const bayLen = bayY1 - bayY0;
  const bayMid = (bayY0 + bayY1) / 2;
  // Dark bay cavity (an inset trough on the top face).
  const trough = new THREE.Mesh(
    new THREE.BoxGeometry(rFus * 1.5, bayLen, rFus * 0.55),
    heroDark(0x0c0e11),
  );
  trough.position.set(0, bayMid, oz + rFus * 0.42);
  bay.add(trough);
  // Gold-foil radiator panels lining the bay floor.
  const rad = new THREE.Mesh(
    new THREE.BoxGeometry(rFus * 1.28, bayLen * 0.92, rFus * 0.02),
    heroGold(0xcaa24a),
  );
  rad.position.set(0, bayMid, oz + rFus * 0.5);
  bay.add(rad);
  // Two doors on vertical (stack-parallel) hinges at the shoulder longerons,
  // each swung open outward.
  const doorW = rFus * 1.05;
  for (const side of [1, -1] as const) {
    const hinge = new THREE.Group();
    hinge.position.set(side * rFus * 1.45 * 0.72, bayMid, oz + rFus * 0.78 * 0.55);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(doorW, bayLen, rFus * 0.06), white);
    panel.position.x = -side * doorW * 0.5; // extends toward the centreline
    const foil = new THREE.Mesh(
      new THREE.BoxGeometry(doorW * 0.86, bayLen * 0.9, rFus * 0.01),
      heroGold(0xcaa24a),
    );
    foil.position.set(-side * doorW * 0.5, 0, rFus * 0.04); // radiator on the inner face
    hinge.add(panel, foil);
    hinge.rotation.y = side * 0.9; // swung open
    bay.add(hinge);
  }

  // ── Agency markings — US flag on the port wing, "USA" on the starboard wing,
  //    "UNITED STATES" along the aft fuselage side. Thin decal planes tangent to
  //    each surface, facing outward (+Z), with a transparent-background texture.
  const decalMat = (
    draw: (x: CanvasRenderingContext2D, w: number, h: number) => void,
  ): THREE.MeshBasicMaterial => {
    const w = 512,
      hh = 256;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = hh;
    const x = c.getContext('2d')!;
    draw(x, w, hh);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false });
  };
  const flagTex = decalMat((x, w, hh) => {
    for (let s = 0; s < 7; s++) {
      x.fillStyle = s % 2 ? '#eef1f5' : '#b22234';
      x.fillRect(0, (s * hh) / 7, w, hh / 7);
    }
    x.fillStyle = '#3c3b6e';
    x.fillRect(0, 0, w * 0.42, (hh * 4) / 7);
    x.fillStyle = '#fff';
    for (let r2 = 0; r2 < 5; r2++)
      for (let cc = 0; cc < 6; cc++)
        x.fillRect(w * 0.03 + cc * w * 0.066, hh * 0.03 + r2 * hh * 0.11, w * 0.02, hh * 0.03);
  });
  const usaTex = decalMat((x, w, hh) => {
    x.fillStyle = '#14161b';
    x.font = `900 ${Math.round(hh * 0.8)}px Helvetica, Arial, sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('USA', w / 2, hh / 2);
  });
  const unitedTex = decalMat((x, w, hh) => {
    x.save();
    x.translate(w / 2, hh / 2);
    x.fillStyle = '#14161b';
    x.font = `bold ${Math.round(hh * 0.5)}px Helvetica, Arial, sans-serif`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('UNITED STATES', 0, 0);
    x.restore();
  });
  const wingTopZ = oz + thick * 0.85 + r * 0.01;
  const flagDecal = new THREE.Mesh(new THREE.PlaneGeometry(span * 0.5, span * 0.25), flagTex);
  flagDecal.position.set(-span * 0.5, yWingTE + h * 0.3, wingTopZ);
  const usaDecal = new THREE.Mesh(new THREE.PlaneGeometry(span * 0.4, span * 0.2), usaTex);
  usaDecal.position.set(span * 0.5, yWingTE + h * 0.3, wingTopZ);
  const unitedDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(vehLen * 0.03, bodyLen * 0.5),
    unitedTex,
  );
  unitedDecal.geometry.rotateZ(-Math.PI / 2);
  unitedDecal.position.set(rFus * 1.2, yA + bodyLen * 0.5, oz + rFus * 0.2);
  unitedDecal.rotation.y = -Math.PI / 2;

  orbiter.add(
    bay,
    flagDecal,
    usaDecal,
    unitedDecal,
    fus,
    nose,
    noseCap,
    windows,
    mkWing(1, tile, -thick * 0.85), // black underside, tucked toward the belly
    mkWing(-1, tile, -thick * 0.85),
    mkWing(1, white),
    mkWing(-1, white),
    tail,
    oms,
    ssme,
    bodyFlap,
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

  // ── Wide bulbous payload shroud — a smooth OGIVE bullet (lathe profile), split
  //    into clamshell halves, with a boat-tail flaring from the narrower Centaur
  //    up to the shroud so it reads as one continuous shape (not a flat-top tube
  //    with a cone perched on a smaller tube). Atlas V's signature 5 m fairing.
  const fairingBaseY = vehLen * 0.86;
  const fR = r * 1.4;
  const shH = vehLen * 0.3;
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(fR, 0),
    new THREE.Vector2(fR, shH * 0.46),
    new THREE.Vector2(fR * 0.95, shH * 0.62),
    new THREE.Vector2(fR * 0.78, shH * 0.78),
    new THREE.Vector2(fR * 0.5, shH * 0.9),
    new THREE.Vector2(fR * 0.18, shH * 0.99),
    new THREE.Vector2(0, shH * 1.04),
  ];
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.LatheGeometry(prof, 40, theta, Math.PI), body);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const boatTail = new THREE.Mesh(
    new THREE.CylinderGeometry(fR, r * 0.82, vehLen * 0.06, 40, 1, true),
    body,
  );
  boatTail.position.y = fairingBaseY - vehLen * 0.03;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, boatTail);
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
  p.body.map = livery({ base: '#e2e6df', flag: 'rus' });
  p.body.roughnessMap = stringerRoughness(50);
  p.body.needsUpdate = true;
  const frame = heroMetal(0xacb2ab, 0.3);
  const tankMat = heroMetal(0x9aaa9d, 0.34); // grey-green outboard tanks
  const eng = heroMetal(0x3a3f47, 0.5);
  const r = vehLen * 0.065; // stout
  const root = new THREE.Group();

  // ── First stage: central oxidizer tank + 6 outboard fuel tanks with bells.
  const booster = new THREE.Group();
  const core1 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.62, r * 0.62, vehLen * 0.42, 48),
    p.body,
  );
  core1.position.y = vehLen * 0.24;
  booster.add(core1);
  // Six outboard tanks, each with an RD-253 bell (ring-6, the Proton signature).
  const nTanks = 6;
  const tankR = r * 0.28;
  const tankLen = vehLen * 0.28;
  for (let i = 0; i < nTanks; i++) {
    const a = (i / nTanks) * Math.PI * 2;
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(tankR, tankR * 1.06, tankLen, 28),
      tankMat,
    );
    tank.position.set(Math.cos(a) * r * 0.94, tankLen / 2, Math.sin(a) * r * 0.94);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(tankR, tankLen * 0.24, 28), tankMat);
    nose.position.set(Math.cos(a) * r * 0.94, tankLen + tankLen * 0.12, Math.sin(a) * r * 0.94);
    const tankBell = detailBell(tankR * 0.7, vehLen * 0.05, frame, eng);
    tankBell.position.set(Math.cos(a) * r * 0.94, 0, Math.sin(a) * r * 0.94);
    booster.add(tank, nose, tankBell);
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
  // Stage 2 = 4× RD-0210/0211 (quad), data-driven from the spec.
  const s2spec = getLauncherEngines('proton-k')!.stages[1];
  midStage.add(
    stage2,
    engineCluster(
      s2spec.arrangement,
      s2spec.mainNozzles,
      r * 0.55,
      vehLen * 0.05,
      upperStageBaseY,
      frame,
      p.eng,
    ),
  );
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
  const spec = getLauncherEngines('titan-ii-glv')!;
  const body = new THREE.MeshStandardMaterial({
    map: livery({
      base: '#e9eaec',
      wordmark: { text: 'U S A F', color: '#20242c', size: 0.04, y: 0.55 },
      flag: 'usa',
    }),
    roughness: 0.5,
    metalness: 0.16,
    roughnessMap: stringerRoughness(50),
  });
  const plain = heroWhite(0xe9eaec);
  const frame = heroMetal(0xbfc4ca, 0.3);
  const dark = heroDark(0x1a1c20);
  const eng = heroMetal(0x40454d, 0.5);
  const r = vehLen * 0.045; // slender, uniform
  const root = new THREE.Group();

  // ── First stage: uniform cylinder + LR-87 twin-nozzle (data-driven pair).
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.54, 48), body);
  stage1.position.y = vehLen * 0.3;
  booster.add(stage1);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.56, 6, frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.55, dark));
  booster.add(
    engineCluster(
      spec.stages[0].arrangement,
      spec.stages[0].mainNozzles,
      r,
      vehLen * 0.05,
      0,
      frame,
      eng,
    ),
  );
  const interstage = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.03, 48), dark);
  interstage.position.y = vehLen * 0.585;
  booster.add(interstage);
  root.add(booster);

  // ── Second stage: same diameter, single LR-91 vacuum bell.
  const upperStageBaseY = vehLen * 0.72;
  const upperStage = new THREE.Group();
  const stage2 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.24, 48), plain);
  stage2.position.y = upperStageBaseY;
  upperStage.add(stage2);
  upperStage.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.055,
      vehLen * 0.6,
      frame,
      eng,
    ),
  );
  root.add(upperStage);

  // ── Gemini capsule as the "fairing" — short truncated cone (wide base, narrow
  //    top) riding directly atop the second stage.
  const fairingBaseY = vehLen * 0.86;
  const capsuleR = r * 1.08;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(capsuleR, vehLen * 0.1, 20, 1, true, theta, Math.PI),
      plain,
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
  p.body.map = livery({
    base: '#eef0ed',
    wordmark: { text: 'U S A', color: '#2a3038', size: 0.05, y: 0.5 },
    flag: 'usa',
  });
  p.body.roughnessMap = stringerRoughness(50);
  p.body.needsUpdate = true;
  const frame = heroMetal(0xc7c2b6, 0.32);
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
  booster.add(ringFrames(rTop, vehLen * 0.16, vehLen * 0.72, 6, frame));
  booster.add(raceway(rTop, vehLen * 0.16, vehLen * 0.7, p.dark));
  // Two large outboard booster bells (spread to the skirt edge) + a central
  //    sustainer + two small verniers → the 5-nozzle liftoff base (engine spec).
  for (const bx of [-rBase * 1.0, rBase * 1.0]) {
    const b = detailBell(rBase * 0.38, vehLen * 0.075, frame, p.eng);
    b.position.set(bx, -vehLen * 0.005, 0);
    booster.add(b);
  }
  const sustainer = detailBell(rBase * 0.24, vehLen * 0.05, frame, p.eng);
  booster.add(sustainer);
  for (const vz of [-rBase * 0.9, rBase * 0.9]) {
    const v = nozzle(rBase * 0.1, vehLen * 0.03, p.eng);
    v.position.set(0, vehLen * 0.01, vz);
    booster.add(v);
  }
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
/** Shared CNSA livery + materials: white body, red bands, 中国航天, red-star flag. */
function cnsaKit(stack: boolean): {
  body: THREE.MeshStandardMaterial;
  plain: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  eng: THREE.MeshStandardMaterial;
} {
  const body = new THREE.MeshStandardMaterial({
    map: livery({
      base: '#f0f2f4',
      bands: [
        { y: 0.5, color: '#c1121f', h: 0.016 },
        { y: 0.84, color: '#c1121f', h: 0.02 },
      ],
      stack: stack
        ? { chars: ['中', '国', '航', '天'], color: '#c1121f', size: 0.05, y: 0.32 }
        : undefined,
      flag: 'prc',
    }),
    roughness: 0.5,
    metalness: 0.14,
    roughnessMap: stringerRoughness(60),
  });
  return {
    body,
    plain: heroWhite(0xf0f2f4),
    frame: heroMetal(0xc4c8ce, 0.3),
    dark: heroDark(0x1c1f24),
    eng: heroMetal(0x40454d, 0.5),
  };
}

function buildLongMarch2F(vehLen: number): LauncherModel {
  const spec = getLauncherEngines('long-march-2f')!;
  const k = cnsaKit(true);
  const r = vehLen * 0.052;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.52, 48), k.body);
  core.position.y = vehLen * 0.29;
  booster.add(core);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.53, 7, k.frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.52, k.dark));
  // Core cluster: 4× YF-20 in a quad (data-driven from the spec).
  booster.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.05,
      0,
      k.frame,
      k.eng,
    ),
  );
  root.add(booster);
  // Four liquid strap-ons in their OWN group — jettison at strap-on burnout.
  const strapOnGroup = new THREE.Group();
  strapOns(strapOnGroup, 4, r, vehLen * 0.32, vehLen, k.plain, k.eng);
  root.add(strapOnGroup);

  const upperStageBaseY = vehLen * 0.66;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.94, r, vehLen * 0.18, 48), k.plain);
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.38, vehLen * 0.05, k.eng, vehLen * 0.56));
  root.add(upperStage);

  // Capsule half-shells (Shenzhou) + escape tower above — mirrors Saturn V idiom.
  const fairingBaseY = vehLen * 0.86;
  const capsuleR = r * 1.06;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(capsuleR, vehLen * 0.1, 20, 1, true, theta, Math.PI),
      k.plain,
    );
  const fairingL = mkShell(Math.PI / 2);
  const fairingR = mkShell(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  // Spiky escape tower rising above the capsule nose.
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.04, r * 0.04, vehLen * 0.09, 8),
    k.dark,
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
  const spec = getLauncherEngines('long-march-3b')!;
  const k = cnsaKit(false);
  const r = vehLen * 0.05;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.5, 48), k.body);
  core.position.y = vehLen * 0.28;
  booster.add(core);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.51, 6, k.frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.5, k.dark));
  booster.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.05,
      0,
      k.frame,
      k.eng,
    ),
  );
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.88, r, vehLen * 0.03, 48),
    k.dark,
  );
  interstage.position.y = vehLen * 0.545;
  booster.add(interstage);
  root.add(booster);
  // Four liquid strap-ons in their OWN group — jettison at strap-on burnout.
  const strapOnGroup = new THREE.Group();
  strapOns(strapOnGroup, 4, r, vehLen * 0.3, vehLen, k.plain, k.eng);
  root.add(strapOnGroup);

  const upperStageBaseY = vehLen * 0.68;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.88, r * 0.88, vehLen * 0.22, 48),
    k.plain,
  );
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.34, vehLen * 0.05, k.eng, vehLen * 0.565));
  root.add(upperStage);

  // Bulbous ogive bullet shroud (lathe) + boat-tail — wider than core, LM-3B style.
  const fairingBaseY = vehLen * 0.845;
  const fR = r * 1.3;
  const shH = vehLen * 0.26;
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(fR, 0),
    new THREE.Vector2(fR, shH * 0.44),
    new THREE.Vector2(fR * 0.92, shH * 0.64),
    new THREE.Vector2(fR * 0.66, shH * 0.82),
    new THREE.Vector2(fR * 0.3, shH * 0.96),
    new THREE.Vector2(0, shH * 1.03),
  ];
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.LatheGeometry(prof, 40, theta, Math.PI), k.plain);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const boatTail = new THREE.Mesh(
    new THREE.CylinderGeometry(fR, r * 0.88, vehLen * 0.05, 40, 1, true),
    k.plain,
  );
  boatTail.position.y = fairingBaseY - vehLen * 0.025;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, boatTail);
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
  const spec = getLauncherEngines('long-march-5')!;
  const k = cnsaKit(false);
  const r = vehLen * 0.07; // stout fat core
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.52, 48), k.body);
  core.position.y = vehLen * 0.3;
  booster.add(core);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.55, 8, k.frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.54, k.dark));
  // Two YF-77 bells at the base (data-driven pair).
  booster.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.055,
      0,
      k.frame,
      k.eng,
    ),
  );
  // Four large strap-ons, each with TWO YF-100 nozzles (spec: 8 total) — in their
  // OWN group so the scene jettisons them at strap-on burnout.
  const strapOnGroup = new THREE.Group();
  const soLen = vehLen * 0.36;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    const gr = new THREE.Group();
    const sbody = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.44, r * 0.5, soLen, 32), k.plain);
    sbody.position.y = soLen / 2;
    const snose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.44, soLen * 0.3, 32), k.plain);
    snose.position.y = soLen + soLen * 0.15;
    gr.add(sbody, snose);
    for (const bz of [-r * 0.2, r * 0.2]) {
      const nz = detailBell(r * 0.16, vehLen * 0.05, k.frame, k.eng);
      nz.position.set(0, 0, bz);
      gr.add(nz);
    }
    gr.position.set(Math.cos(a) * r * 1.3, 0, Math.sin(a) * r * 1.3);
    strapOnGroup.add(gr);
  }
  root.add(strapOnGroup);
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.8, r, vehLen * 0.035, 48),
    k.dark,
  );
  interstage.position.y = vehLen * 0.565;
  booster.add(interstage);
  root.add(booster);

  const upperStageBaseY = vehLen * 0.69;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.8, r * 0.8, vehLen * 0.2, 48),
    k.plain,
  );
  s2.position.y = upperStageBaseY;
  upperStage.add(s2);
  upperStage.add(
    engineCluster(
      spec.stages[2].arrangement,
      spec.stages[2].mainNozzles,
      r * 0.8,
      vehLen * 0.055,
      vehLen * 0.585,
      k.frame,
      k.eng,
    ),
  );
  root.add(upperStage);

  // Wide bulbous ogive shroud — the "Fat Five" has a notably wide 5.2 m fairing.
  const fairingBaseY = vehLen * 0.845;
  const fR = r * 1.45;
  const shH = vehLen * 0.3;
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(fR, 0),
    new THREE.Vector2(fR, shH * 0.46),
    new THREE.Vector2(fR * 0.92, shH * 0.66),
    new THREE.Vector2(fR * 0.64, shH * 0.83),
    new THREE.Vector2(fR * 0.28, shH * 0.96),
    new THREE.Vector2(0, shH * 1.03),
  ];
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.LatheGeometry(prof, 40, theta, Math.PI), k.plain);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const boatTail = new THREE.Mesh(
    new THREE.CylinderGeometry(fR, r * 0.8, vehLen * 0.06, 40, 1, true),
    k.plain,
  );
  boatTail.position.y = fairingBaseY - vehLen * 0.03;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, boatTail);
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
/** Shared ISRO kit: warm off-white body + Indian flag livery. */
function isroKit(): {
  body: THREE.MeshStandardMaterial;
  plain: THREE.MeshStandardMaterial;
  boost: THREE.MeshStandardMaterial;
  frame: THREE.MeshStandardMaterial;
  dark: THREE.MeshStandardMaterial;
  eng: THREE.MeshStandardMaterial;
} {
  return {
    body: new THREE.MeshStandardMaterial({
      map: livery({ base: '#f2f0ec', flag: 'ind' }),
      roughness: 0.5,
      metalness: 0.14,
      roughnessMap: stringerRoughness(50),
    }),
    plain: heroWhite(0xf2f0ec),
    boost: heroWhite(0xe6dcc4), // khaki solid boosters
    frame: heroMetal(0xc4bfae, 0.3),
    dark: heroDark(0x201e1a),
    eng: heroMetal(0x40454d, 0.5),
  };
}

function buildPSLV(vehLen: number): LauncherModel {
  const spec = getLauncherEngines('pslv')!;
  const k = isroKit();
  const r = vehLen * 0.046; // slender
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.48, 48), k.body);
  core.position.y = vehLen * 0.27;
  booster.add(core);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.49, 6, k.frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.48, k.dark));
  booster.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.05,
      vehLen * 0.02,
      k.frame,
      k.eng,
    ),
  );
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.84, r, vehLen * 0.025, 48),
    k.dark,
  );
  interstage.position.y = vehLen * 0.525;
  booster.add(interstage);
  root.add(booster);
  // Six PSOM solid strap-ons in their OWN group — jettison at strap-on burnout.
  const strapOnGroup = new THREE.Group();
  strapOns(strapOnGroup, 6, r, vehLen * 0.22, vehLen, k.boost, k.eng);
  root.add(strapOnGroup);

  // PS2 / PS3 / PS4 stacked above as upper stage (slimmer).
  const upperStageBaseY = vehLen * 0.65;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.84, r * 0.84, vehLen * 0.24, 48),
    k.plain,
  );
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.32, vehLen * 0.045, k.eng, vehLen * 0.525));
  root.add(upperStage);

  // Small ogive fairing atop the slim upper stage.
  const fairingBaseY = vehLen * 0.84;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.96, vehLen * 0.16, 20, 1, true, theta, Math.PI),
      k.plain,
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
  const spec = getLauncherEngines('lvm3')!;
  const k = isroKit();
  const r = vehLen * 0.052;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.52, 48), k.body);
  core.position.y = vehLen * 0.3;
  booster.add(core);
  booster.add(ringFrames(r, vehLen * 0.06, vehLen * 0.54, 6, k.frame));
  booster.add(raceway(r, vehLen * 0.07, vehLen * 0.53, k.dark));
  // L110 core = 2 Vikas (data-driven pair).
  booster.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.05,
      0,
      k.frame,
      k.eng,
    ),
  );
  root.add(booster);

  // Two large S200 solid boosters — fat (r*0.72) and nearly as tall as the core.
  const strapOnGroup = new THREE.Group();
  const s200Len = vehLen * 0.46;
  for (const sx of [-1, 1]) {
    const gr = new THREE.Group();
    const sbody = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.72, r * 0.72, s200Len, 32),
      k.boost,
    );
    sbody.position.y = s200Len / 2 + vehLen * 0.02;
    const snose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.72, vehLen * 0.1, 32), k.boost);
    snose.position.y = s200Len + vehLen * 0.07;
    gr.add(sbody, snose, detailBell(r * 0.5, vehLen * 0.055, k.frame, k.eng));
    gr.position.set(sx * r * 1.74, 0, 0);
    strapOnGroup.add(gr);
  }
  root.add(strapOnGroup);

  const upperStageBaseY = vehLen * 0.67;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r, vehLen * 0.18, 48), k.plain);
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.36, vehLen * 0.055, k.eng, vehLen * 0.575));
  root.add(upperStage);

  const fairingBaseY = vehLen * 0.84;
  const fR = r * 1.2;
  const shH = vehLen * 0.26;
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(fR, 0),
    new THREE.Vector2(fR, shH * 0.44),
    new THREE.Vector2(fR * 0.92, shH * 0.64),
    new THREE.Vector2(fR * 0.64, shH * 0.83),
    new THREE.Vector2(fR * 0.28, shH * 0.96),
    new THREE.Vector2(0, shH * 1.03),
  ];
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.LatheGeometry(prof, 40, theta, Math.PI), k.plain);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const boatTail = new THREE.Mesh(
    new THREE.CylinderGeometry(fR, r * 0.9, vehLen * 0.05, 40, 1, true),
    k.plain,
  );
  boatTail.position.y = fairingBaseY - vehLen * 0.025;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, boatTail);
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
  const body = new THREE.MeshStandardMaterial({
    map: livery({ base: '#6a7050', flag: 'jpn' }),
    roughness: 0.55,
    metalness: 0.12,
    roughnessMap: stringerRoughness(45),
  });
  const plain = heroWhite(0x6a7050); // olive
  const accent = heroWhite(0x8a9070);
  const frame = heroMetal(0x8a906e, 0.32);
  const dark = heroDark(0x30341f);
  const eng = heroMetal(0x3a3f47, 0.5);
  const r = vehLen * 0.058; // stubby
  const root = new THREE.Group();

  // First stage — wide solid segment with a single bell (all-solid, no cluster).
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.4, 48), body);
  stage1.position.y = vehLen * 0.23;
  booster.add(stage1);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.41, 5, frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.4, dark));
  booster.add(detailBell(r * 0.5, vehLen * 0.06, frame, eng));
  const interstage1 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.78, r, vehLen * 0.03, 48),
    dark,
  );
  interstage1.position.y = vehLen * 0.445;
  booster.add(interstage1);
  root.add(booster);

  // Second + third stages stacked above, tapering to slim nose.
  const upperStageBaseY = vehLen * 0.54;
  const upperStage = new THREE.Group();
  const stage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.78, r * 0.78, vehLen * 0.24, 48),
    plain,
  );
  stage2.position.y = upperStageBaseY;
  const stage3 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.54, r * 0.78, vehLen * 0.14, 48),
    plain,
  );
  stage3.position.y = vehLen * 0.78;
  upperStage.add(
    stage2,
    bell(r * 0.42, vehLen * 0.05, eng, vehLen * 0.46),
    stage3,
    bell(r * 0.28, vehLen * 0.04, eng, vehLen * 0.7),
  );
  root.add(upperStage);

  // Small blunt nose fairing.
  const fairingBaseY = vehLen * 0.875;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.56, vehLen * 0.125, 20, 1, true, theta, Math.PI),
      accent,
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
  const spec = getLauncherEngines('h3')!;
  const core_orange = new THREE.MeshStandardMaterial({
    map: livery({ base: '#d98a4a', flag: 'jpn' }),
    roughness: 0.6,
    metalness: 0.1,
    roughnessMap: stringerRoughness(50),
  });
  const white = heroWhite(0xecebe6);
  const frame = heroMetal(0xc4a878, 0.32);
  const dark = heroDark(0x2a2018);
  const eng = heroMetal(0x40454d, 0.5);
  const r = vehLen * 0.048;
  const root = new THREE.Group();

  const booster = new THREE.Group();
  const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.54, 48), core_orange);
  core.position.y = vehLen * 0.3;
  booster.add(core);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.56, 6, frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.55, dark));
  // LE-9 core = 2 (data-driven pair).
  booster.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r,
      vehLen * 0.055,
      0,
      frame,
      eng,
    ),
  );
  // Two SRB-3 solid strap-ons flanking the base (standard H3-22 config).
  const strapOnGroup = new THREE.Group();
  const srbLen = vehLen * 0.3;
  for (const sx of [-1, 1]) {
    const gr = new THREE.Group();
    const sbody = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.5, r * 0.5, srbLen, 28), white);
    sbody.position.y = srbLen / 2 + vehLen * 0.015;
    const snose = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, vehLen * 0.07, 28), white);
    snose.position.y = srbLen + vehLen * 0.05;
    gr.add(sbody, snose, detailBell(r * 0.32, vehLen * 0.045, frame, eng));
    gr.position.set(sx * r * 1.52, 0, 0);
    strapOnGroup.add(gr);
  }
  const interstage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.86, r, vehLen * 0.03, 48),
    dark,
  );
  interstage.position.y = vehLen * 0.575;
  booster.add(interstage);
  root.add(booster);
  root.add(strapOnGroup);

  const upperStageBaseY = vehLen * 0.715;
  const upperStage = new THREE.Group();
  const s2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.86, r * 0.86, vehLen * 0.19, 48),
    white,
  );
  s2.position.y = upperStageBaseY;
  upperStage.add(s2, bell(r * 0.36, vehLen * 0.05, eng, vehLen * 0.6));
  root.add(upperStage);

  // Bulbous 5.4 m-class ogive fairing — wider than the core.
  const fairingBaseY = vehLen * 0.865;
  const fR = r * 1.35;
  const shH = vehLen * 0.28;
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(fR, 0),
    new THREE.Vector2(fR, shH * 0.44),
    new THREE.Vector2(fR * 0.92, shH * 0.64),
    new THREE.Vector2(fR * 0.64, shH * 0.83),
    new THREE.Vector2(fR * 0.28, shH * 0.96),
    new THREE.Vector2(0, shH * 1.03),
  ];
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.LatheGeometry(prof, 40, theta, Math.PI), white);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const boatTail = new THREE.Mesh(
    new THREE.CylinderGeometry(fR, r * 0.86, vehLen * 0.05, 40, 1, true),
    white,
  );
  boatTail.position.y = fairingBaseY - vehLen * 0.025;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR, boatTail);
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
 * Starship + Super Heavy (SpaceX) — the fully-reusable bare-stainless stack.
 * Super Heavy booster (33 Raptors: 3 centre + 10 + 20 rings, 4 grid fins) is the
 * `booster` (drops at hot-stage sep); Starship upper (6 Raptors: 3 sea-level + 3
 * RVac, 2 forward + 2 aft flaps, ogive nose) is the `upperStage`. No jettisoned
 * fairing — Starship IS the payload volume, so the nose rides as a non-splitting
 * "fairing" (the launch profile omits the fairing event). Bare 304L stainless.
 */
function buildStarship(vehLen: number): LauncherModel {
  const spec = getLauncherEngines('starship')!;
  const pal = agencyPalette('SpaceX'); // bare stainless
  const steel = pal.body;
  const frame = pal.frame;
  const dark = pal.dark;
  const eng = pal.eng;
  const black = heroDark(0x14161a); // chine / heat-shield tiles
  const r = vehLen * 0.07; // fat 9 m body
  const root = new THREE.Group();

  // ── Super Heavy booster ──────────────────────────────────────────────────
  const booster = new THREE.Group();
  const shLen = vehLen * 0.56;
  const sh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, shLen, 56), steel);
  sh.position.y = vehLen * 0.29;
  booster.add(sh);
  booster.add(ringFrames(r, vehLen * 0.04, vehLen * 0.56, 10, frame));
  booster.add(raceway(r, vehLen * 0.05, vehLen * 0.55, dark));
  // 33 Raptors (data-driven concentric rings) on the thrust puck.
  const puck = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.98, r * 0.9, vehLen * 0.02, 56),
    heroDark(0x24262b),
  );
  puck.position.y = vehLen * 0.02;
  booster.add(puck);
  booster.add(
    engineCluster(
      spec.stages[0].arrangement,
      spec.stages[0].mainNozzles,
      r,
      vehLen * 0.05,
      0,
      frame,
      eng,
    ),
  );
  // 4 grid fins near the forward end.
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const gf = new THREE.Mesh(new THREE.BoxGeometry(r * 0.34, vehLen * 0.05, r * 0.06), frame);
    gf.position.set(Math.cos(a) * r * 1.12, vehLen * 0.5, Math.sin(a) * r * 1.12);
    gf.rotation.y = -a;
    booster.add(gf);
  }
  const hotStage = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.96, r, vehLen * 0.04, 56, 1, true),
    dark,
  );
  hotStage.position.y = vehLen * 0.585;
  booster.add(hotStage);
  root.add(booster);

  // ── Starship upper stage ─────────────────────────────────────────────────
  const upperStageBaseY = vehLen * 0.74;
  const upperStage = new THREE.Group();
  const shipLen = vehLen * 0.32;
  const ship = new THREE.Mesh(new THREE.CylinderGeometry(r, r, shipLen, 56), steel);
  ship.position.y = upperStageBaseY;
  upperStage.add(ship);
  upperStage.add(ringFrames(r, vehLen * 0.6, vehLen * 0.88, 4, frame));
  // Windward heat-shield tiles as a dark half-cylinder down one side.
  const tiles = new THREE.Mesh(
    new THREE.CylinderGeometry(
      r * 1.005,
      r * 1.005,
      shipLen,
      56,
      1,
      true,
      Math.PI * 0.55,
      Math.PI * 0.9,
    ),
    black,
  );
  tiles.position.y = upperStageBaseY;
  upperStage.add(tiles);
  // 6 Raptors (3 sea-level + 3 RVac).
  upperStage.add(
    engineCluster(
      spec.stages[1].arrangement,
      spec.stages[1].mainNozzles,
      r * 0.9,
      vehLen * 0.04,
      vehLen * 0.585,
      frame,
      eng,
    ),
  );
  // 2 aft flaps (lower) + 2 forward flaps (upper), on the tile side.
  const flap = (y: number, w: number, h: number, side: 1 | -1): THREE.Mesh => {
    const f = new THREE.Mesh(new THREE.BoxGeometry(r * 0.08, h, w), black);
    const a = Math.PI + side * 0.5;
    f.position.set(Math.cos(a) * r * 1.05, y, Math.sin(a) * r * 1.05);
    f.rotation.y = -a;
    return f;
  };
  upperStage.add(
    flap(vehLen * 0.63, r * 0.7, vehLen * 0.09, 1),
    flap(vehLen * 0.63, r * 0.7, vehLen * 0.09, -1),
  );
  upperStage.add(
    flap(vehLen * 0.86, r * 0.5, vehLen * 0.07, 1),
    flap(vehLen * 0.86, r * 0.5, vehLen * 0.07, -1),
  );
  root.add(upperStage);

  // ── Ogive nose as a non-splitting "fairing" (Starship's payload volume). ──
  const fairingBaseY = vehLen * 0.9;
  const shH = vehLen * 0.2;
  const prof: THREE.Vector2[] = [
    new THREE.Vector2(r, 0),
    new THREE.Vector2(r * 0.98, shH * 0.34),
    new THREE.Vector2(r * 0.86, shH * 0.6),
    new THREE.Vector2(r * 0.6, shH * 0.82),
    new THREE.Vector2(r * 0.28, shH * 0.96),
    new THREE.Vector2(0, shH * 1.02),
  ];
  const mkHalf = (theta: number): THREE.Mesh =>
    new THREE.Mesh(new THREE.LatheGeometry(prof, 48, theta, Math.PI), steel);
  const fairingL = mkHalf(Math.PI / 2);
  const fairingR = mkHalf(-Math.PI / 2);
  fairingL.position.y = fairingBaseY;
  fairingR.position.y = fairingBaseY;
  const fairingGroup = new THREE.Group();
  fairingGroup.add(fairingL, fairingR);
  root.add(fairingGroup);

  return {
    root,
    booster,
    boosterPlumeAnchor: sh,
    upperStage,
    upperPlumeAnchor: ship,
    fairingL,
    fairingR,
    fairingGroup,
    upperStageBaseY,
    fairingBaseY,
    payloadMountY: vehLen * 0.86,
  };
}

/**
 * Ariane 1 — European 1979 three-stage stack. Clean, slender, no strap-ons,
 * single first-stage bell, tapering toward the top. White body.
 */
function buildAriane1(vehLen: number): LauncherModel {
  const spec = getLauncherEngines('ariane-1')!;
  const body = new THREE.MeshStandardMaterial({
    map: livery({ base: '#f4f4f2', flag: 'esa' }),
    roughness: 0.5,
    metalness: 0.14,
    roughnessMap: stringerRoughness(50),
  });
  const plain = heroWhite(0xf4f4f2);
  const frame = heroMetal(0xc0c4ca, 0.3);
  const dark = heroDark(0x1e2126);
  const eng = heroMetal(0x40454d, 0.5);
  const r = vehLen * 0.05;
  const root = new THREE.Group();

  // First stage (L140): uniform cylinder, 4 Viking engines in a quad.
  const booster = new THREE.Group();
  const stage1 = new THREE.Mesh(new THREE.CylinderGeometry(r, r, vehLen * 0.44, 48), body);
  stage1.position.y = vehLen * 0.25;
  booster.add(stage1);
  booster.add(ringFrames(r, vehLen * 0.05, vehLen * 0.45, 6, frame));
  booster.add(raceway(r, vehLen * 0.06, vehLen * 0.44, dark));
  booster.add(
    engineCluster(
      spec.stages[0].arrangement,
      spec.stages[0].mainNozzles,
      r,
      vehLen * 0.055,
      vehLen * 0.02,
      frame,
      eng,
    ),
  );
  const is1 = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.88, r, vehLen * 0.025, 48), dark);
  is1.position.y = vehLen * 0.485;
  booster.add(is1);
  root.add(booster);

  // Second (L33) + third (H8) stages — progressively slimmer.
  const upperStageBaseY = vehLen * 0.625;
  const upperStage = new THREE.Group();
  const stage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.88, r * 0.88, vehLen * 0.2, 48),
    plain,
  );
  stage2.position.y = upperStageBaseY;
  const stage3 = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 0.65, r * 0.88, vehLen * 0.12, 48),
    plain,
  );
  stage3.position.y = vehLen * 0.785;
  upperStage.add(
    stage2,
    bell(r * 0.36, vehLen * 0.05, eng, vehLen * 0.515),
    stage3,
    bell(r * 0.26, vehLen * 0.04, eng, vehLen * 0.72),
  );
  root.add(upperStage);

  // Small slim conical fairing — the minimalist 1979 look.
  const fairingBaseY = vehLen * 0.875;
  const mkShell = (theta: number): THREE.Mesh =>
    new THREE.Mesh(
      new THREE.ConeGeometry(r * 0.66, vehLen * 0.13, 20, 1, true, theta, Math.PI),
      plain,
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
  starship: buildStarship,
  'saturn-v': buildSaturnV,
  'saturn-ib': buildSaturnIB,
  'vostok-k': buildSoyuz,
  'voskhod-11a57': buildSoyuz,
  soyuz: buildSoyuz,
  'atlas-v': buildAtlasV,
  'proton-k': buildProtonK,
  'titan-ii-glv': buildTitanIIGLV,
  'atlas-lv-3b': buildAtlasLV3B,
  'ariane-5': (v) =>
    buildSideBooster(v, {
      boosterLen: 0.62,
      fairingR: 1.35,
      body: 0xeae6da,
      boost: 0xd8d2c4,
      base: '#eae6da',
      boostHex: 'd8d2c4',
      flag: 'esa',
    }),
  'h-iia': (v) =>
    buildSideBooster(v, {
      boosterLen: 0.38,
      fairingR: 1.15,
      body: 0xf0f0f0,
      boost: 0xdedede,
      base: '#f0f0f0',
      boostHex: 'dedede',
      flag: 'jpn',
    }),
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
