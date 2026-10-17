/**
 * Shared translation rules and output checks for every translation script
 * (scripts/translate-*.mjs, scripts/retranslate-fields.mjs). Built from the
 * 2026-10-17 translation-quality audit (docs/wip/2026-10-17-post-v1-arc-plan.md
 * item 9b): each check below rejects a defect found shipped in the corpus.
 *
 * translate-model.mjs's translationClient() applies BASE_RULES, NAME_POLICY and
 * LOCALE_RULES[locale] to every call and retries an answer that fails
 * problems(); retranslate-fields.mjs calls problems() with the source too.
 */

export const LANGUAGE_NAMES = {
  ar: 'Modern Standard Arabic',
  de: 'German',
  es: 'European Spanish',
  fr: 'French',
  hi: 'Hindi',
  it: 'Italian',
  ja: 'Japanese',
  ko: 'Korean',
  nl: 'Dutch',
  'pt-BR': 'Brazilian Portuguese',
  ru: 'Russian',
  'sr-Cyrl': 'Serbian (Cyrillic script)',
  'zh-CN': 'Simplified Chinese',
};

/** Operator ruling 2026-10-17, binding in every language. */
export const NAME_POLICY = `NAMES — never translate or transliterate a name. Keep every name exactly as the English source writes it, in Latin script, in every language: missions, spacecraft, rockets, stations and modules (Apollo 12, Cygnus, Falcon 9, Voyager 2, Soyuz MS-24, Chang'e 5, Tiangong); companies, agencies and instruments (Northrop Grumman, SpaceX, NASA, ESA, JAXA, Roscosmos, ALSEP, DSN, JWST); people (Neil Armstrong, Sergei Korolev, Johannes Kepler — also inside eponymous terms such as the Hohmann transfer or Kepler's laws); places and sky features (Cape Canaveral, Baikonur, Oceanus Procellarum, Mare Tranquillitatis, Betelgeuse, Andromeda Galaxy as its proper name). Inflect around the name with the language's grammar where needed (a case ending after a hyphen only if the language requires it), but never change the name's letters. Ordinary nouns are translated normally: the Moon, the Sun, Mars, Earth, the Solar System, comet, orbit.`;

export const BASE_RULES = `Translation rules (always):
- Translate the WHOLE text: never shorten, summarise or drop a sentence or clause.
- Write only in the target language and its script. No words from any other language (no Russian in Serbian, no Chinese or Japanese characters in Hindi or Korean, no English left in the prose), except names, which follow the NAMES rule.
- Keep Markdown exactly (**bold**, *italic*, [text](url), lists): translate the visible text, never URLs or link targets.
- Keep numbers, units, formulae and dates; adapt only decimal/thousands separators to the language's convention.
- Never output placeholder tokens such as __ACR0__.`;

export const LOCALE_RULES = {
  'sr-Cyrl': `Serbian rules (strict):
- Standard Serbian, EKAVIAN only (време, место, цео, уместо — never вријеме, мјесто, цијел, умјесто).
- Serbian Cyrillic only for Serbian words. Never Latin letters inside a Cyrillic word, never Russian/Ukrainian/Bulgarian letters or words (я ю ё й щ ы э ъ ь і, это, один, ничего, держи, първи), never a Latin-script Serbian sentence.
- Moon = Месец (not Луна); Sun = Сунце; Solar System = Сунчев систем; Earth = Земља.
- Names follow the NAMES rule: in Latin, exactly as the English writes them (Apollo 12, Cygnus, NASA, ISS, Northrop Grumman, Oceanus Procellarum). Never transliterate a name into Cyrillic and never spell English phonetically in Cyrillic ("тхе", "витх", "Рецоннаиссанце" are wrong). Inflect with a hyphen when a case ending is needed (NASA-ин, Voyager-а), never by gluing Cyrillic letters onto a Latin word.
- Decimal comma (0,967), thousands with a dot (35.786).
- Glossary: International Space Station spelled out = Међународна свемирска станица (acronym ISS); Deep Space Network spelled out = Мрежа за далеки свемир (acronym DSN); lunar mare as a common noun = маре (never кобила).
- Terms: atmospheric entry = улазак у атмосферу; skip entry = улазак са одскоком; coast phase = лет по инерцији; flyby = прелет; rendezvous = сусрет у орбити; hatch = отвор; periapsis = перицентар; stage (of a rocket) = степен (masculine: први степен, првих степена); launch vehicle = ракета-носач; trace gases = гасови у траговима; plane (geometry) = раван.`,
  ru: `Russian rules: Cyrillic only for Russian words; never Latin letters inside a Cyrillic word; names follow the NAMES rule (Latin, as in English).`,
  hi: `Hindi rules: Devanagari for Hindi words; never Chinese/Japanese characters (e.g. 着陸, 弹道 are wrong); names follow the NAMES rule.`,
  ko: `Korean rules: Hangul for Korean words; never Chinese characters/hanja (e.g. 西昌衛星發射中心, 衛星群 are wrong); names follow the NAMES rule.`,
  ar: `Arabic rules: Arabic script for Arabic words; never Cyrillic or other letters inside an Arabic word; names follow the NAMES rule.`,
};

export function systemAddendum(locale) {
  return [BASE_RULES, NAME_POLICY, LOCALE_RULES[locale]].filter(Boolean).join('\n\n');
}

