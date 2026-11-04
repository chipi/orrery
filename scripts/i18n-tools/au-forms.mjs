/**
 * The English "AU" left in locales that write the astronomical unit their own way
 * (docs/guides/i18n-style-guide.md §1a). The 2026-10-31 switch moved fr / es / it / pt-BR from
 * UA to au next to a quantity but did not touch an English "AU" left in the text; this does.
 *
 *   pt-BR, es, it, fr — a quantity or a unit of measure ("em AU", "de AU", "d'AU", "di AU",
 *                       "en AU") takes the symbol au; the unit named as a noun ("a AU", "Una AU",
 *                       the article title) takes the abbreviation UA, as es / fr / it already do.
 *   ja                — the symbol au everywhere (記号: au).
 *   de AE, ru а. е., sr-Cyrl АЈ, ar و.ف — the locale's form everywhere (each already used
 *                       68–160 times).
 *
 *   node scripts/i18n-tools/au-forms.mjs [--write]      (dry run lists every change)
 *
 * Only whole-word "AU" in string values changes; "NASA/UA" (University of Arizona) never matches.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const ROMANCE = {
  'pt-BR': /(\b(?:em|de)\s)AU\b/g,
  es: /(\b(?:en|de)\s)AU\b/g,
  fr: /(\b(?:en\s|d'|d’))AU\b/g,
  it: /(\b(?:in|di)\s)AU\b/g,
};
const EVERYWHERE = { ja: 'au', de: 'AE', ru: 'а. е.', 'sr-Cyrl': 'АЈ', ar: 'و.ف' };
const fixString = (loc, s) => {
  if (!/(?<![A-Za-z])AU(?![A-Za-z])/.test(s)) return s;
  // An all-caps label ("ALLUMAGE AU PÉRIGÉE") holds the word au/à, not the unit.
  if (ROMANCE[loc] && s === s.toUpperCase()) return s;
  if (EVERYWHERE[loc]) return s.replace(/(?<![A-Za-z])AU(?![A-Za-z])/g, EVERYWHERE[loc]);
  return s.replace(ROMANCE[loc], '$1au').replace(/\bAU\b/g, 'UA');
};

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.json') ? [`${d}/${e.name}`] : [],
  );
const fix = (loc, v, hits) => {
  if (typeof v === 'string') {
    const s = fixString(loc, v);
    if (s !== v) hits.push([v, s]);
    return s;
  }
  if (Array.isArray(v)) return v.map((x) => fix(loc, x, hits));
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(loc, x, hits)]));
  return v;
};

for (const loc of [...Object.keys(ROMANCE), ...Object.keys(EVERYWHERE)]) {
  let n = 0;
  for (const f of walk(`i18n-src/${loc}`)) {
    const hits = [];
    const out = fix(loc, JSON.parse(readFileSync(f, 'utf8')), hits);
    if (!hits.length) continue;
    for (const [a, b] of hits) {
      n += (a.match(/\bAU\b/g) ?? []).length;
      if (!WRITE)
        for (const m of b.matchAll(/.{0,22}\b(au|UA|AE)\b.{0,12}/g))
          if (a.includes(m[0].replace(/\b(au|UA|AE)\b/, 'AU')))
            console.log(`${loc} ${f.slice(9)}: …${m[0]}…`);
    }
    if (WRITE) writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
  }
  console.log(`${loc}: ${n} AU${WRITE ? ' — written' : ''}`);
}
