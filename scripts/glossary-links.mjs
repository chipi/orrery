// Glossary term links in /science articles (PRD-038 §5): for each article and locale, where each
// glossary term is first mentioned, so the page can link it to /science/glossary#<term>.
//
// Rules (operator, 2026-11-04): the 101 narrative and the body paragraphs only, in reading
// order; each term once per article, at its first mention; at most 2 term links per paragraph
// (a term crowded out moves to its next mention); never on the term's own "Read more" article,
// never inside an author's [text](link), never where `_en_skip` gives the word another sense.
// A mention counts only where the term gate would see it: the English of the same field uses
// the term, and the locale's text matches one of the glossary's stems for it. So a link appears
// exactly where the glossary's word is used, inflections included (stems), and never where a
// translation rendered the term another way (the fields recorded as keeps).
//
// Output per locale: { "<tab>/<section>": { "<field>.<i>": [[slug, at, text], …] } } where
// `at` is the offset of `text` in the paragraph's plain text (link syntax removed) — the page
// links it only when the text is still there (src/lib/science-inline.ts).
import fs from 'node:fs';
import path from 'node:path';
import { enRegex, normalize, senseSkipped } from './i18n-tools/term-match.mjs';

export const MAX_PER_PARAGRAPH = 2;
const FIELDS = ['narrative_101', 'body_paragraphs'];
// Scripts written without spaces between words: a match is not widened to a whole word there.
const NO_SPACES = new Set(['ja', 'zh-CN']);
const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;
const WORD = /[\p{L}\p{M}]/u;

export const slug = (term) => term.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/** The parts of a paragraph outside [text](link): [{ text, at }] with `at` in the plain text. */
export function plainParts(para) {
  const parts = [];
  let last = 0;
  let plainAt = 0;
  for (const m of para.matchAll(LINK)) {
    const before = para.slice(last, m.index);
    parts.push({ text: before, at: plainAt });
    plainAt += before.length + m[1].length; // link text stays in the plain text, unlinkable
    last = m.index + m[0].length;
  }
  parts.push({ text: para.slice(last), at: plainAt });
  return parts;
}

/** The paragraph as the page shows it: [text](link) reduced to its text. Link offsets count here. */
export const plainText = (para) => para.replace(LINK, '$1');

/** A RegExp over the locale's text for one term (its stems; the English pattern for en-US). */
export function termRegex(term, e, loc) {
  if (loc === 'en-US') return enRegex(term, e, 'g');
  const stems = e._match?.[loc] ?? (e[loc] ? [e[loc]] : []);
  if (!stems.length) return null;
  return new RegExp(stems.map((s) => `(?:${normalize(loc, s)})`).join('|'), 'giu');
}

/** Matches of `re` in `text`, with offsets in the original text (Arabic vowel marks ignored). */
function matchesIn(loc, re, text) {
  let norm = '';
  const map = [];
  for (let i = 0; i < text.length; i++) {
    const n = normalize(loc, text[i]);
    if (n) {
      norm += n;
      map.push(i);
    }
  }
  map.push(text.length);
  const out = [];
  re.lastIndex = 0;
  for (const m of norm.matchAll(re)) {
    if (!m[0]) continue;
    const start = map[m.index];
    const end = map[m.index + m[0].length - 1] + 1;
    out.push({ start, end, len: m[0].length });
  }
  return out;
}

/** Widen [start, end) to whole words in scripts written with spaces. */
function widen(loc, text, start, end) {
  if (NO_SPACES.has(loc)) return [start, end];
  while (start > 0 && WORD.test(text[start - 1])) start--;
  while (end < text.length && WORD.test(text[end])) end++;
  return [start, end];
}

// Widening may add an inflection or a clitic (ru -ами, ar لل…), not a compound: de
// «Nutzlastspezialisten» is not "payload", «Abstiegstriebwerk» not "descent".
const MAX_WIDEN = 4;

/**
 * The linked word must share a piece of the term's binding form (3 letters; 2 in ja / zh / ko).
 * The gate's stems also accept plain words for the thing (ja 探査機 "probe" for orbiter, zh 飞船
 * "spaceship" for capsule): right in the text, wrong as a link to the term's entry.
 */
export function sharesBinding(loc, word, binding) {
  if (!binding) return true;
  const n = NO_SPACES.has(loc) || loc === 'ko' ? 2 : 3;
  const w = normalize(loc, word).toLocaleLowerCase(loc);
  const b = normalize(loc, binding).toLocaleLowerCase(loc).replace(/\s+/g, '');
  if (b.length <= n) return w.includes(b);
  for (let i = 0; i + n <= b.length; i++) if (w.includes(b.slice(i, i + n))) return true;
  return false;
}

