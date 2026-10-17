/**
 * Which model translates into a locale (AGENTS.md "Translation model tier").
 *
 * Haiku is the default for every translate-*.mjs call. A locale moves to Sonnet
 * only when its Haiku output has been shown to be broken, and the evidence is
 * recorded here. Operator ruling 2026-10-17: Sonnet override for problem
 * languages, Haiku stays the default. Retry ladders stay on the locale's own
 * model; never escalate further (no Opus).
 */
export const DEFAULT_TRANSLATION_MODEL = 'claude-haiku-4-5';
export const PROBLEM_LOCALE_MODEL = 'claude-sonnet-5-5';

export const SONNET_LOCALES = new Map([
  // 2026-10-17: Haiku's sr-Cyrl output for skip-entry had "ушће" (river mouth)
  // for entry, "обала" (shore) for coast and an English "the" mid-word; the
  // corpus carries Russian words, Hangul and Cyrillic/Latin mixed words
  // (detector pass: 10.0% of strings, against 2.7–3.3% for most locales).
  ['sr-Cyrl', '2026-10-17 detector pass + skip-entry review'],
]);

export function translationModel(locale) {
  return SONNET_LOCALES.has(locale) ? PROBLEM_LOCALE_MODEL : DEFAULT_TRANSLATION_MODEL;
}
