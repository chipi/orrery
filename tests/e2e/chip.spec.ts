import { expect, test, type Page } from '@playwright/test';
import { waitForHydration } from './_helpers/hydration';

/**
 * UX slice A4 (UXD-014): one chip and one filter. Every toggle, filter, choice and HUD action is
 * a <Chip> (src/lib/styles/chip.css): 30 px on a fine pointer, 44 px on a coarse one, 4 px
 * corners, 11 px text, outline at rest, one active look (soft accent fill + accent edge + white
 * text; the world tint on /moon /mars /venus), the 24 px minimum hit area for the small controls
 * that are not chips (.ui-hit).
 *
 * Runs on desktop-chromium (fine pointer), mobile-chromium and mobile-landscape-chromium (coarse).
 *
 * Written without a browser run (the slice author had none): the sweep's allow-lists
 * (SWEEP_ALLOW_SELF, SWEEP_ALLOW_INSIDE) are the one thing most likely to need a line added
 * when a route shows a legitimate non-chip
 * control; every other assertion is a number from chip.css.
 */

type Route = { path: string; open?: 'filters' };

const ROUTES: Route[] = [
  { path: '/explore' },
  { path: '/explore?id=mars' },
  { path: '/earth' },
  { path: '/moon' },
  { path: '/mars' },
  { path: '/venus' },
  { path: '/moon?site=apollo11' },
  { path: '/mars?site=perseverance' },
  { path: '/earth?site=lc-39a' },
  { path: '/missions', open: 'filters' },
  { path: '/fleet', open: 'filters' },
  { path: '/missions/launches', open: 'filters' },
  { path: '/gallery/deep-sky' },
  { path: '/programs' },
  { path: '/iss' },
  { path: '/tiangong' },
  { path: '/colophon' },
  { path: '/fly' },
  { path: '/plan' },
];

async function settle(page: Page, route: Route): Promise<void> {
  await page.goto(route.path);
  await waitForHydration(page);
  await page.waitForTimeout(500);
  if (route.open === 'filters') {
    const strip = page.locator('.filters-strip').first();
    if ((await strip.getAttribute('aria-expanded')) !== 'true') await strip.click();
  }
}

const isFinePointer = (page: Page) =>
  page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);

/** Visible chips with the numbers the sweep checks. */
async function readChips(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.ui-chip')]
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
      })
      .map((el) => {
        const cs = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        return {
          name: `${el.tagName.toLowerCase()}[${el.getAttribute('data-testid') ?? el.textContent?.trim().slice(0, 24)}]`,
          fontSize: parseFloat(cs.fontSize),
          minBlock: cs.minBlockSize,
          box: Math.min(r.width, r.height),
          radius: cs.borderTopLeftRadius,
          on:
            el.getAttribute('aria-pressed') === 'true' ||
            el.getAttribute('aria-checked') === 'true' ||
            el.classList.contains('is-on'),
          border: cs.borderTopColor,
          color: cs.color,
        };
      }),
  );
}

for (const route of ROUTES) {
  test(`chips on ${route.path}: size, corners, text`, async ({ page }) => {
    await settle(page, route);
    const fine = await isFinePointer(page);
    const chips = await readChips(page);
    for (const chip of chips) {
      expect(chip.fontSize, `${chip.name} font-size`).toBeGreaterThanOrEqual(11);
      expect(chip.radius, `${chip.name} radius`).toBe('4px');
      expect(chip.minBlock, `${chip.name} min size`).toBe(fine ? '30px' : '44px');
      expect(chip.box, `${chip.name} smaller side`).toBeGreaterThanOrEqual(fine ? 29 : 43);
    }
  });
}

