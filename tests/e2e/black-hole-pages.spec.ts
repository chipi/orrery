import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Black-hole entity pages (/explore/black-holes/<id>, ADR-096 item 16): static prerendered HTML,
 * so `request.get` is enough. M87* (a real hole with the EHT picture and figures) and Gargantua
 * (fiction: a visible badge, no figures) in English and German: one H1 with the hole's name, the
 * self canonical and reciprocal hreflang, the link back into the scene (?bh=<id>) and the crumb to
 * /explore.
 */

const ORIGIN = 'https://www.orrerylearn.com';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const holes: { id: string; name: string; kind: string }[] = read(
  'static/data/universe/black-holes.json',
).objects;

/** The name the page prints: the locale overlay's `name`, else the catalogue name. */
function nameOf(id: string, loc: string): string {
  try {
    const n = read(`i18n-src/${loc}/universe/black-holes/${id}.json`).name as string | undefined;
    if (n) return n;
  } catch {
    /* no overlay for this locale */
  }
  return holes.find((h) => h.id === id)!.name;
}

const CASES = [
  { id: 'm87-star', fiction: false },
  { id: 'gargantua', fiction: true },
];

test.describe('black-hole pages: static HTML', () => {
  // Playwright requires a destructuring pattern as the first argument (see mobile-invariants.spec.ts).
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'static HTML: one project is enough');
  });

  for (const { code, prefix } of [
    { code: 'en-US', prefix: '' },
    { code: 'de', prefix: '/de' },
  ]) {
    for (const { id, fiction } of CASES) {
      test(`${prefix}/explore/black-holes/${id}: H1, canonical, hreflang, scene link, ${fiction ? 'fiction badge and no figures' : 'figures and the EHT picture'}`, async ({
        request,
      }) => {
        const res = await request.get(`${prefix}/explore/black-holes/${id}`);
        expect(res.ok()).toBe(true);
        const html = await res.text();

        const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
          m[1].replace(/<[^>]*>/g, '').trim(),
        );
        expect(h1s).toEqual([nameOf(id, code)]);

        expect(html).toContain(
          `<link rel="canonical" href="${ORIGIN}${prefix}/explore/black-holes/${id}"`,
        );
        for (const [hreflang, path] of [
          ['en-US', ''],
          ['de', '/de'],
          ['zh-CN', '/zh-CN'],
        ])
          expect(html).toContain(
            `<link rel="alternate" hreflang="${hreflang}" href="${ORIGIN}${path}/explore/black-holes/${id}"`,
          );
        expect(html).toContain(
          `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/explore/black-holes/${id}"`,
        );

        expect(html).toContain(`href="${prefix}/explore?bh=${id}"`);
        expect(html).toContain(`href="${prefix}/explore"`); // the crumb to the Explore scene, as on a planet page

        expect(html.includes('data-testid="bh-fiction-badge"')).toBe(fiction);
        expect(html.includes('<dl class="facts')).toBe(!fiction);
        expect(html.includes('black-holes-m87')).toBe(id === 'm87-star');
      });
    }
  }

  test('Gargantua’s badge and text say it is fiction in German too, and its figures are absent', async ({
    request,
  }) => {
    const html = await (await request.get('/de/explore/black-holes/gargantua')).text();
    const badge = read('messages/de.json').bh_fiction_badge as string;
    expect(html).toContain(badge);
    expect(html).toContain('existiert nicht');
    expect(html).not.toContain('100.000.000');
    expect(html).not.toContain('0,9999');
  });

  test('a real hole carries its mass and distance, M87* at the EHT’s 16.8 Mpc (54.8 million light-years)', async ({
    request,
  }) => {
    const html = await (await request.get('/explore/black-holes/m87-star')).text();
    expect(html).toContain('6.5 billion');
    expect(html).toContain('54.8 million ly');
    expect(html).not.toContain('53.5');
  });

  test('every value names its paper with a link, and the Data sources block lists the papers (#658)', async ({
    request,
  }) => {
    const bibcodes: Record<string, string> = {
      'sagittarius-a-star': '2022A%26A...657L..12G',
      'm87-star': '2019ApJ...875L...6E',
      'cygnus-x-1': '2021Sci...371.1046M',
    };
    for (const [id, bib] of Object.entries(bibcodes)) {
      const html = await (await request.get(`/explore/black-holes/${id}`)).text();
      expect(html).toContain('data-testid="data-sources"');
      expect(html).toContain(`https://ui.adsabs.harvard.edu/abs/${bib}/abstract`);
      expect(html).toContain('https://simbad.cds.unistra.fr/simbad/sim-id?Ident=');
      // the mass and the distance rows each carry the paper as a link (class src)
      expect(html.match(/class="src[ "]/g)?.length).toBe(2);
    }
  });

  test('Gargantua is fiction: no catalogue, no sources block', async ({ request }) => {
    const html = await (await request.get('/explore/black-holes/gargantua')).text();
    expect(html).not.toContain('data-testid="data-sources"');
    expect(html).not.toContain('ui.adsabs.harvard.edu');
  });
});
