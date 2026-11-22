// R1 (0.9.11): no source says Columbia "triggered" the Vision for Space Exploration; NASA's
// history page and the 2004-01-14 announcement only place it after the accident and the CAIB.
// The clause becomes a dated sequence in all 14 locales.
import fs from 'node:fs';

const EDITS = {
  'en-US': [
    'The accident grounded the Shuttle fleet for about two and a half years and triggered the Vision for Space Exploration.',
    'The accident grounded the Shuttle fleet for about two and a half years; the Vision for Space Exploration followed in January 2004.',
  ],
  ar: [
    'وضع الحادث أسطول المكوكات في وقفة نحو عامين ونصف وأطلق رؤية استكشاف الفضاء.',
    'وضع الحادث أسطول المكوكات في وقفة نحو عامين ونصف، وتلته رؤية استكشاف الفضاء في يناير 2004.',
  ],
  de: [
    'Der Unfall legte die Shuttle-Flotte für rund zweieinhalb Jahre still und löste die Vision for Space Exploration aus.',
    'Der Unfall legte die Shuttle-Flotte für rund zweieinhalb Jahre still; im Januar 2004 folgte die Vision for Space Exploration.',
  ],
  es: [
    'El accidente mantuvo en tierra la flota del transbordador durante unos dos años y medio y desencadenó la Visión para la Exploración Espacial.',
    'El accidente mantuvo en tierra la flota del transbordador durante unos dos años y medio; en enero de 2004 le siguió la Visión para la Exploración Espacial.',
  ],
  fr: [
    "L'accident a immobilisé la flotte Space Shuttle pendant environ deux ans et demi et a déclenché la Vision for Space Exploration.",
    "L'accident a immobilisé la flotte Space Shuttle pendant environ deux ans et demi ; la Vision for Space Exploration a suivi en janvier 2004.",
  ],
  hi: [
    'इस दुर्घटना से Shuttle बेड़ा लगभग ढाई वर्ष तक उड़ान से बाहर रहा और इसने Vision for Space Exploration को जन्म दिया।',
    'इस दुर्घटना से Shuttle बेड़ा लगभग ढाई वर्ष तक उड़ान से बाहर रहा; इसके बाद जनवरी 2004 में Vision for Space Exploration आया।',
  ],
  it: [
    "L'incidente tenne a terra la flotta Shuttle per circa due anni e mezzo e diede il via alla Vision for Space Exploration.",
    "L'incidente tenne a terra la flotta Shuttle per circa due anni e mezzo; nel gennaio 2004 seguì la Vision for Space Exploration.",
  ],
  ja: [
    'この事故でシャトル艦隊は約2年半飛行停止となり、宇宙探査ビジョン（Vision for Space Exploration）が打ち出されるきっかけとなった。',
    'この事故でシャトル艦隊は約2年半飛行停止となり、その後2004年1月に宇宙探査ビジョン（Vision for Space Exploration）が発表された。',
  ],
  ko: [
    '이 사고로 Shuttle 비행이 약 2년 반 동안 중단되었고 우주 탐사 비전(Vision for Space Exploration)이 촉발되었다.',
    '이 사고로 Shuttle 비행이 약 2년 반 동안 중단되었고, 이어 2004년 1월 우주 탐사 비전(Vision for Space Exploration)이 발표되었다.',
  ],
  nl: [
    'Door het ongeluk bleef de Shuttle-vloot ongeveer tweeënhalf jaar aan de grond en leidde het tot de Vision for Space Exploration.',
    'Door het ongeluk bleef de Shuttle-vloot ongeveer tweeënhalf jaar aan de grond; in januari 2004 volgde de Vision for Space Exploration.',
  ],
  'pt-BR': [
    'O acidente imobilizou a frota do Shuttle por cerca de dois anos e meio e desencadeou a Vision for Space Exploration.',
    'O acidente imobilizou a frota do Shuttle por cerca de dois anos e meio; em janeiro de 2004 veio a Vision for Space Exploration.',
  ],
  ru: [
    'Авария остановила полёты флота Shuttle примерно на два с половиной года и дала толчок Vision for Space Exploration.',
    'Авария остановила полёты флота Shuttle примерно на два с половиной года; в январе 2004 года за ней последовала Vision for Space Exploration.',
  ],
  'sr-Cyrl': [
    'Несрећа је приземљила флоту програма Shuttle на око две и по године и покренула Vision for Space Exploration.',
    'Несрећа је приземљила флоту програма Shuttle на око две и по године; у јануару 2004. уследила је Vision for Space Exploration.',
  ],
  'zh-CN': [
    '该事故使航天飞机机队停飞约两年半，并促成了太空探索愿景。',
    '该事故使航天飞机机队停飞约两年半；2004年1月，太空探索愿景随之发布。',
  ],
};

let n = 0;
for (const [loc, [find, replace]] of Object.entries(EDITS)) {
  const p = `i18n-src/${loc}/fleet/crewed-spacecraft/columbia.json`;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  if (!j.description.includes(find)) throw new Error(`${loc}: find text not in description`);
  j.description = j.description.replace(find, replace);
  fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
  n++;
}
console.log(`columbia: ${n} locales edited`);