test.describe('active look', () => {
  // Accent #5070ff everywhere except the Worlds, which carry their world colour in --chip-tint.
  const ACCENT = 'rgb(80, 112, 255)';
  const BLUE_PAGES = ['/explore', '/missions', '/fleet', '/gallery/deep-sky', '/programs', '/plan'];

  for (const path of BLUE_PAGES) {
    test(`the on chip is accent blue with white text on ${path}`, async ({ page }) => {
      await settle(page, {
        path,
        open: ['/missions', '/fleet'].includes(path) ? 'filters' : undefined,
      });
      const on = (await readChips(page)).filter((c) => c.on);
      expect(on.length, 'at least one chip is on').toBeGreaterThan(0);
      for (const chip of on) {
        // A data tone (fleet status, epoch band, nation) replaces the accent on its own chip.
        if (!chip.border.startsWith('rgb(80, 112, 255')) continue;
        expect(chip.border, `${chip.name} edge`).toBe(ACCENT);
        expect(chip.color, `${chip.name} text`).toBe('rgb(255, 255, 255)');
      }
    });
  }

  test('the on chip carries the world tint on /mars and the accent on /earth', async ({ page }) => {
    await settle(page, { path: '/mars' });
    const marsTint = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.surface-scene')!)
        .getPropertyValue('--chip-tint')
        .trim(),
    );
    expect(marsTint).not.toBe('');
    // On a phone the layer chips live in the bottom drawer's LAYERS tab.
    if (!(await isFinePointer(page))) {
      await page.locator('.mdg-tab', { hasText: /layers/i }).click();
      await expect(page.locator('.mdg-body')).toBeVisible();
    }
    const marsOn = (await readChips(page)).filter((c) => c.on);
    expect(marsOn.length).toBeGreaterThan(0);
    for (const chip of marsOn) expect(chip.border, `${chip.name} edge`).not.toBe(ACCENT);

    await settle(page, { path: '/earth' });
    const earthTint = await page.evaluate(() =>
      getComputedStyle(document.querySelector('.surface-scene')!)
        .getPropertyValue('--chip-tint')
        .trim(),
    );
    expect(earthTint, 'Earth sets no tint').toBe('');
  });
});

test('focus-visible draws a 2 px outline in the focus colour', async ({ page }) => {
  await settle(page, { path: '/missions' });
  const strip = page.locator('.filters-strip').first();
  await strip.focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  const outline = await strip.evaluate((el) => {
    const cs = getComputedStyle(el);
    return { width: cs.outlineWidth, style: cs.outlineStyle };
  });
  expect(outline).toEqual({ width: '2px', style: 'solid' });
});

