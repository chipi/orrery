// zh-CN fields still using the non-standard compounds after the trajectory binding change:
// 轨迹修正 → 轨道修正, 自由返回轨迹 → 自由返回轨道 (same forms as the science pages).
//   node …/zh-trajectory-compounds.mjs <out.json> <keeps.json>
import fs from 'node:fs';
const get = (o, at) => at.split('.').reduce((v, k) => v?.[k], o);
const FIELDS = [
  ['science/_landing.json', 'chapters.4.paragraphs.1'],
  ['science/transfers/free-return.json', 'narrative_101.0'],
  ['missions/mars/curiosity.json', 'events.3.note'],
  ['missions/mars/viking1.json', 'events.1.note'],
  ['missions/moon/artemis2.json', 'events.4.note'],
  ['missions/moon/beresheet.json', 'events.2.note'],
];
const edits = FIELDS.map(([rel, at]) => {
  const old = get(JSON.parse(fs.readFileSync(`i18n-src/zh-CN/${rel}`, 'utf8')), at);
  const nu = old.replaceAll('轨迹修正', '轨道修正').replaceAll('自由返回轨迹', '自由返回轨道');
  if (nu === old) throw new Error(`${rel} ${at}: nothing to change`);
  return { rel, at, old, new: nu };
});
fs.writeFileSync(process.argv[2], JSON.stringify(edits, null, 1));
fs.writeFileSync(
  process.argv[3],
  JSON.stringify([
    {
      term: 'trajectory',
      loc: 'zh-CN',
      rel: 'missions/saturn/voyager-1.json',
      at: 'description',
      why: 'path rendered as 最直接路径, natural',
    },
  ]),
);
console.log(edits.length, 'edits');
