/**
 * Post-build guardrail — fails loudly when the prerender silently
 * dropped locale pages.
 *
 * Background: in the 2026-06-16 #342 docker-e2e cycle, a misconfigured
 * `handleHttpError` allowed the prerender to suppress 404s and
 * `npm run build` happily exited green while emitting only the en-US
 * tree (18 HTML files instead of the expected ~340). Deploy preview
 * pushed that incomplete artifact to gh-pages, and every locale-root
 * URL ended up serving the en-US fallback via nginx. CI was green;
 * the site was broken. That's the failure mode this check exists
 * to catch: any future "build silently produces incomplete output"
 * regression fails the action *here*, with a precise message naming
 * the missing locales, instead of riding through to a broken deploy.
 *
 * What it asserts:
 *   1. Every locale in project.inlang/settings.json has its root HTML
 *      file emitted (either `/<locale>.html` flat-file or
 *      `/<locale>/index.html` directory-style).
 *   2. Total HTML file count is plausible for a full prerender.
 *
 * What it does NOT assert:
 *   - Per-route × per-locale completeness — that's covered by the
 *     prerender's own crawler + entries list; if a route is missing
 *     for one locale only, this check can't tell.
 *   - HTML correctness — Playwright e2e covers content.
 *
 * Used by `npm run build` (added to package.json `build` chain).
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BUILD_DIR = join(__dirname, '..', 'build');
const SETTINGS_PATH = join(__dirname, '..', 'project.inlang', 'settings.json');

// Minimum sensible HTML count for a full per-locale prerender. Today's
// build emits ~340; we floor at 200 to leave room for content churn
// without firing on legitimate growth or shrink. The shape of THIS
// regression is "drops to ~20", so the floor catches it cleanly.
const MIN_HTML_FILES = 200;

function readSettings() {
  return JSON.parse(readFileSync(SETTINGS_PATH, 'utf8'));
}

function findHtmlFiles(dir) {
  const out = [];
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      const s = statSync(full);
      if (s.isDirectory()) {
        // Skip the immutable bundle dir + audio + data — those are
        // assets, not prerendered HTML.
        if (entry === '_app' || entry === 'audio' || entry === 'data') continue;
        walk(full);
      } else if (entry.endsWith('.html')) {
        out.push(full);
      }
    }
  }
  walk(dir);
  return out;
}

function localeRootEmitted(buildDir, locale) {
  // Either `<base>/<locale>.html` (flat-file, trailingSlash: 'never')
  // or `<base>/<locale>/index.html` (directory, trailingSlash: 'always').
  // SvelteKit may have prefixed the path with `${base}` internally;
  // adapter-static strips it before writing to disk so we can ignore
  // it here.
  try {
    statSync(join(buildDir, `${locale}.html`));
    return true;
  } catch {
    // not the flat-file shape, try directory shape
  }
  try {
    statSync(join(buildDir, locale, 'index.html'));
    return true;
  } catch {
    return false;
  }
}

function main() {
  const settings = readSettings();
  const locales = settings.locales;
  const baseLocale = settings.baseLocale;

  try {
    statSync(BUILD_DIR);
  } catch {
    console.error(`[check-prerender] build/ does not exist; skipping.`);
    process.exit(0);
  }

  const htmlFiles = findHtmlFiles(BUILD_DIR);
  const total = htmlFiles.length;

  // Per-locale check — every non-base locale must have its root HTML.
  // The base locale's root is `build/index.html` which adapter-static
  // always emits; the non-base ones are the ones the prerender bug
  // would silently drop.
  const missing = [];
  for (const locale of locales) {
    if (locale === baseLocale) continue;
    if (!localeRootEmitted(BUILD_DIR, locale)) missing.push(locale);
  }

  if (missing.length > 0) {
    console.error(`[check-prerender] FAIL: ${missing.length} locale root(s) missing from build/`);
    for (const l of missing) console.error(`  ✘ ${l}`);
    console.error(`\nThis means the prerender silently dropped non-en-US pages.`);
    console.error(`See scripts/check-prerender-completeness.mjs header for context.`);
    process.exit(1);
  }

  if (total < MIN_HTML_FILES) {
    console.error(
      `[check-prerender] FAIL: only ${total} HTML files in build/, expected ≥ ${MIN_HTML_FILES}`,
    );
    console.error(
      `Even with per-locale roots present, the per-route prerender may have dropped pages.`,
    );
    process.exit(1);
  }

  console.log(
    `[check-prerender] ✓ ${total} HTML files emitted; all ${locales.length - 1} non-base locale roots present.`,
  );
}

main();
