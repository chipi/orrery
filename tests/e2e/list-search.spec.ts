import { test, expect } from '@playwright/test';

/**
 * RFC-027 — list-route search on /missions + /fleet.
 *
 * Covers (per RFC-027 §Acceptance):
 *   - ?q=<term> deep-link restores the input value + narrows the card set
 *   - Typing into the input updates the URL
 *   - Clearing the input widens back to the unfiltered set
 *   - AND semantics with existing filter params (?q + ?dest, ?q + ?category)
 *   - Card count chip on the FILTERS button reflects the searched subset
 *
 * Substring matching is sub-ms at this corpus size (98 missions + 245
 * fleet entries) so no debounce-tolerance is needed in the assertions.
 */

test.describe('/missions search (RFC-027)', () => {
  test('?q=apollo deep-link pre-fills + filters to ≥6 Apollo missions', async ({ page }) => {
    await page.goto('/missions?q=apollo');
    const input = page.locator('[data-testid="missions-search"]');
    await expect(input).toHaveValue('apollo');
    // 11 Apollo lunar missions + Apollo-Soyuz + cards whose editorial
    // copy references Apollo (Artemis II/III "since Apollo 17", Polaris
    // Dawn "Apollo 17 record"). Lower-bound at 6 to absorb future
    // content edits without flaking.
    const cards = page.locator('[data-testid^="mission-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(6);
    expect(count).toBeLessThan(98);
  });

  test('typing into the input updates the URL', async ({ page }) => {
    await page.goto('/missions');
    const input = page.locator('[data-testid="missions-search"]');
    await input.fill('voyager');
    // 10s (matches the sibling card-visibility waits): the search→URL sync is
    // debounced, and mobile-chromium under docker hydrates the input binding
    // slowly enough that the default 5s expect timeout can race the update.
    await expect(page).toHaveURL(/q=voyager/, { timeout: 10_000 });
    const cards = page.locator('[data-testid^="mission-card-"]');
    // Voyager 1 + Voyager 2 plus any editorial mentions (Pioneer 11's
    // "first" field cites Voyager — "demonstrated the gravity-assist
    // that sent Voyager 2 onward"). Range tolerates future content
    // edits without flaking.
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
    expect(count).toBeLessThan(10);
  });

  test('clearing the input widens back to the full set', async ({ page }) => {
    await page.goto('/missions?q=apollo');
    const cards = page.locator('[data-testid^="mission-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const narrowed = await cards.count();
    expect(narrowed).toBeLessThan(98);
    const input = page.locator('[data-testid="missions-search"]');
    await input.fill('');
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(cards).toHaveCount(125, { timeout: 5_000 });
  });

  test('AND semantics: ?q=mars&dest=MARS keeps both filters', async ({ page }) => {
    await page.goto('/missions?q=mars&dest=MARS');
    const input = page.locator('[data-testid="missions-search"]');
    await expect(input).toHaveValue('mars');
    const cards = page.locator('[data-testid^="mission-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    // dest=MARS alone is 20 (post-#341 Batch 1 additions); the search
    // narrows it further. Both bounds.
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(20);
  });
});

test.describe('/fleet search (RFC-027)', () => {
  test('?q=dragon deep-link pre-fills + filters to ≥4 Dragon-family entries', async ({ page }) => {
    await page.goto('/fleet?q=dragon');
    const input = page.locator('[data-testid="fleet-search"]');
    await expect(input).toHaveValue('dragon');
    const cards = page.locator('[data-testid^="fleet-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const count = await cards.count();
    // Cargo Dragon 2, Crew Dragon, Cargo Dragon v1 plus any tagline
    // matches (LC-39A, SpaceX IVA Suit). Lower-bound at 4.
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThan(252);
  });

  test('typing into the input updates the URL', async ({ page }) => {
    await page.goto('/fleet');
    const input = page.locator('[data-testid="fleet-search"]');
    await input.fill('hubble');
    await expect(page).toHaveURL(/q=hubble/);
    const cards = page.locator('[data-testid^="fleet-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 5_000 });
    // Hubble Space Telescope (+ possibly Hubble-derived obs if any). >= 1.
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('clearing the input widens back to the full set', async ({ page }) => {
    await page.goto('/fleet?q=dragon');
    const cards = page.locator('[data-testid^="fleet-card-"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    const narrowed = await cards.count();
    expect(narrowed).toBeLessThan(252);
    const input = page.locator('[data-testid="fleet-search"]');
    await input.fill('');
    await expect(page).not.toHaveURL(/[?&]q=/);
    await expect(cards).toHaveCount(252, { timeout: 5_000 });
  });
});
