// After the 2026-11-08 fleet gallery cleanup (change-3/02 was a duplicate of 01, change-3/05 a labelled
// map, and the remaining slots renumbered): each Chang'e 3 story chapter gets the pictures that match
// it, with captions in all 14 locales. Sets the chapter image lists outright.
//   node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/change3-story-images-2026-11-08.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const L = [
  'en-US',
  'ar',
  'de',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
];
const IMG = {
  yutu: [
    '/images/fleet-galleries/change-3/02.webp',
    {
      'en-US':
        'A full-size mockup of the Yutu rover — 140 kg, six wheels, with a ground-penetrating radar under the chassis.',
      ar: 'مجسم بالحجم الكامل للمركبة الجوالة Yutu — 140 كغ وست عجلات ورادار مخترق للأرض أسفل الهيكل.',
      de: 'Ein Modell des Rovers Yutu in Originalgröße – 140 kg, sechs Räder, mit Bodenradar unter dem Fahrgestell.',
      es: 'Una maqueta a tamaño real del róver Yutu: 140 kg, seis ruedas y un radar de penetración terrestre bajo el chasis.',
      fr: 'Une maquette grandeur nature du rover Yutu — 140 kg, six roues, et un radar à pénétration de sol sous le châssis.',
      hi: 'Yutu रोवर का पूरे आकार का मॉडल — 140 किग्रा, छह पहिए, और चेसिस के नीचे भू-भेदी रडार।',
      it: 'Un modello a grandezza naturale del rover Yutu: 140 kg, sei ruote e un radar a penetrazione del suolo sotto il telaio.',
      ja: '月面車Yutuの実物大模型。重さ140kg、6輪で、車体の下に地中レーダーを備える。',
      ko: 'Yutu 탐사차 실물 크기 모형. 무게 140kg, 바퀴 여섯 개, 차체 아래에 지표 투과 레이더를 달았다.',
      nl: 'Een model op ware grootte van de rover Yutu – 140 kg, zes wielen, met een grondradar onder het chassis.',
      'pt-BR':
        'Uma maquete em tamanho real do rover Yutu — 140 kg, seis rodas e um radar de penetração no solo sob o chassi.',
      ru: 'Полноразмерный макет лунохода Yutu: 140 кг, шесть колёс, георадар под шасси.',
      'sr-Cyrl':
        'Макета ровера Yutu у природној величини — 140 kg, шест точкова, са георадаром испод шасије.',
      'zh-CN': '玉兔号月球车原尺寸模型——重140千克，六个车轮，底盘下装有探地雷达。',
    },
  ],
  launch: [
    '/images/fleet-galleries/long-march-3b/04.webp',
    {
      'en-US':
        "A Long March 3B lifting off at night — the rocket that launched Chang'e 3 from Xichang on 1 December 2013.",
      ar: "صاروخ Long March 3B ينطلق ليلًا — الصاروخ الذي أطلق Chang'e 3 من شيتشانغ في 1 ديسمبر 2013.",
      de: "Eine Long March 3B startet bei Nacht – die Rakete, die Chang'e 3 am 1. Dezember 2013 in Xichang startete.",
      es: "Un Long March 3B despega de noche: el cohete que lanzó el Chang'e 3 desde Xichang el 1 de diciembre de 2013.",
      fr: "Une Long March 3B décolle de nuit — la fusée qui a lancé Chang'e 3 depuis Xichang le 1er décembre 2013.",
      hi: "रात में उड़ान भरता Long March 3B — वही रॉकेट जिसने 1 दिसंबर 2013 को शीचांग से Chang'e 3 को प्रक्षेपित किया।",
      it: "Un Long March 3B decolla di notte: il razzo che lanciò Chang'e 3 da Xichang il 1° dicembre 2013.",
      ja: "夜間に打ち上げられるLong March 3B。2013年12月1日に西昌からChang'e 3を打ち上げたロケット。",
      ko: "밤에 발사되는 Long March 3B. 2013년 12월 1일 시창에서 Chang'e 3을 발사한 로켓이다.",
      nl: "Een Long March 3B stijgt ’s nachts op – de raket die Chang'e 3 op 1 december 2013 vanaf Xichang lanceerde.",
      'pt-BR':
        "Um Long March 3B decola à noite — o foguete que lançou a Chang'e 3 de Xichang em 1º de dezembro de 2013.",
      ru: "Ночной старт Long March 3B — ракеты, запустившей Chang'e 3 с Сичана 1 декабря 2013 года.",
      'sr-Cyrl':
        "Long March 3B полеће ноћу — ракета која је лансирала Chang'e 3 из Сичанга 1. децембра 2013.",
      'zh-CN': '夜间发射的长征三号B——2013年12月1日正是它从西昌将嫦娥三号送入太空。',
    },
  ],
  lander: [
    '/images/fleet-galleries/change-3/01.webp',
    {
      'en-US':
        "The Chang'e 3 lander on Mare Imbrium, photographed by Yutu, with the rover’s wheel tracks in the foreground.",
      ar: "مسبار الهبوط Chang'e 3 على بحر الأمطار، بعدسة Yutu، وآثار عجلات المركبة الجوالة في المقدمة.",
      de: "Der Lander von Chang'e 3 im Mare Imbrium, von Yutu fotografiert, im Vordergrund die Radspuren des Rovers.",
      es: "El módulo Chang'e 3 en el Mare Imbrium, fotografiado por Yutu, con las huellas del róver en primer plano.",
      fr: "L’atterrisseur Chang'e 3 sur Mare Imbrium, photographié par Yutu, avec les traces de roues du rover au premier plan.",
      hi: "Yutu द्वारा खींचा गया मारे इम्ब्रियम पर Chang'e 3 लैंडर, आगे रोवर के पहियों के निशान।",
      it: "Il lander di Chang'e 3 nel Mare Imbrium, fotografato da Yutu, con le tracce delle ruote del rover in primo piano.",
      ja: "Yutuが撮影した雨の海のChang'e 3着陸機。手前にローバーの轍が見える。",
      ko: "Yutu가 찍은 비의 바다의 Chang'e 3 착륙선. 앞쪽에 로버의 바퀴 자국이 보인다.",
      nl: "De lander van Chang'e 3 in Mare Imbrium, gefotografeerd door Yutu, met de wielsporen van de rover op de voorgrond.",
      'pt-BR':
        "O módulo de pouso da Chang'e 3 no Mare Imbrium, fotografado pelo Yutu, com as marcas das rodas do rover em primeiro plano.",
      ru: "Посадочный модуль Chang'e 3 в Море Дождей, снятый луноходом Yutu; на переднем плане следы его колёс.",
      'sr-Cyrl':
        "Лендер Chang'e 3 на Мору киша, снимак ровера Yutu, са траговима точкова ровера у првом плану.",
      'zh-CN': '玉兔号拍摄的雨海上的嫦娥三号着陆器，前景是月球车的车辙。',
    },
  ],
  rock: [
    '/images/fleet-galleries/change-3/03.webp',
    {
      'en-US':
        'A boulder on Mare Imbrium seen up close by Yutu, with the rover’s orbital-image inset of where it stood.',
      ar: 'صخرة على بحر الأمطار رآها Yutu عن قرب، مع صورة مدارية مُدرجة تُظهر موقعها.',
      de: 'Ein Felsbrocken im Mare Imbrium aus der Nähe, von Yutu aufgenommen, mit einem Orbitalbild-Ausschnitt seines Standorts.',
      es: 'Una roca del Mare Imbrium vista de cerca por Yutu, con un recuadro de imagen orbital que muestra su ubicación.',
      fr: 'Un rocher de Mare Imbrium vu de près par Yutu, avec en médaillon une image orbitale de son emplacement.',
      hi: 'Yutu द्वारा पास से देखी गई मारे इम्ब्रियम की एक चट्टान, साथ में उसकी जगह दिखाती कक्षीय छवि का इनसेट।',
      it: 'Un masso del Mare Imbrium visto da vicino da Yutu, con un riquadro di immagine orbitale che ne mostra la posizione.',
      ja: 'Yutuが間近にとらえた雨の海の岩塊。位置を示す軌道画像の挿入図付き。',
      ko: 'Yutu가 가까이에서 찍은 비의 바다의 바위. 위치를 보여 주는 궤도 영상이 함께 실려 있다.',
      nl: 'Een rotsblok in Mare Imbrium van dichtbij, vastgelegd door Yutu, met een inzet van een baanopname van de plek.',
      'pt-BR':
        'Uma rocha do Mare Imbrium vista de perto pelo Yutu, com um detalhe de imagem orbital mostrando sua localização.',
      ru: 'Валун в Море Дождей крупным планом, снимок Yutu, с врезкой орбитального снимка его места.',
      'sr-Cyrl':
        'Камена громада на Мору киша изблиза, снимак ровера Yutu, са уметнутим орбиталним снимком њеног положаја.',
      'zh-CN': '玉兔号近距离拍摄的雨海上的一块巨石，附有标示其位置的轨道图像插图。',
    },
  ],
};
const PLAN = { hardware: ['yutu'], launch: ['launch'], surface: ['lander', 'rock'] };
const files = [
  'static/data/site-stories/change3.json',
  ...L.map((l) => `i18n-src/${l}/site-stories/change3.json`),
];
for (const f of files) {
  const loc = f.startsWith('static/') ? 'en-US' : f.split('/')[1];
  const j = JSON.parse(readFileSync(f, 'utf8'));
  for (const ch of j.chapters) {
    if (!PLAN[ch.id]) throw new Error(`${f}: unexpected chapter ${ch.id}`);
    ch.images = PLAN[ch.id].map((k) => ({ src: IMG[k][0], caption: IMG[k][1][loc] }));
  }
  writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
}
console.log(`change3 story images set in ${files.length} files`);
