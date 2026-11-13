/**
 * The ring colour of a round list thumbnail (L45, UXD-025). Kept out of `entity-thumb.ts` so the
 * EntityThumb component, which only draws a ring, does not pull in that file's thumbs manifest.
 */

/** The ring of a row with no identity colour (the C4 neutral). */
export const THUMB_NEUTRAL_RING = 'rgba(255,255,255,0.5)';

/** True for a `#rgb` / `#rrggbb` colour whose hue is teal or cyan (160 to 200 degrees). */
export function isTealOrCyan(color: string): boolean {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return false;
  const h = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1];
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d < 0.1) return false; // grey
  const hue =
    60 * (max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4);
  return hue >= 160 && hue <= 200;
}

/**
 * The ring colour for a row's identity colour: the colour itself, or the neutral when the row has
 * none or its colour is teal or cyan (UXD-001: no teal ring; the dot or swatch elsewhere in the row
 * keeps the data colour).
 */
export function ringColor(identity: string | null | undefined): string {
  return !identity || isTealOrCyan(identity) ? THUMB_NEUTRAL_RING : identity;
}
