// Remove spaces between two CJK/kana characters in zh-CN/ja strings of the given files
// (left where a Latin name sat between native words before step 0 converted it).
import fs from 'node:fs';
const CJK = '\\p{Script=Han}\\p{Script=Hiragana}\\p{Script=Katakana}ー';
const re = new RegExp(`([${CJK}])[ \\u00A0]+(?=[${CJK}])`, 'gu');
let n = 0;
const fix = (v) => {
  if (typeof v === 'string') {
    const o = v.replace(re, '$1');
    if (o !== v) n++;
    return o;
  }
  if (Array.isArray(v)) return v.map(fix);
  if (v && typeof v === 'object')
    return Object.fromEntries(
      Object.entries(v).map(([k, x]) => [k, /^(l|u)$/.test(k) ? x : fix(x)]),
    );
  return v;
};
for (const p of process.argv.slice(2)) {
  if (!/i18n-src\/(zh-CN|ja)\//.test(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const before = n;
  const o = fix(j);
  if (n !== before) fs.writeFileSync(p, JSON.stringify(o, null, 2) + '\n');
}
console.log(`${n} strings cleaned`);
