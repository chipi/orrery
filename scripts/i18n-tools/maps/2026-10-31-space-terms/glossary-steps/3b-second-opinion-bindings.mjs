// Second opinion on the 11 low-confidence bindings (2026-10-31): binding changes and
// accepted variants. Sources recorded per term:loc.
import fs from 'node:fs';
const GF = '/work/orrery/main/scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const S = g.sources;
const set = (term, loc, { form, add = [], conf, src }) => {
  const e = g.term[term];
  if (form) e[loc] = form;
  e._match[loc] = [...new Set([...e._match[loc], ...add])];
  if (conf) e._confidence[loc] = conf;
  if (src) S[`term:${term}:${loc}`] = src;
};
// nl burn: verb branden is ESA NL usage ("139 minuten branden"); the noun brand/motorbrand
// means a fire — not accepted. (Rem)stoot is the Dutch impulse word.
set('burn', 'nl', {
  add: ['brandt\\b', 'brandde\\p{L}*', '\\p{L}*stoot\\b', '\\p{L}*stoten\\b'],
  src: 'ESA NL (ExoMars TGO: "motoren … branden"); nl.wikipedia Sojoez 29 ("ontstak zijn motoren"); noun "brand" = fire, not accepted (second opinion 2026-10-31)',
});
set('flyby', 'ar', {
  form: 'التحليق القريب',
  add: ['تحليق', 'مرور (ال)?قريب'],
  conf: 'medium',
  src: 'ar.wikipedia "تحليق بالقرب من الكواكب"; MBRSC Emirates Mars Mission pages; site تحليق 169 vs المرور القريب 33 (second opinion 2026-10-31)',
});
set('flyby', 'ko', {
  add: ['근접 ?비행', '근접 ?통과'],
  conf: 'medium',
  src: 'ko.wikipedia 플라이바이 (우주 비행); KASI 근접비행 (second opinion 2026-10-31)',
});
set('flyby', 'nl', {
  add: ['langs \\p{L}+(?: \\p{L}+)? (?:vlieg|vloog|vlogen)', '(?:vlieg|vloog|vlogen)\\p{L}* langs'],
  conf: 'medium',
  src: 'ESA NL uses "flyby" (Juice maan-aarde flyby) and "vliegt langs Venus" (BepiColombo); voorbijvlucht also correct (second opinion 2026-10-31)',
});
set('gravity assist', 'ko', {
  add: ['중력 ?보조'],
  conf: 'medium',
  src: 'ko.wikipedia 스윙바이 (중력 도움); 중력 보조 also used (second opinion 2026-10-31; KARI not verified)',
});
set('gravity assist', 'hi', {
  src: 'hi.wikipedia and PIB use गुरुत्वीय सहायता; no CSTT/ISRO fixed term; site forms all accepted (second opinion 2026-10-31)',
});
set('burn', 'ko', {
  conf: 'medium',
  src: 'KARI Danuri (엔진 연소, 궤도진입기동); 소각 (incineration) wrong (second opinion 2026-10-31)',
});
set('booster', 'es', {
  form: 'propulsor',
  add: ['cohete acelerador'],
  conf: 'medium',
  src: 'ESA España (P120C "propulsores"); "propulsor de apoyo" unattested, 0 site uses (second opinion 2026-10-31)',
});
set('booster', 'pt-BR', {
  form: 'propulsor',
  add: ['impulsionador\\p{L}*', 'foguete lateral', 'acelerad\\p{L}*'],
  conf: 'medium',
  src: 'pt.wikipedia "propulsores auxiliares/laterais"; ESA Portugal "impulsionador"; "propulsor auxiliar" 0 site uses (second opinion 2026-10-31)',
});
// zh-CN: arrival capture is 近火/近月制动 then 进入环X轨道 (CNSA); 轨道捕获 leans to the
// launch-correction sense. 轨道插入 (70 site uses) stays accepted: not settled either way.
set('orbit insertion', 'zh-CN', {
  form: '制动捕获',
  add: ['制动', '进入环\\p{L}轨道'],
  src: "CNSA Tianwen-1 / Chang'e-6 coverage (近火制动, 进入环月轨道, 火星捕获); 轨道插入 unverified (second opinion 2026-10-31)",
});
set('orbit insertion', 'nl', {
  add: ['in een baan (?:om \\p{L}+ )?(?:te )?(?:brengen|gebracht)', 'ingaan van de \\p{L}*baan'],
  src: 'baaninsertie not attested; ESA NL "in een baan gebracht" (second opinion 2026-10-31) — provisional',
});
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
