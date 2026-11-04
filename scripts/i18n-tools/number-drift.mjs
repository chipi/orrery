/**
 * Numbers in the English that are missing from the translation, field by field — the cheapest
 * sign of a changed fact (the 2026-10-31 hill-sphere "80×" for 333,000× was one). Read-only.
 *
 *   node scripts/i18n-tools/number-drift.mjs [tree=science] [locales=all] [--list]
 *
 * Numbers are compared as values: "149,597,870,700", "149.597.870.700", "149 597 870 700" and
 * "1,5"/"1.5" are the same; Eastern Arabic and Devanagari digits are read as digits. A number
 * the translation writes as a word ("two", "zwei") or rounds is reported too — read the list,
 * it is a finder, not a verdict. Years, ordinals and list numbers count like any other number.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const tree =
  process.argv.slice(2).find((a) => !a.startsWith('--') && !a.includes(',')) ?? 'science';
const locArg = process.argv
  .slice(2)
  .find((a) => a.includes(',') || (/^[a-z]{2}(-[A-Za-z]+)?$/.test(a) && a !== tree));
const LIST = process.argv.includes('--list');
// --changed: only fields where an English number is missing AND the translation has a number the
// English lacks — a replaced value, the shape of a changed fact (unit conversions show too).
const CHANGED = process.argv.includes('--changed');
const LOCS = locArg
  ? locArg.split(',')
  : ['de', 'es', 'fr', 'it', 'pt-BR', 'nl', 'ru', 'sr-Cyrl', 'ja', 'ko', 'zh-CN', 'hi', 'ar'];

const DIGITS = { '٠': 0, '١': 1, '٢': 2, '٣': 3, '٤': 4, '٥': 5, '٦': 6, '٧': 7, '٨': 8, '٩': 9 };
for (let i = 0; i < 10; i++) DIGITS[String.fromCharCode(0x966 + i)] = i; // Devanagari
const ascii = (s) =>
  s
    .replace(/[٠-٩०-९]/g, (c) => DIGITS[c])
    .replace(/(\d)٫(\d)/g, '$1.$2')
    .replace(/(\d)٬(\d)/g, '$1,$2');
// CJK myriad units: 1.5亿 = 150,000,000, 38万 = 380,000 (ko 만 / 억 likewise).
// Scale words after a number, per language (longest first: "mil millones" before "mil").
const SCALE = [
  [/^mil\s+millones\b/i, 1e9],
  [
    /^(thousand|tausend|mille|mil|mila|duizend|тыс\.?|тысяч[аи]?|хиљад[аеи]?|हज़ार|हजार|آلاف|ألف)(?![\p{L}])/iu,
    1e3,
  ],
  [
    /^(million|millions|millionen|million|millón|millones|milione|milioni|milhão|milhões|miljoen|млн\.?|миллион[аов]*|милион[аи]?|مليون|ملايين)(?![\p{L}])/iu,
    1e6,
  ],
  [
    /^(billion|billions|milliarde|milliarden|milliard|milliards|miliardo|miliardi|bilhão|bilhões|miljard|млрд\.?|миллиард[аов]*|милијард[аеи]?|مليار|مليارات|अरब)(?![\p{L}])/iu,
    1e9,
  ],
  [
    /^(trillion|billionen|billion de|bilión|billones|trilhão|trilhões|biljoen|трлн\.?|триллион[аов]*|трилион[аи]?|تريليون)(?![\p{L}])/iu,
    1e12,
  ],
  [/^(लाख)/u, 1e5],
  [/^(करोड़|करोड)/u, 1e7],
];
const MYRIAD = { 万: 1e4, 萬: 1e4, 만: 1e4, 亿: 1e8, 億: 1e8, 억: 1e8 };

// Every number as a canonical value string. Grouping separators (, . space thin-space) between
// groups of three are dropped; a remaining single , or . is a decimal point.
// fr / de / nl use the long scale: billion / Billion / biljoen = 10^12.
const LONG_SCALE = new Set(['fr', 'de', 'nl']);
function numbers(s, loc = 'en-US') {
  const out = [];
  const t = ascii(s)
    .replace(/\[[^\]]*\]\([^)]*\)/g, (m) => m.replace(/\(.*\)$/, '')) // drop link targets
    .replace(/https?:\/\/\S+/g, '');
  for (const m of t.matchAll(
    /(?<!\d)\d{1,3}(?:[.,\u00a0\u202f ]\d{3}(?!\d))+(?:[.,]\d+)?|\d+(?:[.,]\d+)?/g,
  )) {
    let n = m[0].replace(/[\u00a0\u202f ]/g, '');
    if (/[.,]\d{3}(?:[.,]|$)/.test(n) && /^\d{1,3}([.,]\d{3})+([.,]\d+)?$/.test(n)) {
      const dec = n.match(/[.,](\d{1,2}|\d{4,})$/);
      n = dec
        ? n.slice(0, -dec[0].length).replace(/[.,]/g, '') + '.' + dec[1]
        : n.replace(/[.,]/g, '');
    } else n = n.replace(',', '.');
    const after = t.slice(m.index + m[0].length);
    const rest = after.replace(/^[\s\u00a0-]+/, '');
    const scale = SCALE.find(([re]) => re.test(rest));
    let unit = MYRIAD[after[0]] ?? (scale && rest !== after ? scale[1] : 1);
    if (LONG_SCALE.has(loc) && /^(billions?|billionen?|biljoen)\b/i.test(rest)) unit = 1e12;
    const v = Math.round(Number(n) * unit * 1e6) / 1e6;
    // 1億5000万: a 億 value followed directly by a 万 value is one number.
    const prev = out.length && t.slice(0, m.index).match(/[億亿억]$/) ? out.pop() : null;
    out.push(String(prev !== null && unit === 1e4 ? Number(prev) + v : v));
    if (prev !== null && unit !== 1e4) out.splice(-1, 0, prev);
  }
  return out;
}

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.json') ? [`${d}/${e.name}`] : [],
  );
const pairs = (e, t, at, out) => {
  if (typeof e === 'string' && typeof t === 'string') out.push([at, e, t]);
  else if (e && t && typeof e === 'object')
    for (const k of Object.keys(e)) if (k in t) pairs(e[k], t[k], at ? `${at}.${k}` : k, out);
  return out;
};

const summary = {};
for (const loc of LOCS) {
  let fields = 0;
  let hits = 0;
  for (const f of walk(`i18n-src/en-US/${tree}`)) {
    const tf = f.replace('/en-US/', `/${loc}/`);
    if (!existsSync(tf)) continue;
    for (const [at, e, t] of pairs(
      JSON.parse(readFileSync(f, 'utf8')),
      JSON.parse(readFileSync(tf, 'utf8')),
      '',
      [],
    )) {
      fields++;
      const have = numbers(t, loc);
      const missing = numbers(e).filter((n) => {
        const i = have.indexOf(n);
        if (i < 0) return true;
        have.splice(i, 1);
        return false;
      });
      if (!missing.length) continue;
      const extra = have.filter((n) => !numbers(e).includes(n));
      if (CHANGED && !extra.length) continue;
      hits++;
      if (LIST)
        console.log(
          `${loc}\t${f.slice(15)} ${at}\tmissing ${missing.join(', ')}${extra.length ? ` | extra ${extra.join(', ')}` : ''}`,
        );
    }
  }
  summary[loc] = { fields, withMissing: hits };
}
console.log(summary);
