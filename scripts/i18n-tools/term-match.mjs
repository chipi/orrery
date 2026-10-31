// Matching rules shared by term-drift.mjs and its tests.
import crypto from 'node:crypto';

// Arabic vowel marks (harakat, shadda, sukun, dagger alif) and tatweel are optional in
// written Arabic: أشعِل and أشعل are the same word. Stems and text are compared without them.
const AR_MARKS = /[\u064B-\u065F\u0670\u0640]/g;
export const normalize = (loc, s) => (loc === 'ar' ? s.replace(AR_MARKS, '') : s);

// Only running text counts. Markdown link targets are paths in English in every locale —
// "(/science/orbits/…)" would let an nl `orbit` stem pass and an English "delta-v" target
// flag a field whose text never uses the term — so they are cut before matching; a field
// that is a bare path or file name (image keys) is not text at all.
export const prose = (s) => s.replace(/\]\([^)\s]*\)/g, ']');
export const isText = (s) => /\s/.test(prose(s).trim());

export function enPattern(term, entry) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = entry._en
    ? new RegExp(entry._en, 'i')
    : new RegExp(`\\b${esc}(?:s|es|ed|ing)?\\b`, 'i');
  return { test: (s) => isText(s) && re.test(prose(s)) };
}

export function locPattern(entry, loc) {
  const stems = entry._match?.[loc] ?? (entry[loc] ? [entry[loc]] : []);
  if (!stems.length) return null;
  const re = new RegExp(stems.map((s) => `(?:${normalize(loc, s)})`).join('|'), 'iu');
  // `_avoid.<loc>`: forms that are wrong for this sense; a field using one is a miss even
  // when an accepted form appears elsewhere in it (zh-CN 自由返回轨迹 beside a 轨道).
  const avoid = entry._avoid?.[loc]?.length
    ? new RegExp(entry._avoid[loc].map((s) => `(?:${normalize(loc, s)})`).join('|'), 'iu')
    : null;
  return {
    test: (s) => {
      const t = normalize(loc, prose(s));
      return re.test(t) && !avoid?.test(t);
    },
    avoided: (s) => normalize(loc, prose(s)).match(avoid ?? /$^/)?.[0] ?? null,
    // the matched text (vowel marks removed for ar), for review listings
    match: (s) => normalize(loc, prose(s)).match(re)?.[0] ?? null,
  };
}

// A reviewed miss: the field does not use the binding form and is right as it is (another
// sense, a proper name, a natural omission). It holds only while the text it was judged on
// is unchanged; any edit to the field brings the miss back for review.
export const keepKey = (term, loc, where) => `${term}|${loc}|${where}`;
export const textHash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
