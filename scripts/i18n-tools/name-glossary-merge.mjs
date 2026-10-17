// Merge the reviewed native forms (name-forms.mjs output) into native-terms.json:
// classes body / feature / star / person. Every English run the inventory tied to an item
// becomes a key. A person's bare surname takes the last word of each locale's full form
// (ガガーリン from ユーリイ・ガガーリン); names written surname-first (Yang Liwei) get no
// surname key. Existing glossary entries are never overwritten. Hand corrections come
// from an overrides TSV: qid \t locale \t form ("-" removes the form).
// Surface features come hand-built from a features TSV (key + 13 locale columns, "-" =
// none), because a bare Wikipedia title ("Шеклтон") would drop the crater word.
// Bare surnames come from a surnames TSV (surname \t full-name key [\t path regex]): the
// last word of each locale's full form; a path regex limits the key (_only).
//   node scripts/i18n-tools/name-glossary-merge.mjs <forms.tsv> <overrides.tsv> <features.tsv> <surnames.tsv> [--dry]
import fs from 'node:fs';

const [formsTsv, overTsv, featTsv, surTsv, dry] = process.argv.slice(2);
const P = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(P, 'utf8'));
const over = new Map();
if (overTsv && fs.existsSync(overTsv))
  for (const l of fs.readFileSync(overTsv, 'utf8').split('\n')) {
    if (!l || l.startsWith('#')) continue;
    // an optional 4th column limits the row to one English key ("James Lovell" ≠ "Jim Lovell")
    const [qid, loc, form, run = ''] = l.split('\t');
    over.set(`${qid}\t${loc}\t${run}`, form);
  }
const LOCS = [
  'ru',
  'ja',
  'zh-CN',
  'ko',
  'hi',
  'ar',
  'sr-Cyrl',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'pt-BR',
];
const CLASS = { body: 'body', feature: 'feature', star: 'star', person: 'person' };
const existing = new Set(
  Object.entries(g)
    .filter(([k, v]) => k !== 'sources' && !k.startsWith('_') && v && typeof v === 'object')
    .flatMap(([, v]) => Object.keys(v)),
);
const added = { body: 0, feature: 0, star: 0, person: 0 };
const surnameOf = (full) => full.split(/[\s・·‧]+/).at(-1);
const BAYER =
  /^(Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega) [A-Z]/;
const BAYER_ANY =
  /^(Alpha|Alfa|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega) [A-Z]/;
const LATIN = /^(de|fr|es|it|nl|pt-BR)$/;
const CATALOGUE =
  /^(NGC|IC|GJ|Gliese|Abell|Messier|M|ESO|HCG|Barnard|PGC|Sh|WR|HD|HIP|HR|Gum|RCW|Westerlund|Segue|Dragonfly|SN|Cas) ?\d/;
