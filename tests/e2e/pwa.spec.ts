import { test, expect } from '@playwright/test';

/**
 * v0.1.12 / ADR-029 — service worker + manifest + manual high-
 * contrast toggle. The install-prompt deferral logic (visit-counter
 * ≥ 3) is hard to e2e because beforeinstallprompt is browser-driven
 * — covered by manual smoke + the runtime logic in +layout.svelte.
 */

test.describe('PWA — manifest + service worker (v0.1.12)', () => {
  test('manifest.webmanifest is served and parseable', async ({ page }) => {
    const response = await page.goto('/manifest.webmanifest');
    expect(response?.status()).toBe(200);
    const body = await response?.text();
    expect(body).toBeTruthy();
    const json = JSON.parse(body!);
    expect(json.name).toMatch(/Orrery/);
    expect(json.display).toBe('standalone');
    expect(json.theme_color).toMatch(/^#[0-9a-fA-F]{3,8}$/);
  });

  test('service worker file is served', async ({ page }) => {
    const response = await page.goto('/sw.js');
    expect(response?.status()).toBe(200);
    const body = await response?.text();
    // Workbox-generated SW; should reference the precache manifest.
    expect(body).toMatch(/precache|workbox/i);
  });

  test('manifest link element is present in HTML head', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('link[rel="manifest"]');
    await expect(link).toHaveAttribute('href', /manifest\.webmanifest$/);
  });
});

test.describe('High-contrast toggle (v0.1.12 / Theme C.C2)', () => {
  test('toggle switch toggles data-high-contrast on <html>', async ({ page }) => {
    await page.goto('/');
    // The control is a More-menu row (UXD-016): a menuitemcheckbox in the bar menu, or an
    // aria-pressed button in the hamburger drawer on phones (≤ 600 px, where the bar has no
    // More button).
    const phone = (page.viewportSize()?.width ?? 0) <= 600;
    if (phone) await page.locator('button.menu-toggle').click();
    else await page.locator('button.nav-more-trigger').click();
    const toggle = phone
      ? page.getByRole('button', { name: /high-contrast/i })
      : page.getByRole('menuitemcheckbox', { name: /high-contrast/i });
    const state = phone ? 'aria-pressed' : 'aria-checked';
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute(state, 'false');

    // First click — high-contrast on
    await toggle.click();
    await expect(toggle).toHaveAttribute(state, 'true');
    const htmlAttr = await page.evaluate(() => document.documentElement.dataset.highContrast);
    expect(htmlAttr).toBe('true');

    // Second click — back off (the menu and the drawer stay open on a switch row)
    await toggle.click();
    await expect(toggle).toHaveAttribute(state, 'false');
    const htmlAttr2 = await page.evaluate(() => document.documentElement.dataset.highContrast);
    expect(htmlAttr2).toBeUndefined();
  });
});
