// Pass 1 (one name per language): landing-site names on moon-sites / mars-sites pages
// from the glossary's `feature` class. Pure feature names come from the glossary;
// names with extra words are written by hand below. Writes reviewed edits to
// maps/2026-10-17-translation-cleanup/site-names-<loc>.json for apply-edits.mjs.
//   node scripts/i18n-tools/site-names.mjs <loc>
import fs from 'node:fs';

const loc = process.argv[2];
const F = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).feature;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const f = (k) => F[k][loc];
const P = loc === 'ja' || loc === 'zh-CN' ? ['（', '）'] : [' (', ')'];
const PURE = {
  'moon-sites/apollo11': 'Mare Tranquillitatis',
  'moon-sites/apollo12': 'Oceanus Procellarum',
  'moon-sites/apollo14': 'Fra Mauro',
  'moon-sites/apollo15': 'Hadley–Apennine',
  'moon-sites/apollo16': 'Descartes Highlands',
  'moon-sites/apollo17': 'Taurus-Littrow',
  'moon-sites/beresheet': 'Mare Serenitatis',
  'moon-sites/change3': 'Mare Imbrium',
  'moon-sites/change4': 'Von Kármán Crater',
  'moon-sites/luna9': 'Oceanus Procellarum',
  'moon-sites/luna16': 'Mare Fecunditatis',
  'moon-sites/luna17': 'Mare Imbrium',
  'moon-sites/luna24': 'Mare Crisium',
  'mars-sites/beagle2': 'Isidis Planitia',
  'mars-sites/insight': 'Elysium Planitia',
  'mars-sites/mars-pathfinder': 'Ares Vallis',
  'mars-sites/opportunity': 'Meridiani Planum',
  'mars-sites/schiaparelli': 'Meridiani Planum',
  'mars-sites/spirit': 'Gusev Crater',
  'mars-sites/viking1-lander': 'Chryse Planitia',
  'mars-sites/viking2-lander': 'Utopia Planitia',
  'mars-sites/zhurong': 'Utopia Planitia',
};
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const by = (arr) => arr[L.indexOf(loc)];
const HAND = {
  'moon-sites/change5': () => `${cap(f('Mons Rümker'))}${P[0]}${f('Oceanus Procellarum')}${P[1]}`,
  'moon-sites/luna21': () => `${cap(f('Le Monnier Crater'))}${P[0]}${f('Mare Serenitatis')}${P[1]}`,
  'moon-sites/change6': () =>
    `${cap(f('Apollo Crater'))}${P[0]}${by(['обратная сторона', '裏側', '月球背面', '뒷면', 'सुदूर पक्ष', 'الجانب البعيد', 'далека страна', 'Rückseite', 'face cachée', 'cara oculta', 'lato nascosto', 'achterkant', 'lado oculto'])}${P[1]}`,
  'moon-sites/slim': () =>
    by([
      'Близ кратера Сиори',
      'シオリ・クレーター付近',
      '希奥利撞击坑附近',
      '시오리 분화구 근처',
      'शिओली क्रेटर के पास',
      'قرب فوهة شيولي',
      'Близу кратера Шиоли',
      'Nahe dem Shioli-Krater',
      'Près du cratère Shioli',
      'Cerca del cráter Shioli',
      'Vicino al cratere Shioli',
      'Bij de Shioli-krater',
      'Perto da cratera Shioli',
    ]),
  'mars-sites/curiosity': () =>
    by([
      'Кратер Гейл (гора Эолида / гора Шарп)',
      'ゲール・クレーター（アイオリス山／シャープ山）',
      '盖尔撞击坑（伊奥利亚山／夏普山）',
      '게일 분화구 (아이올리스 산 / 샤프 산)',
      'गेल क्रेटर (एओलिस पर्वत / माउंट शार्प)',
      'فوهة غيل (جبل أيوليس / جبل شارب)',
      'Кратер Гејл (планина Еолида / планина Шарп)',
      'Gale-Krater (Aeolis Mons / Mount Sharp)',
      'Cratère Gale (Aeolis Mons / mont Sharp)',
      'Cráter Gale (Aeolis Mons / monte Sharp)',
      'Cratere Gale (Aeolis Mons / monte Sharp)',
      'Gale-krater (Aeolis Mons / Mount Sharp)',
      'Cratera Gale (Aeolis Mons / monte Sharp)',
    ]),
  'mars-sites/exomars-rosalind-franklin': () =>
    `${cap(f('Oxia Planum'))}${P[0]}${by(['цель', '目標', '目标', '목표', 'लक्ष्य', 'الهدف', 'циљ', 'Ziel', 'cible', 'objetivo', 'obiettivo', 'doel', 'alvo'])}${P[1]}`,
  'mars-sites/perseverance': () =>
    by([
      'Дно кратера Езеро',
      'ジェゼロ・クレーターの底',
      '耶泽罗撞击坑底部',
      '예제로 분화구 바닥',
      'जेज़ेरो क्रेटर का तल',
      'قاع فوهة جيزيرو',
      'Дно кратера Језеро',
      'Boden des Jezero-Kraters',
      'Fond du cratère Jezero',
      'Fondo del cráter Jezero',
      'Fondo del cratere Jezero',
      'Bodem van de Jezero-krater',
      'Fundo da cratera Jezero',
    ]),
};
// Keep the locale's own prefix/suffix; swap only the English feature inside.
const SWAP = {
  'mars-sites/mars2': 'Hellas Planitia',
  'mars-sites/mars3': 'Ptolemaeus Crater',
  'mars-sites/mars6': 'Margaritifer Sinus',
  'mars-sites/phoenix': 'Vastitas Borealis',
};
const edits = [];
const read = (rel) => JSON.parse(fs.readFileSync(`i18n-src/${loc}/${rel}.json`, 'utf8'));
for (const [page, key] of Object.entries(PURE)) {
  const old = read(page).site_name;
  const nu = cap(f(key));
  if (old !== nu) edits.push({ rel: `${page}.json`, at: 'site_name', old, new: nu });
}
for (const [page, fn] of Object.entries(HAND)) {
  const old = read(page).site_name;
  const nu = fn();
  if (old !== nu) edits.push({ rel: `${page}.json`, at: 'site_name', old, new: nu });
}
for (const [page, key] of Object.entries(SWAP)) {
  const old = read(page).site_name;
  if (!old.includes(key)) {
    console.error(`${loc} ${page}: "${key}" not found in "${old}" — write by hand`);
    continue;
  }
  const nu = old.startsWith(key) ? old.replace(key, cap(f(key))) : old.replace(key, f(key));
  if (old !== nu) edits.push({ rel: `${page}.json`, at: 'site_name', old, new: nu });
}
// Hand-written where the swap can't work (English prefix left, redundant gloss, own form).
const OVERRIDE = {
  'zh-CN': { 'mars-sites/mars6': '约 23.9°S、19.4°W（珍珠湾）' },
  de: { 'mars-sites/mars3': 'Ca. 45°S, 158°W (Ptolemaeus-Krater)' },
  nl: {
    'mars-sites/mars2': 'Ongeveer 45°Z, 313°O (Hellas-bassin)',
    'mars-sites/mars3': 'Ongeveer 45°Z, 158°W (Ptolemaeus-krater)',
  },
  it: { 'mars-sites/mars3': 'Circa 45°S, 158°O (cratere Ptolemaeus)' },
  'sr-Cyrl': {
    'mars-sites/mars3': 'Прибл. 45° Ј, 158° З (кратер Птолемеј)',
    'mars-sites/phoenix': 'Велика северна равница',
  },
  ru: { 'mars-sites/phoenix': 'Великая Северная равнина' },
};
for (const [page, nu] of Object.entries(OVERRIDE[loc] ?? {})) {
  const old = read(page).site_name;
  const i = edits.findIndex((e) => e.rel === `${page}.json`);
  if (i >= 0) edits.splice(i, 1);
  if (old !== nu) edits.push({ rel: `${page}.json`, at: 'site_name', old, new: nu });
}
fs.writeFileSync(
  `scripts/i18n-tools/maps/2026-10-17-translation-cleanup/site-names-${loc}.json`,
  JSON.stringify(edits, null, 1) + '\n',
);
for (const e of edits) console.log(`${e.rel.replace('.json', '')}: ${e.old} → ${e.new}`);
