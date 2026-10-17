// Pass 1, one name per language: the canonical form of entity names that pages wrote
// differently (or left English where a descriptor should be translated). Vehicle names:
// English outside their origin language (name-origins.js); descriptors ("Space
// Telescope", "Constellation", "Node 2") translated; the ISS full name native everywhere
// (each language's Wikipedia). Applies to the `name` of every page with that English name.
//   node scripts/i18n-tools/unify-names.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { problems } from '../lib/translate-quality.mjs';

const write = process.argv.includes('--write');
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const row = (v) => Object.fromEntries(L.map((l, i) => [l, v[i]]).filter(([, x]) => x !== null));
const telescope = (n, de, nl) =>
  row([
    `Космический телескоп ${n}`,
    `${n}宇宙望遠鏡`,
    `${n}空间望远镜`,
    `${n} 우주망원경`,
    `${n} अंतरिक्ष दूरदर्शी`,
    `مقراب ${n} الفضائي`,
    `Свемирски телескоп ${n}`,
    de,
    `Télescope spatial ${n}`,
    `Telescopio espacial ${n}`,
    `Telescopio spaziale ${n}`,
    nl,
    `Telescópio Espacial ${n}`,
  ]);
const constellation = (n, ru, zh) =>
  row([
    ru,
    `${n}衛星群`,
    zh,
    `${n} 위성군`,
    `${n} उपग्रह समूह`,
    `كوكبة ${n}`,
    `Констелација ${n}`,
    `${n}-Konstellation`,
    `Constellation ${n}`,
    `Constelación ${n}`,
    `Costellazione ${n}`,
    `${n}-constellatie`,
    `Constelação ${n}`,
  ]);
const node = (n, k) =>
  row([
    `${n} (узловой модуль ${k})`,
    `${n}（ノード${k}）`,
    `${n}（${k}号节点舱）`,
    `${n} (노드 ${k})`,
    `${n} (नोड ${k})`,
    `${n} (العقدة ${k})`,
    `${n} (чвор ${k})`,
    `${n} (Verbindungsknoten ${k})`,
    `${n} (nœud ${k})`,
    `${n} (Nodo ${k})`,
    `${n} (Nodo ${k})`,
    `${n} (knooppunt ${k})`,
    `${n} (Nó ${k})`,
  ]);
const english = (n, except = []) =>
  Object.fromEntries(L.filter((l) => !except.includes(l)).map((l) => [l, n]));

