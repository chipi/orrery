// zh-CN trajectory → 轨道 (second opinion 2026-10-31: CNTERM 航天科学技术名词 glosses a
// spacecraft's path as 航天器轨道 and 弹道 as the launch-vehicle/ballistic path; CNSA/CMSA and
// journals write 自由返回轨道, 地火转移轨道, 中途修正; 轨迹 is the mathematical locus).
import fs from 'node:fs';
const GF = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(GF, 'utf8'));
const e = g.term.trajectory;
e['zh-CN'] = '轨道';
e._match['zh-CN'] = ['轨道', '飞行轨道', '弹道', '中途修正'];
e._avoid = {
  ...(e._avoid ?? {}),
  'zh-CN': ['自由返回轨迹', '轨迹修正', '转移轨迹', '逃逸轨迹', '返回轨迹'],
};
e._confidence['zh-CN'] = 'medium';
g.sources['term:trajectory:zh-CN'] =
  'second opinion 2026-10-31: CNTERM 航天科学技术名词 (航天器轨道; 弹道 = launch-vehicle/ballistic path), CNSA Tianwen-1 (中途修正, 地火转移轨道), BUAA/航空学报 (自由返回轨道); 轨迹 = locus. Was 轨迹.';
fs.writeFileSync(GF, JSON.stringify(g, null, 2) + '\n');
console.log('ok');
// Accept several (the second opinion's own option; its sources are secondary, medium
// confidence): 轨迹 for a computed or plotted path stays accepted — 43 existing fields use it
// (porkchop "数百万条轨迹", "轨迹如何弯曲"). Only the compounds the sources call non-standard are
// avoided (自由返回轨迹, 轨迹修正, 转移轨迹 …).
const g2 = JSON.parse(fs.readFileSync(GF, 'utf8'));
g2.term.trajectory._match['zh-CN'] = ['轨道', '轨迹', '飞行轨道', '弹道', '中途修正'];
fs.writeFileSync(GF, JSON.stringify(g2, null, 2) + '\n');
