// Known wrong forms (wrong-forms.json, from the glossary fix rounds) searched across everything a
// locale ships: every overlay under i18n-src/<loc>, messages/<loc>.json and the image alt text.
// term-drift only checks fields whose English uses a term, in five trees; a wrong form that one
// round found tends to be elsewhere too (one-word titles, other trees, the UI, alt text).
//   node scripts/i18n-tools/wrong-forms.mjs [--json]
// Prints one line per hit and exits 1 when there is any.
import fs from 'node:fs';
import path from 'node:path';

const LIST = 'scripts/i18n-tools/wrong-forms.json';
const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];

export function findWrongForms() {
  const { forms } = JSON.parse(fs.readFileSync(LIST, 'utf8'));
  const hits = [];
  for (const f of forms) {
    const re = new RegExp(f.re, 'gu');
    const files = [
      ...walk(`i18n-src/${f.loc}`),
      `messages/${f.loc}.json`,
      `static/data/image-alt-text/${f.loc}.json`,
    ].filter((p) => fs.existsSync(p) && !(f.allow ?? []).some((a) => p.startsWith(a)));
    for (const p of files)
      for (const m of fs.readFileSync(p, 'utf8').matchAll(re))
        hits.push({ loc: f.loc, file: p, form: m[0], why: f.why });
  }
  return hits;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const hits = findWrongForms();
  if (process.argv.includes('--json')) console.log(JSON.stringify(hits, null, 2));
  else for (const h of hits) console.log(`${h.loc}\t${h.file}\t${h.form}\t${h.why}`);
  console.log(`wrong forms: ${hits.length}`);
  process.exit(hits.length ? 1 : 0);
}
