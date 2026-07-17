<!--
  LaunchTelemetry — the broadcast "LAUNCH TELEMETRY" console (the left HUD panel).

  Shared by the dev harness (/dev/ascent) and the shipping /fly launch pre-roll
  (LaunchScene) so the rich telemetry — propellant reservoirs, live strip charts
  (altitude / velocity / dynamic pressure / aero heating), T/W + chamber gauges,
  engine cluster, GO/NO-GO lights — is identical in both. Every series is grounded
  in the /science articles (Tsiolkovsky, Max-Q, dv-budget, engine clustering).

  Pure presentational: give it the integrated summary + the live state at time t.
-->
<script lang="ts">
  import type {
    AscentSummary,
    AscentState,
    LaunchStage,
    LaunchBoosters,
  } from '$lib/orbital/ascent-physics';

  interface Props {
    summary: AscentSummary;
    stages: LaunchStage[];
    /** Strap-on boosters (SRBs / EAP / Korolev strap-ons), if the vehicle has them. */
    boosters?: LaunchBoosters;
    payloadKg: number;
    vehicleName: string;
    /** Live mission time (s); negative during the countdown. */
    t: number;
    /** Live sampled state at t (pad-clamped by the caller during the countdown). */
    state: AscentState;
    /** T-minus seconds at which the engines light (for the GO/NO-GO arming). */
    ignitionT?: number;
  }
  let {
    summary,
    stages,
    boosters,
    payloadKg,
    vehicleName,
    t,
    state,
    ignitionT = -3,
  }: Props = $props();

  // Strap-on booster reservoir: the combined propellant drains through the
  // parallel-boost phase, then reads SEP once the boosters jettison.
  const boosterTotalProp = boosters
    ? boosters.count * Math.max(1, boosters.wetKg - boosters.dryKg)
    : 0;
  const boosterFuelPct = $derived.by(() => {
    if (!boosters) return 0;
    if (t < 0) return 100;
    if (state.boosterPropRemainingKg > 0) {
      return Math.round((state.boosterPropRemainingKg / boosterTotalProp) * 100);
    }
    return 0;
  });
  const boostersJettisoned = $derived(!!boosters && t >= 0 && state.boosterPropRemainingKg <= 0);

  const duration = summary.states.at(-1)!.t;
  const ORBIT_TARGET_KMS = 7.8; // circular LEO — the dv-budget "will it make it" line

  // Propellant story (Tsiolkovsky) — ~88% of liftoff mass is fuel.
  const liftoffMass = summary.states[0].massKg;
  const stageProps = stages.map((s) => Math.max(1, s.wetKg - s.dryKg));
  const totalProp = stageProps.reduce((a, b) => a + b, 0);
  const propPct = Math.round((totalProp / liftoffMass) * 100);
  const payloadPct = ((payloadKg / liftoffMass) * 100).toFixed(1);
  const maxQpeak = summary.maxQ.qPa / 1000;

  const stageFuelPct = (i: number): number => {
    if (t < 0) return 100; // tanks loaded through the countdown
    if (state.stageIndex < 0) return 0;
    if (i < state.stageIndex) return 0;
    if (i > state.stageIndex) return 100;
    return Math.round((state.propRemainingKg / stageProps[i]) * 100);
  };
  const activeEngines = $derived(
    state.stageIndex >= 0 ? (stages[state.stageIndex].engines ?? 1) : 0,
  );
  const twrPct = $derived(Math.min(1, state.twr / 2.5) * 100);

  // ── Live strip charts — full flight profile drawn as a ghost, traversed
  //    portion drawn bright with a moving cursor. ──
  const CHART_W = 214;
  const CHART_H = 30;
  type Pt = [number, number];
  const seriesFor = (acc: (s: AscentState) => number, maxV: number): Pt[] =>
    summary.states.map((s) => [
      (s.t / duration) * CHART_W,
      CHART_H - Math.min(1, Math.max(0, acc(s)) / maxV) * CHART_H,
    ]);
  const altMax = Math.max(...summary.states.map((s) => s.altKm)) * 1.05;
  const heatPeak = Math.max(...summary.states.map((s) => s.aeroHeatFlux)) || 1;
  const altPts = seriesFor((s) => s.altKm, altMax);
  const velPts = seriesFor((s) => s.speedKms, ORBIT_TARGET_KMS * 1.05);
  const qPts = seriesFor((s) => s.qPa / 1000, maxQpeak * 1.12);
  const heatPts = seriesFor((s) => s.aeroHeatFlux, heatPeak * 1.05);
  const poly = (pts: Pt[]): string =>
    pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');

  const nowIdx = $derived.by(() => {
    const tt = Math.max(0, t);
    let idx = 0;
    for (let i = 0; i < summary.states.length; i++) {
      if (summary.states[i].t <= tt) idx = i;
      else break;
    }
    return idx;
  });
  const trace = (pts: Pt[], n: number): string => poly(pts.slice(0, n + 1));
  const area = (pts: Pt[], n: number): string => {
    const seg = pts.slice(0, n + 1);
    if (seg.length === 0) return '';
    return `M ${seg[0][0].toFixed(1)},${CHART_H} L ${trace(pts, n)} L ${seg[seg.length - 1][0].toFixed(1)},${CHART_H} Z`;
  };

  const heatPct = $derived(t < 0 ? 0 : Math.round((state.aeroHeatFlux / heatPeak) * 100));
  const chamberK = $derived(t < 0 ? 0 : state.chamberTempK);
