// Print each distinct untranslated English label once with its file and English note.
import fs from 'node:fs';
const S = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const R = 'i18n-src/en-US';
const seen = new Set();
for (const line of fs.readFileSync(`${S}/labels.tsv`, 'utf8').trim().split('\n')) {
  const m = line.match(/^[^\t]+\t(\S+) :: (\S+) — (.*)$/);
  if (!m || seen.has(m[3])) continue;
  seen.add(m[3]);
  const [, file, at] = m;
  const j = JSON.parse(fs.readFileSync(`${R}/${file}`, 'utf8'));
  const segs = at.split('.');
  const parent = segs.slice(0, -1).reduce((a, k) => a?.[k], j);
  console.log(`${m[3]}  [${file}]  ${(parent?.note ?? '').slice(0, 110)}`);
}
