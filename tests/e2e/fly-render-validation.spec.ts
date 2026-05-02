import { test, expect } from '@playwright/test';

/**
 * Layers 3 + 4 of the /fly rendering validation strategy.
 *
 * The /fly screen exposes a hidden DOM element (`data-testid="fly-render-state"`)
 * that mirrors the live spacecraft + arc + HUD state into data-* attributes.
 * Playwright reads those attributes and asserts:
 *
 *   Layer 3 (arc-as-drawn):
 *     - The outbound arc has the expected vertex count (201 points).
 *     - The vertex-sample hash is non-empty + stable across 3D ↔ 2D toggle.
 *     - The hash does NOT change when the simDay scrubber moves (geometry
 *       is constant; only the spacecraft slides along it).
 *
 *   Layer 4 (HUD-matches-arc):
 *     - heliocentricKms matches vis-viva on the spacecraft's heliocentric
 *       radius using the Earth-Mars Hohmann semi-major axis.
 *     - signalDelayMin matches distFromEarthAu × AU_TO_LMIN.
 *     - All readouts are finite numbers (no NaN, no ±∞).
 *
 * Six representative missions covering the major shape classes:
 *   curiosity (energetic Mars), perseverance (energetic Mars),
 *   mariner4 (high-V∞ flyby), mars3 (sparse data),
 *   apollo11 (Moon, short transit), apollo17 (Moon round-trip).
 *
 * The test file is deliberately self-contained — it does not import
 * from src/lib because the e2e harness runs without Vite's JSON loader.
 * Inlined constants match the canonical values in fly-physics-constants.ts.
 */

// Constants (mirror src/lib/fly-physics-constants.ts) ----------------------
const MU_SUN_AU3_YR2 = 4 * Math.PI * Math.PI;
const AU_PER_YR_TO_KMS = 4.7404;
const AU_TO_KM = 149_597_870.7;
const C_LIGHT_KM_S = 299_792.458;
const R_EARTH_AU = 1.0;
const R_MARS_AU = 1.52366;
const A_TRANSFER_MARS = (R_EARTH_AU + R_MARS_AU) / 2;

// Tolerances ---------------------------------------------------------------
const HELIO_TOL_KMS = 0.02; // hud rounds to 0.0001, our compute also; gap is float drift
const SIGNAL_TOL_MIN = 0.05;
const POS_TOL_AU = 1e-4;

interface MissionCase {
  id: string;
  destDir: 'mars' | 'moon';
  isMoon: boolean;
}

const CASES: MissionCase[] = [
  { id: 'curiosity', destDir: 'mars', isMoon: false },
  { id: 'perseverance', destDir: 'mars', isMoon: false },
  { id: 'mariner4', destDir: 'mars', isMoon: false },
  { id: 'mars3', destDir: 'mars', isMoon: false },
  { id: 'apollo11', destDir: 'moon', isMoon: true },
  { id: 'apollo17', destDir: 'moon', isMoon: true },
];

interface RenderState {
  scX: number;
  scZ: number;
  scProgress: number;
  scPhase: string;
  outLen: number;
  retLen: number;
  outVertexHash: string;
  helioKms: number;
  distEarthAu: number;
  distMarsAu: number;
  signalDelayMin: number;
  met: number;
  simDay: number;
  view: string;
}

async function readRenderState(page: import('@playwright/test').Page): Promise<RenderState> {
  const hook = page.locator('[data-testid="fly-render-state"]');
  await expect(hook).toBeAttached({ timeout: 10_000 });
  const attrs = await hook.evaluate((el) => ({
    scX: el.getAttribute('data-sc-x'),
    scZ: el.getAttribute('data-sc-z'),
    scProgress: el.getAttribute('data-sc-progress'),
    scPhase: el.getAttribute('data-sc-phase'),
    outLen: el.getAttribute('data-out-len'),
    retLen: el.getAttribute('data-ret-len'),
    outVertexHash: el.getAttribute('data-out-vertex-hash'),
    helioKms: el.getAttribute('data-helio-kms'),
    distEarthAu: el.getAttribute('data-dist-earth-au'),
    distMarsAu: el.getAttribute('data-dist-mars-au'),
    signalDelayMin: el.getAttribute('data-signal-delay-min'),
    met: el.getAttribute('data-met'),
    simDay: el.getAttribute('data-sim-day'),
    view: el.getAttribute('data-view'),
  }));
  return {
    scX: Number(attrs.scX),
    scZ: Number(attrs.scZ),
    scProgress: Number(attrs.scProgress),
    scPhase: attrs.scPhase ?? '',
    outLen: Number(attrs.outLen),
    retLen: Number(attrs.retLen),
    outVertexHash: attrs.outVertexHash ?? '',
    helioKms: Number(attrs.helioKms),
    distEarthAu: Number(attrs.distEarthAu),
    distMarsAu: Number(attrs.distMarsAu),
    signalDelayMin: Number(attrs.signalDelayMin),
    met: Number(attrs.met),
    simDay: Number(attrs.simDay),
    view: attrs.view ?? '',
  };
}

