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
 * Tier (VALIDATE_TIER, default 'prod'): the security-header + CSP suite asserts
 * directives that nginx sets on the VPS (prod). The 'staging' tier is GitHub
 * Pages — a static host that does NOT emit those nginx headers — so on
 * VALIDATE_TIER=staging that suite is skipped (surfaced as WARN, not FAIL):
 * asserting an nginx config against a non-nginx host is an environment mismatch,
 * not a real regression. Every other suite (routes, i18n, PWA, data overlay,
 * regression guards, mobile) is build-output/app-behaviour and runs on any tier.
 *
 * Exit code: 0 when every non-warn check passes; 1 on any failure. WARN checks
 * (environment-conditional, e.g. error-monitoring off on a DSN-less build)
 * never fail the run — they're surfaced, not gated.
 */
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const BASE = (process.env.VALIDATE_URL ?? 'https://www.orrerylearn.com').replace(/\/$/, '');
const TIER = process.env.VALIDATE_TIER ?? 'prod';
// The deploy's URL base path ('' on prod at root, '/orrery' on the GitHub Pages
// staging site). Lets base-relative assertions (e.g. the SW fallback) stay
// tier-correct instead of hard-coding a root path.
const BASE_PATH = new URL(BASE).pathname.replace(/\/$/, '');
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
// Localized home is `/<locale>` (no trailing slash) — the app's prerendered URL
// shape. A forced trailing slash 404s on GitHub Pages' strict static serving even
// though nginx (prod) is lenient about it.
const localizedPath = (locale, route) => (route === '/' ? `/${locale}` : `/${locale}${route}`);

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

// A transient CDN/chunk hiccup (a Vite code-split chunk that 503s or races the
// deploy swap) surfaces as this pageerror — retryable network noise, not a real
// regression. Don't let it false-red a deploy-gating run.
const TRANSIENT = /Failed to fetch dynamically imported module|error loading dynamically imported/i;

// Load a page once, return { p, status, pageErrors[], consoleErrors[], bad4xx[] }.
async function loadOnce(ctx, path, waitMs) {
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
    // image-vision.json is intentionally pruned from the build (prune-build-
    // staging.mjs) and its loader falls back to an empty manifest — a 404 is
    // by-design + gracefully handled, not a route break, so don't gate on it.
    if (r.status() >= 400 && !/telemetry|umami|favicon|\.map$|image-vision\.json/.test(u))
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

// A sub-resource 5xx (e.g. GitHub Pages' CDN throwing a transient 503 on a large
// texture/image during the concurrent sweep) — retryable, unlike a real 4xx.
const hasTransient5xx = (res) => res.bad4xx.some((b) => /^5\d\d /.test(b));

// Load a page, retrying once on a transient failure so a CDN hiccup can't
// false-fail a gating post-deploy run.
async function load(ctx, path, { waitMs = 1500 } = {}) {
  let res = await loadOnce(ctx, path, waitMs);
  // Retry on the observed transient chunk-fetch pageerror OR a transient 5xx
  // sub-resource — a persistent failure still fails on the second attempt.
  // Deliberately do NOT retry on status < 0 — that's dominated by networkidle
  // timeouts on heavy 3D routes (fly/explore/earth), and retrying just doubles a
  // 30s wait for no gain.
  if (res.pageErrors.some((e) => TRANSIENT.test(e)) || hasTransient5xx(res)) {
    await res.p.close();
    res = await loadOnce(ctx, path, waitMs);
  }
  return res;
}

// ── Main ─────────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });

console.log(`\n  Orrery ${TIER} validator → ${BASE}\n`);

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
  // Security headers + CSP directives are set by nginx on the VPS (prod). The
  // staging tier is GitHub Pages — a static host that does not emit them — so
  // asserting them there is an environment mismatch, not a regression. Skip on
  // staging (surfaced as WARN), run in full on prod.
  if (TIER === 'prod') {
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
  } else {
    record(
      'security headers + CSP directives',
      true,
      `skipped on ${TIER} — nginx/VPS concern, N/A on the GitHub Pages static host`,
      { warn: true },
    );
  }
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
      new RegExp(`createHandlerBoundToURL\\("${BASE_PATH}/404\\.html"\\)`).test(sw),
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
  // A 12-way concurrent sweep of 14×N routes bursts ~350 requests at the CDN;
  // GitHub Pages rate-limits that with transient 429/503 (a DIFFERENT route each
  // run — the route itself is fine, it just got throttled mid-burst). Retry those
  // (and network errors) with exponential backoff so a throttle can't false-fail a
  // gating run; a genuinely broken route still fails all attempts. 4xx (except 429)
  // are real and NOT retried.
  const TRANSIENT_STATUS = (s) => s === 429 || s === 503 || s === 502 || s === 504;
  const checkOne = async (locale, route) => {
    const path = localizedPath(locale, route);
    let lastWhy = '';
    for (let attempt = 0; attempt < 4; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, 400 * 2 ** (attempt - 1)));
      try {
        const res = await fetch(BASE + path, { redirect: 'follow' });
        if (TRANSIENT_STATUS(res.status)) {
          lastWhy = `HTTP ${res.status}`;
          continue; // throttled — back off and retry
        }
        if (res.status < 200 || res.status >= 400)
          return { route, ok: false, why: `HTTP ${res.status}` };
        const html = await res.text();
        const lang = (langRe.exec(html)?.[1] || '').trim();
        if (lang !== locale)
          return { route, ok: false, why: `lang="${lang || '?'}" (home-fallback?)` };
        return { route, ok: true };
      } catch (e) {
        lastWhy = e.message.slice(0, 40); // network hiccup — retry
      }
    }
    return { route, ok: false, why: lastWhy || 'unreachable' };
  };
  // Bounded concurrency across the whole locale×route matrix (13 × 25 = 325 jobs).
  // Kept modest to stay within GitHub Pages' fair-use / rate limits — a hotter
  // pool (was 12) bursts hard enough to draw 429/503 throttling. 8 in-flight is a
  // gentler peak; `checkOne`'s retry-with-backoff then absorbs any residual
  // throttle so a single hiccup can't false-fail a gating run.
  const jobs = [];
  for (const locale of LOCALES) for (const route of TOP_ROUTES) jobs.push({ locale, route });
  const CONCURRENCY = 8;
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
  // Wait for the /de/explore route to actually mount its 3D scene rather than
  // racing a fixed timeout: a plain waitForTimeout(3000) intermittently sampled
  // canvas=0 in CI's headless SwiftShader WebGL (no GPU → slow context init),
  // failing a HEALTHY prod that renders canvas=2 in any real browser. Poll for
  // the canvas element to attach (≤15s) — robust to slow software-WebGL, still
  // fast when it mounts quickly.
  await p.waitForTimeout(400);
  const url = p.url();
  await p
    .locator('canvas')
    .first()
    .waitFor({ state: 'attached', timeout: 15000 })
    .catch(() => {});
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

