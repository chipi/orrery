import { localHref } from '$lib/locale';

/** One run of /science prose: plain text, a link from `[text](target)`, or a glossary term. */
export type InlineSegment =
  | { kind: 'text'; value: string }
  | { kind: 'link'; text: string; href: string }
  | { kind: 'term'; text: string; href: string };

/**
 * A glossary term to link in a paragraph: [term id, offset in the paragraph's plain text (link
 * syntax reduced to its text), the exact text]. Written by scripts/glossary-links.mjs into
 * static/data/glossary/<locale>.links.json (PRD-038 §5).
 */
export type TermLink = [id: string, at: number, text: string];

/**
 * Split /science prose into text and links. `[text](app:/route?query)` links an
 * app route, a target starting with `/` is a site path as written (some overlays
 * write `/science/tab/section`), anything else is a /science section (`tab/section`). Both go
 * through localHref so the reader stays in their locale. Translators keep the
 * parenthesised target as written.
 *
 * `terms` adds glossary term links inside the plain text (never inside an author's link). A term
 * is linked only where its text still sits at its offset, so an overlay edited after the build
 * renders without that link rather than with a wrong one.
 */
export function parseInline(para: string, terms: TermLink[] = []): InlineSegment[] {
  const segs: InlineSegment[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let plainAt = 0;
  let match: RegExpExecArray | null;
  const text = (value: string) => {
    segs.push(...withTerms(value, plainAt, terms));
    plainAt += value.length;
  };
  while ((match = re.exec(para)) !== null) {
    if (match.index > last) text(para.slice(last, match.index));
    const target = match[2];
    const href = target.startsWith('app:/')
      ? localHref(target.slice(4))
      : target.startsWith('/')
        ? localHref(target)
        : localHref(`/science/${target}`);
    segs.push({ kind: 'link', text: match[1], href });
    plainAt += match[1].length;
    last = match.index + match[0].length;
  }
  if (last < para.length) text(para.slice(last));
  return segs;
}

/** A plain-text run starting at `start` in the paragraph's plain text, with its term links. */
function withTerms(value: string, start: number, terms: TermLink[]): InlineSegment[] {
  const inside = terms
    .filter(([, at, t]) => at >= start && at + t.length <= start + value.length)
    .filter(([, at, t]) => value.startsWith(t, at - start))
    .sort((a, b) => a[1] - b[1]);
  const out: InlineSegment[] = [];
  let pos = 0;
  for (const [id, at, t] of inside) {
    const from = at - start;
    if (from < pos) continue;
    if (from > pos) out.push({ kind: 'text', value: value.slice(pos, from) });
    out.push({ kind: 'term', text: t, href: localHref(`/science/glossary#${id}`) });
    pos = from + t.length;
  }
  if (pos < value.length) out.push({ kind: 'text', value: value.slice(pos) });
  return out;
}
