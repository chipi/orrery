#!/usr/bin/env node
/**
 * Round 2 of #307 translations — augments the 13-locale overlays
 * authored by translate-iconic-missions.mjs with:
 *   - mission events arrays (label + note + met + type per event)
 *   - coplanar-trajectories science article narrative_101 +
 *     body_paragraphs
 *
 * Reads each existing overlay file, merges in the new payload,
 * writes back. Idempotent: re-running just overwrites with the
 * canonical inline data.
 *
 * Same quality bias as the round-1 script — Latin + Slavic
 * translations are direct; ar/hi/ja/ko/zh-CN are best-effort and
 * deserve a native-speaker review pass before they ship.
 *
 * Run from project root:  node scripts/translate-iconic-missions-events-body.mjs
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

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

// Mission event arrays per (mission, locale). Each event includes
// the same met + type as the en-US overlay; label + note are
// translated. The full events array overwrites the en-US events
// when present (overlay-merge semantics).
const MISSION_EVENTS = {
  rosetta: {
    ar: [
      {
        met: 0,
        label: 'الإطلاق',
        note: 'صاروخ آريان 5G+ يطلق روزيتا من كورو لرحلة 10 سنوات إلى المذنب 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'مرور أرضي قريب #1',
        note: 'أول من ثلاث مساعدات جاذبية أرضية لبناء السرعة للقاء المذنب.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'مرور قريب من المريخ',
        note: 'مساعدة جاذبية مريخية واحدة + أول صور قريبة لفوبوس والمريخ على بعد 250 كم.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'كويكب 2867 شتاينز',
        note: 'أول مرور قريب على الإطلاق لكويكب من نوع E.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'كويكب 21 لوتيشيا',
        note: 'مرور على بعد 100 كم لأحد أكبر كويكبات الحزام الرئيسي التي رُصدت من قرب على الإطلاق.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'لقاء المذنب 67P',
        note: 'دخول مدار المذنب 67P/تشوريوموف-جيراسيمنكو. فيلة تهبط في 12 نوفمبر 2014.',
        type: 'nominal',
      },
    ],
    de: [
      {
        met: 0,
        label: 'START',
        note: 'Ariane 5G+ bringt Rosetta von Kourou auf die 10-jährige Reise zum Kometen 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'ERDVORBEIFLUG #1',
        note: 'Erste von drei Erd-Gravitationsassistenzen zum Aufbau der Geschwindigkeit für das Kometen-Rendezvous.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'MARSVORBEIFLUG',
        note: 'Einzige Mars-Gravitationsassistenz + erste Nahaufnahmen von Phobos und Mars in 250 km Entfernung.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'ASTEROID 2867 ŠTEINS',
        note: 'Erster jemals durchgeführter Nahflug an einem E-Typ-Asteroiden.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'ASTEROID 21 LUTETIA',
        note: '100-km-Vorbeiflug an einem der größten je nah beobachteten Hauptgürtel-Asteroiden.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'KOMET 67P RENDEZVOUS',
        note: 'Orbiteinschuss um Komet 67P/Tschurjumow-Gerassimenko. Philae landet am 12.11.2014.',
        type: 'nominal',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'El Ariane 5G+ lanza a Rosetta desde Kourou para el crucero de 10 años al cometa 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'SOBREVUELO TERRESTRE #1',
        note: 'Primera de tres asistencias gravitatorias terrestres para construir velocidad para el encuentro cometario.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'SOBREVUELO MARCIANO',
        note: 'Única asistencia gravitatoria marciana + primeras imágenes cercanas de Fobos y Marte a 250 km.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'ASTEROIDE 2867 ŠTEINS',
        note: 'Primer sobrevuelo cercano de un asteroide de tipo E.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'ASTEROIDE 21 LUTETIA',
        note: 'Sobrevuelo a 100 km de uno de los mayores asteroides del cinturón principal observados de cerca.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'ENCUENTRO COMETARIO 67P',
        note: 'Inserción en órbita alrededor del cometa 67P/Churyumov-Gerasimenko. Philae aterriza el 12-11-2014.',
        type: 'nominal',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: 'Ariane 5G+ lance Rosetta depuis Kourou pour la croisière de 10 ans vers la comète 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'SURVOL TERRESTRE #1',
        note: 'Première de trois assistances gravitationnelles terrestres pour construire la vitesse vers le rendez-vous cométaire.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'SURVOL MARTIEN',
        note: 'Unique assistance gravitationnelle martienne + premières images rapprochées de Phobos et Mars à 250 km.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'ASTÉROÏDE 2867 ŠTEINS',
        note: "Premier survol rapproché d'un astéroïde de type E.",
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'ASTÉROÏDE 21 LUTETIA',
        note: "Survol à 100 km de l'un des plus grands astéroïdes de la ceinture principale jamais observés de près.",
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'RENDEZ-VOUS COMÈTE 67P',
        note: 'Insertion en orbite autour de la comète 67P/Tchourioumov-Guérassimenko. Philae atterrit le 12/11/2014.',
        type: 'nominal',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'एरियन 5G+ रोसेटा को कोरू से धूमकेतु 67P के लिए 10-वर्षीय यात्रा पर ले जाता है।',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'पृथ्वी फ्लाईबाई #1',
        note: 'धूमकेतु मिलन के लिए वेग बनाने हेतु तीन पृथ्वी गुरुत्व सहायताओं में से पहली।',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'मंगल फ्लाईबाई',
        note: 'एकमात्र मंगल गुरुत्व सहायता + 250 किमी पर फोबोस और मंगल की पहली निकटवर्ती छवियां।',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'क्षुद्रग्रह 2867 स्टाइन्स',
        note: 'ई-प्रकार के क्षुद्रग्रह का पहला निकटवर्ती फ्लाईबाई।',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'क्षुद्रग्रह 21 लुटेटिया',
        note: 'मुख्य बेल्ट के सबसे बड़े क्षुद्रग्रहों में से एक का 100 किमी पर फ्लाईबाई।',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'धूमकेतु 67P मिलन',
        note: 'धूमकेतु 67P/चुर्युमोव-गेरासिमेंको के चारों ओर कक्षा प्रवेश। फिले 12-11-2014 को उतरा।',
        type: 'nominal',
      },
    ],
    it: [
      {
        met: 0,
        label: 'LANCIO',
        note: 'Ariane 5G+ lancia Rosetta da Kourou per la crociera decennale verso la cometa 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'SORVOLO TERRESTRE #1',
        note: 'Prima di tre assistenze gravitazionali terrestri per costruire velocità verso il rendez-vous cometario.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'SORVOLO MARZIANO',
        note: 'Unica assistenza gravitazionale marziana + prime immagini ravvicinate di Phobos e Marte a 250 km.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'ASTEROIDE 2867 ŠTEINS',
        note: 'Primo sorvolo ravvicinato di un asteroide di tipo E.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'ASTEROIDE 21 LUTETIA',
        note: 'Sorvolo a 100 km di uno dei più grandi asteroidi della fascia principale mai osservati da vicino.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'RENDEZ-VOUS COMETA 67P',
        note: 'Inserimento in orbita attorno alla cometa 67P/Churyumov-Gerasimenko. Philae atterra il 12/11/2014.',
        type: 'nominal',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: 'アリアン5G+がロゼッタをクールーから打ち上げ、彗星67Pへの10年間の航行を開始。',
        type: 'nominal',
      },
      {
        met: 367,
        label: '地球フライバイ#1',
        note: '彗星ランデブーへの速度を構築するための3回の地球重力アシストの最初。',
        type: 'nominal',
      },
      {
        met: 1090,
        label: '火星フライバイ',
        note: '唯一の火星重力アシスト + 250 kmでのフォボスと火星の初の接写画像。',
        type: 'nominal',
      },
      {
        met: 1671,
        label: '小惑星2867シュタインス',
        note: 'E型小惑星の史上初の近接フライバイ。',
        type: 'nominal',
      },
      {
        met: 2320,
        label: '小惑星21ルテティア',
        note: '間近で観測された最大級のメインベルト小惑星の100 kmフライバイ。',
        type: 'nominal',
      },
      {
        met: 3809,
        label: '彗星67Pランデブー',
        note: '彗星67P/チュリュモフ・ゲラシメンコの周回軌道投入。フィラエは2014年11月12日に着陸。',
        type: 'nominal',
      },
    ],
    ko: [
      {
        met: 0,
        label: '발사',
        note: '아리안 5G+가 로제타를 쿠루에서 발사, 혜성 67P로의 10년 항해 시작.',
        type: 'nominal',
      },
      {
        met: 367,
        label: '지구 플라이바이 #1',
        note: '혜성 랑데부 속도를 구축하기 위한 세 번의 지구 중력 도움 중 첫 번째.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: '화성 플라이바이',
        note: '단일 화성 중력 도움 + 250 km에서 포보스와 화성의 첫 근접 이미지.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: '소행성 2867 스타인스',
        note: 'E형 소행성 사상 최초의 근접 플라이바이.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: '소행성 21 루테티아',
        note: '근접 관측된 가장 큰 메인 벨트 소행성 중 하나의 100 km 플라이바이.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: '혜성 67P 랑데부',
        note: '혜성 67P/추류모프-게라시멘코 주위 궤도 진입. 필레는 2014-11-12 착륙.',
        type: 'nominal',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: 'Ariane 5G+ lanceert Rosetta vanuit Kourou voor de tienjarige reis naar komeet 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'AARDSCHEERVLUCHT #1',
        note: 'Eerste van drie aardse zwaartekrachtassistenties om snelheid op te bouwen voor het komeetrendezvous.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'MARSSCHEERVLUCHT',
        note: 'Enige Mars-zwaartekrachtassistentie + eerste close-upbeelden van Phobos en Mars op 250 km.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'ASTEROÏDE 2867 ŠTEINS',
        note: 'Eerste close-upscheervlucht van een E-type asteroïde.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'ASTEROÏDE 21 LUTETIA',
        note: '100 km scheervlucht langs een van de grootste hoofdgordel-asteroïden ooit van dichtbij waargenomen.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'KOMEET 67P RENDEZVOUS',
        note: 'Baaninsertie rond komeet 67P/Tsjoerjoemov-Gerasimenko. Philae landt op 12-11-2014.',
        type: 'nominal',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'Ariane 5G+ lança Rosetta de Kourou para o cruzeiro de 10 anos ao cometa 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'SOBREVOO TERRESTRE #1',
        note: 'Primeira de três assistências gravitacionais terrestres para construir velocidade para o encontro cometário.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'SOBREVOO MARCIANO',
        note: 'Única assistência gravitacional marciana + primeiras imagens próximas de Phobos e Marte a 250 km.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'ASTEROIDE 2867 ŠTEINS',
        note: 'Primeiro sobrevoo próximo de um asteroide de tipo E.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'ASTEROIDE 21 LUTETIA',
        note: 'Sobrevoo a 100 km de um dos maiores asteroides do cinturão principal já observados de perto.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'ENCONTRO COMETÁRIO 67P',
        note: 'Inserção em órbita ao redor do cometa 67P/Churyumov-Gerasimenko. Philae pousa em 12-11-2014.',
        type: 'nominal',
      },
    ],
    ru: [
      {
        met: 0,
        label: 'ЗАПУСК',
        note: 'Ariane 5G+ запускает «Розетту» с Куру в 10-летний перелёт к комете 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'ПРОЛЁТ ЗЕМЛИ #1',
        note: 'Первый из трёх гравитационных манёвров у Земли для построения скорости к комете.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'ПРОЛЁТ МАРСА',
        note: 'Единственный марсианский гравитационный манёвр + первые крупные снимки Фобоса и Марса с 250 км.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'АСТЕРОИД 2867 ШТЕЙНС',
        note: 'Первый в истории близкий пролёт астероида E-типа.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'АСТЕРОИД 21 ЛЮТЕЦИЯ',
        note: 'Пролёт в 100 км от одного из крупнейших астероидов главного пояса, когда-либо наблюдавшихся вблизи.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'СБЛИЖЕНИЕ С КОМЕТОЙ 67P',
        note: 'Выход на орбиту вокруг кометы 67P/Чурюмова-Герасименко. «Филы» приземляется 12.11.2014.',
        type: 'nominal',
      },
    ],
    'sr-Cyrl': [
      {
        met: 0,
        label: 'ЛАНСИРАЊЕ',
        note: 'Ариан 5G+ лансира Розету из Куруа на десетогодишњи пут до комете 67P.',
        type: 'nominal',
      },
      {
        met: 367,
        label: 'ЗЕМАЉСКИ ПРЕЛЕТ #1',
        note: 'Прва од три земаљске гравитационе асистенције за изградњу брзине за сусрет са кометом.',
        type: 'nominal',
      },
      {
        met: 1090,
        label: 'МАРСОВСКИ ПРЕЛЕТ',
        note: 'Једина марсовска гравитациона асистенција + прве слике изблиза Фобоса и Марса на 250 km.',
        type: 'nominal',
      },
      {
        met: 1671,
        label: 'АСТЕРОИД 2867 ШТАЈНС',
        note: 'Први прелет изблиза астероида типа E у историји.',
        type: 'nominal',
      },
      {
        met: 2320,
        label: 'АСТЕРОИД 21 ЛУТЕЦИЈА',
        note: 'Прелет на 100 km једног од највећих астероида главног појаса икада посматраних изблиза.',
        type: 'nominal',
      },
      {
        met: 3809,
        label: 'СУСРЕТ СА КОМЕТОМ 67P',
        note: 'Улазак у орбиту око комете 67P/Чурјумов-Герасименко. Филе слеће 12.11.2014.',
        type: 'nominal',
      },
    ],
    'zh-CN': [
      {
        met: 0,
        label: '发射',
        note: '阿丽亚娜5G+从库鲁发射罗塞塔号，开始为期10年前往67P彗星的航行。',
        type: 'nominal',
      },
      {
        met: 367,
        label: '地球飞掠 #1',
        note: '为彗星交会构建速度的三次地球引力辅助中的第一次。',
        type: 'nominal',
      },
      {
        met: 1090,
        label: '火星飞掠',
        note: '单次火星引力辅助 + 250公里处福波斯和火星的首批近距图像。',
        type: 'nominal',
      },
      {
        met: 1671,
        label: '小行星 2867 施泰因斯',
        note: '史上首次对E型小行星的近距飞掠。',
        type: 'nominal',
      },
      {
        met: 2320,
        label: '小行星 21 鲁特西娅',
        note: '对近距离观测过的最大主带小行星之一进行100公里飞掠。',
        type: 'nominal',
      },
      {
        met: 3809,
        label: '67P彗星交会',
        note: '进入67P/丘留莫夫-格拉西缅科彗星轨道。菲莱号于2014-11-12着陆。',
        type: 'nominal',
      },
    ],
  },
  'vega-1': {
    ar: [
      {
        met: 0,
        label: 'الإطلاق',
        note: 'صاروخ بروتون-K / D-1 يطلق فيغا 1 من بايكونور.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'مواجهة الزهرة',
        note: 'وحدة الإنزال تنفصل وتهبط؛ البالون ينتشر على ارتفاع 54 كم لمدة 46.5 ساعة.',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'مرور قريب من هالي',
        note: 'أقرب اقتراب من المذنب 1P/هالي على بعد 8890 كم — أول رصد لنواة مذنبية.',
        type: 'nominal',
      },
    ],
    de: [
      {
        met: 0,
        label: 'START',
        note: 'Proton-K / D-1 startet Vega 1 von Baikonur.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'VENUS-BEGEGNUNG',
        note: 'Abstiegsmodul trennt sich + landet; Ballon entfaltet sich in 54 km Höhe für 46,5 Stunden.',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'HALLEY-VORBEIFLUG',
        note: 'Engste Annäherung an Komet 1P/Halley in 8890 km — erste Beobachtung eines Kometenkerns.',
        type: 'nominal',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'El Proton-K / D-1 lanza Vega 1 desde Baikonur.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'ENCUENTRO VENUS',
        note: 'El módulo de descenso se separa + aterriza; el globo se despliega a 54 km de altitud durante 46,5 horas.',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'SOBREVUELO HALLEY',
        note: 'Aproximación máxima al cometa 1P/Halley a 8890 km — primera observación de un núcleo cometario.',
        type: 'nominal',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: 'Le Proton-K / D-1 lance Vega 1 depuis Baïkonour.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'RENCONTRE VÉNUS',
        note: "Le module de descente se sépare + se pose ; le ballon se déploie à 54 km d'altitude pendant 46,5 heures.",
        type: 'nominal',
      },
      {
        met: 446,
        label: 'SURVOL HALLEY',
        note: "Approche maximale de la comète 1P/Halley à 8890 km — première observation d'un noyau cométaire.",
        type: 'nominal',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'प्रोटॉन-K / D-1 वेगा 1 को बैकोनूर से प्रक्षेपित करता है।',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'शुक्र मुठभेड़',
        note: 'डिसेंट मॉड्यूल अलग होता है + उतरता है; बैलून 54 किमी ऊंचाई पर 46.5 घंटे के लिए तैनात।',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'हैली फ्लाईबाई',
        note: '8890 किमी पर धूमकेतु 1P/हैली का निकटतम संपर्क — किसी धूमकेतु नाभिक का पहला अवलोकन।',
        type: 'nominal',
      },
    ],
    it: [
      {
        met: 0,
        label: 'LANCIO',
        note: 'Il Proton-K / D-1 lancia Vega 1 da Baikonur.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'INCONTRO VENERE',
        note: 'Il modulo di discesa si separa + atterra; il pallone si dispiega a 54 km di quota per 46,5 ore.',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'SORVOLO HALLEY',
        note: 'Avvicinamento minimo alla cometa 1P/Halley a 8890 km — prima osservazione di un nucleo cometario.',
        type: 'nominal',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: 'プロトン-K / D-1がベガ1号をバイコヌールから打ち上げ。',
        type: 'nominal',
      },
      {
        met: 178,
        label: '金星遭遇',
        note: '降下モジュール分離 + 着陸；気球が高度54 kmで46.5時間展開。',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'ハレー彗星フライバイ',
        note: 'ハレー彗星（1P）への最接近、8890 km — 史上初の彗星核観測。',
        type: 'nominal',
      },
    ],
    ko: [
      {
        met: 0,
        label: '발사',
        note: '프로톤-K / D-1이 베가 1호를 바이코누르에서 발사.',
        type: 'nominal',
      },
      {
        met: 178,
        label: '금성 조우',
        note: '하강 모듈 분리 + 착륙; 풍선이 54 km 고도에서 46.5시간 동안 전개.',
        type: 'nominal',
      },
      {
        met: 446,
        label: '핼리 플라이바이',
        note: '핼리 혜성(1P)으로의 최근접 8890 km — 사상 최초의 혜성 핵 관측.',
        type: 'nominal',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: 'De Proton-K / D-1 lanceert Vega 1 vanuit Bajkonoer.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'VENUS-ONTMOETING',
        note: 'De afdalingsmodule scheidt + landt; ballon ontvouwt op 54 km hoogte voor 46,5 uur.',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'HALLEY-SCHEERVLUCHT',
        note: 'Dichtste nadering tot komeet 1P/Halley op 8890 km — eerste waarneming van een komeetkern.',
        type: 'nominal',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'O Proton-K / D-1 lança a Vega 1 de Baikonur.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'ENCONTRO VÊNUS',
        note: 'O módulo de descida se separa + pousa; o balão se desdobra a 54 km de altitude por 46,5 horas.',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'SOBREVOO HALLEY',
        note: 'Aproximação máxima do cometa 1P/Halley a 8890 km — primeira observação de um núcleo cometário.',
        type: 'nominal',
      },
    ],
    ru: [
      {
        met: 0,
        label: 'ЗАПУСК',
        note: 'Протон-К / Д-1 запускает «Вегу-1» с Байконура.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'ВСТРЕЧА С ВЕНЕРОЙ',
        note: 'Спускаемый модуль отделяется + приземляется; аэростат раскрывается на высоте 54 км на 46,5 часов.',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'ПРОЛЁТ ГАЛЛЕЯ',
        note: 'Ближайший подход к комете 1P/Галлея на 8890 км — первое наблюдение кометного ядра.',
        type: 'nominal',
      },
    ],
    'sr-Cyrl': [
      {
        met: 0,
        label: 'ЛАНСИРАЊЕ',
        note: 'Протон-К / Д-1 лансира Вегу 1 из Бајконура.',
        type: 'nominal',
      },
      {
        met: 178,
        label: 'СУСРЕТ СА ВЕНЕРОМ',
        note: 'Модул за спуштање се одваја + слеће; балон се распоређује на висини од 54 km током 46,5 сати.',
        type: 'nominal',
      },
      {
        met: 446,
        label: 'ПРЕЛЕТ ХАЛЕЈА',
        note: 'Најближи прилаз комети 1P/Халеј на 8890 km — прва опсервација кометног језгра.',
        type: 'nominal',
      },
    ],
    'zh-CN': [
      { met: 0, label: '发射', note: '质子号-K / D-1从拜科努尔发射维加1号。', type: 'nominal' },
      {
        met: 178,
        label: '金星遭遇',
        note: '下降模块分离 + 着陆；气球在54公里高度展开46.5小时。',
        type: 'nominal',
      },
      {
        met: 446,
        label: '哈雷飞掠',
        note: '最接近哈雷彗星（1P）8890公里 — 史上首次彗星核观测。',
        type: 'nominal',
      },
    ],
  },
  'vega-2': {
    ar: [
      {
        met: 0,
        label: 'الإطلاق',
        note: 'صاروخ بروتون-K / D-1 يطلق فيغا 2 من بايكونور بعد فيغا 1 بـ 6 أيام.',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'مواجهة الزهرة',
        note: 'وحدة الإنزال تهبط في فيبي ريجيو + تُعيد أول تحليل كيميائي لتربة المرتفعات.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'مرور قريب من هالي',
        note: 'أقرب اقتراب من المذنب 1P/هالي على بعد 8030 كم — تحديد موقع مزدوج لجوتو.',
        type: 'nominal',
      },
    ],
    de: [
      {
        met: 0,
        label: 'START',
        note: 'Proton-K / D-1 startet Vega 2 von Baikonur 6 Tage nach Vega 1.',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'VENUS-BEGEGNUNG',
        note: 'Abstiegsmodul landet in Phoebe Regio + liefert erste chemische Analyse von Hochlandboden.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'HALLEY-VORBEIFLUG',
        note: 'Engste Annäherung an Komet 1P/Halley in 8030 km — gepaarte Positionsbestimmung für Giotto.',
        type: 'nominal',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'El Proton-K / D-1 lanza Vega 2 desde Baikonur 6 días después de Vega 1.',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'ENCUENTRO VENUS',
        note: 'El módulo de descenso aterriza en Phoebe Regio + devuelve el primer análisis químico del suelo de tierras altas.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'SOBREVUELO HALLEY',
        note: 'Aproximación máxima al cometa 1P/Halley a 8030 km — fijación de posición emparejada para Giotto.',
        type: 'nominal',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: 'Le Proton-K / D-1 lance Vega 2 depuis Baïkonour 6 jours après Vega 1.',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'RENCONTRE VÉNUS',
        note: 'Le module de descente se pose à Phoebe Regio + renvoie la première analyse chimique du sol des hautes terres.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'SURVOL HALLEY',
        note: 'Approche maximale de la comète 1P/Halley à 8030 km — détermination de position appariée pour Giotto.',
        type: 'nominal',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'प्रोटॉन-K / D-1 वेगा 2 को बैकोनूर से वेगा 1 के 6 दिन बाद प्रक्षेपित करता है।',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'शुक्र मुठभेड़',
        note: 'डिसेंट मॉड्यूल फीबे रीजियो में उतरता है + उच्चभूमि मिट्टी का पहला रासायनिक विश्लेषण लौटाता है।',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'हैली फ्लाईबाई',
        note: '8030 किमी पर धूमकेतु 1P/हैली का निकटतम संपर्क — जोटो के लिए युग्मित स्थिति निर्धारण।',
        type: 'nominal',
      },
    ],
    it: [
      {
        met: 0,
        label: 'LANCIO',
        note: 'Il Proton-K / D-1 lancia Vega 2 da Baikonur 6 giorni dopo Vega 1.',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'INCONTRO VENERE',
        note: 'Il modulo di discesa atterra a Phoebe Regio + restituisce la prima analisi chimica del suolo di terre alte.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'SORVOLO HALLEY',
        note: 'Avvicinamento minimo alla cometa 1P/Halley a 8030 km — determinazione di posizione abbinata per Giotto.',
        type: 'nominal',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: 'プロトン-K / D-1がベガ2号をバイコヌールから打ち上げ、ベガ1号の6日後。',
        type: 'nominal',
      },
      {
        met: 176,
        label: '金星遭遇',
        note: '降下モジュールがフォエベ・レジオに着陸 + 高地土壌の初の化学分析を返す。',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'ハレー彗星フライバイ',
        note: 'ハレー彗星（1P）への最接近、8030 km — ジオット用のペア位置決定。',
        type: 'nominal',
      },
    ],
    ko: [
      {
        met: 0,
        label: '발사',
        note: '프로톤-K / D-1이 베가 2호를 바이코누르에서 발사, 베가 1호 후 6일.',
        type: 'nominal',
      },
      {
        met: 176,
        label: '금성 조우',
        note: '하강 모듈이 피베 레지오에 착륙 + 고지대 토양의 첫 화학 분석을 반환.',
        type: 'nominal',
      },
      {
        met: 442,
        label: '핼리 플라이바이',
        note: '핼리 혜성(1P)으로의 최근접 8030 km — 지오토를 위한 짝지어진 위치 결정.',
        type: 'nominal',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: 'De Proton-K / D-1 lanceert Vega 2 vanuit Bajkonoer 6 dagen na Vega 1.',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'VENUS-ONTMOETING',
        note: 'De afdalingsmodule landt in Phoebe Regio + retourneert de eerste chemische analyse van hooglandbodem.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'HALLEY-SCHEERVLUCHT',
        note: 'Dichtste nadering tot komeet 1P/Halley op 8030 km — gepaarde positiebepaling voor Giotto.',
        type: 'nominal',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'O Proton-K / D-1 lança a Vega 2 de Baikonur 6 dias após a Vega 1.',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'ENCONTRO VÊNUS',
        note: 'O módulo de descida pousa em Phoebe Regio + devolve a primeira análise química do solo de terras altas.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'SOBREVOO HALLEY',
        note: 'Aproximação máxima do cometa 1P/Halley a 8030 km — determinação de posição emparelhada para Giotto.',
        type: 'nominal',
      },
    ],
    ru: [
      {
        met: 0,
        label: 'ЗАПУСК',
        note: 'Протон-К / Д-1 запускает «Вегу-2» с Байконура через 6 дней после «Веги-1».',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'ВСТРЕЧА С ВЕНЕРОЙ',
        note: 'Спускаемый модуль приземляется в Феба-Регион + возвращает первый химический анализ грунта высокогорий.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'ПРОЛЁТ ГАЛЛЕЯ',
        note: 'Ближайший подход к комете 1P/Галлея на 8030 км — парное определение позиции для «Джотто».',
        type: 'nominal',
      },
    ],
    'sr-Cyrl': [
      {
        met: 0,
        label: 'ЛАНСИРАЊЕ',
        note: 'Протон-К / Д-1 лансира Вегу 2 из Бајконура 6 дана после Веге 1.',
        type: 'nominal',
      },
      {
        met: 176,
        label: 'СУСРЕТ СА ВЕНЕРОМ',
        note: 'Модул за спуштање слеће у Фебе Регио + враћа прву хемијску анализу тла висоравни.',
        type: 'nominal',
      },
      {
        met: 442,
        label: 'ПРЕЛЕТ ХАЛЕЈА',
        note: 'Најближи прилаз комети 1P/Халеј на 8030 km — упарено одређивање положаја за Ђото.',
        type: 'nominal',
      },
    ],
    'zh-CN': [
      {
        met: 0,
        label: '发射',
        note: '质子号-K / D-1从拜科努尔发射维加2号，比维加1号晚6天。',
        type: 'nominal',
      },
      {
        met: 176,
        label: '金星遭遇',
        note: '下降模块在菲比区着陆 + 返回高地土壤的首次化学分析。',
        type: 'nominal',
      },
      {
        met: 442,
        label: '哈雷飞掠',
        note: '最接近哈雷彗星（1P）8030公里 — 为乔托号配对的位置定位。',
        type: 'nominal',
      },
    ],
  },
  'venera-13': {
    ar: [
      {
        met: 0,
        label: 'الإطلاق',
        note: 'صاروخ بروتون-K / D-1 يطلق فينيرا 13 من بايكونور في رحلة 122 يوماً.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'هبوط على سطح الزهرة',
        note: 'هبوط في فيبي ريجيو على 7.5°ج 303°ش؛ 127 دقيقة من العمليات السطحية في درجة حرارة 457°م / ضغط 89 بار.',
        type: 'nominal',
      },
    ],
    de: [
      {
        met: 0,
        label: 'START',
        note: 'Proton-K / D-1 startet Venera 13 von Baikonur auf eine 122-tägige Reise.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'VENUS-LANDUNG',
        note: 'Aufsetzen in Phoebe Regio bei 7,5°S 303°E; 127 Minuten Oberflächenbetrieb unter 457 °C / 89 bar.',
        type: 'nominal',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'El Proton-K / D-1 lanza Venera 13 desde Baikonur en un crucero de 122 días.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'ATERRIZAJE SUPERFICIE VENUS',
        note: 'Aterrizaje en Phoebe Regio a 7,5°S 303°E; 127 minutos de operaciones superficiales a 457 °C / 89 bar.',
        type: 'nominal',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: 'Le Proton-K / D-1 lance Venera 13 depuis Baïkonour pour une croisière de 122 jours.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'ATTERRISSAGE SURFACE VÉNUS',
        note: "Atterrissage à Phoebe Regio à 7,5°S 303°E ; 127 minutes d'opérations en surface sous 457 °C / 89 bars.",
        type: 'nominal',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'प्रोटॉन-K / D-1 वेनेरा 13 को बैकोनूर से 122-दिवसीय यात्रा पर प्रक्षेपित करता है।',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'शुक्र सतह लैंडिंग',
        note: '7.5°दक्षिण 303°पूर्व पर फीबे रीजियो में टचडाउन; 457°सेल्सियस / 89 बार पर 127 मिनट की सतह संचालन।',
        type: 'nominal',
      },
    ],
    it: [
      {
        met: 0,
        label: 'LANCIO',
        note: 'Il Proton-K / D-1 lancia Venera 13 da Baikonur su una crociera di 122 giorni.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'ATTERRAGGIO SUPERFICIE VENERE',
        note: 'Atterraggio a Phoebe Regio a 7,5°S 303°E; 127 minuti di operazioni in superficie a 457 °C / 89 bar.',
        type: 'nominal',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: 'プロトン-K / D-1がベネラ13号をバイコヌールから122日間の航行で打ち上げ。',
        type: 'nominal',
      },
      {
        met: 122,
        label: '金星表面着陸',
        note: 'フォエベ・レジオの7.5°S 303°Eに着陸；457°C / 89バールで127分間の表面運用。',
        type: 'nominal',
      },
    ],
    ko: [
      {
        met: 0,
        label: '발사',
        note: '프로톤-K / D-1이 베네라 13호를 바이코누르에서 122일 항해로 발사.',
        type: 'nominal',
      },
      {
        met: 122,
        label: '금성 표면 착륙',
        note: '피베 레지오의 7.5°S 303°E에 착륙; 457°C / 89bar에서 127분간의 표면 운영.',
        type: 'nominal',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: 'De Proton-K / D-1 lanceert Venera 13 vanuit Bajkonoer voor een 122-daagse reis.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'VENUS-OPPERVLAKTELANDING',
        note: 'Touchdown in Phoebe Regio op 7,5°Z 303°O; 127 minuten oppervlakteoperaties bij 457 °C / 89 bar.',
        type: 'nominal',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'O Proton-K / D-1 lança a Venera 13 de Baikonur em um cruzeiro de 122 dias.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'POUSO SUPERFÍCIE VÊNUS',
        note: 'Pouso em Phoebe Regio em 7,5°S 303°L; 127 minutos de operações em superfície a 457 °C / 89 bar.',
        type: 'nominal',
      },
    ],
    ru: [
      {
        met: 0,
        label: 'ЗАПУСК',
        note: 'Протон-К / Д-1 запускает «Венеру-13» с Байконура в 122-дневный перелёт.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'ПОСАДКА НА ВЕНЕРУ',
        note: 'Приземление в Феба-Регион на 7,5°ю.ш. 303°в.д.; 127 минут операций на поверхности при 457 °C / 89 бар.',
        type: 'nominal',
      },
    ],
    'sr-Cyrl': [
      {
        met: 0,
        label: 'ЛАНСИРАЊЕ',
        note: 'Протон-К / Д-1 лансира Венеру 13 из Бајконура на 122-дневни пут.',
        type: 'nominal',
      },
      {
        met: 122,
        label: 'СЛЕТАЊЕ НА ВЕНЕРУ',
        note: 'Слетање у Фебе Регио на 7,5°Ј 303°И; 127 минута операција на површини на 457 °C / 89 бара.',
        type: 'nominal',
      },
    ],
    'zh-CN': [
      {
        met: 0,
        label: '发射',
        note: '质子号-K / D-1从拜科努尔发射金星13号，开始122天的航行。',
        type: 'nominal',
      },
      {
        met: 122,
        label: '金星表面着陆',
        note: '降落在菲比区7.5°南303°东；在457°C / 89巴下进行127分钟的表面操作。',
        type: 'nominal',
      },
    ],
  },
  giotto: {
    ar: [
      {
        met: 0,
        label: 'الإطلاق',
        note: 'صاروخ آريان 1 يطلق جوتو من كورو — أول مهمة فضاء عميق لوكالة الفضاء الأوروبية.',
        type: 'nominal',
      },
      {
        met: 255,
        label: 'مرور قريب من هالي',
        note: 'أقرب اقتراب 596 كم من المذنب 1P/هالي؛ أول صور قريبة لنواة مذنبية.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'مرور أرضي قريب',
        note: 'مساعدة جاذبية أرضية تعيد توجيه جوتو إلى المذنب 26P/جريج-سكيليرَب.',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'مرور قريب من جريج-سكيليرَب',
        note: 'أقرب اقتراب 200 كم — أقرب مرور قريب بمذنب على الإطلاق.',
        type: 'nominal',
      },
    ],
    de: [
      {
        met: 0,
        label: 'START',
        note: 'Ariane 1 startet Giotto von Kourou — ESAs erste Tiefraummission.',
        type: 'nominal',
      },
      {
        met: 255,
        label: 'HALLEY-VORBEIFLUG',
        note: '596 km engste Annäherung an Komet 1P/Halley; erste Nahaufnahmen eines Kometenkerns.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'ERDVORBEIFLUG',
        note: 'Erd-Gravitationsassistenz lenkt Giotto zum Kometen 26P/Grigg-Skjellerup um.',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'GRIGG-SKJELLERUP-VORBEIFLUG',
        note: '200 km engste Annäherung — engster jemals durchgeführter Kometenvorbeiflug.',
        type: 'nominal',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'El Ariane 1 lanza Giotto desde Kourou — primera misión de espacio profundo de la ESA.',
        type: 'nominal',
      },
      {
        met: 255,
        label: 'SOBREVUELO HALLEY',
        note: 'Aproximación máxima de 596 km al cometa 1P/Halley; primeras imágenes cercanas de un núcleo cometario.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'SOBREVUELO TERRESTRE',
        note: 'La asistencia gravitatoria terrestre reorienta Giotto al cometa 26P/Grigg-Skjellerup.',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'SOBREVUELO GRIGG-SKJELLERUP',
        note: 'Aproximación máxima de 200 km — el sobrevuelo cometario más cercano registrado.',
        type: 'nominal',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: "L'Ariane 1 lance Giotto depuis Kourou — première mission d'espace lointain de l'ESA.",
        type: 'nominal',
      },
      {
        met: 255,
        label: 'SURVOL HALLEY',
        note: "Approche maximale de 596 km de la comète 1P/Halley ; premières images rapprochées d'un noyau cométaire.",
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'SURVOL TERRESTRE',
        note: "L'assistance gravitationnelle terrestre redirige Giotto vers la comète 26P/Grigg-Skjellerup.",
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'SURVOL GRIGG-SKJELLERUP',
        note: 'Approche maximale de 200 km — le survol cométaire le plus proche enregistré.',
        type: 'nominal',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'एरियन 1 जोटो को कोरू से प्रक्षेपित करता है — ईएसए का पहला गहरे अंतरिक्ष मिशन।',
        type: 'nominal',
      },
      {
        met: 255,
        label: 'हैली फ्लाईबाई',
        note: 'धूमकेतु 1P/हैली से 596 किमी निकटतम संपर्क; किसी धूमकेतु नाभिक की पहली निकटवर्ती छवियां।',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'पृथ्वी फ्लाईबाई',
        note: 'पृथ्वी की गुरुत्व सहायता जोटो को धूमकेतु 26P/ग्रिग-स्केलरअप की ओर पुनर्निर्देशित करती है।',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'ग्रिग-स्केलरअप फ्लाईबाई',
        note: '200 किमी निकटतम संपर्क — रिकॉर्ड पर सबसे करीबी धूमकेतु फ्लाईबाई।',
        type: 'nominal',
      },
    ],
    it: [
      {
        met: 0,
        label: 'LANCIO',
        note: "L'Ariane 1 lancia Giotto da Kourou — prima missione di spazio profondo dell'ESA.",
        type: 'nominal',
      },
      {
        met: 255,
        label: 'SORVOLO HALLEY',
        note: 'Avvicinamento minimo di 596 km alla cometa 1P/Halley; prime immagini ravvicinate di un nucleo cometario.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'SORVOLO TERRESTRE',
        note: "L'assistenza gravitazionale terrestre reindirizza Giotto alla cometa 26P/Grigg-Skjellerup.",
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'SORVOLO GRIGG-SKJELLERUP',
        note: 'Avvicinamento minimo di 200 km — il sorvolo cometario più ravvicinato registrato.',
        type: 'nominal',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: 'アリアン1がジオットをクールーから打ち上げ — ESA初の深宇宙ミッション。',
        type: 'nominal',
      },
      {
        met: 255,
        label: 'ハレー彗星フライバイ',
        note: 'ハレー彗星（1P）に596 km最接近；彗星核の初の接写画像。',
        type: 'nominal',
      },
      {
        met: 1827,
        label: '地球フライバイ',
        note: '地球重力アシストがジオットを彗星26P/グリッグ・シェレルアプに再標的化。',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'グリッグ・シェレルアプ・フライバイ',
        note: '200 km最接近 — 記録上最も近い彗星フライバイ。',
        type: 'nominal',
      },
    ],
    ko: [
      {
        met: 0,
        label: '발사',
        note: '아리안 1이 지오토를 쿠루에서 발사 — ESA의 첫 심우주 임무.',
        type: 'nominal',
      },
      {
        met: 255,
        label: '핼리 플라이바이',
        note: '핼리 혜성(1P)으로 596 km 최근접; 혜성 핵의 첫 근접 영상.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: '지구 플라이바이',
        note: '지구 중력 도움이 지오토를 혜성 26P/그리그-스켈러럽으로 재표적화.',
        type: 'nominal',
      },
      {
        met: 2565,
        label: '그리그-스켈러럽 플라이바이',
        note: '200 km 최근접 — 기록상 가장 가까운 혜성 플라이바이.',
        type: 'nominal',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: "De Ariane 1 lanceert Giotto vanuit Kourou — ESA's eerste diepruimtemissie.",
        type: 'nominal',
      },
      {
        met: 255,
        label: 'HALLEY-SCHEERVLUCHT',
        note: '596 km dichtste nadering tot komeet 1P/Halley; eerste close-upbeelden van een komeetkern.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'AARDSCHEERVLUCHT',
        note: 'Aardse zwaartekrachtassistentie navigeert Giotto naar komeet 26P/Grigg-Skjellerup.',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'GRIGG-SKJELLERUP-SCHEERVLUCHT',
        note: '200 km dichtste nadering — de dichtstbijzijnde komeetscheervlucht in de records.',
        type: 'nominal',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'O Ariane 1 lança Giotto de Kourou — primeira missão de espaço profundo da ESA.',
        type: 'nominal',
      },
      {
        met: 255,
        label: 'SOBREVOO HALLEY',
        note: 'Aproximação máxima de 596 km do cometa 1P/Halley; primeiras imagens próximas de um núcleo cometário.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'SOBREVOO TERRESTRE',
        note: 'A assistência gravitacional terrestre redireciona Giotto ao cometa 26P/Grigg-Skjellerup.',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'SOBREVOO GRIGG-SKJELLERUP',
        note: 'Aproximação máxima de 200 km — o sobrevoo cometário mais próximo registrado.',
        type: 'nominal',
      },
    ],
    ru: [
      {
        met: 0,
        label: 'ЗАПУСК',
        note: 'Ariane 1 запускает «Джотто» с Куру — первая дальнекосмическая миссия ЕКА.',
        type: 'nominal',
      },
      {
        met: 255,
        label: 'ПРОЛЁТ ГАЛЛЕЯ',
        note: 'Ближайший подход 596 км к комете 1P/Галлея; первые крупные снимки кометного ядра.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'ПРОЛЁТ ЗЕМЛИ',
        note: 'Гравитационный манёвр у Земли перенаправляет «Джотто» к комете 26P/Григга-Скьеллерупа.',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'ПРОЛЁТ ГРИГГА-СКЬЕЛЛЕРУПА',
        note: 'Ближайший подход 200 км — самый близкий зарегистрированный пролёт кометы.',
        type: 'nominal',
      },
    ],
    'sr-Cyrl': [
      {
        met: 0,
        label: 'ЛАНСИРАЊЕ',
        note: 'Ариан 1 лансира Ђото из Куруа — прва ЕСА-ина дубоко-свемирска мисија.',
        type: 'nominal',
      },
      {
        met: 255,
        label: 'ПРЕЛЕТ ХАЛЕЈА',
        note: 'Најближи прилаз 596 km комети 1P/Халеј; прве слике изблиза кометног језгра.',
        type: 'nominal',
      },
      {
        met: 1827,
        label: 'ЗЕМАЉСКИ ПРЕЛЕТ',
        note: 'Земаљска гравитациона асистенција преусмерава Ђото ка комети 26P/Григ-Скјелеруп.',
        type: 'nominal',
      },
      {
        met: 2565,
        label: 'ПРЕЛЕТ ГРИГ-СКЈЕЛЕРУПА',
        note: 'Најближи прилаз 200 km — најближи кометарни прелет у евиденцији.',
        type: 'nominal',
      },
    ],
    'zh-CN': [
      {
        met: 0,
        label: '发射',
        note: '阿丽亚娜1从库鲁发射乔托号 — ESA首个深空任务。',
        type: 'nominal',
      },
      {
        met: 255,
        label: '哈雷飞掠',
        note: '与哈雷彗星（1P）最接近596公里；首批彗星核近距图像。',
        type: 'nominal',
      },
      {
        met: 1827,
        label: '地球飞掠',
        note: '地球引力辅助将乔托号重新定向至格里格-斯凯利鲁普彗星（26P）。',
        type: 'nominal',
      },
      {
        met: 2565,
        label: '格里格-斯凯利鲁普飞掠',
        note: '最接近200公里 — 记录中最近距离的彗星飞掠。',
        type: 'nominal',
      },
    ],
  },
  hayabusa2: {
    ar: [
      {
        met: 0,
        label: 'الإطلاق',
        note: 'صاروخ H-IIA 202 من تانيغاشيما يبدأ رحلة 3.5 سنوات إلى الكويكب ريوغو.',
        type: 'nominal',
      },
      {
        met: 366,
        label: 'مرور أرضي قريب',
        note: 'مساعدة جاذبية أرضية تضبط مدار اللقاء.',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'وصول ريوغو',
        note: 'تحليق على ارتفاع 20 كم — بدء 1.5 سنة من العمليات القريبة بما في ذلك جمع العينات.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'العودة إلى الأرض',
        note: 'كبسولة العينات تهبط في وومرا، أستراليا مع 5.4 جم من مادة ريوغو.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: 'مرور قريب 2001 CC21',
        note: 'مرور موسع للمهمة لكويكب (98943) 2001 CC21.',
        type: 'info',
      },
      {
        met: 6092,
        label: 'لقاء 1998 KY26',
        note: 'لقاء مخطط مع كويكب سريع الدوران (1998 KY26).',
        type: 'info',
      },
    ],
    de: [
      {
        met: 0,
        label: 'START',
        note: 'H-IIA 202 von Tanegashima beginnt die 3,5-jährige Reise zum Asteroiden Ryugu.',
        type: 'nominal',
      },
      {
        met: 366,
        label: 'ERDVORBEIFLUG',
        note: 'Erd-Gravitationsassistenz justiert die Rendezvous-Bahn.',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'RYUGU-ANKUNFT',
        note: 'Schweben in 20 km — Beginn der 1,5-jährigen Annäherungsoperationen einschließlich Probenentnahme.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'ERDRÜCKKEHR',
        note: 'Probenkapsel landet in Woomera, Australien mit 5,4 g Ryugu-Material.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: '2001 CC21-VORBEIFLUG',
        note: 'Verlängerte Mission Vorbeiflug am Asteroiden (98943) 2001 CC21.',
        type: 'info',
      },
      {
        met: 6092,
        label: '1998 KY26-RENDEZVOUS',
        note: 'Geplantes Rendezvous mit dem schnell rotierenden Asteroiden (1998 KY26).',
        type: 'info',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'El H-IIA 202 desde Tanegashima inicia el crucero de 3,5 años al asteroide Ryugu.',
        type: 'nominal',
      },
      {
        met: 366,
        label: 'SOBREVUELO TERRESTRE',
        note: 'La asistencia gravitatoria terrestre fasea la órbita de encuentro.',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'LLEGADA RYUGU',
        note: 'Vuelo estacionario a 20 km — inicio de 1,5 años de operaciones cercanas incluyendo recolección de muestras.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'RETORNO A TIERRA',
        note: 'La cápsula de muestras aterriza en Woomera, Australia con 5,4 g de material de Ryugu.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: 'SOBREVUELO 2001 CC21',
        note: 'Sobrevuelo de misión ampliada del asteroide (98943) 2001 CC21.',
        type: 'info',
      },
      {
        met: 6092,
        label: 'ENCUENTRO 1998 KY26',
        note: 'Encuentro planificado con el asteroide de rotación rápida (1998 KY26).',
        type: 'info',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: "Le H-IIA 202 de Tanegashima entame la croisière de 3,5 ans vers l'astéroïde Ryugu.",
        type: 'nominal',
      },
      {
        met: 366,
        label: 'SURVOL TERRESTRE',
        note: "L'assistance gravitationnelle terrestre phase l'orbite de rendez-vous.",
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'ARRIVÉE RYUGU',
        note: "Vol stationnaire à 20 km — début de 1,5 an d'opérations rapprochées incluant la collecte d'échantillons.",
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'RETOUR SUR TERRE',
        note: "La capsule d'échantillons se pose à Woomera, Australie avec 5,4 g de matériau de Ryugu.",
        type: 'nominal',
      },
      {
        met: 4250,
        label: 'SURVOL 2001 CC21',
        note: "Survol de mission étendue de l'astéroïde (98943) 2001 CC21.",
        type: 'info',
      },
      {
        met: 6092,
        label: 'RENDEZ-VOUS 1998 KY26',
        note: "Rendez-vous prévu avec l'astéroïde à rotation rapide (1998 KY26).",
        type: 'info',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'तानेगाशिमा से H-IIA 202 क्षुद्रग्रह रयूगु के लिए 3.5-वर्षीय यात्रा शुरू करता है।',
        type: 'nominal',
      },
      {
        met: 366,
        label: 'पृथ्वी फ्लाईबाई',
        note: 'पृथ्वी की गुरुत्व सहायता मिलन कक्षा को चरणबद्ध करती है।',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'रयूगु आगमन',
        note: '20 किमी पर मंडराव — नमूना संग्रह सहित 1.5 वर्ष की निकटवर्ती संचालन की शुरुआत।',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'पृथ्वी पर वापसी',
        note: 'नमूना कैप्सूल वूमेरा, ऑस्ट्रेलिया में 5.4 ग्राम रयूगु सामग्री के साथ उतरता है।',
        type: 'nominal',
      },
      {
        met: 4250,
        label: '2001 CC21 फ्लाईबाई',
        note: 'क्षुद्रग्रह (98943) 2001 CC21 का विस्तारित मिशन फ्लाईबाई।',
        type: 'info',
      },
      {
        met: 6092,
        label: '1998 KY26 मिलन',
        note: 'तेजी से घूमने वाले क्षुद्रग्रह (1998 KY26) के साथ नियोजित मिलन।',
        type: 'info',
      },
    ],
    it: [
      {
        met: 0,
        label: 'LANCIO',
        note: "L'H-IIA 202 da Tanegashima inizia la crociera di 3,5 anni verso l'asteroide Ryugu.",
        type: 'nominal',
      },
      {
        met: 366,
        label: 'SORVOLO TERRESTRE',
        note: "L'assistenza gravitazionale terrestre fasa l'orbita di rendez-vous.",
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'ARRIVO RYUGU',
        note: 'Volo stazionario a 20 km — inizio di 1,5 anni di operazioni ravvicinate inclusa la raccolta campioni.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'RIENTRO TERRESTRE',
        note: 'La capsula campioni atterra a Woomera, Australia con 5,4 g di materiale di Ryugu.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: 'SORVOLO 2001 CC21',
        note: "Sorvolo della missione estesa dell'asteroide (98943) 2001 CC21.",
        type: 'info',
      },
      {
        met: 6092,
        label: 'RENDEZ-VOUS 1998 KY26',
        note: "Rendez-vous pianificato con l'asteroide a rotazione rapida (1998 KY26).",
        type: 'info',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: '種子島からH-IIA 202が小惑星リュウグウへの3.5年間の航行を開始。',
        type: 'nominal',
      },
      {
        met: 366,
        label: '地球フライバイ',
        note: '地球重力アシストがランデブー軌道を位相調整。',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'リュウグウ到着',
        note: '20 kmでホバリング — サンプル採取を含む1.5年間の近接運用の開始。',
        type: 'nominal',
      },
      {
        met: 1880,
        label: '地球帰還',
        note: 'サンプルカプセルがオーストラリアのウーメラに5.4 gのリュウグウ物質と共に着陸。',
        type: 'nominal',
      },
      {
        met: 4250,
        label: '2001 CC21フライバイ',
        note: '小惑星（98943）2001 CC21の延長ミッションフライバイ。',
        type: 'info',
      },
      {
        met: 6092,
        label: '1998 KY26ランデブー',
        note: '高速回転小惑星（1998 KY26）との予定ランデブー。',
        type: 'info',
      },
    ],
    ko: [
      {
        met: 0,
        label: '발사',
        note: '다네가시마에서 H-IIA 202가 소행성 류구로의 3.5년 항해 시작.',
        type: 'nominal',
      },
      {
        met: 366,
        label: '지구 플라이바이',
        note: '지구 중력 도움이 랑데부 궤도를 위상 조정.',
        type: 'nominal',
      },
      {
        met: 1302,
        label: '류구 도착',
        note: '20 km에서 호버링 — 샘플 수집을 포함한 1.5년간의 근접 운영 시작.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: '지구 귀환',
        note: '샘플 캡슐이 호주 우메라에 5.4g의 류구 물질과 함께 착륙.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: '2001 CC21 플라이바이',
        note: '소행성 (98943) 2001 CC21의 연장 임무 플라이바이.',
        type: 'info',
      },
      {
        met: 6092,
        label: '1998 KY26 랑데부',
        note: '빠르게 회전하는 소행성 (1998 KY26)과의 계획된 랑데부.',
        type: 'info',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: 'De H-IIA 202 vanuit Tanegashima begint de 3,5-jarige reis naar asteroïde Ryugu.',
        type: 'nominal',
      },
      {
        met: 366,
        label: 'AARDSCHEERVLUCHT',
        note: 'Aardse zwaartekrachtassistentie faseert de rendez-vousbaan.',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'RYUGU-AANKOMST',
        note: 'Hangen op 20 km — start van 1,5 jaar nabijheidsoperaties inclusief monsterverzameling.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'AARDTERUGKEER',
        note: 'Monstercapsule landt in Woomera, Australië met 5,4 g Ryugu-materiaal.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: '2001 CC21-SCHEERVLUCHT',
        note: 'Verlengde-missie scheervlucht van asteroïde (98943) 2001 CC21.',
        type: 'info',
      },
      {
        met: 6092,
        label: '1998 KY26-RENDEZVOUS',
        note: 'Gepland rendezvous met de snel roterende asteroïde (1998 KY26).',
        type: 'info',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'O H-IIA 202 de Tanegashima inicia o cruzeiro de 3,5 anos ao asteroide Ryugu.',
        type: 'nominal',
      },
      {
        met: 366,
        label: 'SOBREVOO TERRESTRE',
        note: 'A assistência gravitacional terrestre faseja a órbita de encontro.',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'CHEGADA RYUGU',
        note: 'Voo pairado a 20 km — início de 1,5 ano de operações próximas incluindo coleta de amostras.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'RETORNO À TERRA',
        note: 'A cápsula de amostras pousa em Woomera, Austrália com 5,4 g de material de Ryugu.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: 'SOBREVOO 2001 CC21',
        note: 'Sobrevoo de missão estendida do asteroide (98943) 2001 CC21.',
        type: 'info',
      },
      {
        met: 6092,
        label: 'ENCONTRO 1998 KY26',
        note: 'Encontro planejado com o asteroide de rotação rápida (1998 KY26).',
        type: 'info',
      },
    ],
    ru: [
      {
        met: 0,
        label: 'ЗАПУСК',
        note: 'H-IIA 202 с Танэгасимы начинает 3,5-летний перелёт к астероиду Рюгу.',
        type: 'nominal',
      },
      {
        met: 366,
        label: 'ПРОЛЁТ ЗЕМЛИ',
        note: 'Гравитационный манёвр у Земли фазирует орбиту встречи.',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'ПРИБЫТИЕ К РЮГУ',
        note: 'Зависание в 20 км — начало 1,5-летних операций сближения, включая сбор образцов.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'ВОЗВРАЩЕНИЕ НА ЗЕМЛЮ',
        note: 'Капсула с образцами приземляется в Вумере, Австралия с 5,4 г материала Рюгу.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: 'ПРОЛЁТ 2001 CC21',
        note: 'Пролёт расширенной миссии астероида (98943) 2001 CC21.',
        type: 'info',
      },
      {
        met: 6092,
        label: 'СБЛИЖЕНИЕ С 1998 KY26',
        note: 'Запланированное сближение с быстро вращающимся астероидом (1998 KY26).',
        type: 'info',
      },
    ],
    'sr-Cyrl': [
      {
        met: 0,
        label: 'ЛАНСИРАЊЕ',
        note: 'H-IIA 202 из Танегашиме почиње 3,5-годишњи пут до астероида Рјугу.',
        type: 'nominal',
      },
      {
        met: 366,
        label: 'ЗЕМАЉСКИ ПРЕЛЕТ',
        note: 'Земаљска гравитациона асистенција фазира орбиту сусрета.',
        type: 'nominal',
      },
      {
        met: 1302,
        label: 'ДОЛАЗАК НА РЈУГУ',
        note: 'Лебдење на 20 km — почетак 1,5-годишњих операција близу укључујући узимање узорака.',
        type: 'nominal',
      },
      {
        met: 1880,
        label: 'ПОВРАТАК НА ЗЕМЉУ',
        note: 'Капсула узорака слеће у Вумери, Аустралија са 5,4 g материјала Рјугу.',
        type: 'nominal',
      },
      {
        met: 4250,
        label: 'ПРЕЛЕТ 2001 CC21',
        note: 'Прелет продужене мисије астероида (98943) 2001 CC21.',
        type: 'info',
      },
      {
        met: 6092,
        label: 'СУСРЕТ СА 1998 KY26',
        note: 'Планирани сусрет са брзо ротирајућим астероидом (1998 KY26).',
        type: 'info',
      },
    ],
    'zh-CN': [
      {
        met: 0,
        label: '发射',
        note: '种子岛H-IIA 202开始为期3.5年前往小行星龙宫的航行。',
        type: 'nominal',
      },
      { met: 366, label: '地球飞掠', note: '地球引力辅助相位调整会合轨道。', type: 'nominal' },
      {
        met: 1302,
        label: '抵达龙宫',
        note: '在20公里悬停 — 开始1.5年的近距操作，包括样本收集。',
        type: 'nominal',
      },
      {
        met: 1880,
        label: '返回地球',
        note: '样本舱降落在澳大利亚伍默拉，携带5.4克龙宫物质。',
        type: 'nominal',
      },
      {
        met: 4250,
        label: '2001 CC21飞掠',
        note: '小行星（98943）2001 CC21的延长任务飞掠。',
        type: 'info',
      },
      {
        met: 6092,
        label: '1998 KY26交会',
        note: '与快速旋转的小行星（1998 KY26）的计划交会。',
        type: 'info',
      },
    ],
  },
  juice: {
    ar: [
      { met: 0, label: 'الإطلاق', note: 'صاروخ آريان 5 ECA+ يطلق جوس من كورو.', type: 'nominal' },
      {
        met: 493,
        label: 'مرور قريب قمري-أرضي',
        note: 'أول مساعدة جاذبية قمرية-أرضية على الإطلاق — القمر والأرض في تأرجح واحد.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'مرور قريب من الزهرة',
        note: 'مساعدة جاذبية الزهرة في طريق العودة إلى مرورين أرضيين إضافيين.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'إدخال مدار المشتري',
        note: 'حرق المحرك الرئيسي يضع جوس في مدار المشتري لجولة الأقمار الجليدية.',
        type: 'info',
      },
    ],
    de: [
      { met: 0, label: 'START', note: 'Ariane 5 ECA+ startet JUICE von Kourou.', type: 'nominal' },
      {
        met: 493,
        label: 'MOND-ERDE-VORBEIFLUG',
        note: 'Erste jemals durchgeführte Mond-Erde-Gravitationsassistenz — Mond + Erde in einem Schwung.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'VENUSVORBEIFLUG',
        note: 'Venus-Gravitationsassistenz auf dem Rückweg zu zwei weiteren Erdpassagen.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'JUPITER-ORBITEINSCHUSS',
        note: 'Haupttriebwerksbrennen platziert JUICE in die Jupiterbahn für die Eismonde-Tour.',
        type: 'info',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'El Ariane 5 ECA+ lanza JUICE desde Kourou.',
        type: 'nominal',
      },
      {
        met: 493,
        label: 'SOBREVUELO LUNAR-TERRESTRE',
        note: 'Primera asistencia gravitatoria Luna-Tierra jamás realizada — Luna + Tierra en un solo paso.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'SOBREVUELO VENUS',
        note: 'Asistencia gravitatoria de Venus en ruta de regreso a dos pasos terrestres más.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'INSERCIÓN ÓRBITA JÚPITER',
        note: 'La quema del motor principal coloca JUICE en órbita joviana para la gira de lunas heladas.',
        type: 'info',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: "L'Ariane 5 ECA+ lance JUICE depuis Kourou.",
        type: 'nominal',
      },
      {
        met: 493,
        label: 'SURVOL LUNE-TERRE',
        note: 'Première assistance gravitationnelle Lune-Terre jamais réalisée — Lune + Terre en un seul passage.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'SURVOL VÉNUS',
        note: 'Assistance gravitationnelle vénusienne sur le chemin du retour vers deux autres passages terrestres.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'INSERTION ORBITE JUPITER',
        note: 'Le tir du moteur principal place JUICE en orbite jovienne pour la tournée des lunes glacées.',
        type: 'info',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'एरियन 5 ECA+ JUICE को कोरू से प्रक्षेपित करता है।',
        type: 'nominal',
      },
      {
        met: 493,
        label: 'चंद्र-पृथ्वी फ्लाईबाई',
        note: 'पहली बार चंद्र-पृथ्वी गुरुत्व सहायता — चंद्रमा + पृथ्वी एक स्विंग में।',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'शुक्र फ्लाईबाई',
        note: 'दो और पृथ्वी मार्गों पर वापसी के रास्ते में शुक्र गुरुत्व सहायता।',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'बृहस्पति कक्षा प्रवेश',
        note: 'मुख्य इंजन बर्न JUICE को बर्फीले चंद्रमाओं के दौरे के लिए बृहस्पति कक्षा में रखता है।',
        type: 'info',
      },
    ],
    it: [
      { met: 0, label: 'LANCIO', note: "L'Ariane 5 ECA+ lancia JUICE da Kourou.", type: 'nominal' },
      {
        met: 493,
        label: 'SORVOLO LUNA-TERRA',
        note: 'Prima assistenza gravitazionale Luna-Terra mai eseguita — Luna + Terra in un singolo passaggio.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'SORVOLO VENERE',
        note: 'Assistenza gravitazionale venusiana al ritorno verso altri due passaggi terrestri.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'INSERIMENTO ORBITA GIOVE',
        note: "L'accensione del motore principale colloca JUICE in orbita gioviana per il tour delle lune ghiacciate.",
        type: 'info',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: 'アリアン5 ECA+がJUICEをクールーから打ち上げ。',
        type: 'nominal',
      },
      {
        met: 493,
        label: '月-地球フライバイ',
        note: '史上初の月-地球重力アシスト — 月 + 地球を1回のスイングで。',
        type: 'nominal',
      },
      {
        met: 871,
        label: '金星フライバイ',
        note: 'さらに2回の地球通過への帰途中の金星重力アシスト。',
        type: 'nominal',
      },
      {
        met: 3020,
        label: '木星軌道投入',
        note: 'メインエンジン燃焼によりJUICEを氷の月ツアーのため木星軌道に配置。',
        type: 'info',
      },
    ],
    ko: [
      { met: 0, label: '발사', note: '아리안 5 ECA+가 JUICE를 쿠루에서 발사.', type: 'nominal' },
      {
        met: 493,
        label: '달-지구 플라이바이',
        note: '사상 최초의 달-지구 중력 도움 — 달 + 지구를 한 번의 스윙으로.',
        type: 'nominal',
      },
      {
        met: 871,
        label: '금성 플라이바이',
        note: '두 번 더 지구 통과로 돌아가는 길의 금성 중력 도움.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: '목성 궤도 진입',
        note: '메인 엔진 연소가 얼음 위성 투어를 위해 JUICE를 목성 궤도에 배치.',
        type: 'info',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: 'De Ariane 5 ECA+ lanceert JUICE vanuit Kourou.',
        type: 'nominal',
      },
      {
        met: 493,
        label: 'MAAN-AARDE-SCHEERVLUCHT',
        note: 'Eerste Maan-Aarde-zwaartekrachtassistentie ooit uitgevoerd — Maan + Aarde in één zwaai.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'VENUS-SCHEERVLUCHT',
        note: 'Venus-zwaartekrachtassistentie op weg terug naar nog twee aardpassages.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'JUPITER-BAANINSERTIE',
        note: 'Hoofdmotor-burn plaatst JUICE in Jupiterbaan voor de ijsmaantour.',
        type: 'info',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'O Ariane 5 ECA+ lança JUICE de Kourou.',
        type: 'nominal',
      },
      {
        met: 493,
        label: 'SOBREVOO LUA-TERRA',
        note: 'Primeira assistência gravitacional Lua-Terra já realizada — Lua + Terra em uma única balanço.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'SOBREVOO VÊNUS',
        note: 'Assistência gravitacional venusiana no caminho de volta a mais duas passagens terrestres.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'INSERÇÃO ÓRBITA JÚPITER',
        note: 'A queima do motor principal coloca JUICE em órbita joviana para a turnê das luas geladas.',
        type: 'info',
      },
    ],
    ru: [
      { met: 0, label: 'ЗАПУСК', note: 'Ariane 5 ECA+ запускает JUICE с Куру.', type: 'nominal' },
      {
        met: 493,
        label: 'ЛУННО-ЗЕМНОЙ ПРОЛЁТ',
        note: 'Первый в истории лунно-земной гравитационный манёвр — Луна + Земля за один проход.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'ПРОЛЁТ ВЕНЕРЫ',
        note: 'Венерианский гравитационный манёвр на обратном пути к ещё двум проходам Земли.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'ВЫХОД НА ОРБИТУ ЮПИТЕРА',
        note: 'Запуск основного двигателя помещает JUICE на орбиту Юпитера для тура по ледяным лунам.',
        type: 'info',
      },
    ],
    'sr-Cyrl': [
      { met: 0, label: 'ЛАНСИРАЊЕ', note: 'Ариан 5 ECA+ лансира JUICE из Куруа.', type: 'nominal' },
      {
        met: 493,
        label: 'МЕСЕЦ-ЗЕМЉА ПРЕЛЕТ',
        note: 'Прва Месечева-Земаљска гравитациона асистенција икада изведена — Месец + Земља у једном замаху.',
        type: 'nominal',
      },
      {
        met: 871,
        label: 'ВЕНЕРИН ПРЕЛЕТ',
        note: 'Венеријанска гравитациона асистенција на путу назад ка још два земаљска проласка.',
        type: 'nominal',
      },
      {
        met: 3020,
        label: 'УЛАЗАК У ЈУПИТЕРОВУ ОРБИТУ',
        note: 'Паљење главног мотора поставља JUICE у Јупитерову орбиту за турнеју ледених месеца.',
        type: 'info',
      },
    ],
    'zh-CN': [
      { met: 0, label: '发射', note: '阿丽亚娜5 ECA+从库鲁发射JUICE。', type: 'nominal' },
      {
        met: 493,
        label: '月球-地球飞掠',
        note: '史上首次月球-地球引力辅助 — 一次摆动中的月球 + 地球。',
        type: 'nominal',
      },
      {
        met: 871,
        label: '金星飞掠',
        note: '在返回再两次地球通过的路上的金星引力辅助。',
        type: 'nominal',
      },
      {
        met: 3020,
        label: '木星轨道进入',
        note: '主发动机点火将JUICE置于木星轨道以进行冰卫星之旅。',
        type: 'info',
      },
    ],
  },
  bepicolombo: {
    ar: [
      {
        met: 0,
        label: 'الإطلاق',
        note: 'صاروخ آريان 5 ECA يطلق بيبي كولومبو من كورو في رحلة أيونية لمدة 8 سنوات إلى عطارد.',
        type: 'nominal',
      },
      {
        met: 538,
        label: 'مرور أرضي قريب',
        note: 'مساعدة جاذبية أرضية واحدة تبدأ سلسلة مساعدات الجاذبية في النظام الداخلي.',
        type: 'nominal',
      },
      {
        met: 727,
        label: 'مرور قريب من الزهرة #1',
        note: 'أول مساعدة جاذبية الزهرة.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'مرور قريب من الزهرة #2',
        note: 'ثاني مساعدة جاذبية الزهرة تبدأ مرحلة الاقتراب من عطارد.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'مرور قريب من عطارد #1',
        note: 'أول من ستة مساعدات جاذبية عطارد.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'إدخال مدار عطارد',
        note: 'فصل MTM + فصل المدارية؛ تبدأ العمليات العلمية أوائل 2027.',
        type: 'info',
      },
    ],
    de: [
      {
        met: 0,
        label: 'START',
        note: 'Ariane 5 ECA startet BepiColombo von Kourou auf seine 8-jährige Ionenfahrt nach Merkur.',
        type: 'nominal',
      },
      {
        met: 538,
        label: 'ERDVORBEIFLUG',
        note: 'Einzelne Erd-Gravitationsassistenz beginnt die innersystemische Gravitationsassistenzkette.',
        type: 'nominal',
      },
      {
        met: 727,
        label: 'VENUSVORBEIFLUG #1',
        note: 'Erste Venus-Gravitationsassistenz.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'VENUSVORBEIFLUG #2',
        note: 'Zweite Venus-Gravitationsassistenz beginnt die Merkur-Anflugphase.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'MERKURVORBEIFLUG #1',
        note: 'Erster von sechs Merkur-Gravitationsassistenzen.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'MERKUR-ORBITEINSCHUSS',
        note: 'MTM-Abwurf + Orbiter-Trennung; wissenschaftliche Operationen beginnen Anfang 2027.',
        type: 'info',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'El Ariane 5 ECA lanza BepiColombo desde Kourou en su crucero iónico de 8 años a Mercurio.',
        type: 'nominal',
      },
      {
        met: 538,
        label: 'SOBREVUELO TERRESTRE',
        note: 'Asistencia gravitatoria terrestre única inicia la cadena de asistencias gravitatorias del sistema interno.',
        type: 'nominal',
      },
      {
        met: 727,
        label: 'SOBREVUELO VENUS #1',
        note: 'Primera asistencia gravitatoria de Venus.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'SOBREVUELO VENUS #2',
        note: 'Segunda asistencia gravitatoria de Venus inicia la fase de aproximación a Mercurio.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'SOBREVUELO MERCURIO #1',
        note: 'Primera de seis asistencias gravitatorias de Mercurio.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'INSERCIÓN ÓRBITA MERCURIO',
        note: 'Liberación MTM + separación del orbitador; las operaciones científicas comienzan a principios de 2027.',
        type: 'info',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: "L'Ariane 5 ECA lance BepiColombo depuis Kourou pour sa croisière ionique de 8 ans vers Mercure.",
        type: 'nominal',
      },
      {
        met: 538,
        label: 'SURVOL TERRESTRE',
        note: "Unique assistance gravitationnelle terrestre commence la chaîne d'assistances gravitationnelles du système intérieur.",
        type: 'nominal',
      },
      {
        met: 727,
        label: 'SURVOL VÉNUS #1',
        note: 'Première assistance gravitationnelle vénusienne.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'SURVOL VÉNUS #2',
        note: "Deuxième assistance gravitationnelle vénusienne commence la phase d'approche de Mercure.",
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'SURVOL MERCURE #1',
        note: 'Première de six assistances gravitationnelles mercuriennes.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'INSERTION ORBITE MERCURE',
        note: 'Largage MTM + séparation des orbiteurs ; les opérations scientifiques commencent début 2027.',
        type: 'info',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'एरियन 5 ECA बेपीकोलंबो को कोरू से मरकरी की 8-वर्षीय आयन यात्रा पर प्रक्षेपित करता है।',
        type: 'nominal',
      },
      {
        met: 538,
        label: 'पृथ्वी फ्लाईबाई',
        note: 'एकल पृथ्वी गुरुत्व सहायता आंतरिक प्रणाली की गुरुत्व सहायता श्रृंखला शुरू करती है।',
        type: 'nominal',
      },
      { met: 727, label: 'शुक्र फ्लाईबाई #1', note: 'पहली शुक्र गुरुत्व सहायता।', type: 'nominal' },
      {
        met: 1026,
        label: 'शुक्र फ्लाईबाई #2',
        note: 'दूसरी शुक्र गुरुत्व सहायता मरकरी अप्रोच चरण शुरू करती है।',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'मरकरी फ्लाईबाई #1',
        note: 'छह मरकरी गुरुत्व सहायताओं में से पहली।',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'मरकरी कक्षा प्रवेश',
        note: 'MTM रिलीज + ऑर्बिटर पृथक्करण; विज्ञान संचालन 2027 की शुरुआत में शुरू।',
        type: 'info',
      },
    ],
    it: [
      {
        met: 0,
        label: 'LANCIO',
        note: "L'Ariane 5 ECA lancia BepiColombo da Kourou per la sua crociera ionica di 8 anni verso Mercurio.",
        type: 'nominal',
      },
      {
        met: 538,
        label: 'SORVOLO TERRESTRE',
        note: 'Singola assistenza gravitazionale terrestre inizia la catena di assistenze gravitazionali del sistema interno.',
        type: 'nominal',
      },
      {
        met: 727,
        label: 'SORVOLO VENERE #1',
        note: 'Prima assistenza gravitazionale venusiana.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'SORVOLO VENERE #2',
        note: 'Seconda assistenza gravitazionale venusiana inizia la fase di avvicinamento a Mercurio.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'SORVOLO MERCURIO #1',
        note: 'Prima di sei assistenze gravitazionali mercuriane.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'INSERIMENTO ORBITA MERCURIO',
        note: 'Rilascio MTM + separazione orbiter; le operazioni scientifiche iniziano a inizio 2027.',
        type: 'info',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: 'アリアン5 ECAがベピコロンボをクールーから水星への8年間のイオン航行で打ち上げ。',
        type: 'nominal',
      },
      {
        met: 538,
        label: '地球フライバイ',
        note: '単一の地球重力アシストが内側システムの重力アシスト連鎖を開始。',
        type: 'nominal',
      },
      { met: 727, label: '金星フライバイ #1', note: '最初の金星重力アシスト。', type: 'nominal' },
      {
        met: 1026,
        label: '金星フライバイ #2',
        note: '2回目の金星重力アシストが水星接近フェーズを開始。',
        type: 'nominal',
      },
      {
        met: 1133,
        label: '水星フライバイ #1',
        note: '6回の水星重力アシストの最初。',
        type: 'nominal',
      },
      {
        met: 2968,
        label: '水星軌道投入',
        note: 'MTM分離 + オービター分離；科学運用は2027年初頭に開始。',
        type: 'info',
      },
    ],
    ko: [
      {
        met: 0,
        label: '발사',
        note: '아리안 5 ECA가 베피콜롬보를 쿠루에서 수성으로의 8년 이온 항해로 발사.',
        type: 'nominal',
      },
      {
        met: 538,
        label: '지구 플라이바이',
        note: '단일 지구 중력 도움이 내부 시스템 중력 도움 사슬을 시작.',
        type: 'nominal',
      },
      { met: 727, label: '금성 플라이바이 #1', note: '첫 금성 중력 도움.', type: 'nominal' },
      {
        met: 1026,
        label: '금성 플라이바이 #2',
        note: '두 번째 금성 중력 도움이 수성 접근 단계 시작.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: '수성 플라이바이 #1',
        note: '여섯 번의 수성 중력 도움 중 첫 번째.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: '수성 궤도 진입',
        note: 'MTM 분리 + 궤도선 분리; 과학 운영은 2027년 초에 시작.',
        type: 'info',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: 'De Ariane 5 ECA lanceert BepiColombo vanuit Kourou voor zijn 8-jarige ionreis naar Mercurius.',
        type: 'nominal',
      },
      {
        met: 538,
        label: 'AARDSCHEERVLUCHT',
        note: 'Enkele aardse zwaartekrachtassistentie begint de zwaartekrachtassistentieketen van het binnensysteem.',
        type: 'nominal',
      },
      {
        met: 727,
        label: 'VENUS-SCHEERVLUCHT #1',
        note: 'Eerste Venus-zwaartekrachtassistentie.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'VENUS-SCHEERVLUCHT #2',
        note: 'Tweede Venus-zwaartekrachtassistentie begint de Mercurius-naderingsfase.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'MERCURIUS-SCHEERVLUCHT #1',
        note: 'Eerste van zes Mercurius-zwaartekrachtassistenties.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'MERCURIUS-BAANINSERTIE',
        note: 'MTM-loslating + orbiter-scheiding; wetenschappelijke operaties beginnen begin 2027.',
        type: 'info',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'O Ariane 5 ECA lança BepiColombo de Kourou em seu cruzeiro iônico de 8 anos a Mercúrio.',
        type: 'nominal',
      },
      {
        met: 538,
        label: 'SOBREVOO TERRESTRE',
        note: 'Assistência gravitacional terrestre única inicia a cadeia de assistências gravitacionais do sistema interno.',
        type: 'nominal',
      },
      {
        met: 727,
        label: 'SOBREVOO VÊNUS #1',
        note: 'Primeira assistência gravitacional venusiana.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'SOBREVOO VÊNUS #2',
        note: 'Segunda assistência gravitacional venusiana inicia a fase de aproximação a Mercúrio.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'SOBREVOO MERCÚRIO #1',
        note: 'Primeira de seis assistências gravitacionais mercurianas.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'INSERÇÃO ÓRBITA MERCÚRIO',
        note: 'Liberação MTM + separação do orbitador; as operações científicas começam no início de 2027.',
        type: 'info',
      },
    ],
    ru: [
      {
        met: 0,
        label: 'ЗАПУСК',
        note: 'Ariane 5 ECA запускает БепиКоломбо с Куру в 8-летний ионный перелёт к Меркурию.',
        type: 'nominal',
      },
      {
        met: 538,
        label: 'ПРОЛЁТ ЗЕМЛИ',
        note: 'Единственный земной гравитационный манёвр начинает цепь гравитационных манёвров внутренней системы.',
        type: 'nominal',
      },
      {
        met: 727,
        label: 'ПРОЛЁТ ВЕНЕРЫ #1',
        note: 'Первый венерианский гравитационный манёвр.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'ПРОЛЁТ ВЕНЕРЫ #2',
        note: 'Второй венерианский гравитационный манёвр начинает фазу подхода к Меркурию.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'ПРОЛЁТ МЕРКУРИЯ #1',
        note: 'Первый из шести меркурианских гравитационных манёвров.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'ВЫХОД НА ОРБИТУ МЕРКУРИЯ',
        note: 'Отделение MTM + разделение орбитальных аппаратов; научные операции начинаются в начале 2027 г.',
        type: 'info',
      },
    ],
    'sr-Cyrl': [
      {
        met: 0,
        label: 'ЛАНСИРАЊЕ',
        note: 'Ариан 5 ECA лансира БепиКоломбо из Куруа на 8-годишњи јонски пут до Меркура.',
        type: 'nominal',
      },
      {
        met: 538,
        label: 'ЗЕМАЉСКИ ПРЕЛЕТ',
        note: 'Једна земаљска гравитациона асистенција почиње ланац гравитационих асистенција унутрашњег система.',
        type: 'nominal',
      },
      {
        met: 727,
        label: 'ВЕНЕРИН ПРЕЛЕТ #1',
        note: 'Прва венеријанска гравитациона асистенција.',
        type: 'nominal',
      },
      {
        met: 1026,
        label: 'ВЕНЕРИН ПРЕЛЕТ #2',
        note: 'Друга венеријанска гравитациона асистенција почиње фазу прилаза Меркуру.',
        type: 'nominal',
      },
      {
        met: 1133,
        label: 'МЕРКУРОВ ПРЕЛЕТ #1',
        note: 'Прва од шест Меркурових гравитационих асистенција.',
        type: 'nominal',
      },
      {
        met: 2968,
        label: 'УЛАЗАК У МЕРКУРОВУ ОРБИТУ',
        note: 'Отпуштање MTM + раздвајање орбитера; научне операције почињу почетком 2027.',
        type: 'info',
      },
    ],
    'zh-CN': [
      {
        met: 0,
        label: '发射',
        note: '阿丽亚娜5 ECA从库鲁发射贝皮科伦坡号，开始为期8年前往水星的离子航行。',
        type: 'nominal',
      },
      {
        met: 538,
        label: '地球飞掠',
        note: '单次地球引力辅助开始内部系统引力辅助链。',
        type: 'nominal',
      },
      { met: 727, label: '金星飞掠 #1', note: '首次金星引力辅助。', type: 'nominal' },
      {
        met: 1026,
        label: '金星飞掠 #2',
        note: '第二次金星引力辅助开始水星接近阶段。',
        type: 'nominal',
      },
      { met: 1133, label: '水星飞掠 #1', note: '六次水星引力辅助中的第一次。', type: 'nominal' },
      {
        met: 2968,
        label: '水星轨道进入',
        note: 'MTM分离 + 轨道器分离；科学运作于2027年初开始。',
        type: 'info',
      },
    ],
  },
  ulysses: {
    ar: [
      {
        met: 0,
        label: 'الإطلاق',
        note: 'STS-41 ديسكفري ينشر يوليسيس + المراحل العلوية IUS / PAM-S.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'مرور قريب من المشتري',
        note: 'مساعدة الجاذبية تنحرف يوليسيس ~80° خارج المسير إلى مدار قطبي بالنسبة للشمس.',
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'أول مرور قطبي جنوبي',
        note: 'أول قياسات مباشرة للرياح الشمسية فوق قطب شمسي على الإطلاق.',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'أول مرور قطبي شمالي',
        note: 'إكمال أول مدار شمسي قطبي كامل.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'نهاية المهمة',
        note: 'تجمد خطوط الدافع؛ صدر الأمر النهائي في 30 يونيو 2009.',
        type: 'info',
      },
    ],
    de: [
      {
        met: 0,
        label: 'START',
        note: 'STS-41 Discovery setzt Ulysses + IUS / PAM-S Oberstufen aus.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'JUPITERVORBEIFLUG',
        note: 'Gravitationsassistenz lenkt Ulysses ~80° aus der Ekliptik in eine polare Sonnenumlaufbahn.',
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'ERSTE SÜDPOLPASSAGE',
        note: 'Erste direkte Messungen des Sonnenwinds über einem Sonnenpol überhaupt.',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'ERSTE NORDPOLPASSAGE',
        note: 'Abschluss der ersten vollständigen polaren Sonnenumkreisung.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'MISSIONSENDE',
        note: 'Triebwerksleitungen einfrieren; letzter Befehl am 30.6.2009 erteilt.',
        type: 'info',
      },
    ],
    es: [
      {
        met: 0,
        label: 'LANZAMIENTO',
        note: 'STS-41 Discovery despliega Ulysses + etapas superiores IUS / PAM-S.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'SOBREVUELO JÚPITER',
        note: 'La asistencia gravitatoria desvía Ulysses ~80° fuera de la eclíptica a una órbita polar relativa al Sol.',
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'PRIMER PASO POLAR SUR',
        note: 'Primeras mediciones directas del viento solar sobre un polo solar.',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'PRIMER PASO POLAR NORTE',
        note: 'Finalización de la primera órbita solar polar completa.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'FIN DE MISIÓN',
        note: 'Las líneas del propulsor se congelan; comando final emitido el 30-6-2009.',
        type: 'info',
      },
    ],
    fr: [
      {
        met: 0,
        label: 'LANCEMENT',
        note: 'STS-41 Discovery déploie Ulysses + étages supérieurs IUS / PAM-S.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'SURVOL JUPITER',
        note: "L'assistance gravitationnelle dévie Ulysses ~80° hors de l'écliptique vers une orbite polaire par rapport au Soleil.",
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'PREMIER PASSAGE POLAIRE SUD',
        note: "Premières mesures directes du vent solaire au-dessus d'un pôle solaire.",
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'PREMIER PASSAGE POLAIRE NORD',
        note: 'Achèvement de la première orbite solaire polaire complète.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'FIN DE MISSION',
        note: 'Les conduites de propulseur gèlent ; commande finale émise le 30/6/2009.',
        type: 'info',
      },
    ],
    hi: [
      {
        met: 0,
        label: 'प्रक्षेपण',
        note: 'STS-41 डिस्कवरी यूलिसिस + IUS / PAM-S ऊपरी चरणों को तैनात करता है।',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'बृहस्पति फ्लाईबाई',
        note: 'गुरुत्व सहायता यूलिसिस को क्रांतिवृत्त से ~80° दूर सूर्य-सापेक्ष ध्रुवीय कक्षा में मोड़ती है।',
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'पहला दक्षिणी ध्रुवीय मार्ग',
        note: 'किसी सूर्य ध्रुव के ऊपर सौर पवन के पहले प्रत्यक्ष माप।',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'पहला उत्तरी ध्रुवीय मार्ग',
        note: 'पहले पूर्ण सौर ध्रुवीय कक्षा का समापन।',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'मिशन समाप्ति',
        note: 'थ्रस्टर लाइनें जम गईं; अंतिम कमांड 30-6-2009 को जारी।',
        type: 'info',
      },
    ],
    it: [
      {
        met: 0,
        label: 'LANCIO',
        note: 'STS-41 Discovery dispiega Ulysses + stadi superiori IUS / PAM-S.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'SORVOLO GIOVE',
        note: "L'assistenza gravitazionale devia Ulysses ~80° fuori dall'eclittica in un'orbita polare rispetto al Sole.",
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'PRIMO PASSAGGIO POLARE SUD',
        note: 'Prime misurazioni dirette del vento solare sopra un polo solare.',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'PRIMO PASSAGGIO POLARE NORD',
        note: 'Completamento della prima orbita solare polare completa.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'FINE MISSIONE',
        note: 'Le linee del propulsore si congelano; comando finale emesso il 30/6/2009.',
        type: 'info',
      },
    ],
    ja: [
      {
        met: 0,
        label: '打ち上げ',
        note: 'STS-41ディスカバリーがユリシーズ + IUS / PAM-S上段を展開。',
        type: 'nominal',
      },
      {
        met: 490,
        label: '木星フライバイ',
        note: '重力アシストがユリシーズを黄道面から約80°偏向し、太陽相対の極軌道へ。',
        type: 'nominal',
      },
      {
        met: 1359,
        label: '初の南極通過',
        note: '太陽極上の太陽風の史上初の直接測定。',
        type: 'nominal',
      },
      { met: 1758, label: '初の北極通過', note: '最初の完全な太陽極軌道の完了。', type: 'nominal' },
      {
        met: 6845,
        label: 'ミッション終了',
        note: 'スラスターラインが凍結；最終コマンドは2009年6月30日に発令。',
        type: 'info',
      },
    ],
    ko: [
      {
        met: 0,
        label: '발사',
        note: 'STS-41 디스커버리가 율리시스 + IUS / PAM-S 상단을 배치.',
        type: 'nominal',
      },
      {
        met: 490,
        label: '목성 플라이바이',
        note: '중력 도움이 율리시스를 황도면에서 ~80° 편향시켜 태양 상대 극궤도로.',
        type: 'nominal',
      },
      {
        met: 1359,
        label: '첫 남극 통과',
        note: '태양극 위 태양풍의 사상 최초의 직접 측정.',
        type: 'nominal',
      },
      { met: 1758, label: '첫 북극 통과', note: '첫 완전한 태양 극궤도의 완료.', type: 'nominal' },
      {
        met: 6845,
        label: '임무 종료',
        note: '추력기 라인이 얼음; 최종 명령은 2009-6-30 발령.',
        type: 'info',
      },
    ],
    nl: [
      {
        met: 0,
        label: 'LANCERING',
        note: 'STS-41 Discovery ontplooit Ulysses + IUS / PAM-S bovenstrappen.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'JUPITER-SCHEERVLUCHT',
        note: 'Zwaartekrachtassistentie buigt Ulysses ~80° uit de ecliptica naar een polaire Zonbetrokken baan.',
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'EERSTE ZUIDPOOLPASSAGE',
        note: 'Eerste directe metingen ooit van de zonnewind boven een zonpool.',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'EERSTE NOORDPOOLPASSAGE',
        note: 'Voltooiing van de eerste volledige polaire zonsbaan.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'MISSIE-EINDE',
        note: 'Stuwraketleidingen bevriezen; laatste commando uitgegeven op 30-6-2009.',
        type: 'info',
      },
    ],
    'pt-BR': [
      {
        met: 0,
        label: 'LANÇAMENTO',
        note: 'STS-41 Discovery implanta Ulysses + estágios superiores IUS / PAM-S.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'SOBREVOO JÚPITER',
        note: 'A assistência gravitacional desvia Ulysses ~80° fora da eclíptica em uma órbita polar relativa ao Sol.',
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'PRIMEIRA PASSAGEM POLAR SUL',
        note: 'Primeiras medições diretas do vento solar sobre um polo solar.',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'PRIMEIRA PASSAGEM POLAR NORTE',
        note: 'Conclusão da primeira órbita solar polar completa.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'FIM DE MISSÃO',
        note: 'As linhas do propulsor congelam; comando final emitido em 30-6-2009.',
        type: 'info',
      },
    ],
    ru: [
      {
        met: 0,
        label: 'ЗАПУСК',
        note: 'STS-41 Discovery развёртывает Ulysses + верхние ступени IUS / PAM-S.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'ПРОЛЁТ ЮПИТЕРА',
        note: 'Гравитационный манёвр отклоняет «Улисс» на ~80° за пределы эклиптики на полярную орбиту относительно Солнца.',
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'ПЕРВЫЙ ЮЖНЫЙ ПОЛЯРНЫЙ ПРОХОД',
        note: 'Первые прямые измерения солнечного ветра над полюсом Солнца.',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'ПЕРВЫЙ СЕВЕРНЫЙ ПОЛЯРНЫЙ ПРОХОД',
        note: 'Завершение первой полной полярной солнечной орбиты.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'ЗАВЕРШЕНИЕ МИССИИ',
        note: 'Линии двигателей замерзают; финальная команда отправлена 30.6.2009.',
        type: 'info',
      },
    ],
    'sr-Cyrl': [
      {
        met: 0,
        label: 'ЛАНСИРАЊЕ',
        note: 'STS-41 Дискавери распоређује Улис + IUS / PAM-S горње степене.',
        type: 'nominal',
      },
      {
        met: 490,
        label: 'ПРЕЛЕТ ЈУПИТЕРА',
        note: 'Гравитациона асистенција отклања Улис ~80° ван еклиптике у поларну орбиту у односу на Сунце.',
        type: 'nominal',
      },
      {
        met: 1359,
        label: 'ПРВИ ЈУЖНИ ПОЛАРНИ ПРОЛАЗАК',
        note: 'Прва директна мерења соларног ветра изнад соларног пола.',
        type: 'nominal',
      },
      {
        met: 1758,
        label: 'ПРВИ СЕВЕРНИ ПОЛАРНИ ПРОЛАЗАК',
        note: 'Завршетак прве комплетне поларне соларне орбите.',
        type: 'nominal',
      },
      {
        met: 6845,
        label: 'КРАЈ МИСИЈЕ',
        note: 'Линије потисника се замрзавају; коначна команда издата 30.6.2009.',
        type: 'info',
      },
    ],
    'zh-CN': [
      {
        met: 0,
        label: '发射',
        note: 'STS-41发现号航天飞机部署尤利西斯号 + IUS / PAM-S上级。',
        type: 'nominal',
      },
      {
        met: 490,
        label: '木星飞掠',
        note: '引力辅助使尤利西斯号偏转黄道约80°至太阳相对的极轨道。',
        type: 'nominal',
      },
      {
        met: 1359,
        label: '首次南极通过',
        note: '太阳极上方太阳风的史上首次直接测量。',
        type: 'nominal',
      },
      { met: 1758, label: '首次北极通过', note: '首次完整太阳极轨道的完成。', type: 'nominal' },
      {
        met: 6845,
        label: '任务结束',
        note: '推进器管线冻结；最终指令于2009-6-30发出。',
        type: 'info',
      },
    ],
  },
};

// Coplanar-trajectories science article body translations.
// narrative_101 = 3 paragraphs (the conversational intro).
// body_paragraphs = 3 paragraphs (the technical/historic deep-dive).
const COPLANAR_BODY = {
  ar: {
    narrative_101: [
      'قف في مركز النظام الشمسي وانظر إلى الكواكب وسترى فطيرة، لا كرة. عطارد، الزهرة، الأرض، المريخ، المشتري، زحل — كلها تدور في حدود حوالي 7° من نفس المستوى المسطح (المسير). تشكلت الكواكب من سحابة غاز وغبار دوارة واحدة، وذلك الدوران انهار وأصبح قرصاً رفيعاً. كل شيء منذ ذلك الحين بقي في ذلك القرص.',
      'الآن تخيل التخطيط لرحلة إلى المريخ. الطريقة الأرخص للوصول هناك هي قوس منحني طويل يدور حول الشمس ويصل إلى مدار المريخ في نفس اللحظة التي يكون فيها المريخ هناك. أرخص قوس يقع في نفس المستوى الذي تتشاركه الأرض والمريخ — المسير. مغادرة القرص لأخذ "انعطاف للخارج" يكلف وقوداً لا تستطيع المركبة الفضائية تحمله.',
      'لذلك لا يقاتل مخططو المهمة القرص. ينتظرون حتى تتوافق الهندسة المدارية (هذا ما يعنيه "نافذة الإطلاق")، يوجهون الصاروخ على طول المسير، ويتركون الكواكب تتولى القيادة. النتيجة، عندما تنظر إلى كل مسار مركبة فضائية لدينا، هي كومة من المنحنيات تحتضن نفس المستوى — مثل مشاهدة السيارات تتسابق على مسار مستوٍ.',
    ],
    body_paragraphs: [
      'السعر المطلوب لمغادرة المستوى وحشي. تغيير ميل مسار مركز شمسي بدرجة واحدة فقط بسرعة مدار الأرض (~30 كم/ث) يكلف حوالي 0.5 كم/ث من `∆v`. القيام بتغيير المستوى 80° الذي احتاجه يوليسيس — للطيران فوق قطبي الشمس — كان سيكلف ~38 كم/ث إذا تم بدفع كيميائي. لا يمكن لأي صاروخ حقيقي تقديم ذلك. لذا فإن المهندسين لا يدفعون مقابل تغييرات المستوى؛ يصممون حولها.',
      'المساعدات الجاذبية تخضع لنفس القيد. عندما تقذف مركبة فضائية من المشتري أو الزهرة، يجلس الكوكب في المسير، لذا فإن متجه الانحراف — الذي يمر دائماً عبر الكوكب — يبقي المسار قريباً من المسير أيضاً. تبدو رحلة كاسيني التي استغرقت ست سنوات وكأنها رسم ثنائي الأبعاد في عرض /explore لأن كل جسم مساعد زارته كان ثنائي الأبعاد.',
      'يوليسيس هو المركبة الفضائية الوحيدة التي كسرت القرص عمداً. كان هدفها العلمي قطبي الشمس، لكن الوصول إليها تطلب ~80° من الميل — مستحيل كيميائياً. لذا فعلت المهمة الشيء الوحيد الذي نجح: أُطلقت إلى الخارج نحو المشتري، استخدمت جاذبية المشتري كـ"صاروخ" مجاني لانحراف المركبة الفضائية خارج المسير، ثم دارت حول الشمس من قطب إلى قطب لمدة 18 سنة. كان الانعطاف الكبير هو الطريق الأرخص. كل مهمة فضاء عميق أخرى تراها في /explore بقيت في القرص لأن القرص هو حيث الوجهات — وحيث يسمح لك الوقود بالذهاب.',
    ],
  },
  de: {
    narrative_101: [
      'Stell dich ins Zentrum des Sonnensystems und schau dir die Planeten an — du siehst einen Pfannkuchen, keine Kugel. Merkur, Venus, Erde, Mars, Jupiter, Saturn — sie alle umkreisen innerhalb von etwa 7° derselben flachen Ebene (der Ekliptik). Die Planeten entstanden aus einer einzigen rotierenden Gas-und-Staub-Wolke, und diese Rotation kollabierte alles zu einer dünnen Scheibe. Alles seitdem ist in dieser Scheibe geblieben.',
      'Stell dir nun vor, eine Reise zum Mars zu planen. Der billigste Weg dorthin ist ein langer gebogener Bogen, der um die Sonne führt und an der Marsbahn ankommt, genau in dem Moment, in dem der Mars dort ist. Der billigste Bogen liegt in derselben Ebene, die Erde und Mars teilen — der Ekliptik. Die Scheibe zu verlassen für einen "Umweg nach oben" kostet Treibstoff, den die Raumsonde sich nicht leisten kann.',
      'Also kämpfen Missionsplaner nicht gegen die Scheibe. Sie warten, bis die Orbitalgeometrie passt (das bedeutet "Startfenster"), richten die Rakete entlang der Ekliptik aus und lassen die Planeten steuern. Das Ergebnis: Wenn man sich jede Raumsondentrajektorie ansieht, die wir haben, sieht man einen Haufen Kurven, die alle dieselbe Ebene umarmen — wie Autos, die auf einer flachen Bahn rennen.',
    ],
    body_paragraphs: [
      'Der Preis dafür, die Ebene zu verlassen, ist brutal. Eine heliozentrische Trajektorie um nur 1° zu kippen, kostet bei Erdumlaufgeschwindigkeit (~30 km/s) etwa 0,5 km/s `∆v`. Die 80°-Bahnänderung, die Ulysses brauchte — um über die Sonnenpole zu fliegen — hätte ~38 km/s gekostet, wenn sie chemisch durchgeführt worden wäre. Keine echte Rakete kann das liefern. Daher zahlen Ingenieure nicht für Bahnänderungen; sie umgehen sie konstruktiv.',
      'Gravitationsassistenzen unterliegen derselben Einschränkung. Wenn eine Raumsonde an Jupiter oder Venus vorbeischwingt, sitzt der Planet in der Ekliptik, sodass der Ablenkungsvektor — der immer durch den Planeten verläuft — auch die Trajektorie nahe der Ekliptik hält. Cassinis sechsjährige Reise sieht in der /explore-Ansicht wie ein 2D-Gekritzel aus, weil jeder Assistenz-Körper, den sie besuchte, 2D-flach war.',
      'Ulysses ist die einzige Raumsonde, die die Scheibe absichtlich gebrochen hat. Ihr Wissenschaftsziel waren die Sonnenpole, aber sie zu erreichen erforderte ~80° Inklination — chemisch unmöglich. Die Mission tat also das Einzige, was funktionierte: gestartet nach außen zum Jupiter, nutzte Jupiters Gravitation als kostenlose "Rakete", um die Sonde aus der Ekliptik zu lenken, dann umkreiste sie die Sonne 18 Jahre lang von Pol zu Pol. Der große Umweg war der billigste Weg. Jede andere Tiefraummission, die du in /explore siehst, blieb in der Scheibe, weil die Scheibe dort ist, wo die Ziele sind — und wohin der Treibstoff dich gehen lässt.',
    ],
  },
  es: {
    narrative_101: [
      'Párate en el centro del Sistema Solar y mira los planetas — verás un panqueque, no una esfera. Mercurio, Venus, Tierra, Marte, Júpiter, Saturno — todos orbitan dentro de unos 7° del mismo plano plano (la eclíptica). Los planetas se formaron de una sola nube giratoria de gas y polvo, y esa rotación colapsó todo en un disco delgado. Todo desde entonces se ha quedado en ese disco.',
      'Ahora imagina planear un viaje a Marte. La forma más barata de llegar allí es un largo arco curvado que rodea el Sol y llega a la órbita de Marte en el mismo momento en que Marte está allí. El arco más barato está en el mismo plano que Tierra y Marte comparten — la eclíptica. Salir del disco para hacer un "desvío hacia afuera" cuesta propulsor que la nave no puede pagar.',
      'Así que los planificadores de misión no luchan contra el disco. Esperan a que la geometría orbital se alinee (eso es lo que significa "ventana de lanzamiento"), apuntan el cohete a lo largo de la eclíptica y dejan que los planetas se encarguen de la dirección. El resultado, cuando miras cada trayectoria de nave espacial que tenemos, es una pila de curvas todas abrazando el mismo plano — como ver autos correr en una pista plana.',
    ],
    body_paragraphs: [
      'El precio de salir del plano es brutal. Cambiar la inclinación de una trayectoria heliocéntrica por incluso 1° a la velocidad orbital de la Tierra (~30 km/s) cuesta aproximadamente 0,5 km/s de `∆v`. Hacer el cambio de plano de 80° que Ulysses necesitó — para volar sobre los polos del Sol — habría costado ~38 km/s si se hubiera hecho con empuje químico. Ningún cohete real puede entregar eso. Así que los ingenieros no pagan por cambios de plano; diseñan alrededor de ellos.',
      'Las asistencias gravitatorias obedecen la misma restricción. Cuando una nave gira en torno a Júpiter o Venus, el planeta se sienta en la eclíptica, por lo que el vector de desviación — que siempre pasa a través del planeta — mantiene la trayectoria cerca de la eclíptica también. El crucero de seis años de Cassini parece un garabato 2D en la vista de /explore porque cada cuerpo de asistencia que visitó era 2D plano.',
      'Ulysses es la única nave que rompió el disco a propósito. Su objetivo científico eran los polos del Sol, pero alcanzarlos requería ~80° de inclinación — químicamente imposible. Así que la misión hizo lo único que funcionó: lanzó hacia afuera a Júpiter, usó la gravedad de Júpiter como un "cohete" gratis para desviar la nave fuera de la eclíptica, luego orbitó el Sol de polo a polo durante 18 años. El gran desvío era el camino más barato. Cada otra misión de espacio profundo que ves en /explore se quedó en el disco porque el disco es donde están los destinos — y donde el propulsor te permite ir.',
    ],
  },
  fr: {
    narrative_101: [
      "Tiens-toi au centre du Système solaire et regarde les planètes — tu verras une crêpe, pas une sphère. Mercure, Vénus, Terre, Mars, Jupiter, Saturne — toutes orbitent à environ 7° du même plan plat (l'écliptique). Les planètes se sont formées à partir d'un seul nuage tournant de gaz et de poussière, et cette rotation a tout effondré en un disque mince. Tout depuis est resté dans ce disque.",
      "Maintenant imagine planifier un voyage vers Mars. La façon la moins chère d'y aller est un long arc courbé qui contourne le Soleil et arrive à l'orbite de Mars au moment même où Mars y est. L'arc le moins cher se trouve dans le même plan que la Terre et Mars partagent — l'écliptique. Quitter le disque pour faire un \"détour vers l'extérieur\" coûte du carburant que le vaisseau ne peut pas se permettre.",
      "Donc les planificateurs de mission ne combattent pas le disque. Ils attendent que la géométrie orbitale s'aligne (c'est ce que signifie \"fenêtre de lancement\"), pointent la fusée le long de l'écliptique et laissent les planètes gérer la direction. Le résultat, quand tu regardes chaque trajectoire de vaisseau spatial que nous avons, est un tas de courbes toutes embrassant le même plan — comme regarder des voitures courir sur une piste plate.",
    ],
    body_paragraphs: [
      "Le prix à payer pour quitter le plan est brutal. Changer l'inclinaison d'une trajectoire héliocentrique d'à peine 1° à la vitesse orbitale terrestre (~30 km/s) coûte environ 0,5 km/s de `∆v`. Faire le changement de plan de 80° dont Ulysses avait besoin — pour survoler les pôles solaires — aurait coûté ~38 km/s si fait avec une poussée chimique. Aucune fusée réelle ne peut livrer cela. Donc les ingénieurs ne paient pas pour les changements de plan ; ils conçoivent autour.",
      "Les assistances gravitationnelles obéissent à la même contrainte. Quand un vaisseau spatial lance autour de Jupiter ou Vénus, la planète se trouve dans l'écliptique, donc le vecteur de déviation — qui passe toujours par la planète — garde aussi la trajectoire proche de l'écliptique. La croisière de six ans de Cassini ressemble à un gribouillis 2D dans la vue /explore parce que chaque corps d'assistance qu'elle a visité était 2D plat.",
      "Ulysses est le seul vaisseau qui a brisé le disque exprès. Sa cible scientifique était les pôles du Soleil, mais les atteindre nécessitait ~80° d'inclinaison — chimiquement impossible. Donc la mission a fait la seule chose qui fonctionnait : lancée vers l'extérieur vers Jupiter, utilisé la gravité de Jupiter comme une \"fusée\" gratuite pour dévier le vaisseau hors de l'écliptique, puis a orbité le Soleil de pôle à pôle pendant 18 ans. Le grand détour était le chemin le moins cher. Chaque autre mission d'espace lointain que tu vois dans /explore est restée dans le disque parce que le disque est là où sont les destinations — et où le carburant te permet d'aller.",
    ],
  },
  hi: {
    narrative_101: [
      'सौर मंडल के केंद्र में खड़े हो जाओ और ग्रहों को देखो — तुम्हें एक पैनकेक दिखेगा, गोला नहीं। बुध, शुक्र, पृथ्वी, मंगल, बृहस्पति, शनि — सभी एक ही समतल विमान (क्रांतिवृत्त) के लगभग 7° के भीतर परिक्रमा करते हैं। ग्रह एक ही घूमते गैस-और-धूल बादल से बने थे, और उस घूर्णन ने सब कुछ एक पतली डिस्क में ढह दिया। तब से सब कुछ उस डिस्क में रहा है।',
      'अब मंगल की यात्रा की योजना बनाने की कल्पना करो। वहां जाने का सबसे सस्ता तरीका एक लंबा घुमावदार चाप है जो सूर्य के चारों ओर जाता है और मंगल की कक्षा में उसी क्षण पहुंचता है जब मंगल वहां है। सबसे सस्ता चाप उसी विमान में है जो पृथ्वी और मंगल साझा करते हैं — क्रांतिवृत्त। डिस्क छोड़कर "बाहर और ऊपर मोड़" लेना ईंधन खर्च करता है जो अंतरिक्षयान वहन नहीं कर सकता।',
      'इसलिए मिशन योजनाकार डिस्क से नहीं लड़ते। वे तब तक प्रतीक्षा करते हैं जब तक कि कक्षीय ज्यामिति संरेखित न हो जाए (इसका मतलब है "लॉन्च विंडो"), रॉकेट को क्रांतिवृत्त के साथ इंगित करते हैं, और ग्रहों को संचालन का प्रबंधन करने देते हैं। परिणाम, जब आप हमारे पास हर अंतरिक्षयान प्रक्षेपपथ को देखते हैं, एक ही विमान को गले लगाने वाले वक्रों का ढेर है — जैसे कारों को एक समतल ट्रैक पर दौड़ते देखना।',
    ],
    body_paragraphs: [
      'विमान छोड़ने की कीमत क्रूर है। पृथ्वी की कक्षीय गति (~30 किमी/से) पर सिर्फ 1° से सूर्यकेंद्रित प्रक्षेपपथ का झुकाव बदलने में लगभग 0.5 किमी/से `∆v` खर्च होता है। यूलिसिस को आवश्यक 80° विमान परिवर्तन — सूर्य के ध्रुवों पर उड़ने के लिए — रासायनिक रूप से किया जाता तो ~38 किमी/से खर्च होता। कोई वास्तविक रॉकेट यह वितरित नहीं कर सकता। इसलिए इंजीनियर विमान परिवर्तनों के लिए भुगतान नहीं करते; वे उनके आसपास डिज़ाइन करते हैं।',
      'गुरुत्व सहायताएं उसी बाधा का पालन करती हैं। जब एक अंतरिक्षयान बृहस्पति या शुक्र के पास घूमता है, ग्रह क्रांतिवृत्त में बैठता है, इसलिए विक्षेपण वेक्टर — जो हमेशा ग्रह से होकर गुजरता है — प्रक्षेपपथ को भी क्रांतिवृत्त के पास रखता है। कैसिनी की छह साल की यात्रा /explore दृश्य में 2D डूडल जैसी दिखती है क्योंकि हर सहायक निकाय जो उसने दौरा किया वह 2D-फ्लैट था।',
      'यूलिसिस एकमात्र अंतरिक्षयान है जिसने जानबूझकर डिस्क तोड़ी। इसका विज्ञान लक्ष्य सूर्य के ध्रुव थे, लेकिन उन तक पहुंचने के लिए ~80° झुकाव की आवश्यकता थी — रासायनिक रूप से असंभव। इसलिए मिशन ने केवल वही किया जो काम किया: बृहस्पति की ओर बाहर लॉन्च किया, अंतरिक्षयान को क्रांतिवृत्त से बाहर मोड़ने के लिए बृहस्पति के गुरुत्वाकर्षण को मुफ्त "रॉकेट" के रूप में उपयोग किया, फिर 18 साल तक ध्रुव-से-ध्रुव सूर्य की परिक्रमा की। बड़ा चक्कर सबसे सस्ता रास्ता था। /explore में आप जो भी अन्य गहरे अंतरिक्ष मिशन देखते हैं वह डिस्क में रहा क्योंकि डिस्क वह जगह है जहां गंतव्य हैं — और जहां ईंधन आपको जाने देता है।',
    ],
  },
  it: {
    narrative_101: [
      "Mettiti al centro del Sistema Solare e guarda i pianeti — vedrai una frittella, non una sfera. Mercurio, Venere, Terra, Marte, Giove, Saturno — tutti orbitano entro circa 7° dallo stesso piano piatto (l'eclittica). I pianeti si sono formati da una singola nube rotante di gas e polvere, e quella rotazione ha collassato tutto in un disco sottile. Tutto da allora è rimasto in quel disco.",
      "Ora immagina di pianificare un viaggio su Marte. Il modo più economico per arrivarci è un lungo arco curvo che gira intorno al Sole e arriva all'orbita di Marte nello stesso momento in cui Marte è lì. L'arco più economico giace nello stesso piano condiviso da Terra e Marte — l'eclittica. Lasciare il disco per prendere una \"deviazione fuori e sopra\" costa propellente che il veicolo non può permettersi.",
      'Quindi i pianificatori di missione non combattono il disco. Aspettano che la geometria orbitale si allinei (è ciò che significa "finestra di lancio"), puntano il razzo lungo l\'eclittica e lasciano che i pianeti gestiscano lo sterzo. Il risultato, quando guardi ogni traiettoria di veicolo spaziale che abbiamo, è una pila di curve tutte abbracciate allo stesso piano — come guardare auto correre su una pista piatta.',
    ],
    body_paragraphs: [
      "Il prezzo da pagare per lasciare il piano è brutale. Cambiare l'inclinazione di una traiettoria eliocentrica anche solo di 1° alla velocità orbitale terrestre (~30 km/s) costa circa 0,5 km/s di `∆v`. Fare il cambio di piano di 80° di cui Ulysses aveva bisogno — per sorvolare i poli solari — sarebbe costato ~38 km/s se fatto con spinta chimica. Nessun razzo reale può fornirlo. Quindi gli ingegneri non pagano per i cambi di piano; progettano attorno ad essi.",
      "Le assistenze gravitazionali obbediscono allo stesso vincolo. Quando un veicolo spaziale fa una fionda attorno a Giove o Venere, il pianeta sta nell'eclittica, quindi il vettore di deflessione — che passa sempre attraverso il pianeta — mantiene anche la traiettoria vicina all'eclittica. La crociera di sei anni di Cassini sembra uno scarabocchio 2D nella vista /explore perché ogni corpo di assistenza che ha visitato era 2D piatto.",
      "Ulysses è l'unico veicolo spaziale che ha rotto il disco di proposito. Il suo obiettivo scientifico erano i poli del Sole, ma raggiungerli richiedeva ~80° di inclinazione — chimicamente impossibile. Quindi la missione ha fatto l'unica cosa che funzionava: lanciata verso l'esterno verso Giove, ha usato la gravità di Giove come \"razzo\" gratuito per deviare il veicolo fuori dall'eclittica, poi ha orbitato il Sole da polo a polo per 18 anni. La grande deviazione era il percorso più economico. Ogni altra missione di spazio profondo che vedi in /explore è rimasta nel disco perché il disco è dove sono le destinazioni — e dove il propellente ti permette di andare.",
    ],
  },
  ja: {
    narrative_101: [
      '太陽系の中心に立って惑星を見ると、球ではなくパンケーキが見えます。水星、金星、地球、火星、木星、土星 — 全ての惑星は同じ平らな平面（黄道）から約7°以内を周回しています。惑星は単一の回転するガスと塵の雲から形成され、その回転が全てを薄い円盤に崩壊させました。それ以来、全ては円盤の中に留まっています。',
      '今、火星への旅を計画することを想像してみてください。そこに行く最も安い方法は、太陽の周りを回り、火星がそこにいる瞬間に火星の軌道に到着する長い湾曲した弧です。最も安い弧は、地球と火星が共有する同じ平面 — 黄道 — にあります。「外へそして上へ」迂回するために円盤を離れることは、宇宙船が払えない推進剤を消費します。',
      'だからミッションプランナーは円盤と戦いません。軌道幾何学が整列するまで待ち（それが「打ち上げウィンドウ」の意味）、ロケットを黄道に沿って向け、惑星に操縦を任せます。結果として、私たちが持っている全ての宇宙船軌道を見ると、全て同じ平面に抱きつく曲線の山 — 平らなトラックでレースをしている車を見るかのよう。',
    ],
    body_paragraphs: [
      '平面を離れる代償は残酷です。地球の軌道速度（~30 km/s）で日心軌道の傾斜を1°変えるだけでも、約0.5 km/sの`∆v`がかかります。ユリシーズが必要とした80°の平面変更 — 太陽の極を飛ぶため — を化学推進で行うと、~38 km/sかかったでしょう。実際のロケットでそれを供給することはできません。だからエンジニアは平面変更にお金を払いません；その周りを設計します。',
      '重力アシストも同じ制約に従います。宇宙船が木星や金星の周りでスリングショットすると、惑星は黄道にあるので、偏向ベクトル — 常に惑星を通る — も軌道を黄道近くに保ちます。カッシーニの6年の航行は、/exploreビューで2Dの落書きのように見えます。なぜなら訪問した全てのアシスト天体が2D平らだったからです。',
      'ユリシーズは意図的に円盤を破った唯一の宇宙船です。科学目標は太陽の極でしたが、それらに到達するには~80°の傾斜が必要 — 化学的には不可能。そこでミッションは唯一機能することをしました：木星に向かって外側に打ち上げ、木星の重力を無料の「ロケット」として使って宇宙船を黄道から逸らし、その後18年間極から極へ太陽を周回しました。大きな迂回が最も安い道でした。/exploreで見る他の全ての深宇宙ミッションは円盤に留まりました。なぜなら円盤は目的地がある場所であり — そして推進剤があなたを行かせる場所だからです。',
    ],
  },
  ko: {
    narrative_101: [
      '태양계 중심에 서서 행성들을 보면 구체가 아닌 팬케이크가 보입니다. 수성, 금성, 지구, 화성, 목성, 토성 — 모두 같은 평평한 평면(황도)에서 약 7° 이내로 공전합니다. 행성들은 단일 회전하는 가스 및 먼지 구름에서 형성되었고, 그 회전이 모든 것을 얇은 원반으로 붕괴시켰습니다. 그 이후로 모든 것은 그 원반에 머물러 있습니다.',
      '이제 화성으로의 여행을 계획하는 것을 상상해 보세요. 그곳에 가는 가장 저렴한 방법은 태양 주위를 돌고 화성이 그곳에 있는 바로 그 순간에 화성 궤도에 도착하는 긴 곡선 호입니다. 가장 저렴한 호는 지구와 화성이 공유하는 같은 평면 — 황도 — 에 있습니다. "밖과 위로 우회"하기 위해 원반을 떠나는 것은 우주선이 감당할 수 없는 추진제를 소비합니다.',
      '그래서 임무 계획자들은 원반과 싸우지 않습니다. 궤도 기하학이 정렬될 때까지 기다리고("발사 창"의 의미), 로켓을 황도를 따라 가리키며, 행성들이 조향을 처리하게 합니다. 결과적으로, 우리가 가진 모든 우주선 궤적을 보면, 모두 같은 평면을 끌어안은 곡선들의 더미가 됩니다 — 평평한 트랙에서 자동차들이 경주하는 것을 보는 것과 같습니다.',
    ],
    body_paragraphs: [
      '평면을 떠나는 비용은 잔인합니다. 지구의 궤도 속도(~30 km/s)에서 일심 궤적의 경사를 단 1°만 변경하는 데도 약 0.5 km/s의 `∆v`가 듭니다. 율리시스가 필요로 했던 80° 평면 변경 — 태양의 극을 비행하기 위한 — 을 화학 추진으로 한다면 ~38 km/s가 들었을 것입니다. 어떤 실제 로켓도 그것을 제공할 수 없습니다. 그래서 엔지니어들은 평면 변경에 비용을 지불하지 않습니다; 그 주위를 설계합니다.',
      '중력 도움은 같은 제약을 따릅니다. 우주선이 목성이나 금성 주위에서 슬링샷할 때, 행성은 황도에 앉아 있어서 편향 벡터 — 항상 행성을 통과하는 — 도 궤적을 황도 근처에 유지합니다. 카시니의 6년 항해는 /explore 뷰에서 2D 낙서처럼 보입니다. 방문한 모든 도움 천체가 2D 평평했기 때문입니다.',
      '율리시스는 의도적으로 원반을 깨뜨린 유일한 우주선입니다. 과학 목표는 태양의 극이었지만, 그것들에 도달하려면 ~80° 경사가 필요했습니다 — 화학적으로 불가능합니다. 그래서 임무는 작동하는 유일한 일을 했습니다: 목성을 향해 외부로 발사하고, 목성의 중력을 무료 "로켓"으로 사용하여 우주선을 황도에서 편향시키고, 그 후 18년 동안 극에서 극으로 태양을 공전했습니다. 큰 우회가 가장 저렴한 길이었습니다. /explore에서 보는 다른 모든 심우주 임무는 원반에 머물렀습니다. 원반은 목적지가 있는 곳이며 — 추진제가 당신을 갈 수 있게 하는 곳이기 때문입니다.',
    ],
  },
  nl: {
    narrative_101: [
      'Sta in het centrum van het zonnestelsel en kijk naar de planeten — je ziet een pannenkoek, geen bol. Mercurius, Venus, Aarde, Mars, Jupiter, Saturnus — ze cirkelen allemaal binnen ongeveer 7° van hetzelfde vlakke vlak (de ecliptica). De planeten ontstonden uit één draaiende gas- en stofwolk, en die rotatie deed alles instorten tot een dunne schijf. Alles sindsdien is in die schijf gebleven.',
      'Stel je nu voor dat je een reis naar Mars plant. De goedkoopste manier om er te komen is een lange gebogen boog rond de Zon die op het Marsbaanaankomstmoment aankomt wanneer Mars er ook is. De goedkoopste boog ligt in hetzelfde vlak dat Aarde en Mars delen — de ecliptica. De schijf verlaten om een "omweg naar buiten en boven" te nemen kost stuwstof die het ruimtevaartuig zich niet kan veroorloven.',
      'Dus missieplanners vechten niet tegen de schijf. Ze wachten tot de baangeometrie uitlijnt (dat is wat "lanceervenster" betekent), richten de raket langs de ecliptica en laten de planeten de besturing afhandelen. Het resultaat, wanneer je naar elk ruimtevaartuigtraject kijkt dat we hebben, is een hoop bogen die allemaal hetzelfde vlak omhelzen — als auto\'s die racen op een vlakke baan.',
    ],
    body_paragraphs: [
      'De prijs voor het verlaten van het vlak is brutaal. De inclinatie van een heliocentrisch traject met slechts 1° wijzigen bij de baansnelheid van de Aarde (~30 km/s) kost ongeveer 0,5 km/s `∆v`. De 80°-baanwijziging die Ulysses nodig had — om over de zonpolen te vliegen — zou ~38 km/s hebben gekost als het met chemische stuwkracht was gedaan. Geen echte raket kan dat leveren. Dus ingenieurs betalen niet voor baanwijzigingen; ze ontwerpen eromheen.',
      "Zwaartekrachtassistenties gehoorzamen dezelfde beperking. Wanneer een ruimtevaartuig rond Jupiter of Venus zwaait, zit de planeet in de ecliptica, dus de afbuigingsvector — die altijd door de planeet gaat — houdt het traject ook dicht bij de ecliptica. Cassini's zesjarige reis ziet eruit als een 2D-krabbel in de /explore-weergave omdat elk assistentielichaam dat het bezocht 2D-vlak was.",
      'Ulysses is het enige ruimtevaartuig dat de schijf opzettelijk heeft gebroken. Zijn wetenschappelijke doel waren de Zonpolen, maar om die te bereiken was ~80° inclinatie nodig — chemisch onmogelijk. Dus deed de missie het enige dat werkte: gelanceerd naar buiten naar Jupiter, gebruikte Jupiters zwaartekracht als een gratis "raket" om het ruimtevaartuig uit de ecliptica te buigen, en omcirkelde toen de Zon pool-tot-pool gedurende 18 jaar. De grote omweg was de goedkoopste route. Elke andere diepruimtemissie die je in /explore ziet, bleef in de schijf omdat de schijf is waar de bestemmingen zijn — en waar de stuwstof je laat gaan.',
    ],
  },
  'pt-BR': {
    narrative_101: [
      'Fique no centro do Sistema Solar e olhe para os planetas — você verá uma panqueca, não uma esfera. Mercúrio, Vênus, Terra, Marte, Júpiter, Saturno — todos orbitam dentro de cerca de 7° do mesmo plano plano (a eclíptica). Os planetas se formaram de uma única nuvem rotativa de gás e poeira, e essa rotação colapsou tudo em um disco fino. Tudo desde então ficou nesse disco.',
      'Agora imagine planejar uma viagem a Marte. A forma mais barata de chegar lá é um longo arco curvo que dá a volta no Sol e chega à órbita de Marte no mesmo momento em que Marte está lá. O arco mais barato fica no mesmo plano que a Terra e Marte compartilham — a eclíptica. Sair do disco para fazer um "desvio para fora e para cima" custa propelente que a espaçonave não pode pagar.',
      'Então os planejadores de missão não lutam contra o disco. Eles esperam que a geometria orbital se alinhe (é o que significa "janela de lançamento"), apontam o foguete ao longo da eclíptica e deixam os planetas cuidarem da direção. O resultado, quando você olha para cada trajetória de espaçonave que temos, é uma pilha de curvas todas abraçando o mesmo plano — como ver carros correndo em uma pista plana.',
    ],
    body_paragraphs: [
      'O preço por sair do plano é brutal. Mudar a inclinação de uma trajetória heliocêntrica em apenas 1° na velocidade orbital da Terra (~30 km/s) custa cerca de 0,5 km/s de `∆v`. Fazer a mudança de plano de 80° que a Ulysses precisava — para voar sobre os polos solares — teria custado ~38 km/s se feita com empuxo químico. Nenhum foguete real pode entregar isso. Então os engenheiros não pagam por mudanças de plano; eles projetam ao redor delas.',
      'As assistências gravitacionais obedecem à mesma restrição. Quando uma espaçonave faz uma manobra ao redor de Júpiter ou Vênus, o planeta está na eclíptica, então o vetor de deflexão — que sempre passa pelo planeta — também mantém a trajetória perto da eclíptica. O cruzeiro de seis anos da Cassini parece um rabisco 2D na visão /explore porque cada corpo de assistência que visitou era 2D plano.',
      'A Ulysses é a única espaçonave que quebrou o disco de propósito. Seu objetivo científico eram os polos do Sol, mas alcançá-los exigia ~80° de inclinação — quimicamente impossível. Então a missão fez a única coisa que funcionou: lançou para fora em direção a Júpiter, usou a gravidade de Júpiter como um "foguete" gratuito para desviar a espaçonave para fora da eclíptica, depois orbitou o Sol de polo a polo por 18 anos. O grande desvio era o caminho mais barato. Toda outra missão de espaço profundo que você vê em /explore ficou no disco porque o disco é onde estão os destinos — e onde o propelente permite que você vá.',
    ],
  },
  ru: {
    narrative_101: [
      'Встаньте в центре Солнечной системы и посмотрите на планеты — вы увидите блин, а не шар. Меркурий, Венера, Земля, Марс, Юпитер, Сатурн — все они вращаются в пределах примерно 7° от той же плоской плоскости (эклиптики). Планеты сформировались из единого вращающегося облака газа и пыли, и это вращение сжало всё в тонкий диск. Всё с тех пор остаётся в этом диске.',
      'Теперь представьте, что планируете путешествие к Марсу. Самый дешёвый способ туда попасть — это длинная изогнутая дуга, которая огибает Солнце и прибывает к орбите Марса в тот же момент, когда там находится Марс. Самая дешёвая дуга лежит в той же плоскости, которую разделяют Земля и Марс — в эклиптике. Покинуть диск, чтобы сделать «обход наружу и вверх», стоит топлива, которое космический аппарат не может себе позволить.',
      'Поэтому планировщики миссий не борются с диском. Они ждут, когда орбитальная геометрия выровняется (это и означает «стартовое окно»), наводят ракету вдоль эклиптики и предоставляют планетам управлять направлением. В итоге, если посмотреть на каждую траекторию космического аппарата, которая у нас есть, видна груда кривых, обнимающих ту же плоскость — как машины, гоняющиеся на плоском треке.',
    ],
    body_paragraphs: [
      'Цена за выход из плоскости жестока. Изменение наклонения гелиоцентрической траектории всего на 1° при орбитальной скорости Земли (~30 км/с) стоит около 0,5 км/с `∆v`. 80°-ная смена плоскости, которая была нужна «Улиссу» — чтобы пролететь над полюсами Солнца — стоила бы ~38 км/с, если бы делалась химической тягой. Ни одна реальная ракета не может это обеспечить. Поэтому инженеры не платят за смену плоскости; они проектируют обходя её.',
      'Гравитационные манёвры подчиняются тому же ограничению. Когда космический аппарат совершает облёт Юпитера или Венеры, планета находится в эклиптике, поэтому вектор отклонения — который всегда проходит через планету — тоже держит траекторию вблизи эклиптики. Шестилетний перелёт «Кассини» выглядит как 2D-каракули в виде /explore, потому что каждое тело-помощник, которое он посетил, было плоско-2D.',
      '«Улисс» — единственный космический аппарат, который намеренно сломал диск. Его научной целью были полюса Солнца, но достижение их требовало ~80° наклонения — химически невозможно. Поэтому миссия сделала единственное, что сработало: запущена наружу к Юпитеру, использовала гравитацию Юпитера как бесплатную «ракету» для отклонения аппарата за пределы эклиптики, затем вращалась вокруг Солнца от полюса к полюсу 18 лет. Большой обход был самым дешёвым путём. Каждая другая дальнекосмическая миссия, которую вы видите в /explore, осталась в диске, потому что диск — это там, где находятся пункты назначения, и куда топливо позволяет вам отправиться.',
    ],
  },
  'sr-Cyrl': {
    narrative_101: [
      'Станите у центру Сунчевог система и погледајте планете — видећете палачинку, а не лопту. Меркур, Венера, Земља, Марс, Јупитер, Сатурн — све орбитирају у оквиру око 7° од исте равне равни (еклиптике). Планете су се формирале од јединственог ротирајућег облака гаса и прашине, а та ротација је све урушила у танак диск. Све од тада је остало у том диску.',
      'Сада замислите планирање путовања на Марс. Најјефтинији начин да тамо стигнете је дугачак закривљени лук који иде око Сунца и стиже до Марсове орбите у истом тренутку када је Марс тамо. Најјефтинији лук лежи у истој равни коју деле Земља и Марс — еклиптици. Напуштање диска ради "обилазног пута напоље и горе" кошта горива које летелица не може себи приуштити.',
      'Зато планери мисија не боре се против диска. Чекају да се орбитална геометрија поравна (то значи "лансирни прозор"), усмеравају ракету дуж еклиптике и пуштају планете да управљају. Резултат, када погледате сваку путању летелице коју имамо, гомила је кривих које све грле исту раван — као гледање аутомобила како се такмиче на равној стази.',
    ],
    body_paragraphs: [
      'Цена напуштања равни је брутална. Промена нагиба хелиоцентричне путање само за 1° при Земљиној орбиталној брзини (~30 km/s) кошта око 0,5 km/s `∆v`. 80° промена равни коју је Улис требао — да би летео изнад соларних полова — коштала би ~38 km/s ако би се радила хемијским погоном. Ниједна стварна ракета не може то испоручити. Зато инжењери не плаћају за промене равни; пројектују око њих.',
      'Гравитационе асистенције подлежу истом ограничењу. Када летелица направи прашком око Јупитера или Венере, планета седи у еклиптици, тако да вектор отклањања — који увек пролази кроз планету — такође држи путању близу еклиптике. Шестогодишњи пут Касинија изгледа као 2D шара у /explore приказу јер је свако асистенцијско тело које је посетило било 2D-равно.',
      'Улис је једина летелица која је намерно сломила диск. Његов научни циљ су били Сунчеви полови, али да би се до њих стигло било је потребно ~80° нагиба — хемијски немогуће. Зато је мисија урадила једину ствар која је радила: лансирала је напоље ка Јупитеру, користила Јупитерову гравитацију као бесплатну "ракету" да отклони летелицу из еклиптике, па је орбитирала око Сунца од пола до пола током 18 година. Велики обилаз је био најјефтинији пут. Свака друга дубоко-свемирска мисија коју видите у /explore остала је у диску јер диск је место где су одредишта — и где гориво дозвољава да идете.',
    ],
  },
  'zh-CN': {
    narrative_101: [
      '站在太阳系中心看行星 — 你会看到一个煎饼，不是球体。水星、金星、地球、火星、木星、土星 — 所有行星都在同一个平面（黄道）的约7°范围内运行。行星是由单个旋转的气体和尘埃云形成的，那种旋转将一切坍缩成一个薄圆盘。从那以后一切都留在那个圆盘中。',
      '现在想象规划一次火星之旅。最便宜的方法是一个长长的弯曲弧线，绕过太阳并在火星位于那里的同一时刻到达火星轨道。最便宜的弧线位于地球和火星共享的同一平面 — 黄道。离开圆盘进行"向外和向上的弯路"会消耗航天器无法承受的推进剂。',
      '所以任务规划者不与圆盘对抗。他们等待轨道几何排列（这就是"发射窗口"的含义），将火箭沿着黄道指向，并让行星处理转向。结果，当你查看我们拥有的每条航天器轨迹时，会看到一堆都拥抱同一平面的曲线 — 就像看汽车在平坦的赛道上比赛。',
    ],
    body_paragraphs: [
      '离开平面的代价是残酷的。在地球轨道速度（~30 km/s）下将日心轨迹的倾角改变仅1°就需要约0.5 km/s的`∆v`。如果用化学推进进行尤利西斯号所需的80°平面变化 — 飞越太阳极 — 将耗资~38 km/s。任何实际火箭都无法提供。所以工程师们不会为平面变化付费；他们围绕它们设计。',
      '引力辅助遵循相同的约束。当航天器绕木星或金星甩动时，行星位于黄道中，所以偏转向量 — 始终通过行星 — 也使轨迹保持靠近黄道。卡西尼号的六年巡航在/explore视图中看起来像2D涂鸦，因为它访问的每个辅助天体都是2D平的。',
      '尤利西斯号是唯一故意打破圆盘的航天器。它的科学目标是太阳极，但到达它们需要~80°的倾角 — 化学上不可能。所以任务做了唯一可行的事：向外发射到木星，使用木星引力作为免费的"火箭"使航天器偏离黄道，然后从极到极绕太阳运行18年。大弯路是最便宜的路径。你在/explore中看到的每个其他深空任务都留在圆盘中，因为圆盘是目的地所在的地方 — 也是推进剂允许你去的地方。',
    ],
  },
};

let updated = 0;

async function patchOverlay(path, patch) {
  const dir = dirname(path);
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  let existing = {};
  try {
    existing = JSON.parse(await readFile(path, 'utf-8'));
  } catch {
    /* no existing overlay; we'll write fresh */
  }
  const merged = { ...existing, ...patch };
  await writeFile(path, JSON.stringify(merged, null, 2) + '\n');
  updated++;
}

// Patch mission overlays with events arrays.
for (const [missionId, byLocale] of Object.entries(MISSION_EVENTS)) {
  const dest = MISSION_DEST[missionId];
  for (const [loc, events] of Object.entries(byLocale)) {
    const path = join(I18N_ROOT, loc, 'missions', dest, `${missionId}.json`);
    await patchOverlay(path, { events });
  }
}

// Patch coplanar-trajectories science article with body content.
for (const [loc, body] of Object.entries(COPLANAR_BODY)) {
  const path = join(I18N_ROOT, loc, 'science', 'transfers', 'coplanar-trajectories.json');
  await patchOverlay(path, body);
}

console.log(`Updated ${updated} overlay files with round-2 translations.`);
console.log('Coverage in this batch:');
console.log(`  - 9 missions × 13 locales × events arrays: ${9 * 13} files`);
console.log(`  - coplanar-trajectories × 13 locales × {narrative_101, body_paragraphs}: 13 files`);
console.log('Now fully translated (modulo native review for ar/hi/ja/ko/zh-CN):');
console.log('  - Mission name + type + first + description + events');
console.log('  - Science article title + intro_sentence + narrative_101 + body_paragraphs');
