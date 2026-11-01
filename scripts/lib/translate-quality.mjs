/**
 * Shared translation rules and output checks for every translation script
 * (scripts/translate-*.mjs, scripts/retranslate-fields.mjs). Built from the
 * 2026-10-17 translation-quality audit (docs/wip/_archive/2026-10-17-post-v1-arc-plan.md
 * item 9b): each check below rejects a defect found shipped in the corpus.
 *
 * translate-model.mjs's translationClient() applies BASE_RULES, NAME_POLICY and
 * LOCALE_RULES[locale] to every call and retries an answer that fails
 * problems(); retranslate-fields.mjs calls problems() with the source too.
 */

import fs from 'node:fs';
import path from 'node:path';
import { nameRendered } from '../../src/lib/name-origins.js';
import { enRegex } from '../i18n-tools/term-match.mjs';

export const LANGUAGE_NAMES = {
  ar: 'Modern Standard Arabic',
  de: 'German',
  es: 'European Spanish',
  fr: 'French',
  he: 'Modern Hebrew',
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
export const NAME_POLICY = `NAMES (operator rules, docs/guides/i18n-translation-strategy.md §3.1–3.2).
1. Things people built and the organisations behind them — missions, spacecraft, rockets, upper stages, stations, modules, programmes, instruments, agencies, companies, design bureaus: keep the English name exactly, in Latin script (Apollo 12, Voyager 2, Falcon 9, Soyuz MS-24, Chang'e 5, Tiangong, JWST, NASA, ESA, SpaceX). Exception: in the name's own language use the original name — Russian/Soviet names in Cyrillic in Russian (Союз МС-24, «Мир», Протон-М, «Луна-9»), Chinese in Chinese (神舟, 天宫, 嫦娥五号), and likewise Japanese, Korean, Indian (Hindi), Iranian (Arabic), Serbian and Israeli (Hebrew) names in their own language. Agencies keep their international name (NASA is NASA), except in their own language, which uses the local name its own sources use (Hindi इसरो, Russian Роскосмос, Chinese 国家航天局, Arabic مركز محمد بن راشد للفضاء; Japanese sources write JAXA).
2. Publications and sources — journals, websites, reports, societies cited as a source (Nature, Science, Icarus, Annual Review of Astronomy, NASA Solar System Exploration, Planetary Society): keep exactly as in English.
3. Science, astronomy, geography and people are written the way that language's universities and schools write them: planets, moons, asteroids and comets; surface features of the Moon and planets (Mare Tranquillitatis → the language's own name); stars, constellations, galaxies and nebulae; eponymous terms (Kepler's laws, Hohmann transfer, Kuiper belt → the language's own form of the person's name); term abbreviations (LEO, GEO, EVA → the language's own); countries, cities, regions, spaceports' geography; and people's names in the language's own spelling. Keep an international form only where that language's own sources really use it (instrument acronyms such as JWST).
Inflect native-script names with the language's grammar. Never add a case ending to a name kept in Latin script, with or without a hyphen (no NASA-ин, Voyager-а) in Russian or Serbian: put a common noun before it that carries the ending (агентства NASA, аппарата Voyager 2; агенције NASA, летелице Voyager 2) or reword. Latin-script languages keep their own standard forms (German genitive NASAs). Never change the letters of a name kept in English.`;

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
- "knife-edge" = just barely; "plume" (Europa, Enceladus) = a jet of material.
- "launch" = a rocket launch — never a product release or a program start.
- "Orrery" is this site's name: keep it exactly, in Latin script, in every language.`;

/**
 * Rules for short UI strings (messages/<loc>.json), from the 2026-10-30 audit of
 * ar/hi/ja (docs/guides/i18n-style-guide.md §4a). Sent by the UI translators with
 * uiPromptNotes().
 */
export const UI_LABEL_RULES = `UI labels (buttons, tabs, chips, headings, aria-labels):
- Use the term this language's own space and astronomy sources use (Japanese 遠日点, not アピリオン). Never write an English word phonetically in the target script.
- ALL-CAPS labels are ordinary words in capitals (STATUS, PERIOD, ARRIVAL, DOCKED): translate them. Keep only real acronyms (TLI, LOI, EDL, TCM, C3, ISS).
- Commands use this language's own word order and command form (Korean 패널 닫기, Japanese パネルを閉じる, Chinese 关闭面板) — never the English verb-first order.
- One English label gets one translation across the whole UI.
- Page titles keep the separator and the site name: "<page> · Orrery".`;

let SENSES;
/** The meaning note for an ambiguous UI key (scripts/i18n-tools/ui-senses.json), or ''. */
export function uiMeaning(key) {
  if (!SENSES) {
    const p = path.resolve(import.meta.dirname, '../i18n-tools/ui-senses.json');
    SENSES = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  }
  return key.startsWith('_') ? '' : (SENSES[key] ?? '');
}

/** UI rules plus the meaning of each ambiguous key, for a translation prompt. */
export function uiPromptNotes(keys) {
  const meanings = keys
    .map((k) => [k, uiMeaning(k)])
    .filter(([, m]) => m)
    .map(([k, m]) => `- ${k}: ${m}`);
  return `${UI_LABEL_RULES}${meanings.length ? `\n\nWhat these keys mean here:\n${meanings.join('\n')}` : ''}`;
}

export const LOCALE_RULES = {
  'sr-Cyrl': `Serbian rules (strict):
- Standard Serbian, EKAVIAN only (време, место, цео, уместо — never вријеме, мјесто, цијел, умјесто).
- Serbian Cyrillic only for Serbian words. Never Latin letters inside a Cyrillic word, never Russian/Ukrainian/Bulgarian letters or words (я ю ё й щ ы э ъ ь і, это, один, ничего, держи, първи), never a Latin-script Serbian sentence.
- Moon = Месец (not Луна); Sun = Сунце; Solar System = Сунчев систем; Earth = Земља.
- Names follow the NAMES rule: things people built and agencies in Latin, exactly as the English writes them (Apollo 12, Voyager 2, NASA, Northrop Grumman); planets, places, surface features, stars, constellations and people in Serbian Cyrillic, in the glossary form (Лабуд, Кеплер); the International Space Station is МСС. Museums and observatories are institutions, not built things: their names and cities in Cyrillic, the Serbian form where one exists (Технички музеј Шпајер), otherwise transliterated phonetically (Космосфера). Never transliterate the name of a built thing into Cyrillic and never spell English phonetically in Cyrillic ("тхе", "витх", "Рецоннаиссанце" are wrong). Never inflect a Latin name, with or without a hyphen (no NASA-ин, Voyager-а): a common noun before it takes the case ending (агенције NASA, летелице Voyager 2), or reword.
- Decimal comma (0,967), thousands with a dot (35.786).
- Glossary: International Space Station spelled out = Међународна свемирска станица (acronym ISS); Deep Space Network spelled out = Мрежа за далеки свемир (acronym DSN); lunar mare as a common noun = маре (never кобила).
- Terms: atmospheric entry = улазак у атмосферу; skip entry = улазак са одскоком; coast phase = лет по инерцији; flyby = прелет; rendezvous = сусрет у орбити; hatch = отвор; periapsis = перицентар; stage (of a rocket) = степен (masculine: први степен, првих степена); launch vehicle = ракета-носач; trace gases = гасови у траговима; plane (geometry) = раван.`,
  ru: `Russian rules: Cyrillic only for Russian words; never Latin letters inside a Cyrillic word; names follow the NAMES rule (built things and agencies in Latin as in English, except Russian and Soviet ones in Cyrillic; people, places and science terms in Russian).`,
  hi: `Hindi rules: Devanagari for Hindi words; never Chinese/Japanese characters (e.g. 着陸, 弹道 are wrong); names follow the NAMES rule.`,
  ko: `Korean rules: Hangul for Korean words; never Chinese characters/hanja (e.g. 西昌衛星發射中心, 衛星群 are wrong); names follow the NAMES rule.`,
  ar: `Arabic rules: Arabic script for Arabic words; never Cyrillic or other letters inside an Arabic word; names follow the NAMES rule. Write "←" wherever the English has "→" next to words (a link arrow, "Earth → Moon"): arrows are not mirrored in right-to-left text, so "→" would point backwards.`,
  he: `Hebrew rules: Modern Hebrew in Hebrew script, without niqqud (vowel points); never Arabic or other letters inside a Hebrew word; names follow the NAMES rule (built things and agencies in Latin as in English, except Israeli ones in Hebrew; people, places and science terms in Hebrew). Write "←" wherever the English has "→" next to words: arrows are not mirrored in right-to-left text.`,
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
      /(умјест|вријем|мјест|цијел|цјел|свијет|рјеш|лијеп|пјесм|бијел|ријеч|сјевер|мјесец|тијел|дијел|вјек|снијег|ријек|свјетл|дјев|дјел|мјер|цјен|вјер)/i,
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
  he: /\p{Script=Hebrew}/u,
  hi: /\p{Script=Devanagari}/u,
  ja: /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  ko: /\p{Script=Hangul}/u,
  'zh-CN': /\p{Script=Han}/u,
  ru: /\p{Script=Cyrillic}/u,
  'sr-Cyrl': /\p{Script=Cyrillic}/u,
};
const FOREIGN =
  /[\p{Script=Hangul}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Cyrillic}\p{Script=Hebrew}]/gu;

