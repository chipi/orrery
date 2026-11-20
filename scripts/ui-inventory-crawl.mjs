#!/usr/bin/env node
/**
 * ui-inventory-crawl.mjs — the runtime inventory of every control look on the site (plan D4; the
 * A4 crawl of 2026-11-12, rebuilt as a repo tool after its scratch copy was lost).
 *
 * For each page (every canonical route, at most two per route family) at desktop 1440x900 and
 * phone 390x844 (touch), it records every visible control: buttons, [role=button|tab|radio|switch|
 * menuitem|option], [aria-pressed], select, summary, and links that look like controls (a border or
 * a background). Then it opens each disclosure on the page (aria-expanded="false": FILTERS panels,
 * Worlds drawers, dropdowns, index panels, the hamburger, popovers) one at a time, records what
 * appeared, and closes it (Escape, else a second click). This covers what the first crawl missed
 * (A4 brief §1.3.1): nav and footer, link-buttons, drawers, open index / dropdown / popover states.
 *
 * Looks are grouped by tag|class|height|radius|font|transform|bg|border, each with example labels,
 * the routes and the state (page or "open: <disclosure label>") it appears in.
 *
 *   node scripts/ui-inventory-crawl.mjs --base=http://localhost:4173 \
 *     [--out=docs/wip/<date>-ui-inventory.json] [--only=/moon,/missions] [--max-disclosures=12]
 *
 * Needs a running build (npm run build && npm run preview). Read-only against the site.
 */
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { collectCanonicalRoutes } from './site-routes.mjs';

const arg = (k, d) =>
  process.argv
    .find((a) => a.startsWith(`--${k}=`))
    ?.split('=')
    .slice(1)
    .join('=') ?? d;
const BASE = arg('base', 'http://localhost:4173');
const OUT = arg('out', `docs/wip/${new Date().toISOString().slice(0, 10)}-ui-inventory.json`);
const MAX_DISC = Number(arg('max-disclosures', '12'));
const ONLY = arg('only', '');

function pages() {
  if (ONLY) return ONLY.split(',');
  const fam = new Map();
  const out = [];
  for (const r of collectCanonicalRoutes()) {
    // The family is the parent path: every top-level page, two of each list (/missions/*,
    // /fleet/*, each science tab's sections …).
    const key = r.split('/').slice(0, -1).join('/');
    const n = fam.get(key) ?? 0;
    if (key === '' || n < 2) {
      fam.set(key, n + 1);
      out.push(r);
    }
  }
  // The first crawl's states: a selected site / panel opens controls a bare route never shows.
  return [
    ...out,
    '/moon?site=apollo11',
    '/mars?site=perseverance',
    '/earth?site=ksc',
    '/venus?site=venera13',
    '/explore?id=mars',
    '/explore?goto=antares',
    '/explore?deepsky=m42',
    '/missions?id=apollo11',
    '/fleet?id=saturn-v',
  ];
}

/** In the page: every visible control and its look. */
function snapshot() {
  const SEL =
    'button,[role=button],[role=tab],[role=radio],[role=switch],[role=menuitem],[role=option],[aria-pressed],select,summary,a';
  const out = [];
  for (const el of document.querySelectorAll(SEL)) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (
      r.width < 2 ||
      r.height < 2 ||
      cs.visibility === 'hidden' ||
      cs.display === 'none' ||
      Number(cs.opacity) === 0
    )
      continue;
    if (r.bottom < 0 || r.right < 0 || r.top > innerHeight * 4) continue;
    const isLink = el.tagName === 'A' && !el.getAttribute('role');
    const boxed =
      cs.borderTopWidth !== '0px' ||
      (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent');
    if (isLink && !boxed) continue; // a plain text link is not a control look
    out.push({
      tag:
        el.tagName.toLowerCase() + (el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''),
      cls: (el.getAttribute('class') || '')
        .split(/\s+/)
        .filter((c) => c && !c.startsWith('svelte-'))
        .slice(0, 3)
        .join('.'),
      h: Math.round(r.height),
      radius: cs.borderTopLeftRadius,
      font: cs.fontSize,
      tt: cs.textTransform,
      bg: cs.backgroundColor,
      border: `${cs.borderTopWidth} ${cs.borderTopColor}`,
      label: (el.getAttribute('aria-label') || el.textContent || '')
        .trim()
        .replace(/\s+/g, ' ')
        .slice(0, 40),
    });
  }
  return out;
}

