import { expect, test } from '@playwright/test';

/**
 * Deep-sky entity pages (/explore/deep-sky/<id>, ADR-096 item 17): static prerendered HTML, so
 * `request.get` is enough. M13 (photo-less, with the Arecibo door), M3 (a bare catalogue name:
 * the H1 is the designation, then NGC 5272) and M42 (photographed, with the gateway into the
 * TRAPPIST-1 system), in English and German: one H1 with the object's title, the self canonical
 * and reciprocal hreflang, the link back into the scene (?deepsky=<id>) and the crumb to /explore.
 */

const ORIGIN = 'https://www.orrerylearn.com';

// `text`: the start of the overlay's `fact` in the page's locale (no character the HTML escapes).
const CASES = [
  {
    id: 'm13',
    title: 'M13 · Hercules Globular Cluster',
    photo: false,
    text: {
      '': 'The Hercules Cluster, over 100,000 stars',
      '/de': 'Der Herkuleshaufen, über 100.000 Sterne',
    },
  },
  {
    id: 'm3',
    title: 'M3 · NGC 5272',
    photo: false,
    text: {
      '': 'One of the largest and brightest globular clusters known',
      '/de': 'Einer der größten und hellsten bekannten Kugelsternhaufen',
    },
  },
  {
    id: 'm42',
    title: 'M42 · Great Orion Nebula',
    photo: true,
    text: {
      '': 'The Orion Nebula, the nearest region of massive-star formation',
      '/de': 'Der Orionnebel, die nächste Region massereicher Sternentstehung',
    },
  },
] as const;

test.describe('deep-sky pages: static HTML', () => {
  // Playwright requires a destructuring pattern as the first argument (see mobile-invariants.spec.ts).
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'static HTML: one project is enough');
  });

  for (const prefix of ['', '/de'] as const) {
    for (const { id, title, photo, text } of CASES) {
      test(`${prefix}/explore/deep-sky/${id}: H1, canonical, hreflang, scene link, crumb`, async ({
        request,
      }) => {
        const res = await request.get(`${prefix}/explore/deep-sky/${id}`);
        expect(res.ok()).toBe(true);
        const html = await res.text();

        const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
          m[1].replace(/<[^>]*>/g, '').trim(),
        );
        expect(h1s).toEqual([title]);

        expect(html).toContain(
          `<link rel="canonical" href="${ORIGIN}${prefix}/explore/deep-sky/${id}"`,
        );
        for (const [hreflang, path] of [
          ['en-US', ''],
          ['de', '/de'],
          ['zh-CN', '/zh-CN'],
        ])
          expect(html).toContain(
            `<link rel="alternate" hreflang="${hreflang}" href="${ORIGIN}${path}/explore/deep-sky/${id}"`,
          );
        expect(html).toContain(
          `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/explore/deep-sky/${id}"`,
        );

        expect(html).toContain(`href="${prefix}/explore?deepsky=${id}"`);
        expect(html).toContain(`href="${prefix}/explore"`); // the crumb to the Explore scene
        expect(html).toContain('class="crumb page-crumb"');

        // The reviewed overlay text in the page's own locale, the catalogue-linked values.
        expect(html).toContain(text[prefix]);
        expect(html).toContain('<dl class="facts');
        expect(html.includes('data-testid="data-sources"')).toBe(true);
        expect(html.includes(`href="${prefix}/gallery/deep-sky"`)).toBe(photo);
      });
    }
  }

  test('M13: the distance is spelled in the locale’s unit and number format, with its paper linked; the Arecibo door is on the page', async ({
    request,
  }) => {
    const en = await (await request.get('/explore/deep-sky/m13')).text();
    expect(en).toContain('~24,000 ly');
    expect(en).toContain('Hercules');
    expect(en).toContain('HolgerBaumgardt/globular/fits/ngc6205.html');
    expect(en).toContain('Arecibo');
    const de = await (await request.get('/de/explore/deep-sky/m13')).text();
    expect(de).toContain('~24.000 Lichtjahre');
    expect(de).toContain('Herkules');
  });

  test('M42: the gateway links the TRAPPIST-1 star page, the telescope row is there', async ({
    request,
  }) => {
    const html = await (await request.get('/explore/deep-sky/m42')).text();
    expect(html).toContain('href="/explore/stars/trappist-1"');
    expect(html).toContain('Telescope');
    const de = await (await request.get('/de/explore/deep-sky/m42')).text();
    expect(de).toContain('Teleskop');
  });

  test('a twin id is not a page: Andromeda is the one page /explore/deep-sky/m31', async ({
    request,
  }) => {
    const html = await (await request.get('/explore/deep-sky/m31')).text();
    expect(html).toContain('Andromeda');
    const index = await (await request.get('/explore')).text();
    expect(index).toContain('href="/explore/deep-sky/m31"');
    expect(index).not.toContain('href="/explore/deep-sky/andromeda"');
  });
});
