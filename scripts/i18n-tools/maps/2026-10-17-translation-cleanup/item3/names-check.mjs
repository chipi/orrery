// For each English name: which glossary keys already cover it (exact key, or a full-name key
// ending in it), and in which locales the glossary has no form.
//   node names-check.mjs "Grechko" "Lake Tengiz" ...
import fs from 'node:fs';

const LOCS = [
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
const g = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'));
const entries = Object.entries(g)
  .filter(([c]) => !c.startsWith('_') && c !== 'sources')
  .flatMap(([c, o]) => Object.entries(o).map(([k, v]) => [c, k, v]));
for (const name of process.argv.slice(2)) {
  const hits = entries.filter(([, k]) => k === name || k.endsWith(` ${name}`));
  if (!hits.length) {
    console.log(`NEW      ${name}`);
    continue;
  }
  for (const [c, k, v] of hits) {
    const missing = LOCS.filter((l) => !v?.[l]);
    console.log(
      `${k === name ? 'HAVE   ' : 'FULLKEY'}  ${name} → ${c}:"${k}" missing [${missing.join(' ')}]`,
    );
  }
}
