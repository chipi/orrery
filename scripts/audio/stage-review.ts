#!/usr/bin/env tsx
/**
 * Audio-tour stage review sheets: for every stage of an episode, what is on screen just after it
 * fires and what the narration says at that moment — the "re-listen" check that tour-coverage
 * (targets exist) and suggest-stages (proposals) don't make.
 *
 *   npx vite preview --port 4193 &                       # a built site (npm run build first)
 *   npx tsx scripts/audio/stage-review.ts --url http://localhost:4193 --out <dir> [episode-id …]
 *
 * Per stage: a 1280×800 screenshot ~0.6 s after the stage fired (1 s after a click or navigate,
 * so a panel has mounted), the VTT text spoken from 2 s before to 3 s after `at_sec` (the stage's
 * own word in brackets), the stage itself, and SKIPPED when the executor found no target.
 * Six stages per sheet: `<out>/<episode>-NN.png`. The VTT is the episode's active variant, the
 * one the overlay plays. The drive is the one tests/e2e/tour-coverage.spec.ts uses: pin the
 * episode through `window.__orreryAudio`, then set the playhead to each `at_sec` in order.
 *
 * Read-only: writes only the PNG sheets.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { chromium, type Page } from 'playwright';
import { EPISODE_STAGES, type AudioStage } from '../../src/lib/audio-tour';

const args = process.argv.slice(2);
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const URL = opt('url');
const OUT = opt('out');
if (!URL || !OUT) {
  console.error(
    'usage: npx tsx scripts/audio/stage-review.ts --url <built site> --out <dir> [episode-id …]',
  );
  process.exit(2);
}
const flagged = new Set(['--url', '--out']);
const only = args.filter((a, i) => !a.startsWith('--') && !flagged.has(args[i - 1] ?? ''));
const episodes = only.length ? only : Object.keys(EPISODE_STAGES);
for (const id of episodes) if (!EPISODE_STAGES[id]) throw new Error(`no stages for episode ${id}`);

type Cue = { start: number; end: number; text: string };
const toSec = (t: string) => {
  const [h, m, s] = t.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(s);
};
function parseVtt(vtt: string): Cue[] {
  const cues: Cue[] = [];
  for (const block of vtt.replace(/\r/g, '').split(/\n\n+/)) {
    const m = block.match(/(\d\d:\d\d:\d\d\.\d+)\s+-->\s+(\d\d:\d\d:\d\d\.\d+)[^\n]*\n([\s\S]+)/);
    if (m)
      cues.push({ start: toSec(m[1]!), end: toSec(m[2]!), text: m[3]!.replace(/\n/g, ' ').trim() });
  }
  return cues;
}
/** Words spoken in [at-2, at+3]; the cue playing at `at` is wrapped in [ ]. */
function heard(cues: Cue[], at: number): string {
  const near = cues.filter((c) => c.end > at - 2 && c.start < at + 3);
  if (!near.length) {
    const last = cues[cues.length - 1];
    return last && at >= last.end
      ? `(after the last line, which ends at ${last.end.toFixed(1)} s)`
      : '(silence)';
  }
  return near
    .map((c) =>
      c.start <= at && at < c.end
        ? `[${c.start.toFixed(1)} ${c.text}]`
        : `${c.start.toFixed(1)} ${c.text}`,
    )
    .join('  ');
}

