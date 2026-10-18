// Fixes that introduce a number found in neither the English nor the old translation
// (leading zeros and thousands separators normalised). Prints CHECK lines to read.
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
      e.rel === 'messages'
        ? en[e.at]
        : get(JSON.parse(fs.readFileSync(`i18n-src/en-US/${e.rel}`, 'utf8')), e.at);
    const known = new Set([...nums(src ?? ''), ...nums(e.old)]);
    const fresh = [...new Set(nums(e.new).filter((n) => !known.has(n)))];
    // schema maxLength (static/data/schemas): validate-data rejects the file otherwise
    const max = [
      [/^fleet\//, /(^|\.)tagline$/, 140],
      [/^science\//, /^intro_sentence$/, 240],
      [/^science\/.*_intro\.json$/, /^headline$/, 160],
    ].find(([r, a]) => r.test(e.rel) && a.test(e.at))?.[2];
    if (max && e.new.length > max)
      console.log(`CHECK ${e.rel}:${e.at} | ${e.at} ${e.new.length} > ${max}`);
    if (fresh.length) console.log(`CHECK ${e.rel}:${e.at} | new-only [${fresh.join(' ')}]`);
  }
