// Chunk 4: nl «Hohmann-overdracht» (overdracht is a handover of ownership) → «Hohmann-transferbaan»
// and hi «मुक्त-रिटर्न» (English "return" transliterated) → «मुक्त-वापसी», in every file the locale
// ships. Longest forms first so the compounds are not cut.
import fs from 'node:fs';
import path from 'node:path';

const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(d, e.name);
    return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
  });
const SETS = {
  nl: [
    ['Hohmann-overdrachtsbaan', 'Hohmann-transferbaan'],
    ['Hohmann-overdrachtsellips', 'Hohmann-transferellips'],
    ['Hohmann-overdrachten', 'Hohmann-transferbanen'],
    ['Hohmann-overdracht', 'Hohmann-transferbaan'],
  ],
  hi: [['मुक्त-रिटर्न', 'मुक्त-वापसी']],
};
for (const [loc, pairs] of Object.entries(SETS)) {
  const files = [
    ...walk(`i18n-src/${loc}`),
    `messages/${loc}.json`,
    `static/data/image-alt-text/${loc}.json`,
  ];
  let n = 0;
  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    let s = fs.readFileSync(f, 'utf8');
    const before = s;
    for (const [a, b] of pairs) {
      n += s.split(a).length - 1;
      s = s.split(a).join(b);
    }
    if (s !== before) fs.writeFileSync(f, s);
  }
  console.log(loc, n);
}
