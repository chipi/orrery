// L43 (M87 is "Virgo A" in the record, plain "M87" in text), the Helix knot count ("thousands"), and the
// core-collapsed cluster definition, after add-definitions.mjs. Sources read 2026-11-13: en.wikipedia Messier_87
// ("also known as Virgo A or NGC 4486"; NASA Messier 87 page names no common name); en.wikipedia Globular_cluster
// ("About 20% of the globular clusters have undergone a process termed core collapse"; massive stars sink to the
// core, the core loses kinetic energy and the central region becomes densely crowded, with a power-law cusp);
// en.wikipedia Metallicity ("the abundance of elements present in an object that are heavier than hydrogen and
// helium": the metallicity definition stands unchanged). Swinburne COSMOS was refusing connections. Run from the repo root.
import fs from 'node:fs';
const R = 'i18n-src/';
const V = 'universe/structures/virgo-cluster.json';
const H = 'universe/deep-sky/ngc-7293.json';
const G = 'glossary/terms.json';
const rows = [
  // M87 name
  ['en-US', V, 'around the Virgo Galaxy (M87), at 16.7', 'around M87, at 16.7'],
  ['ar', V, 'حول مجرة العذراء (M87)، على 16.7', 'حول M87، على 16.7'],
  ['de', V, 'um die Virgo-Galaxie (M87), bei 16,7', 'um M87, bei 16,7'],
  ['es', V, 'alrededor de la galaxia de Virgo (M87), a 16,7', 'alrededor de M87, a 16,7'],
  ['fr', V, 'autour de la galaxie de la Vierge (M87), à 16,7', 'autour de M87, à 16,7'],
  ['hi', V, 'कन्या आकाशगंगा (M87), 16.7 पर', 'M87, 16.7 पर'],
  ['it', V, 'attorno alla galassia della Vergine (M87), a 16,7', 'attorno a M87, a 16,7'],
  ['ja', V, 'おとめ座銀河(M87、16.7メガパーセク)とM49', 'M87(16.7メガパーセク)とM49'],
  ['ko', V, '처녀자리 은하(M87, 16.7메가파섹)와 M49', 'M87(16.7메가파섹)과 M49'],
  ['nl', V, 'rond het Virgostelsel (M87), op 16,7', 'rond M87, op 16,7'],
  ['pt-BR', V, 'ao redor da Galáxia de Virgem (M87), a 16,7', 'ao redor de M87, a 16,7'],
  ['ru', V, 'вокруг галактики Девы (M87) на 16,7', 'вокруг M87 на 16,7'],
  ['sr-Cyrl', V, 'око галаксије Девица (M87), на 16,7', 'око M87, на 16,7'],
  ['zh-CN', V, '在室女座星系（M87，16.7）和M49', '在M87（16.7）和M49'],
  // Helix knots
  [
    'en-US',
    H,
    'It holds tens of thousands of cometary knots',
    'It holds thousands of cometary knots',
  ],
  ['ru', H, 'В ней десятки тысяч кометных узлов', 'В ней тысячи кометных узлов'],
  ['ja', H, '数万個の彗星状の塊が含まれ', '数千個の彗星状の塊が含まれ'],
  ['zh-CN', H, '它含有数万个彗星状结节', '它含有数千个彗星状结节'],
  ['ko', H, '수만 개의 혜성 모양 매듭이', '수천 개의 혜성 모양 매듭이'],
  ['hi', H, 'दसियों हज़ार धूमकेतु जैसी गाँठें', 'हज़ारों धूमकेतु जैसी गाँठें'],
  ['ar', H, 'عشرات الآلاف من العقد المذنبية', 'آلاف العقد المذنبية'],
  ['sr-Cyrl', H, 'Садржи десетине хиљада кометних чворова', 'Садржи хиљаде кометних чворова'],
  ['de', H, 'Zehntausende kometenartige Knoten', 'Tausende kometenartige Knoten'],
  ['fr', H, 'des dizaines de milliers de nœuds cométaires', 'des milliers de nœuds cométaires'],
  ['es', H, 'decenas de miles de nudos cometarios', 'miles de nudos cometarios'],
  ['it', H, 'decine di migliaia di nodi cometari', 'migliaia di nodi cometari'],
  ['nl', H, 'tienduizenden komeetachtige knopen', 'duizenden komeetachtige knopen'],
  ['pt-BR', H, 'dezenas de milhares de nós cometários', 'milhares de nós cometários'],
  // core-collapsed cluster
  [
    'en-US',
    G,
    'unusually dense knot of stars, the end point of its dynamical evolution.',
    'unusually dense knot of stars, after its heavier stars sank inward and the core lost energy.',
  ],
  [
    'ru',
    G,
    'клубок звёзд, — конечная стадия его динамической эволюции.',
    'клубок звёзд после того, как его тяжёлые звёзды опустились к центру, а ядро потеряло энергию.',
  ],
  [
    'ja',
    G,
    '力学的進化の最終段階にあたる。',
    '重い星が中心へ沈み、核がエネルギーを失った結果である。',
  ],
  ['zh-CN', G, '是其动力学演化的终点。', '起因是较重的恒星向中心下沉、核心损失了能量。'],
  [
    'ko',
    G,
    '역학적 진화의 마지막 단계입니다.',
    '무거운 별이 중심으로 가라앉고 핵이 에너지를 잃은 결과입니다.',
  ],
  [
    'hi',
    G,
    'यह उसके गतिकीय विकास का अंतिम पड़ाव है।',
    'क्योंकि उसके भारी तारे केंद्र की ओर धँस गए और केंद्रीय भाग ने ऊर्जा खो दी।',
  ],
  [
    'ar',
    G,
    'وهي المرحلة الأخيرة من تطوره الديناميكي.',
    'بعد أن غاصت نجومه الأثقل نحو المركز وفقدت نواته طاقتها.',
  ],
  [
    'sr-Cyrl',
    G,
    'чвор звезда, што је крајња тачка његове динамичке еволуције.',
    'чвор звезда пошто су се његове теже звезде спустиле ка средишту, а језгро изгубило енергију.',
  ],
  [
    'de',
    G,
    'Sternknäuel zusammengezogen hat, dem Endpunkt seiner dynamischen Entwicklung.',
    'Sternknäuel zusammengezogen hat, nachdem seine schwereren Sterne nach innen gesunken sind und der Kern Energie verloren hat.',
  ],
  [
    'fr',
    G,
    'exceptionnellement dense, aboutissement de son évolution dynamique.',
    "exceptionnellement dense, après que ses étoiles les plus lourdes ont coulé vers l'intérieur et que le cœur a perdu de l'énergie.",
  ],
  [
    'es',
    G,
    'inusualmente denso, el punto final de su evolución dinámica.',
    'inusualmente denso, tras hundirse hacia dentro sus estrellas más pesadas y perder energía el núcleo.',
  ],
  [
    'it',
    G,
    "insolitamente denso, punto d'arrivo della sua evoluzione dinamica.",
    "insolitamente denso, dopo che le sue stelle più pesanti sono affondate verso l'interno e il nucleo ha perso energia.",
  ],
  [
    'nl',
    G,
    'kluwen sterren, het eindpunt van zijn dynamische evolutie.',
    'kluwen sterren, nadat de zwaardere sterren naar binnen zijn gezonken en de kern energie verloor.',
  ],
  [
    'pt-BR',
    G,
    'incomumente denso, o ponto final de sua evolução dinâmica.',
    'incomumente denso, depois que suas estrelas mais pesadas afundaram para dentro e o núcleo perdeu energia.',
  ],
];
const files = new Map();
const errs = [];
for (const [loc, rel, from, to] of rows) {
  const f = `${R}${loc}/${rel}`;
  const s = files.get(f) ?? fs.readFileSync(f, 'utf8');
  const n = s.split(from).length - 1;
  if (n !== 1) {
    errs.push(`${f}: "${from}" found ${n}x`);
    continue;
  }
  files.set(
    f,
    s.replace(from, () => to),
  );
}
if (errs.length) {
  console.log(errs.join('\n'));
  process.exit(1);
}
for (const [f, s] of files) {
  JSON.parse(s);
  fs.writeFileSync(f, s);
}
console.log('edited', files.size, 'files,', rows.length, 'rows');
