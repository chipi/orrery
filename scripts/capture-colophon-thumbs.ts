/**
 * capture-colophon-thumbs.ts — captures the WebP thumbnails the /colophon
 * page shows for live-rendered 3D models + data-visualizations.
 *
 * Unlike scripts/capture-screenshots.ts (full-frame README PNGs), this
 * writes tightly-framed 800×560 WebPs to static/images/colophon/, matching
 * the 6 hand-captured originals (model-iss/earth/fly, viz-*).
 *
 * It connects to an ALREADY-RUNNING dev server (Marko keeps one up) rather
 * than spawning its own — pass the origin via BASE, default http://localhost:5373.
 * Run a subset with SUBSET=models  (the /dev/models gallery) or SUBSET=scenes
 * (live-route overlays that aren't isolable meshes).
 *
 *   BASE=http://localhost:5373 npx tsx scripts/capture-colophon-thumbs.ts
 *
 * Re-runnable + deterministic (reduced-motion). Output committed to the repo.
 */
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, type Page, type Locator, devices } from '@playwright/test';
import sharp from 'sharp';

const BASE = process.env.BASE ?? 'http://localhost:5373';
const SUBSET = process.env.SUBSET ?? 'all'; // all | craft | scenes
const OUT_DIR = resolve(import.meta.dirname, '..', 'static', 'images', 'colophon');
const VIEWPORT = { width: 1280, height: 800 };
const THUMB = { w: 800, h: 560 };

/** Encode a PNG buffer to a cover-cropped 800×560 WebP at the given basename. */
async function writeThumb(png: Buffer, name: string): Promise<void> {
  const out = resolve(OUT_DIR, `${name}.webp`);
  await sharp(png)
    .resize(THUMB.w, THUMB.h, { fit: 'cover', position: 'centre' })
    .webp({ quality: 82 })
    .toFile(out);
  console.log(`  ✓ ${name}.webp`);
}

// ── Every distinct original mesh, rendered isolated on /dev/models. Each
//    card carries data-model-id="<family>-<id>"; we crop its canvas. The
//    `craft` family keeps the legacy craft-<id> filename; everything else
//    is model-<family>-<id>.
function thumbName(modelId: string): string {
  return modelId.startsWith('craft-') ? modelId : `model-${modelId}`;
}

async function captureModels(page: Page): Promise<void> {
  console.log('▶ /dev/models — every isolated mesh');
  await page.goto(`${BASE}/dev/models`, { waitUntil: 'networkidle' });
  // The shared WebGL canvas is position:fixed full-viewport behind the grid,
  // so the global nav/footer composite into a card's screenshot when it scrolls
  // under them. Hide site chrome (visibility, no reflow) before capturing.
  await page.addStyleTag({
    content: 'nav[aria-label], footer.site-footer { visibility: hidden !important; }',
  });
  // The shared renderer mounts one rAF after layout; give it a beat.
  await page.waitForTimeout(1500);
  const cards = page.locator('.grid .card[data-model-id]');
  await cards.first().waitFor({ state: 'visible' });
  const n = await cards.count();
  console.log(`  ${n} cards present`);
  for (let i = 0; i < n; i++) {
    const card = cards.nth(i);
    const modelId = (await card.getAttribute('data-model-id')) ?? `card-${i}`;
    const canvas = card.locator('.canvas');
    // The render loop skips off-screen cards (scissor), so scroll it into
    // view and wait a couple of frames for the shared canvas to paint it.
    await canvas.scrollIntoViewIfNeeded();
    await page.waitForTimeout(450);
    const png = await canvas.screenshot();
    await writeThumb(png, thumbName(modelId));
  }
}

// ── Per-route scene subjects ──────────────────────────────────────────
type Scene = {
  file: string;
  path: string;
  setup?: (page: Page) => Promise<void>;
  /** Locator to screenshot instead of the full viewport (tighter frame). */
  clip?: (page: Page) => Locator;
  settleMs?: number;
};

const selectSurfaceSite = (id: string) => async (page: Page) => {
  await page.evaluate((siteId) => {
    (
      window as unknown as { __surfaceSceneSelectSite?: (s: string) => void }
    ).__surfaceSceneSelectSite?.(siteId);
  }, id);
};

