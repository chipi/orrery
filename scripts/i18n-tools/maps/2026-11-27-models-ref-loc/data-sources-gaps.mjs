// The /credits data-section descriptions that drifted from the English: three entries added in
// English only (the LMC/SMC eclipsing-binary distances, the Yutu and Pragyan rover maps) and
// McConnachie 2012, whose English changed when the Magellanic Clouds moved to the binaries.
// Entry names are not translated on /credits, so "Magellanic Cloud distances" stays in English.
//   node scripts/i18n-tools/maps/2026-11-27-models-ref-loc/data-sources-gaps.mjs
import fs from 'node:fs';

const MC = '“Magellanic Cloud distances”';
const T = {
  de: {
    mag: 'Die Entfernungen der Großen Magellanschen Wolke (49,59 kpc) und der Kleinen Magellanschen Wolke (62,44 kpc) aus Bedeckungsveränderlichen später Spektraltypen, verwendet für beide Galaxien und für die Haufen und Nebel in ihnen (30 Doradus, NGC 2014/2020, NGC 346, NGC 602).',
    yutu: 'Die Ortsbestimmung der 17 Standorte des Rovers Yutu (N0101 bis N0209) durch das Team von Chang’e 3, Stand 16. Januar 2014; Lander und Standorte wurden aus Abbildung 5 (metrisches Gitter, 10-m-Maßstab) digitalisiert und auf der Ansicht der Mondoberfläche eingezeichnet.',
    pragyan:
      'Die Karte des Chandrayaan-3-Teams mit den 23 APXS-Messpunkten des Rovers Pragyan rund um den Lander Vikram, mit Breiten- und Längenachsen; die Messpunkte wurden aus Abbildung 1c digitalisiert und auf der Ansicht der Mondoberfläche eingezeichnet.',
    mcc: `Entfernungen der Galaxien der Lokalen Gruppe sowie der Haufen und Nebel in M33 nach McConnachie 2012. Die beiden Magellanschen Wolken und die Objekte in ihnen verwenden die Entfernungen aus Bedeckungsveränderlichen (siehe ${MC}).`,
  },
  fr: {
    mag: 'Les distances du Grand Nuage de Magellan (49,59 kpc) et du Petit Nuage de Magellan (62,44 kpc) tirées de binaires à éclipses de type tardif, utilisées pour les deux galaxies et pour les amas et nébuleuses qu’elles contiennent (30 Doradus, NGC 2014/2020, NGC 346, NGC 602).',
    yutu: 'La localisation des 17 stations du rover Yutu (N0101 à N0209) par l’équipe de Chang’e 3, au 16 janvier 2014 ; l’atterrisseur et les stations ont été numérisés à partir de la figure 5 (grille métrique, barre d’échelle de 10 m) et tracés sur la vue de la surface de la Lune.',
    pragyan:
      'La carte de l’équipe de Chandrayaan-3 des 23 arrêts d’observation APXS du rover Pragyan autour de l’atterrisseur Vikram, avec axes de latitude et de longitude ; les arrêts ont été numérisés à partir de la figure 1c et tracés sur la vue de la surface de la Lune.',
    mcc: `Distances des galaxies du Groupe local, et des amas et nébuleuses de M33, d’après McConnachie 2012. Les deux Nuages de Magellan et les objets qu’ils contiennent utilisent les distances des binaires à éclipses (voir ${MC}).`,
  },
  es: {
    mag: 'Las distancias de la Gran Nube de Magallanes (49,59 kpc) y de la Pequeña Nube de Magallanes (62,44 kpc) obtenidas de binarias eclipsantes de tipo tardío, usadas para las dos galaxias y para los cúmulos y nebulosas que contienen (30 Doradus, NGC 2014/2020, NGC 346, NGC 602).',
    yutu: 'La localización de los 17 puntos del rover Yutu (N0101 a N0209) por el equipo de Chang’e 3, a fecha de 16 de enero de 2014; el módulo de aterrizaje y los puntos se digitalizaron de la figura 5 (cuadrícula métrica, barra de escala de 10 m) y se dibujan en la vista de la superficie de la Luna.',
    pragyan:
      'El mapa del equipo de Chandrayaan-3 con las 23 paradas de observación APXS del rover Pragyan alrededor del módulo Vikram, con ejes de latitud y longitud; las paradas se digitalizaron de la figura 1c y se dibujan en la vista de la superficie de la Luna.',
    mcc: `Distancias de las galaxias del Grupo Local, y de los cúmulos y nebulosas de M33, según McConnachie 2012. Las dos Nubes de Magallanes y los objetos que contienen usan las distancias de binarias eclipsantes (véase ${MC}).`,
  },
  it: {
    mag: 'Le distanze della Grande Nube di Magellano (49,59 kpc) e della Piccola Nube di Magellano (62,44 kpc) ricavate da binarie a eclisse di tipo tardo, usate per le due galassie e per gli ammassi e le nebulose al loro interno (30 Doradus, NGC 2014/2020, NGC 346, NGC 602).',
    yutu: 'La localizzazione delle 17 soste del rover Yutu (da N0101 a N0209) da parte del team di Chang’e 3, aggiornata al 16 gennaio 2014; il lander e le soste sono stati digitalizzati dalla figura 5 (griglia metrica, barra di scala di 10 m) e disegnati sulla vista della superficie lunare.',
    pragyan:
      'La mappa del team di Chandrayaan-3 con le 23 soste di osservazione APXS del rover Pragyan attorno al lander Vikram, con assi di latitudine e longitudine; le soste sono state digitalizzate dalla figura 1c e disegnate sulla vista della superficie lunare.',
    mcc: `Distanze delle galassie del Gruppo Locale, e degli ammassi e delle nebulose in M33, da McConnachie 2012. Le due Nubi di Magellano e gli oggetti al loro interno usano le distanze delle binarie a eclisse (vedi ${MC}).`,
  },
  'pt-BR': {
    mag: 'As distâncias da Grande Nuvem de Magalhães (49,59 kpc) e da Pequena Nuvem de Magalhães (62,44 kpc) obtidas de binárias eclipsantes de tipo tardio, usadas para as duas galáxias e para os aglomerados e nebulosas dentro delas (30 Doradus, NGC 2014/2020, NGC 346, NGC 602).',
    yutu: 'A localização dos 17 pontos do rover Yutu (N0101 a N0209) pela equipe da Chang’e 3, em 16 de janeiro de 2014; o módulo de pouso e os pontos foram digitalizados da figura 5 (grade métrica, barra de escala de 10 m) e desenhados na vista da superfície da Lua.',
    pragyan:
      'O mapa da equipe da Chandrayaan-3 com as 23 paradas de observação APXS do rover Pragyan ao redor do módulo Vikram, com eixos de latitude e longitude; as paradas foram digitalizadas da figura 1c e desenhadas na vista da superfície da Lua.',
    mcc: `Distâncias das galáxias do Grupo Local, e dos aglomerados e nebulosas em M33, segundo McConnachie 2012. As duas Nuvens de Magalhães e os objetos dentro delas usam as distâncias de binárias eclipsantes (veja ${MC}).`,
  },
  nl: {
    mag: 'De afstanden van de Grote Magelhaense Wolk (49,59 kpc) en de Kleine Magelhaense Wolk (62,44 kpc) uit eclipsdubbelsterren van een laat type, gebruikt voor beide sterrenstelsels en voor de sterrenhopen en nevels erin (30 Doradus, NGC 2014/2020, NGC 346, NGC 602).',
    yutu: 'De plaatsbepaling van de 17 standplaatsen van de rover Yutu (N0101 tot N0209) door het Chang’e 3-team, per 16 januari 2014; de lander en de standplaatsen zijn gedigitaliseerd uit figuur 5 (metrisch raster, schaalstreep van 10 m) en getekend op het maanoppervlak.',
    pragyan:
      'De kaart van het Chandrayaan-3-team met de 23 APXS-meetpunten van de rover Pragyan rond de lander Vikram, met breedte- en lengteassen; de meetpunten zijn gedigitaliseerd uit figuur 1c en getekend op het maanoppervlak.',
    mcc: `Afstanden van de sterrenstelsels van de Lokale Groep, en van de sterrenhopen en nevels in M33, volgens McConnachie 2012. De twee Magelhaense Wolken en de objecten erin gebruiken de afstanden uit eclipsdubbelsterren (zie ${MC}).`,
  },
  ru: {
    mag: 'Расстояния до Большого Магелланова Облака (49,59 кпк) и Малого Магелланова Облака (62,44 кпк) по затменным двойным звёздам поздних спектральных классов; используются для обеих галактик и для скоплений и туманностей в них (30 Золотой Рыбы, NGC 2014/2020, NGC 346, NGC 602).',
    yutu: "Определение положения 17 стоянок лунохода Yutu (N0101–N0209) командой Chang'e 3 на 16 января 2014 года; посадочный модуль и стоянки оцифрованы по рисунку 5 (метрическая сетка, масштабная линейка 10 м) и нанесены на вид поверхности Луны.",
    pragyan:
      'Карта команды Chandrayaan-3 с 23 точками наблюдений APXS лунохода Pragyan вокруг посадочного модуля Vikram, с осями широты и долготы; точки оцифрованы по рисунку 1c и нанесены на вид поверхности Луны.',
    mcc: `Расстояния до галактик Местной группы, а также до скоплений и туманностей в M33, по McConnachie 2012. Для двух Магеллановых Облаков и объектов в них используются расстояния по затменным двойным (см. ${MC}).`,
  },
  'sr-Cyrl': {
    mag: 'Удаљености Великог Магелановог облака (49,59 kpc) и Малог Магелановог облака (62,44 kpc) одређене из помрачинских двојних звезда касног типа, коришћене за обе галаксије и за јата и маглине у њима (30 Doradus, NGC 2014/2020, NGC 346, NGC 602).',
    yutu: "Одређивање положаја 17 станица ровера Yutu (N0101 до N0209) које је урадио тим мисије Chang'e 3, стање на дан 16. јануара 2014; лендер и станице дигитализовани су са слике 5 (метричка мрежа, размерник од 10 m) и уцртани у приказ површине Месеца.",
    pragyan:
      'Мапа тима мисије Chandrayaan-3 са 23 тачке мерења APXS ровера Pragyan око лендера Vikram, са осама географске ширине и дужине; тачке су дигитализоване са слике 1c и уцртане у приказ површине Месеца.',
    mcc: `Удаљености галаксија Локалне групе, као и јата и маглина у M33, према McConnachie 2012. За два Магеланова облака и објекте у њима користе се удаљености из помрачинских двојних звезда (видети ${MC}).`,
  },
  ar: {
    mag: 'مسافتا سحابة ماجلان الكبرى (49.59 kpc) وسحابة ماجلان الصغرى (62.44 kpc) المستخلصتان من نجوم ثنائية كسوفية متأخرة النوع، وتُستخدمان للمجرتين وللعناقيد والسُدُم داخلهما (30 دورادوس، NGC 2014/2020، NGC 346، NGC 602).',
    yutu: "تحديد فريق مهمة Chang'e 3 لمواقع المركبة الجوالة Yutu السبعة عشر (من N0101 إلى N0209) حتى 16 يناير 2014؛ رُقمن المسبار الهابط والمواقع من الشكل 5 (شبكة مترية، مقياس رسم 10 م) ورُسمت على منظر سطح القمر.",
    pragyan:
      'خريطة فريق Chandrayaan-3 لمحطات الرصد الثلاث والعشرين بمطياف APXS للمركبة الجوالة Pragyan حول المسبار الهابط Vikram، مع محاور خطوط العرض والطول؛ رُقمنت المحطات من الشكل 1c ورُسمت على منظر سطح القمر.',
    mcc: `مسافات مجرات المجموعة المحلية، والعناقيد والسُدُم داخل M33، وفق McConnachie 2012. أما سحابتا ماجلان والأجرام داخلهما فتستخدم مسافات الثنائيات الكسوفية (انظر ${MC}).`,
  },
  hi: {
    mag: 'बड़े मैगेलैनिक बादल (49.59 kpc) और छोटे मैगेलैनिक बादल (62.44 kpc) की दूरियाँ, जो देर-प्रकार के ग्रहणकारी युग्म तारों से निकाली गईं; ये दोनों आकाशगंगाओं और उनके भीतर के तारागुच्छों और नीहारिकाओं (30 डोराडस, NGC 2014/2020, NGC 346, NGC 602) के लिए इस्तेमाल होती हैं।',
    yutu: "Chang'e 3 मिशन टीम द्वारा Yutu रोवर के 17 स्थलों (N0101 से N0209) का स्थान-निर्धारण, 16 जनवरी 2014 तक; लैंडर और स्थल चित्र 5 (मीट्रिक ग्रिड, 10 मी पैमाना पट्टी) से डिजिटाइज़ करके चंद्र सतह के दृश्य पर बनाए गए।",
    pragyan:
      'Chandrayaan-3 टीम का नक्शा, जिसमें Vikram लैंडर के चारों ओर Pragyan रोवर के 23 APXS अवलोकन पड़ाव अक्षांश और देशांतर अक्षों के साथ हैं; पड़ाव चित्र 1c से डिजिटाइज़ करके चंद्र सतह के दृश्य पर बनाए गए।',
    mcc: `स्थानीय समूह की आकाशगंगाओं, और M33 के भीतर के तारागुच्छों और नीहारिकाओं की दूरियाँ, McConnachie 2012 से। दोनों मैगेलैनिक बादल और उनके भीतर के पिंड ग्रहणकारी युग्म तारों की दूरियाँ लेते हैं (देखें ${MC})।`,
  },
  ja: {
    mag: '晩期型の食連星から求めた大マゼラン雲（49.59 kpc）と小マゼラン雲（62.44 kpc）の距離。両銀河と、その中の星団・星雲（かじき座30、NGC 2014/2020、NGC 346、NGC 602）に使っています。',
    yutu: "Chang'e 3 のミッションチームによる、2014年1月16日時点の探査車 Yutu の17地点（N0101〜N0209）の位置決定。着陸機と各地点は図5（メートル単位のグリッド、10 m のスケールバー）からデジタル化し、月面ビューに描いています。",
    pragyan:
      'Chandrayaan-3 チームによる、着陸機 Vikram 周辺の探査車 Pragyan の APXS 観測地点23か所の地図（緯度・経度軸つき）。各地点は図1cからデジタル化し、月面ビューに描いています。',
    mcc: `局所銀河群の銀河と、M33 内の星団・星雲の距離（McConnachie 2012）。2つのマゼラン雲とその中の天体には食連星による距離を使っています（${MC} を参照）。`,
  },
  ko: {
    mag: '만기형 식쌍성으로 구한 대마젤란운(49.59 kpc)과 소마젤란운(62.44 kpc)의 거리. 두 은하와 그 안의 성단·성운(황새치자리 30, NGC 2014/2020, NGC 346, NGC 602)에 사용합니다.',
    yutu: "Chang'e 3 임무팀이 2014년 1월 16일 기준으로 정한 Yutu 로버의 17개 지점(N0101~N0209) 위치. 착륙선과 각 지점은 그림 5(미터 격자, 10 m 축척 막대)에서 디지털화해 달 표면 화면에 그렸습니다.",
    pragyan:
      'Chandrayaan-3 팀이 Vikram 착륙선 주변 Pragyan 로버의 APXS 관측 지점 23곳을 위도·경도 축과 함께 나타낸 지도. 각 지점은 그림 1c에서 디지털화해 달 표면 화면에 그렸습니다.',
    mcc: `국부은하군 은하들과 M33 안의 성단·성운까지의 거리(McConnachie 2012). 두 마젤란운과 그 안의 천체는 식쌍성 거리를 씁니다(${MC} 참조).`,
  },
  'zh-CN': {
    mag: '由晚型食双星测得的大麦哲伦云（49.59 kpc）和小麦哲伦云（62.44 kpc）的距离，用于这两个星系及其中的星团和星云（剑鱼座30、NGC 2014/2020、NGC 346、NGC 602）。',
    yutu: '嫦娥三号任务团队对玉兔号月球车17个站点（N0101 至 N0209）的定位，截至2014年1月16日；着陆器和各站点从图5（米制网格，10 米比例尺）数字化，绘制在月面视图上。',
    pragyan:
      'Chandrayaan-3 团队绘制的地图：Vikram 着陆器周围 Pragyan 月球车的23个 APXS 观测点，带经纬度坐标轴；各观测点从图1c数字化，绘制在月面视图上。',
    mcc: `本星系群星系以及 M33 内星团和星云的距离，取自 McConnachie 2012。两个麦哲伦云及其中的天体使用食双星距离（见 ${MC}）。`,
  },
};

for (const [loc, t] of Object.entries(T)) {
  const p = `i18n-src/${loc}/data-sources.json`;
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  doc['magellanic-eclipsing-binaries'] = t.mag;
  doc['wan2014-yutu-traverse'] = t.yutu;
  doc['vadawale2024-pragyan-stops'] = t.pragyan;
  doc['mcconnachie-2012'] = t.mcc;
  fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
}
console.log(`${Object.keys(T).length} locales`);
