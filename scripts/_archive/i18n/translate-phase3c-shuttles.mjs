#!/usr/bin/env node
/**
 * Translate the Phase-3c shuttle backfill overlays (Columbia, Challenger,
 * Discovery, Atlantis, Endeavour, Enterprise, X-37B, Buran OK-GLI) into
 * all 13 non-English locales. Pure data layer — no API calls; translations
 * live inline. Same shape as translate-phase3a-launchers.mjs and
 * translate-phase3b-spacecraft.mjs.
 *
 * Schema per (entry, locale): { name?, tagline, description, best_known_for }.
 *
 * Run from project root:  node scripts/translate-phase3c-shuttles.mjs
 */
import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');
const LOCALES = [
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
const CATEGORY = 'crewed-spacecraft';

const OVERLAYS = {
  columbia: {
    ar: {
      tagline: 'OV-102 — أول مكوك يصل إلى الفضاء (STS-1، 1981)؛ فُقد في عودته STS-107 2003-02-01',
      description:
        'أول مكوك فضائي تشغيلي. حلّق 28 مهمة عبر 22 سنة، بما في ذلك STS-1 (أول رحلة اختبار مأهولة لمركبة فضائية أمريكية جديدة منذ 25 سنة)، ومهمة Astro-1 الفلكية بالأشعة فوق البنفسجية في 1990، ومهمة SLS-2 لعلوم الحياة في 1993، وعودة عضو الكونغرس John Glenn إلى الفضاء STS-95 في 1998. فُقد عند عودته في STS-107 (2003-02-01) — اخترق ضرب الرغوة أثناء الإطلاق الحافة الأمامية لـ RCC في الجناح الأيسر، وانفصلت المركبة فوق تكساس بسرعة 18 ماخ، مع فقدان جميع الطاقم السبعة.',
      best_known_for: 'أول مكوك يطير إلى الفضاء (STS-1، 1981)؛ فُقد في عودة STS-107 2003',
    },
    de: {
      tagline:
        'OV-102 — der erste Shuttle-Orbiter im All (STS-1, 1981); ging bei der STS-107-Rückkehr am 1.2.2003 verloren',
      description:
        'Der erste operationelle Space Shuttle Orbiter. Flog 28 Missionen über 22 Jahre, darunter STS-1 (der erste bemannte Testflug eines neuen amerikanischen Raumfahrzeugs seit 25 Jahren), die Astro-1 UV-Astronomie-Mission 1990, der SLS-2 Lebenswissenschaftsflug 1993 und Senator John Glenns STS-95 Rückkehr ins All 1998. Verloren beim Wiedereintritt während STS-107 (1.2.2003) — ein Schaumstoffstoß beim Start durchbrach die RCC-Vorderkante des linken Flügels, das Fahrzeug zerfiel über Texas bei Mach 18 mit dem Verlust aller sieben Crewmitglieder. Der Unfall legte die Shuttle-Flotte 29 Monate lahm und löste die Vision for Space Exploration aus.',
      best_known_for:
        'Erster Shuttle im All (STS-1, 1981); verloren beim STS-107-Wiedereintritt 2003',
    },
    es: {
      tagline:
        'OV-102 — primer Shuttle en alcanzar el espacio (STS-1, 1981); perdido en la reentrada de STS-107 el 1-2-2003',
      description:
        'El primer transbordador espacial operativo. Voló 28 misiones a lo largo de 22 años, incluyendo STS-1 (el primer vuelo de prueba tripulado de una nueva nave estadounidense en 25 años), la misión Astro-1 de astronomía UV en 1990, el vuelo de ciencias de la vida SLS-2 en 1993, y el regreso al espacio del senador John Glenn en STS-95 en 1998. Perdido durante la reentrada en STS-107 (1-2-2003) — un impacto de espuma durante el lanzamiento perforó el borde de ataque RCC del ala izquierda, la nave se desintegró sobre Texas a Mach 18 con la pérdida de los siete tripulantes. El accidente paralizó la flota 29 meses y desencadenó la Vision for Space Exploration.',
      best_known_for:
        'Primer Shuttle en el espacio (STS-1, 1981); perdido en la reentrada de STS-107 2003',
    },
    fr: {
      tagline:
        "OV-102 — première navette à atteindre l'espace (STS-1, 1981) ; perdue lors de la rentrée STS-107 le 1-2-2003",
      description:
        "Le premier orbiteur de navette spatiale opérationnel. A volé 28 missions sur 22 ans, dont STS-1 (le premier vol d'essai habité d'un nouveau vaisseau spatial américain en 25 ans), la mission Astro-1 d'astronomie UV en 1990, le vol SLS-2 de sciences de la vie en 1993, et le retour dans l'espace du sénateur John Glenn STS-95 en 1998. Perdue lors de la rentrée pendant STS-107 (1-2-2003) — un impact de mousse durant le lancement a perforé le bord d'attaque RCC de l'aile gauche, le véhicule s'est désintégré au-dessus du Texas à Mach 18 avec la perte des sept membres d'équipage. L'accident a immobilisé la flotte 29 mois et déclenché la Vision for Space Exploration.",
      best_known_for:
        "Première navette dans l'espace (STS-1, 1981) ; perdue lors de la rentrée STS-107 2003",
    },
    hi: {
      tagline:
        'OV-102 — अंतरिक्ष में जाने वाला पहला शटल (STS-1, 1981); STS-107 पुनःप्रवेश 2003-02-01 में खोया',
      description:
        'पहला परिचालन स्पेस शटल ऑर्बिटर। 22 वर्षों में 28 मिशन उड़ाए, जिनमें STS-1 (25 वर्षों में किसी नई अमेरिकी अंतरिक्ष यान की पहली मानवयुक्त परीक्षण उड़ान), 1990 की Astro-1 UV-खगोल विज्ञान मिशन, 1993 की SLS-2 जीवन-विज्ञान उड़ान, और 1998 में Senator John Glenn की अंतरिक्ष में वापसी STS-95 शामिल हैं। STS-107 (2003-02-01) के पुनःप्रवेश के दौरान खोया — लॉन्च के दौरान फोम स्ट्राइक ने बाएं विंग के RCC अग्रणी किनारे को छेद दिया, यान Mach 18 पर टेक्सास के ऊपर बिखर गया, सभी सात क्रू मारे गए। दुर्घटना ने 29 महीनों के लिए शटल बेड़े को रोका।',
      best_known_for: 'अंतरिक्ष में पहला शटल (STS-1, 1981); STS-107 पुनःप्रवेश 2003 में खोया',
    },
    it: {
      tagline:
        'OV-102 — primo Shuttle a raggiungere lo spazio (STS-1, 1981); perso al rientro STS-107 il 1-2-2003',
      description:
        "Il primo orbiter Space Shuttle operativo. Ha volato 28 missioni in 22 anni, tra cui STS-1 (il primo volo di prova con equipaggio di una nuova navicella spaziale americana in 25 anni), la missione Astro-1 di astronomia UV del 1990, il volo di scienze della vita SLS-2 del 1993, e il ritorno nello spazio del Senatore John Glenn STS-95 nel 1998. Perso durante il rientro nello STS-107 (1-2-2003) — un impatto di schiuma durante il lancio ha perforato il bordo d'attacco RCC dell'ala sinistra, il veicolo si è disintegrato sopra il Texas a Mach 18 con la perdita di tutti e sette i membri dell'equipaggio. L'incidente ha tenuto a terra la flotta per 29 mesi.",
      best_known_for: 'Primo Shuttle nello spazio (STS-1, 1981); perso al rientro STS-107 2003',
    },
    ja: {
      name: 'コロンビア',
      tagline:
        'OV-102 — 宇宙に到達した最初のスペースシャトル（STS-1、1981）；STS-107 帰還時に喪失 2003-02-01',
      description:
        '最初に運用されたスペースシャトルオービタ。22 年間で 28 機のミッションを飛行。STS-1（25 年ぶりに飛んだ新しいアメリカ宇宙船の初の有人試験飛行）、1990 年の Astro-1 紫外線天文学ミッション、1993 年の SLS-2 生命科学ミッション、1998 年の John Glenn 上院議員の宇宙復帰 STS-95 などを含む。2003 年 2 月 1 日 STS-107 の再突入中に喪失 — 打ち上げ時のフォーム衝突で左翼の RCC 前縁が破損、機体はマッハ 18 でテキサス州上空で分解、7 名全員が亡くなった。事故により 29 か月間シャトル運用が停止。',
      best_known_for: '宇宙に到達した最初のシャトル（STS-1、1981）；STS-107 再突入 2003 で喪失',
    },
    ko: {
      name: '컬럼비아',
      tagline: 'OV-102 — 우주에 도달한 첫 셔틀(STS-1, 1981); STS-107 재진입 시 2003-02-01 손실',
      description:
        '최초의 운용 우주왕복선 궤도선. 22년 동안 28회 비행, STS-1(새로운 미국 우주선의 25년 만의 첫 유인 시험 비행), 1990년 Astro-1 자외선 천문학 임무, 1993년 SLS-2 생명과학 비행, 1998년 John Glenn 상원의원의 STS-95 우주 복귀 등을 포함. 2003년 2월 1일 STS-107 재진입 중 손실 — 발사 시 폼 충돌이 좌측 날개의 RCC 전연을 파열, 마하 18에서 텍사스 상공에서 기체가 분해되어 승무원 7명 전원이 사망. 사고로 셔틀 함대가 29개월간 운항 중단.',
      best_known_for: '우주에 도달한 첫 셔틀(STS-1, 1981); STS-107 재진입 2003에서 손실',
    },
    nl: {
      tagline:
        'OV-102 — eerste Shuttle in de ruimte (STS-1, 1981); verloren bij STS-107-terugkeer 1-2-2003',
      description:
        "De eerste operationele Space Shuttle-orbiter. Vloog 28 missies in 22 jaar, waaronder STS-1 (de eerste bemande testvlucht van een nieuw Amerikaans ruimtevaartuig in 25 jaar), de Astro-1 UV-astronomie-missie in 1990, de SLS-2 levenswetenschappenmissie in 1993, en senator John Glenn's STS-95 terugkeer naar de ruimte in 1998. Verloren tijdens terugkeer in STS-107 (1-2-2003) — een schuiminslag tijdens lancering doorbrak de RCC-voorkant van de linkervleugel, het voertuig viel uiteen boven Texas op Mach 18 met verlies van alle zeven bemanningsleden. Het ongeluk legde de Shuttle-vloot 29 maanden stil.",
      best_known_for:
        'Eerste Shuttle in de ruimte (STS-1, 1981); verloren bij STS-107-terugkeer 2003',
    },
    'pt-BR': {
      tagline:
        'OV-102 — primeiro Shuttle a alcançar o espaço (STS-1, 1981); perdido na reentrada STS-107 em 1-2-2003',
      description:
        'O primeiro ônibus espacial operacional. Voou 28 missões ao longo de 22 anos, incluindo STS-1 (o primeiro voo de teste tripulado de uma nova espaçonave americana em 25 anos), a missão Astro-1 de astronomia UV em 1990, o voo SLS-2 de ciências da vida em 1993, e o retorno do senador John Glenn ao espaço STS-95 em 1998. Perdido durante reentrada no STS-107 (1-2-2003) — um impacto de espuma durante o lançamento perfurou a borda de ataque RCC da asa esquerda, o veículo desintegrou sobre o Texas a Mach 18 com a perda dos sete tripulantes. O acidente parou a frota por 29 meses.',
      best_known_for: 'Primeiro Shuttle no espaço (STS-1, 1981); perdido na reentrada STS-107 2003',
    },
    ru: {
      name: 'Колумбия',
      tagline:
        'OV-102 — первый шаттл, достигший космоса (STS-1, 1981); потерян при возвращении STS-107 01.02.2003',
      description:
        'Первый эксплуатационный космический шаттл. Совершил 28 миссий за 22 года, включая STS-1 (первый пилотируемый испытательный полёт нового американского космического корабля за 25 лет), миссию Astro-1 по УФ-астрономии в 1990 году, полёт SLS-2 наук о жизни в 1993 году, и возвращение в космос сенатора Джона Гленна STS-95 в 1998. Потерян при возвращении во время STS-107 (01.02.2003) — удар пены при запуске пробил переднюю кромку RCC левого крыла, аппарат развалился над Техасом на скорости Маха 18, погибли все семь членов экипажа. После аварии шаттлы не летали 29 месяцев.',
      best_known_for: 'Первый шаттл в космосе (STS-1, 1981); потерян при возвращении STS-107 2003',
    },
    'sr-Cyrl': {
      tagline:
        'OV-102 — први шатл који је стигао у свемир (STS-1, 1981); изгубљен при повратку STS-107 01.02.2003',
      description:
        'Први оперативни орбитер свемирског шатла. Летио је 28 мисија током 22 године, укључујући STS-1 (први пилотирани тест нове америчке свемирске летелице после 25 година), Astro-1 UV-астрономску мисију 1990, SLS-2 биоистраживачки лет 1993, и повратак сенатора Џона Глена у свемир STS-95 1998. Изгубљен током повратка у STS-107 (01.02.2003) — удар пене током лансирања пробио је RCC водећу ивицу левог крила, возило се распало над Тексасом на Маху 18, погинули сви седморо чланова посаде. После несреће шатли нису летели 29 месеци.',
      best_known_for: 'Први шатл у свемиру (STS-1, 1981); изгубљен при повратку STS-107 2003',
    },
    'zh-CN': {
      name: '哥伦比亚号',
      tagline:
        'OV-102 — 首艘进入太空的航天飞机（STS-1，1981）；2003-02-01 STS-107 再入大气层时损失',
      description:
        '首艘投入运营的航天飞机轨道器。22 年间执行 28 次任务，包括 STS-1（25 年来美国新型载人航天器的首次有人试飞）、1990 年 Astro-1 紫外天文任务、1993 年 SLS-2 生命科学任务、1998 年参议员 John Glenn 重返太空的 STS-95。2003-02-01 STS-107 再入大气层时损失 — 升空时一片绝热泡沫击穿左翼 RCC 前缘，飞行器以 18 马赫在德州上空解体，七名机组人员全部遇难。事故使航天飞机停飞 29 个月，并催生了 Vision for Space Exploration。',
      best_known_for: '首艘进入太空的航天飞机（STS-1，1981）；2003 年 STS-107 再入时损失',
    },
  },
  challenger: {
    ar: {
      tagline:
        'OV-099 — ثاني مكوك تشغيلي. فُقد بعد 73 ث من الإطلاق في STS-51-L 1986-01-28 مع 7 طاقم بمن فيهم Christa McAuliffe',
      description:
        'بُني من قطعة اختبار هيكلية (STA-099) حُوّلت إلى تكوين الطيران. أول رحلة STS-6 (1983-04-04) أجرت أول EVA من المكوك. حلّق 10 مهمات قبل STS-51-L (1986-01-28) الذي أُطلق في برد غير مسبوق (−1 °C) — فشلت حلقات O الخاصة بـ SRB الأيمن في الإغلاق، احترق الغاز الساخن عبر الدعامة التي تربط SRB بالخزان الخارجي، تحطمت المركبة عند Max-Q (T+73s) على ارتفاع 14 كم. الطاقم السبعة هلكوا جميعاً. لجنة Rogers أوقفت المكوك 32 شهراً.',
      best_known_for: 'ثاني مكوك؛ فُقد بعد 73 ث من إطلاق STS-51-L 1986-01-28 مع 7 طاقم',
    },
    de: {
      tagline:
        'OV-099 — zweiter operationeller Shuttle. Verloren 73s nach Start auf STS-51-L 28.1.1986 mit 7 Besatzungsmitgliedern inkl. Lehrerin Christa McAuliffe',
      description:
        'Aus einem strukturellen Testartikel (STA-099) in Flugkonfiguration umgebaut, nachdem Enterprise zu teuer zum Umrüsten befunden worden war. Erstflug STS-6 (4.4.1983) führte den ersten Shuttle-EVA durch. Flog 10 Missionen bevor STS-51-L (28.1.1986) bei beispielloser Kälte (−1 °C) startete — die O-Ringe des rechten SRB versagten, heißes Gas brannte durch die Strebe zum externen Tank, der Orbiter zerbrach bei Max-Q (T+73s) in 14 km Höhe. Alle sieben Crewmitglieder kamen ums Leben. Die Rogers-Kommission legte den Shuttle 32 Monate lahm.',
      best_known_for: 'Zweiter Shuttle; verloren 73s nach STS-51-L-Start 28.1.1986 mit 7 Crew',
    },
    es: {
      tagline:
        'OV-099 — segundo Shuttle operativo. Perdido 73s tras el lanzamiento en STS-51-L el 28-1-1986 con 7 tripulantes incluida Christa McAuliffe',
      description:
        'Construido a partir de un artículo de prueba estructural (STA-099) convertido a configuración de vuelo tras considerar Enterprise demasiado caro de actualizar. Primer vuelo STS-6 (4-4-1983) realizó el primer EVA de Shuttle. Voló 10 misiones antes de STS-51-L (28-1-1986) lanzado con frío sin precedentes (−1 °C) — las juntas tóricas del SRB derecho fallaron, el gas caliente perforó el puntal que unía el SRB al tanque externo, el orbiter se rompió a Max-Q (T+73s) a 14 km. Los siete tripulantes perecieron. La Comisión Rogers paralizó el Shuttle 32 meses.',
      best_known_for:
        'Segundo Shuttle; perdido 73s tras lanzamiento STS-51-L 28-1-1986 con 7 tripulantes',
    },
    fr: {
      tagline:
        "OV-099 — deuxième navette opérationnelle. Perdue 73s après le lancement sur STS-51-L le 28-1-1986 avec 7 membres d'équipage dont Christa McAuliffe",
      description:
        "Construite à partir d'un article de test structurel (STA-099) converti en configuration de vol après qu'Enterprise fut jugée trop coûteuse à mettre à niveau. Premier vol STS-6 (4-4-1983) a réalisé la première EVA de navette. A volé 10 missions avant que STS-51-L (28-1-1986) ne soit lancé par un froid sans précédent (−1 °C) — les joints toriques du SRB droit ont échoué, le gaz chaud a brûlé le pylône reliant le SRB au réservoir externe, l'orbiteur s'est brisé à Max-Q (T+73s) à 14 km. Les sept membres d'équipage ont péri. La Commission Rogers a immobilisé la navette 32 mois.",
      best_known_for:
        'Deuxième navette ; perdue 73s après lancement STS-51-L 28-1-1986 avec 7 personnes',
    },
    hi: {
      tagline:
        'OV-099 — दूसरा परिचालन शटल। STS-51-L 1986-01-28 लॉन्च के 73 सेकंड बाद खोया गया, 7 क्रू सहित शिक्षिका Christa McAuliffe',
      description:
        'एक संरचनात्मक परीक्षण आर्टिकल (STA-099) से उड़ान विन्यास में परिवर्तित किया गया जब Enterprise को अपग्रेड करना बहुत महंगा माना गया। पहली उड़ान STS-6 (1983-04-04) ने पहला शटल EVA किया। STS-51-L (1986-01-28) से पहले 10 मिशन उड़ाए जो अभूतपूर्व ठंड (−1 °C) में लॉन्च हुआ — दाएं SRB के O-रिंग सील करने में विफल रहे, गर्म गैस ने SRB को बाहरी टैंक से जोड़ने वाले स्ट्रट को जला दिया, ऑर्बिटर 14 किमी ऊंचाई पर Max-Q (T+73s) पर टूट गया। सभी सात क्रू मारे गए। Rogers आयोग ने शटल को 32 महीनों के लिए रोका।',
      best_known_for: 'दूसरा शटल; STS-51-L 1986-01-28 लॉन्च के 73s बाद 7 क्रू के साथ खोया',
    },
    it: {
      tagline:
        "OV-099 — secondo Shuttle operativo. Perso 73s dopo il lancio in STS-51-L il 28-1-1986 con 7 membri dell'equipaggio inclusa Christa McAuliffe",
      description:
        "Costruito da un articolo di test strutturale (STA-099) convertito in configurazione di volo dopo che Enterprise fu ritenuta troppo costosa da aggiornare. Primo volo STS-6 (4-4-1983) ha eseguito la prima EVA dello Shuttle. Ha volato 10 missioni prima che STS-51-L (28-1-1986) fosse lanciato con freddo senza precedenti (−1 °C) — gli O-ring del SRB destro non hanno sigillato, il gas caldo ha bruciato il puntone che collegava il SRB al serbatoio esterno, l'orbiter si è rotto a Max-Q (T+73s) a 14 km. Tutti e sette i membri dell'equipaggio sono morti. La Commissione Rogers ha tenuto a terra lo Shuttle 32 mesi.",
      best_known_for: 'Secondo Shuttle; perso 73s dopo lancio STS-51-L 28-1-1986 con 7 membri',
    },
    ja: {
      name: 'チャレンジャー',
      tagline:
        'OV-099 — 二機目の運用シャトル。1986 年 1 月 28 日 STS-51-L 打ち上げ 73 秒後に喪失、教師 Christa McAuliffe を含む 7 名と共に',
      description:
        '構造試験機 (STA-099) を飛行構成に改造して建造。Enterprise を改修するのが高額すぎるため代替となった。初飛行 STS-6 (1983 年 4 月 4 日) で初のシャトル EVA を実施。10 ミッションを飛行した後、STS-51-L (1986 年 1 月 28 日) が前例のない寒さ (−1 °C) で打ち上げられた — 右 SRB の O リングが密閉に失敗、高温ガスが SRB と外部タンクをつなぐストラットを焼き切り、軌道機は最大 Q (T+73s) 高度 14 km で分解。7 名全員が死亡。Rogers 委員会によりシャトルは 32 か月間停止。',
      best_known_for: '二機目のシャトル；STS-51-L 1986-01-28 打ち上げ 73 秒後に 7 名と共に喪失',
    },
    ko: {
      name: '챌린저',
      tagline:
        'OV-099 — 두 번째 운용 셔틀. 1986-01-28 STS-51-L 발사 73초 후 손실, 교사 Christa McAuliffe 포함 7명 사망',
      description:
        '구조 시험체(STA-099)를 비행 구성으로 개조하여 제작 — Enterprise 업그레이드가 너무 비싸 대안으로 만들어짐. 첫 비행 STS-6(1983-04-04)에서 첫 셔틀 EVA 수행. 10회 비행 후 STS-51-L(1986-01-28)이 전례 없는 추위(−1 °C)에서 발사 — 우측 SRB의 O링이 밀봉에 실패, 고온 가스가 SRB와 외부 탱크를 연결하는 스트럿을 태웠고, 궤도선은 Max-Q(T+73초) 14km 고도에서 분해되었다. 승무원 7명 전원 사망. Rogers 위원회로 셔틀이 32개월 운항 중단.',
      best_known_for: '두 번째 셔틀; STS-51-L 1986-01-28 발사 73초 후 7명과 함께 손실',
    },
    nl: {
      tagline:
        'OV-099 — tweede operationele Shuttle. Verloren 73s na lancering op STS-51-L 28-1-1986 met 7 bemanningsleden waaronder Christa McAuliffe',
      description:
        'Gebouwd uit een structureel testartikel (STA-099) omgebouwd naar vluchtconfiguratie nadat Enterprise te duur werd geacht voor upgrade. Eerste vlucht STS-6 (4-4-1983) voerde de eerste Shuttle-EVA uit. Vloog 10 missies voordat STS-51-L (28-1-1986) werd gelanceerd in ongekende kou (−1 °C) — de O-ringen van de rechter SRB faalden af te dichten, hete gassen brandden door de strut tussen SRB en externe tank, de orbiter brak op Max-Q (T+73s) op 14 km. Alle zeven bemanningsleden kwamen om. De Rogers-commissie zette de Shuttle 32 maanden stil.',
      best_known_for:
        'Tweede Shuttle; verloren 73s na lancering STS-51-L 28-1-1986 met 7 bemanning',
    },
    'pt-BR': {
      tagline:
        'OV-099 — segundo Shuttle operacional. Perdido 73s após lançamento em STS-51-L em 28-1-1986 com 7 tripulantes incluindo Christa McAuliffe',
      description:
        'Construído a partir de um artigo de teste estrutural (STA-099) convertido para configuração de voo após Enterprise ser considerada muito cara de atualizar. Primeiro voo STS-6 (4-4-1983) realizou o primeiro EVA do Shuttle. Voou 10 missões antes do STS-51-L (28-1-1986) ser lançado em frio sem precedentes (−1 °C) — os anéis O do SRB direito falharam em vedar, gás quente queimou o suporte que conectava o SRB ao tanque externo, o orbiter se quebrou em Max-Q (T+73s) a 14 km. Os sete tripulantes pereceram. A Comissão Rogers parou o Shuttle por 32 meses.',
      best_known_for:
        'Segundo Shuttle; perdido 73s após lançamento STS-51-L 28-1-1986 com 7 tripulantes',
    },
    ru: {
      name: 'Челленджер',
      tagline:
        'OV-099 — второй эксплуатационный шаттл. Потерян через 73 с после запуска в STS-51-L 28.01.1986 с 7 членами экипажа, включая учительницу Кристу Маколифф',
      description:
        'Построен из конструкционного испытательного образца (STA-099), переведённого в лётную конфигурацию, поскольку модернизация Enterprise оказалась слишком дорогой. Первый полёт STS-6 (04.04.1983) провёл первый шаттловский выход в открытый космос. Совершил 10 миссий до STS-51-L (28.01.1986), запущенного в беспрецедентный мороз (−1 °C) — уплотнительные кольца правого SRB не сработали, горячий газ прожёг стойку, соединяющую SRB с внешним баком, орбитер разрушился на Max-Q (T+73 с) на высоте 14 км. Все семь членов экипажа погибли. Комиссия Роджерса остановила шаттлы на 32 месяца.',
      best_known_for:
        'Второй шаттл; потерян через 73 с после старта STS-51-L 28.01.1986 с 7 членами экипажа',
    },
    'sr-Cyrl': {
      tagline:
        'OV-099 — други оперативни шатл. Изгубљен 73 с после лансирања у STS-51-L 28.01.1986 са 7 чланова посаде укључујући учитељицу Кристу Маколиф',
      description:
        'Изграђен од структурног тест артикла (STA-099) преведеног у летну конфигурацију након што је процењено да је Enterprise преузак за модернизацију. Први лет STS-6 (04.04.1983) извршио је први шатл EVA. Летио је 10 мисија пре STS-51-L (28.01.1986) лансираног у незабележеној хладноћи (−1 °C) — O-прстенови десног SRB-а нису заптили, врући гас спалио је носач између SRB-а и спољашњег резервоара, орбитер се распао на Max-Q (T+73 с) на 14 km. Свих седам чланова посаде је погинуло. Роџерсова комисија држала је шатл у мировању 32 месеца.',
      best_known_for:
        'Други шатл; изгубљен 73 с после старта STS-51-L 28.01.1986 са 7 чланова посаде',
    },
    'zh-CN': {
      name: '挑战者号',
      tagline:
        'OV-099 — 第二艘投入运营的航天飞机。1986-01-28 STS-51-L 升空 73 秒后损失，含教师 Christa McAuliffe 在内 7 名乘员遇难',
      description:
        '由结构试验件（STA-099）改装为飞行构型 — Enterprise 升级成本过高才转而建造它。首飞 STS-6（1983-04-04）执行了首次航天飞机 EVA。完成 10 次任务后，STS-51-L（1986-01-28）在前所未有的低温（−1 °C）下发射 — 右侧 SRB 的 O 形环未能密封，高温气体烧穿了连接 SRB 与外贮箱的连接件，轨道器在最大动压 Max-Q（T+73 秒）高度 14 km 处解体。七名机组人员全部遇难。Rogers 委员会让航天飞机停飞 32 个月。',
      best_known_for: '第二艘航天飞机；STS-51-L 1986-01-28 升空 73s 后与 7 名机组遇难',
    },
  },
  discovery: {
    ar: {
      tagline:
        'OV-103 — ثالث مكوك. أطلق Hubble (STS-31، 1990)؛ حلّق كلتا مهمتي العودة إلى الطيران. 39 مهمة — أكثر من أي مكوك',
      description:
        'ثالث مكوك تشغيلي؛ أول رحلة STS-41-D (1984-08-30). أكثر المكوكات تحليقاً — 39 مهمة عبر 27 سنة. أبرز المعالم: STS-31 (1990-04-24) نشر Hubble؛ STS-26 (1988-09-29) عودة إلى الطيران بعد Challenger؛ STS-114 (2005-07-26) عودة إلى الطيران بعد Columbia؛ STS-95 (1998) عاد بـ John Glenn إلى المدار في عمر 77؛ رحلات بناء ISS متعددة. الرحلة الأخيرة STS-133 (2011-02-24) سلّمت Leonardo PMM. معروض في Udvar-Hazy منذ 2012.',
      best_known_for: 'أكثر المكوكات تحليقاً (39 مهمة)؛ نشر Hubble + كلتا مهمتي العودة إلى الطيران',
    },
    de: {
      tagline:
        'OV-103 — dritter Shuttle. Setzte Hubble aus (STS-31, 1990); flog beide Return-to-Flight-Missionen. 39 Missionen — am meisten von allen',
      description:
        'Dritter operationeller Orbiter; Erstflug STS-41-D (30.8.1984). Der am häufigsten geflogene Shuttle — 39 Missionen über 27 Jahre. Höhepunkte: STS-31 (24.4.1990) setzte das Hubble-Weltraumteleskop aus; STS-26 (29.9.1988) Post-Challenger-Return-to-Flight; STS-114 (26.7.2005) Post-Columbia-Return-to-Flight; STS-95 (1998) brachte John Glenn mit 77 Jahren zurück in den Orbit; mehrere ISS-Aufbauflüge. Letzter Flug STS-133 (24.2.2011) lieferte das Leonardo Permanent Multipurpose Module. Im Udvar-Hazy seit 2012.',
      best_known_for:
        'Am meisten geflogener Shuttle (39 Missionen); setzte Hubble aus + beide Return-to-Flight-Missionen',
    },
    es: {
      tagline:
        'OV-103 — tercer Shuttle. Desplegó el Hubble (STS-31, 1990); voló ambas misiones de regreso al vuelo. 39 misiones — el más volado',
      description:
        'Tercer orbiter operativo; primer vuelo STS-41-D (30-8-1984). El Shuttle más volado — 39 misiones a lo largo de 27 años. Hitos: STS-31 (24-4-1990) desplegó el Telescopio Espacial Hubble; STS-26 (29-9-1988) regreso al vuelo post-Challenger; STS-114 (26-7-2005) regreso al vuelo post-Columbia; STS-95 (1998) devolvió a John Glenn a órbita a los 77 años; múltiples vuelos de ensamblaje de ISS. Vuelo final STS-133 (24-2-2011) entregó el Leonardo Permanent Multipurpose Module. En exhibición en Udvar-Hazy desde 2012.',
      best_known_for:
        'Shuttle más volado (39 misiones); desplegó Hubble + ambas misiones de regreso al vuelo',
    },
    fr: {
      tagline:
        'OV-103 — troisième navette. A déployé Hubble (STS-31, 1990) ; a volé les deux missions de retour en vol. 39 missions — le plus volé',
      description:
        "Troisième orbiteur opérationnel ; premier vol STS-41-D (30-8-1984). La navette la plus volée — 39 missions sur 27 ans. Moments forts : STS-31 (24-4-1990) a déployé le télescope spatial Hubble ; STS-26 (29-9-1988) retour en vol post-Challenger ; STS-114 (26-7-2005) retour en vol post-Columbia ; STS-95 (1998) a ramené John Glenn en orbite à 77 ans ; multiples vols d'assemblage de l'ISS. Dernier vol STS-133 (24-2-2011) a livré le module Leonardo PMM. Exposée à Udvar-Hazy depuis 2012.",
      best_known_for:
        'Navette la plus volée (39 missions) ; a déployé Hubble + les deux missions de retour en vol',
    },
    hi: {
      tagline:
        'OV-103 — तीसरा शटल। Hubble तैनात किया (STS-31, 1990); दोनों रिटर्न-टू-फ्लाइट मिशन उड़ाए। 39 मिशन — सबसे अधिक',
      description:
        'तीसरा परिचालन ऑर्बिटर; पहली उड़ान STS-41-D (1984-08-30)। सबसे अधिक उड़ान भरने वाला शटल — 27 वर्षों में 39 मिशन। मुख्य आकर्षण: STS-31 (1990-04-24) ने Hubble तैनात किया; STS-26 (1988-09-29) Challenger के बाद वापसी; STS-114 (2005-07-26) Columbia के बाद वापसी; STS-95 (1998) ने John Glenn को 77 वर्ष की आयु में कक्षा में वापस भेजा; ISS असेंबली के कई मिशन। अंतिम उड़ान STS-133 (2011-02-24) ने Leonardo PMM दिया। 2012 से Udvar-Hazy में प्रदर्शित।',
      best_known_for:
        'सबसे अधिक उड़ान भरने वाला शटल (39 मिशन); Hubble तैनात + दोनों रिटर्न-टू-फ्लाइट',
    },
    it: {
      tagline:
        'OV-103 — terzo Shuttle. Ha dispiegato Hubble (STS-31, 1990); ha volato entrambe le missioni di ritorno al volo. 39 missioni — il più volato',
      description:
        'Terzo orbiter operativo; primo volo STS-41-D (30-8-1984). Lo Shuttle più volato — 39 missioni in 27 anni. Punti salienti: STS-31 (24-4-1990) ha dispiegato il Telescopio Spaziale Hubble; STS-26 (29-9-1988) ritorno al volo post-Challenger; STS-114 (26-7-2005) ritorno al volo post-Columbia; STS-95 (1998) ha riportato in orbita John Glenn a 77 anni; molteplici voli di assemblaggio della ISS. Volo finale STS-133 (24-2-2011) ha consegnato il modulo Leonardo PMM. In mostra a Udvar-Hazy dal 2012.',
      best_known_for:
        'Shuttle più volato (39 missioni); ha dispiegato Hubble + entrambe le missioni di ritorno al volo',
    },
    ja: {
      name: 'ディスカバリー',
      tagline:
        'OV-103 — 三機目のシャトル。Hubble を放出 (STS-31、1990)。両方の Return-to-Flight ミッションを飛行。39 ミッションで最多',
      description:
        '三機目の運用オービタ。初飛行 STS-41-D (1984 年 8 月 30 日)。最多飛行のシャトル — 27 年間で 39 ミッション。主な実績: STS-31 (1990 年 4 月 24 日) で Hubble 宇宙望遠鏡を放出。STS-26 (1988 年 9 月 29 日) はチャレンジャー後の Return-to-Flight。STS-114 (2005 年 7 月 26 日) はコロンビア後の Return-to-Flight。STS-95 (1998) は 77 歳の John Glenn を再び軌道に。複数の ISS 組立ミッションも担当。最終飛行 STS-133 (2011 年 2 月 24 日) は Leonardo PMM を運んだ。2012 年から Udvar-Hazy で展示中。',
      best_known_for: '最多飛行のシャトル (39 ミッション); Hubble 放出 + Return-to-Flight 2 回両方',
    },
    ko: {
      name: '디스커버리',
      tagline:
        'OV-103 — 세 번째 셔틀. 허블 배치(STS-31, 1990); 두 차례의 비행 복귀 임무 수행. 39회 비행 — 최다',
      description:
        '세 번째 운용 궤도선; 첫 비행 STS-41-D(1984-08-30). 가장 많이 비행한 셔틀 — 27년간 39회 임무. 하이라이트: STS-31(1990-04-24)에서 허블 우주망원경 배치; STS-26(1988-09-29) 챌린저 사고 후 비행 복귀; STS-114(2005-07-26) 컬럼비아 사고 후 비행 복귀; STS-95(1998)에서 77세의 John Glenn을 다시 궤도로; 여러 ISS 조립 비행. 최종 비행 STS-133(2011-02-24)에서 Leonardo 영구 다목적 모듈을 전달. 2012년부터 Udvar-Hazy에 전시.',
      best_known_for: '가장 많이 비행한 셔틀(39회); 허블 배치 + 두 차례 비행 복귀 임무',
    },
    nl: {
      tagline:
        'OV-103 — derde Shuttle. Plaatste Hubble in baan (STS-31, 1990); vloog beide return-to-flight-missies. 39 missies — meest gevlogen',
      description:
        'Derde operationele orbiter; eerste vlucht STS-41-D (30-8-1984). Meest gevlogen Shuttle — 39 missies in 27 jaar. Hoogtepunten: STS-31 (24-4-1990) plaatste de Hubble-ruimtetelescoop; STS-26 (29-9-1988) post-Challenger return-to-flight; STS-114 (26-7-2005) post-Columbia return-to-flight; STS-95 (1998) bracht John Glenn op 77-jarige leeftijd terug in baan; meerdere ISS-assemblagevluchten. Laatste vlucht STS-133 (24-2-2011) leverde de Leonardo PMM. Sinds 2012 tentoongesteld in Udvar-Hazy.',
      best_known_for:
        'Meest gevlogen Shuttle (39 missies); plaatste Hubble + beide return-to-flight-missies',
    },
    'pt-BR': {
      tagline:
        'OV-103 — terceiro Shuttle. Implantou o Hubble (STS-31, 1990); voou ambas missões de retorno ao voo. 39 missões — o mais voado',
      description:
        'Terceiro orbiter operacional; primeiro voo STS-41-D (30-8-1984). O Shuttle mais voado — 39 missões em 27 anos. Destaques: STS-31 (24-4-1990) implantou o Telescópio Espacial Hubble; STS-26 (29-9-1988) retorno ao voo pós-Challenger; STS-114 (26-7-2005) retorno ao voo pós-Columbia; STS-95 (1998) devolveu John Glenn à órbita aos 77 anos; múltiplos voos de montagem da ISS. Voo final STS-133 (24-2-2011) entregou o Módulo Multifuncional Permanente Leonardo. Em exibição no Udvar-Hazy desde 2012.',
      best_known_for:
        'Shuttle mais voado (39 missões); implantou Hubble + ambas missões de retorno ao voo',
    },
    ru: {
      name: 'Дискавери',
      tagline:
        'OV-103 — третий шаттл. Вывел Хаббл (STS-31, 1990); летал в обеих миссиях возвращения к полётам. 39 миссий — больше всех',
      description:
        'Третий эксплуатационный орбитер; первый полёт STS-41-D (30.08.1984). Самый летающий шаттл — 39 миссий за 27 лет. Ключевые моменты: STS-31 (24.04.1990) вывел телескоп «Хаббл»; STS-26 (29.09.1988) возвращение к полётам после «Челленджера»; STS-114 (26.07.2005) возвращение к полётам после «Колумбии»; STS-95 (1998) вернул Джона Гленна на орбиту в 77 лет; множество полётов по сборке МКС. Последний полёт STS-133 (24.02.2011) доставил модуль Leonardo. Экспонируется в Udvar-Hazy с 2012 года.',
      best_known_for:
        'Самый летающий шаттл (39 миссий); вывел Хаббл + обе миссии возвращения к полётам',
    },
    'sr-Cyrl': {
      tagline:
        'OV-103 — трећи шатл. Лансирао је Хабл (STS-31, 1990); летио оба повратак-у-лет лета. 39 мисија — највише од свих',
      description:
        'Трећи оперативни орбитер; први лет STS-41-D (30.08.1984). Шатл са највише летова — 39 мисија током 27 година. Истакнути моменти: STS-31 (24.04.1990) лансирао Хабл свемирски телескоп; STS-26 (29.09.1988) повратак у лет после Челенџера; STS-114 (26.07.2005) повратак у лет после Колумбије; STS-95 (1998) вратио Џона Глена у орбиту са 77 година; више летова за склапање МСС-а. Последњи лет STS-133 (24.02.2011) донео Леонардо PMM. На изложби у Udvar-Hazy од 2012.',
      best_known_for: 'Шатл са највише летова (39); лансирао Хабл + оба повратак-у-лет лета',
    },
    'zh-CN': {
      name: '发现号',
      tagline:
        'OV-103 — 第三艘航天飞机。1990 年 STS-31 部署哈勃；执行两次复飞任务。39 次飞行 — 飞行最多',
      description:
        '第三艘投入运营的轨道器；首飞 STS-41-D（1984-08-30）。飞行次数最多的航天飞机 — 27 年间 39 次任务。亮点：STS-31（1990-04-24）部署哈勃太空望远镜；STS-26（1988-09-29）挑战者号事故后复飞；STS-114（2005-07-26）哥伦比亚号事故后复飞；STS-95（1998）让 77 岁的 John Glenn 重返轨道；多次 ISS 组装飞行。最终飞行 STS-133（2011-02-24）送出 Leonardo 永久多用途模块。2012 年起在 Udvar-Hazy 展出。',
      best_known_for: '飞行最多的航天飞机（39 次）；部署哈勃 + 两次复飞任务',
    },
  },
  atlantis: {
    ar: {
      tagline:
        'OV-104 — رابع مكوك. حلّق آخر مهمة شاتل STS-135 (2011)؛ آخر صيانة Hubble STS-125؛ نشر Galileo + Magellan',
      description:
        'رابع مكوك تشغيلي؛ أول رحلة STS-51-J (1985-10-03) كانت مهمة DoD سرية. أبرز المعالم: نشر Magellan (STS-30، 1989) و Galileo (STS-34، 1989) — مسبارا الكواكب اللذان فتحا Venus و Jupiter للمراقبة طويلة الأمد؛ حلّق 7 من 9 مهام Shuttle-Mir بين 1995-1997؛ حلّق آخر مهمة لصيانة Hubble STS-125 (2009-05) — الوحيدة بعد Columbia التي لم تكن ISS-rendezvous؛ حلّق STS-135 (2011-07) — آخر رحلة شاتل على الإطلاق. معروض في Kennedy Space Center منذ 2013.',
      best_known_for:
        'حلّق آخر مهمة شاتل STS-135 (2011)؛ نشر Galileo + Magellan؛ آخر صيانة Hubble STS-125',
    },
    de: {
      tagline:
        'OV-104 — vierter Shuttle. Flog die letzte Shuttle-Mission STS-135 (2011); letzte Hubble-Wartung STS-125; setzte Galileo + Magellan aus',
      description:
        'Vierter operationeller Orbiter; Erstflug STS-51-J (3.10.1985) war eine geheime DoD-Mission. Höhepunkte: setzte Magellan (STS-30, 1989) und Galileo (STS-34, 1989) aus — die zwei Planetensonden, die Venus und Jupiter für langfristige Beobachtung öffneten; flog 7 von 9 Shuttle-Mir-Andockmissionen zwischen 1995-1997; flog die letzte Hubble-Wartungsmission STS-125 (5/2009) — die einzige Post-Columbia-Mission ohne ISS-Rendezvous; flog STS-135 (7/2011) — der letzte Shuttle-Flug überhaupt. Im Kennedy Space Center Visitor Complex seit 2013.',
      best_known_for:
        'Flog letzte Shuttle-Mission STS-135 (2011); setzte Galileo + Magellan aus; letzte Hubble-Wartung STS-125',
    },
    es: {
      tagline:
        'OV-104 — cuarto Shuttle. Voló la última misión STS-135 (2011); última servicing del Hubble STS-125; desplegó Galileo + Magellan',
      description:
        'Cuarto orbiter operativo; primer vuelo STS-51-J (3-10-1985) fue una misión clasificada del DoD. Hitos: desplegó Magellan (STS-30, 1989) y Galileo (STS-34, 1989) — las dos sondas planetarias que abrieron Venus y Júpiter a observación de larga duración; voló 7 de las 9 misiones de acoplamiento Shuttle-Mir entre 1995-1997; voló la última misión de servicing del Hubble STS-125 (5/2009) — la única post-Columbia sin rendez-vous con la ISS; voló STS-135 (7/2011) — el último vuelo del Shuttle. En exhibición en Kennedy Space Center desde 2013.',
      best_known_for:
        'Voló última misión Shuttle STS-135 (2011); desplegó Galileo + Magellan; última servicing del Hubble STS-125',
    },
    fr: {
      tagline:
        'OV-104 — quatrième navette. A volé la dernière mission STS-135 (2011) ; dernière maintenance Hubble STS-125 ; a déployé Galileo + Magellan',
      description:
        "Quatrième orbiteur opérationnel ; premier vol STS-51-J (3-10-1985) était une mission DoD classifiée. Moments forts : a déployé Magellan (STS-30, 1989) et Galileo (STS-34, 1989) — les deux sondes planétaires qui ont ouvert Vénus et Jupiter à l'observation longue durée ; a volé 7 des 9 missions d'amarrage Shuttle-Mir entre 1995-1997 ; a volé la dernière mission de maintenance Hubble STS-125 (5-2009) — la seule post-Columbia sans rendez-vous avec l'ISS ; a volé STS-135 (7-2011) — le dernier vol de la navette. Exposée au Kennedy Space Center depuis 2013.",
      best_known_for:
        'A volé la dernière mission Shuttle STS-135 (2011) ; a déployé Galileo + Magellan ; dernière maintenance Hubble STS-125',
    },
    hi: {
      tagline:
        'OV-104 — चौथा शटल। अंतिम शटल मिशन STS-135 (2011) उड़ाया; अंतिम Hubble सर्विसिंग STS-125; Galileo + Magellan तैनात किए',
      description:
        'चौथा परिचालन ऑर्बिटर; पहली उड़ान STS-51-J (1985-10-03) एक वर्गीकृत DoD मिशन था। मुख्य आकर्षण: Magellan (STS-30, 1989) और Galileo (STS-34, 1989) तैनात किए — दो ग्रहीय जांच जिन्होंने Venus और Jupiter को लंबी अवधि की पर्यवेक्षण के लिए खोला; 1995-1997 के बीच 9 में से 7 Shuttle-Mir डॉकिंग मिशन उड़ाए; अंतिम Hubble सर्विसिंग मिशन STS-125 (2009-05) उड़ाया — Columbia के बाद की एकमात्र गैर-ISS-rendezvous मिशन; STS-135 (2011-07) उड़ाया — कभी का अंतिम शटल उड़ान। 2013 से Kennedy Space Center में प्रदर्शित।',
      best_known_for:
        'अंतिम शटल मिशन STS-135 (2011); Galileo + Magellan तैनात; अंतिम Hubble सर्विसिंग STS-125',
    },
    it: {
      tagline:
        "OV-104 — quarto Shuttle. Ha volato l'ultima missione STS-135 (2011); ultima manutenzione Hubble STS-125; ha dispiegato Galileo + Magellan",
      description:
        "Quarto orbiter operativo; primo volo STS-51-J (3-10-1985) era una missione DoD classificata. Punti salienti: ha dispiegato Magellan (STS-30, 1989) e Galileo (STS-34, 1989) — le due sonde planetarie che hanno aperto Venere e Giove all'osservazione di lunga durata; ha volato 7 delle 9 missioni di docking Shuttle-Mir tra 1995-1997; ha volato l'ultima missione di manutenzione Hubble STS-125 (5-2009) — l'unica post-Columbia senza rendez-vous con la ISS; ha volato STS-135 (7-2011) — l'ultimo volo Shuttle. In mostra al Kennedy Space Center dal 2013.",
      best_known_for:
        "Ha volato l'ultima missione Shuttle STS-135 (2011); ha dispiegato Galileo + Magellan; ultima manutenzione Hubble STS-125",
    },
    ja: {
      name: 'アトランティス',
      tagline:
        'OV-104 — 四機目のシャトル。シャトル最後の任務 STS-135 (2011) を飛行；最後の Hubble 補修 STS-125；Galileo + Magellan を放出',
      description:
        '四機目の運用オービタ。初飛行 STS-51-J (1985 年 10 月 3 日) は機密の DoD ミッション。主な実績: Magellan (STS-30、1989) と Galileo (STS-34、1989) を放出 — 金星と木星を長期観測に開いた 2 つの惑星探査機。1995〜1997 年に 9 回中 7 回の Shuttle-Mir ドッキングを担当。最後の Hubble 補修ミッション STS-125 (2009 年 5 月) を飛行 — コロンビア後で唯一 ISS にランデブーしなかったミッション。STS-135 (2011 年 7 月) を飛行 — シャトルの歴史で最後のフライト。2013 年から Kennedy Space Center Visitor Complex に展示。',
      best_known_for:
        'シャトル最後の任務 STS-135 (2011); Galileo + Magellan 放出; 最後の Hubble 補修 STS-125',
    },
    ko: {
      name: '아틀란티스',
      tagline:
        'OV-104 — 네 번째 셔틀. 마지막 셔틀 임무 STS-135(2011) 수행; 마지막 허블 정비 STS-125; 갈릴레오 + 마젤란 배치',
      description:
        '네 번째 운용 궤도선; 첫 비행 STS-51-J(1985-10-03)는 기밀 DoD 임무. 하이라이트: 마젤란(STS-30, 1989)과 갈릴레오(STS-34, 1989) 배치 — 금성과 목성을 장기 관측에 개방한 두 행성 탐사선; 1995-1997년 9회의 셔틀-미르 도킹 임무 중 7회 수행; 마지막 허블 정비 임무 STS-125(2009-05) — 컬럼비아 사고 이후 유일한 비 ISS 랑데부 임무; STS-135(2011-07) — 셔틀 역사상 마지막 비행. 2013년부터 Kennedy Space Center Visitor Complex에 전시.',
      best_known_for:
        '마지막 셔틀 임무 STS-135(2011); 갈릴레오 + 마젤란 배치; 마지막 허블 정비 STS-125',
    },
    nl: {
      tagline:
        'OV-104 — vierde Shuttle. Vloog laatste Shuttle-missie STS-135 (2011); laatste Hubble-onderhoud STS-125; plaatste Galileo + Magellan',
      description:
        'Vierde operationele orbiter; eerste vlucht STS-51-J (3-10-1985) was een geclassificeerde DoD-missie. Hoogtepunten: plaatste Magellan (STS-30, 1989) en Galileo (STS-34, 1989) — de twee planetaire sondes die Venus en Jupiter openden voor langetermijnobservatie; vloog 7 van de 9 Shuttle-Mir-koppelingsmissies tussen 1995-1997; vloog de laatste Hubble-onderhoudsmissie STS-125 (5-2009) — de enige post-Columbia missie zonder ISS-rendezvous; vloog STS-135 (7-2011) — de laatste Shuttle-vlucht ooit. Tentoongesteld in Kennedy Space Center sinds 2013.',
      best_known_for:
        'Vloog laatste Shuttle-missie STS-135 (2011); plaatste Galileo + Magellan; laatste Hubble-onderhoud STS-125',
    },
    'pt-BR': {
      tagline:
        'OV-104 — quarto Shuttle. Voou a missão final STS-135 (2011); última servicing do Hubble STS-125; implantou Galileo + Magellan',
      description:
        'Quarto orbiter operacional; primeiro voo STS-51-J (3-10-1985) foi uma missão DoD classificada. Destaques: implantou Magellan (STS-30, 1989) e Galileo (STS-34, 1989) — as duas sondas planetárias que abriram Vênus e Júpiter para observação de longa duração; voou 7 das 9 missões de acoplamento Shuttle-Mir entre 1995-1997; voou a missão final de servicing do Hubble STS-125 (5-2009) — a única pós-Columbia sem rendezvous com a ISS; voou STS-135 (7-2011) — o último voo Shuttle de todos. Em exibição no Kennedy Space Center desde 2013.',
      best_known_for:
        'Voou missão final Shuttle STS-135 (2011); implantou Galileo + Magellan; última servicing do Hubble STS-125',
    },
    ru: {
      name: 'Атлантис',
      tagline:
        'OV-104 — четвёртый шаттл. Летал в последней миссии STS-135 (2011); последнее обслуживание Хаббла STS-125; вывел Galileo + Magellan',
      description:
        'Четвёртый эксплуатационный орбитер; первый полёт STS-51-J (03.10.1985) был секретной миссией DoD. Ключевые моменты: вывел Magellan (STS-30, 1989) и Galileo (STS-34, 1989) — два планетных зонда, открывших Венеру и Юпитер для долговременных наблюдений; летал в 7 из 9 миссий стыковки шаттл-Мир в 1995-1997 годах; летал в последней миссии обслуживания Хаббла STS-125 (5/2009) — единственная пост-«Колумбия» миссия без рандеву с МКС; летал в STS-135 (7/2011) — последний полёт шаттла. Экспонируется в Kennedy Space Center с 2013 года.',
      best_known_for:
        'Летал в последней миссии шаттла STS-135 (2011); вывел Galileo + Magellan; последнее обслуживание Хаббла STS-125',
    },
    'sr-Cyrl': {
      tagline:
        'OV-104 — четврти шатл. Летио последњу шатл мисију STS-135 (2011); последње Хаблово сервисирање STS-125; лансирао Galileo + Magellan',
      description:
        'Четврти оперативни орбитер; први лет STS-51-J (03.10.1985) био је поверљива DoD мисија. Истакнути моменти: лансирао Magellan (STS-30, 1989) и Galileo (STS-34, 1989) — две планетарне сонде које су отвориле Венеру и Јупитер за дугорочно посматрање; летио 7 од 9 шатл-Мир мисија у периоду 1995-1997; летио последњу Хаблову мисију сервисирања STS-125 (5/2009) — једина пост-Колумбија мисија без рандеву са МСС-ом; летио STS-135 (7/2011) — последњи шатл лет икад. На изложби у Kennedy Space Center од 2013.',
      best_known_for:
        'Летио последњу шатл мисију STS-135 (2011); лансирао Galileo + Magellan; последње Хаблово сервисирање STS-125',
    },
    'zh-CN': {
      name: '亚特兰蒂斯号',
      tagline:
        'OV-104 — 第四艘航天飞机。执行最后的航天飞机任务 STS-135（2011）；最后一次哈勃维护 STS-125；部署伽利略 + 麦哲伦',
      description:
        '第四艘投入运营的轨道器；首飞 STS-51-J（1985-10-03）是机密的 DoD 任务。亮点：部署麦哲伦（STS-30，1989）和伽利略（STS-34，1989）— 这两个行星探测器开启了对金星和木星的长期观测；1995-1997 年间执行 9 次航天飞机-和平号对接任务中的 7 次；执行最后一次哈勃维护任务 STS-125（2009-05）— 哥伦比亚事故后唯一不与 ISS 会合的任务；执行 STS-135（2011-07）— 航天飞机历史上最后一次飞行。2013 年起在 Kennedy Space Center 展出。',
      best_known_for:
        '最后航天飞机任务 STS-135（2011）；部署伽利略 + 麦哲伦；最后一次哈勃维护 STS-125',
    },
  },
  endeavour: {
    ar: {
      tagline:
        'OV-105 — خامس وأحدث مكوك. أول صيانة Hubble STS-61 (1993)؛ سلّم Unity + Canadarm2 + Tranquility/Cupola',
      description:
        'خامس وآخر مكوك تشغيلي، بُني من قطع غيار هيكلية بعد Challenger ترك NASA بثلاثة مكوكات مؤهلة للطيران فقط. سُمي عبر مسابقة مدارس وطنية باسم HMS Endeavour للكابتن Cook. أول رحلة STS-49 (1992-05-07) شملت أول EVA لثلاثة أشخاص (لالتقاط القمر الصناعي Intelsat VI العالق). أبرز المعالم: STS-61 (1993-12) أول صيانة Hubble؛ STS-88 (1998-12-04) أول رحلة بناء ISS تسلّم Unity؛ STS-100 (2001-04) ركّب Canadarm2؛ STS-130 (2010-02) ركّب Tranquility + Cupola؛ STS-134 (2011-05) ركّب كاشف AMS-02. معروض في California Science Center، LA.',
      best_known_for:
        'أحدث مكوك؛ أول صيانة Hubble STS-61 (1993)؛ سلّم Unity + Canadarm2 + Tranquility/Cupola',
    },
    de: {
      tagline:
        'OV-105 — fünfter und jüngster Shuttle. Erste Hubble-Wartung STS-61 (1993); lieferte Unity + Canadarm2 + Tranquility/Cupola',
      description:
        'Fünfter und letzter operationeller Orbiter, gebaut aus strukturellen Ersatzteilen nachdem Challenger NASA mit nur drei flugfähigen Orbitern zurückließ. Benannt nach Captain Cooks HMS Endeavour über einen nationalen Schülerwettbewerb. Erstflug STS-49 (7.5.1992) führte den ersten Drei-Personen-EVA durch (zum Einfangen des gestrandeten Intelsat-VI-Satelliten). Höhepunkte: STS-61 (12/1993) erste Hubble-Wartung; STS-88 (4.12.1998) erster ISS-Aufbauflug, lieferte Unity; STS-100 (4/2001) installierte Canadarm2; STS-130 (2/2010) installierte Tranquility + Cupola; STS-134 (5/2011) installierte den AMS-02 Kosmische-Strahlung-Detektor. Im California Science Center, LA, ausgestellt.',
      best_known_for:
        'Jüngster Shuttle; erste Hubble-Wartung STS-61 (1993); lieferte Unity + Canadarm2 + Tranquility/Cupola',
    },
    es: {
      tagline:
        'OV-105 — quinto y más joven Shuttle. Primera servicing del Hubble STS-61 (1993); entregó Unity + Canadarm2 + Tranquility/Cupola',
      description:
        'Quinto y último orbiter operativo, construido a partir de repuestos estructurales después que Challenger dejó a NASA con solo tres orbiters operativos. Nombrado por el HMS Endeavour del Capitán Cook a través de un concurso escolar nacional. Primer vuelo STS-49 (7-5-1992) incluyó el primer EVA de tres personas (para capturar el satélite Intelsat VI varado). Hitos: STS-61 (12-1993) primera servicing del Hubble; STS-88 (4-12-1998) primer vuelo de ensamblaje de ISS, entregó Unity; STS-100 (4-2001) instaló Canadarm2; STS-130 (2-2010) instaló Tranquility + Cupola; STS-134 (5-2011) instaló el detector AMS-02. En exhibición en el California Science Center, LA.',
      best_known_for:
        'Shuttle más joven; primera servicing del Hubble STS-61 (1993); entregó Unity + Canadarm2 + Tranquility/Cupola',
    },
    fr: {
      tagline:
        'OV-105 — cinquième et plus jeune navette. Première maintenance Hubble STS-61 (1993) ; a livré Unity + Canadarm2 + Tranquility/Cupola',
      description:
        "Cinquième et dernier orbiteur opérationnel, construit à partir de pièces de rechange structurelles après que Challenger ait laissé NASA avec seulement trois orbiteurs opérationnels. Baptisée d'après HMS Endeavour du capitaine Cook via un concours national d'écoles. Premier vol STS-49 (7-5-1992) incluait la première EVA à trois personnes (pour capturer le satellite Intelsat VI échoué). Moments forts : STS-61 (12-1993) première maintenance Hubble ; STS-88 (4-12-1998) premier vol d'assemblage ISS, livraison d'Unity ; STS-100 (4-2001) installation de Canadarm2 ; STS-130 (2-2010) installation de Tranquility + Cupola ; STS-134 (5-2011) installation du détecteur AMS-02. Exposée au California Science Center, LA.",
      best_known_for:
        'Navette la plus jeune ; première maintenance Hubble STS-61 (1993) ; a livré Unity + Canadarm2 + Tranquility/Cupola',
    },
    hi: {
      tagline:
        'OV-105 — पांचवां और सबसे नया शटल। पहली Hubble सर्विसिंग STS-61 (1993); Unity + Canadarm2 + Tranquility/Cupola दिए',
      description:
        'पांचवां और अंतिम परिचालन ऑर्बिटर, Challenger के बाद NASA को केवल तीन उड़ान-योग्य ऑर्बिटर के साथ छोड़ने के बाद संरचनात्मक स्पेयर से बनाया गया। Captain Cook के HMS Endeavour के नाम पर एक राष्ट्रीय स्कूल प्रतियोगिता के माध्यम से नाम दिया गया। पहली उड़ान STS-49 (1992-05-07) में फंसे Intelsat VI उपग्रह को पकड़ने के लिए पहला तीन-व्यक्ति EVA शामिल था। मुख्य आकर्षण: STS-61 (1993-12) पहली Hubble सर्विसिंग; STS-88 (1998-12-04) पहली ISS असेंबली उड़ान, Unity दिया; STS-100 (2001-04) Canadarm2 स्थापित किया; STS-130 (2010-02) Tranquility + Cupola स्थापित किए; STS-134 (2011-05) AMS-02 कॉस्मिक-रे डिटेक्टर स्थापित किया। California Science Center, LA में प्रदर्शित।',
      best_known_for:
        'सबसे नया शटल; पहली Hubble सर्विसिंग STS-61 (1993); Unity + Canadarm2 + Tranquility/Cupola दिए',
    },
    it: {
      tagline:
        'OV-105 — quinto e più giovane Shuttle. Prima manutenzione Hubble STS-61 (1993); ha consegnato Unity + Canadarm2 + Tranquility/Cupola',
      description:
        'Quinto e ultimo orbiter operativo, costruito da ricambi strutturali dopo che Challenger ha lasciato NASA con solo tre orbiter abilitati al volo. Nominato dal HMS Endeavour del Capitano Cook tramite un concorso scolastico nazionale. Primo volo STS-49 (7-5-1992) includeva la prima EVA a tre persone (per catturare il satellite Intelsat VI bloccato). Punti salienti: STS-61 (12-1993) prima manutenzione Hubble; STS-88 (4-12-1998) primo volo di assemblaggio ISS, ha consegnato Unity; STS-100 (4-2001) ha installato Canadarm2; STS-130 (2-2010) ha installato Tranquility + Cupola; STS-134 (5-2011) ha installato il rivelatore AMS-02. In mostra al California Science Center, LA.',
      best_known_for:
        'Shuttle più giovane; prima manutenzione Hubble STS-61 (1993); ha consegnato Unity + Canadarm2 + Tranquility/Cupola',
    },
    ja: {
      name: 'エンデバー',
      tagline:
        'OV-105 — 五機目で最も新しいシャトル。Hubble の初補修 STS-61 (1993)；Unity + Canadarm2 + Tranquility/Cupola を運んだ',
      description:
        '五機目で最後の運用オービタ。チャレンジャー事故で NASA が飛行可能な機体を 3 機しか持たなくなった後、構造スペアから建造された。全米の学校コンテストでキャプテン・クックの HMS Endeavour にちなんで命名。初飛行 STS-49 (1992 年 5 月 7 日) では立ち往生していた Intelsat VI 衛星を救出する初の 3 人 EVA を実施。主な実績: STS-61 (1993 年 12 月) Hubble の初補修；STS-88 (1998 年 12 月 4 日) 最初の ISS 組立飛行で Unity を運搬；STS-100 (2001 年 4 月) Canadarm2 を取り付け；STS-130 (2010 年 2 月) Tranquility + Cupola を取り付け；STS-134 (2011 年 5 月) AMS-02 宇宙線検出器を取り付け。California Science Center (LA) に展示。',
      best_known_for:
        '最も新しいシャトル；Hubble 初補修 STS-61 (1993)；Unity + Canadarm2 + Tranquility/Cupola を運搬',
    },
    ko: {
      name: '엔데버',
      tagline:
        'OV-105 — 다섯 번째이자 가장 젊은 셔틀. 최초 허블 정비 STS-61(1993); Unity + Canadarm2 + Tranquility/Cupola 전달',
      description:
        '다섯 번째이자 마지막 운용 궤도선. 챌린저 사고로 NASA에 운용 가능한 궤도선이 3대만 남게 된 후 구조 예비 부품으로 제작. 캡틴 쿡의 HMS Endeavour를 따라 전국 학교 공모전을 통해 명명. 첫 비행 STS-49(1992-05-07)에서 표류 중이던 Intelsat VI 위성을 회수하는 최초의 3인 EVA 수행. 하이라이트: STS-61(1993-12) 최초 허블 정비; STS-88(1998-12-04) 최초 ISS 조립 비행, Unity 전달; STS-100(2001-04) Canadarm2 설치; STS-130(2010-02) Tranquility + Cupola 설치; STS-134(2011-05) AMS-02 우주선 검출기 설치. California Science Center (LA)에 전시.',
      best_known_for:
        '가장 젊은 셔틀; 최초 허블 정비 STS-61(1993); Unity + Canadarm2 + Tranquility/Cupola 전달',
    },
    nl: {
      tagline:
        'OV-105 — vijfde en jongste Shuttle. Eerste Hubble-onderhoud STS-61 (1993); leverde Unity + Canadarm2 + Tranquility/Cupola',
      description:
        "Vijfde en laatste operationele orbiter, gebouwd uit structurele reservedelen nadat Challenger NASA met slechts drie vluchtwaardige orbiters achterliet. Genoemd naar Captain Cook's HMS Endeavour via een nationale schoolwedstrijd. Eerste vlucht STS-49 (7-5-1992) omvatte de eerste EVA met drie personen (om de gestrande Intelsat VI-satelliet te vangen). Hoogtepunten: STS-61 (12-1993) eerste Hubble-onderhoud; STS-88 (4-12-1998) eerste ISS-assemblagevlucht, leverde Unity; STS-100 (4-2001) installeerde Canadarm2; STS-130 (2-2010) installeerde Tranquility + Cupola; STS-134 (5-2011) installeerde de AMS-02 kosmische-stralingsdetector. Tentoongesteld in het California Science Center, LA.",
      best_known_for:
        'Jongste Shuttle; eerste Hubble-onderhoud STS-61 (1993); leverde Unity + Canadarm2 + Tranquility/Cupola',
    },
    'pt-BR': {
      tagline:
        'OV-105 — quinto e mais jovem Shuttle. Primeira servicing do Hubble STS-61 (1993); entregou Unity + Canadarm2 + Tranquility/Cupola',
      description:
        'Quinto e último orbiter operacional, construído a partir de peças sobressalentes estruturais após Challenger deixar a NASA com apenas três orbiters operacionais. Nomeado pelo HMS Endeavour do Capitão Cook via concurso escolar nacional. Primeiro voo STS-49 (7-5-1992) incluiu o primeiro EVA de três pessoas (para capturar o satélite Intelsat VI encalhado). Destaques: STS-61 (12-1993) primeira servicing do Hubble; STS-88 (4-12-1998) primeiro voo de montagem da ISS, entregou Unity; STS-100 (4-2001) instalou Canadarm2; STS-130 (2-2010) instalou Tranquility + Cupola; STS-134 (5-2011) instalou o detector AMS-02. Em exibição no California Science Center, LA.',
      best_known_for:
        'Shuttle mais jovem; primeira servicing do Hubble STS-61 (1993); entregou Unity + Canadarm2 + Tranquility/Cupola',
    },
    ru: {
      name: 'Индевор',
      tagline:
        'OV-105 — пятый и самый молодой шаттл. Первое обслуживание Хаббла STS-61 (1993); доставил Unity + Canadarm2 + Tranquility/Cupola',
      description:
        'Пятый и последний эксплуатационный орбитер, построенный из структурных запчастей после того, как «Челленджер» оставил NASA с всего тремя пригодными к полёту орбитерами. Назван в честь HMS Endeavour капитана Кука через национальный школьный конкурс. Первый полёт STS-49 (07.05.1992) включал первый трёхчеловечный выход в открытый космос (для захвата застрявшего спутника Intelsat VI). Ключевые моменты: STS-61 (12/1993) первое обслуживание Хаббла; STS-88 (04.12.1998) первый полёт по сборке МКС, доставил Unity; STS-100 (4/2001) установил Canadarm2; STS-130 (2/2010) установил Tranquility + Cupola; STS-134 (5/2011) установил детектор космических лучей AMS-02. Экспонируется в California Science Center в Лос-Анджелесе.',
      best_known_for:
        'Самый молодой шаттл; первое обслуживание Хаббла STS-61 (1993); доставил Unity + Canadarm2 + Tranquility/Cupola',
    },
    'sr-Cyrl': {
      tagline:
        'OV-105 — пети и најмлађи шатл. Прво Хаблово сервисирање STS-61 (1993); доставио Unity + Canadarm2 + Tranquility/Cupola',
      description:
        'Пети и последњи оперативни орбитер, изграђен од структурних резервних делова након што је Челенџер оставио НАСА са само три орбитера способних за лет. Назван по HMS Endeavour капетана Кука кроз национално школско такмичење. Први лет STS-49 (07.05.1992) укључио је први тро-особни EVA (за хватање заглављеног Intelsat VI сателита). Истакнути моменти: STS-61 (12/1993) прво Хаблово сервисирање; STS-88 (04.12.1998) први лет за склапање МСС-а, доставио Unity; STS-100 (4/2001) инсталирао Canadarm2; STS-130 (2/2010) инсталирао Tranquility + Cupola; STS-134 (5/2011) инсталирао AMS-02 детектор космичких зрака. На изложби у California Science Center, LA.',
      best_known_for:
        'Најмлађи шатл; прво Хаблово сервисирање STS-61 (1993); доставио Unity + Canadarm2 + Tranquility/Cupola',
    },
    'zh-CN': {
      name: '奋进号',
      tagline:
        'OV-105 — 第五艘也是最年轻的航天飞机。首次哈勃维护 STS-61（1993）；交付 Unity + Canadarm2 + Tranquility/Cupola',
      description:
        '第五艘也是最后一艘投入运营的轨道器。挑战者号事故后 NASA 只剩三架可飞行轨道器，遂从结构备件建造。通过全国学生命名竞赛以库克船长的 HMS Endeavour 命名。首飞 STS-49（1992-05-07）包括首次三人 EVA（捕获滞留的 Intelsat VI 卫星）。亮点：STS-61（1993-12）首次哈勃维护；STS-88（1998-12-04）首次 ISS 组装飞行，交付 Unity；STS-100（2001-04）安装 Canadarm2；STS-130（2010-02）安装 Tranquility + Cupola；STS-134（2011-05）安装 AMS-02 宇宙射线探测器。现在洛杉矶 California Science Center 展出。',
      best_known_for:
        '最年轻的航天飞机；首次哈勃维护 STS-61（1993）；交付 Unity + Canadarm2 + Tranquility/Cupola',
    },
  },
  enterprise: {
    ar: {
      tagline:
        'OV-101 — مكوك النموذج الأولي. أُعيدت تسميته من Constitution بعد حملة معجبي Star Trek. حلّق اختبارات جوية 1977؛ لم يصل إلى المدار',
      description:
        'دُعي في الأصل Constitution، أُعيدت تسميته Enterprise بعد حملة رسائل معجبين مرتبطة بالذكرى العاشرة لـ Star Trek. بُني كنموذج أولي لاختبارات الاقتراب والهبوط (ALT) — ثماني رحلات حملية وخمس حرة من طائرة Shuttle Carrier فوق قاعدة Edwards الجوية في 1977. أول رحلة حرة 1977-08-12 طارها Fred Haise + Gordon Fullerton — أثبتت أن المكوك يمكنه الانزلاق والهبوط. لم يحتوِ على دفع أو بلاطات TPS نشطة؛ تحويل Enterprise إلى مركبة طيران كان مقدراً أثقل من بناء مكوك جديد، لذا بُني Challenger بدلاً منه. الآن معروض في متحف Intrepid في NYC.',
      best_known_for: 'مكوك النموذج الأولي؛ اختبارات هبوط جوي 1977؛ لم يصل إلى المدار',
    },
    de: {
      tagline:
        'OV-101 — der Prototyp-Shuttle. Umbenannt von Constitution nach einer Star-Trek-Fan-Kampagne. Flog die 1977er Atmosphäre-Drop-Tests, nie zum Orbit',
      description:
        'Ursprünglich Constitution genannt, umbenannt zu Enterprise nach einer Fanbrief-Kampagne zum 10. Star-Trek-Jubiläum. Gebaut als Prototyp für die Approach and Landing Tests (ALT) — acht Captive-Flüge und fünf Freiflüge vom Shuttle Carrier Aircraft (einer modifizierten Boeing 747) über Edwards AFB im Jahr 1977. Erster Freiflug 12.8.1977, geflogen von Fred Haise + Gordon Fullerton — bewies, dass der Orbiter gleiten und landen kann. Enthielt KEINEN Antrieb oder aktive TPS-Kacheln; Enterprise zu einem flugfähigen Fahrzeug umzubauen wurde als schwerer eingeschätzt als einen neuen Orbiter aus Ersatzteilen zu bauen, also wurde Challenger gebaut. Jetzt im Intrepid Museum, NYC, ausgestellt.',
      best_known_for: 'Prototyp-Shuttle; 1977 Atmosphäre-Drop-Tests; flog nie zum Orbit',
    },
    es: {
      tagline:
        'OV-101 — el Shuttle prototipo. Renombrado de Constitution tras una campaña de fans de Star Trek. Voló las pruebas atmosféricas de 1977; nunca alcanzó la órbita',
      description:
        'Originalmente llamado Constitution, renombrado Enterprise tras una campaña de cartas de fans ligada al 10º aniversario de Star Trek. Construido como prototipo para las Approach and Landing Tests (ALT) — ocho vuelos cautivos y cinco vuelos libres desde el Shuttle Carrier Aircraft (un Boeing 747 modificado) sobre Edwards AFB en 1977. Primer vuelo libre el 12-8-1977 pilotado por Fred Haise + Gordon Fullerton — demostró que el orbiter podía planear y aterrizar. NO contenía propulsión ni baldosas de TPS activas; convertir Enterprise a un vehículo operativo se estimó más pesado que construir un nuevo orbiter desde repuestos, así que se construyó Challenger. Ahora en exhibición en el Intrepid Museum de NYC.',
      best_known_for: 'Shuttle prototipo; pruebas atmosféricas de 1977; nunca alcanzó la órbita',
    },
    fr: {
      tagline:
        'OV-101 — la navette prototype. Renommée de Constitution après une campagne de fans Star Trek. A volé les tests atmosphériques de 1977 ; jamais en orbite',
      description:
        "Initialement appelée Constitution, renommée Enterprise après une campagne de lettres de fans liée au 10e anniversaire de Star Trek. Construite comme prototype pour les Approach and Landing Tests (ALT) — huit vols captifs et cinq vols libres depuis le Shuttle Carrier Aircraft (un Boeing 747 modifié) au-dessus d'Edwards AFB en 1977. Premier vol libre le 12-8-1977 piloté par Fred Haise + Gordon Fullerton — a prouvé que l'orbiteur pouvait planer et atterrir. NE contenait PAS de propulsion ni de tuiles TPS actives ; convertir Enterprise en véhicule opérationnel a été estimé plus lourd que construire un nouvel orbiteur à partir de pièces, donc Challenger a été construit. Maintenant exposée à l'Intrepid Museum, NYC.",
      best_known_for: 'Navette prototype ; tests atmosphériques de 1977 ; jamais en orbite',
    },
    hi: {
      tagline:
        'OV-101 — प्रोटोटाइप शटल। Star Trek प्रशंसक अभियान के बाद Constitution से नाम बदला। 1977 वायुमंडलीय परीक्षण उड़ाए; कभी कक्षा में नहीं पहुंचा',
      description:
        'मूल रूप से Constitution कहा जाता था, Star Trek की 10वीं वर्षगांठ से जुड़े प्रशंसक पत्र अभियान के बाद Enterprise का नाम बदला। Approach and Landing Tests (ALT) के लिए प्रोटोटाइप के रूप में बनाया गया — 1977 में Edwards AFB पर Shuttle Carrier Aircraft (एक संशोधित Boeing 747) से आठ कैप्टिव उड़ानें और पांच मुक्त उड़ानें। पहली मुक्त उड़ान 1977-08-12 को Fred Haise + Gordon Fullerton ने उड़ाई — साबित किया कि ऑर्बिटर ग्लाइड और लैंड कर सकता है। प्रोपल्शन या सक्रिय TPS टाइलें नहीं थीं; Enterprise को उड़ान-योग्य वाहन में बदलना नए ऑर्बिटर बनाने से भारी अनुमानित था, इसलिए Challenger बनाया गया। अब NYC के Intrepid Museum में प्रदर्शित।',
      best_known_for: 'प्रोटोटाइप शटल; 1977 वायुमंडलीय परीक्षण; कभी कक्षा में नहीं',
    },
    it: {
      tagline:
        'OV-101 — lo Shuttle prototipo. Rinominato da Constitution dopo una campagna di fan di Star Trek. Ha volato i test atmosferici del 1977; mai in orbita',
      description:
        "Originariamente chiamato Constitution, rinominato Enterprise dopo una campagna di lettere di fan legata al 10° anniversario di Star Trek. Costruito come prototipo per gli Approach and Landing Tests (ALT) — otto voli cattivi e cinque voli liberi dallo Shuttle Carrier Aircraft (un Boeing 747 modificato) sopra Edwards AFB nel 1977. Primo volo libero il 12-8-1977 pilotato da Fred Haise + Gordon Fullerton — ha dimostrato che l'orbiter poteva planare e atterrare. NON conteneva propulsione né piastrelle TPS attive; convertire Enterprise in un veicolo operativo è stato stimato più pesante che costruire un nuovo orbiter da pezzi, quindi Challenger è stato costruito. Ora in mostra all'Intrepid Museum di NYC.",
      best_known_for: 'Shuttle prototipo; test atmosferici del 1977; mai in orbita',
    },
    ja: {
      name: 'エンタープライズ',
      tagline:
        'OV-101 — プロトタイプシャトル。Star Trek ファンキャンペーンにより Constitution から改名。1977 年の大気圏内テストを飛行；軌道には到達しなかった',
      description:
        'もともと Constitution と呼ばれていたが、Star Trek 10 周年と結びついたファンレターキャンペーンの後に Enterprise に改名。Approach and Landing Tests (ALT) のプロトタイプとして建造 — 1977 年にエドワーズ空軍基地上空でシャトル運搬機 (改造ボーイング 747) から 8 回の捕獲飛行と 5 回の自由飛行を実施。最初の自由飛行 1977 年 8 月 12 日は Fred Haise + Gordon Fullerton が操縦 — オービタが滑空して着陸できることを実証した。推進システムやアクティブ TPS タイルは含まれていなかった。Enterprise を飛行可能な機体に改造することは新しい機体をスペアパーツから建造するよりも重いと推定されたため、代わりに Challenger が建造された。現在、NYC の Intrepid Museum に展示。',
      best_known_for: 'プロトタイプシャトル；1977 年大気圏内テスト；軌道には到達しなかった',
    },
    ko: {
      name: '엔터프라이즈',
      tagline:
        'OV-101 — 프로토타입 셔틀. Star Trek 팬 캠페인 후 Constitution에서 개명. 1977년 대기 시험 비행; 궤도 도달 안 함',
      description:
        '원래 Constitution이라 불렸으나 Star Trek 10주년 팬레터 캠페인 후 Enterprise로 개명. Approach and Landing Tests(ALT)의 프로토타입으로 제작 — 1977년 에드워즈 공군기지 상공에서 셔틀 운반기(개조된 보잉 747)에서 8회의 포획 비행과 5회의 자유 비행 수행. 첫 자유 비행은 1977-08-12에 Fred Haise + Gordon Fullerton이 조종 — 궤도선이 활공해 착륙할 수 있음을 증명. 추진 시스템이나 활성 TPS 타일은 포함되지 않았음. Enterprise를 비행 가능한 차량으로 개조하는 것이 새 궤도선을 예비 부품으로 만드는 것보다 무겁다고 평가되어 대신 Challenger가 건조됨. 현재 NYC Intrepid Museum에 전시.',
      best_known_for: '프로토타입 셔틀; 1977년 대기 시험; 궤도 도달 안 함',
    },
    nl: {
      tagline:
        'OV-101 — de prototype-Shuttle. Hernoemd van Constitution na een Star Trek-fancampagne. Vloog atmosferische tests in 1977; nooit naar de ruimte',
      description:
        'Oorspronkelijk Constitution genoemd, hernoemd tot Enterprise na een fanbrievencampagne gekoppeld aan Star Treks 10-jarig jubileum. Gebouwd als prototype voor de Approach and Landing Tests (ALT) — acht gevangen vluchten en vijf vrije vluchten vanaf het Shuttle Carrier Aircraft (een aangepaste Boeing 747) boven Edwards AFB in 1977. Eerste vrije vlucht 12-8-1977 gevlogen door Fred Haise + Gordon Fullerton — bewees dat de orbiter kon glijden en landen. Bevatte GEEN voortstuwing of actieve TPS-tegels; Enterprise omzetten naar een operationeel voertuig werd zwaarder geschat dan een nieuwe orbiter uit reserveonderdelen bouwen, dus werd Challenger gebouwd. Nu tentoongesteld in het Intrepid Museum, NYC.',
      best_known_for: 'Prototype-Shuttle; atmosferische tests 1977; nooit naar de ruimte',
    },
    'pt-BR': {
      tagline:
        'OV-101 — o Shuttle protótipo. Renomeado de Constitution após uma campanha de fãs de Star Trek. Voou os testes atmosféricos de 1977; nunca alcançou a órbita',
      description:
        'Originalmente chamado Constitution, renomeado Enterprise após uma campanha de cartas de fãs ligada ao 10º aniversário de Star Trek. Construído como protótipo para os Approach and Landing Tests (ALT) — oito voos cativos e cinco voos livres do Shuttle Carrier Aircraft (um Boeing 747 modificado) sobre Edwards AFB em 1977. Primeiro voo livre em 12-8-1977 pilotado por Fred Haise + Gordon Fullerton — provou que o orbiter podia planar e pousar. NÃO continha propulsão ou ladrilhos TPS ativos; converter Enterprise em veículo operacional foi estimado mais pesado que construir um novo orbiter a partir de peças, então Challenger foi construído. Agora em exibição no Intrepid Museum, NYC.',
      best_known_for: 'Shuttle protótipo; testes atmosféricos de 1977; nunca alcançou a órbita',
    },
    ru: {
      name: 'Энтерпрайз',
      tagline:
        'OV-101 — прототип шаттла. Переименован из Constitution после фан-кампании Star Trek. Летал в атмосферных тестах 1977; в космос не выходил',
      description:
        'Изначально назывался Constitution, переименован в Enterprise после фан-кампании, связанной с 10-летием Star Trek. Построен как прототип для Approach and Landing Tests (ALT) — восемь захватных и пять свободных полётов с самолёта-носителя (модифицированного Boeing 747) над авиабазой Эдвардс в 1977 году. Первый свободный полёт 12.08.1977 пилотировали Fred Haise + Gordon Fullerton — доказал, что орбитер может планировать и приземляться. НЕ содержал двигательной установки или активной TPS-теплозащиты; переделка Enterprise в лётный аппарат была оценена как более тяжёлая, чем постройка нового орбитера из запчастей, поэтому был построен Challenger. Сейчас экспонируется в Intrepid Museum в Нью-Йорке.',
      best_known_for: 'Прототип шаттла; атмосферные тесты 1977; в космос не выходил',
    },
    'sr-Cyrl': {
      tagline:
        'OV-101 — прототип шатла. Преименован из Constitution-а после фан-кампање Star Trek. Летио атмосферске тестове 1977; никад није достигао орбиту',
      description:
        'Првобитно назван Constitution, преименован у Enterprise после фан-кампање везане за 10. годишњицу Star Trek-а. Изграђен као прототип за Approach and Landing Tests (ALT) — осам каптивних и пет слободних летова са носача шатла (модификованог Boeing 747) изнад Edwards AFB-а 1977. Први слободни лет 12.08.1977. пилотирали су Fred Haise + Gordon Fullerton — доказали да орбитер може клизити и слетети. НИЈЕ садржао погон или активне TPS плочице; претварање Enterprise-а у оперативно возило процењено је као теже од градње новог орбитера из резервних делова, па је уместо тога изграђен Challenger. Сада на изложби у Intrepid Museum-у у NYC-у.',
      best_known_for: 'Прототип шатла; атмосферски тестови 1977; никад није достигао орбиту',
    },
    'zh-CN': {
      name: '企业号',
      tagline:
        'OV-101 — 原型航天飞机。Star Trek 粉丝运动后从 Constitution 改名。执行 1977 年大气测试；从未到达轨道',
      description:
        '原名 Constitution，因 Star Trek 10 周年粉丝来信运动后改名 Enterprise。作为 Approach and Landing Tests（ALT）原型建造 — 1977 年在爱德华兹空军基地上空从航天飞机运输机（改装的波音 747）上进行 8 次驮带飞行和 5 次自由飞行。首次自由飞行 1977-08-12 由 Fred Haise + Gordon Fullerton 驾驶 — 证明轨道器可以滑翔和着陆。不含推进系统或工作 TPS 隔热瓦；将 Enterprise 改造为飞行可用的轨道器估算比从备件建造新轨道器更重，因此建造了 Challenger。现在纽约 Intrepid Museum 展出。',
      best_known_for: '原型航天飞机；1977 年大气测试；从未到达轨道',
    },
  },
  x37b: {
    ar: {
      tagline:
        'مركبة فضائية روبوتية قابلة لإعادة الاستخدام تابعة لـ USSF — مهمات مدارية سرية متعددة السنوات، الوحيدة من نوعها بعد تقاعد الشاتل',
      description:
        'مركبة فضائية روبوتية مصغرة (8.9 م، ~5 طن) بنتها Boeing Phantom Works للقوات الجوية الأمريكية، نُقلت إلى USSF في 2019. تطلق عمودياً (Atlas V 501 في البداية؛ SpaceX Falcon 9 منذ OTV-5؛ Falcon Heavy منذ OTV-7) وتهبط أفقياً على مدرج الشاتل السابق في Kennedy. معظم الحمولات والمعلمات المدارية مصنفة — مدد المهمات المعروفة تتراوح من 224 يوماً (OTV-1، 2010) إلى رقم قياسي 908 يوماً (OTV-6، 2020-2022). تجارب معروفة معلنة تشمل عرض تكنولوجيا محرك Hall، اختبار اتصالات راديو AFRL، وتجربة شعاع ميكروويف 1 W من الطاقة الشمسية (PRAM، OTV-6). كما في 2026، حلّق سبع مهمات.',
      best_known_for:
        'مركبة فضائية روبوتية لـ USSF قابلة لإعادة الاستخدام — مهمات سرية متعددة السنوات بعد تقاعد الشاتل',
    },
    de: {
      tagline:
        'USSF wiederverwendbares Roboter-Raumflugzeug — klassifizierte mehrjährige Orbitalmissionen, das einzige US-Raumflugzeug nach der Shuttle-Außerdienststellung',
      description:
        'Roboter-Mini-Raumflugzeug (8,9 m, ~5 t) — Boeing Phantom Works baute zwei Flugzeuge für die USAF (an USSF 2019 übertragen). Startet vertikal (Atlas V 501 ursprünglich; SpaceX Falcon 9 ab OTV-5; Falcon Heavy ab OTV-7) und landet horizontal auf Kennedys ehemaliger Shuttle-Landebahn. Die meisten Nutzlasten und Orbitalparameter sind klassifiziert — typische Missionsdauern reichen von 224 Tagen (OTV-1, 2010) bis zu einem Rekord von 908 Tagen (OTV-6, 2020-2022). Bekannte deklassifizierte Nutzlasten umfassen einen Hall-Effekt-Triebwerks-Technologiedemonstrator, ein AFRL-Hochfrequenz-Kommunikationsexperiment und ein 1-W-Solarenergie-zu-Mikrowellen-Strahlungsexperiment (PRAM, OTV-6). Bis 2026 sieben Missionen geflogen.',
      best_known_for:
        'USSF wiederverwendbares Roboter-Raumflugzeug — klassifizierte mehrjährige Orbitalmissionen, Post-Shuttle US-Raumflugzeug',
    },
    es: {
      tagline:
        'Avión espacial robótico reutilizable de la USSF — misiones orbitales clasificadas multianuales, el único avión espacial estadounidense operativo tras la retirada del Shuttle',
      description:
        'Mini avión espacial robótico (8,9 m, ~5 t) — Boeing Phantom Works construyó dos vehículos para la USAF (transferidos a USSF en 2019). Se lanza verticalmente (Atlas V 501 originalmente; SpaceX Falcon 9 desde OTV-5; Falcon Heavy desde OTV-7) y aterriza horizontalmente en la antigua pista del Shuttle de Kennedy. La mayoría de las cargas útiles y parámetros orbitales están clasificados — las duraciones típicas de misión van desde 224 días (OTV-1, 2010) hasta un récord de 908 días (OTV-6, 2020-2022). Cargas útiles desclasificadas conocidas incluyen un demostrador de propulsor Hall, un experimento de comunicación de radiofrecuencia del AFRL y un experimento de transmisión de energía solar a microondas de 1 W (PRAM, OTV-6). A 2026, ha volado siete misiones.',
      best_known_for:
        'Avión espacial robótico reutilizable de USSF — misiones clasificadas multianuales, avión espacial estadounidense post-Shuttle',
    },
    fr: {
      tagline:
        "Avion spatial robotique réutilisable de l'USSF — missions orbitales classifiées de plusieurs années, le seul avion spatial américain opérationnel après la retraite de la navette",
      description:
        "Mini avion spatial robotique (8,9 m, ~5 t) — Boeing Phantom Works a construit deux véhicules pour l'USAF (transférés à l'USSF en 2019). Lance verticalement (Atlas V 501 à l'origine ; SpaceX Falcon 9 depuis OTV-5 ; Falcon Heavy depuis OTV-7) et atterrit horizontalement sur l'ancienne piste de la navette à Kennedy. La plupart des charges utiles et paramètres orbitaux sont classifiés — les durées de mission typiques s'étendent de 224 jours (OTV-1, 2010) à un record de 908 jours (OTV-6, 2020-2022). Les charges utiles déclassifiées connues incluent un démonstrateur de propulseur Hall, une expérience de communication radiofréquence de l'AFRL et une expérience de transmission d'énergie solaire vers micro-ondes de 1 W (PRAM, OTV-6). En 2026, a effectué sept missions.",
      best_known_for:
        "Avion spatial robotique réutilisable de l'USSF — missions classifiées de plusieurs années, avion spatial américain post-navette",
    },
    hi: {
      tagline:
        'USSF का पुन: प्रयोज्य रोबोटिक स्पेसप्लेन — गोपनीय बहुवर्षीय कक्षीय मिशन, शटल की सेवानिवृत्ति के बाद एकमात्र अमेरिकी स्पेसप्लेन',
      description:
        'रोबोटिक मिनी-स्पेसप्लेन (8.9 मी, ~5 टन) — Boeing Phantom Works ने USAF के लिए दो उड़ान वाहन बनाए (2019 में USSF को स्थानांतरित)। ऊर्ध्वाधर रूप से लॉन्च होता है (मूल रूप से Atlas V 501; OTV-5 से SpaceX Falcon 9; OTV-7 से Falcon Heavy) और Kennedy के पूर्व शटल रनवे पर क्षैतिज रूप से उतरता है। अधिकांश पेलोड + कक्षीय पैरामीटर वर्गीकृत हैं — सामान्य मिशन अवधि 224 दिन (OTV-1, 2010) से रिकॉर्ड 908 दिन (OTV-6, 2020-2022) तक है। ज्ञात अवर्गीकृत पेलोड में हॉल-इफेक्ट थ्रस्टर टेक डेमो, AFRL रेडियो-फ्रीक्वेंसी संचार प्रयोग, और 1 W सौर-शक्ति-से-माइक्रोवेव बीमिंग प्रयोग (PRAM, OTV-6) शामिल हैं। 2026 तक सात मिशन उड़ाए।',
      best_known_for:
        'USSF पुन: प्रयोज्य रोबोटिक स्पेसप्लेन — गोपनीय बहुवर्षीय कक्षीय मिशन, पोस्ट-शटल अमेरिकी स्पेसप्लेन',
    },
    it: {
      tagline:
        "Aereo spaziale robotico riutilizzabile della USSF — missioni orbitali classificate pluriennali, l'unico aereo spaziale americano operativo dopo il ritiro dello Shuttle",
      description:
        "Mini aereo spaziale robotico (8,9 m, ~5 t) — Boeing Phantom Works ha costruito due veicoli di volo per l'USAF (trasferiti a USSF nel 2019). Lancia verticalmente (Atlas V 501 originariamente; SpaceX Falcon 9 da OTV-5; Falcon Heavy da OTV-7) e atterra orizzontalmente sulla ex pista dello Shuttle a Kennedy. La maggior parte dei carichi utili + parametri orbitali sono classificati — le durate tipiche delle missioni vanno da 224 giorni (OTV-1, 2010) a un record di 908 giorni (OTV-6, 2020-2022). Carichi utili declassificati noti includono un dimostratore di tecnologia di propulsore Hall, un esperimento di comunicazione radio dell'AFRL, e un esperimento di trasmissione di energia solare a microonde da 1 W (PRAM, OTV-6). Al 2026, ha volato sette missioni.",
      best_known_for:
        'Aereo spaziale robotico riutilizzabile della USSF — missioni classificate pluriennali, aereo spaziale americano post-Shuttle',
    },
    ja: {
      name: 'X-37B OTV',
      tagline:
        'USSF の再使用型ロボット宇宙機 — 機密扱いの長期軌道ミッション。シャトル退役後の米国唯一の宇宙機',
      description:
        'ロボット小型宇宙機 (8.9 m、約 5 t)。Boeing Phantom Works が USAF (2019 年に USSF へ移管) のために 2 機を建造。垂直打ち上げ (当初 Atlas V 501、OTV-5 以降 SpaceX Falcon 9、OTV-7 以降 Falcon Heavy)、ケネディの旧シャトル滑走路に水平着陸する。ペイロードや軌道パラメータの多くは機密 — 知られているミッション期間は 224 日 (OTV-1、2010) から 908 日 (OTV-6、2020〜2022) の記録まで。公表された搭載実験にはホール効果スラスターの技術実証、AFRL の無線通信実験、1 W 太陽光-マイクロ波送電実験 (PRAM、OTV-6) などがある。2026 年時点で 7 回のミッションを飛行。',
      best_known_for:
        'USSF の再使用型ロボット宇宙機 — 機密長期軌道ミッション、シャトル退役後の米国宇宙機',
    },
    ko: {
      name: 'X-37B OTV',
      tagline:
        'USSF의 재사용 로봇 우주 비행기 — 기밀 다년간 궤도 임무, 셔틀 퇴역 후 유일한 미국 우주 비행기',
      description:
        '로봇 미니 우주 비행기(8.9m, ~5t) — Boeing Phantom Works가 USAF용으로 2대 제작(2019년 USSF로 이관). 수직 발사(원래 Atlas V 501; OTV-5부터 SpaceX Falcon 9; OTV-7부터 Falcon Heavy)되고 케네디의 옛 셔틀 활주로에 수평 착륙. 대부분의 탑재체와 궤도 매개변수는 기밀 — 알려진 임무 기간은 224일(OTV-1, 2010)에서 기록적인 908일(OTV-6, 2020-2022)까지. 공개된 탑재체로는 홀 효과 추력기 기술 실증, AFRL 무선 주파수 통신 실험, 1W 태양 전력-마이크로파 전송 실험(PRAM, OTV-6)이 있다. 2026년 기준 7회 임무 비행.',
      best_known_for:
        'USSF 재사용 로봇 우주 비행기 — 기밀 다년 궤도 임무, 셔틀 퇴역 후 미국 우주 비행기',
    },
    nl: {
      tagline:
        'USSF herbruikbaar robotisch ruimtevliegtuig — geclassificeerde meerjarige orbitale missies, het enige Amerikaanse ruimtevliegtuig operationeel na de Shuttle-pensionering',
      description:
        "Robotisch mini-ruimtevliegtuig (8,9 m, ~5 t) — Boeing Phantom Works bouwde twee vluchtvoertuigen voor de USAF (overgedragen aan USSF in 2019). Lanceert verticaal (Atlas V 501 oorspronkelijk; SpaceX Falcon 9 vanaf OTV-5; Falcon Heavy vanaf OTV-7) en landt horizontaal op Kennedy's voormalige Shuttle-landingsbaan. De meeste ladingen + orbitale parameters zijn geclassificeerd — typische missieduren reiken van 224 dagen (OTV-1, 2010) tot een record van 908 dagen (OTV-6, 2020-2022). Bekende gedeclassificeerde experimenten omvatten een Hall-effect aandrijvingstechnologiedemonstratie, een AFRL radiofrequentiecommunicatie-experiment, en een 1 W zonne-energie-naar-microgolf bundelingsexperiment (PRAM, OTV-6). In 2026 zeven missies gevlogen.",
      best_known_for:
        'USSF herbruikbaar robotisch ruimtevliegtuig — geclassificeerde meerjarige orbitale missies, post-Shuttle US-ruimtevliegtuig',
    },
    'pt-BR': {
      tagline:
        'Avião espacial robótico reutilizável da USSF — missões orbitais classificadas plurianuais, o único avião espacial americano operacional após a aposentadoria do Shuttle',
      description:
        'Mini avião espacial robótico (8,9 m, ~5 t) — Boeing Phantom Works construiu dois veículos de voo para a USAF (transferidos para USSF em 2019). Lança verticalmente (Atlas V 501 originalmente; SpaceX Falcon 9 desde OTV-5; Falcon Heavy desde OTV-7) e pousa horizontalmente na antiga pista do Shuttle de Kennedy. A maioria das cargas úteis + parâmetros orbitais são classificados — durações típicas de missão variam de 224 dias (OTV-1, 2010) a um recorde de 908 dias (OTV-6, 2020-2022). Cargas úteis desclassificadas conhecidas incluem demonstrador de tecnologia de propulsor Hall, experimento de comunicação de radiofrequência da AFRL, e um experimento de transmissão de energia solar para micro-ondas de 1 W (PRAM, OTV-6). Em 2026, voou sete missões.',
      best_known_for:
        'Avião espacial robótico reutilizável da USSF — missões classificadas plurianuais, avião espacial americano pós-Shuttle',
    },
    ru: {
      name: 'X-37B',
      tagline:
        'Многоразовый роботизированный космоплан USSF — секретные многолетние орбитальные миссии, единственный американский космоплан после ухода шаттла',
      description:
        'Роботизированный мини-космоплан (8,9 м, ~5 т) — Boeing Phantom Works построил два лётных аппарата для USAF (переданы USSF в 2019 году). Запускается вертикально (изначально Atlas V 501; SpaceX Falcon 9 с OTV-5; Falcon Heavy с OTV-7) и приземляется горизонтально на бывшей шаттловой полосе на мысе Кеннеди. Большинство полезных нагрузок и орбитальных параметров засекречены — типичные продолжительности миссий варьируются от 224 дней (OTV-1, 2010) до рекордных 908 дней (OTV-6, 2020-2022). Известные рассекреченные эксперименты включают демонстратор технологии холловского двигателя, эксперимент радиочастотной связи AFRL и эксперимент по передаче 1 Вт солнечной энергии в микроволновое излучение (PRAM, OTV-6). По состоянию на 2026 год выполнил семь миссий.',
      best_known_for:
        'Многоразовый роботизированный космоплан USSF — секретные многолетние орбитальные миссии, пост-шаттловый американский космоплан',
    },
    'sr-Cyrl': {
      tagline:
        'USSF-ов вишекратни роботски свемирски авион — поверљиве вишегодишње орбиталне мисије, једини амерички свемирски авион оперативан после повлачења шатла',
      description:
        'Роботски мини-свемирски авион (8,9 m, ~5 t) — Boeing Phantom Works је направио два лебдеће возила за USAF (пребачена USSF-у 2019). Лансира се вертикално (Atlas V 501 првобитно; SpaceX Falcon 9 од OTV-5; Falcon Heavy од OTV-7) и слеће хоризонтално на бившу шатл писту на Кенедију. Већина терета и орбиталних параметара је поверљива — типичне трајања мисија иду од 224 дана (OTV-1, 2010) до рекордних 908 дана (OTV-6, 2020-2022). Познати дешифровани терети укључују демонстратор Hall ефект мотора, AFRL радио-фреквентни комуникациони експеримент, и експеримент преноса 1 W соларне енергије у микроталасе (PRAM, OTV-6). До 2026, обавио је седам мисија.',
      best_known_for:
        'USSF-ов вишекратни роботски свемирски авион — поверљиве вишегодишње орбиталне мисије, пост-шатлни амерички свемирски авион',
    },
    'zh-CN': {
      name: 'X-37B 轨道试验飞行器',
      tagline:
        'USSF 可重复使用机器人空天飞机 — 机密的多年轨道任务，航天飞机退役后美国唯一在役空天飞机',
      description:
        '机器人迷你空天飞机（8.9 m，约 5 t）— Boeing Phantom Works 为美国空军建造了 2 架飞行器（2019 年移交 USSF）。垂直发射（最初 Atlas V 501；OTV-5 起 SpaceX Falcon 9；OTV-7 起 Falcon Heavy），在肯尼迪航天中心原航天飞机跑道水平着陆。多数载荷和轨道参数属机密 — 已知任务持续时长从 224 天（OTV-1，2010）到创纪录的 908 天（OTV-6，2020-2022）。公开的解密载荷包括霍尔效应推进器技术验证、AFRL 射频通信实验、1 W 太阳能-微波传输实验（PRAM，OTV-6）。截至 2026 年已飞行七次任务。',
      best_known_for:
        'USSF 可重复使用机器人空天飞机 — 机密多年轨道任务，后航天飞机时代美国空天飞机',
    },
  },
  'buran-ok-gli': {
    ar: {
      tagline:
        'النموذج الجوي لـ Buran — مكافئ Enterprise. أربعة محركات نفاثة، 24 رحلة جوية 1985-88. لم يصل إلى الفضاء',
      description:
        'رسمياً BTS-002، يُلقّب OK-GLI. مقالة اختبار جوي بحجم كامل لبرنامج Buran المداري — نفس الشكل الخارجي مثل مركبة الطيران Buran 1.01 ولكن مزود بأربعة محركات نفاثة AL-31 لتقلع بقوتها الخاصة من مدرج تقليدي. 24 رحلة جوية بين 1985-11-10 و 1988-04-15 في مطار LII Zhukovsky تحققت من نظام الهبوط الآلي لـ Buran. بعد إلغاء برنامج Buran جلس OK-GLI في LII لسنوات؛ بيع لمتحف أسترالي 1999، ثم البحرين، أخيراً إلى متحف Technik Sinsheim في ألمانيا حيث يُعرض اليوم — مكافئ Buran لـ NASA Enterprise.',
      best_known_for:
        'النموذج الجوي لـ Buran؛ 24 رحلة بالطائرة 1985-88 في Zhukovsky؛ لم يصل إلى المدار',
    },
    de: {
      tagline:
        'Burans atmosphärischer Analog — Äquivalent zu NASAs Enterprise. Vier Jets, 24 atmosphärische Testflüge 1985-88. Nie ins All',
      description:
        'Offiziell BTS-002, Spitzname OK-GLI. Maßstabsgetreues atmosphärisches Testfahrzeug für das Buran-Orbitalprogramm — gleiche Außenform wie das Flugfahrzeug Buran 1.01, aber mit vier AL-31-Turbojettriebwerken ausgestattet, sodass es selbständig von einer normalen Landebahn starten konnte. 24 atmosphärische Flüge zwischen dem 10.11.1985 und dem 15.4.1988 am LII Schukowski-Flughafen validierten Burans automatisches Landesystem. Nach der Stornierung des Buran-Programms stand OK-GLI jahrelang am LII; 1999 an ein australisches Museum verkauft, dann Bahrain, schließlich an das Technik Museum Sinsheim in Deutschland — Burans Äquivalent zu NASAs Enterprise.',
      best_known_for:
        'Burans atmosphärischer Analog; 24 Jet-Flüge 1985-88 in Schukowski; nie zum Orbit',
    },
    es: {
      tagline:
        'Análogo atmosférico de Buran — equivalente del Enterprise. Cuatro motores jet, 24 vuelos atmosféricos 1985-88. Nunca al espacio',
      description:
        'Oficialmente BTS-002, apodado OK-GLI. Artículo de prueba atmosférica a escala completa para el programa orbital Buran — misma forma exterior que el vehículo de vuelo Buran 1.01 pero equipado con cuatro motores turbojet AL-31 para poder despegar por sus propios medios desde una pista convencional. 24 vuelos atmosféricos entre 10-11-1985 y 15-4-1988 en el aeropuerto LII Zhukovsky validaron el sistema de aterrizaje automatizado de Buran. Tras la cancelación del programa Buran, OK-GLI estuvo años en LII; vendido a un museo australiano en 1999, luego Bahrein, finalmente al Technik Museum Sinsheim en Alemania — el equivalente de Buran al Enterprise de NASA.',
      best_known_for:
        'Análogo atmosférico de Buran; 24 vuelos a jet 1985-88 en Zhukovsky; nunca a la órbita',
    },
    fr: {
      tagline:
        "Analogue atmosphérique de Buran — équivalent de l'Enterprise. Quatre moteurs à réaction, 24 vols atmosphériques 1985-88. Jamais dans l'espace",
      description:
        "Officiellement BTS-002, surnommé OK-GLI. Article de test atmosphérique à pleine échelle pour le programme orbital Buran — même forme extérieure que le véhicule de vol Buran 1.01 mais équipé de quatre turboréacteurs AL-31 pour pouvoir décoller par ses propres moyens depuis une piste conventionnelle. 24 vols atmosphériques entre le 10-11-1985 et le 15-4-1988 à l'aéroport LII Joukovski ont validé le système d'atterrissage automatique de Buran. Après l'annulation du programme Buran, OK-GLI a passé des années au LII ; vendu à un musée australien en 1999, puis à Bahreïn, finalement au Technik Museum Sinsheim en Allemagne — l'équivalent de Buran à l'Enterprise de NASA.",
      best_known_for:
        'Analogue atmosphérique de Buran ; 24 vols à réaction 1985-88 à Joukovski ; jamais en orbite',
    },
    hi: {
      tagline:
        'Buran का वायुमंडलीय एनालॉग — Enterprise का समकक्ष। चार जेट इंजन, 24 वायुमंडलीय परीक्षण उड़ानें 1985-88। कभी अंतरिक्ष में नहीं',
      description:
        'आधिकारिक रूप से BTS-002, उपनाम OK-GLI। Buran कक्षीय कार्यक्रम के लिए पूर्ण-स्केल वायुमंडलीय परीक्षण लेख — Buran 1.01 उड़ान वाहन के समान बाहरी आकार लेकिन चार AL-31 टर्बोजेट इंजन से सुसज्जित ताकि यह एक पारंपरिक रनवे से अपनी ही शक्ति से उड़ान भर सके। 10-11-1985 और 15-4-1988 के बीच Zhukovsky LII हवाई अड्डे पर 24 वायुमंडलीय उड़ानों ने Buran के स्वचालित लैंडिंग सिस्टम को मान्य किया। Buran कार्यक्रम रद्द होने के बाद OK-GLI सालों तक LII में बैठा रहा; 1999 में एक ऑस्ट्रेलियाई संग्रहालय को बेचा गया, फिर बहरीन, अंत में जर्मनी के Technik Museum Sinsheim को — Buran का NASA के Enterprise के समकक्ष।',
      best_known_for:
        'Buran का वायुमंडलीय एनालॉग; Zhukovsky में 1985-88 में 24 जेट उड़ानें; कक्षा में नहीं',
    },
    it: {
      tagline:
        "Analogo atmosferico di Buran — equivalente dell'Enterprise. Quattro motori jet, 24 voli atmosferici 1985-88. Mai nello spazio",
      description:
        "Ufficialmente BTS-002, soprannominato OK-GLI. Articolo di test atmosferico a grandezza naturale per il programma orbitale Buran — stessa forma esterna del veicolo di volo Buran 1.01 ma equipaggiato con quattro motori turbojet AL-31 in modo che potesse decollare con i propri mezzi da una pista convenzionale. 24 voli atmosferici tra 10-11-1985 e 15-4-1988 all'aeroporto LII Žukovskij hanno validato il sistema di atterraggio automatico di Buran. Dopo la cancellazione del programma Buran, OK-GLI è rimasto al LII per anni; venduto a un museo australiano nel 1999, poi Bahrein, infine al Technik Museum Sinsheim in Germania — l'equivalente di Buran all'Enterprise di NASA.",
      best_known_for:
        'Analogo atmosferico di Buran; 24 voli a jet 1985-88 a Žukovskij; mai in orbita',
    },
    ja: {
      name: 'ブラン OK-GLI',
      tagline:
        'ブランの大気圏内アナログ — エンタープライズの相当機。4 つのジェットエンジン、1985-88 年に 24 回の大気圏内テスト飛行。宇宙には到達しなかった',
      description:
        '正式には BTS-002、愛称 OK-GLI。ブラン軌道計画用のフルスケール大気圏内テスト機 — 飛行機体ブラン 1.01 と同じ外形だが、AL-31 ターボジェット 4 基を搭載して通常の滑走路から自力で離陸できた。1985 年 11 月 10 日〜 1988 年 4 月 15 日にズコフスキー LII 飛行場で 24 回の大気圏内飛行を実施し、ブランの自動着陸システムを検証した。ブラン計画の中止後、OK-GLI は LII に何年も置かれた後、1999 年にオーストラリアの博物館に売却、その後バーレーンに、最終的にドイツのジンスハイム自動車技術博物館に — ブランの NASA エンタープライズに相当する機体。',
      best_known_for:
        'ブランの大気圏内アナログ；ズコフスキーで 1985-88 年に 24 回のジェット飛行；軌道には到達せず',
    },
    ko: {
      name: '부란 OK-GLI',
      tagline:
        '부란의 대기권 아날로그 — 엔터프라이즈의 대응 기체. 4기의 제트 엔진, 1985-88년 24회 대기권 시험 비행. 우주에는 가지 못함',
      description:
        '공식적으로 BTS-002, 별명 OK-GLI. 부란 궤도 프로그램의 풀스케일 대기권 시험 기체 — 비행 기체 부란 1.01과 동일한 외형이지만 AL-31 터보제트 엔진 4기를 장착하여 일반 활주로에서 자력으로 이륙할 수 있다. 1985-11-10부터 1988-04-15까지 주콥스키 LII 공항에서 24회의 대기권 비행을 수행하여 부란의 자동 착륙 시스템을 검증했다. 부란 프로그램 취소 후 OK-GLI는 LII에서 수년간 있다가 1999년 호주 박물관에 판매, 이후 바레인, 최종적으로 독일 진스하임 Technik Museum으로 — 부란의 NASA Enterprise에 해당하는 기체.',
      best_known_for:
        '부란의 대기권 아날로그; 주콥스키에서 1985-88년 24회 제트 비행; 궤도 도달 안 함',
    },
    nl: {
      tagline:
        "Burans atmosferische analoog — equivalent van NASA's Enterprise. Vier jetmotoren, 24 atmosferische testvluchten 1985-88. Nooit in de ruimte",
      description:
        "Officieel BTS-002, bijnaam OK-GLI. Volledig-schaal atmosferisch testartikel voor het Buran orbitaal programma — zelfde buitenvorm als het vluchtvoertuig Buran 1.01 maar uitgerust met vier AL-31 turbojetmotoren zodat het zelfstandig kon opstijgen vanaf een conventionele landingsbaan. 24 atmosferische vluchten tussen 10-11-1985 en 15-4-1988 op het LII Zhukovsky vliegveld valideerden het automatische landingssysteem van Buran. Na de annulering van het Buran-programma stond OK-GLI jaren bij LII; in 1999 verkocht aan een Australisch museum, daarna Bahrein, uiteindelijk aan het Technik Museum Sinsheim in Duitsland — Burans equivalent van NASA's Enterprise.",
      best_known_for:
        'Burans atmosferische analoog; 24 jetvluchten 1985-88 in Zhukovsky; nooit naar de ruimte',
    },
    'pt-BR': {
      tagline:
        'Análogo atmosférico do Buran — equivalente do Enterprise. Quatro motores a jato, 24 voos atmosféricos 1985-88. Nunca ao espaço',
      description:
        'Oficialmente BTS-002, apelidado OK-GLI. Artigo de teste atmosférico em escala real para o programa orbital Buran — mesma forma exterior que o veículo de voo Buran 1.01 mas equipado com quatro motores turbojato AL-31 para que pudesse decolar por meios próprios de uma pista convencional. 24 voos atmosféricos entre 10-11-1985 e 15-4-1988 no aeroporto LII Zhukovsky validaram o sistema de pouso automatizado do Buran. Após o cancelamento do programa Buran, OK-GLI ficou anos no LII; vendido para um museu australiano em 1999, depois Bahrein, finalmente para o Technik Museum Sinsheim na Alemanha — o equivalente do Buran ao Enterprise da NASA.',
      best_known_for:
        'Análogo atmosférico do Buran; 24 voos a jato 1985-88 em Zhukovsky; nunca à órbita',
    },
    ru: {
      name: 'Буран ОК-ГЛИ',
      tagline:
        'Атмосферный аналог Бурана — аналог Энтерпрайз. Четыре реактивных двигателя, 24 атмосферных испытательных полёта 1985-88. В космос не выходил',
      description:
        'Официально БТС-002 (Большой Транспортный Самолёт), прозвище ОК-ГЛИ. Полномасштабная атмосферная испытательная модель программы орбитального Бурана — те же внешние обводы, что у лётного аппарата Буран 1.01, но оснащена четырьмя турбореактивными двигателями АЛ-31 для самостоятельного взлёта с обычной взлётно-посадочной полосы. 24 атмосферных полёта с 10.11.1985 по 15.04.1988 на аэродроме ЛИИ им. М. М. Громова в Жуковском подтвердили автоматическую систему посадки Бурана. После закрытия программы Буран ОК-ГЛИ много лет стоял в ЛИИ; в 1999 году продан австралийскому музею, затем в Бахрейн, и наконец в Технический музей Зинсхайма в Германии — где сейчас и стоит, аналог Бурана к американскому Энтерпрайз.',
      best_known_for:
        'Атмосферный аналог Бурана; 24 реактивных полёта 1985-88 в Жуковском; в орбиту не выходил',
    },
    'sr-Cyrl': {
      tagline:
        'Буранов атмосферски аналог — еквивалент Enterprise-а. Четири млазна мотора, 24 атмосферска тест-лета 1985-88. Никад до свемира',
      description:
        'Званично БТС-002 (Велики Транспортни Авион), надимак OK-GLI. Атмосферски тест артикл пуне величине за орбитални Буран програм — иста спољашна форма као летеће возило Буран 1.01, али опремљен са четири AL-31 турбомлазна мотора да би могао полетети сопственом снагом са обичне писте. 24 атмосферска лета између 10.11.1985. и 15.04.1988. на аеродрому LII Жуковски валидирала су аутоматски систем слетања Бурана. После отказивања програма Буран, OK-GLI је годинама седео на LII; продат аустралијском музеју 1999, затим Бахреину, коначно Technik Museum-у Sinsheim у Немачкој — Буранов еквивалент NASA-иног Enterprise-а.',
      best_known_for:
        'Буранов атмосферски аналог; 24 млазна лета 1985-88 у Жуковском; никад до орбите',
    },
    'zh-CN': {
      name: '暴风雪 OK-GLI',
      tagline:
        '暴风雪号大气版 — Enterprise 的对应机型。四台喷气发动机，1985-88 年 24 次大气测试飞行。从未进入太空',
      description:
        '正式名 BTS-002（大型运输机），昵称 OK-GLI。暴风雪号轨道项目的全尺寸大气测试机 — 与飞行版暴风雪 1.01 外形相同，但加装 4 台 AL-31 涡喷发动机，可自力从常规跑道起飞。1985-11-10 至 1988-04-15 在茹科夫斯基 LII 机场进行 24 次大气飞行，验证了暴风雪号的自动着陆系统。暴风雪项目取消后，OK-GLI 在 LII 闲置多年；1999 年卖给澳大利亚博物馆，然后到巴林，最终落户德国 Sinsheim Technik Museum — 暴风雪号对应的 NASA Enterprise。',
      best_known_for: '暴风雪号大气版；1985-88 年在茹科夫斯基 24 次喷气飞行；从未进入轨道',
    },
  },
};

async function main() {
  let wrote = 0;
  for (const [id, byLocale] of Object.entries(OVERLAYS)) {
    for (const locale of LOCALES) {
      const entry = byLocale[locale];
      if (!entry) {
        console.warn(`  ⚠ ${id}/${locale}: no inline translation`);
        continue;
      }
      const path = join(I18N_ROOT, locale, 'fleet', CATEGORY, `${id}.json`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(entry, null, 2) + '\n');
      wrote += 1;
    }
  }
  console.log(`✓ wrote ${wrote} overlay files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
