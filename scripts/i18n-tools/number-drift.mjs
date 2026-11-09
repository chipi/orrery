/**
 * Numbers in the English that are missing from the translation, field by field — the cheapest
 * sign of a changed fact (the 2026-10-31 hill-sphere "80×" for 333,000× was one). Read-only.
 *
 *   node scripts/i18n-tools/number-drift.mjs [tree=science|all] [locales=all] [--list] [--changed]
 *                                            [--json] [--no-dates]
 *
 * Numbers are compared as values: "149,597,870,700", "149.597.870.700", "149 597 870 700" and
 * "1,5"/"1.5" are the same; Eastern Arabic and Devanagari digits are read as digits. A number
 * the translation writes as a word ("two", "zwei") or rounds is reported too — read the list,
 * it is a finder, not a verdict. Years, ordinals and list numbers count like any other number.
 *
 * Dates are compared as dates, not as the numbers inside them: "February 12" = "12.02." =
 * "12 февраля" = "2月12日" = "12 de febrero" all become the token md:02-12; "February 1997" and
 * "02.1997" become the year 1997 alone (a month with no day is not compared: Russian and Serbian
 * decline it, "в октябре"). A year stays a plain number, so a dropped or changed year
 * is still reported. Month names come from Intl (long and short, "jul", "janv."; English short
 * names are matched capitalised). A bare month name with no number
 * beside it is not a date here and is ignored on both sides.
 *
 * tree=all walks every tree under i18n-src/en-US (directories and single .json files).
 * --json prints { trees: { <tree>: { <locale>: { fields, withMissing } } }, totals: { <locale>: n,
 * all: n } } for a gate to consume. --no-dates switches the date handling off (the old behaviour).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { isMain } from './garble-lib.mjs';

const ALL_LOCS = [
  'de',
  'es',
  'fr',
  'it',
  'pt-BR',
  'nl',
  'ru',
  'sr-Cyrl',
  'ja',
  'ko',
  'zh-CN',
  'hi',
  'ar',
];

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
  [/^(quadrillion)(?![\p{L}])/iu, 1e15],
  [/^(quintillion)(?![\p{L}])/iu, 1e18],
  [/^(लाख)/u, 1e5],
  [/^(करोड़|करोड)/u, 1e7],
];
const MYRIAD = { 万: 1e4, 萬: 1e4, 만: 1e4, 亿: 1e8, 億: 1e8, 억: 1e8 };

// ---- dates ---------------------------------------------------------------------------------

const EN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const SPAN = '\u0001'; // stands where a date was; not whitespace, so the numbers beside it never merge
// Russian and Serbian decline the month after a day ("15. августа"); Intl gives sr only the nominative.
const INFLECTED = new Set(['ru', 'sr-Cyrl']);
// No capitals to tell a sentence start by, so a decimal at a sentence end cannot be told from dd.mm.
const CASELESS = new Set(['ar', 'hi', 'ja', 'ko', 'zh-CN']);
const L = '\\p{L}\\p{M}';
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Hindi writes फ़रवरी with and without the nukta; match both.
const nukta = (s) => s.normalize('NFD').replace(/़/g, '').normalize('NFC');

const monthCache = new Map();
// Month-name alternation for one locale, longest first, and name -> month number.
function monthTable(loc) {
  const hit = monthCache.get(loc);
  if (hit) return hit;
  const names = new Map();
  const longs = new Map();
  const add = (name, m, long = false) => {
    name = nukta(name.trim().replace(/\.$/, '').toLowerCase());
    if (name && !/[\d\u3400-\u9fff\uac00-\ud7af\u3040-\u30ff]/.test(name)) {
      names.set(name, m + 1);
      if (long) longs.set(name, m + 1);
    }
  };
  const tag = `${loc === 'en-US' ? 'en-US' : loc}-u-ca-gregory-nu-latn`;
  for (let m = 0; m < 12; m++) {
    const d = new Date(Date.UTC(2021, m, 15));
    const part = (o) =>
      new Intl.DateTimeFormat(tag, { timeZone: 'UTC', ...o })
        .formatToParts(d)
        .find((p) => p.type === 'month')?.value;
    for (const o of [
      { month: 'long' },
      { day: 'numeric', month: 'long' },
      { month: 'long', year: 'numeric' },
    ]) {
      const v = part(o);
      if (v) add(v, m, true);
    }
    for (const o of [{ month: 'short' }, { day: 'numeric', month: 'short' }]) {
      const v = part(o);
      if (v && loc !== 'en-US') add(v, m);
    }
    if (loc === 'en-US') {
      add(EN_SHORT[m], m);
      if (m === 8) add('Sept', m);
    }
  }
  if (loc === 'ru') ['мая', 'мае'].forEach((n) => add(n, 4, true));
  if (loc === 'sr-Cyrl') add('маја', 4, true);
  if (loc === 'hi')
    [
      ['अक्तूबर', 9],
      ['सितम्बर', 8],
      ['नवम्बर', 10],
      ['दिसम्बर', 11],
    ].forEach(([n, m]) => add(n, m, true));
  // Names Intl does not give for a locale but the repo's translations use. ar: Levantine months.
  if (loc === 'ar')
    [
      'كانون الثاني',
      'شباط',
      'آذار',
      'نيسان',
      'أيار',
      'حزيران',
      'تموز',
      'آب',
      'أيلول',
      'تشرين الأول',
      'تشرين الثاني',
      'كانون الأول',
    ].forEach((n, i) => add(n, i));
  const list = [...names.keys()].sort((a, b) => b.length - a.length);
  const alt = list.map((n) => esc(n).replace(/ /g, '[\\s\\u00a0]+')).join('|');
  const table = { names, longs, alt };
  monthCache.set(loc, table);
  return table;
}

const reCache = new Map();
function dateRes(loc) {
  const hit = reCache.get(loc);
  if (hit) return hit;
  const en = monthTable('en-US');
  const own = loc === 'en-US' ? null : monthTable(loc);
  // English names are matched case-sensitively and capitalised ("May" the month, not the verb);
  // the locale's own names ignore case.
  const flags = (ci) => (ci ? 'giu' : 'gu');
  const DAY = `(\\d{1,2})(?:st|nd|rd|th|er|º|°|ª)?\\.?`;
  const RANGE2 = `(?:[–—/~〜～-](\\d{1,2})(?:st|nd|rd|th|er|º|°|ª)?\\.?)?`;
  const CONN = `[\\s\\u00a0]*(?:(?:of|de|del|d['’]|the)[\\s\\u00a0]+)?`;
  const YEAR_AFTER = `(?:[\\s\\u00a0]*(?:de[\\s\\u00a0]+)?(\\d{3,4})(?!\\d))?`;
  const enCap = [...en.names.keys()]
    .sort((a, b) => b.length - a.length)
    .map((n) => esc(n[0].toUpperCase() + n.slice(1)))
    .join('|');
  const build = (alt, ci, withMdy) => ({
    // 12 February 1997 / 12th of February / 12–14 février / 12. Februar 1997
    dmy: new RegExp(
      `(?<![\\d.,A-Za-z-])${DAY}${RANGE2}${CONN}(?<![${L}])(${alt})\\.?(?![${L}])${YEAR_AFTER}`,
      flags(ci),
    ),
    // February 12, 1997 / Feb. 12 / February 12–14. Month-first is English only: in fr "Mars 1,52"
    // is the planet. "Long March 5" is a rocket.
    mdy: withMdy
      ? new RegExp(
          `(?<!Long[\\s\\u00a0])(?<![${L}])(${alt})\\.?[\\s\\u00a0]+${DAY}(?!\\d)${RANGE2}(?:,?[\\s\\u00a0]*(\\d{4})(?!\\d))?`,
          flags(ci),
        )
      : null,
  });
  // ru / sr decline the month after a day ("15. августа"; sr "децембра" drops a vowel of
  // "децембар"): match on the first three letters of the long name, "март" in full (not Марс).
  const stemOf = (k) => (k.startsWith('март') ? 'март' : k.slice(0, 3));
  let ownNames = own?.names ?? null;
  let ownAlt = own?.alt;
  if (own && INFLECTED.has(loc)) {
    const stems = new Map([...own.longs].map(([k, m]) => [stemOf(k), m]));
    ownAlt = `(?:${[...stems.keys()].map(esc).join('|')})\\p{L}{0,6}`;
    ownNames = { get: (k) => stems.get(stemOf(k)) };
  }
  const out = {
    en: build(enCap, false, true),
    own: ownAlt ? build(ownAlt, true, false) : null,
    ownNames,
    enNames: en.names,
  };
  reCache.set(loc, out);
  return out;
}

const pad = (n) => String(n).padStart(2, '0');
const validMD = (m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31;
const yr = (y) => String(Number(y));

// Replace every date in s with SPAN and return the canonical tokens: md:MM-DD, plus the
// year as the plain number it is.
export function dateTokens(s, loc = 'en-US') {
  const tokens = [];
  let t = loc === 'hi' ? nukta(s) : s;
  const sub = (re, fn) => {
    t = t.replace(re, (...a) => {
      const r = fn(a);
      if (r === null) return a[0];
      tokens.push(...r);
      return SPAN;
    });
  };
  // ISO yyyy-mm-dd, and yyyy[./]m[./]d (ja, ko "1997. 2. 12.")
  sub(/(?<![\d.,/-])(\d{4})[-/.][\s\u00a0]?(\d{1,2})[-/.][\s\u00a0]?(\d{1,2})(?![\d])\.?/g, (a) =>
    validMD(+a[2], +a[3]) ? [`md:${pad(a[2])}-${pad(a[3])}`, yr(a[1])] : null,
  );
  // 2009-05: a year and a month; the month alone is not compared
  sub(/(?<![\d.,/-])(\d{4})-(0[1-9]|1[0-2])(?![\d-])/g, (a) => [yr(a[1])]);
  // CJK: 1967年1月27日, 2月12日, 1969년 7월 20일. A bare N月 is left alone: "Apollo 11月面" is the Moon.
  sub(
    /(?:(\d{3,4})\s*[年년]\s*)?(\d{1,2})\s*[月월](?:\s*(\d{1,2})(?:\s*[~〜～–-]\s*(\d{1,2}))?\s*[日号號일])?/gu,
    (a) => {
      if (!a[1] && !a[3]) return null;
      const out = [];
      if (a[3]) out.push(`md:${pad(a[2])}-${pad(a[3])}`);
      if (a[4]) out.push(`md:${pad(a[2])}-${pad(a[4])}`);
      if (a[1]) out.push(yr(a[1]));
      return out;
    },
  );
  if (loc !== 'en-US') {
    // 12.02.1997 / 12/02/1997 / 12-02-1997 and 12.02. (not 3.5: the trailing dot or the year is required)
    // sr writes "24. 9. 2023." with spaces
    sub(
      /(?<![\d.,/-])(\d{1,2})(?:\.[\s\u00a0]?|[/-])(\d{1,2})(?:\.[\s\u00a0]?|[/-])(\d{4})(?!\d)/g,
      (a) => (validMD(+a[2], +a[1]) ? [`md:${pad(a[2])}-${pad(a[1])}`, yr(a[3])] : null),
    );
    // 12.02. is a date; "Mars 1.5." at a sentence end is a decimal, so there the month needs two digits
    sub(/(?<![\p{L}\d.,/-])(\d{1,2})\.(\d{1,2})\.(?![\d])/gu, (a) => {
      const after = a[a.length - 1].slice(a[a.length - 2] + a[0].length);
      const sentenceEnd = CASELESS.has(loc) || /^[\s\u00a0]*$|^[\s\u00a0]+\p{Lu}/u.test(after);
      if (sentenceEnd && a[2].length < 2) return null;
      return validMD(+a[2], +a[1]) ? [`md:${pad(a[2])}-${pad(a[1])}`] : null;
    });
    sub(/(?<![\d.,/-])(\d{1,2})\.(\d{4})(?!\d)/g, (a) =>
      +a[1] >= 1 && +a[1] <= 12 ? [yr(a[2])] : null,
    );
  }
  const r = dateRes(loc);
  const sets = [];
  if (r.own) sets.push([r.own, r.ownNames]);
  sets.push([r.en, r.enNames]);
  for (const [re, names] of sets) {
    const mon = (x) => {
      const k = nukta(x.replace(/\.$/, '').toLowerCase().replace(/\s+/g, ' '));
      return names.get(k);
    };
    // dmy groups: 1 day, 2 day2, 3 month, 4 year
    sub(re.dmy, (a) => {
      const m = mon(a[3]);
      if (!m || !validMD(m, +a[1])) return null;
      const out = [`md:${pad(m)}-${pad(a[1])}`];
      if (a[2]) out.push(`md:${pad(m)}-${pad(a[2])}`);
      if (a[4]) out.push(yr(a[4]));
      return out;
    });
    // mdy groups: 1 month, 2 day, 3 day2, 4 year
    if (re.mdy)
      sub(re.mdy, (a) => {
        const m = mon(a[1]);
        if (!m || !validMD(m, +a[2])) return null;
        const out = [`md:${pad(m)}-${pad(a[2])}`];
        if (a[3]) out.push(`md:${pad(m)}-${pad(a[3])}`);
        if (a[4]) out.push(yr(a[4]));
        return out;
      });
  }
  return { rest: t, tokens };
}

// ---- numbers -------------------------------------------------------------------------------

// Every number as a canonical value string. Grouping separators (, . space thin-space) between
// groups of three are dropped; a remaining single , or . is a decimal point.
// fr / de / nl / sr-Cyrl use the long scale: billion = 10^12, trillion = 10^18 (sr трилион).
const LONG_SCALE = new Set(['fr', 'de', 'nl', 'sr-Cyrl']);
export function numbers(s, loc = 'en-US', dates = true) {
  const out = [];
  let t = ascii(s)
    .replace(/\[[^\]]*\]\([^)]*\)/g, (m) => m.replace(/\(.*\)$/, '')) // drop link targets
    .replace(/https?:\/\/\S+/g, '');
  if (dates) {
    const d = dateTokens(t, loc);
    t = d.rest;
    out.push(...d.tokens);
  }
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
    if (LONG_SCALE.has(loc)) {
      if (/^(billions?|billionen?|biljoen|билион[аи]?)(?![\p{L}])/iu.test(rest)) unit = 1e12;
      if (/^(trillions?|trillionen?|triljoen|трилион[аи]?)(?![\p{L}])/iu.test(rest)) unit = 1e18;
    }
    const v = Math.round(Number(n) * unit * 1e6) / 1e6;
    // 1億5000万: a 億 value followed directly by a 万 value is one number.
    const prev = out.length && t.slice(0, m.index).match(/[億亿억]$/) ? out.pop() : null;
    out.push(String(prev !== null && unit === 1e4 ? Number(prev) + v : v));
    if (prev !== null && unit !== 1e4) out.splice(-1, 0, prev);
  }
  return out;
}

// English values missing from the translation, and values only the translation has.
export function drift(en, tr, loc, dates = true) {
  const have = numbers(tr, loc, dates);
  const enAll = numbers(en, 'en-US', dates);
  const missing = enAll.filter((n) => {
    const i = have.indexOf(n);
    if (i < 0) return true;
    have.splice(i, 1);
    return false;
  });
  if (dates) {
    // The day number is the old test. A date the translation writes with a month name Intl does not
    // know still has its day (md missing, plain day present); and "Soyuz 14 jul 1974" read as a
    // date by the translation side leaves a day the English has as a plain number.
    const day = (t) => (t.startsWith('md:') ? String(Number(t.slice(-2))) : null);
    const take = (arr, pred) => {
      const i = arr.findIndex(pred);
      if (i < 0) return false;
      arr.splice(i, 1);
      return true;
    };
    for (const m of [...missing]) {
      const d = day(m);
      const ok = d !== null ? take(have, (h) => h === d) : take(have, (h) => day(h) === m);
      if (ok) missing.splice(missing.indexOf(m), 1);
    }
  }
  const extra = have.filter((n) => !enAll.includes(n));
  return { missing, extra };
}

// ---- walk ----------------------------------------------------------------------------------

const SRC = 'i18n-src/en-US';
const walk = (d) =>
  statSync(d).isFile()
    ? [d]
    : readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory()
          ? walk(`${d}/${e.name}`)
          : e.name.endsWith('.json')
            ? [`${d}/${e.name}`]
            : [],
      );
const pairs = (e, t, at, out) => {
  if (typeof e === 'string' && typeof t === 'string') out.push([at, e, t]);
  else if (e && t && typeof e === 'object')
    for (const k of Object.keys(e)) if (k in t) pairs(e[k], t[k], at ? `${at}.${k}` : k, out);
  return out;
};
export const allTrees = () =>
  readdirSync(SRC)
    .map((n) => n.replace(/\.json$/, ''))
    .sort();
const treePath = (tree) =>
  existsSync(`${SRC}/${tree}`) ? `${SRC}/${tree}` : `${SRC}/${tree}.json`;

// Scan one tree for one locale. Calls onHit(file, at, missing, extra) per field with a miss.
export function scan(tree, loc, { changed = false, dates = true, onHit } = {}) {
  let fields = 0;
  let hits = 0;
  for (const f of walk(treePath(tree))) {
    const tf = f.replace('/en-US', `/${loc}`);
    if (!existsSync(tf)) continue;
    for (const [at, e, t] of pairs(
      JSON.parse(readFileSync(f, 'utf8')),
      JSON.parse(readFileSync(tf, 'utf8')),
      '',
      [],
    )) {
      fields++;
      const { missing, extra } = drift(e, t, loc, dates);
      if (!missing.length) continue;
      if (changed && !extra.length) continue;
      hits++;
      onHit?.(f, at, missing, extra);
    }
  }
  return { fields, withMissing: hits };
}

function main(argv) {
  const args = argv.slice(2);
  const tree = args.find((a) => !a.startsWith('--') && !a.includes(',')) ?? 'science';
  const locArg = args.find(
    (a) => a.includes(',') || (/^[a-z]{2}(-[A-Za-z]+)?$/.test(a) && a !== tree),
  );
  const LIST = args.includes('--list');
  // --changed: only fields where an English number is missing AND the translation has a number the
  // English lacks — a replaced value, the shape of a changed fact (unit conversions show too).
  const CHANGED = args.includes('--changed');
  const JSON_OUT = args.includes('--json');
  const dates = !args.includes('--no-dates');
  const locs = locArg ? locArg.split(',') : ALL_LOCS;
  const trees = tree === 'all' ? allTrees() : [tree];

  const result = {};
  const totals = {};
  let grand = 0;
  for (const tr of trees) {
    result[tr] = {};
    for (const loc of locs) {
      result[tr][loc] = scan(tr, loc, {
        changed: CHANGED,
        dates,
        onHit: (f, at, missing, extra) => {
          if (LIST && !JSON_OUT)
            console.log(
              `${loc}\t${f.slice(SRC.length + 1)} ${at}\tmissing ${missing.join(', ')}${extra.length ? ` | extra ${extra.join(', ')}` : ''}`,
            );
        },
      });
      totals[loc] = (totals[loc] ?? 0) + result[tr][loc].withMissing;
      grand += result[tr][loc].withMissing;
    }
  }
  if (JSON_OUT)
    console.log(JSON.stringify({ trees: result, totals: { ...totals, all: grand } }, null, 2));
  else console.log(tree === 'all' ? { totals: { ...totals, all: grand } } : result[tree]);
}

if (isMain(import.meta.url)) main(process.argv);
