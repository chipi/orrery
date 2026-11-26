import { chromium } from '/work/orrery/worktrees/0.9.5/node_modules/playwright/index.mjs';
import fs from 'node:fs';
// node docs/wip/2026-11-23-pass2-tools/flyby-shot.mjs <prefix> <mission-id[,mission-id…]>
// The /fly flyby montage frames for the iconic-flyby review. For each flight event of type
// flyby (and the arrival event: edl_or_oi / arrival) it sets the sim to the montage beats at
// the offsets of DEFAULT_FLYBY_SCHEDULE (src/lib/orbital/flyby-shot-schedule.ts): establish
// -40 d (window -60..-20), approach -10 d (-20..-1.5), hero 0 (-1.5..1.5), depart +10 d
// (1.5..30). Arrival events use establish -35 (the OI window opens 40 d out). Plus one cruise
// frame at the midpoint between consecutive events (and one before the first), and an
// "arrival" frame at transit_days. Desktop 1280x800 and phone 390x844 (SHOT_VIEWPORT=WxH).
// Files: <prefix>-<mission>-<d|p>-<nn>-<label>.png in SHOT_DIR, and
// <prefix>-<mission>.json (one record per frame: wanted MET, activeFlybyMet, flybyId, subPhase,
// expected shot kind, camR, settle result). A frame is "settled" when __flyDebugFrame.simDay
// equals the target and camR / camera target move < 0.2% for three polls 250 ms apart (up to 30 s for cruise frames, 15 s for montage beats).
const [prefix, missions] = process.argv.slice(2);
const DEV = process.env.DEV_URL ?? 'http://localhost:5174';
const OUT = (process.env.SHOT_DIR ?? 'test-results/shots').replace(/\/?$/, '/');
const SIZES = process.env.SHOT_VIEWPORT
  ? [['v', ...process.env.SHOT_VIEWPORT.split('x').map(Number)]]
  : [['d', 1280, 800], ['p', 390, 844]];
fs.mkdirSync(OUT, { recursive: true });

const SCHEDULE = [['establish', -60, -20], ['approach', -20, -1.5], ['hero', -1.5, 1.5], ['depart', 1.5, 30]];
const expectedShot = (off) => SCHEDULE.find(([, a, b]) => off >= a && off < b)?.[0] ?? null;

function loadMission(id) {
  const root = 'static/data/missions';
  for (const d of fs.readdirSync(root)) {
    const p = `${root}/${d}/${id}.json`;
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
  }
  throw new Error('no mission ' + id);
}

function plan(m) {
  const ev = (m.flight?.events ?? []).filter((e) => ['flyby', 'edl_or_oi', 'arrival'].includes(e.type) && e.met_days != null);
  const flybys = ev.filter((e) => e.type === 'flyby').sort((a, b) => a.met_days - b.met_days);
  const oiList = ev.filter((e) => e.type !== 'flyby').sort((a, b) => a.met_days - b.met_days);
  const oi = oiList.length ? oiList[oiList.length - 1] : null;
  const frames = [];
  const peaks = flybys.map((e) => ({ e, kind: 'f' }));
  if (oi && !flybys.some((f) => f.met_days === oi.met_days)) peaks.push({ e: oi, kind: 'oi' });
  peaks.sort((a, b) => a.e.met_days - b.e.met_days);
  let seq = 0;
  const add = (label, met, peak, off) => frames.push({ n: String(++seq).padStart(2, '0'), label, met: Math.max(0, met), peak, off });
  let prev = 0;
  peaks.forEach(({ e, kind }, i) => {
    const mid = prev + (e.met_days - prev) / 2;
    add(`cruise-${i === 0 ? 'out' : 'between'}`, i === 0 ? Math.min(mid, Math.max(5, e.met_days - 120)) : mid, null, null);
    const tag = `${kind === 'oi' ? 'oi' : 'fb' + (i + 1)}`;
    const est = kind === 'oi' ? -35 : -40;
    for (const [lab, off] of [['establish', est], ['approach', -10], ['hero', 0], ['depart', 10]]) {
      add(`${tag}-${lab}`, e.met_days + off, e.met_days, off);
    }
    prev = e.met_days;
  });
  if (m.transit_days && m.transit_days > prev + 1) add('arrival', m.transit_days, null, null);
  return { frames, peaks };
}

