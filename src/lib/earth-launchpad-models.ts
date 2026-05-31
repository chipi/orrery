import * as THREE from 'three';

/**
 * Per-site 3D model builders for launchpads on /earth (#285 Phase 2).
 * Mirrors the moon-lander-models.ts / mars-lander-models.ts pattern:
 * each known launch-site id resolves to a recognisable silhouette
 * built from Three.js primitives; unknown ids fall back to a generic
 * launchpad glyph.
 *
 * Scale convention: matches moon-lander-models.ts. The Earth-surface
 * scene uses the same world units as /moon and /mars (planet radius
 * scales to ~30 world units inside SurfaceScene), so marker
 * silhouettes are sized to read at default camera distance — tallest
 * element ~1.0–1.5 world units above the surface.
 *
 * Per-pad-type styling (Saturn V crawler vs Falcon 9 strongback vs
 * Soyuz mobile gantry vs Ariane vertical tower vs Long March pad) is
 * deferred to a follow-up polish slice. v1 ships a single readable
 * generic launchpad glyph: flat octagonal pad + four lightning towers
 * + central erected vertical (rocket-on-pad silhouette).
 */

const STEEL = 0x8a8e95;
const CONCRETE = 0xb0b0a8;
const DARK = 0x1a1a1a;

function padMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: CONCRETE, metalness: 0.15, roughness: 0.85 });
}

function steelMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: STEEL, metalness: 0.7, roughness: 0.4 });
}

function darkMat(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: DARK, metalness: 0.4, roughness: 0.6 });
}

function accentMat(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.4,
    roughness: 0.45,
    emissive: color,
    emissiveIntensity: 0.25,
  });
}

/**
 * Generic launchpad silhouette: octagonal concrete pad + 4 lightning
 * towers at the corners + a central rocket-on-pad vertical. Tinted
 * with the agency accent color via the central rocket band.
 */
function buildGenericLaunchpad(color: string): THREE.Group {
  const g = new THREE.Group();

  // Octagonal pad base (concrete).
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.08, 8), padMat());
  pad.position.y = 0.04;
  g.add(pad);

  // 4 lightning towers at compass points around the pad (NE/NW/SE/SW
  // pattern to leave the cardinal flame-trench openings clear).
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const dx = Math.cos(ang) * 0.55;
    const dz = Math.sin(ang) * 0.55;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.1, 4), steelMat());
    tower.position.set(dx, 0.6, dz);
    g.add(tower);
    // Top spike (lightning rod).
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.12, 4), steelMat());
    tip.position.set(dx, 1.21, dz);
    g.add(tip);
  }

  // Central rocket-on-pad vertical — the most recognisable launchpad
  // signature when viewed from above. Capped with a faint nose cone.
  const rocket = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.85, 8), steelMat());
  rocket.position.y = 0.5;
  g.add(rocket);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.18, 8), steelMat());
  nose.position.y = 1.02;
  g.add(nose);

  // Agency-tinted accent band around the rocket — same role as the
  // accent stripe on the Lunokhod / Yutu glyphs.
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 6, 24), accentMat(color));
  band.position.y = 0.78;
  band.rotation.x = Math.PI / 2;
  g.add(band);

  // Small strongback / service arm hint — a slim diagonal beam from
  // tower to rocket on one side (reads as "launch infrastructure" at
  // marker distance without committing to a specific pad type).
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.012, 0.012), darkMat());
  arm.position.set(0.27, 0.7, 0);
  g.add(arm);

  return g;
}

// ─── Dispatch ───────────────────────────────────────────────────────

// Per-site builders. v1 routes every launch-site id through the
// generic glyph; future slices can add Saturn-V / Falcon-9 /
// Soyuz-MIK / Ariane-mobile-gantry / Long-March-vertical-tower
// silhouettes.
const BUILDERS: Record<string, (color: string) => THREE.Group> = {};

/**
 * Build a launchpad marker for `siteId`. Falls back to the generic
 * launchpad silhouette for ids without a dedicated builder. Caller
 * supplies the agency colour for accent tinting. Signature matches
 * the canonical `LanderModelBuilder` contract (siteId, missionType,
 * color, agency) — missionType + agency are accepted but currently
 * unused (v1 has no per-pad-type styling).
 */
export function buildLaunchpadModel(
  siteId: string,
  _missionType: string | undefined,
  color: string,
  _agency?: string,
): THREE.Group {
  const builder = BUILDERS[siteId] ?? buildGenericLaunchpad;
  return builder(color);
}
