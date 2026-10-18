// Hand corrections on top of the glossary pass for Orion / Kepler / Galileo (2026-10-18):
// case endings the generator cannot choose (ru, sr-Cyrl), English fragments left beside the
// name (ja, hi), the glossary form of the Orion Nebula (zh-CN), and "secular" (J2) rendered
// as religious secularism (hi, ar). Reads glossary-edits-<loc>-homonym.json, writes
// homonym-edits-<loc>.json for apply-edits.mjs.
import fs from 'node:fs';

const DIR = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const NOT_LETTER = '(?![\\p{L}])';
const FIX = {
  ru: [
    [/Три Кеплер задачи/g, 'Три задачи Кеплера'],
    [/двухтельных Кеплер задач/g, 'двухтельных задач Кеплера'],
    [/решите Кеплер:/g, 'решите уравнение Кеплера:'],
    // genitive unless the name is the subject of the verb that follows
    [
      new RegExp(
        `Кеплер${NOT_LETTER}(?!\\s(свёл|унаследовал|добрался|пришёл|понял|вывел|открыл|использовал|\\+))`,
        'gu',
      ),
      'Кеплера',
    ],
    [/Галилея направил/g, 'Галилей направил'],
    [/году Галилей с крыши/g, 'году Галилеем с крыши'],
    [/изобретения Галилей телескопа/g, 'изобретения Галилеем телескопа'],
    [new RegExp(`Галилей${NOT_LETTER}(?!\\s(направил|с крыши|телескопа))`, 'gu'), 'Галилея'],
    [new RegExp(`Орион${NOT_LETTER}`, 'gu'), 'Ориона'],
  ],
  'sr-Cyrl': [
    [/предвиђање Галилеј из/g, 'предвиђање Галилеја из'],
    [/после Галилеја телескопа/g, 'после Галилејевог телескопа'],
    [/Галилеј четвороноћно/g, 'Галилејево четвороноћно'],
    [/године Галилеја је окренуо/g, 'године Галилеј је окренуо'],
    [/показали Галилеј тест/g, 'показали Галилејев тест'],
    [/експеримент Галилеј/g, 'експеримент Галилеја'],
    [/(полуосу|заједно) Кеплер трећим/g, '$1 Кеплеровим трећим'],
    [/реши Кеплера:/g, 'реши Кеплерову једначину:'],
    [/Четири Галилеј месеца/g, 'Четири Галилејева месеца'],
    [/од Галилеја месеци/g, 'од Галилејевих месеци'],
    [/године Галилеја, са/g, 'године Галилеј, са'],
  ],
  ja: [
    [/オリオン座のオリオン座の/g, 'オリオン座の'],
    [/ケプラー laws/g, 'ケプラーの法則'],
    [/ケプラー third law/g, 'ケプラーの第3法則'],
    [/1604年のケプラー以来最も明るく/g, '1604年のケプラーの超新星以来最も明るく'],
  ],
  'zh-CN': [[/猎户座星云/g, '猎户座大星云']],
  hi: [
    [/केप्लर three laws/g, 'केप्लर के तीन नियम'],
    [/धर्मनिरपेक्ष J2/g, 'दीर्घकालिक J2'],
    [
      /^Euclid के कालपुरुष में प्रतिष्ठित अंधकार बादल का विहंगम दृश्य।$/,
      'कालपुरुष के प्रसिद्ध अंधकार बादल का Euclid से लिया गया विहंगम दृश्य।',
    ],
  ],
  ar: [[/J2 العلماني/g, 'J2 القرني']],
};
// proposals that are not about these names
const DROP = { fr: [/named-stars\/mintaka\.json:bio$/] };

for (const loc of ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'fr', 'es', 'it', 'pt-BR']) {
  const edits = JSON.parse(fs.readFileSync(`${DIR}/glossary-edits-${loc}-homonym.json`, 'utf8'))
    .filter((e) => !(DROP[loc] ?? []).some((re) => re.test(`${e.rel}:${e.at}`)))
    .map((e) => ({
      ...e,
      new: (FIX[loc] ?? []).reduce((s, [re, to]) => s.replace(re, to), e.new),
    }));
  fs.writeFileSync(`${DIR}/homonym-edits-${loc}.json`, JSON.stringify(edits, null, 1));
  console.log(loc, edits.length);
}
