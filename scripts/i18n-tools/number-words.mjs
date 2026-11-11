/**
 * Numbers a translation writes as words, for number-drift.mjs: "sechsstündig", "ventisettenne",
 * "двух", "اثني عشر", Roman numerals, CJK numerals with scales ("38万4,000", "1억 4,000만").
 * Table-driven per locale; every reader returns canonical value strings like number-drift's own.
 * It is a finder's reader, not a parser of grammar: a spurious match can only hide a missing
 * number, never invent one, and "one" words (ein, un, один, 一) are skipped on purpose because
 * they are articles as often as numbers.
 */

// ---- word tables ---------------------------------------------------------------------------
// kind: u unit 1-9 | t teen 10-19 | s tens 20-90 | H hundreds (own value) | h "hundred" multiplier
// | k "thousand" multiplier | n direct value (half numbers etc.). A trailing $ on a stem: the
// stem must end its token (or be followed by another number stem) so "mil" is not "militar".
// Stems are lowercase with accents removed (see norm()).
const W = (kind, spec) =>
  Object.entries(spec).flatMap(([v, stems]) => stems.split(' ').map((s) => [s, Number(v), kind]));
const TABLE = {
  de: [
    ...W('n', { 1: 'erst', 2: 'doppel zweifach' }),
    ...W('u', {
      1: 'ein',
      2: 'zwei zwo',
      3: 'drei dritt',
      4: 'vier',
      5: 'funf',
      6: 'sechs',
      7: 'sieben siebt',
      8: 'acht',
      9: 'neun',
    }),
    ...W('t', {
      10: 'zehn',
      11: 'elf',
      12: 'zwolf',
      13: 'dreizehn',
      14: 'vierzehn',
      15: 'funfzehn',
      16: 'sechzehn',
      17: 'siebzehn',
      18: 'achtzehn',
      19: 'neunzehn',
    }),
    ...W('s', {
      20: 'zwanzig',
      30: 'dreissig',
      40: 'vierzig',
      50: 'funfzig',
      60: 'sechzig',
      70: 'siebzig',
      80: 'achtzig',
      90: 'neunzig',
    }),
    ...W('h', { 100: 'hundert' }),
    ...W('k', { 1000: 'tausend' }),
    ...W('m', {
      1000000: 'million$ millionen$',
      1000000000: 'milliarde$ milliarden$',
      1000000000000: 'billion$ billionen$',
    }),
    ...W('n', { 0: 'null$' }),
  ],
  nl: [
    ...W('n', { 1: 'eerst', 2: 'dubbel' }),
    ...W('u', {
      1: 'een',
      2: 'twee tweede',
      3: 'drie derde',
      4: 'vier',
      5: 'vijf',
      6: 'zes',
      7: 'zeven',
      8: 'acht',
      9: 'negen',
    }),
    ...W('t', {
      10: 'tien',
      11: 'elf',
      12: 'twaalf',
      13: 'dertien',
      14: 'veertien',
      15: 'vijftien',
      16: 'zestien',
      17: 'zeventien',
      18: 'achttien',
      19: 'negentien',
    }),
    ...W('s', {
      20: 'twintig',
      30: 'dertig',
      40: 'veertig',
      50: 'vijftig',
      60: 'zestig',
      70: 'zeventig',
      80: 'tachtig',
      90: 'negentig',
    }),
    ...W('h', { 100: 'honderd' }),
    ...W('k', { 1000: 'duizend' }),
    ...W('m', { 1000000: 'miljoen$ miljoenen$', 1000000000: 'miljard$ miljarden$' }),
  ],
  fr: [
    ...W('n', { 1: 'premi', 2: 'double$ doubl' }),
    ...W('u', {
      1: 'un$ une$',
      2: 'deux$ deuxi second$ seconde$',
      3: 'trois',
      4: 'quatre$ quatri',
      5: 'cinq',
      6: 'six$ sixi',
      7: 'sept$ septi',
      8: 'huit',
      9: 'neuf$ neuvi',
    }),
    ...W('t', {
      10: 'dix$ dixi',
      11: 'onze',
      12: 'douze',
      13: 'treize',
      14: 'quatorze',
      15: 'quinze',
      16: 'seize',
    }),
    ...W('s', { 20: 'vingt', 30: 'trente', 40: 'quarante', 50: 'cinquante', 60: 'soixante' }),
    ...W('h', { 100: 'cent$ cents$' }),
    ...W('k', { 1000: 'mille$ mil$' }),
    ...W('m', { 1000000: 'million$ millions$', 1000000000: 'milliard$ milliards$' }),
    ...W('n', { 0: 'zero$' }),
  ],
  es: [
    ...W('n', { 1: 'primer', 2: 'doble$ doble' }),
    ...W('u', {
      1: 'uno$ un$',
      2: 'dos$ segund',
      3: 'tres$ tercer',
      4: 'cuatro cuart',
      5: 'cinco quint',
      6: 'seis$ sext',
      7: 'siete$ septim',
      8: 'ocho octav',
      9: 'nueve noven',
    }),
    ...W('t', {
      10: 'diez$',
      11: 'once$',
      12: 'doce$',
      13: 'trece$',
      14: 'catorce$',
      15: 'quince$',
    }),
    ...W('s', {
      10: 'dieci',
      20: 'veinte$ veinti vigesim',
      30: 'treinta',
      40: 'cuarenta',
      50: 'cincuenta',
      60: 'sesenta',
      70: 'setenta',
      80: 'ochenta',
      90: 'noventa',
    }),
    ...W('H', {
      100: 'cien$ ciento$',
      200: 'doscientos doscientas',
      300: 'trescientos trescientas',
      400: 'cuatrocientos',
      500: 'quinientos',
      600: 'seiscientos',
      700: 'setecientos',
      800: 'ochocientos',
      900: 'novecientos',
    }),
    ...W('k', { 1000: 'mil$ miles$' }),
    ...W('m', { 1000000: 'millon$ millones$', 1000000000: 'billon$' }),
    ...W('n', { 0: 'cero$' }),
  ],
  it: [
    ...W('n', { 1: 'primo$ prima$ primi$ prime$', 2: 'doppio$ doppia$ doppi' }),
    ...W('u', {
      1: 'uno$ un$ una$',
      2: 'due$ second$ seconda$ secondo$ secondi$ seconde$',
      3: 'tre$ terz',
      4: 'quattro quart',
      5: 'cinque quint',
      6: 'sei$ sest',
      7: 'sette settim',
      8: 'otto$ ottav',
      9: 'nove$ nono$',
    }),
    ...W('t', {
      10: 'dieci$ decim',
      11: 'undici undicesim',
      12: 'dodici',
      13: 'tredici',
      14: 'quattordici',
      15: 'quindici',
      16: 'sedici',
      17: 'diciassette',
      18: 'diciotto',
      19: 'diciannove',
    }),
    ...W('s', {
      20: 'venti vent',
      30: 'trenta trent',
      40: 'quaranta quarant',
      50: 'cinquanta cinquant',
      60: 'sessanta sessant',
      70: 'settanta settant',
      80: 'ottanta ottant',
      90: 'novanta novant',
    }),
    ...W('h', { 100: 'cento$ cent' }),
    ...W('k', { 1000: 'mille$ mila$ mil$' }),
    ...W('n', { 2000: 'duemila$' }),
    ...W('m', { 1000000: 'milione$ milioni$', 1000000000: 'miliardo$ miliardi$' }),
    ...W('n', { 0: 'zero$' }),
  ],
  'pt-BR': [
    ...W('n', { 1: 'primeir', 2: 'dobro$ dobr' }),
    ...W('u', {
      1: 'um$ uma$',
      2: 'dois$ duas$ segund',
      3: 'tres$ terceir',
      4: 'quatro quart',
      5: 'cinco quint',
      6: 'seis$ sext',
      7: 'sete$ setim',
      8: 'oito$ oitav',
      9: 'nove$ nono$',
    }),
    ...W('m', { 1000000: 'milhao$ milhoes$', 1000000000: 'bilhao$ bilhoes$' }),
    ...W('t', {
      10: 'dez$ decim',
      11: 'onze$',
      12: 'doze$',
      13: 'treze$',
      14: 'catorze$ quatorze$',
      15: 'quinze$',
      16: 'dezesseis dezasseis',
      17: 'dezessete dezassete',
      18: 'dezoito',
      19: 'dezenove dezanove',
    }),
    ...W('s', {
      20: 'vinte$ vigesim',
      30: 'trinta',
      40: 'quarenta',
      50: 'cinquenta',
      60: 'sessenta',
      70: 'setenta',
      80: 'oitenta',
      90: 'noventa',
    }),
    ...W('H', {
      100: 'cem$ cento$',
      200: 'duzentos duzentas',
      300: 'trezentos trezentas',
      400: 'quatrocentos',
      500: 'quinhentos',
      600: 'seiscentos',
      700: 'setecentos',
      800: 'oitocentos',
      900: 'novecentos',
    }),
    ...W('k', { 1000: 'mil$' }),
    ...W('n', { 0: 'zero$' }),
  ],
  ru: [
    ...W('u', {
      2: 'два две двух двум двумя двое втор',
      3: 'три трех трем тремя трое трет',
      4: 'четыр четвер',
      5: 'пят',
      6: 'шест',
      7: 'семь$ семи седьм',
      8: 'восем восьм',
      9: 'девят',
    }),
    ...W('t', {
      10: 'десят',
      11: 'одиннадцат',
      12: 'двенадцат',
      13: 'тринадцат',
      14: 'четырнадцат',
      15: 'пятнадцат',
      16: 'шестнадцат',
      17: 'семнадцат',
      18: 'восемнадцат',
      19: 'девятнадцат',
    }),
    ...W('s', {
      20: 'двадцат',
      30: 'тридцат',
      40: 'сорок',
      50: 'пятидесят пятьдесят',
      60: 'шестидесят шестьдесят',
      70: 'семидесят семьдесят',
      80: 'восьмидесят восемьдесят',
      90: 'девяност',
    }),
    ...W('H', {
      100: 'сто$ ста$',
      200: 'двести двухсот двухсотый',
      300: 'триста трехсот',
      400: 'четыреста четырехсот',
      500: 'пятьсот пятисот',
      600: 'шестьсот шестисот',
      700: 'семьсот семисот',
      800: 'восемьсот восьмисот',
      900: 'девятьсот девятисот',
    }),
    ...W('k', { 1000: 'тысяч тысячелет' }),
    ...W('m', { 1000000: 'миллион', 1000000000: 'миллиард' }),
    ...W('n', {
      0: 'ноль$ нуль$ нул',
      2: 'вдвое$ вдвойне$',
      3: 'втрое$ втройне$',
      100: 'стометр столет',
      1: 'один$ одна$ одно$ одной$ одного$ одному$ одним$ перв',
    }),
  ],
  'sr-Cyrl': [
    ...W('u', {
      2: 'два две двије дво другог',
      3: 'три тро трећ',
      4: 'четири четвор',
      5: 'пет',
      6: 'шест',
      7: 'седам седм',
      8: 'осам осм',
      9: 'девет',
    }),
    ...W('t', {
      10: 'десет',
      11: 'једанаест',
      12: 'дванаест',
      13: 'тринаест',
      14: 'четрнаест',
      15: 'петнаест',
      16: 'шеснаест',
      17: 'седамнаест',
      18: 'осамнаест',
      19: 'деветнаест',
    }),
    ...W('s', {
      20: 'двадесет',
      30: 'тридесет',
      40: 'четрдесет',
      50: 'педесет',
      60: 'шездесет',
      70: 'седамдесет',
      80: 'осамдесет',
      90: 'деведесет',
    }),
    ...W('H', {
      100: 'сто$ стоти',
      200: 'двеста',
      300: 'триста',
      400: 'четиристо',
      500: 'петсто',
      600: 'шестсто',
      700: 'седамсто',
      800: 'осамсто',
      900: 'деветсто',
    }),
    ...W('k', { 1000: 'хиљад' }),
    ...W('m', { 1000000: 'милион', 1000000000: 'милијард' }),
    ...W('n', {
      0: 'нула$',
      2: 'други$ друга$ друго$ другој$',
      1: 'један$ једна$ једно$ једне$ једног$ једној$ једну$ први прв',
    }),
  ],
  ar: [
    ...W('u', {
      2: 'اثنان اثنين اثنا اثني اثنتان اثنتين اثنتا ثنتين ثاني$ ثانيه$',
      1: 'احد حادي',
      3: 'ثلاث ثالث',
      4: 'اربع رابع',
      5: 'خمس خامس',
      6: 'ست$ سته سادس',
      7: 'سبع سابع',
      8: 'ثمان ثامن',
      9: 'تسع تاسع',
    }),
    ...W('s', {
      10: 'عشر',
      20: 'عشرين عشرون',
      30: 'ثلاثين ثلاثون',
      40: 'اربعين اربعون',
      50: 'خمسين خمسون',
      60: 'ستين ستون',
      70: 'سبعين سبعون',
      80: 'ثمانين ثمانون',
      90: 'تسعين تسعون',
    }),
    ...W('h', { 100: 'مايه مئه مائه' }),
    ...W('n', {
      2000: 'الفين$',
      2000000: 'مليوني$ مليونين$ مليونان$',
      2000000000: 'ملياري$ مليارين$ ملياران$',
      200: 'مئتي مئتين مائتين مئتان',
    }),
    // duals: the Arabic two is a noun ending ("مركبتَي", "يومين"), not a word of its own
    ...W('n', {
      2: 'ثنائي ضعف$ ضعفي منطقتان ضعفين يومين يومان اسبوعين شهرين سنتين عامين عامان ساعتين ساعتان دقيقتين ثانيتين مرتين مرحلتين مرحلتان رحلتان رحلتين مركبتي مركبتين عجلتي عمليتي ميكروفونين رائدان رائدين مترين لترين ليلتين فردان معززان مركبتان جوالتان قمرين كوكبين محركين محركان مسبارين مهمتين مدارين التحامان',
    }),
    ...W('n', {
      10: 'عاشر',
      1: 'واحد اول$ اولي$ اوله$',
      3: 'ثلث$ ثلثي$',
      4: 'ربع$',
      6: 'سدس$',
      8: 'ثمن$',
    }),
    ...W('k', { 1000: 'الف$ الاف$' }),
    ...W('m', { 1000000: 'مليون$ ملايين$', 1000000000: 'مليار$ مليارات$' }),
    ...W('n', { 0: 'صفر$' }),
  ],
  hi: [
    ...W('u', {
      2: 'दो$ दूसर',
      3: 'तीन तीसर',
      4: 'चार चौथ',
      5: 'पांच',
      6: 'छह$ छः$ छठ',
      7: 'सात',
      8: 'आठ',
      9: 'नौ$',
    }),
    ...W('n', { 1: 'पहल' }),
    ...W('t', {
      10: 'दस$ दसव',
      11: 'ग्यारह',
      12: 'बारह',
      13: 'तेरह',
      14: 'चौदह',
      15: 'पंद्रह पन्द्रह',
      16: 'सोलह',
      17: 'सत्रह',
      18: 'अठारह',
      19: 'उन्नीस',
    }),
    ...W('s', {
      20: 'बीस',
      21: 'इक्कीस',
      22: 'बाईस',
      23: 'तेईस',
      24: 'चौबीस',
      25: 'पच्चीस',
      26: 'छब्बीस',
      27: 'सत्ताईस',
      28: 'अट्ठाईस',
      30: 'तीस',
      40: 'चालीस',
      50: 'पचास',
      60: 'साठ',
      70: 'सत्तर',
      80: 'अस्सी',
      90: 'नब्बे',
    }),
    ...W('H', { 100: 'सौ$' }),
    ...W('k', { 1000: 'हज़ार हजार' }),
  ],
};
// Half numbers that are one word.
const HALF_DIRECT = {
  hi: [
    ['डेढ़', '1.5'],
    ['ढाई', '2.5'],
  ],
};
const LINKS = {
  de: ['und'],
  nl: ['en'],
  fr: ['et'],
  es: ['y'],
  it: [],
  'pt-BR': ['e'],
  ar: ['و'],
  ru: [],
  'sr-Cyrl': ['и'],
  hi: [],
};
// "und"-order languages say the unit first: siebenundzwanzig, zevenentwintig, ثمانية وعشرين.
const BINDING = { ru: 'ои', 'sr-Cyrl': 'ои' };
const UNIT_FIRST = new Set(['de', 'nl', 'ar']);

