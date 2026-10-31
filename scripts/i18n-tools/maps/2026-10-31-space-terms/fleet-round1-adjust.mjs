// Fleet term round 1 (2026-10-31): adjustments after reading the five reviewers' lists, and
// the stems their keep reasons showed. Run from the repo root:  node …/fleet-round1-adjust.mjs <workdir>
import fs from 'node:fs';
const W = process.argv[2];
const load = (loc) => JSON.parse(fs.readFileSync(`${W}/${loc}-edits.json`, 'utf8'));
const save = (loc, e) => fs.writeFileSync(`${W}/${loc}-edits.json`, JSON.stringify(e, null, 1));
// fr: Atlas's "thin-skinned booster" is the whole launcher; "propulseur d'appoint" is a strap-on.
{
  const e = load('fr');
  const d = e.find((x) => x.decision === 'change' && x.find === 'Le moteur à peau mince');
  if (!d) throw new Error('fr atlas edit not found');
  d.replace = 'Le lanceur à peau mince';
  d.why = 'booster = the whole launcher here (Atlas), not a strap-on';
  save('fr', e);
}
// hi: sun-synchronous is सूर्य-तुल्यकालिक (12× on the site); सूर्य-स्थैतिक (sun-static) is wrong.
{
  const e = load('hi');
  const d = e.find((x) => x.decision === 'change' && x.find === 'सूर्य-स्थैतिक प्रक्षेपण');
  if (!d) throw new Error('hi taiyuan edit not found');
  d.replace = 'सूर्य-तुल्यकालिक कक्षा के प्रक्षेपण';
  save('hi', e);
}
for (const f of fs.readdirSync(W).filter((f) => f.endsWith('-edits.json'))) {
  const e = JSON.parse(fs.readFileSync(`${W}/${f}`, 'utf8'));
  const kept = e.filter(
    (d) => !(d.decision === 'keep' && /image|link target|non-prose/i.test(d.why ?? '')),
  );
  fs.writeFileSync(`${W}/${f}`, JSON.stringify(kept, null, 1));
}
const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const add = (term, loc, stems) =>
  (g.term[term]._match[loc] = [...new Set([...g.term[term]._match[loc], ...stems])]);
add('descent', 'ar', ['نزول']);
add('entry', 'ar', ['العودة عبر الغلاف الجوي']);
add('rendezvous', 'ar', ['تلتقي', 'يلتقي', 'التقت', 'التقى']);
add('descent', 'de', ['abzusteigen', 'abgestiegen']);
add('inclination', 'de', ['inklinier\\p{L}*']);
add('docking', 'es', ['atracar']);
add('stage', 'ko', ['(?:하강|상승)단', '[0-9]단식']);
add('descent', 'nl', ['af te dalen', 'daalde\\p{L}* af']);
add('flyby', 'nl', ['voorbijvloog', 'voorbijvlogen']);
add('inclination', 'sr-Cyrl', ['нагнут\\p{L}*']);
add('propellant', 'sr-Cyrl', ['горив\\p{L}*']);
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
// The tail after applying is glossary-steps/8-fleet-tail.mjs.
