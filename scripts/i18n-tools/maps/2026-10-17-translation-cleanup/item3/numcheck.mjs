// Fixes whose digits changed: list old/new/en number sets; flag a new number absent from en.
import fs from 'node:fs';
const en = JSON.parse(fs.readFileSync('messages/en-US.json', 'utf8'));
const get = (o, at) => at.split('.').reduce((a, k) => a?.[k], o);
const nums = (s) =>
  (s.match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) =>
    n.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.'),
  );
for (const f of process.argv.slice(2))
  for (const e of JSON.parse(fs.readFileSync(f, 'utf8'))) {
    const a = nums(e.old).sort().join(' '),
      b = nums(e.new).sort().join(' ');
    if (a === b) continue;
    const src =
      e.rel === 'messages'
        ? en[e.at]
        : get(JSON.parse(fs.readFileSync(`i18n-src/en-US/${e.rel}`, 'utf8')), e.at);
    const ens = new Set(nums(src ?? ''));
    const bad = nums(e.new).filter((n) => !ens.has(n));
    console.log(
      `${bad.length ? 'CHECK' : 'ok   '} ${e.at} | old[${a}] new[${b}] en[${[...ens].join(' ')}]`,
    );
  }
