#!/usr/bin/env node
/**
 * Translate the 4 launcher backfill overlays (Starship · PSLV-XL ·
 * Long March 3B · New Glenn) into all 13 non-English locales. Pure
 * data layer — no API calls; translations live inline so the file
 * is reviewable + diff-friendly.
 *
 * Schema per (launcher, locale): { name, tagline, description,
 * best_known_for }. Empty entries fall through to the en-US base.
 *
 * Run from project root:  node scripts/translate-new-launchers.mjs
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
  starship: {
    ar: {
      name: 'Starship',
      tagline: 'مركبة إطلاق فائقة الثقل قابلة لإعادة الاستخدام بالكامل',
      description:
        'مركبة من مرحلتين مبنية حول محرك رابتور الذي يحرق الميثان — المرحلة الأولى Super Heavy (33 محركاً) + المرحلة الثانية Starship (6 محركات). صُمّمت للاسترداد الكامل والسريع عبر التقاط البرج لكلا المرحلتين، مع هدف رحلات المريخ ونظام Artemis HLS. أول رحلة (IFT-1) أقلعت في 20-04-2023 لكنها فقدت السيطرة قبل الانفصال؛ بدأت عمليات إيصال الحمولة بنجاح مع IFT-4 في يونيو 2024.',
      best_known_for:
        'مركبة إطلاق فائقة الثقل قابلة لإعادة الاستخدام بالكامل قيد التطوير لـ Artemis HLS والمريخ',
    },
    de: {
      name: 'Starship',
      tagline: 'Vollständig wiederverwendbares Superschwerlast-Trägersystem',
      description:
        'Zweistufiges Fahrzeug rund um den methanbetriebenen Raptor-Triebwerk — Super-Heavy-Erststufe (33 Raptors) + Starship-Zweitstufe (6 Raptors). Auf vollständige und schnelle Wiederverwendung über die Turm-Auffangung beider Stufen ausgelegt, mit Blick auf Mars-Transits und das Artemis-HLS-Programm. Erster Flug (IFT-1, Boca Chica, 20.04.2023) hob ab, verlor aber vor der Stufentrennung die Kontrolle; ab IFT-4 im Juni 2024 wurden Nutzlasten erfolgreich in den Orbit gebracht.',
      best_known_for:
        'Vollständig wiederverwendbares Superschwerlast-Trägersystem in Entwicklung für Artemis HLS + Mars',
    },
    es: {
      name: 'Starship',
      tagline: 'Vehículo de lanzamiento súper pesado totalmente reutilizable',
      description:
        'Vehículo de dos etapas construido en torno al motor Raptor de metano — primera etapa Super Heavy (33 Raptors) + segunda etapa Starship (6 Raptors). Diseñado para reutilización total y rápida mediante captura por torre de ambas etapas, apuntando a tránsitos a Marte y al programa Artemis HLS. El primer vuelo integrado (IFT-1, Boca Chica, 20-04-2023) despegó pero perdió control antes de la separación; las entregas exitosas de carga útil comenzaron con IFT-4 en junio de 2024.',
      best_known_for:
        'Vehículo súper pesado totalmente reutilizable en desarrollo para Artemis HLS + Marte',
    },
    fr: {
      name: 'Starship',
      tagline: 'Lanceur super-lourd entièrement réutilisable',
      description:
        "Lanceur à deux étages construit autour du moteur Raptor au méthane — premier étage Super Heavy (33 Raptors) + deuxième étage Starship (6 Raptors). Conçu pour une réutilisation totale et rapide via la capture par tour des deux étages, visant les transits martiens et le programme Artemis HLS. Le premier vol intégré (IFT-1, Boca Chica, 20/04/2023) a quitté le pas de tir mais a perdu le contrôle avant la séparation ; les premières mises en orbite réussies datent d'IFT-4 en juin 2024.",
      best_known_for:
        'Lanceur super-lourd entièrement réutilisable en développement pour Artemis HLS + Mars',
    },
    hi: {
      name: 'Starship',
      tagline: 'पूरी तरह से पुन: प्रयोज्य सुपर-हेवी प्रक्षेपण यान',
      description:
        'मीथेन-जलने वाले रैप्टर इंजन के चारों ओर बनाया गया दो-चरण वाहन — सुपर हेवी पहला चरण (33 रैप्टर) + स्टारशिप दूसरा चरण (6 रैप्टर)। टावर-कैच रिकवरी के माध्यम से दोनों चरणों की पूर्ण और तेज़ पुन: उपयोग के लिए डिज़ाइन किया गया, मंगल पारगमन समय-सीमा और आर्टेमिस HLS को लक्षित करते हुए। पहली एकीकृत परीक्षण उड़ान (IFT-1) 20-04-2023 को बोका चिका से उठी पर चरण पृथक्करण से पहले नियंत्रण खो दिया; सफल पेलोड डिलीवरी जून 2024 में IFT-4 के साथ शुरू हुई।',
      best_known_for:
        'आर्टेमिस HLS और मंगल के लिए विकसित किया जा रहा पूरी तरह पुन: प्रयोज्य सुपर-हेवी प्रक्षेपण यान',
    },
    it: {
      name: 'Starship',
      tagline: 'Veicolo di lancio super-pesante completamente riutilizzabile',
      description:
        'Veicolo a due stadi costruito attorno al motore Raptor a metano — primo stadio Super Heavy (33 Raptors) + secondo stadio Starship (6 Raptors). Progettato per il riutilizzo completo e rapido mediante cattura a torre di entrambi gli stadi, con obiettivi su transiti marziani e sul programma Artemis HLS. Il primo volo integrato (IFT-1, Boca Chica, 20/04/2023) ha lasciato la rampa ma ha perso il controllo prima della separazione degli stadi; le prime consegne di carico utile in orbita sono arrivate con IFT-4 nel giugno 2024.',
      best_known_for:
        'Veicolo super-pesante completamente riutilizzabile in sviluppo per Artemis HLS + Marte',
    },
    ja: {
      name: 'スターシップ',
      tagline: '完全再利用可能な超大型打ち上げ機',
      description:
        'メタン燃料のラプターエンジンを中心に設計された二段式打ち上げ機 — Super Heavy 一段目（33 基のラプター） + Starship 二段目（6 基のラプター）。タワーキャッチ方式による両段の完全かつ迅速な再利用を目指し、火星輸送および Artemis HLS 計画を念頭に置く。最初の統合飛行 IFT-1 は 2023 年 4 月 20 日にボカチカから打ち上げられたが段分離前に制御を失った。本格的なペイロード投入は 2024 年 6 月の IFT-4 から成功している。',
      best_known_for: 'Artemis HLS と火星向けに開発中の完全再利用可能な超大型打ち上げ機',
    },
    ko: {
      name: 'Starship',
      tagline: '완전 재사용 가능한 초중량급 발사체',
      description:
        '메탄 연소 Raptor 엔진을 중심으로 한 2단 발사체 — Super Heavy 1단(33기 Raptor) + Starship 2단(6기 Raptor). 두 단 모두를 타워 캐치 방식으로 신속히 회수해 완전 재사용하는 것을 목표로 하며, 화성 전이 일정과 Artemis HLS 프로그램을 겨냥한다. 첫 통합 비행 IFT-1은 2023-04-20 보카치카에서 이륙했으나 단 분리 전 제어를 잃었다. 성공적인 페이로드 투입은 2024년 6월 IFT-4부터 시작되었다.',
      best_known_for: 'Artemis HLS와 화성 임무를 위해 개발 중인 완전 재사용 초중량급 발사체',
    },
    nl: {
      name: 'Starship',
      tagline: 'Volledig herbruikbaar superzwaar lanceervoertuig',
      description:
        'Tweetraps voertuig opgebouwd rond de op methaan brandende Raptor-motor — Super Heavy eerste trap (33 Raptors) + Starship tweede trap (6 Raptors). Ontworpen voor volledig en snel hergebruik via toren-vangst van beide trappen, met het oog op Mars-transits en het Artemis-HLS-programma. De eerste geïntegreerde vlucht (IFT-1, Boca Chica, 20-04-2023) verliet het lanceerplatform maar verloor de controle vóór trapscheiding; succesvolle ladingleveringen begonnen met IFT-4 in juni 2024.',
      best_known_for:
        'Volledig herbruikbaar superzwaar lanceervoertuig in ontwikkeling voor Artemis HLS + Mars',
    },
    'pt-BR': {
      name: 'Starship',
      tagline: 'Veículo de lançamento superpesado totalmente reutilizável',
      description:
        'Veículo de dois estágios construído em torno do motor Raptor a metano — primeiro estágio Super Heavy (33 Raptors) + segundo estágio Starship (6 Raptors). Projetado para reutilização total e rápida via captura por torre de ambos os estágios, mirando trânsitos para Marte e o programa Artemis HLS. O primeiro voo integrado (IFT-1, Boca Chica, 20/04/2023) decolou mas perdeu o controle antes da separação de estágios; as primeiras entregas de carga útil em órbita ocorreram a partir do IFT-4, em junho de 2024.',
      best_known_for:
        'Veículo superpesado totalmente reutilizável em desenvolvimento para Artemis HLS + Marte',
    },
    ru: {
      name: 'Starship',
      tagline: 'Полностью многоразовая сверхтяжёлая ракета-носитель',
      description:
        'Двухступенчатый носитель, построенный вокруг метанового двигателя Raptor: первая ступень Super Heavy (33 Raptor) + вторая ступень Starship (6 Raptor). Спроектирован для полного и быстрого повторного использования через «башенный захват» обеих ступеней; цели — марсианские перелёты и программа Artemis HLS. Первый интегрированный полёт IFT-1 поднялся со старта в Бока-Чика 20.04.2023, но потерял управление до разделения ступеней; успешные выведения нагрузки начались с IFT-4 в июне 2024 года.',
      best_known_for:
        'Полностью многоразовая сверхтяжёлая ракета в разработке для Artemis HLS и Марса',
    },
    'sr-Cyrl': {
      name: 'Starship',
      tagline: 'Потпуно поново употребљив супер-тешки лансер',
      description:
        'Двостепени лансер изграђен око мотора Raptor који сагорева метан — прва степена Super Heavy (33 Raptor-а) + друга степена Starship (6 Raptor-а). Дизајниран за потпуну и брзу поновну употребу преко „торањ-хватања“ обе степене, са циљем марсовских трансфера и програма Artemis HLS. Први интегрисани лет (IFT-1, Бока Чика, 20. 4. 2023.) подигао се са рампе али је изгубио контролу пре раздвајања степена; успешна испорука терета у орбиту почела је од IFT-4 у јуну 2024.',
      best_known_for:
        'Потпуно поново употребљив супер-тешки лансер у развоју за Artemis HLS и Марс',
    },
    'zh-CN': {
      name: '星舰',
      tagline: '完全可重复使用的超重型运载火箭',
      description:
        '围绕甲烷燃烧的“猛禽”发动机设计的两级运载火箭 — 超级重型一级（33 台猛禽）+ 星舰二级（6 台猛禽）。通过发射塔“筷子”捕获实现两级的完全快速复用，目标为火星转移和 Artemis HLS 月球着陆系统。首次集成试飞 IFT-1 于 2023-04-20 在博卡奇卡升空，但在级间分离前失去控制；自 2024 年 6 月的 IFT-4 起开始成功投送载荷。',
      best_known_for: '为 Artemis HLS 与火星任务开发的完全可重复使用超重型运载火箭',
    },
  },
  'pslv-xl': {
    ar: {
      name: 'PSLV-XL',
      tagline: 'النسخة الثقيلة من PSLV التابعة لـ ISRO — Chandrayaan-1 + مدار المريخ',
      description:
        'مركبة إطلاق أقطاب صناعية من أربع مراحل في تكوينها الموسّع (XL): ستة معزّزات صلبة جانبية PS0M-XL تحمل وقوداً أكثر بنحو 50 % مقارنة بـ PSLV الأساسي. ترفع نحو 3.8 طن إلى المدار الأرضي المنخفض / 1.8 طن إلى مدار النقل الجغرافي، وحملت أهم البعثات الكوكبية للهند — Chandrayaan-1 (2008) و Mangalyaan (2013) — من المنصة الأولى في سريهاريكوتا. لا تزال نشطة لإطلاق أقمار رصد الأرض.',
      best_known_for:
        'النسخة الثقيلة الجانبية من PSLV التابعة لـ ISRO — أطلقت Chandrayaan-1 ومركبة مدار المريخ',
    },
    de: {
      name: 'PSLV-XL',
      tagline: 'ISROs schwere PSLV-Variante — Chandrayaan-1 + Mars Orbiter',
      description:
        'Vierstufiges Polar Satellite Launch Vehicle in der erweiterten (XL) Konfiguration: sechs angesteckte Feststoff-Booster PS0M-XL mit etwa 50 % mehr Treibstoff als die Standard-PSLV. Hebt ~3,8 t in den niedrigen Erdorbit / 1,8 t in den geostationären Transferorbit und trug die wichtigsten interplanetaren Missionen Indiens — Chandrayaan-1 (2008) und Mangalyaan / Mars Orbiter Mission (2013) — von der First Launch Pad in Sriharikota. Weiterhin aktiv für hyperspektrale + Radar-Erdbeobachtung.',
      best_known_for:
        'ISROs schwere PSLV-Variante mit Strap-on-Boostern — startete Chandrayaan-1 + Mars Orbiter Mission',
    },
    es: {
      name: 'PSLV-XL',
      tagline: 'Variante pesada del PSLV de la ISRO — Chandrayaan-1 + Mars Orbiter',
      description:
        'Vehículo de cuatro etapas en su configuración extendida (XL): seis propulsores sólidos PS0M-XL con aproximadamente un 50 % más de propelente que el PSLV estándar. Eleva ~3,8 t a la órbita baja / 1,8 t a la órbita de transferencia geoestacionaria y ha llevado las misiones interplanetarias más significativas de India — Chandrayaan-1 (2008) y Mangalyaan / Mars Orbiter Mission (2013) — desde la primera plataforma de Sriharikota. Sigue activo para despliegues de observación terrestre hiperespectral y de radar.',
      best_known_for:
        'Variante PSLV con cohetes laterales pesados de la ISRO — lanzó Chandrayaan-1 y Mars Orbiter',
    },
    fr: {
      name: 'PSLV-XL',
      tagline: "Variante lourde du PSLV de l'ISRO — Chandrayaan-1 + Mars Orbiter",
      description:
        "Lanceur à quatre étages dans sa configuration étendue (XL) : six propulseurs latéraux à poudre PS0M-XL portant environ 50 % de carburant en plus que le PSLV standard. Place ~3,8 t en orbite basse / 1,8 t en orbite de transfert géostationnaire et a porté les missions interplanétaires les plus importantes de l'Inde — Chandrayaan-1 (2008) et Mangalyaan / Mars Orbiter Mission (2013) — depuis le premier pas de tir de Sriharikota. Toujours actif pour des déploiements d'observation hyperspectrale et radar.",
      best_known_for:
        "Variante lourde du PSLV de l'ISRO — a lancé Chandrayaan-1 et Mars Orbiter Mission",
    },
    hi: {
      name: 'PSLV-XL',
      tagline: 'ISRO का भारी पीएसएलवी संस्करण — चंद्रयान-1 + मार्स ऑर्बिटर',
      description:
        'अपने विस्तारित (XL) कॉन्फ़िगरेशन में चार-चरण वाला ध्रुवीय उपग्रह प्रक्षेपण यान: छह PS0M-XL ठोस स्ट्रैप-ऑन बूस्टर्स, मानक पीएसएलवी से लगभग 50 % अधिक प्रणोदक के साथ। ~3.8 टन LEO / 1.8 टन GTO तक ले जाता है और भारत के सबसे महत्वपूर्ण अंतरग्रहीय मिशनों — चंद्रयान-1 (2008) और मंगलयान / मार्स ऑर्बिटर मिशन (2013) — को श्रीहरिकोटा के पहले लॉन्च पैड से ले गया। अब भी हाइपरस्पेक्ट्रल और रडार पृथ्वी अवलोकन तैनातियों के लिए सक्रिय है।',
      best_known_for:
        'ISRO का भारी स्ट्रैप-ऑन पीएसएलवी संस्करण — चंद्रयान-1 और मंगलयान का प्रक्षेपण किया',
    },
    it: {
      name: 'PSLV-XL',
      tagline: "Variante pesante del PSLV dell'ISRO — Chandrayaan-1 + Mars Orbiter",
      description:
        "Lanciatore a quattro stadi nella configurazione estesa (XL): sei booster laterali a propellente solido PS0M-XL con circa il 50 % di propellente in più rispetto al PSLV standard. Solleva ~3,8 t in LEO / 1,8 t in GTO e ha portato le missioni interplanetarie più importanti dell'India — Chandrayaan-1 (2008) e Mangalyaan / Mars Orbiter Mission (2013) — dalla First Launch Pad di Sriharikota. Ancora attivo per dispiegamenti di osservazione terrestre iperspettrale e radar.",
      best_known_for:
        "Variante pesante del PSLV dell'ISRO — ha lanciato Chandrayaan-1 e Mars Orbiter Mission",
    },
    ja: {
      name: 'PSLV-XL',
      tagline: 'ISRO の重量級 PSLV — チャンドラヤーン 1 号 + マーズ・オービター',
      description:
        '拡張型（XL）構成の 4 段式極軌道衛星打ち上げ機。標準 PSLV より約 50 % 多い推進剤を持つ PS0M-XL ストラップオン固体ブースターを 6 基装着する。LEO へ約 3.8 t、GTO へ 1.8 t を投入でき、インドの代表的な惑星探査機 — チャンドラヤーン 1 号（2008）とマンガルヤーン／火星探査機（2013）— をシュリーハリコータ第一射場から打ち上げた。現在もハイパースペクトル・SAR 地球観測衛星の投入に用いられている。',
      best_known_for:
        'ISRO の重量級ストラップオン PSLV — チャンドラヤーン 1 号と火星探査機を打ち上げた',
    },
    ko: {
      name: 'PSLV-XL',
      tagline: 'ISRO의 헤비 스트랩온 PSLV — Chandrayaan-1 + Mars Orbiter',
      description:
        '확장형(XL) 구성의 4단 극궤도위성 발사체. 표준 PSLV보다 추진제가 약 50% 더 많은 PS0M-XL 고체 스트랩온 부스터 6기를 장착한다. LEO에 약 3.8 t / GTO에 1.8 t을 투입하며, 인도의 대표 행성 탐사 임무인 Chandrayaan-1(2008)과 Mangalyaan / Mars Orbiter Mission(2013)을 슈리하리코타 제1발사대에서 쏘아 올렸다. 초분광·SAR 지구관측 위성 배치를 위해 지금도 운용 중이다.',
      best_known_for: 'ISRO의 헤비 스트랩온 PSLV — Chandrayaan-1과 화성 궤도선을 발사했다',
    },
    nl: {
      name: 'PSLV-XL',
      tagline: "ISRO's zware PSLV-variant — Chandrayaan-1 + Mars Orbiter",
      description:
        "Viertraps Polar Satellite Launch Vehicle in zijn uitgebreide (XL) configuratie: zes vaste PS0M-XL strap-on boosters met ongeveer 50 % meer stuwstof dan de standaard PSLV. Tilt ~3,8 t naar LEO / 1,8 t naar GTO en heeft India's belangrijkste interplanetaire missies — Chandrayaan-1 (2008) en Mangalyaan / Mars Orbiter Mission (2013) — vanaf het First Launch Pad in Sriharikota gelanceerd. Nog steeds actief voor hyperspectrale en radarmissies voor aardobservatie.",
      best_known_for:
        "ISRO's zware strap-on PSLV-variant — lanceerde Chandrayaan-1 en Mars Orbiter Mission",
    },
    'pt-BR': {
      name: 'PSLV-XL',
      tagline: 'Variante pesada do PSLV da ISRO — Chandrayaan-1 + Mars Orbiter',
      description:
        'Veículo de quatro estágios na configuração estendida (XL): seis foguetes auxiliares sólidos PS0M-XL com cerca de 50 % mais propelente que o PSLV padrão. Coloca ~3,8 t em LEO / 1,8 t em GTO e levou as missões interplanetárias mais importantes da Índia — Chandrayaan-1 (2008) e Mangalyaan / Mars Orbiter Mission (2013) — a partir da Primeira Plataforma de Lançamento de Sriharikota. Ainda ativo para implantações hiperespectrais e de radar de observação da Terra.',
      best_known_for:
        'Variante pesada do PSLV com auxiliares sólidos — lançou Chandrayaan-1 e Mars Orbiter Mission',
    },
    ru: {
      name: 'PSLV-XL',
      tagline: 'Тяжёлая модификация PSLV ISRO — Chandrayaan-1 и Mars Orbiter',
      description:
        'Четырёхступенчатая ракета-носитель Polar Satellite Launch Vehicle в расширенной конфигурации (XL): шесть навесных твердотопливных ускорителей PS0M-XL с примерно на 50 % большим запасом топлива, чем у стандартного PSLV. Выводит ~3,8 т на низкую околоземную орбиту / 1,8 т на ГПО и обеспечила запуск ключевых межпланетных миссий Индии — «Чандраяан-1» (2008) и «Мангальяан» / Mars Orbiter Mission (2013) — с Первой стартовой площадки Шрихарикоты. Продолжает использоваться для гиперспектральных и радиолокационных аппаратов наблюдения Земли.',
      best_known_for: 'Тяжёлая модификация PSLV — запустила «Чандраяан-1» и Mars Orbiter Mission',
    },
    'sr-Cyrl': {
      name: 'PSLV-XL',
      tagline: 'Тешка варијанта ISRO-вог PSLV-а — Chandrayaan-1 + Mars Orbiter',
      description:
        'Четворостепена ракета Polar Satellite Launch Vehicle у проширеној (XL) конфигурацији: шест бочних чврстих појачивача PS0M-XL са око 50 % више горива у односу на стандардни PSLV. Подиже ~3,8 t у LEO / 1,8 t у GTO и носила је најзначајније индијске међупланетарне мисије — Chandrayaan-1 (2008) и Mangalyaan / Mars Orbiter Mission (2013) — са Прве рампе у Сурихарикоти. И даље активан за хиперспектралне и радарске сателите за осматрање Земље.',
      best_known_for: 'Тешка варијанта ISRO PSLV-а — лансирала Chandrayaan-1 и Mars Orbiter',
    },
    'zh-CN': {
      name: 'PSLV-XL',
      tagline: 'ISRO 的重型 PSLV 变体 — 月船 1 号与火星轨道器',
      description:
        '四级极轨卫星运载火箭的扩展（XL）型：搭载 6 枚 PS0M-XL 固体助推器，推进剂比标准 PSLV 多约 50%。可将约 3.8 吨送入近地轨道 / 1.8 吨送入地球同步转移轨道，承担了印度最重要的行星探测任务 — 月船 1 号（2008）和曼加里安/火星轨道器（2013），均从斯里赫里戈达第一发射台升空。目前仍用于高光谱与雷达对地观测卫星部署。',
      best_known_for: 'ISRO 的重型助推 PSLV 变体 — 发射了月船 1 号与火星轨道器',
    },
  },
  'long-march-3b': {
    ar: {
      name: 'Long March 3B',
      tagline: "حصان العمل الصيني لمدار النقل الجغرافي — منصات Chang'e والأقمار التجارية",
      description:
        "صاروخ ثلاثي المراحل سائل هايبيرغولي (UDMH/N2O4 على المراحل السفلية، LH2/LOX على المرحلة الثالثة) مع أربعة معزّزات جانبية. يرفع ~12 طناً إلى المدار الأرضي المنخفض / ~5,5 طن إلى مدار النقل الجغرافي من مركز شيتشانغ. فشل الإقلاع الأول (15-02-1996، Intelsat 708) فشلاً كارثياً بسبب عطل في حلقة التوجيه وأودى بحياة قرويين، لكن النسخة المعاد تصميمها نفّذت منذ ذلك الحين أكثر من 100 مهمة ناجحة، وهي المركبة القياسية لاستكشاف القمر ضمن برنامج Chang'e.",
      best_known_for:
        "حصان العمل الصيني لمدار النقل الجغرافي — مهمات Chang'e 3/4 وأغلبية الأقمار التجارية من شيتشانغ",
    },
    de: {
      name: 'Long March 3B',
      tagline:
        "Chinas GTO-Arbeitspferd — Chang'e-Mondlander + die meisten chinesischen Kommunikationssatelliten",
      description:
        "Dreistufige Flüssigkeitsrakete mit hypergolen unteren Stufen (UDMH/N2O4) und einer kryogenen Oberstufe (LH2/LOX), ergänzt durch vier seitlich montierte Booster. Trägt ~12 t in den niedrigen Erdorbit / ~5,5 t in den geostationären Transferorbit, gestartet vom Satellitenstartzentrum Xichang. Der Erstflug (15.02.1996, Intelsat 708) endete wegen eines Steuerungsfehlers in einer Katastrophe und tötete Anwohner im Niederschlagsgebiet; das neu konstruierte Fahrzeug hat seitdem über 100 erfolgreiche Missionen geflogen und ist der Standardträger für die Chang'e-Mondmissionen.",
      best_known_for:
        "Chinas GTO-Arbeitspferd — Chang'e 3/4 Mondlander + die meisten kommerziellen Kommunikationssatelliten aus Xichang",
    },
    es: {
      name: 'Long March 3B',
      tagline:
        "Caballo de batalla chino para GTO — módulos lunares Chang'e y la mayoría de los comsats",
      description:
        "Lanzador líquido de tres etapas hipergólico (UDMH/N2O4 en las etapas inferiores, LH2/LOX en la tercera) con cuatro propulsores laterales. Eleva ~12 t a LEO / ~5,5 t a GTO desde el Centro de Lanzamiento de Satélites de Xichang. El primer vuelo (15-02-1996, Intelsat 708) falló catastróficamente por un error en el bucle de guiado y mató a aldeanos aguas abajo; el vehículo rediseñado ha volado desde entonces más de 100 misiones exitosas y es el lanzador estándar para la exploración lunar Chang'e.",
      best_known_for:
        "Caballo de batalla chino para GTO — módulos lunares Chang'e 3/4 + la mayoría de comsats desde Xichang",
    },
    fr: {
      name: 'Long March 3B',
      tagline:
        "Cheval de bataille chinois pour la GTO — atterrisseurs lunaires Chang'e + la majorité des comsats",
      description:
        "Lanceur liquide à trois étages hypergolique (UDMH/N2O4 sur les étages inférieurs, LH2/LOX sur le troisième) avec quatre propulseurs latéraux. Place ~12 t en orbite basse / ~5,5 t en orbite de transfert géostationnaire depuis le centre de lancement de satellites de Xichang. Le premier vol (15/02/1996, Intelsat 708) s'est soldé par un échec catastrophique dû à une boucle de guidage défaillante et a tué des villageois en aval ; le véhicule redessiné a depuis effectué plus de 100 missions réussies et reste le lanceur standard pour l'exploration lunaire Chang'e.",
      best_known_for:
        "Cheval de bataille chinois pour la GTO — atterrisseurs lunaires Chang'e 3/4 et la plupart des comsats depuis Xichang",
    },
    hi: {
      name: 'Long March 3B',
      tagline: "चीन का GTO वर्कहॉर्स — Chang'e चंद्र लैंडर्स + अधिकांश चीनी कॉमसैट",
      description:
        "तीन-चरण द्रव हाइपरगोलिक प्रक्षेपण यान (निचले चरणों पर UDMH/N2O4, तीसरे पर LH2/LOX) चार साइड-माउंटेड स्ट्रैप-ऑन बूस्टर्स के साथ। शिचांग उपग्रह प्रक्षेपण केंद्र से ~12 टन LEO / ~5.5 टन GTO तक उठाता है। पहली उड़ान (15-02-1996, Intelsat 708) गाइडेंस-लूप दोष के कारण विनाशकारी रूप से विफल हुई और नीचे की ओर के ग्रामीणों की मौत हुई; पुनःडिज़ाइन किए गए यान ने तब से 100 से अधिक सफल मिशन उड़ाए हैं और यह Chang'e चंद्र अन्वेषण के लिए मानक प्रक्षेपण यान है।",
      best_known_for: "चीन का GTO वर्कहॉर्स — Chang'e 3/4 चंद्र लैंडर्स + शिचांग से अधिकांश कॉमसैट",
    },
    it: {
      name: 'Long March 3B',
      tagline:
        "Il cavallo da lavoro cinese per la GTO — lander lunari Chang'e + la maggior parte dei comsats",
      description:
        "Lanciatore a tre stadi liquido ipergolico (UDMH/N2O4 sugli stadi inferiori, LH2/LOX sul terzo) con quattro booster laterali. Porta ~12 t in LEO / ~5,5 t in GTO dal Centro di lancio satellitare di Xichang. Il primo volo (15/02/1996, Intelsat 708) si concluse con un fallimento catastrofico dovuto a un guasto dell'anello di guida e uccise abitanti dei villaggi a valle; il veicolo riprogettato ha da allora completato oltre 100 missioni di successo ed è il lanciatore standard per l'esplorazione lunare Chang'e.",
      best_known_for:
        "Cavallo da lavoro cinese per la GTO — lander lunari Chang'e 3/4 + la maggior parte dei comsats da Xichang",
    },
    ja: {
      name: '長征 3B',
      tagline: '中国の GTO 主力機 — 嫦娥月着陸機と大半の中国通信衛星',
      description:
        '下段ハイパーゴリック液体推進（UDMH/N2O4）、第 3 段は液体水素／液体酸素という構成の 3 段式打ち上げ機。4 基の液体ストラップオン・ブースターを装着し、西昌衛星発射センターから約 12 t を LEO に、約 5.5 t を GTO に投入する。初飛行（1996 年 2 月 15 日、Intelsat 708）は誘導ループ不具合で大破して落下し下流の住民に犠牲を出したが、再設計後は 100 機以上の成功を重ね、嫦娥月探査の標準ロケットとなっている。',
      best_known_for: '中国の GTO 主力機 — 嫦娥 3 号 / 4 号着陸機と西昌からの大半の商用通信衛星',
    },
    ko: {
      name: '창정 3B',
      tagline: '중국의 GTO 주력기 — 창어 달 착륙선과 대부분의 중국 통신위성',
      description:
        '하단 두 단은 하이퍼골릭(UDMH/N2O4), 3단은 액체수소·산소를 쓰는 3단식 발사체에 4기의 액체 스트랩온 부스터를 결합한 구성. 시창 위성발사센터에서 LEO에 약 12 t / GTO에 약 5.5 t을 투입한다. 1996-02-15 첫 비행(Intelsat 708)은 유도 루프 결함으로 추락해 하류 마을에 인명 피해를 냈으나, 재설계 이후 100여 회의 성공을 거두며 창어 달 탐사의 표준 발사체로 자리 잡았다.',
      best_known_for:
        '중국의 GTO 주력기 — 창어 3호/4호 달 착륙선과 시창에서 발사된 대부분의 통신위성',
    },
    nl: {
      name: 'Long March 3B',
      tagline: "China's GTO-werkpaard — Chang'e maanlanders + de meeste Chinese comsats",
      description:
        "Driestraps vloeibaar-hypergolisch lanceervoertuig (UDMH/N2O4 op de onderste trappen, LH2/LOX op de derde) met vier zijwaarts gemonteerde boosters. Tilt ~12 t naar LEO / ~5,5 t naar GTO vanaf het Xichang Satellite Launch Centre. De maiden flight (15-02-1996, Intelsat 708) eindigde catastrofaal door een fout in de stuurkring en kostte dorpelingen stroomafwaarts het leven; het herontworpen voertuig heeft sindsdien meer dan 100 succesvolle missies gevlogen en is de standaardlanceerder voor de Chang'e-maanverkenning.",
      best_known_for:
        "China's GTO-werkpaard — Chang'e 3/4 maanlanders + de meeste comsats vanaf Xichang",
    },
    'pt-BR': {
      name: 'Long March 3B',
      tagline:
        "Cavalo de batalha chinês para GTO — landers lunares Chang'e + a maioria dos comsats",
      description:
        "Lançador líquido de três estágios hipergólico (UDMH/N2O4 nos estágios inferiores, LH2/LOX no terceiro) com quatro propulsores laterais. Coloca ~12 t em LEO / ~5,5 t em GTO a partir do Centro de Lançamento de Satélites de Xichang. O voo inaugural (15/02/1996, Intelsat 708) terminou em falha catastrófica por defeito no laço de guiagem e matou aldeões a jusante; o veículo redesenhado já realizou mais de 100 missões bem-sucedidas e é o lançador padrão para a exploração lunar Chang'e.",
      best_known_for:
        "Cavalo de batalha chinês para GTO — landers lunares Chang'e 3/4 + a maioria dos comsats a partir de Xichang",
    },
    ru: {
      name: 'Чанчжэн-3B',
      tagline:
        'Китайская рабочая лошадка для ГПО — лунные посадочные «Чанъэ» и большинство комсатов',
      description:
        'Трёхступенчатая жидкостная ракета: нижние ступени работают на самовоспламеняющихся УДМГ/АТ, третья — на жидком кислороде и водороде; на первой ступени установлены четыре жидкостных навесных ускорителя. Выводит ~12 т на низкую околоземную орбиту / ~5,5 т на геостационарную переходную орбиту со старта в Сичане. Первый запуск 15.02.1996 (Intelsat 708) завершился аварией из-за сбоя контура управления и привёл к гибели жителей внизу по трассе; переработанная версия с тех пор выполнила более 100 успешных миссий и является основной ракетой китайской лунной программы «Чанъэ».',
      best_known_for:
        'Китайская рабочая лошадка для ГПО — лунные «Чанъэ-3» и «Чанъэ-4», а также большинство китайских комсатов из Сичана',
    },
    'sr-Cyrl': {
      name: 'Чанг Чен 3B',
      tagline: "Кинески радни коњ за GTO — лунарни лендери Chang'e + већина кинеских комсатова",
      description:
        "Тростепена ракета: нижи степени користе хиперголичне УДМХ/Н2О4, трећи течни водоник/кисеоник; четири течна бочна појачивача. Подиже ~12 t у LEO / ~5,5 t у GTO са лансирне базе Сичанг. Први лет (15. 2. 1996, Intelsat 708) завршио се катастрофом због квара управљачке петље и однео животе становника у даљини; редизајниран је и од тада обавио преко 100 успешних мисија, постајући стандардни лансер за месечеву мисију Chang'e.",
      best_known_for:
        "Кинески радни коњ за GTO — лунарни лендери Chang'e 3/4 и већина комерцијалних сателита из Сичанга",
    },
    'zh-CN': {
      name: '长征三号乙',
      tagline: '中国的 GTO 主力火箭 — 嫦娥着陆器与大多数商业通信卫星',
      description:
        '三级液体火箭（下两级偏二甲肼/四氧化二氮自燃推进剂，第三级液氢液氧），并捆绑四枚液体助推器。从西昌卫星发射中心起飞，可将约 12 吨送入近地轨道、约 5.5 吨送入地球同步转移轨道。首飞（1996-02-15，Intelsat 708）因制导回路故障在升空后坠毁，造成下游村民伤亡；改进后的型号此后完成 100 余次成功发射，是嫦娥探月工程的标配运载火箭。',
      best_known_for: '中国 GTO 主力火箭 — 嫦娥 3/4 月球着陆器与西昌发射的多数商业通信卫星',
    },
  },
  'new-glenn': {
    ar: {
      name: 'New Glenn',
      tagline: 'صاروخ Blue Origin المداري الثقيل القابل لإعادة الاستخدام من مرحلتين',
      description:
        'مركبة من مرحلتين فائقة الثقل، تعتمد على سبعة محركات BE-4 تعمل بالميثان في المرحلة الأولى (نفس محرك Vulcan)، ومحركَي BE-3U يعملان بالهيدروجين في المرحلة الثانية. صُمّمت لاستعادة المرحلة الأولى عبر هبوط على سفينة في عرض البحر. ترفع نحو 45 طناً إلى المدار الأرضي المنخفض وحاصلة على شهادة NSSL Phase 3 ونشرات Project Kuiper. الرحلة الافتتاحية NG-1 انطلقت من LC-36 في كيب كانافيرال يوم 16-01-2025 وأوصلت Blue Ring الرائد إلى المدار بنجاح — فُقدت محاولة هبوط المرحلة الأولى لكن الإدخال المداري كان سليماً.',
      best_known_for:
        'صاروخ Blue Origin المداري الثقيل القابل لإعادة الاستخدام — محرك BE-4 بالميثان + مرحلة عليا مبردة',
    },
    de: {
      name: 'New Glenn',
      tagline: 'Blue Origins zweistufige wiederverwendbare schwere Orbitalrakete',
      description:
        'Zweistufige Schwerlastrakete mit sieben mit Methan betriebenen BE-4-Triebwerken in der ersten Stufe (dasselbe Triebwerk wie bei Vulcan) und zwei wasserstoffbetriebenen BE-3U-Triebwerken in der zweiten Stufe. Vorgesehen für die Rückgewinnung der Erststufe per Landung auf einem Bergungsschiff stromabwärts. Trägt ~45 t in den niedrigen Erdorbit und ist für NSSL Phase 3 und Project-Kuiper-Einsätze zertifiziert. Der Jungfernflug NG-1 startete am 16.01.2025 von Cape Canaveral LC-36 und brachte das Blue-Ring-Pfadfinder-Modul erfolgreich in den Orbit — der Erststufen-Landeversuch ging verloren, der Orbiteinschuss selbst war sauber.',
      best_known_for:
        'Blue Origins zweistufige wiederverwendbare Schwerlast-Orbitalrakete — BE-4-Erststufe + kryogene Oberstufe',
    },
    es: {
      name: 'New Glenn',
      tagline: 'Lanzador orbital pesado de dos etapas reutilizable de Blue Origin',
      description:
        'Vehículo pesado de dos etapas construido en torno a siete motores BE-4 de metano en la primera etapa (el mismo motor que usa Vulcan) y dos motores BE-3U de hidrógeno en la segunda. Diseñado para recuperar la primera etapa mediante aterrizaje en una nave de recuperación. Coloca ~45 t en órbita baja y está certificado para despliegues NSSL Phase 3 + Project Kuiper. El vuelo inaugural NG-1 despegó del LC-36 de Cabo Cañaveral el 16-01-2025 y entregó con éxito al Blue Ring pathfinder en órbita — se perdió el intento de aterrizaje de la primera etapa pero la inyección orbital fue limpia.',
      best_known_for:
        'Lanzador orbital pesado de dos etapas reutilizable de Blue Origin — primera etapa BE-4 + segunda criogénica',
    },
    fr: {
      name: 'New Glenn',
      tagline: 'Le lanceur orbital lourd réutilisable à deux étages de Blue Origin',
      description:
        "Lanceur lourd à deux étages bâti autour de sept moteurs BE-4 au méthane sur le premier étage (le même moteur que Vulcan) et de deux moteurs BE-3U à hydrogène sur le second. Conçu pour la récupération du premier étage via un atterrissage en aval sur un navire de récupération. Place ~45 t en orbite basse et est certifié pour les déploiements NSSL Phase 3 + Project Kuiper. Le vol inaugural NG-1 a décollé du LC-36 de Cap Canaveral le 16/01/2025 et a livré avec succès le pathfinder Blue Ring en orbite — la tentative de récupération du premier étage a échoué mais l'injection orbitale a été propre.",
      best_known_for:
        'Lanceur orbital lourd à deux étages réutilisable de Blue Origin — premier étage BE-4 + étage cryogénique',
    },
    hi: {
      name: 'New Glenn',
      tagline: 'Blue Origin का दो-चरण पुन: प्रयोज्य भारी कक्षीय प्रक्षेपण यान',
      description:
        'पहले चरण में सात मीथेन-जलाने वाले BE-4 इंजन (वही इंजन जो Vulcan उपयोग करता है) और दूसरे चरण में दो हाइड्रोजन-जलाने वाले BE-3U इंजन के चारों ओर बना दो-चरण भारी प्रक्षेपण यान। पहले चरण की डाउनरेंज रिकवरी जहाज लैंडिंग के लिए डिज़ाइन किया गया। ~45 टन LEO तक उठाता है और NSSL Phase 3 + Project Kuiper तैनातियों के लिए प्रमाणित है। पहली उड़ान NG-1 केप कैनावेरल LC-36 से 16-01-2025 को उड़ी और Blue Ring पाथफाइंडर को सफलतापूर्वक कक्षा में पहुंचाया — पहले चरण की लैंडिंग प्रयास खो गया पर कक्षीय इंजेक्शन साफ था।',
      best_known_for:
        'Blue Origin का दो-चरण पुन: प्रयोज्य भारी कक्षीय प्रक्षेपण यान — BE-4 पहला चरण + क्रायोजेनिक दूसरा',
    },
    it: {
      name: 'New Glenn',
      tagline: 'Lanciatore orbitale pesante a due stadi riutilizzabile di Blue Origin',
      description:
        "Lanciatore pesante a due stadi costruito attorno a sette motori BE-4 a metano sul primo stadio (lo stesso motore di Vulcan) e a due motori BE-3U a idrogeno sul secondo. Progettato per il recupero del primo stadio mediante atterraggio su nave di recupero a valle. Porta ~45 t in LEO ed è certificato per dispiegamenti NSSL Phase 3 + Project Kuiper. Il volo inaugurale NG-1 è partito dal LC-36 di Cape Canaveral il 16/01/2025 e ha portato in orbita con successo il pathfinder Blue Ring — il tentativo di recupero del primo stadio è andato perso, ma l'inserimento orbitale è stato pulito.",
      best_known_for:
        'Lanciatore orbitale pesante riutilizzabile a due stadi di Blue Origin — primo stadio BE-4 + secondo criogenico',
    },
    ja: {
      name: 'New Glenn',
      tagline: 'Blue Origin の二段式再利用可能大型軌道打ち上げ機',
      description:
        '一段目に 7 基のメタン燃焼 BE-4 エンジン（Vulcan と同型）、二段目に 2 基の液体水素 BE-3U エンジンを備える二段式大型ロケット。一段目はダウンレンジの回収船への着船によって回収する設計。約 45 t を低軌道に投入でき、NSSL Phase 3 や Project Kuiper の運用認定を受けている。初飛行 NG-1 は 2025 年 1 月 16 日にケープ・カナベラル LC-36 から打ち上げられ、Blue Ring パスファインダーを軌道に投入することに成功した。一段目の着船は失敗したが、軌道投入そのものはクリーンだった。',
      best_known_for:
        'Blue Origin の二段式再利用可能大型軌道打ち上げ機 — メタン BE-4 一段目 + 液水二段目',
    },
    ko: {
      name: 'New Glenn',
      tagline: 'Blue Origin의 2단식 재사용 가능 대형 궤도 발사체',
      description:
        '1단에 메탄 연소 BE-4 엔진 7기(같은 엔진이 Vulcan에도 쓰임), 2단에 액체수소 BE-3U 엔진 2기를 장착한 대형 2단 발사체. 1단은 다운레인지 회수선 착륙을 통한 회수로 설계되었다. LEO에 약 45 t을 투입할 수 있으며 NSSL Phase 3와 Project Kuiper 임무 인증을 받았다. 첫 비행 NG-1은 2025-01-16 케이프 캐너버럴 LC-36에서 발사되어 Blue Ring 패스파인더를 궤도에 무사히 투입했다 — 1단의 착륙 시도는 실패했으나 궤도 진입 자체는 깔끔했다.',
      best_known_for:
        'Blue Origin의 2단식 재사용 가능 대형 궤도 발사체 — 메탄 BE-4 1단 + 극저온 2단',
    },
    nl: {
      name: 'New Glenn',
      tagline: 'Blue Origins tweetraps herbruikbare zware orbitale lanceervoertuig',
      description:
        'Tweetraps zwaar lanceervoertuig opgebouwd rond zeven BE-4-motoren op methaan in de eerste trap (dezelfde motor die Vulcan gebruikt) en twee waterstof-BE-3U-motoren in de tweede trap. Ontworpen voor terugwinning van de eerste trap via stroomafwaartse scheepslanding. Tilt ~45 t in LEO en is gecertificeerd voor NSSL Phase 3- en Project Kuiper-inzettingen. De maiden flight NG-1 vertrok op 16-01-2025 vanaf Cape Canaveral LC-36 en leverde de Blue Ring-padvinder met succes in een baan om de aarde — de landingspoging van de eerste trap ging verloren, maar de baaninbreng zelf verliep schoon.',
      best_known_for:
        'Blue Origins tweetraps herbruikbare zware orbitale lanceervoertuig — BE-4 eerste trap + cryogene tweede',
    },
    'pt-BR': {
      name: 'New Glenn',
      tagline: 'Lançador orbital pesado reutilizável de dois estágios da Blue Origin',
      description:
        'Veículo pesado de dois estágios construído em torno de sete motores BE-4 a metano no primeiro estágio (o mesmo motor do Vulcan) e dois motores BE-3U a hidrogênio no segundo. Projetado para recuperar o primeiro estágio por pouso em navio de recuperação a jusante. Coloca ~45 t em LEO e está certificado para implantações NSSL Phase 3 + Project Kuiper. O voo inaugural NG-1 decolou do LC-36 de Cabo Canaveral em 16/01/2025 e entregou o pathfinder Blue Ring em órbita com sucesso — a tentativa de pouso do primeiro estágio foi perdida, mas a inserção orbital foi limpa.',
      best_known_for:
        'Lançador orbital pesado reutilizável de dois estágios da Blue Origin — primeiro estágio BE-4 + segundo criogênico',
    },
    ru: {
      name: 'New Glenn',
      tagline: 'Двухступенчатая многоразовая тяжёлая ракета-носитель Blue Origin',
      description:
        'Двухступенчатая тяжёлая ракета: на первой ступени стоят семь метановых двигателей BE-4 (тех же, что и у Vulcan), на второй — два водородных BE-3U. Первая ступень рассчитана на возвращение посадкой на судно-эвакуатор ниже по трассе. Выводит ~45 т на низкую околоземную орбиту и сертифицирована для миссий NSSL Phase 3 и развёртывания Project Kuiper. Первый полёт NG-1 стартовал 16.01.2025 с LC-36 на мысе Канаверал и успешно вывел на орбиту пилотный модуль Blue Ring — посадку первой ступени потеряли, но орбитальное выведение прошло чисто.',
      best_known_for:
        'Двухступенчатая многоразовая тяжёлая ракета Blue Origin — метановая первая ступень BE-4 + криогенная вторая',
    },
    'sr-Cyrl': {
      name: 'New Glenn',
      tagline: 'Двостепена многократно употребљива тешка орбитална ракета Blue Origin-а',
      description:
        'Двостепени тешки лансер: прва степена има седам метанских BE-4 мотора (исти мотор користи и Vulcan), а друга два водонична BE-3U мотора. Прва степена пројектована је за повраћај слетањем на брод низводно. Подиже ~45 t у LEO и сертификована је за NSSL Phase 3 и распоређивања Project Kuiper. Први лет NG-1 узлетео је 16. 1. 2025. са LC-36 у Кејп Канавералу и успешно избацио Blue Ring извиђач у орбиту — покушај слетања прве степене изгубљен је, али је орбитално избацивање било чисто.',
      best_known_for:
        'Двостепена многократно употребљива тешка орбитална ракета Blue Origin-а — метански BE-4 на првој степени + криогена друга',
    },
    'zh-CN': {
      name: '新格伦',
      tagline: 'Blue Origin 的两级可重复使用重型轨道运载火箭',
      description:
        '两级重型运载火箭：一级搭载 7 台甲烷发动机 BE-4（与 Vulcan 同款），二级搭载 2 台液氢液氧 BE-3U 发动机。一级设计通过下游回收船海上回收。低地球轨道运力约 45 吨，已通过 NSSL Phase 3 与 Project Kuiper 部署的资质认证。首飞 NG-1 于 2025-01-16 在卡纳维拉尔角 LC-36 升空，成功将 Blue Ring 先行者送入轨道；一级海上回收尝试失败，但入轨过程顺利。',
      best_known_for: 'Blue Origin 的两级可重复使用重型轨道运载火箭 — 甲烷 BE-4 一级 + 低温二级',
    },
  },
};

async function main() {
  let written = 0;
  for (const [launcherId, perLocale] of Object.entries(OVERLAYS)) {
    for (const locale of LOCALES) {
      const dir = join(I18N_ROOT, locale, 'fleet', 'launcher');
      await mkdir(dir, { recursive: true });
      const file = join(dir, `${launcherId}.json`);
      const data = perLocale[locale];
      if (!data) {
        console.warn(`  ⚠ no overlay for ${launcherId} / ${locale}`);
        continue;
      }
      await writeFile(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
      written++;
    }
  }
  console.log(
    `Wrote ${written} launcher i18n overlays (${LOCALES.length} locales × ${Object.keys(OVERLAYS).length} launchers).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
