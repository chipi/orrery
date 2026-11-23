import type { Page } from '@playwright/test';

/**
 * On a phone /plan's panel is a bottom sheet (operator 2026-11-23): closed, it shows the picked
 * window, the budget bar and FLY MISSION; the rest (vehicle picker, pin, primer) needs it open,
 * and open it covers the chart. Sets it open or closed from its handle; a no-op on desktop, where
 * the handle is hidden.
 */
export async function setPlanSheet(page: Page, open: boolean): Promise<void> {
  const handle = page.getByTestId('plan-sheet-handle');
  if (!(await handle.isVisible().catch(() => false))) return;
  if (((await handle.getAttribute('aria-expanded')) === 'true') === open) return;
  await handle.click();
}

export const openPlanSheet = (page: Page): Promise<void> => setPlanSheet(page, true);
