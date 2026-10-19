// Non-Latin locales: string fields whose prose (links/code/urls stripped) still has English lowercase words.
import fs from 'node:fs';
import path from 'node:path';
const SKIPK =
  /^(type|kind|align|tab|layout|variant|style|role|format|mode|status|category|tier|color|shape|anchor|lang|era_key|ref|refs|tags|tag|target|link|links|route|component|id|slug|href|url|src|image|credit|source|path|section|key|type_key|icon|wiki|license|file|alt_src)$|(-wiki|-nasa|-mpc|-dawn|-newhorizons)$/;
const STOP = new Set([
  'km',
  'kg',
  'min',
  'sec',
  'max',
  'log',
  'sin',
  'cos',
  'tan',
  'deg',
  'rad',
  'mph',
  'kph',
  'wiki',
]);
const walk = (d) =>
  fs
    .readdirSync(d, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(path.join(d, e.name))
        : e.name.endsWith('.json')
          ? [path.join(d, e.name)]
          : [],
    );
const clean = (s) =>
  s
    .replace(/\/[a-z][\w\-/?=&.]*/g, '')
    .replace(/\b(arcsin|arccos|arctan|sqrt|mbar|ppbv|ppmv|kcal|cosmic|ispace)\b/gi, '')
    .replace(/\b[a-z]+_[a-z_]+\b/g, '')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/`[^`]*`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\b[a-z]+\/[\w\-/]+/g, '');
const words = (s) =>
  (clean(s).match(/(?<![A-Za-z\-.])[a-z]{4,}(?:-[a-z]+)*(?![A-Za-z])/g) ?? []).filter(
    (w) => !STOP.has(w),
  );
const out = {};
for (const l of process.argv.slice(2)) {
  let n = 0;
  const ex = [];
  const visit = (v, at, rel) => {
    if (typeof v === 'string') {
      const w = words(v);
      if (w.length) {
        n++;
        if (ex.length < 400) ex.push(`${rel}:${at} [${w.slice(0, 4).join(' ')}]`);
      }
    } else if (v && typeof v === 'object')
      for (const [k, x] of Object.entries(v)) {
        if (SKIPK.test(k)) continue;
        visit(x, at ? `${at}.${k}` : k, rel);
      }
  };
  for (const p of walk(`i18n-src/${l}`))
    visit(JSON.parse(fs.readFileSync(p, 'utf8')), '', p.slice(`i18n-src/${l}/`.length));
  visit(JSON.parse(fs.readFileSync(`messages/${l}.json`, 'utf8')), '', 'messages');
  out[l] = ex;
  console.log(l, n);
}
fs.writeFileSync(process.env.OUT ?? '/dev/null', JSON.stringify(out, null, 1));