async function hook(page: Page) {
  await page.waitForFunction(
    () =>
      typeof (window as unknown as { __orreryAudio?: { setPosition?: unknown } }).__orreryAudio
        ?.setPosition === 'function',
    undefined,
    { timeout: 20_000 },
  );
}
/** Pin the episode (as tour-coverage does) and return its route and active VTT URL. */
async function pin(page: Page, id: string) {
  return page.evaluate(async (epId) => {
    const w = window as unknown as {
      __orreryAudio: {
        state: { currentEpisode: unknown };
        registry: {
          load?: () => Promise<void>;
          episodes: Array<{ id: string; route: string; vtt: string }>;
        };
      };
    };
    await w.__orreryAudio.registry.load?.();
    const ep = w.__orreryAudio.registry.episodes.find((e) => e.id === epId);
    if (!ep) return null;
    w.__orreryAudio.state.currentEpisode = ep;
    return { route: ep.route, vtt: ep.vtt };
  }, id);
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function wrap(s: string, n: number): string[] {
  const out: string[] = [];
  let line = '';
  for (const w of s.split(/\s+/)) {
    if ((line + ' ' + w).trim().length > n) {
      out.push(line);
      line = w;
    } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out;
}
const TW = 640;
const TH = 400;
const TXT = 150;
async function tile(shot: Buffer, head: string, said: string, skipped: boolean): Promise<Buffer> {
  const lines = [
    ...wrap(head, 82).map((l) => [l, skipped ? '#ff6060' : '#ffd040']),
    ...wrap(said, 82)
      .slice(0, 6)
      .map((l) => [l, '#ffffff']),
  ];
  const svg = `<svg width="${TW}" height="${TXT}"><rect width="${TW}" height="${TXT}" fill="#000"/>${lines
    .map(
      ([l, c], i) =>
        `<text x="6" y="${16 + i * 17}" font-size="13" font-family="sans-serif" fill="${c}">${esc(l!)}</text>`,
    )
    .join('')}</svg>`;
  return sharp({ create: { width: TW, height: TH + TXT, channels: 3, background: '#111' } })
    .composite([
      { input: await sharp(shot).resize(TW, TH).png().toBuffer(), left: 0, top: 0 },
      { input: Buffer.from(svg), left: 0, top: TH },
    ])
    .png()
    .toBuffer();
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const skips: string[] = [];
page.on('console', (m) => {
  if (m.text().includes('[audio-tour] stage skipped')) skips.push(m.text());
});
await page.goto(URL, { waitUntil: 'networkidle' });
await hook(page);
let sheets = 0;
for (const id of episodes) {
  const first = await pin(page, id);
  if (!first) {
    console.log(`✗ ${id}: not in the registry`);
    continue;
  }
  await page.goto(`${URL}${first.route}`, { waitUntil: 'networkidle' });
  await hook(page);
  const ep = await pin(page, id);
  const cues = parseVtt(await (await fetch(new globalThis.URL(ep!.vtt, URL))).text());
  const stages: AudioStage[] = [...EPISODE_STAGES[id]!].sort((a, b) => a.at_sec - b.at_sec);
  const tiles: Buffer[] = [];
  for (const [i, s] of stages.entries()) {
    if (s.action === 'click' && s.target.startsWith('['))
      await page
        .locator(s.target)
        .first()
        .waitFor({ state: 'attached', timeout: 10_000 })
        .catch(() => {});
    const before = skips.length;
    await page.evaluate(
      (sec) =>
        (
          window as unknown as { __orreryAudio: { setPosition: (n: number) => void } }
        ).__orreryAudio.setPosition(sec),
      s.at_sec,
    );
    await page.waitForTimeout(s.action === 'click' || s.action === 'navigate' ? 1000 : 600);
    if (s.action === 'navigate') await pin(page, id);
    const skipped = skips.length > before;
    const head = `${id} #${i + 1}/${stages.length}  @${s.at_sec}s  ${s.action} ${s.target}${s.params ? ' ' + JSON.stringify(s.params) : ''}${skipped ? '  SKIPPED (no target)' : ''}`;
    tiles.push(
      await tile(await page.screenshot(), head, `heard: ${heard(cues, s.at_sec)}`, skipped),
    );
  }
  for (let k = 0; k < tiles.length; k += 6) {
    const group = tiles.slice(k, k + 6);
    const rows = Math.ceil(group.length / 2);
    await sharp({
      create: { width: TW * 2 + 8, height: rows * (TH + TXT + 8), channels: 3, background: '#222' },
    })
      .composite(
        group.map((t, j) => ({
          input: t,
          left: (j % 2) * (TW + 8),
          top: Math.floor(j / 2) * (TH + TXT + 8),
        })),
      )
      .png()
      .toFile(join(OUT, `${id}-${String(k / 6 + 1).padStart(2, '0')}.png`));
    sheets++;
  }
  const last = cues[cues.length - 1];
  console.log(
    `${id}: ${stages.length} stages, audio ${last ? last.end.toFixed(1) : '?'} s, ${Math.ceil(tiles.length / 6)} sheet(s)`,
  );
}
await browser.close();
console.log(`${sheets} sheet(s) in ${OUT}`);
