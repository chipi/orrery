/**
 * Capture all README + user-guide screenshots from the production build.
 *
 * Spawns `vite preview` against ./build, drives Chromium through every
 * route at the interaction states we want to showcase (lens off vs on,
 * panels open, FlightDirector mid-cruise, etc.), and writes deterministic
 * PNGs to docs/screenshots/.
 *
 * Run with `npm run screenshots`. Output is committed to the repo so the
 * README never depends on a stale local build.
 *
 * If you add a new screen or interaction state worth showcasing, add it
 * to the SHOTS array below — the runner is strictly serial so screenshots
 * stay deterministic across runs.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, type Page, devices } from '@playwright/test';

const PORT = 4173;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const OUT_DIR = resolve(import.meta.dirname, '..', 'docs', 'screenshots');
const VIEWPORT = { width: 1280, height: 800 };

interface Shot {
  /** Output filename inside docs/screenshots/. */
  file: string;
  /** Route + query string, e.g. `/explore`. */
  path: string;
  /** Optional hook that runs after navigation; use it to open panels,
   *  toggle the lens, hover targets, etc. before the screenshot fires. */
  setup?: (page: Page) => Promise<void>;
  /** Settle window in ms after setup completes. Default 600. Bump for
   *  scenes that need additional rAF cycles after a toggle / hover. */
  settleMs?: number;
}

const SHOTS: Shot[] = [
  // ── Hero — keep first so it's the README opener ───────────────────
  {
    file: 'hero-explore-3d.png',
    path: '/explore',
    settleMs: 1500,
  },

  // ── 1-6 — original primary nav routes (refresh) ───────────────────
  { file: '01-explore.png', path: '/explore', settleMs: 1500 },
  { file: '02-plan.png', path: '/plan', settleMs: 2500 },
  {
    file: '03-fly-curiosity.png',
    path: '/fly?mission=curiosity',
    setup: async (page) => {
      // reduced-motion freezes the play loop on /fly so the playback
      // button defaults to "play" — we don't need to pause; just scrub
      // to a deterministic mid-mission position.
      const scrub = page.locator('input[type="range"][aria-label*="timeline" i]');
      await scrub.fill('0.5');
    },
    settleMs: 1000,
  },
  {
    file: '03-fly-apollo11.png',
    path: '/fly?mission=apollo11',
    setup: async (page) => {
      const scrub = page.locator('input[type="range"][aria-label*="timeline" i]');
      await scrub.fill('0.25');
    },
    settleMs: 1000,
  },
  { file: '04-missions.png', path: '/missions', settleMs: 800 },
  {
    file: '05-earth.png',
    path: '/earth',
    setup: async (page) => {
      await page.getByRole('button', { name: /^2d$/i }).click();
      // Wait for satellites to render before snapshot.
      await page.locator('canvas.layer').waitFor({ state: 'visible' });
    },
    settleMs: 1000,
  },
  { file: '06-moon.png', path: '/moon', settleMs: 1500 },

  // ── 7-9 — new primary nav routes added in v0.4–v0.5 ───────────────
  { file: '07-mars.png', path: '/mars', settleMs: 1500 },
  { file: '08-iss.png', path: '/iss', settleMs: 1800 },
  { file: '09-tiangong.png', path: '/tiangong', settleMs: 1800 },

  // ── 10 — /science encyclopedia ────────────────────────────────────
  { file: '10-science-landing.png', path: '/science', settleMs: 600 },
  {
    file: '10-science-section.png',
    path: '/science/orbits/keplers-laws',
    settleMs: 600,
  },

  // ── 11-13 — Science Lens / Flight Director / Mission Sandbox ──────
  {
    file: '11-science-lens-explore.png',
    path: '/explore',
    setup: async (page) => {
      // Toggle the Science Lens via the nav button.
      await page.locator('button[aria-label="Toggle science lens"]').click();
      // Give the layers panel time to slide in + arrows to render.
    },
    settleMs: 1500,
  },
  {
    file: '12-flight-director.png',
    path: '/fly?mission=curiosity',
    setup: async (page) => {
      await page.locator('button[aria-label="Toggle science lens"]').click();
      const scrub = page.locator('input[type="range"][aria-label*="timeline" i]');
      await scrub.fill('0.5');
      // Wait for FlightDirectorBanner to materialise after lens toggle.
      await page
        .locator('[data-testid="flight-director-banner"]')
        .waitFor({ state: 'visible', timeout: 5_000 });
    },
    settleMs: 1000,
  },
  {
    file: '13-mission-sandbox.png',
    path: '/plan',
    setup: async (page) => {
      // Wait for the porkchop to compute before clicking cells.
      const canvas = page.locator('canvas.porkchop');
      await canvas.waitFor({ state: 'visible' });
      await page.waitForTimeout(2000);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('porkchop canvas not laid out');
      // Pick two cells in the cheap teal lobe.
      await canvas.click({ position: { x: box.width * 0.45, y: box.height * 0.55 } });
      await page.waitForTimeout(400);
      const pinBtn = page.getByRole('button', { name: /pin this cell/i });
      if (await pinBtn.isVisible().catch(() => false)) {
        await pinBtn.click();
      }
      await canvas.click({ position: { x: box.width * 0.6, y: box.height * 0.45 } });
    },
    settleMs: 1000,
  },

  // ── 14-15 — provenance pages ──────────────────────────────────────
  { file: '14-credits.png', path: '/credits', settleMs: 600 },
  { file: '15-library.png', path: '/library', settleMs: 600 },

  // ── 16-18 — locale showcases (right-to-left, CJK, Devanagari) ─────
  { file: 'locale-ja.png', path: '/explore?lang=ja', settleMs: 1500 },
  { file: 'locale-ar.png', path: '/explore?lang=ar', settleMs: 1500 },
  { file: 'locale-zh-CN.png', path: '/explore?lang=zh-CN', settleMs: 1500 },
];

async function waitForServer(url: string, attempts = 30): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // server not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`vite preview did not become ready at ${url}`);
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });

  // Spawn vite preview against the existing build directory.
  console.log('▶ spawning vite preview…');
  const preview: ChildProcess = spawn(
    'npx',
    ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  preview.stdout?.pipe(process.stdout);
  preview.stderr?.pipe(process.stderr);

  try {
    await waitForServer(ORIGIN);

    console.log('▶ launching chromium…');
    const browser = await chromium.launch();
    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      viewport: VIEWPORT,
      // Reduce-motion freezes simT on /explore + /fly so click-positioned
      // bodies stay where the script expects.
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    for (const shot of SHOTS) {
      const out = resolve(OUT_DIR, shot.file);
      console.log(`  → ${shot.file}  (${shot.path})`);
      try {
        await page.goto(ORIGIN + shot.path, { waitUntil: 'networkidle' });
        if (shot.setup) await shot.setup(page);
        await page.waitForTimeout(shot.settleMs ?? 600);
        await page.screenshot({ path: out, fullPage: false });
      } catch (err) {
        console.error(`    ✘ failed: ${(err as Error).message}`);
      }
    }

    await context.close();
    await browser.close();
    console.log('✓ done');
  } finally {
    preview.kill('SIGTERM');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
