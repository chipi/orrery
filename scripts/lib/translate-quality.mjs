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

import fs from 'node:fs';
import path from 'node:path';
import { nameRendered } from '../../src/lib/name-origins.js';

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
export const NAME_POLICY = `NAMES — never translate or transliterate a name into another language. Keep every name exactly as the English source writes it, in Latin script — except in the name's own language: a Russian/Soviet name is written in its original Cyrillic in Russian (Союз МС-24, Мир, Протон-М, «Луна-9»), a Chinese name in Chinese characters in Chinese (神舟, 天宫, 嫦娥五号), and likewise Japanese, Korean, Hindi and Arabic names in their own language. In every other language: missions, spacecraft, rockets, stations and modules (Apollo 12, Cygnus, Falcon 9, Voyager 2, Soyuz MS-24, Chang'e 5, Tiangong); companies, agencies and instruments (Northrop Grumman, SpaceX, NASA, ESA, JAXA, Roscosmos, ALSEP, DSN, JWST); people (Neil Armstrong, Sergei Korolev, Johannes Kepler — also inside eponymous terms such as the Hohmann transfer or Kepler's laws); spaceports, launch sites, observatories, surface features of the Moon and planets, stars and galaxies (Cape Canaveral, Baikonur, Kennedy Space Center, Arecibo, Oceanus Procellarum, Ocean of Storms, Mare Tranquillitatis, Betelgeuse, Andromeda Galaxy as its proper name). Countries, continents, oceans, regions and cities are ordinary geography and ARE translated normally (Pacific, Inner Mongolia, Kazakhstan, Florida, Russia, Europe). Inflect around the name with the language's grammar where needed (a case ending after a hyphen only if the language requires it), but never change the name's letters. Ordinary nouns are translated normally: the Moon, the Sun, Mars, Earth, the Solar System, comet, orbit.`;

export const BASE_RULES = `Translation rules (always):
- Translate the WHOLE text: never shorten, summarise or drop a sentence or clause.
- Write only in the target language and its script. No words from any other language (no Russian in Serbian, no Chinese or Japanese characters in Hindi or Korean, no English left in the prose), except names, which follow the NAMES rule.
- Keep Markdown exactly (**bold**, *italic*, [text](url), lists): translate the visible text, never URLs or link targets.
- Keep numbers, units, formulae and dates; adapt only decimal/thousands separators to the language's convention.
- Never output placeholder tokens such as __ACR0__.

Spaceflight terms (2026-10-17 graded samples got these wrong in many languages):
- "coast" / "coast phase" = unpowered flight between burns — never a shore or beach.
- "the ground" (as in "the ground is listening", "ground link") = ground control / the
  ground station — never soil or terrain.
- "uncrewed" = without a crew — never "unscrewed"; "crewed" = with a crew.
- "man-rating" / "human-rating" = certifying a vehicle safe to carry people.
- "capsule" = the crew/return vehicle; "rover" = a wheeled surface vehicle;
  "lander" = a landing spacecraft; "probe" = a spacecraft (never an investigation).
- "sensible atmosphere" = the part of the atmosphere dense enough to matter.
- "re-entry" / "entry" = entering an atmosphere; "acknowledgement" (radio) = confirmation.
- "knife-edge" = just barely; "plume" (Europa, Enceladus) = a jet of material.`;

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
      /(^|[\s(])(тхе|витх|анд|оф|фор|лаунцх|уппер|стаге)(?=[\s,.)]|$)/, // lowercase only: "Анд" is the Andes
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

let KNOWN = null;
/** Names containing a digit, from the en-US overlays' `name` fields (Apollo 12,
 *  Aurora 7, Chang'e 5, Soyuz MS-24). Loaded once. */
export function knownDigitNames() {
  if (KNOWN) return KNOWN;
  KNOWN = new Set();
  const root = path.resolve(import.meta.dirname, '../../i18n-src/en-US');
  const walk = (d) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) walk(p);
      else if (n.endsWith('.json')) {
        try {
          const j = JSON.parse(fs.readFileSync(p, 'utf8'));
          for (const k of ['name', 'short_name'])
            // not 'title': article titles are translated
            if (typeof j[k] === 'string' && /\d/.test(j[k]) && j[k].length <= 40) {
              // The designation only: "Apollo 12 (Yankee Clipper)" → "Apollo 12",
              // "Tianwen-1 orbiter" → "Tianwen-1" (descriptive words get translated).
              let base = j[k]
                .split(/\s+[—(/+]/)[0]
                .replace(/(\s+[a-z][^\s]*)+$/, '')
                .trim();
              // "Earth-Moon L2" → "L2" (ordinary words get translated), but only if
              // a letter-bearing designation remains: "Mars 3" is a mission name.
              const stripped = base
                .replace(/^((Earth|Moon|Sun|Mars|Lunar|Earth-Moon|Sun-Earth|Earth–Moon)\s+)+/, '')
                .trim();
              if (stripped !== base && /[A-Za-z]/.test(stripped)) base = stripped;
              if (/\d/.test(base) && /[A-Za-z]/.test(base)) KNOWN.add(base);
            }
        } catch {
          /* not JSON we care about */
        }
      }
    }
  };
  if (fs.existsSync(root)) walk(root);
  return KNOWN;
}

