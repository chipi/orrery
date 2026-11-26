/**
 * Bodies a mission only passes on its way (Galileo at Gaspra and Ida, NEAR at
 * Mathilde, Rosetta at Steins and Lutetia, Lucy at Dinkinesh, Giotto at
 * Grigg-Skjellerup). They are not destinations: no ephemeris, no orbit ring,
 * no label of their own, so the flyby cinema places one where the ship's
 * trajectory puts the encounter, just off its track at the event's peak, and
 * composes it with an existing small-body preset (flyby review call 1).
 */

import type { PlanetId } from './flyby-camera-plan';

export interface EncounterBody {
  id: string;
  /** Matches the flight event's English label. */
  label: RegExp;
  /** Scene radius, stylised on the scale of PLANET_SIZES' small bodies. */
  size: number;
  color: number;
  /** Long-axis stretch of the stand-in ellipsoid (Ida is 60 × 25 km). */
  stretch: number;
  /** The PLANET_COMPOSITION preset the shot borrows. */
  standIn: PlanetId;
}

export const ENCOUNTER_BODIES: readonly EncounterBody[] = [
  {
    id: 'gaspra',
    label: /\bgaspra\b/i,
    size: 0.3,
    color: 0x9c8f80,
    stretch: 1.9,
    standIn: 'donaldjohanson',
  },
  {
    id: 'ida',
    label: /\bida\b/i,
    size: 0.38,
    color: 0x9a8e7f,
    stretch: 2.3,
    standIn: 'donaldjohanson',
  },
  {
    id: 'mathilde',
    label: /\bmathilde\b/i,
    size: 0.38,
    color: 0x4a4744,
    stretch: 1.3,
    standIn: 'donaldjohanson',
  },
  {
    id: 'steins',
    label: /\bsteins\b/i,
    size: 0.25,
    color: 0xb8b2a8,
    stretch: 1.3,
    standIn: 'donaldjohanson',
  },
  {
    id: 'lutetia',
    label: /\blutetia\b/i,
    size: 0.42,
    color: 0x8a8580,
    stretch: 1.3,
    standIn: 'donaldjohanson',
  },
  {
    id: 'dinkinesh',
    label: /\bdinkinesh\b/i,
    size: 0.22,
    color: 0x9d9284,
    stretch: 1.1,
    standIn: 'donaldjohanson',
  },
  {
    id: 'grigg-skjellerup',
    label: /\bgrigg[-\s]skjellerup\b/i,
    size: 0.25,
    color: 0x3d3a38,
    stretch: 1.4,
    standIn: 'halley',
  },
];

export function findEncounterBody(label: string | null | undefined): EncounterBody | null {
  if (!label) return null;
  return ENCOUNTER_BODIES.find((b) => b.label.test(label)) ?? null;
}

/** Separation of the body's centre from the ship's peak position, in body radii. */
const OFF_TRACK_RADII = 2.5;

/**
 * Scene position of an encounter body: OFF_TRACK_RADII radii from the ship's
 * peak position, across its track and on the side away from the Sun, so the
 * camera on the ship's side looks at the lit face. Without a later sample the
 * offset runs outward along the Sun line.
 */
export function encounterScenePos(
  peak: { x: number; z: number },
  after: { x: number; z: number } | null,
  size: number,
): { x: number; z: number } {
  const r = Math.hypot(peak.x, peak.z) || 1;
  const out = { x: peak.x / r, z: peak.z / r };
  let dir = out;
  if (after) {
    const vx = after.x - peak.x;
    const vz = after.z - peak.z;
    const v = Math.hypot(vx, vz);
    if (v > 1e-9) {
      let px = -vz / v;
      let pz = vx / v;
      if (px * out.x + pz * out.z < 0) {
        px = -px;
        pz = -pz;
      }
      dir = { x: px, z: pz };
    }
  }
  const d = size * OFF_TRACK_RADII;
  return { x: peak.x + dir.x * d, z: peak.z + dir.z * d };
}
