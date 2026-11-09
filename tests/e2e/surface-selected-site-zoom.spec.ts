import { test, expect, type Page } from '@playwright/test';

/**
 * Zooming onto a selected site with the panel closed must never leave a dead
 * zone: at every camera distance something visible stands for the site and a
 * click on it opens the panel, while a click on empty ground does nothing.
 *
 * Before the fix the site tag left at camR 60 -> 50 and the 3D models at ~46,
 * and the route / landing ring only arrive at ~33: in between only a crosshair
 * showed, yet a click under it still opened the panel through an invisible
 * 3D hit target.
 */

// emptyFrom: the first step (camR, going in) where the regional photo no longer covers the click point.
const CASES = [
  { path: '/mars', id: 'perseverance', lat: 18.44, lon: 77.45, emptyFrom: 60 },
  { path: '/moon', id: 'apollo11', lat: 0.674, lon: 23.473, emptyFrom: 36 },
];
const STEPS = [60, 50, 45, 40, 36, 33, 31];

async function panelOpen(page: Page): Promise<boolean> {
  return (await page.locator('aside.panel').count()) > 0;
}

async function closePanel(page: Page): Promise<void> {
  // On a phone the panel opens under the finger and the emulated click that follows the tap
  // lands on its hero image (a gallery preview): dismiss that first.
  const preview = page.getByRole('button', { name: /close gallery preview/i });
  if (await preview.count()) await preview.last().click();
  const close = page.locator('aside.panel button[aria-label*="lose" i]').first();
  if (await close.count()) await close.click();
  await expect(page.locator('aside.panel')).toHaveCount(0, { timeout: 5000 });
}

/** Centre of whatever is visibly standing for the site right now, or null. */
async function visibleTarget(page: Page, id: string): Promise<{ x: number; y: number } | null> {
  return page.evaluate((siteId) => {
    const ok = (e: Element) => {
      const cs = getComputedStyle(e);
      const r = e.getBoundingClientRect();
      const anchor = e.classList.contains('site-tag');
      return (
        cs.display !== 'none' &&
        cs.visibility !== 'hidden' &&
        +cs.opacity > 0.3 &&
        (anchor || r.width > 0)
      );
    };
    const tag = [...document.querySelectorAll(`.site-tag[data-tag="site:${siteId}"]`)].find(ok);
    const el =
      tag ??
      [
        ...document.querySelectorAll(
          '[data-testid="annotation-ring"][data-annotation-id="landing"]',
        ),
      ].find(ok);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // A tag element is a 0x0 anchor at the icon's centre; card and leader hang off it.
    if (el === tag) return { x: r.left, y: r.top };
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, id);
}

/** The canvas point farthest from every drawn tag, on the bare canvas (no HUD over it). */
async function emptyGround(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas.layer');
    if (!canvas) return null;
    const cr = canvas.getBoundingClientRect();
    const tags = [...document.querySelectorAll('.site-tag')]
      .filter((e) => getComputedStyle(e).display !== 'none')
      .map((e) => e.getBoundingClientRect());
    let best: { x: number; y: number } | null = null;
    let bestD = 80;
    for (let fx = 0.1; fx < 0.95; fx += 0.1) {
      for (let fy = 0.1; fy < 0.95; fy += 0.1) {
        const x = Math.round(cr.left + cr.width * fx);
        const y = Math.round(cr.top + cr.height * fy);
        if (document.elementFromPoint(x, y) !== canvas) continue;
        const d = Math.min(...tags.map((t) => Math.hypot(t.left - x, t.top - y)), 1e9);
        if (d > bestD) {
          bestD = d;
          best = { x, y };
        }
      }
    }
    return best;
  });
}

async function crosshair(page: Page): Promise<{ x: number; y: number } | null> {
  return page.evaluate(() => {
    const e = document.querySelector('[data-testid="site-crosshair"]');
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
}

async function click(page: Page, isMobile: boolean, x: number, y: number): Promise<void> {
  if (isMobile) await page.touchscreen.tap(x, y);
  else await page.mouse.click(x, y);
}

for (const c of CASES) {
  test(`${c.path} / ${c.id} — closed panel: a visible click target at every zoom step, empty ground inert`, async ({
    page,
    isMobile,
  }) => {
    test.setTimeout(180_000);
    await page.goto(c.path);
    await page.waitForSelector('html[data-hydrated]', { timeout: 60_000 }).catch(() => {});
    await page.waitForFunction(
      () =>
        typeof (window as unknown as Record<string, unknown>).__surfaceSceneFaceLatLon ===
        'function',
      null,
      { timeout: 60_000 },
    );
    await expect(page.locator('canvas.layer')).not.toHaveAttribute('data-sites-count', '0', {
      timeout: 30_000,
    });
    await page.evaluate(
      (id) =>
        (
          window as unknown as { __surfaceSceneSelectSite: (s: string) => void }
        ).__surfaceSceneSelectSite(id),
      c.id,
    );
    await expect(page.locator('aside.panel')).toBeVisible({ timeout: 10_000 });
    await closePanel(page);

    const failures: string[] = [];
    for (const r of STEPS) {
      await page.evaluate(
        ([a, o, rr]) =>
          (
            window as unknown as {
              __surfaceSceneFaceLatLon: (a: number, o: number, r: number) => void;
            }
          ).__surfaceSceneFaceLatLon(a, o, rr),
        [c.lat, c.lon, r],
      );
      await page.waitForTimeout(3500);
      if (await panelOpen(page)) await closePanel(page);

      // Empty ground: a canvas point at least 80 px from every tag, away from any HUD.
      const empty = await emptyGround(page);
      if (r >= c.emptyFrom && empty) {
        await click(page, isMobile, empty.x, empty.y);
        await page.waitForTimeout(600);
        if (await panelOpen(page)) {
          failures.push(`camR ${r}: empty ground at ${empty.x},${empty.y} opened the panel`);
          await closePanel(page);
        }
      }

      // The site's visible stand-in: its tag icon, then (close in) the landing
      // ring, which sits under the crosshair.
      let target = await visibleTarget(page, c.id);
      let what = 'tag/ring';
      if (!target && r <= 33) {
        target = await crosshair(page);
        what = 'landing ring under the crosshair';
      }
      if (!target) {
        failures.push(`camR ${r}: nothing visible to click`);
        continue;
      }
      await click(page, isMobile, target.x, target.y);
      await page.waitForTimeout(800);
      if (!(await panelOpen(page)))
        failures.push(`camR ${r}: clicking ${what} did not open the panel`);
      else await closePanel(page);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
}
