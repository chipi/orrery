import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

/**
 * The eight scale levels on the home grid and the /explore hub (C8, UXD-027): one table now
 * feeds both, and they must print what they printed when each page wrote the levels out by hand.
 * The expected keys below are that old hand-written mapping, kept here as the golden record; the
 * strings are read from the locale's message file, not copied, so a wording change is not a
 * failure and a swapped key is.
 */

type Row = { id: string; name: string; title: string; desc: string };
const ROWS: Row[] = [
  {
    id: 'solar-system',
    name: 'explore_ctx_solar_system',
    title: 'landing_card_explore_title',
    desc: 'landing_card_explore_desc',
  },
  {
    id: 'neighborhood',
    name: 'explore_ctx_stellar_neighborhood',
    title: 'explore_hub_shortcut_neighborhood',
    desc: 'explore_hub_desc_neighborhood',
  },
  {
    id: 'milky-way',
    name: 'explore_ctx_milky_way',
    title: 'explore_hub_shortcut_milkyway',
    desc: 'explore_hub_desc_milkyway',
  },
  {
    id: 'local-group',
    name: 'explore_ctx_local_group',
    title: 'explore_hub_shortcut_localgroup',
    desc: 'explore_hub_desc_localgroup',
  },
  {
    id: 'local-sheet',
    name: 'explore_ctx_local_sheet',
    title: 'explore_lens_story_ls_title',
    desc: 'explore_hub_desc_localsheet',
  },
  {
    id: 'virgo',
    name: 'explore_ctx_virgo',
    title: 'explore_lens_story_virgo_title',
    desc: 'explore_hub_desc_virgo',
  },
  {
    id: 'laniakea',
    name: 'explore_ctx_laniakea',
    title: 'explore_lens_story_laniakea_title',
    desc: 'explore_hub_desc_laniakea',
  },
  {
    id: 'cosmic-web',
    name: 'explore_ctx_cosmic_web',
    title: 'explore_lens_story_cosmic_web_title',
    desc: 'explore_hub_desc_cosmicweb',
  },
];

for (const [locale, prefix] of [
  ['en-US', ''],
  ['de', '/de'],
] as const) {
  const msg = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8')) as Record<string, string>;

  test.describe(`level text parity — ${locale}`, () => {
    test('the home grid prints the eight levels as before', async ({ page }) => {
      await page.goto(`${prefix}/`);
      const cards = page.locator('[data-testid="landing-cards"] a.card[href*="context="]');
      await expect(cards).toHaveCount(8);
      for (const [i, r] of ROWS.entries()) {
        const c = cards.nth(i);
        await expect(c).toHaveAttribute('href', new RegExp(`\\?context=${r.id}$`));
        await expect(c.locator('.card-route')).toHaveText(msg[r.name]);
        await expect(c.locator('.card-title')).toHaveText(msg[r.title]);
        await expect(c.locator('.card-desc')).toHaveText(msg[r.desc]);
      }
    });

    test('the Explore hub prints the eight levels as before', async ({ page }) => {
      await page.goto(`${prefix}/explore/hub`);
      const cards = page.locator('[data-testid="explore-hub-cards"] a.card');
      await expect(cards).toHaveCount(8);
      for (const [i, r] of ROWS.entries()) {
        const c = cards.nth(i);
        // The Solar System tile is the bare /explore link and says "Explore", as the nav does.
        if (r.id === 'solar-system') {
          await expect(c).toHaveAttribute('href', new RegExp(`/explore$`));
          await expect(c.locator('.card-name')).toHaveText(msg.nav_explore);
        } else {
          await expect(c).toHaveAttribute('href', new RegExp(`\\?context=${r.id}$`));
          await expect(c.locator('.card-name')).toHaveText(msg[r.name]);
        }
        await expect(c.locator('.card-title')).toHaveText(msg[r.title]);
        await expect(c.locator('.card-desc')).toHaveText(msg[r.desc]);
      }
    });
  });
}
