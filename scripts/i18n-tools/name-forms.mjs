// Native forms for the names name-inventory.mjs classified: for every Wikidata item, each
// locale's form — the article title of that language's Wikipedia for bodies, features
// and stars (disambiguator "(спутник)" dropped), the label for people (ruwiki titles are
// "Surname, Name Patronymic"; the Russian patronymic is dropped from the running-text
// form). "-" = that language has neither. Read-only; network (wikidata.org, free).
//   node scripts/i18n-tools/name-forms.mjs <wikidata-name-classes.tsv> <out.tsv>
// Output TSV: kind \t qid \t enwiki \t runs (|-joined) \t female \t slavic \t <loc>=<form>…
// (a form from a label rather than an article is prefixed "label:", for review).
import fs from 'node:fs';

const [inv, out] = process.argv.slice(2);
const LOCS = {
  ru: ['ru', 'ru'],
  ja: ['ja', 'ja'],
  'zh-CN': ['zh', 'zh-cn|zh-hans|zh'],
  ko: ['ko', 'ko'],
  hi: ['hi', 'hi'],
  ar: ['ar', 'ar'],
  'sr-Cyrl': ['sr', 'sr-ec|sr'],
  de: ['de', 'de'],
  fr: ['fr', 'fr'],
  es: ['es', 'es'],
  it: ['it', 'it'],
  nl: ['nl', 'nl'],
  'pt-BR': ['pt', 'pt-br|pt'],
};
const items = new Map();
for (const l of fs.readFileSync(inv, 'utf8').trim().split('\n')) {
  const [n, run, kind, qid, , enwiki, female] = l.split('\t');
  if (!items.has(qid)) items.set(qid, { kind, enwiki, female: female === '1', runs: [] });
  items.get(qid).runs.push(`${run}:${n}`);
}
const CACHE = process.env.NAME_FORMS_CACHE ?? '/tmp/name-forms-cache.json';
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
const langs = [...new Set(Object.values(LOCS).flatMap(([, l]) => l.split('|')))].join('|');
async function wbget(params) {
  for (let t = 0; t < 8; t++) {
    await new Promise((r) => setTimeout(r, 1000));
    const r = await fetch('https://www.wikidata.org/w/api.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'orrery-i18n-tools/1 (https://github.com/chipi/orrery; translation glossary)',
      },
      body: new URLSearchParams({ action: 'wbgetentities', format: 'json', ...params }),
    });
    const j = r.ok ? await r.json().catch(() => null) : null;
    if (j && !j.error) return j;
    console.error(`HTTP ${r.status} ${j?.error?.code ?? ''} — retry ${t + 1}`);
    await new Promise((res) => setTimeout(res, 5000 * 2 ** Math.min(t, 4)));
  }
  throw new Error('wikidata API kept refusing');
}
const ids = [...items.keys()].filter((q) => !cache[q]?.conv);
for (let i = 0; i < ids.length; i += 50) {
  const batch = ids.slice(i, i + 50).join('|');
  const j = await wbget({ ids: batch, props: 'labels|sitelinks', languages: langs });
  // zh-cn / sr-ec labels through Wikidata's language converter (traditional → simplified,
  // Latin → Cyrillic); kept only when the converted label came from a zh / sr variant
  const k = await wbget({
    ids: batch,
    props: 'labels',
    languages: 'zh-cn|sr-ec',
    languagefallback: '1',
  });
  for (const e of Object.values(j.entities ?? {})) {
    const conv = {};
    for (const [l, v] of Object.entries(k.entities?.[e.id]?.labels ?? {}))
      if ((v['source-language'] ?? v.language).slice(0, 2) === l.slice(0, 2)) conv[l] = v.value;
    cache[e.id] = { ...e, conv };
  }
  fs.writeFileSync(CACHE, JSON.stringify(cache));
  process.stderr.write(`\r${Math.min(i + 50, ids.length)}/${ids.length}`);
}
// stars: aliases hold the other half of a star's names (ja label アダラ, alias
// おおいぬ座イプシロン星) — fetched once for star items
const starIds = [...items]
  .filter(([q, it]) => it.kind === 'star' && !cache[q]?.aliases)
  .map(([q]) => q);
