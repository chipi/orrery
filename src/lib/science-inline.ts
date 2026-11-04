import { localHref } from '$lib/locale';

/** One run of /science prose: plain text, or a link from `[text](target)`. */
export type InlineSegment =
  { kind: 'text'; value: string } | { kind: 'link'; text: string; href: string };

/**
 * Split /science prose into text and links. `[text](app:/route?query)` links an
 * app route, a target starting with `/` is a site path as written (some overlays
 * write `/science/tab/section`), anything else is a /science section (`tab/section`). Both go
 * through localHref so the reader stays in their locale. Translators keep the
 * parenthesised target as written.
 */
export function parseInline(para: string): InlineSegment[] {
  const segs: InlineSegment[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(para)) !== null) {
    if (match.index > last) segs.push({ kind: 'text', value: para.slice(last, match.index) });
    const target = match[2];
    const href = target.startsWith('app:/')
      ? localHref(target.slice(4))
      : target.startsWith('/')
        ? localHref(target)
        : localHref(`/science/${target}`);
    segs.push({ kind: 'link', text: match[1], href });
    last = match.index + match[0].length;
  }
  if (last < para.length) segs.push({ kind: 'text', value: para.slice(last) });
  return segs;
}
