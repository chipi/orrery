// graded-<loc>.json findings -> apply-edits files (old = current repo value; skip if fix == current or field missing).
import fs from 'node:fs';
const [dir, out] = process.argv.slice(2);
const get = (o, at) => at.split('.').reduce((a, k) => a?.[k], o);
for (const l of [
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
]) {
  const j = JSON.parse(fs.readFileSync(`${dir}/graded-${l}.json`, 'utf8'));
  const edits = [];
  let skip = 0,
    miss = 0;
  for (const f of j.findings) {
    const [rel, at] = f.key.split(' :: ');
    const cur =
      rel === 'messages'
        ? JSON.parse(fs.readFileSync(`messages/${l}.json`, 'utf8'))[at]
        : get(JSON.parse(fs.readFileSync(`i18n-src/${l}/${rel}`, 'utf8')), at);
    if (typeof cur !== 'string') {
      miss++;
      continue;
    }
    if (!f.fix || f.fix === cur) {
      skip++;
      continue;
    }
    edits.push({ rel, at, old: cur, new: f.fix });
  }
  fs.writeFileSync(`${out}/graded4-${l}.json`, JSON.stringify(edits, null, 2) + '\n');
  console.log(l, 'edits', edits.length, 'same', skip, 'missing', miss);
}
