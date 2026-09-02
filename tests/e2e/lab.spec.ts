import { expect, test } from '@playwright/test';
import { isExpectedNoise } from './_helpers/console-errors';
import { clickNavLink } from './_helpers/nav';

/**
 * /lab — Physics Lab (v0.9 flagship, S3e). Covers the M1 "launch a rocket" ladder
 * end to end: render + the register golden-master (the honesty line's fidelity
 * classes must be in the rendered figure DOM — plan M7), live playability, the Δv→
 * verdict wire, and the share/focus URL modes. Runs on desktop + mobile chromium.
 */
test.describe('/lab — Physics Lab', () => {
  test('renders the M1 ladder with the equation, figures, and the honesty line', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isExpectedNoise(msg)) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/lab', { waitUntil: 'networkidle' });

    // The goal ladder rendered: 8 rungs of the launch-a-rocket goal.
    await expect(page.locator('.nb__goal-title')).toBeVisible();
    const cards = page.locator('.card');
    await expect(cards).toHaveCount(8);

    // KaTeX equation is server-prerendered into the card (ADR-034, no runtime katex).
    await expect(page.locator('.card__equation .katex').first()).toBeVisible();

    // Register golden-master: the honesty line + the computed-fidelity class are in the
    // rendered figure DOM. The M1 figures are all `computed` → the `fidelity-computed`
    // register class, solid teal stroke. (SVG geometry elements have no box, so assert
    // attachment, not visibility.)
    const computed = page.locator('.fidelity-computed');
    await expect(computed.first()).toBeAttached();
    expect(await computed.count()).toBeGreaterThan(0);
    // computed register = solid stroke (no dasharray); teal token.
    await expect(computed.first()).toHaveAttribute('stroke', '#4ecdc4');
    const prov = page.locator('.honesty-prov').first();
    await expect(prov).toBeAttached();
    expect(await prov.textContent()).toMatch(/computed/i);

    expect(errors).toEqual([]);
  });

  test('is playable — editing an input updates the readout, and the Δv wire flows', async ({
    page,
  }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await expect(page.locator('.nb__goal-title')).toBeVisible();

    // The verdict rung (last card) consumes THREE wires → three read-only gold "derived"
    // cells (the rocket's Δv from Tsiolkovsky, the launch-site boost, and the derived
    // Δv-to-orbit target), not sliders.
    const verdict = page.locator('.card').last();
    await expect(verdict.locator('.card__derived')).toHaveCount(3);

    // Editing the first number input recomputes its readout (live).
    const firstNumber = page.locator('.card__number').first();
    const before = await page.locator('.card__readout-value').first().textContent();
    await firstNumber.fill('999');
    await firstNumber.dispatchEvent('input');
    await expect(page.locator('.card__readout-value').first()).not.toHaveText(before ?? '');
  });

  test('Share writes ?nb= and reopening it restores a custom notebook', async ({ page }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.locator('.nb__tool--accent').click();
    await expect(page).toHaveURL(/[?&]nb=/);
    const shared = page.url();

    await page.goto(shared, { waitUntil: 'networkidle' });
    await expect(page.locator('.nb__goal-kicker')).toContainText(/custom|notebook/i);
  });

  test('Focus opens one card full-width (?focus=) and back returns', async ({ page }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page
      .getByRole('button', { name: /focus this cell/i })
      .first()
      .click();
    await expect(page).toHaveURL(/[?&]focus=/);
    await expect(page.locator('.nb__back')).toBeVisible();
    await expect(page.locator('.card')).toHaveCount(1);
    await page.locator('.nb__back').click();
    await expect(page.locator('.card')).toHaveCount(8);
  });

  test('fail-honest: an infeasible input surfaces a reason and blocks the wired verdict', async ({
    page,
  }) => {
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await expect(page.locator('.nb__goal-title')).toBeVisible();

    // Tsiolkovsky (card 5, index 4) fails when dry mass ≥ wet mass. Its 3rd number
    // input is mf; push it above m0 (default 12) → mass ratio < 1 → fail-honest.
    const tsio = page.locator('.card').nth(4);
    const mf = tsio.locator('.card__number').nth(2);
    await mf.fill('20');
    await mf.dispatchEvent('input');

    // The formula refuses to lie: a mars-red reason (role="alert"), not a fake Δv.
    await expect(tsio.locator('.card__readout-fail')).toBeVisible();

    // And the honesty line propagates: the wired verdict is upstream-failed, never a
    // green verdict computed off a stale default.
    await expect(page.locator('.card').last().locator('.card__readout-fail')).toBeVisible();
  });
});

