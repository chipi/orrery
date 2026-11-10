import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * Counts read from the same source the page renders, so a spec that checks
 * "N links / N cards / N pills" follows the page instead of a literal.
 */
const root = process.cwd();

function read(rel: string): string {
  return readFileSync(path.resolve(root, rel), 'utf8');
}

/** `<a class="footer-link ...">` anchors in the layout's footer. */
export function footerLinkCount(): number {
  const src = read('src/routes/+layout.svelte');
  const footer = src.slice(src.indexOf('<footer'), src.indexOf('</footer>'));
  return (footer.match(/<a\s[^>]*class="footer-link[\s"]/g) ?? []).length;
}

/** Cards and section headings of the landing `grid` array in src/routes/+page.svelte. */
export function landingGridCounts(): { cards: number; headings: number } {
  const src = read('src/routes/+page.svelte');
  const start = src.indexOf('const grid: GridItem[]');
  const end = src.indexOf(']);', start);
  const block = src.slice(start, end);
  return {
    cards: (block.match(/^\s+glyph:/gm) ?? []).length,
    headings: (block.match(/\{ heading:/g) ?? []).length,
  };
}

/** One manifest per decade under static/data/launches-historic. */
export function historicDecadeCount(): number {
  return readdirSync(path.resolve(root, 'static/data/launches-historic')).filter((f) =>
    /^\d{4}-\d{4}\.json$/.test(f),
  ).length;
}

/** Annotations with an explanation for one site in surface-hotspots.json — the rows SiteAnnotationList shows. */
export function explainedAnnotationCount(siteId: string): number {
  const doc = JSON.parse(read('static/data/surface-hotspots.json')) as {
    entries: Record<string, { hotspot_annotations?: { explain?: unknown }[] }>;
  };
  return (doc.entries[siteId]?.hotspot_annotations ?? []).filter((a) => a.explain).length;
}
