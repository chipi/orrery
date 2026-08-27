import { test, expect, type Page } from '@playwright/test';
import { EPISODE_STAGES, CURATOR_FULL_TOUR } from '../../src/lib/audio-tour';

/**
 * Comprehensive interactive-tour coverage — the "built-in suspenders" pass
 * (post-0.8.0 audit). The lighter guards leave gaps this spec closes:
 *
 *   - audio-tour.test.ts (unit) proves every `data-audio-stage` NAME exists in
 *     source, but not that it RENDERS in the live DOM when its stage fires.
 *   - audio-tour-stages.spec.ts drives only the `pale-blue-dot` pilot on `/`.
 *   - tour-stage-execution.spec.ts covers `/explore` + `/earth` panel cycles.
 *
 * Here we drive EVERY staged episode's FULL timeline end-to-end via the
 * `__orreryAudio` position hook. Because the executor actually runs each stage
 * (a `click` opens a panel, enters panorama, toggles a layer), later stages
 * that target the just-opened element only resolve if the whole interactive
 * chain works. The executor logs `[audio-tour] stage skipped — no element
 * matches selector ...` whenever a target is missing at fire time; a clean
 * playthrough with ZERO such warnings is the end-to-end proof. This covers:
 *   • every one of the 32 staged episodes and their full cue lists
 *   • conditional anchors (panel tabs, panorama, filter-gated grids)
 *   • the moon/mars PANORAMA chain (stand-at-site → tour-play → exit)
 *   • intra-episode `navigate` actions (URL-affordance demos)
 *   • cross-route auto-navigation when the active episode's route changes
 *
 * Capacitor note: the iOS/Android shells run this exact web bundle in a
 * WKWebView/WebView, so this DOM-level coverage IS the on-device tour-logic
 * coverage; only the native chrome (splash, haptics) is shell-specific and is
 * a manual smoke, not automatable here.
 */

const SKIP_WARNING = '[audio-tour] stage skipped';

async function waitForHook(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __orreryAudio?: { setPosition?: unknown } }).__orreryAudio
        ?.setPosition === 'function',
    undefined,
    { timeout: 20_000 },
  );
}

/** Load the registry and return an episode-id → route map. */
async function episodeRoutes(page: Page): Promise<Record<string, string>> {
  return page.evaluate(async () => {
    const w = window as unknown as {
      __orreryAudio: {
        registry: { load?: () => Promise<void>; episodes: Array<{ id: string; route: string }> };
      };
    };
    await w.__orreryAudio.registry.load?.();
    const map: Record<string, string> = {};
    for (const e of w.__orreryAudio.registry.episodes) map[e.id] = e.route;
    return map;
  });
}

/** Pin the active episode so the stage-fire loop stays on it (defeats the
 *  afterNavigate auto-follow that intra-episode `navigate` stages would trip).
 *  Awaits registry.load() first — each full-page `goto` re-instantiates the
 *  registry singleton empty, so the lookup must wait for it to reload. */
async function pinEpisode(page: Page, id: string): Promise<boolean> {
  return page.evaluate(async (epId) => {
    const w = window as unknown as {
      __orreryAudio: {
        state: { currentEpisode: unknown; tourActive: boolean; positionSec: number };
        registry: { load?: () => Promise<void>; episodes: Array<{ id: string }> };
      };
    };
    await w.__orreryAudio.registry.load?.();
    const ep = w.__orreryAudio.registry.episodes.find((e) => e.id === epId);
    if (!ep) return false;
    w.__orreryAudio.state.currentEpisode = ep;
    return true;
  }, id);
}

async function setPosition(page: Page, sec: number): Promise<void> {
  await page.evaluate(
    (s) =>
      (
        window as unknown as { __orreryAudio?: { setPosition: (n: number) => void } }
      ).__orreryAudio?.setPosition(s),
    sec,
  );
}