/** Names in `src` that must survive verbatim: letter–digit codes joined by a hyphen
 *  or nothing (NG-19, AV-012, RD-181, X-37B, H3), CamelCase (SpaceX, CubeSat), and
 *  digit-bearing names the data knows (Apollo 12). A capitalised word followed by a
 *  count ("Glenn's 3 orbits", "Day 1", "The 10") is not a name. */
export function designations(src) {
  if (!src) return [];
  const out = new Set();
  for (const m of src.matchAll(/\b[A-Z][A-Za-z]{0,6}-?\d+[A-Za-z]?\b/g))
    if (/-|[A-Z]\d|[a-z]\d/.test(m[0]) && !/^[A-Z][a-z]+\d{4}$/.test(m[0]))
      out.add(m[0].replace(/(\d)s$/, '$1')); // plural "F-1s" → the name is "F-1"
  for (const m of src.matchAll(/\b[A-Z][a-z]+[A-Z][A-Za-z]+\b/g)) out.add(m[0]);
  for (const n of knownDigitNames()) {
    if (!src.includes(n)) continue;
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // whole name only: "Apollo 1" must not match inside "Apollo 12"
    if (new RegExp(`(^|[^A-Za-z0-9])${esc}(?![A-Za-z0-9])`).test(src)) out.add(n);
  }
  return [...out];
}

// Capitalised English words that are ordinary nouns here and get translated.
export const ORDINARY = new Set(
  (
    'The A An In On At By For From To Of And Or But With As It Its This That These Those ' +
    'Moon Earth Sun Mars Venus Mercury Jupiter Saturn Uranus Neptune Pluto Ceres Solar System Milky Way ' +
    'January February March April May June July August September October November December ' +
    'Monday Tuesday Wednesday Thursday Friday Saturday Sunday North South East West Northern Southern ' +
    'I II III IV V VI What Why How When Where Who Each Every Its Their Our We You They He She ' +
    'Russian Soviet American Chinese Japanese European Indian Israeli French German British Italian Korean Arab Arabic Spanish Dutch Brazilian Serbian ' +
    'TV UTC GMT AM PM OK Lunar Martian Solar Earth-Moon Earth-Mars Moon-Earth Galaxy Universe Big Bang ' +
    'LEO MEO GEO HEO GTO SSO NRHO AU ' +
    // Ordinary geography is translated (NAME_POLICY).
    'Pacific Atlantic Indian Arctic Antarctic China Mongolia Inner Russia Kazakhstan India Japan Israel France Germany Italy Spain Europe Africa Asia America Americas Australia Antarctica Siberia Florida Texas California Hawaii Guiana Kourou Brazil Canada Mexico Korea Iran Ukraine Moscow Beijing Paris London Houston Washington USA US UK EU USSR'
  ).split(' '),
);

