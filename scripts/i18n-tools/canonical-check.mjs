// Pass 1 check over canonical-names.tsv: per locale, the page names still in Latin script
// in a non-Latin locale (by surface), and glossary entries that disagree with the page.
//   node scripts/i18n-tools/canonical-check.mjs <canonical-names.tsv> [surfaceRegex]
import fs from 'node:fs';

const [file, surf = '.'] = process.argv.slice(2);
const lines = fs
  .readFileSync(file, 'utf8')
  .trim()
  .split('\n')
  .map((l) => l.split('\t'));
const [head, ...rows] = lines;
const LOCS = head.slice(3);
const NONLATIN = new Set(['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl']);
const G = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).body;
const re = new RegExp(surf);
for (const [i, loc] of LOCS.entries()) {
  if (!NONLATIN.has(loc)) continue;
  const latin = rows.filter(
    (r) =>
      re.test(r[0]) &&
      /^[^\p{Script=Cyrillic}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Devanagari}\p{Script=Arabic}]*$/u.test(
        r[3 + i],
      ),
  );
  console.log(
    `${loc}: ${latin.length} names fully Latin — ${latin.map((r) => r[0].split('/').pop()).join(', ')}`,
  );
}
for (const r of rows.filter((x) => x[0].startsWith('planets/') && x[1] === 'name')) {
  const g = G[r[2]];
  if (!g) continue;
  const diff = LOCS.map((l, i) =>
    g[l] && g[l] !== r[3 + i] ? `${l}: page "${r[3 + i]}" vs glossary "${g[l]}"` : '',
  ).filter(Boolean);
  if (diff.length) console.log(`${r[2]} — ${diff.join(' | ')}`);
}
