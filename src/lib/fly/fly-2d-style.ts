/**
 * The 2D canvas's line and star values in one place (UXD-042, G-10a). Rings and anchors are
 * neutral white so they read as orbits; the planet identity colour stays on the live body and
 * its label. Every line is composited over BG in `fly-2d-style.test.ts` against the 3:1 floor
 * (WCAG 1.4.11 used as a yardstick).
 */
export type Rgb = readonly [number, number, number];

export const FLY_2D_BG = '#04040c';
export const FLY_2D_BG_RGB: Rgb = [4, 4, 12];

export interface Line2d {
  rgb: Rgb;
  alpha: number;
  width: number;
}

export const FLY_2D_STYLE = {
  /** Orbit rings: Earth, the destination, the Moon's. */
  ring: { rgb: [255, 255, 255], alpha: 0.45, width: 1.25 } satisfies Line2d,
  /** LAUNCH / ARRIVAL anchor rings. */
  anchor: { rgb: [255, 255, 255], alpha: 0.7, width: 1.2 } satisfies Line2d,
  /** Not-yet-flown arcs. 0.45 measured 1.82 and 1.91:1, under the floor; 0.75 clears 3:1. */
  futureOut: { rgb: [80, 112, 255], alpha: 0.75, width: 1.5 } satisfies Line2d,
  futureRet: { rgb: [153, 102, 255], alpha: 0.75, width: 1.5 } satisfies Line2d,
  /** Flown arcs: solid. */
  pastOut: { rgb: [80, 112, 255], alpha: 1, width: 2 } satisfies Line2d,
  pastRet: { rgb: [153, 102, 255], alpha: 1, width: 2 } satisfies Line2d,
  star: { rgb: [210, 215, 255], alphaBase: 0.15, alphaStep: 0.09 },
  label: { font: "bold 11px 'Space Mono', monospace", color: 'rgba(255,255,255,0.85)' },
} as const;

export function rgba(rgb: Rgb, alpha: number): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

/** `#rrggbb` to channels. */
export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function lineStyle(l: Line2d): string {
  return rgba(l.rgb, l.alpha);
}

/** Alpha of the i-th star (i % 5 picks one of five steps, 0.15 to 0.51). */
export function starAlpha(i: number): number {
  return Number((FLY_2D_STYLE.star.alphaBase + (i % 5) * FLY_2D_STYLE.star.alphaStep).toFixed(2));
}

export function compositeOver(rgb: Rgb, alpha: number, bg: Rgb = FLY_2D_BG_RGB): Rgb {
  return rgb.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha))) as unknown as Rgb;
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(rgb: Rgb): number {
  return 0.2126 * channel(rgb[0]) + 0.7152 * channel(rgb[1]) + 0.0722 * channel(rgb[2]);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Contrast of a line stroke (its colour at its alpha) over the canvas background. */
export function lineContrast(l: Line2d | { rgb: Rgb; alpha: number }): number {
  return contrastRatio(compositeOver(l.rgb, l.alpha), FLY_2D_BG_RGB);
}
