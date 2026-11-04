// Chunk 4: this round's wrong forms into wrong-forms.json (the cross-file guard).
import fs from 'node:fs';

const F = 'scripts/i18n-tools/wrong-forms.json';
const w = JSON.parse(fs.readFileSync(F, 'utf8'));
const ADD = [
  {
    loc: 'nl',
    re: 'Hohmann-overdracht',
    why: 'overdracht is a handover of ownership; Hohmann-transferbaan',
  },
  {
    loc: 'ru',
    re: 'бесплатн\\p{L}* возврат',
    why: 'free of charge; свободный возврат (free-return)',
  },
  { loc: 'ja', re: '遊離帰還', why: '遊離 is chemical dissociation; 自由帰還' },
  { loc: 'hi', re: 'मुक्त-रिटर्न', why: 'English "return" transliterated; मुक्त-वापसी' },
];
for (const a of ADD) if (!w.forms.some((f) => f.loc === a.loc && f.re === a.re)) w.forms.push(a);
fs.writeFileSync(F, JSON.stringify(w, null, 2) + '\n');
