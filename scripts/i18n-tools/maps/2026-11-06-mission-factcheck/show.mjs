// Show one field of a mission across the 14 locale overlays, cut to the sentence matching a regex.
//   node show.mjs <body/id> <field e.g. dispatch | events.2.note> <regex> [maxLen]
import { readFileSync } from 'node:fs';
const LOCS = [
  'en-US',
  'ar',
  'de',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
];
const [path, field, rx, max = '260'] = process.argv.slice(2);
const re = new RegExp(rx, 'iu');
for (const l of LOCS) {
  let v = JSON.parse(readFileSync(`i18n-src/${l}/missions/${path}.json`, 'utf8'));
  for (const k of field.split('.')) v = v?.[k];
  if (typeof v !== 'string') {
    console.log(`${l}: <no ${field}>`);
    continue;
  }
  const parts = v.split(/(?<=[.!?。！？])\s*/u);
  const hit = parts.filter((p) => re.test(p));
  console.log(
    `${l}: ${(hit.length ? hit.join(' | ') : '<no match> ' + v.slice(0, 80)).slice(0, +max)}`,
  );
}