const CYR_LATIN_MIX = /[а-яёђјљњћџ][a-z]|[a-z][а-яёђјљњћџ]/i;
const CHECKS = {
  'sr-Cyrl': [
    [/[яюёйщыэъьі]/i, 'contains Russian/Ukrainian letters'],
    [CYR_LATIN_MIX, 'Latin letters inside a Cyrillic word'],
    [
      /(умјест|вријем|мјест|цијел|цјел|свијет|рјеш|лијеп|пјесм|бијел|ријеч|сјевер|мјесец|тијел|дијел|вјек|снијег|ријек|свјетл)/i,
      'ijekavian form',
    ],
    [
      /(^|[\s(])(тхе|витх|анд|оф|фор|лаунцх|уппер|стаге)(?=[\s,.)]|$)/i,
      'English spelled phonetically in Cyrillic',
    ],
  ],
  ru: [[CYR_LATIN_MIX, 'Latin letters inside a Cyrillic word']],
};
const NATIVE = {
  ar: /\p{Script=Arabic}/u,
  hi: /\p{Script=Devanagari}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  ko: /\p{Script=Hangul}/u,
  'zh-CN': /\p{Script=Han}/u,
  ru: /\p{Script=Cyrillic}/u,
  'sr-Cyrl': /\p{Script=Cyrillic}/u,
};
const FOREIGN =
  /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Cyrillic}]/gu;

/**
 * Problems with a translation `out` of English `src` into `locale` (empty list
 * = acceptable). `src` may be '' when the caller doesn't have it (the client
 * wrapper); the source-dependent checks are then skipped.
 */
export function problems(locale, src, out) {
  const p = [];
  if (typeof out !== 'string' || !out.trim()) return ['empty'];
  src = src || '';
  if (/__[A-ZА-Я]{2,}\d+__/.test(out)) p.push('placeholder token');
  // Names verbatim (NAME_POLICY) — checked for the unambiguous kinds: designations
  // with a digit (Apollo 12, NG-19, RD-181) and CamelCase (SpaceX).
  const MONTH =
    /^(January|February|March|April|May|June|July|August|September|October|November|December)\b/;
  const names = (
    src.match(/\b(?:[A-Z][A-Za-z'’]*[ -]?\d+[A-Za-z]?|[A-Z][a-z]+[A-Z][A-Za-z]+)\b/g) || []
  ).filter(
    (n) =>
      !MONTH.test(n) && // dates are translated ("April 1967")
      !/[ -](1[5-9]|20)\d\d$/.test(n) && // "Pacific 1969": a word before a year
      !/^[A-Z] \d/.test(n), // "A 22-hour …": an article before a number
  );
  const lost = [...new Set(names)].filter((n) => !out.includes(n));
  if (lost.length) p.push(`names changed or missing: ${lost.slice(0, 5).join(', ')}`);
  // Locales not written in Latin: every Latin word in the output must be a name
  // taken verbatim from the source ("Canberri", "Madridu" glue a case ending onto
  // a name; NAME_POLICY wants "Canberra" or "Canberra-и").
  if (src && NATIVE[locale]) {
    // "Grumman's" in the source allows "Grumman" in the output.
    const srcWords = new Set(
      (src.match(/[A-Za-z][A-Za-z'’]*/g) || []).flatMap((w) => [w, w.replace(/['’]s?$/, '')]),
    );
    const altered = [...new Set(out.match(/[A-Za-z][A-Za-z'’]*/g) || [])].filter(
      (w) => !srcWords.has(w),
    );
    if (altered.length)
      p.push(
        `Latin-script words that are not names from the source: ${altered.slice(0, 5).join(', ')} — write every word of the target language in its own script; only names copied exactly from the English stay in Latin (add a case ending after a hyphen, never glued on)`,
      );
  }
  for (const [re, why] of CHECKS[locale] || []) if (re.test(out)) p.push(why);
  const foreign = (out.match(FOREIGN) || []).filter(
    (ch) => !(NATIVE[locale] && NATIVE[locale].test(ch)) && !src.includes(ch),
  );
  if (
    foreign.length >= 2 &&
    !(locale === 'ja' && foreign.every((ch) => /\p{Script=Han}/u.test(ch)))
  )
    p.push(`characters from another script (${[...new Set(foreign)].slice(0, 5).join('')})`);
  if (src.length > 40 && out.trim() === src.trim() && /[a-z]{4} [a-z]{3}/.test(src))
    p.push('returned the English unchanged');
  // English stop-words outside names/links/quotes from the source.
  const stripped = out.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/[“"«‘'][^”"»’']*[”"»’']/g, '');
  const enWords = (stripped.match(/\b(the|and|with|which|that|this|from|into|between)\b/gi) || [])
    .length;
  if (enWords >= 3) p.push('English words left in the translation');
  if (NATIVE[locale] && out.length > 60) {
    // Words that also occur in the source (names) don't count against the script.
    const srcWords = new Set(src.match(/[A-Za-z][A-Za-z'’-]*/g) || []);
    const rest = out.replace(/[A-Za-z][A-Za-z'’-]*/g, (w) => (srcWords.has(w) ? '' : w));
    const letters = (rest.match(/\p{L}/gu) || []).length;
    const native = (rest.match(new RegExp(NATIVE[locale].source, 'gu')) || []).length;
    if (letters > 20 && native / letters < 0.4) p.push('mostly not in the target script');
  }
  return p;
}

/** Every string inside a tool_use input (arrays/objects walked). */
export function stringsIn(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => stringsIn(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => stringsIn(x, out));
  return out;
}
