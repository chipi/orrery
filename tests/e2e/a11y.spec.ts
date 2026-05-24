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

/* v0.7.0 raised the floor: axe-core scans now run on 11 routes (was 5)
 * and the assertion is `0 critical violations` (was: scan completed).
 * Color-contrast `serious` violations are still surfaced as warnings
 * but do not break CI — most are intentional editorial dim-text. */
const GATED_ROUTES = [
  { path: '/', label: 'landing' },
  { path: '/missions', label: 'mission catalog' },
  { path: '/fly', label: 'fly (HUD chrome only — canvas is opaque to axe)' },
  { path: '/science', label: 'science encyclopedia' },
  { path: '/library', label: 'library / outbound-link disclosure' },
  { path: '/explore', label: 'explore (planet bodies)' },
  { path: '/earth', label: 'earth (orbit bodies)' },
  { path: '/moon', label: 'moon (landing sites)' },
  { path: '/mars', label: 'mars (landing sites)' },
  { path: '/iss', label: 'ISS (modules)' },
  { path: '/tiangong', label: 'Tiangong (modules)' },
];

test.describe('a11y gate (ADR-025 v0.7.0 — 0 critical violations)', () => {
  for (const { path, label } of GATED_ROUTES) {
    test(`${label} (${path}) — 0 critical axe violations`, async ({ page }) => {
      // /library carries 678 outbound-link rows; axe scans every rule
      // against every node, so the per-test 30 s playwright budget
      // isn't enough on cold CI Ubuntu runners (35–43 s on the last
      // failing runs). Other routes finish in <5 s and stay on the
      // default.
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

      // Surface ALL violations to the console for triage visibility.
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

      // CI gate (v0.7.0): fail on any `critical`-impact violation.
      // `serious` (color-contrast on dim editorial text) intentionally
      // does NOT fail — surfaced as warning only. Raise the floor in
      // v0.7.1 if the serious list stabilises.
      const criticals = results.violations.filter((v) => v.impact === 'critical');
      expect(
        criticals,
        `${path} has ${criticals.length} critical a11y violation(s) — see console output above.`,
      ).toHaveLength(0);
    });
  }
});
