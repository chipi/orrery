// After the 2026-11-08 gallery cleanup (link-fixes/2026-11-08-gallery-cleanup.json): story captions
// that described another picture than the one shown are rewritten, and the two chapters that lost
// their only picture get one that matches. Applies to static/data/site-stories and all 14 locales.
//   node scripts/i18n-tools/maps/2026-11-06-mission-factcheck/story-images-2026-11-08.mjs
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
// [site, chapter id, src, mode ('caption' = rewrite the caption of src, 'add' = append), captions]
const EDITS = [
  [
    'mars3',
    'hardware',
    '/images/missions/mars3/02.webp',
    'caption',
    {
      'en-US':
        'The 1972 Soviet stamp marking the soft landing of Mars 3’s descent capsule on 2 December 1971.',
      ar: 'الطابع السوفيتي لعام 1972 الذي يخلّد الهبوط الهادئ لكبسولة Mars 3 في 2 ديسمبر 1971.',
      de: 'Die sowjetische Briefmarke von 1972 zur weichen Landung der Landekapsel von Mars 3 am 2. Dezember 1971.',
      es: 'El sello soviético de 1972 que conmemora el aterrizaje suave de la cápsula de descenso de la Mars 3 el 2 de diciembre de 1971.',
      fr: 'Le timbre soviétique de 1972 célébrant l’atterrissage en douceur de la capsule de descente de Mars 3, le 2 décembre 1971.',
      hi: '2 दिसंबर 1971 को Mars 3 के अवतरण कैप्सूल की नरम लैंडिंग की याद में जारी 1972 का सोवियत डाक टिकट।',
      it: 'Il francobollo sovietico del 1972 che celebra l’atterraggio morbido della capsula di discesa di Mars 3 il 2 dicembre 1971.',
      ja: '1971年12月2日のMars 3降下カプセルの軟着陸を記念した、1972年のソ連の切手。',
      ko: '1971년 12월 2일 Mars 3 하강 캡슐의 연착륙을 기념한 1972년 소련 우표.',
      nl: 'De Sovjetpostzegel uit 1972 ter herinnering aan de zachte landing van de afdaalcapsule van Mars 3 op 2 december 1971.',
      'pt-BR':
        'O selo soviético de 1972 que celebra o pouso suave da cápsula de descida da Mars 3 em 2 de dezembro de 1971.',
      ru: 'Советская марка 1972 года в честь мягкой посадки спускаемого аппарата «Марса-3» 2 декабря 1971 года.',
      'sr-Cyrl':
        'Совјетска марка из 1972. посвећена меком слетању спусне капсуле летелице Mars 3 2. децембра 1971.',
      'zh-CN': '1972年苏联邮票，纪念Mars 3下降舱于1971年12月2日软着陆。',
    },
  ],
  [
    'mars3',
    'launch',
    '/images/fleet-galleries/proton-k/02.webp',
    'add',
    {
      'en-US':
        'A Proton-K lifting off from Baikonur — the rocket type that launched Mars 3, with a Blok D upper stage, on 28 May 1971.',
      ar: 'صاروخ بروتون-K ينطلق من بايكونور، وهو نوع الصاروخ الذي أطلق Mars 3 مع مرحلة عليا من طراز بلوك D في 28 مايو 1971.',
      de: 'Eine Proton-K startet in Baikonur – der Raketentyp, der Mars 3 mit einer Blok-D-Oberstufe am 28. Mai 1971 startete.',
      es: 'Un Protón-K despega de Baikonur: el tipo de cohete que lanzó la Mars 3, con una etapa superior Blok D, el 28 de mayo de 1971.',
      fr: 'Une Proton-K décolle de Baïkonour — le type de fusée qui a lancé Mars 3, avec un étage supérieur Blok D, le 28 mai 1971.',
      hi: 'बैकोनूर से उड़ान भरता प्रोटॉन-K — वही रॉकेट प्रकार जिसने 28 मई 1971 को ब्लॉक D ऊपरी चरण के साथ Mars 3 को प्रक्षेपित किया।',
      it: 'Un Proton-K decolla da Bajkonur: il tipo di razzo che lanciò Mars 3, con uno stadio superiore Blok D, il 28 maggio 1971.',
      ja: 'バイコヌールから打ち上げられるプロトンK。1971年5月28日、ブロックD上段とともにMars 3を打ち上げたのと同型のロケット。',
      ko: '바이코누르에서 이륙하는 프로톤-K. 1971년 5월 28일 블로크 D 상단과 함께 Mars 3을 발사한 것과 같은 기종의 로켓이다.',
      nl: 'Een Proton-K stijgt op vanaf Bajkonoer – het rakettype dat Mars 3 met een Blok D-bovenste trap op 28 mei 1971 lanceerde.',
      'pt-BR':
        'Um Proton-K decola de Baikonur — o tipo de foguete que lançou a Mars 3, com um estágio superior Blok D, em 28 de maio de 1971.',
      ru: 'Старт «Протона-К» с Байконура — ракета этого типа с разгонным блоком «Блок Д» запустила «Марс-3» 28 мая 1971 года.',
      'sr-Cyrl':
        'Протон-К полеће са Бајконура — ракета тог типа лансирала је Mars 3 са горњим степеном Блок Д 28. маја 1971.',
      'zh-CN': '质子-K火箭从拜科努尔发射升空——1971年5月28日正是同型火箭搭配D区上面级发射了Mars 3。',
    },
  ],
  [
    'mars3',
    'surface',
    '/images/missions/mars3/03.webp',
    'caption',
    {
      'en-US':
        'The full HiRISE strip across Terra Sirenum in which the candidate Mars 3 hardware was found.',
      ar: 'شريط HiRISE الكامل عبر تيرا سيرينوم الذي عُثر فيه على العتاد المرشح لأن يكون من Mars 3.',
      de: 'Der vollständige HiRISE-Bildstreifen über der Terra Sirenum, in dem die mögliche Hardware von Mars 3 gefunden wurde.',
      es: 'La franja completa de HiRISE sobre Terra Sirenum en la que se encontró el posible material de la Mars 3.',
      fr: 'La bande HiRISE complète au-dessus de Terra Sirenum, dans laquelle le matériel supposé de Mars 3 a été repéré.',
      hi: 'टेरा सिरेनम के ऊपर HiRISE की पूरी पट्टी, जिसमें Mars 3 के संभावित हार्डवेयर मिले थे।',
      it: 'L’intera striscia HiRISE sopra Terra Sirenum in cui è stato trovato il possibile hardware di Mars 3.',
      ja: 'Mars 3の機体の候補が見つかった、テラ・シレナム上空のHiRISE画像の全体。',
      ko: 'Mars 3 기체로 추정되는 잔해가 발견된 테라 시레눔 상공의 HiRISE 영상 띠 전체.',
      nl: 'De volledige HiRISE-strook over Terra Sirenum waarin de mogelijke hardware van Mars 3 werd gevonden.',
      'pt-BR':
        'A faixa completa da HiRISE sobre Terra Sirenum em que foi encontrado o possível equipamento da Mars 3.',
      ru: 'Полная полоса снимка HiRISE над Землёй Сирен, на которой нашли предполагаемые фрагменты «Марса-3».',
      'sr-Cyrl':
        'Цела трака снимка HiRISE изнад Терра Сиренум на којој је пронађена могућа опрема летелице Mars 3.',
      'zh-CN': '发现疑似Mars 3硬件的那条完整HiRISE图像条带，位于塞壬台地上空。',
    },
  ],
  [
    'venera-13',
    'legacy',
    '/images/missions/magellan/01.webp',
    'add',
    {
      'en-US':
        'Venus as radar maps show it, from Magellan, Pioneer Venus and Venera data. No spacecraft has sent pictures from the surface since Venera 13 and 14 in 1982.',
      ar: 'الزهرة كما تظهرها خرائط الرادار، من بيانات Magellan وPioneer Venus وVenera. لم ترسل أي مركبة صورًا من السطح منذ Venera 13 و14 عام 1982.',
      de: 'Die Venus, wie Radarkarten sie zeigen, aus Daten von Magellan, Pioneer Venus und Venera. Seit Venera 13 und 14 im Jahr 1982 hat keine Sonde mehr Bilder von der Oberfläche gesendet.',
      es: 'Venus como la muestran los mapas de radar, con datos de Magellan, Pioneer Venus y Venera. Ninguna nave ha enviado imágenes desde la superficie desde las Venera 13 y 14 en 1982.',
      fr: 'Vénus telle que la montrent les cartes radar, d’après les données de Magellan, Pioneer Venus et Venera. Aucun engin n’a envoyé d’images de la surface depuis Venera 13 et 14 en 1982.',
      hi: 'रडार मानचित्रों में दिखता शुक्र, Magellan, Pioneer Venus और Venera के आँकड़ों से। 1982 में Venera 13 और 14 के बाद किसी यान ने सतह से तस्वीरें नहीं भेजीं।',
      it: 'Venere come la mostrano le mappe radar, dai dati di Magellan, Pioneer Venus e Venera. Nessuna sonda ha più inviato immagini dalla superficie dopo le Venera 13 e 14 nel 1982.',
      ja: 'Magellan、Pioneer Venus、Veneraのデータによるレーダー地図の金星。1982年のVenera 13号・14号以来、地表から画像を送った探査機はない。',
      ko: 'Magellan, Pioneer Venus, Venera의 자료로 만든 레이더 지도 속 금성. 1982년 Venera 13호와 14호 이후 표면에서 사진을 보낸 탐사선은 없다.',
      nl: 'Venus zoals radarkaarten haar tonen, uit gegevens van Magellan, Pioneer Venus en Venera. Sinds Venera 13 en 14 in 1982 heeft geen ruimtevaartuig nog beelden van het oppervlak gestuurd.',
      'pt-BR':
        'Vênus como os mapas de radar a mostram, com dados da Magellan, da Pioneer Venus e das Venera. Nenhuma sonda enviou imagens da superfície desde as Venera 13 e 14, em 1982.',
      ru: 'Венера на радарных картах по данным Magellan, Pioneer Venus и «Венер». После «Венеры-13» и «Венеры-14» в 1982 году ни один аппарат не передавал снимков с поверхности.',
      'sr-Cyrl':
        'Венера какву приказују радарске карте, из података летелица Magellan, Pioneer Venus и Venera. Од летелица Venera 13 и 14 из 1982. ниједна није послала снимке са површине.',
      'zh-CN':
        '雷达地图中的金星，数据来自Magellan、Pioneer Venus和Venera。自1982年Venera 13号和14号以来，再没有探测器从金星表面传回图像。',
    },
  ],
];
const files = (site) => [
  `static/data/site-stories/${site}.json`,
  ...L.map((l) => `i18n-src/${l}/site-stories/${site}.json`),
];
let n = 0;
for (const [site, chapter, src, mode, captions] of EDITS)
  for (const f of files(site)) {
    const loc = f.startsWith('static/') ? 'en-US' : f.split('/')[1];
    const j = JSON.parse(readFileSync(f, 'utf8'));
    const ch = j.chapters.find((c) => c.id === chapter);
    if (!ch) throw new Error(`${f}: no chapter ${chapter}`);
    const img = ch.images.find((i) => i.src === src);
    if (mode === 'caption') {
      if (!img) throw new Error(`${f}: ${chapter} has no image ${src}`);
      img.caption = captions[loc];
    } else if (!img) ch.images.push({ src, caption: captions[loc] });
    else img.caption = captions[loc];
    writeFileSync(f, JSON.stringify(j, null, 2) + '\n');
    n++;
  }
console.log(`${n} story edits`);
