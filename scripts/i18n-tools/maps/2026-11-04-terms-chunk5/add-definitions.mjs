// Chunk 5: /science/glossary definitions of the six astronomy terms, written by hand in all 14
// locales (2026-11-04), in the existing entries' style. Appends; never overwrites a definition.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk5/add-definitions.mjs
import fs from 'node:fs';

const D = {
  'en-US': {
    exoplanet:
      'A planet that orbits a star other than the Sun; more than 5,000 are known, most found by the dip in light as they cross their star.',
    'light-year':
      'The distance light travels in one year, about 9.46 trillion km — a measure of distance, not of time.',
    'habitable zone':
      'The range of distances from a star where a planet could keep liquid water on its surface: not too hot, not too cold.',
    'asteroid belt':
      'The wide ring of rocky and metallic bodies between the orbits of Mars and Jupiter, so thinly spread that spacecraft cross it without trouble.',
    'solar wind':
      'The stream of charged particles that flows out from the Sun in every direction at hundreds of kilometres per second.',
    magnetosphere:
      'The region around a planet ruled by its magnetic field, which turns the solar wind aside and traps charged particles in belts.',
  },
  ru: {
    exoplanet:
      'Планета, обращающаяся вокруг другой звезды, а не Солнца; их известно больше 5000, большинство найдено по провалу блеска, когда планета проходит по диску звезды.',
    'light-year':
      'Расстояние, которое свет проходит за год, — около 9,46 трлн км; это мера расстояния, а не времени.',
    'habitable zone':
      'Область расстояний от звезды, где на поверхности планеты может сохраняться жидкая вода: не слишком жарко и не слишком холодно.',
    'asteroid belt':
      'Широкое кольцо каменных и металлических тел между орбитами Марса и Юпитера, настолько разреженное, что аппараты пересекают его без труда.',
    'solar wind':
      'Поток заряженных частиц, который исходит от Солнца во все стороны со скоростью в сотни километров в секунду.',
    magnetosphere:
      'Область вокруг планеты, где властвует её магнитное поле: оно отклоняет солнечный ветер и удерживает заряженные частицы в радиационных поясах.',
  },
  ja: {
    exoplanet:
      '太陽以外の恒星を公転する惑星。5,000個以上が知られ、その多くは恒星の前を横切るときの減光で見つかった。',
    'light-year': '光が1年間に進む距離で、約9.46兆km。時間ではなく距離の単位である。',
    'habitable zone':
      '惑星の表面に液体の水が存在できる、恒星からの距離の範囲。暑すぎず寒すぎない領域。',
    'asteroid belt':
      '火星と木星の軌道のあいだにある岩石や金属の天体の広い帯。まばらなので、探査機は問題なく通り抜けられる。',
    'solar wind': '太陽から四方八方へ秒速数百kmで流れ出す荷電粒子の流れ。',
    magnetosphere:
      '惑星の磁場が支配する周囲の領域。太陽風をそらし、荷電粒子を放射線帯に閉じ込める。',
  },
  'zh-CN': {
    exoplanet:
      '环绕太阳以外其他恒星的行星；已知的超过5000颗，大多是在它们从恒星前方经过、使星光变暗时发现的。',
    'light-year': '光在一年中走过的距离，约9.46万亿千米——是距离单位，不是时间单位。',
    'habitable zone': '离恒星的一段距离范围，行星表面在这里能保持液态水：不太热，也不太冷。',
    'asteroid belt':
      '火星与木星轨道之间由岩石和金属天体组成的宽阔环带，分布极其稀疏，航天器可以轻松穿过。',
    'solar wind': '从太阳向四面八方流出、速度达每秒数百千米的带电粒子流。',
    magnetosphere: '行星周围由其磁场主导的区域，它使太阳风偏转，并把带电粒子困在辐射带中。',
  },
  ko: {
    exoplanet:
      '태양이 아닌 다른 별을 도는 행성. 5,000개 넘게 알려져 있으며, 대부분 별 앞을 지날 때 빛이 줄어드는 것으로 발견되었다.',
    'light-year': '빛이 1년 동안 가는 거리로, 약 9조 4,600억 km이다. 시간이 아니라 거리의 단위다.',
    'habitable zone':
      '행성 표면에 액체 상태의 물이 있을 수 있는, 별로부터의 거리 범위. 너무 뜨겁지도 차갑지도 않은 곳이다.',
    'asteroid belt':
      '화성과 목성 궤도 사이에 있는 암석과 금속 천체들의 넓은 띠. 매우 듬성듬성해서 탐사선이 쉽게 지나간다.',
    'solar wind': '태양에서 사방으로 초속 수백 km로 흘러나오는 하전 입자의 흐름.',
    magnetosphere:
      '행성의 자기장이 지배하는 주변 영역. 태양풍을 비껴가게 하고 하전 입자를 방사선대에 가둔다.',
  },
  hi: {
    exoplanet:
      'सूर्य के अलावा किसी दूसरे तारे की परिक्रमा करने वाला ग्रह; 5,000 से अधिक ज्ञात हैं, ज़्यादातर अपने तारे के सामने से गुज़रते समय रोशनी में आई गिरावट से खोजे गए।',
    'light-year':
      'वह दूरी जो प्रकाश एक वर्ष में तय करता है, लगभग 9.46 लाख करोड़ km — यह दूरी का माप है, समय का नहीं।',
    'habitable zone':
      'किसी तारे से दूरियों का वह दायरा जहाँ किसी ग्रह की सतह पर तरल पानी टिक सकता है: न बहुत गर्म, न बहुत ठंडा।',
    'asteroid belt':
      'मंगल और बृहस्पति की कक्षाओं के बीच चट्टानी और धात्विक पिंडों का चौड़ा घेरा, इतना विरल कि अंतरिक्ष यान उसे आसानी से पार कर जाते हैं।',
    'solar wind':
      'आवेशित कणों की वह धारा जो सूर्य से हर दिशा में सैकड़ों किलोमीटर प्रति सेकंड की गति से बहती है।',
    magnetosphere:
      'किसी ग्रह के चारों ओर का वह क्षेत्र जिस पर उसके चुंबकीय क्षेत्र का राज है; यह सौर पवन को मोड़ देता है और आवेशित कणों को विकिरण पट्टियों में बाँध लेता है।',
  },
  ar: {
    exoplanet:
      'كوكب يدور حول نجم غير الشمس؛ يُعرف منها أكثر من 5000، ومعظمها اكتُشف من خفوت ضوء النجم حين يعبر الكوكب أمامه.',
    'light-year':
      'المسافة التي يقطعها الضوء في سنة، نحو 9.46 تريليون كم — وهي وحدة مسافة لا وحدة زمن.',
    'habitable zone':
      'نطاق المسافات حول نجم يمكن فيه أن يحتفظ كوكب بماء سائل على سطحه: لا شديد الحرارة ولا شديد البرودة.',
    'asteroid belt':
      'حلقة واسعة من الأجرام الصخرية والمعدنية بين مداري المريخ والمشتري، متناثرة إلى حدّ أن المركبات تعبرها دون عناء.',
    'solar wind':
      'تيار من الجسيمات المشحونة يتدفق من الشمس في كل الاتجاهات بسرعة مئات الكيلومترات في الثانية.',
    magnetosphere:
      'المنطقة المحيطة بكوكب التي يسيطر عليها مجاله المغناطيسي، فيحرف الرياح الشمسية ويحبس الجسيمات المشحونة في أحزمة إشعاعية.',
  },
  'sr-Cyrl': {
    exoplanet:
      'Планета која кружи око неке друге звезде, а не око Сунца; познато их је више од 5000, а већина је пронађена по паду сјаја док пролазе испред своје звезде.',
    'light-year':
      'Растојање које светлост пређе за годину, око 9,46 билиона km — мера растојања, а не времена.',
    'habitable zone':
      'Опсег растојања од звезде на коме планета може да задржи течну воду на површини: ни превише топло, ни превише хладно.',
    'asteroid belt':
      'Широк прстен каменитих и металних тела између орбита Марса и Јупитера, толико редак да га летелице прелазе без тешкоћа.',
    'solar wind':
      'Ток наелектрисаних честица који из Сунца струји на све стране брзином од више стотина километара у секунди.',
    magnetosphere:
      'Област око планете којом влада њено магнетно поље: оно скреће сунчев ветар и задржава наелектрисане честице у радијационим појасевима.',
  },
  de: {
    exoplanet:
      'Ein Planet, der einen anderen Stern als die Sonne umkreist; über 5000 sind bekannt, die meisten gefunden am Lichtabfall, wenn sie vor ihrem Stern vorbeiziehen.',
    'light-year':
      'Die Strecke, die Licht in einem Jahr zurücklegt, rund 9,46 Billionen km – ein Maß für Entfernung, nicht für Zeit.',
    'habitable zone':
      'Der Abstandsbereich um einen Stern, in dem ein Planet flüssiges Wasser an seiner Oberfläche halten könnte: nicht zu heiß, nicht zu kalt.',
    'asteroid belt':
      'Der breite Ring aus Gesteins- und Metallkörpern zwischen den Bahnen von Mars und Jupiter, so dünn besetzt, dass Raumsonden ihn mühelos durchqueren.',
    'solar wind':
      'Der Strom geladener Teilchen, der mit Hunderten Kilometern pro Sekunde in alle Richtungen von der Sonne abfließt.',
    magnetosphere:
      'Der Bereich um einen Planeten, den sein Magnetfeld beherrscht: Es lenkt den Sonnenwind ab und hält geladene Teilchen in Strahlungsgürteln fest.',
  },
  fr: {
    exoplanet:
      "Une planète en orbite autour d'une autre étoile que le Soleil ; on en connaît plus de 5 000, la plupart trouvées par la baisse de lumière quand elles passent devant leur étoile.",
    'light-year':
      'La distance que la lumière parcourt en un an, environ 9 460 milliards de km — une mesure de distance, pas de temps.',
    'habitable zone':
      "La plage de distances autour d'une étoile où une planète pourrait garder de l'eau liquide en surface : ni trop chaud, ni trop froid.",
    'asteroid belt':
      'Le large anneau de corps rocheux et métalliques entre les orbites de Mars et de Jupiter, si clairsemé que les sondes le traversent sans difficulté.',
    'solar wind':
      "Le flux de particules chargées qui s'échappe du Soleil dans toutes les directions à des centaines de kilomètres par seconde.",
    magnetosphere:
      "La région autour d'une planète dominée par son champ magnétique, qui dévie le vent solaire et piège les particules chargées dans des ceintures de rayonnement.",
  },
  es: {
    exoplanet:
      'Un planeta en órbita alrededor de una estrella distinta del Sol; se conocen más de 5000, la mayoría hallados por la caída de luz cuando pasan por delante de su estrella.',
    'light-year':
      'La distancia que recorre la luz en un año, unos 9,46 billones de km: una medida de distancia, no de tiempo.',
    'habitable zone':
      'La franja de distancias alrededor de una estrella en la que un planeta podría conservar agua líquida en la superficie: ni demasiado caliente ni demasiado frío.',
    'asteroid belt':
      'El amplio anillo de cuerpos rocosos y metálicos entre las órbitas de Marte y Júpiter, tan disperso que las naves lo cruzan sin dificultad.',
    'solar wind':
      'El flujo de partículas cargadas que sale del Sol en todas direcciones a cientos de kilómetros por segundo.',
    magnetosphere:
      'La región alrededor de un planeta dominada por su campo magnético, que desvía el viento solar y atrapa partículas cargadas en cinturones de radiación.',
  },
  it: {
    exoplanet:
      'Un pianeta che orbita attorno a una stella diversa dal Sole; se ne conoscono più di 5000, quasi tutti scoperti dal calo di luce quando passano davanti alla loro stella.',
    'light-year':
      'La distanza che la luce percorre in un anno, circa 9460 miliardi di km: una misura di distanza, non di tempo.',
    'habitable zone':
      "L'intervallo di distanze da una stella in cui un pianeta potrebbe mantenere acqua liquida in superficie: né troppo caldo né troppo freddo.",
    'asteroid belt':
      "L'ampio anello di corpi rocciosi e metallici tra le orbite di Marte e Giove, così rado che le sonde lo attraversano senza difficoltà.",
    'solar wind':
      'Il flusso di particelle cariche che esce dal Sole in ogni direzione a centinaia di chilometri al secondo.',
    magnetosphere:
      'La regione attorno a un pianeta dominata dal suo campo magnetico, che devia il vento solare e intrappola le particelle cariche in fasce di radiazione.',
  },
  nl: {
    exoplanet:
      'Een planeet in een baan om een andere ster dan de Zon; er zijn er meer dan 5000 bekend, de meeste gevonden aan de lichtdip als ze voor hun ster langs schuiven.',
    'light-year':
      'De afstand die licht in een jaar aflegt, ongeveer 9,46 biljoen km — een maat voor afstand, niet voor tijd.',
    'habitable zone':
      'Het gebied van afstanden rond een ster waarin een planeet vloeibaar water aan het oppervlak zou kunnen houden: niet te heet, niet te koud.',
    'asteroid belt':
      'De brede ring van rotsachtige en metaalrijke lichamen tussen de banen van Mars en Jupiter, zo ijl dat ruimtesondes er zonder moeite doorheen vliegen.',
    'solar wind':
      'De stroom geladen deeltjes die met honderden kilometers per seconde in alle richtingen van de Zon wegstroomt.',
    magnetosphere:
      'Het gebied rond een planeet waar zijn magnetisch veld de baas is: het buigt de zonnewind af en houdt geladen deeltjes vast in stralingsgordels.',
  },
  'pt-BR': {
    exoplanet:
      'Um planeta que orbita outra estrela que não o Sol; mais de 5.000 são conhecidos, a maioria encontrada pela queda de luz quando passam na frente de sua estrela.',
    'light-year':
      'A distância que a luz percorre em um ano, cerca de 9,46 trilhões de km — uma medida de distância, não de tempo.',
    'habitable zone':
      'A faixa de distâncias de uma estrela em que um planeta poderia manter água líquida na superfície: nem quente demais, nem frio demais.',
    'asteroid belt':
      'O largo anel de corpos rochosos e metálicos entre as órbitas de Marte e Júpiter, tão esparso que as sondas o atravessam sem dificuldade.',
    'solar wind':
      'O fluxo de partículas carregadas que sai do Sol em todas as direções a centenas de quilômetros por segundo.',
    magnetosphere:
      'A região em torno de um planeta dominada por seu campo magnético, que desvia o vento solar e prende partículas carregadas em cinturões de radiação.',
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
