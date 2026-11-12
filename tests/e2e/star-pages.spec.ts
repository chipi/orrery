import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

/**
 * Star entity pages (/explore/stars/<id>, ADR-096 item 13): static prerendered HTML, so
 * `request.get` is enough. A named star, a named star that hosts planets, and a host-only star
 * (not in the named-star catalogue), in English and German: one H1 with the star's name, the
 * self canonical and reciprocal hreflang, the planetary system as a section of the host's page,
 * and the link back into the scene (?goto= for a named star, ?system= for a host-only one).
 */

const ORIGIN = 'https://www.orrerylearn.com';

const read = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const stars: { id: string; proper: string }[] = read('static/data/universe/named-stars.json').stars;
const systems: { hostId: string; star: { name: string }; planets: { id: string }[] }[] = read(
  'static/data/universe/exoplanet-systems.json',
).systems;

/** The name the page prints: the locale overlay's `name` (en-US fallback is the catalogue name). */
function nameOf(id: string, loc: string): string {
  const named = stars.find((s) => s.id === id);
  const overlay = (l: string) => {
    try {
      return read(`i18n-src/${l}/universe/named-stars/${id}.json`).name as string | undefined;
    } catch {
      return undefined;
    }
  };
  return (
    overlay(loc) ??
    overlay('en-US') ??
    named?.proper ??
    systems.find((s) => s.hostId === id)!.star.name
  );
}

const CASES = [
  { id: 'sirius', system: false, scene: 'goto=sirius' },
  { id: 'proxima-centauri', system: true, scene: 'goto=proxima-centauri' },
  { id: 'trappist-1', system: true, scene: 'system=trappist-1' },
];

test.describe('star pages: static HTML', () => {
  // Playwright requires a destructuring pattern as the first argument (see mobile-invariants.spec.ts).
  // eslint-disable-next-line no-empty-pattern
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-chromium', 'static HTML: one project is enough');
  });

  for (const { code, prefix } of [
    { code: 'en-US', prefix: '' },
    { code: 'de', prefix: '/de' },
  ]) {
    for (const { id, system, scene } of CASES) {
      test(`${prefix}/explore/stars/${id}: H1, canonical, hreflang, system section, scene link`, async ({
        request,
      }) => {
        const res = await request.get(`${prefix}/explore/stars/${id}`);
        expect(res.ok()).toBe(true);
        const html = await res.text();

        const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
          m[1].replace(/<[^>]*>/g, '').trim(),
        );
        expect(h1s).toEqual([nameOf(id, code)]);

        expect(html).toContain(
          `<link rel="canonical" href="${ORIGIN}${prefix}/explore/stars/${id}"`,
        );
        for (const [hreflang, path] of [
          ['en-US', ''],
          ['de', '/de'],
          ['zh-CN', '/zh-CN'],
        ])
          expect(html).toContain(
            `<link rel="alternate" hreflang="${hreflang}" href="${ORIGIN}${path}/explore/stars/${id}"`,
          );
        expect(html).toContain(
          `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/explore/stars/${id}"`,
        );

        expect(html).toContain(`href="${prefix}/explore?${scene}"`);
        expect(html).toContain(`href="${prefix}/explore/stars"`); // the crumb to the hub

        const planets = systems.find((s) => s.hostId === id)?.planets ?? [];
        expect(html.includes('id="system"')).toBe(system);
        for (const p of planets) {
          expect(html).toContain(`id="${p.id}"`);
          expect(html).toMatch(
            new RegExp(`href="${prefix}/explore\\?system=${id}(&amp;|&)planet=${p.id}"`),
          );
        }
      });
    }
  }

  test('a host-only star carries its system’s overlay text and a planet row set', async ({
    request,
  }) => {
    const html = await (await request.get('/explore/stars/trappist-1')).text();
    const bio = read('i18n-src/en-US/universe/exoplanets/trappist-1-e.json').fact as string;
    expect(html).toContain(bio.slice(0, 40));
    expect(html).toContain('<dl class="facts');
  });
});
