/**
 * The text and size rules of an iconic-mission box on /explore (UXD-026): the milestone box
 * (`3/7 · 1979-03-05` header, the milestone name below) and the one mission box at Today.
 * Pure (a `measure` callback stands for the canvas), so it is unit-tested; the canvas drawing
 * and the sprite sizing per frame are in iconic-trajectory.ts.
 */

/** Header text height in CSS px (`--size-label`, UXD-002 floor). */
export const BOX_HEADER_PX = 11;
/** Body text height in CSS px (`--size-meta`): the same 12 px as every pin label (UXD-020). */
export const BOX_BODY_PX = 12;
export const BOX_PAD_X = 8;
export const BOX_PAD_Y = 5;
export const BOX_HEADER_LINE = 14;
export const BOX_BODY_LINE = 15;
export const BOX_ROW_GAP = 3;
/** Widest milestone box in CSS px: its name wraps to two lines inside it. */
export const BOX_MAX_W = 200;
/** The mission box carries a distance line of up to ~100 characters: wider, three lines. */
export const MISSION_BOX_MAX_W = 240;
export const MISSION_BOX_MAX_LINES = 3;
export const BOX_MAX_LINES = 2;
/** Gap in CSS px between a marker and the box lifted above it. */
export const BOX_GAP_PX = 12;

/** Width in CSS px of `text` drawn in the font the caller measures with. */
export type Measure = (text: string) => number;

/** `3/7 · 1979-03-05`: milestone number of total, then the data's own ISO date. Language-neutral. */
export function boxHeader(n: number, total: number, date: string): string {
  return `${n}/${total} · ${date}`;
}

const segmenter =
  typeof Intl !== 'undefined' && 'Segmenter' in Intl
    ? new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    : null;

/** A string as user-perceived characters (a Devanagari conjunct is one, not three). */
function graphemes(text: string): string[] {
  return segmenter ? Array.from(segmenter.segment(text), (s) => s.segment) : Array.from(text);
}

/** Cuts `word` into pieces of at most `maxW` (a word wider than the box, or a CJK line with no spaces). */
function breakWord(word: string, maxW: number, measure: Measure): string[] {
  const out: string[] = [];
  let cur = '';
  for (const g of graphemes(word)) {
    if (cur && measure(cur + g) > maxW) {
      out.push(cur);
      cur = g;
    } else cur += g;
  }
  if (cur) out.push(cur);
  return out;
}

export interface Wrapped {
  lines: string[];
  /** The text did not fit `maxLines` and the last line ends in an ellipsis. */
  truncated: boolean;
}

/**
 * Greedy word wrap to `maxW` (measured, never by character count), at most `maxLines` lines. A
 * label that fits is never cut; one that does not ends its last line in an ellipsis.
 */
export function wrapText(text: string, maxW: number, measure: Measure, maxLines: number): Wrapped {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const pieces = measure(word) > maxW ? breakWord(word, maxW, measure) : [word];
    for (const piece of pieces) {
      const joined = line ? `${line} ${piece}` : piece;
      if (!line || measure(joined) <= maxW) line = joined;
      else {
        lines.push(line);
        line = piece;
      }
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return { lines, truncated: false };
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1];
  while (last && measure(`${last}…`) > maxW) last = graphemes(last).slice(0, -1).join('');
  kept[maxLines - 1] = `${last.trimEnd()}…`;
  return { lines: kept, truncated: true };
}

/** One line cut to `maxW` with an ellipsis, or as it is when it fits (a long mission name in the header). */
export function ellipsize(text: string, maxW: number, measure: Measure): string {
  if (measure(text) <= maxW) return text;
  let cut = text;
  while (cut && measure(`${cut}…`) > maxW) cut = graphemes(cut).slice(0, -1).join('');
  return `${cut.trimEnd()}…`;
}

export interface BoxLayout {
  header: string;
  lines: string[];
  truncated: boolean;
  /** Box size in CSS px: the width follows the text, so there is no empty space. */
  w: number;
  h: number;
}

export interface LayoutOpts {
  header: string;
  body: string;
  measureHeader: Measure;
  measureBody: Measure;
  maxW?: number;
  maxLines?: number;
}

/** Size and wrapped lines of one box. */
export function layoutBox({
  header,
  body,
  measureHeader,
  measureBody,
  maxW = BOX_MAX_W,
  maxLines = BOX_MAX_LINES,
}: LayoutOpts): BoxLayout {
  const textMax = maxW - BOX_PAD_X * 2;
  const wrapped = wrapText(body, textMax, measureBody, maxLines);
  const fittedHeader = ellipsize(header, textMax, measureHeader);
  const widest = Math.max(measureHeader(fittedHeader), ...wrapped.lines.map((l) => measureBody(l)));
  const w = Math.ceil(Math.min(textMax, widest)) + BOX_PAD_X * 2;
  const h =
    BOX_PAD_Y * 2 +
    BOX_HEADER_LINE +
    (wrapped.lines.length ? BOX_ROW_GAP + wrapped.lines.length * BOX_BODY_LINE : 0);
  return { header: fittedHeader, lines: wrapped.lines, truncated: wrapped.truncated, w, h };
}
