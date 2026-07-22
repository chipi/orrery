/**
 * validate-prod.mjs — detailed live-deployment validator for Orrery.
 *
 * Elevates the ad-hoc post-deploy spot-check into a repeatable, structured
 * validator. Drives a real headless browser (Playwright/Chromium) against a
 * running deployment and asserts: reachability + security headers + the exact
 * CSP directives, PWA/service-worker config, a full route-health sweep
 * (every top-level route + key deep/dynamic routes → 200, no page errors, no
 * unexpected 4xx), a FULL localized sweep (every top-level route × all 13
 * non-base locales → served + correct <html lang>, catching home-fallback),
 * data-overlay integrity, and a
 * REGRESSION-GUARD suite for every prod bug fixed on 2026-07-22 (VPS /data
 * overlay, gallery-video CSP frame-src, PWA locale-switch shell, GlitchTip
 * error-monitoring CSP+DSN, /moon route-patches 404) so they can't silently
 * return. Plus desktop + mobile interaction smoke.
 *
 * Why a browser, not curl: the load-bearing checks (console/page errors, CSP
 * violations, the SW navigate-fallback, locale-switch RENDERED content, and a
 * real error POSTing to the telemetry edge) only exist in a real page context.
 *
 * Usage:
 *   node scripts/validate-prod.mjs                 # defaults to prod
 *   VALIDATE_URL=https://staging... node scripts/validate-prod.mjs
 *   VALIDATE_URL=http://127.0.0.1:4173 node scripts/validate-prod.mjs   # local preview
 *   VALIDATE_JSON=/tmp/report.json node scripts/validate-prod.mjs       # + machine report
 *
 * Exit code: 0 when every non-warn check passes; 1 on any failure. WARN checks
 * (environment-conditional, e.g. error-monitoring off on a DSN-less build)
 * never fail the run — they're surfaced, not gated.
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = (process.env.VALIDATE_URL ?? 'https://www.orrerylearn.com').replace(/\/$/, '');
const JSON_OUT = process.env.VALIDATE_JSON;

// ── Route inventory (mirrors svelte.config.js SEED_ROUTES + key dynamic routes)
const TOP_ROUTES = [
  '/',
  '/explore',
  '/explore/hub',
  '/catalog',
  '/learn',
  '/missions',
  '/missions/launches',
  '/fleet',
  '/plan',
  '/fly',
  '/earth',
  '/moon',
  '/mars',
  '/venus',
  '/iss',
  '/tiangong',
  '/science',
  '/live',
  '/credits',
  '/library',
  '/gallery',
  '/posters',
  '/patches',
  '/sourcing',
  '/programs',
];
const DEEP_ROUTES = [
  '/programs/apollo',
  '/science/orbits/keplerian-orbit',
  '/missions?id=apollo11',
  '/explore?id=mars',
];
// All 13 non-base locales (project.inlang/settings.json). The full localized
// route sweep (below) checks EVERY top-level route in EVERY language: served +
// the served page's <html lang> matches the locale (a home-fallback shows
// lang="en-US" — the exact failure mode the PWA-shell + prerender bugs caused).
const LOCALES = [
  'es',
  'fr',
  'de',
  'pt-BR',
  'it',
  'nl',
  'sr-Cyrl',
  'zh-CN',
  'ja',
  'ko',
  'hi',
  'ar',
  'ru',
];
// Localized URL for a base route (mirrors svelte.config.js expandLocalizedRoots).
const localizedPath = (locale, route) => (route === '/' ? `/${locale}/` : `/${locale}${route}`);

// Console-error patterns that are benign noise, not failures.
const IGNORE_CONSOLE = /Failed to load resource|favicon|\[vite\]|Download the .* DevTools|preload/i;

// ── Result recording ────────────────────────────────────────────────────────
const results = [];
let current = 'general';
const suite = (name) => (current = name);
function record(name, ok, detail = '', { warn = false } = {}) {
  results.push({ suite: current, name, status: ok ? 'PASS' : warn ? 'WARN' : 'FAIL', detail });
}

const fmt = { PASS: '✓', WARN: '⚠', FAIL: '✗' };

// Load a page, return { status, pageErrors[], consoleErrors[], bad4xx[] }.
async function load(ctx, path, { waitMs = 1500 } = {}) {
  const p = await ctx.newPage();
  const pageErrors = [],
    consoleErrors = [],
    bad4xx = [];
  p.on('pageerror', (e) => pageErrors.push(e.message.slice(0, 100)));
  p.on('console', (m) => {
    if (m.type() === 'error' && !IGNORE_CONSOLE.test(m.text()))
      consoleErrors.push(m.text().slice(0, 120));
  });
  p.on('response', (r) => {
    const u = r.url();
    if (r.status() >= 400 && !/telemetry|umami|favicon|\.map$/.test(u))
      bad4xx.push(`${r.status()} ${u.replace(BASE, '')}`);
  });
  let status;
  try {
    const resp = await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
    status = resp ? resp.status() : 0;
  } catch {
    status = -1;
  }
  await p.waitForTimeout(waitMs);
  return { p, status, pageErrors, consoleErrors, bad4xx };
}

// ── Main ─────────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });

console.log(`\n  Orrery prod validator → ${BASE}\n`);

// SUITE 1 — reachability + security headers + CSP directives
suite('headers');
{
  const p = await desktop.newPage();
  let headers = {};
  try {
    const resp = await p.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    headers = resp ? resp.headers() : {};
    record('site reachable (/ → 2xx)', resp && resp.status() < 400, `HTTP ${resp?.status()}`);
  } catch (e) {
    record('site reachable (/ → 2xx)', false, e.message.slice(0, 60));
  }
  const csp = headers['content-security-policy'] || '';
  record('security: HSTS header', !!headers['strict-transport-security']);
  record('security: X-Content-Type-Options', headers['x-content-type-options'] === 'nosniff');
  record('security: X-Frame-Options', !!headers['x-frame-options']);
  record('security: Referrer-Policy', !!headers['referrer-policy']);
  record('security: CSP header present', !!csp);
  // The exact directives today's fixes depend on:
  record(
    'CSP frame-src allows youtube (video embeds)',
    /frame-src[^;]*youtube-nocookie/.test(csp),
    'gallery videos',
  );
  record(
    'CSP connect-src allows telemetry edge (error monitoring)',
    /connect-src[^;]*telemetry\.orrerylearn\.com/.test(csp),
    'GlitchTip POST',
  );
  record('CSP media-src present (agency <video>)', /media-src/.test(csp));
  await p.close();
}

// SUITE 2 — PWA / service worker config
suite('pwa');
{
  const p = await desktop.newPage();
  try {
    const resp = await p.goto(BASE + '/sw.js', { timeout: 20000 });
    const sw = resp ? await resp.text() : '';
    record('service worker served (/sw.js)', resp && resp.status() === 200);
    // The locale-switch fix: nav fallback must be the neutral 404.html shell,
    // NOT '/' (home) — else full-page navs render home.
    record(
      'SW navigateFallback = /404.html (not home)',
      /createHandlerBoundToURL\("\/404\.html"\)/.test(sw),
      sw.match(/createHandlerBoundToURL\("([^"]*)"\)/)?.[1] ?? '?',
    );
  } catch (e) {
    record('service worker served (/sw.js)', false, e.message.slice(0, 60));
  }
  // env.js public config (adapter-static dynamic public env)
  try {
    const resp = await p.goto(BASE + '/_app/env.js', { timeout: 20000 });
    record('adapter-static env module served (/_app/env.js)', resp && resp.status() === 200);
  } catch {
    record('adapter-static env module served (/_app/env.js)', false);
  }
  await p.close();
}

// SUITE 3 — route health (top-level)
suite('routes');
for (const r of TOP_ROUTES) {
  const { p, status, pageErrors, bad4xx } = await load(desktop, r);
  const ok = status >= 200 && status < 400 && !pageErrors.length && !bad4xx.length;
  const detail =
    (status >= 400 || status < 0 ? `HTTP ${status} ` : '') +
    (pageErrors[0] ? `err:${pageErrors[0]} ` : '') +
    (bad4xx.length ? `4xx:${bad4xx.slice(0, 2).join(',')}` : '');
  record(`route ${r}`, ok, detail.trim());
  await p.close();
}

// SUITE 4 — deep / dynamic routes
suite('deep-routes');
for (const r of DEEP_ROUTES) {
  const { p, status, pageErrors, bad4xx } = await load(desktop, r, { waitMs: 2000 });
  record(
    `deep ${r}`,
    status >= 200 && status < 400 && !pageErrors.length && !bad4xx.length,
    (status >= 400 ? `HTTP ${status} ` : '') + (bad4xx[0] ?? pageErrors[0] ?? ''),
  );
  await p.close();
}

// SUITE 5 — FULL localized sweep: every top-level route × all 13 locales.
// Each localized route must (a) serve 2xx and (b) return its OWN page — detected
// by the served <html lang="xx"> matching the locale (a home-fallback shows
// lang="en-US"). fetch-based + parallel so 13 × N routes stays fast; rolled up
// to one result per locale (failures listed) to keep the report readable.
suite('i18n-full');
{
  const langRe = /<html[^>]*\blang="([^"]+)"/i;
  const checkOne = async (locale, route) => {
    const path = localizedPath(locale, route);
    try {
      const res = await fetch(BASE + path, { redirect: 'follow' });
      if (res.status < 200 || res.status >= 400)
        return { route, ok: false, why: `HTTP ${res.status}` };
      const html = await res.text();
      const lang = (langRe.exec(html)?.[1] || '').trim();
      if (lang !== locale)
        return { route, ok: false, why: `lang="${lang || '?'}" (home-fallback?)` };
      return { route, ok: true };
    } catch (e) {
      return { route, ok: false, why: e.message.slice(0, 40) };
    }
  };
  // Bounded concurrency across the whole locale×route matrix.
  const jobs = [];
  for (const locale of LOCALES) for (const route of TOP_ROUTES) jobs.push({ locale, route });
  const CONCURRENCY = 12;
  const byLocale = Object.fromEntries(LOCALES.map((l) => [l, []]));
  let idx = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (idx < jobs.length) {
        const { locale, route } = jobs[idx++];
        byLocale[locale].push(await checkOne(locale, route));
      }
    }),
  );
  for (const locale of LOCALES) {
    const rs = byLocale[locale];
    const fails = rs.filter((r) => !r.ok);
    record(
      `locale ${locale} (${rs.length - fails.length}/${rs.length} routes)`,
      fails.length === 0,
      fails.length
        ? fails
            .slice(0, 4)
            .map((f) => `${f.route}:${f.why}`)
            .join(', ')
        : '',
    );
  }
}

// SUITE 6 — data-overlay integrity (the VPS /data seed fix)
suite('data');
{
  const p = await desktop.newPage();
  for (const f of ['/data/i18n/en-US.json', '/data/i18n/de.json']) {
    try {
      const resp = await p.goto(BASE + f, { timeout: 15000 });
      record(`data served ${f}`, resp && resp.status() === 200, `HTTP ${resp?.status()}`);
    } catch {
      record(`data served ${f}`, false);
    }
  }
  await p.close();
}

// SUITE 7 — regression guards for the prod bugs fixed 2026-07-22
suite('regression-guards');

// 7a. programs page loads real content (data overlay) — not the home shell.
{
  const { p } = await load(desktop, '/programs/apollo', { waitMs: 2000 });
  const body = (
    await p
      .locator('main, body')
      .first()
      .innerText()
      .catch(() => '')
  ).slice(0, 200);
  record(
    'programs page renders program content (data overlay)',
    /apollo/i.test(body) && !/^\s*ORRERY[\s\S]{0,40}solar system explorer/i.test(body),
    body.slice(0, 40).replace(/\n/g, ' '),
  );
  await p.close();
}

// 7b. gallery video mounts a YouTube iframe (CSP frame-src).
{
  const p = await desktop.newPage();
  await p.goto(BASE + '/missions', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await p
    .locator('[data-testid="mission-card-apollo11"]')
    .click()
    .catch(() => {});
  await p.waitForTimeout(1500);
  const gt = p.locator('button,[role="tab"]', { hasText: /gallery/i }).first();
  if (await gt.count()) await gt.click().catch(() => {});
  await p.waitForTimeout(800);
  const thumb = p.locator('.video-thumb').first();
  let mounted = false;
  if (await thumb.count()) {
    await thumb.click().catch(() => {});
    await p.waitForTimeout(2500);
    mounted = (await p.locator('iframe').count()) > 0;
  }
  record(
    'gallery video mounts iframe (CSP frame-src)',
    mounted,
    (await thumb.count()) ? '' : 'no video tile found (skipped)',
    { warn: !(await thumb.count()) },
  );
  await p.close();
}

// 7c. locale switch stays on the current route with its content (PWA shell fix).
{
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  const p = await ctx.newPage();
  await p.goto(BASE + '/explore', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await p.reload({ waitUntil: 'networkidle' }).catch(() => {}); // activate SW
  await p
    .locator('[data-locale-picker] button')
    .first()
    .click()
    .catch(() => {});
  await p.waitForTimeout(400);
  await p
    .locator('[data-locale-picker] [role="option"], [data-locale-picker] button', {
      hasText: /Deutsch|DE/i,
    })
    .first()
    .click()
    .catch(() => {});
  await p.waitForTimeout(3000);
  const url = p.url();
  const canvas = await p.locator('canvas').count();
  const isHome = /Ein Sonnensystem-Explorer|solar system explorer/i.test(
    await p
      .locator('main, body')
      .first()
      .innerText()
      .catch(() => ''),
  );
  record(
    'locale switch stays on route (PWA shell)',
    /\/de\/explore/.test(url) && canvas > 0 && !isHome,
    `→ ${url.replace(BASE, '')} canvas=${canvas}`,
  );
  await ctx.close();
}

// 7d. error monitoring: DSN valid + connect allowed + a real error POSTs.
{
  const p = await desktop.newPage();
  const posts = [],
    badLogs = [];
  p.on('request', (r) => {
    if (/telemetry\.orrerylearn/.test(r.url())) posts.push('req');
  });
  p.on('response', (r) => {
    if (/telemetry\.orrerylearn/.test(r.url())) posts.push(String(r.status()));
  });
  p.on('console', (m) => {
    if (/Invalid Sentry|Transport disabled|Refused to connect/i.test(m.text()))
      badLogs.push(m.text().slice(0, 60));
  });
  await p.goto(BASE + '/', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(2500);
  // Is error monitoring even enabled on this build? (DSN baked)
  const dsnSet = await p.evaluate(() => {
    for (const k of Object.keys(globalThis))
      if (k.startsWith('__sveltekit_') && globalThis[k]?.env?.PUBLIC_SENTRY_DSN)
        return !!globalThis[k].env.PUBLIC_SENTRY_DSN;
    return false;
  });
  if (!dsnSet) {
    record('error monitoring wired (DSN baked)', false, 'no DSN — monitoring off on this build', {
      warn: true,
    });
  } else {
    await p.addScriptTag({ content: 'setTimeout(function(){ var x=null; x.crash(); }, 30);' });
    await p.waitForTimeout(5000);
    record('error monitoring: no CSP/DSN errors', badLogs.length === 0, badLogs[0] ?? '');
    record(
      'error monitoring: real error POSTs to GlitchTip (200)',
      posts.includes('200'),
      posts.length ? posts.join(' ') : 'no POST fired',
    );
  }
  await p.close();
}

// 7e. /moon has no route-patches 404 (the optional-fetch gate).
{
  const p = await desktop.newPage();
  const rp404 = [];
  p.on('response', (r) => {
    if (r.status() >= 400 && /route-patches/.test(r.url())) rp404.push(r.url());
  });
  await p.goto(BASE + '/moon', { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(2500);
  record(
    '/moon: no route-patches 404',
    rp404.length === 0,
    rp404.length ? `${rp404.length} 404s` : '',
  );
  await p.close();
}

// SUITE 8 — mobile + interaction smoke
suite('interactions');
{
  const mob = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  // mobile home + nav
  {
    const { p, status } = await load(mob, '/', { waitMs: 1500 });
    record(
      'mobile / loads + nav',
      status < 400 && (await p.locator('nav, [class*="nav"]').first().count()) > 0,
    );
    await p.close();
  }
  // mobile explore 3D
  {
    const { p } = await load(mob, '/explore', { waitMs: 2500 });
    record('mobile /explore 3D canvas', (await p.locator('canvas').count()) > 0);
    await p.close();
  }
  // missions search filters
  {
    const { p } = await load(desktop, '/missions?q=apollo', { waitMs: 1500 });
    record(
      'missions ?q= search filters',
      (await p.locator('[data-testid^="mission-card-"]').count()) >= 1,
    );
    await p.close();
  }
  await mob.close();
}

await browser.close();

// ── Report ───────────────────────────────────────────────────────────────────
let lastSuite = '';
for (const r of results) {
  if (r.suite !== lastSuite) {
    console.log(`\n  ${r.suite.toUpperCase()}`);
    lastSuite = r.suite;
  }
  console.log(`    ${fmt[r.status]} ${r.name}${r.detail ? `  — ${r.detail}` : ''}`);
}
const pass = results.filter((r) => r.status === 'PASS').length;
const warn = results.filter((r) => r.status === 'WARN').length;
const fail = results.filter((r) => r.status === 'FAIL').length;
console.log(`\n  ${pass} passed · ${warn} warn · ${fail} failed  (target ${BASE})\n`);

if (JSON_OUT) {
  writeFileSync(JSON_OUT, JSON.stringify({ target: BASE, pass, warn, fail, results }, null, 2));
  console.log(`  report → ${JSON_OUT}\n`);
}

process.exit(fail > 0 ? 1 : 0);
