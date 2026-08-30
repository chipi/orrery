<!--
  AscentLosses — the ascent Δv-loss ledger (RFC-034 §11.2 · S8).

  A small broadcast HUD panel showing the running gravity / drag / steering Δv
  spent reaching orbit, live from the sampled AscentState. Rendered by LaunchScene
  when the `ascent-losses` Science-Lens layer is on. Pure presentational — give it
  the live state at time t; every channel is grounded in the /science article it
  links (gravity-turn, max-q, rocket-equation).
-->
<script lang="ts">
  import type { AscentState } from '$lib/physics/ascent/ascent-physics';
  import ScienceChip from '$lib/components/ScienceChip.svelte';

  interface Props {
    /** Live sampled state at the current mission time. */
    state: AscentState;
  }
  let { state }: Props = $props();

  const gravity = $derived(state.lossGravityKms);
  const drag = $derived(state.lossDragKms);
  const steering = $derived(state.lossSteeringKms);
  const total = $derived(gravity + drag + steering);
  // Bar widths — normalised to the running total so the split reads at a glance
  // (gravity dominates a vertical launch; drag peaks through Max-Q).
  const pct = (v: number): number => (total > 0 ? (v / total) * 100 : 0);

  type Row = { key: string; label: string; value: number; color: string; section: string };
  const rows: Row[] = $derived([
    { key: 'g', label: 'GRAVITY', value: gravity, color: '#ff5a5a', section: 'gravity-turn' },
    { key: 'd', label: 'DRAG', value: drag, color: '#5aa0ff', section: 'max-q' },
    { key: 's', label: 'STEERING', value: steering, color: '#54e08a', section: 'gravity-turn' },
  ]);
</script>

<div class="ledger">
  <div class="title">
    Δv LOSSES<ScienceChip tab="propulsion" section="tsiolkovsky" label="The rocket equation" />
  </div>
  {#each rows as r (r.key)}
    <div class="row">
      <span class="lbl">{r.label}<ScienceChip tab="mission-phases" section={r.section} /></span>
      <div class="bar">
        <div class="fill" style="width:{pct(r.value)}%; background:{r.color}"></div>
      </div>
      <span class="val">{r.value.toFixed(2)}</span>
    </div>
  {/each}
  <div class="row total">
    <span class="lbl">TOTAL</span>
    <div class="bar"><div class="fill total-fill" style="width:100%"></div></div>
    <span class="val">{total.toFixed(2)}</span>
  </div>
  <div class="unit">km·s⁻¹ spent vs the ideal budget</div>
</div>

<style>
  .ledger {
    width: 208px;
    padding: 11px 13px;
    background: linear-gradient(180deg, rgba(6, 12, 24, 0.82), rgba(4, 9, 18, 0.72));
    border: 1px solid rgba(127, 223, 255, 0.22);
    border-radius: 7px;
    backdrop-filter: blur(7px);
    box-shadow: 0 8px 40px rgba(0, 0, 0, 0.4);
    font-family: var(--font-mono, 'Space Mono', monospace);
    color: #eaf2ff;
  }
  .title {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: 'Bebas Neue', sans-serif;
    font-size: 15px;
    letter-spacing: 2px;
    color: #eafaff;
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(127, 223, 255, 0.15);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .lbl {
    font-size: 10px;
    letter-spacing: 1px;
    color: #8fbfe0;
    width: 58px;
  }
  .bar {
    flex: 1;
    height: 8px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    overflow: hidden;
  }
  .fill {
    height: 100%;
    transition: width 0.12s linear;
  }
  .total {
    margin-top: 4px;
    padding-top: 6px;
    border-top: 1px solid rgba(127, 223, 255, 0.15);
  }
  .total .lbl {
    color: #eafaff;
  }
  .total-fill {
    background: linear-gradient(90deg, #ff5a5a, #5aa0ff, #54e08a);
  }
  .val {
    font-size: 11px;
    color: #eaf2ff;
    width: 34px;
    text-align: right;
  }
  .total .val {
    color: #ffcf6a;
    font-weight: 700;
  }
  .unit {
    font-size: 9px;
    letter-spacing: 0.5px;
    color: #6ea6cc;
    margin-top: 6px;
  }
</style>
