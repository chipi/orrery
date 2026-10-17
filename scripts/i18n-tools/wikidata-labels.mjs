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
const titles = process.argv.slice(2);
const api = 'https://www.wikidata.org/w/api.php';
const out = [];
for (let i = 0; i < titles.length; i += 40) {
  const batch = titles.slice(i, i + 40);
  const url = `${api}?action=wbgetentities&sites=enwiki&titles=${encodeURIComponent(batch.join('|'))}&props=labels|sitelinks&languages=${[...new Set(Object.values(LOCS)), 'zh-cn', 'sr-ec', 'pt-br'].join('|')}&format=json&redirects=yes`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'orrery-i18n-tools/1 (translation glossary)' },
  });
  const j = await res.json();
  for (const e of Object.values(j.entities ?? {})) {
    const en = e.sitelinks?.enwiki?.title ?? e.title ?? '?';
    if (e.missing !== undefined) {
      out.push(`${en}\t-\tNOT FOUND`);
      continue;
    }
    const cells = Object.entries(LOCS).map(([loc, w]) => {
      const sl = e.sitelinks?.[`${w}wiki`]?.title;
      const lb =
        e.labels?.[w === 'zh' ? 'zh-cn' : w === 'sr' ? 'sr-ec' : w]?.value ?? e.labels?.[w]?.value;
      return `${loc}=${sl ?? (lb ? `label:${lb}` : '-')}`;
    });
    out.push([en, e.id, ...cells].join('\t'));
  }
}
console.log(out.join('\n'));