for (let i = 0; i < starIds.length; i += 50) {
  const j = await wbget({
    ids: starIds.slice(i, i + 50).join('|'),
    props: 'aliases',
    languages: langs,
  });
  for (const e of Object.values(j.entities ?? {}))
    if (cache[e.id]) cache[e.id].aliases = e.aliases ?? {};
  fs.writeFileSync(CACHE, JSON.stringify(cache));
}
// a Bayer designation as each language writes it (Альфа Павлина, くじゃく座アルファ星, 孔雀座α)
const BAYER_LOC = {
  ru: /(^|\s)(альфа|бета|гамма|дельта|эпсилон|дзета|эта|тета|йота|каппа|лямбда|сигма|тау|омега|ро|пи)\s/i,
  ja: /座(アルファ|ベータ|ガンマ|デルタ|イプシロン|エプシロン|ゼータ|イータ|シータ|カッパ|シグマ|オメガ|ロー|[α-ω])/,
  'zh-CN': /座[α-ω]/,
  ko: /자리 (알파|베타|감마|델타|엡실론|제타|에타|세타|카파|시그마|오메가)/,
  hi: /(अल्फ़ा|अल्फा|बीटा|बेटा|गामा|डॅल्टा|ऍप्सिलन|ज़ेटा|थेटा|कापा|सिग्मा)/,
  ar: /(ألفا|بيتا|غاما|دلتا|إبسيلون|زيتا|ثيتا|كابا|سيغما)/,
  'sr-Cyrl': /(^|\s)(Алфа|Бета|Гама|Делта|Епсилон|Зета|Тета|Капа|Сигма|Омега)\s/,
};
const LATIN_BAYER =
  /^(Alpha|Alfa|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega) [A-Z]/;
const isBayer = (loc, v) => (BAYER_LOC[loc] ?? LATIN_BAYER).test(v) || /^[α-ω] /.test(v);
const isFlamsteed = (v) => /^\d+ [A-Z][a-z]+( [A-Z][a-z]+)?$/.test(v);
const isCatalogue = (v) =>
  isFlamsteed(v) || /^(HD|HIP|HR|GJ|Gliese|BD|SAO|\d+ )\s?\S*\d/.test(v) || /\d+番星/.test(v);
