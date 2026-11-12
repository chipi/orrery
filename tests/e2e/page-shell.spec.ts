/**
 * One page shell (UXD-012, slice A2): every text page shares the container,
 * title, lead and section label from src/lib/styles/page-shell.css. A page that
 * redefines them, or adds the nav height on top of the sticky nav, fails here.
 */
import { expect, test, type Page } from '@playwright/test';

type Shell = {
  path: string;
  /** Inside the science host layout: the host owns the container and its spacing. */
  inset?: boolean;
  /** The host layout IS the container (science index, tab, section): no .page-shell root. */
  hostRoot?: boolean;
  noLead?: boolean;
  noTitle?: boolean;
};

const PAGES: Shell[] = [
  { path: '/credits' },
  { path: '/colophon' },
  { path: '/library' },
  { path: '/library/episodes' },
  { path: '/gallery' },
  { path: '/gallery/deep-sky' },
  { path: '/posters' },
  { path: '/patches' },
  { path: '/sourcing' },
  { path: '/programs' },
  { path: '/programs/apollo' },
  { path: '/privacy' },
  { path: '/live' },
  // The essays index title is drawn over the banner illustration (allow-listed).
  { path: '/essays', noTitle: true },
  { path: '/essays/delta-v' },
  { path: '/science', inset: true, hostRoot: true },
  { path: '/science/orbits', inset: true, hostRoot: true, noLead: true },
  { path: '/science/orbits/apsides', inset: true, hostRoot: true },
  { path: '/science/glossary', inset: true },
  { path: '/science/reading-list', inset: true },
  { path: '/science/watch-list', inset: true },
  { path: '/catalog' },
  { path: '/learn' },
  { path: '/worlds' },
  { path: '/explore/hub' },
  { path: '/missions/apollo11' },
  { path: '/fleet/saturn-v' },
  // A body with a fact sentence: the lead only renders when the body has one.
  { path: '/explore/mars' },
  { path: '/lab/tsiolkovsky', noLead: true },
  { path: '/moon/apollo11' },
];

async function metrics(page: Page) {
  return page.evaluate(() => {
    const px = (v: string) => parseFloat(v);
    const navBottom = document.querySelector('nav')!.getBoundingClientRect().bottom;
    const root = document.querySelector<HTMLElement>('.page-shell');
    const h1 = document.querySelector<HTMLElement>('h1.page-title');
    const lead = document.querySelector<HTMLElement>('.page-lead');
    const rcs = root ? getComputedStyle(root) : null;
    const hcs = h1 ? getComputedStyle(h1) : null;
    const lcs = lead ? getComputedStyle(lead) : null;
    const rootBox = root?.getBoundingClientRect();
    return {
      vw: window.innerWidth,
      root: root
        ? {
            top: rootBox!.top - navBottom,
            contentLeft: rootBox!.left + px(rcs!.paddingLeft),
            paddingTop: px(rcs!.paddingTop),
            maxWidth: rcs!.maxWidth,
          }
        : null,
      h1: h1
        ? {
            left: h1.getBoundingClientRect().left,
            family: hcs!.fontFamily,
            size: px(hcs!.fontSize),
            spacing: px(hcs!.letterSpacing),
            italic: hcs!.fontStyle,
          }
        : null,
      lead: lead
        ? { family: lcs!.fontFamily, size: px(lcs!.fontSize), italic: lcs!.fontStyle }
        : null,
    };
  });
}

test.describe('one page shell (UXD-012)', () => {
  for (const p of PAGES) {
    test(`${p.path} uses the shell`, async ({ page }) => {
      await page.goto(p.path);
      await page
        .locator(p.noTitle ? '.page-shell' : 'h1.page-title')
        .first()
        .waitFor();
      const m = await metrics(page);

      if (!p.hostRoot) expect(m.root, 'page root carries .page-shell').not.toBeNull();
      if (!p.inset) {
        // The root starts right under the sticky nav (no second --nav-height) with 24 px air.
        expect(Math.abs(m.root!.top), 'root starts at the nav bottom').toBeLessThanOrEqual(1);
        expect(m.root!.paddingTop).toBe(24);
        expect(['1080px', '760px', '1400px']).toContain(m.root!.maxWidth);
      }

      if (!p.noTitle) {
        expect(m.h1, 'visible h1.page-title').not.toBeNull();
        expect(m.h1!.family).toMatch(/^"?Bebas Neue/);
        expect(m.h1!.italic).toBe('normal');
        // clamp(40px, 8vw, 64px)
        expect(m.h1!.size).toBeCloseTo(Math.min(64, Math.max(40, m.vw * 0.08)), 0);
        expect(m.h1!.spacing).toBe(1);
        if (!p.inset) {
          expect(
            Math.abs(m.h1!.left - m.root!.contentLeft),
            'title on the content edge',
          ).toBeLessThanOrEqual(1);
        }
      }

      if (!p.noLead) {
        expect(m.lead, '.page-lead').not.toBeNull();
        expect(m.lead!.family).toMatch(/Space Mono/);
        expect(m.lead!.italic).toBe('normal');
        expect(m.lead!.size).toBe(m.vw <= 600 ? 15 : 16);
      }
    });
  }

  test('gallery strip text starts on the title edge (G1)', async ({ page }) => {
    await page.goto('/gallery');
    await page.locator('.strip-text').first().waitFor();
    const d = await page.evaluate(() => {
      const h1 = document.querySelector('h1.page-title')!.getBoundingClientRect().left;
      const strip = document.querySelector('.strip-text h2')!.getBoundingClientRect().left;
      return Math.abs(strip - h1);
    });
    expect(d).toBeLessThanOrEqual(1);
  });

  test('home page keeps its own styling (H8, not the shell)', async ({ page }) => {
    await page.goto('/');
    await page.locator('main').waitFor();
    expect(await page.locator('.page-shell').count()).toBe(0);
  });
});