/** Name candidates in an English string (best effort; the model handles the rest). */
export function nameCandidates(en) {
  const out = new Set();
  // All-caps strings are labels (LAUNCH, TOUCHDOWN), not names.
  if (!/[a-z]/.test(en)) return [];
  // Designations: the shared finder (codes, CamelCase, digit-bearing names in the data).
  for (const d of designations(en)) out.add(d);
  // Acronyms and CamelCase: NASA, ALSEP, SpaceX (not unit-like or ordinary ones).
  for (const m of en.matchAll(/\b(?:[A-Z]{2,}[A-Za-z]*|[A-Z][a-z]+[A-Z][A-Za-z]+)\b/g))
    if (!ORDINARY.has(m[0])) out.add(m[0]);
  // Capitalised words in mid-sentence (after a lowercase word, comma or bracket).
  for (const m of en.matchAll(/(?<=[a-z,;:(] |[a-z]-)[A-Z][a-z'’]+(?:-[A-Z][a-z]+)?/g)) {
    const w = m[0].replace(/['’]s$/, '');
    if (!ORDINARY.has(w)) out.add(w);
  }
  return [...out];
}

const GENERIC_WORDS = new Set(
  'Space Station Telescope Observatory Constellation Belt Orbiter Lander Rover Program Programme Project Mission Probe Satellite Satellites Spacecraft Module Laboratory Lab Reconnaissance International Standard Enhanced Cargo Crew Capsule Vehicle'.split(
    ' ',
  ),
);
const GENERIC_TAIL =
  /(\s+(Space|Station|Telescope|Observatory|Constellation|Belt|Orbiter|Lander|Rover|Program|Programme|Project|Mission|Probe|Satellites?|Spacecraft|Module|Laboratory|Lab|Lunar|X-ray|Excursion|Command|Service))+$/;
// Entries in the data's name list that are descriptions or ordinary words in use, not
// names a translation must keep: they are legitimately translated (2026-10-17 review).
const GAZETTEER_SKIP = new Set([
  'Lunar Roving Vehicle',
  'Quest',
  'Tranquility',
  'Starship Mars Crew',
  'Shenzhou IVA Suit',
  'SpaceX IVA Suit',
  'Boeing Blue',
  'Apollo-Soyuz Test',
  'Cygnus Standard',
  'Cygnus Enhanced',
  'Hope',
]);
let GAZETTEER = null;
/** Every entity name the data knows: en-US `name` fields of missions, spacecraft,
 *  rockets, sites, satellites, stars and modules (the part before " (" / " — "),
 *  plus agency acronyms. Planets, the Sun and ordinary words are excluded (they get
 *  translated). Loaded once. */
export function gazetteer() {
  if (GAZETTEER) return GAZETTEER;
  GAZETTEER = new Set([
    'NASA',
    'ESA',
    'JAXA',
    'ISRO',
    'CNSA',
    'Roscosmos',
    'SpaceX',
    'Blue Origin',
    'ULA',
    'ISS',
    'JPL',
  ]);
  const root = path.resolve(import.meta.dirname, '../../i18n-src/en-US');
  const skipDirs = new Set([
    'orbit-regimes',
    'orbit-regimes-explore',
    'orbit-regimes-mars',
    'orbit-regimes-moon',
    'planets',
    'essays',
    'programs',
    'science',
    'sourcing',
    'scenarios',
    'culture-doors',
    'hotspot-metadata',
  ]);
  const walk = (d, top) => {
    for (const n of fs.readdirSync(d)) {
      const p = path.join(d, n);
      if (fs.statSync(p).isDirectory()) {
        if (!(top && skipDirs.has(n))) walk(p, false);
      } else if (n.endsWith('.json') && !(top && n === 'sun.json')) {
        try {
          const j = JSON.parse(fs.readFileSync(p, 'utf8'));
          for (const k of ['name', 'short_name']) {
            if (typeof j[k] !== 'string') continue;
            let base = j[k]
              .split(/\s+[—(/+·]/)[0]
              .replace(/(\s+[a-z][^\s]*)+$/, '')
              .trim();
            // Generic descriptors get translated ("Hubble Space Telescope" →
            // "Hubble", "BeiDou Constellation" → "BeiDou"); a name that is only
            // descriptors and ordinary words ("International Space Station",
            // "GEO Belt") adds nothing — its acronym (ISS) is listed separately.
            base = base.replace(GENERIC_TAIL, '').trim();
            const words = base.split(/\s+/);
            if (words.every((w) => ORDINARY.has(w) || GENERIC_WORDS.has(w))) continue;
            if (base.length >= 3 && /^[A-Z0-9]/.test(base) && !ORDINARY.has(base))
              GAZETTEER.add(base);
          }
        } catch {
          /* not JSON we care about */
        }
      }
    }
  };
  if (fs.existsSync(root)) walk(root, true);
  return GAZETTEER;
}

/** Known names that occur in `src` as whole words (longest first, no overlaps). */
export function knownNamesIn(src) {
  if (!src) return [];
  const hits = [];
  for (const n of [...gazetteer()].sort((a, b) => b.length - a.length)) {
    if (GAZETTEER_SKIP.has(n) || !src.includes(n) || hits.some((h) => h.includes(n))) continue;
    const esc = n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^A-Za-z0-9])${esc}(?![A-Za-z0-9])`).test(src)) hits.push(n);
  }
  return hits;
}

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
  if (/\uFFFD/.test(out)) p.push('corrupted characters (U+FFFD)');
  const names = designations(src);
  const apos = (x) => x.replace(/[’‘]/g, "'"); // Chang’e == Chang'e
  // A name is kept when its English form survives, or — in the name's origin
  // locale only — its native form (Союз МС-24 in ru, 嫦娥五号 in zh-CN).
  const lost = names.filter((n) => !nameRendered(locale, n, out, apos));
  if (lost.length) p.push(`names changed or missing: ${lost.slice(0, 5).join(', ')}`);
  // Names from the data's own name list must survive verbatim (NAME_POLICY), in
  // every language: the 2026-10-17 graded samples found Huygens → 惠更斯号/ホイヘンス/
  // ह्यूजेंस/هويجنز/Хајгенс, Tianzhou → 天舟, Jezero → 杰泽罗, which the designation
  // check can't see. A guessed candidate list flagged 8–20% of each locale (Observatory,
  // Cold War, Orbit, DNA), so only known names count. Substring match, so inflections
  // that keep the name intact (German "Shepards", Serbian "NASA-ин") pass.
  // Hyphen and space are the same here: German writes "Atlas-V-Start" for an Atlas V launch.
  const norm = (x) => apos(x).replace(/[-\s]+/g, ' ');
  const translated = knownNamesIn(src).filter(
    (n) => !names.includes(n) && !nameRendered(locale, n, out, norm),
  );

  if (translated.length)
    p.push(
      `names translated or missing (keep exactly as in English, or the native form in the name's own language): ${translated.slice(0, 6).join(', ')}`,
    );
  // Locales not written in Latin: every Latin word in the output must be a name
  // taken verbatim from the source ("Canberri", "Madridu" glue a case ending onto
  // a name; NAME_POLICY wants "Canberra" or "Canberra-и").
  if (src && NATIVE[locale]) {
    // "Grumman's" in the source allows "Grumman"; "CubeSats" allows "CubeSat".
    const srcWords = new Set(
      (src.match(/[A-Za-z][A-Za-z'’]*/g) || []).flatMap((w) => [
        w,
        w.replace(/['’]s?$/, ''),
        w.replace(/s$/, ''),
        `${w}s`,
      ]),
    );
    const altered = [...new Set(out.match(/[A-Za-z][A-Za-z'’]*/g) || [])].filter(
      (w) =>
        w.length > 1 &&
        !srcWords.has(w) &&
        !srcWords.has(w.replace(/'/g, '’')) && // Chang'e == Chang’e
        !/^[IVXLCDM]+$/.test(w), // Roman numerals (centuries in ru: XXI)
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
  let stripped = out.replace(/\[[^\]]*\]\([^)]*\)/g, '').replace(/[“"«‘'][^”"»’']*[”"»’']/g, '');
  // Name spans copied from the source ("the Great Square of Pegasus") are allowed
  // English under NAME_POLICY; only the rest is checked for stray English.
  const spans =
    src.match(
      /(?:\bthe\s+)?[A-Z][\w'’-]*(?:\s+(?:of|the|and|de)\s+[A-Z][\w'’-]*|\s+[A-Z0-9][\w'’-]*)+/g,
    ) || [];
  for (const span of spans) stripped = stripped.split(span).join('');
  const enWords = (
    stripped.match(/\b(the|and|with|which|that|this|from|into|between|The)\b/g) || []
  ).length;
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

// Latin letters that look identical to Cyrillic ones. Models sometimes emit them
// inside Cyrillic words ("намеравa", "Врaтио"); a retry can't fix what the model
// can't see, so they are mapped deterministically instead.
const HOMOGLYPH = {
  a: 'а',
  e: 'е',
  o: 'о',
  p: 'р',
  c: 'с',
  x: 'х',
  y: 'у',
  j: 'ј',
  s: 'ѕ',
  A: 'А',
  B: 'В',
  E: 'Е',
  K: 'К',
  M: 'М',
  H: 'Н',
  O: 'О',
  P: 'Р',
  C: 'С',
  T: 'Т',
  X: 'Х',
  Y: 'У',
  J: 'Ј',
};
/** In words that are mostly Cyrillic, replace Latin lookalikes with the Cyrillic
 *  letter (sr-Cyrl, ru). Words that are mostly Latin (names) are left alone. */
export function fixHomoglyphs(locale, text) {
  if ((locale !== 'sr-Cyrl' && locale !== 'ru') || typeof text !== 'string') return text;
  const map = locale === 'ru' ? { ...HOMOGLYPH, j: 'j', J: 'J', s: 's' } : { ...HOMOGLYPH, s: 's' };
  return text.replace(/[\p{L}]+/gu, (w) => {
    const cyr = (w.match(/\p{Script=Cyrillic}/gu) || []).length;
    const lat = (w.match(/[A-Za-z]/g) || []).length;
    if (!cyr || !lat || cyr < lat) return w;
    return [...w].map((ch) => (/[A-Za-z]/.test(ch) && map[ch] ? map[ch] : ch)).join('');
  });
}
