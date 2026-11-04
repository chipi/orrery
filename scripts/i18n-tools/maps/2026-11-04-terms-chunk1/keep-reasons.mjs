// Chunk 1: one reason per kept field instead of the shared one (operator, 2026-11-04: check the
// open items now, not at the end). Categories from the field texts, every field read before:
// the Shuttle sense of "orbiter", a part of the craft, a suitlock, a generic word for the craft,
// or a natural omission. The text hash stays: the field's text did not change.
import fs from 'node:fs';

const K = 'scripts/i18n-tools/term-keeps.json';
const keeps = JSON.parse(fs.readFileSync(K, 'utf8'));
const OLD = 'read 2026-11-04 (chunk 1): natural rendering';
const GENERIC = {
  ru: /аппарат|зонд|корабл|модул|машин/u,
  ja: /探査機|機体|宇宙機|観測機|宇宙船/u,
  'zh-CN': /探测器|航天器|飞船|舱|车/u,
  ko: /탐사선|우주선|기체|착륙/u,
  hi: /यान|रोबोट/u,
  ar: /مركب|مسبار|العربة|جهاز|محفظة|غرفة|حجرة|الفتحة/u,
  'sr-Cyrl': /летелиц|сонд|модул|возил|бродов|Shuttle/u,
  de: /Sonde|Raumschiff|Raumfahrzeug|Raumgleiter|Kapsel|Landeplattform|MK1|Stufe/u,
  fr: /sonde|engin|vaisseau|module|plate-forme|orbiter/iu,
  es: /sonda|nave|módulo|artefacto|vehículo|etapa|superior/iu,
  it: /sonda|veicolo|modul|navicella|orbitale|piattaforma|secondo|camera/iu,
  nl: /sonde|ruimtevaartuig|voertuig|module|begeleider|landingsdek|bovenst/iu,
  'pt-BR': /sonda|nave|módulo|veículo|missão|plataforma|comporta|caminhantes|traje/iu,
};
const read = (rel, loc) => {
  const f = `i18n-src/${loc}/${rel}`;
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
};
const get = (o, at) => at.split('.').reduce((v, k) => v?.[k], o);
const count = {};
for (const [key, v] of Object.entries(keeps)) {
  if (!v.why.startsWith(OLD)) continue;
  const [term, loc, where] = key.split('|');
  const [rel, at] = where.split(' :: ');
  const en = String(get(read(rel, 'en-US'), at) ?? '');
  const tr = String(get(read(rel, loc), at) ?? '');
  let why;
  if (
    term === 'orbiter' &&
    /Shuttle|Buran|OV-1\d\d|Discovery|Endeavour|Columbia|Atlantis|Challenger|STS-/.test(en)
  )
    why = 'the Shuttle / Buran orbiter: another sense than the binding (a robotic orbiter)';
  else if (/orbiter section|orbiter \+ lander|lander capsule|lander deck|lander-mission/i.test(en))
    why = 'a part of the craft (orbital section, landing capsule, deck), written as such';
  else if (term === 'airlock' && /suitlock/i.test(en))
    why = 'a suitlock: written as its own device';
  else if (GENERIC[loc]?.test(tr))
    why = 'a generic word for the craft (probe, spacecraft, module, vehicle) in running text';
  else why = 'natural omission: the sentence does without the word';
  v.why = `read 2026-11-04 (chunk 1): ${why}`;
  count[why] = (count[why] ?? 0) + 1;
}
fs.writeFileSync(K, JSON.stringify(keeps, null, 2) + '\n');
console.log(count);
