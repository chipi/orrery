/**
 * Text colour for a label on an arbitrary fill (agency / mission badges): white or
 * the page's near-black, whichever has the higher WCAG contrast. White on the
 * bright fills (ESA yellow, ISRO orange) was 1.9-2.8:1 against AA's 4.5.
 * Translucent fills are composited over the page background first.
 */
const PAGE_BG: [number, number, number] = [4, 4, 12];
export const DARK_TEXT = '#04040c';
export const LIGHT_TEXT = '#ffffff';

function parse(color: string): [number, number, number] | null {
  const c = color.trim().toLowerCase();
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(c);
  if (m) {
    const h = m[1].length === 3 ? [...m[1]].map((x) => x + x).join('') : m[1];
    return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec(c);
  if (!m) return null;
  let a = m[4] === undefined ? 1 : parseFloat(m[4]) / (m[4].endsWith('%') ? 100 : 1);
  a = Math.min(1, Math.max(0, a));
  return [1, 2, 3].map((i, k) => Math.round(parseFloat(m![i]) * a + PAGE_BG[k] * (1 - a))) as [
    number,
    number,
    number,
  ];
}

function luminance([r, g, b]: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(a: [number, number, number], b: [number, number, number]): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** White unless near-black text reads better on `fill`; unknown input → white (today's look). */
export function readableTextOn(fill: string | null | undefined): string {
  const rgb = fill ? parse(fill) : null;
  if (!rgb) return LIGHT_TEXT;
  return contrastRatio(rgb, [255, 255, 255]) >= contrastRatio(rgb, PAGE_BG)
    ? LIGHT_TEXT
    : DARK_TEXT;
}
