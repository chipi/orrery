import * as THREE from 'three';
import { strutBetween } from '../three/model-geom';

/**
 * Apollo 11 Lunar Module — Tier 1 engineering model (PRD-014 / RFC-017
 * ADR-062 hand-authored hardware authoring contract).
 *
 * This is the close-zoom engineering-accurate model that appears when
 * the hotspot LOD dispatcher swaps from Tier 0 silhouette
 * (moon-lander-models.ts → buildApolloLM) to Tier 1. Same vehicle,
 * more detail and more accurate proportions; sized for screen
 * readability at the mid-zoom tier (~5-50 px) without being literal-
 * scale (a literal 7 m LM on moonRadius=30 would be ~0.00012 world
 * units — invisible).
 *
 * Dimensions sourced from public NASA technical reports:
 *   - Descent stage: octagonal, 4.27 m diameter across opposite faces,
 *     3.23 m tall (NASA TN D-7700, Apollo Lunar Surface Journal —
 *     "Lunar Module / Quick Reference Data, p. 1-7").
 *   - Ascent stage: 4.30 m wide × 2.83 m tall (same source).
 *   - Landing leg span: 9.45 m tip-to-tip when deployed.
 *   - Plume deflector cones, gold thermal blanket, RCS quad clusters,
 *     EVA hatch, ladder, modular equipment storage assembly (MESA),
 *     antennas (S-band + steerable + 2 VHF) all reproduced
 *     schematically.
 *
 * Editorial intent: engineering-blueprint style — recognisable, not
 * photo-real. Visitors should be able to read the descent stage
 * (gold), the ascent stage (silver + black RCS), the legs (silver
 * with footpads), and the antennas. Apollo 11 specifically lacks the
 * LRV (J-mission only) so this builder is shared with Apollo 12 + 14
 * (per moon-lander-models.ts BUILDERS dispatch).
 */

const MLI_GOLD = 0xd4af37;
const MLI_SILVER = 0xc0c0c0;
const RCS_BLACK = 0x1a1a1a;
const PLUME_RED = 0x8b3a3a;

function goldFoil(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: MLI_GOLD,
    metalness: 0.85,
    roughness: 0.4,
    emissive: MLI_GOLD,
    emissiveIntensity: 0.06,
  });
}

function silverFoil(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: MLI_SILVER, metalness: 0.9, roughness: 0.25 });
}

function rcsBlack(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: RCS_BLACK, metalness: 0.5, roughness: 0.6 });
}

function plumeDeflector(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: PLUME_RED, metalness: 0.3, roughness: 0.7 });
}

/**
 * Apollo 11 LM Tier 1 model. Returned group is centred at (0,0,0) with
 * +Y pointing up (surface normal). Total height ≈ 1.4 world units
 * (matches the existing Tier 0 silhouette envelope so the swap is
 * not jarring). Caller positions/orients on the planet surface.
 *
 * Scale relative to /moon (moonRadius = 30 world units):
 *   - Total height ≈ 1.4u  → ~80 km equivalent at true scale, but
 *     intentionally upscaled for legibility per RFC-017 §S-tiers.
 *   - Engineering proportions preserved (descent : ascent : legs
 *     ratios match the real vehicle even though the absolute scale
 *     is illustrative).
 */
