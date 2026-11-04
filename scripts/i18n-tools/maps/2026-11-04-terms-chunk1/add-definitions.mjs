// Chunk 1: the /science/glossary definitions of the eight new terms, written by hand in all 14
// locales (2026-11-04), in the existing entries' style. Appends; never overwrites a definition.
//   node scripts/i18n-tools/maps/2026-11-04-terms-chunk1/add-definitions.mjs
import fs from 'node:fs';

const D = {
  'en-US': {
    orbiter:
      'A spacecraft that goes into orbit around a planet, moon or other body to study it from above, often for years.',
    lander:
      'A spacecraft that sets down on the surface of a planet, moon or small body and works where it lands.',
    rover:
      'A vehicle that drives across the surface of another world, carrying its instruments from place to place.',
    capsule:
      'The part of a spacecraft that brings the crew or the cargo home through the atmosphere, protected by a heat shield.',
    'upper stage':
      'The top stage of a rocket, which finishes the climb to orbit or sends the payload on towards its destination.',
    'heat shield':
      'The layer that protects a spacecraft from the heat of atmospheric entry, usually by charring and wearing away.',
    airlock:
      "A small chamber between a spacecraft's pressurised cabin and the vacuum outside, emptied and refilled with air so that crews can go out and come back in.",
    spacewalk:
      'Work done by an astronaut outside a spacecraft, in a spacesuit; also called EVA (extravehicular activity).',
  },
  ru: {
    orbiter:
      'Космический аппарат, который выходит на орбиту вокруг планеты, спутника или другого тела, чтобы изучать его сверху, часто в течение многих лет.',
    lander:
      'Космический аппарат, который совершает посадку на поверхность планеты, спутника или малого тела и работает там, где сел.',
    rover:
      'Аппарат, который передвигается по поверхности другого мира и перевозит свои приборы с места на место.',
    capsule:
      'Часть космического корабля, которая возвращает экипаж или груз домой через атмосферу под защитой теплозащитного экрана.',
    'upper stage':
      'Верхняя ступень ракеты или разгонный блок: завершает выведение на орбиту или отправляет полезную нагрузку дальше к цели.',
    'heat shield':
      'Слой, который защищает космический аппарат от нагрева при входе в атмосферу, обычно обугливаясь и постепенно сгорая.',
    airlock:
      'Небольшая камера между герметичной кабиной и вакуумом снаружи: из неё откачивают и снова набирают воздух, чтобы экипаж мог выйти наружу и вернуться.',
    spacewalk:
      'Работа космонавта вне корабля в скафандре; также называется внекорабельной деятельностью (ВКД).',
  },
  ja: {
    orbiter:
      '惑星や衛星などの天体を回る軌道に入り、多くの場合何年にもわたって上空から観測する探査機。',
    lander: '惑星や衛星、小天体の表面に降り立ち、着陸した場所で活動する探査機。',
    rover: '別の天体の表面を走り、観測機器を場所から場所へ運ぶ車両。',
    capsule: '宇宙船のうち、熱シールドに守られて大気圏を通り、乗員や貨物を地上へ持ち帰る部分。',
    'upper stage':
      'ロケットの最上段。軌道への上昇を仕上げるか、ペイロードを目的地へ向けて送り出す。',
    'heat shield':
      '大気圏突入の高熱から宇宙機を守る層。多くは焦げて少しずつ削れることで熱を逃がす。',
    airlock:
      '宇宙船の与圧された船内と外の真空のあいだにある小部屋。空気を抜いたり入れたりして、乗員が外に出て戻れるようにする。',
    spacewalk: '宇宙飛行士が宇宙服を着て宇宙船の外で行う作業。船外活動（EVA）とも呼ばれる。',
  },
  'zh-CN': {
    orbiter:
      '进入绕行星、卫星或其他天体运行的轨道，从上方对其进行观测的航天器，往往一工作就是多年。',
    lander: '降落在行星、卫星或小天体表面，并在着陆点开展工作的航天器。',
    rover: '在另一个世界的表面行驶、把科学仪器从一处运到另一处的车辆。',
    capsule: '航天器中在隔热罩保护下穿过大气层、把航天员或货物送回地面的部分。',
    'upper stage': '火箭最上面的一级，负责完成入轨，或把有效载荷送往目的地。',
    'heat shield': '保护航天器免受再入大气层高温的防护层，通常靠逐渐烧蚀、剥落带走热量。',
    airlock: '位于航天器加压舱与舱外真空之间的小舱室，通过抽气和复压，让航天员出舱后再返回。',
    spacewalk: '航天员身穿航天服在航天器外进行的工作，也称出舱活动（EVA）。',
  },
  ko: {
    orbiter:
      '행성이나 위성 같은 천체를 도는 궤도에 들어가, 흔히 여러 해 동안 위에서 그 천체를 관측하는 탐사선.',
    lander: '행성이나 위성, 소천체의 표면에 내려앉아 착륙한 자리에서 활동하는 탐사선.',
    rover: '다른 천체의 표면을 달리며 관측 장비를 이곳저곳으로 옮기는 탐사 차량.',
    capsule:
      '우주선 가운데 열차폐막의 보호를 받으며 대기를 뚫고 승무원이나 화물을 지구로 귀환시키는 부분.',
    'upper stage': '로켓의 맨 위 단. 궤도까지의 상승을 마무리하거나 탑재체를 목적지로 보낸다.',
    'heat shield':
      '대기권 진입 때의 고열로부터 우주선을 보호하는 층. 대개 타면서 조금씩 깎여 나가 열을 없앤다.',
    airlock:
      '우주선의 가압된 실내와 바깥 진공 사이에 있는 작은 방. 공기를 빼고 다시 채워 승무원이 밖으로 나갔다 돌아올 수 있게 한다.',
    spacewalk: '우주비행사가 우주복을 입고 우주선 밖에서 하는 작업. 선외 활동(EVA)이라고도 한다.',
  },
  hi: {
    orbiter:
      'वह अंतरिक्ष यान जो किसी ग्रह, चंद्रमा या अन्य पिंड के चारों ओर कक्षा में जाकर ऊपर से उसका अध्ययन करता है, अक्सर कई वर्षों तक।',
    lander:
      'वह अंतरिक्ष यान जो किसी ग्रह, चंद्रमा या छोटे पिंड की सतह पर उतरता है और उतरने की जगह पर ही काम करता है।',
    rover:
      'वह वाहन जो किसी दूसरे संसार की सतह पर चलता है और अपने उपकरणों को एक जगह से दूसरी जगह ले जाता है।',
    capsule:
      'अंतरिक्ष यान का वह हिस्सा जो ताप-कवच की सुरक्षा में वायुमंडल से गुज़रकर चालक दल या माल को वापस घर लाता है।',
    'upper stage':
      'रॉकेट का सबसे ऊपरी चरण, जो कक्षा तक की चढ़ाई पूरी करता है या पेलोड को उसके गंतव्य की ओर भेजता है।',
    'heat shield':
      'वह परत जो वायुमंडल में प्रवेश की गर्मी से अंतरिक्ष यान की रक्षा करती है, आम तौर पर झुलसकर और धीरे-धीरे घिसकर।',
    airlock:
      'अंतरिक्ष यान के दबावयुक्त केबिन और बाहर के निर्वात के बीच एक छोटा कक्ष, जिसकी हवा निकालकर और फिर भरकर चालक दल बाहर जाता है और वापस आता है।',
    spacewalk:
      'अंतरिक्ष यात्री द्वारा स्पेससूट पहनकर अंतरिक्ष यान के बाहर किया गया काम; इसे EVA (यान से बाहर की गतिविधि) भी कहते हैं।',
  },
  ar: {
    orbiter:
      'مركبة فضائية تدخل مدارًا حول كوكب أو قمر أو جرم آخر لتدرسه من الأعلى، وغالبًا لسنوات.',
    lander: 'مركبة فضائية تهبط على سطح كوكب أو قمر أو جرم صغير وتعمل في موضع هبوطها.',
    rover: 'مركبة تسير على سطح عالم آخر وتنقل أجهزتها من موضع إلى آخر.',
    capsule:
      'الجزء من المركبة الفضائية الذي يعيد الطاقم أو الحمولة إلى الأرض عبر الغلاف الجوي، محميًا بدرع حراري.',
    'upper stage': 'المرحلة العليا من الصاروخ، تُكمل الصعود إلى المدار أو ترسل الحمولة نحو وجهتها.',
    'heat shield':
      'طبقة تحمي المركبة الفضائية من حرارة الدخول إلى الغلاف الجوي، وغالبًا بأن تتفحم وتتآكل تدريجيًا.',
    airlock:
      'حجرة صغيرة بين المقصورة المضغوطة في المركبة والفراغ في الخارج، يُفرَّغ منها الهواء ثم يُعاد ملؤها كي يخرج الطاقم ويعود.',
    spacewalk:
      'عمل يؤديه رائد الفضاء خارج المركبة مرتديًا بدلة الفضاء، ويُسمى أيضًا النشاط خارج المركبة (EVA).',
  },
  'sr-Cyrl': {
    orbiter:
      'Свемирска летелица која улази у орбиту око планете, месеца или другог тела да би га проучавала одозго, често годинама.',
    lander:
      'Свемирска летелица која се спушта на површину планете, месеца или малог тела и ради тамо где је слетела.',
    rover:
      'Возило које се креће по површини другог света и преноси своје инструменте с места на место.',
    capsule:
      'Део свемирске летелице који кроз атмосферу, заштићен топлотним штитом, враћа посаду или терет кући.',
    'upper stage': 'Највиши степен ракете: довршава успон до орбите или шаље терет даље ка циљу.',
    'heat shield':
      'Слој који штити свемирску летелицу од топлоте при уласку у атмосферу, најчешће тако што угљенише и постепено се троши.',
    airlock:
      'Мала комора између херметизоване кабине летелице и вакуума напољу; из ње се испушта и поново упушта ваздух да би посада могла да изађе и врати се.',
    spacewalk:
      'Рад астронаута изван летелице, у скафандеру; назива се и EVA (ванбродска активност).',
  },
  de: {
    orbiter:
      'Eine Raumsonde, die in eine Umlaufbahn um einen Planeten, Mond oder anderen Körper einschwenkt, um ihn von oben zu erforschen, oft über Jahre.',
    lander:
      'Eine Raumsonde, die auf der Oberfläche eines Planeten, Mondes oder kleinen Körpers aufsetzt und dort arbeitet, wo sie gelandet ist.',
    rover:
      'Ein Fahrzeug, das über die Oberfläche einer anderen Welt fährt und seine Instrumente von Ort zu Ort bringt.',
    capsule:
      'Der Teil eines Raumschiffs, der die Besatzung oder die Fracht, geschützt von einem Hitzeschild, durch die Atmosphäre nach Hause bringt.',
    'upper stage':
      'Die oberste Stufe einer Rakete: Sie vollendet den Aufstieg in die Umlaufbahn oder schickt die Nutzlast weiter zu ihrem Ziel.',
    'heat shield':
      'Die Schicht, die ein Raumfahrzeug vor der Hitze des Atmosphäreneintritts schützt, meist indem sie verkohlt und nach und nach abträgt.',
    airlock:
      'Eine kleine Kammer zwischen der Druckkabine eines Raumfahrzeugs und dem Vakuum draußen, die geleert und wieder mit Luft gefüllt wird, damit die Besatzung hinaus- und wieder hereinkommt.',
    spacewalk:
      'Die Arbeit eines Raumfahrers außerhalb des Raumfahrzeugs, im Raumanzug; auch EVA (Außenbordeinsatz) genannt.',
  },
  fr: {
    orbiter:
      "Un engin spatial qui se place en orbite autour d'une planète, d'une lune ou d'un autre corps pour l'étudier d'en haut, souvent pendant des années.",
    lander:
      "Un engin spatial qui se pose à la surface d'une planète, d'une lune ou d'un petit corps et travaille là où il s'est posé.",
    rover:
      "Un véhicule qui roule à la surface d'un autre monde et transporte ses instruments d'un endroit à l'autre.",
    capsule:
      "La partie d'un vaisseau spatial qui ramène l'équipage ou la cargaison à travers l'atmosphère, protégée par un bouclier thermique.",
    'upper stage':
      "L'étage supérieur d'une fusée, qui achève la montée en orbite ou envoie la charge utile vers sa destination.",
    'heat shield':
      "La couche qui protège un engin spatial de la chaleur de l'entrée atmosphérique, le plus souvent en se carbonisant et en s'érodant peu à peu.",
    airlock:
      "Une petite chambre entre la cabine pressurisée d'un vaisseau et le vide extérieur, vidée puis remplie d'air pour que l'équipage puisse sortir et rentrer.",
    spacewalk:
      "Le travail d'un astronaute hors du vaisseau, en scaphandre ; on parle aussi d'EVA (activité extravéhiculaire).",
  },
  es: {
    orbiter:
      'Una nave espacial que entra en órbita alrededor de un planeta, una luna u otro cuerpo para estudiarlo desde arriba, a menudo durante años.',
    lander:
      'Una nave espacial que se posa en la superficie de un planeta, una luna o un cuerpo menor y trabaja allí donde aterriza.',
    rover:
      'Un vehículo que recorre la superficie de otro mundo y lleva sus instrumentos de un lugar a otro.',
    capsule:
      'La parte de una nave espacial que devuelve a la tripulación o la carga a través de la atmósfera, protegida por un escudo térmico.',
    'upper stage':
      'La etapa superior de un cohete, que completa el ascenso a la órbita o envía la carga útil hacia su destino.',
    'heat shield':
      'La capa que protege una nave espacial del calor de la entrada atmosférica, casi siempre carbonizándose y desgastándose poco a poco.',
    airlock:
      'Una pequeña cámara entre la cabina presurizada de una nave y el vacío exterior, que se vacía y se vuelve a llenar de aire para que la tripulación pueda salir y volver a entrar.',
    spacewalk:
      'El trabajo de un astronauta fuera de la nave, con traje espacial; también se llama EVA (actividad extravehicular).',
  },
  it: {
    orbiter:
      "Un veicolo spaziale che entra in orbita attorno a un pianeta, una luna o un altro corpo per studiarlo dall'alto, spesso per anni.",
    lander:
      'Un veicolo spaziale che si posa sulla superficie di un pianeta, di una luna o di un corpo minore e lavora dove è atterrato.',
    rover:
      "Un veicolo che si muove sulla superficie di un altro mondo e porta i suoi strumenti da un luogo all'altro.",
    capsule:
      "La parte di un veicolo spaziale che riporta a casa l'equipaggio o il carico attraverso l'atmosfera, protetta da uno scudo termico.",
    'upper stage':
      'Lo stadio superiore di un razzo, che completa la salita in orbita o invia il carico utile verso la sua destinazione.',
    'heat shield':
      'Lo strato che protegge un veicolo spaziale dal calore del rientro atmosferico, di solito carbonizzandosi e consumandosi poco a poco.',
    airlock:
      "Una piccola camera tra la cabina pressurizzata di un veicolo spaziale e il vuoto esterno, che viene svuotata e riempita d'aria perché l'equipaggio possa uscire e rientrare.",
    spacewalk:
      'Il lavoro di un astronauta fuori dal veicolo spaziale, in tuta; si chiama anche EVA (attività extraveicolare).',
  },
  nl: {
    orbiter:
      'Een ruimtevaartuig dat in een baan om een planeet, maan of ander hemellichaam gaat om het van bovenaf te bestuderen, vaak jarenlang.',
    lander:
      'Een ruimtevaartuig dat op het oppervlak van een planeet, maan of klein hemellichaam neerdaalt en werkt waar het geland is.',
    rover:
      'Een voertuig dat over het oppervlak van een andere wereld rijdt en zijn instrumenten van plek naar plek brengt.',
    capsule:
      'Het deel van een ruimtevaartuig dat de bemanning of de lading door de atmosfeer terugbrengt, beschermd door een hitteschild.',
    'upper stage':
      'De bovenste trap van een raket, die de klim naar de baan afmaakt of de lading naar haar bestemming stuurt.',
    'heat shield':
      'De laag die een ruimtevaartuig beschermt tegen de hitte van de terugkeer in de atmosfeer, meestal door te verkolen en langzaam weg te slijten.',
    airlock:
      'Een kleine ruimte tussen de cabine onder druk en het vacuüm buiten, die leeggepompt en weer met lucht gevuld wordt zodat de bemanning naar buiten en terug kan.',
    spacewalk:
      'Werk van een astronaut buiten het ruimtevaartuig, in een ruimtepak; ook EVA (extravehiculaire activiteit) genoemd.',
  },
  'pt-BR': {
    orbiter:
      'Uma nave espacial que entra em órbita ao redor de um planeta, uma lua ou outro corpo para estudá-lo de cima, muitas vezes por anos.',
    lander:
      'Uma nave espacial que pousa na superfície de um planeta, uma lua ou um corpo menor e trabalha onde pousou.',
    rover:
      'Um veículo que percorre a superfície de outro mundo e leva seus instrumentos de um lugar para outro.',
    capsule:
      'A parte de uma nave espacial que traz a tripulação ou a carga de volta pela atmosfera, protegida por um escudo térmico.',
    'upper stage':
      'O estágio superior de um foguete, que completa a subida até a órbita ou envia a carga útil rumo ao destino.',
    'heat shield':
      'A camada que protege uma nave espacial do calor da entrada na atmosfera, geralmente carbonizando-se e desgastando-se aos poucos.',
    airlock:
      'Uma pequena câmara entre a cabine pressurizada de uma nave e o vácuo de fora, esvaziada e enchida de ar de novo para que a tripulação possa sair e voltar.',
    spacewalk:
      'O trabalho de um astronauta fora da nave, de traje espacial; também chamado de EVA (atividade extraveicular).',
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
