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
  'src/lib/cards/pick-card-hero.ts',
  'src/routes/cards/mission/[id]/+page.svelte',
  'src/routes/cards/fleet/[id]/+page.svelte',
];

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

function templateHash() {
  return sha(TEMPLATE_SOURCES.map((f) => readFileSync(f, 'utf8')).join('\n'));
}

function inputHash(dataPaths, tpl) {
  const parts = [tpl];
  for (const p of dataPaths) {
    if (existsSync(p)) parts.push(readFileSync(p, 'utf8'));
  }
  return sha(parts.join('\n'));
}

/**
 * One render target per canonical card. Fleet entries that share their id
 * with a mission (Perseverance etc.) are the SAME real thing — their
 * canonical card is mission/<id>, so the fleet duplicate is skipped (the
 * panel aliases to the mission card too; see card-spec fleetAliasesMission).
 */
function enumerateTargets() {
  const missions = JSON.parse(readFileSync('static/data/missions/index.json', 'utf8'));
  const fleet = JSON.parse(readFileSync('static/data/fleet/index.json', 'utf8'));
  const missionIds = new Set(missions.map((mi) => mi.id));
  return [
    ...missions.map((mi) => {
      const destLower = mi.dest.toLowerCase();
      return {
        kind: 'mission',
        id: mi.id,
        dataPaths: [
          `static/data/missions/${destLower}/${mi.id}.json`,
          `i18n-src/en-US/missions/${destLower}/${mi.id}.json`,
        ],
      };
    }),
    ...fleet
      .filter((fi) => !missionIds.has(fi.id))
      .map((fi) => ({
        kind: 'fleet',
        id: fi.id,
        dataPaths: [
          `static/data/fleet/${fi.category}/${fi.id}.json`,
          `i18n-src/en-US/fleet/${fi.category}/${fi.id}.json`,
        ],
      })),
  ];
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
  const all = enumerateTargets();
  const targets = only.length ? all.filter((t) => only.includes(t.id)) : all;

  const tpl = templateHash();
  const manifest = loadManifest();
  mkdirSync(`${OUT_ROOT}/mission`, { recursive: true });
  mkdirSync(`${OUT_ROOT}/fleet`, { recursive: true });

  const todo = targets.filter((t) => {
    const key = `${t.kind}/${t.id}`;
    const hash = inputHash(t.dataPaths, tpl);
    const out = `${OUT_ROOT}/${key}.png`;
    return manifest.entries[key] !== hash || !existsSync(out);
  });
  console.log(`cards: ${targets.length} target(s), ${todo.length} to render (rest cached)`);
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
  for (const t of todo) {
    const key = `${t.kind}/${t.id}`;
    const url = `${BASE_URL}/cards/${key}`;
    try {
      await pg.goto(url, { waitUntil: 'domcontentloaded' });
      await pg.waitForSelector('[data-card-ready="true"], [data-card-failed="true"]', {
        timeout: 30_000,
      });
      const failed = await pg.$('[data-card-failed="true"]');
      if (failed) {
        console.log(`  ✗ ${key}: card stage reported failure`);
        continue;
      }
      const card = await pg.waitForSelector('.card', { timeout: 5_000 });
      const out = `${OUT_ROOT}/${key}.png`;
      await card.screenshot({ path: out });
      manifest.entries[key] = inputHash(t.dataPaths, tpl);
      ok += 1;
      process.stdout.write(`  ${key}`);
    } catch (e) {
      console.log(`\n  ✗ ${key}: ${e.message.split('\n')[0]}`);
    }
  }
  process.stdout.write('\n');

  await browser.close();
  server?.kill();
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`DONE ${ok}/${todo.length} rendered → ${OUT_ROOT}/`);
  if (ok < todo.length) process.exitCode = 1;
}

void main();
