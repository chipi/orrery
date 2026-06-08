#!/usr/bin/env node
/**
 * Translate the 8 Apollo backfill mission overlays into 13 non-English
 * locales. Shape mirrors translate-phase3a/3b/3c — name/type/first/
 * description per (mission, locale). Events arrays inherited from
 * en-US (event note translations are a follow-up — same convention as
 * existing apollo11/13/17 overlays which only translate the top fields).
 *
 * Verified against existing en-US overlays for the three present Apollo
 * missions: the events[] block is NOT in the i18n overlay; it lives in
 * the base JSON and uses language-neutral labels. Wait — apollo11 en-US
 * overlay DOES include events[]. Then the i18n overlays for the new 8
 * also include events[], copied from en-US verbatim until per-locale
 * editorial follows.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');
const EN_US = join(I18N_ROOT, 'en-US', 'missions');
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

// (missionId, locale) → { name?, type, first, description }.
// Events array is copied verbatim from en-US — see header comment.
const OVERLAYS = {
  apollo7: {
    ar: {
      type: 'مدار أرضي مأهول · حُلّق',
      first: 'أول رحلة Apollo مأهولة — اختبار CSM في المدار الأرضي',
      description:
        'أول رحلة Apollo مأهولة، بعد 21 شهراً من حريق Apollo 1 (1967-01-27) الذي قتل Grissom و White و Chaffee على منصة الإطلاق. تحقّق Apollo 7 من Command and Service Module المُعاد تصميمه Block II في المدار الأرضي — دعم الحياة، الطاقة، الدفع (أُطلق SPS ثماني مرات)، التحكم الحراري، وأول بث تلفزيوني مباشر من مركبة فضائية أمريكية مأهولة. 10 أيام و 20 ساعة من الرحلة فتحت الطريق لمراهنة Apollo 8 على مدار القمر بعد شهرين.',
    },
    de: {
      type: 'BEMANNTE ERDUMLAUFBAHN · GEFLOGEN',
      first: 'Erster bemannter Apollo-Flug — Erdumlaufbahn-CSM-Erprobung',
      description:
        'Der erste bemannte Apollo-Flug, 21 Monate nach dem Apollo-1-Brand (27.1.1967), bei dem Grissom, White und Chaffee auf der Rampe ums Leben kamen. Apollo 7 verifizierte das neu konstruierte Block-II-Command-and-Service-Module in der Erdumlaufbahn — Lebenserhaltung, Energie, Antrieb (SPS achtmal gezündet), Wärmeschutz, und die weltweit erste Live-TV-Übertragung aus einem bemannten US-Raumfahrzeug. Der 10-Tage-20-Stunden-Flug machte den Weg frei für Apollo 8s Mondumlaufbahn-Wagnis zwei Monate später.',
    },
    es: {
      type: 'TRIPULADO ÓRBITA TERRESTRE · VOLÓ',
      first: 'Primer vuelo tripulado de Apollo — prueba del CSM en órbita terrestre',
      description:
        'El primer vuelo tripulado de Apollo, 21 meses después del incendio del Apollo 1 (1967-01-27) que mató a Grissom, White y Chaffee en la rampa. Apollo 7 verificó el rediseñado Módulo de Mando y Servicio Block II en órbita terrestre — soporte vital, potencia, propulsión (el SPS disparó ocho veces), control térmico, y la primera transmisión de TV en vivo del mundo desde una nave tripulada estadounidense. El vuelo de 10 días 20 horas despejó el camino para la apuesta de Apollo 8 a la órbita lunar dos meses después.',
    },
    fr: {
      type: 'HABITÉ ORBITE TERRESTRE · VOLÉ',
      first: 'Premier vol Apollo habité — essai du CSM en orbite terrestre',
      description:
        "Le premier vol Apollo habité, 21 mois après l'incendie d'Apollo 1 (27-1-1967) qui tua Grissom, White et Chaffee sur le pas de tir. Apollo 7 a vérifié le Module de Commande et de Service Block II redessiné en orbite terrestre — support-vie, énergie, propulsion (SPS allumé huit fois), contrôle thermique, et la première retransmission TV en direct au monde depuis un vaisseau spatial américain habité. Le vol de 10 jours 20 heures a ouvert la voie au pari d'Apollo 8 sur l'orbite lunaire deux mois plus tard.",
    },
    hi: {
      type: 'मानवयुक्त पृथ्वी-कक्षा · उड़ा',
      first: 'पहली मानवयुक्त Apollo उड़ान — पृथ्वी-कक्षा में CSM परीक्षण',
      description:
        'Apollo 1 की आग (1967-01-27) के 21 महीने बाद पहली मानवयुक्त Apollo उड़ान जिसने पैड पर Grissom, White और Chaffee को मार डाला था। Apollo 7 ने पृथ्वी की कक्षा में पुनः डिज़ाइन किए गए Block II Command and Service Module की पुष्टि की — जीवन समर्थन, शक्ति, प्रणोदन (SPS आठ बार दागा), तापीय नियंत्रण, और एक मानवयुक्त अमेरिकी अंतरिक्ष यान से दुनिया का पहला लाइव टीवी प्रसारण। 10 दिन 20 घंटे की उड़ान ने दो महीने बाद Apollo 8 के चंद्र-कक्षा जुए के लिए रास्ता साफ कर दिया।',
    },
    it: {
      type: 'EQUIPAGGIATO ORBITA TERRESTRE · VOLATO',
      first: 'Primo volo Apollo equipaggiato — collaudo del CSM in orbita terrestre',
      description:
        "Il primo volo Apollo equipaggiato, 21 mesi dopo l'incendio di Apollo 1 (27-1-1967) che uccise Grissom, White e Chaffee sulla rampa. Apollo 7 ha verificato il riprogettato Modulo di Comando e Servizio Block II in orbita terrestre — supporto vitale, alimentazione, propulsione (SPS acceso otto volte), controllo termico, e la prima trasmissione TV dal vivo al mondo da una navicella spaziale americana equipaggiata. Il volo di 10 giorni 20 ore ha aperto la strada alla scommessa di Apollo 8 sull'orbita lunare due mesi dopo.",
    },
    ja: {
      name: 'アポロ 7 号',
      type: '有人地球周回 · 飛行済み',
      first: '最初の有人アポロ飛行 — 地球周回軌道での CSM 検証',
      description:
        'アポロ 1 号火災 (1967 年 1 月 27 日) で Grissom、White、Chaffee が射場で命を落としてから 21 か月後の最初の有人アポロ飛行。アポロ 7 は再設計された Block II 司令船・機械船を地球周回軌道で検証 — 生命維持、電力、推進 (SPS を 8 回点火)、熱制御、そして有人米国宇宙船からの世界初の生中継 TV 放送。10 日 20 時間の飛行で 2 か月後のアポロ 8 号の月周回軌道への挑戦への道を開いた。',
    },
    ko: {
      name: '아폴로 7호',
      type: '유인 지구 궤도 · 완료',
      first: '최초의 유인 아폴로 비행 — 지구 궤도 CSM 검증',
      description:
        '아폴로 1호 화재(1967-01-27)로 발사대에서 Grissom, White, Chaffee가 사망한 지 21개월 후의 최초 유인 아폴로 비행. 아폴로 7호는 재설계된 Block II 사령선·기계선을 지구 궤도에서 검증 — 생명 유지, 전력, 추진(SPS 8회 점화), 열 제어, 유인 미국 우주선에서 세계 최초의 생방송 TV 송출. 10일 20시간의 비행은 2개월 후 아폴로 8호의 달 궤도 도전을 위한 길을 닦았다.',
    },
    nl: {
      type: 'BEMAND AARDBAAN · GEVLOGEN',
      first: 'Eerste bemande Apollo-vlucht — aardbaan-CSM-test',
      description:
        "De eerste bemande Apollo-vlucht, 21 maanden na de Apollo 1-brand (27-1-1967) die Grissom, White en Chaffee op het platform doodde. Apollo 7 verifieerde de herontworpen Block II Command and Service Module in een aardbaan — levensondersteuning, vermogen, voortstuwing (SPS achtmaal ontstoken), thermisch beheer, en de eerste live TV-uitzending ter wereld vanuit een bemand Amerikaans ruimtevaartuig. De vlucht van 10 dagen 20 uur maakte de weg vrij voor Apollo 8's gok op de maanbaan twee maanden later.",
    },
    'pt-BR': {
      type: 'TRIPULADO ÓRBITA TERRESTRE · VOOU',
      first: 'Primeiro voo Apollo tripulado — teste do CSM em órbita terrestre',
      description:
        'O primeiro voo Apollo tripulado, 21 meses após o incêndio do Apollo 1 (27-1-1967) que matou Grissom, White e Chaffee na plataforma. Apollo 7 verificou o reprojetado Módulo de Comando e Serviço Block II em órbita terrestre — suporte à vida, energia, propulsão (SPS disparou oito vezes), controle térmico, e a primeira transmissão de TV ao vivo do mundo a partir de uma nave tripulada americana. O voo de 10 dias 20 horas abriu o caminho para a aposta de Apollo 8 na órbita lunar dois meses depois.',
    },
    ru: {
      name: 'Аполлон-7',
      type: 'ПИЛОТИРУЕМЫЙ ОКОЛОЗЕМНЫЙ · ВЫПОЛНЕН',
      first: 'Первый пилотируемый полёт Аполлона — испытание CSM на околоземной орбите',
      description:
        'Первый пилотируемый полёт Аполлона, через 21 месяц после пожара Аполлона-1 (27.01.1967), убившего Гриссома, Уайта и Чаффи на стартовом столе. Аполлон-7 проверил переработанный командно-служебный модуль Block II на околоземной орбите — системы жизнеобеспечения, питания, двигательную (SPS отработал восемь раз), терморегулирования, а также первую в мире прямую телепередачу с пилотируемого американского корабля. Полёт длительностью 10 дней 20 часов открыл путь риску Аполлона-8 с выходом на лунную орбиту двумя месяцами позже.',
    },
    'sr-Cyrl': {
      type: 'ПИЛОТИРАНИ ЗЕМЉИНА ОРБИТА · ОБАВЉЕНО',
      first: 'Први пилотирани лет Аполо — провера CSM-а у Земљиној орбити',
      description:
        'Први пилотирани лет Аполо, 21 месец после пожара Аполо-1 (27.01.1967) који је убио Грисома, Вајта и Чафија на платформи. Аполо-7 проверио је редизајнирани Block II командни и сервисни модул у Земљиној орбити — животну подршку, енергију, погон (SPS се палио осам пута), термалну контролу и прву ТВ преноску уживо на свету са пилотираног америчког свемирског брода. Лет од 10 дана и 20 сати отворио је пут Аполо-8 коцкању са лунарном орбитом два месеца касније.',
    },
    'zh-CN': {
      name: '阿波罗 7 号',
      type: '载人地球轨道 · 已飞行',
      first: '首次载人阿波罗飞行 — 地球轨道 CSM 验证',
      description:
        '阿波罗 1 号大火（1967-01-27 在发射台上夺去 Grissom、White、Chaffee 三名宇航员生命）后 21 个月，首次执行的载人阿波罗飞行。阿波罗 7 号在地球轨道中验证了重新设计的 Block II 指令舱与服务舱 — 生命保障、电力、推进（SPS 点火 8 次）、热控、以及全世界首次美国载人航天器实时电视广播。10 天 20 小时的飞行为两个月后阿波罗 8 号的月球轨道豪赌铺平了道路。',
    },
  },
  apollo9: {
    ar: {
      type: 'مدار أرضي مأهول · حُلّق',
      first: 'أول رحلة مأهولة لـ LM — اختبارات الفصل والالتقاء في المدار الأرضي',
      description:
        'أول رحلة مأهولة لـ Lunar Module. في المدار الأرضي، فصل McDivitt و Schweickart LM Spider عن CSM Gumdrop، حلّقا حتى 183 كم بعيداً عبر ست ساعات، ثم التقيا وأعادا الالتحام — كل خطوة من إجراءات الالتقاء القمري اختُبرت دون خيار إعادة الطاقم في CSM إذا حدث خطأ. قام Schweickart بـ EVA لمدة 38 دقيقة على شرفة LM، مما أظهر تصميم بدلة EVA + حقيبة PLSS التي سيستخدمها طاقم المشي على القمر. مع تحقق أجهزة LM وإجراءات الالتقاء، كانت NASA على استعداد لإرسال Apollo 10 إلى القمر بعد شهرين.',
    },
    de: {
      type: 'BEMANNTE ERDUMLAUFBAHN · GEFLOGEN',
      first: 'Erster bemannter LM-Flug — Erdumlaufbahn-Separation + Rendezvous-Tests',
      description:
        'Der erste bemannte Flug des Lunar Module. In der Erdumlaufbahn lösten McDivitt und Schweickart LM Spider von CSM Gumdrop, flogen über sechs Stunden bis zu 183 km weg, führten dann Rendezvous durch und dockten wieder an — jeder Schritt des Mondrendezvousverfahrens getestet ohne die Möglichkeit, die Besatzung im CSM heimzubringen, falls etwas schief ging. Schweickart absolvierte einen 38-minütigen EVA auf der LM-Veranda und demonstrierte das Apollo-EVA-Anzug + PLSS-Rucksack-Design, das die Mondlauf-Besatzungen verwenden würden. Mit verifizierter LM-Hardware und Rendezvous-Verfahren war NASA bereit, Apollo 10 zwei Monate später zum Mond zu schicken.',
    },
    es: {
      type: 'TRIPULADO ÓRBITA TERRESTRE · VOLÓ',
      first:
        'Primer vuelo tripulado del LM — pruebas de separación + rendez-vous en órbita terrestre',
      description:
        'El primer vuelo tripulado del Módulo Lunar. En órbita terrestre, McDivitt y Schweickart desacoplaron el LM Spider del CSM Gumdrop, volaron hasta 183 km de distancia durante seis horas, luego encontraron rendez-vous y se reacoplaron — cada paso del procedimiento de rendez-vous lunar probado sin la opción de devolver a la tripulación en el CSM si algo iba mal. Schweickart hizo un EVA de 38 minutos en el porche del LM, demostrando el traje EVA + mochila PLSS Apollo que las tripulaciones de paseo lunar usarían. Con el hardware del LM y los procedimientos de rendez-vous verificados, NASA estaba lista para enviar Apollo 10 a la Luna dos meses después.',
    },
    fr: {
      type: 'HABITÉ ORBITE TERRESTRE · VOLÉ',
      first: 'Premier vol habité du LM — tests de séparation + rendez-vous en orbite terrestre',
      description:
        "Le premier vol habité du Module Lunaire. En orbite terrestre, McDivitt et Schweickart ont désamarré LM Spider de CSM Gumdrop, ont volé jusqu'à 183 km de distance sur six heures, puis ont effectué un rendez-vous et un réamarrage — chaque étape de la procédure de rendez-vous lunaire testée sans l'option de ramener l'équipage dans le CSM si quelque chose tournait mal. Schweickart a effectué une EVA de 38 minutes sur le porche du LM, démontrant la combinaison EVA + le sac PLSS Apollo que les équipages marchant sur la Lune utiliseraient. Avec le matériel LM et les procédures de rendez-vous vérifiés, NASA était prête à envoyer Apollo 10 sur la Lune deux mois plus tard.",
    },
    hi: {
      type: 'मानवयुक्त पृथ्वी-कक्षा · उड़ा',
      first: 'पहली मानवयुक्त LM उड़ान — पृथ्वी-कक्षा में पृथक्करण + मिलन परीक्षण',
      description:
        'Lunar Module की पहली मानवयुक्त उड़ान। पृथ्वी की कक्षा में, McDivitt और Schweickart ने LM Spider को CSM Gumdrop से अनडॉक किया, छह घंटे में 183 किमी दूर तक उड़े, फिर मिलन किया और पुनः डॉक किया — चंद्र-मिलन प्रक्रिया का हर कदम परखा गया बिना उस विकल्प के कि कुछ गलत होने पर क्रू को CSM में वापस लाया जा सके। Schweickart ने LM के बरामदे पर 38 मिनट का EVA किया, जिसने Apollo EVA सूट + PLSS बैकपैक डिज़ाइन प्रदर्शित किया जिसे चंद्रमा पर चलने वाले क्रू उपयोग करेंगे। LM हार्डवेयर और मिलन प्रक्रियाओं की पुष्टि के साथ, NASA Apollo 10 को दो महीने बाद चंद्रमा भेजने के लिए तैयार था।',
    },
    it: {
      type: 'EQUIPAGGIATO ORBITA TERRESTRE · VOLATO',
      first:
        'Primo volo equipaggiato del LM — test di separazione + rendez-vous in orbita terrestre',
      description:
        "Il primo volo equipaggiato del Modulo Lunare. In orbita terrestre, McDivitt e Schweickart hanno disancorato LM Spider dal CSM Gumdrop, hanno volato fino a 183 km di distanza in sei ore, poi hanno fatto rendez-vous e si sono riancoroti — ogni passo della procedura di rendez-vous lunare testato senza l'opzione di riportare l'equipaggio nel CSM se qualcosa fosse andato storto. Schweickart ha fatto un EVA di 38 minuti sul portico del LM, dimostrando la tuta EVA + zaino PLSS Apollo che gli equipaggi che camminavano sulla Luna avrebbero usato. Con l'hardware LM e le procedure di rendez-vous verificate, NASA era pronta a inviare Apollo 10 sulla Luna due mesi dopo.",
    },
    ja: {
      name: 'アポロ 9 号',
      type: '有人地球周回 · 飛行済み',
      first: '最初の有人 LM 飛行 — 地球周回軌道での分離 + ランデブー試験',
      description:
        '月着陸船 (LM) の最初の有人飛行。地球周回軌道で、McDivitt と Schweickart は LM Spider を CSM Gumdrop から切り離し、6 時間かけて最大 183 km 離れた後、ランデブーして再ドッキング — 月面ランデブー手順のすべてのステップを、何か問題が起きても CSM で乗組員を帰還させる選択肢なしで試験した。Schweickart は LM のポーチで 38 分間の EVA を実施し、月面歩行クルーが使用する Apollo EVA スーツ + PLSS バックパック設計を実証した。LM のハードウェアとランデブー手順が検証されたため、NASA は 2 か月後にアポロ 10 号を月へ送る準備が整った。',
    },
    ko: {
      name: '아폴로 9호',
      type: '유인 지구 궤도 · 완료',
      first: '최초의 유인 LM 비행 — 지구 궤도 분리 + 랑데부 시험',
      description:
        '달 착륙선(LM)의 최초 유인 비행. 지구 궤도에서 McDivitt와 Schweickart는 LM 스파이더를 CSM 검드롭에서 분리, 6시간에 걸쳐 183km까지 떨어진 후 랑데부해 재도킹 — 무엇이 잘못되어도 CSM으로 승무원을 데려올 수 있는 선택지 없이 달 랑데부 절차의 모든 단계를 시험. Schweickart는 LM 현관에서 38분 EVA를 수행, 달을 걷는 승무원들이 사용할 아폴로 EVA 우주복 + PLSS 배낭 설계를 실증. LM 하드웨어와 랑데부 절차가 검증되어 NASA는 2개월 후 아폴로 10호를 달로 보낼 준비를 마쳤다.',
    },
    nl: {
      type: 'BEMAND AARDBAAN · GEVLOGEN',
      first: 'Eerste bemande LM-vlucht — aardbaan-separatie + rendez-vous-tests',
      description:
        'De eerste bemande vlucht van de Lunar Module. In een aardbaan koppelden McDivitt en Schweickart LM Spider los van CSM Gumdrop, vlogen over zes uur tot 183 km verderop, voerden vervolgens rendez-vous uit en koppelden weer aan — elke stap van de maan-rendezvous-procedure getest zonder de optie om de bemanning in de CSM terug te brengen als er iets mis ging. Schweickart deed een 38-minuten EVA op de LM-veranda, demonstrerend het Apollo EVA-pak + PLSS-rugzakontwerp dat de maanlopende bemanningen zouden gebruiken. Met LM-hardware en rendez-vous-procedures geverifieerd, was NASA klaar om Apollo 10 twee maanden later naar de Maan te sturen.',
    },
    'pt-BR': {
      type: 'TRIPULADO ÓRBITA TERRESTRE · VOOU',
      first: 'Primeiro voo tripulado do LM — testes de separação + rendezvous em órbita terrestre',
      description:
        'O primeiro voo tripulado do Módulo Lunar. Em órbita terrestre, McDivitt e Schweickart desacoplaram o LM Spider do CSM Gumdrop, voaram até 183 km de distância em seis horas, depois fizeram rendezvous e reacoplaram — cada etapa do procedimento de rendezvous lunar testada sem a opção de trazer a tripulação de volta no CSM se algo desse errado. Schweickart fez um EVA de 38 minutos no varandinho do LM, demonstrando o traje EVA + mochila PLSS Apollo que as tripulações que andariam na Lua usariam. Com o hardware do LM e os procedimentos de rendezvous verificados, NASA estava pronta para enviar Apollo 10 à Lua dois meses depois.',
    },
    ru: {
      name: 'Аполлон-9',
      type: 'ПИЛОТИРУЕМЫЙ ОКОЛОЗЕМНЫЙ · ВЫПОЛНЕН',
      first:
        'Первый пилотируемый полёт LM — испытания разделения + сближения на околоземной орбите',
      description:
        'Первый пилотируемый полёт лунного модуля. На околоземной орбите Макдивитт и Швейкарт расстыковали LM Spider от CSM Gumdrop, отлетели на 183 км в течение шести часов, затем выполнили сближение и повторную стыковку — каждый шаг лунной процедуры сближения был испытан без возможности вернуть экипаж в CSM, если что-то пойдёт не так. Швейкарт провёл 38-минутный выход в открытый космос на «крыльце» LM, продемонстрировав скафандр EVA + ранец PLSS, которые будут использовать ходящие по Луне экипажи. С проверенным оборудованием LM и процедурами сближения NASA была готова отправить Аполлон-10 к Луне через два месяца.',
    },
    'sr-Cyrl': {
      type: 'ПИЛОТИРАНИ ЗЕМЉИНА ОРБИТА · ОБАВЉЕНО',
      first: 'Први пилотирани лет LM-а — тестови раздвајања + сусрета у Земљиној орбити',
      description:
        'Први пилотирани лет лунарног модула. У Земљиној орбити, Мекдивит и Швајкарт су раздвојили LM Спајдер од CSM Гумдропа, летели до 183 km удаљени током шест сати, затим извели сусрет и повезивање — сваки корак процедуре лунарног сусрета тестиран без опције да се посада врати у CSM ако нешто крене лоше. Швајкарт је извео 38-минутни EVA на трему LM-а, демонстрирајући дизајн Apollo EVA одела + PLSS ранца који ће посаде које шетају Месецом користити. Са провереним LM хардвером и процедурама сусрета, NASA је била спремна да пошаље Аполо-10 на Месец два месеца касније.',
    },
    'zh-CN': {
      name: '阿波罗 9 号',
      type: '载人地球轨道 · 已飞行',
      first: '首次载人 LM 飞行 — 地球轨道分离 + 交会试验',
      description:
        '月球着陆器（LM）的首次载人飞行。在地球轨道中，McDivitt 和 Schweickart 将 LM 蜘蛛号与 CSM 橡皮糖号分离，六个小时内飞到 183 km 远处，然后交会并重新对接 — 在没有 "出问题时由 CSM 带回机组" 选项的情况下，测试了登月交会程序的每一步。Schweickart 在 LM 门廊上进行了 38 分钟的 EVA，验证了登月乘员将使用的阿波罗 EVA 太空服 + PLSS 背包设计。LM 硬件和交会程序得到验证后，NASA 准备好两个月后将阿波罗 10 号送往月球。',
    },
  },
  apollo8: {
    ar: {
      type: 'مدار قمري مأهول · حُلّق',
      first: 'أول البشر يغادرون المدار الأرضي المنخفض + يدورون حول القمر',
      description:
        'أول مهمة مأهولة تغادر المدار الأرضي المنخفض، وأول من تفلت من جاذبية الأرض، وأول من تدور حول القمر. أُطلقت في 1968-12-21 في أول رحلة Saturn V مأهولة (AS-503)، دخلت Apollo 8 المدار القمري في عشية عيد الميلاد 1968. صورة "Earthrise" التي التقطها Anders خلال المدار الرابع أصبحت واحدة من أكثر الصور تأثيراً في التاريخ. قرأ الطاقم من سفر التكوين في التلفزيون المباشر لـ ~1 مليار مشاهد. بعد 10 مدارات، أطلقوا محرك SPS لـ TEI على الجانب البعيد من القمر، عائدين إلى هبوط المحيط الهادئ 1968-12-27.',
    },
    de: {
      type: 'BEMANNTE MONDUMLAUFBAHN · GEFLOGEN',
      first: 'Erste Menschen verlassen die niedrige Erdumlaufbahn + umkreisen den Mond',
      description:
        'Die erste bemannte Mission, die die niedrige Erdumlaufbahn verließ, die erste, die der Erdanziehung entkam, und die erste, die den Mond umkreiste. Gestartet am 21.12.1968 auf dem ersten bemannten Saturn-V-Flug (AS-503), trat Apollo 8 am Heiligabend 1968 in die Mondumlaufbahn ein. Anders\' "Earthrise"-Fotografie während des vierten Orbits wurde eines der einflussreichsten Bilder der Geschichte. Die Besatzung las aus Genesis im Live-Fernsehen vor ~1 Milliarde Zuschauern. 10 Orbits später zündeten sie den SPS für TEI auf der Mondrückseite und kehrten zur Pazifik-Wasserung am 27.12.1968 zurück.',
    },
    es: {
      type: 'TRIPULADO ÓRBITA LUNAR · VOLÓ',
      first: 'Primeros humanos en salir de órbita terrestre baja + orbitar la Luna',
      description:
        'La primera misión tripulada en salir de órbita terrestre baja, la primera en escapar de la gravedad terrestre, y la primera en orbitar la Luna. Lanzada el 21-12-1968 en el primer vuelo tripulado del Saturn V (AS-503), Apollo 8 entró en órbita lunar en Nochebuena de 1968. La fotografía "Earthrise" de Anders durante la cuarta órbita se convirtió en una de las imágenes más influyentes de la historia. La tripulación leyó del Génesis en televisión en vivo a ~1.000 millones de espectadores. 10 órbitas después, encendieron el motor SPS para TEI en el lado oculto de la Luna, regresando al amerizaje en el Pacífico el 27-12-1968.',
    },
    fr: {
      type: 'HABITÉ ORBITE LUNAIRE · VOLÉ',
      first: "Premiers humains à quitter l'orbite terrestre basse + à orbiter la Lune",
      description:
        "La première mission habitée à quitter l'orbite terrestre basse, la première à échapper à la gravité terrestre, et la première à orbiter la Lune. Lancée le 21-12-1968 lors du premier vol habité de la Saturn V (AS-503), Apollo 8 est entrée en orbite lunaire la veille de Noël 1968. La photographie « Earthrise » d'Anders durant la quatrième orbite est devenue l'une des images les plus influentes de l'histoire. L'équipage a lu la Genèse à la télévision en direct devant ~1 milliard de spectateurs. 10 orbites plus tard, ils ont allumé le moteur SPS pour la TEI sur la face cachée de la Lune, revenant à un amerrissage dans le Pacifique le 27-12-1968.",
    },
    hi: {
      type: 'मानवयुक्त चंद्र-कक्षा · उड़ा',
      first: 'पहले मानव जो निम्न पृथ्वी कक्षा छोड़कर चंद्रमा की कक्षा में गए',
      description:
        'पहली मानवयुक्त मिशन जिसने निम्न पृथ्वी कक्षा छोड़ी, पृथ्वी की गुरुत्वाकर्षण से बचने वाली पहली, और चंद्रमा की कक्षा में जाने वाली पहली। 1968-12-21 को Saturn V के पहले मानवयुक्त उड़ान (AS-503) पर लॉन्च, Apollo 8 1968 के क्रिसमस की पूर्व संध्या पर चंद्र कक्षा में प्रवेश किया। चौथी कक्षा के दौरान Anders की "Earthrise" तस्वीर इतिहास की सबसे प्रभावशाली छवियों में से एक बन गई। क्रू ने ~1 अरब दर्शकों के लिए लाइव टीवी पर Genesis से पाठ किया। 10 कक्षाओं के बाद, उन्होंने चंद्रमा के दूसरी ओर TEI के लिए SPS इंजन चलाया, 1968-12-27 को प्रशांत स्प्लैशडाउन पर लौटे।',
    },
    it: {
      type: 'EQUIPAGGIATO ORBITA LUNARE · VOLATO',
      first: "Primi umani a lasciare l'orbita terrestre bassa + orbitare la Luna",
      description:
        "La prima missione equipaggiata a lasciare l'orbita terrestre bassa, la prima a sfuggire alla gravità terrestre, e la prima a orbitare la Luna. Lanciata il 21-12-1968 nel primo volo equipaggiato del Saturn V (AS-503), Apollo 8 è entrata in orbita lunare la Vigilia di Natale 1968. La fotografia \"Earthrise\" di Anders durante la quarta orbita è diventata una delle immagini più influenti della storia. L'equipaggio ha letto dalla Genesi in TV dal vivo a ~1 miliardo di spettatori. 10 orbite dopo, hanno acceso il motore SPS per TEI sul lato nascosto della Luna, tornando all'ammaraggio nel Pacifico il 27-12-1968.",
    },
    ja: {
      name: 'アポロ 8 号',
      type: '有人月周回 · 飛行済み',
      first: '人類初の低地球軌道離脱 + 月周回',
      description:
        '低地球軌道を離れた最初の有人ミッション、地球の重力を逃れた最初、そして月を周回した最初。1968 年 12 月 21 日、サターン V の最初の有人飛行 (AS-503) で打ち上げられたアポロ 8 号は、1968 年クリスマスイブに月周回軌道に入った。4 番目の軌道中の Anders による「Earthrise」写真は史上最も影響力のある画像の一つとなった。乗組員は約 10 億人の視聴者に生中継 TV で創世記を朗読。10 周回後、月の裏側で TEI のため SPS エンジンを点火し、1968 年 12 月 27 日に太平洋スプラッシュダウンに帰還した。',
    },
    ko: {
      name: '아폴로 8호',
      type: '유인 달 궤도 · 완료',
      first: '최초로 저지구 궤도를 벗어나 달을 공전한 인류',
      description:
        '최초로 저지구 궤도를 떠나, 지구 중력을 벗어나, 달을 공전한 유인 임무. 1968-12-21에 새턴 V의 첫 유인 비행(AS-503)으로 발사, 아폴로 8호는 1968년 크리스마스 이브에 달 궤도에 진입. 네 번째 궤도 중 Anders의 "Earthrise" 사진은 역사상 가장 영향력 있는 이미지 중 하나가 되었다. 승무원은 약 10억 시청자에게 생방송 TV로 창세기를 낭독. 10회 공전 후 달 뒷면에서 TEI를 위해 SPS 엔진을 점화, 1968-12-27 태평양 스플래시다운으로 귀환.',
    },
    nl: {
      type: 'BEMAND MAANBAAN · GEVLOGEN',
      first: 'Eerste mensen die de lage aardbaan verlaten + de Maan omcirkelen',
      description:
        'De eerste bemande missie die de lage aardbaan verliet, de eerste die aan de aardse zwaartekracht ontsnapte, en de eerste die de Maan omcirkelde. Gelanceerd op 21-12-1968 op de eerste bemande Saturn V-vlucht (AS-503), trad Apollo 8 op Kerstavond 1968 in de maanbaan. Anders\' "Earthrise"-foto tijdens de vierde omloop werd een van de meest invloedrijke beelden in de geschiedenis. De bemanning las uit Genesis op live TV voor ~1 miljard kijkers. 10 omlopen later vuurden ze de SPS-motor voor TEI aan de achterkant van de Maan, en keerden terug naar de Stille Oceaan op 27-12-1968.',
    },
    'pt-BR': {
      type: 'TRIPULADO ÓRBITA LUNAR · VOOU',
      first: 'Primeiros humanos a deixar a órbita terrestre baixa + orbitar a Lua',
      description:
        'A primeira missão tripulada a deixar a órbita terrestre baixa, a primeira a escapar da gravidade terrestre, e a primeira a orbitar a Lua. Lançada em 21-12-1968 no primeiro voo tripulado do Saturn V (AS-503), Apollo 8 entrou em órbita lunar na Véspera de Natal de 1968. A fotografia "Earthrise" de Anders durante a quarta órbita tornou-se uma das imagens mais influentes da história. A tripulação leu de Gênesis na TV ao vivo para ~1 bilhão de espectadores. 10 órbitas depois, acionaram o motor SPS para TEI no lado oculto da Lua, retornando ao amerissagem no Pacífico em 27-12-1968.',
    },
    ru: {
      name: 'Аполлон-8',
      type: 'ПИЛОТИРУЕМЫЙ ОКОЛОЛУННЫЙ · ВЫПОЛНЕН',
      first: 'Первые люди, покинувшие околоземную орбиту и облетевшие Луну',
      description:
        'Первая пилотируемая миссия, покинувшая низкую околоземную орбиту, первая, преодолевшая земную гравитацию, и первая, облетевшая Луну. Запущена 21.12.1968 на первом пилотируемом полёте Сатурна-V (AS-503), Аполлон-8 вошёл на лунную орбиту в канун Рождества 1968. Снимок «Earthrise» Андерса во время четвёртого витка стал одним из самых влиятельных изображений в истории. Экипаж читал Книгу Бытия по прямому ТВ для ~1 миллиарда зрителей. После 10 витков они запустили двигатель SPS для TEI на обратной стороне Луны, вернувшись к приводнению в Тихом океане 27.12.1968.',
    },
    'sr-Cyrl': {
      type: 'ПИЛОТИРАНИ ЛУНАРНА ОРБИТА · ОБАВЉЕНО',
      first: 'Први људи који су напустили ниску Земљину орбиту + кружили око Месеца',
      description:
        'Прва пилотирана мисија која је напустила ниску Земљину орбиту, прва која је побегла Земљиној гравитацији и прва која је кружила око Месеца. Лансирана 21.12.1968. на првом пилотираном лету Сатурна-V (AS-503), Аполо-8 је ушао у лунарну орбиту уочи Божића 1968. Андерсова фотографија "Earthrise" током четврте орбите постала је једна од најутицајнијих слика у историји. Посада је читала Постање на ТВ-у уживо за ~1 милијарду гледалаца. После 10 орбита, упалили су SPS мотор за TEI на даљој страни Месеца, вративши се на пацифички сплеш-даун 27.12.1968.',
    },
    'zh-CN': {
      name: '阿波罗 8 号',
      type: '载人月球轨道 · 已飞行',
      first: '人类首次离开低地球轨道 + 环绕月球',
      description:
        '首次离开低地球轨道、首次脱离地球引力、首次环绕月球的载人任务。1968-12-21 在土星五号首次载人飞行（AS-503）中发射，阿波罗 8 号在 1968 年圣诞夜进入月球轨道。Anders 在第四圈轨道中拍摄的"Earthrise"照片成为历史上最具影响力的图像之一。机组人员在直播 TV 上向约 10 亿观众朗读《创世记》。10 圈轨道后，他们在月球背面点燃 SPS 发动机执行 TEI，1968-12-27 返回太平洋溅落。',
    },
  },
  apollo10: {
    ar: {
      type: 'مدار قمري مأهول · حُلّق',
      first: 'بروفة الهبوط القمري الكاملة — هبط LM إلى ارتفاع ~15.6 كم',
      description:
        'البروفة الكاملة لأول هبوط قمري. حلّق Stafford و Cernan بـ LM Snoopy إلى ارتفاع ~15.6 كم فوق موقع هبوط Apollo 11 المخطط في Mare Tranquillitatis — كل خطوة من نهج الهبوط باستثناء الهبوط الفعلي. أكدوا الملف الشخصي للنزول، رادار الهبوط، مسار الصعود، وإجراء الالتقاء الذي سيستخدمه Apollo 11 بعد شهرين. خزانات وقود الصعود لـ LM كانت معبأة عمداً بأقل من المعتاد (~50%) لمنع أي إغراء بمحاولة الهبوط. مرحلة صعود Snoopy كانت الوحيدة التي غادرت المدار القمري مع ∆v إيجابية — أُلقيت في مدار شمسي حيث تبقى اليوم.',
    },
    de: {
      type: 'BEMANNTE MONDUMLAUFBAHN · GEFLOGEN',
      first: 'Vollständige Mondlandung-Generalprobe — LM stieg auf ~15,6 km Höhe ab',
      description:
        'Die vollständige Generalprobe für die erste Mondlandung. Stafford und Cernan flogen LM Snoopy bis ~15,6 km Höhe über der geplanten Apollo-11-Landestelle bei Mare Tranquillitatis — jeder Schritt eines Landeanflugs außer der eigentlichen Landung. Sie verifizierten das Abstiegsprofil, das Landeradar, die Aufstiegstrajektorie und das Rendezvous-Verfahren, das Apollo 11 zwei Monate später verwenden würde. Die Aufstiegsstufentanks des LM waren absichtlich unterbetankt (~50% nominal), um jede Versuchung eines Landeversuchs zu verhindern. Snoopys Aufstiegsstufe war die einzige, die die Mondumlaufbahn mit positivem ∆v verließ — in eine heliozentrische Umlaufbahn ausgeworfen, wo sie heute noch ist.',
    },
    es: {
      type: 'TRIPULADO ÓRBITA LUNAR · VOLÓ',
      first: 'Ensayo general completo del alunizaje — el LM descendió a ~15,6 km de altitud',
      description:
        'El ensayo general completo del primer alunizaje. Stafford y Cernan volaron el LM Snoopy a ~15,6 km de altitud sobre el sitio de aterrizaje previsto del Apollo 11 en Mare Tranquillitatis — cada paso de una aproximación de aterrizaje excepto el aterrizaje mismo. Confirmaron el perfil de descenso, el radar de aterrizaje, la trayectoria de ascenso y el procedimiento de rendez-vous que Apollo 11 usaría dos meses después. Los tanques de propulsante de ascenso del LM fueron deliberadamente subllenados (~50 % de lo nominal) para evitar cualquier tentación de intentar aterrizar. La etapa de ascenso de Snoopy fue la única que dejó la órbita lunar con ∆v positivo — lanzada a una órbita heliocéntrica donde permanece hoy.',
    },
    fr: {
      type: 'HABITÉ ORBITE LUNAIRE · VOLÉ',
      first: "Répétition générale complète de l'alunissage — le LM descendit à ~15,6 km d'altitude",
      description:
        "La répétition générale complète du premier alunissage. Stafford et Cernan ont fait voler le LM Snoopy jusqu'à ~15,6 km d'altitude au-dessus du site d'atterrissage prévu pour Apollo 11 à Mare Tranquillitatis — chaque étape d'une approche d'atterrissage sauf l'atterrissage lui-même. Ils ont confirmé le profil de descente, le radar d'atterrissage, la trajectoire d'ascension et la procédure de rendez-vous qu'Apollo 11 utiliserait deux mois plus tard. Les réservoirs de propergol d'ascension du LM ont été délibérément sous-remplis (~50 % du nominal) pour empêcher toute tentation de tenter un atterrissage. L'étage d'ascension de Snoopy fut le seul à quitter l'orbite lunaire avec un ∆v positif — éjecté dans une orbite héliocentrique où il demeure aujourd'hui.",
    },
    hi: {
      type: 'मानवयुक्त चंद्र-कक्षा · उड़ा',
      first: 'पूर्ण चंद्र-लैंडिंग ड्रेस रिहर्सल — LM ~15.6 किमी ऊंचाई तक उतरा',
      description:
        'पहली चंद्र-लैंडिंग के लिए पूर्ण ड्रेस रिहर्सल। Stafford और Cernan ने LM Snoopy को Mare Tranquillitatis में नियोजित Apollo 11 लैंडिंग साइट के ऊपर ~15.6 किमी ऊंचाई तक उड़ाया — वास्तविक लैंडिंग को छोड़कर लैंडिंग दृष्टिकोण का हर चरण। उन्होंने अवरोही प्रोफ़ाइल, लैंडिंग रडार, आरोही प्रक्षेपवक्र और मिलन प्रक्रिया की पुष्टि की जिसका उपयोग Apollo 11 दो महीने बाद करेगा। LM के आरोही ईंधन टैंक जानबूझकर कम भरे गए (~50 %) ताकि लैंडिंग का प्रयास करने का कोई प्रलोभन न हो। Snoopy का आरोही चरण एकमात्र था जो सकारात्मक ∆v के साथ चंद्र कक्षा छोड़ गया — एक सूर्यकेंद्रित कक्षा में फेंका गया जहां यह आज भी है।',
    },
    it: {
      type: 'EQUIPAGGIATO ORBITA LUNARE · VOLATO',
      first: "Prova generale completa dell'allunaggio — il LM è sceso a ~15,6 km di altitudine",
      description:
        "La prova generale completa del primo allunaggio. Stafford e Cernan hanno fatto volare il LM Snoopy a ~15,6 km di altitudine sopra il sito di atterraggio previsto di Apollo 11 a Mare Tranquillitatis — ogni passo di un avvicinamento di atterraggio eccetto l'atterraggio stesso. Hanno confermato il profilo di discesa, il radar di atterraggio, la traiettoria di ascesa e la procedura di rendez-vous che Apollo 11 avrebbe usato due mesi dopo. I serbatoi di propellente di ascesa del LM furono deliberatamente sottocaricati (~50 % del nominale) per evitare ogni tentazione di tentare un atterraggio. Lo stadio di ascesa di Snoopy fu l'unico a lasciare l'orbita lunare con ∆v positivo — espulso in un'orbita eliocentrica dove rimane oggi.",
    },
    ja: {
      name: 'アポロ 10 号',
      type: '有人月周回 · 飛行済み',
      first: '月着陸の完全リハーサル — LM が高度約 15.6 km まで降下',
      description:
        '最初の月着陸の完全リハーサル。Stafford と Cernan は LM Snoopy をアポロ 11 号予定着陸地点の静かの海上空約 15.6 km まで操縦 — 実際の着陸を除く着陸進入の全ステップを実施。降下プロファイル、着陸レーダー、上昇軌道、アポロ 11 号が 2 か月後に使用するランデブー手順を確認。LM の上昇段燃料タンクは意図的に低充填 (公称の約 50 %) し、着陸を試みる誘惑を防いだ。Snoopy の上昇段は正の ∆v で月周回軌道を離れた唯一の機体 — 日心軌道に投入され、今日も存在する。',
    },
    ko: {
      name: '아폴로 10호',
      type: '유인 달 궤도 · 완료',
      first: '달 착륙 전체 리허설 — LM이 약 15.6km 고도까지 하강',
      description:
        '최초 달 착륙의 완전한 드레스 리허설. Stafford와 Cernan은 LM 스누피를 아폴로 11호의 계획된 달 착륙지인 고요의 바다 상공 약 15.6km까지 비행 — 실제 착륙을 제외한 착륙 접근의 모든 단계를 수행. 하강 프로파일, 착륙 레이더, 상승 궤적, 아폴로 11호가 2개월 후 사용할 랑데부 절차를 확인. LM의 상승단 추진제 탱크는 의도적으로 저충전(공칭의 약 50%)되어 착륙 시도의 유혹을 방지. 스누피 상승단은 양의 ∆v로 달 궤도를 벗어난 유일한 기체 — 일심 궤도로 투입되어 오늘날까지 존재.',
    },
    nl: {
      type: 'BEMAND MAANBAAN · GEVLOGEN',
      first: 'Volledige maanlandings-generale repetitie — LM daalde tot ~15,6 km hoogte',
      description:
        "De volledige generale repetitie voor de eerste maanlanding. Stafford en Cernan vlogen LM Snoopy tot ~15,6 km hoogte boven de geplande Apollo 11-landingsplaats in Mare Tranquillitatis — elke stap van een landingsbenadering behalve de landing zelf. Ze bevestigden het afdalingsprofiel, de landingsradar, het opstijgingstraject en de rendez-vous-procedure die Apollo 11 twee maanden later zou gebruiken. De opstijgings-brandstoftanks van het LM werden opzettelijk ondervuld (~50 % van nominaal) om elke verleiding te voorkomen om een landing te proberen. Snoopy's opstijgingstrap was de enige die de maanbaan met positieve ∆v verliet — uitgeworpen in een heliocentrische baan waar hij vandaag nog steeds is.",
    },
    'pt-BR': {
      type: 'TRIPULADO ÓRBITA LUNAR · VOOU',
      first: 'Ensaio geral completo do pouso lunar — LM desceu a ~15,6 km de altitude',
      description:
        'O ensaio geral completo do primeiro pouso lunar. Stafford e Cernan voaram o LM Snoopy a ~15,6 km de altitude acima do local de pouso planejado de Apollo 11 em Mare Tranquillitatis — cada passo de uma aproximação de pouso exceto o pouso em si. Confirmaram o perfil de descida, o radar de pouso, a trajetória de subida e o procedimento de rendezvous que Apollo 11 usaria dois meses depois. Os tanques de propelente de subida do LM foram deliberadamente subabastecidos (~50 % do nominal) para evitar qualquer tentação de tentar pousar. O estágio de subida de Snoopy foi o único a deixar a órbita lunar com ∆v positivo — lançado em órbita heliocêntrica onde permanece hoje.',
    },
    ru: {
      name: 'Аполлон-10',
      type: 'ПИЛОТИРУЕМЫЙ ОКОЛОЛУННЫЙ · ВЫПОЛНЕН',
      first: 'Полная репетиция лунной посадки — LM спустился до ~15,6 км высоты',
      description:
        'Полная генеральная репетиция первой лунной посадки. Стаффорд и Сернан спустили LM Snoopy до ~15,6 км высоты над планируемой посадочной площадкой Аполлона-11 в Море Спокойствия — каждый шаг посадочного подхода, кроме самой посадки. Они подтвердили профиль спуска, посадочный радар, траекторию подъёма и процедуру сближения, которую Аполлон-11 будет использовать два месяца спустя. Топливные баки взлётной ступени LM были намеренно недозаправлены (~50 % от номинала), чтобы предотвратить любое искушение попытаться сесть. Взлётная ступень Snoopy была единственной, покинувшей лунную орбиту с положительной ∆v — выведена на гелиоцентрическую орбиту, где остаётся сегодня.',
    },
    'sr-Cyrl': {
      type: 'ПИЛОТИРАНИ ЛУНАРНА ОРБИТА · ОБАВЉЕНО',
      first: 'Потпуна проба слетања на Месец — LM сишао до ~15,6 km висине',
      description:
        'Потпуна генерална проба првог слетања на Месец. Стафорд и Сернан су летели LM Snoopy до ~15,6 km висине изнад планиране Аполо-11 локације слетања у Мору Спокојства — сваки корак прилаза слетању осим самог слетања. Потврдили су профил спуштања, радар слетања, путању пењања и процедуру сусрета коју ће Аполо-11 користити два месеца касније. Резервоари горива за пењање LM-а намерно су недопуњени (~50 % номиналног) да би се спречило искушење да се покуша слетање. Узлазни степен Snoopy-а је био једини који је напустио лунарну орбиту са позитивним ∆v — избачен у хелиоцентричну орбиту где остаје данас.',
    },
    'zh-CN': {
      name: '阿波罗 10 号',
      type: '载人月球轨道 · 已飞行',
      first: '完整的登月预演 — LM 下降至约 15.6 km 高度',
      description:
        '首次登月的完整彩排。Stafford 和 Cernan 驾驶 LM 史努比号下降至阿波罗 11 号计划登陆地点静海上空约 15.6 km — 除了实际着陆之外，登陆进近的每一步都执行了。他们确认了下降剖面、登陆雷达、上升轨迹以及阿波罗 11 号两个月后将使用的交会程序。LM 的上升段推进剂罐被故意少装（约标称的 50%）以防止任何尝试着陆的诱惑。史努比号的上升段是唯一以正 ∆v 离开月球轨道的 — 抛入日心轨道，今天仍在那里。',
    },
  },
  apollo12: {
    ar: {
      type: 'مركبة هبوط مأهولة · حُلّقت',
      first: 'الهبوط الثاني المأهول على القمر — هبوط دقيق على بعد 163 م من Surveyor 3',
      description:
        'الهبوط الثاني المأهول على القمر. ضرب البرق Saturn V مرتين أثناء الصعود (T+36s و T+52s) — استعاد Bean المركبة الفضائية عبر نداء "SCE to AUX" الشهير من EECOM John Aaron. نفذ Conrad و Bean هبوطاً دقيقاً على Ocean of Storms ضمن 163 م من Surveyor 3 (الذي هبط بنعومة في أبريل 1967)، ثم مشيا إلى Surveyor 3 وأزالا كاميرته + عينة من سطحه. نشروا ALSEP (أول ALSEP، مقابل EASEP Apollo 11 الأبسط) الذي بث البيانات لمدة 8 سنوات. أعادت المهمة 34 كغ من العينات.',
    },
    de: {
      type: 'BEMANNTER LANDER · GEFLOGEN',
      first: 'Zweite bemannte Mondlandung — Punktlandung 163 m von Surveyor 3 entfernt',
      description:
        'Die zweite bemannte Mondlandung. Saturn V wurde während des Aufstiegs zweimal vom Blitz getroffen (T+36 s und T+52 s) — Bean stellte das Raumfahrzeug über den berühmten "SCE to AUX"-Ruf des EECOM John Aaron wieder her. Conrad und Bean führten eine Punktlandung am Ozean der Stürme innerhalb von 163 m von Surveyor 3 (im April 1967 weich gelandet) durch, gingen dann zu Surveyor 3 und entfernten dessen Kamera + eine Oberflächenprobe. Sie setzten ALSEP ein (das erste ALSEP, gegenüber Apollo 11s einfacherem EASEP), das 8 Jahre lang Daten sendete. Die Mission brachte 34 kg Proben zurück.',
    },
    es: {
      type: 'ATERRIZADOR TRIPULADO · VOLÓ',
      first: 'Segundo alunizaje tripulado — aterrizaje preciso a 163 m de Surveyor 3',
      description:
        'El segundo alunizaje tripulado. El Saturn V fue alcanzado por rayos dos veces durante el ascenso (T+36 s y T+52 s) — Bean restauró la nave a través de la famosa llamada "SCE to AUX" del EECOM John Aaron. Conrad y Bean realizaron un aterrizaje de precisión en el Océano de las Tormentas a 163 m de Surveyor 3 (que aterrizó suavemente en abril de 1967), luego caminaron a Surveyor 3 y retiraron su cámara + una muestra de su superficie. Desplegaron ALSEP (el primer ALSEP, frente al EASEP más simple del Apollo 11) que transmitió datos durante 8 años. La misión devolvió 34 kg de muestras.',
    },
    fr: {
      type: 'ATTERRISSEUR HABITÉ · VOLÉ',
      first: 'Deuxième alunissage habité — atterrissage de précision à 163 m de Surveyor 3',
      description:
        "Le deuxième alunissage habité. Saturn V fut frappé par la foudre deux fois pendant l'ascension (T+36 s et T+52 s) — Bean restaura le vaisseau via le célèbre appel « SCE to AUX » de l'EECOM John Aaron. Conrad et Bean ont effectué un atterrissage de précision sur l'Océan des Tempêtes à 163 m de Surveyor 3 (atterri en douceur en avril 1967), puis ont marché jusqu'à Surveyor 3 et ont enlevé sa caméra + un échantillon de sa surface. Ils ont déployé ALSEP (le premier ALSEP, par opposition à l'EASEP plus simple d'Apollo 11) qui a transmis des données pendant 8 ans. La mission a rapporté 34 kg d'échantillons.",
    },
    hi: {
      type: 'मानवयुक्त लैंडर · उड़ा',
      first: 'दूसरा मानवयुक्त चंद्र-लैंडिंग — Surveyor 3 से 163 मी की दूरी पर सटीक लैंडिंग',
      description:
        'दूसरी मानवयुक्त चंद्र-लैंडिंग। Saturn V को आरोहण के दौरान दो बार बिजली गिरी (T+36 स और T+52 स) — Bean ने EECOM John Aaron की प्रसिद्ध "SCE to AUX" कॉल के माध्यम से अंतरिक्ष यान को बहाल किया। Conrad और Bean ने Ocean of Storms पर 163 मी के भीतर Surveyor 3 (जो अप्रैल 1967 में नरम लैंडिंग की) के पास सटीक लैंडिंग की, फिर Surveyor 3 तक चले गए और उसका कैमरा + सतह का नमूना हटा दिया। उन्होंने ALSEP तैनात किया (पहला ALSEP, Apollo 11 के सरल EASEP के मुकाबले) जिसने 8 साल तक डेटा प्रसारित किया। मिशन ने 34 किग्रा नमूने वापस लाए।',
    },
    it: {
      type: 'LANDER EQUIPAGGIATO · VOLATO',
      first: 'Secondo allunaggio equipaggiato — atterraggio di precisione a 163 m da Surveyor 3',
      description:
        "Il secondo allunaggio equipaggiato. Il Saturn V fu colpito da fulmini due volte durante l'ascesa (T+36 s e T+52 s) — Bean ripristinò la navicella attraverso la famosa chiamata \"SCE to AUX\" dell'EECOM John Aaron. Conrad e Bean eseguirono un atterraggio di precisione sull'Oceano delle Tempeste entro 163 m da Surveyor 3 (atterrato dolcemente nell'aprile 1967), poi camminarono fino a Surveyor 3 e rimossero la sua telecamera + un campione della sua superficie. Dispiegarono ALSEP (il primo ALSEP, contro l'EASEP più semplice di Apollo 11) che trasmise dati per 8 anni. La missione riportò 34 kg di campioni.",
    },
    ja: {
      name: 'アポロ 12 号',
      type: '有人着陸機 · 飛行済み',
      first: '2 回目の有人月着陸 — Surveyor 3 から 163 m の精密着陸',
      description:
        '2 回目の有人月着陸。サターン V は上昇中に雷に 2 回打たれた (T+36 秒、T+52 秒) — Bean は EECOM John Aaron の有名な「SCE to AUX」コールによって機体を復旧。Conrad と Bean は嵐の大洋に Surveyor 3 (1967 年 4 月に軟着陸) から 163 m 以内の精密着陸を実施、その後 Surveyor 3 まで歩いてカメラと表面サンプルを取り外した。ALSEP (アポロ 11 のより単純な EASEP に対する最初の ALSEP) を展開し、8 年間データを送信。ミッションは 34 kg のサンプルを持ち帰った。',
    },
    ko: {
      name: '아폴로 12호',
      type: '유인 착륙선 · 완료',
      first: '두 번째 유인 달 착륙 — Surveyor 3으로부터 163m 정밀 착륙',
      description:
        '두 번째 유인 달 착륙. 새턴 V는 상승 중 두 번 번개에 맞았다(T+36초, T+52초) — Bean이 EECOM John Aaron의 유명한 "SCE to AUX" 호출로 우주선을 복구. Conrad와 Bean은 폭풍의 대양에 1967년 4월 연착륙한 Surveyor 3으로부터 163m 이내에 정밀 착륙, 이후 Surveyor 3까지 걸어가서 카메라와 표면 샘플을 회수. ALSEP를 배치(아폴로 11의 더 간단한 EASEP에 대한 첫 ALSEP)했고 8년간 데이터를 전송. 임무는 34kg의 샘플을 가져왔다.',
    },
    nl: {
      type: 'BEMANDE LANDER · GEVLOGEN',
      first: 'Tweede bemande maanlanding — precisielanding op 163 m van Surveyor 3',
      description:
        'De tweede bemande maanlanding. Saturn V werd tijdens de opstijging tweemaal door de bliksem getroffen (T+36 s en T+52 s) — Bean herstelde het ruimtevaartuig via de beroemde "SCE to AUX"-oproep van EECOM John Aaron. Conrad en Bean voerden een precisielanding uit op de Oceaan van Stormen binnen 163 m van Surveyor 3 (in april 1967 zacht geland), liepen vervolgens naar Surveyor 3 en verwijderden de camera + een oppervlaktemonster. Ze plaatsten ALSEP (de eerste ALSEP, tegen Apollo 11\'s eenvoudigere EASEP) die 8 jaar data zond. De missie bracht 34 kg monsters terug.',
    },
    'pt-BR': {
      type: 'POUSADOR TRIPULADO · VOOU',
      first: 'Segundo pouso lunar tripulado — pouso de precisão a 163 m de Surveyor 3',
      description:
        'O segundo pouso lunar tripulado. O Saturn V foi atingido por raios duas vezes durante a ascensão (T+36 s e T+52 s) — Bean restaurou a espaçonave via a famosa chamada "SCE to AUX" do EECOM John Aaron. Conrad e Bean executaram um pouso de precisão no Oceano das Tempestades a 163 m de Surveyor 3 (pousou suavemente em abril de 1967), depois caminharam até Surveyor 3 e removeram sua câmera + uma amostra da superfície. Implantaram o ALSEP (o primeiro ALSEP, vs o EASEP mais simples do Apollo 11) que transmitiu dados por 8 anos. A missão devolveu 34 kg de amostras.',
    },
    ru: {
      name: 'Аполлон-12',
      type: 'ПИЛОТИРУЕМЫЙ ПОСАДОЧНЫЙ · ВЫПОЛНЕН',
      first: 'Вторая пилотируемая лунная посадка — точное приземление в 163 м от Surveyor 3',
      description:
        'Вторая пилотируемая лунная посадка. В Сатурн V дважды попала молния во время восхождения (T+36 с и T+52 с) — Бин восстановил корабль через знаменитый вызов «SCE to AUX» от EECOM Джона Аарона. Конрад и Бин выполнили точную посадку в Океане Бурь в пределах 163 м от Surveyor 3 (мягко приземлившегося в апреле 1967), затем подошли к Surveyor 3 и сняли его камеру + образец поверхности. Развернули ALSEP (первый ALSEP, против более простого EASEP Аполлона-11), который передавал данные в течение 8 лет. Миссия вернула 34 кг образцов.',
    },
    'sr-Cyrl': {
      type: 'ПИЛОТИРАНИ ЛЕНДЕР · ОБАВЉЕНО',
      first: 'Друго пилотирано слетање на Месец — прецизно слетање 163 m од Surveyor 3',
      description:
        'Друго пилотирано слетање на Месец. Сатурн V је током узлета погођен громом два пута (T+36 с и T+52 с) — Бин је обновио свемирски брод преко чувеног "SCE to AUX" позива EECOM Џона Арона. Конрад и Бин су извршили прецизно слетање на Океан Олуја у оквиру 163 m од Surveyor 3 (који је меко слетео у априлу 1967), затим прошетали до Surveyor 3 и скинули његову камеру + узорак површине. Поставили су ALSEP (први ALSEP, насупрот једноставнијем EASEP-у Аполо 11) који је емитовао податке 8 година. Мисија је донела 34 kg узорака.',
    },
    'zh-CN': {
      name: '阿波罗 12 号',
      type: '载人着陆器 · 已飞行',
      first: '第二次载人登月 — 距 Surveyor 3 仅 163 米的精确着陆',
      description:
        '第二次载人登月。土星五号在上升过程中被闪电击中两次（T+36 秒、T+52 秒）— Bean 通过著名的 EECOM John Aaron 的"SCE to AUX"呼叫恢复了飞船。Conrad 和 Bean 在风暴海上距 1967 年 4 月软着陆的 Surveyor 3 仅 163 米内精确着陆，然后步行到 Surveyor 3 并取下其相机和表面样本。他们部署了 ALSEP（第一个 ALSEP，对应阿波罗 11 的更简单的 EASEP），该装置传输数据长达 8 年。任务带回 34 公斤样本。',
    },
  },
  apollo14: {
    ar: {
      type: 'مركبة هبوط مأهولة · حُلّقت',
      first: 'الهبوط القمري الثالث — تم الوصول إلى هدف Apollo 13 المفقود؛ ضربات غولف Shepard',
      description:
        'الهبوط القمري الثالث المأهول ورحلة Alan Shepard الثانية — مما يجعله أول أمريكي في الفضاء وخامس رجل على القمر، في عمر 47 سنة أكبر سائر على القمر. كانت Apollo 14 مهمة الاستعادة بعد هبوط Apollo 13 المُجهض، تولّت هدف Apollo 13 المقصود لمرتفعات Fra Mauro. نشر Shepard و Mitchell ALSEP، أكملا اثنين من EVAs بإجمالي 9 ساعات و 23 دقيقة. في الدقائق الأخيرة من EVA-2، ارتجل Shepard رأس عصا غولف ست أنواع على مقبض جمع العينات وضرب كرتي غولف "أميالاً وأميالاً وأميالاً". 42 كغ من العينات.',
    },
    de: {
      type: 'BEMANNTER LANDER · GEFLOGEN',
      first: 'Dritte Mondlandung — Apollo 13s verlorenes Ziel erreicht; Shepards Golfschläge',
      description:
        'Die dritte bemannte Mondlandung und Alan Shepards zweiter Flug — was ihn zum ersten Amerikaner im All und fünften Mann auf dem Mond machte, mit 47 Jahren der älteste Mondläufer. Apollo 14 war die Wiederherstellungsmission nach Apollo 13s abgebrochener Landung und übernahm Apollo 13s vorgesehenes Ziel der Fra-Mauro-Hochlande. Shepard und Mitchell setzten ALSEP ein und absolvierten zwei EVAs mit insgesamt 9 h 23 m. In den letzten Minuten von EVA-2 improvisierte Shepard einen Sechser-Golfschlägerkopf auf einen Probennahmegriff und schlug zwei Golfbälle "Meilen und Meilen und Meilen". 42 kg Proben zurückgebracht.',
    },
    es: {
      type: 'ATERRIZADOR TRIPULADO · VOLÓ',
      first:
        'Tercer alunizaje — alcanzado el objetivo perdido de Apollo 13; tiros de golf de Shepard',
      description:
        'El tercer alunizaje tripulado y el segundo vuelo de Alan Shepard — convirtiéndolo en el primer estadounidense en el espacio y el quinto hombre en la Luna, a los 47 años el caminante lunar más viejo. Apollo 14 fue la misión de recuperación tras el alunizaje abortado de Apollo 13, asumiendo el objetivo previsto de Apollo 13 en las Tierras Altas de Fra Mauro. Shepard y Mitchell desplegaron ALSEP, completaron dos EVAs totalizando 9 h 23 m. En los últimos minutos de EVA-2, Shepard improvisó una cabeza de palo de golf de hierro seis sobre un mango de recolección de muestras y golpeó dos pelotas de golf "millas y millas y millas". 42 kg de muestras devueltos.',
    },
    fr: {
      type: 'ATTERRISSEUR HABITÉ · VOLÉ',
      first: "Troisième alunissage — cible perdue d'Apollo 13 atteinte ; coups de golf de Shepard",
      description:
        "Le troisième alunissage habité et le deuxième vol d'Alan Shepard — faisant de lui le premier Américain dans l'espace et le cinquième homme sur la Lune, à 47 ans le plus vieux marcheur lunaire. Apollo 14 fut la mission de récupération après l'alunissage avorté d'Apollo 13, reprenant la cible prévue d'Apollo 13 dans les Hauts de Fra Mauro. Shepard et Mitchell ont déployé ALSEP, achevé deux EVAs totalisant 9 h 23 m. Dans les dernières minutes de l'EVA-2, Shepard improvisa une tête de club de golf fer six sur une poignée de collecte d'échantillons et frappa deux balles de golf « miles and miles and miles ». 42 kg d'échantillons rapportés.",
    },
    hi: {
      type: 'मानवयुक्त लैंडर · उड़ा',
      first: 'तीसरा चंद्र-लैंडिंग — Apollo 13 का खोया लक्ष्य पहुंचा; Shepard के गोल्फ शॉट्स',
      description:
        'तीसरा मानवयुक्त चंद्र-लैंडिंग और Alan Shepard की दूसरी उड़ान — उन्हें अंतरिक्ष में पहला अमेरिकी और चंद्रमा पर पाँचवाँ व्यक्ति बनाते हुए, 47 वर्ष की आयु में सबसे वृद्ध चंद्र-यात्री। Apollo 14, Apollo 13 की लैंडिंग रद्द होने के बाद की पुनर्प्राप्ति मिशन थी, Apollo 13 के इच्छित Fra Mauro Highlands लक्ष्य को संभाला। Shepard और Mitchell ने ALSEP तैनात किया, कुल 9 घंटे 23 मिनट के दो EVAs पूरे किए। EVA-2 के अंतिम मिनटों में, Shepard ने एक नमूना-संग्रह हैंडल पर एक छह-लोहे का गोल्फ क्लब सिर सुधारा और दो गोल्फ गेंदें "मीलों और मीलों और मीलों" मारीं। 42 किग्रा नमूने लौटाए।',
    },
    it: {
      type: 'LANDER EQUIPAGGIATO · VOLATO',
      first: "Terzo allunaggio — raggiunto l'obiettivo perso di Apollo 13; tiri di golf di Shepard",
      description:
        'Il terzo allunaggio equipaggiato e il secondo volo di Alan Shepard — rendendolo il primo americano nello spazio e il quinto uomo sulla Luna, a 47 anni il più vecchio camminatore lunare. Apollo 14 fu la missione di recupero dopo l\'allunaggio abortito di Apollo 13, prendendo l\'obiettivo previsto di Apollo 13 nelle Highlands di Fra Mauro. Shepard e Mitchell dispiegarono ALSEP, completarono due EVA per un totale di 9 h 23 m. Negli ultimi minuti di EVA-2, Shepard improvvisò una testa di mazza da golf sei di ferro su un manico di raccolta campioni e colpì due palline da golf "miglia e miglia e miglia". 42 kg di campioni riportati.',
    },
    ja: {
      name: 'アポロ 14 号',
      type: '有人着陸機 · 飛行済み',
      first: '3 回目の月着陸 — アポロ 13 号が失った目標に到達；Shepard のゴルフショット',
      description:
        '3 回目の有人月着陸であり、Alan Shepard の 2 回目の飛行 — アメリカ初の宇宙飛行士であり、月面に立った 5 番目の男、47 歳で最年長の月面歩行者となった。アポロ 14 号は、アポロ 13 号の中止された着陸後の回復ミッションで、アポロ 13 号が計画していた Fra Mauro 高地の目標を引き継いだ。Shepard と Mitchell は ALSEP を展開し、合計 9 時間 23 分の 2 回の EVA を完了。EVA-2 の最後の数分間、Shepard はサンプル収集ハンドルに 6 番アイアンのゴルフクラブヘッドを即興で取り付け、2 つのゴルフボールを「何マイルも何マイルも何マイルも」打った。42 kg のサンプルを持ち帰った。',
    },
    ko: {
      name: '아폴로 14호',
      type: '유인 착륙선 · 완료',
      first: '세 번째 달 착륙 — 아폴로 13호의 잃어버린 목표 달성; Shepard의 골프샷',
      description:
        '세 번째 유인 달 착륙이자 Alan Shepard의 두 번째 비행 — 그를 미국 최초의 우주인이자 달에 선 다섯 번째 인물, 47세로 가장 나이 든 달 탐사자로 만들었다. 아폴로 14호는 아폴로 13호의 중단된 착륙 이후 복구 임무로, 아폴로 13호의 의도된 Fra Mauro Highlands 목표를 이어받았다. Shepard와 Mitchell은 ALSEP를 배치, 총 9시간 23분의 두 차례 EVA를 완료. EVA-2 마지막 몇 분간 Shepard는 시료 수집 핸들에 6번 아이언 골프 클럽 헤드를 즉석에서 부착해 골프공 두 개를 "수마일과 수마일과 수마일" 날렸다. 42kg 시료 회수.',
    },
    nl: {
      type: 'BEMANDE LANDER · GEVLOGEN',
      first: "Derde maanlanding — Apollo 13's verloren doel bereikt; Shepard's golfschoten",
      description:
        "De derde bemande maanlanding en Alan Shepard's tweede vlucht — wat hem zowel de eerste Amerikaan in de ruimte als de vijfde man op de Maan maakte, op 47-jarige leeftijd de oudste maanloper. Apollo 14 was de herstelmissie na Apollo 13's afgebroken landing en nam Apollo 13's beoogde doel in de Fra Mauro Highlands over. Shepard en Mitchell plaatsten ALSEP, voltooiden twee EVA's van in totaal 9 u 23 m. In de laatste minuten van EVA-2 improviseerde Shepard een zes-ijzer golfclub-kop op een monsterverzamelhandvat en sloeg twee golfballen \"miles and miles and miles\". 42 kg monsters teruggebracht.",
    },
    'pt-BR': {
      type: 'POUSADOR TRIPULADO · VOOU',
      first:
        'Terceiro pouso lunar — alvo perdido de Apollo 13 alcançado; tacadas de golfe de Shepard',
      description:
        'O terceiro pouso lunar tripulado e o segundo voo de Alan Shepard — tornando-o tanto o primeiro americano no espaço quanto o quinto homem na Lua, aos 47 anos o caminhante lunar mais velho. Apollo 14 foi a missão de recuperação após o pouso abortado do Apollo 13, assumindo o alvo pretendido do Apollo 13 nas Terras Altas de Fra Mauro. Shepard e Mitchell implantaram o ALSEP, completaram duas EVAs totalizando 9 h 23 m. Nos últimos minutos da EVA-2, Shepard improvisou uma cabeça de taco de golfe seis ferro em um cabo de coleta de amostras e bateu duas bolas de golfe "miles and miles and miles". 42 kg de amostras retornadas.',
    },
    ru: {
      name: 'Аполлон-14',
      type: 'ПИЛОТИРУЕМЫЙ ПОСАДОЧНЫЙ · ВЫПОЛНЕН',
      first: 'Третья лунная посадка — достигнута потерянная цель Аполлона-13; гольф-броски Шепарда',
      description:
        'Третья пилотируемая лунная посадка и второй полёт Алана Шепарда — сделавший его как первым американцем в космосе, так и пятым человеком на Луне, в возрасте 47 лет — самым старшим лунным ходоком. Аполлон-14 был миссией восстановления после прерванной посадки Аполлона-13, взяв на себя намеченную цель Аполлона-13 в нагорьях Фра-Мауро. Шепард и Митчелл развернули ALSEP, выполнили два выхода в открытый космос общей продолжительностью 9 ч 23 м. В последние минуты EVA-2 Шепард сымпровизировал головку клюшки для гольфа на ручке сбора образцов и пробил два мяча для гольфа «мили и мили и мили». Доставлено 42 кг образцов.',
    },
    'sr-Cyrl': {
      type: 'ПИЛОТИРАНИ ЛЕНДЕР · ОБАВЉЕНО',
      first: 'Треће слетање на Месец — постигнут изгубљени циљ Аполо-13; Шепардови голф ударци',
      description:
        'Треће пилотирано слетање на Месец и Шепардов други лет — чинећи га и првим Американцем у свемиру и петим човеком на Месецу, са 47 година најстаријим месечевим шетачом. Аполо-14 је била мисија опоравка после неуспелог слетања Аполо-13, преузимајући планирани циљ Аполо-13 у Фра Мауро висоравни. Шепард и Мичел су поставили ALSEP, завршили два EVA-а у трајању од 9 ч 23 м. У последњим минутима EVA-2, Шепард је импровизовао главу шестице за голф штап на дршци за сакупљање узорака и ударио две голф лоптице "миље и миље и миље". 42 kg узорака враћено.',
    },
    'zh-CN': {
      name: '阿波罗 14 号',
      type: '载人着陆器 · 已飞行',
      first: '第三次登月 — 抵达阿波罗 13 号未达成的目标；Shepard 的高尔夫击球',
      description:
        '第三次载人登月，也是 Alan Shepard 的第二次飞行 — 使他既是首位进入太空的美国人，也是登月第五人，以 47 岁成为最年长的月面行走者。阿波罗 14 号是阿波罗 13 号登月中止后的复飞任务，接管了阿波罗 13 号原定的弗拉·毛罗高地目标。Shepard 和 Mitchell 部署了 ALSEP，完成了两次共 9 小时 23 分钟的 EVA。EVA-2 最后几分钟内，Shepard 即兴在样本采集手柄上装上六号铁高尔夫球杆头，击出两颗高尔夫球"miles and miles and miles"。带回 42 公斤样本。',
    },
  },
  apollo15: {
    ar: {
      type: 'مركبة هبوط مأهولة · حُلّقت',
      first: 'أول مهمة J — إقامة ممتدة، أول مركبة قمرية متجولة (LRV)، "صخرة التكوين"',
      description:
        'أول "مهمة J" — Apollo علمي ممتد الإقامة مع المركبة القمرية المتجولة الجديدة. أعطت LRV لـ Scott + Irwin نطاق توغل 27.9 كم (مقابل 3.5 كم للمشي فقط في Apollo 14)، فاتحة موقع Hadley-Apennine الدراماتيكي عند سفح جبال يبلغ ارتفاعها 4.5 كم وحافة Hadley Rille المتعرج. ثلاث EVAs بإجمالي 18 ساعة و 35 دقيقة، 77 كغ من العينات أُعيدت، بما في ذلك "صخرة التكوين" (عينة 15415) — أنورثوسيت عمره 4.1 مليار سنة يؤكد أصل المحيط الماغمائي لقشرة المرتفعات القمرية. "إسقاط المطرقة والريشة" Scott المتلفز تحقق من قانون الجاذبية لـ Galileo مباشرة.',
    },
    de: {
      type: 'BEMANNTER LANDER · GEFLOGEN',
      first:
        'Erste J-Mission — verlängerter Aufenthalt, erstes Lunar Roving Vehicle, "Genesis Rock"',
      description:
        'Die erste "J-Mission" — verlängerter wissenschaftlicher Apollo-Aufenthalt mit dem neuen Lunar Roving Vehicle. Das LRV gab Scott + Irwin eine Reichweite von 27,9 km (gegenüber 3,5 km der nur zu Fuß gehenden Apollo 14) und eröffnete den dramatischen Hadley-Apennine-Standort am Fuß einer 4,5 km hohen Bergkette und am Rand der gewundenen Hadley-Rille. Drei EVAs mit insgesamt 18 h 35 m, 77 kg Proben zurückgebracht, einschließlich des berühmten "Genesis Rock" (Probe 15415) — ein 4,1 Milliarden Jahre alter Anorthosit, der den Magmaozean-Ursprung der Mondhochlandkruste bestätigt. Scotts im Fernsehen übertragener "Hammer-Feder-Drop" bestätigte Galileos Gravitationsgesetz live.',
    },
    es: {
      type: 'ATERRIZADOR TRIPULADO · VOLÓ',
      first: 'Primera misión J — estancia extendida, primer Vehículo Lunar Rover, "Roca Génesis"',
      description:
        'La primera "misión J" — Apollo científico de estancia extendida con el nuevo Vehículo Lunar Rover. El LRV dio a Scott + Irwin un rango de travesía de 27,9 km (vs los 3,5 km solo a pie de Apollo 14), abriendo el dramático sitio Hadley-Apennine al pie de una cordillera de 4,5 km y el borde de la sinuosa Hadley Rille. Tres EVAs totalizando 18 h 35 m, 77 kg de muestras devueltos, incluyendo la famosa "Roca Génesis" (muestra 15415) — una anortosita de 4.100 millones de años que confirma el origen de océano de magma de la corteza de las tierras altas lunares. La "caída de martillo-pluma" televisada de Scott verificó la ley de gravitación de Galileo en vivo.',
    },
    fr: {
      type: 'ATTERRISSEUR HABITÉ · VOLÉ',
      first: 'Première mission J — séjour prolongé, premier Lunar Roving Vehicle, « Genesis Rock »',
      description:
        "La première « mission J » — Apollo scientifique à séjour prolongé avec le nouveau Lunar Roving Vehicle. Le LRV a donné à Scott + Irwin un rayon de traversée de 27,9 km (vs les 3,5 km à pied seulement d'Apollo 14), ouvrant le site dramatique Hadley-Apennine au pied d'une chaîne de montagnes de 4,5 km et au bord de la sinueuse Hadley Rille. Trois EVAs totalisant 18 h 35 m, 77 kg d'échantillons rapportés, dont le célèbre « Genesis Rock » (échantillon 15415) — une anorthosite de 4,1 milliards d'années confirmant l'origine océan de magma de la croûte des hautes terres lunaires. Le « hammer-feather drop » télévisé de Scott a vérifié la loi de gravitation de Galilée en direct.",
    },
    hi: {
      type: 'मानवयुक्त लैंडर · उड़ा',
      first: 'पहला J-मिशन — विस्तारित प्रवास, पहला Lunar Roving Vehicle, "Genesis Rock"',
      description:
        'पहला "J-मिशन" — नए Lunar Roving Vehicle के साथ विस्तारित-प्रवास वैज्ञानिक Apollo। LRV ने Scott + Irwin को 27.9 किमी की ट्रैवर्स रेंज दी (Apollo 14 के 3.5 किमी पैदल-केवल के मुकाबले), 4.5-किमी पर्वत श्रृंखला के पैर पर और सर्पीन Hadley Rille के किनारे पर नाटकीय Hadley-Apennine साइट खोली। तीन EVAs कुल 18 घंटे 35 मिनट, 77 किग्रा नमूने वापस लाए, जिसमें प्रसिद्ध "Genesis Rock" (नमूना 15415) शामिल है — 4.1 अरब साल पुराना anorthosite जो चंद्र हाइलैंड्स क्रस्ट की मैग्मा-महासागर उत्पत्ति की पुष्टि करता है। Scott के टेलीविजन प्रसारित "हथौड़ा-पंख ड्रॉप" ने Galileo के गुरुत्वाकर्षण नियम को लाइव सत्यापित किया।',
    },
    it: {
      type: 'LANDER EQUIPAGGIATO · VOLATO',
      first: 'Prima missione J — soggiorno esteso, primo Lunar Roving Vehicle, "Genesis Rock"',
      description:
        'La prima "missione J" — Apollo scientifico a soggiorno esteso con il nuovo Lunar Roving Vehicle. Il LRV ha dato a Scott + Irwin un raggio di traversata di 27,9 km (vs i 3,5 km solo a piedi di Apollo 14), aprendo il drammatico sito Hadley-Apennine ai piedi di una catena montuosa di 4,5 km e al bordo della sinuosa Hadley Rille. Tre EVA per un totale di 18 h 35 m, 77 kg di campioni riportati, inclusa la famosa "Genesis Rock" (campione 15415) — un\'anortosite di 4,1 miliardi di anni che conferma l\'origine oceano-magma della crosta degli altopiani lunari. Il "hammer-feather drop" televisivo di Scott ha verificato la legge gravitazionale di Galileo dal vivo.',
    },
    ja: {
      name: 'アポロ 15 号',
      type: '有人着陸機 · 飛行済み',
      first: '最初の J ミッション — 滞在延長、初の月面車 (LRV)、「ジェネシス・ロック」',
      description:
        '最初の「J ミッション」 — 新しい月面車を備えた延長滞在型科学アポロ。LRV により Scott + Irwin は 27.9 km の探査範囲を獲得 (アポロ 14 の徒歩のみの 3.5 km に対して)、4.5 km の山脈の麓と曲がりくねった Hadley 谷の縁にあるドラマチックな Hadley-Apennine 地点を開拓。3 回の EVA で合計 18 時間 35 分、77 kg のサンプルを持ち帰った。これには有名な「ジェネシス・ロック」(サンプル 15415) — 月の高地地殻のマグマオーシャン起源を確認する 41 億年前のアノーソサイトが含まれる。Scott がテレビ中継した「ハンマー・羽根落下」がガリレオの重力法則を生放送で実証。',
    },
    ko: {
      name: '아폴로 15호',
      type: '유인 착륙선 · 완료',
      first: '최초의 J-임무 — 연장 체류, 최초의 달 탐사 차량(LRV), "제네시스 록"',
      description:
        '최초의 "J-임무" — 새로운 달 탐사 차량과 함께한 연장 체류 과학 아폴로. LRV는 Scott와 Irwin에게 27.9km의 탐사 반경을 제공(아폴로 14호의 도보 전용 3.5km에 비해), 4.5km 산맥 기슭과 굽이쳐 흐르는 Hadley 협곡 가장자리의 극적인 Hadley-Apennine 지점을 열었다. 총 18시간 35분의 3회 EVA, 77kg 시료 반환, 그중 유명한 "제네시스 록"(시료 15415) — 달 고지대 지각의 마그마 바다 기원을 확인하는 41억 년 된 아노르토사이트. Scott의 TV 중계 "망치-깃털 낙하"가 갈릴레오의 중력 법칙을 생방송으로 검증.',
    },
    nl: {
      type: 'BEMANDE LANDER · GEVLOGEN',
      first: 'Eerste J-missie — verlengd verblijf, eerste Lunar Roving Vehicle, "Genesis Rock"',
      description:
        'De eerste "J-missie" — wetenschappelijke Apollo met verlengd verblijf met het nieuwe Lunar Roving Vehicle. De LRV gaf Scott + Irwin een traversbereik van 27,9 km (vs de 3,5 km alleen-lopend van Apollo 14), wat de dramatische Hadley-Apennine-locatie aan de voet van een 4,5-km bergketen en de rand van de kronkelende Hadley Rille opende. Drie EVA\'s van in totaal 18 u 35 m, 77 kg monsters teruggebracht, waaronder de beroemde "Genesis Rock" (monster 15415) — een 4,1 miljard jaar oude anorthosiet die de magma-oceaan-oorsprong van de maan-hooglandkorst bevestigt. Scott\'s op TV uitgezonden "hammer-feather drop" verifieerde Galilei\'s zwaartekrachtwet live.',
    },
    'pt-BR': {
      type: 'POUSADOR TRIPULADO · VOOU',
      first: 'Primeira missão J — estadia estendida, primeiro Lunar Roving Vehicle, "Rocha Gênese"',
      description:
        'A primeira "missão J" — Apollo científico com estadia estendida com o novo Lunar Roving Vehicle. O LRV deu a Scott + Irwin um alcance de travessia de 27,9 km (vs os 3,5 km a pé apenas de Apollo 14), abrindo o dramático sítio Hadley-Apennine ao pé de uma cordilheira de 4,5 km e à borda da sinuosa Hadley Rille. Três EVAs totalizando 18 h 35 m, 77 kg de amostras retornadas, incluindo a famosa "Rocha Gênese" (amostra 15415) — uma anortosita de 4,1 bilhões de anos confirmando a origem em oceano de magma da crosta das terras altas lunares. O "hammer-feather drop" televisionado de Scott verificou a lei da gravitação de Galileu ao vivo.',
    },
    ru: {
      name: 'Аполлон-15',
      type: 'ПИЛОТИРУЕМЫЙ ПОСАДОЧНЫЙ · ВЫПОЛНЕН',
      first: 'Первая J-миссия — продлённое пребывание, первый луноход (LRV), «Камень Бытия»',
      description:
        'Первая «J-миссия» — научный Аполлон с продлённым пребыванием с новым луноходом. LRV дал Скотту + Ирвину дальность 27,9 км (против 3,5 км пешком в Аполлоне-14), открыв драматичную площадку Хэдли-Аппеннины у подножия горного хребта высотой 4,5 км и края извилистой долины Хэдли. Три EVA общей продолжительностью 18 ч 35 м, 77 кг образцов возвращено, включая знаменитый «Камень Бытия» (образец 15415) — анортозит возрастом 4,1 миллиарда лет, подтверждающий магмо-океаническое происхождение коры лунных нагорий. Транслируемый по ТВ «опыт молот-перо» Скотта подтвердил закон гравитации Галилея в прямом эфире.',
    },
    'sr-Cyrl': {
      type: 'ПИЛОТИРАНИ ЛЕНДЕР · ОБАВЉЕНО',
      first: 'Прва Ј-мисија — продужени боравак, прво лунарно возило (LRV), "Камен Постања"',
      description:
        'Прва "Ј-мисија" — научни Аполо са продуженим боравком са новим лунарним возилом. LRV је дао Скоту + Ирвину распон од 27,9 km (наспрам само-пешачких 3,5 km Аполо-14), отварајући драматичну локацију Хадли-Апенин у подножју планинског венца од 4,5 km и ивици кривудаве Хадли долине. Три EVA-а укупно 18 ч 35 м, 77 kg узорака враћено, укључујући чувени "Камен Постања" (узорак 15415) — аноррозит стар 4,1 милијарду година који потврђује магма-океанско порекло коре лунарних висија. Скотов ТВ преноси "тест чекић-перо" уживо потврдио је Галилејев закон гравитације.',
    },
    'zh-CN': {
      name: '阿波罗 15 号',
      type: '载人着陆器 · 已飞行',
      first: '首个 J 任务 — 延长停留、首辆月球车（LRV）、"创世石"',
      description:
        '首个"J 任务"— 配备新型月球车的延长停留科学型阿波罗。LRV 让 Scott 和 Irwin 拥有 27.9 km 的探索范围（相对于阿波罗 14 号纯步行的 3.5 km），开辟了 4.5 km 山脉脚下、蜿蜒哈德利月谷边缘的壮观哈德利-亚平宁地点。三次 EVA 共 18 小时 35 分，带回 77 公斤样本，包括著名的"创世石"（样本 15415）— 一块 41 亿年历史的斜长岩，证实月球高地地壳的岩浆海洋起源。Scott 直播的"锤子-羽毛同时下落"实验在现场验证了伽利略的引力定律。',
    },
  },
  apollo16: {
    ar: {
      type: 'مركبة هبوط مأهولة · حُلّقت',
      first: 'أول هبوط قمري في المرتفعات القمرية — Descartes؛ "جائزة جون يونغ القمرية الكبرى"',
      description:
        'الهبوط القمري المأهول الخامس وأول هبوط في موقع مرتفعات قمرية غير بحرية. توقع الجيولوجيون أن Descartes ستكون بركانية؛ دحضت Apollo 16 ذلك — كل صخرة عادت كانت breccia (حطام محطم بسبب الصدمات)، مما أعاد تشكيل فهم المرتفعات القمرية كنتاج للصدمات الكارثية بدلاً من البراكين القديمة. أكمل Young و Duke ثلاث EVAs مدعومة بـ LRV بإجمالي 20 ساعة و 14 دقيقة، اجتازا 26.7 كم، وأعادا 95.7 كغ من العينات (أثقل حصاد Apollo حتى ذلك التاريخ). "Lunar Grand Prix" ليونغ — اختبار سرعة LRV المتلفز — بلغ ذروته عند ~17 كم/س.',
    },
    de: {
      type: 'BEMANNTER LANDER · GEFLOGEN',
      first: 'Erste Mondlandung im Mondhochland — Descartes; John Youngs "Lunar Grand Prix"',
      description:
        'Die fünfte bemannte Mondlandung und die erste an einer Nicht-Mare-Hochlandstelle. Geologen erwarteten, dass Descartes vulkanisch wäre; Apollo 16 widerlegte dies — jeder zurückgebrachte Stein war Breccia (impakt-zertrümmerter Schutt), was das Verständnis der Mondhochlande als Produkte katastrophaler Einschläge statt alten Vulkanismus neu prägte. Young und Duke absolvierten drei LRV-gestützte EVAs mit insgesamt 20 h 14 m, durchquerten 26,7 km und brachten 95,7 kg Proben zurück (die schwerste Apollo-Ausbeute bis dahin). Youngs "Lunar Grand Prix" — ein im Fernsehen übertragener Geschwindigkeitstest des LRV — erreichte ~17 km/h.',
    },
    es: {
      type: 'ATERRIZADOR TRIPULADO · VOLÓ',
      first:
        'Primer alunizaje en las tierras altas lunares — Descartes; "Lunar Grand Prix" de John Young',
      description:
        'El quinto alunizaje tripulado y el primero en un sitio de tierras altas no-mare. Los geólogos esperaban que Descartes fuera volcánico; Apollo 16 lo desmintió — cada roca devuelta era brecha (escombros destrozados por impacto), reformulando la comprensión de las tierras altas lunares como productos de impactos catastróficos en lugar de vulcanismo antiguo. Young y Duke completaron tres EVAs apoyadas por LRV totalizando 20 h 14 m, atravesaron 26,7 km y devolvieron 95,7 kg de muestras (la mayor cosecha de Apollo hasta esa fecha). El "Lunar Grand Prix" de Young — una prueba de velocidad televisada del LRV — alcanzó un pico de ~17 km/h.',
    },
    fr: {
      type: 'ATTERRISSEUR HABITÉ · VOLÉ',
      first:
        'Premier alunissage dans les hautes terres lunaires — Descartes ; « Lunar Grand Prix » de John Young',
      description:
        "Le cinquième alunissage habité et le premier sur un site des hautes terres non-mer. Les géologues s'attendaient à ce que Descartes soit volcanique ; Apollo 16 a réfuté cela — chaque roche rapportée était une brèche (débris fracassés par impact), remodelant la compréhension des hautes terres lunaires comme produits d'impacts catastrophiques plutôt que d'un volcanisme ancien. Young et Duke ont complété trois EVAs soutenues par le LRV totalisant 20 h 14 m, ont traversé 26,7 km, et ont rapporté 95,7 kg d'échantillons (la plus grande récolte Apollo à cette date). Le « Lunar Grand Prix » de Young — un test de vitesse télévisé du LRV — a atteint un pic de ~17 km/h.",
    },
    hi: {
      type: 'मानवयुक्त लैंडर · उड़ा',
      first: 'चंद्र हाइलैंड्स में पहला चंद्र-लैंडिंग — Descartes; John Young का "Lunar Grand Prix"',
      description:
        'पाँचवाँ मानवयुक्त चंद्र-लैंडिंग और गैर-मारे हाइलैंड साइट पर पहला। भूवैज्ञानिकों ने उम्मीद की थी कि Descartes ज्वालामुखीय होगा; Apollo 16 ने इसे गलत साबित किया — हर चट्टान जो वापस आई वह breccia (प्रभाव से टूटा हुआ मलबा) थी, चंद्र हाइलैंड्स को प्राचीन ज्वालामुखी के बजाय विनाशकारी प्रभावों के उत्पादों के रूप में समझ को फिर से आकार दिया। Young और Duke ने कुल 20 घंटे 14 मिनट के तीन LRV-समर्थित EVAs पूरे किए, 26.7 किमी की दूरी तय की, और 95.7 किग्रा नमूने वापस लाए (उस तिथि तक सबसे भारी Apollo संग्रह)। Young का "Lunar Grand Prix" — LRV का टेलीविजन प्रसारित गति परीक्षण — ~17 किमी/घंटा पर शिखर पर पहुँचा।',
    },
    it: {
      type: 'LANDER EQUIPAGGIATO · VOLATO',
      first:
        'Primo allunaggio negli altipiani lunari — Descartes; "Lunar Grand Prix" di John Young',
      description:
        'Il quinto allunaggio equipaggiato e il primo in un sito di altopiani non-mare. I geologi si aspettavano che Descartes fosse vulcanico; Apollo 16 lo ha smentito — ogni roccia riportata era breccia (detriti frantumati da impatto), rimodellando la comprensione degli altopiani lunari come prodotti di impatti catastrofici piuttosto che di vulcanismo antico. Young e Duke hanno completato tre EVA supportate da LRV per un totale di 20 h 14 m, hanno attraversato 26,7 km, e hanno riportato 95,7 kg di campioni (il raccolto Apollo più pesante fino a quella data). Il "Lunar Grand Prix" di Young — un test di velocità televisivo del LRV — ha raggiunto un picco di ~17 km/h.',
    },
    ja: {
      name: 'アポロ 16 号',
      type: '有人着陸機 · 飛行済み',
      first: '月の高地で初の有人着陸 — Descartes；John Young の「月面グランプリ」',
      description:
        '5 回目の有人月着陸であり、海以外の高地への初の着陸。地質学者は Descartes が火山性であると予想していたが、アポロ 16 号はそれを覆した — 持ち帰ったすべての岩は breccia (衝撃で粉砕された残骸) であり、月の高地が古代の火山活動ではなく壊滅的な衝突の産物であるという理解を再形成した。Young と Duke は合計 20 時間 14 分の 3 回の LRV 支援 EVA を完了し、26.7 km を走破、95.7 kg のサンプルを持ち帰った (その時点で最も重いアポロの収穫)。Young の「月面グランプリ」 — LRV のテレビ中継速度テスト — は約 17 km/h でピークに達した。',
    },
    ko: {
      name: '아폴로 16호',
      type: '유인 착륙선 · 완료',
      first: '달 고지대에서 첫 달 착륙 — Descartes; John Young의 "월면 그랑프리"',
      description:
        '다섯 번째 유인 달 착륙이자 비-바다 고지대에 첫 착륙. 지질학자들은 Descartes가 화산성일 것이라 예상했으나 아폴로 16호가 이를 반증 — 가져온 모든 암석은 brecccia(충격으로 부서진 잔해)였고, 달 고지대를 고대 화산 활동이 아닌 파괴적 충돌의 산물로 이해를 재구성했다. Young과 Duke는 총 20시간 14분의 LRV-지원 EVA 3회 완료, 26.7km 횡단, 95.7kg 시료 반환(당시까지 가장 무거운 아폴로 수확). Young의 "월면 그랑프리" — LRV의 TV 중계 속도 시험 — 약 17km/h 최고 속도.',
    },
    nl: {
      type: 'BEMANDE LANDER · GEVLOGEN',
      first:
        'Eerste maanlanding in de maanhooglanden — Descartes; John Young\'s "Lunar Grand Prix"',
      description:
        'De vijfde bemande maanlanding en de eerste op een niet-mare hooglandlocatie. Geologen verwachtten dat Descartes vulkanisch zou zijn; Apollo 16 weerlegde dit — elk gesteente dat terugkwam was breccia (door inslag verbrijzeld puin), wat het begrip van de maanhooglanden hervormde als producten van catastrofale inslagen in plaats van oud vulkanisme. Young en Duke voltooiden drie LRV-ondersteunde EVA\'s van in totaal 20 u 14 m, doorkruisten 26,7 km, en brachten 95,7 kg monsters terug (de zwaarste Apollo-oogst tot dan toe). Young\'s "Lunar Grand Prix" — een op TV uitgezonden snelheidstest van de LRV — bereikte een piek van ~17 km/u.',
    },
    'pt-BR': {
      type: 'POUSADOR TRIPULADO · VOOU',
      first:
        'Primeiro pouso lunar nas terras altas lunares — Descartes; "Lunar Grand Prix" de John Young',
      description:
        'O quinto pouso lunar tripulado e o primeiro em um sítio de terras altas não-mare. Os geólogos esperavam que Descartes fosse vulcânico; Apollo 16 desmentiu isso — toda rocha retornada era brecha (detritos despedaçados por impacto), remodelando a compreensão das terras altas lunares como produtos de impactos catastróficos em vez de vulcanismo antigo. Young e Duke completaram três EVAs apoiadas por LRV totalizando 20 h 14 m, atravessaram 26,7 km, e retornaram 95,7 kg de amostras (a maior colheita Apollo até aquela data). O "Lunar Grand Prix" de Young — um teste de velocidade televisionado do LRV — atingiu um pico de ~17 km/h.',
    },
    ru: {
      name: 'Аполлон-16',
      type: 'ПИЛОТИРУЕМЫЙ ПОСАДОЧНЫЙ · ВЫПОЛНЕН',
      first: 'Первая лунная посадка в лунных нагорьях — Декарт; «лунный гран-при» Джона Янга',
      description:
        'Пятая пилотируемая лунная посадка и первая на не-морском нагорном участке. Геологи ожидали, что Декарт будет вулканическим; Аполлон-16 это опроверг — каждый возвращённый камень был брекчией (раздробленные ударом обломки), переосмыслив понимание лунных нагорий как продуктов катастрофических ударов, а не древнего вулканизма. Янг и Дьюк завершили три выхода с поддержкой LRV общей продолжительностью 20 ч 14 м, преодолели 26,7 км и вернули 95,7 кг образцов (самый тяжёлый аполлоновский улов до того времени). «Лунный Гран-при» Янга — телевизионный тест скорости LRV — достиг пика ~17 км/ч.',
    },
    'sr-Cyrl': {
      type: 'ПИЛОТИРАНИ ЛЕНДЕР · ОБАВЉЕНО',
      first: 'Прво слетање на Месец у лунарне висије — Декарт; "Лунарни Гран при" Џона Јанга',
      description:
        'Пето пилотирано слетање на Месец и прво на не-морско висијско место. Геолози су очекивали да ће Декарт бити вулкански; Аполо-16 је то оповргао — свака враћена стена била је бреча (ударом разбијени остаци), преосмишљавајући разумевање лунарних висија као производа катастрофалних удара, а не древног вулканизма. Јанг и Дјук су извели три EVA-а уз помоћ LRV-а укупно 20 ч 14 м, прешли 26,7 km, и вратили 95,7 kg узорака (најтежи Аполо излов до тог датума). Јангов "Лунарни Гран при" — ТВ преноси тест брзине LRV-а — достигао је врхунац од ~17 km/h.',
    },
    'zh-CN': {
      name: '阿波罗 16 号',
      type: '载人着陆器 · 已飞行',
      first: '首次在月球高地登陆 — 笛卡尔；John Young 的"月面大奖赛"',
      description:
        '第五次载人登月，也是首次在非月海高地登陆。地质学家预期笛卡尔地区是火山形成的；阿波罗 16 号推翻了这一点 — 带回的每块岩石都是 breccia（撞击破碎的碎屑），重塑了对月球高地是灾难性撞击产物（而非古代火山活动）的理解。Young 和 Duke 完成了共 20 小时 14 分钟的三次 LRV 辅助 EVA，行驶 26.7 km，带回 95.7 公斤样本（截至当时最重的阿波罗收获）。Young 的"月面大奖赛"— LRV 的电视直播速度测试 — 峰值约 17 km/h。',
    },
  },
};

async function main() {
  let wrote = 0;
  for (const [missionId, byLocale] of Object.entries(OVERLAYS)) {
    // Determine which dest folder this mission lives in — load the en-US
    // overlay (already written) to find it.
    const enPaths = [
      join(EN_US, 'moon', missionId + '.json'),
      join(EN_US, 'earth', missionId + '.json'),
    ];
    let enPath = null;
    for (const p of enPaths) {
      try {
        await readFile(p, 'utf8');
        enPath = p;
        break;
      } catch {}
    }
    if (!enPath) {
      console.error(`✗ ${missionId}: no en-US overlay found`);
      continue;
    }
    const enOverlay = JSON.parse(await readFile(enPath, 'utf8'));
    const enEvents = enOverlay.events || [];
    const destDir = enPath.includes('/earth/') ? 'earth' : 'moon';
    const enName = enOverlay.name;

    for (const locale of LOCALES) {
      const entry = byLocale[locale];
      if (!entry) {
        console.warn(`  ⚠ ${missionId}/${locale}: missing translation`);
        continue;
      }
      const overlay = {
        name: entry.name || enName,
        type: entry.type,
        first: entry.first,
        description: entry.description,
        events: enEvents,
      };
      const path = join(I18N_ROOT, locale, 'missions', destDir, missionId + '.json');
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, JSON.stringify(overlay, null, 2) + '\n');
      wrote += 1;
    }
  }
  console.log(`✓ wrote ${wrote} overlay files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
