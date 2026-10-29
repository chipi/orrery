// Build-time generator for the /science search index (RFC-011 step 9).
//
// Walks every section overlay in i18n-src/en-US/science/ and emits
// a single JSON file at static/data/science-index.json with one entry per
// section. Each entry holds the canonical URL plus the searchable terms:
// title, intro_sentence, and a few key terms extracted from the body.
//
// At runtime, src/lib/components/ScienceSearch.svelte fetches this index
// once on first ⌘K and runs a tiny fuzzy match against it.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type Overlay = {
  title: string;
  intro_sentence: string;
  body_paragraphs: string[];
};

type IndexEntry = {
  /** Tab id (orbits, transfers, etc.). */
  tab: string;
  /** Section id (vis-viva, hohmann-transfer, etc.). */
  section: string;
  /** Display title of the section. */
  title: string;
  /** First-sentence preview shown in search results. */
  intro: string;
  /** Lower-cased searchable text — title + intro + a few body terms. */
  haystack: string;
};

// i18n overlay source moved out of static/ (ADR-079 D2 / #377).
const SCIENCE_ROOT = 'i18n-src/en-US/science';
const OUT_PATH = 'static/data/science-index.json';

function listJsonFiles(dir: string): string[] {
  if (!statSync(dir).isDirectory()) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      out.push(...listJsonFiles(path));
    } else if (name.endsWith('.json')) {
      out.push(path);
    }
  }
  return out;
}

/** One index per locale: the locale's science overlays (falling back to en-US per
 *  field), so search shows and matches the reader's language. A non-English
 *  haystack also carries the English title, so English terms still find a section. */
export function buildIndex(locale = 'en-US'): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const file of listJsonFiles(SCIENCE_ROOT)) {
    const rel = file.slice(SCIENCE_ROOT.length + 1); // tab/section.json or _landing.json
    if (!rel.includes('/')) continue; // skip _landing.json
    const [tab, basename] = rel.split('/');
    if (!basename || basename.startsWith('_')) continue; // skip _intro.json
    const section = basename.replace(/\.json$/, '');
    const en = JSON.parse(readFileSync(file, 'utf8')) as Overlay;
    const locPath = join('i18n-src', locale, 'science', rel);
    const loc: Partial<Overlay> =
      locale !== 'en-US' && existsSync(locPath)
        ? (JSON.parse(readFileSync(locPath, 'utf8')) as Partial<Overlay>)
        : {};
    const title = loc.title || en.title;
    const intro = loc.intro_sentence || en.intro_sentence;
    const body = loc.body_paragraphs?.length ? loc.body_paragraphs : en.body_paragraphs;
    const haystack = [
      title,
      intro,
      ...body.slice(0, 1), // first body paragraph for term reach
      ...(locale === 'en-US' ? [] : [en.title]),
    ]
      .join(' ')
      .toLowerCase();
    entries.push({ tab, section, title, intro, haystack });
  }
  // Stable order — by tab then section id — so the on-disk index diffs cleanly.
  entries.sort((a, b) => a.tab.localeCompare(b.tab) || a.section.localeCompare(b.section));
  return entries;
}

function main(): void {
  const entries = buildIndex();
  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`✓ ${entries.length} science index entries written → ${OUT_PATH}`);
  // Per-locale indexes: static/data/science-index.<locale>.json.
  for (const locale of readdirSync('i18n-src')) {
    if (locale === 'en-US' || !statSync(join('i18n-src', locale)).isDirectory()) continue;
    const out = OUT_PATH.replace(/\.json$/, `.${locale}.json`);
    writeFileSync(out, JSON.stringify(buildIndex(locale), null, 2) + '\n', 'utf8');
  }
  console.log('✓ per-locale science indexes written');
}

if (process.argv[1]?.endsWith('build-science-index.ts')) main();