export const HALF = {
  de: /halb|einhalb/,
  nl: /half|halve/,
  fr: /demi|moiti/,
  es: /medi[ao]/,
  it: /mezz|met[aà]/,
  'pt-BR': /meia?(?![\p{L}])|metade/u,
  ru: /половин|пол[- ]/,
  'sr-Cyrl': /и\s+по(?![\p{L}])|ипо|пола/u,
  ar: /نصف/,
  hi: /साढ़े|साढे|आधा|आधे|डेढ़|ढाई/,
  ja: /半/,
  'zh-CN': /半/,
  ko: /반|절반/,
};

const norm = (s, loc) => {
  let t = s.toLowerCase();
  if (loc === 'ar')
    return t
      .replace(/[ً-ٰٟـ]/g, '')
      .replace(/[آأإ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي');
  if (loc === 'hi') return t.replace(/़/g, '').replace(/ँ/g, 'ं');
  return t.replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i');
};

const compiled = new Map();
function compile(loc) {
  let c = compiled.get(loc);
  if (c) return c;
  const rows = (TABLE[loc] ?? []).map(([stem, value, kind]) => {
    const exact = stem.endsWith('$');
    return { stem: norm(exact ? stem.slice(0, -1) : stem, loc), exact, value, kind };
  });
  rows.sort((a, b) => b.stem.length - a.stem.length);
  c = { rows, links: new Set((LINKS[loc] ?? []).map((l) => norm(l, loc))) };
  compiled.set(loc, c);
  return c;
}

// Pieces of one token: the number stems it starts with, read left to right. A stem marked $ only
// counts at the end of the token.
function pieces(tok, loc, c, tokId) {
  const out = [];
  let p = 0;
  let linked = false;
  while (p < tok.length) {
    let hit = null;
    for (const r of c.rows) {
      if (!tok.startsWith(r.stem, p)) continue;
      if (r.exact && p + r.stem.length !== tok.length) continue;
      hit = r;
      break;
    }
    if (!hit && out.length) {
      const l = [...c.links].find((x) => x.length > 1 && tok.startsWith(x, p));
      if (l) {
        p += l.length;
        linked = true;
        continue;
      }
    }
    if (!hit && out.length && BINDING[loc]?.includes(tok[p])) {
      p++;
      continue;
    }
    if (!hit) break;
    out.push({ ...hit, linked, tok: tokId });
    linked = false;
    p += hit.stem.length;
  }
  return out;
}

// Put pieces together into numbers: units multiply "hundred"/"thousand", tens take a following
// unit, "und"-order languages put the unit first.
function assemble(ps, loc) {
  const out = [];
  let total = 0;
  let cur = 0;
  let last = null;
  let n = 0;
  let lastTok = -1;
  const flush = () => {
    const v = total + cur;
    if (last && !(n === 1 && v === 1)) out.push(String(v));
    total = 0;
    cur = 0;
    last = null;
    n = 0;
  };
  for (const p of ps) {
    const k = p.kind;
    const prevTok = lastTok;
    lastTok = p.tok;
    if (k === 'n') {
      flush();
      out.push(String(p.value));
      continue;
    }
    if (!last) {
      if (k === 'k' || k === 'm') total = p.value;
      else cur = p.value;
      last = k;
      n = 1;
      continue;
    }
    n++;
    if (k === 'm') {
      total = (total + cur || 1) * p.value;
      cur = 0;
      last = k;
      continue;
    }
    if (
      (k === 'h' || k === 'k') &&
      ['u', 't', 's', 'H', 'h', 'k'].includes(last) &&
      (k === 'k' || last !== 'H')
    ) {
      if (k === 'h') cur = (cur || 1) * 100;
      else {
        total += (cur || 1) * 1000;
        cur = 0;
      }
      last = k;
      continue;
    }
    const ok =
      (last === 's' && k === 'u' && cur % 10 === 0 && !(p.value === 1 && p.tok !== prevTok)) ||
      ((last === 'h' || last === 'H' || last === 'k' || last === 'm') &&
        ['u', 't', 's', 'H'].includes(k)) ||
      (last === 'u' && k === 's' && p.linked && UNIT_FIRST.has(loc)) ||
      (loc === 'fr' && last === 's' && k === 't' && (cur === 60 || cur === 80)) ||
      (loc === 'fr' && last === 'u' && cur === 4 && p.value === 20) ||
      (loc === 'fr' && last === 't' && cur === 10 && k === 'u' && p.value >= 7) ||
      (loc === 'ar' && last === 'u' && p.value === 10 && k === 's');
    if (!ok) {
      flush();
      cur = p.value;
      last = k;
      n = 1;
      continue;
    }
    if (loc === 'fr' && last === 'u' && cur === 4) cur = 80;
    else if (UNIT_FIRST.has(loc) && last === 'u' && k === 's') cur = p.value + cur;
    else cur += p.value;
    last = k;
  }
  flush();
  return out;
}

// Numbers written as words in s (and half-number words).
export function wordNumbers(s, loc) {
  const rows = TABLE[loc];
  const c = rows && compile(loc);
  const out = [];
  for (const [w, v] of HALF_DIRECT[loc] ?? []) if (s.includes(w)) out.push(v);
  if (loc === 'it')
    for (const m of s.matchAll(/(due|tre|quattro|cinque|sei|sette|otto|nove)cent(?:o|esc)/gi))
      out.push(
        String(
          { due: 13, tre: 14, quattro: 15, cinque: 16, sei: 17, sette: 18, otto: 19, nove: 20 }[
            m[1].toLowerCase()
          ],
        ),
      );
  if (loc === 'ar')
    for (const m of s.matchAll(/العقد\s+ال(أول|اول|ثاني|ثالث)/g))
      out.push({ أول: '2000', اول: '2000', ثاني: '2010', ثالث: '2020' }[m[1]]);
  if (!c) return out;
  let buf = [];
  let prevEnd = -1;
  const flush = () => {
    if (buf.length) out.push(...assemble(buf, loc));
    buf = [];
  };
  for (const m of s.matchAll(/[\p{L}\p{M}]+/gu)) {
    const tok = norm(m[0], loc);
    const gap = prevEnd < 0 ? null : s.slice(prevEnd, m.index);
    const adjacent = gap !== null && /^[\s\u00a0-]*$/.test(gap) && gap.length <= 2;
    prevEnd = m.index + m[0].length;
    if (!adjacent) flush();
    if (buf.length && c.links.has(tok)) {
      prevEnd = m.index + m[0].length;
      buf.linkNext = true;
      continue;
    }
    let ps = pieces(tok, loc, c, m.index);
    if (!ps.length && loc === 'ar')
      for (const alt of [
        tok.replace(/^[وبلفك]/, ''),
        tok.replace(/^[وبلفك]?ال(?=.{3})/, ''),
        tok.replace(/^لل(?=.{3})/, ''),
      ]) {
        if (alt === tok || alt.length < 3) continue;
        ps = pieces(alt, loc, c, m.index);
        if (ps.length) {
          if (tok.startsWith('و')) ps[0].linked = true;
          break;
        }
      }
    if (!ps.length) {
      flush();
      continue;
    }
    if (buf.linkNext && ps[0].value === 1) flush();
    else if (buf.linkNext) ps[0].linked = true;
    buf.linkNext = false;
    buf.push(...ps);
  }
  flush();
  return out;
}

// ---- Roman numerals ------------------------------------------------------------------------
// Two or more capitals ("XXI century", "XXIII Congreso"). A single I, V or X is not read: "Saturn V"
// is a name, and the English side never reads one either.
const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
export function romanNumbers(s) {
  const out = [];
  s = s.replace(/[ХІС]/g, (c) => ({ Х: 'X', І: 'I', С: 'C' })[c]); // Cyrillic capitals standing for Roman letters
  for (const m of s.matchAll(
    /(?<![A-Za-zÀ-ɏЀ-ӿ\d])([IVXLC]{2,})(?:ème|e|è|ᵉʳ|ᵉ|ʳ|º|ª|°|th|st|nd|rd)?(?![A-Za-zÀ-ɏЀ-ӿ\d])/gu,
  )) {
    if (!/^C?(?:XC|XL|L?X{0,3})(?:IX|IV|V?I{0,3})$/.test(m[1])) continue;
    let v = 0;
    for (let i = 0; i < m[1].length; i++) {
      const a = ROMAN[m[1][i]];
      const b = ROMAN[m[1][i + 1]] ?? 0;
      v += a < b ? -a : a;
    }
    if (v >= 2 && v <= 39) out.push(String(v));
  }
  return out;
}

// ---- CJK numerals and scales -----------------------------------------------------------------
const KO_NATIVE = {
  한: 1,
  두: 2,
  세: 3,
  네: 4,
  다섯: 5,
  여섯: 6,
  일곱: 7,
  여덟: 8,
  아홉: 9,
  열: 10,
  스무: 20,
  스물: 20,
};
const KANJI = {
  〇: 0,
  零: 0,
  一: 1,
  二: 2,
  三: 3,
  四: 4,
  五: 5,
  六: 6,
  七: 7,
  八: 8,
  九: 9,
  两: 2,
  兩: 2,
};
const HANGUL = { 영: 0, 공: 0, 일: 1, 이: 2, 삼: 3, 사: 4, 오: 5, 육: 6, 칠: 7, 팔: 8, 구: 9 };
const SMALL = { 十: 10, 百: 100, 千: 1000, 십: 10, 백: 100, 천: 1000 };
const BIG = {
  万: 1e4,
  萬: 1e4,
  亿: 1e8,
  億: 1e8,
  兆: 1e12,
  만: 1e4,
  억: 1e8,
  조: 1e12,
  京: 1e16,
  경: 1e16,
};
const DIG = String.raw`\d+(?:,\d{3})*(?:\.\d+)?`;
const DRE = new RegExp(DIG, 'y');
const COUNTER = /[개명번년배회분초세호위층대]/u;
const isHangul = (c) => /[가-힯]/.test(c ?? '');

function evalRun(toks) {
  let total = 0;
  let sec = 0;
  let cur = null;
  let prevN = false;
  let lastBig = Infinity;
  for (const t of toks) {
    if (t.k === 'D') {
      cur = t.v;
      prevN = false;
    } else if (t.k === 'N') {
      cur = prevN && cur !== null ? cur * 10 + t.v : t.v;
      prevN = true;
    } else if (t.k === 'U') {
      sec += (cur ?? 1) * t.v;
      cur = null;
      prevN = false;
    } else {
      const val = sec + (cur ?? 0);
      if (val === 0 && cur === null && total === 0) return null;
      if (val === 0 && cur === null && t.v >= lastBig) total *= t.v;
      else total += Math.round(val * t.v * 1e6) / 1e6;
      lastBig = t.v;
      sec = 0;
      cur = null;
      prevN = false;
    }
  }
  return Math.round((total + sec + (cur ?? 0)) * 1e6) / 1e6;
}

// Replaces numbers written with CJK numerals or scale units by SPAN and returns their values. Pure
// digit runs are left for the digit reader, so "1,000" keeps its separators rules.
export function cjkNumbers(s, loc, SPAN) {
  const ko = loc === 'ko';
  // "4,500~6,500만" and "1–2 百万": the scale at the end of a range is the first number's too.
  s = s.replace(
    /(\d[\d,.]*|[〇一二三四五六七八九十百千]+)(\s?[~～〜–-]\s?)(\d[\d,.]*|[〇一二三四五六七八九十百千]+)(\s?[百千]?[万萬亿億만억京경])/g,
    '$1$4$2$3$4',
  );
  // 一・七三一 is 1.731 (the Japanese middle dot is a decimal point between kanji digits)
  s = s.replace(/([〇一二三四五六七八九]+)・([〇一二三四五六七八九]+)/g, (_, a, b) => {
    const d = (k) => [...k].map((c) => KANJI[c]).join('');
    return `${d(a)}.${d(b)}`;
  });
  if (ko)
    s = s.replace(
      /(?<![가-힣])(한|두|세|네|다섯|여섯|일곱|여덟|아홉|열|스무|스물)(?=\s?(?:번째|개|명|번|배|곳|가지|살|시간|척))/g,
      (w) => KO_NATIVE[w],
    );
  const one = (c) => (ko ? HANGUL[c] : KANJI[c]);
  const small = (c) => SMALL[c];
  const big = (c) => BIG[c];
  const vals = [];
  let out = '';
  let i = 0;
  while (i < s.length) {
    const start = i;
    const toks = [];
    let j = i;
    while (j < s.length) {
      DRE.lastIndex = j;
      const dm = DRE.exec(s);
      const c = s[j];
      const prev = toks[toks.length - 1];
      if ((dm && prev?.k === 'N') || (prev?.k === 'D' && one(c) !== undefined)) break;
      if (dm) {
        toks.push({ k: 'D', v: Number(dm[0].replace(/,/g, '')), at: j });
        j += dm[0].length;
      } else if (one(c) !== undefined) {
        toks.push({ k: 'N', v: one(c), at: j });
        j++;
      } else if (small(c) && !(c === '千' && /[克米瓦赫焦帕卡牛字秒比]/.test(s[j + 1] ?? ''))) {
        toks.push({ k: 'U', v: small(c), at: j });
        j++;
      } else if (
        ko &&
        prev &&
        big(c) &&
        (prev.k === 'N' ||
          (c === '조' && s[j + 1] === '차') ||
          (c === '만' &&
            prev.k === 'D' &&
            (/[이은는을를의에도로와과만큼]/.test(s[j + 1] ?? '') ||
              /[A-Za-z]\s$/.test(s.slice(0, prev.at)))))
      ) {
        break; // 구경 "calibre", 2만이 / Mars 3만 "only 3": not 9e16, not 20,000
      } else if (big(c) && !(c === '兆' && /[秒比瓦赫字焦帕伏欧]/.test(s[j + 1] ?? ''))) {
        toks.push({ k: 'B', v: big(c), at: j });
        j++;
      } else if (
        c === ' ' &&
        prev &&
        ((prev.k === 'B' && /\d/.test(s[j + 1] ?? '')) ||
          (prev.k === 'D' && !ko && (big(s[j + 1]) || (small(s[j + 1]) && big(s[j + 2])))) ||
          (prev.k === 'U' && ko && /\d/.test(s[j + 1] ?? '')))
      )
        j++;
      else break;
    }
    if (!toks.length) {
      out += s[i];
      i++;
      continue;
    }
    if (ko && toks.some((t) => t.k === 'D'))
      while (toks.length && toks[toks.length - 1].k === 'N') j = toks.pop().at;
    i = j;
    const text = s.slice(start, j);
    const hasWord = toks.some((t) => t.k !== 'D');
    const lone = toks.length === 1;
    let ok = hasWord;
    if (ok && toks[0].k === 'B') ok = false;
    if (ok && ko && !toks.some((t) => t.k === 'D')) {
      // Korean sino numerals need a unit, start a word, and a bare unit needs a counter or a stop
      if (!toks.some((t) => t.k === 'U') || isHangul(s[start - 1])) ok = false;
      else if (lone && isHangul(s[j]) && !COUNTER.test(s[j])) ok = false;
    }
    if (ok && !ko && lone && toks[0].k === 'N' && toks[0].v === 1) {
      ok = /^[号號期级級年]/.test(s.slice(j, j + 1)) || s[start - 1] === '之';
    }
    if (ok && !ko && lone && toks[0].k === 'N' && toks[0].v === 0) ok = false;
    const v = ok ? evalRun(toks) : null;
    if (v === null) {
      out += text;
      continue;
    }
    vals.push(String(v));
    out += SPAN;
  }
  return { rest: out, values: vals };
}
