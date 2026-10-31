// Stem gaps found in the round-1 "keep" reasons: the reviewer judged the field correct
// because it uses the binding form inflected or a variant the stems did not cover.
import fs from 'node:fs';
const GF = '/work/orrery/main/scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const ADD = {
  perigee: { ru: ['периге'] }, // перигее, перигея
  apogee: { ru: ['апоге', 'апоцентр'] },
  propellant: {
    ar: ['وقود\\p{L}* (ال)?دافع'], // وقودًا دافعًا, للوقود الدافع, الوقودان الدافعان, وقودها الدافع
    ru: ['рабоч\\p{L}* тел'], // рабочее тело, electric propulsion
  },
  thrust: { ar: ['دفع'] }, // indefinite دفعًا, دفعه, قوة دفع
  'specific impulse': { ar: ['دفع\\p{L}* نوعي'] },
  burn: { ar: ['[أيت]شعل'] }, // أشعل / يشعل / تشعل المحرك
  'gravity assist': {
    ar: ['مساعدات (ال)?جاذبية'],
    'pt-BR': ['assist\\p{L}* gravitacion\\p{L}*'],
  },
  inclination: { ar: ['ميول'] },
  entry: { ar: ['العودة إلى الغلاف الجوي', 'دخول'] },
  docking: { ar: ['إرساء'] },
  'orbit insertion': { ar: ['بلوغ (ال)?مدار'] },
  stage: {
    ko: ['(?:^|[\\s0-9(])단(?:에서는|에서|에는|에|은|는|이|을|를|의|도|과|으로|만)?(?![가-힣])'],
    nl: ['\\p{L}+trap\\b'],
  },
  payload: { fr: ['charges?-utiles?'], 'pt-BR': ['cargas?-úte?is'] },
  orbit: { nl: ['\\p{L}*ba(?:an|nen)\\b'] },
  descent: { ru: ['посадочн'], hi: ['उतर'] },
};
for (const [term, locs] of Object.entries(ADD))
  for (const [loc, stems] of Object.entries(locs)) {
    const e = g.term[term];
    if (!e) throw new Error(term);
    e._match[loc] = [...new Set([...(e._match[loc] ?? []), ...stems])];
    for (const s of stems) new RegExp(s, 'iu');
  }
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
