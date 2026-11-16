import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * Slice D2: the DETAIL tab of an orbiter's panel (Moon, Mars) and of an Earth object with a
 * drawing, scanned with the tab open: 0 critical or serious axe violations, in English, in
 * Arabic (right to left) and in Russian (the longest tab word and heading).
 */
const CASES = [
  { path: '/moon?site=lro', label: 'moon orbiter DETAIL' },
  { path: '/mars?site=maven', label: 'mars orbiter DETAIL, drawing under its own id' },
  { path: '/earth?object=hubble', label: 'earth object DETAIL' },
  { path: '/ar/moon?site=lro', label: 'moon orbiter DETAIL, ar' },
  { path: '/ru/mars?site=mro', label: 'mars orbiter DETAIL, ru' },
] as const;

for (const { path, label } of CASES) {
  test(`${label} (${path}) — 0 critical or serious axe violations`, async ({ page }) => {
    test.slow();
    await page
      .goto(path, { waitUntil: 'load' })
      .catch(() => page.goto(path, { waitUntil: 'load' }));
    await waitForHydration(page);
    const tab = page.getByTestId('panel-tab-details');
    await expect(tab).toBeVisible({ timeout: 30_000 });
    await tab.click();
    await expect(
      page.getByTestId('site-landing').locator('figure.anatomy img').first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.addStyleTag({ content: '* { content-visibility: visible !important; }' });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await new AxeBuilder({ page: page as any })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .disableRules(['region'])
      .analyze();
    const blocking = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );
    expect(
      blocking.map((v) => `${v.id} (${v.nodes.length})`),
      `${path} critical/serious violations`,
    ).toEqual([]);
  });
}
