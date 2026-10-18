// Merge cosmonaut/astronaut name forms (en.wikipedia langlinks, one request) into
// native-terms.json `person`: full-name key and bare-surname key (_bare; _slavic for Soviet
// names). Only fills locales that have no form yet — never overwrites. sr-Cyrl forms that
// sr.wikipedia lacks are transcribed from the ru.wikipedia spelling by the Serbian rules for
// Russian names (marked in sources for the operator to confirm).
//   node merge-cosmonauts.mjs <langlinks.json>   (dry run prints; WRITE=1 writes)
import fs from 'node:fs';

const LL = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const P = 'scripts/i18n-tools/native-terms.json';
const g = JSON.parse(fs.readFileSync(P, 'utf8'));
// wiki title → [full key as the site's English writes it, bare key(s), soviet?]
const MAP = {
  'Georgy Dobrovolsky': ['Georgy Dobrovolsky', ['Dobrovolsky', 'Dobrovolski'], true],
  'Vladislav Volkov': ['Vladislav Volkov', ['Volkov'], true],
  'Viktor Patsayev': ['Viktor Patsayev', ['Patsayev'], true],
  'Pavel Popovich': ['Pavel Popovich', ['Popovich'], true],
  'Yuri Artyukhin': ['Yury Artyukhin', ['Artyukhin'], true],
  'Gennady Sarafanov': ['Gennady Sarafanov', ['Sarafanov'], true],
  'Lev Dyomin': ['Lev Demin', ['Demin'], true],
  'Aleksei Gubarev': ['Aleksei Gubarev', ['Gubarev'], true],
  'Georgy Grechko': ['Georgy Grechko', ['Grechko'], true],
  'Pyotr Klimuk': ['Pyotr Klimuk', ['Klimuk'], true],
  'Vitaly Sevastyanov': ['Vitaly Sevastyanov', ['Sevastyanov'], true],
  'Vasily Lazarev': ['Vasily Lazarev', ['Lazarev'], true],
  'Oleg Makarov (cosmonaut)': ['Oleg Makarov', ['Makarov'], true],
  'Boris Volynov': ['Boris Volynov', ['Volynov'], true],
  'Vitaly Zholobov': ['Vitaly Zholobov', ['Zholobov'], true],
  'Viktor Gorbatko': ['Viktor Gorbatko', ['Gorbatko'], true],
  'Yuri Glazkov': ['Yury Glazkov', ['Glazkov'], true],
  'Vyacheslav Zudov': ['Vyacheslav Zudov', ['Zudov'], true],
  'Valery Rozhdestvensky': ['Valery Rozhdestvensky', ['Rozhdestvensky'], true],
  'Vladimir Dzhanibekov': ['Vladimir Dzhanibekov', ['Dzhanibekov'], true],
  'Viktor Savinykh': ['Viktor Savinykh', ['Savinykh'], true],
  'Valery Kubasov': ['Valery Kubasov', ['Kubasov'], true],
  'Boris Yegorov': ['Boris Yegorov', ['Yegorov'], true],
  'Fred Haise': ['Fred Haise', ['Haise'], false],
  'Edward Gibson': ['Edward Gibson', [], false],
  'William Pogue': ['William Pogue', [], false],
  'Alfred Worden': ['Alfred Worden', ['Worden'], false],
  'C. Gordon Fullerton': ['Gordon Fullerton', [], false],
  'Frank Drake': ['Frank Drake', [], false],
};
// Russian Cyrillic → Serbian Cyrillic (transcription of Russian names).
function ruToSr(s) {
  const V = 'аеёиоуыэюяАЕЁИОУЫЭЮЯ';
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i],
      prev = s[i - 1] ?? ' ',
      next = s[i + 1] ?? '';
    const lower = c.toLowerCase(),
      up = c !== lower;
    const cap = (x) => (up ? x[0].toUpperCase() + x.slice(1) : x);
    const softens = /[ьяюёе]/.test(next.toLowerCase());
    if ((lower === 'л' && /[ья]/.test(next)) || (lower === 'л' && /[юё]/.test(next))) {
      out += cap('љ');
      continue;
    }
    if ((lower === 'н' && /[ья]/.test(next)) || (lower === 'н' && /[юё]/.test(next))) {
      out += cap('њ');
      continue;
    }
    if (/[ьъ]/.test(lower)) continue;
    const afterLN = /[лн]/i.test(prev);
    const map = {
      й: 'ј',
      ы: 'и',
      э: 'е',
      щ: 'шч',
      я: afterLN ? 'а' : 'ја',
      ю: afterLN ? 'у' : 'ју',
      ё: afterLN ? 'о' : /[жчшщц]/i.test(prev) ? 'о' : 'јо',
      е: V.includes(prev) || /[ьъ\s]/.test(prev) || i === 0 ? 'је' : 'е',
    };
    out += map[lower] !== undefined ? cap(map[lower]) : c;
    void softens;
  }
  return out
    .replace(/скиј(?![а-яђјљњћџ])/g, 'ски')
    .replace(/Дж/g, 'Џ')
    .replace(/дж/g, 'џ')
    .replace(/([бвгдзклмнпрстфхцчшж])\1/gi, '$1');
}
// "Гречко, Георгий Михайлович" → { full: "Георгий Гречко", bare: "Гречко" }
const fromRu = (t) => {
  const [sur, rest = ''] = t.split(/,\s*/);
  const first = rest.split(/\s+/)[0];
  return { full: first ? `${first} ${sur}` : sur, bare: sur };
};
const dropPatronymic = (t, sep) => {
  const parts = t.split(sep);
  return parts.length === 3 ? [parts[0], parts[2]].join(sep) : t;
};
const SEP = { ja: '・', 'zh-CN': '·' };
const report = [];
for (const [title, v] of Object.entries(LL)) {
  const m = MAP[title];
  if (!m) {
    report.push(`SKIP ${title} (not mapped)`);
    continue;
  }
  const [fullKey, bareKeys, soviet] = m;
  const full = {},
    bare = {};
  for (const [loc, form] of Object.entries(v)) {
    if (loc === 'qid') continue;
    if (loc === 'ru' && form.includes(',')) {
      const r = fromRu(form);
      full.ru = r.full;
      bare.ru = r.bare;
      continue;
    }
    const sep = SEP[loc] ?? ' ';
    const f = dropPatronymic(form.replace(/\s*\(.*\)$/, ''), sep);
    full[loc] = f.trim();
    bare[loc] = f.trim().split(sep).at(-1);
  }
  let srNote = '';
  if (!full['sr-Cyrl'] && full.ru) {
    full['sr-Cyrl'] = ruToSr(full.ru);
    bare['sr-Cyrl'] = ruToSr(bare.ru);
    srNote = ' (sr transcribed)';
  }
  const fill = (key, forms, extra) => {
    const e = (g.person[key] ??= { ...extra, _qid: v.qid });
    const added = [];
    for (const [loc, f] of Object.entries(forms))
      if (!e[loc]) {
        e[loc] = f;
        added.push(`${loc}=${f}`);
      }
    report.push(`${key}: +${added.length} ${added.join(' | ')}`);
  };
  fill(fullKey, full, {});
  for (const b of bareKeys)
    fill(b, bare, soviet ? { _bare: true, _slavic: true } : { _bare: true });
  if (title === 'C. Gordon Fullerton') g.person[fullKey]['sr-Cyrl'] = 'Гордон Фулертон';
  if (srNote) report.push(`   ${srNote}`);
}
console.log(report.join('\n'));
if (process.env.WRITE) {
  g.sources['Cosmonauts and astronauts (2026-10-18)'] =
    'Forms from en.wikipedia langlinks (one request). sr-Cyrl: sr.wikipedia has articles only for Haise, Pogue and Worden; the other sr-Cyrl forms are transcribed from the ru.wikipedia spelling by the Serbian rules for Russian names — operator to confirm.';
  fs.writeFileSync(P, JSON.stringify(g, null, 2) + '\n');
  console.log('WRITTEN');
}