const looks = new Map();
function add(items, route, state, vp) {
  for (const it of items) {
    const key = [it.tag, it.cls, it.h, it.radius, it.font, it.tt, it.bg, it.border].join('|');
    const l = looks.get(key) ?? {
      ...it,
      labels: new Set(),
      routes: new Set(),
      states: new Set(),
      viewports: new Set(),
      count: 0,
    };
    l.count++;
    if (l.labels.size < 6 && it.label) l.labels.add(it.label);
    if (l.routes.size < 12) l.routes.add(route);
    if (l.states.size < 8) l.states.add(state);
    l.viewports.add(vp);
    looks.set(key, l);
  }
}

const VPS = [
  { name: 'desktop', viewport: { width: 1440, height: 900 }, hasTouch: false, isMobile: false },
  { name: 'phone', viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
];
const browser = await chromium.launch();
const list = pages();
let visited = 0,
  opened = 0,
  failed = [];
for (const vp of VPS) {
  const ctx = await browser.newContext({
    viewport: vp.viewport,
    hasTouch: vp.hasTouch,
    isMobile: vp.isMobile,
  });
  const page = await ctx.newPage();
  for (const route of list) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45_000 });
      await page.waitForTimeout(600);
      add(await page.evaluate(snapshot), route, 'page', vp.name);
      visited++;
      const disc = page.locator('[aria-expanded="false"]:visible');
      const n = Math.min(await disc.count(), MAX_DISC);
      for (let i = 0; i < n; i++) {
        const d = disc.nth(i);
        const label = (
          (await d.getAttribute('aria-label')) ||
          (await d.innerText().catch(() => '')) ||
          ''
        )
          .trim()
          .slice(0, 30);
        try {
          await d.click({ timeout: 3000 });
          await page.waitForTimeout(350);
          add(await page.evaluate(snapshot), route, `open: ${label}`, vp.name);
          opened++;
          await page.keyboard.press('Escape');
          await page.waitForTimeout(150);
          if (
            (await d.getAttribute('aria-expanded', { timeout: 2000 }).catch(() => null)) === 'true'
          )
            await d.click({ timeout: 2000 }).catch(() => {});
          if (!page.url().startsWith(BASE + route.split('?')[0]))
            await page.goto(BASE + route, { waitUntil: 'networkidle' });
        } catch {
          /* a disclosure that cannot be clicked here (covered, detached): skipped, counted below */
        }
      }
    } catch (e) {
      failed.push(`${vp.name} ${route}: ${String(e).slice(0, 80)}`);
    }
    if (visited % 25 === 0)
      console.log(`${vp.name}: ${visited} pages, ${opened} disclosures, ${looks.size} looks`);
  }
  await ctx.close();
}
await browser.close();

const rows = [...looks.values()]
  .map((l) => ({
    ...l,
    labels: [...l.labels],
    routes: [...l.routes],
    states: [...l.states],
    viewports: [...l.viewports],
  }))
  .sort((a, b) => b.count - a.count);
writeFileSync(
  OUT,
  JSON.stringify(
    {
      base: BASE,
      made: new Date().toISOString(),
      pages: list.length,
      visited,
      disclosuresOpened: opened,
      failed,
      looks: rows,
    },
    null,
    1,
  ),
);
console.log(
  `ui-inventory: ${list.length} pages x 2 viewports, ${visited} visited, ${opened} disclosures opened, ${rows.length} looks, ${failed.length} failed -> ${OUT}`,
);
