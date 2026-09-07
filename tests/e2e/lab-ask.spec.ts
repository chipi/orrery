import { expect, test, type Page } from '@playwright/test';

/**
 * /lab ask view (F · #535 · T4). The deployed lab-api is stubbed at the
 * network layer (Playwright intercepts cross-origin before DNS) — the HONEST
 * e2e posture the pre-review chose: real Google/Claude flows are deploy-day
 * acceptance, not fakeable here. What this proves: the ask tab's state
 * machine, the full stubbed PKCE round-trip through the REAL callback route,
 * kernel-card + honesty-caption rendering, and the llm-down state.
 */

const API = 'https://lab-api.orrerylearn.com';

const TOKEN_BODY = JSON.stringify({
  access_token: 'stub-access',
  token_type: 'Bearer',
  expires_in: 3600,
  refresh_token: 'stub-refresh',
  scope: 'physics:ask',
});

/** A real-shaped /ask response: verbatim-FormulaResult-like toolCall + narration. */
const ASK_BODY = JSON.stringify({
  answer: 'The kernel puts the transfer at about 259 days.',
  model: 'orrery-ask',
  requestId: 'e2e-1',
  toolCalls: [
    {
      tool: 'interplanetary-transfer',
      args: {},
      result: {
        values: {
          dv1: { value: 2.95, units: 'km/s' },
          dv2: { value: 2.65, units: 'km/s' },
          total: { value: 5.6, units: 'km/s' },
          tof: { value: 258.9, units: 'day' },
        },
        status: { ok: true },
        assumptions: ['lab.assume.coplanar'],
        localized: {
          title: 'Interplanetary transfer',
          assumptions: ['Coplanar circular orbits'],
        },
      },
    },
  ],
});

async function stubAuthRoutes(page: Page): Promise<void> {
  await page.route(`${API}/authorize**`, (route) => {
    const url = new URL(route.request().url());
    const back = new URL(url.searchParams.get('redirect_uri')!);
    back.searchParams.set('code', 'e2e-code');
    back.searchParams.set('state', url.searchParams.get('state') ?? '');
    back.searchParams.set('iss', API);
    void route.fulfill({ status: 302, headers: { location: back.toString() } });
  });
  await page.route(`${API}/token`, (route) => {
    void route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: TOKEN_BODY,
    });
  });
}

test.describe('/lab — ask view', () => {
  test('signed-out gate shows on the ask tab; nothing fetches without a click', async ({
    page,
  }) => {
    const askCalls: string[] = [];
    await page.route(`${API}/**`, (route) => {
      askCalls.push(route.request().url());
      void route.abort();
    });
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /ask/i }).click();
    await expect(page.locator('.ask__gate')).toBeVisible();
    await expect(page.locator('.ask__primary')).toBeVisible();
    expect(askCalls).toEqual([]); // no ambient lab-api traffic while signed out
  });

  test('stubbed PKCE round-trip through the REAL callback route → ask → kernel card + honesty line', async ({
    page,
  }) => {
    await stubAuthRoutes(page);
    await page.route(`${API}/ask`, (route) => {
      void route.fulfill({ status: 200, contentType: 'application/json', body: ASK_BODY });
    });

    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /ask/i }).click();
    await page.locator('.ask__gate .ask__primary').click();

    // The browser really navigated /authorize → /lab/callback → /lab.
    await page.waitForURL('**/lab', { timeout: 15_000 });
    await page.getByRole('tab', { name: /ask/i }).click();
    await expect(page.locator('.ask__form')).toBeVisible();

    await page.locator('.ask__input').fill('How long to Mars?');
    await page.locator('.ask__form .ask__primary').click();

    // Kernel card: title, the kernel badge, tabular values.
    const card = page.locator('.ask-tool');
    await expect(card).toBeVisible();
    await expect(card.locator('.ask-tool__badge')).toBeVisible();
    await expect(card.locator('.ask-tool__values')).toContainText('258.90');
    // Honesty caption names the model, and the narration renders after it.
    await expect(page.locator('.ask__honesty')).toContainText('orrery-ask');
    await expect(page.locator('.ask__answer-text')).toContainText('259 days');
  });

  test('llm-down → the honest 502 state, Lab remains usable', async ({ page }) => {
    await stubAuthRoutes(page);
    await page.route(`${API}/ask`, (route) => {
      void route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'llm_unavailable' }),
      });
    });

    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /ask/i }).click();
    await page.locator('.ask__gate .ask__primary').click();
    await page.waitForURL('**/lab', { timeout: 15_000 });
    await page.getByRole('tab', { name: /ask/i }).click();

    await page.locator('.ask__input').fill('anything');
    await page.locator('.ask__form .ask__primary').click();
    await expect(page.locator('.ask__error')).toBeVisible();

    // The rest of the Lab still works: switch back to the Notebook.
    await page.getByRole('tab', { name: /notebook/i }).click();
    await expect(page.locator('.card').first()).toBeVisible();
  });

  test('no lab-api response is ever cached by the service worker', async ({ page }) => {
    await stubAuthRoutes(page);
    await page.route(`${API}/ask`, (route) => {
      void route.fulfill({ status: 200, contentType: 'application/json', body: ASK_BODY });
    });
    await page.goto('/lab', { waitUntil: 'networkidle' });
    await page.getByRole('tab', { name: /ask/i }).click();
    await page.locator('.ask__gate .ask__primary').click();
    await page.waitForURL('**/lab', { timeout: 15_000 });
    await page.getByRole('tab', { name: /ask/i }).click();
    await page.locator('.ask__input').fill('cache check');
    await page.locator('.ask__form .ask__primary').click();
    await expect(page.locator('.ask__answer-text')).toBeVisible();

    const cachedLabApi = await page.evaluate(async (api) => {
      const names = await caches.keys();
      for (const name of names) {
        const cache = await caches.open(name);
        for (const req of await cache.keys()) {
          if (req.url.startsWith(api)) return req.url;
        }
      }
      return null;
    }, API);
    expect(cachedLabApi).toBeNull();
  });
});
