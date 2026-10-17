// Inventory of the proper names in the English source, classified by Wikidata instead of
// guessed: every capitalised run (1–4 words) is looked up as an English Wikipedia title
// (single words that do not resolve also as "<w> (moon)", "(asteroid)", "(dwarf planet)",
// "(star)", "(constellation)", "(comet)"; two-word names also as "(astronaut)",
// "(cosmonaut)", "(astronomer)"), and the item's "instance of" class decides what it is —
// a celestial body, a surface feature, a star / constellation / deep-sky object, or a
// person. Read-only; network (wikidata.org API, free).
//   node scripts/i18n-tools/name-inventory.mjs <out.tsv>
// Output TSV: count \t run \t kind \t qid \t class \t enwiki title \t female(1/0)
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
const SKIP_KEY = /^(l|u|url|href|src|id|slug|key|wikidata|source|licence|credit|image|file)$/;
const STOP = new Set(
  'The A An In On At Of For And But Or To From By With As Its It This That These Those Each Every When Where While Why How What Who Which After Before During Over Under Into Than Then There Here Not No Yes One Two Three First Second Third Today Now New Old Our We You They He She His Her Their Some Most Many Both All Any If So Also Only Just Even About Up Down Out Off'.split(
    ' ',
  ),
);
const runs = new Map();
function scan(s) {
  for (const m of s.matchAll(
    /(?:\d+[A-Z]?\/)?[A-Z][\p{L}'’.-]*(?:\s+(?:(?:van|von|de|du|la|le|da|del|der|of|the)\s+)?[A-Z0-9][\p{L}\d'’.–-]*)*/gu,
  )) {
    // "Whitson's" → "Whitson"; trailing punctuation off every word
    const words = m[0]
      .split(/\s+/)
      .map((w) => w.replace(/['’]s$/, '').replace(/[.,;:’']+$/, ''))
      .filter(Boolean);
    // a hyphen-joined crew or pair ("Shepherd-Krikalev-Gidzenko") also counts part by part
    for (const w of words)
      if (/^[A-Z]\p{L}+(-[A-Z]\p{L}+)+$/u.test(w))
        for (const p of w.split('-')) runs.set(p, (runs.get(p) || 0) + 1);
    for (let i = 0; i < words.length; i++)
      for (let j = i + 1; j <= Math.min(words.length, i + 4); j++) {
        const w = words.slice(i, j);
        if (STOP.has(w[0]) || /^(of|the|van|von|de|du|la|le|da|del|der)$/.test(w.at(-1))) continue;
        const k = w.join(' ').replace(/[,;:]+$/, '');
        if (k.length < 3) continue;
        runs.set(k, (runs.get(k) || 0) + 1);
      }
  }
}
function visit(v, k) {
  if (typeof v === 'string') {
    if (!SKIP_KEY.test(k)) scan(v);
  } else if (Array.isArray(v)) v.forEach((x) => visit(x, k));
  else if (v && typeof v === 'object') for (const [kk, x] of Object.entries(v)) visit(x, kk);
}
for (const f of walk('i18n-src/en-US')) visit(JSON.parse(fs.readFileSync(f, 'utf8')), '');
for (const f of ['static/data/deep-sky.json', 'static/data/local-group-galaxies.json'])
  visit(JSON.parse(fs.readFileSync(f, 'utf8')), '');