const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function settle(page, met, maxPolls) {
  let last = null, same = 0;
  for (let i = 0; i < maxPolls; i++) {
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => {
      const f = window.__flyDebugFrame;
      return f ? [f.simDay, f.camR, f.camTx, f.camTz] : null;
    });
    if (s && last && s.every((v, k) => Math.abs(v - last[k]) < 2e-3 * Math.max(1, Math.abs(v)))) same++; else same = 0;
    last = s;
    if (same >= 3) return true;
  }
  return false;
}

async function shoot(id, [tag, vw, vh]) {
  const m = loadMission(id);
  const frames = plan(m).frames.filter((f) => !process.env.SHOT_ONLY || new RegExp(process.env.SHOT_ONLY).test(f.label));
  const page = await (await b.newContext({ viewport: { width: vw, height: vh } })).newPage();
  const prepare = async () => {
    for (let i = 0; i < 3; i++) {
      await page.goto(`${DEV}/fly?mission=${id}`).catch(() => {});
      const ok = await page.waitForFunction(() => typeof window.__flySetSimDay === 'function', null, { timeout: 90000 }).then(() => true, () => false);
      if (ok) break;
    }
    await page.waitForTimeout(5000);
    await page.keyboard.press('Escape').catch(() => {});
    await page.getByRole('button', { name: /proceed to simulation/i }).click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await page.getByRole('button', { name: /not now/i }).click({ timeout: 1500 }).catch(() => {});
    };
  await prepare();
  const rec = [];
  for (const f of frames) {
   for (let attempt = 0; attempt < 3; attempt++) try {
    await page.getByRole('button', { name: /not now/i }).click({ timeout: 300 }).catch(() => {});
    await page.evaluate((x) => window.__flySetSimDay(x), f.met);
    await page.waitForTimeout(600);
    const settled = await settle(page, f.met, f.off == null ? 120 : 60);
    const st = await page.evaluate(() => ({
      activeFlybyMet: window.__flyDebug?.activeFlybyMet ?? null,
      flybyId: window.__flyDebug?.flybyId ?? null,
      subPhase: window.__flyDebugFrame?.lastHelioSubPhase ?? null,
      camR: window.__flyDebugFrame?.camR ?? null,
      cutBlack: window.__flyDebugFrame?.cutBlackOpacity ?? null,
      hudOpacity: (() => { const el = document.querySelector('.hud-stack'); return el ? Number(getComputedStyle(el).opacity) : null; })(),
      chromeHidden: !!document.querySelector('.hud-stack.cinematic-hidden'),
    }));
    await page.getByRole('button', { name: /not now/i }).click({ timeout: 300 }).catch(() => {});
    const file = `${prefix}-${id}-${tag}-${f.n}-${f.label}.png`;
    await page.screenshot({ path: OUT + file });
    rec.push({ file, ...f, expectedShot: f.off == null ? null : expectedShot(f.off), settled, ...st, peakMismatch: f.peak != null && st.activeFlybyMet !== f.peak, attempt });
    break;
   } catch (err) {
    console.log(id, tag, f.label, 'retry after', String(err.message).split('\n')[0]);
    await prepare();
   }
  }
  fs.writeFileSync(`${OUT}${prefix}-${id}-${tag}.json`, JSON.stringify(rec, null, 1));
  console.log(id, tag, frames.length, 'frames,', rec.filter((r) => !r.settled).length, 'unsettled,', rec.filter((r) => r.peakMismatch).length, 'peak mismatches');
  await page.close();
}

const jobs = missions.split(',').flatMap((m) => SIZES.map((s) => () => shoot(m, s).catch((e) => console.log(m, s[0], 'FAILED', String(e.message).split('\n')[0]))));
await Promise.all(Array.from({ length: Math.min(Number(process.env.JOBS ?? 3), jobs.length) }, async () => { while (jobs.length) await jobs.shift()(); }));
await b.close();
