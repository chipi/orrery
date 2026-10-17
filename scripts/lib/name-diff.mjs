/**
 * Structural diff helpers for names-only edits (scripts/i18n-names-pass.mjs):
 * which hunks an edit changed, whether anything other than names changed, and
 * how similar the text outside the names stayed.
 */
import { ORDINARY } from './translate-quality.mjs';

/** Diff hunks [{del, ins}] between a and b by LCS over tokens: words (with the
 *  whitespace between them) for languages written with spaces, characters for
 *  ja/zh-CN. Very long inputs fall back to one hunk covering the changed middle. */
export function editHunks(a, b, mode = 'word') {
  const tok = (x) => (mode === 'char' ? [...x] : x.split(/(\s+)/).filter((t) => t !== ''));
  const ta = tok(a);
  const tb = tok(b);
  let p = 0;
  while (p < ta.length && p < tb.length && ta[p] === tb[p]) p++;
  let sa = ta.length;
  let sb = tb.length;
  while (sa > p && sb > p && ta[sa - 1] === tb[sb - 1]) {
    sa--;
    sb--;
  }
  const A = ta.slice(p, sa);
  const B = tb.slice(p, sb);
  if (!A.length && !B.length) return [];
  if (A.length * B.length > 4_000_000) return [{ del: A.join(''), ins: B.join('') }];
  const n = A.length;
  const m = B.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hunks = [];
  let cur = null;
  let i = 0;
  let j = 0;
  const flush = () => {
    if (cur && (cur.del.trim() || cur.ins.trim())) hunks.push(cur);
    cur = null;
  };
  while (i < n || j < m) {
    if (i < n && j < m && A[i] === B[j]) {
      // Whitespace between two changes belongs to one hunk ("Ozean der Stürme" →
      // "Ocean of Storms" is one replacement, not three).
      if (cur && /^\s+$/.test(A[i]) && i + 1 < n && j + 1 < m && A[i + 1] !== B[j + 1]) {
        cur.del += A[i];
        cur.ins += B[j];
      } else flush();
      i++;
      j++;
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      (cur ||= { del: '', ins: '' }).ins += B[j++];
    } else {
      (cur ||= { del: '', ins: '' }).del += A[i++];
    }
  }
  flush();
  return hunks;
}

const CONNECT = new Set([
  'of',
  'the',
  'de',
  'la',
  'le',
  'du',
  'des',
  'von',
  'van',
  'der',
  'and',
  'for',
  'on',
]);

/**
 * Why a names edit changed more than names (empty = acceptable). Each hunk may
 * insert (a) Latin runs that are verbatim spans of the English source, start and
 * end on a capitalised word or number, and use only connecting words in lowercase
 * (Ocean of Storms, Kennedy Space Center) — and only by REPLACING something; and
 * (b) at most two other characters (a particle or case ending). No English
 * possessive may be added (German "Shepards" must not become "Shepard's").
 */
export function nonNameChanges(oldT, newT, src, mode = 'word') {
  const bad = [];
  const oldWords = new Set(oldT.match(/[A-Za-z0-9]+/g) || []);
  const srcWords = new Set(src.match(/[A-Za-z0-9]+/g) || []);
  if (/['’]s\b/.test(newT) && !/['’]s\b/.test(oldT)) bad.push("added an English possessive ('s)");
  for (const h of editHunks(oldT, newT, mode)) {
    const runs =
      h.ins.match(/[A-Za-z0-9][A-Za-z0-9'’.-]*(?:\s+[A-Za-z0-9][A-Za-z0-9'’.-]*)*/g) || [];
    for (const run of runs) {
      // Words the old translation already had are the language's own (German
      // "Wostok-Kapsel" → "Vostok-Kapsel" keeps "Kapsel"); only new words are checked.
      const words = run.split(/[\s-]+/).filter((w) => w && !oldWords.has(w));
      if (!words.length) continue;
      const ordinary = words.filter((w) => ORDINARY.has(w.replace(/['’]s$/, '')));
      const notName = words.filter(
        (w) => !srcWords.has(w.replace(/['’]s$/, '')) || !(/^[A-Z0-9]/.test(w) || CONNECT.has(w)),
      );
      if (ordinary.length)
        bad.push(`anglicised an ordinary noun (translated under the rule): ${ordinary.join(' ')}`);
      else if (notName.length || words.length > 7)
        bad.push(`inserted text that is not a name from the source: "${notName.join(' ') || run}"`);
    }
    if (runs.length && !h.del.trim())
      bad.push(`added "${h.ins.trim()}" without replacing anything`);
    const otherChars = h.ins.replace(/[A-Za-z0-9\s'’.\-–—·,()]/g, '');
    const delNative = h.del.replace(/[A-Za-z0-9\s'’.\-–—·,()]/g, '');
    // Native text may be removed (the localised name) or have a particle/case ending
    // added, but not swapped for other native text without a name going in.
    if (!runs.length && otherChars.length && delNative.length)
      bad.push(`changed words outside the names: "${h.del}" → "${h.ins}"`);
    else if (otherChars.length > 2)
      bad.push(`changed words outside the names: "${h.del}" → "${h.ins}"`);
  }
  return [...new Set(bad)].slice(0, 3);
}

export function outsideNamesSimilarity(oldT, newT, names) {
  const strip = (s) => {
    let r = s;
    for (const n of names) r = r.split(n).join('');
    return r
      .replace(/[A-Za-z0-9'’.-]+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  const a = strip(oldT);
  const b = strip(newT);
  if (!a.length && !b.length) return 1;
  // bigram Dice coefficient
  const grams = (s) => {
    const m = new Map();
    for (let i = 0; i < s.length - 1; i++)
      m.set(s.slice(i, i + 2), (m.get(s.slice(i, i + 2)) || 0) + 1);
    return m;
  };
  const ga = grams(a);
  const gb = grams(b);
  let inter = 0;
  for (const [g, c] of ga) inter += Math.min(c, gb.get(g) || 0);
  const total = Math.max(1, a.length - 1 + (b.length - 1));
  return (2 * inter) / total;
}
