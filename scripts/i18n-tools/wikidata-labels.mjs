// Native-page evidence for a term: given English Wikipedia titles, print the article
// title each locale's own Wikipedia uses (sitelink), falling back to the Wikidata label.
// This is the "search native pages" validation step (docs/guides/i18n-translation-strategy.md §4)
// done for 13 languages at once. Read-only; network.
//   node scripts/i18n-tools/wikidata-labels.mjs "Mare Tranquillitatis" "Utopia Planitia" > out.tsv
// Output TSV: en-title \t qid \t <loc>=<title> … ("-" = no article; "label:" = label only).
const LOCS = {
  ru: 'ru',
  ja: 'ja',
  'zh-CN': 'zh',
  ko: 'ko',
  hi: 'hi',
  ar: 'ar',
  'sr-Cyrl': 'sr',
  de: 'de',
  fr: 'fr',
  es: 'es',
  it: 'it',
  nl: 'nl',
  'pt-BR': 'pt',
};
// --labels: prefer the label over the article title (people: ruwiki titles are
// "Surname, Name Patronymic", the label is the running-text form). Q-ids are accepted
// in place of titles.
const args = process.argv.slice(2);
const preferLabel = args[0] === '--labels';
const titles = preferLabel ? args.slice(1) : args;
const byId = titles.every((t) => /^Q\d+$/.test(t));
const api = 'https://www.wikidata.org/w/api.php';
const out = [];
for (let i = 0; i < titles.length; i += 40) {
  const batch = titles.slice(i, i + 40);
  const sel = byId
    ? `ids=${batch.join('|')}`
    : `sites=enwiki&titles=${encodeURIComponent(batch.join('|'))}`;
  const url = `${api}?action=wbgetentities&${sel}&props=labels|sitelinks&languages=en|${[...new Set(Object.values(LOCS)), 'zh-cn', 'sr-ec', 'pt-br'].join('|')}&format=json&redirects=yes`;
  let j;
  // the API answers a burst with a plain-text "too many requests": back off and retry
  for (let t = 0; t < 6 && !j; t++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'orrery-i18n-tools/1 (https://github.com/chipi/orrery; translation glossary)',
      },
    });
    if (res.ok) j = await res.json().catch(() => null);
    if (!j) await new Promise((r) => setTimeout(r, 5000 * (t + 1)));
  }
  if (!j) throw new Error('wikidata API kept refusing');
  // ids mode: also print the English label so the row names the item
  const enLabel = (e) => e.labels?.en?.value;
  for (const e of Object.values(j.entities ?? {})) {
    const en = e.sitelinks?.enwiki?.title ?? enLabel(e) ?? e.title ?? '?';
    if (e.missing !== undefined) {
      out.push(`${en}\t-\tNOT FOUND`);
      continue;
    }
    const cells = Object.entries(LOCS).map(([loc, w]) => {
      const sl = e.sitelinks?.[`${w}wiki`]?.title;
      const lb =
        e.labels?.[w === 'zh' ? 'zh-cn' : w === 'sr' ? 'sr-ec' : w]?.value ?? e.labels?.[w]?.value;
      if (preferLabel) return `${loc}=${lb ?? (sl ? `title:${sl}` : '-')}`;
      return `${loc}=${sl ?? (lb ? `label:${lb}` : '-')}`;
    });
    out.push([en, e.id, ...cells].join('\t'));
  }
}
console.log(out.join('\n'));
