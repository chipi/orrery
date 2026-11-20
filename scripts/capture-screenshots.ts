/**
 * Capture all README + user-guide screenshots from the production build (the GH1 set, plan D7).
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
import { pick, readWorkspaceEnv } from './workspace/env.mjs';

// Same port as the e2e suite (E2E_PORT, else this checkout's .env.workspace,
// else 4173), so a parallel worktree's capture never reuses another's preview.
const PORT = Number(pick(process.env.E2E_PORT, readWorkspaceEnv().E2E_PORT, '4173'));
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

/** /fly opens on a mission card: skip it (straight to the cruise) or start the launch. */
async function flyOpening(page: Page, choice: 'skip' | 'launch'): Promise<void> {
  const btn = page.locator(`[data-testid="fly-opening-${choice}"]`);
  await btn.click({ timeout: 30_000 });
}
async function scrub(page: Page, at: string): Promise<void> {
  await page.locator('input[type="range"][aria-label*="timeline" i]').fill(at);
}
const lens = (page: Page) => page.locator('button[aria-label="Toggle science lens"]').click();

// The GH1 set (2026-11-16): the README's 23 shots, then the six the user guide uses
// (docs/guides/user-guide.md). Desktop 1280x800, reduced motion. Locales by path (/ja/…).
const SHOTS: Shot[] = [
  // ── README hero + landing ───────────────────────────────────────────
  { file: 'hero-explore-3d.png', path: '/explore', settleMs: 1500 },
  { file: '00-landing.png', path: '/', settleMs: 600 },

  // ── README table, row by row ────────────────────────────────────────
  { file: '01-explore.png', path: '/explore', settleMs: 1500 },
  { file: '02-plan.png', path: '/plan', settleMs: 2500 },
  {
    file: '03-fly-curiosity.png',
    path: '/fly?mission=curiosity',
    setup: async (page) => {
      await flyOpening(page, 'skip');
      await scrub(page, '0.5');
    },
    settleMs: 1000,
  },
  {
    // The launch director at T+00:10: Saturn V clearing the LC-39A tower, the HUD and the flight plan.
    file: '19-fly-launch-director.png',
    path: '/fly?mission=apollo11',
    setup: async (page) => {
      await flyOpening(page, 'launch');
      await page
        .locator('[data-testid="launch-scene"]')
        .waitFor({ state: 'visible', timeout: 30_000 });
      // Reduced motion starts /fly paused: press play. The countdown runs first, so wait for
      // liftoff (the HUD clock reads T+), then 10 s of climb.
      const play = page.getByRole('button', { name: /^play$/i }).first();
      if (await play.isVisible().catch(() => false)) await play.click();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[data-testid="launch-scene"] .clock .met')
            ?.textContent?.includes('T+'),
        undefined,
        { timeout: 60_000 },
      );
      await page.waitForTimeout(10_000);
    },
    settleMs: 500,
  },
  {
    // ADR-058 cislunar view: Artemis II mid-mission, the free-return loop past the far side.
    file: '03-fly-artemis2-cislunar.png',
    path: '/fly?mission=artemis2',
    setup: async (page) => {
      await flyOpening(page, 'skip');
      await scrub(page, '0.5');
    },
    settleMs: 1500,
  },
  { file: '04-missions.png', path: '/missions', settleMs: 800 },
  { file: '16-fleet-catalogue.png', path: '/fleet', settleMs: 1000 },
  { file: '17-programs-catalogue.png', path: '/programs', settleMs: 1000 },
  { file: '18-launches-catalogue.png', path: '/missions/launches', settleMs: 1500 },
  // The Earth globe as it opens: the orbit ruler and the layer chips.
  { file: '05-earth.png', path: '/earth', settleMs: 2500 },
  { file: '06-moon.png', path: '/moon', settleMs: 1500 },
  // The Apollo 17 site: its panel open and the LRV traverse drawn on the LROC crop.
  { file: '22-moon-traverse.png', path: '/moon?site=apollo17', settleMs: 6000 },
  { file: '07-mars.png', path: '/mars', settleMs: 1500 },
  { file: '08-iss.png', path: '/iss', settleMs: 1800 },
  { file: '09-tiangong.png', path: '/tiangong', settleMs: 1800 },
  {
    // M42's panel on its IN THE SKY tab (UXD-049), a fixed time zone for the month row.
    file: '20-explore-in-the-sky.png',
    path: '/explore?deepsky=m42',
    setup: async (page) => {
      await page.getByRole('tab', { name: /in the sky/i }).click({ timeout: 30_000 });
    },
    settleMs: 1500,
  },
  { file: '10-science-landing.png', path: '/science', settleMs: 600 },
  {
    // The Science Lens on /iss: the orbital-regime card and the microgravity frame.
    file: '11-science-lens-iss.png',
    path: '/iss',
    setup: lens,
    settleMs: 2000,
  },
  { file: '21-gallery.png', path: '/gallery', settleMs: 1500 },
  { file: '14-credits.png', path: '/credits', settleMs: 600 },
  { file: '15-library.png', path: '/library', settleMs: 600 },

  // ── user guide ──────────────────────────────────────────────────────
  {
    file: '03-fly-apollo11.png',
    path: '/fly?mission=apollo11',
    setup: async (page) => {
      await flyOpening(page, 'skip');
      await scrub(page, '0.25');
    },
    settleMs: 1000,
  },
  { file: '10-science-section.png', path: '/science/orbits/keplers-laws', settleMs: 600 },
  {
    file: '12-flight-director.png',
    path: '/fly?mission=curiosity',
    setup: async (page) => {
      await flyOpening(page, 'skip');
      await lens(page);
      await scrub(page, '0.5');
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
      const canvas = page.locator('canvas.porkchop');
      await canvas.waitFor({ state: 'visible' });
      await page.waitForTimeout(2000);
      const box = await canvas.boundingBox();
      if (!box) throw new Error('porkchop canvas not laid out');
      await canvas.click({ position: { x: box.width * 0.45, y: box.height * 0.55 } });
      await page.waitForTimeout(400);
      const pinBtn = page.getByRole('button', { name: /pin this cell/i });
      if (await pinBtn.isVisible().catch(() => false)) await pinBtn.click();
      await canvas.click({ position: { x: box.width * 0.6, y: box.height * 0.45 } });
    },
    settleMs: 1000,
  },
  { file: 'mission-panel.png', path: '/missions?id=apollo11', settleMs: 1200 },
  { file: 'locale-ja.png', path: '/ja/explore', settleMs: 1500 },
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
      timezoneId: 'Europe/Berlin',
      // Reduce-motion freezes simT on /explore + /fly so click-positioned
      // bodies stay where the script expects.
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    // `tsx scripts/capture-screenshots.ts 05-earth.png 19-fly-launch-director.png` re-takes only those.
    const only = process.argv.slice(2);
    for (const shot of SHOTS.filter((s) => only.length === 0 || only.includes(s.file))) {
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
