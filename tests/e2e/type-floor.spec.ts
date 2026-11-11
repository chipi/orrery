import { expect, test, type Page } from '@playwright/test';
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';

/**
 * UX slice A1 (Q2): no visible text on any screen renders below 11 px.
 *
 * The check walks every text node on the page and reads the COMPUTED
 * font-size of its element, so it catches a rule written in px, rem, em or
 * inherited. SVG <text> is measured as font-size × the user-unit→screen
 * scale (a 4.5-unit label in a 3× viewBox is 13.5 px on screen, not 4.5).
 * Canvas / WebGL label textures hold no DOM text, so they are out of scope.
 *
 * Optional: A1_SHOT_DIR=<dir> also saves one screenshot per screen (used for
 * the before/after review sheets); A1_VIEWPORT=390x844 overrides the project
 * viewport for that run.
 */

const FLOOR = 11;

const vp = process.env.A1_VIEWPORT?.match(/^(\d+)x(\d+)$/);
if (vp) test.use({ viewport: { width: Number(vp[1]), height: Number(vp[2]) } });

type Offender = { sel: string; why: string; text: string };

async function tinyText(page: Page): Promise<Offender[]> {
  return page.evaluate((floor) => {
    const out: { sel: string; why: string; text: string }[] = [];
    const seen = new Set<Element>();
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'HEAD', 'CANVAS']);
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').replace(/[\u200b-\u200d\ufeff]/g, '').trim();
      const el = n.parentElement;
      if (!text || !el || seen.has(el) || skip.has(el.tagName)) continue;
      seen.add(el);
      // Lab science figures are viewBox-scaled charts with their own sizes (allow-listed in A1).
      if (el.closest('svg.figure-root')) continue;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;
      let size = parseFloat(getComputedStyle(el).fontSize);
      if (el instanceof SVGGraphicsElement) {
        const m = el.getScreenCTM();
        if (m) size *= Math.hypot(m.a, m.b);
      }
      const cs = getComputedStyle(el);
      const col = cs.color.match(/^rgba?\(255, 255, 255(?:, ([0-9.]+))?\)$/);
      const alpha = col ? Number(col[1] ?? 1) : 1;
      const why =
        size < floor - 0.01
          ? `${Math.round(size * 100) / 100}px`
          : cs.fontStyle === 'italic' && size < 14 - 0.01
            ? `italic ${size}px`
            : size < 12 && alpha < 0.5 && /[\p{L}\p{N}]/u.test(text)
              ? `${size}px at alpha ${alpha}`
              : '';
      if (why) {
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
        out.push({
          sel: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
          why,
          text: text.slice(0, 30),
        });
      }
    }
    return out;
  }, FLOOR);
}

type Screen = { name: string; open: (page: Page) => Promise<void> };

