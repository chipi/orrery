// One name per language in running text: replace the other spellings of a name with the
// one the gallery page sets (hi नेपच्यून / नेप्च्यून → वरुण). Rows are "regex \t replacement"
// (JavaScript regex, flags gu); the output is an edits file for apply-edits.mjs, which
// checks every string before writing.
//   node scripts/i18n-tools/variant-sweep.mjs <loc> <map.tsv> <out-edits.json>
import fs from 'node:fs';
import path from 'node:path';

const [loc, mapFile, out] = process.argv.slice(2);
const rows = fs
  .readFileSync(mapFile, 'utf8')
  .split('\n')
  .filter((l) => l.trim() && !l.startsWith('#'))
  .map((l) => {
    const [re, to] = l.split('\t');
    return [new RegExp(re, 'gu'), to];
  });
const root = `i18n-src/${loc}`;
const edits = [];
const hits = rows.map(() => 0);
const walk = (dir) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (f.endsWith('.json')) {
      const rel = path.relative(root, p);
      const visit = (v, at) => {
        if (typeof v === 'string') {
          let s = v;
          rows.forEach(([re, to], i) => {
            s = s.replace(re, (...m) => {
              hits[i]++;
              return to.replace(/\$(\d)/g, (_, k) => m[+k] ?? '');
            });
          });
          if (s !== v) edits.push({ rel, at, old: v, new: s });
        } else if (Array.isArray(v)) v.forEach((x, i) => visit(x, at ? `${at}.${i}` : `${i}`));
        else if (v && typeof v === 'object')
          for (const [k, x] of Object.entries(v)) visit(x, at ? `${at}.${k}` : k);
      };
      visit(JSON.parse(fs.readFileSync(p, 'utf8')), '');
    }
  }
};
walk(root);
fs.writeFileSync(out, JSON.stringify(edits, null, 1) + '\n');
rows.forEach(([re], i) => console.log(`${hits[i]}\t${re.source}`));
console.log(`${loc}: ${edits.length} strings`);
