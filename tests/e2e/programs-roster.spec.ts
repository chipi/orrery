import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { waitForHydration } from './_helpers/hydration';

/**
 * Program rosters (E2, UXD-033): a row that names an existing mission, craft or module links to it;
 * a row that is an episode, phase, decision or plan sits under Milestones, never under Missions;
 * hardware lists carry the flown vehicles of the program's missions. Runs on all three projects.
 */

interface Row {
  linked_id?: string;
  ref?: string;
  name?: string;
  milestone?: true;
  link?: { ref: string; id: string; station?: string };
}
const rj = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T;
const roster = (id: string) => rj<{ roster: Row[] }>(`static/data/programs/${id}.json`).roster;

const sectionOrder = (page: Page): Promise<string[]> =>
  page.evaluate(() =>
    [...document.querySelectorAll('article.program > section')].map(
      (s) => s.className.split(' ')[0],
    ),
  );

test.describe('program roster links and milestones', () => {
  test('/programs/cassini: two linked mission rows, two plain milestones, one hardware card', async ({
    page,
  }) => {
    await page.goto('/programs/cassini');
    await waitForHydration(page);
    const missions = page.locator('section.roster .timeline li');
    await expect(missions).toHaveCount(2);
    await expect(page.locator('section.roster .timeline button.t-name')).toHaveCount(2);
    const ms = page.locator('section.milestones .timeline li');
    await expect(ms).toHaveCount(2);
    await expect(page.locator('section.milestones a, section.milestones button')).toHaveCount(0);
    await expect(page.locator('section.hardware-section a.hw-card')).toHaveCount(1);
    await expect(page.locator('section.hardware-section a.hw-card')).toHaveAttribute(
      'href',
      /\/fleet\?id=cassini&from=program:cassini$/,
    );
    const order = await sectionOrder(page);
    expect(order.indexOf('milestones')).toBe(order.indexOf('roster') + 1);

    await page.locator('section.roster .timeline button.t-name').nth(1).click();
    await expect(page.locator('aside.detail .d-name')).toHaveText(/Huygens/);
    await expect(page.locator('aside.detail a.d-open')).toHaveAttribute(
      'href',
      /\/missions\?id=huygens/,
    );
  });

  test('/programs/apollo: Apollo 1, 7 and 9 are linked rows now', async ({ page }) => {
    await page.goto('/programs/apollo');
    await waitForHydration(page);
    const linked = roster('apollo').filter((r) => r.ref === 'mission');
    expect(linked.map((r) => r.linked_id)).toEqual(
      expect.arrayContaining(['apollo-1', 'apollo7', 'apollo9']),
    );
    await expect(page.locator('section.roster .timeline button.t-name')).toHaveCount(linked.length);
    for (const n of ['Apollo 1', 'Apollo 7', 'Apollo 9']) {
      await expect(
        page.locator('section.roster .timeline button.t-name', { hasText: n }).first(),
      ).toBeVisible();
    }
    await page
      .locator('section.roster .timeline button.t-name', { hasText: 'Apollo 7' })
      .first()
      .click();
    await expect(page.locator('aside.detail a.d-open')).toHaveAttribute(
      'href',
      /\/missions\?id=apollo7/,
    );
  });

  test('/programs/esa-human: the Columbus row opens the ISS module panel', async ({ page }) => {
    await page.goto('/programs/esa-human');
    await waitForHydration(page);
    const link = page.locator('section.roster .timeline a.t-link', { hasText: 'Columbus' });
    await expect(link).toHaveAttribute('href', /\/iss\?module=columbus$/);
    await link.click();
    await expect(page).toHaveURL(/\/iss\?module=columbus/);
    const panel = page.locator('aside.panel');
    await expect(panel).toBeVisible({ timeout: 15_000 });
    await expect(panel.getByRole('heading', { level: 1, name: /columbus/i })).toBeVisible();
  });

  test('/programs/jwst: Milestones, and no Missions heading above it', async ({ page }) => {
    await page.goto('/programs/jwst');
    await expect(page.locator('section.roster')).toHaveCount(0);
    await expect(page.locator('section.milestones .timeline li')).toHaveCount(5);
    await expect(page.locator('section.milestones h2')).toHaveText(/Milestones/i);
  });

  test('/programs/space-shuttle: the Challenger and Columbia rows open the craft', async ({
    page,
  }) => {
    await page.goto('/programs/space-shuttle');
    // The orbiters are hardware rows (linked by `linked_id`), drawn as hardware cards.
    const card = (id: string) =>
      page.locator(`ul.hardware a.hw-card[href*="/fleet?id=${id}&from=program"]`);
    await expect(card('challenger')).toHaveCount(1);
    await expect(card('columbia')).toHaveCount(1);
  });

  test('every link on the changed programs points at an entry that exists', async ({ page }) => {
    const missions = new Set(
      (await (await page.request.get('/data/missions/index.json')).json()).map(
        (m: { id: string }) => m.id,
      ),
    );
    const fleet = new Set(
      (await (await page.request.get('/data/fleet/index.json')).json()).map(
        (m: { id: string }) => m.id,
      ),
    );
    const ids = ['cassini', 'apollo', 'esa-human', 'space-shuttle', 'soviet-lunar', 'mars-rovers'];
    for (const id of ids) {
      await page.goto(`/programs/${id}`);
      const rows = await page
        .locator('article.program .timeline a[href], article.program .hardware a[href]')
        .evaluateAll((els) => els.map((e) => e.getAttribute('href') ?? ''));
      expect(rows.length, id).toBeGreaterThan(0);
      for (const h of rows) {
        const u = new URL(h, 'http://x');
        const target = u.searchParams.get('id') ?? u.searchParams.get('module');
        expect(target, `${id} ${h}`).toBeTruthy();
        if (u.pathname.endsWith('/fleet')) expect(fleet.has(target!), `${id} ${h}`).toBe(true);
        else if (u.pathname.endsWith('/missions'))
          expect(missions.has(target!), `${id} ${h}`).toBe(true);
      }
      const buttons = await page.locator('article.program .timeline button.t-name').count();
      expect(buttons, id).toBe(roster(id).filter((r) => r.ref === 'mission').length);
    }
  });
});