for (const l of fs.readFileSync(formsTsv, 'utf8').trim().split('\n')) {
  const [kind, qid, enwiki, runs, female, slavic, ...cells] = l.split('\t');
  if (kind === 'feature') continue;
  const cls = CLASS[kind];
  const forms = {};
  const bayerForms = {};
  for (const c of cells) {
    const i = c.indexOf('=');
    const loc = c.slice(0, i);
    const f = c.slice(i + 1).replace(/^(label|title):/, '');
    // a star cell is "name¦designation"
    const [nm, by] = f.split('¦');
    forms[loc] = nm;
    if (by !== undefined) bayerForms[loc] = by;
  }
  const enFull = enwiki.replace(/\s*\(.*\)$/, '');
  const fullWords = enFull.split(' ');
  for (const r of runs.split('|')) {
    const run = r.replace(/:\d+$/, '');
    if (existing.has(run)) continue;
    // a Bayer or catalogue designation that is only an alias ("Alpha Virginis" for Spica,
    // "NGC 224" for the Andromeda Galaxy) must not turn into the common name
    // (a star's Bayer designation takes the designation as each language writes it)
    const bayerRun = kind === 'star' && BAYER.test(run);
    if (run !== enFull && !bayerRun && (BAYER.test(run) || CATALOGUE.test(run))) continue;
    const entry = {};
    const bareSurname = kind === 'person' && !run.includes(' ') && fullWords.length > 1;
    if (bareSurname && fullWords[0] === run) continue; // surname-first name
    const isCat = CATALOGUE.test(run);
    const num = run.match(/\d+/)?.[0];
    // a Chinese name has no separator in zh (杨利伟): its words are not first/last names
    const chinese = kind === 'person' && /^[\u3400-\u9fff]{2,4}$/.test(forms['zh-CN'] ?? '');
    for (const loc of LOCS) {
      const o = over.get(`${qid}\t${loc}\t${run}`) ?? over.get(`${qid}\t${loc}\t`);
      let f = o ?? (bayerRun ? bayerForms[loc] : forms[loc]);
      if (!f || f === '-') continue;
      // sr-Cyrl takes Cyrillic only ("Jan Ort" is a Latin label)
      if (loc === 'sr-Cyrl' && !/[Ѐ-ӿ]/.test(f)) continue;
      // in Latin-script locales a person's name changes only where it is transliterated
      // (Juri Gagarin, Youri Gagarine) — never a nickname into the formal name
      // ("Wally Schirra" stays, not "Walter Schirra")
      if (
        kind === 'person' &&
        LATIN.test(loc) &&
        o === undefined &&
        slavic !== '1' &&
        surnameOf(f.replace(/[ ,]+(Jr\.?|II|III|IV)$/, '')) === surnameOf(run)
      )
        continue;
      // a two-word English name keeps two words: "Уолтер Марти Ширра" → first + last,
      // after dropping a "Jr." suffix (not a hyphenated first name, not a Chinese name)
      if (
        kind === 'person' &&
        run.split(' ').length === 2 &&
        o === undefined &&
        !run.split(' ')[0].includes('-') &&
        !chinese
      ) {
        const sep = /[・·]/.test(f) ? (f.match(/[・·]/) ?? [' '])[0] : ' ';
        const t = f.split(/[\s・·]+/).filter((w) => !/^(Jr\.?|II|III|IV|الابن|주니어)$/.test(w));
        if (t.length > 2) f = `${t[0]}${sep}${t.at(-1)}`;
      }
      const v = bareSurname ? surnameOf(f) : f;
      if (!v || v === run) continue;
      // a designation keeps its number ("Глизе 445"); a name never shrinks to a
      // catalogue number ("Pinwheel Galaxy" ≠ "M101" / "Месје 101")
      if (isCat && !(num && v.includes(num))) continue;
      if (!isCat && (CATALOGUE.test(v) || /^(M ?\d|Месје|Melotte|Sharpless|30 Doradus)/.test(v)))
        continue;
      // …nor into a designation it did not carry ("Comet Kohoutek" ≠ "C/1973 E1",
      // "Torifune" ≠ "2001 CC21", "Hartley 2" ≠ "103P/Hartley" where the name is written
      // the same in Latin script)
      if (!run.includes('/') && /^\p{Nd}*[A-ZА-ЯCP]?\/|^\d{4} [A-Z]{2}/u.test(v)) continue;
      if (!run.includes('/') && LATIN.test(loc) && v.includes('/')) continue;
      if (!/\d{4} [A-Z]{2}/.test(run) && /\d{4} [A-Z]{2}\d*/.test(v)) continue;
      // an X-ray or infrared catalogue label ("2XMM J143933.0-605008") is no name
      if (/\bJ\d{4,}/.test(v) && !/\bJ\d{4,}/.test(run)) continue;
      if (kind === 'star' && /^\d+ [A-Z][a-z]+( [A-Z][a-z]+)?$/.test(v) && !/^\d/.test(run))
        continue;
      // Latin-script Wikipedias may label a star by its Bayer designation: keep the name
      if (kind === 'star' && LATIN.test(loc) && BAYER_ANY.test(v) && !BAYER_ANY.test(run)) continue;
      entry[loc] = v;
    }
    if (!Object.keys(entry).length) continue;
    if (kind === 'person') {
      if (bareSurname) entry._bare = true;
      if (female === '1') entry._female = true;
      if (slavic === '1') entry._slavic = true;
    }
    entry._qid = qid;
    g[cls] ??= {};
    g[cls][run] = entry;
    existing.add(run);
    added[kind]++;
  }
}
for (const l of fs.readFileSync(featTsv, 'utf8').split('\n')) {
  if (!l.trim() || l.startsWith('#')) continue;
  const [key, ...cols] = l.split('\t');
  if (cols.length !== LOCS.length) throw new Error(`${key}: ${cols.length} columns`);
  if (existing.has(key)) continue;
  const entry = {};
  cols.forEach((c, i) => {
    if (c && c !== '-' && c !== key) entry[LOCS[i]] = c;
  });
  g.feature[key] = entry;
  existing.add(key);
  added.feature++;
}
for (const l of fs.readFileSync(surTsv, 'utf8').split('\n')) {
  if (!l.trim() || l.startsWith('#')) continue;
  const [sur, full, only] = l.split('\t');
  const p = g.person?.[full];
  if (!p) throw new Error(`surnames: no person entry "${full}"`);
  if (existing.has(sur)) continue;
  const entry = {};
  for (const loc of LOCS) {
    const v = p[loc] && surnameOf(p[loc]);
    if (v && v !== sur) entry[loc] = v;
  }
  for (const k of ['_female', '_slavic', '_qid']) if (p[k]) entry[k] = p[k];
  if (only) entry._only = only;
  entry._bare = true;
  g.person[sur] = entry;
  existing.add(sur);
  added.person++;
}
console.log('added', added);
if (dry !== '--dry') fs.writeFileSync(P, JSON.stringify(g, null, 2) + '\n');
