#!/usr/bin/env node
/**
 * Collectible-card image generator (#547 S2).
 *
 * Drives the /cards/<kind>/<id> render stage with Playwright (already a dev
 * dependency) and screenshots each entity's card at 3× (1080×1440-ish) into
 * static/images/cards/<kind>/<id>.jpg. The JPEGs serve two consumers:
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
import { canonicalCardTargets } from '../card-targets.mjs';

const OUT_ROOT = 'static/images/cards';
const MANIFEST = `${OUT_ROOT}/cards-manifest.json`;
const PORT = 4179;
const BASE_URL = process.env.BASE_URL ?? `http://127.0.0.1:${PORT}`;

// Files whose change invalidates EVERY card — the VISUAL layer only
// (template markup/CSS + the hero-pick behaviour). card-spec.ts and the
// render stage are deliberately NOT hashed by content: they grow a new
// resolver per card kind, and content-hashing them re-rendered all 352
// JPEGs (74MB of binary churn) per slice. Instead each kind carries an
// explicit version below — bump it when that kind's resolver or stage
// logic changes its OUTPUT.
const SHARED_SOURCES = ['src/lib/cards/CollectibleCard.svelte'];

const KIND_VERSION = {
  // v2: figure-decode ready-gate (stage raced on trajectory/anatomy figures)
  mission: 2,
  fleet: 2,
  'moon-site': 1,
  'mars-site': 1,
  planet: 1,
  moon: 1,
  'small-body': 1,
};

const sha = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

function templateHash(kind) {
  const shared = SHARED_SOURCES.map((f) => readFileSync(f, 'utf8')).join('\n');
  return sha(`${shared}\n${kind}@v${KIND_VERSION[kind]}`);
}

// Per-kind SHARED hash inputs beyond each target's own dataPaths:
// hero-override + gallery-count manifests (a hero change or gallery
// renumber alters the rendered card) AND the collection index (the
// №NNN/total numbering is positional — an insertion must re-render the
// kind or committed JPEGs drift from the in-app numbers). Whole-file
// granularity: one edit re-renders the kind; coarse but correct.
const KIND_HERO_DEPS = {
  mission: [
    'static/data/missions-hero-overrides.json',
    'static/data/mission-galleries.json',
    'static/data/missions/index.json',
  ],
  fleet: [
    'static/data/fleet-hero-overrides.json',
    'static/data/fleet-galleries.json',
    'static/data/fleet/index.json',
  ],
  'moon-site': [
    'static/data/moon-sites-hero-overrides.json',
    'static/data/moon-site-galleries.json',
  ],
  'mars-site': [
    'static/data/mars-sites-hero-overrides.json',
    'static/data/mars-site-galleries.json',
  ],
  planet: ['static/data/planets-hero-overrides.json', 'static/data/planet-galleries.json'],
  moon: ['static/data/satellites-hero-overrides.json', 'static/data/satellite-galleries.json'],
  'small-body': [
    'static/data/small-bodies-hero-overrides.json',
    'static/data/small-body-galleries.json',
  ],
};

function inputHash(dataPaths, tpl, kind) {
  const parts = [tpl];
  for (const p of [...dataPaths, ...(KIND_HERO_DEPS[kind] ?? [])]) {
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
  const all = canonicalCardTargets();
  const targets = only.length ? all.filter((t) => only.includes(t.id)) : all;

  const manifest = loadManifest();
  for (const kind of Object.keys(KIND_VERSION))
    mkdirSync(`${OUT_ROOT}/${kind}`, { recursive: true });

  // --rehash: rewrite manifest hashes for already-rendered outputs without
  // re-rendering — the migration path when the hashing SCHEME changes but
  // the cards themselves haven't.
  if (process.argv.includes('--rehash')) {
    let n = 0;
    for (const t of all) {
      const key = `${t.kind}/${t.id}`;
      if (!existsSync(`${OUT_ROOT}/${key}.jpg`)) continue;
      manifest.entries[key] = inputHash(t.dataPaths, templateHash(t.kind), t.kind);
      n += 1;
    }
    manifest.entries = Object.fromEntries(
      Object.entries(manifest.entries).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`rehashed ${n} existing card(s), nothing rendered`);
    return;
  }

  const todo = targets.filter((t) => {
    const key = `${t.kind}/${t.id}`;
    const hash = inputHash(t.dataPaths, templateHash(t.kind), t.kind);
    const out = `${OUT_ROOT}/${key}.jpg`;
    return manifest.entries[key] !== hash || !existsSync(out);
  });
  console.log(`cards: ${targets.length} target(s), ${todo.length} to render (rest cached)`);
  if (todo.length === 0) return;

  const server = maybeStartServer();
  let ok = 0;
  let browser;
  // try/finally: a chromium.launch()/newContext() throw must still kill the
  // spawned static server (else it leaks holding the port) and persist the
  // manifest for whatever DID render.
  try {
    await new Promise((r) => setTimeout(r, 1200));
    browser = await chromium.launch();
    const ctx = await browser.newContext({
      viewport: { width: 480, height: 720 },
      deviceScaleFactor: 3,
    });
    const pg = await ctx.newPage();

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
        // JPEG q90: ~190-250K vs ~560K avg for PNG (~83MB vs ~190MB across
        // the 407-card corpus); text stays crisp at deviceScaleFactor 3.
        const out = `${OUT_ROOT}/${key}.jpg`;
        await card.screenshot({ path: out, type: 'jpeg', quality: 90 });
        manifest.entries[key] = inputHash(t.dataPaths, templateHash(t.kind), t.kind);
        ok += 1;
        process.stdout.write(`  ${key}`);
      } catch (e) {
        console.log(`\n  ✗ ${key}: ${e.message.split('\n')[0]}`);
      }
    }
    process.stdout.write('\n');
  } finally {
    await browser?.close().catch(() => {});
    server?.kill();
    manifest.entries = Object.fromEntries(
      Object.entries(manifest.entries).sort(([a], [b]) => a.localeCompare(b)),
    );
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
  }
  console.log(`DONE ${ok}/${todo.length} rendered → ${OUT_ROOT}/`);
  if (ok < todo.length) process.exitCode = 1;
}

void main();
