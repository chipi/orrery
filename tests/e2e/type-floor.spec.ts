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
 * viewport for that run; A1_LOCALE=de (or ar) prefixes the named screens.
 */

const FLOOR = 11;
const LOC = process.env.A1_LOCALE ? `/${process.env.A1_LOCALE}` : '';

const vp = process.env.A1_VIEWPORT?.match(/^(\d+)x(\d+)$/);
if (vp) test.use({ viewport: { width: Number(vp[1]), height: Number(vp[2]) } });

type Offender = { sel: string; why: string; text: string };

async function tinyText(page: Page): Promise<Offender[]> {
  return page.evaluate((floor) => {
    const out: { sel: string; why: string; text: string }[] = [];
    const seen = new Set<Element>();
    const skip = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TITLE', 'HEAD', 'CANVAS']);

    // Alpha of any computed colour: rgba(a, b, c, x), rgb(a b c / x), color(srgb a b c / x),
    // oklch(l c h / x) ... A colour with no alpha part is opaque.
    const alphaOf = (c: string) => {
      const slash = c.match(/\/\s*([0-9.]+)(%?)\s*\)$/);
      if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1);
      const legacy = c.match(/^rgba\(\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*[0-9.]+\s*,\s*([0-9.]+)\s*\)$/);
      return legacy ? Number(legacy[1]) : 1;
    };
    // Resting opacity of the ancestor chain: skip only ancestors in a FINITE fade (an entrance
    // transition or animation that will end); an infinite pulse is part of the resting look.
    const chainOpacity = (el: Element) => {
      let o = 1;
      for (let a: Element | null = el; a; a = a.parentElement) {
        const fading = a.getAnimations().some((an) => {
          const it = an.effect?.getComputedTiming().iterations;
          return it !== Infinity;
        });
        if (!fading) o *= Number(getComputedStyle(a).opacity);
      }
      return o;
    };
    const judge = (
      el: Element,
      cs: CSSStyleDeclaration,
      text: string,
      label: string,
      scale: number,
    ) => {
      const size = parseFloat(cs.fontSize) * scale;
      const alpha = alphaOf(cs.color) * chainOpacity(el);
      // A disabled control is faded on purpose and WCAG 1.4.3 exempts inactive components from
      // the contrast rule (RESET VIEW stays in its slot, disabled — UXD-015); the size floor holds.
      const inactive = !!el.closest(':disabled, [aria-disabled="true"]');
      const why =
        size < floor - 0.01
          ? `${Math.round(size * 100) / 100}px`
          : cs.fontStyle === 'italic' && size < 14 - 0.01
            ? `italic ${size}px`
            : !inactive && size < 12 && alpha < 0.58 && /[\p{L}\p{N}]/u.test(text)
              ? `${size}px at alpha ${Math.round(alpha * 1000) / 1000}`
              : '';
      if (why) out.push({ sel: label, why, text: text.slice(0, 30) });
    };
    const labelOf = (el: Element, pseudo = '') => {
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
      return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + pseudo;
    };
    const shown = (el: Element) => {
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 1 && rect.height > 1;
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = (n.textContent ?? '').replace(/[\u200b-\u200d\ufeff]/g, '').trim();
      const el = n.parentElement;
      if (!text || !el || seen.has(el) || skip.has(el.tagName)) continue;
      seen.add(el);
      // Lab science figures are viewBox-scaled charts with their own sizes (allow-listed in A1).
      if (el.closest('svg.figure-root')) continue;
      if (!shown(el)) continue;
      let scale = 1;
      if (el instanceof SVGGraphicsElement) {
        const m = el.getScreenCTM();
        if (m) scale = Math.hypot(m.a, m.b);
      }
      judge(el, getComputedStyle(el), text, labelOf(el), scale);
    }

    // Pseudo-elements: ::placeholder of inputs, and generated ::before / ::after text.
    for (const el of document.body.querySelectorAll('*')) {
      if (skip.has(el.tagName) || el.closest('svg.figure-root') || el instanceof SVGElement)
        continue;
      if (!shown(el)) continue;
      if (
        (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) &&
        el.placeholder.trim()
      ) {
        judge(
          el,
          getComputedStyle(el, '::placeholder'),
          el.placeholder,
          labelOf(el, '::placeholder'),
          1,
        );
      }
      for (const p of ['::before', '::after']) {
        const pcs = getComputedStyle(el, p);
        const content = pcs.content;
        if (!content || content === 'none' || content === 'normal') continue;
        const text = content.replace(/^"|"$/g, '').trim();
        if (!text || /^(counter|attr)\(/.test(text)) continue;
        if (pcs.display === 'none' || pcs.visibility === 'hidden') continue;
        judge(el, pcs, text, labelOf(el, p), 1);
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
      await page.goto(LOC + '/explore?id=mars');
      await panelReady(page);
    },
  },
  {
    name: 'mission-panel',
    open: async (page) => {
      await page.goto(LOC + '/missions?id=curiosity');
      await panelReady(page);
    },
  },
  {
    name: 'fleet-panel',
    open: async (page) => {
      await page.goto(LOC + '/fleet?id=saturn-v');
      await panelReady(page);
    },
  },
  {
    name: 'moon-site-panel',
    open: async (page) => {
      await page.goto(LOC + '/moon?site=apollo11', { waitUntil: 'networkidle' });
      await panelReady(page);
    },
  },
  {
    name: 'missions-filters-open',
    open: async (page) => {
      await page.goto(LOC + '/missions');
      const toggle = page.locator('button.filters-strip');
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
      await page.goto(LOC + '/credits', { waitUntil: 'networkidle' });
      await expect(page.locator('article.source-block').first()).toBeVisible({ timeout: 15_000 });
    },
  },
  {
    name: 'gallery-deep-sky',
    open: async (page) => {
      await page.goto(LOC + '/gallery/deep-sky', { waitUntil: 'networkidle' });
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

test.describe('type floor — no text under 11 px, italic ≥ 14 px, small text ≥ 0.58 alpha (UX A1 / Q2)', () => {
  test.setTimeout(60_000);
  for (const screen of [...SCREENS, ...EXTRA]) {
    test(screen.name, async ({ page }) => {
      await screen.open(page);
      const dir = process.env.A1_SHOT_DIR;
      if (dir) await page.screenshot({ path: `${dir}-${screen.name}.png` });
      const tiny = await tinyText(page);
      const report = tiny.map((o) => `${o.why} ${o.sel} "${o.text}"`);
      expect(report, `type rule broken on ${screen.name}`).toEqual([]);
      const overflowX = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflowX, `page scrolls sideways on ${screen.name}`).toBeLessThanOrEqual(1);
    });
  }
});

test.describe('panel overview is an upright lead in the body font (UX A1 / Q2)', () => {
  test('planet panel .editorial: upright, Space Mono, ≥ 15 px; stat labels ≥ 0.58 alpha', async ({
    page,
  }) => {
    await page.goto(LOC + '/explore?id=mars');
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

test.describe('3D sprite labels of the pin scenes keep the floor (UX C2, UXD-020)', () => {
  test.slow();
  for (const level of ['neighborhood', 'milky-way', 'local-group']) {
    test(`${level}: every shown sprite label is at least 11 px of text`, async ({ page }) => {
      await page.goto(`${LOC}/explore?context=${level}`);
      await page.waitForFunction(() => window.__scenePins?.() != null, null, { timeout: 60_000 });
      await page.waitForTimeout(2_000);
      const snap = await page.evaluate(() => window.__scenePins!());
      const shown = snap!.labels.filter((l) => l.shown);
      expect(shown.length).toBeGreaterThan(0);
      for (const l of shown) expect(l.textPx, `${level}: ${l.id}`).toBeGreaterThanOrEqual(11);
    });
  }
});

test.describe('bigger labels do not push card grids off screen (UX A1 layout)', () => {
  for (const route of ['/fleet', '/missions']) {
    test(`${route}: every card sits inside the viewport`, async ({ page }) => {
      await page.goto(LOC + route);
      const cards = page.locator('.entity-card-grid .card');
      await expect(cards.first()).toBeVisible({ timeout: 15_000 });
      const stray = await cards.evaluateAll((els) =>
        els
          .map((el) => el.getBoundingClientRect())
          .filter((r) => r.width > 0 && (r.right > innerWidth + 1 || r.left < -1))
          .map((r) => `${Math.round(r.left)}..${Math.round(r.right)} of ${innerWidth}`),
      );
      expect(stray.slice(0, 5)).toEqual([]);
    });
  }
});

test.describe('type-floor detector catches each broken rule (self-check)', () => {
  const fixture = (body: string) => `<!doctype html><html><head><style>
    body { background:#000; color:#fff; font:14px 'Space Mono', monospace; }
    @keyframes pulse { 0%,100% { opacity:.3 } 50% { opacity:.3 } }
    @keyframes fadein { from { opacity:0 } to { opacity:1 } }
    .small9 { font-size:9px }
    .dim11 { font-size:11px; color:rgba(255,255,255,.4) }
    .dim11-srgb { font-size:11px; color:color(srgb 1 1 1 / .4) }
    .dim11-slash { font-size:11px; color:rgb(255 255 255 / 40%) }
    .dim11-oklch { font-size:11px; color:oklch(0.9 0.02 250 / .4) }
    .ph::placeholder { font-size:9px }
    .bef::before { content:'tiny'; font-size:9px }
    .aft::after { content:'dim'; font-size:11px; color:rgba(255,255,255,.3) }
    .pulse { font-size:11px; animation:pulse 1s infinite }
    .fade { font-size:11px; animation:fadein 60s ease-in 1 both }
    .italic12 { font-size:12px; font-style:italic }
  </style></head><body>${body}</body></html>`;

  test('flags what is broken, ignores a finite fade and a healthy label', async ({ page }) => {
    await page.setContent(
      fixture(`
      <p class="small9">floor</p>
      <p class="dim11">dim rgba</p>
      <p class="dim11-srgb">dim srgb</p>
      <p class="dim11-slash">dim slash</p>
      <p class="dim11-oklch">dim oklch</p>
      <input class="ph" placeholder="placeholder">
      <p class="bef">x</p>
      <p class="aft">y</p>
      <p class="pulse">pulse</p>
      <p class="italic12">italic</p>
      <div class="fade"><p style="font-size:11px">fading in, healthy</p></div>
      <p style="font-size:11px;color:rgba(255,255,255,.6)">healthy label</p>`),
    );
    const found = (await tinyText(page)).map((o) => o.sel).sort();
    expect(found).toEqual(
      [
        'p.small9',
        'p.dim11',
        'p.dim11-srgb',
        'p.dim11-slash',
        'p.dim11-oklch',
        'input.ph::placeholder',
        'p.bef::before',
        'p.aft::after',
        'p.pulse',
        'p.italic12',
      ].sort(),
    );
  });
});
