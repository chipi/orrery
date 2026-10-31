// Edits that lose a number of the English: numbers >= --min (default 10) in the English text
// that the new text does not have, after the usual spellings are brought to one form.
//   node scripts/i18n-tools/number-loss.mjs <edits.json> <work.json> [--min=10]
// Normalised before comparing: thousands separators (, . space nbsp narrow-nbsp before three
// digits: 35,786 = 35 786 = 35.786), the decimal comma (2,8 = 2.8) and the CJK multipliers
// (zh 万 亿 万亿, ja 万 億, ko 만 억: 33万 = 330000, 1.5亿 = 150000000). Prints
// "rel:at  missing {number: count}" per field and the total.
import { enByKey, isMain, keyOf, parseArgs, readJson } from './garble-lib.mjs';

const MULT = { 万亿: 1e12, 万: 1e4, 亿: 1e8, 億: 1e8, 만: 1e4, 억: 1e8 };

export function normalise(t) {
  t = t.replace(/(?<=\d)[,. \u00a0\u202f](?=\d{3}(?!\d))/g, '');
  t = t.replace(/(?<=\d),(?=\d)/g, '.');
  return t.replace(/(\d+(?:\.\d+)?)\s*(万亿|万|亿|億|만|억)/g, (m, n, u) => {
    const v = Number((+n * MULT[u]).toPrecision(12));
    return v < 1e15 ? String(v) : m;
  });
}

export function numbers(t, min = 10) {
  const c = new Map();
  for (const n of normalise(t).match(/\d+(?:\.\d+)?/g) ?? [])
    if (parseFloat(n) >= min) c.set(n, (c.get(n) ?? 0) + 1);
  return c;
}

export function missingNumbers(en, nu, min = 10) {
  const have = numbers(nu, min);
  const miss = {};
  for (const [n, k] of numbers(en, min))
    if (k > (have.get(n) ?? 0)) miss[n] = k - (have.get(n) ?? 0);
  return miss;
}

if (isMain(import.meta.url)) {
  const { pos, one } = parseArgs(process.argv.slice(2));
  if (pos.length < 2) {
    console.error('usage: number-loss.mjs <edits.json> <work.json> [--min=10]');
    process.exit(2);
  }
  const min = +one('min', 10);
  const edits = readJson(pos[0]);
  const en = enByKey(readJson(pos[1]));
  let n = 0;
  for (const e of edits) {
    const miss = missingNumbers(en.get(keyOf(e)) ?? e.en, e.new, min);
    if (Object.keys(miss).length) {
      n++;
      console.log(
        `${keyOf(e)}  missing {${Object.entries(miss)
          .map(([k, v]) => `"${k}": ${v}`)
          .join(', ')}}`,
      );
    }
  }
  console.log(`fields with a missing number >=${min}: ${n} of ${edits.length}`);
}
