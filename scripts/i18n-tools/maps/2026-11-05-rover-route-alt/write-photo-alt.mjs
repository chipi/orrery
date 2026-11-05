// Alt text (= hover caption) for the rovers' own photos along their routes
// (#641), 14 locales, written by hand from the images. Place names come from
// the glossary (scripts/i18n-tools/native-terms.json) via G(); names it doesn't
// have stay in Latin script, as in the route-tile alt texts.
//
//   node scripts/i18n-tools/maps/2026-11-05-rover-route-alt/write-photo-alt.mjs
import fs from 'node:fs';

const LOCS = [
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
const gl = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'));
const GL = { ...gl.feature, ...gl.place, ...gl.body, ...gl.term };
/** Glossary form of `term` in `loc` (English / Latin when absent). */
const G = (loc, term) => (loc === 'en-US' ? term : (GL[term]?.[loc] ?? term));

// Per photo: (loc) => text. Each locale's sentence names the rover, the place
// and what the picture shows.
const T = {
  'opportunity/endurance-layers': {
    'en-US': () =>
      `Opportunity's view inside Endurance Crater: pale layered bedrock broken into slabs`,
    ar: (l) =>
      `منظر Opportunity داخل ${G(l, 'Endurance Crater')}: صخور أساسية فاتحة متطبقة متكسرة إلى ألواح`,
    de: (l) =>
      `Blick von Opportunity im ${G(l, 'Endurance Crater')}: helles, geschichtetes Gestein, in Platten zerbrochen`,
    es: (l) =>
      `Vista de Opportunity dentro del ${G(l, 'Endurance Crater')}: roca clara estratificada partida en losas`,
    fr: (l) =>
      `Vue d’Opportunity dans le ${G(l, 'Endurance Crater')} : roche claire stratifiée brisée en dalles`,
    hi: (l) =>
      `${G(l, 'Endurance Crater')} के भीतर Opportunity का दृश्य: पट्टियों में टूटी हल्की परतदार चट्टान`,
    it: (l) =>
      `Vista di Opportunity dentro il ${G(l, 'Endurance Crater')}: roccia chiara stratificata spezzata in lastre`,
    ja: (l) =>
      `${G(l, 'Endurance Crater')}内部での Opportunity の眺め。板状に割れた明るい層状の岩盤`,
    ko: (l) =>
      `${G(l, 'Endurance Crater')} 안에서 본 Opportunity의 모습. 판 모양으로 갈라진 밝은 층상 기반암`,
    nl: (l) =>
      `Opportunity in de ${G(l, 'Endurance Crater')}: licht, gelaagd gesteente, in platen gebroken`,
    'pt-BR': (l) =>
      `Vista do Opportunity dentro da ${G(l, 'Endurance Crater')}: rocha clara em camadas partida em placas`,
    ru: () =>
      `Вид Opportunity внутри кратера Эндьюранс: светлая слоистая порода, расколотая на плиты`,
    'sr-Cyrl': () =>
      `Поглед летелице Opportunity у кратеру Ендјуранс: светла слојевита стена изломљена у плоче`,
    'zh-CN': (l) => `Opportunity 在${G(l, 'Endurance Crater')}内的视角：碎裂成板块的浅色层状基岩`,
  },
  'opportunity/erebus-horizon': {
    'en-US': () =>
      `Opportunity's view near Erebus Crater: flat pale rock slabs between dark sand ripples`,
    ar: (l) =>
      `منظر Opportunity قرب ${G(l, 'Erebus Crater')}: ألواح صخرية فاتحة مسطحة بين تموجات رملية داكنة`,
    de: (l) =>
      `Blick von Opportunity nahe dem ${G(l, 'Erebus Crater')}: flache helle Gesteinsplatten zwischen dunklen Sandrippeln`,
    es: (l) =>
      `Vista de Opportunity cerca del ${G(l, 'Erebus Crater')}: losas claras planas entre ondulaciones de arena oscura`,
    fr: (l) =>
      `Vue d’Opportunity près du ${G(l, 'Erebus Crater')} : dalles claires et plates entre des rides de sable sombre`,
    hi: (l) =>
      `${G(l, 'Erebus Crater')} के पास Opportunity का दृश्य: गहरी रेत की लहरों के बीच समतल हल्की चट्टानी पट्टियाँ`,
    it: (l) =>
      `Vista di Opportunity vicino al ${G(l, 'Erebus Crater')}: lastre chiare e piatte tra increspature di sabbia scura`,
    ja: (l) =>
      `${G(l, 'Erebus Crater')}付近での Opportunity の眺め。暗い砂の波紋の間に平らな明るい岩板`,
    ko: (l) =>
      `${G(l, 'Erebus Crater')} 근처에서 본 Opportunity의 모습. 어두운 모래 물결 사이의 평평하고 밝은 암판`,
    nl: (l) =>
      `Opportunity bij de ${G(l, 'Erebus Crater')}: vlakke lichte rotsplaten tussen donkere zandrimpels`,
    'pt-BR': (l) =>
      `Vista do Opportunity perto da ${G(l, 'Erebus Crater')}: placas claras planas entre ondulações de areia escura`,
    ru: () => `Вид Opportunity у кратера Эребус: плоские светлые плиты среди тёмной песчаной ряби`,
    'sr-Cyrl': () =>
      `Поглед летелице Opportunity код кратера Еребус: равне светле плоче међу тамним пешчаним таласићима`,
    'zh-CN': (l) => `Opportunity 在${G(l, 'Erebus Crater')}附近的视角：暗色沙纹间平坦的浅色岩板`,
  },
  'opportunity/victoria-lip': {
    'en-US': () =>
      `Opportunity's wide view from the lip of Victoria Crater, looking down into the crater`,
    ar: (l) => `منظر واسع لـ Opportunity من حافة ${G(l, 'Victoria Crater')}، ينظر إلى داخل الفوهة`,
    de: (l) =>
      `Weiter Blick von Opportunity vom Rand des ${G(l, 'Victoria Crater')}s hinab in den Krater`,
    es: (l) =>
      `Vista amplia de Opportunity desde el borde del ${G(l, 'Victoria Crater')}, mirando hacia el interior`,
    fr: (l) =>
      `Vue large d’Opportunity depuis le bord du ${G(l, 'Victoria Crater')}, vers l’intérieur du cratère`,
    hi: (l) =>
      `${G(l, 'Victoria Crater')} के किनारे से Opportunity का चौड़ा दृश्य, क्रेटर के भीतर की ओर`,
    it: (l) =>
      `Ampia vista di Opportunity dal bordo del ${G(l, 'Victoria Crater')}, verso l’interno del cratere`,
    ja: (l) => `${G(l, 'Victoria Crater')}の縁から内部を見下ろす Opportunity の広角の眺め`,
    ko: (l) =>
      `${G(l, 'Victoria Crater')} 가장자리에서 분화구 안을 내려다본 Opportunity의 넓은 시야`,
    nl: (l) =>
      `Brede blik van Opportunity vanaf de rand van de ${G(l, 'Victoria Crater')}, de krater in`,
    'pt-BR': (l) =>
      `Vista ampla do Opportunity da borda da ${G(l, 'Victoria Crater')}, olhando para dentro da cratera`,
    ru: () => `Широкий вид Opportunity с края кратера Виктория вниз, в кратер`,
    'sr-Cyrl': () =>
      `Широки поглед летелице Opportunity са ивице кратера Викторија, у унутрашњост кратера`,
    'zh-CN': (l) => `Opportunity 从${G(l, 'Victoria Crater')}边缘俯瞰坑内的广角视角`,
  },
  'opportunity/marathon-valley-pan': {
    'en-US': () =>
      `Opportunity's panorama out of Marathon Valley across the floor of Endeavour Crater`,
    ar: (l) => `بانوراما Opportunity من Marathon Valley عبر قاع ${G(l, 'Endeavour Crater')}`,
    de: (l) =>
      `Panorama von Opportunity aus dem Marathon Valley über den Boden des ${G(l, 'Endeavour Crater')}s`,
    es: (l) =>
      `Panorama de Opportunity desde Marathon Valley sobre el fondo del ${G(l, 'Endeavour Crater')}`,
    fr: (l) =>
      `Panorama d’Opportunity depuis Marathon Valley sur le fond du ${G(l, 'Endeavour Crater')}`,
    hi: (l) => `Marathon Valley से ${G(l, 'Endeavour Crater')} के तल के पार Opportunity का पैनोरमा`,
    it: (l) =>
      `Panorama di Opportunity da Marathon Valley sul fondo del ${G(l, 'Endeavour Crater')}`,
    ja: (l) => `Marathon Valley から${G(l, 'Endeavour Crater')}の底を望む Opportunity のパノラマ`,
    ko: (l) =>
      `Marathon Valley에서 ${G(l, 'Endeavour Crater')} 바닥을 바라본 Opportunity의 파노라마`,
    nl: (l) =>
      `Panorama van Opportunity vanuit Marathon Valley over de bodem van de ${G(l, 'Endeavour Crater')}`,
    'pt-BR': (l) =>
      `Panorama do Opportunity de Marathon Valley sobre o fundo da ${G(l, 'Endeavour Crater')}`,
    ru: () => `Панорама Opportunity из Marathon Valley на дно кратера Индевор`,
    'sr-Cyrl': () => `Панорама летелице Opportunity из Marathon Valley преко дна кратера Индевор`,
    'zh-CN': (l) => `Opportunity 从 Marathon Valley 眺望${G(l, 'Endeavour Crater')}坑底的全景`,
  },
  'opportunity/perseverance-valley': {
    'en-US': () =>
      `Opportunity's panorama from inside Perseverance Valley on the rim of Endeavour Crater`,
    ar: (l) =>
      `بانوراما Opportunity من داخل Perseverance Valley على حافة ${G(l, 'Endeavour Crater')}`,
    de: (l) =>
      `Panorama von Opportunity im Perseverance Valley am Rand des ${G(l, 'Endeavour Crater')}s`,
    es: (l) =>
      `Panorama de Opportunity desde Perseverance Valley, en el borde del ${G(l, 'Endeavour Crater')}`,
    fr: (l) =>
      `Panorama d’Opportunity depuis Perseverance Valley, sur le bord du ${G(l, 'Endeavour Crater')}`,
    hi: (l) =>
      `${G(l, 'Endeavour Crater')} के किनारे पर Perseverance Valley के भीतर से Opportunity का पैनोरमा`,
    it: (l) =>
      `Panorama di Opportunity da Perseverance Valley, sul bordo del ${G(l, 'Endeavour Crater')}`,
    ja: (l) =>
      `${G(l, 'Endeavour Crater')}の縁、Perseverance Valley の中から撮った Opportunity のパノラマ`,
    ko: (l) =>
      `${G(l, 'Endeavour Crater')} 가장자리 Perseverance Valley 안에서 찍은 Opportunity의 파노라마`,
    nl: (l) =>
      `Panorama van Opportunity in Perseverance Valley op de rand van de ${G(l, 'Endeavour Crater')}`,
    'pt-BR': (l) =>
      `Panorama do Opportunity de dentro de Perseverance Valley, na borda da ${G(l, 'Endeavour Crater')}`,
    ru: () => `Панорама Opportunity из Perseverance Valley на краю кратера Индевор`,
    'sr-Cyrl': () =>
      `Панорама летелице Opportunity из Perseverance Valley на ободу кратера Индевор`,
    'zh-CN': (l) =>
      `Opportunity 在${G(l, 'Endeavour Crater')}边缘 Perseverance Valley 内拍摄的全景`,
  },
  'spirit/bonneville-approach': {
    'en-US': () =>
      `Spirit's view across the rock-strewn plain of Gusev Crater toward Bonneville Crater`,
    ar: (l) =>
      `منظر Spirit عبر سهل ${G(l, 'Gusev Crater')} المليء بالصخور نحو ${G(l, 'Bonneville Crater')}`,
    de: (l) =>
      `Blick von Spirit über die steinübersäte Ebene des ${G(l, 'Gusev Crater')}s zum ${G(l, 'Bonneville Crater')}`,
    es: (l) =>
      `Vista de Spirit sobre la llanura pedregosa del ${G(l, 'Gusev Crater')} hacia el ${G(l, 'Bonneville Crater')}`,
    fr: (l) =>
      `Vue de Spirit sur la plaine caillouteuse du ${G(l, 'Gusev Crater')} vers le ${G(l, 'Bonneville Crater')}`,
    hi: (l) =>
      `${G(l, 'Gusev Crater')} के पथरीले मैदान के पार ${G(l, 'Bonneville Crater')} की ओर Spirit का दृश्य`,
    it: (l) =>
      `Vista di Spirit sulla pianura sassosa del ${G(l, 'Gusev Crater')} verso il ${G(l, 'Bonneville Crater')}`,
    ja: (l) =>
      `${G(l, 'Gusev Crater')}の岩だらけの平原越しに${G(l, 'Bonneville Crater')}を望む Spirit の眺め`,
    ko: (l) =>
      `${G(l, 'Gusev Crater')}의 돌 많은 평원 너머 ${G(l, 'Bonneville Crater')}를 바라본 Spirit의 모습`,
    nl: (l) =>
      `Spirit kijkt over de stenige vlakte van de ${G(l, 'Gusev Crater')} naar de ${G(l, 'Bonneville Crater')}`,
    'pt-BR': (l) =>
      `Vista do Spirit sobre a planície pedregosa da ${G(l, 'Gusev Crater')} rumo à ${G(l, 'Bonneville Crater')}`,
    ru: () => `Вид Spirit на каменистую равнину кратера Гусев в сторону кратера Бонневиль`,
    'sr-Cyrl': () =>
      `Поглед летелице Spirit преко камените равнице кратера Гусев ка кратеру Боневил`,
    'zh-CN': (l) =>
      `Spirit 越过${G(l, 'Gusev Crater')}布满岩石的平原望向${G(l, 'Bonneville Crater')}`,
  },
  'spirit/bonneville-rim': {
    'en-US': () =>
      `Spirit's panorama from the rim of Bonneville Crater, a shallow bowl on the Gusev plain`,
    ar: (l) => `بانوراما Spirit من حافة ${G(l, 'Bonneville Crater')}، وهي حوض ضحل في سهل غوسيف`,
    de: (l) =>
      `Panorama von Spirit vom Rand des ${G(l, 'Bonneville Crater')}s, einer flachen Mulde in der Gusev-Ebene`,
    es: (l) =>
      `Panorama de Spirit desde el borde del ${G(l, 'Bonneville Crater')}, una hondonada en la llanura de Gusev`,
    fr: (l) =>
      `Panorama de Spirit depuis le bord du ${G(l, 'Bonneville Crater')}, une cuvette peu profonde de la plaine de Goussev`,
    hi: (l) =>
      `${G(l, 'Bonneville Crater')} के किनारे से Spirit का पैनोरमा, गुसेव मैदान में एक उथला कटोरा`,
    it: (l) =>
      `Panorama di Spirit dal bordo del ${G(l, 'Bonneville Crater')}, una conca poco profonda nella pianura di Gusev`,
    ja: (l) =>
      `${G(l, 'Bonneville Crater')}の縁から撮った Spirit のパノラマ。グセフの平原にある浅いくぼ地`,
    ko: (l) =>
      `${G(l, 'Bonneville Crater')} 가장자리에서 찍은 Spirit의 파노라마. 구세프 평원의 얕은 웅덩이`,
    nl: (l) =>
      `Panorama van Spirit vanaf de rand van de ${G(l, 'Bonneville Crater')}, een ondiepe kom in de Gusev-vlakte`,
    'pt-BR': (l) =>
      `Panorama do Spirit da borda da ${G(l, 'Bonneville Crater')}, uma bacia rasa na planície de Gusev`,
    ru: () => `Панорама Spirit с края кратера Бонневиль — неглубокой чаши на равнине Гусева`,
    'sr-Cyrl': () =>
      `Панорама летелице Spirit са обода кратера Боневил, плитке удолине на равници Гусева`,
    'zh-CN': (l) =>
      `Spirit 在${G(l, 'Bonneville Crater')}边缘拍摄的全景，这是古瑟夫平原上的一处浅坑`,
  },
  'spirit/larrys-lookout': {
    'en-US': () => `Spirit's panorama from Larry's Lookout on the climb up Husband Hill`,
    ar: (l) => `بانوراما Spirit من Larry's Lookout خلال صعود ${G(l, 'Husband Hill')}`,
    de: () => `Panorama von Spirit von Larry's Lookout beim Aufstieg auf den Husband Hill`,
    es: () => `Panorama de Spirit desde Larry's Lookout, en la subida a Husband Hill`,
    fr: () => `Panorama de Spirit depuis Larry's Lookout, pendant l’ascension de Husband Hill`,
    hi: (l) => `${G(l, 'Husband Hill')} की चढ़ाई के दौरान Larry's Lookout से Spirit का पैनोरमा`,
    it: () => `Panorama di Spirit da Larry's Lookout, durante la salita su Husband Hill`,
    ja: (l) => `${G(l, 'Husband Hill')}を登る途中、Larry's Lookout から撮った Spirit のパノラマ`,
    ko: (l) => `${G(l, 'Husband Hill')}을 오르던 중 Larry's Lookout에서 찍은 Spirit의 파노라마`,
    nl: () => `Panorama van Spirit vanaf Larry's Lookout, tijdens de klim op Husband Hill`,
    'pt-BR': (l) => `Panorama do Spirit de Larry's Lookout, na subida da ${G(l, 'Husband Hill')}`,
    ru: () => `Панорама Spirit с Larry's Lookout на подъёме на холм Хасбанда`,
    'sr-Cyrl': () => `Панорама летелице Spirit са Larry's Lookout при успону на брдо Хазбанд`,
    'zh-CN': (l) => `Spirit 攀登${G(l, 'Husband Hill')}途中在 Larry's Lookout 拍摄的全景`,
  },
  'spirit/beside-home-plate': {
    'en-US': () =>
      `Spirit's view beside Home Plate, with the rover's deck and solar panels in front`,
    ar: () => `منظر Spirit بجوار Home Plate، وفي المقدمة سطح المركبة وألواحها الشمسية`,
    de: () => `Blick von Spirit neben Home Plate, vorne Deck und Solarpaneele des Rovers`,
    es: () =>
      `Vista de Spirit junto a Home Plate, con la cubierta y los paneles solares del rover delante`,
    fr: () =>
      `Vue de Spirit à côté de Home Plate, le pont et les panneaux solaires du rover au premier plan`,
    hi: () => `Home Plate के पास Spirit का दृश्य, सामने रोवर का डेक और सौर पैनल`,
    it: () =>
      `Vista di Spirit accanto a Home Plate, con il ponte e i pannelli solari del rover davanti`,
    ja: () => `Home Plate のそばからの Spirit の眺め。手前にローバーの甲板と太陽電池パネル`,
    ko: () => `Home Plate 옆에서 본 Spirit의 모습. 앞쪽에 로버의 상판과 태양 전지판`,
    nl: () =>
      `Spirit naast Home Plate, met het dek en de zonnepanelen van de rover op de voorgrond`,
    'pt-BR': () =>
      `Vista do Spirit ao lado de Home Plate, com o convés e os painéis solares do rover à frente`,
    ru: () => `Вид Spirit рядом с Home Plate, на переднем плане палуба и солнечные панели ровера`,
    'sr-Cyrl': () =>
      `Поглед летелице Spirit поред Home Plate, у првом плану палуба и соларни панели ровера`,
    'zh-CN': () => `Spirit 在 Home Plate 旁的视角，前景是巡视器的甲板和太阳能板`,
  },
  'spirit/troy': {
    'en-US': () => `Spirit's view from Troy, where its wheels sank into soft soil`,
    ar: () => `منظر Spirit من Troy، حيث غاصت عجلاتها في تربة لينة`,
    de: () => `Blick von Spirit bei Troy, wo seine Räder im weichen Boden einsanken`,
    es: () => `Vista de Spirit desde Troy, donde sus ruedas se hundieron en suelo blando`,
    fr: () => `Vue de Spirit depuis Troy, où ses roues se sont enfoncées dans un sol meuble`,
    hi: () => `Troy से Spirit का दृश्य, जहाँ उसके पहिये नरम मिट्टी में धँस गए`,
    it: () => `Vista di Spirit da Troy, dove le sue ruote affondarono nel suolo soffice`,
    ja: () => `Troy からの Spirit の眺め。ここで車輪が柔らかい土に沈み込んだ`,
    ko: () => `Troy에서 본 Spirit의 모습. 바퀴가 부드러운 흙에 빠진 곳`,
    nl: () => `Spirit bij Troy, waar zijn wielen wegzakten in zachte grond`,
    'pt-BR': () => `Vista do Spirit em Troy, onde suas rodas afundaram no solo macio`,
    ru: () => `Вид Spirit с места Troy, где его колёса увязли в мягком грунте`,
    'sr-Cyrl': () => `Поглед летелице Spirit из Troy, где су јој точкови упали у меко тло`,
    'zh-CN': () => `Spirit 在 Troy 的视角，它的车轮在这里陷入松软的土壤`,
  },
  'curiosity/yellowknife-overlook': {
    'en-US': () =>
      `Curiosity's panorama of the shallow Yellowknife Bay basin, with the rover's wheels at left`,
    ar: () => `بانوراما Curiosity لحوض Yellowknife Bay الضحل، وعجلات المركبة على اليسار`,
    de: () =>
      `Panorama von Curiosity über die flache Senke Yellowknife Bay, links die Räder des Rovers`,
    es: () =>
      `Panorama de Curiosity de la depresión poco profunda de Yellowknife Bay, con las ruedas del rover a la izquierda`,
    fr: () =>
      `Panorama de Curiosity sur la dépression peu profonde de Yellowknife Bay, roues du rover à gauche`,
    hi: () => `उथले Yellowknife Bay बेसिन का Curiosity पैनोरमा, बाईं ओर रोवर के पहिये`,
    it: () =>
      `Panorama di Curiosity sulla conca poco profonda di Yellowknife Bay, con le ruote del rover a sinistra`,
    ja: () => `浅いくぼ地 Yellowknife Bay を写した Curiosity のパノラマ。左にローバーの車輪`,
    ko: () => `얕은 Yellowknife Bay 분지를 담은 Curiosity의 파노라마. 왼쪽에 로버의 바퀴`,
    nl: () =>
      `Panorama van Curiosity over de ondiepe kom Yellowknife Bay, links de wielen van de rover`,
    'pt-BR': () =>
      `Panorama do Curiosity da depressão rasa de Yellowknife Bay, com as rodas do rover à esquerda`,
    ru: () => `Панорама Curiosity неглубокой котловины Yellowknife Bay, слева колёса ровера`,
    'sr-Cyrl': () =>
      `Панорама летелице Curiosity плитке удолине Yellowknife Bay, лево точкови ровера`,
    'zh-CN': () => `Curiosity 拍摄的 Yellowknife Bay 浅洼地全景，左侧是巡视器的车轮`,
  },
  'curiosity/marias-pass': {
    'en-US': () =>
      `Curiosity's view of pale layered mudstone meeting darker sandstone near Marias Pass`,
    ar: () => `منظر Curiosity لصخر طيني فاتح متطبق يلتقي بحجر رملي أغمق قرب Marias Pass`,
    de: () =>
      `Blick von Curiosity auf hellen, geschichteten Tonstein, der nahe Marias Pass auf dunkleren Sandstein trifft`,
    es: () =>
      `Vista de Curiosity de lutita clara estratificada que se une a arenisca más oscura cerca de Marias Pass`,
    fr: () =>
      `Vue de Curiosity sur un mudstone clair stratifié rejoignant un grès plus sombre près de Marias Pass`,
    hi: () => `Marias Pass के पास गहरे बलुआ पत्थर से मिलते हल्के परतदार पंकाश्म का Curiosity दृश्य`,
    it: () =>
      `Vista di Curiosity di argillite chiara stratificata che incontra arenaria più scura vicino a Marias Pass`,
    ja: () => `Marias Pass 付近で、明るい層状の泥岩と暗い砂岩が接する様子を写した Curiosity の眺め`,
    ko: () =>
      `Marias Pass 근처에서 밝은 층상 이암과 더 어두운 사암이 만나는 곳을 담은 Curiosity의 모습`,
    nl: () =>
      `Curiosity bij Marias Pass: licht, gelaagd kleisteen dat overgaat in donkerder zandsteen`,
    'pt-BR': () =>
      `Vista do Curiosity de argilito claro em camadas encontrando arenito mais escuro perto de Marias Pass`,
    ru: () =>
      `Вид Curiosity на светлый слоистый аргиллит, граничащий с более тёмным песчаником у Marias Pass`,
    'sr-Cyrl': () =>
      `Поглед летелице Curiosity на светли слојевити муљњак који се спаја са тамнијим пешчаром код Marias Pass`,
    'zh-CN': () => `Curiosity 在 Marias Pass 附近拍摄的浅色层状泥岩与较暗砂岩交界处`,
  },
  'curiosity/murray-buttes': {
    'en-US': () =>
      `Curiosity's panorama among the flat-topped mesas of Murray Buttes on Mount Sharp`,
    ar: (l) =>
      `بانوراما Curiosity بين الهضاب المسطحة القمم في Murray Buttes على ${G(l, 'Mount Sharp')}`,
    de: () => `Panorama von Curiosity zwischen den Tafelbergen von Murray Buttes am Mount Sharp`,
    es: (l) =>
      `Panorama de Curiosity entre las mesas de cima plana de Murray Buttes, en el ${G(l, 'Mount Sharp')}`,
    fr: (l) =>
      `Panorama de Curiosity parmi les mesas au sommet plat de Murray Buttes, sur le ${G(l, 'Mount Sharp')}`,
    hi: (l) =>
      `${G(l, 'Mount Sharp')} पर Murray Buttes के सपाट शिखर वाले टीलों के बीच Curiosity का पैनोरमा`,
    it: (l) =>
      `Panorama di Curiosity tra le mesas dalla cima piatta di Murray Buttes, sul ${G(l, 'Mount Sharp')}`,
    ja: (l) =>
      `${G(l, 'Mount Sharp')}の Murray Buttes で、頂の平らなメサに囲まれた Curiosity のパノラマ`,
    ko: (l) =>
      `${G(l, 'Mount Sharp')}의 Murray Buttes에서 꼭대기가 평평한 메사들 사이를 담은 Curiosity의 파노라마`,
    nl: () => `Panorama van Curiosity tussen de tafelbergen van Murray Buttes op Mount Sharp`,
    'pt-BR': (l) =>
      `Panorama do Curiosity entre as mesas de topo plano de Murray Buttes, no ${G(l, 'Mount Sharp')}`,
    ru: () => `Панорама Curiosity среди столовых гор Murray Buttes на горе Шарп`,
    'sr-Cyrl': () =>
      `Панорама летелице Curiosity међу заравњеним брдима Murray Buttes на планини Шарп`,
    'zh-CN': (l) => `Curiosity 在${G(l, 'Mount Sharp')} Murray Buttes 平顶方山之间拍摄的全景`,
  },
  'curiosity/vera-rubin-ridge': {
    'en-US': () =>
      `Curiosity's view of the layered face of Vera Rubin Ridge rising above the rover`,
    ar: (l) => `منظر Curiosity للواجهة المتطبقة لـ${G(l, 'Vera Rubin Ridge')} المرتفعة فوق المركبة`,
    de: () =>
      `Blick von Curiosity auf die geschichtete Flanke des Vera Rubin Ridge, die sich über dem Rover erhebt`,
    es: (l) =>
      `Vista de Curiosity de la cara estratificada de la ${G(l, 'Vera Rubin Ridge')}, que se alza sobre el rover`,
    fr: (l) =>
      `Vue de Curiosity sur le flanc stratifié de la ${G(l, 'Vera Rubin Ridge')}, au-dessus du rover`,
    hi: (l) => `रोवर के ऊपर उठती ${G(l, 'Vera Rubin Ridge')} की परतदार ढलान का Curiosity दृश्य`,
    it: (l) =>
      `Vista di Curiosity della parete stratificata della ${G(l, 'Vera Rubin Ridge')}, che si alza sopra il rover`,
    ja: (l) =>
      `ローバーの上にそびえる${G(l, 'Vera Rubin Ridge')}の層状の斜面を写した Curiosity の眺め`,
    ko: (l) => `로버 위로 솟은 ${G(l, 'Vera Rubin Ridge')}의 층상 경사면을 담은 Curiosity의 모습`,
    nl: () =>
      `Curiosity kijkt op de gelaagde flank van Vera Rubin Ridge die boven de rover uitrijst`,
    'pt-BR': (l) =>
      `Vista do Curiosity da face em camadas do ${G(l, 'Vera Rubin Ridge')}, que se ergue acima do rover`,
    ru: () => `Вид Curiosity на слоистый склон гряды Веры Рубин, поднимающийся над ровером`,
    'sr-Cyrl': () =>
      `Поглед летелице Curiosity на слојевиту страну гребена Вера Рубин изнад ровера`,
    'zh-CN': (l) => `Curiosity 仰望高出巡视器的${G(l, 'Vera Rubin Ridge')}层状坡面`,
  },
  'curiosity/glen-torridon': {
    'en-US': () =>
      `Curiosity's wheel and name plate beside pale clay-bearing rock in Glen Torridon`,
    ar: () => `عجلة Curiosity ولوحة اسمها بجانب صخور فاتحة غنية بالطين في Glen Torridon`,
    de: () =>
      `Rad und Namensschild von Curiosity neben hellem, tonhaltigem Gestein in Glen Torridon`,
    es: () =>
      `Rueda y placa con el nombre de Curiosity junto a roca clara con arcillas en Glen Torridon`,
    fr: () =>
      `Roue et plaque au nom de Curiosity près d’une roche claire riche en argiles à Glen Torridon`,
    hi: () =>
      `Glen Torridon में मिट्टी-युक्त हल्की चट्टान के पास Curiosity का पहिया और नाम-पट्टिका`,
    it: () =>
      `Ruota e targa con il nome di Curiosity accanto a roccia chiara ricca di argille a Glen Torridon`,
    ja: () => `Glen Torridon の粘土を含む明るい岩のそばにある Curiosity の車輪と名前のプレート`,
    ko: () => `Glen Torridon의 점토가 든 밝은 암석 옆 Curiosity의 바퀴와 이름판`,
    nl: () => `Wiel en naamplaat van Curiosity naast licht, kleihoudend gesteente in Glen Torridon`,
    'pt-BR': () =>
      `Roda e placa com o nome do Curiosity ao lado de rocha clara rica em argila em Glen Torridon`,
    ru: () =>
      `Колесо и табличка с именем Curiosity рядом со светлой глиносодержащей породой в Glen Torridon`,
    'sr-Cyrl': () =>
      `Точак и плочица са именом летелице Curiosity поред светле стене са глином у Glen Torridon`,
    'zh-CN': () => `Glen Torridon 含黏土的浅色岩石旁，Curiosity 的车轮和名牌`,
  },
  'curiosity/gediz-vallis': {
    'en-US': () => `Curiosity's panorama inside the Gediz Vallis channel on Mount Sharp`,
    ar: (l) => `بانوراما Curiosity داخل قناة Gediz Vallis على ${G(l, 'Mount Sharp')}`,
    de: () => `Panorama von Curiosity im Gediz-Vallis-Kanal am Mount Sharp`,
    es: (l) => `Panorama de Curiosity dentro del canal Gediz Vallis, en el ${G(l, 'Mount Sharp')}`,
    fr: (l) => `Panorama de Curiosity dans le chenal Gediz Vallis, sur le ${G(l, 'Mount Sharp')}`,
    hi: (l) => `${G(l, 'Mount Sharp')} पर Gediz Vallis वाहिका के भीतर Curiosity का पैनोरमा`,
    it: (l) => `Panorama di Curiosity dentro il canale Gediz Vallis, sul ${G(l, 'Mount Sharp')}`,
    ja: (l) => `${G(l, 'Mount Sharp')}の Gediz Vallis 水路の中から撮った Curiosity のパノラマ`,
    ko: (l) => `${G(l, 'Mount Sharp')}의 Gediz Vallis 수로 안에서 찍은 Curiosity의 파노라마`,
    nl: () => `Panorama van Curiosity in de geul Gediz Vallis op Mount Sharp`,
    'pt-BR': (l) => `Panorama do Curiosity dentro do canal Gediz Vallis, no ${G(l, 'Mount Sharp')}`,
    ru: () => `Панорама Curiosity в русле Gediz Vallis на горе Шарп`,
    'sr-Cyrl': () => `Панорама летелице Curiosity у кориту Gediz Vallis на планини Шарп`,
    'zh-CN': (l) => `Curiosity 在${G(l, 'Mount Sharp')} Gediz Vallis 河道内拍摄的全景`,
  },
  'perseverance/landing-pan': {
    'en-US': () =>
      `Perseverance's first panorama from its landing site, with the rover's deck in front`,
    ar: () => `أول بانوراما لـ Perseverance من موقع هبوطها، وفي المقدمة سطح المركبة`,
    de: () => `Erstes Panorama von Perseverance vom Landeplatz, vorne das Deck des Rovers`,
    es: () =>
      `Primer panorama de Perseverance desde su lugar de aterrizaje, con la cubierta del rover delante`,
    fr: () =>
      `Premier panorama de Perseverance depuis son site d’atterrissage, le pont du rover au premier plan`,
    hi: () => `लैंडिंग स्थल से Perseverance का पहला पैनोरमा, सामने रोवर का डेक`,
    it: () =>
      `Primo panorama di Perseverance dal punto di atterraggio, con il ponte del rover davanti`,
    ja: () => `着陸地点から撮った Perseverance の最初のパノラマ。手前にローバーの甲板`,
    ko: () => `착륙 지점에서 찍은 Perseverance의 첫 파노라마. 앞쪽에 로버의 상판`,
    nl: () =>
      `Eerste panorama van Perseverance vanaf de landingsplek, met het dek van de rover op de voorgrond`,
    'pt-BR': () =>
      `Primeiro panorama do Perseverance do local de pouso, com o convés do rover à frente`,
    ru: () => `Первая панорама Perseverance с места посадки, на переднем плане палуба ровера`,
    'sr-Cyrl': () =>
      `Прва панорама летелице Perseverance са места слетања, у првом плану палуба ровера`,
    'zh-CN': () => `Perseverance 在着陆点拍摄的第一张全景，前景是巡视器甲板`,
  },
  'perseverance/van-zyl-overlook': {
    'en-US': () =>
      `Perseverance's panorama from Van Zyl Overlook, where it watched Ingenuity's first flights`,
    ar: () => `بانوراما Perseverance من Van Zyl Overlook، حيث راقبت أولى رحلات Ingenuity`,
    de: () =>
      `Panorama von Perseverance vom Van Zyl Overlook, von wo es Ingenuitys erste Flüge beobachtete`,
    es: () =>
      `Panorama de Perseverance desde Van Zyl Overlook, donde vio los primeros vuelos de Ingenuity`,
    fr: () =>
      `Panorama de Perseverance depuis Van Zyl Overlook, d’où il a suivi les premiers vols d’Ingenuity`,
    hi: () =>
      `Van Zyl Overlook से Perseverance का पैनोरमा, जहाँ से उसने Ingenuity की पहली उड़ानें देखीं`,
    it: () =>
      `Panorama di Perseverance da Van Zyl Overlook, da dove seguì i primi voli di Ingenuity`,
    ja: () => `Ingenuity の初飛行を見守った Van Zyl Overlook から撮った Perseverance のパノラマ`,
    ko: () => `Ingenuity의 첫 비행을 지켜본 Van Zyl Overlook에서 찍은 Perseverance의 파노라마`,
    nl: () =>
      `Panorama van Perseverance vanaf Van Zyl Overlook, vanwaar het de eerste vluchten van Ingenuity volgde`,
    'pt-BR': () =>
      `Panorama do Perseverance de Van Zyl Overlook, de onde acompanhou os primeiros voos do Ingenuity`,
    ru: () =>
      `Панорама Perseverance с Van Zyl Overlook, откуда он наблюдал первые полёты Ingenuity`,
    'sr-Cyrl': () =>
      `Панорама летелице Perseverance са Van Zyl Overlook, одакле је пратила прве летове Ingenuity`,
    'zh-CN': () =>
      `Perseverance 在 Van Zyl Overlook 拍摄的全景，它在这里观看了 Ingenuity 的首次飞行`,
  },
  'perseverance/south-seitah': {
    'en-US': () => `Perseverance's view of the rocky Séítah region on the floor of Jezero Crater`,
    ar: (l) => `منظر Perseverance لمنطقة Séítah الصخرية في قاع ${G(l, 'Jezero Crater')}`,
    de: (l) =>
      `Blick von Perseverance auf das felsige Gebiet Séítah am Boden des ${G(l, 'Jezero Crater')}s`,
    es: (l) =>
      `Vista de Perseverance de la rocosa región de Séítah en el fondo del ${G(l, 'Jezero Crater')}`,
    fr: (l) =>
      `Vue de Perseverance sur la région rocheuse de Séítah, au fond du ${G(l, 'Jezero Crater')}`,
    hi: (l) => `${G(l, 'Jezero Crater')} के तल पर चट्टानी Séítah क्षेत्र का Perseverance दृश्य`,
    it: (l) =>
      `Vista di Perseverance della rocciosa regione di Séítah sul fondo del ${G(l, 'Jezero Crater')}`,
    ja: (l) =>
      `${G(l, 'Jezero Crater')}の底にある岩だらけの Séítah 地域を写した Perseverance の眺め`,
    ko: (l) => `${G(l, 'Jezero Crater')} 바닥의 암석 많은 Séítah 지역을 담은 Perseverance의 모습`,
    nl: (l) =>
      `Perseverance kijkt op het rotsige gebied Séítah op de bodem van de ${G(l, 'Jezero Crater')}`,
    'pt-BR': (l) =>
      `Vista do Perseverance da rochosa região de Séítah, no fundo da ${G(l, 'Jezero Crater')}`,
    ru: () => `Вид Perseverance на каменистый район Séítah на дне кратера Езеро`,
    'sr-Cyrl': () =>
      `Поглед летелице Perseverance на стеновиту област Séítah на дну кратера Језеро`,
    'zh-CN': (l) => `Perseverance 拍摄的${G(l, 'Jezero Crater')}底部多岩的 Séítah 地区`,
  },
  'perseverance/delta-approach': {
    'en-US': () => `Perseverance's panorama of the Jezero delta rising ahead of the rover`,
    ar: () => `بانوراما Perseverance لدلتا جيزيرو المرتفعة أمام المركبة`,
    de: () => `Panorama von Perseverance auf das Jezero-Delta, das sich vor dem Rover erhebt`,
    es: () => `Panorama de Perseverance del delta de Jezero, que se alza delante del rover`,
    fr: () => `Panorama de Perseverance sur le delta de Jezero qui s’élève devant le rover`,
    hi: () => `रोवर के आगे उठते जेज़ेरो डेल्टा का Perseverance पैनोरमा`,
    it: () => `Panorama di Perseverance del delta di Jezero che si alza davanti al rover`,
    ja: () => `ローバーの前方にそびえるジェゼロ・デルタを写した Perseverance のパノラマ`,
    ko: () => `로버 앞에 솟은 예제로 삼각주를 담은 Perseverance의 파노라마`,
    nl: () => `Panorama van Perseverance op de Jezero-delta die voor de rover oprijst`,
    'pt-BR': () => `Panorama do Perseverance do delta de Jezero, que se ergue à frente do rover`,
    ru: () => `Панорама Perseverance: дельта Езеро, поднимающаяся впереди ровера`,
    'sr-Cyrl': () => `Панорама летелице Perseverance: делта Језеро која се уздиже испред ровера`,
    'zh-CN': () => `Perseverance 拍摄的全景：耶泽罗三角洲在巡视器前方隆起`,
  },
  'perseverance/bright-angel': {
    'en-US': () =>
      `Perseverance's panorama of Bright Angel, where an ancient river flowed into Jezero Crater`,
    ar: (l) =>
      `بانوراما Perseverance لـ Bright Angel، حيث صبّ نهر قديم في ${G(l, 'Jezero Crater')}`,
    de: (l) =>
      `Panorama von Perseverance von Bright Angel, wo einst ein Fluss in den ${G(l, 'Jezero Crater')} mündete`,
    es: (l) =>
      `Panorama de Perseverance de Bright Angel, donde un antiguo río desembocaba en el ${G(l, 'Jezero Crater')}`,
    fr: (l) =>
      `Panorama de Perseverance de Bright Angel, où une ancienne rivière se jetait dans le ${G(l, 'Jezero Crater')}`,
    hi: (l) =>
      `Bright Angel का Perseverance पैनोरमा, जहाँ एक प्राचीन नदी ${G(l, 'Jezero Crater')} में बहती थी`,
    it: (l) =>
      `Panorama di Perseverance di Bright Angel, dove un antico fiume sfociava nel ${G(l, 'Jezero Crater')}`,
    ja: (l) =>
      `古代の川が${G(l, 'Jezero Crater')}に流れ込んでいた Bright Angel を写した Perseverance のパノラマ`,
    ko: (l) =>
      `고대 강이 ${G(l, 'Jezero Crater')}로 흘러들던 Bright Angel을 담은 Perseverance의 파노라마`,
    nl: (l) =>
      `Panorama van Perseverance van Bright Angel, waar ooit een rivier de ${G(l, 'Jezero Crater')} in stroomde`,
    'pt-BR': (l) =>
      `Panorama do Perseverance de Bright Angel, onde um antigo rio desaguava na ${G(l, 'Jezero Crater')}`,
    ru: () => `Панорама Perseverance места Bright Angel, где древняя река впадала в кратер Езеро`,
    'sr-Cyrl': () =>
      `Панорама летелице Perseverance места Bright Angel, где се древна река уливала у кратер Језеро`,
    'zh-CN': (l) =>
      `Perseverance 拍摄的 Bright Angel 全景，古老的河流曾在这里注入${G(l, 'Jezero Crater')}`,
  },
  'perseverance/toward-crater-rim': {
    'en-US': () => `Perseverance's view up the slope toward the rim of Jezero Crater`,
    ar: (l) => `منظر Perseverance صعودًا على المنحدر نحو حافة ${G(l, 'Jezero Crater')}`,
    de: (l) => `Blick von Perseverance den Hang hinauf zum Rand des ${G(l, 'Jezero Crater')}s`,
    es: (l) => `Vista de Perseverance ladera arriba hacia el borde del ${G(l, 'Jezero Crater')}`,
    fr: (l) => `Vue de Perseverance en remontant la pente vers le bord du ${G(l, 'Jezero Crater')}`,
    hi: (l) => `${G(l, 'Jezero Crater')} के किनारे की ओर ढलान पर ऊपर Perseverance का दृश्य`,
    it: (l) => `Vista di Perseverance su per il pendio verso il bordo del ${G(l, 'Jezero Crater')}`,
    ja: (l) => `${G(l, 'Jezero Crater')}の縁へ向かう斜面を見上げる Perseverance の眺め`,
    ko: (l) => `${G(l, 'Jezero Crater')} 가장자리를 향한 비탈을 올려다본 Perseverance의 모습`,
    nl: (l) => `Perseverance kijkt de helling op naar de rand van de ${G(l, 'Jezero Crater')}`,
    'pt-BR': (l) => `Vista do Perseverance encosta acima, rumo à borda da ${G(l, 'Jezero Crater')}`,
    ru: () => `Вид Perseverance вверх по склону к краю кратера Езеро`,
    'sr-Cyrl': () => `Поглед летелице Perseverance уз падину ка ободу кратера Језеро`,
    'zh-CN': (l) => `Perseverance 沿斜坡仰望${G(l, 'Jezero Crater')}边缘`,
  },
  'zhurong/parachute-backshell': {
    'en-US': () =>
      `Zhurong's rear camera view of its parachute and backshell lying on Utopia Planitia`,
    ar: (l) =>
      `منظر الكاميرا الخلفية لـ Zhurong لمظلتها وغطائها الخلفي على ${G(l, 'Utopia Planitia')}`,
    de: (l) =>
      `Blick der Heckkamera von Zhurong auf Fallschirm und Rückschale auf ${G(l, 'Utopia Planitia')}`,
    es: (l) =>
      `Vista de la cámara trasera de Zhurong de su paracaídas y su escudo trasero en ${G(l, 'Utopia Planitia')}`,
    fr: (l) =>
      `Vue de la caméra arrière de Zhurong sur son parachute et son bouclier arrière, posés sur ${G(l, 'Utopia Planitia')}`,
    hi: (l) =>
      `${G(l, 'Utopia Planitia')} पर पड़े पैराशूट और पिछले कवच का Zhurong के पिछले कैमरे से दृश्य`,
    it: (l) =>
      `Vista della camera posteriore di Zhurong del suo paracadute e dello scudo posteriore su ${G(l, 'Utopia Planitia')}`,
    ja: (l) =>
      `${G(l, 'Utopia Planitia')}に横たわるパラシュートとバックシェルを写した Zhurong の後方カメラの眺め`,
    ko: (l) =>
      `${G(l, 'Utopia Planitia')}에 놓인 낙하산과 후방 덮개를 찍은 Zhurong 후방 카메라의 모습`,
    nl: (l) =>
      `De achtercamera van Zhurong ziet zijn parachute en achterschild op ${G(l, 'Utopia Planitia')} liggen`,
    'pt-BR': (l) =>
      `Vista da câmera traseira do Zhurong do paraquedas e do escudo traseiro em ${G(l, 'Utopia Planitia')}`,
    ru: (l) =>
      `Вид задней камеры Zhurong на его парашют и задний кожух, лежащие на ${G(l, 'Utopia Planitia').replace('Равнина', 'равнине')}`,
    'sr-Cyrl': (l) =>
      `Поглед задње камере летелице Zhurong на падобран и задњи омотач који леже на ${G(l, 'Utopia Planitia').replace('Равница Утопија', 'Равници Утопији')}`,
    'zh-CN': (l) => `Zhurong 后置相机拍摄的、落在${G(l, 'Utopia Planitia')}上的降落伞和背罩`,
  },
  'zhurong/selfie-with-lander': {
    'en-US': () =>
      `Zhurong beside the Tianwen-1 lander, photographed by a camera the rover set down on the ground`,
    ar: () =>
      `Zhurong بجوار مركبة الهبوط Tianwen-1، صوّرتها كاميرا وضعتها المركبة الجوالة على الأرض`,
    de: () =>
      `Zhurong neben dem Tianwen-1-Lander, aufgenommen von einer Kamera, die der Rover auf dem Boden abgesetzt hatte`,
    es: () =>
      `Zhurong junto al módulo de aterrizaje de Tianwen-1, fotografiado por una cámara que el rover dejó en el suelo`,
    fr: () =>
      `Zhurong à côté de l’atterrisseur de Tianwen-1, photographié par une caméra que le rover a déposée au sol`,
    hi: () => `Tianwen-1 लैंडर के पास Zhurong, रोवर द्वारा ज़मीन पर रखे कैमरे से खींचा गया`,
    it: () =>
      `Zhurong accanto al lander di Tianwen-1, fotografato da una camera che il rover aveva posato a terra`,
    ja: () => `Tianwen-1 着陸機のそばの Zhurong。ローバーが地面に置いたカメラで撮影`,
    ko: () => `Tianwen-1 착륙선 옆의 Zhurong. 로버가 땅에 내려놓은 카메라로 찍었다`,
    nl: () =>
      `Zhurong naast de Tianwen-1-lander, gefotografeerd door een camera die de rover op de grond had gezet`,
    'pt-BR': () =>
      `Zhurong ao lado do módulo de pouso da Tianwen-1, fotografado por uma câmera que o rover deixou no chão`,
    ru: () =>
      `Zhurong рядом с посадочной платформой Tianwen-1 — снимок камеры, которую ровер оставил на грунте`,
    'sr-Cyrl': () =>
      `Zhurong поред модула за слетање Tianwen-1, снимак камере коју је ровер спустио на тло`,
    'zh-CN': () => `Zhurong 与 Tianwen-1 着陆器的合影，由巡视器放置在地面上的相机拍摄`,
  },
};

const list = JSON.parse(fs.readFileSync('scripts/hotspots/route-photos.json', 'utf8'));
let n = 0;
for (const loc of LOCS) {
  const p = `static/data/image-alt-text/${loc}.json`;
  const raw = fs.readFileSync(p, 'utf8');
  const d = JSON.parse(raw);
  for (const ph of list) {
    const key = `${ph.rover}/${ph.id}`;
    const fn = T[key]?.[loc];
    if (!fn) throw new Error(`no ${loc} text for ${key}`);
    const text = fn(loc);
    if (!text || /undefined/.test(text)) throw new Error(`${loc} ${key}`);
    d[`/images/mars-sites/${key.replace('/', '/route/')}.webp`] = text;
    n++;
  }
  const indent = raw.match(/\n( +)"/)?.[1].length ?? 2;
  fs.writeFileSync(p, JSON.stringify(d, null, indent) + '\n');
}
console.log(`wrote ${n} photo alt texts (${list.length} × ${LOCS.length})`);
