import type { ConsoleMessage } from '@playwright/test';

/**
 * Decide whether a `console.error` is an expected probe / browser-noise
 * message that the test should ignore, vs a real asset failure that
 * should fail the assertion.
 *
 * Background: the data-loader (`src/lib/data.ts`) probes per-locale
 * overlay JSON files under `/data/i18n/<locale>/...`. A miss is
 * expected — the loader catches it via `.catch(() => null)` and falls
 * back to en-US. The browser still surfaces the 404 to the console.
 * /fly's mission loader (since the 2026-06 spline pass) probes
 * `/data/trajectories/<mission-id>.json` the same way: only the
 * iconic grand-tour missions (Cassini, Voyager 1/2, Pioneer 10/11,
 * Galileo, etc.) ship one; everything else falls back to the
 * Keplerian half-ellipse. The fetch is intentional + swallowed,
 * but the browser still logs the 404.
 * We allow 404s only when the URL is one of these known probe paths,
 * so a missing mission patch / crew portrait / gallery image still
 * fails. See AGENTS.md §Spec-writing patterns and the
 * `feedback_e2e_console_filter_blindspot` memory.
 */
export function isExpectedNoise(msg: ConsoleMessage): boolean {
  if (msg.type() !== 'error') return false;
  const text = msg.text();
  // Browser / dev-server noise unrelated to our asset surface.
  if (/favicon|webgl warning|hot module/i.test(text)) return true;
  // 404s only get a pass when the URL is a known intentional probe —
  // any other 404 (patch, portrait, gallery, diagram) is a real bug.
  if (/Failed to load resource|404 \(Not Found\)/.test(text)) {
    const url = msg.location()?.url ?? '';
    return (
      /\/data\/i18n\//.test(url) ||
      /\/data\/trajectories\//.test(url) ||
      // /images/missions/<id>.jpg (card cover) +
      // /images/missions/thumbnails/<id>.png (trajectory thumbnail) are
      // the mission catalog card photos. /missions/+page.svelte wires
      // an `onerror` handler on the cover so the figure hides when the
      // file is missing (slice B/C added inspiration4, polaris-dawn,
      // otv-6, otv-7 to the index without shipping image assets — the
      // cards gracefully degrade). The browser still logs each 404;
      // allow them here so the smoke check focuses on real asset
      // misses (per-mission patches, crew portraits, gallery items
      // live deeper at /images/missions/<id>/<file>.<ext>).
      /\/images\/missions\/([^/]+\.jpg|thumbnails\/[^/]+\.png)$/.test(url)
    );
  }
  return false;
}
