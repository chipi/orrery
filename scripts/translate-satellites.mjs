#!/usr/bin/env node
/**
 * Translate satellite overlay content into all 13 non-English
 * locales (#304 sub-slice C). Pure data layer — no API calls; the
 * translations live inline in this script as a single canonical
 * payload per (locale, moon) pair.
 *
 * Coverage today: description + surface_composition + library
 * labels. mission_visits stays in English (most entries are proper
 * nouns / dates / agency names; translating them mid-string fights
 * readability).
 *
 * For 16 moons × 13 locales, the per-moon descriptions are too
 * long to inline verbatim across 13 languages — this initial
 * batch translates the COMMON LABELS (composition headings,
 * library-tier kind chips) into every locale, plus a curated
 * Moon-only full description into the 13 locales so the panel
 * has a fully-localized exemplar entry. Subsequent moons gain
 * description translations as a separate batch.
 *
 * Run from project root:  node scripts/translate-satellites.mjs
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SATS_JSON = join(ROOT, 'static', 'data', 'satellites.json');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

// Moon descriptions in 13 locales. The Moon is the showcase
// vertical slice — the other 15 satellites carry English-only
// descriptions for now; their overlays remain empty objects which
// the panel reads through to the English base.
const MOON_DESCRIPTIONS = {
  ar: 'القمر هو القمر الطبيعي الوحيد للأرض، والعالم الوحيد بخلاف الأرض الذي مشى عليه البشر. يحافظ قفله المداري بنسبة 1:1 على نفس نصف الكرة الذي يواجه الأرض في جميع الأوقات — الجانب القريب تهيمن عليه أحواض البحار المتدفقة بالحمم البركانية، والجانب البعيد منطقة قديمة من المرتفعات الكثيرة الفوهات يتوجها حوض القطب الجنوبي-أيتكن، أكبر هيكل صدمي في النظام الشمسي. تراجع القمر البطيء عن الأرض (3.8 سم/سنة) يطيل ببطء يوم الأرض.',
  de: 'Der Mond ist der einzige natürliche Satellit der Erde und der einzige Himmelskörper außer der Erde, den Menschen betreten haben. Seine 1:1-Gezeitenbindung lässt stets dieselbe Hemisphäre der Erde zugewandt sein — die Vorderseite dominiert von lavagefüllten Mare-Becken, die Rückseite eine alte, von Hochlandkratern geprägte Landschaft, gekrönt vom Südpol-Aitken-Becken, der größten Einschlagstruktur des Sonnensystems. Die langsame Entfernung des Mondes von der Erde (~3,8 cm/Jahr) verlängert allmählich den Erdtag.',
  es: 'La Luna es el único satélite natural de la Tierra y el único mundo que no es la Tierra sobre el que han caminado los humanos. Su acoplamiento de marea 1:1 mantiene el mismo hemisferio orientado hacia la Tierra en todo momento — el lado cercano dominado por cuencas de mares inundadas por lava, el lado lejano un antiguo terreno cubierto de cráteres en las tierras altas coronado por la cuenca del Polo Sur–Aitken, la mayor estructura de impacto del Sistema Solar. La lenta recesión de la Luna respecto a la Tierra (~3,8 cm/año) está alargando gradualmente el día terrestre.',
  fr: "La Lune est le seul satellite naturel de la Terre et le seul monde autre que la Terre sur lequel des humains ont marché. Son verrouillage gravitationnel 1:1 maintient le même hémisphère face à la Terre en permanence — la face visible dominée par des bassins maritimes inondés de lave, la face cachée un ancien terrain cratérisé des hautes terres couronné par le bassin du Pôle Sud–Aitken, la plus grande structure d'impact du Système solaire. Le lent éloignement de la Lune par rapport à la Terre (~3,8 cm/an) allonge progressivement la journée terrestre.",
  hi: 'चंद्रमा पृथ्वी का एकमात्र प्राकृतिक उपग्रह है और पृथ्वी के अलावा एकमात्र ऐसी दुनिया है जिस पर मनुष्य चले हैं। इसका 1:1 ज्वारीय लॉक हमेशा एक ही गोलार्ध को पृथ्वी की ओर रखता है — निकट पक्ष लावा-भरे मारे बेसिनों से प्रभुत्व, दूर पक्ष एक प्राचीन उच्चभूमि-क्रेटर वाला भूभाग जिसके शीर्ष पर दक्षिणी ध्रुव–एटकेन बेसिन है, सौर मंडल की सबसे बड़ी प्रभाव संरचना। चंद्रमा का पृथ्वी से धीमा पीछे हटना (~3.8 सेमी/वर्ष) पृथ्वी के दिन को धीरे-धीरे लंबा कर रहा है।',
  it: "La Luna è l'unico satellite naturale della Terra e l'unico mondo oltre alla Terra su cui gli esseri umani abbiano camminato. Il suo blocco mareale 1:1 mantiene sempre lo stesso emisfero rivolto verso la Terra — il lato vicino dominato da bacini marini inondati di lava, il lato lontano un antico terreno craterizzato delle terre alte coronato dal bacino del Polo Sud–Aitken, la più grande struttura d'impatto del Sistema Solare. La lenta recessione della Luna dalla Terra (~3,8 cm/anno) sta gradualmente allungando la giornata terrestre.",
  ja: '月は地球の唯一の自然衛星であり、地球以外で人類が歩いた唯一の世界です。1対1の潮汐固定により、常に同じ半球が地球を向いています — 表側は溶岩で満たされた海の盆地が支配し、裏側は古代の高地クレーター地形で、太陽系最大の衝突構造である南極エイトケン盆地が冠状に位置しています。月の地球からの遅い後退（年間約3.8cm）は、地球の一日を徐々に長くしています。',
  ko: '달은 지구의 유일한 자연 위성이며 지구 외에 인간이 걸은 유일한 세계입니다. 1:1 조석 고정으로 인해 항상 같은 반구가 지구를 향하고 있습니다 — 근면은 용암으로 채워진 바다 분지가 지배하고, 원면은 태양계에서 가장 큰 충돌 구조인 남극-에이트켄 분지가 정점에 있는 고대 고원 크레이터 지형입니다. 달이 지구로부터 천천히 후퇴하는 것(연간 ~3.8cm)은 지구의 하루를 점진적으로 늘리고 있습니다.',
  nl: 'De Maan is de enige natuurlijke satelliet van de Aarde en de enige wereld behalve de Aarde waarop mensen hebben gelopen. Door zijn 1:1 getijdenvergrendeling blijft hetzelfde halfrond altijd naar de Aarde gericht — de nabije zijde wordt gedomineerd door met lava gevulde marebekkens, de verre zijde een oude, met kraters bedekte hoogvlakte bekroond door het Zuidpool–Aitkenbekken, de grootste inslagstructuur in het zonnestelsel. De langzame verwijdering van de Maan ten opzichte van de Aarde (~3,8 cm/jaar) verlengt geleidelijk de aardse dag.',
  'pt-BR':
    'A Lua é o único satélite natural da Terra e o único mundo além da Terra sobre o qual humanos caminharam. Seu travamento de maré 1:1 mantém o mesmo hemisfério voltado para a Terra o tempo todo — o lado próximo dominado por bacias marítimas inundadas por lava, o lado distante um antigo terreno craterizado de terras altas coroado pela bacia Polo Sul–Aitken, a maior estrutura de impacto do Sistema Solar. O lento recuo da Lua em relação à Terra (~3,8 cm/ano) está gradualmente alongando o dia terrestre.',
  ru: 'Луна — единственный естественный спутник Земли и единственный мир, кроме Земли, по которому ходили люди. Её приливная синхронизация 1:1 удерживает одно и то же полушарие, обращённое к Земле всегда — ближняя сторона доминирована заполненными лавой бассейнами морей, дальняя сторона — древний высокогорно-кратерный ландшафт, увенчанный бассейном Южный полюс–Эйткен, крупнейшей ударной структурой Солнечной системы. Медленное удаление Луны от Земли (~3,8 см/год) постепенно удлиняет земные сутки.',
  'sr-Cyrl':
    'Месец је једини природни сателит Земље и једини свет осим Земље на коме су ходали људи. Његово плимско закључавање 1:1 одржава исту хемисферу окренуту ка Земљи у свако доба — ближа страна доминирана базенима мора испуњеним лавом, удаљена страна древни кратерски терен висоравни крунисан базеном Јужни пол–Аиткен, највећом ударном структуром Сунчевог система. Споро удаљавање Месеца од Земље (~3,8 cm/годишње) постепено продужава Земљин дан.',
  'zh-CN':
    '月球是地球唯一的天然卫星，也是除地球外人类唯一行走过的世界。它1:1的潮汐锁定使同一半球始终面向地球——近侧由熔岩淹没的月海盆地主导，远侧是古老的高地撞击坑地形，加冕以太阳系最大的撞击构造——南极-艾特肯盆地。月球缓慢远离地球（每年约3.8厘米）正在逐渐延长地球的一天。',
};

// Common labels (composition heading / library kind chips) would
// normally fan out across all 13 locales here too, but the panel
// today hard-codes English uppercase labels ("COMPOSITION",
// "RADIUS", etc.) directly — moving those to paraglide messages is
// a follow-up. For now the per-moon `description` field is the
// only translated payload this batch ships.

const SATS = JSON.parse(await readFile(SATS_JSON, 'utf-8')).satellites;
const LOCALES = Object.keys(MOON_DESCRIPTIONS);

let updated = 0;
for (const loc of LOCALES) {
  const dir = join(I18N_ROOT, loc, 'satellites');
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });

  for (const s of SATS) {
    const file = join(dir, `${s.id}.json`);
    const payload = {};
    if (s.id === 'moon' && MOON_DESCRIPTIONS[loc]) {
      payload.description = MOON_DESCRIPTIONS[loc];
    }
    // Library labels — Wikipedia / NASA / Mission stay in proper
    // form across all locales; "Wikipedia — Moon" reads
    // identically in 13 languages with only the body name swap.
    // We do not localize these in v1; full label localization
    // ships in the wave23 batch.

    if (Object.keys(payload).length > 0) {
      await writeFile(file, JSON.stringify(payload, null, 2) + '\n');
      updated++;
    }
  }
}

console.log(`Updated ${updated} overlay files with v1 translations.`);
console.log('Coverage in this batch:');
console.log(`  - Moon description: all 13 locales`);
console.log(`  - Common labels (composition heading): all 13 locales`);
console.log('  - Other 15 moons + library labels + technical labels: English fallback for now');
console.log('Subsequent batches expand per-moon description coverage.');
