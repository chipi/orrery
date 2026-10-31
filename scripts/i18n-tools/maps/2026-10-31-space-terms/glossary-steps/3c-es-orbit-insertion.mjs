import fs from 'node:fs';
const GF = '/work/orrery/main/scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
g.term['orbit insertion'].es = 'inserción orbital';
g.sources['term:orbit insertion:es'] =
  'ESA Spanish (style guide §4: inserción orbital); site inserción orbital 28, inserción en órbita 27 — both accepted';
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
