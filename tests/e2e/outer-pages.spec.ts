import { expect, test, type APIRequestContext } from '@playwright/test';
import {
  DEEP_SKY_TWINS,
  expectedGalaxyPages,
  expectedStructurePages,
  galaxyPages,
  inHtml,
  outerName,
  overlayOf,
  structurePages,
} from './_helpers/outer-pages';

/**
 * Galaxy and structure entity pages (/explore/galaxies/<id>, /explore/structures/<id>, ADR-096
 * item 18): static prerendered HTML, so `request.get` is enough. The overlay files decide which
 * pages exist, so every expectation below is derived from them: an id with no overlay must be a
 * 404, an id with one a page whose H1 is the glossary's name, whose lede is the overlay's fact in
 * the page's locale (en-US where the locale has no file), with the self canonical, reciprocal
 * hreflang, the crumb to /explore and the link into the scene (?context=<scale>&pick=<id>).
 * LMC (a Local Group member, also a Milky Way pin) and the Virgo Cluster (a structure whose
 * distance has a source) in English and German.
 */

const ORIGIN = 'https://www.orrerylearn.com';

const CASES = [
  {
    dir: 'galaxies',
    id: 'lmc',
    dataName: 'Large Magellanic Cloud',
    open: 'context=local-group&amp;pick=lmc',
    pages: galaxyPages,
  },
  {
    dir: 'structures',
    id: 'virgo-cluster',
    dataName: 'Virgo Cluster (M87)',
    open: 'context=virgo&amp;pick=virgo-cluster',
    pages: structurePages,
  },
] as const;

test.describe('galaxy and structure pages: static HTML', () => {
  // Playwright requires a destructuring pattern as the first argument (see mobile-invariants.spec.ts).
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'static HTML: one project is enough');
  });

  // The server answers an unprerendered path with a 404 or its fallback shell; neither is a page.
  const notAPage = async (request: APIRequestContext, path: string) => {
    const res = await request.get(path);
    if (res.status() !== 404)
      expect(await res.text(), `${path} is not an entity page`).not.toContain(
        'class="crumb page-crumb"',
      );
  };

  test('an id with no overlay is not a page; a twin keeps its deep-sky page', async ({
    request,
  }) => {
    await notAPage(request, '/explore/galaxies/no-such-galaxy');
    await notAPage(request, '/explore/structures/no-such-structure');
    for (const twin of DEEP_SKY_TWINS) await notAPage(request, `/explore/galaxies/${twin}`);
  });

  for (const { dir, id, dataName, open, pages } of CASES) {
    for (const prefix of ['', '/de'] as const) {
      const locale = prefix === '' ? 'en-US' : 'de';
      test(`${prefix}/explore/${dir}/${id}: H1, canonical, hreflang, scene link, crumb, text`, async ({
        request,
      }) => {
        const res = await request.get(`${prefix}/explore/${dir}/${id}`);
        if (!pages.has(id)) {
          await notAPage(request, `${prefix}/explore/${dir}/${id}`);
          return;
        }
        expect(res.ok()).toBe(true);
        const html = await res.text();

        const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
          m[1].replace(/<[^>]*>/g, '').trim(),
        );
        expect(h1s).toEqual([inHtml(outerName(dataName, locale))]);

        expect(html).toContain(
          `<link rel="canonical" href="${ORIGIN}${prefix}/explore/${dir}/${id}"`,
        );
        for (const [hreflang, path] of [
          ['en-US', ''],
          ['de', '/de'],
          ['zh-CN', '/zh-CN'],
        ])
          expect(html).toContain(
            `<link rel="alternate" hreflang="${hreflang}" href="${ORIGIN}${path}/explore/${dir}/${id}"`,
          );
        expect(html).toContain(
          `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/explore/${dir}/${id}"`,
        );

        expect(html).toContain(`href="${prefix}/explore?${open}"`);
        expect(html).toContain(`href="${prefix}/explore"`);
        expect(html).toContain('class="crumb page-crumb"');

        // The overlay's own words in the page's locale, and the catalogue-linked rows.
        const { fact, bio } = overlayOf(dir, id, locale);
        expect(html).toContain(inHtml(fact));
        expect(html).toContain(inHtml(bio));
        expect(html).toContain('<dl class="facts');
        expect(html.includes('data-testid="data-sources"')).toBe(true);
      });
    }
  }

  test('the Virgo Cluster names its distance paper (Mei 2007), the Local Group members theirs', async ({
    request,
  }) => {
    test.skip(
      !structurePages.has('virgo-cluster') || !galaxyPages.has('lmc'),
      'no overlay for virgo-cluster or lmc yet',
    );
    const virgo = await (await request.get('/explore/structures/virgo-cluster')).text();
    expect(virgo).toContain('href="https://arxiv.org/abs/astro-ph/0702510"');
    const lmc = await (await request.get('/explore/galaxies/lmc')).text();
    expect(lmc).toContain('2019Natur.567..200P');
  });

  test('the page sets match the data, not the route code: every overlaid member, no twin', async () => {
    expect([...galaxyPages].sort()).toEqual(expectedGalaxyPages());
    expect([...structurePages].sort()).toEqual(expectedStructurePages());
    for (const twin of DEEP_SKY_TWINS) expect(galaxyPages.has(twin)).toBe(false);
  });

  test('an unsourced structure distance has no paper link (the batch 6 review decides)', async ({
    request,
  }) => {
    test.skip(!structurePages.has('m81-group'), 'no overlay for m81-group yet');
    const html = await (await request.get('/explore/structures/m81-group')).text();
    expect(html).not.toContain('data-testid="data-sources"');
  });
});

test.describe("an anchor structure opens in the next scale out (the pages' scene links)", () => {
  const ANCHORS = [
    { context: 'local-sheet', pick: 'local-group', name: /Local Group/ },
    { context: 'virgo', pick: 'local-group', name: /Local Group/ },
    { context: 'laniakea', pick: 'virgo-supercluster', name: /Virgo Supercluster/ },
    { context: 'cosmic-web', pick: 'laniakea', name: /Laniakea/ },
  ];
  for (const a of ANCHORS) {
    test(`?context=${a.context}&pick=${a.pick} opens its panel`, async ({ page }) => {
      test.slow();
      await page.goto(`/explore?context=${a.context}&pick=${a.pick}`);
      await expect(
        page.locator('aside.panel:not(.covered)').filter({ hasText: a.name }).first(),
      ).toBeVisible({ timeout: 60_000 });
      await expect.poll(() => new URL(page.url()).searchParams.get('pick')).toBe(a.pick);
    });
  }
});
