// Alt text for the two Mars 2 gallery slots replaced 2026-11-07 (01: PrOP-M render, 04: museum
// model of the descent module), in all 14 locales; sets the .webp and .1x1.jpg keys.
//   node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/mars2-alt.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const T = {
  'en-US': [
    'Render of PrOP-M, the small rover on skis that Mars 2 and Mars 3 carried, on a stony Martian surface',
    'Museum model of the Mars 3 descent module, the same lander design Mars 2 carried, with its petals open and antennas raised',
  ],
  ar: [
    'تصوير لمركبة PrOP-M الجوالة الصغيرة ذات الزلاجات التي حملها مسبارا Mars 2 وMars 3، على سطح مريخي حجري',
    'نموذج متحفي لوحدة الهبوط في Mars 3، وهو تصميم المركبة نفسه الذي حمله Mars 2، بأغطية مفتوحة وهوائيات مرفوعة',
  ],
  de: [
    'Darstellung von PrOP-M, dem kleinen Rover auf Kufen, den Mars 2 und Mars 3 mitführten, auf steiniger Marsoberfläche',
    'Museumsmodell der Landekapsel von Mars 3 – dieselbe Lander-Bauart, die Mars 2 trug – mit geöffneten Blütenblättern und ausgefahrenen Antennen',
  ],
  es: [
    'Representación de PrOP-M, el pequeño róver sobre esquís que llevaban Mars 2 y Mars 3, sobre una superficie marciana pedregosa',
    'Maqueta de museo del módulo de descenso de Mars 3, el mismo diseño de aterrizador que llevaba Mars 2, con los pétalos abiertos y las antenas desplegadas',
  ],
  fr: [
    'Rendu de PrOP-M, le petit rover à patins qu’emportaient Mars 2 et Mars 3, sur un sol martien caillouteux',
    'Maquette de musée du module de descente de Mars 3, le même atterrisseur que portait Mars 2, pétales ouverts et antennes dressées',
  ],
  hi: [
    'PrOP-M का चित्रण — स्की पर चलने वाला छोटा रोवर, जिसे Mars 2 और Mars 3 साथ ले गए थे — पथरीली मंगल सतह पर',
    'Mars 3 के अवतरण मॉड्यूल का संग्रहालय मॉडल — वही लैंडर डिज़ाइन जो Mars 2 ले गया था — खुली पंखुड़ियों और उठे एंटेना के साथ',
  ],
  it: [
    'Rendering di PrOP-M, il piccolo rover su pattini che Mars 2 e Mars 3 portavano, su una superficie marziana sassosa',
    'Modello da museo del modulo di discesa di Mars 3, lo stesso lander che portava Mars 2, con i petali aperti e le antenne alzate',
  ],
  ja: [
    'Mars 2とMars 3が搭載した、スキーで進む小型ローバーPrOP-Mの描画。石の多い火星表面の上',
    'Mars 3の降下モジュールの博物館模型。Mars 2が搭載したのと同じ着陸機の設計で、花弁が開きアンテナが立っている',
  ],
  ko: [
    'Mars 2와 Mars 3이 실었던, 스키로 움직이는 소형 로버 PrOP-M의 렌더링. 돌이 많은 화성 표면 위',
    'Mars 3 하강 모듈의 박물관 모형. Mars 2가 실었던 것과 같은 착륙선 설계로, 꽃잎이 열리고 안테나가 세워져 있다',
  ],
  nl: [
    'Weergave van PrOP-M, de kleine rover op ski’s die Mars 2 en Mars 3 meenamen, op een stenig Marsoppervlak',
    'Museummodel van de afdaalmodule van Mars 3, hetzelfde landerontwerp dat Mars 2 meedroeg, met geopende bloemblaadjes en opgerichte antennes',
  ],
  'pt-BR': [
    'Renderização do PrOP-M, o pequeno rover sobre esquis que as sondas Mars 2 e Mars 3 levavam, sobre uma superfície marciana pedregosa',
    'Maquete de museu do módulo de descida da Mars 3, o mesmo projeto de módulo de pouso que a Mars 2 levava, com as pétalas abertas e as antenas erguidas',
  ],
  ru: [
    'Изображение ПрОП-М — маленького марсохода на лыжах, который несли «Марс-2» и «Марс-3», — на каменистой поверхности Марса',
    'Музейная модель спускаемого аппарата «Марса-3» — такой же аппарат нёс «Марс-2» — с раскрытыми лепестками и поднятыми антеннами',
  ],
  'sr-Cyrl': [
    'Приказ PrOP-M-а, малог ровера на скијама који су носили Mars 2 и Mars 3, на каменитој површини Марса',
    'Музејски модел спусног модула Mars 3 — истог лендера какав је носио Mars 2 — са отвореним латицама и подигнутим антенама',
  ],
  'zh-CN': [
    'PrOP-M渲染图：Mars 2和Mars 3携带的靠滑橇行走的小型火星车，位于多石的火星表面',
    'Mars 3着陆舱的博物馆模型——与Mars 2携带的着陆器设计相同——花瓣展开，天线竖起',
  ],
};
for (const [loc, [a01, a04]] of Object.entries(T)) {
  const f = `static/data/image-alt-text/${loc}.json`;
  const j = JSON.parse(readFileSync(f, 'utf8'));
  const map = j.entries ?? j;
  for (const [slot, text] of [
    ['01', a01],
    ['04', a04],
  ])
    for (const ext of ['webp', '1x1.jpg']) {
      const k = `/images/missions/mars2/${slot}.${ext}`;
      if (k in map) map[k] = text;
    }
  writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
console.log('mars2 01/04 alt text set in', Object.keys(T).length, 'locales');
