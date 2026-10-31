// The fleet misses left after the round was applied (2026-10-31): ru з/ж alternation
// (сблизится), ar ل + الدخول (للدخول في مدار), ar a name between عودة and إلى الغلاف الجوي.
import fs from 'node:fs';
const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const add = (term, loc, stems) =>
  (g.term[term]._match[loc] = [...new Set([...g.term[term]._match[loc], ...stems])]);
add('rendezvous', 'ru', ['сблиз\\p{L}*']);
add('orbit insertion', 'ar', ['لدخول (?:إلى|في) (?:ال)?مدار']);
add('entry', 'ar', ['عود\\S* (?:\\S+ ){0,2}إلى الغلاف الجوي']);
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
