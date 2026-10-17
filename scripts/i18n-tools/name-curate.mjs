// Curate the name inventory: drop rows whose Wikidata class says the text means a vehicle,
// a deity, a fiction or a feature TYPE, then apply the hand decisions in
// maps/…/names-curation.tsv (drop / keep / full-only). Writes the curated TSV that
// name-forms.mjs reads, and prints what was dropped and why.
//   node scripts/i18n-tools/name-curate.mjs <classes.tsv> <curation.tsv> <out.tsv>
import fs from 'node:fs';

const [inv, cur, out] = process.argv.slice(2);
const DROP_CLASS =
  /probe|lander|orbiter|\brover\b|Moonport|Moonbase|spacecraft constellation|satellite internet|star catalogue|star number|deity|Star Trek|fiction|Star Wars|shared planet|phase of the moon|atmosphere of|artificial planet|feature type|geographical feature|camera|terra nullius|drainage basin|Lunar Module|Roving Vehicle|moon rock/i;
const decide = new Map(
  fs
    .readFileSync(cur, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split('\t'))
    .map(([run, d, why]) => [run, { d, why }]),
);
const rows = fs
  .readFileSync(inv, 'utf8')
  .trim()
  .split('\n')
  .map((l) => l.split('\t'));
// The scanner strips trailing dots, so "John F. Kennedy" arrives as "John F Kennedy":
// give back the dot after an initial (or "St") when that is how the English text has it.
const corpus = (function all(d) {
  return fs
    .readdirSync(d, { withFileTypes: true })
    .map((e) =>
      e.isDirectory()
        ? all(`${d}/${e.name}`)
        : e.name.endsWith('.json')
          ? fs.readFileSync(`${d}/${e.name}`, 'utf8')
          : '',
    )
    .join('\n');
})('i18n-src/en-US');
for (const r of rows) {
  const dotted = r[1].replace(/\b([A-Z]|St)(?= )/g, '$1.');
  if (dotted !== r[1] && !corpus.includes(r[1]) && corpus.includes(dotted)) r[1] = dotted;
}
const kept = [];
const dropped = { class: 0, hand: 0, surname: 0 };
for (const r of rows) {
  const [, run, , , cls] = r;
  const h = decide.get(run);
  if (h?.d === 'keep') {
    kept.push(r);
    continue;
  }
  if (h?.d === 'drop') {
    dropped.hand++;
    continue;
  }
  if (h?.d === 'full-only') {
    dropped.surname++;
    continue;
  }
  if (DROP_CLASS.test(cls)) {
    dropped.class++;
    continue;
  }
  kept.push(r);
}
fs.writeFileSync(out, kept.map((r) => r.join('\t')).join('\n') + '\n');
console.log(
  `kept ${kept.length}; dropped by class ${dropped.class}, by hand ${dropped.hand}, surname-only ${dropped.surname}`,
);
const unseen = [...decide.keys()].filter((k) => !rows.some((r) => r[1] === k));
if (unseen.length) console.log('curation rows with no inventory match:', unseen.join(', '));
