import type { Locator } from '@playwright/test';

/**
 * Click a button by dispatching `HTMLElement.click()` directly via
 * `page.evaluate`, bypassing Playwright's mouse-event pipeline.
 *
 * When to reach for this:
 *  - The target sits in a shared HUD slot with another control that
 *    can cover it in z-order (e.g. /mars surface scene where
 *    BACK TO PLANET overlaps RESET VIEW, the panorama-mobile
 *    sr-only annotation buttons covered by `.agency-row`, or
 *    `exit-panorama` covered by the detail-panel chrome at mobile
 *    widths).
 *  - The target is a sr-only / visually-hidden element where
 *    Playwright's actionability checks (visible + stable) fail even
 *    though the handler will run fine.
 *  - The target sits behind a transparent overlay that intercepts
 *    pointer events but doesn't take focus.
 *
 * Trade-off: the click skips the mouse-down → mouse-up → click event
 * sequence, so handlers that depend on pointer/mouse events (e.g. drag
 * detection) won't see the click. Don't use this for testing canvas
 * picking, drag-to-orbit, or pinch-zoom.
 *
 * Reach for `.click({ force: true })` first — that bypasses
 * actionability checks while preserving the real mouse-event sequence.
 * Reach for `clickViaEvaluate` when force-click still hits the wrong
 * element due to z-order.
 */
export async function clickViaEvaluate(locator: Locator): Promise<void> {
  await locator.evaluate((el: HTMLElement) => el.click());
}
