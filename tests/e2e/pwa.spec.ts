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
    expect(json.theme_color).toBeTruthy();
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
  test('toggle button toggles data-high-contrast on <html>', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: /high-contrast/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');

    // First click — high-contrast on
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const htmlAttr = await page.evaluate(() => document.documentElement.dataset.highContrast);
    expect(htmlAttr).toBe('true');

    // Second click — back off
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const htmlAttr2 = await page.evaluate(() => document.documentElement.dataset.highContrast);
    expect(htmlAttr2).toBeUndefined();
  });
});
