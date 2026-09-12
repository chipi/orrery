#!/usr/bin/env node
/**
 * Collectible-card image generator (#547 S2).
 *
 * Drives the /cards/<kind>/<id> render stage with Playwright (already a dev
 * dependency) and screenshots each entity's card at 3× (1080×1440-ish) into
 * static/images/cards/<kind>/<id>.png. The PNGs serve two consumers:
 *   - the overlay's "Share card" action (native share sheet gets the file)
 *   - the og:image for the S3 link-preview stub pages
 *
 * Template changes propagate by re-running this script — the cards are
 * screenshots of the LIVE HTML template, never hand-made or AI-generated
 * per entity (operator direction 2026-09-12).
 *
 * Caching: a manifest records a hash of each entity's card inputs (data
 * json + i18n overlay + the template sources). Unchanged → skipped.
 *
 * Run (serves the built app itself — `npm run build` first):
 *   npm run build-cards            # all missions
 *   npm run build-cards -- apollo11 voyager-1   # subset
 *   BASE_URL=http://localhost:5180 npm run build-cards   # against dev
 */
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT_ROOT = 'static/images/cards';
const MANIFEST = `${OUT_ROOT}/cards-manifest.json`;
const PORT = 4179;
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

// Files whose change invalidates EVERY card (the template layer).
const TEMPLATE_SOURCES = [
  'src/lib/cards/CollectibleCard.svelte',
  'src/lib/cards/card-spec.ts',
  'src/routes/cards/mission/[id]/+page.svelte',
];

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

function templateHash() {
  return sha(TEMPLATE_SOURCES.map((f) => readFileSync(f, 'utf8')).join('\n'));
}

function missionInputHash(id, dest, tpl) {
  const parts = [tpl];
  const destLower = dest.toLowerCase();
  for (const p of [
    `static/data/missions/${destLower}/${id}.json`,
    `i18n-src/en-US/missions/${destLower}/${id}.json`,
  ]) {
    if (existsSync(p)) parts.push(readFileSync(p, 'utf8'));
  }
  return sha(parts.join('\n'));
}

function loadManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, 'utf8'));
  } catch {
    return { generated_by: 'scripts/cards/generate-card-images.mjs', entries: {} };
  }
}

/** Serve build/ via the mobile static server unless BASE_URL is external. */
function maybeStartServer() {
  if (process.env.BASE_URL) return null;
  if (!existsSync('build/index.html')) {
    console.error('build/ missing — run `npm run build` first (or set BASE_URL to a dev server).');
    process.exit(1);
  }
  const child = spawn('node', ['scripts/mobile/serve-build.mjs'], {
    env: { ...process.env, PORT: String(PORT), HOST: '127.0.0.1' },
    stdio: 'ignore',
  });
  return child;
}

async function main() {
  const only = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const index = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'));
  const missions = only.length ? index.filter((mi) => only.includes(mi.id)) : index;

  const tpl = templateHash();
  const manifest = loadManifest();
  mkdirSync(`${OUT_ROOT}/mission`, { recursive: true });

  const todo = missions.filter((mi) => {
    const key = `mission/${mi.id}`;
    const hash = missionInputHash(mi.id, mi.dest, tpl);
    const out = `${OUT_ROOT}/mission/${mi.id}.png`;
    return manifest.entries[key] !== hash || !existsSync(out);
  });
  console.log(`cards: ${missions.length} mission(s), ${todo.length} to render (rest cached)`);
  if (todo.length === 0) return;

  const server = maybeStartServer();
  await new Promise((r) => setTimeout(r, 1200));

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 480, height: 720 },
    deviceScaleFactor: 3,
  });
  const pg = await ctx.newPage();

  let ok = 0;
  for (const mi of todo) {
    const url = `${BASE_URL}/cards/mission/${mi.id}`;
    try {
      await pg.goto(url, { waitUntil: 'domcontentloaded' });
      await pg.waitForSelector('[data-card-ready="true"], [data-card-failed="true"]', {
        timeout: 30_000,
      });
      const failed = await pg.$('[data-card-failed="true"]');
      if (failed) {
        console.log(`  ✗ ${mi.id}: card stage reported failure`);
        continue;
      }
      const card = await pg.waitForSelector('.card', { timeout: 5_000 });
      const out = `${OUT_ROOT}/mission/${mi.id}.png`;
      await card.screenshot({ path: out });
      manifest.entries[`mission/${mi.id}`] = missionInputHash(mi.id, mi.dest, tpl);
      ok += 1;
      process.stdout.write(`  ${mi.id}`);
    } catch (e) {
      console.log(`\n  ✗ ${mi.id}: ${e.message.split('\n')[0]}`);
    }
  }
  process.stdout.write('\n');

  await browser.close();
  server?.kill();
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`DONE ${ok}/${todo.length} rendered → ${OUT_ROOT}/mission/`);
  if (ok < todo.length) process.exitCode = 1;
}

void main();
