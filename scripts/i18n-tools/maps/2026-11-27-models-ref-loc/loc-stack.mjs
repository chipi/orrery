// The Library of Congress (HAER) model-reference group now also names the Shuttle stack (TX-116)
// and SRB (TX-116-K) sheets the launch-stack model was measured from: its /credits description in
// the 13 translated data-sources overlays.
//   node scripts/i18n-tools/maps/2026-11-27-models-ref-loc/loc-stack.mjs
import fs from 'node:fs';

const T = {
  de: 'Maßzeichnungen des Historic American Engineering Record (HAER) in der Abteilung für Drucke und Fotografien der Library of Congress: die Ansichten und der Grundriss des Orbiters Discovery (Aufnahme TX-116-A), der ganze Shuttle-Stapel (TX-116) und der Feststoffbooster (TX-116-K), maßstabsgetreu gezeichnet, nach denen die Modelle des Shuttle-Orbiters und des Startstapels vermessen und geprüft wurden. Die Modelle sind unsere eigene Geometrie; keine Zeichnung wird wiedergegeben.',
  fr: 'Relevés à l’échelle du Historic American Engineering Record (HAER), conservés à la division des estampes et photographies de la Library of Congress : les élévations et le plan de l’orbiteur Discovery (relevé TX-116-A), l’ensemble complet de la navette (TX-116) et le propulseur d’appoint à poudre (TX-116-K), dessinés à l’échelle, sur lesquels les modèles de l’orbiteur et de l’ensemble de lancement ont été mesurés et vérifiés. Les modèles sont notre propre géométrie ; aucun dessin n’est reproduit.',
  es: 'Planos de levantamiento del Historic American Engineering Record (HAER), conservados en la División de Grabados y Fotografías de la Biblioteca del Congreso: los alzados y la planta del orbitador Discovery (levantamiento TX-116-A), el conjunto completo del transbordador (TX-116) y el propulsor de combustible sólido (TX-116-K), dibujados a escala, sobre los que se midieron y comprobaron los modelos del orbitador y del conjunto de lanzamiento. Los modelos son geometría propia; no se reproduce ningún plano.',
  it: 'Rilievi in scala dell’Historic American Engineering Record (HAER), conservati nella divisione stampe e fotografie della Library of Congress: i prospetti e la pianta dell’orbiter Discovery (rilievo TX-116-A), lo stack completo dello Shuttle (TX-116) e il razzo a propellente solido (TX-116-K), disegnati in scala, sui quali i modelli dell’orbiter e dello stack di lancio sono stati misurati e verificati. I modelli sono una nostra geometria; nessun disegno è riprodotto.',
  'pt-BR':
    'Desenhos de levantamento do Historic American Engineering Record (HAER), guardados na Divisão de Gravuras e Fotografias da Biblioteca do Congresso: as elevações e a planta do orbitador Discovery (levantamento TX-116-A), o conjunto completo do ônibus espacial (TX-116) e o propulsor de combustível sólido (TX-116-K), desenhados em escala, a partir dos quais os modelos do orbitador e do conjunto de lançamento foram medidos e conferidos. Os modelos são geometria nossa; nenhum desenho é reproduzido.',
  nl: 'Maattekeningen van het Historic American Engineering Record (HAER), bewaard in de afdeling prenten en foto’s van de Library of Congress: de aanzichten en de plattegrond van de orbiter Discovery (opmeting TX-116-A), de complete Shuttle-stapel (TX-116) en de vastebrandstofbooster (TX-116-K), op schaal getekend, waarnaar de modellen van de Shuttle-orbiter en de lanceerstapel zijn opgemeten en gecontroleerd. De modellen zijn onze eigen geometrie; geen tekening wordt overgenomen.',
  ru: 'Обмерные чертежи Historic American Engineering Record (HAER) из отдела эстампов и фотографий Библиотеки Конгресса: виды и план орбитального корабля «Дискавери» (обмер TX-116-A), вся связка «Спейс шаттла» (TX-116) и твердотопливный ускоритель (TX-116-K), выполненные в масштабе, по которым модели орбитального корабля и стартовой связки были обмерены и проверены. Модели — наша собственная геометрия; чертежи не воспроизводятся.',
  'sr-Cyrl':
    'Мерни цртежи Historic American Engineering Record (HAER) из одељења графика и фотографија Конгресне библиотеке: изгледи и основа орбитера Дискавери (снимање TX-116-A), цео склоп спејс-шатла (TX-116) и бустер на чврсто гориво (TX-116-K), нацртани у размери, према којима су модели орбитера и лансирног склопа измерени и проверени. Модели су наша сопствена геометрија; ниједан цртеж није репродукован.',
  ar: 'رسومات قياس من «السجل الهندسي الأمريكي التاريخي» (HAER) المحفوظة في قسم المطبوعات والصور بمكتبة الكونغرس: واجهات المكوك المداري «ديسكفري» ومسقطه (المسح TX-116-A)، ومجموعة المكوك الفضائي الكاملة (TX-116)، والمعزز الصاروخي الصلب (TX-116-K)، مرسومة بمقياس رسم، قيس منها نموذجا المكوك المداري ومجموعة الإطلاق ودُقّق عليها. النماذج هندسة من صنعنا، ولا يُعاد نشر أي رسم.',
  hi: 'हिस्टॉरिक अमेरिकन इंजीनियरिंग रिकॉर्ड (HAER) के नाप-चित्र, जो लाइब्रेरी ऑफ़ कांग्रेस के प्रिंट और फ़ोटोग्राफ़ विभाग में रखे हैं: ऑर्बिटर डिस्कवरी (सर्वे TX-116-A) के उन्नयन और ऊपरी नक्शा, पूरा शटल स्टैक (TX-116) और ठोस रॉकेट बूस्टर (TX-116-K), पैमाने पर बने, जिनसे शटल ऑर्बिटर और प्रक्षेपण स्टैक के मॉडल नापे और जाँचे गए। मॉडल हमारी अपनी ज्यामिति हैं; कोई चित्र दोबारा नहीं छापा गया।',
  ja: '米国議会図書館の版画・写真部に所蔵されている歴史的アメリカ工学記録（HAER）の実測図面。縮尺どおりに描かれたオービター「ディスカバリー」の立面図と平面図（調査 TX-116-A）、スペースシャトルの打ち上げ形態全体（TX-116）、固体ロケットブースター（TX-116-K）で、オービターと打ち上げ形態のモデルはこれをもとに寸法を取り、照合しました。モデルは独自のジオメトリで、図面は複製していません。',
  ko: '미국 의회도서관 판화·사진부에 소장된 역사적 미국 공학 기록(HAER)의 실측 도면. 축척대로 그린 궤도선 디스커버리의 입면도와 평면도(조사 TX-116-A), 우주왕복선 발사 조립체 전체(TX-116), 고체 로켓 부스터(TX-116-K)로, 궤도선과 발사 조립체 모델은 이를 바탕으로 치수를 재고 대조했습니다. 모델은 자체 지오메트리이며 도면은 복제하지 않았습니다.',
  'zh-CN':
    '美国国会图书馆版画与摄影部收藏的“美国历史工程记录”（HAER）测绘图：按比例绘制的“发现号”轨道器立面图和平面图（测绘编号 TX-116-A）、航天飞机完整发射组合体（TX-116）和固体火箭助推器（TX-116-K），轨道器和发射组合体模型据此测量并核对。模型是我们自己的几何体，未复制任何图纸。',
};

for (const [loc, t] of Object.entries(T)) {
  const p = `i18n-src/${loc}/data-sources.json`;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  doc['models-ref-loc'] = t;
  fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
}
console.log(`${Object.keys(T).length} locales`);
