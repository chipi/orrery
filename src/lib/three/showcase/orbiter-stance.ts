/**
 * How the Shuttle orbiter (showcase/winged.ts, authored at full scale: nose +y, belly +z) stands
 * on its gear. Kept apart from the model so the /fly scenes can place it without loading it.
 *
 * The orbiter sits nose-down on its gear (side and walkaround photos on the runway, scaled by the
 * people and the 44.5 in and 32 in tyres): the wing underside about 2.5 m up at the main gear, the
 * belly about 1.7 m up at the nose gear, ~2 m between.
 */
export const MAIN_STN = 17.8;
export const NOSE_STN = 34.0;
/** The wing underside at the main gear and the drooped belly at the nose-gear station (body z). */
const WING_UNDERSIDE_Z = 2.3;
export const NOSE_BELLY_Z = 2.12;
/** The ground plane under each gear's wheels (body z). */
export const MAIN_GROUND_Z = WING_UNDERSIDE_Z + 2.5;
export const NOSE_GROUND_Z = NOSE_BELLY_Z + 1.7;
/** Body pitch standing on all three gears (deg, nose up +): nose-down. */
export const ORBITER_REST_PITCH_DEG =
  (-Math.atan((MAIN_GROUND_Z - NOSE_GROUND_Z) / (NOSE_STN - MAIN_STN)) * 180) / Math.PI;
