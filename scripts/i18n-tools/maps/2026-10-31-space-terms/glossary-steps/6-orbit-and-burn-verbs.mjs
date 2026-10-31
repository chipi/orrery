// Essays round 1 keep reasons (2026-10-31): the ordinary verbs for "to orbit" and the
// engine-firing verbs the reviewers kept as variants in several locales. Checked with
// term-widen-check.mjs afterwards.
import fs from 'node:fs';
const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const add = (term, loc, stems) =>
  (g.term[term]._match[loc] = [...new Set([...g.term[term]._match[loc], ...stems])]);
add('orbit', 'de', ['umkreis\\p{L}*', '(?<!\\p{L})kreis(?:t|en|te|ten)\\b']);
add('orbit', 'fr', ['gravit(?:e|ent|ait|aient|er|ant)\\b']);
add('orbit', 'it', ['gira\\p{L}* attorno']);
add('orbit', 'nl', ['cirkel(?:t|en|de|den)\\b']);
add('orbit', 'ru', ['обраща\\p{L}*']);
add('orbit', 'sr-Cyrl', ['круж\\p{L}*', 'обилаз\\p{L}* око']);
add('orbit', 'ko', ['(?:둘레|주위)를 ?(?:도는|돈|돌)', '도는']);
add('orbit', 'ja', ['周回', '(?:周り|周囲)を回']);
add('orbit', 'zh-CN', ['公转', '绕\\p{L}{0,3}运行']);
add('burn', 'nl', ['ontstoken']);
add('burn', 'pt-BR', ['acend\\p{L}* (?:o|os) motor']);
add('trajectory', 'nl', ['koerscorrecti\\p{L}*']);
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
// the two essays misses left after the round: sr plural маневри (vowel drop), ru adjective
// between полезная and нагрузка
const g2 = JSON.parse(fs.readFileSync(GF, 'utf8'));
const add2 = (term, loc, stems) =>
  (g2.term[term]._match[loc] = [...new Set([...g2.term[term]._match[loc], ...stems])]);
add2('gravity assist', 'sr-Cyrl', ['гравитацион\\p{L}* маневр']);
add2('payload', 'ru', ['полезн\\p{L}* (?:\\p{L}+ )?нагруз']);
fs.writeFileSync(GF, JSON.stringify(g2, null, 2) + '\n');
