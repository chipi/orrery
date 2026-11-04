// Chunk 4: /science/glossary definitions of the seven transfer terms, written by hand in all 14
// locales (2026-11-04), in the existing entries' style. Appends; never overwrites a definition.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk4/add-definitions.mjs
import fs from 'node:fs';

const D = {
  'en-US': {
    'Hohmann transfer':
      'The cheapest way between two circular orbits: one burn onto half an ellipse that touches both, and a second burn to circularise at the far end.',
    'Lagrange point':
      'One of five points where the pull of two large bodies and the motion of orbit balance, so a small object can keep its place relative to both.',
    C3: 'Characteristic energy: the square of the speed left over once a spacecraft has escaped the Earth, in km²/s² — the figure a launcher must reach for a given trip.',
    'rocket equation':
      "Tsiolkovsky's equation, Δv = vₑ · ln(m₀/m₁): the change in speed a rocket can make from its exhaust velocity and how much of its mass is propellant.",
    'free-return':
      'A path to the Moon that swings round its far side and falls back to Earth with no further burn, so a crew can come home even if the engine fails.',
    'sun-synchronous':
      "A near-polar orbit whose plane turns with the Earth's yearly path, so the satellite crosses each latitude at the same local solar time every day.",
    'halo orbit':
      "A looping orbit around a Lagrange point, held there by the balance of two bodies' gravity — JWST circles one at L2, Gateway was planned for another.",
  },
  ru: {
    'Hohmann transfer':
      'Самый экономичный путь между двумя круговыми орбитами: один импульс выводит на половину эллипса, касающегося обеих, второй скругляет орбиту на дальнем конце.',
    'Lagrange point':
      'Одна из пяти точек, где притяжение двух крупных тел и орбитальное движение уравновешены, так что малое тело сохраняет своё положение относительно обоих.',
    C3: 'Характеристическая энергия: квадрат скорости, остающейся у аппарата после ухода от Земли, в км²/с², — величина, которую должна обеспечить ракета для данного полёта.',
    'rocket equation':
      'Уравнение Циолковского Δv = vₑ · ln(m₀/m₁): изменение скорости, которое ракета может получить, исходя из скорости истечения и доли топлива в её массе.',
    'free-return':
      'Траектория к Луне, которая огибает её обратную сторону и возвращается к Земле без дополнительных включений двигателя, так что экипаж вернётся даже при его отказе.',
    'sun-synchronous':
      'Почти полярная орбита, плоскость которой поворачивается вместе с годовым движением Земли, так что спутник каждый день проходит над каждой широтой в одно и то же местное солнечное время.',
    'halo orbit':
      'Петлеобразная орбита вокруг точки Лагранжа, которую удерживает равновесие притяжения двух тел: вокруг одной такой точки, L2, обращается JWST, на другой планировали разместить Gateway.',
  },
  ja: {
    'Hohmann transfer':
      '2つの円軌道を結ぶ最も経済的な方法。両方に接する半楕円へ1回噴射で移り、遠い側でもう1回噴射して円軌道にする。',
    'Lagrange point':
      '2つの大きな天体の引力と軌道運動がつり合い、小さな物体が両方に対して位置を保てる5つの点の一つ。',
    C3: '特性エネルギー。宇宙機が地球の重力を脱したあとに残る速さの2乗（km²/s²）で、ある飛行のためにロケットが出さなければならない値。',
    'rocket equation':
      'ツィオルコフスキーの式 Δv = vₑ · ln(m₀/m₁)。排気速度と質量のうち推進剤が占める割合から、ロケットが得られる速度変化を求める。',
    'free-return':
      '月の裏側を回り込み、追加の噴射なしで地球へ戻ってくる経路。エンジンが故障しても乗員は帰還できる。',
    'sun-synchronous':
      '軌道面が地球の公転に合わせて回るほぼ極軌道。衛星は毎日、各緯度を同じ地方太陽時に通過する。',
    'halo orbit':
      '2つの天体の引力のつり合いでラグランジュ点のまわりに保たれる、輪を描く軌道。JWSTはL2のまわりを回り、Gatewayも別の点で計画された。',
  },
  'zh-CN': {
    'Hohmann transfer':
      '两条圆轨道之间最省的转移方式：一次点火进入与两者相切的半个椭圆，到远端再点火一次进入圆轨道。',
    'Lagrange point':
      '两个大天体的引力与轨道运动相互平衡的五个点之一，小物体可在此相对两者保持位置。',
    C3: '特征能量：航天器脱离地球后剩余速度的平方，单位为千米²/秒²，是运载火箭为某次飞行必须达到的数值。',
    'rocket equation':
      '齐奥尔科夫斯基公式 Δv = vₑ · ln(m₀/m₁)：由排气速度和推进剂在质量中所占比例，得出火箭能获得的速度变化。',
    'free-return': '绕过月球背面、无需再次点火便落回地球的路径，即使发动机失灵，航天员也能回家。',
    'sun-synchronous':
      '一种近极轨道，其轨道面随地球公转一起转动，卫星每天以相同的地方太阳时经过同一纬度。',
    'halo orbit':
      '依靠两个天体引力的平衡、绕拉格朗日点运行的环形轨道：JWST绕L2运行，Gateway曾计划使用另一条。',
  },
  ko: {
    'Hohmann transfer':
      '두 원 궤도 사이를 가장 적은 비용으로 오가는 방법. 한 번의 분사로 두 궤도에 접하는 반 타원에 오르고, 먼 쪽에서 다시 분사해 원 궤도로 만든다.',
    'Lagrange point':
      '두 큰 천체의 중력과 궤도 운동이 균형을 이루어 작은 물체가 두 천체에 대해 제자리를 지킬 수 있는 다섯 점 가운데 하나.',
    C3: '특성 에너지. 우주선이 지구를 벗어난 뒤 남는 속도의 제곱(km²/s²)으로, 발사체가 해당 비행을 위해 내야 하는 값이다.',
    'rocket equation':
      '치올콥스키 방정식 Δv = vₑ · ln(m₀/m₁). 배기 속도와 질량 가운데 추진제가 차지하는 비율로 로켓이 낼 수 있는 속도 변화를 구한다.',
    'free-return':
      '달 뒷면을 돌아 추가 분사 없이 지구로 떨어져 돌아오는 경로. 엔진이 고장 나도 승무원이 돌아올 수 있다.',
    'sun-synchronous':
      '궤도면이 지구의 공전에 맞춰 도는 극궤도에 가까운 궤도. 위성이 매일 같은 지방 태양시에 각 위도를 지난다.',
    'halo orbit':
      '두 천체의 중력 균형으로 라그랑주점 둘레에 머무는 고리 모양의 궤도. JWST가 L2 둘레를 돌고, Gateway도 다른 하나에 계획되었다.',
  },
  hi: {
    'Hohmann transfer':
      'दो वृत्ताकार कक्षाओं के बीच सबसे किफ़ायती रास्ता: एक प्रज्वलन से दोनों को छूने वाले आधे दीर्घवृत्त पर, और दूसरे छोर पर दूसरे प्रज्वलन से फिर वृत्ताकार कक्षा में।',
    'Lagrange point':
      'उन पाँच बिंदुओं में से एक जहाँ दो बड़े पिंडों का खिंचाव और कक्षीय गति संतुलित होते हैं, ताकि कोई छोटी वस्तु दोनों के सापेक्ष अपनी जगह बनाए रख सके।',
    C3: 'अभिलक्षणिक ऊर्जा: पृथ्वी से मुक्त होने के बाद यान के पास बची गति का वर्ग, km²/s² में — वह मान जो किसी यात्रा के लिए प्रक्षेपक को देना होता है।',
    'rocket equation':
      'त्सिओल्कोव्स्की का समीकरण Δv = vₑ · ln(m₀/m₁): निकास वेग और द्रव्यमान में प्रणोदक के हिस्से से रॉकेट कितना वेग-परिवर्तन कर सकता है।',
    'free-return':
      'चंद्रमा की ओर ऐसा पथ जो उसके दूर वाले हिस्से का चक्कर लगाकर बिना और प्रज्वलन के पृथ्वी पर लौट आता है, ताकि इंजन खराब होने पर भी दल घर लौट सके।',
    'sun-synchronous':
      'लगभग ध्रुवीय कक्षा जिसका तल पृथ्वी के वार्षिक पथ के साथ घूमता है, ताकि उपग्रह हर दिन हर अक्षांश से एक ही स्थानीय सौर समय पर गुज़रे।',
    'halo orbit':
      'दो पिंडों के गुरुत्व के संतुलन से किसी लाग्रांज बिंदु के चारों ओर बनी रहने वाली घुमावदार कक्षा — JWST ऐसी ही कक्षा में L2 के चारों ओर है, Gateway दूसरी के लिए नियोजित था।',
  },
  ar: {
    'Hohmann transfer':
      'أوفر طريق بين مدارين دائريين: إشعال واحد ينقل المركبة إلى نصف قطع ناقص يمس المدارين، وإشعال ثانٍ عند الطرف البعيد يجعل المدار دائريًا.',
    'Lagrange point':
      'واحدة من خمس نقاط تتوازن فيها جاذبية جرمين كبيرين مع الحركة المدارية، فيحافظ جسم صغير على موضعه بالنسبة إليهما.',
    C3: 'الطاقة المميِّزة: مربع السرعة المتبقية للمركبة بعد إفلاتها من جاذبية الأرض، بوحدة كم²/ث² — وهي القيمة التي يجب أن يبلغها الصاروخ لرحلة معينة.',
    'rocket equation':
      'معادلة تسيولكوفسكي Δv = vₑ · ln(m₀/m₁): التغير في السرعة الذي يستطيعه الصاروخ انطلاقًا من سرعة العادم ونسبة الوقود الدافع في كتلته.',
    'free-return':
      'مسار نحو القمر يلتف حول جانبه البعيد ويعود إلى الأرض دون إشعال إضافي، فيعود الطاقم حتى لو تعطّل المحرك.',
    'sun-synchronous':
      'مدار شبه قطبي يدور مستواه مع مسار الأرض السنوي، فيمرّ القمر الصناعي فوق كل خط عرض في الوقت الشمسي المحلي نفسه كل يوم.',
    'halo orbit':
      'مدار حلقي حول نقطة لاغرانج يبقى فيها بتوازن جاذبية جرمين — يدور JWST في واحد منها حول L2، وكان Gateway مخططًا لمدار آخر.',
  },
  'sr-Cyrl': {
    'Hohmann transfer':
      'Најјефтинији пут између две кружне орбите: једно паљење на половину елипсе која додирује обе и друго паљење на далеком крају да орбита постане кружна.',
    'Lagrange point':
      'Једна од пет тачака у којима се привлачење два велика тела и орбитално кретање уравнотежују, па мало тело може да задржи положај у односу на оба.',
    C3: 'Карактеристична енергија: квадрат брзине која летелици остаје пошто се ослободи Земљине теже, у km²/s² — вредност коју ракета мора да постигне за дати лет.',
    'rocket equation':
      'Циолковскијева једначина Δv = vₑ · ln(m₀/m₁): промена брзине коју ракета може да оствари из брзине истицања и удела горива у својој маси.',
    'free-return':
      'Путања ка Месецу која обилази његову далеку страну и враћа се на Земљу без новог паљења, па се посада враћа и ако мотор откаже.',
    'sun-synchronous':
      'Скоро поларна орбита чија се раван окреће заједно с годишњим кретањем Земље, па сателит сваког дана прелази сваку географску ширину у исто локално сунчево време.',
    'halo orbit':
      'Петљаста орбита око Лагранжове тачке, коју тамо држи равнотежа теже два тела — JWST кружи око L2, а Gateway је био планиран за другу.',
  },
  de: {
    'Hohmann transfer':
      'Der günstigste Weg zwischen zwei Kreisbahnen: eine Zündung auf eine halbe Ellipse, die beide berührt, und eine zweite am fernen Ende, um die Bahn wieder kreisförmig zu machen.',
    'Lagrange point':
      'Einer von fünf Punkten, an denen sich die Anziehung zweier großer Körper und die Bahnbewegung ausgleichen, sodass ein kleiner Körper seinen Platz relativ zu beiden hält.',
    C3: 'Charakteristische Energie: das Quadrat der Geschwindigkeit, die einer Raumsonde nach dem Verlassen der Erde bleibt, in km²/s² – der Wert, den eine Rakete für eine Reise liefern muss.',
    'rocket equation':
      'Die Ziolkowski-Gleichung Δv = vₑ · ln(m₀/m₁): die Geschwindigkeitsänderung, die eine Rakete aus ihrer Ausströmgeschwindigkeit und ihrem Treibstoffanteil gewinnen kann.',
    'free-return':
      'Eine Bahn zum Mond, die um seine Rückseite schwingt und ohne weitere Zündung zur Erde zurückfällt, sodass die Besatzung auch bei einem Triebwerksausfall heimkommt.',
    'sun-synchronous':
      'Eine fast polare Umlaufbahn, deren Ebene sich mit dem Jahreslauf der Erde dreht, sodass der Satellit jeden Breitengrad täglich zur selben Ortszeit überfliegt.',
    'halo orbit':
      'Eine schleifenförmige Bahn um einen Lagrange-Punkt, gehalten vom Gleichgewicht der Schwerkraft zweier Körper – JWST umkreist so L2, Gateway war für einen anderen geplant.',
  },
  fr: {
    'Hohmann transfer':
      "Le chemin le plus économique entre deux orbites circulaires : une poussée vers une demi-ellipse tangente aux deux, puis une seconde à l'autre bout pour circulariser.",
    'Lagrange point':
      "L'un des cinq points où l'attraction de deux grands corps et le mouvement orbital s'équilibrent, si bien qu'un petit objet garde sa place par rapport aux deux.",
    C3: "L'énergie caractéristique : le carré de la vitesse qui reste à un engin une fois libéré de la Terre, en km²/s² — la valeur qu'un lanceur doit atteindre pour un voyage donné.",
    'rocket equation':
      "L'équation de Tsiolkovski, Δv = vₑ · ln(m₀/m₁) : le changement de vitesse qu'une fusée peut obtenir de sa vitesse d'éjection et de la part d'ergols dans sa masse.",
    'free-return':
      "Une trajectoire vers la Lune qui contourne sa face cachée et retombe vers la Terre sans nouvelle poussée, si bien que l'équipage rentre même en cas de panne moteur.",
    'sun-synchronous':
      'Une orbite quasi polaire dont le plan tourne avec la course annuelle de la Terre, si bien que le satellite passe chaque jour au-dessus de chaque latitude à la même heure solaire locale.',
    'halo orbit':
      "Une orbite en boucle autour d'un point de Lagrange, maintenue par l'équilibre de la gravité de deux corps — JWST en décrit une autour de L2, Gateway était prévu sur une autre.",
  },
  es: {
    'Hohmann transfer':
      'El camino más barato entre dos órbitas circulares: un encendido hacia media elipse que toca ambas y otro en el extremo opuesto para circularizar.',
    'Lagrange point':
      'Uno de los cinco puntos donde la atracción de dos grandes cuerpos y el movimiento orbital se equilibran, de modo que un objeto pequeño mantiene su lugar respecto a ambos.',
    C3: 'Energía característica: el cuadrado de la velocidad que le queda a una nave tras escapar de la Tierra, en km²/s²; la cifra que un lanzador debe alcanzar para un viaje dado.',
    'rocket equation':
      'La ecuación de Tsiolkovski, Δv = vₑ · ln(m₀/m₁): el cambio de velocidad que un cohete puede lograr a partir de la velocidad de salida de los gases y de la parte de su masa que es propelente.',
    'free-return':
      'Una trayectoria a la Luna que rodea su cara oculta y cae de vuelta a la Tierra sin más encendidos, de modo que la tripulación vuelve aunque falle el motor.',
    'sun-synchronous':
      'Una órbita casi polar cuyo plano gira con el recorrido anual de la Tierra, de modo que el satélite pasa cada día por cada latitud a la misma hora solar local.',
    'halo orbit':
      'Una órbita en bucle alrededor de un punto de Lagrange, sostenida por el equilibrio de la gravedad de dos cuerpos: JWST describe una en torno a L2 y Gateway se planeó para otra.',
  },
  it: {
    'Hohmann transfer':
      "La via più economica tra due orbite circolari: un'accensione verso mezza ellisse tangente a entrambe e una seconda all'altro capo per circolarizzare.",
    'Lagrange point':
      "Uno dei cinque punti in cui l'attrazione di due grandi corpi e il moto orbitale si bilanciano, così che un piccolo oggetto mantiene la sua posizione rispetto a entrambi.",
    C3: 'Energia caratteristica: il quadrato della velocità che resta a una sonda una volta sfuggita alla Terra, in km²/s² — il valore che un lanciatore deve raggiungere per un dato viaggio.',
    'rocket equation':
      "L'equazione di Ciolkovskij, Δv = vₑ · ln(m₀/m₁): la variazione di velocità che un razzo può ottenere dalla velocità di scarico e dalla parte della sua massa fatta di propellente.",
    'free-return':
      "Una traiettoria verso la Luna che gira attorno alla faccia nascosta e ricade verso la Terra senza altre accensioni, così l'equipaggio rientra anche se il motore si guasta.",
    'sun-synchronous':
      "Un'orbita quasi polare il cui piano ruota con il moto annuo della Terra, così il satellite passa ogni giorno sopra ogni latitudine alla stessa ora solare locale.",
    'halo orbit':
      "Un'orbita ad anello attorno a un punto di Lagrange, tenuta lì dall'equilibrio della gravità di due corpi: JWST ne percorre una attorno a L2, Gateway era previsto su un'altra.",
  },
  nl: {
    'Hohmann transfer':
      'De goedkoopste weg tussen twee cirkelvormige banen: één stuwstoot naar een halve ellips die beide raakt, en een tweede aan het verre eind om de baan weer rond te maken.',
    'Lagrange point':
      'Een van de vijf punten waar de aantrekking van twee grote hemellichamen en de baanbeweging elkaar in evenwicht houden, zodat een klein voorwerp zijn plaats ten opzichte van beide behoudt.',
    C3: 'Karakteristieke energie: het kwadraat van de snelheid die een ruimtevaartuig overhoudt nadat het aan de Aarde is ontsnapt, in km²/s² — de waarde die een draagraket voor een reis moet halen.',
    'rocket equation':
      'De vergelijking van Tsiolkovski, Δv = vₑ · ln(m₀/m₁): de snelheidsverandering die een raket kan halen uit haar uitlaatsnelheid en het deel van haar massa dat stuwstof is.',
    'free-return':
      'Een baan naar de Maan die om de achterkant zwaait en zonder nieuwe stuwstoot naar de Aarde terugvalt, zodat de bemanning ook bij motorpech thuiskomt.',
    'sun-synchronous':
      'Een bijna polaire baan waarvan het vlak meedraait met de jaarlijkse loop van de Aarde, zodat de satelliet elke breedtegraad elke dag op dezelfde lokale zonnetijd passeert.',
    'halo orbit':
      'Een lusvormige baan rond een lagrangepunt, daar gehouden door het evenwicht van de zwaartekracht van twee lichamen — JWST beschrijft er een rond L2, Gateway was gepland voor een andere.',
  },
  'pt-BR': {
    'Hohmann transfer':
      'O caminho mais barato entre duas órbitas circulares: uma queima para meia elipse que toca as duas e outra na ponta oposta para circularizar.',
    'Lagrange point':
      'Um dos cinco pontos onde a atração de dois grandes corpos e o movimento orbital se equilibram, de modo que um objeto pequeno mantém sua posição em relação a ambos.',
    C3: 'Energia característica: o quadrado da velocidade que sobra para uma nave depois de escapar da Terra, em km²/s² — o valor que um lançador precisa atingir para uma viagem.',
    'rocket equation':
      'A equação de Tsiolkovsky, Δv = vₑ · ln(m₀/m₁): a mudança de velocidade que um foguete consegue a partir da velocidade de exaustão e da parte de sua massa que é propelente.',
    'free-return':
      'Uma trajetória para a Lua que contorna seu lado oculto e cai de volta para a Terra sem nova queima, de modo que a tripulação volta mesmo se o motor falhar.',
    'sun-synchronous':
      'Uma órbita quase polar cujo plano gira com o percurso anual da Terra, de modo que o satélite passa por cada latitude todo dia na mesma hora solar local.',
    'halo orbit':
      'Uma órbita em laço em torno de um ponto de Lagrange, mantida ali pelo equilíbrio da gravidade de dois corpos — o JWST percorre uma em torno de L2, e o Gateway estava planejado para outra.',
  },
};

for (const [loc, defs] of Object.entries(D)) {
  const f = `i18n-src/${loc}/glossary/terms.json`;
  const cur = JSON.parse(fs.readFileSync(f, 'utf8'));
  let n = 0;
  for (const [k, v] of Object.entries(defs))
    if (v && !(k in cur)) {
      cur[k] = v;
      n++;
    }
  fs.writeFileSync(f, JSON.stringify(cur, null, 2) + '\n');
  console.log(loc, n);
}
