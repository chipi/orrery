// nl compounds as an explicit list instead of open \p{L}*baan / \p{L}+trap / \p{L}*stoot:
// the open stems let typos and garble pass ("haloaanbaan", "lanchbaan", "uitstoten").
// (?<!\p{L}) keeps a listed compound from matching inside a longer garbled word.
import fs from 'node:fs';
const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const swap = (term, oldStems, nu) => {
  const m = g.term[term]._match;
  m.nl = [...m.nl.filter((s) => !oldStems.includes(s)), ...nu];
};
swap(
  'orbit',
  ['\\p{L}*ba(?:an|nen)\\b'],
  [
    '(?<!\\p{L})(?:aarde?|maan|mars|venus|zonne|zons|halo|doel|overdrachts|parkeer|transfer|kepler|kerkhof|wetenschaps|werk|eind|polaire|ellips)ba(?:an|nen)\\b',
  ],
);
swap(
  'stage',
  ['\\p{L}+trap\\b'],
  [
    '(?<!\\p{L})(?:afdalings|daal|boven|opstijg|kern|kick|onder|raket|vastestof|vastebrandstof|kruis)trap(?:pen)?\\b',
  ],
);
swap(
  'burn',
  ['\\p{L}*stoot\\b', '\\p{L}*stoten\\b'],
  ['(?<!\\p{L})(?:rem|motor|landings|vertrek|aankomst|correctie|stuw)?sto(?:ot|ten)\\b'],
);
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
