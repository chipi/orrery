// fleet-galleries/n1/02 was a labelled US reconnaissance image; the 2026-11-08 fleet cleanup replaced it
// with a museum model of the N1, so the Soviet lunar program's figure caption that described the spy
// photo is rewritten (the point it made — the rocket was known abroad only from spy photos — stays).
//   node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/soviet-lunar-n1-caption-2026-11-08.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const CAPTION = {
  'en-US':
    'A museum model of the N1. For two decades the Soviet Union insisted the Moon rocket did not exist; to the outside world it was known mainly through American spy photographs.',
  ar: 'نموذج متحفي للصاروخ N1. فعلى مدى عقدين أصرّ الاتحاد السوفييتي على أن صاروخ القمر لا وجود له؛ وكان العالم الخارجي يعرفه في الأساس عبر صور التجسس الأمريكية.',
  de: 'Ein Museumsmodell der N1. Zwei Jahrzehnte lang bestand die Sowjetunion darauf, die Mondrakete existiere nicht; für die Außenwelt war sie hauptsächlich durch amerikanische Spionagefotos bekannt.',
  es: 'Una maqueta de museo del N1. Durante dos décadas la Unión Soviética insistió en que el cohete lunar no existía; para el mundo exterior era conocido principalmente a través de fotografías de espionaje estadounidenses.',
  fr: "Une maquette de musée de la N1. Pendant deux décennies, l'Union soviétique a insisté sur le fait que la fusée lunaire n'existait pas ; pour le monde extérieur, elle était connue principalement par des photographies d'espionnage américaines.",
  hi: 'N1 का संग्रहालय मॉडल। दो दशक तक सोवियत संघ अड़ा रहा कि चंद्र रॉकेट का कोई अस्तित्व नहीं है; बाहरी दुनिया उसे मुख्यतः अमेरिकी जासूसी तस्वीरों से जानती थी।',
  it: "Un modello da museo dell'N1. Per due decenni l'Unione Sovietica insistette che il razzo lunare non esisteva; per il mondo esterno era noto principalmente attraverso fotografie spia americane.",
  ja: 'N1の博物館模型。20年間、ソビエト連邦は月ロケットは存在しないと主張し続けた。外部世界には主にアメリカのスパイ写真を通じて知られていた。',
  ko: 'N1의 박물관 모형. 20년간 소련은 달 로켓이 존재하지 않는다고 주장했다; 외부 세계에는 주로 미국 첩보 사진을 통해 알려져 있었다.',
  nl: "Een museummodel van de N1. Twee decennia lang hield de Sovjet-Unie vol dat de maanraket niet bestond; voor de buitenwereld was deze voornamelijk bekend via Amerikaanse spionfoto's.",
  'pt-BR':
    'Uma maquete de museu do N1. Por duas décadas a União Soviética insistiu que o foguete lunar não existia; para o mundo exterior era conhecido principalmente através de fotografias de espionagem americanas.',
  ru: 'Музейная модель Н1. Два десятилетия Советский Союз настаивал, что лунной ракеты не существует; внешнему миру она была известна в основном по американским разведывательным снимкам.',
  'sr-Cyrl':
    'Музејски модел ракете N1. Две деценије Совјетски Савез је тврдио да ракета за Месец не постоји; спољном свету била је позната углавном по америчким шпијунским фотографијама.',
  'zh-CN':
    'N1火箭的博物馆模型。二十年间，苏联坚持登月火箭不存在；对外界来说，它主要通过美国间谍照片为人所知。',
};
let n = 0;
for (const [loc, caption] of Object.entries(CAPTION)) {
  const f = `i18n-src/${loc}/programs/soviet-lunar.json`;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node.image?.reuse === 'fleet/n1/02') {
      node.caption = caption;
      n++;
    }
    Object.values(node).forEach(walk);
  };
  walk(j);
  writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
console.log(`${n} captions set`);
