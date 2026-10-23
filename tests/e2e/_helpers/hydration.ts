import type { Page } from '@playwright/test';

/**
 * Wait until the app has hydrated (`<html data-hydrated>`, set in the root
 * layout's onMount, which runs after every child component mounts).
 *
 * Pages are server-rendered, so their buttons are visible before Svelte wires
 * their handlers; a click in that window is dropped. On /explore that window
 * is 1-2 s on a busy machine (measured 2026-10-23: a speed-pill click right
 * after `load` did nothing, the same click 2 s later worked).
 */
export async function waitForHydration(page: Page): Promise<void> {
  await page.waitForSelector('html[data-hydrated]', { state: 'attached', timeout: 30_000 });
}
