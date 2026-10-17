// Pass 1: single-page entity names whose descriptor words were left in English or
// mistranslated (pt "Naipe" = a card suit, ko "한 벌", "Starship 火星 Crew"). Hand-written:
// descriptors translated, proper names by the origin rule. null = keep the current form.
//   node scripts/i18n-tools/descriptor-names.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { problems } from '../lib/translate-quality.mjs';

const write = process.argv.includes('--write');
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
// prettier-ignore
const T = {
  'ATV (Automated Transfer Vehicle)': ['ATV (автоматический грузовой корабль)', 'ATV（欧州補給機）', 'ATV（自动运载飞船）', 'ATV (자동 화물 수송선)', 'ATV (स्वचालित स्थानांतरण वाहन)', 'ATV (مركبة النقل الآلية)', 'ATV (аутоматски брод за снабдевање)', null, 'ATV (véhicule de transfert automatique)', 'ATV (vehículo de transferencia automatizado)', null, null, 'ATV (veículo de transferência automatizado)'],
  'GPS (Global Positioning System)': ['GPS (глобальная система позиционирования)', 'GPS（全地球測位システム）', null, 'GPS (위성 위치 확인 시스템)', 'GPS (वैश्विक स्थान-निर्धारण प्रणाली)', null, null, null, null, 'GPS (Sistema de Posicionamiento Global)', 'GPS (sistema di posizionamento globale)', null, 'GPS (Sistema de Posicionamento Global)'],
  'Sirius Satellite Radio (Tundra) — Historical (2000-2016)': ['Sirius Satellite Radio (орбита «Тундра») — в прошлом (2000–2016)', 'Sirius Satellite Radio（ツンドラ軌道）— 運用終了（2000–2016）', null, 'Sirius Satellite Radio (툰드라 궤도) — 과거 (2000–2016)', 'Sirius Satellite Radio (टुंड्रा कक्षा) — पूर्व में (2000–2016)', 'Sirius Satellite Radio (مدار تندرا) — سابقًا (2000–2016)', null, 'Sirius Satellite Radio (Tundra-Orbit) — ehemals (2000–2016)', null, 'Sirius Satellite Radio (órbita Tundra) — histórico (2000-2016)', 'Sirius Satellite Radio (orbita Tundra) — storico (2000-2016)', 'Sirius Satellite Radio (Toendra-baan) — voormalig (2000-2016)', 'Sirius Satellite Radio (órbita Tundra) — histórico (2000-2016)'],
  'Apollo Lunar Module': [null, 'Apollo月着陸船', 'Apollo登月舱', 'Apollo 달 착륙선', 'Apollo चंद्र मॉड्यूल', 'وحدة Apollo القمرية', null, 'Apollo-Mondlandefähre', 'Module lunaire Apollo', 'Módulo lunar Apollo', 'Modulo lunare Apollo', 'Apollo-maanlander', 'Módulo Lunar Apollo'],
  'Space Shuttle Orbiter': ['Орбитальный корабль Space Shuttle', 'Space Shuttleオービター', 'Space Shuttle轨道器', 'Space Shuttle 궤도선', 'Space Shuttle ऑर्बिटर', 'المركبة المدارية لـ Space Shuttle', 'Орбитер Space Shuttle', 'Space-Shuttle-Orbiter', 'Orbiteur du Space Shuttle', 'Orbitador del Space Shuttle', 'Orbiter dello Space Shuttle', 'Space Shuttle-orbiter', 'Orbitador do Space Shuttle'],
  'Lunar Roving Vehicle': ['Лунный автомобиль', '月面車', '月球车', '월면차', 'चंद्र वाहन', 'العربة القمرية', null, 'Lunar Roving Vehicle', 'Rover lunaire', 'Vehículo lunar', 'Rover lunare', 'Maanwagen', 'Veículo lunar'],
  'SpaceX IVA Suit': ['Скафандр SpaceX IVA', 'SpaceX IVA宇宙服', 'SpaceX IVA航天服', 'SpaceX IVA 우주복', 'SpaceX IVA स्पेससूट', 'بزة SpaceX IVA', 'Скафандер SpaceX IVA', 'SpaceX-IVA-Anzug', 'Combinaison IVA SpaceX', 'Traje IVA de SpaceX', 'Tuta IVA SpaceX', 'SpaceX IVA-pak', 'Traje IVA da SpaceX'],
  'Shenzhou IVA Suit': ['Скафандр Shenzhou IVA', 'Shenzhou IVA宇宙服', '神舟舱内航天服', 'Shenzhou IVA 우주복', 'Shenzhou IVA स्पेससूट', 'بزة Shenzhou IVA', 'Скафандер Shenzhou IVA', 'Shenzhou-IVA-Anzug', 'Combinaison IVA Shenzhou', 'Traje IVA Shenzhou', 'Tuta IVA Shenzhou', 'Shenzhou IVA-pak', 'Traje IVA Shenzhou'],
  'Commercial Stations': ['Коммерческие станции', '商業宇宙ステーション', '商业空间站', '상업 우주정거장', null, null, null, null, null, null, 'Stazioni commerciali', 'Commerciële stations', 'Estações comerciais'],
  'The Great Observatories': [null, 'グレートオブザバトリー計画', '大型轨道天文台计划', '그레이트 옵저버터리 계획', null, null, null, 'Die Great Observatories', null, null, null, 'De Great Observatories', 'Os Grandes Observatórios'],
  'Mars Rovers': [null, null, null, null, 'मंगल रोवर', null, null, 'Marsrover', 'Rovers martiens', null, 'Rover marziani', 'Marsrovers', null],
  'Russian Orbital Station': [null, 'ロシア軌道ステーション', null, null, 'रूसी कक्षीय स्टेशन', null, null, 'Russische Orbitalstation', 'Station orbitale russe', null, 'Stazione orbitale russa', 'Russisch Orbitaal Station', 'Estação Orbital Russa'],
  'SpaceX — Falcon & Dragon': [null, 'SpaceX — FalconとDragon', null, 'SpaceX — Falcon과 Dragon', null, 'SpaceX — Falcon وDragon', 'SpaceX — Falcon и Dragon', 'SpaceX — Falcon und Dragon', 'SpaceX — Falcon et Dragon', null, 'SpaceX — Falcon e Dragon', 'SpaceX — Falcon en Dragon', 'SpaceX — Falcon e Dragon'],
  'Apollo-Soyuz Test Project (ASTP)': ['Экспериментальный полёт Apollo — «Союз» (ЭПАС)', 'Apollo・Soyuzテスト計画（ASTP）', 'Apollo-Soyuz测试计划（ASTP）', 'Apollo-Soyuz 시험 계획 (ASTP)', 'Apollo-Soyuz परीक्षण परियोजना (ASTP)', 'مشروع Apollo-Soyuz التجريبي (ASTP)', 'Пробни пројекат Apollo-Soyuz (ASTP)', 'Apollo-Soyuz-Test-Projekt (ASTP)', 'Projet test Apollo-Soyuz (ASTP)', 'Proyecto de pruebas Apollo-Soyuz (ASTP)', 'Programma test Apollo-Soyuz (ASTP)', 'Apollo-Soyuz-testproject (ASTP)', 'Projeto de Teste Apollo-Soyuz (ASTP)'],
  'Hope Probe': ['Зонд Hope', 'Hope探査機', 'Hope探测器', 'Hope 탐사선', 'Hope प्रोब', null, 'Сонда Hope', 'Hope-Sonde', 'Sonde Hope', 'Sonda Hope', 'Sonda Hope', 'Hope-sonde', 'Sonda Hope'],
  // "Project Kuiper", "Starship Demo" are program/mission names (checker) — kept; only broken forms reset.
  'Starship Demo': [null, null, null, null, null, 'Starship Demo', null, null, null, null, null, null, 'Starship Demo'],
  'Starship Mars Crew': [null, 'Starship有人火星飛行', 'Starship载人火星任务', 'Starship 화성 유인 비행', null, 'Starship طاقم المريخ', null, 'Starship-Marsbesatzung', 'Starship équipage martien', 'Starship tripulación a Marte', 'Starship equipaggio per Marte', 'Starship Mars-bemanning', 'Starship tripulação para Marte'],
  'GEO Belt': ['Геостационарный пояс', '静止軌道帯', '地球静止轨道带', '정지 궤도대', null, 'حزام المدار الثابت بالنسبة للأرض', null, 'GEO-Gürtel', 'Ceinture GEO', null, 'Fascia GEO', null, 'Cinturão GEO'],
};
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
let n = 0;
for (const s of ['fleet', 'programs', 'missions', 'earth-objects'])
  for (const f of walk(`i18n-src/en-US/${s}`)) {
    const en = JSON.parse(fs.readFileSync(f, 'utf8')).name;
    if (!T[en]) continue;
    const rel = f.slice('i18n-src/en-US/'.length);
    for (const [i, loc] of L.entries()) {
      const nu = T[en][i];
      if (nu === null) continue;
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
