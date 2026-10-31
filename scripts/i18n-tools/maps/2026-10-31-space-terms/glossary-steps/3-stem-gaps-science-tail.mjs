import fs from 'node:fs';
const GF = '/work/orrery/main/scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const ADD = {
  burn: {
    ru: ['работ\\p{L}* двигател', 'включа\\p{L}* двигател'],
    'sr-Cyrl': ['пал\\p{L}* мотор', 'рад\\p{L}* мотор'],
  },
  payload: { ru: ['полезн\\p{L}* нагруз'] },
  'orbit insertion': { ru: ['выход\\p{L}* \\p{L}+ на орбит'] },
  docking: { 'sr-Cyrl': ['прикључн\\p{L}* адаптер'] },
};
for (const [t, locs] of Object.entries(ADD))
  for (const [l, st] of Object.entries(locs))
    g.term[t]._match[l] = [...new Set([...g.term[t]._match[l], ...st])];
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
