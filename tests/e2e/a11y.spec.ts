import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * Accessibility pilot (S7 / ADR-025 tier-1 surface).
 *
 * **Pilot mode — does NOT fail CI on axe violations.** Per the
 * test-coverage gap-closure plan, this slice ships as a diagnostic
 * spec: it logs every violation it finds and asserts only that the
 * axe scanner itself ran. The threshold gate (fail-on-violations)
 * lands behind an ADR-supplement to ADR-025 once we have baseline
 * data and the tier-2 (canvas keyboard nav, screen reader) work is
 * on deck.
 *
 * Covers ADR-025 tier-1 routes that should be honest about a11y:
 *   - `/`          landing (no canvas; pure DOM)
 *   - `/missions`  catalog list (filter chips + cards)
 *   - `/fly`       canvas with HUD chrome (canvas itself is opaque
 *                  to axe; this checks the surrounding HUD)
 *   - `/science`   encyclopedia landing (no canvas; pure DOM + SVG)
 *   - `/library`   outbound link bill (the disclosure surface; ADR-051)
 */

const PILOT_ROUTES = [
  { path: '/', label: 'landing' },
  { path: '/missions', label: 'mission catalog' },
  { path: '/fly', label: 'fly (HUD chrome only — canvas is opaque to axe)' },
  { path: '/science', label: 'science encyclopedia' },
  { path: '/library', label: 'library / outbound-link disclosure' },
];

test.describe('a11y pilot (ADR-025 tier-1; pilot mode, no CI gate)', () => {
  for (const { path, label } of PILOT_ROUTES) {
    test(`${label} (${path}) — axe scan runs and logs violations`, async ({ page }) => {
      // /library carries 678 outbound-link rows; axe scans every rule
      // against every node, so the per-test 30 s playwright budget
      // isn't enough on cold CI Ubuntu runners (35–43 s on the last
      // failing runs). Other routes finish in <5 s and stay on the
      // default. Pilot mode = no CI gate; this is just to keep the
      // scan from being the suite's long pole.
      if (path === '/library') {
        test.setTimeout(90_000);
      }
      await page.goto(path, { waitUntil: 'networkidle' });

      // Skip rules that don't apply to a single-page-app shell scanned in
      // isolation: `region` requires every block of content under a
      // landmark, which the canvas pages can't satisfy because the canvas
      // itself isn't a landmark.
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .disableRules(['region'])
        .analyze();

      // Log violation summary to console (pilot mode: report, don't fail).
      if (results.violations.length > 0) {
        console.log(`\n  ⚠️  ${path} — ${results.violations.length} a11y violation(s):`);
        for (const v of results.violations) {
          console.log(
            `      [${v.impact ?? 'unknown'}] ${v.id}: ${v.help} (${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'})`,
          );
        }
      } else {
        console.log(`\n  ✓ ${path} — 0 a11y violations`);
      }

      // The only assertion in pilot mode: the axe scan completed.
      // `results.violations` is always an array; we assert that the
      // scanner produced a result object. The actual violation count is
      // surfaced via the console log above.
      expect(Array.isArray(results.violations)).toBe(true);
    });
  }
});
