// Pioneer 10 payload: "25 W at launch" was wrong — the four SNAP-19 RTGs gave ~155 W at launch
// (NASA PDS Pioneer 10 spacecraft description; Wikipedia Pioneer 10). Reported by the ar
// missions reviewer, 2026-10-31. Same fix in every locale (numbers-in-all-locales rule).
//   node …/pioneer10-rtg-power.mjs <outdir>   → <outdir>/<loc>.json for apply-edits
import fs from 'node:fs';
const LOCS = [
  'en-US',
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
];
const rel = 'missions/jupiter/pioneer-10.json';
fs.mkdirSync(process.argv[2], { recursive: true });
for (const loc of LOCS) {
  const doc = JSON.parse(fs.readFileSync(`i18n-src/${loc}/${rel}`, 'utf8'));
  const old = doc.payload;
  if (old.split('25 W').length !== 2) throw new Error(`${loc}: "25 W" not exactly once`);
  const nu = old.replace(/(?<![0-9.,])25 W/, '~155 W');
  fs.writeFileSync(
    `${process.argv[2]}/${loc}.json`,
    JSON.stringify([{ rel, at: 'payload', old, new: nu }]),
  );
}
console.log('ok');
