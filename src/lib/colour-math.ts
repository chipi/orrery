/**
 * Colour maths for palette checks: WCAG contrast, hue, colour-vision-deficiency simulation
 * (Machado 2009, severity 1) and CIEDE2000. Used by the agency palette tests; not shipped.
 */
import { contrastRatio } from './readable-text';

export type RGB = [number, number, number];

export const PAGE_BG = '#04040c';
/** The mission card fill (rgba(10,10,22,.95)) composited on the page background. */
export const CARD_BG = '#0a0a16';

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
}

export function contrast(a: string, b: string): number {
  return contrastRatio(hexToRgb(a), hexToRgb(b));
}

/** Hue in degrees (0-360) of a hex colour; chroma-less colours return 0. */
export function hueOf(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return Math.round((h * 60 + 360) % 360);
}

/** True for hues the UI palette reserves (cyan / teal, 160 to 200 degrees) with real chroma. */
export function isCyanTeal(hex: string): boolean {
  const [r, g, b] = hexToRgb(hex);
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const h = hueOf(hex);
  return chroma > 24 && h >= 160 && h <= 200;
}

const lin = (v: number) => {
  const s = v / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const unlin = (v: number) => {
  const c = Math.min(1, Math.max(0, v));
  return Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055));
};

export function toHex([r, g, b]: RGB): string {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

/** Colour-vision deficiency simulation, Machado et al. 2009, severity 1.0, in linear RGB. */
export type Cvd = 'normal' | 'protan' | 'deutan' | 'tritan';
const CVD_MATRIX: Record<Exclude<Cvd, 'normal'>, number[]> = {
  protan: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998,
  ],
  deutan: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881,
  ],
  tritan: [
    1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039,
  ],
};
export function simulate(hex: string, kind: Cvd): string {
  if (kind === 'normal') return hex;
  const [r, g, b] = hexToRgb(hex).map(lin);
  const m = CVD_MATRIX[kind];
  return toHex([
    unlin(m[0] * r + m[1] * g + m[2] * b),
    unlin(m[3] * r + m[4] * g + m[5] * b),
    unlin(m[6] * r + m[7] * g + m[8] * b),
  ]);
}

function toLab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(lin);
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

/** CIEDE2000 colour difference (about 2.3 is a just-noticeable difference). */
export function deltaE(hexA: string, hexB: string): number {
  const [L1, a1, b1] = toLab(hexA);
  const [L2, a2, b2] = toLab(hexB);
  const rad = Math.PI / 180;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const h1p = C1p === 0 ? 0 : (Math.atan2(b1, a1p) / rad + 360) % 360;
  const h2p = C2p === 0 ? 0 : (Math.atan2(b2, a2p) / rad + 360) % 360;
  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * rad);
  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp: number;
  if (C1p * C2p === 0) hbp = h1p + h2p;
  else if (Math.abs(h1p - h2p) <= 180) hbp = (h1p + h2p) / 2;
  else hbp = (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2;
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * rad) +
    0.24 * Math.cos(2 * hbp * rad) +
    0.32 * Math.cos((3 * hbp + 6) * rad) -
    0.2 * Math.cos((4 * hbp - 63) * rad);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const Sc = 1 + 0.045 * Cbp;
  const Sh = 1 + 0.015 * Cbp * T;
  const Rt = -Math.sin(2 * dTheta * rad) * Rc;
  return Math.sqrt(
    (dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh),
  );
}

/** Smallest delta-E of a pair under normal vision and the three CVD simulations. */
export function minPairDelta(a: string, b: string): { kind: Cvd; de: number } {
  let best: { kind: Cvd; de: number } = { kind: 'normal', de: Infinity };
  for (const kind of ['normal', 'protan', 'deutan', 'tritan'] as Cvd[]) {
    const de = deltaE(simulate(a, kind), simulate(b, kind));
    if (de < best.de) best = { kind, de };
  }
  return best;
}