test.describe('/lab — nav', () => {
  test('is reachable from the Learn nav group (desktop + mobile)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await clickNavLink(page, '/lab');
    await expect(page).toHaveURL(/\/lab$/);
    await expect(page.locator('.nb__goal-title')).toBeVisible();
  });
});

test.describe('/lab — Canvas (S5 smoke)', () => {
  // Weight lives in the unit suites (graph/promote/codec); e2e stays a thin smoke
  // per the S5 pre-review — drag-wire e2e is flake bait.
  test('view switch renders the graph; palette adds a card; promote round-trips to Notebook', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith('mobile'),
      'canvas is read-only on touch (UXS-015) — the desktop smoke covers interactions',
    );
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /canvas/i }).click();
    await expect(page.locator('.canvas')).toBeVisible();
    // The M1 goal renders as canvas cards with its wires as edges.
    await expect(page.locator('.canvas__card').first()).toBeVisible();
    await expect(page.locator('.canvas__edge').first()).toBeVisible();

    // Palette: add one formula → a new card appears.
    const before = await page.locator('.canvas__card').count();
    await page.locator('.canvas__bar-btn', { hasText: '+' }).click();
    await page.locator('.canvas__palette-item').first().click();
    await expect(page.locator('.canvas__card')).toHaveCount(before + 1);

    // Promote: select the two verdict-side goal cards → confirm shows the derived
    // order → confirming lands back in Notebook view as a custom notebook.
    await page
      .locator('.canvas__select')
      .nth(before - 2)
      .check();
    await page
      .locator('.canvas__select')
      .nth(before - 1)
      .check();
    await page.locator('.canvas__bar > .canvas__bar-btn--primary').click();
    await expect(page.locator('.canvas__confirm')).toBeVisible();
    await expect(page.locator('.canvas__confirm-list li').first()).toBeVisible();
    await page.locator('.canvas__confirm-actions .canvas__bar-btn--primary').click();
    await expect(page.locator('.nb__goal-title')).toBeVisible();

    // Switch back — the shared state owner means the promoted cells render on canvas too.
    await page.getByRole('tab', { name: /canvas/i }).click();
    await expect(page.locator('.canvas__card').first()).toBeVisible();
  });

  test('wire-drag: output socket → compatible input creates an edge (holistic B1 proof)', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name.startsWith('mobile'),
      'wiring is a pointer gesture — desktop only',
    );
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /canvas/i }).click();
    await expect(page.locator('.canvas__card').first()).toBeVisible();

    // Deterministic fixture: add TWO fresh cards near the origin (spawn point) —
    // a source (tsiolkovsky, outputs deltaV [km/s]) and an UNWIRED sink
    // (delta-v-margin, inputs capacityKms [km/s]) — so the commit ADDS an edge
    // instead of replacing one of the goal's existing wires.
    const addVia = async (query: string) => {
      await page.locator('.canvas__bar-btn', { hasText: '+' }).click();
      await page.locator('.canvas__palette-search').fill(query);
      await page.locator('.canvas__palette-item').first().click();
    };
    await addVia('tsiolkovsky');
    await addVia('margin');
    const edgesBefore = await page.locator('.canvas__edge').count();

    // Three-point drag: down on the added source's deltaV output socket → move →
    // up on the sink's surfaced compatible-input socket.
    const outSock = page.locator('.canvas__sock--out[title^="deltaV"]').last();
    const from = await outSock.boundingBox();
    if (!from) throw new Error('no deltaV output socket');
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 100, from.y + 60, { steps: 5 });
    const inSock = page.locator('.canvas__card').last().locator('.canvas__sock--in').first();
    await expect(inSock).toBeVisible();
    const to = await inSock.boundingBox();
    if (!to) throw new Error('no input socket');
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 5 });
    await page.mouse.up();

    // The wire committed: one more edge, and the ghost is gone.
    await expect(page.locator('.canvas__edge')).toHaveCount(edgesBefore + 1);
    await expect(page.locator('.canvas__edge--ghost')).toHaveCount(0);
  });
});
