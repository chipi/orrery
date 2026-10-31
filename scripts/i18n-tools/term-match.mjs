// Matching rules shared by term-drift.mjs and its tests.
import crypto from 'node:crypto';

// Arabic vowel marks (harakat, shadda, sukun, dagger alif) and tatweel are optional in
// written Arabic: أشعِل and أشعل are the same word. Stems and text are compared without them.
const AR_MARKS = /[ً-ٰٟـ]/g;
export const normalize = (loc, s) => (loc === 'ar' ? s.replace(AR_MARKS, '') : s);

export function enPattern(term, entry) {
  if (entry._en) return new RegExp(entry._en, 'i');
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${esc}(?:s|es|ed|ing)?\\b`, 'i');
}

export function locPattern(entry, loc) {
  const stems = entry._match?.[loc] ?? (entry[loc] ? [entry[loc]] : []);
  if (!stems.length) return null;
  const re = new RegExp(stems.map((s) => `(?:${normalize(loc, s)})`).join('|'), 'iu');
  return {
    test: (s) => re.test(normalize(loc, s)),
    // the matched text (vowel marks removed for ar), for review listings
    match: (s) => normalize(loc, s).match(re)?.[0] ?? null,
  };
}

// A reviewed miss: the field does not use the binding form and is right as it is (another
// sense, a proper name, a natural omission). It holds only while the text it was judged on
// is unchanged; any edit to the field brings the miss back for review.
export const keepKey = (term, loc, where) => `${term}|${loc}|${where}`;
export const textHash = (s) => crypto.createHash('sha1').update(s).digest('hex').slice(0, 10);