const noParen = (s) => s.replace(/\s*[（(][^)）]*[)）]\s*$/, '').trim();
const CYR = /[Ѐ-ӿ]/;
const rows = [];
for (const [qid, it] of items) {
  const e = cache[qid];
  if (!e) continue;
  let slavic = false;
  const cells = Object.entries(LOCS).map(([loc, [wiki, lls]]) => {
    // a zero-width space or a direction mark is never part of a name (the hi label
    // "ख़्रुश्चेव" + U+200B, the ar label "كبلر" + U+200E); ZWJ/ZWNJ are kept
    const zw = (x) => x?.replace(/[\u200b\u200e\u200f\ufeff]/g, '');
    const title = zw(e.sitelinks?.[`${wiki}wiki`]?.title);
    let label = zw(
      lls
        .split('|')
        .map((l) => e.labels?.[l]?.value)
        .find(Boolean),
    );
    // the converted label is the simplified form for zh-CN; Serbian's Latin → Cyrillic
    // converter is mechanical on foreign spellings ("Qуаоар"), so sr-Cyrl takes only a
    // label or title that is Cyrillic at the source
    if (loc === 'zh-CN' && e.conv?.['zh-cn']) label = e.conv['zh-cn'];
    if (loc === 'sr-Cyrl' && label && !CYR.test(label)) label = undefined;
    // a non-Latin-script locale's label written in Latin letters is the English name copied
    // in ("michael collins", "John Glenn" as hi labels), not a form
    if (/^(ru|ja|zh-CN|ko|hi|ar)$/.test(loc) && label && /^[\p{Script=Latin}\s.'’-]+$/u.test(label))
      label = undefined;
    let form;
    if (it.kind === 'star') {
      // a star's name (label first, then aliases, then the title) and its Bayer
      // designation (title first, then aliases), written "name¦designation"
      // an alias can be a whole catalogue list in one string ("α Tauri, 87 Tauri, HD 29139, …")
      const ok = (v) => v && !v.includes(', ') && !(loc === 'sr-Cyrl' && !CYR.test(v));
      const aliases = lls
        .split('|')
        .flatMap((l) => (e.aliases?.[l] ?? []).map((a) => a.value))
        .filter(ok);
      const cands = [label && noParen(label), ...aliases, title && noParen(title)].filter(ok);
      const name = cands.find((v) => !isBayer(loc, v) && !isCatalogue(v));
      // only a spelled-out designation ("Альфа Девы"): an abbreviation ("α UMi", "β Ориона",
      // "Α Leo / 獅子座α") is not how the prose writes it, so the designation stays as it is
      const bys = [title && noParen(title), ...aliases, label && noParen(label)]
        .filter(ok)
        .filter((v) => isBayer(loc, v));
      const bayer = bys.find((v) => !/^[α-ωΑ-Ω] /.test(v));
      // a language that names the star only by its designation uses that for the name too
      return `${loc}=${name ?? bayer ?? '-'}¦${bayer ?? '-'}`;
    }
    if (it.kind === 'person') {
      // a label can carry its own disambiguator ("斯科特·凯利 (宇航员)")
      form = label ? noParen(label) : title ? `label:${noParen(title)}` : null;
      if (form && loc === 'ru') {
        // "Юрий Алексеевич Гагарин" → "Юрий Гагарин"
        const w = form.split(' ');
        if (w.length === 3 && /(вич|вна|ична|ич)$/.test(w[1])) {
          slavic = true;
          form = `${w[0]} ${w[2]}`;
        }
      }
      if (form && !label) form = form.replace(/^label:([^,]+), (.+)$/, 'label:$2 $1');
    } else {
      // zhwiki titles mix traditional characters and srwiki titles mix Latin script, so
      // those two take the converted label; the others take the article title
      // Latin-script Wikipedias often title a star by its Bayer designation (fr "Alpha
      // Virginis" for Spica); the label is the star's name there
      const latinStar = it.kind === 'star' && /^(de|fr|es|it|nl|pt-BR)$/.test(loc);
      const scripted =
        (loc === 'zh-CN' && label) ||
        (loc === 'sr-Cyrl' && label && CYR.test(label)) ||
        (latinStar && label);
      form = scripted
        ? noParen(label)
        : title && !(loc === 'sr-Cyrl' && !CYR.test(title))
          ? noParen(title)
          : label
            ? `label:${label}`
            : null;
      // a minor-planet number is not part of the name in running text:
      // "(101955) Бенну", "4 Vesta", "بينو 101955" → the name alone
      // (a bare number only for a numbered minor planet: "Shoemaker-Levy 9" keeps its 9)
      if (form && it.kind === 'body') {
        const numbered = /^\d+ /.test(it.enwiki);
        const bare = form
          .replace(/^(label:)?\(?\p{Nd}+\)?\s+(?=\p{L})/u, '$1')
          .replace(numbered ? /\s+\p{Nd}+$/u : /$^/, '')
          .replace(/^(label:)?(小行星|الكويكب )\p{Nd}+$/u, '');
        form = /\p{L}/u.test(bare.replace(/^label:/, '')) ? bare : null;
      }
    }
    return `${loc}=${form ?? '-'}`;
  });
  rows.push(
    [it.kind, qid, it.enwiki, it.runs.join('|'), it.female ? 1 : 0, slavic ? 1 : 0, ...cells].join(
      '\t',
    ),
  );
}
rows.sort();
fs.writeFileSync(out, rows.join('\n') + '\n');
console.error(`\nitems ${rows.length}`);
