// Builds the /glossary page data: static/data/glossary/<locale>.json, one file per locale
// with every technical term (native-terms.json `term`), its name and one-sentence definition
// in that locale (i18n-src/<loc>/glossary/terms.json, en-US fallback), the /science page that
// explains it (`_read_more`), and the site pages that use it most ("used on", counted on the
// English text the way term-drift.mjs finds a term). Run by `npm run build`; adding a term to
// the glossary adds it to the page.
//   node scripts/build-glossary.mjs [--check]   (--check: report problems, write nothing)
import fs from 'node:fs';
import path from 'node:path';
import { enRegex, isText, prose } from './i18n-tools/term-match.mjs';

export const LOCALES = [
  'en-US',
  'ru',
  'ja',
  'zh-CN',
  'ko',
  'hi',
  'ar',
  'sr-Cyrl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pt-BR',
];
const USED_ON = 5;
const TREES = ['science', 'essays', 'programs', 'missions', 'fleet'];
const OUT = 'static/data/glossary';

/**
 * The form a term is filed under in its language's index: Arabic dictionaries ignore the
 * article ال (otherwise almost every term sits under ا).
 */
export const sortForm = (loc, name) => (loc === 'ar' ? name.replace(/^ال(?=\S{2})/u, '') : name);

/** Index letter: the first letter of the sort form, upper-cased where the script has case. */
export const initialOf = (loc, name) => {
  const c = [...sortForm(loc, name)][0].toLocaleUpperCase(loc);
  // the alif forms (أ إ آ ا) are one letter in an Arabic index
  return loc === 'ar' ? c.replace(/[أإآ]/u, 'ا') : c;
};

export const slug = (term) => term.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** Overlay path → site route, or null for files that are not a page of their own. */
export function routeOf(rel) {
  const p = rel.replace(/\.json$/, '').split('/');
  if (p[0] === 'science') {
    // the landing is the overview of the whole section, not a page about one term
    if (p.length === 2) return null;
    if (p.length === 3) return p[2] === '_intro' ? `/science/${p[1]}` : `/science/${p[1]}/${p[2]}`;
    return null;
  }
  if (p[0] === 'essays' && p.length === 2) return `/essays/${p[1]}`;
  if (p[0] === 'programs' && p.length === 2) return `/programs/${p[1]}`;
  if (p[0] === 'missions' && p.length === 3) return `/missions?id=${p[2]}`;
  if (p[0] === 'fleet' && p.length === 3) return `/fleet?id=${p[2]}`;
  return null;
}

const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];
const strings = (o, out = []) => {
  if (typeof o === 'string') out.push(o);
  else if (o && typeof o === 'object') for (const v of Object.values(o)) strings(v, out);
  return out;
};
const readJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null);
const pageTitle = (loc, rel) => {
  const d = readJson(`i18n-src/${loc}/${rel}`) ?? {};
  const en = readJson(`i18n-src/en-US/${rel}`) ?? {};
  // vehicle and mission names usually stay in English and live only in static/data
  const data = readJson(`static/data/${rel}`) ?? {};
  return d.title ?? d.name ?? en.title ?? en.name ?? data.name ?? null;
};

/** Pages that use each term most, on the English text: { term: [rel, …] }. */
export function usedOn(terms) {
  const pages = [];
  for (const tree of TREES)
    for (const f of walk(`i18n-src/en-US/${tree}`)) {
      const rel = path.relative('i18n-src/en-US', f);
      if (!routeOf(rel)) continue;
      pages.push({
        rel,
        text: strings(JSON.parse(fs.readFileSync(f, 'utf8')))
          .filter(isText)
          .map(prose),
      });
    }
  const out = {};
  for (const [term, e] of Object.entries(terms)) {
    const g = enRegex(term, e, 'gi');
    const scored = [];
    for (const p of pages) {
      const n = p.text.reduce((s, t) => s + (t.match(g)?.length ?? 0), 0);
      if (n) scored.push([p.rel, n]);
    }
    scored.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    out[term] = scored.slice(0, USED_ON).map(([rel]) => rel);
  }
  return out;
}

export function build({ write = true } = {}) {
  const terms = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).term;
  const used = usedOn(terms);
  const enDefs = readJson('i18n-src/en-US/glossary/terms.json') ?? {};
  const problems = [];
  const files = {};
  for (const loc of LOCALES) {
    const defs = readJson(`i18n-src/${loc}/glossary/terms.json`) ?? {};
    const list = Object.entries(terms).map(([term, e]) => {
      const name = loc === 'en-US' ? term : e[loc];
      const definition = defs[term] ?? enDefs[term];
      if (!definition) problems.push(`${loc}: no definition for "${term}"`);
      else if (loc !== 'en-US' && !defs[term])
        problems.push(`${loc}: "${term}" falls back to English`);
      const page = (rel) => {
        const title = pageTitle(loc, rel);
        if (!title) problems.push(`${loc}: no title for ${rel}`);
        return { href: routeOf(rel), title };
      };
      return {
        id: slug(term),
        name,
        initial: initialOf(loc, name),
        definition,
        readMore: e._read_more ? page(`science/${e._read_more}.json`) : null,
        usedOn: used[term].filter((rel) => rel !== `science/${e._read_more}.json`).map(page),
      };
    });
    const collator = new Intl.Collator(loc, { sensitivity: 'base' });
    list.sort((a, b) => collator.compare(sortForm(loc, a.name), sortForm(loc, b.name)));
    files[loc] = { terms: list };
  }
  if (write) {
    fs.mkdirSync(OUT, { recursive: true });
    for (const [loc, data] of Object.entries(files))
      fs.writeFileSync(`${OUT}/${loc}.json`, JSON.stringify(data) + '\n');
  }
  return { files, problems };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes('--check');
  const { files, problems } = build({ write: !check });
  for (const p of problems) console.error(p);
  console.log(
    `glossary: ${Object.keys(files).length} locales × ${files['en-US'].terms.length} terms` +
      (check ? ' (check only)' : ` → ${OUT}/`),
  );
  if (problems.length) process.exit(1);
}
