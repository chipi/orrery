#!/usr/bin/env node
/**
 * Translate the 9 iconic-missions expansion overlays (#306 / #307)
 * into all 13 non-English locales. Pure data layer — no API calls;
 * translations live inline.
 *
 * Coverage per (locale, mission): name + type + first + description.
 * Events arrays stay in English fallback for now (labels are mostly
 * universal date + place names; full event-note translation is a
 * follow-up pass, same trade-off as translate-satellites.mjs's
 * mission_visits stayed in English on first batch).
 *
 * Also writes 13-locale overlays for the new
 * /science/transfers/coplanar-trajectories article (title +
 * intro_sentence). Body paragraphs stay English for now — they're
 * substantial and worth a careful native pass.
 *
 * Run from project root:  node scripts/translate-iconic-missions.mjs
 */
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

// dest folder under static/data/missions/ for each mission id.
const MISSION_DEST = {
  rosetta: 'comet',
  giotto: 'comet',
  'vega-1': 'venus',
  'vega-2': 'venus',
  'venera-13': 'venus',
  hayabusa2: 'asteroid',
  juice: 'jupiter',
  bepicolombo: 'mercury',
  ulysses: 'sun',
};

// Mission overlay translations.
// Schema per (mission, locale): { name, type, first, description }.
// Empty entries fall through to the English base record.
const MISSION_OVERLAYS = {
  rosetta: {
    ar: {
      name: 'روزيتا',
      type: 'مركبة مدارية + هابطة · مكتملة',
      first: 'أول مركبة فضائية تدور حول مذنب — وتهبط عليه (فيلة، 12 نوفمبر 2014)',
      description:
        'مهمة وكالة الفضاء الأوروبية الرائدة لالتقاء المذنبات. بعد رحلة استمرت 10 سنوات تخللتها مساعدات جاذبية أرضية ثلاث ومساعدة من المريخ ومرورات بكويكبين و957 يوماً من السبات في الفضاء العميق، التقت روزيتا بالمذنب 67P/تشوريوموف-جيراسيمنكو في أغسطس 2014 ودارت حوله لأكثر من عامين. وصلت المركبة الهابطة فيلة إلى السطح في 12 نوفمبر 2014. أنهت روزيتا المهمة بهبوط محكوم على سطح 67P في 30 سبتمبر 2016.',
    },
    de: {
      name: 'Rosetta',
      type: 'ORBITER + LANDER · BEENDET',
      first:
        'Erstes Raumfahrzeug, das einen Kometen umkreiste – und auf ihm landete (Philae, 12.11.2014)',
      description:
        'ESA-Flaggschiffmission zum Rendezvous mit dem Kometen 67P/Tschurjumow-Gerassimenko. Nach einer 10-jährigen Reise mit drei Erd-Swingbys, einem Mars-Swingby, zwei Asteroidenvorbeiflügen und 957 Tagen Tiefraumschlaf erreichte Rosetta im August 2014 ihren Ziel-Kometen und umkreiste ihn über zwei Jahre lang. Der Lander Philae erreichte 67P am 12.11.2014 als erstes Raumfahrzeug eine Kometenoberfläche. Rosetta beendete die Mission mit einem kontrollierten Abstieg auf 67P am 30.09.2016.',
    },
    es: {
      name: 'Rosetta',
      type: 'ORBITADOR + ATERRIZADOR · FINALIZADA',
      first: 'Primera nave en orbitar un cometa — y aterrizar en uno (Philae, 12-11-2014)',
      description:
        'Misión insignia de la ESA para reunión con cometa. Tras un crucero de 10 años con tres asistencias gravitatorias de la Tierra, una de Marte, dos sobrevuelos de asteroides y 957 días de hibernación en el espacio profundo, Rosetta alcanzó al cometa 67P/Churyumov-Gerasimenko en agosto de 2014 y lo orbitó durante más de dos años. El módulo Philae llegó a la superficie de 67P el 12-11-2014 — el primer aterrizaje suave en un cometa. Rosetta finalizó la misión con un descenso controlado a 67P el 30-09-2016.',
    },
    fr: {
      name: 'Rosetta',
      type: 'ORBITEUR + ATTERRISSEUR · TERMINÉE',
      first: "Premier vaisseau à orbiter une comète — et à s'y poser (Philae, 12/11/2014)",
      description:
        "Mission phare de l'ESA pour rendez-vous cométaire. Après une croisière de 10 ans incluant trois assistances gravitationnelles terrestres, une assistance martienne, deux survols d'astéroïdes et 957 jours d'hibernation dans l'espace lointain, Rosetta a rejoint la comète 67P/Tchourioumov-Guérassimenko en août 2014 et l'a orbitée pendant plus de deux ans. L'atterrisseur Philae a atteint la surface de 67P le 12/11/2014 — premier atterrissage en douceur sur une comète. Rosetta a terminé sa mission par une descente contrôlée sur 67P le 30/09/2016.",
    },
    hi: {
      name: 'रोसेटा',
      type: 'ऑर्बिटर + लैंडर · पूर्ण',
      first:
        'किसी धूमकेतु की परिक्रमा करने वाला पहला अंतरिक्षयान — और उस पर उतरने वाला (फिले, 12-11-2014)',
      description:
        'ईएसए का प्रमुख धूमकेतु मिलन मिशन। तीन पृथ्वी गुरुत्व सहायताएं, एक मंगल सहायता, दो क्षुद्रग्रह उड़ान-गुजर और 957 दिनों के गहरे अंतरिक्ष शीतनिद्रा के साथ 10 साल की यात्रा के बाद, रोसेटा अगस्त 2014 में धूमकेतु 67P/चुर्युमोव-गेरासिमेंको तक पहुंचा और दो साल से अधिक समय तक उसकी परिक्रमा की। फिले लैंडर 12-11-2014 को 67P की सतह पर पहुंचा — किसी धूमकेतु पर पहली नरम लैंडिंग। रोसेटा ने 30-09-2016 को 67P पर नियंत्रित अवतरण के साथ मिशन समाप्त किया।',
    },
    it: {
      name: 'Rosetta',
      type: 'ORBITER + LANDER · COMPLETATA',
      first: 'Primo veicolo a orbitare attorno a una cometa — e ad atterrarvi (Philae, 12/11/2014)',
      description:
        "Missione di punta dell'ESA per il rendez-vous con la cometa. Dopo una crociera decennale con tre assistenze gravitazionali terrestri, una di Marte, due sorvoli di asteroidi e 957 giorni di ibernazione nello spazio profondo, Rosetta ha raggiunto la cometa 67P/Churyumov-Gerasimenko nell'agosto 2014 e l'ha orbitata per oltre due anni. Il lander Philae ha raggiunto la superficie di 67P il 12/11/2014 — primo atterraggio morbido su una cometa. Rosetta ha concluso la missione con una discesa controllata su 67P il 30/09/2016.",
    },
    ja: {
      name: 'ロゼッタ',
      type: 'オービター + ランダー · 終了',
      first: '彗星を周回した最初の宇宙船 — そして彗星に着陸（フィラエ、2014年11月12日）',
      description:
        'ESAの彗星ランデブー旗艦ミッション。3回の地球スイングバイ、1回の火星スイングバイ、2回の小惑星フライバイ、957日間の深宇宙休眠を含む10年間の航行の後、ロゼッタは2014年8月にチュリュモフ・ゲラシメンコ彗星（67P）に到達し、2年以上にわたって周回しました。着陸機フィラエは2014年11月12日に67Pの表面に到達 — 彗星への史上初のソフトランディング。ロゼッタ自身は2016年9月30日に67Pへの制御された降下でミッションを終了しました。',
    },
    ko: {
      name: '로제타',
      type: '궤도선 + 착륙선 · 완료',
      first: '혜성을 공전한 최초의 우주선 — 그리고 혜성에 착륙(필레, 2014-11-12)',
      description:
        'ESA의 혜성 랑데부 기함 임무. 3번의 지구 중력 도움, 1번의 화성 도움, 2번의 소행성 근접 비행, 957일간의 심우주 동면을 포함한 10년간의 항해 후, 로제타는 2014년 8월 추류모프-게라시멘코 혜성(67P)에 도달하여 2년 이상 공전했습니다. 필레 착륙선은 2014-11-12 67P 표면에 도달 — 혜성 최초의 연착륙. 로제타는 2016-09-30 67P로의 제어된 하강으로 임무를 종료했습니다.',
    },
    nl: {
      name: 'Rosetta',
      type: 'ORBITER + LANDER · VOLTOOID',
      first:
        'Eerste ruimtevaartuig dat een komeet omcirkelde — en erop landde (Philae, 12-11-2014)',
      description:
        "ESA's vlaggenschipmissie voor komeetrendezvous. Na een tienjarige reis met drie aardse zwaartekrachtassists, één Mars-assist, twee asteroïdepassages en 957 dagen diepruimtewinterslaap bereikte Rosetta in augustus 2014 komeet 67P/Tsjoerjoemov-Gerasimenko en draaide er meer dan twee jaar omheen. De lander Philae bereikte het oppervlak van 67P op 12-11-2014 — de eerste zachte landing op een komeet. Rosetta beëindigde de missie met een gecontroleerde afdaling naar 67P op 30-09-2016.",
    },
    'pt-BR': {
      name: 'Rosetta',
      type: 'ORBITADOR + ATERRISSADOR · CONCLUÍDA',
      first: 'Primeira espaçonave a orbitar um cometa — e a pousar em um (Philae, 12-11-2014)',
      description:
        'Missão carro-chefe da ESA para encontro com cometa. Após um cruzeiro de 10 anos com três assistências gravitacionais terrestres, uma marciana, dois sobrevoos de asteroides e 957 dias de hibernação no espaço profundo, a Rosetta alcançou o cometa 67P/Churyumov-Gerasimenko em agosto de 2014 e o orbitou por mais de dois anos. O módulo Philae alcançou a superfície de 67P em 12-11-2014 — o primeiro pouso suave em um cometa. A Rosetta concluiu a missão com uma descida controlada a 67P em 30-09-2016.',
    },
    ru: {
      name: 'Розетта',
      type: 'ОРБИТАЛЬНЫЙ + СПУСКАЕМЫЙ · ЗАВЕРШЕНА',
      first:
        'Первый космический аппарат, вышедший на орбиту кометы — и совершивший посадку на неё (Филы, 12.11.2014)',
      description:
        'Флагманская миссия ЕКА по сближению с кометой. После 10-летнего перелёта с тремя гравитационными манёврами у Земли, одним у Марса, двумя пролётами астероидов и 957 днями глубокого космического сна, Розетта достигла кометы 67P/Чурюмова-Герасименко в августе 2014 года и оставалась на её орбите более двух лет. Спускаемый аппарат «Филы» достиг поверхности 67P 12.11.2014 — первая мягкая посадка на комету. Сама Розетта завершила миссию управляемым спуском на 67P 30.09.2016.',
    },
    'sr-Cyrl': {
      name: 'Розета',
      type: 'ОРБИТЕР + ЛЕНДЕР · ЗАВРШЕНА',
      first: 'Прва летелица која је орбитирала око комете — и слетела на њу (Филе, 12.11.2014.)',
      description:
        'ЕСА-ин водећи рандеву-мисија са кометом. После десетогодишњег пута са три земаљске гравитационе асистенције, једном марсовском, два пролетања поред астероида и 957 дана дубоког свемирског сна, Розета је достигла комету 67P/Чурјумов-Герасименко у августу 2014. и кружила око ње више од две године. Лендер Филе је достигао површину 67P 12.11.2014. — прво меко слетање на комету. Сама Розета је завршила мисију контролисаним спуштањем на 67P 30.09.2016.',
    },
    'zh-CN': {
      name: '罗塞塔号',
      type: '轨道器 + 着陆器 · 已完成',
      first: '首个进入彗星轨道并着陆的航天器（菲莱号，2014-11-12）',
      description:
        'ESA的旗舰彗星交会任务。经过包括三次地球引力辅助、一次火星辅助、两次小行星飞越和957天深空休眠的10年巡航后，罗塞塔号于2014年8月抵达丘留莫夫-格拉西缅科彗星（67P），并环绕它运行了两年多。菲莱着陆器于2014-11-12抵达67P表面 — 这是史上首次在彗星上软着陆。罗塞塔号于2016-09-30以受控下降至67P表面结束任务。',
    },
  },
  giotto: {
    ar: {
      name: 'جوتو',
      type: 'مرور قريب · مكتملة',
      first:
        'أول مهمة فضاء عميق لوكالة الفضاء الأوروبية؛ أقرب مرور قريب على الإطلاق بمذنب (هالي، 596 كم، 1986)',
      description:
        'مسبار وكالة الفضاء الأوروبية الذي درب 596 كم من نواة مذنب هالي في 14 مارس 1986 — أول صور قريبة من نواة مذنب. بعد سبات في مدار شمسي، أعيد تنشيط جوتو عام 1990 واستخدم مساعدة جاذبية أرضية لإعادة الاستهداف إلى مذنب جريج-سكيليرَب، حيث مر على بعد 200 كم في 10 يوليو 1992 — أقرب مرور قريب بمذنب على الإطلاق.',
    },
    de: {
      name: 'Giotto',
      type: 'VORBEIFLUG · BEENDET',
      first:
        'ESAs erste Tiefraummission; engster jemals angesetzter Kometenvorbeiflug (Halley, 596 km, 1986)',
      description:
        'ESA-Sonde, die am 14.3.1986 in 596 km Entfernung am Kern des Halleyschen Kometen vorbeiflog — erste Nahaufnahmen eines Kometenkerns. Nach einer Schlafphase in der Sonnenumlaufbahn wurde Giotto 1990 reaktiviert und nutzte eine Erd-Gravitationsassistenz, um zum Kometen Grigg-Skjellerup umgelenkt zu werden, wo sie am 10.7.1992 in 200 km Entfernung vorbeiflog — der engste je durchgeführte Kometenvorbeiflug.',
    },
    es: {
      name: 'Giotto',
      type: 'SOBREVUELO · FINALIZADA',
      first:
        'Primera misión de espacio profundo de la ESA; sobrevuelo cometario más cercano jamás intentado (Halley, 596 km, 1986)',
      description:
        'Sonda de la ESA que pasó a 596 km del núcleo del cometa Halley el 14-3-1986 — primeras imágenes de cerca de un núcleo cometario. Tras hibernar en órbita solar, Giotto fue reactivada en 1990 y usó una asistencia gravitatoria terrestre para reorientarse hacia el cometa Grigg-Skjellerup, donde sobrevoló a 200 km el 10-7-1992 — el sobrevuelo cometario más cercano jamás realizado.',
    },
    fr: {
      name: 'Giotto',
      type: 'SURVOL · TERMINÉE',
      first:
        "Première mission d'espace lointain de l'ESA ; survol cométaire le plus proche jamais tenté (Halley, 596 km, 1986)",
      description:
        "Sonde de l'ESA passée à 596 km du noyau de la comète de Halley le 14/3/1986 — premières images rapprochées d'un noyau cométaire. Après hibernation en orbite solaire, Giotto fut réactivée en 1990 et utilisa une assistance gravitationnelle terrestre pour se rediriger vers la comète Grigg-Skjellerup, qu'elle survola à 200 km le 10/7/1992 — le survol cométaire le plus proche jamais réalisé.",
    },
    hi: {
      name: 'जोटो',
      type: 'फ्लाईबाई · पूर्ण',
      first:
        'ईएसए का पहला गहरे अंतरिक्ष मिशन; अब तक का सबसे करीबी धूमकेतु फ्लाईबाई (हैली, 596 किमी, 1986)',
      description:
        'ईएसए का अंतरिक्षयान जो 14-3-1986 को हैली धूमकेतु के नाभिक से 596 किमी की दूरी से गुजरा — किसी धूमकेतु के नाभिक की पहली निकटवर्ती छवियां। सौर कक्षा में हाइबरनेशन के बाद, जोटो को 1990 में पुनः सक्रिय किया गया और पृथ्वी की गुरुत्व सहायता का उपयोग करके ग्रिग-स्केलरअप धूमकेतु की ओर पुनर्निर्देशित किया गया, जहां वह 10-7-1992 को 200 किमी से गुजरा — अब तक का सबसे करीबी धूमकेतु फ्लाईबाई।',
    },
    it: {
      name: 'Giotto',
      type: 'SORVOLO · COMPLETATA',
      first:
        "Prima missione di spazio profondo dell'ESA; sorvolo cometario più ravvicinato mai tentato (Halley, 596 km, 1986)",
      description:
        "Sonda dell'ESA che il 14/3/1986 passò a 596 km dal nucleo della cometa di Halley — prime immagini ravvicinate di un nucleo cometario. Dopo un'ibernazione in orbita solare, Giotto fu riattivata nel 1990 e usò un'assistenza gravitazionale terrestre per reindirizzarsi alla cometa Grigg-Skjellerup, sorvolandola a 200 km il 10/7/1992 — il sorvolo cometario più ravvicinato mai eseguito.",
    },
    ja: {
      name: 'ジオット',
      type: 'フライバイ · 終了',
      first: 'ESA初の深宇宙ミッション；史上最接近の彗星フライバイ（ハレー、596 km、1986年）',
      description:
        '1986年3月14日にハレー彗星の核から596 kmの距離を通過したESAの探査機 — 彗星核の最初の接写画像。太陽軌道での冬眠後、ジオットは1990年に再活性化され、地球の重力アシストを利用してグリッグ・シェレルアプ彗星に再標的化、1992年7月10日に200 kmで通過 — 史上最接近の彗星フライバイ。',
    },
    ko: {
      name: '지오토',
      type: '플라이바이 · 완료',
      first: 'ESA 최초의 심우주 임무; 사상 최근접 혜성 플라이바이(핼리, 596 km, 1986)',
      description:
        '1986-3-14 핼리 혜성의 핵으로부터 596 km 거리를 통과한 ESA 우주선 — 혜성 핵의 첫 근접 영상. 태양 궤도 동면 후, 지오토는 1990년에 재활성화되어 지구 중력 도움을 사용하여 그리그-스켈러럽 혜성으로 재표적화되어, 1992-7-10에 200 km로 통과 — 사상 최근접 혜성 플라이바이.',
    },
    nl: {
      name: 'Giotto',
      type: 'SCHEERVLUCHT · VOLTOOID',
      first:
        "ESA's eerste diepruimtemissie; dichtstbijzijnde komeetscheervlucht ooit gepoogd (Halley, 596 km, 1986)",
      description:
        'ESA-sonde die op 14-3-1986 op 596 km langs de kern van komeet Halley vloog — eerste close-upbeelden van een komeetkern. Na overwintering in zonneomloop werd Giotto in 1990 gereactiveerd en gebruikte een aardse zwaartekrachtassistentie om naar komeet Grigg-Skjellerup te navigeren, waar ze op 10-7-1992 op 200 km langs vloog — de dichtstbijzijnde komeetscheervlucht ooit uitgevoerd.',
    },
    'pt-BR': {
      name: 'Giotto',
      type: 'SOBREVOO · CONCLUÍDA',
      first:
        'Primeira missão de espaço profundo da ESA; sobrevoo cometário mais próximo já tentado (Halley, 596 km, 1986)',
      description:
        'Sonda da ESA que passou a 596 km do núcleo do cometa Halley em 14-3-1986 — primeiras imagens próximas do núcleo de um cometa. Após hibernar em órbita solar, Giotto foi reativada em 1990 e usou assistência gravitacional terrestre para redirecionar-se ao cometa Grigg-Skjellerup, sobrevoando-o a 200 km em 10-7-1992 — o sobrevoo cometário mais próximo já realizado.',
    },
    ru: {
      name: 'Джотто',
      type: 'ПРОЛЁТ · ЗАВЕРШЕНА',
      first:
        'Первая дальнекосмическая миссия ЕКА; самый близкий пролёт кометы из когда-либо предпринятых (Галлея, 596 км, 1986)',
      description:
        'Аппарат ЕКА, прошедший в 596 км от ядра кометы Галлея 14.03.1986 — первые крупные снимки кометного ядра. После гибернации на гелиоцентрической орбите Джотто был реактивирован в 1990 году и использовал гравитационный манёвр у Земли для перенаправления к комете Григга-Скьеллерупа, мимо которой пролетел в 200 км 10.07.1992 — самый близкий кометный пролёт.',
    },
    'sr-Cyrl': {
      name: 'Ђото',
      type: 'ПРЕЛЕТ · ЗАВРШЕНА',
      first:
        'Прва ЕСА-ина дубоко-свемирска мисија; најближи прелет коментом икада (Халеј, 596 км, 1986.)',
      description:
        'ЕСА-ина летелица која је прошла 596 км од језгра Халејеве комете 14.3.1986. — прве слике изблиза кометарног језгра. После хибернације у соларној орбити, Ђото је реактивиран 1990. и користио земаљску гравитациону асистенцију да се преусмери ка комети Григ-Скјелеруп, коју је прелетео на 200 км 10.7.1992. — најближи кометарни прелет икада.',
    },
    'zh-CN': {
      name: '乔托号',
      type: '飞掠 · 已完成',
      first: 'ESA首个深空任务；史上最近距离彗星飞掠（哈雷，596公里，1986）',
      description:
        '1986-3-14从哈雷彗星核心596公里处飞过的ESA探测器 — 首批彗星核心特写图像。在日心轨道休眠后，乔托号于1990年重新激活，并使用地球引力辅助重新定向至格里格-斯凯利鲁普彗星，于1992-7-10以200公里飞掠 — 史上最近距离的彗星飞掠。',
    },
  },
  'vega-1': {
    ar: {
      name: 'فيغا 1',
      type: 'مرور قريب + هابطة + بالون · مكتملة',
      first: 'أول بالون أيروستات نُشر في الغلاف الجوي لكوكب آخر (الزهرة، 1985)',
      description:
        'مهمة سوفيتية-أوروبية ضمن أسطول هالي. حملت فيغا 1 هابطة من سلالة فينيرا وبالون هيليوم بنته وكالة الفضاء الأوروبية/المركز الوطني الفرنسي للدراسات الفضائية، طاف على ارتفاع 54 كم في الغلاف الجوي للزهرة 46.5 ساعة. ثم استخدم الناقل مساعدة جاذبية الزهرة للتوجه إلى مذنب 1P/هالي، حيث حقق أقرب مرور (8890 كم) في 6 مارس 1986 — أول مواجهة لنواة مذنب على الإطلاق.',
    },
    de: {
      name: 'Vega 1',
      type: 'VORBEIFLUG + LANDER + BALLON · BEENDET',
      first: 'Erste Ballonsonde in der Atmosphäre eines anderen Planeten (Venus, 1985)',
      description:
        'Sowjetisch-ESA-Mission der Halley-Armada. Vega 1 trug einen Venus-Lander der Venera-Linie und einen ESA/CNES-gebauten Heliumballon, der 46,5 Stunden lang in 54 km Höhe in der Venus-Atmosphäre trieb. Nach Abwurf der Landeeinheit nutzte der Bus eine Venus-Gravitationsassistenz, um zum Kometen 1P/Halley umzulenken, wo er am 6.3.1986 den nächsten Anflug (8890 km) absolvierte — die erste Beobachtung eines Kometenkerns überhaupt.',
    },
    es: {
      name: 'Vega 1',
      type: 'SOBREVUELO + ATERRIZADOR + GLOBO · FINALIZADA',
      first: 'Primer globo aerostático desplegado en la atmósfera de otro planeta (Venus, 1985)',
      description:
        'Misión soviético-ESA de la armada de Halley. Vega 1 llevaba un aterrizador del linaje Venera y un globo de helio construido por ESA/CNES que flotó 46,5 horas a 54 km de altitud en la atmósfera de Venus. Tras soltar el módulo de descenso, el bus usó una asistencia gravitatoria venusiana para redirigirse al cometa 1P/Halley, donde logró su aproximación máxima (8890 km) el 6-3-1986 — el primer encuentro con un núcleo cometario.',
    },
    fr: {
      name: 'Vega 1',
      type: 'SURVOL + ATTERRISSEUR + BALLON · TERMINÉE',
      first:
        "Premier ballon aérostatique déployé dans l'atmosphère d'une autre planète (Vénus, 1985)",
      description:
        "Mission soviéto-ESA de l'armada de Halley. Vega 1 emportait un atterrisseur de la lignée Venera et un ballon à hélium construit par l'ESA/CNES qui a dérivé pendant 46,5 heures à 54 km d'altitude dans l'atmosphère vénusienne. Après largage du module de descente, le bus a utilisé une assistance gravitationnelle vénusienne pour se rediriger vers la comète 1P/Halley, qu'il a survolée au plus près (8890 km) le 6/3/1986 — première rencontre avec un noyau cométaire.",
    },
    hi: {
      name: 'वेगा 1',
      type: 'फ्लाईबाई + लैंडर + बैलून · पूर्ण',
      first: 'किसी अन्य ग्रह के वायुमंडल में तैनात किया गया पहला बैलून एयरोस्टैट (शुक्र, 1985)',
      description:
        'सोवियत-ईएसए की हैली आर्मेडा मिशन। वेगा 1 ने वेनेरा वंश का लैंडर और ईएसए/सीएनईएस द्वारा निर्मित हीलियम बैलून ले जाया जो शुक्र के वायुमंडल में 54 किमी की ऊंचाई पर 46.5 घंटे तक तैरा। डिसेंट मॉड्यूल छोड़ने के बाद, बस ने धूमकेतु 1P/हैली की ओर पुनर्निर्देशित करने के लिए शुक्र की गुरुत्व सहायता का उपयोग किया, जहां 6-3-1986 को सबसे निकटतम पहुंच (8890 किमी) हासिल की — किसी धूमकेतु के नाभिक से पहली मुठभेड़।',
    },
    it: {
      name: 'Vega 1',
      type: 'SORVOLO + LANDER + PALLONE · COMPLETATA',
      first:
        "Primo pallone aerostatico dispiegato nell'atmosfera di un altro pianeta (Venere, 1985)",
      description:
        "Missione sovietico-ESA dell'armata di Halley. Vega 1 trasportava un lander della linea Venera e un pallone a elio costruito da ESA/CNES che ha derivato per 46,5 ore a 54 km di quota nell'atmosfera venusiana. Dopo aver sganciato il modulo di discesa, il bus ha usato un'assistenza gravitazionale venusiana per reindirizzarsi alla cometa 1P/Halley, dove ha ottenuto l'avvicinamento minimo (8890 km) il 6/3/1986 — primo incontro con un nucleo cometario.",
    },
    ja: {
      name: 'ベガ1号',
      type: 'フライバイ + ランダー + 気球 · 終了',
      first: '他の惑星の大気に展開された最初の気球エアロスタット（金星、1985年）',
      description:
        'ソビエト-ESAのハレー艦隊の一員。ベガ1号はベネラ系統のランダーとESA/CNESが製作したヘリウム気球を搭載し、気球は金星大気の高度54 kmで46.5時間漂いました。降下モジュールを放出後、バスは金星の重力アシストを使用してハレー彗星（1P）に再標的化、1986年3月6日に最接近（8890 km）を達成 — 史上初の彗星核遭遇。',
    },
    ko: {
      name: '베가 1호',
      type: '플라이바이 + 착륙선 + 풍선 · 완료',
      first: '다른 행성 대기에 배치된 최초의 풍선 기구(금성, 1985)',
      description:
        '소비에트-ESA의 핼리 함대 임무. 베가 1호는 베네라 계열 착륙선과 ESA/CNES가 제작한 헬륨 풍선을 운반했으며, 풍선은 금성 대기 54 km 고도에서 46.5시간 떠다녔습니다. 하강 모듈을 분리한 후, 버스는 금성 중력 도움을 사용하여 핼리 혜성(1P)으로 재표적화, 1986-3-6 최근접(8890 km)을 달성 — 사상 최초의 혜성 핵 조우.',
    },
    nl: {
      name: 'Vega 1',
      type: 'SCHEERVLUCHT + LANDER + BALLON · VOLTOOID',
      first:
        'Eerste ballonaerostaat ontplooid in de atmosfeer van een andere planeet (Venus, 1985)',
      description:
        'Sovjet-ESA-missie van het Halley-armada. Vega 1 droeg een lander uit de Venera-lijn en een door ESA/CNES gebouwde heliumballon die 46,5 uur op 54 km hoogte in de Venusatmosfeer dreef. Na afwerpen van de afdalingsmodule gebruikte de bus een Venus-zwaartekrachtassistentie om naar komeet 1P/Halley te navigeren, waar hij op 6-3-1986 de dichtste nadering (8890 km) bereikte — de eerste ontmoeting met een komeetkern.',
    },
    'pt-BR': {
      name: 'Vega 1',
      type: 'SOBREVOO + ATERRISSADOR + BALÃO · CONCLUÍDA',
      first: 'Primeiro balão aerostato implantado na atmosfera de outro planeta (Vênus, 1985)',
      description:
        'Missão soviético-ESA da armada de Halley. A Vega 1 carregou um aterrissador da linhagem Venera e um balão de hélio construído pela ESA/CNES que flutuou por 46,5 horas a 54 km de altitude na atmosfera venusiana. Após soltar o módulo de descida, o barramento usou assistência gravitacional venusiana para se redirecionar ao cometa 1P/Halley, onde conseguiu sua aproximação máxima (8890 km) em 6-3-1986 — o primeiro encontro com um núcleo cometário.',
    },
    ru: {
      name: 'Вега-1',
      type: 'ПРОЛЁТ + СПУСКАЕМЫЙ + АЭРОСТАТ · ЗАВЕРШЕНА',
      first: 'Первый аэростатный зонд, развёрнутый в атмосфере другой планеты (Венера, 1985)',
      description:
        'Советско-европейская миссия в составе Хеллеевской армады. «Вега-1» несла спускаемый аппарат линии «Венера» и гелиевый аэростат, построенный ЕКА/КНЕС, который дрейфовал 46,5 часов на высоте 54 км в атмосфере Венеры. После сброса спускаемого модуля пролётный модуль воспользовался гравитационным манёвром у Венеры для перенаправления к комете 1P/Галлея, где совершил ближайший подход (8890 км) 6.3.1986 — первая встреча с кометным ядром.',
    },
    'sr-Cyrl': {
      name: 'Вега 1',
      type: 'ПРЕЛЕТ + ЛЕНДЕР + БАЛОН · ЗАВРШЕНА',
      first: 'Први балонски аеростат распоређен у атмосфери другог планета (Венера, 1985.)',
      description:
        'Совјетско-ЕСА мисија Халејеве армаде. Вега 1 је носила лендер из Венера-линије и хелијумски балон који су израдили ЕСА/КНЕС и који је плутао 46,5 сати на висини од 54 км у венерианској атмосфери. После избацивања модула за спуштање, аутобус је користио венеријанску гравитациону асистенцију да се преусмери ка комети 1P/Халеј, где је постигао најближи прилаз (8890 км) 6.3.1986. — први сусрет са кометним језгром.',
    },
    'zh-CN': {
      name: '维加1号',
      type: '飞掠 + 着陆器 + 气球 · 已完成',
      first: '首个部署在另一颗行星大气中的气球航空器（金星，1985）',
      description:
        '苏联-ESA哈雷舰队的一部分。维加1号携带了金星探测器系列的着陆器和ESA/CNES建造的氦气球，气球在金星大气54公里高空漂浮了46.5小时。释放下降模块后，主体使用金星引力辅助重新定向至哈雷彗星（1P），于1986-3-6实现最接近（8890公里）— 史上首次彗星核心遭遇。',
    },
  },
  'vega-2': {
    ar: {
      name: 'فيغا 2',
      type: 'مرور قريب + هابطة + بالون · مكتملة',
      first: 'أول تحليل كيميائي لتربة المرتفعات في الزهرة (فيبي ريجيو، 1985)',
      description:
        'توأم فيغا 1، أُطلق بعد 6 أيام. هبطت مركبة الإنزال في 15 يونيو 1985 في مرتفعات فيبي ريجيو واستخدمت قياس التألق بالأشعة السينية لاكتشاف مادة أنورثوسيت-نوريت-تروكتوليت — أول تحليل كيميائي لقشرة المرتفعات الزهرية. مر الناقل بمذنب 1P/هالي على بعد 8030 كم في 9 مارس 1986. معاً قدمت ناقلات فيغا أول صور قريبة لنواة كومتارية وحسّنت تحديد الموقع الذي سمح لجوتو بمحاولة مرور 596 كم بهالي بعد خمسة أيام.',
    },
    de: {
      name: 'Vega 2',
      type: 'VORBEIFLUG + LANDER + BALLON · BEENDET',
      first: 'Erste chemische Analyse des venusianischen Hochlandbodens (Phoebe Regio, 1985)',
      description:
        'Zwilling von Vega 1, 6 Tage später gestartet. Das Landemodul setzte am 15.6.1985 im Hochland Phoebe Regio auf und nutzte XRF-Spektroskopie zum Nachweis von Anorthosit-Norit-Troktolith-Material — erste chemische Analyse hoch gelegener venusianischer Kruste. Der Bus flog am 9.3.1986 in 8030 km Abstand am Kometen 1P/Halley vorbei. Gemeinsam lieferten die Vega-Busse die ersten Nahaufnahmen eines Kometenkerns und verfeinerten die Positionsbestimmung, mit der Giotto fünf Tage später einen 596-km-Vorbeiflug an Halley wagen konnte.',
    },
    es: {
      name: 'Vega 2',
      type: 'SOBREVUELO + ATERRIZADOR + GLOBO · FINALIZADA',
      first:
        'Primer análisis químico de suelo de las tierras altas venusianas (Phoebe Regio, 1985)',
      description:
        'Gemela de Vega 1, lanzada 6 días después. El módulo de descenso aterrizó el 15-6-1985 en las tierras altas de Phoebe Regio y usó espectrometría XRF para encontrar material anortosita-norita-troctolita — primer análisis químico de corteza alta venusiana. El bus pasó por el cometa 1P/Halley a 8030 km el 9-3-1986. Juntos, los buses Vega devolvieron las primeras imágenes cercanas de un núcleo cometario y refinaron la posición que permitió a Giotto intentar un sobrevuelo de 596 km a Halley cinco días después.',
    },
    fr: {
      name: 'Vega 2',
      type: 'SURVOL + ATTERRISSEUR + BALLON · TERMINÉE',
      first: 'Première analyse chimique du sol des hautes terres vénusiennes (Phoebe Regio, 1985)',
      description:
        "Jumelle de Vega 1, lancée 6 jours plus tard. L'atterrisseur s'est posé le 15/6/1985 dans les hautes terres de Phoebe Regio et a utilisé la spectrométrie XRF pour identifier du matériau anorthosite-norite-troctolite — première analyse chimique d'une croûte vénusienne d'altitude. Le bus est passé près de la comète 1P/Halley à 8030 km le 9/3/1986. Ensemble, les bus Vega ont renvoyé les premières images rapprochées d'un noyau cométaire et affiné la position permettant à Giotto de tenter un survol à 596 km de Halley cinq jours plus tard.",
    },
    hi: {
      name: 'वेगा 2',
      type: 'फ्लाईबाई + लैंडर + बैलून · पूर्ण',
      first: 'शुक्र की उच्चभूमि मिट्टी का पहला रासायनिक विश्लेषण (फीबे रीजियो, 1985)',
      description:
        'वेगा 1 का जुड़वां, 6 दिन बाद लॉन्च। डिसेंट मॉड्यूल 15-6-1985 को फीबे रीजियो उच्चभूमि में उतरा और एनोर्थोसाइट-नोराइट-ट्रॉक्टोलाइट सामग्री खोजने के लिए XRF स्पेक्ट्रोमेट्री का उपयोग किया — शुक्र की उच्च क्रस्ट का पहला रासायनिक विश्लेषण। बस ने 9-3-1986 को धूमकेतु 1P/हैली को 8030 किमी पर पार किया। साथ में, वेगा बसों ने किसी धूमकेतु के नाभिक की पहली नजदीकी छवियां लौटाईं और स्थिति को परिष्कृत किया जिसने जोटो को पांच दिन बाद हैली के 596 किमी फ्लाईबाई का प्रयास करने की अनुमति दी।',
    },
    it: {
      name: 'Vega 2',
      type: 'SORVOLO + LANDER + PALLONE · COMPLETATA',
      first: 'Prima analisi chimica del suolo delle terre alte venusiane (Phoebe Regio, 1985)',
      description:
        "Gemella di Vega 1, lanciata 6 giorni dopo. Il modulo di discesa è atterrato il 15/6/1985 nelle terre alte di Phoebe Regio e ha usato spettrometria XRF per identificare materiale anortosite-norite-troctolite — prima analisi chimica di crosta venusiana d'altura. Il bus è passato accanto alla cometa 1P/Halley a 8030 km il 9/3/1986. Insieme, i bus Vega hanno restituito le prime immagini ravvicinate di un nucleo cometario e raffinato la posizione che ha permesso a Giotto di tentare un sorvolo a 596 km da Halley cinque giorni dopo.",
    },
    ja: {
      name: 'ベガ2号',
      type: 'フライバイ + ランダー + 気球 · 終了',
      first: '金星高地土壌の初の化学分析（フォエベ・レジオ、1985年）',
      description:
        'ベガ1号の双子、6日後に打ち上げ。降下モジュールは1985年6月15日にフォエベ・レジオ高地に着陸、XRF分光法を用いて斜長岩-ノーライト-トロクトライト物質を同定 — 金星の高地地殻の初の化学分析。バスは1986年3月9日にハレー彗星（1P）を8030 kmで通過しました。ベガのバス機は共同で最初の彗星核接写画像を返し、ジオットが5日後に596 kmでハレー彗星を通過することを可能にする位置情報を精密化しました。',
    },
    ko: {
      name: '베가 2호',
      type: '플라이바이 + 착륙선 + 풍선 · 완료',
      first: '금성 고지대 토양의 첫 화학 분석(피베 레지오, 1985)',
      description:
        '베가 1호의 쌍둥이, 6일 후 발사. 하강 모듈은 1985-6-15 피베 레지오 고지대에 착륙하여 XRF 분광법을 사용하여 사장암-노라이트-트록톨라이트 물질을 식별 — 금성의 고지대 지각에 대한 첫 화학 분석. 버스는 1986-3-9 핼리 혜성(1P)을 8030 km 통과했습니다. 베가 버스들은 함께 혜성 핵의 첫 근접 영상을 반환하고, 지오토가 5일 후 핼리에서 596 km 플라이바이를 시도할 수 있게 한 위치 정보를 정제했습니다.',
    },
    nl: {
      name: 'Vega 2',
      type: 'SCHEERVLUCHT + LANDER + BALLON · VOLTOOID',
      first: 'Eerste chemische analyse van Venusiaanse hooglandbodem (Phoebe Regio, 1985)',
      description:
        'Tweelingmissie van Vega 1, 6 dagen later gelanceerd. De afdalingsmodule landde op 15-6-1985 in de hooglanden van Phoebe Regio en gebruikte XRF-spectrometrie om anortosiet-noriet-troktolietmateriaal te identificeren — eerste chemische analyse van hooggelegen Venusiaanse korst. De bus passeerde komeet 1P/Halley op 8030 km op 9-3-1986. Samen retourneerden de Vega-bussen de eerste close-upbeelden van een komeetkern en verfijnden de positiebepaling waarmee Giotto vijf dagen later een 596 km Halley-scheervlucht kon proberen.',
    },
    'pt-BR': {
      name: 'Vega 2',
      type: 'SOBREVOO + ATERRISSADOR + BALÃO · CONCLUÍDA',
      first: 'Primeira análise química do solo das terras altas venusianas (Phoebe Regio, 1985)',
      description:
        'Gêmea da Vega 1, lançada 6 dias depois. O módulo de descida pousou em 15-6-1985 nas terras altas de Phoebe Regio e usou espectrometria XRF para identificar material anortosito-norito-troctolito — primeira análise química da crosta venusiana de altitude. O barramento passou pelo cometa 1P/Halley a 8030 km em 9-3-1986. Juntos, os barramentos Vega devolveram as primeiras imagens próximas de um núcleo cometário e refinaram a posição que permitiu à Giotto tentar um sobrevoo a 596 km do Halley cinco dias depois.',
    },
    ru: {
      name: 'Вега-2',
      type: 'ПРОЛЁТ + СПУСКАЕМЫЙ + АЭРОСТАТ · ЗАВЕРШЕНА',
      first: 'Первый химический анализ грунта венерианских высокогорий (Феба-Регион, 1985)',
      description:
        'Близнец «Веги-1», запущен через 6 дней. Спускаемый модуль приземлился 15.6.1985 в высокогорьях Феба-Регион и использовал рентгеновскую флуоресцентную спектрометрию для идентификации материала анортозит-норит-троктолит — первый химический анализ венерианской высокогорной коры. Пролётный модуль прошёл мимо кометы 1P/Галлея в 8030 км 9.3.1986. Совместно пролётные модули «Веги» доставили первые крупные снимки кометного ядра и уточнили положение, позволившее «Джотто» через пять дней совершить пролёт Галлея на 596 км.',
    },
    'sr-Cyrl': {
      name: 'Вега 2',
      type: 'ПРЕЛЕТ + ЛЕНДЕР + БАЛОН · ЗАВРШЕНА',
      first: 'Прва хемијска анализа тла венеријанских висоравни (Фебе Регио, 1985.)',
      description:
        'Близанац Веге 1, лансиран 6 дана касније. Модул за спуштање је слетео 15.6.1985. у висоравни Фебе Регио и користио XRF спектрометрију за идентификацију анортозит-норит-троктолит материјала — прва хемијска анализа венеријанске високогорне коре. Аутобус је прошао поред комете 1P/Халеј на 8030 км 9.3.1986. Заједно су аутобуси Веге вратили прве слике изблиза кометног језгра и прецизирали положај који је дозволио Ђоту да пет дана касније покуша прелет од 596 км од Халеја.',
    },
    'zh-CN': {
      name: '维加2号',
      type: '飞掠 + 着陆器 + 气球 · 已完成',
      first: '金星高地土壤的首次化学分析（菲比区，1985）',
      description:
        '维加1号的孪生姊妹船，6天后发射。下降模块于1985-6-15在菲比区高地着陆，使用XRF光谱法识别出斜长岩-苏长岩-辉橄岩物质 — 金星高地地壳的首次化学分析。主体于1986-3-9以8030公里距离飞过哈雷彗星（1P）。维加号主体共同返回了首批彗星核心特写图像，并精确了使乔托号5天后能够尝试596公里哈雷飞掠的位置信息。',
    },
  },
  'venera-13': {
    ar: {
      name: 'فينيرا 13',
      type: 'هابطة · مكتملة',
      first:
        'أطول بقاء على سطح أي مهمة إلى الزهرة (127 دقيقة)؛ أول صور بانورامية ملونة وأول صوت من سطح كوكب آخر',
      description:
        'ذروة برنامج فينيرا السوفيتي. هبطت فينيرا 13 في 1 مارس 1982 على 7.5°ج 303°ش في مرتفعات فيبي ريجيو. ظروف السطح عند الهبوط: 457 °م، 89 بار، ضباب حمض الكبريتيك. نجت الهابطة 127 دقيقة — تجاوزت هدف تصميمها بنحو ساعة — وأعادت أول بانوراميات ملونة من سطح كوكب آخر، وسجلت أول صوت بميكروفون الرياح، واستخدمت مثقابها لتحديد أن البازلت في موقع الهبوط كان تركيبة قلوية لوسيت متمايزة قليلاً.',
    },
    de: {
      name: 'Venera 13',
      type: 'LANDER · BEENDET',
      first:
        'Längstes Überleben auf der Oberfläche aller Venus-Missionen (127 min); erste Farbpanoramen + erste Audiodaten von der Oberfläche eines anderen Planeten',
      description:
        'Höhepunkt des sowjetischen Venera-Programms. Venera 13 landete am 1.3.1982 bei 7,5°S 303°E im Hochland Phoebe Regio. Oberflächenbedingungen bei Aufsetzen: 457 °C, 89 bar, Schwefelsäure-Smog. Der Lander überlebte 127 Minuten — fast eine Stunde über das Designziel hinaus — lieferte die ersten Farbpanoramen einer anderen Planetenoberfläche, nahm mit dem Windmikrofon Geräusche auf und stellte mit seinem Bohrer fest, dass der Basalt am Landeplatz eine schwach differenzierte leucit-alkalische Zusammensetzung aufwies.',
    },
    es: {
      name: 'Venera 13',
      type: 'ATERRIZADOR · FINALIZADA',
      first:
        'Mayor supervivencia en superficie de cualquier misión a Venus (127 min); primeras panorámicas a color y primer audio de la superficie de otro planeta',
      description:
        'Cumbre del programa Venera soviético. Venera 13 aterrizó el 1-3-1982 en 7,5°S 303°E en las tierras altas de Phoebe Regio. Condiciones superficiales al aterrizar: 457 °C, 89 bar, neblina de ácido sulfúrico. El aterrizador sobrevivió 127 minutos — superando su meta de diseño en casi una hora — devolvió las primeras panorámicas a color de la superficie de otro planeta, grabó el primer audio con micrófono de viento y usó su taladro para determinar que el basalto del lugar era una composición leucítica alcalina débilmente diferenciada.',
    },
    fr: {
      name: 'Venera 13',
      type: 'ATTERRISSEUR · TERMINÉE',
      first:
        "Plus longue survie en surface de toute mission vers Vénus (127 min) ; premières panoramiques couleur et premier audio depuis la surface d'une autre planète",
      description:
        "Apogée du programme soviétique Venera. Venera 13 s'est posée le 1/3/1982 à 7,5°S 303°E dans les hautes terres de Phoebe Regio. Conditions de surface à l'atterrissage : 457 °C, 89 bars, brume d'acide sulfurique. L'atterrisseur a survécu 127 minutes — dépassant son objectif de conception de près d'une heure — a retourné les premières panoramiques couleur de la surface d'une autre planète, a enregistré le premier audio avec un microphone à vent et a utilisé sa foreuse pour déterminer que le basalte du site était une composition leucitique alcaline faiblement différenciée.",
    },
    hi: {
      name: 'वेनेरा 13',
      type: 'लैंडर · पूर्ण',
      first:
        'किसी भी शुक्र मिशन की सबसे लंबी सतह उत्तरजीविता (127 मिनट); पहली रंगीन पैनोरामिक छवियां और किसी अन्य ग्रह की सतह से पहला ऑडियो',
      description:
        'सोवियत वेनेरा कार्यक्रम का शिखर। वेनेरा 13 1-3-1982 को 7.5°दक्षिण 303°पूर्व फीबे रीजियो उच्चभूमि में उतरा। टचडाउन पर सतह की स्थिति: 457 °सेल्सियस, 89 बार, सल्फ्यूरिक एसिड धुंध। लैंडर 127 मिनट तक जीवित रहा — अपने डिजाइन लक्ष्य से लगभग एक घंटा अधिक — किसी अन्य ग्रह की सतह की पहली रंगीन पैनोरामिक छवियां लौटाईं, विंड माइक्रोफोन के साथ पहला ऑडियो रिकॉर्ड किया, और अपनी ड्रिल का उपयोग करके निर्धारित किया कि लैंडिंग साइट का बेसाल्ट कमजोर रूप से विभेदित ल्यूसाइट क्षारीय संरचना था।',
    },
    it: {
      name: 'Venera 13',
      type: 'LANDER · COMPLETATA',
      first:
        'Più lunga sopravvivenza in superficie di qualsiasi missione su Venere (127 min); prime panoramiche a colori e primo audio dalla superficie di un altro pianeta',
      description:
        "Apice del programma sovietico Venera. Venera 13 atterrò il 1/3/1982 a 7,5°S 303°E nelle terre alte di Phoebe Regio. Condizioni di superficie al touchdown: 457 °C, 89 bar, foschia di acido solforico. Il lander sopravvisse 127 minuti — superando il suo obiettivo di progetto di quasi un'ora — restituendo le prime panoramiche a colori della superficie di un altro pianeta, registrando il primo audio con microfono per il vento e usando il suo trapano per determinare che il basalto del sito di atterraggio era una composizione leucitica alcalina debolmente differenziata.",
    },
    ja: {
      name: 'ベネラ13号',
      type: 'ランダー · 終了',
      first:
        '全金星ミッション中最長の表面生存（127分）；他惑星表面からの初のカラーパノラマと初の音声',
      description:
        'ソビエト・ベネラ計画の頂点。ベネラ13号は1982年3月1日にフォエベ・レジオ高地の7.5°S 303°Eに着陸。着地時の表面条件：457 °C、89バール、硫酸スモッグ。ランダーは127分間生存 — 設計目標を約1時間超過 — 他惑星表面の初のカラーパノラマを返し、風マイクで初の音声を録音し、ドリルを使用して着陸地点の玄武岩が弱く分化したロイサイト・アルカリ組成であることを判定しました。',
    },
    ko: {
      name: '베네라 13호',
      type: '착륙선 · 완료',
      first:
        '모든 금성 임무 중 최장 표면 생존(127분); 다른 행성 표면의 첫 컬러 파노라마 영상 및 첫 음성',
      description:
        '소비에트 베네라 프로그램의 정점. 베네라 13호는 1982-3-1 피베 레지오 고지대의 7.5°S 303°E에 착륙. 착륙 시 표면 조건: 457°C, 89bar, 황산 안개. 착륙선은 127분 동안 생존 — 설계 목표를 거의 1시간 초과 — 다른 행성 표면의 첫 컬러 파노라마를 반환하고, 풍속 마이크로 첫 음성을 녹음하고, 드릴을 사용하여 착륙 지점의 현무암이 약하게 분화된 류사이트 알칼리 조성임을 결정했습니다.',
    },
    nl: {
      name: 'Venera 13',
      type: 'LANDER · VOLTOOID',
      first:
        "Langste oppervlakteoverleving van enige Venusmissie (127 min); eerste kleurenpanorama's en eerste audio van het oppervlak van een andere planeet",
      description:
        "Hoogtepunt van het Sovjet-Venera-programma. Venera 13 landde op 1-3-1982 op 7,5°Z 303°O in de hooglanden van Phoebe Regio. Oppervlakteomstandigheden bij landing: 457 °C, 89 bar, zwavelzuurnevel. De lander overleefde 127 minuten — bijna een uur boven zijn ontwerptarget — leverde de eerste kleurenpanorama's van een ander planeetoppervlak, nam met een windmicrofoon het eerste audio op en gebruikte zijn boor om vast te stellen dat het basalt van de landingsplaats een zwak gedifferentieerde leuciet-alkalische samenstelling had.",
    },
    'pt-BR': {
      name: 'Venera 13',
      type: 'ATERRISSADOR · CONCLUÍDA',
      first:
        'Maior sobrevivência em superfície de qualquer missão a Vênus (127 min); primeiras imagens panorâmicas em cores e primeiro áudio da superfície de outro planeta',
      description:
        'Auge do programa Venera soviético. A Venera 13 pousou em 1-3-1982 em 7,5°S 303°L nas terras altas de Phoebe Regio. Condições de superfície na aterrissagem: 457 °C, 89 bar, névoa de ácido sulfúrico. O aterrissador sobreviveu 127 minutos — superando sua meta de projeto em quase uma hora — devolveu os primeiros panoramas em cores da superfície de outro planeta, gravou o primeiro áudio com microfone de vento e usou sua broca para determinar que o basalto do local era uma composição leucítica alcalina fracamente diferenciada.',
    },
    ru: {
      name: 'Венера-13',
      type: 'СПУСКАЕМЫЙ · ЗАВЕРШЕНА',
      first:
        'Самое длительное выживание на поверхности среди всех венерианских миссий (127 мин); первые цветные панорамы и первое аудио с поверхности другой планеты',
      description:
        'Вершина советской программы «Венера». «Венера-13» приземлилась 1.3.1982 на 7,5°ю.ш. 303°в.д. в высокогорьях Феба-Регион. Условия на поверхности при посадке: 457 °C, 89 бар, серно-кислотный туман. Спускаемый аппарат выжил 127 минут — почти на час перевыполнив проектную цель — передал первые цветные панорамы поверхности другой планеты, записал первое аудио с микрофоном ветра и использовал бур для определения того, что базальт посадочной площадки имеет слабо дифференцированный лейцит-щелочной состав.',
    },
    'sr-Cyrl': {
      name: 'Венера 13',
      type: 'ЛЕНДЕР · ЗАВРШЕНА',
      first:
        'Најдуже преживљавање на површини било које венеријанске мисије (127 мин); прве колор панораме и први звук са површине другог планета',
      description:
        'Врхунац совјетског Венера програма. Венера 13 је слетела 1.3.1982. на 7,5°Ј 303°И у висоравни Фебе Регио. Услови површине при слетању: 457 °C, 89 бара, магла сумпорне киселине. Лендер је преживео 127 минута — премашујући свој дизајнерски циљ за скоро сат — вратио је прве колор панораме површине другог планета, снимио први звук са микрофоном за ветар и користио бушилицу да утврди да је базалт на месту слетања слабо диференцирана леуцит-алкална композиција.',
    },
    'zh-CN': {
      name: '金星13号',
      type: '着陆器 · 已完成',
      first: '所有金星任务中最长的表面生存时间（127分钟）；其他行星表面首次彩色全景图像和首次音频',
      description:
        '苏联金星计划的巅峰。金星13号于1982-3-1降落在菲比区高地7.5°南303°东。着陆时表面条件：457°C，89巴，硫酸雾。着陆器存活了127分钟 — 比设计目标超出近一小时 — 返回了其他行星表面的首批彩色全景图像，使用风麦克风记录了第一段音频，并使用钻头确定着陆点的玄武岩是弱分化的白榴石碱性组成。',
    },
  },
  hayabusa2: {
    ar: {
      name: 'هايابوسا 2',
      type: 'إعادة عينات + هابطات · نشطة (موسعة)',
      first:
        'ثاني إعادة عينات من كويكب (ريوغو، 2020)؛ أول حفرة اصطدامية اصطناعية على كويكب؛ أول مواد كويكبية تحت سطحية أُعيدت إلى الأرض',
      description:
        'تابع جاكسا لهايابوسا الأصلية. أُطلقت في 3 ديسمبر 2014، ووصلت هايابوسا 2 إلى الكويكب القريب من الأرض (162173) ريوغو في 27 يونيو 2018. عمليات السطح 2018-2019 أعادت أول مسح قريب مستدام لكويكب من نوع C ركام-حُطام. هبطت كبسولة إعادة العينات فوق وومرا، أستراليا في 5 ديسمبر 2020 وسلمت 5.4 جم من مواد ريوغو النقية — أول عينة كويكب ذات طبقات تحت سطحية. مهمة موسعة: تحليق فوق (98943) 2001 CC21 في يوليو 2026؛ التقاء مع (1998 KY26) سريع الدوران مستهدف لـ يوليو 2031.',
    },
    de: {
      name: 'Hayabusa2',
      type: 'PROBENRÜCKKEHR + LANDER · AKTIV (verlängert)',
      first:
        'Zweite Asteroiden-Probenrückkehr (Ryugu, 2020); erster künstlicher Einschlagkrater auf einem Asteroiden; erste tieferliegende Asteroidenproben zur Erde gebracht',
      description:
        'JAXAs Nachfolger der ursprünglichen Hayabusa. Gestartet am 3.12.2014, erreichte Hayabusa2 den erdnahen Asteroiden (162173) Ryugu am 27.6.2018. Oberflächenoperationen 2018-2019 lieferten die erste anhaltende Nahaufnahme eines Schutthaufen-C-Typ-Asteroiden. Die Probenrückkehrkapsel landete am 5.12.2020 über Woomera, Australien, und lieferte 5,4 g unberührtes Ryugu-Material — die erste Asteroidenprobe mit unterirdischer Stratigrafie. Erweiterte Mission: Vorbeiflug an (98943) 2001 CC21 im Juli 2026; Rendezvous mit dem schnell rotierenden (1998 KY26) für Juli 2031 anvisiert.',
    },
    es: {
      name: 'Hayabusa2',
      type: 'RETORNO DE MUESTRAS + ATERRIZADORES · ACTIVA (ampliada)',
      first:
        'Segundo retorno de muestras de asteroide (Ryugu, 2020); primer cráter artificial en un asteroide; primer material subsuperficial de asteroide devuelto a la Tierra',
      description:
        'Continuación de JAXA de la Hayabusa original. Lanzada el 3-12-2014, Hayabusa2 alcanzó el asteroide cercano a la Tierra (162173) Ryugu el 27-6-2018. Operaciones de superficie 2018-2019 devolvieron el primer estudio cercano sostenido de un asteroide de tipo C en pila de escombros. La cápsula de retorno de muestras aterrizó sobre Woomera, Australia el 5-12-2020 entregando 5,4 g de material prístino de Ryugu — la primera muestra de asteroide con estratigrafía subsuperficial. Misión ampliada: sobrevuelo de (98943) 2001 CC21 en julio de 2026; encuentro con el (1998 KY26) de rotación rápida apuntado para julio de 2031.',
    },
    fr: {
      name: 'Hayabusa2',
      type: "RETOUR D'ÉCHANTILLONS + ATTERRISSEURS · ACTIVE (étendue)",
      first:
        "Deuxième retour d'échantillons d'astéroïde (Ryugu, 2020) ; premier cratère artificiel sur un astéroïde ; premier matériau sous-surface d'astéroïde rapporté sur Terre",
      description:
        "Suite par la JAXA de l'Hayabusa originale. Lancée le 3/12/2014, Hayabusa2 a atteint l'astéroïde géocroiseur (162173) Ryugu le 27/6/2018. Les opérations de surface 2018-2019 ont produit la première étude rapprochée soutenue d'un astéroïde de type C en tas de gravats. La capsule de retour d'échantillons a atterri au-dessus de Woomera, Australie le 5/12/2020 livrant 5,4 g de matériau intact de Ryugu — le premier échantillon d'astéroïde avec stratigraphie sous-surface. Mission étendue : survol de (98943) 2001 CC21 en juillet 2026 ; rendez-vous avec le rapide (1998 KY26) visé pour juillet 2031.",
    },
    hi: {
      name: 'हायाबुसा 2',
      type: 'नमूना वापसी + लैंडर · सक्रिय (विस्तारित)',
      first:
        'दूसरा क्षुद्रग्रह नमूना वापसी (रयूगु, 2020); किसी क्षुद्रग्रह पर पहला कृत्रिम प्रभाव गड्ढा; पृथ्वी पर वापस लाया गया पहला उपसतह क्षुद्रग्रह पदार्थ',
      description:
        'जाक्सा द्वारा मूल हायाबुसा का अनुसरण। 3-12-2014 को लॉन्च, हायाबुसा 2 27-6-2018 को निकट-पृथ्वी क्षुद्रग्रह (162173) रयूगु पर पहुंचा। सतह संचालन 2018-2019 ने मलबे-ढेर सी-प्रकार क्षुद्रग्रह का पहला निरंतर निकट सर्वेक्षण लौटाया। नमूना वापसी कैप्सूल 5-12-2020 को वूमेरा, ऑस्ट्रेलिया पर उतरा और रयूगु की 5.4 ग्राम मूल सामग्री दी — उपसतह स्ट्रैटिग्राफी वाला पहला क्षुद्रग्रह नमूना। विस्तारित मिशन: जुलाई 2026 में (98943) 2001 CC21 का फ्लाईबाई; जुलाई 2031 के लिए तेजी से घूमने वाले (1998 KY26) से मिलन निशाना।',
    },
    it: {
      name: 'Hayabusa2',
      type: 'RIENTRO CAMPIONI + LANDER · ATTIVA (estesa)',
      first:
        'Secondo rientro di campioni di asteroide (Ryugu, 2020); primo cratere artificiale su un asteroide; primo materiale sub-superficiale di asteroide riportato sulla Terra',
      description:
        "Seguito di JAXA all'Hayabusa originale. Lanciata il 3/12/2014, Hayabusa2 ha raggiunto l'asteroide vicino alla Terra (162173) Ryugu il 27/6/2018. Le operazioni di superficie 2018-2019 hanno restituito il primo sondaggio ravvicinato sostenuto di un asteroide di tipo C a cumulo di macerie. La capsula di rientro campioni è atterrata sopra Woomera, Australia il 5/12/2020 consegnando 5,4 g di materiale incontaminato di Ryugu — il primo campione di asteroide con stratigrafia sub-superficiale. Missione estesa: sorvolo di (98943) 2001 CC21 nel luglio 2026; rendezvous con il rapido (1998 KY26) mirato per luglio 2031.",
    },
    ja: {
      name: 'はやぶさ2',
      type: 'サンプルリターン + ランダー · 運用中（延長）',
      first:
        '2回目の小惑星サンプルリターン（リュウグウ、2020年）；小惑星初の人工衝突クレーター；地球に戻された初の小惑星地下物質',
      description:
        'JAXAのオリジナルはやぶさの後継機。2014年12月3日に打ち上げられたはやぶさ2は2018年6月27日に地球近傍小惑星（162173）リュウグウに到達。2018-2019年の表面運用は、瓦礫山C型小惑星の初の継続的接写調査を返しました。サンプルリターンカプセルは2020年12月5日にオーストラリアのウーメラ上空で着陸、リュウグウの純粋な物質5.4 gを届けました — 地下層序を持つ初の小惑星サンプル。延長ミッション：2026年7月に（98943）2001 CC21の通過；2031年7月に急速回転する（1998 KY26）との接近を予定。',
    },
    ko: {
      name: '하야부사2호',
      type: '샘플 귀환 + 착륙선 · 활성(연장)',
      first:
        '두 번째 소행성 샘플 귀환(류구, 2020); 소행성 최초의 인공 충돌 분화구; 지구로 가져온 최초의 지하 소행성 물질',
      description:
        'JAXA의 원조 하야부사 후속. 2014-12-3 발사된 하야부사2호는 2018-6-27 지구근접 소행성 (162173) 류구에 도달. 2018-2019 표면 운영은 잔해 더미 C형 소행성의 첫 지속적 근접 조사를 반환했습니다. 샘플 귀환 캡슐은 2020-12-5 호주 우메라 상공에 착륙하여 류구의 순수 물질 5.4g을 전달 — 지하 층서를 가진 최초의 소행성 샘플. 연장 임무: 2026년 7월 (98943) 2001 CC21 플라이바이; 2031년 7월 빠르게 회전하는 (1998 KY26)과의 랑데부 목표.',
    },
    nl: {
      name: 'Hayabusa2',
      type: 'MONSTERS RETOUR + LANDERS · ACTIEF (verlengd)',
      first:
        'Tweede asteroïde-monsterretour (Ryugu, 2020); eerste kunstmatige inslagkrater op een asteroïde; eerste ondergrondse asteroïdemateriaal teruggebracht naar de Aarde',
      description:
        "JAXA's vervolg op de oorspronkelijke Hayabusa. Gelanceerd op 3-12-2014, bereikte Hayabusa2 de aardscheerder (162173) Ryugu op 27-6-2018. Oppervlakteoperaties 2018-2019 leverden de eerste aanhoudende close-upsurvey van een puinhoop C-type asteroïde op. De monsterretourcapsule landde op 5-12-2020 boven Woomera, Australië en leverde 5,4 g maagdelijk Ryugu-materiaal — het eerste asteroïdemonster met ondergrondse stratigrafie. Verlengde missie: scheervlucht van (98943) 2001 CC21 in juli 2026; rendezvous met de snel roterende (1998 KY26) gericht voor juli 2031.",
    },
    'pt-BR': {
      name: 'Hayabusa2',
      type: 'RETORNO DE AMOSTRAS + ATERRISSADORES · ATIVA (estendida)',
      first:
        'Segundo retorno de amostras de asteroide (Ryugu, 2020); primeira cratera de impacto artificial em um asteroide; primeiro material subsuperficial de asteroide trazido de volta à Terra',
      description:
        'Continuação da JAXA da Hayabusa original. Lançada em 3-12-2014, a Hayabusa2 alcançou o asteroide próximo da Terra (162173) Ryugu em 27-6-2018. As operações de superfície 2018-2019 retornaram o primeiro levantamento próximo sustentado de um asteroide de pilha de escombros tipo C. A cápsula de retorno de amostras pousou sobre Woomera, Austrália em 5-12-2020 entregando 5,4 g de material prístino de Ryugu — a primeira amostra de asteroide com estratigrafia subsuperficial. Missão estendida: sobrevoo de (98943) 2001 CC21 em julho de 2026; encontro com o rapidamente rotativo (1998 KY26) visado para julho de 2031.',
    },
    ru: {
      name: 'Хаябуса-2',
      type: 'ВОЗВРАТ ОБРАЗЦОВ + СПУСКАЕМЫЕ · АКТИВНА (продлена)',
      first:
        'Второй возврат образцов с астероида (Рюгу, 2020); первый искусственный ударный кратер на астероиде; первый подповерхностный материал астероида, возвращённый на Землю',
      description:
        'Продолжение JAXA оригинальной «Хаябусы». Запущена 3.12.2014, «Хаябуса-2» достигла околоземного астероида (162173) Рюгу 27.6.2018. Поверхностные операции 2018-2019 годов позволили провести первое продолжительное близкое исследование астероида C-типа из груды обломков. Капсула возврата образцов приземлилась над Вумерой, Австралия 5.12.2020, доставив 5,4 г нетронутого материала Рюгу — первый образец астероида с подповерхностной стратиграфией. Расширенная миссия: пролёт (98943) 2001 CC21 в июле 2026 г.; сближение с быстро вращающимся (1998 KY26) намечено на июль 2031 г.',
    },
    'sr-Cyrl': {
      name: 'Хајабуса 2',
      type: 'ПОВРАТАК УЗОРАКА + ЛЕНДЕРИ · АКТИВНА (продужена)',
      first:
        'Други повратак узорака астероида (Рјугу, 2020.); први вештачки кратер удара на астероиду; први подповршински астероидни материјал враћен на Земљу',
      description:
        'ЈАКСА-ин наставак оригиналне Хајабусе. Лансирана 3.12.2014, Хајабуса 2 је достигла блискоземаљски астероид (162173) Рјугу 27.6.2018. Операције на површини 2018-2019 вратиле су прво континуирано блиско истраживање астероида типа Ц у гомили крхотина. Капсула за повратак узорака слетела је изнад Вумере, Аустралија 5.12.2020. испоручујући 5,4 г нетакнутог Рјугу материјала — први астероидни узорак са подповршинском стратиграфијом. Продужена мисија: прелет (98943) 2001 CC21 у јулу 2026; сусрет са брзо ротирајућим (1998 KY26) циљан за јул 2031.',
    },
    'zh-CN': {
      name: '隼鸟2号',
      type: '样本返回 + 着陆器 · 活跃（延长）',
      first:
        '第二次小行星样本返回（龙宫，2020）；小行星上首次人造撞击坑；首次将地下小行星物质带回地球',
      description:
        'JAXA对原始隼鸟号的后续任务。2014-12-3发射，隼鸟2号于2018-6-27抵达近地小行星（162173）龙宫。2018-2019年的表面操作返回了对碎石堆C型小行星的首次持续近距离勘测。样本返回舱于2020-12-5降落在澳大利亚伍默拉上空，交付5.4克原始龙宫物质 — 首个具有地下层位的小行星样本。延长任务：2026年7月飞掠（98943）2001 CC21；2031年7月与快速旋转的（1998 KY26）会合。',
    },
  },
  juice: {
    ar: {
      name: 'جوس',
      type: 'مدارية · نشطة',
      first:
        'أكبر مركبة فضائية كوكبية صنعتها أوروبا؛ أول مركبة على الإطلاق تدور حول قمر كوكب آخر (غانيميد، 2034)',
      description:
        'مستكشف أقمار المشتري الجليدية — مهمة وكالة الفضاء الأوروبية الرائدة من الفئة L، أُطلقت في 14 أبريل 2023. تستخدم رحلة الـ 8 سنوات أحد أكثر تسلسلات المساعدة الجاذبية تعقيداً التي طُيرت على الإطلاق: مساعدة جاذبية قمرية-أرضية ذات أول نوع في 19 أغسطس 2024، الزهرة في 31 أغسطس 2025، ثم مرور أرضي إضافي في 2026 و 2029. إدخال مدار المشتري مقرر في 21 يوليو 2031. بعد 35 مروراً قريباً بأوروبا وغانيميد وكاليستو على مدى 3.5 سنوات، ستناور جوس إلى مدار غانيميد مخصص في 31 ديسمبر 2034 — أول مركبة فضائية تدور حول قمر كوكب آخر.',
    },
    de: {
      name: 'JUICE',
      type: 'ORBITER · AKTIV',
      first:
        'Größte je in Europa gebaute interplanetare Raumsonde; erstes Raumfahrzeug, das einen Mond eines anderen Planeten umkreist (Ganymed, 2034)',
      description:
        'JUpiter ICy moons Explorer — ESAs L-Klasse-Flaggschiff, gestartet am 14.4.2023. Die 8-jährige Reise nutzt eine der komplexesten Gravitationsassistenz-Sequenzen, die je geflogen wurden: eine erstmalige Mond-Erde-Gravitationsassistenz am 19.8.2024, Venus am 31.8.2025, dann zwei weitere Erdbahn-Vorbeiflüge 2026 und 2029. Jupiter-Orbit-Einschuss ist für den 21.7.2031 angesetzt. Nach 35 engen Vorbeiflügen an Europa, Ganymed und Kallisto über 3,5 Jahre wird JUICE am 31.12.2034 in einen dedizierten Ganymed-Orbit manövriert — das erste Raumfahrzeug überhaupt, das einen Mond eines anderen Planeten umkreist.',
    },
    es: {
      name: 'JUICE',
      type: 'ORBITADOR · ACTIVA',
      first:
        'Nave interplanetaria más grande construida en Europa; primera nave en orbitar una luna de otro planeta (Ganímedes, 2034)',
      description:
        'JUpiter ICy moons Explorer — misión insignia de clase L de la ESA, lanzada el 14-4-2023. El crucero de 8 años usa una de las secuencias de asistencia gravitatoria más complejas jamás voladas: una asistencia gravitatoria Luna-Tierra inédita el 19-8-2024, Venus el 31-8-2025, luego dos pasos terrestres más en 2026 y 2029. La inserción en órbita joviana está fijada para el 21-7-2031. Tras 35 sobrevuelos cercanos de Europa, Ganímedes y Calisto a lo largo de 3,5 años, JUICE maniobrará a una órbita dedicada de Ganímedes el 31-12-2034 — la primera nave que orbita una luna de otro planeta.',
    },
    fr: {
      name: 'JUICE',
      type: 'ORBITEUR · ACTIVE',
      first:
        "Plus grand vaisseau interplanétaire construit en Europe ; premier vaisseau à orbiter une lune d'une autre planète (Ganymède, 2034)",
      description:
        "JUpiter ICy moons Explorer — mission phare de classe L de l'ESA, lancée le 14/4/2023. La croisière de 8 ans utilise l'une des séquences d'assistance gravitationnelle les plus complexes jamais volées : une assistance gravitationnelle Lune-Terre inédite le 19/8/2024, Vénus le 31/8/2025, puis deux passages terrestres supplémentaires en 2026 et 2029. L'insertion en orbite jovienne est prévue pour le 21/7/2031. Après 35 survols rapprochés d'Europe, Ganymède et Callisto sur 3,5 ans, JUICE manœuvrera vers une orbite dédiée de Ganymède le 31/12/2034 — le premier vaisseau à orbiter une lune d'une autre planète.",
    },
    hi: {
      name: 'JUICE',
      type: 'ऑर्बिटर · सक्रिय',
      first:
        'यूरोप में निर्मित सबसे बड़ा अंतरग्रहीय अंतरिक्षयान; किसी अन्य ग्रह के चंद्रमा की परिक्रमा करने वाला पहला अंतरिक्षयान (गेनिमीड, 2034)',
      description:
        'JUpiter ICy moons Explorer — ईएसए का एल-क्लास प्रमुख मिशन, 14-4-2023 को लॉन्च। 8-वर्षीय क्रूज अब तक उड़ाए गए सबसे जटिल गुरुत्व सहायता अनुक्रमों में से एक का उपयोग करता है: 19-8-2024 को पहली बार चंद्र-पृथ्वी गुरुत्व सहायता, 31-8-2025 को शुक्र, फिर 2026 और 2029 में दो और पृथ्वी मार्ग। बृहस्पति कक्षा प्रवेश 21-7-2031 के लिए निर्धारित है। 3.5 वर्षों में यूरोपा, गेनिमीड और कैलिस्टो के 35 निकट उड़ान-गुजर के बाद, JUICE 31-12-2034 को एक समर्पित गेनिमीड कक्षा में पैंतरेबाजी करेगा — किसी अन्य ग्रह के चंद्रमा की परिक्रमा करने वाला पहला अंतरिक्षयान।',
    },
    it: {
      name: 'JUICE',
      type: 'ORBITER · ATTIVA',
      first:
        'Più grande veicolo interplanetario mai costruito in Europa; primo veicolo a orbitare una luna di un altro pianeta (Ganimede, 2034)',
      description:
        "JUpiter ICy moons Explorer — missione di punta di classe L dell'ESA, lanciata il 14/4/2023. La crociera di 8 anni usa una delle sequenze di assistenza gravitazionale più complesse mai volate: un'assistenza gravitazionale Luna-Terra inedita il 19/8/2024, Venere il 31/8/2025, poi altri due passaggi terrestri nel 2026 e 2029. L'inserimento in orbita gioviana è fissato per il 21/7/2031. Dopo 35 sorvoli ravvicinati di Europa, Ganimede e Callisto in 3,5 anni, JUICE manovrerà in un'orbita dedicata di Ganimede il 31/12/2034 — il primo veicolo a orbitare una luna di un altro pianeta.",
    },
    ja: {
      name: 'JUICE',
      type: 'オービター · 運用中',
      first:
        '欧州で建造された最大の惑星間宇宙船；他惑星の衛星を周回する史上初の宇宙船（ガニメデ、2034年）',
      description:
        'JUpiter ICy moons Explorer — ESAの旗艦Lクラスミッション、2023年4月14日打ち上げ。8年間の航行は飛行された中で最も複雑な重力アシスト・シーケンスの1つを使用：2024年8月19日の史上初の月-地球重力アシスト、2025年8月31日の金星、その後2026年と2029年にさらに2回の地球通過。木星軌道投入は2031年7月21日に設定。3.5年にわたる35回のエウロパ、ガニメデ、カリストの近接フライバイ後、JUICEは2034年12月31日に専用のガニメデ軌道へ機動 — 他惑星の衛星を周回する史上初の宇宙船。',
    },
    ko: {
      name: 'JUICE',
      type: '궤도선 · 활성',
      first:
        '유럽에서 만든 가장 큰 행성간 우주선; 다른 행성의 위성을 공전하는 사상 최초의 우주선(가니메데, 2034)',
      description:
        'JUpiter ICy moons Explorer — ESA의 L급 기함 임무, 2023-4-14 발사. 8년간의 항해는 비행된 가장 복잡한 중력 도움 시퀀스 중 하나를 사용: 2024-8-19 사상 최초의 달-지구 중력 도움, 2025-8-31 금성, 그 후 2026년과 2029년에 두 번의 지구 통과. 목성 궤도 진입은 2031-7-21로 예정. 3.5년에 걸친 35회의 유로파, 가니메데, 칼리스토 근접 비행 후, JUICE는 2034-12-31 전용 가니메데 궤도로 기동 — 다른 행성의 위성을 공전하는 사상 최초의 우주선.',
    },
    nl: {
      name: 'JUICE',
      type: 'ORBITER · ACTIEF',
      first:
        'Grootste interplanetaire ruimtevaartuig ooit in Europa gebouwd; eerste ruimtevaartuig dat een maan van een andere planeet omcirkelt (Ganymedes, 2034)',
      description:
        "JUpiter ICy moons Explorer — ESA's L-klasse vlaggenschipmissie, gelanceerd op 14-4-2023. De 8-jarige reis gebruikt een van de meest complexe zwaartekrachtassistentiesequenties ooit gevlogen: een primeur Maan-Aarde-zwaartekrachtassistentie op 19-8-2024, Venus op 31-8-2025, daarna nog twee Aardpassages in 2026 en 2029. Jupiter-baaninsertie is gepland voor 21-7-2031. Na 35 nauwe scheervluchten van Europa, Ganymedes en Callisto over 3,5 jaar zal JUICE op 31-12-2034 naar een speciale Ganymedes-baan manoeuvreren — het eerste ruimtevaartuig ooit dat een maan van een andere planeet omcirkelt.",
    },
    'pt-BR': {
      name: 'JUICE',
      type: 'ORBITADOR · ATIVA',
      first:
        'Maior espaçonave interplanetária já construída na Europa; primeira espaçonave a orbitar uma lua de outro planeta (Ganimedes, 2034)',
      description:
        'JUpiter ICy moons Explorer — missão carro-chefe classe L da ESA, lançada em 14-4-2023. O cruzeiro de 8 anos usa uma das sequências de assistência gravitacional mais complexas já voadas: uma assistência gravitacional Lua-Terra inédita em 19-8-2024, Vênus em 31-8-2025, depois mais duas passagens terrestres em 2026 e 2029. A inserção em órbita joviana está marcada para 21-7-2031. Após 35 sobrevoos próximos de Europa, Ganimedes e Calisto ao longo de 3,5 anos, a JUICE manobrará para uma órbita dedicada de Ganimedes em 31-12-2034 — a primeira espaçonave a orbitar uma lua de outro planeta.',
    },
    ru: {
      name: 'JUICE',
      type: 'ОРБИТАЛЬНЫЙ · АКТИВНА',
      first:
        'Крупнейший межпланетный аппарат, построенный в Европе; первый аппарат, вышедший на орбиту спутника другой планеты (Ганимед, 2034)',
      description:
        'JUpiter ICy moons Explorer — флагманская миссия класса L ЕКА, запущена 14.4.2023. 8-летний перелёт использует одну из самых сложных последовательностей гравитационных манёвров, когда-либо выполненных: первая в истории лунно-земная гравитационная асистенция 19.8.2024, Венера 31.8.2025, затем ещё два прохода у Земли в 2026 и 2029. Вывод на орбиту Юпитера запланирован на 21.7.2031. После 35 близких пролётов Европы, Ганимеда и Каллисто на протяжении 3,5 лет JUICE манёврирует на выделенную орбиту Ганимеда 31.12.2034 — первый аппарат, выведенный на орбиту спутника другой планеты.',
    },
    'sr-Cyrl': {
      name: 'JUICE',
      type: 'ОРБИТЕР · АКТИВНА',
      first:
        'Највећа интерпланетарна летелица икада изграђена у Европи; прва летелица икада која ће орбитирати око месеца другог планета (Ганимед, 2034.)',
      description:
        'JUpiter ICy moons Explorer — ЕСА-ина водећа L-класа мисија, лансирана 14.4.2023. Осмогодишњи пут користи једну од најкомплекснијих секвенци гравитационе асистенције икада изведену: прва Месечева-Земаљска гравитациона асистенција 19.8.2024, Венера 31.8.2025, па још два земаљска проласка 2026. и 2029. Улазак у Јупитерову орбиту заказан за 21.7.2031. После 35 блиских прелета Европе, Ганимеда и Калиста током 3,5 година, JUICE ће манипулисати у наменску орбиту Ганимеда 31.12.2034 — прва летелица икада која ће орбитирати око месеца другог планета.',
    },
    'zh-CN': {
      name: 'JUICE',
      type: '轨道器 · 活跃',
      first: '欧洲建造的最大行星际航天器；史上首个进入其他行星卫星轨道的航天器（木卫三，2034）',
      description:
        'JUpiter ICy moons Explorer — ESA的L级旗舰任务，2023-4-14发射。8年的巡航使用了有史以来飞行过的最复杂引力辅助序列之一：2024-8-19史上首次月球-地球引力辅助，2025-8-31金星，然后2026年和2029年再两次地球通过。木星轨道进入定于2031-7-21。在3.5年内对木卫二、木卫三和木卫四进行35次近距离飞掠后，JUICE将于2034-12-31机动进入专用木卫三轨道 — 史上首个进入其他行星卫星轨道的航天器。',
    },
  },
  bepicolombo: {
    ar: {
      name: 'بيبي كولومبو',
      type: 'مدارية · نشطة',
      first:
        'أول مهمة كوكبية مشتركة بين أوروبا واليابان؛ ثاني مركبة فضائية على الإطلاق تدور حول عطارد (بعد ميسنجر)',
      description:
        'مهمة وكالة الفضاء الأوروبية / جاكسا المشتركة إلى عطارد، أُطلقت في 20 أكتوبر 2018 — سُميت على اسم الرياضي الإيطالي جوزيبي (بيبي) كولومبو، الذي صمم مسار الرحلات المتعددة لماريان 10. تستخدم رحلة الـ 8 سنوات 9 مساعدات جاذبية (الأرض 2020، الزهرة 2020، الزهرة 2021، ثم ستة مرورات بعطارد 2021-2024) بالإضافة إلى دفع كهربائي أيوني مستمر. إدخال مدار عطارد في 5 ديسمبر 2026؛ تبدأ العمليات العلمية أوائل 2027.',
    },
    de: {
      name: 'BepiColombo',
      type: 'ORBITER · AKTIV',
      first:
        'Erste gemeinsame planetare Mission von Europa und Japan; zweites Raumfahrzeug überhaupt, das Merkur umkreist (nach Messenger)',
      description:
        'Gemeinsame ESA-/JAXA-Mission zu Merkur, gestartet am 20.10.2018 — benannt nach dem italienischen Mathematiker Giuseppe (Bepi) Colombo, der die Mehrfach-Vorbeiflug-Trajektorie von Mariner 10 entwarf. Die 8-jährige Reise nutzt 9 Gravitationsassistenzen (Erde 2020, Venus 2020, Venus 2021, dann sechs Merkur-Vorbeiflüge 2021-2024) plus durchgehenden Ionenantrieb. Merkur-Orbit-Einschuss am 5.12.2026; wissenschaftliche Operationen beginnen Anfang 2027.',
    },
    es: {
      name: 'BepiColombo',
      type: 'ORBITADOR · ACTIVA',
      first:
        'Primera misión planetaria conjunta Europa-Japón; segunda nave en orbitar Mercurio (tras Messenger)',
      description:
        'Misión conjunta ESA / JAXA a Mercurio, lanzada el 20-10-2018 — nombrada por el matemático italiano Giuseppe (Bepi) Colombo, que diseñó la trayectoria de múltiples sobrevuelos de Mariner 10. El crucero de 8 años usa 9 asistencias gravitatorias (Tierra 2020, Venus 2020, Venus 2021, luego seis sobrevuelos de Mercurio 2021-2024) más empuje iónico-eléctrico continuo. Inserción en órbita de Mercurio el 5-12-2026; las operaciones científicas comienzan a principios de 2027.',
    },
    fr: {
      name: 'BepiColombo',
      type: 'ORBITEUR · ACTIVE',
      first:
        'Première mission planétaire conjointe Europe-Japon ; deuxième vaisseau à orbiter Mercure (après Messenger)',
      description:
        "Mission conjointe ESA / JAXA vers Mercure, lancée le 20/10/2018 — nommée d'après le mathématicien italien Giuseppe (Bepi) Colombo, qui a conçu la trajectoire à survols multiples de Mariner 10. La croisière de 8 ans utilise 9 assistances gravitationnelles (Terre 2020, Vénus 2020, Vénus 2021, puis six survols de Mercure 2021-2024) plus une poussée ionique-électrique continue. Insertion en orbite mercurienne le 5/12/2026 ; les opérations scientifiques commencent début 2027.",
    },
    hi: {
      name: 'बेपीकोलंबो',
      type: 'ऑर्बिटर · सक्रिय',
      first:
        'पहला यूरोप-जापान संयुक्त ग्रहीय मिशन; मरकरी की परिक्रमा करने वाला दूसरा अंतरिक्षयान (मेसेंजर के बाद)',
      description:
        'ईएसए / जाक्सा का मरकरी का संयुक्त मिशन, 20-10-2018 को लॉन्च — इतालवी गणितज्ञ ज्यूसेप्पे (बेपी) कोलंबो के नाम पर, जिन्होंने मेरिनर 10 की मल्टी-फ्लाईबाई प्रक्षेपपथ डिजाइन की। 8-वर्षीय क्रूज 9 गुरुत्व सहायताओं (पृथ्वी 2020, शुक्र 2020, शुक्र 2021, फिर 2021-2024 में छह मरकरी फ्लाईबाई) के साथ-साथ निरंतर आयन-विद्युत प्रणोदन का उपयोग करता है। मरकरी कक्षा प्रवेश 5-12-2026; विज्ञान संचालन 2027 की शुरुआत में शुरू।',
    },
    it: {
      name: 'BepiColombo',
      type: 'ORBITER · ATTIVA',
      first:
        'Prima missione planetaria congiunta Europa-Giappone; secondo veicolo a orbitare Mercurio (dopo Messenger)',
      description:
        'Missione congiunta ESA / JAXA su Mercurio, lanciata il 20/10/2018 — chiamata in onore del matematico italiano Giuseppe (Bepi) Colombo, che progettò la traiettoria multi-sorvolo di Mariner 10. La crociera di 8 anni usa 9 assistenze gravitazionali (Terra 2020, Venere 2020, Venere 2021, poi sei sorvoli di Mercurio 2021-2024) più spinta ionica-elettrica continua. Inserimento in orbita mercuriana il 5/12/2026; le operazioni scientifiche iniziano a inizio 2027.',
    },
    ja: {
      name: 'ベピコロンボ',
      type: 'オービター · 運用中',
      first:
        '初の欧州・日本共同惑星ミッション；水星を周回する史上2番目の宇宙船（メッセンジャーに次ぐ）',
      description:
        '水星へのESA / JAXA共同ミッション、2018年10月20日打ち上げ — マリナー10号のマルチフライバイ軌道を設計したイタリアの数学者ジュゼッペ（ベピ）コロンボにちなんで命名。8年間の航行は9回の重力アシスト（地球2020、金星2020、金星2021、その後2021-2024年に6回の水星フライバイ）と連続イオン電気推進を使用。水星軌道投入は2026年12月5日；科学運用は2027年初頭に開始。',
    },
    ko: {
      name: '베피콜롬보',
      type: '궤도선 · 활성',
      first: '최초의 유럽-일본 공동 행성 임무; 수성을 공전하는 사상 두 번째 우주선(메신저 다음)',
      description:
        '수성으로의 ESA / JAXA 공동 임무, 2018-10-20 발사 — 매리너 10호의 다중 플라이바이 궤적을 설계한 이탈리아 수학자 주세페(베피) 콜롬보의 이름을 따서 명명. 8년간의 항해는 9회의 중력 도움(지구 2020, 금성 2020, 금성 2021, 그 후 2021-2024년 6회의 수성 플라이바이)과 연속 이온-전기 추진을 사용. 수성 궤도 진입은 2026-12-5; 과학 운영은 2027년 초에 시작.',
    },
    nl: {
      name: 'BepiColombo',
      type: 'ORBITER · ACTIEF',
      first:
        'Eerste planetaire missie van Europa en Japan samen; tweede ruimtevaartuig ooit dat Mercurius omcirkelt (na Messenger)',
      description:
        'Gezamenlijke ESA-/JAXA-missie naar Mercurius, gelanceerd op 20-10-2018 — vernoemd naar de Italiaanse wiskundige Giuseppe (Bepi) Colombo, die het traject met meerdere scheervluchten van Mariner 10 ontwierp. De 8-jarige reis gebruikt 9 zwaartekrachtassistenties (Aarde 2020, Venus 2020, Venus 2021, daarna zes Mercurius-scheervluchten 2021-2024) plus continue ionisch-elektrische stuwkracht. Mercurius-baaninsertie op 5-12-2026; wetenschappelijke operaties beginnen begin 2027.',
    },
    'pt-BR': {
      name: 'BepiColombo',
      type: 'ORBITADOR · ATIVA',
      first:
        'Primeira missão planetária conjunta Europa-Japão; segunda espaçonave a orbitar Mercúrio (após Messenger)',
      description:
        'Missão conjunta ESA / JAXA a Mercúrio, lançada em 20-10-2018 — nomeada em homenagem ao matemático italiano Giuseppe (Bepi) Colombo, que projetou a trajetória multi-sobrevoo da Mariner 10. O cruzeiro de 8 anos usa 9 assistências gravitacionais (Terra 2020, Vênus 2020, Vênus 2021, depois seis sobrevoos de Mercúrio 2021-2024) mais empuxo iônico-elétrico contínuo. Inserção em órbita mercuriana em 5-12-2026; operações científicas começam no início de 2027.',
    },
    ru: {
      name: 'БепиКоломбо',
      type: 'ОРБИТАЛЬНЫЙ · АКТИВНА',
      first:
        'Первая совместная европейско-японская планетарная миссия; второй в истории аппарат на орбите Меркурия (после «Мессенджера»)',
      description:
        'Совместная миссия ЕКА / JAXA к Меркурию, запущена 20.10.2018 — названа в честь итальянского математика Джузеппе (Бепи) Коломбо, спроектировавшего траекторию с множественными пролётами «Маринера-10». 8-летний перелёт использует 9 гравитационных манёвров (Земля 2020, Венера 2020, Венера 2021, затем шесть пролётов Меркурия 2021-2024) плюс непрерывную ионную электрическую тягу. Выход на орбиту Меркурия 5.12.2026; научные операции начинаются в начале 2027 года.',
    },
    'sr-Cyrl': {
      name: 'БепиКоломбо',
      type: 'ОРБИТЕР · АКТИВНА',
      first:
        'Прва заједничка планетарна мисија Европе и Јапана; друга летелица икада која орбитира око Меркура (после Месинџера)',
      description:
        'Заједничка ЕСА / ЈАКСА мисија ка Меркуру, лансирана 20.10.2018. — названа по италијанском математичару Ђузепеу (Бепи) Коломбу, који је дизајнирао Маринеру 10 путању са вишеструким прелетима. Осмогодишњи пут користи 9 гравитационих асистенција (Земља 2020, Венера 2020, Венера 2021, па шест Меркурових прелета 2021-2024) плус континуирани јонски-електрични погон. Улазак у Меркурову орбиту 5.12.2026; научне операције почињу почетком 2027.',
    },
    'zh-CN': {
      name: '贝皮科伦坡号',
      type: '轨道器 · 活跃',
      first: '欧洲与日本首次联合行星任务；史上第二个进入水星轨道的航天器（继信使号之后）',
      description:
        'ESA / JAXA联合水星任务，2018-10-20发射 — 以设计了水手10号多次飞掠轨道的意大利数学家朱塞佩（贝皮）科伦坡命名。8年巡航使用9次引力辅助（地球2020、金星2020、金星2021，然后2021-2024年六次水星飞掠）加上连续的离子电推进。水星轨道进入定于2026-12-5；科学运作于2027年初开始。',
    },
  },
  ulysses: {
    ar: {
      name: 'يوليسيس',
      type: 'مدارية شمسية قطبية · مكتملة',
      first:
        'المركبة الفضائية الوحيدة على الإطلاق التي دخلت مداراً شمسياً مركزياً عالي الميل؛ القياسات المباشرة الوحيدة للرياح الشمسية في جميع خطوط العرض الشمسية',
      description:
        'مهمة مشتركة بين وكالة الفضاء الأوروبية وناسا. أُطلقت في 6 أكتوبر 1990 من STS-41 ديسكفري، استخدمت يوليسيس مساعدة جاذبية المشتري في 8 فبراير 1992 لتنحرف بنحو 80° خارج المسير — الطريقة الوحيدة للوصول إلى مدار شبه قطبي بالنسبة للشمس من المستوى المداري شبه الاستوائي للأرض. ثلاث مدارات قطبية كاملة للشمس على مدى 18.5 سنة رسمت الرياح الشمسية والمجال المغناطيسي الهيلوسفيري والجسيمات النشطة في جميع خطوط العرض الشمسية. انتهت المهمة في 30 يونيو 2009 عندما تجمد الهيدرازين في خطوط الدافع.',
    },
    de: {
      name: 'Ulysses',
      type: 'SOLAR-POLAR-ORBITER · BEENDET',
      first:
        'Einziges Raumfahrzeug, das je in eine hochinklinierte heliozentrische Umlaufbahn eingetreten ist; einzige direkte Messungen des Sonnenwinds in allen heliographischen Breiten',
      description:
        'Gemeinsame Mission von ESA und NASA. Gestartet am 6.10.1990 von STS-41 Discovery, nutzte Ulysses am 8.2.1992 eine Jupiter-Gravitationsassistenz, um sich selbst rund 80° aus der Ekliptik abzulenken — die einzige Möglichkeit, von der nahezu äquatorialen Erdumlaufbahn aus einen polaren sonnenbezogenen Orbit zu erreichen. Drei vollständige polare Sonnenumläufe über 18,5 Jahre kartierten den Sonnenwind, das heliosphärische Magnetfeld und die Energiepartikel in allen heliographischen Breiten. Mission beendet am 30.6.2009, als der Hydrazin-Treibstoff in den Triebwerksleitungen einfror.',
    },
    es: {
      name: 'Ulysses',
      type: 'ORBITADOR POLAR SOLAR · FINALIZADA',
      first:
        'Única nave que jamás haya entrado en una órbita heliocéntrica de alta inclinación; únicas mediciones directas del viento solar en todas las latitudes heliográficas',
      description:
        'Misión conjunta ESA / NASA. Lanzada el 6-10-1990 desde el STS-41 Discovery, Ulysses usó una asistencia gravitatoria de Júpiter el 8-2-1992 para desviarse unos 80° fuera de la eclíptica — la única forma de alcanzar una órbita casi polar relativa al Sol desde el plano orbital casi ecuatorial de la Tierra. Tres órbitas polares completas del Sol a lo largo de 18,5 años mapearon el viento solar, el campo magnético heliosférico y las partículas energéticas en todas las latitudes heliográficas. La misión terminó el 30-6-2009 cuando la hidracina se congeló en las líneas del propulsor.',
    },
    fr: {
      name: 'Ulysses',
      type: 'ORBITEUR POLAIRE SOLAIRE · TERMINÉE',
      first:
        'Seul vaisseau jamais placé sur une orbite héliocentrique à haute inclinaison ; seules mesures directes du vent solaire à toutes les latitudes héliographiques',
      description:
        "Mission conjointe ESA / NASA. Lancé le 6/10/1990 depuis STS-41 Discovery, Ulysses a utilisé une assistance gravitationnelle de Jupiter le 8/2/1992 pour se dévier d'environ 80° hors de l'écliptique — la seule façon d'atteindre une orbite quasi-polaire par rapport au Soleil depuis le plan orbital quasi-équatorial de la Terre. Trois orbites polaires complètes du Soleil sur 18,5 ans ont cartographié le vent solaire, le champ magnétique héliosphérique et les particules énergétiques à toutes les latitudes héliographiques. Mission terminée le 30/6/2009 lorsque l'hydrazine a gelé dans les conduites de propulseur.",
    },
    hi: {
      name: 'यूलिसिस',
      type: 'सौर ध्रुवीय ऑर्बिटर · पूर्ण',
      first:
        'अब तक एकमात्र अंतरिक्षयान जो उच्च-झुकाव सूर्यकेंद्रित कक्षा में प्रवेश किया; सौर पवन के सभी हेलियोग्राफिक अक्षांशों पर एकमात्र प्रत्यक्ष माप',
      description:
        'ईएसए / नासा का संयुक्त मिशन। 6-10-1990 को STS-41 डिस्कवरी से लॉन्च, यूलिसिस ने 8-2-1992 को बृहस्पति की गुरुत्व सहायता का उपयोग करके खुद को क्रांतिवृत्त से ~80° दूर मोड़ा — पृथ्वी के लगभग-भूमध्यरेखीय कक्षीय तल से सूर्य-सापेक्ष ध्रुवीय कक्षा तक पहुंचने का एकमात्र तरीका। 18.5 वर्षों में सूर्य की तीन पूर्ण ध्रुवीय कक्षाओं ने सौर पवन, हेलियोस्फेरिक चुंबकीय क्षेत्र और सभी हेलियोग्राफिक अक्षांशों पर ऊर्जावान कणों का मानचित्रण किया। मिशन 30-6-2009 को समाप्त हुआ जब थ्रस्टर लाइनों में हाइड्राज़ीन जम गई।',
    },
    it: {
      name: 'Ulysses',
      type: 'ORBITER POLARE SOLARE · COMPLETATA',
      first:
        "Unico veicolo mai posto in un'orbita eliocentrica ad alta inclinazione; uniche misurazioni dirette del vento solare a tutte le latitudini eliografiche",
      description:
        "Missione congiunta ESA / NASA. Lanciato il 6/10/1990 da STS-41 Discovery, Ulysses ha usato un'assistenza gravitazionale di Giove l'8/2/1992 per deviarsi di circa 80° fuori dall'eclittica — l'unico modo per raggiungere un'orbita quasi-polare rispetto al Sole dal piano orbitale quasi-equatoriale della Terra. Tre orbite polari complete del Sole in 18,5 anni hanno mappato il vento solare, il campo magnetico eliosferico e le particelle energetiche a tutte le latitudini eliografiche. Missione terminata il 30/6/2009 quando l'idrazina si è congelata nelle linee del propulsore.",
    },
    ja: {
      name: 'ユリシーズ',
      type: '太陽極軌道周回機 · 終了',
      first:
        '高傾斜の太陽中心軌道に投入された唯一の宇宙船；全ヘリオグラフィック緯度における太陽風の唯一の直接測定',
      description:
        'ESA / NASA共同ミッション。1990年10月6日にSTS-41ディスカバリーから打ち上げられたユリシーズは1992年2月8日に木星の重力アシストを使用して黄道面から約80°外側に偏向 — 地球のほぼ赤道軌道面から太陽相対の極軌道に到達する唯一の方法。18.5年にわたる太陽の3回の完全な極軌道は、すべてのヘリオグラフィック緯度における太陽風、ヘリオスフェリック磁場、エネルギー粒子をマッピングしました。2009年6月30日にスラスターラインのヒドラジンが凍結してミッション終了。',
    },
    ko: {
      name: '율리시스',
      type: '태양 극궤도선 · 완료',
      first:
        '높은 경사의 태양 중심 궤도에 진입한 유일한 우주선; 모든 헬리오그래픽 위도에서의 태양풍 유일한 직접 측정',
      description:
        'ESA / NASA 공동 임무. 1990-10-6 STS-41 디스커버리에서 발사된 율리시스는 1992-2-8 목성 중력 도움을 사용하여 황도면에서 약 80° 벗어났습니다 — 지구의 거의 적도 궤도면에서 태양 상대 극궤도에 도달하는 유일한 방법. 18.5년에 걸친 태양의 3회 완전한 극궤도는 모든 헬리오그래픽 위도에서 태양풍, 헬리오스피어 자기장, 에너지 입자를 매핑했습니다. 2009-6-30 추력기 라인에서 하이드라진이 얼어 임무가 종료되었습니다.',
    },
    nl: {
      name: 'Ulysses',
      type: 'ZONNE-POLAIRE ORBITER · VOLTOOID',
      first:
        'Enig ruimtevaartuig ooit in een hoog-inclinatie heliocentrische baan; enige directe metingen van de zonnewind op alle heliografische breedten',
      description:
        'Gezamenlijke ESA-/NASA-missie. Gelanceerd op 6-10-1990 vanaf STS-41 Discovery, gebruikte Ulysses op 8-2-1992 een Jupiter-zwaartekrachtassistentie om zichzelf ~80° uit de ecliptica af te buigen — de enige manier om een bijna-polaire zonbetrokken baan te bereiken vanaf het bijna-equatoriale baanvlak van de Aarde. Drie volledige polaire zonbanen over 18,5 jaar brachten de zonnewind, het heliosferische magneetveld en energetische deeltjes op alle heliografische breedten in kaart. Missie beëindigd op 30-6-2009 toen de hydrazine in de stuwraketleidingen bevroor.',
    },
    'pt-BR': {
      name: 'Ulysses',
      type: 'ORBITADOR POLAR SOLAR · CONCLUÍDA',
      first:
        'Única espaçonave já colocada em uma órbita heliocêntrica de alta inclinação; únicas medições diretas do vento solar em todas as latitudes heliográficas',
      description:
        'Missão conjunta ESA / NASA. Lançada em 6-10-1990 do STS-41 Discovery, a Ulysses usou uma assistência gravitacional de Júpiter em 8-2-1992 para desviar-se cerca de 80° fora da eclíptica — o único caminho para alcançar uma órbita quase-polar em relação ao Sol a partir do plano orbital quase-equatorial da Terra. Três órbitas polares completas do Sol ao longo de 18,5 anos mapearam o vento solar, o campo magnético heliosférico e as partículas energéticas em todas as latitudes heliográficas. Missão terminada em 30-6-2009 quando a hidrazina congelou nas linhas do propulsor.',
    },
    ru: {
      name: 'Улисс',
      type: 'СОЛНЕЧНЫЙ ПОЛЯРНЫЙ ОРБИТЕР · ЗАВЕРШЕНА',
      first:
        'Единственный когда-либо запущенный аппарат на гелиоцентрической орбите высокого наклонения; единственные прямые измерения солнечного ветра на всех гелиографических широтах',
      description:
        'Совместная миссия ЕКА / НАСА. Запущен 6.10.1990 со STS-41 Discovery, «Улисс» использовал гравитационный манёвр у Юпитера 8.2.1992 для отклонения примерно на 80° за пределы эклиптики — единственный способ достичь почти полярной по отношению к Солнцу орбиты с почти-экваториальной орбитальной плоскости Земли. Три полных полярных оборота вокруг Солнца за 18,5 лет картировали солнечный ветер, гелиосферное магнитное поле и энергетические частицы на всех гелиографических широтах. Миссия завершена 30.6.2009, когда гидразин замёрз в линиях двигателей.',
    },
    'sr-Cyrl': {
      name: 'Улис',
      type: 'СОЛАРНИ ПОЛАРНИ ОРБИТЕР · ЗАВРШЕНА',
      first:
        'Једина летелица икада постављена у хелиоцентричну орбиту високог нагиба; једина директна мерења соларног ветра на свим хелиографским ширинама',
      description:
        'Заједничка ЕСА / НАСА мисија. Лансиран 6.10.1990. са STS-41 Дискавери, Улис је користио Јупитерову гравитациону асистенцију 8.2.1992. да се отклони ~80° ван еклиптике — једини начин да се достигне скоро поларна орбита у односу на Сунце са скоро-екваторијалне орбиталне равни Земље. Три потпуне поларне соларне орбите током 18,5 година мапирале су соларни ветар, хелиосферно магнетно поље и енергетске честице на свим хелиографским ширинама. Мисија завршена 30.6.2009. када је хидразин залеђен у линијама потисника.',
    },
    'zh-CN': {
      name: '尤利西斯号',
      type: '太阳极轨道器 · 已完成',
      first: '史上唯一进入高倾角日心轨道的航天器；所有日心纬度的太阳风唯一直接测量',
      description:
        'ESA / NASA联合任务。1990-10-6由STS-41发现号航天飞机发射，尤利西斯号于1992-2-8使用木星引力辅助使自身偏转黄道约80° — 这是从地球近赤道轨道平面达到相对太阳近极轨道的唯一方法。18.5年间对太阳的三次完整极轨道映射了所有日心纬度的太阳风、日球磁场和高能粒子。2009-6-30推进器管线中肼冻结后任务终止。',
    },
  },
};