test.describe('FILTERS strip (MI1, FL1)', () => {
  for (const path of ['/missions', '/fleet', '/missions/launches']) {
    test(`the count sits right after the label on ${path}`, async ({ page }) => {
      await settle(page, { path });
      const gap = await page.evaluate(() => {
        const strip = document.querySelector<HTMLElement>('.filters-strip')!;
        const count = strip.querySelector<HTMLElement>('.filters-count')!;
        const text = [...strip.childNodes].find(
          (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim(),
        );
        const range = document.createRange();
        range.selectNodeContents(text!);
        const labelRight = range.getBoundingClientRect().right;
        const rtl = getComputedStyle(strip).direction === 'rtl';
        const countRect = count.getBoundingClientRect();
        const stripRect = strip.getBoundingClientRect();
        return {
          distance: rtl
            ? range.getBoundingClientRect().left - countRect.right
            : countRect.left - labelRight,
          stripWidth: stripRect.width,
          viewport: innerWidth,
        };
      });
      expect(gap.distance).toBeGreaterThanOrEqual(0);
      expect(gap.distance, 'count within 24 px of the FILTERS label').toBeLessThanOrEqual(24);
      expect(gap.stripWidth, 'the strip is compact, not a full-width bar').toBeLessThan(
        gap.viewport * 0.6,
      );
    });
  }

  test('launches shows the same FILTERS word as missions and fleet (one key)', async ({ page }) => {
    await settle(page, { path: '/missions' });
    const missions = (await page.locator('.filters-strip').first().innerText()).split(/\s/)[0];
    await settle(page, { path: '/missions/launches' });
    const launches = (await page.locator('.filters-strip').first().innerText()).split(/\s/)[0];
    expect(launches).toBe(missions);
  });
});

test.describe('keyboard: radiogroup arrows', () => {
  test('arrows move and select inside the programs group-by, Tab leaves the group', async ({
    page,
  }) => {
    await settle(page, { path: '/programs' });
    const group = page.getByRole('radiogroup');
    const first = group.getByRole('radio').first();
    await first.focus();
    await expect(first).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowRight');
    const second = group.getByRole('radio').nth(1);
    await expect(second).toBeFocused();
    await expect(second).toHaveAttribute('aria-checked', 'true');
    await expect(first).toHaveAttribute('aria-checked', 'false');
    await page.keyboard.press('End');
    await expect(group.getByRole('radio').last()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(group.getByRole('radio').last()).not.toBeFocused();
  });

  test('deep-sky filters are radios, not tabs', async ({ page }) => {
    await settle(page, { path: '/gallery/deep-sky' });
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.getByRole('radiogroup').getByRole('radio').first()).toBeVisible();
  });
});

test.describe('Reset view (E8) and Watch live (ISS1)', () => {
  test('Watch live on /iss is a chip with the live dot, 44 px on touch', async ({ page }) => {
    await settle(page, { path: '/iss' });
    const live = page.getByTestId('iss-watch-live');
    if (await live.isVisible()) {
      await expect(live).toHaveClass(/ui-chip/);
      await expect(live.locator('.ui-chip__dot')).toBeVisible();
      const fine = await isFinePointer(page);
      const box = await live.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(fine ? 29 : 43);
    } else {
      // Touch: the HUD column is hidden; the live link lives with the desktop HUD only.
      expect(await isFinePointer(page)).toBe(false);
    }
  });

  test('Reset view on /iss and /tiangong is a chip', async ({ page }) => {
    for (const id of ['iss', 'tiangong']) {
      await settle(page, { path: `/${id}` });
      const fine = await isFinePointer(page);
      const reset = page.getByTestId(fine ? `${id}-reset-camera` : `${id}-reset-camera-mobile`);
      await expect(reset).toBeVisible();
      await expect(reset).toHaveClass(/ui-chip/);
    }
  });

  test('the Explore level reset is a text chip — RESET VIEW, no icon — on every viewport', async ({
    page,
  }) => {
    await settle(page, { path: '/explore?goto=antares' });
    const reset = page.getByTestId('explore-scale-reset');
    await expect(reset).toBeVisible({ timeout: 20_000 });
    await expect(reset).toHaveClass(/ui-chip/);
    await expect(reset).toHaveText(/\S{3,}/);
    await expect(reset.locator('.ui-chip__icon')).toHaveCount(0);
  });
});

test.describe('hit areas of controls that are not chips (O3)', () => {
  test('the small controls reach 24 px', async ({ page }) => {
    await settle(page, { path: '/missions/launches' });
    const small = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.ui-hit')]
        .filter((el) => el.getBoundingClientRect().width > 0)
        .slice(0, 5)
        .map((el) => {
          const after = getComputedStyle(el, '::after');
          return { w: parseFloat(after.width), h: parseFloat(after.height) };
        }),
    );
    for (const s of small) {
      expect(s.w).toBeGreaterThanOrEqual(24);
      expect(s.h).toBeGreaterThanOrEqual(24);
    }
  });
});

