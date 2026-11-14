import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';
import { clickViaEvaluate } from './_helpers/click-via-evaluate';

/**
 * UXD-007 (slice D2, W6): "Stand here" opens on the photograph. For every partial panorama (the
 * ones whose `panorama_metadata` has `photo_span_deg`) the first view, read from the compass rose
 * once the camera has settled, is inside the photograph, clear of its edge. A `?yaw=` deep link
 * still wins.
 *
 * The data side (every span, every opening yaw) is `src/lib/panorama-entry.data.test.ts`; this
 * is the same check on the camera the user gets. Runs on desktop-chromium, mobile-chromium and
 * mobile-landscape-chromium.
 */

type Meta = { entry_yaw_deg?: number; photo_span_deg?: [number, number] };
const doc = JSON.parse(readFileSync('static/data/surface-hotspots.json', 'utf8')) as {
  entries: Record<string, { hotspot_tier3_panorama?: string; panorama_metadata?: Meta }>;
};
const partial = Object.entries(doc.entries)
  .filter(([, e]) => e.hotspot_tier3_panorama && e.panorama_metadata?.photo_span_deg)
  .map(([id, e]) => ({
    id,
    span: e.panorama_metadata!.photo_span_deg!,
    meta: e.panorama_metadata!,
  }));

const norm = (d: number) => ((d % 360) + 360) % 360;
const routeFor = (id: string): string => {
  const e = doc.entries[id]!.hotspot_tier3_panorama!;
  const world = e.includes('/hotspots/mars/')
    ? 'mars'
    : e.includes('/hotspots/earth/')
      ? 'earth'
      : 'moon';
  return world === 'earth' ? `/earth?site=${id}` : `/${world}?site=${id}`;
};

async function stand(page: Page, route: string): Promise<void> {
  await page
    .goto(route, { waitUntil: 'load' })
    .catch(() => page.goto(route, { waitUntil: 'load' }));
  await waitForHydration(page);
  const button = page.getByTestId('stand-at-site');
  await expect(button).toBeVisible({ timeout: 30_000 });
  await clickViaEvaluate(button);
  await expect(page.getByTestId('panorama-overlay')).toBeVisible({ timeout: 10_000 });
}

const yawNow = async (page: Page): Promise<number> =>
  Number(await page.getByTestId('panorama-compass-rose').getAttribute('data-yaw'));

test('the list of partial panoramas is the audit list', () => {
  expect(partial.length).toBe(18);
});

for (const p of partial) {
  test(`${p.id}: Stand here opens on the photograph`, async ({ page }) => {
    test.slow();
    await stand(page, routeFor(p.id));
    // The camera is placed at once; a frame later the compass rose has read it.
    await expect.poll(() => page.getByTestId('panorama-compass-rose').count()).toBe(1);
    await page.waitForTimeout(500);
    const yaw = await yawNow(page);
    const off = norm(yaw - p.span[0]);
    const width = norm(p.span[1] - p.span[0]);
    expect(off, `opened at yaw ${yaw}, photograph ${p.span[0]}..${p.span[1]}`).toBeLessThanOrEqual(
      width,
    );
    expect(Math.min(off, width - off), 'clear of the photograph edge').toBeGreaterThanOrEqual(
      Math.min(35, 0.4 * width) - 1,
    );
    expect(Math.abs(norm(yaw - (p.meta.entry_yaw_deg ?? 0)))).toBeLessThanOrEqual(2);
  });
}

test('a ?yaw= deep link still wins over the opening heading', async ({ page }) => {
  test.slow();
  await stand(page, '/moon?site=apollo16&yaw=300&pitch=0');
  await page.waitForTimeout(500);
  expect(Math.abs(norm((await yawNow(page)) - 300))).toBeLessThanOrEqual(3);
});
