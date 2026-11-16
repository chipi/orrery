import { expect, test, type Page } from '@playwright/test';

/**
 * Gallery pages (F4, UXD-009 amendment, UXD-040): the deep-sky viewer fits one screen at
 * 1366x768 and 1440x900, scrolls on a phone, and the four gallery-family footers share one
 * `.page-note` style; the /gallery hub strips do not cut their text.
 */

const DESKTOP_SIZES = [
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
];
const MIN_IMAGE_HEIGHT = 300;

async function openViewer(page: Page, locale: '' | '/de', titleRe: RegExp) {
  await page.goto(`${locale}/gallery/deep-sky`, { waitUntil: 'networkidle' });
  const tile = page.locator('.masonry button').filter({ hasText: titleRe }).first();
  await tile.waitFor();
  await tile.click();
  await settleImage(page);
}

async function settleImage(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const i = document.querySelector<HTMLImageElement>('.lb-figure > img');
        return !!i && i.complete && i.naturalWidth > 0;
      }),
    )
    .toBe(true);
}

/** Every part of the caption stack that G6 said was hidden, as viewport-relative boxes. */
async function viewerBoxes(page: Page) {
  return page.evaluate(() => {
    const box = (s: string) => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height };
    };
    return {
      inner: window.innerHeight,
      img: box('.lb-figure > img'),
      dd: [...document.querySelectorAll('.lb-facts dd')].map((e) => {
        const r = e.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom };
      }),
      credit: box('.lb-credit'),
      sky: box('.lb-sky'),
    };
  });
}

async function expectFits(page: Page) {
  const b = await viewerBoxes(page);
  expect(b.img!.top).toBeGreaterThanOrEqual(0);
  expect(b.img!.height).toBeGreaterThanOrEqual(MIN_IMAGE_HEIGHT);
  expect(b.dd.length).toBeGreaterThan(0);
  for (const d of b.dd) {
    expect(d.top).toBeGreaterThanOrEqual(0);
    expect(d.bottom).toBeLessThanOrEqual(b.inner);
  }
  expect(b.credit!.bottom).toBeLessThanOrEqual(b.inner);
  if (b.sky) expect(b.sky.bottom).toBeLessThanOrEqual(b.inner);
}

