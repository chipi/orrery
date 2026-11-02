/**
 * Re-check the inconclusive outbound links (403 to scripts, timeouts, TLS and
 * network errors) in a real browser, the way a reader would open them.
 * Companion to check-external-links.mjs (runbook: orrery-link-health).
 *
 * Opens each URL in headless Chromium (Playwright, already a dev dependency),
 * follows redirects, and records the final HTTP status in
 * .cache/external-links.json with detail "browser":
 *   ok         — 2xx/3xx in a browser (the 403 was a bot wall)
 *   dead       — 404/410, or a page that says it is not found
 *   error      — certificate / DNS / connection failure a reader would hit too
 *   forbidden  — still 401/403 in a browser (login wall or challenge page)
 *   timeout    — no response within 30 s
 * Then re-run check-external-links.mjs (no --max-age) to rewrite the report.
 *
 * Usage: node scripts/recheck-links-browser.mjs [--status=timeout,error,forbidden]
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { collect } from './check-external-links.mjs';

const CACHE = '.cache/external-links.json';
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const statuses = String(args.status ?? 'timeout,error,forbidden,redirect').split(',');
const cache = JSON.parse(readFileSync(CACHE, 'utf8'));
const { found } = collect();
const urls = [...found.keys()].filter((u) => statuses.includes(cache[u]?.status));
console.log(`→ ${urls.length} links to open in a browser`);

const NOT_FOUND = /\b(404|page not found|not found|no longer available|does not exist)\b/i;
const browser = await chromium.launch();
const context = await browser.newContext({
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 Orrery-LinkChecker/1.0',
});

async function check(url) {
  const page = await context.newPage();
  try {
    const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    const status = res?.status() ?? 0;
    const title = (await page.title().catch(() => '')).slice(0, 120);
    let verdict = 'ok';
    if (status === 404 || status === 410) verdict = 'dead';
    else if (status === 401 || status === 403) verdict = 'forbidden';
    else if (status >= 500) verdict = 'timeout';
    else if (NOT_FOUND.test(title)) verdict = 'dead';
    return {
      status: verdict,
      http_status: status,
      final_url: page.url(),
      detail: `browser: ${title}`,
    };
  } catch (err) {
    const msg = String(err.message ?? err);
    if (/Timeout/i.test(msg))
      return { status: 'timeout', http_status: null, final_url: null, detail: 'browser: timeout' };
    const code = (msg.match(/net::[A-Z_]+/) ?? [msg.slice(0, 80)])[0];
    return { status: 'error', http_status: null, final_url: null, detail: `browser: ${code}` };
  } finally {
    await page.close();
  }
}

const results = {};
let i = 0;
const workers = Array.from({ length: 4 }, async () => {
  while (i < urls.length) {
    const url = urls[i++];
    results[url] = await check(url);
  }
});
await Promise.all(workers);
await browser.close();

const checked_at = new Date().toISOString();
const tally = {};
for (const [u, r] of Object.entries(results)) {
  cache[u] = { ...r, checked_at };
  tally[r.status] = (tally[r.status] ?? 0) + 1;
}
writeFileSync(CACHE, JSON.stringify(cache));
console.log('browser verdicts:', tally);
for (const [u, r] of Object.entries(results))
  if (r.status !== 'ok')
    console.log(`  ${r.status.padEnd(9)} ${r.http_status ?? ''} ${u}  ${r.detail}`);
