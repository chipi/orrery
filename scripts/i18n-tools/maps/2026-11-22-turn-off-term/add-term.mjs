// 0.9.11 C5 (star clusters article): the glossary binding for "main-sequence turn-off", its
// definition in 14 locales, and `_read_more` to observation/star-clusters for it and the three
// cluster terms. Forms: a Sonnet research round (research-brief.md) and a second opinion on the
// cells it could not source; sr-Cyrl chosen and confirmed by the operator, a Serbian speaker (2026-11-22).
// Sources per locale in `sources`; hi and ar found none and stay low.
//   node scripts/i18n-tools/maps/2026-11-22-turn-off-term/add-term.mjs
// Re-running rebuilds these entries (idempotent). Format with prettier afterwards.
import fs from 'node:fs';

const F = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(F, 'utf8'));
const TERM = 'main-sequence turn-off';
const READ_MORE = 'observation/star-clusters';

const E = {
  ru: ['точка поворота', ['точк\\p{L}*\\s+поворот\\p{L}*'], 'high'],
  ja: ['転向点', ['転向点', 'ターンオフ'], 'medium'],
  'zh-CN': ['转折点', ['转折点', '转向点', '拐点'], 'medium'],
  ko: ['전환점', ['전환\\s?점', '전향\\s?점'], 'medium'],
  hi: [
    'मोड़-बिंदु',
    ['मो[ड\\u095C]\\u093C?[\\s\\-\\u2010]*बि(?:ं|न्)दु[\\p{L}\\p{M}]*', 'टर्न-?ऑ[फफ़]\\u093C?'],
    'low',
  ],
  ar: ['نقطة الانفصال', ['نقط[ةت]\\s+(?:ال)?انفصال', 'نقط[ةت]\\s+(?:ال)?انحراف'], 'low'],
  'sr-Cyrl': ['тачка скретања', ['тачк\\p{L}*\\s+скретањ\\p{L}*'], 'high'],
  de: ['Abknickpunkt', ['[Aa]bknickpunkt\\p{L}*', 'Turn-?off'], 'high'],
  fr: ['point de sortie', ['points?\\s+de\\s+sortie', 'turn-?off'], 'medium'],
  es: ['punto de separación', ['puntos?\\s+de\\s+separaci[oó]n', 'turn-?off'], 'medium'],
  it: ['punto di turn-off', ['turn-?off'], 'high'],
  nl: ['afbuigpunt', ['afbuigpunt\\p{L}*', 'turn-?off'], 'medium'],
  'pt-BR': ['turn-off', ['turn-?off', 'pontos?\\s+de\\s+sa[ií]da'], 'low'],
};

const e = {
  _sense:
    "the point on a star cluster's colour-brightness diagram where its main sequence bends away towards the giants; it gives the cluster's age",
  _en: '\\b(?:main[- ]sequence )?turn-?offs?\\b',
  _read_more: READ_MORE,
  _match: {},
  _confidence: {},
};
for (const [loc, [form, stems, conf]] of Object.entries(E)) {
  e._match[loc] = stems;
  e._confidence[loc] = conf;
  e[loc] = form;
}
g.term[TERM] = e;

for (const t of ['star cluster', 'open cluster', 'globular cluster']) {
  if (!g.term[t]) throw new Error(`no term ${t}`);
  g.term[t]._read_more = READ_MORE;
}

g.sources['main-sequence turn-off (2026-11-22, 0.9.11 C5)'] =
  'ru: ru.wikipedia "Точка поворота главной последовательности". ja: ja.wikipedia 主系列星 ("…主系列から離れる場所を転向点…と呼ぶ"). ' +
  'zh-CN: zh.wikipedia 主序轉折點. ko: ko.wikipedia 주계열성 ("이 점을 전환점이라고 한다"); 전향점 (the H–R article) accepted, not attested. ' +
  "hi: none found (CSTT not reachable); the H–R article's calque. ar: none found; the H–R article's form, نقطة الانحراف accepted (a search summary only). " +
  'sr-Cyrl: no published source found; confirmed by the operator, a Serbian speaker (2026-11-22). de: Lehrerfortbildung BW and Uni Bonn / AIP course texts ("Abknickpunkt (turnoff point)"). ' +
  'fr: fr.wikipedia "Point de sortie de la séquence principale" (FranceTerme not checked). es: es.wikipedia "Punto de separación de la secuencia principal". ' +
  'it: it.wikipedia "Punto di turn-off". nl: ESO education PDF edu_0054 ("Opdracht 14: Afbuigpunt"). ' +
  'pt-BR: UFRGS / USP theses write "turn-off"; Observatório Nacional MC42 "ponto de saída da Sequência Principal (turn-off point)" (search summary only).';

fs.writeFileSync(F, JSON.stringify(g, null, 2) + '\n');

