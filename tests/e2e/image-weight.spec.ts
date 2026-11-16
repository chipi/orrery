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
  // 2026-11-16 (0.9.9): 13 more missions (139 cards) and the era strip's nine photos; tablet
  // re-measured on the production build at 16.2 MB (phone 7.4, desktop 3.4, tv 7.4), oversize 0.
  // Tablet only, 1.15x rounded up.
  '/missions': { phone: 16, tablet: 19, desktop: 4, tv: 8 },
  // 2026-11-14 (F1, UXD-038): every list shows 10 rows until "Show all". The same page with every
  // chip opened (the old rendering) was 40.8 MB on a phone; capped it is 3.6 to 3.7 MB on all four
  // devices, oversize 0 (measured on the dev server, which serves the same image files; not a
  // production build), 1.15x rounded up. The reading waits for the sources to render first.
  '/credits': { phone: 5, tablet: 5, desktop: 5, tv: 5 },
  // 62 more cutaways (45 anatomy + 17 exploded) on 2026-10-23: re-measured on the
  // production build at 46.8 / 42.1 / 8.2 / 40.1 MB, oversize 0, same 1.15x rule.
  // 2026-11-06: landing sequences, science diagrams and 18 mission blueprints since — phone
  // re-measured at 62.7 MB (oversize 0; a phone shows the wide thumbs full width at 3x, so new
  // art costs it ~3x what it costs a tablet: 47.0 / 9.9 / 45.0 MB, still inside). Phone only, 1.15x.
  // 2026-11-08: each section now shows 10 items until "Show all" — re-measured on the production
  // build at 4.1 / 4.1 / 2.6 / 3.9 MB, oversize 0; same 1.15x rule, rounded up.
  // 2026-11-14 (F1): the launcher sketches are their own section (10 more portrait images shown)
  // and the page has grown since 11-08; re-measured on the dev server at 5.0 / 5.0 / 2.9 / 4.8 MB,
  // oversize 0, 1.15x rounded up.
  '/colophon': { phone: 6, tablet: 6, desktop: 4, tv: 6 },
};

const READY_SELECTOR: Record<string, string> = {
  '/credits': 'article.source-block',
  '/colophon': 'section.block',
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
  // A page that fetches its manifest after load has nothing to scroll until that lands; a
  // reading taken before it comes out at ~0 MB and would pass any budget.
  const ready = READY_SELECTOR[route];
  if (ready) await page.waitForSelector(ready, { state: 'attached', timeout: 60_000 });
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
