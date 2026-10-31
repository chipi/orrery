// Splits a work file (a JSON list) into n parts for n translators.
//   node scripts/i18n-tools/split-work.mjs <file.json> <n>
// Writes <file>.part1.json … <file>.partN.json beside it, ceil(len/n) items each, in order.
import { isMain, readJson, writeJson } from './garble-lib.mjs';

export const splitWork = (items, n) => {
  const size = Math.ceil(items.length / n);
  return Array.from({ length: n }, (_, i) => items.slice(i * size, (i + 1) * size));
};

if (isMain(import.meta.url)) {
  const [src, n] = process.argv.slice(2);
  if (!src || !(+n >= 1)) {
    console.error('usage: split-work.mjs <file.json> <n>');
    process.exit(2);
  }
  splitWork(readJson(src), +n).forEach((part, i) => {
    const out = src.replace(/\.json$/, `.part${i + 1}.json`);
    writeJson(out, part);
    console.log(out, part.length);
  });
}
