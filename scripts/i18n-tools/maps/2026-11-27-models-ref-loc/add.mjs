// Adds the /credits descriptions of the Library of Congress (HAER) model-reference group and the
// Wikimedia Commons one (never translated) to the 13 translated data-sources overlays.
//   node scripts/i18n-tools/maps/2026-11-27-models-ref-loc/add.mjs
import fs from 'node:fs';

const T = {
  de: {
    loc: 'Maßzeichnungen des Historic American Engineering Record (HAER) in der Abteilung für Drucke und Fotografien der Library of Congress: die Ansichten und der Grundriss des Orbiters Discovery (Aufnahme TX-116-A), maßstabsgetreu gezeichnet, nach denen das Modell des Shuttle-Orbiters vermessen und geprüft wurde. Das Modell ist unsere eigene Geometrie; keine Zeichnung wird wiedergegeben.',
    commons:
      'Fotos von Fluggeräten, Testexemplaren und Museumsnachbauten auf Wikimedia Commons, anhand derer Form und Aufbau der Lander-, Rover- und Kapselmodelle stimmen. Kein Foto wird wiedergegeben; die Modelle sind unsere eigene Geometrie.',
  },
  fr: {
    loc: 'Relevés à l’échelle du Historic American Engineering Record (HAER), conservés à la division des estampes et photographies de la Library of Congress : les élévations et le plan de l’orbiteur Discovery (relevé TX-116-A), dessinés à l’échelle, sur lesquels le modèle de l’orbiteur de la navette a été mesuré et vérifié. Le modèle est notre propre géométrie ; aucun dessin n’est reproduit.',
    commons:
      'Photographies de matériel de vol, d’exemplaires d’essai et de répliques de musée sur Wikimedia Commons, consultées pour que les formes et l’agencement des modèles d’atterrisseurs, de rovers et de capsules soient justes. Aucune photographie n’est reproduite ; les modèles sont notre propre géométrie.',
  },
  es: {
    loc: 'Planos de levantamiento del Historic American Engineering Record (HAER), conservados en la División de Grabados y Fotografías de la Biblioteca del Congreso: los alzados y la planta del orbitador Discovery (levantamiento TX-116-A), dibujados a escala, sobre los que se midió y comprobó el modelo del orbitador del transbordador. El modelo es geometría propia; no se reproduce ningún plano.',
    commons:
      'Fotografías de material de vuelo, ejemplares de prueba y réplicas de museo en Wikimedia Commons, consultadas para que las formas y la disposición de los modelos de módulos de aterrizaje, rovers y cápsulas sean correctas. No se reproduce ninguna fotografía; los modelos son geometría propia.',
  },
  it: {
    loc: 'Rilievi in scala dell’Historic American Engineering Record (HAER), conservati nella divisione stampe e fotografie della Library of Congress: i prospetti e la pianta dell’orbiter Discovery (rilievo TX-116-A), disegnati in scala, sui quali il modello dell’orbiter dello Shuttle è stato misurato e verificato. Il modello è una nostra geometria; nessun disegno è riprodotto.',
    commons:
      'Fotografie di hardware di volo, esemplari di prova e repliche museali su Wikimedia Commons, consultate per rendere corrette le forme e la disposizione dei modelli di lander, rover e capsule. Nessuna fotografia è riprodotta; i modelli sono una nostra geometria.',
  },
  'pt-BR': {
    loc: 'Desenhos de levantamento do Historic American Engineering Record (HAER), guardados na Divisão de Gravuras e Fotografias da Biblioteca do Congresso: as elevações e a planta do orbitador Discovery (levantamento TX-116-A), desenhadas em escala, a partir das quais o modelo do orbitador do ônibus espacial foi medido e conferido. O modelo é geometria nossa; nenhum desenho é reproduzido.',
    commons:
      'Fotografias de equipamentos de voo, exemplares de teste e réplicas de museu no Wikimedia Commons, consultadas para acertar as formas e a disposição dos modelos de módulos de pouso, rovers e cápsulas. Nenhuma fotografia é reproduzida; os modelos são geometria nossa.',
  },
  nl: {
    loc: 'Maattekeningen van het Historic American Engineering Record (HAER), bewaard in de afdeling prenten en foto’s van de Library of Congress: de aanzichten en de plattegrond van de orbiter Discovery (opmeting TX-116-A), op schaal getekend, waarnaar het model van de Shuttle-orbiter is opgemeten en gecontroleerd. Het model is onze eigen geometrie; geen tekening wordt overgenomen.',
    commons:
      'Foto’s van vluchthardware, testexemplaren en museumreplica’s op Wikimedia Commons, bekeken om de vorm en indeling van de modellen van landers, rovers en capsules goed te krijgen. Geen foto wordt overgenomen; de modellen zijn onze eigen geometrie.',
  },
  ru: {
    loc: 'Обмерные чертежи Historic American Engineering Record (HAER) из отдела эстампов и фотографий Библиотеки Конгресса: виды и план орбитального корабля «Дискавери» (обмер TX-116-A), выполненные в масштабе, по которым модель орбитального корабля «Спейс шаттл» была обмерена и проверена. Модель — наша собственная геометрия; чертежи не воспроизводятся.',
    commons:
      'Фотографии лётных аппаратов, испытательных образцов и музейных копий на Викискладе, по которым уточнялись форма и компоновка моделей посадочных аппаратов, луноходов и марсоходов, капсул. Фотографии не воспроизводятся; модели — наша собственная геометрия.',
  },
  'sr-Cyrl': {
    loc: 'Мерни цртежи Historic American Engineering Record (HAER) из одељења графика и фотографија Конгресне библиотеке: изгледи и основа орбитера Дискавери (снимање TX-116-A), нацртани у размери, према којима је модел орбитера спејс-шатла измерен и проверен. Модел је наша сопствена геометрија; ниједан цртеж није репродукован.',
    commons:
      'Фотографије летелица, пробних примерака и музејских реплика на Викимедијиној остави, по којима су проверени облик и распоред модела летелица за слетање, ровера и капсула. Ниједна фотографија није репродукована; модели су наша сопствена геометрија.',
  },
  ar: {
    loc: 'رسومات قياس من «السجل الهندسي الأمريكي التاريخي» (HAER) المحفوظة في قسم المطبوعات والصور بمكتبة الكونغرس: واجهات المكوك المداري «ديسكفري» ومسقطه (المسح TX-116-A)، مرسومة بمقياس رسم، قيس منها نموذج المكوك المداري ودُقّق عليها. النموذج هندسة من صنعنا، ولا يُعاد نشر أي رسم.',
    commons:
      'صور لمعدات طيران ونماذج اختبار ونسخ متحفية على ويكيميديا كومنز، رُجع إليها لضبط أشكال نماذج المسابر الهابطة والمركبات الجوالة والكبسولات وترتيبها. لا تُعاد أي صورة؛ النماذج هندسة من صنعنا.',
  },
  hi: {
    loc: 'हिस्टॉरिक अमेरिकन इंजीनियरिंग रिकॉर्ड (HAER) के नाप-चित्र, जो लाइब्रेरी ऑफ़ कांग्रेस के प्रिंट और फ़ोटोग्राफ़ विभाग में रखे हैं: ऑर्बिटर डिस्कवरी (सर्वे TX-116-A) के पैमाने पर बने उन्नयन और ऊपरी नक्शा, जिनसे शटल ऑर्बिटर का मॉडल नापा और जाँचा गया। मॉडल हमारी अपनी ज्यामिति है; कोई चित्र दोबारा नहीं छापा गया।',
    commons:
      'विकिमीडिया कॉमन्स पर उड़ान हार्डवेयर, परीक्षण नमूनों और संग्रहालय प्रतिकृतियों की तस्वीरें, जिन्हें लैंडर, रोवर और कैप्सूल मॉडलों के आकार और बनावट सही करने के लिए देखा गया। कोई तस्वीर दोबारा नहीं छापी गई; मॉडल हमारी अपनी ज्यामिति हैं।',
  },
  ja: {
    loc: '米国議会図書館の版画・写真部に所蔵されている歴史的アメリカ工学記録（HAER）の実測図面。縮尺どおりに描かれたオービター「ディスカバリー」の立面図と平面図（調査 TX-116-A）で、スペースシャトル・オービターのモデルはこれをもとに寸法を取り、照合しました。モデルは独自のジオメトリで、図面は複製していません。',
    commons:
      'ウィキメディア・コモンズにある飛行ハードウェア、試験機、博物館のレプリカの写真。着陸機、ローバー、カプセルのモデルの形と配置を正しくするために参照しました。写真は複製しておらず、モデルは独自のジオメトリです。',
  },
  ko: {
    loc: '미국 의회도서관 판화·사진부에 소장된 역사적 미국 공학 기록(HAER)의 실측 도면. 축척대로 그린 궤도선 디스커버리의 입면도와 평면도(조사 TX-116-A)로, 우주왕복선 궤도선 모델은 이를 바탕으로 치수를 재고 대조했습니다. 모델은 자체 지오메트리이며 도면은 복제하지 않았습니다.',
    commons:
      '위키미디어 공용에 있는 비행 하드웨어, 시험 기체, 박물관 복제품 사진. 착륙선, 로버, 캡슐 모델의 모양과 배치를 바로잡기 위해 참고했습니다. 사진은 복제하지 않았으며 모델은 자체 지오메트리입니다.',
  },
  'zh-CN': {
    loc: '美国国会图书馆版画与摄影部收藏的“美国历史工程记录”（HAER）测绘图：按比例绘制的“发现号”轨道器立面图和平面图（测绘编号 TX-116-A），航天飞机轨道器模型据此测量并核对。模型是我们自己的几何体，未复制任何图纸。',
    commons:
      '维基共享资源上的飞行硬件、试验件和博物馆复制品照片，用于校正着陆器、巡视器和返回舱模型的外形与布局。未复制任何照片；模型是我们自己的几何体。',
  },
};

for (const [loc, t] of Object.entries(T)) {
  const p = `i18n-src/${loc}/data-sources.json`;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  doc['models-ref-loc'] = t.loc;
  doc['models-ref-commons'] = t.commons;
  fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
}
console.log(`${Object.keys(T).length} locales`);
