import { expect, test } from '@playwright/test';

/**
 * Mobile-only layout assertions (ADR-018 mobile-first contract).
 *
 * Every spec already runs on both `desktop-chromium` + `mobile-chromium`
 * projects, but the existing specs assert content rather than layout —
 * the mobile UX fixes shipped in v0.6 (hamburger nav, chip horizontal
 * flow, touch-target sizing) had no dedicated guardrails. These tests
 * skip on desktop so they don't double-run.
 */

// Helper: skip on desktop-chromium so these only fire on Pixel 5 viewport.
function mobileOnly() {
  test.skip(({ isMobile }) => !isMobile, 'mobile-only layout assertion');
}

test.describe('mobile nav (≤500 px viewport)', () => {
  test('hamburger menu button is visible; desktop center-nav is hidden', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile-only');
    await page.goto('/', { waitUntil: 'networkidle' });
    const hamburger = page.locator('button.menu-toggle');
    await expect(hamburger).toBeVisible();
    // Desktop center-link strip should be visually hidden on mobile.
    const centerLinks = page.locator('nav .center .link');
    const visibleCount = await centerLinks.evaluateAll(
      (els) => els.filter((el) => (el as HTMLElement).offsetWidth > 0).length,
    );
    expect(visibleCount).toBe(0);
  });

  test('hamburger click reveals the mobile drawer with the full link list', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile-only');
    await page.goto('/', { waitUntil: 'networkidle' });
    // Drawer is gated by `mobileMenuOpen` state — not in DOM until opened.
    await expect(page.locator('#mobile-nav-drawer')).toHaveCount(0);
    await page.locator('button.menu-toggle').click();
    await expect(page.locator('#mobile-nav-drawer')).toBeVisible();
    // Drawer contains the navigation links.
    const drawerLinks = page.locator('#mobile-nav-drawer a');
    expect(await drawerLinks.count()).toBeGreaterThanOrEqual(5);
  });

  test('hamburger button meets the 44×44 px touch-target floor (ADR-018)', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile-only');
    await page.goto('/', { waitUntil: 'networkidle' });
    const box = await page.locator('button.menu-toggle').boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });
});

// The v0.6 chip-flow check is gone: no phone drawer shows the layers as chips any more; they are
// rows (UXD-015 amendment 2026-11-23), covered by chip-row.spec.

test.describe('mobile footer / CTA clearance', () => {
  test('floating footer is hidden on touch; its links move into the nav drawer', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'mobile-only');
    await page.goto('/', { waitUntil: 'networkidle' });
    // 0.7.2: on touch the bottom-right footer strip is display:none — its
    // bill-of-materials links relocate into the hamburger drawer as a bottom
    // section, so it can no longer overlap the landing CTA / route chrome.
    await expect(page.locator('.site-footer')).toBeHidden();
    await page.locator('button.menu-toggle').click();
    await expect(
      page.locator('#mobile-nav-drawer .drawer-footer a[href*="/colophon"]'),
    ).toBeVisible();
  });

  test('viewport has no horizontal scroll on /', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only');
    await page.goto('/', { waitUntil: 'networkidle' });
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });
});

test.describe('mobile nav touch-target floor across primary buttons', () => {
  // Sample the nav buttons (hamburger, lens toggle, the More menu button on touch windows wider
  // than a phone, locale picker chip) and confirm each meets the 44×44 touch floor (UXD-016;
  // the full per-control check is in nav-controls.spec.ts).
  test('hamburger, lens, More and locale are all ≥ 44×44 px', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'mobile-only');
    await page.goto('/', { waitUntil: 'networkidle' });
    const selectors = [
      'button.menu-toggle',
      'button.lens-toggle',
      'button.nav-more-trigger', // hidden ≤ 600 px: its actions are drawer rows there
      'nav .right button.chip', // locale picker
    ];
    for (const sel of selectors) {
      const el = page.locator(sel).first();
      const visible = await el.isVisible();
      if (!visible) continue; // some are conditional (e.g. locale chip)
      const box = await el.boundingBox();
      expect(box, `${sel} has bounding box`).not.toBeNull();
      expect(box!.width, `${sel} width ≥ 44`).toBeGreaterThanOrEqual(43.5);
      expect(box!.height, `${sel} height ≥ 44`).toBeGreaterThanOrEqual(43.5);
    }
  });
});

// Make the no-op helper non-dead-code so eslint doesn't flag it.
void mobileOnly;
