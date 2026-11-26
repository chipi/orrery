/**
 * How the Shuttle orbiter (showcase/winged.ts, authored at full scale: nose +y, belly +z) stands
 * on its gear. Kept apart from the model so the /fly scenes can place it without loading it.
 *
 * From the HAER measured drawings of Discovery (TX-116-A sheet 6, the port elevation, drawn with
 * the fuselage reference level): the main wheels at 23.86 m aft of the nose, the nose wheels at
 * 3.55 m, touching 1.12 m above the mains' ground line. Standing on all three, the orbiter is
 * pitched nose-down by that difference over the wheelbase (docs/wip/2026-11-27-orbiter-haer-measurements.md).
 */
const NOSE_A = 37.07; // winged.ts: station a = NOSE_A - (metres aft of the nose)
export const MAIN_STN = NOSE_A - 23.86;
export const NOSE_STN = NOSE_A - 3.55;
/** The main gear's half-track: 22'-10 1/4" (6.96 m) between the legs, dimensioned on sheet 5. */
export const MAIN_H = 6.96 / 2;
/** The belly at the nose-gear station (body z, belly +z). */
export const NOSE_BELLY_Z = 1.735;
/** The ground plane under each gear's wheels (body z): the drawing's y = 0 and y = 1.12. */
export const MAIN_GROUND_Z = 4.85;
export const NOSE_GROUND_Z = 4.85 - 1.12;
/** How a Shuttle flight looked, from its orbiter and launch date (ISO; undefined: as flown
 *  longest). Columbia carried the SILTS pod on the fin from STS-61-C (12 Jan 1986); STS-1 and
 *  STS-2 (1981) flew white-painted external tanks, STS-3 on the bare orange foam. */
export interface OrbiterLook {
  variant: 'shuttle' | 'columbia';
  silts: boolean;
  whiteTank: boolean;
}
export function orbiterLook(orbiter: string | undefined, date: string | undefined): OrbiterLook {
  const d = date && /^\d{4}-\d{2}-\d{2}/.test(date) ? date.slice(0, 10) : undefined;
  return {
    variant: orbiter === 'columbia' ? 'columbia' : 'shuttle',
    silts: !d || d >= '1986-01-12',
    whiteTank: !!d && d < '1982-01-01',
  };
}

/** Body pitch standing on all three gears (deg, nose up +): nose-down. */
export const ORBITER_REST_PITCH_DEG =
  (-Math.atan((MAIN_GROUND_Z - NOSE_GROUND_Z) / (NOSE_STN - MAIN_STN)) * 180) / Math.PI;