const D = {
  'en-US':
    "The point on a star cluster's brightness-colour diagram where its main sequence bends away towards the giants; the stars there are just running out of hydrogen in their cores, so their lifetime gives the cluster's age, and the point moves to fainter stars as the cluster grows older.",
  ru: 'Точка на диаграмме «цвет — светимость» звёздного скопления, где главная последовательность отходит в сторону гигантов; звёзды в ней как раз исчерпывают водород в своих ядрах, поэтому их время жизни даёт возраст скопления, а по мере старения скопления эта точка смещается к более слабым звёздам.',
  ja: '星団の色-等級図で、主系列が巨星の方へ折れ曲がる点。そこにある星は中心核の水素をちょうど使い果たしつつあるため、その寿命が星団の年齢を示し、星団が古くなるにつれてこの点はより暗い星へと移っていく。',
  'zh-CN':
    '星团的颜色—亮度图上主序向巨星方向弯离的点；位于此处的恒星核心中的氢即将耗尽，因此它们的寿命给出星团的年龄，而随着星团变老，这个点会移向更暗的恒星。',
  ko: '성단의 색-밝기 도표에서 주계열이 거성 쪽으로 꺾여 나가는 점. 이곳의 별들은 중심핵의 수소를 막 다 써 가고 있으므로 그 수명이 성단의 나이를 알려 주며, 성단이 나이 들수록 이 점은 더 어두운 별 쪽으로 옮겨 간다.',
  hi: 'किसी तारा समूह के रंग-चमक आरेख पर वह बिंदु जहाँ मुख्य अनुक्रम दानव तारों की ओर मुड़ जाता है; वहाँ के तारों के क्रोड का हाइड्रोजन ख़त्म होने वाला होता है, इसलिए उनकी आयु से तारा समूह की आयु पता चलती है, और समूह के पुराना होने के साथ यह बिंदु मंद तारों की ओर खिसकता जाता है।',
  ar: 'النقطة على مخطط اللون واللمعان لعنقود نجمي التي ينحرف عندها النطاق الرئيس نحو العمالقة؛ فالنجوم عندها توشك أن تستنفد الهيدروجين في أنويتها، ولذلك يعطي عمرها عمر العنقود، وتنتقل هذه النقطة إلى نجوم أخفت كلما تقدّم العنقود في العمر.',
  'sr-Cyrl':
    'Тачка на дијаграму боја–сјај звезданог јата у којој се главни низ одваја ка дивовима; звезде у њој управо троше последњи водоник у својим језгрима, па њихов животни век даје старост јата, а тачка се помера ка слабијим звездама како јато стари.',
  de: 'Der Punkt im Farben-Helligkeits-Diagramm eines Sternhaufens, an dem die Hauptreihe zu den Riesen hin abknickt; die Sterne dort verbrauchen gerade den letzten Wasserstoff in ihren Kernen, daher gibt ihre Lebensdauer das Alter des Haufens an, und der Punkt wandert mit zunehmendem Alter des Haufens zu lichtschwächeren Sternen.',
  fr: "Le point du diagramme couleur-luminosité d'un amas stellaire où la séquence principale s'infléchit vers les géantes ; les étoiles qui s'y trouvent épuisent tout juste l'hydrogène de leur cœur, si bien que leur durée de vie donne l'âge de l'amas, et ce point glisse vers des étoiles plus faibles à mesure que l'amas vieillit.",
  es: 'El punto del diagrama color-brillo de un cúmulo estelar en el que la secuencia principal se separa hacia las gigantes; las estrellas que hay allí están agotando el hidrógeno de sus núcleos, así que su vida da la edad del cúmulo, y el punto se desplaza hacia estrellas más débiles a medida que el cúmulo envejece.',
  it: "Il punto del diagramma colore-luminosità di un ammasso stellare in cui la sequenza principale piega verso le giganti; le stelle che vi si trovano stanno esaurendo l'idrogeno nei loro nuclei, quindi la loro durata di vita dà l'età dell'ammasso, e il punto si sposta verso stelle più deboli man mano che l'ammasso invecchia.",
  nl: 'Het punt in het kleur-helderheidsdiagram van een sterrenhoop waar de hoofdreeks naar de reuzen afbuigt; de sterren daar raken net door de waterstof in hun kern heen, dus hun levensduur geeft de leeftijd van de hoop, en het punt schuift naar zwakkere sterren naarmate de hoop ouder wordt.',
  'pt-BR':
    'O ponto do diagrama cor-brilho de um aglomerado estelar em que a sequência principal se desvia em direção às gigantes; as estrelas ali estão esgotando o hidrogênio de seus núcleos, então seu tempo de vida dá a idade do aglomerado, e o ponto se desloca para estrelas mais fracas à medida que o aglomerado envelhece.',
};
for (const [loc, def] of Object.entries(D)) {
  const p = `i18n-src/${loc}/glossary/terms.json`;
  const t = JSON.parse(fs.readFileSync(p, 'utf8'));
  t[TERM] = def;
  fs.writeFileSync(p, JSON.stringify(t, null, 2) + '\n');
}
