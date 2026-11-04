// Chunk 2: /science/glossary definitions of the six new terms, written by hand in all 14 locales
// (2026-11-04), in the existing entries' style. Appends; never overwrites a definition.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk2/add-definitions.mjs
import fs from 'node:fs';

const D = {
  'en-US': {
    splashdown:
      'The end of a flight home in which a capsule comes down in the sea under parachutes and is picked up by a recovery ship.',
    'sample return':
      'Collecting material on another world and bringing it back to Earth, where laboratories can study it far more closely than any instrument sent there.',
    regolith:
      'The layer of loose, broken rock and dust that covers the Moon, Mars and asteroids, ground up by billions of years of impacts.',
    microgravity:
      'The near-weightless state of everything in orbit, which is falling around the Earth together with its spacecraft.',
    'life support':
      'The systems that keep a crew alive: breathable air, water, the right temperature and the removal of carbon dioxide and waste.',
    'solar array':
      'The panels of solar cells that turn sunlight into electricity for a spacecraft or a station.',
  },
  ru: {
    splashdown:
      'Завершение полёта, при котором капсула опускается на парашютах в море и её поднимает корабль-спасатель.',
    'sample return':
      'Сбор вещества на другом небесном теле и его доставка на Землю, где лаборатории изучают его гораздо подробнее, чем любой прибор на месте.',
    regolith:
      'Слой рыхлых обломков породы и пыли, покрывающий Луну, Марс и астероиды, — результат миллиардов лет ударов.',
    microgravity:
      'Почти полная невесомость всего, что находится на орбите и падает вокруг Земли вместе со своим кораблём.',
    'life support':
      'Системы, которые поддерживают жизнь экипажа: пригодный для дыхания воздух, вода, нужная температура, удаление углекислого газа и отходов.',
    'solar array':
      'Панели солнечных элементов, которые превращают солнечный свет в электричество для космического аппарата или станции.',
  },
  ja: {
    splashdown: 'カプセルがパラシュートで海に降り、回収船に引き上げられて飛行を終えること。',
    'sample return':
      '別の天体で物質を採取して地球に持ち帰ること。現地に送るどの観測機器よりも、地上の研究室のほうがはるかに詳しく調べられる。',
    regolith:
      '月や火星、小惑星の表面を覆う、砕けた岩石と塵の層。数十億年にわたる衝突で細かく砕かれてできた。',
    microgravity:
      '軌道上の物体が宇宙船とともに地球の周りを落下し続けることで生じる、ほぼ無重量の状態。',
    'life support':
      '乗員の生命を保つシステム。呼吸できる空気、水、適切な温度を保ち、二酸化炭素や廃棄物を取り除く。',
    'solar array':
      '太陽光を電力に変える太陽電池を並べたパネル。宇宙機や宇宙ステーションに電力を供給する。',
  },
  'zh-CN': {
    splashdown: '飞行的结束方式之一：返回舱在降落伞下落入海中，再由打捞船回收。',
    'sample return':
      '在另一个天体上采集物质并带回地球，让实验室能比任何送到当地的仪器研究得更仔细。',
    regolith: '覆盖在月球、火星和小行星表面的松散碎石与尘土层，由数十亿年的撞击粉碎而成。',
    microgravity: '轨道上的一切与航天器一起绕地球不断下落，因而几乎处于失重的状态。',
    'life support': '维持乘组生存的系统：提供可呼吸的空气、水和适宜的温度，并清除二氧化碳和废物。',
    'solar array': '由太阳能电池组成的板，把阳光转化为电能，为航天器或空间站供电。',
  },
  ko: {
    splashdown: '캡슐이 낙하산을 펴고 바다에 내려앉은 뒤 회수선이 건져 올리며 비행을 마치는 것.',
    'sample return':
      '다른 천체에서 물질을 채취해 지구로 가져오는 것. 현지에 보낸 어떤 장비보다 지상의 실험실이 훨씬 자세히 연구할 수 있다.',
    regolith:
      '달과 화성, 소행성의 표면을 덮고 있는 부서진 암석과 먼지의 층. 수십억 년 동안의 충돌로 잘게 부서져 생겼다.',
    microgravity:
      '궤도에 있는 모든 것이 우주선과 함께 지구 둘레를 계속 낙하하기 때문에 생기는, 무게가 거의 없는 상태.',
    'life support':
      '승무원의 생명을 유지하는 시스템. 숨 쉴 공기와 물, 알맞은 온도를 제공하고 이산화탄소와 폐기물을 없앤다.',
    'solar array':
      '햇빛을 전기로 바꾸는 태양전지를 늘어놓은 판. 우주선이나 우주정거장에 전력을 공급한다.',
  },
  hi: {
    splashdown:
      'उड़ान का वह अंत जिसमें कैप्सूल पैराशूट के सहारे समुद्र में उतरता है और बचाव जहाज़ उसे उठा लेता है।',
    'sample return':
      'किसी दूसरे पिंड पर पदार्थ इकट्ठा करके उसे पृथ्वी पर लाना, जहाँ प्रयोगशालाएँ उसका अध्ययन वहाँ भेजे गए किसी भी उपकरण से कहीं बारीकी से कर सकती हैं।',
    regolith:
      'चंद्रमा, मंगल और क्षुद्रग्रहों की सतह को ढकने वाली ढीली टूटी चट्टानों और धूल की परत, जो अरबों वर्षों के टकरावों से पिसकर बनी है।',
    microgravity:
      'कक्षा में मौजूद हर चीज़ की लगभग भारहीन अवस्था, क्योंकि वह अपने यान के साथ पृथ्वी के चारों ओर लगातार गिर रही होती है।',
    'life support':
      'वे प्रणालियाँ जो चालक दल को जीवित रखती हैं: साँस लेने योग्य हवा, पानी, सही तापमान, और कार्बन डाइऑक्साइड व कचरे को हटाना।',
    'solar array':
      'सौर सेलों के पैनल, जो सूर्य के प्रकाश को अंतरिक्ष यान या स्टेशन के लिए बिजली में बदलते हैं।',
  },
  ar: {
    splashdown: 'نهاية رحلة العودة حين تهبط الكبسولة بالمظلات في البحر وتنتشلها سفينة الإنقاذ.',
    'sample return':
      'جمع مواد من جرم آخر وإعادتها إلى الأرض، حيث تدرسها المختبرات بدقة تفوق كثيرًا أي جهاز يُرسَل إلى هناك.',
    regolith:
      'طبقة من الصخور المفتتة والغبار تغطي القمر والمريخ والكويكبات، طحنتها الاصطدامات على مدى مليارات السنين.',
    microgravity:
      'حالة شبه انعدام الوزن لكل ما في المدار، لأنه يسقط حول الأرض مع مركبته في آن واحد.',
    'life support':
      'الأنظمة التي تُبقي الطاقم على قيد الحياة: هواء صالح للتنفس وماء ودرجة حرارة مناسبة، وإزالة ثاني أكسيد الكربون والفضلات.',
    'solar array':
      'ألواح من الخلايا الشمسية تحوّل ضوء الشمس إلى كهرباء للمركبة الفضائية أو المحطة.',
  },
  'sr-Cyrl': {
    splashdown:
      'Крај лета у коме се капсула на падобранима спушта у море, а брод за спасавање је извлачи.',
    'sample return':
      'Прикупљање материјала на другом телу и његово враћање на Земљу, где га лабораторије проучавају много детаљније од било ког инструмента послатог тамо.',
    regolith:
      'Слој растреситог, издробљеног камена и прашине који прекрива Месец, Марс и астероиде, самлевен милијардама година удара.',
    microgravity:
      'Скоро бестежинско стање свега што је у орбити, јер заједно са својом летелицом непрестано пада око Земље.',
    'life support':
      'Системи који одржавају посаду у животу: ваздух за дисање, вода, одговарајућа температура и уклањање угљен-диоксида и отпада.',
    'solar array':
      'Панели соларних ћелија који сунчеву светлост претварају у струју за летелицу или станицу.',
  },
  de: {
    splashdown:
      'Das Ende eines Rückflugs, bei dem eine Kapsel an Fallschirmen im Meer niedergeht und von einem Bergungsschiff aufgenommen wird.',
    'sample return':
      'Material auf einem anderen Himmelskörper sammeln und zur Erde zurückbringen, wo Labore es weit genauer untersuchen können als jedes Instrument vor Ort.',
    regolith:
      'Die Schicht aus losem, zertrümmertem Gestein und Staub, die Mond, Mars und Asteroiden bedeckt, zermahlen von Milliarden Jahren Einschlägen.',
    microgravity:
      'Der fast schwerelose Zustand von allem in der Umlaufbahn, das zusammen mit seinem Raumfahrzeug um die Erde fällt.',
    'life support':
      'Die Systeme, die eine Besatzung am Leben halten: Atemluft, Wasser, die richtige Temperatur und das Entfernen von Kohlendioxid und Abfall.',
    'solar array':
      'Die Flächen aus Solarzellen, die Sonnenlicht in Strom für ein Raumfahrzeug oder eine Station umwandeln.',
  },
  fr: {
    splashdown:
      "La fin d'un vol de retour où une capsule descend sous parachutes dans la mer avant d'être récupérée par un navire.",
    'sample return':
      "Prélever de la matière sur un autre corps et la rapporter sur Terre, où les laboratoires peuvent l'étudier bien plus finement que n'importe quel instrument envoyé sur place.",
    regolith:
      "La couche de roches brisées et de poussière qui recouvre la Lune, Mars et les astéroïdes, broyée par des milliards d'années d'impacts.",
    microgravity:
      "L'état de quasi-apesanteur de tout ce qui est en orbite et tombe autour de la Terre en même temps que son vaisseau.",
    'life support':
      "Les systèmes qui maintiennent l'équipage en vie : air respirable, eau, température adaptée, élimination du dioxyde de carbone et des déchets.",
    'solar array':
      'Les panneaux de cellules solaires qui transforment la lumière du Soleil en électricité pour un engin spatial ou une station.',
  },
  es: {
    splashdown:
      'El final de un vuelo de regreso en el que una cápsula desciende en paracaídas al mar y la recoge un barco de rescate.',
    'sample return':
      'Recoger material en otro cuerpo y traerlo a la Tierra, donde los laboratorios pueden estudiarlo con mucho más detalle que cualquier instrumento enviado allí.',
    regolith:
      'La capa de roca fragmentada y polvo que cubre la Luna, Marte y los asteroides, triturada por miles de millones de años de impactos.',
    microgravity:
      'El estado casi ingrávido de todo lo que está en órbita, que cae alrededor de la Tierra junto con su nave.',
    'life support':
      'Los sistemas que mantienen viva a la tripulación: aire respirable, agua, la temperatura adecuada y la eliminación del dióxido de carbono y los residuos.',
    'solar array':
      'Los paneles de células solares que convierten la luz del Sol en electricidad para una nave o una estación.',
  },
  it: {
    splashdown:
      'La fine di un volo di ritorno in cui una capsula scende in mare con i paracadute e viene recuperata da una nave.',
    'sample return':
      'Raccogliere materiale su un altro corpo e riportarlo sulla Terra, dove i laboratori possono studiarlo molto più a fondo di qualsiasi strumento inviato sul posto.',
    regolith:
      'Lo strato di roccia frantumata e polvere che ricopre la Luna, Marte e gli asteroidi, macinato da miliardi di anni di impatti.',
    microgravity:
      'Lo stato di quasi assenza di peso di tutto ciò che è in orbita e cade intorno alla Terra insieme al suo veicolo.',
    'life support':
      "I sistemi che tengono in vita l'equipaggio: aria respirabile, acqua, la giusta temperatura e la rimozione di anidride carbonica e rifiuti.",
    'solar array':
      'I pannelli di celle solari che trasformano la luce del Sole in elettricità per un veicolo spaziale o una stazione.',
  },
  nl: {
    splashdown:
      'Het einde van een terugvlucht waarbij een capsule aan parachutes in zee neerkomt en door een bergingsschip wordt opgepikt.',
    'sample return':
      'Materiaal op een ander hemellichaam verzamelen en naar de Aarde terugbrengen, waar laboratoria het veel nauwkeuriger kunnen onderzoeken dan elk instrument ter plaatse.',
    regolith:
      'De laag los, verbrijzeld gesteente en stof die de Maan, Mars en planetoïden bedekt, vermalen door miljarden jaren inslagen.',
    microgravity:
      'De bijna gewichtloze toestand van alles in een baan, dat samen met zijn ruimtevaartuig rond de Aarde valt.',
    'life support':
      'De systemen die een bemanning in leven houden: ademlucht, water, de juiste temperatuur en het afvoeren van koolstofdioxide en afval.',
    'solar array':
      'De panelen van zonnecellen die zonlicht omzetten in stroom voor een ruimtevaartuig of station.',
  },
  'pt-BR': {
    splashdown:
      'O fim de um voo de volta em que uma cápsula desce de paraquedas no mar e é recolhida por um navio de resgate.',
    'sample return':
      'Coletar material em outro corpo e trazê-lo à Terra, onde os laboratórios podem estudá-lo com muito mais detalhe do que qualquer instrumento enviado até lá.',
    regolith:
      'A camada de rocha fragmentada e poeira que cobre a Lua, Marte e os asteroides, moída por bilhões de anos de impactos.',
    microgravity:
      'O estado quase sem peso de tudo o que está em órbita, que cai ao redor da Terra junto com sua nave.',
    'life support':
      'Os sistemas que mantêm a tripulação viva: ar respirável, água, a temperatura certa e a remoção de dióxido de carbono e de resíduos.',
    'solar array':
      'Os painéis de células solares que transformam a luz do Sol em eletricidade para uma nave ou uma estação.',
  },
};

for (const [loc, defs] of Object.entries(D)) {
  const f = `i18n-src/${loc}/glossary/terms.json`;
  const cur = JSON.parse(fs.readFileSync(f, 'utf8'));
  let n = 0;
  for (const [k, v] of Object.entries(defs))
    if (!(k in cur)) {
      cur[k] = v;
      n++;
    }
  fs.writeFileSync(f, JSON.stringify(cur, null, 2) + '\n');
  console.log(loc, n);
}
