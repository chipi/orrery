// sourcing/gaps "chinese-mission-patches" resolution (2026-10-18): Tiangong/Shenzhou cards no
// longer borrow CNSA's insignia; they show the CMSA name alone. Writes the en-US change and
// cmsa-logo-gap-<loc>.json edits for apply-edits.mjs.
import fs from 'node:fs';

const DIR = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const REL = 'sourcing/gaps.json';
const AT = 'gaps.1.resolution';
const NEW = {
  'en-US':
    "The Tiangong and Shenzhou cards and pages show the CMSA name with no logo: the CMSA emblem is not freely licensed, and CNSA's insignia belongs to a different agency.",
  ru: 'Карточки и страницы «Tiangong» и «Shenzhou» показывают название CMSA без логотипа: эмблема CMSA не распространяется по свободной лицензии, а знак CNSA принадлежит другому агентству.',
  ja: 'TiangongとShenzhouのカードとページには、ロゴなしでCMSAの名称を表示している。CMSAのエンブレムは自由ライセンスで公開されておらず、CNSAの記章は別の機関のものである。',
  'zh-CN':
    '天宫和神舟的卡片和页面只显示中国载人航天工程办公室的名称，不配标志：其标识没有以自由许可发布，而国家航天局的徽标属于另一个机构。',
  ko: 'Tiangong과 Shenzhou 카드와 페이지에는 로고 없이 CMSA 이름만 표시한다. CMSA 엠블럼은 자유 라이선스로 공개되지 않았고, CNSA 휘장은 다른 기관의 것이다.',
  hi: 'Tiangong और Shenzhou के कार्ड और पृष्ठ बिना लोगो के केवल CMSA का नाम दिखाते हैं: CMSA का प्रतीक-चिह्न मुक्त लाइसेंस के तहत उपलब्ध नहीं है, और CNSA का चिह्न एक अलग एजेंसी का है।',
  ar: 'تعرض بطاقات وصفحات Tiangong وShenzhou اسم CMSA دون شعار: فشعار CMSA غير متاح بترخيص حر، وشارة CNSA تخص وكالة أخرى.',
  'sr-Cyrl':
    'Картице и странице о Tiangong-у и Shenzhou приказују назив CMSA без логотипа: амблем CMSA није објављен под слободном лиценцом, а знак CNSA припада другој агенцији.',
  de: 'Die Tiangong- und Shenzhou-Karten und -Seiten zeigen den Namen CMSA ohne Logo: Das CMSA-Emblem ist nicht frei lizenziert, und das CNSA-Abzeichen gehört einer anderen Behörde.',
  fr: "Les cartes et pages Tiangong et Shenzhou affichent le nom CMSA sans logo : l'emblème de la CMSA n'est pas sous licence libre, et l'insigne de la CNSA appartient à une autre agence.",
  es: 'Las tarjetas y páginas de Tiangong y Shenzhou muestran el nombre CMSA sin logotipo: el emblema de la CMSA no tiene licencia libre y la insignia de la CNSA pertenece a otra agencia.',
  it: "Le schede e le pagine Tiangong e Shenzhou mostrano il nome CMSA senza logo: l'emblema della CMSA non ha una licenza libera e l'insegna della CNSA appartiene a un'altra agenzia.",
  nl: "De Tiangong- en Shenzhou-kaarten en -pagina's tonen de naam CMSA zonder logo: het CMSA-embleem is niet vrij gelicentieerd en het CNSA-insigne hoort bij een ander agentschap.",
  'pt-BR':
    'Os cartões e páginas de Tiangong e Shenzhou mostram o nome CMSA sem logotipo: o emblema da CMSA não tem licença livre, e a insígnia da CNSA pertence a outra agência.',
};
for (const [loc, text] of Object.entries(NEW)) {
  const p = `i18n-src/${loc}/${REL}`;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const old = doc.gaps[1].resolution;
  if (!/CNSA|国家航天局/.test(old)) throw new Error(`${loc}: unexpected resolution`);
  if (loc === 'en-US') {
    doc.gaps[1].resolution = text;
    fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  } else
    fs.writeFileSync(
      `${DIR}/cmsa-logo-gap-${loc}.json`,
      JSON.stringify([{ rel: REL, at: AT, old, new: text }], null, 1),
    );
}
