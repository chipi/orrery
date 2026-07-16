/**
 * Sample launch-vehicle profiles for the ascent engine (RFC-033 · epic
 * #412). S1 ships one hand-typed flagship inline; the shipped per-vehicle
 * JSON library + loader (keyed on fleet_refs launcher id) is S3.
 *
 * Figures are representative public values (users' guides / Spaceflight101),
 * good enough to exercise the engine + render. Provenance-gated data lands
 * with the S3 schema.
 */

import type { LaunchProfile } from './ascent-physics';

/** Falcon 9 Block 5 — representative two-stage profile with a 15 t LEO payload. */
export const FALCON9_SAMPLE: LaunchProfile = {
  id: 'falcon-9',
  name: 'Falcon 9 Block 5',
  payloadKg: 15_000,
  fairingKg: 1_900,
  fairingJettisonAltM: 110_000,
  refAreaM2: 10.75, // π·(3.7/2)²
  cd: 0.3,
  launchSite: { lat: 28.56, lon: -80.58, name: 'SLC-40 · Cape Canaveral' },
  stages: [
    {
      name: 'S1',
      wetKg: 433_100,
      dryKg: 25_600,
      thrustSlKN: 7_607,
      thrustVacKN: 8_227,
      ispSlS: 283,
      ispVacS: 312,
      engines: 9,
      chamberTempK: 3540, // Merlin 1D, RP-1/LOX adiabatic flame temp
    },
    { name: 'S2', wetKg: 111_500, dryKg: 4_000, thrustVacKN: 981, ispVacS: 348, engines: 1, chamberTempK: 3540 },
  ],
  pitchProgram: [
    [0, 90],
    [12, 89],
    [40, 70],
    [120, 45],
    [180, 25],
    [300, 10],
    [520, 3],
  ],
};
