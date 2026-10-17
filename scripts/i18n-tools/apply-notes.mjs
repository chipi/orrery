// Item 4: translate event notes left in English. "<rocket> from <pad>[ <date>[ <time> UTC]]." goes
// through a per-locale template (names stay English); the few other notes are hand-written.
import fs from 'node:fs';
import { writeJsonEdits } from '../lib/json-surgical.mjs';
import { problems } from '../lib/translate-quality.mjs';
const S = 'scripts/i18n-tools/maps/2026-10-17-translation-cleanup';
const R = 'i18n-src';
const T = {
  de: ['{R} von {P}, {D}.', '{R} von {P}.'],
  fr: ['{R} depuis {P}, {D}.', '{R} depuis {P}.'],
  es: ['{R} desde {P}, {D}.', '{R} desde {P}.'],
  it: ['{R} da {P}, {D}.', '{R} da {P}.'],
  'pt-BR': ['{R} a partir de {P}, {D}.', '{R} a partir de {P}.'],
  nl: ['{R} vanaf {P}, {D}.', '{R} vanaf {P}.'],
  ru: ['{R} с {P}, {D}.', '{R} с {P}.'],
  'sr-Cyrl': ['{R} са {P}, {D}.', '{R} са {P}.'],
  ar: ['{R} من {P}، {D}.', '{R} من {P}.'],
  hi: ['{P} से {R}, {D}।', '{P} से {R}।'],
  ja: ['{P} から {R} で打ち上げ、{D}。', '{P} から {R} で打ち上げ。'],
  ko: ['{P}에서 {R} 발사, {D}.', '{P}에서 {R} 발사.'],
  'zh-CN': ['{R} 从 {P} 发射，{D}。', '{R} 从 {P} 发射。'],
};
const SPECIAL = {
  'Vostok 6 (Tereshkova) launched 1963-06-16 09:30 UTC.': {
    de: 'Vostok 6 (Tereshkova) gestartet 1963-06-16 09:30 UTC.',
    fr: 'Vostok 6 (Tereshkova) lancé le 1963-06-16 à 09:30 UTC.',
    es: 'Vostok 6 (Tereshkova) lanzado el 1963-06-16 a las 09:30 UTC.',
    it: 'Vostok 6 (Tereshkova) lanciato il 1963-06-16 alle 09:30 UTC.',
    'pt-BR': 'Vostok 6 (Tereshkova) lançado em 1963-06-16 às 09:30 UTC.',
    nl: 'Vostok 6 (Tereshkova) gelanceerd op 1963-06-16 om 09:30 UTC.',
    ru: 'Vostok 6 (Tereshkova) запущен 1963-06-16 в 09:30 UTC.',
    ar: 'أُطلقت Vostok 6 (Tereshkova) في 1963-06-16 الساعة 09:30 UTC.',
    hi: 'Vostok 6 (Tereshkova) का प्रक्षेपण 1963-06-16 09:30 UTC पर।',
    ja: 'Vostok 6（Tereshkova）が 1963-06-16 09:30 UTC に打ち上げ。',
    ko: 'Vostok 6 (Tereshkova) 발사, 1963-06-16 09:30 UTC.',
    'zh-CN': 'Vostok 6（Tereshkova）于 1963-06-16 09:30 UTC 发射。',
  },
  'Mid-cruise correction.': {
    de: 'Kurskorrektur in der Mitte der Reise.',
    fr: 'Correction de trajectoire à mi-croisière.',
    es: 'Corrección de rumbo a mitad del crucero.',
    it: 'Correzione di rotta a metà crociera.',
    'pt-BR': 'Correção de curso no meio do cruzeiro.',
    nl: 'Koerscorrectie halverwege de reis.',
    ru: 'Коррекция траектории на середине перелёта.',
    ar: 'تصحيح المسار في منتصف الرحلة.',
    hi: 'यात्रा के मध्य में मार्ग सुधार।',
    ja: '巡航中盤の軌道修正。',
    ko: '순항 중반 궤도 수정.',
    'zh-CN': '巡航中段轨道修正。',
  },
  'Trans-lunar injection.': {
    de: 'Translunare Injektion.',
    fr: 'Injection translunaire.',
    es: 'Inyección translunar.',
    it: 'Iniezione translunare.',
    'pt-BR': 'Injeção translunar.',
    nl: 'Translunaire injectie.',
    ru: 'Выход на траекторию полёта к Луне.',
    ar: 'الحقن نحو القمر.',
    hi: 'चंद्र-पारगमन प्रक्षेपण।',
    ja: '月遷移軌道投入。',
    ko: '달 전이 궤도 진입.',
    'zh-CN': '地月转移轨道射入。',
  },
  'Trans-Mars injection.': { 'zh-CN': '地火转移轨道射入。', fr: 'Injection vers Mars.' },
  'Lunar orbit insertion.': { 'zh-CN': '进入环月轨道。' },
  'Atlas V 401 from Cape Canaveral SLC-41 (carried LCROSS impactor as secondary).': {
    'zh-CN': 'Atlas V 401 从 Cape Canaveral SLC-41 发射（作为次要载荷携带 LCROSS 撞击器）。',
  },
  'Soft-landing at Mare Imbrium 1970-11-17.': { 'zh-CN': '1970-11-17 在 Mare Imbrium 软着陆。' },
  'Titan IIIE lifts Voyager 2 from Cape Canaveral on a Grand-Tour trajectory.': {
    'zh-CN': 'Titan IIIE 从 Cape Canaveral 将 Voyager 2 送上“大巡游”轨道。',
  },
};
const PAT = /^(.+?) from (.+?)(?: (\d{4}-\d{2}-\d{2}(?: \d{2}:\d{2} UTC)?))?\.$/;
const loc = process.argv[2];
const rows = JSON.parse(fs.readFileSync(`${S}/notes-full.json`, 'utf8')).filter((r) =>
  r.locs.includes(loc),
);
const errs = [];
const byFile = {};
for (const { file, at, en } of rows) {
  let nu = SPECIAL[en]?.[loc];
  if (!nu) {
    const m = en.match(PAT);
    if (!m || !T[loc]) {
      errs.push(`no rule: ${en}`);
      continue;
    }
    const [, r, p, d] = m;
    nu = (d ? T[loc][0] : T[loc][1])
      .replace('{R}', r)
      .replace('{P}', p)
      .replace('{D}', d ?? '');
  }
  for (const pr of problems(loc, en, nu)) errs.push(`${en} → ${nu}: ${pr.slice(0, 120)}`);
  (byFile[file] ||= []).push({ at, old: en, nu });
}
if (errs.length) {
  console.log(`✗ ${loc}\n  ${errs.join('\n  ')}`);
  process.exit(1);
}
let n = 0;
for (const [file, edits] of Object.entries(byFile)) {
  writeJsonEdits(`${R}/${loc}/${file}`, edits);
  n += edits.length;
}
console.log(`✓ ${loc}: ${n} notes`);
