// Latin-script locales: make plain-word stems inflection tolerant (plural/gender endings),
// so a correct "asistencias gravitatorias" or "cargas úteis" is not counted as a miss.
import fs from 'node:fs';
const GF = '/work/orrery/main/scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const LATIN = ['es', 'fr', 'it', 'pt-BR', 'nl', 'de'];
const IRREGULAR = { 'pt-BR': ['úteis', 'orbitais'], es: ['útiles'], fr: ['utiles'], it: ['utili'] };
const word = (w) => {
  if (!/^[\p{L}'’-]+$/u.test(w)) return w; // already a pattern piece
  const n = [...w].length;
  if (n >= 6) return [...w].slice(0, n - 2).join('') + '\\p{L}*';
  return w;
};
let changed = 0;
for (const e of Object.values(g.term)) {
  for (const loc of LATIN) {
    const stems = e._match[loc] ?? [];
    const out = new Set(stems);
    for (const s of stems) {
      if (/[\\()[\]|?*+{}^$]/.test(s)) continue; // leave real regexes alone
      out.add(s.split(' ').map(word).join(' '));
    }
    if (out.size !== stems.length) changed++;
    e._match[loc] = [...out];
  }
}
for (const [loc, ws] of Object.entries(IRREGULAR))
  g.term.payload._match[loc] = [
    ...new Set([
      ...g.term.payload._match[loc],
      ...ws
        .filter((w) => /ú|u/.test(w))
        .map((w) => `carg\\p{L}* ${w}|caric\\p{L}* ${w}|charges? ${w}`),
    ]),
  ];
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('entries widened:', changed);
