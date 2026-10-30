// Which per-locale i18n chunk an overlay key lives in. Shared by the bundle
// builder (scripts/build-i18n-bundles.mjs) and the runtime loader
// (src/lib/data/core.ts), so the two cannot disagree. Plain JS so the Node
// build script can import it.
//
// A page fetches only the chunk its overlays live in: in hi the whole bundle
// is ~4.4 MB raw / 613 KB br, of which science is 199 KB br, programs 110,
// essays 85, fleet 77, missions 75 and everything else ~70 (2026-10-30).

/** Top-level overlay trees that get their own chunk; every other key is in `core`. */
export const I18N_SPLIT_TREES = ['science', 'programs', 'essays', 'fleet', 'missions'];

/**
 * @param {string} key overlay key, e.g. "science/orbits/vis-viva.json"
 * @returns {string} chunk name
 */
export function i18nChunkOf(key) {
  const tree = key.split('/')[0];
  return I18N_SPLIT_TREES.includes(tree) ? tree : 'core';
}

/**
 * Served file name of a locale's chunk, e.g. "de.science.json".
 * @param {string} locale
 * @param {string} chunk
 */
export function i18nChunkFile(locale, chunk) {
  return `${locale}.${chunk}.json`;
}