/**
 * Links for one article in one locale.
 * @param {Record<string, any>} terms native-terms.json `term`
 * @param {string} loc
 * @param {string} rel overlay path, e.g. science/orbits/apsides.json
 * @param {any} en the article's en-US overlay
 * @param {any} tr the article's overlay in `loc`
 */
export function articleLinks(terms, loc, rel, en, tr) {
  // Every term takes part in the "whose word is it" check; only the eligible ones get links
  // (not on their own read-more article, not where `_en_skip` gives the word another sense).
  const all = {};
  for (const [t, e] of Object.entries(terms)) {
    const re = termRegex(t, e, loc);
    if (re) all[t] = { re, en: enRegex(t, e, 'i'), avoid: e._avoid?.[loc], binding: e[loc] };
  }
  const regexes = Object.fromEntries(
    Object.entries(all).filter(
      ([t]) => !senseSkipped(terms[t], rel) && rel !== `science/${terms[t]._read_more}.json`,
    ),
  );
  const linked = new Set();
  const out = {};
  for (const field of FIELDS) {
    const enList = Array.isArray(en?.[field]) ? en[field] : [];
    const trList = Array.isArray(tr?.[field]) ? tr[field] : [];
    trList.forEach((para, i) => {
      if (typeof para !== 'string' || typeof enList[i] !== 'string') return;
      const enPlain = plainParts(enList[i])
        .map((p) => p.text)
        .join(' ');
      const candidates = [];
      for (const [t, r] of Object.entries(regexes)) {
        if (linked.has(t) || !r.en.test(enPlain)) continue;
        if (r.avoid?.length && new RegExp(r.avoid.join('|'), 'iu').test(normalize(loc, para)))
          continue;
        let first = null;
        for (const part of plainParts(para)) {
          for (const m of matchesIn(loc, r.re, part.text)) {
            const [s, e] = widen(loc, part.text, m.start, m.end);
            const word = part.text.slice(s, e);
            if (e - s - (m.end - m.start) > MAX_WIDEN) continue;
            if (loc !== 'en-US' && !sharesBinding(loc, word, r.binding)) continue;
            // The whole word belongs to another term when that term matches more of it
            // (es «orbitador» is orbiter, not orbit); it is ambiguous when another term the
            // English paragraph also uses matches it just as fully (ja 軌道 is both orbit and
            // trajectory) — skipped either way.
            const other = Object.entries(all).some(
              ([u, ru]) =>
                u !== t &&
                matchesIn(loc, ru.re, word).some(
                  (x) => x.len > m.len || (x.len === m.len && ru.en.test(enPlain)),
                ),
            );
            if (other) continue;
            first = { term: t, at: part.at + s, text: word };
            break;
          }
          if (first) break;
        }
        if (first) candidates.push(first);
      }
      candidates.sort((a, b) => a.at - b.at || b.text.length - a.text.length);
      const chosen = [];
      for (const c of candidates) {
        if (chosen.length >= MAX_PER_PARAGRAPH) break;
        if (chosen.some((x) => c.at < x.at + x.text.length && x.at < c.at + c.text.length))
          continue;
        chosen.push(c);
      }
      if (!chosen.length) return;
      for (const c of chosen) linked.add(c.term);
      out[`${field}.${i}`] = chosen.map((c) => [slug(c.term), c.at, c.text]);
    });
  }
  return out;
}

const walk = (d) =>
  fs.existsSync(d)
    ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => {
        const p = path.join(d, e.name);
        return e.isDirectory() ? walk(p) : e.name.endsWith('.json') ? [p] : [];
      })
    : [];

/** All /science articles of one locale: { "<tab>/<section>": { field: [[slug, at, text]] } }. */
export function localeLinks(terms, loc) {
  const out = {};
  for (const f of walk('i18n-src/en-US/science')) {
    const rel = path.relative('i18n-src/en-US', f);
    const p = rel.replace(/\.json$/, '').split('/');
    if (p.length !== 3 || p[2] === '_intro') continue;
    const trFile = `i18n-src/${loc}/${rel}`;
    if (!fs.existsSync(trFile)) continue;
    const links = articleLinks(
      terms,
      loc,
      rel,
      JSON.parse(fs.readFileSync(f, 'utf8')),
      JSON.parse(fs.readFileSync(trFile, 'utf8')),
    );
    if (Object.keys(links).length) out[`${p[1]}/${p[2]}`] = links;
  }
  return out;
}
