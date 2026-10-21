// Pass 1: launch-site page names (fleet/launch-site/*.json `name`) — the place is native
// per locale (glossary `place`, from each language's Wikipedia), pad codes unchanged,
// generic words ("Site", "Launch Complex", "Orbital Pad") translated.
//   node scripts/i18n-tools/launch-site-pages.mjs <loc> [--write]
import fs from 'node:fs';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { problems } from '../lib/translate-quality.mjs';

const [loc, flag] = process.argv.slice(2);
const P = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).place;
const F = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8')).facility;
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const by = (arr) => arr[L.indexOf(loc)];
const p = (k) => P[k][loc];
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
// place + pad code: "мыс Канаверал, SLC-40", "卡纳维拉尔角 SLC-40", "Cabo Cañaveral SLC-40"
const pad = (place, code) =>
  loc === 'ru' || loc === 'sr-Cyrl' ? `${cap(p(place))}, ${code}` : `${cap(p(place))} ${code}`;
const site = (place, n) =>
  by([
    `${p(place)}, площадка ${n}`,
    `${p(place)} サイト${n}`,
    `${p(place)} ${n}号发射场`,
    `${p(place)} ${n}번 발사장`,
    `${p(place)} साइट ${n}`,
    `${p(place)} الموقع ${n}`,
    `${p(place)}, лансирно место ${n}`,
    `${p(place)} Startplatz ${n}`,
    `${p(place)}, site ${n}`,
    `${p(place)}, sitio ${n}`,
    `${p(place)}, sito ${n}`,
    `${p(place)}, platform ${n}`,
    `${p(place)}, sítio ${n}`,
  ]);
const NAMES = {
  'baikonur-1-5': () =>
    `${site('Baikonur', '1/5')}${loc === 'ja' || loc === 'zh-CN' ? '（' : ' ('}${by(['Гагаринский старт', 'ガガーリン発射台', '加加林发射台', '가가린 발사대', 'गगारिन का आरंभ', 'منصة جاجارين', 'Гагаринов старт', 'Gagarins Start', 'aire de lancement Gagarine', 'plataforma Gagarin', 'rampa Gagarin', 'Gagarins Start', 'plataforma Gagarin'])}${loc === 'ja' || loc === 'zh-CN' ? '）' : ')'}`,
  'baikonur-200': () => site('Baikonur', '200'),
  'baikonur-31-6': () => site('Baikonur', '31/6'),
  'plesetsk-43': () => site('Plesetsk', '43'),
  // The whole cosmodrome since 2026-10-21 (the id predates that and is kept for its URLs).
  'plesetsk-41-1': () => cap(F['Plesetsk Cosmodrome'][loc]),
  'cape-canaveral-slc-40': () => pad('Cape Canaveral', 'SLC-40'),
  'cape-canaveral-slc-41': () => pad('Cape Canaveral', 'SLC-41'),
  'kourou-ela-2': () => pad('Kourou', 'ELA-2'),
  'kourou-ela-3': () => pad('Kourou', 'ELA-3'),
  'kourou-ela-4': () => pad('Kourou', 'ELA-4'),
  'jiuquan-slc-43': () => pad('Jiuquan', 'SLC-43'),
  'taiyuan-lc-9': () => pad('Taiyuan', 'LC-9'),
  'wenchang-lc-101': () => pad('Wenchang', 'LC-101'),
  'xichang-lc-2': () => pad('Xichang', 'LC-2'),
  'xichang-lc-3': () => pad('Xichang', 'LC-3'),
  'vandenberg-slc-4e': () => pad('Vandenberg', 'SLC-4E'),
  'sriharikota-slp': () => pad('Sriharikota', 'SLP'),
  'tanegashima-yoshinobu': () =>
    by([
      'Танегасима, Ёсинобу LP-1',
      '種子島 吉信 LP-1',
      '种子岛 吉信 LP-1',
      '다네가시마 요시노부 LP-1',
      'तानेगाशिमा योशिनोबु LP-1',
      'تانيغاشيما يوشينوبو LP-1',
      'Танегашима, Јошинобу LP-1',
      'Tanegashima Yoshinobu LP-1',
      'Tanegashima Yoshinobu LP-1',
      'Tanegashima Yoshinobu LP-1',
      'Tanegashima Yoshinobu LP-1',
      'Tanegashima Yoshinobu LP-1',
      'Tanegashima Yoshinobu LP-1',
    ]),
  'lc-39a': () =>
    `${by(['Стартовый комплекс', '第', '', '', 'प्रक्षेपण परिसर', 'مجمع الإطلاق', 'Лансирни комплекс', 'Launch Complex', 'Complexe de lancement', 'Complejo de lanzamiento', 'Complesso di lancio', 'Lanceercomplex', 'Complexo de Lançamento'])}${by([' 39A', '39A発射施設', '39A号发射台', '39A 발사단지', ' 39A', ' 39A', ' 39A', ' 39A', ' 39A', ' 39A', ' 39A', ' 39A', ' 39A'])}`,
  'lc-39b': () =>
    `${by(['Стартовый комплекс', '第', '', '', 'प्रक्षेपण परिसर', 'مجمع الإطلاق', 'Лансирни комплекс', 'Launch Complex', 'Complexe de lancement', 'Complejo de lanzamiento', 'Complesso di lancio', 'Lanceercomplex', 'Complexo de Lançamento'])}${by([' 39B', '39B発射施設', '39B号发射台', '39B 발사단지', ' 39B', ' 39B', ' 39B', ' 39B', ' 39B', ' 39B', ' 39B', ' 39B', ' 39B'])}`,
  'starbase-orbital-a': () =>
    by([
      'Starbase, орбитальный стартовый стол A',
      'スターベース 軌道発射台A',
      '星港 A号轨道发射台',
      '스타베이스 궤도 발사대 A',
      'स्टारबेस ऑर्बिटल पैड A',
      'ستاربيس منصة الإطلاق المداري A',
      'Старбејс, орбитална рампа A',
      'Starbase Orbital-Startrampe A',
      'Starbase, pas de tir orbital A',
      'Starbase, plataforma orbital A',
      'Starbase, rampa orbitale A',
      'Starbase, orbitaal lanceerplatform A',
      'Starbase, plataforma orbital A',
    ]),
};
const dir = 'fleet/launch-site';
const files = fs.readdirSync(`i18n-src/en-US/${dir}`);
const edits = [];
for (const [id, fn] of Object.entries(NAMES)) {
  const file = files.find((f) => f === `${id}.json`);
  if (!file) {
    console.error(`no page ${id}`);
    continue;
  }
  const en = JSON.parse(fs.readFileSync(`i18n-src/en-US/${dir}/${file}`, 'utf8')).name;
  const path = `i18n-src/${loc}/${dir}/${file}`;
  const old = JSON.parse(fs.readFileSync(path, 'utf8')).name;
  const nu = cap(fn());
  if (old === nu) continue;
  const bad = problems(loc, en, nu).filter((x) => !problems(loc, en, old).includes(x));
  console.log(`${id}: ${old} → ${nu}${bad.length ? `  REFUSED: ${bad.join('; ')}` : ''}`);
  if (!bad.length) edits.push([path, { at: 'name', old, nu }]);
}
if (flag === '--write') for (const [path, e] of edits) writeJsonEdits(path, [e]);