let KNOWN = null;
/** Names containing a digit, from the en-US overlays' `name` fields (Apollo 12,
 *  Aurora 7, Chang'e 5, Soyuz MS-24). Loaded once. */
export function knownDigitNames() {
  if (KNOWN) return KNOWN;
  KNOWN = new Set();
  const root = path.resolve(import.meta.dirname, '../../i18n-src/en-US');
  const walk = (d) => {
    // Dirent types: no separate stat between the listing and the read.
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const n = e.name;
      const p = path.join(d, n);
      if (e.isDirectory()) walk(p);
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
 *  count ("Glenn's 3 orbits", "Day 1", "The 10") is not a name, nor is a numbered
 *  stage, phase or step ("Stage-2 cutoff"). */
export function designations(src) {
  if (!src) return [];
  const out = new Set();
  for (const m of src.matchAll(/\b[A-Z][A-Za-z]{0,6}-?\d+[A-Za-z]?\b/g))
    if (
      /-|[A-Z]\d|[a-z]\d/.test(m[0]) &&
      !/^[A-Z][a-z]+\d{4}$/.test(m[0]) &&
      !/^(Stage|Phase|Step)-?\d/.test(m[0])
    )
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
  // launch sites named for their place: the place is geography (Алкантара), the rest
  // a description (Raumfahrtzentrum Alcântara, Centre spatial d'Alcântara)
  'Alcântara Space Center',
  'Naro Space Center',
  'Uchinoura Space Center',
  'Semnan Space Center',
  'Sohae Satellite Launching', // "Station" is stripped as a generic tail
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
    // museum names are institutions: native form in every locale like the facility
    // glossary ("Kennedy Space Center Visitor Complex" → 肯尼迪航天中心游客中心), not the
    // vehicle origin rule
    'museums',
    'observatories',
    'hotspot-metadata',
    // tour titles ("Cassini Saturn-system tour"), not names; the craft names come from
    // fleet/ and missions/
    'trajectories',
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

let GLOSSARY_RAW;
/** The native-terms glossary by class: {body: {english: {locale: native}}, …}. */
function glossaryByClass() {
  if (GLOSSARY_RAW) return GLOSSARY_RAW;
  const p = path.resolve(import.meta.dirname, '../i18n-tools/native-terms.json');
  const g = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  GLOSSARY_RAW = Object.fromEntries(
    Object.entries(g).filter(
      ([k, v]) => !k.startsWith('_') && k !== 'sources' && v && typeof v === 'object',
    ),
  );
  return GLOSSARY_RAW;
}

/**
 * The technical-term bindings (native-terms.json `term`) for the terms an English source
 * uses, as a prompt note: every writer uses the same word the glossary and the term gate
 * expect. Empty when the source uses none.
 */
export function termNotes(locale, src) {
  if (locale === 'en-US') return '';
  const terms = glossaryByClass().term ?? {};
  const text = typeof src === 'string' ? src : JSON.stringify(src);
  const lines = [];
  for (const [t, e] of Object.entries(terms)) {
    if (!e[locale] || !enRegex(t, e).test(text)) continue;
    const avoid = e._avoid?.[locale]?.length ? ` (never ${e._avoid[locale].join(', ')})` : '';
    lines.push(`${t} → ${e[locale]}${avoid}`);
  }
  return lines.length
    ? `\nTechnical terms — use exactly these words, inflected as the grammar needs: ${lines.join('; ')}.`
    : '';
}

let GLOSSARY;
/** [english, {locale: native}] for every term in the native-terms glossary. */
function glossary() {
  if (GLOSSARY) return GLOSSARY;
  const p = path.resolve(import.meta.dirname, '../i18n-tools/native-terms.json');
  const g = fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : {};
  GLOSSARY = Object.entries(g)
    .filter(([k, v]) => !k.startsWith('_') && k !== 'sources' && v && typeof v === 'object')
    .flatMap(([, cls]) => Object.entries(cls));
  return GLOSSARY;
}

/**
 * English glossary terms in `src` whose native form for `locale` appears in `out`.
 * Each word of the native form must appear; words over 4 letters may lose their last
 * two letters to inflection (кратер Аполлон / кратера Аполлона).
 */
export function glossaryRendered(locale, src, out) {
  if (!src || !out) return [];
  const o = out.toLowerCase();
  return glossary()
    .filter(([en, forms]) => {
      const nat = forms[locale];
      if (!nat || !src.includes(en)) return false;
      return nat
        .toLowerCase()
        .split(/\s+/)
        .every((w) => o.includes(w.length > 4 ? w.slice(0, -2) : w));
    })
    .map(([en]) => en);
}

// Unit symbols and kept abbreviations that stay Latin inside non-Latin text.
const LATIN_KEEP =
  /^(?:k?m|cm|mm|kg|t|ms|min|K|N|kN|MN|M?J|MJ|Pa|kPa|hPa|bar|au|AU|ly|pc|kpc|Mpc|Gyr|Myr|Hz|k?W|Isp|dB|lat|lon|Orrery|Esc|Enter|Shift|Ctrl|Alt|Tab)$/;
// Names of outside products the UI cites; they keep English like built things.
const KEPT_NAMES = ['Launch Library', 'Wikipedia', 'Google', 'YouTube', 'GitHub', 'Shuttle'];
/**
 * English words copied from `src` into a non-Latin `out` that are not names: the
 * shipped UI had "Vendor", "Nation", "Hover", "STARBOARD", "Physics Lab" in ko/zh
 * (2026-10-30 audit). The older check accepts any word copied exactly from the
 * English, so these passed as "names". A copied word is flagged when it is not
 * part of a name the source contains (designation, data name list, mid-sentence
 * capital), not a unit or a short acronym, has no digit attached (Hayabusa2), and
 * — if capitalised — the English corpus uses it in lowercase too ("vendor",
 * "starboard"), so "Meeus" or "Wolf-Lundmark" stay names. Placeholders, URLs and
 * route paths are not text.
 */
export function untranslatedEnglish(src, out) {
  const strip = (s) =>
    s
      .replace(/\{[^}]*\}/g, ' ')
      .replace(/\$?\b(?:https?:\/\/|www\.)\S+/g, ' ')
      .replace(/(^|\s|\()\/[\w/-]+/g, ' ')
      .replace(/\$schema/g, ' ');
  src = strip(src);
  out = strip(out);
  const nameWords = new Set(
    [
      ...designations(src),
      ...knownNamesIn(src),
      ...nameCandidates(src),
      ...KEPT_NAMES.filter((n) => src.includes(n)),
      // Wolf-Lundmark-Melotte, Churyumov-Gerasimenko: hyphenated proper names
      ...(src.match(/\b[A-Z][a-z]+(?:-[A-Z][a-z]+)+\b/g) || []),
    ].flatMap((n) => n.split(/[\s-]+/)),
  );
  const upperNames = new Set([...gazetteer()].map((n) => n.toUpperCase()));
  const srcWords = new Set(src.match(/[A-Za-z][A-Za-z'’]*/g) || []);
  const ordinary = ordinaryEnglish();
  return [...new Set(out.match(/[A-Za-z][A-Za-z'’]*(?![A-Za-z'’]*\d)/g) || [])].filter(
    (w) =>
      w.length > 1 &&
      srcWords.has(w) &&
      !nameWords.has(w) &&
      !nameWords.has(w.replace(/['’]s$/, '')) &&
      !upperNames.has(w) &&
      !/^[A-Z]{2,5}s?$/.test(w) &&
      !/^[IVXLCDM]+$/.test(w) &&
      !LATIN_KEEP.test(w) &&
      (/^[a-z]/.test(w) || ordinary.has(w.toLowerCase())),
  );
}

let ORDINARY_EN = null;
/** Lowercase words the English corpus (messages + i18n-src/en-US) actually uses. */
function ordinaryEnglish() {
  if (ORDINARY_EN) return ORDINARY_EN;
  ORDINARY_EN = new Set();
  const add = (s) => {
    for (const m of String(s).matchAll(/(?<![A-Za-z'’])[a-z][a-z'’]{2,}/g)) ORDINARY_EN.add(m[0]);
  };
  const root = path.resolve(import.meta.dirname, '../..');
  try {
    Object.values(
      JSON.parse(fs.readFileSync(path.join(root, 'messages/en-US.json'), 'utf8')),
    ).forEach(add);
  } catch {
    /* no bundle: lowercase words are still checked */
  }
  const walk = (d) => {
    let entries = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      /* no such directory */
    }
    for (const e of entries) {
      const n = e.name;
      const p = path.join(d, n);
      if (e.isDirectory()) walk(p);
      else if (n.endsWith('.json'))
        try {
          stringsIn(JSON.parse(fs.readFileSync(p, 'utf8'))).forEach(add);
        } catch {
          /* skip */
        }
    }
  };
  walk(path.join(root, 'i18n-src/en-US'));
  return ORDINARY_EN;
}

/**
 * Glossary terms (bodies, features, places, stars, people) the source contains and
 * the output kept in English although the glossary has this locale's form: ko
 * "Andromeda 위성" for 안드로메다 (2026-10-30 audit). A term that is part of a
 * built thing's name in the source ("Kepler" in "Kepler space telescope") is skipped.
 */
export function glossaryLeftInLatin(locale, src, out) {
  const built = knownNamesIn(src);
  return Object.entries(glossaryByClass())
    .filter(([cls]) => ['body', 'feature', 'place', 'star', 'person'].includes(cls))
    .flatMap(([, terms]) => Object.entries(terms))
    .filter(([en, forms]) => {
      const nat = forms?.[locale];
      // Galileo, Gemini, Mercury, Cygnus are also spacecraft or programmes, which keep
      // English: ambiguous in a label, so not checked.
      if (!nat || nat === en || !/^[A-Z]/.test(en) || gazetteer().has(en)) return false;
      const re = new RegExp(
        `(^|[^A-Za-z])${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![A-Za-z])`,
      );
      return re.test(src) && re.test(out) && !built.some((b) => b !== en && b.includes(en));
    })
    .map(([en, forms]) => [en, forms[locale]]);
}

/** A short UI label (up to four words), not prose and not a lowercase id. */
export function isUiLabel(src) {
  const s = String(src).trim();
  return !/^[a-z0-9_-]+$/.test(s) && s.split(/\s+/).filter((w) => /[A-Za-z]/.test(w)).length <= 4;
}

const RTL = new Set(['ar', 'he']);
/** A "→" next to right-to-left text, or at either end of it, shows pointing backwards. */
export function rtlArrowWrong(locale, out) {
  const native = NATIVE[locale];
  if (!native || !out.includes('→')) return false;
  const s = out;
  for (const m of s.matchAll(/→/g)) {
    const left = s.slice(0, m.index).replace(/\s+$/, '');
    const right = s.slice(m.index + 1).replace(/^\s+/, '');
    const l = left.at(-1);
    const r = right[0];
    if (!l || !r) return native.test(s);
    if (native.test(l) || native.test(r)) return true;
  }
  return false;
}

/**
 * Problems with a translation `out` of English `src` into `locale` (empty list
 * = acceptable). `src` may be '' when the caller doesn't have it (the client
 * wrapper); the source-dependent checks are then skipped. `ui: true` marks a
 * messages/<loc>.json string and turns on the short-label checks (English words
 * left in, science names left in English).
 */
export function problems(locale, src, out, { ui = false } = {}) {
  const p = [];
  if (typeof out !== 'string' || !out.trim()) return ['empty'];
  src = src || '';
  if (/__[A-ZА-Я]{2,}\d+__/.test(out)) p.push('placeholder token');
  if (/\uFFFD/.test(out)) p.push('corrupted characters (U+FFFD)');
  const names = designations(src);
  const apos = (x) => x.replace(/[’‘]/g, "'"); // Chang’e == Chang'e
  // A name is kept when its English form survives, or — in the name's origin
  // locale only — its native form (Союз МС-24 in ru, 嫦娥五号 in zh-CN).
  // A part of a longer name that was kept counts as kept ("LC-41" inside
  // "Plesetsk LC-41/1" → "Плесецк, площадка 41/1").
  // A name inside a glossary term rendered natively counts as kept too ("Apollo" in
  // "Apollo Crater" → "Кратер Аполлон"): science terms, places and people are native
  // in every locale (scripts/i18n-tools/native-terms.json).
  const terms = glossaryRendered(locale, src, out);
  const kept = [
    ...names.filter((n) => nameRendered(locale, n, out, apos)),
    ...terms.flatMap((t) => names.filter((n) => t.includes(n))),
    // …and a designation made of a native place plus a code that survives
    // ("Cape Canaveral SLC-40" → "мыс Канаверал, SLC-40").
    ...terms.flatMap((t) =>
      names.filter((n) => n.includes(t) && out.includes(n.replace(t, '').trim())),
    ),
  ];
  // A designation built from a place, generic words and a code ("Baikonur Site 200",
  // "Launch Complex 39A") is kept when its code survives and every other word is a
  // generic word or part of a glossary term rendered natively ("Байконур, площадка 200").
  const GENERIC = /^(Site|Launch|Complex|Pad|Orbital|Space|Center|Centre|Station)$/;
  const builtKept = (n) => {
    const words = n.split(/[\s–]+/);
    const codes = words.filter((w) => /\d/.test(w));
    return (
      codes.length > 0 &&
      codes.every((c) => out.includes(c)) &&
      words.every(
        (w) => /\d/.test(w) || GENERIC.test(w) || terms.some((t) => t.split(/\s+/).includes(w)),
      )
    );
  };
  const lost = names.filter((n) => !kept.some((k) => k.includes(n)) && !builtKept(n));
  if (lost.length) p.push(`names changed or missing: ${lost.slice(0, 5).join(', ')}`);
  // Names from the data's own name list must survive verbatim (NAME_POLICY), in
  // every language: the 2026-10-17 graded samples found Huygens → 惠更斯号/ホイヘンス/
  // ह्यूजेंस/هويجنز/Хајгенс, Tianzhou → 天舟, Jezero → 杰泽罗, which the designation
  // check can't see. A guessed candidate list flagged 8–20% of each locale (Observatory,
  // Cold War, Orbit, DNA), so only known names count. Substring match, so inflections
  // that keep the name intact (German "Shepards", Serbian "NASA-ин") pass.
  // Hyphen and space are the same here: German writes "Atlas-V-Start" for an Atlas V launch.
  const norm = (x) => apos(x).replace(/[-\s]+/g, ' ');
  // A name that contains a natively rendered glossary term is kept only when the rest of
  // the name survives too: "Cape Canaveral SLC-40" → "мыс Канаверал, SLC-40" passes, but
  // "Mars Express" → "화성 익스프레스" or "Saturn V" → "土星V" does not.
  const restKept = (n, t) => {
    const rest = n
      .replace(t, '')
      .split(/[\s–]+/)
      .filter((w) => w && !GENERIC.test(w));
    return rest.every((w) => norm(out).includes(norm(w)));
  };
  const translated = knownNamesIn(src).filter(
    (n) =>
      !names.includes(n) &&
      !nameRendered(locale, n, out, norm) &&
      !terms.some((t) => t.includes(n) || (n.includes(t) && restKept(n, t))),
  );

  if (translated.length)
    p.push(
      `names translated or missing (keep exactly as in English, or the native form in the name's own language): ${translated.slice(0, 6).join(', ')}`,
    );
  // Locales not written in Latin: every Latin word in the output must be a name
  // taken verbatim from the source ("Canberri", "Madridu" glue a case ending onto
  // a name; NAME_POLICY wants "Canberra" or "Canberra-и").
  if (src && NATIVE[locale]) {
    // "Grumman's" in the source allows "Grumman"; "CubeSats" allows "CubeSat";
    // an adjective from a name ("Keplerian", "Magellanic") allows the name.
    const srcWords = new Set(
      (src.match(/[A-Za-z][A-Za-z'’]*/g) || []).flatMap((w) => [
        w,
        w.replace(/['’]s?$/, ''),
        w.replace(/s$/, ''),
        `${w}s`,
        ...(/^[A-Z]/.test(w) ? [w.replace(/(ian|ic)$/, '')] : []),
      ]),
    );
    // A unit symbol the source has in another case is the locale's own form of it
    // (style guide 1a: ja writes "au" where the English has "AU").
    const srcLower = new Set([...srcWords].map((w) => w.toLowerCase()));
    const altered = [...new Set(out.match(/[A-Za-z][A-Za-z'’]*/g) || [])].filter(
      (w) =>
        w.length > 1 &&
        !srcWords.has(w) &&
        !(LATIN_KEEP.test(w) && srcLower.has(w.toLowerCase())) &&
        !srcWords.has(w.replace(/'/g, '’')) && // Chang'e == Chang’e
        !/^[IVXLCDM]+$/.test(w), // Roman numerals (centuries in ru: XXI)
    );
    if (altered.length)
      p.push(
        `Latin-script words that are not names from the source: ${altered.slice(0, 5).join(', ')} — write every word of the target language in its own script; only names copied exactly from the English stay in Latin (add a case ending after a hyphen, never glued on)`,
      );
    // Short UI labels only: in prose a sentence-initial name ("Galileo", the EU
    // system) looks like an ordinary word, and the 2026-10-30 replay rejected ~20%
    // of every non-Latin locale that way. Lowercase ids ("planets") aren't shown.
    const label = ui && isUiLabel(src);
    const common = label ? untranslatedEnglish(src, out) : [];
    if (common.length)
      p.push(
        `English words left untranslated: ${common.slice(0, 5).join(', ')} — only names stay in Latin; translate ordinary words`,
      );
    const science = label ? glossaryLeftInLatin(locale, src, out) : [];
    if (science.length)
      p.push(
        `science or place names left in English: ${science
          .slice(0, 4)
          .map(([en, nat]) => `${en} → ${nat}`)
          .join(', ')} (use the glossary form)`,
      );
  }
  if (/\bOrrery\b/.test(src) && !out.includes('Orrery'))
    p.push('the site name "Orrery" changed or missing — keep it exactly, in Latin script');
  if (RTL.has(locale) && rtlArrowWrong(locale, out))
    p.push('"→" in right-to-left text points backwards — use "←" (bidi does not mirror arrows)');
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
