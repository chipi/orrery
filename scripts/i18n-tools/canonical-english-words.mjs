// Pass 1 helper: entity-page names that a locale left identical to English although
// the name holds ordinary English words (descriptor words a native page would translate:
// "Space Telescope", "Lander", "Module"). Vehicle proper names themselves stay (origin rule).
//   node scripts/i18n-tools/canonical-english-words.mjs <canonical-names.tsv> <dict.txt>
import fs from 'node:fs';
const [file, dictFile] = process.argv.slice(2);
const dict = new Set(fs.readFileSync(dictFile, 'utf8').split('\n'));
const [head, ...rows] = fs
  .readFileSync(file, 'utf8')
  .trim()
  .split('\n')
  .map((l) => l.split('\t'));
const LOCS = head.slice(3);
const byName = new Map();
for (const r of rows) {
  if (
    r[1] !== 'name' ||
    r[0].startsWith('planets/') ||
    /sites\//.test(r[0]) ||
    r[0].includes('launch-site')
  )
    continue;
  const words = (r[2].match(/[A-Za-z]{3,}/g) || []).filter((w) =>
    dict.has(w.toLowerCase()) && /^[A-Z]/.test(w) === false ? true : dict.has(w.toLowerCase()),
  );
  const ordinary = words.filter((w) => !/^[A-Z]{2,}$/.test(w) && dict.has(w.toLowerCase()));
  if (!ordinary.length) continue;
  const same = LOCS.filter((l, i) => r[3 + i] === r[2]);
  if (same.length) byName.set(`${r[0]}\t${r[2]}`, `${ordinary.join(',')}\t${same.join(' ')}`);
}
for (const [k, v] of byName) console.log(`${k}\t${v}`);