test.describe('deep-sky viewer fits one screen (G6, UXD-009)', () => {
  for (const size of DESKTOP_SIZES) {
    for (const [label, locale, title] of [
      ['en, Pillars of Creation', '', /Pillars of Creation/],
      ['de, Pillars (with the show-in-the-sky button)', '/de', /Säulen der Schöpfung/],
      ['de, longest caption (Cartwheel)', '/de', /Cartwheel|Wagenrad/i],
    ] as const) {
      test(`${size.width}x${size.height} ${label}: image, facts, credit and sky button inside the viewport`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        await openViewer(page, locale, title);
        await expectFits(page);
      });
    }

    test(`${size.width}x${size.height}: every image in the set fits (de, next through all)`, async ({
      page,
    }) => {
      test.setTimeout(120_000);
      await page.setViewportSize(size);
      await openViewer(page, '/de', /./);
      const total = await page.locator('.masonry button').count();
      for (let i = 0; i < total; i++) {
        await settleImage(page);
        await expectFits(page);
        await page.keyboard.press('ArrowRight');
      }
    });
  }

  test('facts keep the label above the value', async ({ page }) => {
    await page.setViewportSize(DESKTOP_SIZES[0]);
    await openViewer(page, '', /Pillars of Creation/);
    const pairs = await page.evaluate(() =>
      [...document.querySelectorAll('.lb-facts > div')].map((d) => {
        const t = d.querySelector('dt')!.getBoundingClientRect();
        const v = d.querySelector('dd')!.getBoundingClientRect();
        return { dtBottom: t.bottom, ddTop: v.top };
      }),
    );
    expect(pairs.length).toBeGreaterThan(0);
    for (const p of pairs) expect(p.ddTop).toBeGreaterThanOrEqual(p.dtBottom - 1);
  });

  for (const size of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    test(`${size.width}x${size.height}: the figure scrolls and every element is reachable`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await openViewer(page, '/de', /Säulen der Schöpfung/);
      const fig = page.locator('.lb-figure');
      expect(await fig.evaluate((e) => getComputedStyle(e).overflowY)).toBe('auto');
      for (const sel of ['.lb-facts dd >> nth=-1', '.lb-credit', '.lb-sky']) {
        const el = page.locator(sel);
        await el.scrollIntoViewIfNeeded();
        const r = await el.evaluate((e) => {
          const b = e.getBoundingClientRect();
          return { top: b.top, bottom: b.bottom, inner: window.innerHeight };
        });
        expect(r.top, `${sel} top`).toBeGreaterThanOrEqual(0);
        expect(r.bottom, `${sel} bottom`).toBeLessThanOrEqual(r.inner);
      }
    });
  }

  test('Escape closes and the arrows keep the facts visible', async ({ page }) => {
    await page.setViewportSize(DESKTOP_SIZES[0]);
    await openViewer(page, '', /Pillars of Creation/);
    await page.keyboard.press('ArrowRight');
    await settleImage(page);
    await expectFits(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.lightbox')).toHaveCount(0);
  });

  test('the show-in-the-sky button text is not teal and reads at 4.5:1', async ({ page }) => {
    await page.setViewportSize(DESKTOP_SIZES[0]);
    await openViewer(page, '', /Pillars of Creation/);
    const c = await page.locator('.lb-sky').evaluate((e) => {
      const s = getComputedStyle(e);
      const parse = (v: string) => (v.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
      const lin = (n: number) => {
        const x = n / 255;
        return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
      };
      const lum = (rgb: number[]) =>
        0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
      const fg = parse(s.color);
      // the gradient's two stops: the worse of the two against the text decides
      const stops = (s.backgroundImage.match(/rgb\([^)]*\)/g) ?? []).map(parse);
      const ratio = Math.min(
        ...stops.map((bg) => {
          const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
          return (a + 0.05) / (b + 0.05);
        }),
      );
      return { fg, ratio };
    });
    expect(c.fg).not.toEqual([6, 35, 31]);
    expect(c.ratio).toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('one page-note footer across the gallery pages (G4, UXD-040)', () => {
  const pages = ['/gallery/deep-sky', '/posters', '/patches', '/sourcing'];

  test('deep-sky, posters, patches and sourcing share the .page-note style', async ({ page }) => {
    const styles: Array<Record<string, string>> = [];
    for (const p of pages) {
      await page.goto(p, { waitUntil: 'networkidle' });
      const note = page.locator('footer.page-note');
      await expect(note).toHaveCount(1);
      styles.push(
        await note.evaluate((e) => {
          const s = getComputedStyle(e);
          const para = getComputedStyle(e.querySelector('p')!);
          const link = e.querySelector('a, strong');
          return {
            fontFamily: para.fontFamily,
            fontSize: para.fontSize,
            color: para.color,
            borderTop: s.borderTopWidth + ' ' + s.borderTopStyle,
            linkColor: link ? getComputedStyle(link).color : '',
          };
        }),
      );
    }
    for (const s of styles.slice(1)) expect(s).toEqual(styles[0]);
    // the muted blue (--color-state #889fe7) and the shell's meta size
    expect(styles[0].linkColor).toBe('rgb(136, 159, 231)');
    expect(styles[0].fontSize).toBe('12px');
  });
});

test.describe('/gallery hub strips keep their text (F4)', () => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1366, height: 768 },
    { width: 390, height: 844 },
  ]) {
    test(`${size.width}x${size.height}: no strip text is cut, and none runs under a thumbnail`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.goto('/gallery', { waitUntil: 'networkidle' });
      await page.locator('.strip-text').first().waitFor();
      const strips = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('.strip')].map((s) => {
          const sr = s.getBoundingClientRect();
          const p = s.querySelector<HTMLElement>('.strip-text p')!;
          const go = s.querySelector<HTMLElement>('.strip-text .go')!.getBoundingClientRect();
          const text = s.querySelector<HTMLElement>('.strip-text')!.getBoundingClientRect();
          const imgLefts = [...s.querySelectorAll('.strip-imgs img')]
            .map((i) => i.getBoundingClientRect())
            .filter((r) => r.right > sr.left && r.left < sr.right)
            .map((r) => r.left);
          return {
            clipped: p.scrollHeight > p.clientHeight + 1,
            goInside: go.bottom <= sr.bottom && go.top >= sr.top,
            textRight: text.right,
            firstImgLeft: imgLefts.length ? Math.min(...imgLefts) : Infinity,
            isBeside: s.classList.contains('strip-beside'),
          };
        }),
      );
      expect(strips).toHaveLength(3);
      for (const s of strips) {
        expect(s.clipped).toBe(false);
        expect(s.goInside).toBe(true);
        // On a phone the art sits behind the text under the scrim by design.
        if (s.isBeside && size.width > 560) expect(s.textRight).toBeLessThanOrEqual(s.firstImgLeft);
      }
    });
  }
});