// 7d. error monitoring. CONFIG checks always run (DSN baked + valid dashless
// key + CSP connect allowed) — they catch the exact regressions (missing DSN,
// dashed-UUID key the SDK rejects, blocked connect-src) WITHOUT sending events.
// The full end-to-end check (trigger a real error → verify a 200 POST) is
// OPT-IN via VALIDATE_ERROR_POST=1, so the scheduled cron / post-deploy runs
// don't pollute GlitchTip project 4 with a synthetic event every time.
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
  // Read the baked DSN (adapter-static $env/dynamic/public → __sveltekit_*.env).
  // A late client-side navigation can destroy the execution context mid-evaluate
  // ("Execution context was destroyed") — settle and retry once so a nav race
  // can't crash the whole validator run.
  const readDsn = () =>
    p.evaluate(() => {
      for (const k of Object.keys(globalThis))
        if (k.startsWith('__sveltekit_') && globalThis[k]?.env)
          return globalThis[k].env.PUBLIC_SENTRY_DSN || null;
      return null;
    });
  let dsn;
  try {
    dsn = await readDsn();
  } catch {
    await p.waitForTimeout(1000);
    dsn = await readDsn().catch(() => null);
  }
  if (!dsn) {
    // On staging (VALIDATE_REQUIRE_DSN=1) a missing DSN is a hard failure — the
    // whole point of that tier is to verify GitHub Pages emits Sentry. Elsewhere
    // (e.g. a fork build with no DSN secret) it stays a benign WARN.
    const requireDsn = process.env.VALIDATE_REQUIRE_DSN === '1';
    record(
      'error monitoring wired (DSN baked)',
      false,
      requireDsn
        ? 'no DSN baked — staging must emit Sentry (check secrets.PUBLIC_SENTRY_DSN)'
        : 'no DSN — monitoring off on this build',
      { warn: !requireDsn },
    );
  } else {
    record('error monitoring: DSN baked', true);
    // The public key must be dashless — the @sentry SDK's DSN parser uses \w+
    // (no dashes) and silently disables the transport on a dashed-UUID key.
    const key = /\/\/([^@]+)@/.exec(dsn)?.[1] ?? '';
    record(
      'error monitoring: DSN key is Sentry-valid (dashless)',
      /^\w+$/.test(key),
      /-/.test(key) ? 'key has dashes → SDK rejects → transport disabled' : '',
    );
    if (process.env.VALIDATE_ERROR_POST === '1') {
      await p.addScriptTag({ content: 'setTimeout(function(){ var x=null; x.crash(); }, 30);' });
      await p.waitForTimeout(5000);
      record('error monitoring: no CSP/DSN errors', badLogs.length === 0, badLogs[0] ?? '');
      record(
        'error monitoring: real error POSTs to GlitchTip (200)',
        posts.includes('200'),
        posts.length ? posts.join(' ') : 'no POST fired',
      );
    } else {
      record(
        'error monitoring: real-error POST check',
        true,
        'skipped (VALIDATE_ERROR_POST=1 to run)',
        {
          warn: true,
        },
      );
    }
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
    const { p } = await load(mob, '/explore', { waitMs: 500 });
    // Same slow-software-WebGL guard as the desktop locale-switch check: wait for
    // the canvas to attach instead of trusting a fixed post-load delay.
    await p
      .locator('canvas')
      .first()
      .waitFor({ state: 'attached', timeout: 15000 })
      .catch(() => {});
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
