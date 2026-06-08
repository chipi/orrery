#!/usr/bin/env node
/**
 * Translate the Phase-3a launcher backfill overlays (Delta II ·
 * Proton-K · Atlas SLV-3D Centaur · Ariane 1) into all 13 non-English
 * locales. Pure data layer — no API calls; translations live inline
 * so the file is reviewable + diff-friendly. Same shape as
 * translate-new-launchers.mjs (the 2026-06 backfill for Starship /
 * PSLV-XL / Long March 3B / New Glenn).
 *
 * Schema per (launcher, locale): { name?, tagline, description,
 * best_known_for }. Empty entries fall through to the en-US base.
 *
 * Run from project root:  node scripts/translate-phase3a-launchers.mjs
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

const OVERLAYS = {
  'delta-ii': {
    ar: {
      tagline: 'صاروخ ناسا للحمولات المتوسطة وحصان عمل علوم الكواكب — 155 رحلة 1989-2018',
      description:
        'صاروخ دلتا بمرحلتين أو ثلاث مع مرحلة أولى RS-27A تعمل بالأكسجين السائل والكيروسين، وحتى تسعة معززات صاروخية صلبة من نوع GEM، ومرحلة Star-48B علوية اختيارية لمسارات الهروب العالية الطاقة. 155 إطلاقاً على مدى 29 عاماً بنسبة نجاح 99.4%؛ حمل Dawn و Messenger و MRO و Phoenix و Kepler و Spitzer و GRAIL وأول كوكبة GPS بلوك II. "Delta II Heavy" (7920H + Star-48B) هو التكوين الذي وفّر طاقة C3 الكافية لإدخال Ceres مباشرةً وإدخال Mercury في مدار. أُحيل إلى التقاعد بعد انتقال سوق الحمولات المتوسطة إلى Atlas V و Falcon 9.',
      best_known_for:
        'حصان عمل علوم الكواكب لناسا للحمولات المتوسطة 1989-2018 — Dawn و Messenger و MRO و Phoenix و Kepler',
    },
    de: {
      tagline: 'NASAs Mittelklasse-Arbeitspferd der Planetenforschung — 155 Flüge 1989-2018',
      description:
        'Zwei- oder dreistufige Delta-Variante mit RS-27A-LOX/RP-1-Erststufe, bis zu neun GEM-Feststoff-Boostern und einer optionalen Star-48B-Kickstufe für Hochenergie-Fluchtbahnen. 155 Starts in 29 Jahren mit einer Erfolgsquote von 99,4 %; brachte Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL und die ursprüngliche GPS-Block-II-Konstellation in den Orbit. Die „Delta II Heavy" (7920H + Star-48B) war die Konfiguration mit ausreichend C3 für den Direktflug nach Ceres und den Mercury-Orbit-Einschuss. Nach der Verlagerung des Mittelklassemarkts auf Atlas V und Falcon 9 außer Dienst gestellt.',
      best_known_for:
        'NASAs Mittelklasse-Arbeitspferd der Planetenforschung 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    es: {
      tagline:
        'El caballo de batalla de carga media de la NASA para ciencia planetaria — 155 vuelos 1989-2018',
      description:
        'Variante Delta de dos o tres etapas con primera etapa RS-27A de LOX/RP-1, hasta nueve cohetes auxiliares sólidos GEM y una etapa superior opcional Star-48B para trayectorias de escape de alta energía. 155 lanzamientos en 29 años con una tasa de éxito del 99,4 %; llevó a Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL y la constelación GPS Block II original. La «Delta II Heavy» (7920H + Star-48B) fue la configuración que aportó suficiente C3 para la inserción directa hacia Ceres y la inserción orbital en Mercurio. Retirado tras la migración del mercado de carga media a Atlas V y Falcon 9.',
      best_known_for:
        'Caballo de batalla de la NASA en ciencia planetaria 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    fr: {
      tagline:
        'Le cheval de bataille de la NASA pour les charges moyennes et la science planétaire — 155 vols 1989-2018',
      description:
        "Variante de Delta à deux ou trois étages avec un premier étage RS-27A LOX/RP-1, jusqu'à neuf propulseurs d'appoint solides GEM et un troisième étage Star-48B optionnel pour les trajectoires d'évasion à haute énergie. 155 lancements en 29 ans avec un taux de réussite de 99,4 % ; a emporté Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL et la constellation GPS Block II d'origine. La « Delta II Heavy » (7920H + Star-48B) était la configuration qui fournissait suffisamment de C3 pour une insertion directe vers Cérès et une insertion orbitale autour de Mercure. Retiré après la migration du marché des charges moyennes vers Atlas V et Falcon 9.",
      best_known_for:
        'Cheval de bataille de la NASA pour la science planétaire 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    hi: {
      tagline: 'NASA का मध्यम-वर्ग ग्रह-विज्ञान कार्यबल — 1989-2018 में 155 उड़ानें',
      description:
        'दो या तीन चरण वाला डेल्टा वैरिएंट जिसमें RS-27A LOX/RP-1 पहला चरण, नौ तक GEM ठोस बूस्टर और उच्च-ऊर्जा प्रक्षेपण के लिए वैकल्पिक Star-48B किक चरण होता है। 29 वर्षों में 155 लॉन्च, 99.4% सफलता दर के साथ; Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL और मूल GPS Block II नक्षत्र को कक्षा में पहुंचाया। "Delta II Heavy" (7920H + Star-48B) वह कॉन्फ़िगरेशन था जिसने Ceres के सीधे प्रक्षेप और बुध की कक्षा में प्रवेश के लिए पर्याप्त C3 प्रदान किया। मध्यम-वर्ग बाजार Atlas V और Falcon 9 की ओर चले जाने के बाद सेवानिवृत्त।',
      best_known_for:
        'NASA का ग्रह-विज्ञान कार्यबल 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    it: {
      tagline:
        'Il cavallo di battaglia di carico medio della NASA per la scienza planetaria — 155 voli 1989-2018',
      description:
        "Variante Delta a due o tre stadi con primo stadio RS-27A LOX/RP-1, fino a nove razzi ausiliari solidi GEM e uno stadio superiore Star-48B opzionale per traiettorie di fuga ad alta energia. 155 lanci in 29 anni con un tasso di successo del 99,4 %; ha portato Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL e la costellazione GPS Block II originale. La «Delta II Heavy» (7920H + Star-48B) era la configurazione che forniva C3 sufficiente per l'inserimento diretto verso Cerere e l'inserimento orbitale attorno a Mercurio. Ritirato dopo la migrazione del mercato dei carichi medi verso Atlas V e Falcon 9.",
      best_known_for:
        'Cavallo di battaglia della NASA per la scienza planetaria 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    ja: {
      name: 'デルタ II',
      tagline: 'NASA の中型クラス惑星科学の主力打ち上げ機 — 1989〜2018 年で 155 機',
      description:
        '2 段または 3 段構成のデルタ派生機。1 段目は RS-27A（LOX/RP-1）、最大 9 基の GEM 固体ブースター、必要に応じて高エネルギー軌道用の Star-48B キックステージを追加する。29 年間で 155 機を打ち上げ、成功率 99.4 %。Dawn・Messenger・MRO・Phoenix・Kepler・Spitzer・GRAIL を運び、初期の GPS Block II 衛星群もすべて担当した。「デルタ II Heavy」（7920H + Star-48B）構成は、Ceres への直接投入や水星周回投入に必要な C3 を出せる唯一の構成だった。中型市場が Atlas V と Falcon 9 に移った後に退役。',
      best_known_for: 'NASA の惑星科学の主力 1989〜2018 — Dawn、Messenger、MRO、Phoenix、Kepler',
    },
    ko: {
      name: '델타 II',
      tagline: 'NASA의 중형급 행성과학 주력 발사체 — 1989〜2018년 155회 발사',
      description:
        '2단 또는 3단 델타 파생형. 1단은 RS-27A(LOX/RP-1)이며, 최대 9개의 GEM 고체 부스터와 고에너지 탈출 궤적을 위한 Star-48B 킥 스테이지를 옵션으로 결합한다. 29년간 155회 발사, 성공률 99.4%로 Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL과 초기 GPS Block II 군집을 모두 운반했다. "Delta II Heavy"(7920H + Star-48B) 구성은 Ceres 직접 투입과 수성 궤도 진입에 필요한 C3를 낼 수 있었던 유일한 형상이었다. 중형 시장이 Atlas V와 Falcon 9로 이동한 뒤 퇴역.',
      best_known_for: 'NASA의 행성과학 주력 1989〜2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    nl: {
      tagline: "NASA's werkpaard voor middelzware planetaire wetenschap — 155 vluchten 1989-2018",
      description:
        'Twee- of drietraps Delta-variant met een RS-27A LOX/RP-1 eerste trap, tot negen GEM solid boosters en een optionele Star-48B bovenste trap voor hoog-energie ontsnappingsbanen. 155 lanceringen in 29 jaar met een slagingspercentage van 99,4 %; bracht Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL en de oorspronkelijke GPS Block II-constellatie in een baan. De „Delta II Heavy" (7920H + Star-48B) was de configuratie met voldoende C3 voor directe inschieting naar Ceres en de Mercury-baaninschieting. Buiten dienst gesteld na de migratie van de middelzware markt naar Atlas V en Falcon 9.',
      best_known_for:
        "NASA's werkpaard voor planetaire wetenschap 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler",
    },
    'pt-BR': {
      tagline:
        'O cavalo de batalha de carga média da NASA para ciência planetária — 155 voos 1989-2018',
      description:
        'Variante Delta de dois ou três estágios com primeiro estágio RS-27A de LOX/RP-1, até nove foguetes auxiliares sólidos GEM e um estágio superior opcional Star-48B para trajetórias de fuga de alta energia. 155 lançamentos em 29 anos com taxa de sucesso de 99,4 %; levou Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL e a constelação GPS Block II original. A "Delta II Heavy" (7920H + Star-48B) foi a configuração que entregou C3 suficiente para a inserção direta a Ceres e a inserção orbital em Mercúrio. Aposentado após a migração do mercado de carga média para Atlas V e Falcon 9.',
      best_known_for:
        'Cavalo de batalha da NASA para ciência planetária 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    ru: {
      tagline: 'Среднего класса рабочая лошадка планетной науки NASA — 155 пусков 1989-2018',
      description:
        'Двух- или трёхступенчатый Delta с первой ступенью RS-27A (LOX/RP-1), до девяти твердотопливных ускорителей GEM и опциональным разгонным блоком Star-48B для высокоэнергетических отлётных траекторий. 311 пусков за 29 лет с надёжностью 99,4 %; вывел Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL и весь первый эшелон GPS Block II. Конфигурация «Delta II Heavy» (7920H + Star-48B) была единственной, выдававшей нужный C3 для прямого выхода к Цересе и выхода на орбиту Меркурия. Снят с эксплуатации после ухода рынка среднего класса в сторону Atlas V и Falcon 9.',
      best_known_for:
        'Рабочая лошадка планетной науки NASA 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    'sr-Cyrl': {
      tagline: 'НАСА-ин радни коњ средње носивости за планетарну науку — 155 летова 1989-2018',
      description:
        'Двостепена или тростепена Delta варијанта са RS-27A LOX/RP-1 првим степеном, до девет GEM чврстих појачивача и опционим Star-48B горњим степеном за траjекторије високе енергије. 155 лансирања за 29 година са успехом од 99,4 %; одвезла је Dawn, Messenger, MRO, Phoenix, Kepler, Spitzer, GRAIL и оригиналну GPS Block II констелацију. „Delta II Heavy" (7920H + Star-48B) је била конфигурација која је пружала довољан C3 за директни прилаз Церери и убацивање у Меркурову орбиту. Повучена након миграције тржишта средње носивости на Atlas V и Falcon 9.',
      best_known_for:
        'НАСА-ин радни коњ планетарне науке 1989-2018 — Dawn, Messenger, MRO, Phoenix, Kepler',
    },
    'zh-CN': {
      name: '德尔塔 II',
      tagline: 'NASA 中型行星科学主力运载火箭 — 1989-2018 年 155 次飞行',
      description:
        '两级或三级德尔塔派生型：一级搭载 RS-27A（液氧/煤油）发动机，最多九枚 GEM 固体助推器，可选 Star-48B 高能离轨上面级。29 年间 155 次发射，成功率 99.4%；将 Dawn、Messenger、MRO、Phoenix、Kepler、Spitzer、GRAIL 及最早的 GPS Block II 全部送入轨道。「Delta II Heavy」（7920H + Star-48B）是唯一能输出足够 C3 直飞 Ceres 与水星入轨的配置。中型市场转向 Atlas V 与 Falcon 9 后退役。',
      best_known_for: 'NASA 行星科学主力 1989-2018 — Dawn、Messenger、MRO、Phoenix、Kepler',
    },
  },
  'proton-k': {
    ar: {
      tagline:
        'حصان عمل سوفيتي / روسي للرفع الثقيل 1967-2012 — ساليوت ومير وفيغا وفينيرا وكل أسطول لونا للعيّنات',
      description:
        'مركبة ثلاثية المراحل ذات وقود هايبرغولي (N2O4 / UDMH) للرفع الثقيل، مع خيارات مراحل علوية عالية الطاقة Blok-D / D-1 / D-2. 311 إطلاقاً بين 10-03-1967 و 30-03-2012 — أرسى كل وحدة Salyut و Mir والقطاع الروسي لمحطة ISS، وكل مسبار Venera و Vega، وكل عينة Luna المرتجعة، إضافة إلى Mars-2/-3/-5/-7. طُوّر الطابق العلوي Blok-D أصلاً للهندسة المعمارية القمرية المأهولة N1-L3 الملغاة؛ إعادة استخدامه على Proton-K أبقى خط الكواكب السوفيتي عالي الطاقة حياً حتى الثمانينيات. حلّ محله Proton-M الذي لا يزال يطير.',
      best_known_for:
        'حصان عمل سوفيتي / روسي للرفع الثقيل 1967-2012 — ساليوت، مير، كل Venera، كل عينة Luna',
    },
    de: {
      tagline:
        'Sowjetisches / russisches Schwerlast-Arbeitspferd 1967-2012 — Saljut, Mir, jede Venera, jede Luna-Rückführmission',
      description:
        'Dreistufige hypergole (N2O4 / UDMH) Schwerlastrakete mit optionalen Hochenergie-Oberstufen Blok-D / D-1 / D-2. 311 Starts zwischen dem 10.03.1967 und dem 30.03.2012 — trug jedes Saljut-, Mir- und ISS-Russland-Modul, jede Venera- und Vega-Venussonde, jede Luna-Probenrückführung sowie sowjetische Mars-2/-3/-5/-7. Die Blok-D-Oberstufe wurde ursprünglich für das gestrichene bemannte N1-L3-Mondprogramm entwickelt; ihre Wiederverwendung auf Proton-K hielt die hochenergetische sowjetische Planetenlinie bis in die 1980er Jahre lebendig. Abgelöst durch Proton-M, der noch immer fliegt.',
      best_known_for:
        'Sowjetisches / russisches Schwerlast-Arbeitspferd 1967-2012 — Saljut, Mir, jede Venera, jede Luna-Rückführung',
    },
    es: {
      tagline:
        'Caballo de batalla soviético / ruso de carga pesada 1967-2012 — Salyut, Mir, cada Venera, cada Luna sample-return',
      description:
        'Vehículo trietápico hipergólico (N2O4 / UDMH) de carga pesada con etapas superiores opcionales Blok-D / D-1 / D-2 para alta energía. 311 lanzamientos entre el 10-03-1967 y el 30-03-2012 — llevó cada módulo Salyut, Mir y del segmento ruso de la ISS, cada sonda Venera y Vega, cada misión Luna de retorno de muestras, y las soviéticas Mars-2/-3/-5/-7. La etapa Blok-D se desarrolló originalmente para la arquitectura lunar tripulada N1-L3 cancelada; reutilizarla en Proton-K mantuvo viva la línea planetaria soviética de alta energía hasta los años 80. Sustituido por el Proton-M, aún en servicio.',
      best_known_for:
        'Caballo de batalla soviético / ruso de carga pesada 1967-2012 — Salyut, Mir, cada Venera, cada Luna',
    },
    fr: {
      tagline:
        "Cheval de bataille soviétique / russe pour les charges lourdes 1967-2012 — Saliout, Mir, chaque Venera, chaque Luna de retour d'échantillons",
      description:
        "Lanceur lourd à trois étages à propergols hypergoliques (N2O4 / UDMH), avec étages supérieurs optionnels Blok-D / D-1 / D-2 pour les hautes énergies. 311 lancements entre le 10/03/1967 et le 30/03/2012 — a emporté chaque module Saliout, Mir et du segment russe de l'ISS, chaque sonde Venera et Vega, chaque mission Luna de retour d'échantillons, ainsi que les soviétiques Mars-2/-3/-5/-7. L'étage supérieur Blok-D fut développé pour le programme lunaire habité N1-L3 abandonné ; son recyclage sur Proton-K a maintenu en vie la lignée planétaire soviétique à haute énergie jusque dans les années 1980. Remplacé par le Proton-M, toujours en service.",
      best_known_for:
        'Cheval de bataille soviétique / russe pour les charges lourdes 1967-2012 — Saliout, Mir, chaque Venera, chaque Luna',
    },
    hi: {
      tagline:
        'सोवियत / रूसी भारी-वहन कार्यबल 1967-2012 — Salyut, Mir, हर Venera, हर Luna नमूना-वापसी',
      description:
        'त्रिचरण हाइपरगोलिक (N2O4 / UDMH) भारी-वहन वाहन जिसमें उच्च-ऊर्जा प्रक्षेपण के लिए वैकल्पिक Blok-D / D-1 / D-2 ऊपरी चरण हैं। 10-03-1967 से 30-03-2012 के बीच 311 लॉन्च — हर Salyut, Mir और ISS रूसी-खंड मॉड्यूल, हर Venera और Vega शुक्र जांच, हर Luna नमूना-वापसी मिशन, और सोवियत Mars-2/-3/-5/-7 को कक्षा में पहुंचाया। Blok-D ऊपरी चरण मूल रूप से रद्द किए गए N1-L3 मानवयुक्त चंद्र वास्तुकला के लिए विकसित किया गया था; Proton-K पर उसका पुन: उपयोग 1980 के दशक तक उच्च-ऊर्जा सोवियत ग्रहीय श्रृंखला को जीवित रखा। Proton-M द्वारा प्रतिस्थापित, जो अभी भी उड़ान भर रहा है।',
      best_known_for: 'सोवियत / रूसी भारी-वहन कार्यबल 1967-2012 — Salyut, Mir, हर Venera, हर Luna',
    },
    it: {
      tagline:
        'Cavallo di battaglia sovietico / russo per carichi pesanti 1967-2012 — Salyut, Mir, ogni Venera, ogni Luna sample-return',
      description:
        "Lanciatore pesante a tre stadi a propellenti ipergolici (N2O4 / UDMH), con stadi superiori opzionali Blok-D / D-1 / D-2 ad alta energia. 311 lanci tra il 10/03/1967 e il 30/03/2012 — ha portato in orbita ogni modulo Salyut, Mir e del segmento russo della ISS, ogni sonda Venera e Vega, ogni missione Luna di ritorno di campioni e le sovietiche Mars-2/-3/-5/-7. Lo stadio superiore Blok-D fu sviluppato per l'architettura lunare con equipaggio N1-L3 cancellata; il suo riutilizzo su Proton-K ha mantenuto in vita la linea planetaria sovietica ad alta energia fino agli anni '80. Sostituito dal Proton-M, ancora in servizio.",
      best_known_for:
        'Cavallo di battaglia sovietico / russo per carichi pesanti 1967-2012 — Salyut, Mir, ogni Venera, ogni Luna',
    },
    ja: {
      name: 'プロトン K',
      tagline:
        'ソ連／ロシアの重量打ち上げ機の主力 1967〜2012 — サリュート、ミール、すべての Venera、すべての Luna サンプルリターン',
      description:
        '三段式ヒパゴリック（N2O4／UDMH）重量打ち上げ機。高エネルギー脱出には Blok-D／D-1／D-2 上段が選択できる。1967 年 3 月 10 日から 2012 年 3 月 30 日までに 311 機を打ち上げ、Salyut／Mir／ISS のロシア区画の全モジュール、すべての Venera と Vega 金星探査機、すべての Luna サンプルリターン、そしてソ連の Mars-2／-3／-5／-7 を運んだ。Blok-D 上段は本来、中止された有人月計画 N1-L3 用に開発されたが、Proton-K で再活用したことで 1980 年代まで高エネルギーのソ連惑星探査が継続できた。後継の Proton-M が現在も運用中。',
      best_known_for:
        'ソ連／ロシアの重量打ち上げ機 1967〜2012 — サリュート、ミール、すべての Venera、すべての Luna',
    },
    ko: {
      name: '프로톤-K',
      tagline:
        '소비에트 / 러시아 중량 발사 주력 1967〜2012 — Salyut, Mir, 모든 Venera, 모든 Luna 표본 회수',
      description:
        '3단 하이퍼골릭(N2O4 / UDMH) 중량 발사체로, 고에너지 탈출궤적에는 Blok-D / D-1 / D-2 상단을 선택할 수 있다. 1967년 3월 10일부터 2012년 3월 30일까지 311회 발사하며 모든 Salyut, Mir, ISS 러시아 구역 모듈과 모든 Venera·Vega 금성 탐사선, 모든 Luna 표본 회수 임무, 소비에트 Mars-2/-3/-5/-7을 운반했다. Blok-D 상단은 원래 취소된 유인 N1-L3 달 프로그램용으로 개발되었지만, Proton-K에 재사용함으로써 1980년대까지 고에너지 소비에트 행성 탐사가 이어졌다. 후속기인 Proton-M은 여전히 운용 중이다.',
      best_known_for:
        '소비에트 / 러시아 중량 발사체 1967〜2012 — Salyut, Mir, 모든 Venera, 모든 Luna',
    },
    nl: {
      tagline:
        'Sovjet / Russisch zwaarlast-werkpaard 1967-2012 — Saljoet, Mir, elke Venera, elke Luna sample-return',
      description:
        "Driedelige hypergole (N2O4 / UDMH) zwaarlastdrager met optionele hoogenergetische bovenste trappen Blok-D / D-1 / D-2. 311 lanceringen tussen 10-03-1967 en 30-03-2012 — bracht elke Saljoet-, Mir- en ISS Russisch-segment module, elke Venera- en Vega-Venussonde, elke Luna sample-return missie en de Sovjet Mars-2/-3/-5/-7 in een baan. De Blok-D bovenste trap werd oorspronkelijk ontwikkeld voor de geannuleerde bemande N1-L3 maanarchitectuur; hergebruik op Proton-K hield de hoog-energetische Sovjet planetaire lijn tot in de jaren '80 levend. Vervangen door Proton-M, die nog steeds vliegt.",
      best_known_for:
        'Sovjet / Russisch zwaarlast-werkpaard 1967-2012 — Saljoet, Mir, elke Venera, elke Luna',
    },
    'pt-BR': {
      tagline:
        'Cavalo de batalha soviético / russo de carga pesada 1967-2012 — Salyut, Mir, cada Venera, cada Luna sample-return',
      description:
        'Veículo de carga pesada de três estágios com propelente hipergólico (N2O4 / UDMH) e estágios superiores opcionais de alta energia Blok-D / D-1 / D-2. 311 lançamentos entre 10-03-1967 e 30-03-2012 — levou cada módulo Salyut, Mir e do segmento russo da ISS, cada sonda Venera e Vega, cada missão Luna de retorno de amostras, e os soviéticos Mars-2/-3/-5/-7. O estágio superior Blok-D foi originalmente desenvolvido para a arquitetura lunar tripulada N1-L3 cancelada; reutilizá-lo no Proton-K manteve a linha planetária soviética de alta energia viva até os anos 80. Substituído pelo Proton-M, que ainda voa.',
      best_known_for:
        'Cavalo de batalha soviético / russo de carga pesada 1967-2012 — Salyut, Mir, cada Venera, cada Luna',
    },
    ru: {
      name: 'Протон-К',
      tagline:
        'Советская / российская тяжёлая рабочая лошадка 1967-2012 — Салют, Мир, каждая Венера, каждый возврат грунта «Луна»',
      description:
        'Трёхступенчатый тяжёлый носитель на гептиловых компонентах (АТ / НДМГ) с опциональными высокоэнергетическими разгонными блоками Блок-Д / Д-1 / Д-2. 311 пусков с 10.03.1967 по 30.03.2012 — вывел все модули «Салют», «Мир» и российского сегмента МКС, все межпланетные станции серий «Венера» и «Вега», все возвратные «Луны», а также советские «Марс-2/-3/-5/-7». Разгонный блок Блок-Д изначально разрабатывался под закрытую пилотируемую лунную программу Н1-Л3; его повторное применение на «Протон-К» удержало советскую высокоэнергетическую планетную линию в строю до начала 1980-х. Заменён «Протон-М», который продолжает летать.',
      best_known_for:
        'Советский / российский тяжёлый носитель 1967-2012 — Салют, Мир, каждая «Венера», каждый возврат «Луны»',
    },
    'sr-Cyrl': {
      tagline:
        'Совјетски / руски радни коњ тешких терета 1967-2012 — Саљут, Мир, свака Венера, свака Луна повратна мисија',
      description:
        'Трокраки хипергонски (АТ / НДМГ) тешки носач са опционим високоенергетским горњим степенима Блок-Д / Д-1 / Д-2. 311 лансирања између 10.03.1967. и 30.03.2012. — пренео је сваки Саљут, Мир и модул руског сегмента ИСС-а, сваку Венера и Вега венерску сонду, сваку Луна повратну мисију и совјетске Марс-2/-3/-5/-7. Горњи степен Блок-Д је првобитно развијен за отказани пилотирани лунарни програм Н1-Л3; његова поновна употреба на Протон-К-у одржала је совјетску високоенергетску планетарну линију до 1980-их. Замењен Протоном-М који и даље лети.',
      best_known_for:
        'Совјетски / руски радни коњ тешких терета 1967-2012 — Саљут, Мир, свака Венера, свака Луна',
    },
    'zh-CN': {
      name: '质子-K',
      tagline:
        '苏联 / 俄罗斯重型主力运载火箭 1967-2012 — Salyut、Mir、每一颗 Venera、每一次 Luna 取样返回',
      description:
        '三级偏二甲肼/四氧化二氮重型运载火箭，可加装 Blok-D / D-1 / D-2 高能上面级。1967-03-10 至 2012-03-30 间共发射 311 次 — 将每一个 Salyut、Mir 及国际空间站俄罗斯舱段、每一颗 Venera 与 Vega 金星探测器、每一次 Luna 取样返回、以及苏联的 Mars-2/-3/-5/-7 送入轨道。Blok-D 上面级原本是为已取消的 N1-L3 载人登月架构开发的；在质子-K 上的再利用，使苏联的高能行星探测线一直延续到 1980 年代。被仍在服役的质子-M 替代。',
      best_known_for:
        '苏联 / 俄罗斯重型主力 1967-2012 — Salyut、Mir、每一颗 Venera、每一次 Luna 取样返回',
    },
  },
  'atlas-slv-3d': {
    ar: {
      tagline:
        'حصان عمل ناسا للكواكب الخارجية في السبعينيات — Pioneer 10/11 و Helios 1/2 و Mariner 9/10 و Pioneer Venus',
      description:
        'مرحلة أولى Atlas SLV-3D ممدودة مع أول مرحلة علوية بالعالم تعمل بالهيدروجين (Centaur D-1A، LOX/LH₂) — التركيبة التي أتاحت كل بعثة أمريكية إلى المشتري وزحل و Mariner و Helios في السبعينيات. أُضيفت مرحلة Star-37E أو Star-48 الصلبة الإضافية في الأعلى للمسارات عالية الطاقة جداً (Pioneer 11 إلى المشتري ثم زحل). خَدمت 1973-1983؛ خلفتها عائلة Atlas G/H/I التي أفضت إلى Atlas II في التسعينيات.',
      best_known_for:
        'حصان عمل ناسا للكواكب الخارجية في السبعينيات — مرحلة Centaur D-1A الأولى بالهيدروجين فتحت العمالقة الغازية',
    },
    de: {
      tagline:
        'NASAs Arbeitspferd der äußeren Planeten in den 1970ern — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus',
      description:
        'Verlängerter Atlas-SLV-3D-Erststufenkörper mit der weltweit ersten Wasserstoff-Oberstufe (Centaur D-1A, LOX/LH₂) — die Kombination, die jede amerikanische Jupiter-, Saturn-, Mariner- und Helios-Mission der 1970er Jahre ermöglichte. Eine Star-37E- oder Star-48-Feststoff-Kickstufe wurde für die höchstenergetischen Flugbahnen aufgesetzt (Pioneer 11 an Jupiter vorbei zu Saturn). Diente 1973-1983; abgelöst durch die Atlas-G/H/I-Familie, die in die Atlas II der 1990er mündete.',
      best_known_for:
        'NASAs Arbeitspferd der äußeren Planeten in den 1970ern — die erste H₂-Oberstufe Centaur D-1A öffnete die Gasriesen',
    },
    es: {
      tagline:
        'Caballo de batalla de la NASA para planetas exteriores en los años 70 — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus',
      description:
        'Primera etapa Atlas SLV-3D estirada con la primera etapa superior de hidrógeno del mundo (Centaur D-1A, LOX/LH₂) — la combinación que hizo posible todas las misiones estadounidenses a Júpiter, Saturno, Mariner y Helios de los años 70. Se añadía una etapa de impulso sólido Star-37E o Star-48 para las trayectorias más energéticas (Pioneer 11 hacia Júpiter y luego Saturno). Sirvió de 1973 a 1983; fue sustituido por la familia Atlas G/H/I que desembocó en el Atlas II de los años 90.',
      best_known_for:
        'Caballo de batalla de la NASA para planetas exteriores en los 70 — la primera etapa de H₂ Centaur D-1A abrió los gigantes gaseosos',
    },
    fr: {
      tagline:
        'Le cheval de bataille de la NASA pour les planètes extérieures dans les années 1970 — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus',
      description:
        "Premier étage Atlas SLV-3D allongé avec le premier étage supérieur à hydrogène au monde (Centaur D-1A, LOX/LH₂) — la combinaison qui a permis toutes les missions américaines vers Jupiter, Saturne, Mariner et Helios des années 1970. Un étage solide Star-37E ou Star-48 était ajouté au sommet pour les trajectoires à très haute énergie (Pioneer 11 vers Jupiter puis Saturne). En service de 1973 à 1983 ; remplacé par la famille Atlas G/H/I qui a abouti à l'Atlas II des années 1990.",
      best_known_for:
        'Cheval de bataille de la NASA pour les planètes extérieures dans les 70 — le premier étage H₂ Centaur D-1A a ouvert les géantes gazeuses',
    },
    hi: {
      tagline:
        '1970 के दशक का NASA बाह्य-ग्रह कार्यबल — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus',
      description:
        'विस्तारित Atlas SLV-3D पहला चरण और दुनिया का पहला हाइड्रोजन-ईंधन वाला ऊपरी चरण (Centaur D-1A, LOX/LH₂) — यह संयोजन जिसने 1970 के दशक के हर अमेरिकी बृहस्पति, शनि, Mariner और Helios मिशन को संभव बनाया। बहुत उच्च-ऊर्जा प्रक्षेपवक्र (Pioneer 11 बृहस्पति होते हुए शनि) के लिए ऊपर एक Star-37E या Star-48 ठोस किक चरण जोड़ा जाता था। 1973-1983 तक सेवा में; Atlas G/H/I परिवार द्वारा प्रतिस्थापित जो 1990 के Atlas II में परिणत हुआ।',
      best_known_for:
        '1970 के दशक का NASA बाह्य-ग्रह कार्यबल — Centaur D-1A का पहला H₂ ऊपरी चरण गैस दिग्गजों के द्वार खोले',
    },
    it: {
      tagline:
        "Cavallo di battaglia della NASA per i pianeti esterni negli anni '70 — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus",
      description:
        "Primo stadio Atlas SLV-3D allungato con il primo stadio superiore a idrogeno al mondo (Centaur D-1A, LOX/LH₂) — la combinazione che ha reso possibili tutte le missioni americane verso Giove, Saturno, Mariner ed Helios degli anni '70. Uno stadio solido Star-37E o Star-48 veniva aggiunto in cima per le traiettorie a energia molto alta (Pioneer 11 verso Giove e poi Saturno). In servizio dal 1973 al 1983; sostituito dalla famiglia Atlas G/H/I che ha portato all'Atlas II degli anni '90.",
      best_known_for:
        "Cavallo di battaglia della NASA per i pianeti esterni anni '70 — il primo stadio H₂ Centaur D-1A ha aperto i giganti gassosi",
    },
    ja: {
      name: 'アトラス SLV-3D セントー',
      tagline:
        '1970 年代 NASA の外惑星探査主力 — Pioneer 10／11、Helios 1／2、Mariner 9／10、Pioneer Venus',
      description:
        '延長された Atlas SLV-3D 一段目に、世界初の液体水素上段である Centaur D-1A（LOX／LH₂）を組み合わせたもので、1970 年代のアメリカの木星・土星・マリナー・ヘリオス計画すべてを可能にした。最高エネルギーの軌道（Pioneer 11 を木星経由で土星へ）には Star-37E や Star-48 の固体キックステージを追加した。1973〜1983 年運用、Atlas G／H／I 系列に置き換えられ、それが 1990 年代の Atlas II につながった。',
      best_known_for:
        '1970 年代 NASA 外惑星主力 — Centaur D-1A の世界初の水素上段がガス惑星への扉を開いた',
    },
    ko: {
      name: '아틀라스 SLV-3D 센타우르',
      tagline:
        '1970년대 NASA 외행성 탐사 주력 발사체 — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus',
      description:
        '연장된 Atlas SLV-3D 1단에 세계 최초의 액체수소 상단인 Centaur D-1A(LOX/LH₂)를 결합한 조합으로, 1970년대 모든 미국 목성·토성·매리너·헬리오스 임무를 가능케 했다. 최고 에너지 궤적(Pioneer 11이 목성을 거쳐 토성으로)을 위해 Star-37E 또는 Star-48 고체 킥 스테이지를 상단에 추가했다. 1973-1983년 운용, 이후 Atlas G/H/I 계열로 대체되어 1990년대 Atlas II로 이어졌다.',
      best_known_for:
        '1970년대 NASA 외행성 주력 — Centaur D-1A의 세계 최초 H₂ 상단이 가스 행성을 열었다',
    },
    nl: {
      tagline:
        "NASA's werkpaard voor de buitenste planeten in de jaren '70 — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus",
      description:
        "Verlengde Atlas SLV-3D eerste trap met 's werelds eerste op waterstof werkende bovenste trap (Centaur D-1A, LOX/LH₂) — de combinatie die elke Amerikaanse Jupiter-, Saturnus-, Mariner- en Helios-missie van de jaren '70 mogelijk maakte. Voor de hoogste-energie trajecten (Pioneer 11 langs Jupiter naar Saturnus) werd er bovenop nog een Star-37E of Star-48 vaste kicktrap geplaatst. Diende 1973-1983; opgevolgd door de Atlas G/H/I-familie die uitmondde in de Atlas II van de jaren '90.",
      best_known_for:
        "NASA's werkpaard voor de buitenste planeten in de jaren '70 — de eerste H₂ bovenste trap Centaur D-1A opende de gasreuzen",
    },
    'pt-BR': {
      tagline:
        'Cavalo de batalha da NASA para planetas exteriores nos anos 70 — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus',
      description:
        'Primeiro estágio Atlas SLV-3D alongado com o primeiro estágio superior a hidrogênio do mundo (Centaur D-1A, LOX/LH₂) — a combinação que viabilizou todas as missões americanas a Júpiter, Saturno, Mariner e Helios nos anos 70. Um estágio sólido Star-37E ou Star-48 era acoplado no topo para as trajetórias de altíssima energia (Pioneer 11 passando por Júpiter rumo a Saturno). Serviu de 1973 a 1983; foi sucedido pela família Atlas G/H/I, que evoluiu para o Atlas II dos anos 90.',
      best_known_for:
        'Cavalo de batalha da NASA para planetas exteriores nos 70 — o primeiro estágio H₂ Centaur D-1A abriu os gigantes gasosos',
    },
    ru: {
      tagline:
        'Рабочая лошадка NASA для внешних планет 1970-х — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus',
      description:
        'Удлинённый «Атлас SLV-3D» в паре с первой в мире водородной ступенью «Центавр D-1A» (LOX/LH₂) — связка, благодаря которой состоялись все американские полёты к Юпитеру, Сатурну, Mariner и Helios 1970-х. Для самых энергоёмких траекторий (Pioneer 11 через Юпитер к Сатурну) сверху ставился твердотопливный разгонный блок Star-37E или Star-48. Использовался в 1973-1983 годах; заменён семейством Atlas G/H/I, перешедшим в Atlas II 1990-х.',
      best_known_for:
        'Рабочая лошадка NASA для внешних планет 1970-х — водородная ступень «Центавр D-1A» открыла газовые гиганты',
    },
    'sr-Cyrl': {
      tagline:
        'НАСА-ин радни коњ за спољне планете 1970-их — Pioneer 10/11, Helios 1/2, Mariner 9/10, Pioneer Venus',
      description:
        'Издужена Atlas SLV-3D прва степена са првим светским водониковим горњим степеном (Centaur D-1A, LOX/LH₂) — комбинација која је омогућила све америчке мисије ка Јупитеру, Сатурну, Mariner-у и Helios-у 1970-их. За траjекторије највеће енергије (Pioneer 11 кроз Јупитер до Сатурна) на врх се додавала чврста кик степена Star-37E или Star-48. Служио 1973-1983; наследила га је породица Atlas G/H/I, која је прерасла у Atlas II 1990-их.',
      best_known_for:
        'НАСА-ин радни коњ за спољне планете 1970-их — Centaur D-1A прва H₂ горња степена отворила гасне дивове',
    },
    'zh-CN': {
      name: '阿特拉斯 SLV-3D 半人马座',
      tagline:
        '1970 年代 NASA 外行星探测主力 — Pioneer 10/11、Helios 1/2、Mariner 9/10、Pioneer Venus',
      description:
        '加长版 Atlas SLV-3D 一级与世界首个液氢上面级 Centaur D-1A（LOX/LH₂）的组合 — 1970 年代每一次美国木星、土星、Mariner 与 Helios 任务都靠它实现。需要最高能量的轨道（Pioneer 11 借木星飞越奔向土星）时，会在顶部加装 Star-37E 或 Star-48 固体推进上面级。1973-1983 年服役，被 Atlas G/H/I 家族取代，后者又演化为 1990 年代的 Atlas II。',
      best_known_for:
        '1970 年代 NASA 外行星主力 — Centaur D-1A 世界首个液氢上面级，打开气态巨星之门',
    },
  },
  'ariane-1': {
    ar: {
      tagline:
        'أول مركبة إطلاق مدارية مستقلة لأوروبا — فتحت عصر الأقمار التجارية لـ ESA وأطلقت Giotto نحو مذنب هالي',
      description:
        'صاروخ ثلاثي المراحل بناه CNES بطلب من ESA بعد إلغاء برنامج Europa — مراحل أولى وثانية هيدراجولية UH-25 / N2O4، يعلوها الطابق العلوي HM7 الذي يعمل بـ LH₂ / LOX. 11 إطلاقاً من كورو بين 24-12-1979 و 22-02-1986 حملت 27 قمراً صناعياً أوروبياً للاتصالات والعلوم بما في ذلك ECS-1 و Marecs A/B و Spacenet و Telecom 1A/1B ومسبار Giotto لرصد هالي. أُحيل إلى التقاعد لصالح Ariane 2/3/4 الأكبر؛ تكنولوجيا HM7 المبردة استمرت عبر Ariane 4 ووصلت إلى المرحلة ESC-A في Ariane 5.',
      best_known_for:
        'أول مركبة إطلاق مدارية مستقلة لأوروبا — 11 رحلة 1979-1986، فتحت الأقمار التجارية وأطلقت Giotto نحو هالي',
    },
    de: {
      tagline:
        'Europas erste unabhängige Trägerrakete — eröffnete die kommerzielle Comsat-Ära für ESA und brachte Giotto zum Halleyschen Kometen',
      description:
        'Dreistufige Rakete, gebaut von CNES im Auftrag der ESA nach dem gestrichenen Europa-Programm — hypergolische erste und zweite Stufen mit UH-25 / N2O4 plus dem kryogenen HM7-Oberstufentriebwerk (LH₂ / LOX). 11 Starts aus Kourou zwischen dem 24.12.1979 und dem 22.02.1986 trugen 27 europäische Telekom- und Wissenschaftssatelliten, darunter ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B und die ESA-Sonde Giotto zum Halleyschen Kometen. Außer Dienst gestellt zugunsten der grösseren Ariane 2/3/4; die kryogene HM7-Oberstufentechnologie lief weiter über Ariane 4 und mündete in die ESC-A-Oberstufe der Ariane 5.',
      best_known_for:
        'Europas erste unabhängige Trägerrakete — 11 Flüge 1979-1986, eröffnete kommerzielle Comsats und Giotto zum Halley',
    },
    es: {
      tagline:
        'El primer lanzador orbital independiente de Europa — abrió la era comercial de los satélites para la ESA y llevó a Giotto al cometa Halley',
      description:
        'Cohete de tres etapas construido por el CNES por encargo de la ESA tras la cancelación del programa Europa — primeras y segundas etapas hipergólicas con UH-25 / N2O4, coronadas por la etapa superior HM7 criogénica (LH₂ / LOX). 11 lanzamientos desde Kourou entre el 24-12-1979 y el 22-02-1986 llevaron 27 satélites europeos de telecomunicaciones y ciencia, incluidos ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B y la sonda Giotto de la ESA al cometa Halley. Retirado en favor de los Ariane 2/3/4 más grandes; la tecnología criogénica HM7 perduró a través de Ariane 4 y llegó a la etapa ESC-A del Ariane 5.',
      best_known_for:
        'Primer lanzador orbital independiente de Europa — 11 vuelos 1979-1986, abrió los comsats comerciales y llevó a Giotto al Halley',
    },
    fr: {
      tagline:
        "Le premier lanceur orbital indépendant de l'Europe — a ouvert l'ère des comsats commerciaux pour l'ESA et a envoyé Giotto vers la comète de Halley",
      description:
        "Fusée à trois étages développée par le CNES à la demande de l'ESA après l'annulation du programme Europa — premier et deuxième étages hypergoliques UH-25 / N2O4 surmontés du troisième étage cryogénique HM7 (LH₂ / LOX). 11 lancements depuis Kourou entre le 24/12/1979 et le 22/02/1986 ont emporté 27 satellites européens de télécommunications et de science, dont ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B et la sonde Giotto de l'ESA vers la comète de Halley. Retirée au profit des Ariane 2/3/4 plus puissants ; la technologie cryogénique HM7 s'est poursuivie via Ariane 4 jusqu'à l'étage ESC-A d'Ariane 5.",
      best_known_for:
        "Le premier lanceur orbital indépendant de l'Europe — 11 vols 1979-1986, a ouvert les comsats commerciaux et a envoyé Giotto vers Halley",
    },
    hi: {
      tagline:
        'यूरोप का पहला स्वतंत्र कक्षीय प्रक्षेपण यान — ESA के लिए वाणिज्यिक कॉमसेट युग खोला और Giotto को हैली धूमकेतु तक भेजा',
      description:
        'Europa कार्यक्रम रद्द होने के बाद ESA के अनुरोध पर CNES द्वारा निर्मित त्रिचरण रॉकेट — पहली और दूसरी हाइपरगोलिक UH-25 / N2O4 चरण, ऊपर HM7 क्रायोजेनिक (LH₂ / LOX) तीसरा चरण। 24-12-1979 से 22-02-1986 के बीच Kourou से 11 लॉन्च, जिनमें ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B और ESA की Giotto हैली फ्लाईबाई जांच सहित 27 यूरोपीय दूरसंचार और विज्ञान उपग्रह शामिल थे। बड़े Ariane 2/3/4 के पक्ष में सेवानिवृत्त; HM7 क्रायोजेनिक तकनीक Ariane 4 के माध्यम से और फिर Ariane 5 के ESC-A चरण में जारी रही।',
      best_known_for:
        'यूरोप का पहला स्वतंत्र कक्षीय प्रक्षेपण यान — 11 उड़ानें 1979-1986, वाणिज्यिक कॉमसेट खोले और Giotto को हैली भेजा',
    },
    it: {
      tagline:
        "Il primo lanciatore orbitale indipendente dell'Europa — ha aperto l'era dei comsat commerciali per l'ESA e ha portato Giotto alla cometa di Halley",
      description:
        "Razzo a tre stadi costruito da CNES su richiesta dell'ESA dopo la cancellazione del programma Europa — primo e secondo stadio ipergolici UH-25 / N2O4, sormontati dal terzo stadio criogenico HM7 (LH₂ / LOX). 11 lanci da Kourou tra il 24/12/1979 e il 22/02/1986 hanno portato 27 satelliti europei di telecomunicazioni e scienza, inclusi ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B e la sonda Giotto dell'ESA verso la cometa di Halley. Ritirato a favore degli Ariane 2/3/4 più grandi; la tecnologia criogenica HM7 è proseguita attraverso Ariane 4 fino allo stadio ESC-A di Ariane 5.",
      best_known_for:
        "Primo lanciatore orbitale indipendente dell'Europa — 11 voli 1979-1986, ha aperto i comsat commerciali e ha portato Giotto a Halley",
    },
    ja: {
      name: 'アリアン 1',
      tagline:
        'ヨーロッパ初の自前の軌道打ち上げ機 — ESA に商用通信衛星時代を開き、Giotto をハレー彗星へ送った',
      description:
        '中止された Europa 計画の後継として ESA の要請で CNES が開発した三段式ロケット — 一段目と二段目はヒパゴリックの UH-25／N2O4、三段目はクライオジェニックの HM7（LH₂／LOX）。1979 年 12 月 24 日から 1986 年 2 月 22 日までクールーから 11 機を打ち上げ、ECS-1、Marecs A／B、Spacenet、Telecom 1A／1B、ESA のハレー彗星探査機 Giotto を含む 27 機の欧州通信・科学衛星を運んだ。より大型の Ariane 2／3／4 に道を譲って退役したが、HM7 のクライオジェニック技術は Ariane 4 を経て Ariane 5 の ESC-A 上段に受け継がれた。',
      best_known_for:
        'ヨーロッパ初の自前の軌道打ち上げ機 — 1979〜1986 年 11 機、商用通信衛星市場を開き Giotto をハレーへ',
    },
    ko: {
      name: '아리안 1',
      tagline:
        '유럽 최초의 독자 궤도 발사체 — ESA에 상용 통신위성 시대를 열고 Giotto를 핼리 혜성으로 보냈다',
      description:
        '취소된 Europa 프로그램 이후 ESA의 요청으로 CNES가 개발한 3단 로켓 — 1·2단은 하이퍼골릭(UH-25 / N2O4), 3단은 극저온 HM7(LH₂ / LOX). 1979년 12월 24일부터 1986년 2월 22일까지 쿠루에서 11회 발사, ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B와 ESA의 핼리 혜성 탐사선 Giotto를 포함한 27기의 유럽 통신·과학 위성을 운반했다. 더 큰 Ariane 2/3/4로 대체되어 퇴역했지만, HM7 극저온 상단 기술은 Ariane 4를 거쳐 Ariane 5의 ESC-A 상단으로 이어졌다.',
      best_known_for:
        '유럽 최초의 독자 궤도 발사체 — 1979〜1986년 11회 발사, 상용 통신위성 개척 및 Giotto의 핼리행',
    },
    nl: {
      tagline:
        'De eerste onafhankelijke orbitale draagraket van Europa — opende het commerciële comsat-tijdperk voor ESA en bracht Giotto naar de komeet Halley',
      description:
        "Driedelige raket gebouwd door CNES in opdracht van ESA na het geannuleerde Europa-programma — hypergole eerste en tweede trappen UH-25 / N2O4 met daarbovenop de cryogene HM7-bovenste trap (LH₂ / LOX). 11 lanceringen vanuit Kourou tussen 24-12-1979 en 22-02-1986 brachten 27 Europese telecommunicatie- en wetenschapssatellieten, waaronder ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B en ESA's Giotto-Halley-flyby-sonde. Buiten dienst gesteld ten gunste van de grotere Ariane 2/3/4; de cryogene HM7-techniek leefde voort via Ariane 4 en kwam terecht in de ESC-A van Ariane 5.",
      best_known_for:
        'Eerste onafhankelijke orbitale draagraket van Europa — 11 vluchten 1979-1986, opende commerciële comsats en bracht Giotto naar Halley',
    },
    'pt-BR': {
      tagline:
        'O primeiro lançador orbital independente da Europa — abriu a era dos comsats comerciais para a ESA e levou a Giotto ao cometa Halley',
      description:
        'Foguete de três estágios construído pela CNES a pedido da ESA após o cancelamento do programa Europa — primeiros e segundos estágios hipergólicos UH-25 / N2O4, coroados pelo terceiro estágio criogênico HM7 (LH₂ / LOX). 11 lançamentos a partir de Kourou entre 24-12-1979 e 22-02-1986 levaram 27 satélites europeus de telecomunicações e ciência, incluindo ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B e a sonda Giotto da ESA ao cometa Halley. Aposentado em favor dos Ariane 2/3/4 maiores; a tecnologia criogênica HM7 continuou via Ariane 4 e desembocou no estágio ESC-A do Ariane 5.',
      best_known_for:
        'Primeiro lançador orbital independente da Europa — 11 voos 1979-1986, abriu os comsats comerciais e levou Giotto ao Halley',
    },
    ru: {
      tagline:
        'Первая независимая европейская ракета-носитель — открыла коммерческий рынок связных спутников для ESA и отправила Giotto к комете Галлея',
      description:
        'Трёхступенчатая ракета, разработанная CNES по заказу ESA после закрытия программы Europa — первая и вторая ступени на гипергольных компонентах UH-25 / N2O4, наверху криогенная третья ступень HM7 (LH₂ / LOX). 11 пусков из Куру в период с 24.12.1979 по 22.02.1986 вывели 27 европейских телекоммуникационных и научных спутников, включая ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B и зонд Giotto, отправленный ESA к комете Галлея. Выведена из эксплуатации в пользу более тяжёлых Ariane 2/3/4; криогенная технология HM7 продолжилась через Ariane 4 и достигла ступени ESC-A в Ariane 5.',
      best_known_for:
        'Первая независимая европейская ракета-носитель — 11 пусков 1979-1986, открыла рынок коммерческих связных спутников и отправила Giotto к Галлею',
    },
    'sr-Cyrl': {
      tagline:
        'Прва независна европска орбитална ракета — отворила еру комерцијалних комсата за ESA-у и послала Giotto до Халејеве комете',
      description:
        'Трокрака ракета коју је направио CNES на захтев ESA-е након отказаног програма Europa — прва и друга хипергонска степена UH-25 / N2O4, на врху криогена HM7 трећа степена (LH₂ / LOX). 11 лансирања из Куруа између 24.12.1979. и 22.02.1986. однело је 27 европских телекомуникационих и научних сателита, укључујући ECS-1, Marecs A/B, Spacenet, Telecom 1A/1B и ESA-ину Giotto Халејеву сонду. Повучена у корист већих Ariane 2/3/4; криогена HM7 технологија наставила се кроз Ariane 4 и стигла до ESC-A степена Ariane 5.',
      best_known_for:
        'Прва независна европска орбитална ракета — 11 летова 1979-1986, отворила комерцијалне комсате и послала Giotto до Халеја',
    },
    'zh-CN': {
      name: '阿丽亚娜 1',
      tagline: '欧洲首枚独立轨道运载火箭 — 为 ESA 打开商用通信卫星时代，并将 Giotto 送往哈雷彗星',
      description:
        'Europa 计划取消后，ESA 委托 CNES 研制的三级火箭 — 一级与二级使用偏二甲肼/四氧化二氮（UH-25 / N2O4）联氨自燃推进剂，三级搭载液氢液氧 HM7 低温上面级。1979-12-24 至 1986-02-22 间从库鲁发射 11 次，搭载包括 ECS-1、Marecs A/B、Spacenet、Telecom 1A/1B 以及 ESA 的 Giotto 哈雷彗星探测器在内的 27 颗欧洲通信和科学卫星。让位给更大的 Ariane 2/3/4 而退役；但 HM7 低温上面级技术经 Ariane 4 一路延续，演化为 Ariane 5 的 ESC-A 上面级。',
      best_known_for:
        '欧洲首枚独立轨道运载火箭 — 1979-1986 年 11 次飞行，开启商用通信卫星市场，将 Giotto 送往哈雷',
    },
  },
};

async function main() {
  let wrote = 0;
  for (const [launcher, byLocale] of Object.entries(OVERLAYS)) {
    for (const locale of LOCALES) {
      const entry = byLocale[locale];
      if (!entry) {
        console.warn(`  ⚠ ${launcher}/${locale}: no inline translation, skipping`);
        continue;
      }
      const path = join(I18N_ROOT, locale, 'fleet', 'launcher', `${launcher}.json`);
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
