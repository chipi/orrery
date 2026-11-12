import { expect, test, type Page } from '@playwright/test';
import { collectCanonicalRoutes } from '../../scripts/site-routes.mjs';

/**
 * UX slice A3 (X2, G4, UXD-001): no teal-hue colour in the UI, and no small text in the accent
 * blue on a lifted surface below WCAG AA.
 *
 * Test 1 reads the COMPUTED colour of every element (color, background, borders, outline,
 * box-shadow, text-decoration, fill, stroke, plus ::before/::after) on each screen, normalises it
 * through a canvas (so rgb(), rgba(), color(srgb ...), oklab, color-mix all work), and fails on a
 * hue in 155-200 deg with saturation >= 0.30, lightness 0.25-0.85 and alpha > 0.05.
 * Test 2 finds text whose colour is within a small RGB distance of the accent #5070ff and
 * checks its contrast against the nearest opaque ancestor background: >= 4.5 for text under
 * 18 px (14 px bold), >= 3.0 for larger text.
 *
 * Not measured here: pixels of <canvas> / WebGL (scene colours are covered by the unit tests and
 * the A3 check script). Lab art and science diagrams keep their colours (UXD-001) and are
 * skipped, as are the data-colour elements listed in DATA_COLOUR (each carries an `a3-keep`
 * marker in the source).
 *
 * Optional: A3_SHOT_DIR=<dir> saves one screenshot per screen; A3_VIEWPORT=390x844 overrides the
 * project viewport; A3_LOCALE=de (or ar) prefixes the named screens.
 */

const LOC = process.env.A3_LOCALE ? `/${process.env.A3_LOCALE}` : '';

const vp = process.env.A3_VIEWPORT?.match(/^(\d+)x(\d+)$/);
if (vp) test.use({ viewport: { width: Number(vp[1]), height: Number(vp[2]) } });

// Data colours, not chrome (operator decision 2026-11-12, palette review at the end): the /plan
// heat-map scale, the microgravity axes legend, era bands and orbit-regime / agency / nation
// identity dots whose colour comes from data.
const DATA_COLOUR = [
  '.color-bar',
  '.swatch-zenith',
  '[style*="--band-color"]',
  '[data-agency-colour]',
  '.regime-dot',
  '[data-art]',
  '.figure-art',
  'svg.figure-root',
  'canvas',
];

type Offender = { sel: string; prop: string; value: string };

async function tealColours(page: Page): Promise<Offender[]> {
  return page.evaluate((dataSel) => {
    const out: { sel: string; prop: string; value: string }[] = [];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true })!;
    const rgba = (c: string): [number, number, number, number] | null => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = c;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return d[3] === 0 ? null : [d[0], d[1], d[2], d[3] / 255];
    };
    const teal = (c: string) => {
      const v = rgba(c);
      if (!v || v[3] <= 0.05) return false;
      const [r, g, b] = [v[0] / 255, v[1] / 255, v[2] / 255];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const l = (max + min) / 2;
      const d = max - min;
      if (d === 0) return false;
      const s = d / (1 - Math.abs(2 * l - 1));
      const h =
        ((max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60 +
          360) %
        360;
      return h >= 155 && h <= 200 && s >= 0.3 && l >= 0.25 && l <= 0.85;
    };
    const colourIn = (value: string) =>
      value.match(/(?:rgba?|color|oklab|oklch|lab|lch|hsla?)\([^)]*\)/g) ?? [];
    const props = [
      'color',
      'backgroundColor',
      'borderTopColor',
      'borderRightColor',
      'borderBottomColor',
      'borderLeftColor',
      'outlineColor',
      'textDecorationColor',
      'boxShadow',
      'fill',
      'stroke',
      'stopColor',
    ];
    const label = (el: Element, pseudo = '') => {
      const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
      return el.tagName.toLowerCase() + (cls ? '.' + cls : '') + pseudo;
    };
    const check = (el: Element, pseudo: string) => {
      const cs = getComputedStyle(el, pseudo || null);
      for (const p of props) {
        const value = (cs as unknown as Record<string, string>)[p];
        if (!value || value === 'none') continue;
        for (const c of colourIn(value)) {
          if (teal(c)) out.push({ sel: label(el, pseudo), prop: p, value: c });
        }
      }
    };
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest(dataSel.join(','))) continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName)) continue;
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      check(el, '');
      check(el, '::before');
      check(el, '::after');
    }
    return out;
  }, DATA_COLOUR);
}

type LowContrast = { sel: string; ratio: number; need: number; text: string };