// Coplanar-trajectories science article overlay translations.
// Translates title + intro_sentence only; body paragraphs (the long
// narrative + body chains) stay English for a careful native pass.
const COPLANAR_OVERLAYS = {
  ar: {
    title: 'لماذا تبدو مسارات المهمات مسطحة',
    intro_sentence:
      'النظام الشمسي قرص، والوقود محدود — لذا المهمات لا تغادر القرص إلا إذا اضطُرت إلى ذلك.',
  },
  de: {
    title: 'Warum Missions-Trajektorien flach aussehen',
    intro_sentence:
      'Das Sonnensystem ist eine Scheibe, und Treibstoff ist endlich — also verlassen Missionen die Scheibe nicht, es sei denn, sie müssen.',
  },
  es: {
    title: 'Por qué las trayectorias de misiones parecen planas',
    intro_sentence:
      'El Sistema Solar es un disco, y el propulsor es finito — así que las misiones no abandonan el disco a menos que tengan que hacerlo.',
  },
  fr: {
    title: 'Pourquoi les trajectoires de mission paraissent plates',
    intro_sentence:
      "Le Système solaire est un disque, et le carburant est limité — alors les missions ne quittent pas le disque à moins d'y être contraintes.",
  },
  hi: {
    title: 'मिशन प्रक्षेपपथ सपाट क्यों दिखते हैं',
    intro_sentence:
      'सौर मंडल एक डिस्क है, और प्रणोदक सीमित है — इसलिए मिशन तब तक डिस्क नहीं छोड़ते जब तक उन्हें ऐसा करना न पड़े।',
  },
  it: {
    title: 'Perché le traiettorie di missione sembrano piatte',
    intro_sentence:
      'Il Sistema Solare è un disco, e il propellente è limitato — quindi le missioni non lasciano il disco a meno che non debbano.',
  },
  ja: {
    title: 'ミッション軌道が平らに見える理由',
    intro_sentence:
      '太陽系は円盤であり、推進剤は有限です — だからミッションは必要に迫られない限り円盤を離れません。',
  },
  ko: {
    title: '미션 궤적이 평평해 보이는 이유',
    intro_sentence:
      '태양계는 원반이고 추진제는 유한합니다 — 따라서 미션은 그래야만 하지 않는 한 원반을 떠나지 않습니다.',
  },
  nl: {
    title: 'Waarom missietrajecten plat lijken',
    intro_sentence:
      'Het zonnestelsel is een schijf en stuwstof is eindig — dus missies verlaten de schijf niet tenzij het moet.',
  },
  'pt-BR': {
    title: 'Por que as trajetórias de missão parecem planas',
    intro_sentence:
      'O Sistema Solar é um disco e o propelente é finito — então as missões não saem do disco a menos que precisem.',
  },
  ru: {
    title: 'Почему траектории миссий выглядят плоскими',
    intro_sentence:
      'Солнечная система — это диск, а топливо ограничено — поэтому миссии не покидают диск, если только не обязаны.',
  },
  'sr-Cyrl': {
    title: 'Зашто се путање мисија чине равним',
    intro_sentence:
      'Сунчев систем је диск, а гориво је ограничено — па мисије не напуштају диск осим ако не морају.',
  },
  'zh-CN': {
    title: '为什么任务轨迹看起来是平的',
    intro_sentence: '太阳系是一个圆盘，推进剂有限 — 因此除非必须，否则任务不会离开圆盘。',
  },
};

