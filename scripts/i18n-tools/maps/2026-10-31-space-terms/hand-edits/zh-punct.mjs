// zh-CN essays + science: ASCII , : ; written after a Chinese character (or after a markdown
// link that a Chinese character follows) become full-width ，：；. Numbers, URLs and link
// targets never match (they are preceded by ASCII). Writes an apply-edits file.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const R = 'i18n-src/zh-CN';
// Output file: argv[2], else one in a fresh private temp dir (record script; it ran once on 2026-10-31).
const OUT =
  process.argv[2] ??
  path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'orrery-hand-')), 'zh-punct.json');
const FW = { ',': '，', ':': '：', ';': '；' };
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
  });
function leaves(o, prefix = '', out = []) {
  if (typeof o === 'string') out.push([prefix, o]);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
const CJK = '\\u4e00-\\u9fff\\u3400-\\u4dbf';
const afterHan = new RegExp(`([${CJK}）」』])([,:;]) ?`, 'g');
const afterLink = new RegExp(`(\\]\\([^)\\s]+\\))([,:;]) ?(?=[${CJK}])`, 'g');
const edits = [];
let n = 0;
for (const tree of ['essays', 'science']) {
  for (const f of walk(path.join(R, tree))) {
    for (const [at, s] of leaves(JSON.parse(fs.readFileSync(f, 'utf8')))) {
      let count = 0;
      const nu = s
        .replace(afterHan, (_, a, p) => (count++, a + FW[p]))
        .replace(afterLink, (_, a, p) => (count++, a + FW[p]));
      if (nu !== s) {
        edits.push({ rel: path.relative(R, f), at, old: s, new: nu });
        n += count;
      }
    }
  }
}
fs.writeFileSync(OUT, JSON.stringify(edits, null, 1));
console.log(`${n} marks in ${edits.length} fields → ${OUT}`);
const ex = edits[0];
if (ex) console.log('example old:', ex.old.slice(0, 120), '\nexample new:', ex.new.slice(0, 120));
