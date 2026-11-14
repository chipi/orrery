import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * Slice E4 (UXD-035): /fleet with the line-up on (view radiogroup, kind group, FILTERS disabled)
 * and the Missions tab of Crew Dragon (links and plain-text rows) and Gemini, scanned with the
 * tab open: 0 critical or serious axe violations, in English and Arabic (right to left).
 */
const CASES = [
  {
    path: '/fleet?view=lineup&kind=launchers',
    label: 'fleet line-up',
    ready: 'section.lineup canvas',
  },
  { path: '/fleet?id=crew-dragon', label: 'crew dragon Missions tab', tab: true },
  { path: '/fleet?id=gemini', label: 'gemini Missions tab', tab: true },
  { path: '/ar/fleet?id=crew-dragon', label: 'crew dragon Missions tab, ar', tab: true },
] as const;

for (const c of CASES) {
  test(`${c.label} (${c.path}) — 0 critical or serious axe violations`, async ({ page }) => {
    test.slow();
    await page
      .goto(c.path, { waitUntil: 'load' })
      .catch(() => page.goto(c.path, { waitUntil: 'load' }));
    await waitForHydration(page);
    if ('ready' in c) {
      await expect(page.locator(c.ready)).toBeVisible({ timeout: 30_000 });
      await expect(page.getByRole('radiogroup').first()).toBeVisible();
    } else {
      const panel = page.locator('aside.panel');
      await expect(panel).toBeVisible({ timeout: 30_000 });
      await panel.getByTestId('fleet-mission-cta-multi').click();
      await expect(panel.locator('.missions-list > li').first()).toBeVisible({ timeout: 15_000 });
    }
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
      `${c.path} critical/serious violations`,
    ).toEqual([]);
  });
}