const click = async (page: Page, sel: string) => {
  const el = page.locator(sel).first();
  if (await el.count()) await el.click({ timeout: 4000 }).catch(() => {});
};
const toggleLens = (page: Page) => click(page, 'button[aria-label="Toggle science lens"]');

// These subjects are procedural overlays / 2D viz with no single isolable
// mesh, so we capture the live scene (global nav + footer hidden for a
// cleaner frame) instead of a /dev/models card.
// /explore persists/defaults can land in 2D; force 3D so the starfield +
// skydome are actually in frame. The toggle reads "3D" when currently 2D.
const force3dExplore = async (page: Page) => {
  const tgl = page.locator('[data-testid="explore-view-toggle"]').first();
  if ((await tgl.count()) && (await tgl.textContent())?.trim() === '3D') {
    await tgl.click().catch(() => {});
    await page.waitForTimeout(700);
  }
};

const SCENES: Scene[] = [
  // Layered star fields + skydome — Explore 3D background.
  { file: 'model-starfield', path: '/explore', setup: force3dExplore, settleMs: 1800 },
  // Sun lens flare + galaxies — the central sun on Explore throws the flare.
  { file: 'model-sunflare', path: '/explore', setup: force3dExplore, settleMs: 1800 },
  // Iconic mission trajectories — turn the "ICONIC MISSIONS" paths layer on
  // (the 2D system map reads the arcs most clearly).
  {
    file: 'model-trajectories',
    path: '/explore',
    setup: async (page) => {
      await click(page, '[data-testid="layer-paths"]');
    },
    settleMs: 1600,
  },
  // Orbit overlays — SOI shells / conic arcs / gravity arrows. Enter the
  // simulation from the briefing, scrub to mid-flight, then the science lens.
  {
    file: 'model-orbit-overlay',
    path: '/fly?mission=apollo11',
    setup: async (page) => {
      await page
        .getByText(/proceed to simulation/i)
        .first()
        .click({ timeout: 5000 })
        .catch(() => {});
      await page.waitForTimeout(1200);
      const scrub = page.locator('input[type="range"][aria-label*="timeline" i]').first();
      if (await scrub.count()) await scrub.fill('0.5').catch(() => {});
      await toggleLens(page);
    },
    settleMs: 1800,
  },
  // Microgravity axes — the labelled local-frame arrows under the ISS lens.
  {
    file: 'model-microgravity',
    path: '/iss',
    setup: async (page) => {
      await toggleLens(page);
    },
    settleMs: 1800,
  },
  // Orbiter rings + marker halos — select Hubble on Earth for altitude
  // rings + selection halo.
  {
    file: 'model-orbit-rings',
    path: '/earth',
    setup: selectSurfaceSite('hubble'),
    settleMs: 1500,
  },
  // 3D text-label sprites — billboarded name tags on Earth's satellites.
  { file: 'model-textlabels', path: '/earth', settleMs: 1500 },
  // Surface-map nation legend — flip Moon to 2D for the flat map + agency key.
  {
    file: 'viz-nation-legend',
    path: '/moon',
    setup: async (page) => {
      await click(page, '[data-testid="mode-toggle"]');
    },
    settleMs: 1600,
  },
];

async function captureScenes(page: Page): Promise<void> {
  for (const s of SCENES) {
    console.log(`▶ ${s.file}  (${s.path})`);
    try {
      await page.goto(BASE + s.path, { waitUntil: 'networkidle' });
      await page.addStyleTag({
        content: 'nav[aria-label], footer.site-footer { visibility: hidden !important; }',
      });
      if (s.setup) await s.setup(page);
      await page.waitForTimeout(s.settleMs ?? 800);
      const png = s.clip
        ? await s.clip(page).screenshot()
        : await page.screenshot({ fullPage: false });
      await writeThumb(png, s.file);
    } catch (err) {
      console.error(`  ✘ ${s.file}: ${(err as Error).message}`);
    }
  }
}

async function main(): Promise<void> {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    viewport: VIEWPORT,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    if (SUBSET === 'all' || SUBSET === 'models') await captureModels(page);
    if (SUBSET === 'all' || SUBSET === 'scenes') await captureScenes(page);
  } finally {
    await context.close();
    await browser.close();
  }
  console.log('✓ done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
