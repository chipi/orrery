// Repair: a glossary swap that already carries the generic word ("フラ・マウロ高地") landed
// in front of the generic word the text had ("Fra Mauro高地" → "フラ・マウロ高地高地"). Collapses
// a doubled descriptor, or a near-synonym right after one, in ja / zh-CN / ko text.
//   node scripts/i18n-tools/dedupe-descriptors.mjs [--write]
import fs from 'node:fs';
import path from 'node:path';
import { writeJsonEdits } from '../lib/json-surgical.mjs';

const write = process.argv.includes('--write');
// [doubled or near-synonym pair, collapsed form]
const PAIRS = [
  [/高地高地/g, '高地'],
  [/平原平原/g, '平原'],
  [/渓谷渓谷/g, '渓谷'],
  [/高原高原/g, '高原'],
  [/(?<=[\p{Script=Hangul}]) 고지 고원/gu, ' 고지'],
  [/ 평원 평원/g, ' 평원'],
  [/ 계곡 계곡/g, ' 계곡'],
  [/ 분화구 분화구/g, ' 분화구'],
  [/ 분화구 크레이터/g, ' 분화구'],
];
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
let n = 0;
for (const loc of ['ja', 'zh-CN', 'ko'])
  for (const f of walk(`i18n-src/${loc}`)) {
    const edits = [];
    const visit = (v, at) => {
      if (typeof v === 'string') {
        const nu = PAIRS.reduce((s, [re, to]) => s.replace(re, to), v);
        if (nu !== v) edits.push({ at, old: v, nu });
        return;
      }
      if (Array.isArray(v)) v.forEach((x, i) => visit(x, at ? `${at}.${i}` : `${i}`));
      else if (v && typeof v === 'object')
        for (const [k, x] of Object.entries(v)) visit(x, at ? `${at}.${k}` : k);
    };
    visit(JSON.parse(fs.readFileSync(f, 'utf8')), '');
    for (const e of edits) console.log(`${f}:${e.at}`);
    n += edits.length;
    if (write && edits.length) writeJsonEdits(f, edits);
  }
console.log(`${n} strings`);
