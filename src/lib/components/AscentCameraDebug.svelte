<!--
  Ascent camera debug (the launch analogue of FlybyDebugViewer).

  A 2D side-elevation chart (downrange × altitude, the launch plane) that
  visualizes the director's-cut camera rig from $lib/orbital/ascent-cameras:
    - the full trajectory (ghost) + the live vehicle marker + velocity arrow
    - the LIVE camera (active shot at the current MET) + its view direction
      + a motion trail
    - all shot-camera positions (the whole rig, mid-window) coloured, with
      the active shot highlighted
    - a readout (active shot · progress · cam pos / look-at / fov) and the
      shot-schedule strip with click-to-jump

  Pure recompute — it calls the same activeShotAt / composeShot / sampleAscentAt
  functions the scene uses, so it mirrors the real camera without any scene hook.
-->
<script lang="ts">
  import { sampleAscentAt, type AscentSummary } from '$lib/orbital/ascent-physics';
  import {
    activeShotAt,
    composeShot,
    defaultTuning,
    type AscentCameraTuning,
    type AscentShotName,
    type ShotWindow,
  } from '$lib/orbital/ascent-cameras';

  interface Props {
    summary: AscentSummary;
    schedule: ShotWindow[];
    vehLen: number;
    /** Live mission time (s). Drives the live vehicle + camera markers. */
    t: number;
    /** Live per-shot tuning (shared with the scene) — the sliders mutate it. */
    tuning?: AscentCameraTuning;
    /** Scrub callback — clicking a shot jumps the harness clock to its mid-window. */
    onJump?: (t: number) => void;
  }
  let { summary, schedule, vehLen, t, tuning = defaultTuning(), onJump }: Props = $props();

  const SHOT_COLORS: Record<AscentShotName, string> = {
    pad: '#7fdfff',
    tower_clear: '#9ff5c2',
    ascent: '#ffcf6a',
    onboard_down: '#ff8a4a',
    staging: '#ff6ec7',
    chase: '#a98bff',
    fairing: '#ffd36a',
    separation: '#c8ff5a',
    orbit: '#5ac8ff',
  };

  const W = 384;
  const H = 240;

  let canvas = $state<HTMLCanvasElement | null>(null);
  let topCanvas = $state<HTMLCanvasElement | null>(null);
  let trail: Array<{ x: number; y: number; z: number }> = [];
  const TRAIL_MAX = 160;

  const live = $derived(activeShotAt(schedule, t));
  const liveState = $derived(sampleAscentAt(summary.states, Math.max(0, t)));
  const livePose = $derived(composeShot(live.name, liveState, vehLen, live.progress, tuning[live.name]));

  // Mid-window camera for every shot (the rig layout).
  const rig = $derived(
    schedule.map((w) => {
      const mid = (w.tStart + w.tEnd) / 2;
      const st = sampleAscentAt(summary.states, Math.max(0, mid));
      return { name: w.name, mid, pose: composeShot(w.name, st, vehLen, 0.5, tuning[w.name]), st };
    }),
  );

  // World→canvas bounds fit the trajectory AND every rig camera.
  const bounds = $derived.by(() => {
    let minX = 0;
    let maxX = 1;
    let maxY = 1;
    const pts: Array<[number, number]> = [];
    for (const s of summary.states) pts.push([s.downrangeKm, s.altKm]);
    for (const r of rig) pts.push([r.pose.px, r.pose.py]);
    for (const [x, y] of pts) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
    const padX = (maxX - minX) * 0.06 + vehLen;
    const padY = maxY * 0.06 + vehLen;
    return { minX: minX - padX, maxX: maxX + padX, minY: -padY, maxY: maxY + padY };
  });

  const wx = (x: number): number => ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * W;
  const wy = (y: number): number => H - ((y - bounds.minY) / (bounds.maxY - bounds.minY)) * H;

  function draw() {
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, W, H);

    // Ground line (altitude 0).
    ctx.strokeStyle = 'rgba(120,150,120,0.4)';
    ctx.beginPath();
    ctx.moveTo(0, wy(0));
    ctx.lineTo(W, wy(0));
    ctx.stroke();

    // Trajectory ghost.
    ctx.strokeStyle = 'rgba(150,190,240,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    summary.states.forEach((s, i) => {
      const X = wx(s.downrangeKm);
      const Y = wy(s.altKm);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    // Rig cameras — every shot's mid-window position + view tick.
    for (const r of rig) {
      const c = SHOT_COLORS[r.name];
      const isActive = r.name === live.name;
      ctx.fillStyle = c;
      ctx.globalAlpha = isActive ? 1 : 0.5;
      const X = wx(r.pose.px);
      const Y = wy(r.pose.py);
      ctx.beginPath();
      ctx.arc(X, Y, isActive ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      // View direction tick.
      const dx = r.pose.tx - r.pose.px;
      const dy = r.pose.ty - r.pose.py;
      const m = Math.hypot(dx, dy) || 1;
      ctx.strokeStyle = c;
      ctx.beginPath();
      ctx.moveTo(X, Y);
      ctx.lineTo(X + (dx / m) * 12, Y - (dy / m) * 12 * (H / (bounds.maxY - bounds.minY)) / (W / (bounds.maxX - bounds.minX)));
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Camera motion trail.
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    trail.forEach((p, i) => {
      const X = wx(p.x);
      const Y = wy(p.y);
      if (i === 0) ctx.moveTo(X, Y);
      else ctx.lineTo(X, Y);
    });
    ctx.stroke();

    // Live vehicle marker + velocity arrow.
    const vX = wx(liveState.downrangeKm);
    const vY = wy(liveState.altKm);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(vX, vY, 3, 0, Math.PI * 2);
    ctx.fill();
    const horiz = Math.sqrt(Math.max(0, liveState.speedKms ** 2 - liveState.velUpKms ** 2));
    const spd = Math.hypot(horiz, liveState.velUpKms) || 1;
    ctx.strokeStyle = '#7fe0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(vX, vY);
    ctx.lineTo(vX + (horiz / spd) * 18, vY - (liveState.velUpKms / spd) * 18);
    ctx.stroke();

    // Live camera + look direction.
    const cX = wx(livePose.px);
    const cY = wy(livePose.py);
    ctx.fillStyle = SHOT_COLORS[live.name];
    ctx.strokeStyle = SHOT_COLORS[live.name];
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cX - 4, cY - 4);
    ctx.lineTo(cX + 4, cY - 4);
    ctx.lineTo(cX, cY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.lineTo(wx(livePose.tx), wy(livePose.ty));
    ctx.stroke();

    // Push into trail (keyed on live pose so it grows as the flight plays).
    trail.push({ x: livePose.px, y: livePose.py, z: livePose.pz });
    if (trail.length > TRAIL_MAX) trail.shift();
  }

  // Top-down (x-z) mini view — downrange × depth, so the sideways camera
  // offsets + orbit read (the main chart can't show z).
  const TW = 384;
  const TH = 96;
  function drawTop() {
    const ctx = topCanvas?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, TW, TH);
    ctx.fillStyle = '#05070f';
    ctx.fillRect(0, 0, TW, TH);
    // Bounds over downrange (x) and depth (z) of trajectory + rig cams.
    let minX = 0;
    let maxX = 1;
    let maxZ = 1;
    for (const s of summary.states) maxX = Math.max(maxX, s.downrangeKm);
    for (const r of rig) {
      minX = Math.min(minX, r.pose.px);
      maxX = Math.max(maxX, r.pose.px);
      maxZ = Math.max(maxZ, Math.abs(r.pose.pz));
    }
    const padX = (maxX - minX) * 0.06 + vehLen;
    minX -= padX;
    maxX += padX;
    maxZ += vehLen;
    const tx = (x: number): number => ((x - minX) / (maxX - minX)) * TW;
    const tz = (z: number): number => TH / 2 - (z / (maxZ * 2)) * TH;
    // Centre line (z=0, the flight plane).
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.moveTo(0, tz(0));
    ctx.lineTo(TW, tz(0));
    ctx.stroke();
    // Rig cameras.
    for (const r of rig) {
      ctx.fillStyle = SHOT_COLORS[r.name];
      ctx.globalAlpha = r.name === live.name ? 1 : 0.5;
      ctx.beginPath();
      ctx.arc(tx(r.pose.px), tz(r.pose.pz), r.name === live.name ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    // Trail (x-z).
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    trail.forEach((p, i) => (i === 0 ? ctx.moveTo(tx(p.x), tz(p.z)) : ctx.lineTo(tx(p.x), tz(p.z))));
    ctx.stroke();
    // Live vehicle (z=0) + live camera.
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(tx(liveState.downrangeKm), tz(0), 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = SHOT_COLORS[live.name];
    ctx.beginPath();
    ctx.moveTo(tx(livePose.px), tz(livePose.pz));
    ctx.lineTo(tx(liveState.downrangeKm), tz(0));
    ctx.stroke();
  }

  // Redraw whenever the live pose changes (i.e. t or a tuning slider changes).
  $effect(() => {
    void t;
    void tuning;
    void canvas;
    void topCanvas;
    draw();
    drawTop();
  });

  const activeTune = $derived(tuning[live.name]);
</script>

<div class="dbg">
  <div class="dbg-head">CAMERA DEBUG<span>side elevation · downrange × altitude</span></div>
  <canvas bind:this={canvas} width={W} height={H}></canvas>
  <div class="sub">top-down · downrange × depth (z)</div>
  <canvas bind:this={topCanvas} width={TW} height={TH} class="top"></canvas>

  <div class="readout">
    <div><span>SHOT</span><b style="color:{SHOT_COLORS[live.name]}">{live.name.replace('_', '-')}</b></div>
    <div><span>PROGRESS</span><b>{(live.progress * 100).toFixed(0)}%</b></div>
    <div><span>FOV</span><b>{livePose.fov.toFixed(0)}°</b></div>
    <div>
      <span>CAM</span><b>{livePose.px.toFixed(1)}, {livePose.py.toFixed(1)}, {livePose.pz.toFixed(1)}</b>
    </div>
    <div>
      <span>LOOK</span><b>{livePose.tx.toFixed(1)}, {livePose.ty.toFixed(1)}, {livePose.tz.toFixed(1)}</b>
    </div>
  </div>

  <div class="tune">
    <div class="tune-lbl">
      TUNE · <b style="color:{SHOT_COLORS[live.name]}">{live.name.replace('_', '-')}</b>
      <button
        class="reset"
        onclick={() => {
          tuning[live.name].distMul = 1;
          tuning[live.name].heightMul = 1;
          tuning[live.name].fovAdd = 0;
        }}>reset</button
      >
    </div>
    <label>
      DIST <input type="range" min="0.3" max="2.5" step="0.05" bind:value={tuning[live.name].distMul} />
      <i>{activeTune.distMul.toFixed(2)}</i>
    </label>
    <label>
      HEIGHT <input type="range" min="0.3" max="2" step="0.05" bind:value={tuning[live.name].heightMul} />
      <i>{activeTune.heightMul.toFixed(2)}</i>
    </label>
    <label>
      FOV <input type="range" min="-20" max="20" step="1" bind:value={tuning[live.name].fovAdd} />
      <i>{activeTune.fovAdd > 0 ? '+' : ''}{activeTune.fovAdd}</i>
    </label>
  </div>

  <div class="strip">
    {#each schedule as w (w.name + w.tStart)}
      <button
        class:on={w.name === live.name}
        style="background:{w.name === live.name ? SHOT_COLORS[w.name] : 'transparent'};border-color:{SHOT_COLORS[w.name]}"
        onclick={() => onJump?.((w.tStart + w.tEnd) / 2)}
        title="{w.tStart.toFixed(0)}–{w.tEnd.toFixed(0)}s"
      >
        {w.name.replace('_', '-')}
      </button>
    {/each}
  </div>
</div>

<style>
  .dbg {
    width: 384px;
    background: rgba(4, 9, 20, 0.82);
    border: 1px solid rgba(127, 223, 255, 0.25);
    border-radius: 7px;
    padding: 10px;
    font-family: 'Space Mono', monospace;
    color: #cfe3f5;
  }
  .dbg-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 11px;
    letter-spacing: 2px;
    color: #7fdfff;
    margin-bottom: 8px;
  }
  .dbg-head span {
    font-size: 8px;
    letter-spacing: 1px;
    color: #5d7fa0;
  }
  canvas {
    display: block;
    width: 100%;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }
  canvas.top {
    margin-top: 2px;
  }
  .sub {
    font-size: 8px;
    letter-spacing: 1px;
    color: #5d7fa0;
    margin: 6px 0 2px;
  }
  .tune {
    margin: 8px 0;
    display: grid;
    gap: 3px;
  }
  .tune-lbl {
    font-size: 10px;
    letter-spacing: 1px;
    color: #8fbfe0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .tune label {
    display: grid;
    grid-template-columns: 52px 1fr 42px;
    align-items: center;
    gap: 6px;
    font-size: 9px;
    color: #6ea6cc;
  }
  .tune input[type='range'] {
    width: 100%;
    accent-color: #5ac8ff;
  }
  .tune label i {
    font-style: normal;
    color: #eaf2ff;
    text-align: right;
  }
  .reset {
    font-family: inherit;
    font-size: 8px;
    color: #cfe3f5;
    background: transparent;
    border: 1px solid rgba(127, 223, 255, 0.4);
    border-radius: 3px;
    padding: 1px 5px;
    cursor: pointer;
  }
  .readout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3px 10px;
    margin: 8px 0;
    font-size: 10px;
  }
  .readout div span {
    color: #6ea6cc;
    display: inline-block;
    width: 62px;
  }
  .readout div b {
    color: #eaf2ff;
  }
  .strip {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .strip button {
    font-family: inherit;
    font-size: 9px;
    letter-spacing: 1px;
    color: #cfe3f5;
    border: 1px solid;
    border-radius: 3px;
    padding: 2px 5px;
    cursor: pointer;
  }
  .strip button.on {
    color: #03070f;
    font-weight: 700;
  }
</style>