</script>

<div class="console">
  <div class="console-title">LAUNCH TELEMETRY<em>{vehicleName}</em></div>

  <!-- PROPELLANT — the tyranny of the rocket equation made kinetic -->
  <section>
    <header>PROPELLANT<em>tsiolkovsky</em></header>
    <div class="fuel-headline"><b>{propPct}%</b> fuel by mass · payload {payloadPct}%</div>
    {#if boosters}
      <div class="reservoir">
        <span class="rlabel blabel">{boosters.count}×{boosters.name}</span>
        <div class="rbar"><div class="rfill srb" style="width:{boosterFuelPct}%"></div></div>
        <span class="rpct" class:sep={boostersJettisoned}
          >{boostersJettisoned ? 'SEP' : `${boosterFuelPct}%`}</span
        >
      </div>
    {/if}
    {#each stages as st, i (st.name)}
      <div class="reservoir">
        <span class="rlabel">{st.name}</span>
        <div class="rbar"><div class="rfill" style="width:{stageFuelPct(i)}%"></div></div>
        <span class="rpct">{stageFuelPct(i)}%</span>
      </div>
    {/each}
  </section>

  {#snippet chartRow(label: string, sci: string, pts: Pt[], color: string, val: string)}
    <section class="chart-row">
      <header>{label}<em>{sci}</em></header>
      <div class="chart-wrap">
        <svg class="chart" viewBox="0 0 {CHART_W} {CHART_H}" preserveAspectRatio="none">
          <line class="grid" x1="0" y1={CHART_H * 0.5} x2={CHART_W} y2={CHART_H * 0.5} />
          <polyline class="ghost" points={poly(pts)} />
          <path class="carea" d={area(pts, nowIdx)} style="fill:{color}" />
          <polyline class="cline" points={trace(pts, nowIdx)} style="stroke:{color}" />
          <circle
            class="cdot"
            cx={pts[nowIdx][0]}
            cy={pts[nowIdx][1]}
            r="1.8"
            style="fill:{color}"
          />
        </svg>
        <span class="chart-val" style="color:{color}">{val}</span>
      </div>
    </section>
  {/snippet}

  {@render chartRow('ALTITUDE', 'launch', altPts, '#5ac8ff', `${state.altKm.toFixed(0)} km`)}
  {@render chartRow(
    'VELOCITY',
    'dv-budget',
    velPts,
    '#7fe0ff',
    `${state.speedKms.toFixed(2)} km/s`,
  )}
  {@render chartRow(
    'DYNAMIC PRESSURE',
    'max-q',
    qPts,
    '#9a8bff',
    `${(state.qPa / 1000).toFixed(1)} kPa`,
  )}
  {@render chartRow('AERO HEATING', 'launch', heatPts, '#ff8a4a', `${heatPct}%`)}

  <section class="dual">
    <div>
      <header>T/W<em>twr</em></header>
      <div class="gauge">
        <div class="gfill" class:go={state.twr >= 1} style="width:{twrPct}%"></div>
        <div class="gmark" style="left:40%"></div>
        <span class="gval">{state.twr.toFixed(2)}</span>
      </div>
    </div>
    <div>
      <header>CHAMBER<em>engine-types</em></header>
      <div class="gauge">
        <div class="gfill temp" style="width:{chamberK > 0 ? 100 : 0}%"></div>
        <span class="gval">{chamberK > 0 ? `${chamberK} K` : '— cold'}</span>
      </div>
    </div>
  </section>

  <section>
    <header>
      ENGINES · {activeEngines} ONLINE{#if state.boostersActive && boosters}
        + {boosters.count} SRB{/if}<em>engine-clustering</em>
    </header>
    <div class="engines">
      {#each Array(activeEngines) as _, i (i)}
        <i class="eng"></i>
      {/each}
    </div>
  </section>

  <section class="status-lights">
    {#each ['GUIDANCE', 'GIMBAL', 'SENSORS', 'PRESS', 'RANGE'] as lg (lg)}
      <span class="light" class:armed={t < ignitionT && (lg === 'PRESS' || lg === 'RANGE')}>
        <i></i>{lg}
      </span>
    {/each}
  </section>
</div>

<style>
  .console {
    display: flex;
    flex-direction: column;
    gap: 11px;
    width: 250px;
    padding: 13px 14px;
    background: linear-gradient(180deg, rgba(6, 12, 24, 0.82), rgba(4, 9, 18, 0.72));
    border: 1px solid rgba(127, 223, 255, 0.22);
    border-radius: 7px;
    backdrop-filter: blur(7px);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
    font-family: 'Space Mono', monospace;
    color: #eaf2ff;
  }
  .console-title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 15px;
    letter-spacing: 2px;
    color: #eafaff;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(127, 223, 255, 0.15);
  }
  .console-title em {
    font-family: 'Space Mono', monospace;
    font-style: normal;
    font-size: 9px;
    letter-spacing: 1px;
    color: #6ea6cc;
  }
  .chart-row header {
    margin-bottom: 3px;
  }
  .chart-wrap {
    position: relative;
  }
  .chart {
    width: 100%;
    height: 30px;
    display: block;
    background: rgba(255, 255, 255, 0.03);
    border-left: 1px solid rgba(255, 255, 255, 0.12);
    border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  }
  .chart .grid {
    stroke: rgba(255, 255, 255, 0.08);
    stroke-width: 0.5;
    stroke-dasharray: 2 2;
  }
  .chart .ghost {
    fill: none;
    stroke: rgba(180, 210, 240, 0.22);
    stroke-width: 0.8;
  }
  .chart .carea {
    opacity: 0.16;
    stroke: none;
  }
  .chart .cline {
    fill: none;
    stroke-width: 1.4;
    filter: drop-shadow(0 0 2px currentColor);
  }
  .chart-val {
    position: absolute;
    top: 1px;
    right: 4px;
    font-size: 10px;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
  }
  .dual {
    flex-direction: row;
    gap: 12px;
  }
  .dual > div {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .gfill.temp {
    background: linear-gradient(90deg, #ff5a2a, #ffd36a);
  }
  section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 10px;
    letter-spacing: 1.5px;
    color: #8fbfe0;
  }
  header em {
    font-style: normal;
    font-size: 8px;
    letter-spacing: 1px;
    color: #4d7fa0;
  }
  header em::before {
    content: '▸ ';
  }
  .fuel-headline {
    font-size: 10px;
    color: #cfe3f5;
    line-height: 1.3;
  }
  .fuel-headline b {
    color: #ffcf6a;
    font-size: 15px;
  }
  .reservoir {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .rlabel {
    font-size: 10px;
    color: #7d99b5;
    width: 20px;
  }
  .blabel {
    width: 46px;
    font-size: 9px;
    color: #ffbe7a;
    white-space: nowrap;
  }
  .rfill.srb {
    background: linear-gradient(90deg, #ff5a2a, #ffb14a);
  }
  .rpct.sep {
    color: #ff8a4a;
    font-weight: 700;
  }
  .rbar {
    flex: 1;
    height: 9px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    overflow: hidden;
  }
  .rfill {
    height: 100%;
    background: linear-gradient(90deg, #ff8a3c, #ffd36a);
    transition: width 0.12s linear;
  }
  .rpct {
    font-size: 10px;
    color: #eaf2ff;
    width: 34px;
    text-align: right;
  }
  .gauge {
    position: relative;
    height: 12px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    overflow: hidden;
  }
  .gfill {
    height: 100%;
    background: #ff7a5a;
    transition: width 0.12s linear;
  }
  .gfill.go {
    background: linear-gradient(90deg, #54e08a, #9ff5c2);
  }
  .gmark {
    position: absolute;
    top: -1px;
    width: 2px;
    height: 14px;
    background: #fff;
    opacity: 0.7;
  }
  .gval {
    position: absolute;
    right: 5px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 9px;
    color: #eaf2ff;
    text-shadow: 0 0 4px rgba(0, 0, 0, 0.9);
  }
  .engines {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  .eng {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: radial-gradient(circle at 35% 35%, #9ff5c2, #2ea86a);
    box-shadow: 0 0 5px rgba(84, 224, 138, 0.6);
  }
  .status-lights {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px 12px;
  }
  .status-lights .light {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 9px;
    letter-spacing: 1px;
    color: #a9c6dc;
  }
  .status-lights .light i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #54e08a;
    box-shadow: 0 0 5px rgba(84, 224, 138, 0.7);
  }
  .status-lights .light.armed i {
    background: #ffbe4a;
    box-shadow: 0 0 5px rgba(255, 190, 74, 0.7);
  }
</style>
