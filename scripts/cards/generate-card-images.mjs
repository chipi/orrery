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

// Files whose change invalidates EVERY card — the VISUAL layer only
// (template markup/CSS + the hero-pick behaviour). card-spec.ts and the
// render stage are deliberately NOT hashed by content: they grow a new
// resolver per card kind, and content-hashing them re-rendered all 352
// JPEGs (74MB of binary churn) per slice. Instead each kind carries an
// explicit version below — bump it when that kind's resolver or stage
// logic changes its OUTPUT.
const SHARED_SOURCES = ['src/lib/cards/CollectibleCard.svelte', 'src/lib/cards/pick-card-hero.ts'];

const KIND_VERSION = {
  mission: 1,
  fleet: 1,
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
  // Sites that alias a mission (mission_id or id parity — 45 of 54) have
  // their canonical card at mission/<id>; only the remainder render here.
  const siteTargets = (body) =>
    JSON.parse(readFileSync(`static/data/${body}-sites.json`, 'utf8'))
      .filter((s) => !missionIds.has(s.mission_id ?? '') && !missionIds.has(s.id))
      .map((s) => ({
        kind: `${body}-site`,
        id: s.id,
        dataPaths: [`static/data/${body}-sites.json`, `i18n-src/en-US/${body}-sites/${s.id}.json`],
      }));
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
    ...siteTargets('moon'),
    ...siteTargets('mars'),
    // Planets (Pluto's canonical card is the small-body kind — its /explore
    // panel is the SmallBodyPanel) + natural satellites.
    ...JSON.parse(readFileSync('static/data/planets.json', 'utf8'))
      .planets.map((p) => p.name.toLowerCase())
      .filter((id) => id !== 'pluto')
      .map((id) => ({
        kind: 'planet',
        id,
        dataPaths: ['static/data/planets.json', `i18n-src/en-US/planets/${id}.json`],
      })),
    ...JSON.parse(readFileSync('static/data/satellites.json', 'utf8')).satellites.map((s) => ({
      kind: 'moon',
      id: s.id,
      dataPaths: ['static/data/satellites.json', `i18n-src/en-US/satellites/${s.id}.json`],
    })),
    ...JSON.parse(readFileSync('static/data/small-bodies.json', 'utf8')).bodies.map((b) => ({
      kind: 'small-body',
      id: b.id,
      dataPaths: ['static/data/small-bodies.json', `i18n-src/en-US/small-bodies/${b.id}.json`],
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
      manifest.entries[key] = inputHash(t.dataPaths, templateHash(t.kind));
      n += 1;
    }
    writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`rehashed ${n} existing card(s), nothing rendered`);
    return;
  }

  const todo = targets.filter((t) => {
    const key = `${t.kind}/${t.id}`;
    const hash = inputHash(t.dataPaths, templateHash(t.kind));
    const out = `${OUT_ROOT}/${key}.jpg`;
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
      // JPEG q90: ~190K vs ~560K for PNG across the 352-card corpus (190MB
      // → ~65MB in-repo); text stays crisp at deviceScaleFactor 3.
      const out = `${OUT_ROOT}/${key}.jpg`;
      await card.screenshot({ path: out, type: 'jpeg', quality: 90 });
      manifest.entries[key] = inputHash(t.dataPaths, templateHash(t.kind));
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
