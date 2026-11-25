/**
 * One phone-framing rule for /fly's cameras (W6, operator 2026-11-25). A shot is composed for a
 * landscape frame; a tall phone frame keeps the vertical field and loses most of the horizontal
 * one, so a subject composed to fill the width falls off the sides. The rule backs the shot off
 * by `portraitFit(aspect)`: 1 on a landscape frame, rising toward 1/aspect on a tall one. Not
 * the full 1/aspect: the subject would then fill the width exactly as it filled the height, but
 * at a third of its desktop size the craft reads as a dot.
 *
 * Two ways to apply it: scale the camera's distance (a scene that places its camera each frame,
 * like the way home and the booster return), or widen the vertical field of view by the same
 * factor in tan(half-angle) (a camera whose position is lerped state, like the cruise, flyby and
 * cislunar camera, where scaling the position would compound frame to frame).
 */

/** Distance multiplier for a frame of `aspect` (width / height). */
export function portraitFit(aspect: number): number {
  return aspect < 1 ? 1 + 0.7 * (1 / aspect - 1) : 1;
}

const DEG = Math.PI / 180;
/** Past this the perspective stretches the frame's edges more than the fit is worth. */
const MAX_FOV_DEG = 100;

/** The vertical field of view (deg) that frames as `fovDeg` would at distance × portraitFit. */
export function portraitFov(fovDeg: number, aspect: number): number {
  const k = portraitFit(aspect);
  if (k === 1) return fovDeg;
  return Math.min(MAX_FOV_DEG, (2 * Math.atan(Math.tan((fovDeg * DEG) / 2) * k)) / DEG);
}
