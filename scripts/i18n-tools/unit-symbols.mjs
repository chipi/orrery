/**
 * One way to write the kilometre per locale (operator, 2026-11-04):
 *   sr-Cyrl — SI symbols stay Latin in Cyrillic text: км → km, км/с → km/s.
 *   zh-CN   — a number takes the symbol (384,400 km, 7.8 km/s, 300 km/h); a word in a sentence is
 *             公里; 千米 → 公里. After 万 / 亿 the word stays (38.4万公里 — "万 km" is not written).
 * ru writes км / км/с consistently and is left alone.
 *
 *   node scripts/i18n-tools/unit-symbols.mjs [--write]     (dry run prints counts + samples)
 *
 * Walks i18n-src/<locale>/** and messages/<locale>.json; only string values change.
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
const CYR = 'А-Яа-яЁёЂђЈјЉљЊњЋћЏџ';

const RULES = {
  'sr-Cyrl': [
    [new RegExp(`(?<![${CYR}])км/с(?![${CYR}])`, 'g'), 'km/s'],
    [new RegExp(`(?<![${CYR}])км(?![${CYR}])`, 'g'), 'km'],
  ],
  'zh-CN': [
    // number + unit word → symbol (a space before the symbol, none before a CJK word)
    [/(\d)\s*(?:公里|千米)\s*\/\s*秒/g, '$1 km/s'],
    [/(\d)\s*(?:公里|千米)每秒/g, '$1 km/s'],
    [/(\d)\s*(?:公里|千米)\s*\/\s*(?:小时|时)/g, '$1 km/h'],
    [/(\d)\s*(?:公里|千米)(?![/每])/g, '$1 km'],
    // the word elsewhere (after 万/亿, or in prose)
    [/千米/g, '公里'],
  ],
};

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.json') ? [`${d}/${e.name}`] : [],
  );
const fix = (v, rules, hit) => {
  if (typeof v === 'string') {
    let s = v;
    for (const [re, to] of rules) s = s.replace(re, to);
    if (s !== v) hit.push([v, s]);
    return s;
  }
  if (Array.isArray(v)) return v.map((x) => fix(x, rules, hit));
  if (v && typeof v === 'object')
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fix(x, rules, hit)]));
  return v;
};

for (const [loc, rules] of Object.entries(RULES)) {
  let fields = 0;
  let files = 0;
  const samples = [];
  for (const f of [...walk(`i18n-src/${loc}`), `messages/${loc}.json`]) {
    const hit = [];
    const out = fix(JSON.parse(readFileSync(f, 'utf8')), rules, hit);
    if (!hit.length) continue;
    files++;
    fields += hit.length;
    for (const [a, b] of hit.slice(0, 2)) {
      const i = [...a].findIndex((c, k) => c !== [...b][k]);
      samples.push(
        `${f}\n   - …${[...a].slice(Math.max(0, i - 25), i + 30).join('')}\n   + …${[...b].slice(Math.max(0, i - 25), i + 30).join('')}`,
      );
    }
    if (WRITE) writeFileSync(f, JSON.stringify(out, null, 2) + '\n');
  }
  console.log(`${loc}: ${fields} fields in ${files} files${WRITE ? ' — written' : ''}`);
  if (!WRITE) console.log(samples.slice(0, 12).join('\n'));
}