// Anything on screen that behaves like a toggle, filter, choice or HUD action is a chip. This is
// the runtime version of the class-name check (scripts cannot see a control that was renamed).
// The allow-list names the class of each control the brief (§6) leaves alone; it never exempts a
// whole container (no `aside`, `.panel`, `[class*="-row"]`). A control that is neither a chip nor
// named here is a finding, not a line to add.
const SWEEP_ALLOW_SELF = [
  '.ui-chip',
  '[data-a4-keep]',
  // Tabs: PanelTabRow, MobileDrawerGroup, the /fly bottom tabs, the debug panel
  '[role="tab"]',
  '.mdg-tab',
  '.fly-mtab',
  '.debug-tab',
  // Switches (SensorySheet): form controls, not chips
  '[role="switch"]',
  // Nav (A6, UXD-016): the toggles, the More trigger and its menu rows, the group triggers, the drawer;
  // .debug-toggle is DebugPanel's own switch label now (the nav debug button moved into More)
  '.menu-toggle',
  '.audio-toggle',
  '.lens-toggle',
  '.settings-toggle',
  '.debug-toggle',
  '.nav-more-trigger',
  '.nav-more-item',
  '.nav-more-backdrop',
  '.group-trigger',
  '.group-backdrop',
  '.drawer-link',
  '.drawer-search',
  '.drawer-backdrop',
  '.footer-more-btn',
  // Panel and pull-tab furniture: backdrops, drawer handles (the panel's close, back and Share are chips)
  '.panel-backdrop',
  '.mdg-dim',
  '.mcd-handle',
  '.mcd-dim',
  '.sizes-backdrop',
  // REFERENCES legend: a planet's cell (swatch, name, diameter) is the whole target, like a list row
  '.sizes-cell',
  '.recovery-close',
  '.caption-reopen',
  '.debug-close',
  '.sensory-backdrop',
  '.cmdk-scrim',
  '.vp-backdrop',
  '.vp-btn',
  '.lightbox',
  '.lightbox-nav',
  '.lightbox-thumb',
  '.lightbox-zoom button',
  '.lb-backdrop',
  '.lb-nav',
  '.collapse-btn',
  // TierContextCard collapse caret (panel furniture, like .collapse-btn)
  '.tcc-toggle',
  // A site's "what you are seeing" list: rows of name + explanation, like the module rows
  '.annotation-row',
  '.exhibit-exit-corner',
  // Audio overlay (a dialog player): its own transport and resume buttons
  '.header-btn',
  '.resume-btn',
  '.compact-btn',
  '.tour-btn',
  '.tour-start',
  '.play-pause',
  '.link-btn',
  '.wave-tile',
  // The illustrated site map in a site panel: an image that opens the lightbox (like a gallery thumb)
  '.site-illustration .open',
  // Cards, list and index rows, thumbnails: the whole row or picture is the target
  'button.card',
  '.list-row',
  '.module-row',
  '.journey-row',
  '.si-row',
  '.sidx-row',
  '.cmdk-row',
  '.episode-row',
  '.tile > button',
  '.thumb',
  '.gallery-thumb',
  '.badge-thumb',
  '.thumb-open',
  '.panel-hero-btn',
  // CTAs and links drawn as buttons
  '.cta',
  '.spec-cta',
  '.cta-tour',
  '.anatomy-open',
  '.blueprint-open',
  '.enter-system',
  '.mission-link',
  '.resident-link',
  '.regime-chip',
  '.xref-link',
  // Small controls with the 24 px hit area (WhyPopover trigger, provenance, inline names); its close is a chip
  '.ui-hit',
  // StationAssemblyControl: the module name in the "launched on" caption is a text button
  '[data-testid="assembly-chip-name"]',
  // Timelines: epoch band (desktop), station markers, milestone and flight-director ticks,
  // phase-marker dots, the range slider handles and mission dots
  '.band',
  '.marker',
  '.milestone-tick-button',
  '.fd-stage-tick-button',
  '.dot-btn',
  '.handle',
  '.dot',
  // /fly scene CTAs (opening overlay, skip, mini HUD, perf toast)
  '.opening-launch',
  '.opening-descent',
  '.opening-skip',
  '.opening-fleet-chip',
  '.continue',
  '.fly-mini-hud',
  '.perf-toast-apply',
  '.perf-toast-dismiss',
  // Worlds canvas labels and the flat-patch HUD (revisit with the Worlds panel slices)
  '.ring',
  '.pop-photo',
  '.flat-patch .hud-back',
  '.flat-patch .hud-layers .chip',
  // Plan: the primary Fly CTA
  'button.fly',
];