async function accentContrast(page: Page): Promise<LowContrast[]> {
  return page.evaluate((dataSel) => {
    const out: { sel: string; ratio: number; need: number; text: string }[] = [];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 1;
    const cx = cv.getContext('2d', { willReadFrequently: true })!;
    const rgba = (c: string): [number, number, number, number] => {
      cx.clearRect(0, 0, 1, 1);
      cx.fillStyle = '#000';
      cx.fillStyle = c;
      cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2], d[3] / 255];
    };
    const lum = ([r, g, b]: number[]) => {
      const f = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ACCENT = [0x50, 0x70, 0xff];
    // Page background first, then every ancestor background composited over it, outermost first.
    const backdrop = (el: Element): number[] => {
      const chain: Element[] = [];
      for (let a: Element | null = el; a; a = a.parentElement) chain.unshift(a);
      let base = [4, 4, 12];
      for (const a of chain) {
        const [r, g, b, al] = rgba(getComputedStyle(a).backgroundColor);
        if (al > 0) base = base.map((v, i) => v * (1 - al) + [r, g, b][i] * al);
      }
      return base;
    };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set<Element>();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const el = n.parentElement;
      const text = (n.textContent ?? '').trim();
      if (!el || !text || seen.has(el) || el.closest(dataSel.join(','))) continue;
      seen.add(el);
      if (!el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const cs = getComputedStyle(el);
      const [r, g, b, a] = rgba(cs.color);
      if (a < 0.9) continue;
      const dist = Math.hypot(r - ACCENT[0], g - ACCENT[1], b - ACCENT[2]);
      if (dist > 30) continue;
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      const large = size >= 18 || (size >= 14 && bold);
      const need = large ? 3 : 4.5;
      const bg = backdrop(el);
      const l1 = lum([r, g, b]);
      const l2 = lum(bg);
      const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      if (ratio < need) {
        const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/)[0] : '';
        out.push({
          sel: el.tagName.toLowerCase() + (cls ? '.' + cls : ''),
          ratio: Math.round(ratio * 100) / 100,
          need,
          text: text.slice(0, 30),
        });
      }
    }
    return out;
  }, DATA_COLOUR);
}

type Screen = { name: string; open: (page: Page) => Promise<void> };

const panelReady = async (page: Page) => {
  await expect(page.locator('aside.panel')).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(600);
};

const route = (name: string, url: string, settle = 1200): Screen => ({
  name,
  open: async (page) => {
    await page.goto(LOC + url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main, section, #app, body').first()).toBeVisible();
    await page.waitForTimeout(settle);
  },
});

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
  route('home', '/'),
  route('colophon', '/colophon'),
  route('library', '/library'),
  route('posters', '/posters'),
  route('science', '/science'),
  route('gallery', '/gallery'),
  route('plan', '/plan'),
  route('fly', '/fly'),
  route('lab', '/lab'),
  route('explore-hud', '/explore'),
  {
    name: 'lab-card',
    open: async (page) => {
      await page.goto(LOC + '/lab', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const card = page.locator('[data-testid="lab-card"], .lab-card, article.card').first();
      if (await card.count()) await card.scrollIntoViewIfNeeded();
    },
  },
];

// Every canonical route family, so a route nobody named above is still covered.
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

const EXTRA: Screen[] = routeReps().map((url) =>
  route(`route${url === '/' ? '-home' : url.replace(/[^a-z0-9]+/gi, '-')}`, url),
);

test.describe('no teal-hue colour anywhere in the UI (UX A3 / UXD-001)', () => {
  test.setTimeout(60_000);
  for (const screen of [...SCREENS, ...EXTRA]) {
    test(screen.name, async ({ page }) => {
      await screen.open(page);
      const dir = process.env.A3_SHOT_DIR;
      if (dir) await page.screenshot({ path: `${dir}-${screen.name}.png` });
      const found = await tealColours(page);
      const report = found.map((o) => `${o.sel} · ${o.prop} · ${o.value}`);
      expect(report, `teal-hue colour on ${screen.name}`).toEqual([]);
    });
  }
});

test.describe('accent-blue text meets WCAG AA on its own backdrop (UX A3 contrast rule)', () => {
  test.setTimeout(60_000);
  for (const screen of SCREENS) {
    test(screen.name, async ({ page }) => {
      await screen.open(page);
      const low = await accentContrast(page);
      const report = low.map((o) => `${o.ratio} < ${o.need} ${o.sel} "${o.text}"`);
      expect(report, `sub-AA accent text on ${screen.name}`).toEqual([]);
    });
  }
});

test.describe('accent-colour detector self-check', () => {
  test('flags a teal border and a sub-AA accent link, ignores the accent and a data swatch', async ({
    page,
  }) => {
    await page.setContent(`<!doctype html><html><head><style>
      body { background:#04040c; color:#fff; font:14px monospace; }
      .t { border:1px solid rgb(78 205 196 / .5) }
      .ok { border:1px solid #5070ff; color:#5070ff }
      .lift { background:rgba(255,255,255,.12); padding:4px }
      .lift a { color:#5070ff; font-size:12px }
      .swatch-zenith { background:#4ecdc4; width:8px; height:8px }
    </style></head><body>
      <p class="t">teal border</p><p class="ok">accent</p>
      <div class="lift"><a href="#">small accent link</a></div>
      <span class="swatch-zenith"></span></body></html>`);
    const teal = (await tealColours(page)).map((o) => o.sel);
    expect(teal).toEqual(['p.t']);
    const low = (await accentContrast(page)).map((o) => o.sel);
    expect(low).toContain('a');
  });
});
