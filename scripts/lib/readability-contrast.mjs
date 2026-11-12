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
 * Contrast of the element at (x, y): the brightest pixel of the 3 x 3 block around the point
 * (the projected point can sit up to a pixel off the drawn line) against the median of the
 * 8 pixels `radius` px around it (a line crosses at most two of them, so the median is the
 * background). Returns null when the point or its ring is off the frame.
 */
export function pointContrast(rgba, w, h, x, y, radius = 4) {
  const cx = Math.round(x);
  const cy = Math.round(y);
  let best = -1;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
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

/** Contrast of every point, raw and after the veil, with the verdict against the two targets. */
export function measureElement(rgba, w, h, points, { radius = 4, alpha = VEIL_ALPHA } = {}) {
  const veiled = veil(rgba, alpha);
  const raw = summarise(
    points.map((p) => pointContrast(rgba, w, h, p.x, p.y, radius)),
    TARGET,
  );
  const glare = summarise(
    points.map((p) => pointContrast(veiled, w, h, p.x, p.y, radius)),
    TARGET_VEILED,
  );
  return {
    raw,
    veiled: glare,
    pass: raw.n > 0 && raw.p50 >= TARGET && glare.p50 >= TARGET_VEILED,
  };
}