const CANON = {
  'GOES (NOAA Weather)': row([
    'GOES (метеоспутники NOAA)',
    'GOES（NOAA気象衛星）',
    'GOES（NOAA气象卫星）',
    'GOES (NOAA 기상위성)',
    'GOES (NOAA मौसम उपग्रह)',
    'GOES (أقمار NOAA للأرصاد الجوية)',
    'GOES (NOAA метеоролошки сателити)',
    null,
    'GOES (satellites météo de la NOAA)',
    'GOES (satélites meteorológicos de la NOAA)',
    'GOES (satelliti meteorologici NOAA)',
    'GOES (NOAA-weersatellieten)',
    'GOES (satélites meteorológicos da NOAA)',
  ]),
  'O3b / O3b mPOWER (MEO comms)': row([
    'O3b / O3b mPOWER (спутниковая связь на средней орбите)',
    'O3b / O3b mPOWER（MEO通信）',
    'O3b / O3b mPOWER（中地球轨道通信）',
    null,
    null,
    null,
    'O3b / O3b mPOWER (комуникације у средњој орбити)',
    null,
    'O3b / O3b mPOWER (communications en MEO)',
    'O3b / O3b mPOWER (comunicaciones en MEO)',
    'O3b / O3b mPOWER (comunicazioni in MEO)',
    null,
    'O3b / O3b mPOWER (comunicações em MEO)',
  ]),
  Buran: { ja: 'Buran', 'zh-CN': 'Buran' },
  Shenzhou: { 'zh-CN': '神舟' },
  Vostok: { 'zh-CN': 'Vostok' },
  InSight: { 'pt-BR': 'InSight' },
  Phoenix: { 'zh-CN': 'Phoenix' },
  H3: { ru: 'H3', ja: 'H3', 'zh-CN': 'H3', 'sr-Cyrl': 'H3' },
  Starship: { ko: 'Starship' },
  Gaia: { ja: 'Gaia', 'zh-CN': 'Gaia', ko: 'Gaia' },
  DART: { ja: 'DART' },
  Galileo: { 'zh-CN': 'Galileo' },
  Hayabusa: { 'zh-CN': 'Hayabusa' },
  Juno: { ko: 'Juno' },
  Magellan: { 'zh-CN': 'Magellan', ko: 'Magellan', it: 'Magellan' },
  'Mars Reconnaissance Orbiter': english('Mars Reconnaissance Orbiter'),
  'Lunar Reconnaissance Orbiter': english('Lunar Reconnaissance Orbiter'),
  Psyche: { 'zh-CN': 'Psyche' },
  Rosetta: { 'zh-CN': 'Rosetta', ko: 'Rosetta' },
  Skylab: { 'zh-CN': 'Skylab' },
  Curiosity: { 'zh-CN': 'Curiosity' },
  Spirit: { ko: 'Spirit', it: 'Spirit' },
  'Chandra X-ray Observatory': row([
    'Рентгеновская обсерватория Chandra',
    'Chandra X線天文台',
    'Chandra X射线天文台',
    'Chandra X선 천문대',
    'Chandra एक्स-रे वेधशाला',
    'مرصد Chandra للأشعة السينية',
    'Рендгенска опсерваторија Chandra',
    'Chandra-Röntgenobservatorium',
    'Observatoire de rayons X Chandra',
    'Observatorio de rayos X Chandra',
    'Osservatorio a raggi X Chandra',
    'Chandra-röntgenobservatorium',
    'Observatório de Raios X Chandra',
  ]),
  'Hubble Space Telescope': telescope(
    'Hubble',
    'Hubble-Weltraumteleskop',
    'Hubble-ruimtetelescoop',
  ),
  'James Webb Space Telescope': telescope(
    'James Webb',
    'James-Webb-Weltraumteleskop',
    'James Webb-ruimtetelescoop',
  ),
  'Spitzer Space Telescope': telescope(
    'Spitzer',
    'Spitzer-Weltraumteleskop',
    'Spitzer-ruimtetelescoop',
  ),
  // "Parker Solar" is the name (only "Probe" is a descriptor) — kept whole, as de/it/nl Wikipedia do.
  'Parker Solar Probe': { ko: 'Parker Solar Probe' },
  'International Space Station': row([
    'Международная космическая станция',
    '国際宇宙ステーション',
    '国际空间站',
    '국제우주정거장',
    'अंतर्राष्ट्रीय अंतरिक्ष स्टेशन',
    'محطة الفضاء الدولية',
    'Међународна свемирска станица',
    'Internationale Raumstation',
    'Station spatiale internationale',
    'Estación Espacial Internacional',
    'Stazione spaziale internazionale',
    'Internationaal ruimtestation',
    'Estação Espacial Internacional',
  ]),
  'BeiDou Constellation': constellation('BeiDou', 'Группировка BeiDou', '北斗卫星导航系统'),
  'Galileo Constellation': constellation('Galileo', 'Группировка Galileo', 'Galileo星座'),
  'GLONASS Constellation': { ...constellation('GLONASS', 'Группировка ГЛОНАСС', 'GLONASS星座') },
  'GPS Constellation': constellation('GPS', 'Группировка GPS', 'GPS星座'),
  'Harmony (Node 2)': node('Harmony', 2),
  'Tranquility (Node 3)': node('Tranquility', 3),
  'Unity (Node 1)': node('Unity', 1),
  'Zvezda (Service Module)': row([
    null,
    'Zvezda（サービスモジュール）',
    'Zvezda（服务舱）',
    'Zvezda (서비스 모듈)',
    'Zvezda (सर्विस मॉड्यूल)',
    'Zvezda (وحدة الخدمة)',
    'Zvezda (сервисни модул)',
    'Zvezda (Servicemodul)',
    'Zvezda (module de service)',
    'Zvezda (módulo de servicio)',
    'Zvezda (modulo di servizio)',
    'Zvezda (servicemodule)',
    'Zvezda (Módulo de Serviço)',
  ]),
  'Tianhe (Core Module)': row([
    'Tianhe (базовый модуль)',
    'Tianhe（コアモジュール）',
    null,
    'Tianhe (핵심 모듈)',
    'Tianhe (कोर मॉड्यूल)',
    'Tianhe (الوحدة الأساسية)',
    'Tianhe (основни модул)',
    'Tianhe (Kernmodul)',
    'Tianhe (module central)',
    'Tianhe (módulo central)',
    'Tianhe (modulo centrale)',
    'Tianhe (kernmodule)',
    'Tianhe (módulo central)',
  ]),
  'Tiangong Space Station': row([
    'Космическая станция Tiangong',
    'Tiangong宇宙ステーション',
    null,
    'Tiangong 우주정거장',
    'Tiangong अंतरिक्ष स्टेशन',
    'محطة Tiangong الفضائية',
    'Свемирска станица Tiangong',
    'Raumstation Tiangong',
    'Station spatiale Tiangong',
    'Estación espacial Tiangong',
    'Stazione spaziale Tiangong',
    'Tiangong-ruimtestation',
    'Estação Espacial Tiangong',
  ]),
};

const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
const SURFACES = [
  'fleet',
  'programs',
  'missions',
  'earth-objects',
  'iss-modules',
  'tiangong-modules',
  'mars-sites',
  'moon-sites',
  'rockets',
];
let n = 0;
for (const s of SURFACES)
  for (const f of walk(`i18n-src/en-US/${s}`)) {
    const en = JSON.parse(fs.readFileSync(f, 'utf8')).name;
    const forms = CANON[en];
    if (!forms) continue;
    const rel = f.slice('i18n-src/en-US/'.length);
    for (const [loc, nu] of Object.entries(forms)) {
      const p = `i18n-src/${loc}/${rel}`;
      const old = JSON.parse(fs.readFileSync(p, 'utf8')).name;
      if (old === nu) continue;
      const bad = problems(loc, en, nu).filter((x) => !problems(loc, en, old).includes(x));
      console.log(
        `${loc} ${rel}: ${old} → ${nu}${bad.length ? `  REFUSED: ${bad.join('; ')}` : ''}`,
      );
      if (write && !bad.length) {
        writeJsonEdits(p, [{ at: 'name', old, nu }]);
        n++;
      }
    }
  }
if (write) console.log(`written ${n}`);
