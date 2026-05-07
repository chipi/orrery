// Build-time generator for the /science search index (RFC-011 step 9).
//
// Walks every section overlay in static/data/i18n/en-US/science/ and emits
// a single JSON file at static/data/science-index.json with one entry per
// section. Each entry holds the canonical URL plus the searchable terms:
// title, intro_sentence, and a few key terms extracted from the body.
//
// At runtime, src/lib/components/ScienceSearch.svelte fetches this index
// once on first ⌘K and runs a tiny fuzzy match against it.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
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

const SCIENCE_ROOT = 'static/data/i18n/en-US/science';
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

function buildIndex(): IndexEntry[] {
  const entries: IndexEntry[] = [];
  for (const file of listJsonFiles(SCIENCE_ROOT)) {
    const rel = file.slice(SCIENCE_ROOT.length + 1); // tab/section.json or _landing.json
    if (!rel.includes('/')) continue; // skip _landing.json
    const [tab, basename] = rel.split('/');
    if (!basename || basename.startsWith('_')) continue; // skip _intro.json
    const section = basename.replace(/\.json$/, '');
    const overlay = JSON.parse(readFileSync(file, 'utf8')) as Overlay;
    const haystack = [
      overlay.title,
      overlay.intro_sentence,
      ...overlay.body_paragraphs.slice(0, 1), // first body paragraph for term reach
    ]
      .join(' ')
      .toLowerCase();
    entries.push({
      tab,
      section,
      title: overlay.title,
      intro: overlay.intro_sentence,
      haystack,
    });
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
}

main();