test.describe('interactive tour — full-timeline coverage (every episode)', () => {
  test('every staged episode plays its full cue list with zero missing targets', async ({
    page,
  }) => {
    test.setTimeout(300_000);

    const skips: string[] = [];
    page.on('console', (msg) => {
      const t = msg.text();
      if (t.includes(SKIP_WARNING)) skips.push(t);
    });

    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForHook(page);
    const routes = await episodeRoutes(page);

    const episodeIds = Object.keys(EPISODE_STAGES);
    const failures: Array<{ episode: string; skips: string[] }> = [];

    for (const id of episodeIds) {
      const route = routes[id];
      expect(route, `episode "${id}" must map to a real route in the registry`).toBeTruthy();

      await page.goto(route, { waitUntil: 'networkidle' });
      await waitForHook(page);
      const pinned = await pinEpisode(page, id);
      expect(pinned, `episode "${id}" must exist in the registry`).toBe(true);

      const before = skips.length;
      const stages = [...EPISODE_STAGES[id]].sort((a, b) => a.at_sec - b.at_sec);
      for (const stage of stages) {
        await setPosition(page, stage.at_sec);
        // Let the fire-loop run + DOM settle: a `click` stage that opens a
        // panel / enters panorama must finish mounting before the next stage
        // (a tab, a close, an exit) queries its target. Station module panels
        // (iss/tiangong) + surface panoramas are the slowest to mount, so
        // click/navigate get a generous settle; flash/scroll/cue are cheap.
        await page.waitForTimeout(
          stage.action === 'click' || stage.action === 'navigate' ? 800 : 200,
        );
        // Re-pin: an intra-episode `navigate` can trip afterNavigate's
        // auto-follow and swap the active episode out from under us.
        if (stage.action === 'navigate') await pinEpisode(page, id);
      }
      const episodeSkips = skips.slice(before);
      if (episodeSkips.length) failures.push({ episode: id, skips: episodeSkips });
    }

    expect(
      failures,
      `Tour stages with no live DOM target:\n${failures
        .map((f) => `  ${f.episode}:\n${f.skips.map((s) => `    - ${s}`).join('\n')}`)
        .join('\n')}`,
    ).toEqual([]);
  });

  test('activating an episode on a different route auto-navigates to it', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await waitForHook(page);
    const routes = await episodeRoutes(page);

    // Pick two curator episodes whose routes differ, and drive the tour from
    // one to the other — the overlay should `goto` the second's route.
    const a = CURATOR_FULL_TOUR.find((id) => routes[id] && routes[id] !== '/');
    const b = CURATOR_FULL_TOUR.find(
      (id) => routes[id] && routes[id] !== '/' && routes[id] !== routes[a!],
    );
    expect(a, 'need a non-root curator episode').toBeTruthy();
    expect(b, 'need a second curator episode on a different route').toBeTruthy();

    await page.evaluate(
      ({ ids }) => {
        const w = window as unknown as {
          __orreryAudio: {
            state: { tourActive: boolean; tourSequence: string[]; currentEpisode: unknown };
            registry: { episodes: Array<{ id: string }> };
          };
        };
        w.__orreryAudio.state.tourActive = true;
        w.__orreryAudio.state.tourSequence = ids;
        const ep = w.__orreryAudio.registry.episodes.find((e) => e.id === ids[0]);
        w.__orreryAudio.state.currentEpisode = ep;
      },
      { ids: [a!, b!] },
    );
    await page.waitForURL((url) => url.pathname.endsWith(routes[a!]), { timeout: 15_000 });

    // Advance to the second episode → the overlay follows its route.
    await page.evaluate((secondId) => {
      const w = window as unknown as {
        __orreryAudio: {
          state: { currentEpisode: unknown };
          registry: { episodes: Array<{ id: string }> };
        };
      };
      const ep = w.__orreryAudio.registry.episodes.find((e) => e.id === secondId);
      w.__orreryAudio.state.currentEpisode = ep;
    }, b!);
    await page.waitForURL((url) => url.pathname.endsWith(routes[b!]), { timeout: 15_000 });
  });
});
