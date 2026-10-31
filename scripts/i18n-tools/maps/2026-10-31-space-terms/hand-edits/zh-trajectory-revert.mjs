// zh-CN trajectory: the second opinion (2026-10-31, CNTERM 航天科学技术名词 + CNSA/CMSA and
// journal usage) found 轨道 standard for a spacecraft trajectory (弹道 for ballistic and
// launch-vehicle paths; 轨迹 is the locus sense). Rounds 1 and essays had changed 29 fields
// 轨道 → 轨迹 under the old binding; this reverses them. One essays field was 路径 before;
// it becomes 轨道.
//   node …/zh-trajectory-revert.mjs <out.json>   then apply-edits.mjs zh-CN <out.json>
import fs from 'node:fs';
const M = 'scripts/i18n-tools/maps/2026-10-31-space-terms';
const get = (o, at) => at.split('.').reduce((v, k) => v?.[k], o);
const edits = [];
const byField = new Map();
for (const f of ['round1-decisions/zh-CN.json', 'essays-round1-decisions/zh-CN.json'])
  for (const d of JSON.parse(fs.readFileSync(`${M}/${f}`, 'utf8')))
    if (d.term === 'trajectory' && d.decision === 'change') {
      const k = `${d.rel}|${d.at}`;
      byField.set(k, [...(byField.get(k) ?? []), d]);
    }
for (const [k, ds] of byField) {
  const [rel, at] = k.split('|');
  const old = get(JSON.parse(fs.readFileSync(`i18n-src/zh-CN/${rel}`, 'utf8')), at);
  let nu = old;
  for (const d of ds) {
    const back = d.find === '路径也不同' ? '轨道也不同' : d.find;
    if (!nu.includes(d.replace)) throw new Error(`${k}: ${d.replace} not in field`);
    nu = nu.replace(d.replace, back);
  }
  edits.push({ rel, at, old, new: nu });
}
fs.writeFileSync(process.argv[2], JSON.stringify(edits, null, 1));
console.log(edits.length, 'fields');
