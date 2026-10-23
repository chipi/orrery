import { expect, test, type Browser } from '@playwright/test';

/**
 * Image weight across device classes (#482).
 *
 * The browse pages used to load each card's full gallery image (/fleet on a phone:
 * 52.8 MB after a full scroll; /credits 572 MB). Every raster now comes from the WebP
 * ladder through `responsive()` with a per-slot `sizes`, so each device should pick
 * a rung close to what it displays. This spec loads each route as a phone, tablet,
 * desktop and TV, scrolls to the bottom, and asserts:
 *
 *  1. image bytes stay under the route's budget for that device class, and
 *  2. no ladder image (one with a srcset) is wider than 2x the device pixels it is
 *     displayed at — unless it is already the smallest rung on offer.
 *
 * Runs once, in the desktop-chromium project; it makes its own context per device.
 */

const DEVICES = {
  phone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    viewport: { width: 820, height: 1180 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: {
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
  tv: {
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  },
} as const;
type Device = keyof typeof DEVICES;

// MB after a full scroll. Re-measured 2026-10-23 on the production build (after every ladder
// entry got its 320 px rung), then ~1.15x headroom rounded up — kept tight on
// purpose; never looser than the 2026-10-16 budgets. A body that can't be read
// mid-scroll is not counted, so a measurement can only come out low, not high.
const BUDGET_MB: Record<string, Record<Device, number>> = {
  '/fleet': { phone: 17, tablet: 37, desktop: 6, tv: 17 },
  '/missions': { phone: 16, tablet: 16, desktop: 4, tv: 8 },
  '/credits': { phone: 43, tablet: 43, desktop: 43, tv: 43 },
  // 62 more cutaways (45 anatomy + 17 exploded) on 2026-10-23: re-measured on the
  // production build at 46.8 / 42.1 / 8.2 / 40.1 MB, oversize 0, same 1.15x rule.
  '/colophon': { phone: 54, tablet: 49, desktop: 10, tv: 47 },
};

async function measure(browser: Browser, baseURL: string, route: string, device: Device) {
  const ctx = await browser.newContext({ ...DEVICES[device], baseURL, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const bytes = new Map<string, number>();
  page.on('response', async (r) => {
    if (r.request().resourceType() !== 'image') return;
    try {
      bytes.set(r.url(), (await r.body()).length);
    } catch {
      // aborted / redirected — nothing to count
    }
  });
  await page.goto(route, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  await page.waitForTimeout(2500);
  const oversize = await page.evaluate(() =>
    [...document.images]
      .filter((i) => i.complete && i.naturalWidth > 0 && i.getAttribute('srcset'))
      .map((i) => {
        const rungs = (i.getAttribute('srcset') ?? '')
          .split(',')
          .map((s) => Number(s.trim().split(/\s+/)[1]?.replace('w', '')))
          .filter((n) => n > 0);
        return {
          src: i.currentSrc.replace(location.origin, ''),
          natural: i.naturalWidth,
          shown: Math.round(i.getBoundingClientRect().width * devicePixelRatio),
          smallest: Math.min(...rungs),
        };
      })
      .filter((i) => i.shown > 0 && i.natural > 2 * i.shown && i.natural > i.smallest),
  );
  const mb = [...bytes.values()].reduce((a, b) => a + b, 0) / 1e6;
  await ctx.close();
  return { mb, oversize };
}

test.describe('image weight per device class (#482)', () => {
  test.setTimeout(180_000);

  for (const route of Object.keys(BUDGET_MB)) {
    for (const device of Object.keys(DEVICES) as Device[]) {
      test(`${route} as ${device}`, async ({ browser, baseURL }) => {
        test.skip(test.info().project.name !== 'desktop-chromium', 'own contexts; run once');
        const { mb, oversize } = await measure(browser, baseURL!, route, device);
        console.log(
          `[image-weight] ${route} ${device}: ${mb.toFixed(1)} MB, oversize ${oversize.length}`,
        );
        expect(oversize, `ladder images > 2x their displayed size on ${route} (${device})`).toEqual(
          [],
        );
        expect(mb, `image MB after a full scroll on ${route} (${device})`).toBeLessThanOrEqual(
          BUDGET_MB[route][device],
        );
      });
    }
  }
});