function visViva(rAu: number, aAu: number): number {
  return Math.sqrt(MU_SUN_AU3_YR2 * (2 / rAu - 1 / aAu)) * AU_PER_YR_TO_KMS;
}

function signalDelayFromDistAu(distAu: number): number {
  return (distAu * AU_TO_KM) / C_LIGHT_KM_S / 60;
}

test.describe('/fly render validation — Layer 3 (arc geometry)', () => {
  for (const c of CASES) {
    test(`${c.id}: outbound arc hash is stable + non-empty`, async ({ page }) => {
      await page.goto(`/fly?mission=${c.id}`);
      // Wait for hydration: mission name HUD text settles.
      await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({
        timeout: 10_000,
      });
      const s = await readRenderState(page);
      expect(s.outLen).toBe(201);
      expect(s.outVertexHash.length).toBeGreaterThan(0);
      // Hash format: 11 vertices (5 + 1 + 5) separated by '|', each
      // "x,z" with 6-decimal floats. So 10 separators.
      expect(s.outVertexHash.split('|').length).toBe(11);
      // All position + HUD numbers finite.
      for (const v of [
        s.scX,
        s.scZ,
        s.helioKms,
        s.distEarthAu,
        s.distMarsAu,
        s.signalDelayMin,
        s.met,
      ]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    });

    test(`${c.id}: 3D ↔ 2D toggle keeps hash identical (math invariant across views)`, async ({
      page,
    }) => {
      await page.goto(`/fly?mission=${c.id}`);
      await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({
        timeout: 10_000,
      });
      const s3d = await readRenderState(page);
      expect(s3d.view).toBe('3d');
      // Toggle to 2D.
      await page.getByRole('button', { name: /^2d$/i }).click();
      await expect(page.getByRole('button', { name: /^3d$/i })).toBeVisible();
      const s2d = await readRenderState(page);
      expect(s2d.view).toBe('2d');
      // Same arc geometry across views.
      expect(s2d.outVertexHash).toBe(s3d.outVertexHash);
      expect(s2d.outLen).toBe(s3d.outLen);
    });

    test(`${c.id}: scrubbing simDay leaves arc hash unchanged (only spacecraft slides)`, async ({
      page,
    }) => {
      await page.goto(`/fly?mission=${c.id}`);
      await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({
        timeout: 10_000,
      });
      // Pause first so the play loop isn't fighting the scrubber value.
      await page.getByRole('button', { name: /pause/i }).click();
      const before = await readRenderState(page);
      // Move the scrubber to mid-mission.
      const scrub = page.locator('input[type="range"][aria-label*="timeline" i]');
      await scrub.fill('0.5');
      // Allow the rAF loop to commit the new derived state to the hook.
      // Use a small absolute threshold (0.05 days = ~1 hour) so this
      // works for short-transit Moon missions (Apollo 11 ≈ 3 days)
      // and long Mars cruises alike.
      await page.waitForFunction(
        (prevSimDay) => {
          const el = document.querySelector('[data-testid="fly-render-state"]');
          const cur = Number(el?.getAttribute('data-sim-day'));
          return Number.isFinite(cur) && Math.abs(cur - prevSimDay) > 0.05;
        },
        before.simDay,
        { timeout: 5_000 },
      );
      const after = await readRenderState(page);
      // Geometry hash unchanged.
      expect(after.outVertexHash).toBe(before.outVertexHash);
      expect(after.outLen).toBe(before.outLen);
      // Spacecraft moved.
      const scMoved = Math.hypot(after.scX - before.scX, after.scZ - before.scZ);
      expect(scMoved).toBeGreaterThan(0);
    });
  }
});

test.describe('/fly render validation — Layer 4 (HUD matches arc)', () => {
  for (const c of CASES) {
    test(`${c.id}: HUD readouts derive consistently from spacecraft position`, async ({
      page,
    }) => {
      await page.goto(`/fly?mission=${c.id}`);
      await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({
        timeout: 10_000,
      });
      // Pause + scrub to a known mid-mission point so values are
      // stable when read.
      await page.getByRole('button', { name: /pause/i }).click();
      await page.locator('input[type="range"][aria-label*="timeline" i]').fill('0.4');
      // Wait for state propagation.
      await page.waitForFunction(
        () => {
          const el = document.querySelector('[data-testid="fly-render-state"]');
          return el?.getAttribute('data-sc-phase') === 'outbound';
        },
        { timeout: 5_000 },
      );
      const s = await readRenderState(page);

      // Layer 4a: heliocentric speed.
      //   Mars-bound: vis-viva on the local arc radius using the
      //               Earth-Mars Hohmann semi-major axis.
      //   Moon-mode:  the spacecraft co-orbits with Earth around the
      //               Sun; /fly evaluates vis-viva at r=a=R_EARTH_AU
      //               so HELIO ΔV reads ~29.78 km/s consistently
      //               throughout the cislunar transit (real Apollo
      //               heliocentric speed varied by ~1 km/s).
      const scR = c.isMoon ? R_EARTH_AU : Math.hypot(s.scX, s.scZ);
      const aTransfer = c.isMoon ? R_EARTH_AU : A_TRANSFER_MARS;
      const predictedHelio = visViva(scR, aTransfer);
      expect(Math.abs(s.helioKms - predictedHelio)).toBeLessThan(HELIO_TOL_KMS);

      // Layer 4b: signal delay derives from dist-from-Earth.
      const predictedDelay = signalDelayFromDistAu(s.distEarthAu);
      expect(Math.abs(s.signalDelayMin - predictedDelay)).toBeLessThan(SIGNAL_TOL_MIN);

      // Layer 4c: dist-from-Earth is non-negative + bounded.
      //   Mars-bound caps at ~1.5 AU (Earth-Mars Hohmann reach).
      //   Moon-mode caps at ~0.003 AU (real Earth-Moon distance).
      expect(s.distEarthAu).toBeGreaterThanOrEqual(0);
      const distEarthCap = c.isMoon ? 0.005 : 3.0;
      expect(s.distEarthAu).toBeLessThan(distEarthCap);
    });
  }
});

test.describe('/fly render validation — Layer 5 (visual screenshot pass)', () => {
  // Saves PNGs under /tmp/fly-render-validation/ for human review. The
  // test itself only asserts that no console errors fire during capture
  // — visual regression is judged by eyeballing the saved images.
  const SHOTS_DIR = '/tmp/fly-render-validation';

  for (const c of CASES) {
    test(`${c.id}: capture 3D at dep / mid / late + 2D at mid (4 shots)`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() !== 'error') return;
        const text = msg.text();
        // The data-loader probes scenarios/ → mars/ → moon/ in order
        // and emits a 404 for each miss before resolving. Those aren't
        // real errors — ignore them in this sanity gate.
        if (/404 \(Not Found\)/.test(text)) return;
        consoleErrors.push(text);
      });
      await page.goto(`/fly?mission=${c.id}`);
      await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({
        timeout: 10_000,
      });
      const hook = page.locator('[data-testid="fly-render-state"]');
      const scrub = page.locator('input[type="range"][aria-label*="timeline" i]');
      const viewToggle = page.locator('button.toggle');

      // Capture 2D first (before pausing/scrubbing) so the view-toggle
      // click happens while the page is in its fresh post-hydration
      // state — heavy scrubbing before a toggle click was racing the
      // rAF loop and the click sometimes didn't register.
      await viewToggle.click();
      await expect(hook).toHaveAttribute('data-view', '2d', { timeout: 5_000 });
      await page.getByRole('button', { name: /pause/i }).click();
      await scrub.fill('0.5');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS_DIR}/${c.id}-2d-mid.png`, fullPage: false });

      // Toggle back to 3D for the three timestamps.
      await viewToggle.click();
      await expect(hook).toHaveAttribute('data-view', '3d', { timeout: 5_000 });

      // 3D depDay (arcProgress = 0).
      await scrub.fill('0');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS_DIR}/${c.id}-3d-dep.png`, fullPage: false });

      // 3D midTransit.
      await scrub.fill('0.5');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS_DIR}/${c.id}-3d-mid.png`, fullPage: false });

      // 3D late (just before arrival so the trail + spacecraft are
      // both visible).
      await scrub.fill('0.95');
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${SHOTS_DIR}/${c.id}-3d-late.png`, fullPage: false });

      // No console errors during capture (sanity).
      expect(consoleErrors, `console errors during ${c.id} capture`).toEqual([]);
    });
  }
});

test.describe('/fly render validation — meta', () => {
  test('hook exists on default /fly with finite values', async ({ page }) => {
    await page.goto('/fly');
    await expect(page.locator('[data-testid="mission-name"]')).toBeVisible({
      timeout: 10_000,
    });
    const s = await readRenderState(page);
    expect(s.outLen).toBeGreaterThan(0);
    expect(s.outVertexHash.length).toBeGreaterThan(0);
    expect(Number.isFinite(s.helioKms)).toBe(true);
  });
});
