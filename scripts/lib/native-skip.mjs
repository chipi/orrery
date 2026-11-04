/**
 * When an English name inside a translated string should stay English, even in the name's
 * origin locale. Shared by scripts/i18n-tools/convert-native.mjs (which converts) and
 * scripts/i18n-coverage-scan.mjs (which counts nativeNameMissing), so the two agree.
 *
 * Each rule came from reading a convert-native --write diff (2026-11-04):
 *   - part of a Latin phrase: a Latin word right before or after (Sputnik Planitia,
 *     Alpha Persei, Apollo-Soyuz Test Project);
 *   - an English gloss in brackets right after the CJK name it glosses — the text before
 *     the bracket starts like the native form (长征三号乙(Long March 3B), 中国运载火箭技术研究院
 *     （CALT）). A bracket after other words (ロケット（Hayabusa）) is converted.
 */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

/** Files whose strings are English on purpose (the keyword lists a search was run with). */
export const KEEP_ENGLISH_FILES = /^sourcing\//;

/** Text before the match, text after it, and the name's native form. */
export function keepEnglish(before, after, nat) {
  if (/[A-Za-z][A-Za-z.]* $/.test(before) || /^ [A-Za-z]/.test(after)) return true;
  const g = before.match(/([\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+)\s*[(（]$/u);
  if (g && nat && CJK.test(nat)) {
    const run = g[1];
    // The CJK run ends with a name that starts like the native form (2+ shared characters).
    for (let i = 0; i < run.length - 1; i++)
      if (nat.startsWith(run.slice(i, i + 2)) && run.slice(i).length >= 2) return true;
  }
  return false;
}
