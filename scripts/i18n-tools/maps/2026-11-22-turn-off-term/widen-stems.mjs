// Stem gaps the star-clusters translations hit (0.9.11 C5): hi «खुल\p{L}*» cannot match the plural
// «खुले» (the vowel sign is a combining mark); ar open cluster had no definite or plural-definite form.
//   node scripts/i18n-tools/maps/2026-11-22-turn-off-term/widen-stems.mjs   (idempotent)
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const oc = g.term['open cluster']._match;
oc.hi = oc.hi.map((s) => s.replace('खुल\\p{L}*', 'खुल[\\p{L}\\p{M}]*'));
for (const s of ['(?:ال)?عنقود (?:ال)?مفتوح', 'عناقيد (?:ال)?مفتوح\\p{L}*'])
  if (!oc.ar.includes(s)) oc.ar.push(s);
fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');

// "main-sequence turn-off" is its own term now: the main-sequence sense no longer counts it again
// (a translation that names only the turn-off — Abknickpunkt, afbuigpunt — is complete).
const g2 = JSON.parse(fs.readFileSync(F, 'utf8'));
g2.term['main sequence']._en = '\\bmain[- ]sequence\\b(?![- ]turn-?off)';
fs.writeFileSync(F, JSON.stringify(g2, null, 2) + '\n');