// Containers that are not chips by definition: canvas / screen-reader proxies, the locale
// picker (Nav / A6) and the language suggestion toast.
const SWEEP_ALLOW_INSIDE = [
  '.tour-anchors',
  '.sr-module-list',
  '.po-sr-btn',
  '.tour-reset-anchor',
  '.locale-picker',
  '.lang-suggest',
  '[data-a4-keep]',
];

test.describe('sweep: every visible control is a chip or on the allow-list', () => {
  for (const route of ROUTES) {
    test(`no stray chip-like controls on ${route.path}`, async ({ page }) => {
      await settle(page, route);
      const stray = await page.evaluate(
        ({ self, inside }) => {
          const sel = 'button, [role="button"], [role="radio"], [aria-pressed]';
          // Visually hidden: display / visibility, or clipped to 1 px by the element or by an
          // ancestor with overflow (canvas proxies, sr-only lists).
          const hidden = (el: HTMLElement): boolean => {
            for (let n: HTMLElement | null = el; n && n !== document.body; n = n.parentElement) {
              const cs = getComputedStyle(n);
              if (cs.display === 'none' || cs.visibility === 'hidden') return true;
              if (cs.clip === 'rect(0px, 0px, 0px, 0px)' || cs.clipPath.startsWith('inset(50%'))
                return true;
              const r = n.getBoundingClientRect();
              if (cs.overflow !== 'visible' && r.width <= 2 && r.height <= 2) return true;
            }
            return false;
          };
          const out: string[] = [];
          for (const el of document.querySelectorAll<HTMLElement>(sel)) {
            if (self.some((a) => el.matches(a))) continue;
            if (inside.some((a) => el.closest(a))) continue;
            const r = el.getBoundingClientRect();
            if (r.width < 2 || r.height < 2 || hidden(el)) continue;
            out.push(
              `${el.tagName.toLowerCase()}.${el.className} "${(el.textContent ?? '').trim().slice(0, 30)}"`,
            );
          }
          return out;
        },
        { self: SWEEP_ALLOW_SELF, inside: SWEEP_ALLOW_INSIDE },
      );
      expect(stray, 'visible controls that are neither .ui-chip nor allow-listed').toEqual([]);
    });
  }
});

// A4 renamed the controls these two features find by class; both broke silently.
test.describe('features that find chips by class', () => {
  test('exhibit mode still hides the INDEX tab and the REFERENCES chip on /explore', async ({
    page,
  }) => {
    await page.goto('/explore?mode=exhibit');
    await waitForHydration(page);
    await expect(page.locator('body.exhibit-mode')).toHaveCount(1);
    for (const sel of ['.scale-index-handle', '.scales-dock', '[data-testid="sizes-toggle"]']) {
      for (const el of await page.locator(sel).all()) await expect(el).toBeHidden();
    }
  });

  test('the orbit ruler never sits on top of the locate chip on /earth', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/earth');
    await waitForHydration(page);
    const locate = page.getByTestId('earth-locate-me');
    await expect(locate).toBeVisible();
    await page.waitForTimeout(1500);
    const overlap = await page.evaluate(() => {
      const a = document.querySelector('[data-testid="earth-locate-me"]')?.getBoundingClientRect();
      const ruler = [...document.querySelectorAll('.ruler')]
        .map((el) => el.getBoundingClientRect())
        .find((r) => r.width && r.height);
      if (!a || !ruler) return null;
      return !(
        a.right <= ruler.left ||
        ruler.right <= a.left ||
        a.bottom <= ruler.top ||
        ruler.bottom <= a.top
      );
    });
    expect(overlap, 'locate chip and ruler boxes intersect').not.toBe(true);
  });
});