const panelReady = async (page: Page) => {
  await expect(page.locator('aside.panel')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(600);
};

const SCREENS: Screen[] = [
  {
    name: 'explore-planet-panel',
    open: async (page) => {
      await page.goto('/explore?id=mars');
      await panelReady(page);
    },
  },
  {
    name: 'mission-panel',
    open: async (page) => {
      await page.goto('/missions?id=curiosity');
      await panelReady(page);
    },
  },
  {
    name: 'fleet-panel',
    open: async (page) => {
      await page.goto('/fleet?id=saturn-v');
      await panelReady(page);
    },
  },
  {
    name: 'moon-site-panel',
    open: async (page) => {
      await page.goto('/moon?site=apollo11', { waitUntil: 'networkidle' });
      await panelReady(page);
    },
  },
  {
    name: 'missions-filters-open',
    open: async (page) => {
      await page.goto('/missions');
      const toggle = page.locator('button.filters-toggle');
      await expect(page.locator('[data-testid^="mission-card-"]').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(toggle).toBeVisible({ timeout: 15_000 });
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.waitForTimeout(400);
    },
  },
  {
    name: 'credits',
    open: async (page) => {
      await page.goto('/credits', { waitUntil: 'networkidle' });
      await expect(page.locator('article.source-block').first()).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    name: 'gallery-deep-sky',
    open: async (page) => {
      await page.goto('/gallery/deep-sky', { waitUntil: 'networkidle' });
      await expect(page.locator('.masonry figure button').first()).toBeVisible({
        timeout: 15_000,
      });
      await page.locator('.masonry figure button').first().click();
      await expect(page.locator('.lightbox')).toBeVisible();
    },
  },
];

// One deep link per panel type, so every panel component is measured with
// its content open (the plain route renders none of them).
const PANEL_LINKS: [string, string][] = [
  ['panel-sun', '/explore?id=sun'],
  ['panel-satellite', '/explore?id=earth:moon'],
  ['panel-small-body', '/explore?id=ryugu'],
  ['panel-belt', '/explore?id=asteroid-belt'],
  ['panel-star', '/explore?goto=antares'],
  ['panel-regime', '/explore?regime=GIANTS'],
  ['panel-exoplanet', '/explore?system=proxima-centauri&planet=proxima-cen-b'],
  ['panel-station-module', '/iss?module=cupola'],
  ['panel-earth-object', '/earth?object=iss'],
  ['panel-mars-site', '/mars?site=curiosity'],
];

// Every canonical route in scripts/site-routes.mjs: each seed route, plus one
// representative of every dynamic family (/missions/<id>, /science/<tab>/<id>…).
function routeReps(): string[] {
  const all: string[] = collectCanonicalRoutes();
  const seeds = new Set(all.slice(0, all.indexOf('/sourcing') + 1));
  const reps = [...seeds];
  const families = new Set<string>();
  for (const r of all) {
    if (seeds.has(r)) continue;
    const seg = r.split('/').filter(Boolean);
    const key = `${seg[0]}/${seg.length}`;
    if (families.has(key)) continue;
    families.add(key);
    reps.push(r);
  }
  return reps;
}

const EXTRA: Screen[] = [
  ...PANEL_LINKS.map(([name, url]) => ({
    name,
    open: async (page: Page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await panelReady(page);
    },
  })),
  ...routeReps().map((url) => ({
    name: `route${url === '/' ? '-home' : url.replace(/[^a-z0-9]+/gi, '-')}`,
    open: async (page: Page) => {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main, section, #app, body').first()).toBeVisible();
      await page.waitForTimeout(1200);
    },
  })),
];

test.describe('type floor — no text under 11 px, italic ≥ 14 px, small text ≥ 0.5 alpha (UX A1 / Q2)', () => {
  test.setTimeout(60_000);
  for (const screen of [...SCREENS, ...EXTRA]) {
    test(screen.name, async ({ page }) => {
      await screen.open(page);
      const dir = process.env.A1_SHOT_DIR;
      if (dir) await page.screenshot({ path: `${dir}-${screen.name}.png` });
      const tiny = await tinyText(page);
      const report = tiny.map((o) => `${o.why} ${o.sel} "${o.text}"`);
      expect(report, `type rule broken on ${screen.name}`).toEqual([]);
    });
  }
});

test.describe('panel overview is an upright lead in the body font (UX A1 / Q2)', () => {
  test('planet panel .editorial: upright, Space Mono, ≥ 15 px; stat labels ≥ 0.58 alpha', async ({
    page,
  }) => {
    await page.goto('/explore?id=mars');
    await panelReady(page);
    const lead = page.locator('aside.panel .editorial').first();
    await expect(lead).toBeVisible();
    const cs = await lead.evaluate((el) => {
      const s = getComputedStyle(el);
      return { style: s.fontStyle, family: s.fontFamily, size: parseFloat(s.fontSize) };
    });
    expect(cs.style).toBe('normal');
    expect(cs.family).toContain('Space Mono');
    expect(cs.size).toBeGreaterThanOrEqual(15);
    const label = page.locator('aside.panel .stat-label').first();
    const color = await label.evaluate((el) => getComputedStyle(el).color);
    expect(Number(color.match(/, ([0-9.]+)\)$/)?.[1] ?? 1)).toBeGreaterThanOrEqual(0.58);
  });
});