let updated = 0;

// Mission overlays.
for (const [missionId, byLocale] of Object.entries(MISSION_OVERLAYS)) {
  const dest = MISSION_DEST[missionId];
  for (const [loc, payload] of Object.entries(byLocale)) {
    const dir = join(I18N_ROOT, loc, 'missions', dest);
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    const file = join(dir, `${missionId}.json`);
    await writeFile(file, JSON.stringify(payload, null, 2) + '\n');
    updated++;
  }
}

// Science article overlay.
for (const [loc, payload] of Object.entries(COPLANAR_OVERLAYS)) {
  const dir = join(I18N_ROOT, loc, 'science', 'transfers');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const file = join(dir, 'coplanar-trajectories.json');
  await writeFile(file, JSON.stringify(payload, null, 2) + '\n');
  updated++;
}

console.log(`Updated ${updated} overlay files with v1 translations.`);
console.log('Coverage in this batch:');
console.log(`  - 9 missions × 13 locales × {name, type, first, description}: ${9 * 13} files`);
console.log(
  `  - coplanar-trajectories science article × 13 locales × {title, intro_sentence}: 13 files`,
);
console.log('Skipped (English fallback):');
console.log('  - Mission events arrays (mostly universal date + place names)');
console.log(
  '  - Coplanar-trajectories narrative_101 + body_paragraphs (substantial — needs native pass)',
);