const KIND = [
  ['person', /^human$/],
  [
    'feature',
    /crater|mare\b|lunar|martian|mons\b|montes|planitia|planum|vallis|valles|terra\b|regio\b|chasma|patera|fossa|dorsum|rupes|lacus|sinus|palus|oceanus|basin|highland|mountain on|hill on|plain on|feature|tessera|corona\b|labyrinthus|landing site/i,
  ],
  [
    'star',
    /\bstar\b|binary star|red dwarf|white dwarf|variable star|giant|supergiant|constellation|galaxy|nebula|cluster|supernova|pulsar|quasar|black hole|asterism|star system|exoplanet|extrasolar|brown dwarf|protoplanetary|interstellar cloud/i,
  ],
  [
    'body',
    /planet|moon|natural satellite|asteroid|minor planet|comet|trans-neptunian|kuiper|plutino|centaur|trojan|sednoid|scattered disc|cubewano|binary|interstellar object|small solar system body|meteor shower|ring system|belt/i,
  ],
];
// POST (long title lists overflow a GET URL), paced, retried with back-off; every
// response is cached so a stopped run resumes where it was
const CACHE = process.env.NAME_INV_CACHE ?? '/tmp/name-inventory-cache.json';
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
let unsaved = 0;
async function get(api, params) {
  const key = api + JSON.stringify(params);
  if (cache[key]) return cache[key];
  for (let t = 0; t < 8; t++) {
    try {
      await new Promise((res) => setTimeout(res, 1000));
      const r = await fetch(api, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent':
            'orrery-i18n-tools/1 (https://github.com/chipi/orrery; translation glossary)',
        },
        body: new URLSearchParams({ format: 'json', ...params }),
      });
      const j = r.ok ? await r.json().catch(() => null) : null;
      if (j && !j.error) {
        cache[key] = j;
        if (++unsaved >= 20) {
          fs.writeFileSync(CACHE, JSON.stringify(cache));
          unsaved = 0;
        }
        return j;
      }
      console.error(`\n${api} HTTP ${r.status} ${j?.error?.code ?? ''} — retry ${t + 1}`);
    } catch (e) {
      console.error(`\n${api} ${e.message} — retry ${t + 1}`);
    }
    await new Promise((res) => setTimeout(res, 5000 * 2 ** Math.min(t, 4)));
  }
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  throw new Error(`${api} failed`);
}
process.on('exit', () => fs.writeFileSync(CACHE, JSON.stringify(cache)));
const WP = 'https://en.wikipedia.org/w/api.php';
const WD = 'https://www.wikidata.org/w/api.php';
const VARIANTS = ['moon', 'asteroid', 'dwarf planet', 'star', 'constellation', 'comet'];
const clsLabel = new Map();
const best = new Map();
let asked = 0;
// Resolve a set of requested titles (title -> run) and record what each run is.
async function resolve(titleOf, phase) {
  // 1. English Wikipedia: follow normalisation and redirects, drop disambiguation pages
  const finalOf = new Map(); // final article title -> Set(requested titles)
  const reqs = [...titleOf.keys()];
  asked += reqs.length;
  for (let i = 0; i < reqs.length; i += 50) {
    const j = await get(WP, {
      action: 'query',
      titles: reqs.slice(i, i + 50).join('|'),
      redirects: '1',
      prop: 'pageprops',
      ppprop: 'disambiguation',
    });
    const q = j.query ?? {};
    const step = new Map();
    for (const n of [...(q.normalized ?? []), ...(q.redirects ?? [])]) step.set(n.from, n.to);
    const ok = new Set(
      Object.values(q.pages ?? {})
        .filter((p) => p.missing === undefined && !p.pageprops)
        .map((p) => p.title),
    );
    for (const t of reqs.slice(i, i + 50)) {
      let f = t;
      for (let n = 0; n < 4 && step.has(f); n++) f = step.get(f);
      if (!ok.has(f)) continue;
      if (!finalOf.has(f)) finalOf.set(f, new Set());
      finalOf.get(f).add(t);
    }
    process.stderr.write(`\r${phase} wikipedia ${Math.min(i + 50, reqs.length)}/${reqs.length}`);
  }
  // 2. Wikidata: instance-of and sex for each article
  const finals = [...finalOf.keys()];
  const ent = new Map(); // final title -> {qid, p31, female}
  for (let i = 0; i < finals.length; i += 50) {
    const j = await get(WD, {
      action: 'wbgetentities',
      sites: 'enwiki',
      titles: finals.slice(i, i + 50).join('|'),
      props: 'claims|sitelinks',
      sitefilter: 'enwiki',
    });
    for (const e of Object.values(j.entities ?? {})) {
      if (e.missing !== undefined || !e.claims) continue;
      ent.set(e.sitelinks?.enwiki?.title, {
        qid: e.id,
        p31: (e.claims.P31 ?? []).map((c) => c.mainsnak.datavalue?.value?.id).filter(Boolean),
        female: (e.claims.P21 ?? []).some((c) => c.mainsnak.datavalue?.value?.id === 'Q6581072'),
      });
    }
    process.stderr.write(
      `\r${phase} wikidata ${Math.min(i + 50, finals.length)}/${finals.length}   `,
    );
  }
  const clsIds = [...new Set([...ent.values()].flatMap((h) => h.p31))].filter(
    (c) => !clsLabel.has(c),
  );
  for (let i = 0; i < clsIds.length; i += 50) {
    const j = await get(WD, {
      action: 'wbgetentities',
      ids: clsIds.slice(i, i + 50).join('|'),
      props: 'labels',
      languages: 'en',
    });
    for (const e of Object.values(j.entities ?? {})) clsLabel.set(e.id, e.labels?.en?.value ?? '');
  }
  // 3. classify; an exact title beats a "(moon)"-style variant
  for (const [f, reqSet] of finalOf) {
    const h = ent.get(f);
    if (!h) continue;
    const labels = h.p31.map((c) => clsLabel.get(c) ?? '');
    let kind, cls;
    for (const [kd, re] of KIND) {
      const l = labels.find((x) => re.test(x));
      if (l) {
        kind = kd;
        cls = l;
        break;
      }
    }
    if (!kind) continue;
    for (const t of reqSet) {
      const run = titleOf.get(t);
      const exact = t === run;
      const cur = best.get(run);
      if (!cur || (exact && !cur.exact))
        best.set(run, { kind, cls, qid: h.qid, enwiki: f, female: h.female, exact });
    }
  }
}
// exact titles first; the "(moon)"-style variants only for single words still unresolved
const exactOf = new Map();
for (const k of runs.keys()) if (!/^\d+$/.test(k)) exactOf.set(k, k);
await resolve(exactOf, 'exact');
const variantOf = new Map();
for (const k of runs.keys())
  if (!/^\d+$/.test(k) && !k.includes(' ') && !best.has(k))
    for (const v of VARIANTS) variantOf.set(`${k} (${v})`, k);
await resolve(variantOf, 'variants');
// a person's plain name is often a disambiguation page ("Ed White", "Michael Collins"):
// unresolved "First Last" runs are tried with the professions the text is about
const personOf = new Map();
for (const k of runs.keys())
  if (/^[A-Z][a-z]+ (?:[A-Z]\. )?[A-Z][\p{L}'-]+$/u.test(k) && !best.has(k))
    for (const v of ['astronaut', 'cosmonaut', 'astronomer']) personOf.set(`${k} (${v})`, k);
await resolve(personOf, 'people');
const rows = [...runs]
  .filter(([k]) => best.has(k))
  .sort((a, b) => b[1] - a[1])
  .map(([k, n]) => {
    const b = best.get(k);
    return [n, k, b.kind, b.qid, b.cls, b.enwiki, b.female ? 1 : 0].join('\t');
  });
fs.writeFileSync(out, rows.join('\n') + '\n');
console.error(`\nruns ${runs.size}, titles ${asked}, classified ${rows.length}`);
