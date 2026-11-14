import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-030 (slice D1, W3): a selected orbiter on the Worlds stays drawn and the view shifts beside
 * its panel.
 *  - the fly-in to an orbiter lands under one body radius; the orbit gate used to hide every dot
 *    and ring there, the selected one included, and the ruler with them;
 *  - the selected orbiter wears the outline pass, as on hover;
 *  - with a side panel open the orbiter sits in the middle of the space the panel leaves
 *    (desktop, landscape phone); a portrait phone's full-width sheet shifts nothing;
 *  - closing the panel returns to the old gate (a low camera hides the orbits again).
 *
 * Runs on desktop-chromium, mobile-chromium and mobile-landscape-chromium.
 */

const CASES = [
  { route: '/moon?site=lro', id: 'lro' },
  { route: '/moon?site=lunar-prospector', id: 'lunar-prospector' },
  { route: '/mars?site=mro', id: 'mro' },
  { route: '/earth?object=iss', id: 'iss' },
] as const;

type State = {
  visible: boolean;
  ringVisible: boolean;
  outlined: boolean;
  x: number;
  y: number;
} | null;

const objectState = (page: Page, id: string): Promise<State> =>
  page.evaluate((i) => window.__surfaceSceneObjectState?.(i) ?? null, id);

async function open(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'load' }).catch(() => page.goto(path, { waitUntil: 'load' }));
  await waitForHydration(page);
}

/** Pixels the open panel leaves: from the canvas' left edge to the panel's left edge (0 = a sheet). */
async function spaceLeft(page: Page): Promise<{ left: number; width: number } | null> {
  const panel = page.locator('aside.panel').first();
  await expect(panel).toBeVisible({ timeout: 30_000 });
  const p = await panel.boundingBox();
  const vw = page.viewportSize()!.width;
  if (!p || p.width > vw * 0.7) return null;
  return { left: 0, width: p.x };
}

for (const c of CASES) {
  test(`${c.id}: stays drawn, ringed and outlined with its panel open`, async ({ page }) => {
    test.slow();
    await open(page, c.route);
    await expect
      .poll(async () => (await objectState(page, c.id))?.visible, { timeout: 45_000 })
      .toBe(true);
    // Past the fly-in and the 400 ms framing settle: the old gate hid the dot within a second.
    await page.waitForTimeout(2500);
    const s = await objectState(page, c.id);
    expect(s?.visible, 'the dot is drawn').toBe(true);
    expect(s?.ringVisible, 'its ring is drawn').toBe(true);
    expect(s?.outlined, 'the outline pass holds it').toBe(true);

    const room = await spaceLeft(page);
    if (room) {
      const mid = room.left + room.width / 2;
      expect(Math.abs(s!.x - mid), `dot x ${s!.x} against the middle ${mid}`).toBeLessThan(
        room.width * 0.08,
      );
    }
  });
}

test('the ruler stays beside a selected orbiter (pointer devices)', async ({ page, hasTouch }) => {
  test.skip(hasTouch, 'on touch the ruler lives in the Controls drawer');
  test.slow();
  await open(page, '/moon?site=lro');
  await expect.poll(async () => (await objectState(page, 'lro'))?.visible).toBe(true);
  await page.waitForTimeout(2500);
  await expect(page.locator('.ruler')).toBeVisible();
});

test('closing the panel returns to the old gate: the low camera hides the orbits', async ({
  page,
}) => {
  test.slow();
  await open(page, '/moon?site=lro');
  await expect.poll(async () => (await objectState(page, 'lro'))?.visible).toBe(true);
  await page.waitForTimeout(2000);
  await page.locator('aside.panel .panel-close').first().click();
  await expect
    .poll(async () => (await objectState(page, 'lro'))?.visible, { timeout: 15_000 })
    .toBe(false);
});
