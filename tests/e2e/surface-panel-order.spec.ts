import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UXD-034 (slice D2): a photo first. On a Worlds panel the hero (the first gallery image) sits
 * before the tab row on every site that has a gallery, so the panel opens on a photograph and
 * the tabs follow it. B1 (UXD-018) put the hero below the action row; this keeps it above the
 * tabs for the Moon, Mars and Venus alike.
 *
 * One page per world: each site is selected through the scene's own hook, so the run does not pay
 * a page load per site. Runs on desktop-chromium, mobile-chromium and mobile-landscape-chromium.
 */

const WORLDS = [
  { route: '/moon', file: 'moon-sites.json' },
  { route: '/mars', file: 'mars-sites.json' },
  { route: '/venus', file: 'venus-sites.json' },
] as const;

type SiteRow = { id: string };
const idsOf = (file: string): string[] => {
  const doc = JSON.parse(readFileSync(`static/data/${file}`, 'utf8')) as
    SiteRow[] | { sites: SiteRow[] };
  return (Array.isArray(doc) ? doc : doc.sites).map((s) => s.id);
};

/** null: no hero or no tab row yet; true: the hero comes before the tab row in the document. */
const heroBeforeTabs = (page: Page): Promise<boolean | null> =>
  page.evaluate(() => {
    const panel = document.querySelector('aside.panel');
    const hero = panel?.querySelector('.panel-hero');
    const tabs = panel?.querySelector('[role="tablist"]');
    if (!hero || !tabs) return null;
    return !!(hero.compareDocumentPosition(tabs) & Node.DOCUMENT_POSITION_FOLLOWING);
  });

for (const w of WORLDS) {
  test(`${w.route}: every site with a gallery has its hero before the tab row`, async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const ids = idsOf(w.file);
    await page.goto(w.route, { waitUntil: 'load' }).catch(() => page.goto(w.route));
    await waitForHydration(page);
    await page.waitForFunction(() => typeof window.__surfaceSceneSelectSite === 'function', null, {
      timeout: 30_000,
    });
    const withGallery: string[] = [];
    const wrong: string[] = [];
    for (const id of ids) {
      await page.evaluate((i) => window.__surfaceSceneSelectSite?.(i), id);
      const tabs = page.locator('aside.panel [role="tablist"]');
      await expect(tabs).toBeVisible({ timeout: 15_000 });
      // The tab row is drawn before the site's gallery has loaded: give the GALLERY tab a moment,
      // then judge by it, since it shows exactly when the gallery has an image.
      await page.waitForTimeout(400);
      const hasGallery = (await tabs.getByRole('tab', { name: 'GALLERY' }).count()) > 0;
      if (!hasGallery) continue;
      withGallery.push(id);
      const hero = await heroBeforeTabs(page);
      if (hero !== true) wrong.push(`${id}:${hero}`);
    }
    // Venus has no site gallery until slice D3: its guard is armed but has nothing to judge yet.
    if (w.route !== '/venus') {
      expect(withGallery.length, 'sites with a gallery were checked').toBeGreaterThan(20);
    }
    expect(wrong, 'sites whose hero is missing or after the tab row').toEqual([]);
  });
}
