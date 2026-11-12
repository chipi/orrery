/**
 * Contrast maths of the /explore readability probe (UXD-020, E2). Pure and browser-free: the
 * runner (scripts/readability-probe.mjs) screenshots the scene and feeds the RGBA pixels here.
 *
 * A "line" is a point the scene says an element covers (an orbit, a ring, a belt particle),
 * measured on the RENDERED sRGB pixels: its relative luminance against the median of the
 * pixels around it, WCAG 2.x ratio (L1 + 0.05) / (L2 + 0.05). The glare stand-in is a white
 * veil composited over the whole frame (daylight on a screen), default 12 %. The veil is
 * composited in sRGB, as a browser overlay of rgba(255,255,255,0.12) would be; near black the
 * WCAG 0.05 term makes the ratio of such a veiled pair rise slightly, so the veiled figure is
 * read against its own 2:1 target, not as "raw minus something".
 *
 * Negative control: every element is also measured at the same points shifted 8 px off it. A
 * bright starfield or glow raises the contrast of any point, element or not, so the verdict uses
 * the element median minus the control's excess over 1:1 (`excessOverControl`), not the raw median.
 *
 * Targets (operator, 2026-11-12): 3:1 on the rendered pixels, 2:1 after the veil.
 */

export const TARGET = 3;
export const TARGET_VEILED = 2;
export const VEIL_ALPHA = 0.12;

/** sRGB channel 0..255 to linear light 0..1. */
export function srgbToLinear(c8) {
  const c = c8 / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of an 8-bit sRGB colour, 0..1. */
export function relLuminance(r, g, b) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio of two relative luminances (order does not matter). */
export function contrastRatio(y1, y2) {
  const hi = Math.max(y1, y2);
  const lo = Math.min(y1, y2);
  return (hi + 0.05) / (lo + 0.05);
}

/** A copy of an RGBA buffer with a white veil of `alpha` composited over every pixel. */
export function veil(rgba, alpha = VEIL_ALPHA) {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0; i < rgba.length; i += 4) {
    out[i] = rgba[i] * (1 - alpha) + 255 * alpha;
    out[i + 1] = rgba[i + 1] * (1 - alpha) + 255 * alpha;
    out[i + 2] = rgba[i + 2] * (1 - alpha) + 255 * alpha;
    out[i + 3] = 255;
  }
  return out;
}

function percentile(sorted, p) {
  if (sorted.length === 0) return NaN;
  const i = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

/** Luma (Rec. 709 on the 8-bit sRGB values, 0..255) percentiles of the frame. */
export function lumaPercentiles(rgba, ps = [5, 25, 50, 75, 95, 99]) {
  const luma = new Float32Array(rgba.length / 4);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j++) {
    luma[j] = 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
  }
  luma.sort();
  const out = {};
  for (const p of ps) out[`p${p}`] = Number(percentile(luma, p).toFixed(2));
  return out;
}

/** Relative luminance of the pixel at integer (x, y), or null outside the frame. */
function lumAt(rgba, w, h, x, y) {
  if (x < 0 || y < 0 || x >= w || y >= h) return null;
  const i = (y * w + x) * 4;
  return relLuminance(rgba[i], rgba[i + 1], rgba[i + 2]);
}

const RING = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [-1, -1],
  [1, -1],
  [-1, 1],
];

/**
 * Contrast of the element at (x, y): the brightest pixel of the block of half-size `half`
 * around the point (1 is 3 x 3; the projected point can sit up to one CSS px off the drawn
 * line, so use `half` = the device pixel ratio) against the median of the 8 pixels `radius`
 * px around it (a line crosses at most two of them, so the median is the background). Returns
 * null when the point or its ring is off the frame. `radius` and `half` are device pixels.
 */
export function pointContrast(rgba, w, h, x, y, radius = 4, half = 1) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  let best = -1;
  for (let dy = -half; dy <= half; dy++) {
    for (let dx = -half; dx <= half; dx++) {
      const l = lumAt(rgba, w, h, cx + dx, cy + dy);
      if (l === null) return null;
      if (l > best) best = l;
    }
  }
  const ring = [];
  for (const [dx, dy] of RING) {
    const l = lumAt(rgba, w, h, cx + dx * radius, cy + dy * radius);
    if (l === null) return null;
    ring.push(l);
  }
  ring.sort((a, b) => a - b);
  const bg = (ring[3] + ring[4]) / 2;
  return contrastRatio(best, bg);
}

/** Summary of the contrast over a set of points: count, p10, median, p90, share at or above `target`. */
export function summarise(ratios, target = TARGET) {
  const r = ratios.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  return {
    n: r.length,
    p10: Number(percentile(r, 10).toFixed(2)),
    p50: Number(percentile(r, 50).toFixed(2)),
    p90: Number(percentile(r, 90).toFixed(2)),
    shareAtTarget: r.length
      ? Number((r.filter((x) => x >= target).length / r.length).toFixed(3))
      : NaN,
  };
}

/** The negative control's shift off the element, in CSS px. */
export const CONTROL_SHIFT = 8;

/**
 * The same sample points moved `shift` device px (Euclidean) off the element, in turn along the
 * four diagonals: a straight horizontal or vertical line is left by every one, and a circle (an
 * orbit) is hit only where its tangent happens to run along the shift, which the median ignores.
 * Measured with the same rule, they show how much "contrast" the background gives anyway (a
 * bright starfield, glow, the maximum of the 3 x 3 block).
 */
export function controlPoints(points, shift = CONTROL_SHIFT) {
  const d = shift / Math.SQRT2;
  const dirs = [
    [d, d],
    [-d, d],
    [-d, -d],
    [d, -d],
  ];
  return points.map((p, i) => ({ x: p.x + dirs[i % 4][0], y: p.y + dirs[i % 4][1] }));
}

/**
 * The element's contrast minus what the control shows: the element median less the part of the
 * control median that is above 1:1 (a flat background is 1). A bright field raises both and
 * cancels; a line that is only as visible as its surroundings scores 1.
 */
export function excessOverControl(elementP50, controlP50) {
  if (!Number.isFinite(elementP50) || !Number.isFinite(controlP50)) return NaN;
  return elementP50 - Math.max(0, controlP50 - 1);
}

/**
 * Contrast of every point, raw and after the veil, and of the control points shifted off the
 * element; the verdict uses the p50 minus the control (see `excessOverControl`) against the two
 * targets. Points, `radius`, `half` and `shift` are in the pixels of `rgba`.
 */
export function measureElement(
  rgba,
  w,
  h,
  points,
  { radius = 4, half = 1, alpha = VEIL_ALPHA, shift = CONTROL_SHIFT } = {},
) {
  const veiled = veil(rgba, alpha);
  const ctl = controlPoints(points, shift);
  const run = (px, pts, target) =>
    summarise(
      pts.map((p) => pointContrast(px, w, h, p.x, p.y, radius, half)),
      target,
    );
  const raw = run(rgba, points, TARGET);
  const glare = run(veiled, points, TARGET_VEILED);
  const control = { raw: run(rgba, ctl, TARGET), veiled: run(veiled, ctl, TARGET_VEILED) };
  const excess = {
    raw: excessOverControl(raw.p50, control.raw.p50),
    veiled: excessOverControl(glare.p50, control.veiled.p50),
  };
  return {
    raw,
    veiled: glare,
    control,
    excess,
    pass: raw.n > 0 && control.raw.n > 0 && excess.raw >= TARGET && excess.veiled >= TARGET_VEILED,
  };
}
