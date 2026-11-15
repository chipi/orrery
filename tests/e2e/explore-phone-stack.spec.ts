import { expect, test } from '@playwright/test';

/**
 * Plan L26: the 44 px touch chips made /explore's phone stacks too wide or too tall at 390 px.
 * Measured before the fix (en / de / ru / fr): the time dock ran 3 / 26 / 37 / 19 px past the right
 * edge, the Ruler / Missions / Controls tab row sat 13 px under the dock, the long German RESET
 * VIEW ran under the level card, and the hint covered the third HUD row.
 * Runs in a 390 x 844 touch context whatever the project.
 */
test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});

type Rect = { l: number; t: number; r: number; b: number };

for (const prefix of ['', '/de', '/ru']) {
  test(`${prefix || '/en'}/explore: dock, tab row, HUD rows and hint do not collide at 390 px`, async ({
    page,
  }) => {
    await page.goto(`${prefix}/explore`);
    await page.waitForSelector('.time-controls', { state: 'visible', timeout: 45_000 });
    await page.waitForSelector('[data-testid="explore-hint"]', { timeout: 20_000 });
    await page.waitForSelector('[data-testid="explore-level-card"]', { timeout: 20_000 });
    // The HUD rows clear the navigator and the level card by their measured widths: wait until the
    // page has measured them (the clearance leaves its 16 px default), then let the rows re-wrap.
    await page.waitForFunction(
      () =>
        parseFloat(
          (document.querySelector('.hud-top-mobile') as HTMLElement | null)?.style.getPropertyValue(
            '--hud-clear-right',
          ) ?? '0',
        ) > 100,
      null,
      { timeout: 30_000 },
    );
    await page.waitForTimeout(1500);

    const m = await page.evaluate(() => {
      const rect = (e: Element): Rect => {
        const b = e.getBoundingClientRect();
        return { l: b.left, t: b.top, r: b.right, b: b.bottom };
      };
      const all = (sel: string) =>
        [...document.querySelectorAll(sel)].filter((e) => e.getBoundingClientRect().width > 0);
      return {
        vw: window.innerWidth,
        dock: all('.time-controls').map(rect),
        dockChips: all('.time-controls .ui-chip, .time-controls .time-date').map(rect),
        tabs: all('.mdg-tab').map(rect),
        hud: all('.hud-top-mobile .ui-chip').map(rect),
        picker: all('[data-testid="explore-scale-toggle"]').map(rect),
        card: all('[data-testid="explore-level-card"]').map(rect),
        hint: all('[data-testid="explore-hint"]').map(rect),
      };
    });

    expect(m.dock.length).toBe(1);
    expect(m.dock[0]!.r, 'the dock ends inside the screen').toBeLessThanOrEqual(m.vw);
    for (const c of m.dockChips)
      expect(c.r, 'a dock chip ends inside the screen').toBeLessThanOrEqual(m.vw);

    expect(m.tabs.length).toBeGreaterThan(0);
    for (const t of m.tabs)
      expect(t.b, 'the tab row ends above the dock').toBeLessThanOrEqual(m.dock[0]!.t);

    const hit = (a: Rect, b: Rect) =>
      a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
    const others = [...m.picker, ...m.card];
    for (const h of m.hud) {
      for (const o of others)
        expect(hit(h, o), `HUD chip ${JSON.stringify(h)} runs under ${JSON.stringify(o)}`).toBe(
          false,
        );
      for (const t of m.hint)
        expect(hit(h, t), `the hint covers HUD chip ${JSON.stringify(h)}`).toBe(false);
    }
  });
}
