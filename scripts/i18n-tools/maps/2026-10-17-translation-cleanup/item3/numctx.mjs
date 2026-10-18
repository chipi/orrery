// For each fix that introduces a number found in neither the English nor the old text, print
// that number in context in the new text, and the English sentence(s) for comparison.
//   node numctx.mjs fixes/<loc>-<seg>-NN.json ...
import fs from 'node:fs';

const en = JSON.parse(fs.readFileSync('messages/en-US.json', 'utf8'));
const get = (o, at) => at.split('.').reduce((a, k) => a?.[k], o);
const nums = (s) =>
  (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) =>
    n
      .replace(/[.,](?=\d{3}\b)/g, '')
      .replace(',', '.')
      .replace(/^0+(?=\d)/, ''),
  );
for (const f of process.argv.slice(2))
  for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const src =
      (e.rel === 'messages'
        ? en[e.at]
        : get(JSON.parse(fs.readFileSync(`i18n-src/en-US/${e.rel}`, 'utf8')), e.at)) ?? '';
    const known = new Set([...nums(src), ...nums(e.old)]);
    const fresh = [...new Set(nums(e.new).filter((n) => !known.has(n)))];
    if (!fresh.length) continue;
    console.log(`\n${e.rel}:${e.at} — new-only ${fresh.join(' ')}`);
    for (const n of fresh)
      for (const m of e.new.matchAll(new RegExp(`.{0,25}(?<![\\d.,])${n}(?![\\d.,]).{0,15}`, 'gu')))
        console.log(`   NEW ${m[0]}`);
    console.log(`   EN  ${src.slice(0, 260)}`);
  }