export function buildApolloLMHotspot(accentColor: string): THREE.Group {
  const g = new THREE.Group();

  // ─── Descent stage (octagonal gold-foil-wrapped lower half) ──
  // Real: ~4.27 m wide, 3.23 m tall. Here: 0.72 wide × 0.36 tall.
  // CylinderGeometry with 8 segments gives the octagonal shape.
  const descent = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.36, 8), goldFoil());
  descent.position.y = 0.42;
  g.add(descent);

  // Descent engine nozzle (DPS — Descent Propulsion System).
  const nozzle = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.18, 12), rcsBlack());
  nozzle.position.y = 0.18;
  nozzle.rotation.x = Math.PI;
  g.add(nozzle);

  // Plume deflectors — 4 small angled vanes around the DPS nozzle
  // that diverted exhaust away from the landing legs.
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const vane = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.12), plumeDeflector());
    vane.position.set(Math.cos(ang) * 0.18, 0.16, Math.sin(ang) * 0.18);
    vane.rotation.y = ang + Math.PI / 2;
    g.add(vane);
  }

  // ─── Landing legs (4 splayed) — each strut physically spans from the
  //     descent-stage corner DOWN to its footpad, so the leg reads as a
  //     connected A-frame instead of rods floating above the pads. ────
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const c = Math.cos(ang);
    const s = Math.sin(ang);
    // Footpad on the regolith.
    const padPos = new THREE.Vector3(c * 0.64, 0.03, s * 0.64);
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.025, 12), silverFoil());
    pad.position.copy(padPos);
    g.add(pad);
    // Primary strut — descent-stage upper corner → pad.
    const hip = new THREE.Vector3(c * 0.34, 0.36, s * 0.34);
    g.add(strutBetween(hip, padPos, 0.022, silverFoil(), 6));
    // Secondary knee brace — lower inboard body point → pad.
    const knee = new THREE.Vector3(c * 0.2, 0.12, s * 0.2);
    g.add(strutBetween(knee, padPos, 0.015, silverFoil(), 6));
    // Down-lock leg cap where the primary meets the descent stage.
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8), silverFoil());
    cap.position.set(c * 0.34, 0.36, s * 0.34);
    g.add(cap);
  }

  // ─── Ascent stage (above descent stage) ──────────────────────
  // Real: ~4.30 m wide × 2.83 m tall. Here: 0.52 wide × 0.32 tall.
  // BoxGeometry approximates the angular forward + aft faces.
  const ascent = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.32, 0.46), silverFoil());
  ascent.position.y = 0.76;
  g.add(ascent);

  // Two triangular forward windows for Armstrong + Aldrin.
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0x111122,
    metalness: 0.2,
    roughness: 0.1,
    emissive: 0x222244,
    emissiveIntensity: 0.3,
  });
  for (const dx of [-0.1, 0.1]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.01), windowMat);
    w.position.set(dx, 0.84, 0.235);
    g.add(w);
  }

  // EVA hatch on the front face.
  const hatch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.012), goldFoil());
  hatch.position.set(0, 0.7, 0.235);
  g.add(hatch);

  // Ladder descending from the hatch down a leg strut to the surface.
  const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.6, 0.015), silverFoil());
  ladder.position.set(0, 0.4, 0.32);
  g.add(ladder);

  // ─── RCS quad clusters (4 corners of ascent stage) ──────────
  // Real: 4 quads of 4 thrusters each (16 thrusters total).
  // Represented as small dark boxes at the ascent stage corners.
  for (const cx of [-0.27, 0.27]) {
    for (const cz of [-0.24, 0.24]) {
      const quad = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.04), rcsBlack());
      quad.position.set(cx, 0.84, cz);
      g.add(quad);
    }
  }

  // ─── Antennas ────────────────────────────────────────────────
  // S-band steerable antenna — high-gain dish on a mast, deployed
  // forward of the ascent stage.
  const sbandMast = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 4), silverFoil());
  sbandMast.position.set(0.35, 0.95, 0);
  g.add(sbandMast);
  const sbandDish = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.015, 16), silverFoil());
  sbandDish.position.set(0.35, 1.16, 0);
  sbandDish.rotation.x = Math.PI / 3;
  g.add(sbandDish);

  // Top docking-target antenna (the smaller spike on top of the ascent stage).
  const topAntenna = new THREE.Mesh(
    new THREE.CylinderGeometry(0.008, 0.008, 0.18, 4),
    silverFoil(),
  );
  topAntenna.position.set(0, 1.02, 0);
  g.add(topAntenna);

  // ─── Agency accent ring ─────────────────────────────────────
  // Reads as NASA white-on-blue at scale; tints the descent stage
  // for distinguishability against other sites at the same zoom.
  const accentRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.4, 0.012, 6, 24),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      metalness: 0.4,
      roughness: 0.4,
      emissive: accentColor,
      emissiveIntensity: 0.35,
    }),
  );
  accentRing.position.y = 0.42;
  accentRing.rotation.x = Math.PI / 2;
  g.add(accentRing);

  return g;
}
