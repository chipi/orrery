import { expect, type Locator } from '@playwright/test';

/** The ↗ page links are a 30 px target on a fine pointer, 44 px on a coarse one (A4). */
export async function expectLinkTargets(links: Locator) {
  const fine = await links
    .page()
    .evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
  const sizes = await links.evaluateAll((els) =>
    els.slice(0, 5).map((e) => [e.getBoundingClientRect().width, e.getBoundingClientRect().height]),
  );
  expect(sizes.length).toBeGreaterThan(0);
  for (const [w, h] of sizes) {
    expect(w).toBeGreaterThanOrEqual(fine ? 29 : 43);
    if (!fine) expect(h).toBeGreaterThanOrEqual(43);
  }
}

/** An opened INDEX is one roving Tab stop, not one per row. */
export async function expectOneTabStop(items: Locator) {
  await expect
    .poll(() =>
      items.evaluateAll((els) => els.filter((e) => (e as HTMLElement).tabIndex === 0).length),
    )
    .toBe(1);
}
