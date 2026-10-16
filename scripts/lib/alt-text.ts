/**
 * Alt-text selection for static/data/image-alt-text/en-US.json (#389), shared by
 * scripts/build-image-alt-baseline.ts (writes it) and validate-data (gates it).
 * A caption that names the file rather than the picture is not alt-text.
 */

export interface ProvEntry {
  path: string;
  title?: string;
  caption_short?: string;
  description?: string;
}

const BOOKKEEPING = /^(NASA Images search result|Uncurated panel image|Curated panel image) —/;

/** A caption that names the file, not the picture: `File:Gaia 360.jpg`,
 *  `NASA Images search result — chandra / "chandra x-ray observatory"`. */
export function isNonDescriptiveAlt(alt: string): boolean {
  const a = alt.trim();
  return /^File:/i.test(a) || /\.(jpe?g|png|webp|gif|tiff?)$/i.test(a) || BOOKKEEPING.test(a);
}

/** Image path → stem shared by its crops and formats (`/images/x/01`). */
export function imageStem(p: string): string {
  return p.replace(/\.(1x1|4x3|16x9)(?=\.)/, '').replace(/\.[a-z0-9]+$/i, '');
}

/** Vision subject → alt-text: the first clause, without the model's hedging tail. */
export function subjectToAlt(subject: string): string {
  const first = subject
    .split(/\s+[—–]\s+|(?<=\.)\s/)[0]
    .trim()
    .replace(/[.;,]$/, '');
  return first.length > 160 ? first.slice(0, 157).replace(/\s+\S*$/, '') + '…' : first;
}

/** Readable fallback when there's no vision subject:
 *  `File:Beidou satellite mockup at FING UNLP 03.jpg` → `Beidou satellite mockup at FING UNLP`;
 *  `NASA Images search result — chandra / "chandra x-ray observatory"` → `Chandra x-ray observatory`;
 *  `Uncurated panel image — fleet-galleries/a7l` → `A7l`. */
export function cleanFilename(alt: string): string {
  const quoted = /"([^"]+)"/.exec(alt)?.[1];
  if (BOOKKEEPING.test(alt)) {
    const rest = (alt.split(' — ')[1] ?? alt).replace(/\s+slot\s+\d+$/i, '');
    const tail = quoted ?? rest.split(/[/\s]/).filter(Boolean).at(-1) ?? rest;
    const words = (quoted ? tail : tail.replace(/[-_]+/g, ' ')).trim();
    return words.charAt(0).toUpperCase() + words.slice(1);
  }
  return alt
    .replace(/^File:/i, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/\s*\(\d{6,}\)$/, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+\d{1,3}$/, '')
    .trim();
}

export function pickAlt(e: ProvEntry, vision: Map<string, string>): string {
  const caption =
    (e.caption_short && e.caption_short.trim()) ||
    (e.title && e.title.trim()) ||
    (e.description && e.description.trim().slice(0, 240)) ||
    '';
  if (!caption || !isNonDescriptiveAlt(caption)) return caption;
  const subject = vision.get(imageStem(e.path));
  return subject ? subjectToAlt(subject) : cleanFilename(caption);
}
