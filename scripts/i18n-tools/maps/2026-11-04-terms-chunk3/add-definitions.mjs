// Chunk 3: /science/glossary definitions of the eight orbit terms, written by hand in all 14
// locales (2026-11-04), in the existing entries' style. Appends; never overwrites a definition.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk3/add-definitions.mjs
import fs from 'node:fs';

const D = {
  'en-US': {
    'low Earth orbit':
      'An orbit from about 160 to 2,000 km above the Earth, where the ISS and most satellites fly, circling the planet in about 90 minutes.',
    geostationary:
      'The circular orbit 35,786 km above the equator in which a satellite goes round once a day and so stays over the same spot on the ground.',
    'polar orbit':
      'An orbit that passes over or near both poles, so the ground turns beneath it and the spacecraft sees the whole surface in time.',
    perihelion: 'The point of an orbit around the Sun that is closest to the Sun.',
    aphelion: 'The point of an orbit around the Sun that is farthest from the Sun.',
    eccentricity:
      'How stretched an orbit is: 0 is a circle, values between 0 and 1 are ever longer ellipses, 1 and above are open paths that never return.',
    'launch window':
      'The period in which a launch can reach its target with the propellant on board, set by where the Earth and the target are.',
    'escape velocity':
      "The speed an object needs to leave a body for good without further thrust: about 11.2 km/s from the Earth's surface.",
  },
  ru: {
    'low Earth orbit':
      'Орбита на высоте примерно от 160 до 2000 км над Землёй, где летают МКС и большинство спутников, совершая виток примерно за 90 минут.',
    geostationary:
      'Круговая орбита на высоте 35 786 км над экватором, на которой спутник делает один оборот в сутки и поэтому висит над одной точкой Земли.',
    'polar orbit':
      'Орбита, проходящая над полюсами или рядом с ними: Земля вращается под ней, и аппарат со временем видит всю поверхность.',
    perihelion: 'Ближайшая к Солнцу точка орбиты вокруг Солнца.',
    aphelion: 'Самая далёкая от Солнца точка орбиты вокруг Солнца.',
    eccentricity:
      'Мера вытянутости орбиты: 0 — окружность, значения от 0 до 1 — всё более вытянутые эллипсы, 1 и больше — разомкнутые траектории без возврата.',
    'launch window':
      'Период, когда запуск может достичь цели с имеющимся запасом топлива; он определяется взаимным положением Земли и цели.',
    'escape velocity':
      'Скорость, которая нужна телу, чтобы навсегда покинуть небесное тело без дополнительной тяги: около 11,2 км/с у поверхности Земли.',
  },
  ja: {
    'low Earth orbit':
      '地上約160〜2,000 kmの軌道。ISSや多くの人工衛星が飛び、約90分で地球を1周する。',
    geostationary:
      '赤道上空35,786 kmの円軌道。衛星は1日に1周するため、地上の同じ地点の上にとどまって見える。',
    'polar orbit':
      '両極の上空またはその近くを通る軌道。下で地球が自転するので、宇宙機はやがて地表全体を見渡せる。',
    perihelion: '太陽を回る軌道のうち、太陽に最も近い点。',
    aphelion: '太陽を回る軌道のうち、太陽から最も遠い点。',
    eccentricity:
      '軌道の細長さを表す数。0は円、0から1のあいだはしだいに細長い楕円、1以上は戻ってこない開いた軌道になる。',
    'launch window':
      '積んだ推進剤で目標に到達できる打ち上げの期間。地球と目標天体の位置関係で決まる。',
    'escape velocity':
      'それ以上の推力なしに天体から永久に離れるのに必要な速さ。地表からは約11.2 km/s。',
  },
  'zh-CN': {
    'low Earth orbit':
      '距地面约160至2000千米的轨道，国际空间站和大多数卫星都在这里运行，约90分钟绕地球一圈。',
    geostationary:
      '赤道上空35786千米处的圆轨道，卫星每天绕行一周，因而始终停在地面同一地点的上方。',
    'polar orbit': '经过两极上空或附近的轨道。地球在下方自转，航天器随时间推移可以看到整个地表。',
    perihelion: '绕太阳运行的轨道上离太阳最近的点。',
    aphelion: '绕太阳运行的轨道上离太阳最远的点。',
    eccentricity:
      '描述轨道拉长程度的数：0是圆，0到1之间是越来越扁长的椭圆，1及以上是一去不返的开放轨迹。',
    'launch window': '用所带推进剂能够抵达目标的发射时段，由地球与目标天体的相对位置决定。',
    'escape velocity':
      '物体在没有额外推力的情况下永远离开某个天体所需的速度：从地球表面出发约为11.2千米/秒。',
  },
  ko: {
    'low Earth orbit':
      '지상 약 160~2,000 km 높이의 궤도. ISS와 대부분의 위성이 이곳을 날며 약 90분에 지구를 한 바퀴 돈다.',
    geostationary:
      '적도 상공 35,786 km의 원 궤도. 위성이 하루에 한 바퀴 돌기 때문에 지상의 같은 지점 위에 머문다.',
    'polar orbit':
      '양극 위나 그 가까이를 지나는 궤도. 아래에서 지구가 자전하므로 우주선은 시간이 지나면 지표 전체를 보게 된다.',
    perihelion: '태양을 도는 궤도에서 태양에 가장 가까운 점.',
    aphelion: '태양을 도는 궤도에서 태양에서 가장 먼 점.',
    eccentricity:
      '궤도가 얼마나 길쭉한지를 나타내는 수. 0은 원, 0과 1 사이는 점점 길어지는 타원, 1 이상은 돌아오지 않는 열린 궤적이다.',
    'launch window':
      '실은 추진제로 목표에 닿을 수 있는 발사 기간. 지구와 목표 천체의 위치로 정해진다.',
    'escape velocity':
      '추가 추력 없이 천체를 영영 떠나는 데 필요한 속도. 지구 표면에서는 약 11.2 km/s이다.',
  },
  hi: {
    'low Earth orbit':
      'पृथ्वी से लगभग 160 से 2,000 km ऊपर की कक्षा, जहाँ ISS और अधिकांश उपग्रह उड़ते हैं और लगभग 90 मिनट में पृथ्वी का एक चक्कर लगाते हैं।',
    geostationary:
      'भूमध्य रेखा से 35,786 km ऊपर की वृत्ताकार कक्षा, जिसमें उपग्रह दिन में एक चक्कर लगाता है और इसलिए ज़मीन के एक ही स्थान के ऊपर टिका रहता है।',
    'polar orbit':
      'ध्रुवों के ऊपर या उनके पास से गुज़रने वाली कक्षा; नीचे पृथ्वी घूमती है, इसलिए अंतरिक्ष यान समय के साथ पूरी सतह देख लेता है।',
    perihelion: 'सूर्य के चारों ओर की कक्षा का वह बिंदु जो सूर्य के सबसे निकट है।',
    aphelion: 'सूर्य के चारों ओर की कक्षा का वह बिंदु जो सूर्य से सबसे दूर है।',
    eccentricity:
      'कक्षा कितनी खिंची हुई है, इसका माप: 0 वृत्त है, 0 और 1 के बीच के मान लगातार लंबे दीर्घवृत्त हैं, और 1 या उससे अधिक खुले पथ हैं जो लौटते नहीं।',
    'launch window':
      'वह अवधि जिसमें प्रक्षेपण साथ ले जाए गए प्रणोदक से अपने लक्ष्य तक पहुँच सकता है; यह पृथ्वी और लक्ष्य की स्थिति से तय होती है।',
    'escape velocity':
      'वह वेग जिससे कोई वस्तु बिना और प्रणोद के किसी पिंड को हमेशा के लिए छोड़ देती है: पृथ्वी की सतह से लगभग 11.2 km/s।',
  },
  ar: {
    'low Earth orbit':
      'مدار يقع على ارتفاع يتراوح بين نحو 160 و2000 كم فوق الأرض، تحلّق فيه محطة الفضاء الدولية ومعظم الأقمار الصناعية، وتدور فيه حول الأرض في نحو 90 دقيقة.',
    geostationary:
      'المدار الدائري على ارتفاع 35786 كم فوق خط الاستواء، يدور فيه القمر الصناعي دورة واحدة كل يوم فيبقى فوق النقطة نفسها من الأرض.',
    'polar orbit':
      'مدار يمر فوق القطبين أو قريبًا منهما، فتدور الأرض تحته وترى المركبة سطحها كله مع الوقت.',
    perihelion: 'نقطة المدار حول الشمس الأقرب إلى الشمس.',
    aphelion: 'نقطة المدار حول الشمس الأبعد عن الشمس.',
    eccentricity:
      'مقدار استطالة المدار: الصفر دائرة، والقيم بين 0 و1 قطوع ناقصة تزداد استطالة، و1 فما فوق مسارات مفتوحة لا عودة منها.',
    'launch window':
      'الفترة التي يستطيع فيها الإطلاق بلوغ هدفه بالوقود الدافع المحمول، وتحددها مواقع الأرض والهدف.',
    'escape velocity':
      'السرعة التي يحتاجها جسم ليغادر جرمًا ما نهائيًا دون دفع إضافي: نحو 11.2 كم/ث من سطح الأرض.',
  },
  'sr-Cyrl': {
    'low Earth orbit':
      'Орбита на висини од око 160 до 2000 km изнад Земље, где лете МСС и већина сателита, обилазећи планету за око 90 минута.',
    geostationary:
      'Кружна орбита 35 786 km изнад екватора, на којој сателит направи један обилазак дневно и зато стоји изнад исте тачке на тлу.',
    'polar orbit':
      'Орбита која пролази изнад полова или близу њих, па се Земља окреће испод ње и летелица временом види целу површину.',
    perihelion: 'Тачка орбите око Сунца која је најближа Сунцу.',
    aphelion: 'Тачка орбите око Сунца која је најдаља од Сунца.',
    eccentricity:
      'Мера издужености орбите: 0 је круг, вредности између 0 и 1 су све издуженије елипсе, а 1 и више отворене путање које се не враћају.',
    'launch window':
      'Период у коме лансирање може да стигне до циља са горивом које носи; одређују га положаји Земље и циља.',
    'escape velocity':
      'Брзина којом тело трајно напушта неко небеско тело без додатног потиска: око 11,2 km/s са површине Земље.',
  },
  de: {
    'low Earth orbit':
      'Eine Umlaufbahn etwa 160 bis 2000 km über der Erde, in der die ISS und die meisten Satelliten fliegen und die Erde in rund 90 Minuten umrunden.',
    geostationary:
      'Die Kreisbahn 35 786 km über dem Äquator, auf der ein Satellit einmal am Tag umläuft und so über demselben Punkt der Erde stehen bleibt.',
    'polar orbit':
      'Eine Umlaufbahn über oder nahe den Polen: Die Erde dreht sich darunter weg, sodass die Raumsonde mit der Zeit die ganze Oberfläche sieht.',
    perihelion: 'Der sonnennächste Punkt einer Bahn um die Sonne.',
    aphelion: 'Der sonnenfernste Punkt einer Bahn um die Sonne.',
    eccentricity:
      'Wie gestreckt eine Bahn ist: 0 ist ein Kreis, Werte zwischen 0 und 1 sind immer längere Ellipsen, ab 1 offene Bahnen ohne Wiederkehr.',
    'launch window':
      'Der Zeitraum, in dem ein Start sein Ziel mit dem mitgeführten Treibstoff erreichen kann – bestimmt durch die Stellung von Erde und Ziel.',
    'escape velocity':
      'Die Geschwindigkeit, mit der ein Körper einen Himmelskörper ohne weiteren Schub für immer verlässt: rund 11,2 km/s von der Erdoberfläche.',
  },
  fr: {
    'low Earth orbit':
      "Une orbite située entre environ 160 et 2 000 km au-dessus de la Terre, où volent l'ISS et la plupart des satellites, qui font le tour de la planète en environ 90 minutes.",
    geostationary:
      "L'orbite circulaire à 35 786 km au-dessus de l'équateur, où un satellite fait un tour par jour et reste donc au-dessus du même point du sol.",
    'polar orbit':
      "Une orbite qui passe au-dessus des pôles ou près d'eux : la Terre tourne en dessous, et l'engin finit par voir toute la surface.",
    perihelion: "Le point d'une orbite autour du Soleil le plus proche du Soleil.",
    aphelion: "Le point d'une orbite autour du Soleil le plus éloigné du Soleil.",
    eccentricity:
      "L'allongement d'une orbite : 0 est un cercle, les valeurs entre 0 et 1 des ellipses de plus en plus étirées, 1 et au-delà des trajectoires ouvertes sans retour.",
    'launch window':
      'La période pendant laquelle un lancement peut atteindre sa cible avec les ergols embarqués, fixée par les positions de la Terre et de la cible.',
    'escape velocity':
      "La vitesse qu'il faut à un objet pour quitter définitivement un corps sans poussée supplémentaire : environ 11,2 km/s depuis la surface de la Terre.",
  },
  es: {
    'low Earth orbit':
      'Una órbita entre unos 160 y 2000 km sobre la Tierra, donde vuelan la ISS y la mayoría de los satélites, que dan la vuelta al planeta en unos 90 minutos.',
    geostationary:
      'La órbita circular a 35 786 km sobre el ecuador en la que un satélite da una vuelta al día y por eso se queda sobre el mismo punto del suelo.',
    'polar orbit':
      'Una órbita que pasa sobre los polos o cerca de ellos: la Tierra gira debajo y la nave acaba viendo toda la superficie.',
    perihelion: 'El punto de una órbita alrededor del Sol más cercano al Sol.',
    aphelion: 'El punto de una órbita alrededor del Sol más alejado del Sol.',
    eccentricity:
      'Cuánto se estira una órbita: 0 es un círculo, los valores entre 0 y 1 son elipses cada vez más alargadas y 1 o más son trayectorias abiertas que no vuelven.',
    'launch window':
      'El periodo en el que un lanzamiento puede alcanzar su objetivo con el propelente que lleva, fijado por las posiciones de la Tierra y del destino.',
    'escape velocity':
      'La velocidad que necesita un objeto para abandonar para siempre un cuerpo sin más empuje: unos 11,2 km/s desde la superficie de la Tierra.',
  },
  it: {
    'low Earth orbit':
      "Un'orbita tra circa 160 e 2000 km sopra la Terra, dove volano la SSI e la maggior parte dei satelliti, che fanno il giro del pianeta in circa 90 minuti.",
    geostationary:
      "L'orbita circolare a 35 786 km sopra l'equatore in cui un satellite compie un giro al giorno e resta così sopra lo stesso punto del suolo.",
    'polar orbit':
      "Un'orbita che passa sopra i poli o vicino a essi: la Terra ruota sotto, e il veicolo finisce per vedere tutta la superficie.",
    perihelion: "Il punto di un'orbita intorno al Sole più vicino al Sole.",
    aphelion: "Il punto di un'orbita intorno al Sole più lontano dal Sole.",
    eccentricity:
      "Quanto è allungata un'orbita: 0 è un cerchio, i valori tra 0 e 1 sono ellissi sempre più allungate, 1 e oltre sono traiettorie aperte senza ritorno.",
    'launch window':
      'Il periodo in cui un lancio può raggiungere il suo obiettivo con il propellente a bordo, fissato dalle posizioni della Terra e della destinazione.',
    'escape velocity':
      'La velocità che serve a un oggetto per lasciare per sempre un corpo senza ulteriore spinta: circa 11,2 km/s dalla superficie terrestre.',
  },
  nl: {
    'low Earth orbit':
      'Een baan op ongeveer 160 tot 2000 km boven de Aarde, waar het ISS en de meeste satellieten vliegen en de planeet in zo’n 90 minuten rondgaan.',
    geostationary:
      'De cirkelvormige baan 35.786 km boven de evenaar waarin een satelliet eenmaal per dag rondgaat en zo boven hetzelfde punt op de grond blijft staan.',
    'polar orbit':
      'Een baan over of vlak langs beide polen: de Aarde draait eronder door, zodat het ruimtevaartuig na verloop van tijd het hele oppervlak ziet.',
    perihelion: 'Het punt van een baan om de Zon dat het dichtst bij de Zon ligt.',
    aphelion: 'Het punt van een baan om de Zon dat het verst van de Zon ligt.',
    eccentricity:
      'Hoe uitgerekt een baan is: 0 is een cirkel, waarden tussen 0 en 1 zijn steeds langere ellipsen, 1 en hoger open banen die niet terugkeren.',
    'launch window':
      'De periode waarin een lancering haar doel kan bereiken met de stuwstof aan boord, bepaald door de stand van de Aarde en het doel.',
    'escape velocity':
      'De snelheid die een voorwerp nodig heeft om een hemellichaam zonder verdere stuwkracht voorgoed te verlaten: zo’n 11,2 km/s vanaf het aardoppervlak.',
  },
  'pt-BR': {
    'low Earth orbit':
      'Uma órbita entre cerca de 160 e 2.000 km acima da Terra, onde voam a EEI e a maioria dos satélites, que dão a volta no planeta em cerca de 90 minutos.',
    geostationary:
      'A órbita circular a 35.786 km acima do equador, em que um satélite dá uma volta por dia e por isso fica parado sobre o mesmo ponto do solo.',
    'polar orbit':
      'Uma órbita que passa sobre os polos ou perto deles: a Terra gira por baixo e a nave acaba vendo toda a superfície.',
    perihelion: 'O ponto de uma órbita ao redor do Sol mais próximo do Sol.',
    aphelion: 'O ponto de uma órbita ao redor do Sol mais distante do Sol.',
    eccentricity:
      'O quanto uma órbita é alongada: 0 é um círculo, valores entre 0 e 1 são elipses cada vez mais alongadas, e 1 ou mais são trajetórias abertas que não voltam.',
    'launch window':
      'O período em que um lançamento pode alcançar seu alvo com o propelente a bordo, definido pelas posições da Terra e do destino.',
    'escape velocity':
      'A velocidade de que um objeto precisa para deixar um corpo para sempre sem mais empuxo: cerca de 11,2 km/s a partir da superfície da Terra.',
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
