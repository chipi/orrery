<!--
  AskScenarioView (epic #539 · slice #541 client half) — renders the LLM-composed
  formula ladder INSIDE the ask conversation (no notebook hand-off). The client
  recomputes `scenario.cells` locally (hydrate → recomputeNotebook) so the KERNEL
  owns every number; the LLM only chose the formulas + seeded the user's inputs.
  Read-only: each rung shows the inputs the kernel actually used (wired ones flagged),
  the computed results, the figure, the honesty line, and fail/blocked states.
-->
<script lang="ts">
  import { REGISTRY } from '$lib/physics/registry';
  import { recomputeNotebook, type CellComputed } from '../notebook';
  import { hydrateCells, type AskScenario } from '../ask-scenario';
  import FigureRenderer from '../FigureRenderer.svelte';
  import type { FigureSpec } from '$lib/physics/spec';

  interface Props {
    scenario: AskScenario;
    t: (key: string, params?: Record<string, string | number>) => string;
  }
  let { scenario, t }: Props = $props();

  const computed = $derived(recomputeNotebook(hydrateCells(scenario.cells, REGISTRY), REGISTRY));

  function fmt(v: number): string {
    if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(3);
    if (Math.abs(v) >= 100) return v.toFixed(2);
    return v.toFixed(4);
  }

  // Mirror the notebook's honest blocked-cell wording (Notebook.svelte view()).
  function blockedMessage(c: CellComputed): string {
    switch (c.status) {
      case 'upstream-failed':
        return t('lab.blocked.upstream-failed', { step: c.fromIndex + 1 });
      case 'invalid-wire':
        return t('lab.blocked.invalid-wire', { step: c.fromIndex + 1, output: c.output });
      case 'compute-error':
        return t('lab.blocked.compute-error');
      case 'unknown-formula':
        return t('lab.ui.unknown-formula', { id: c.formulaId });
      default:
        return '';
    }
  }
</script>

<div class="ask-scenario" aria-label={t('lab.ask.scenario-aria')}>
  {#each scenario.cells as cell, i (i)}
    {@const def = REGISTRY.get(cell.formulaId)}
    {@const c = computed[i]}
    {@const okish = c.status === 'ok' || c.status === 'fail'}
    <section
      class="ask-scenario__cell"
      class:ask-scenario__cell--fail={c.status === 'fail' || !okish}
    >
      <span class="ask-scenario__step" aria-hidden="true">{i + 1}</span>
      <div class="ask-scenario__body">
        <h4 class="ask-scenario__title">{def ? t(def.titleKey) : cell.formulaId}</h4>

        {#if okish && (c.status === 'ok' || c.status === 'fail')}
          <!-- Inputs the kernel actually used (wired values substituted) -->
          <dl class="ask-scenario__io">
            {#each Object.entries(c.resolvedInputs) as [k, v] (k)}
              {@const field = def?.inputs.find((f) => f.key === k)}
              {#if field && !field.injected}
                <div class="ask-scenario__row">
                  <dt>
                    {t(field.labelKey)}{#if c.wiredKeys.includes(k)}<span
                        class="ask-scenario__wired"
                        title={t('lab.ui.wired')}>←</span
                      >{/if}
                  </dt>
                  <dd>
                    {typeof v === 'number' ? fmt(v) : v}{field.units ? ' ' + field.units : ''}
                  </dd>
                </div>
              {/if}
            {/each}
          </dl>

          <!-- Kernel results -->
          <dl class="ask-scenario__io ask-scenario__io--out">
            {#each def?.outputs ?? [] as o (o.key)}
              {#if c.result.values[o.key]}
                <div class="ask-scenario__row">
                  <dt>{t(o.labelKey)}</dt>
                  <dd class="ask-scenario__val">
                    {fmt(c.result.values[o.key].value)}
                    {c.result.values[o.key].units}
                  </dd>
                </div>
              {/if}
            {/each}
          </dl>

          {#if !c.result.status.ok}
            <p class="ask-scenario__fail-reason">{t(c.result.status.reasonKey)}</p>
          {/if}
          {#if c.result.figure}
            <div class="ask-scenario__figure">
              <FigureRenderer figure={c.result.figure as FigureSpec} {t} />
            </div>
          {/if}
          {#if c.result.assumptions.length}
            <p class="ask-scenario__assume">
              <span class="ask-scenario__assume-label">{t('lab.ui.assumptions-label')}</span>
              {c.result.assumptions.map((k) => t(k)).join(' · ')}
            </p>
          {/if}
        {:else}
          <p class="ask-scenario__blocked">{blockedMessage(c)}</p>
        {/if}

        {#if scenario.presetNotes?.[i]}
          {@const note = scenario.presetNotes[i]}
          {#if note}
            <p class="ask-scenario__assume">
              <span class="ask-scenario__assume-label">{t('lab.ui.assumptions-label')}</span>
              {t(note)}
            </p>
          {/if}
        {/if}
      </div>
    </section>
  {/each}
</div>

<style>
  .ask-scenario {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin: 0.5rem 0;
  }
  .ask-scenario__cell {
    display: flex;
    gap: 0.6rem;
    padding: 0.7rem 0.8rem;
    border: 1px solid rgba(78, 205, 196, 0.18);
    border-left: 2px solid rgba(78, 205, 196, 0.5);
    border-radius: 0 4px 4px 0;
    background: rgba(78, 205, 196, 0.03);
  }
  .ask-scenario__cell--fail {
    border-left-color: rgba(193, 68, 14, 0.6);
    background: rgba(193, 68, 14, 0.04);
  }
  .ask-scenario__step {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    color: rgba(78, 205, 196, 0.7);
    flex: 0 0 auto;
    padding-top: 0.1rem;
  }
  .ask-scenario__body {
    flex: 1 1 auto;
    min-width: 0;
  }
  .ask-scenario__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1rem;
    letter-spacing: 1.5px;
    margin: 0 0 0.4rem;
    color: #e8e8e8;
  }
  .ask-scenario__io {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 1rem;
    margin: 0 0 0.35rem;
  }
  .ask-scenario__row {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
  }
  .ask-scenario__io dt {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
    margin: 0;
  }
  .ask-scenario__io dd {
    font-family: 'Space Mono', monospace;
    font-size: 0.72rem;
    color: rgba(232, 232, 232, 0.85);
    margin: 0;
  }
  .ask-scenario__io--out dd.ask-scenario__val {
    color: #4ecdc4;
    font-weight: bold;
  }
  .ask-scenario__wired {
    color: #ffc850;
    margin-left: 0.25rem;
  }
  .ask-scenario__fail-reason {
    font-family: 'Space Mono', monospace;
    font-size: 0.72rem;
    color: #c1440e;
    margin: 0.2rem 0;
  }
  .ask-scenario__blocked {
    font-family: 'Space Mono', monospace;
    font-size: 0.72rem;
    color: rgba(193, 68, 14, 0.85);
    margin: 0;
  }
  .ask-scenario__figure {
    margin: 0.4rem 0;
    border-radius: 3px;
    overflow: hidden;
  }
  .ask-scenario__assume {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.4);
    margin: 0.25rem 0 0;
  }
  .ask-scenario__assume-label {
    color: rgba(255, 200, 80, 0.6);
    letter-spacing: 0.5px;
    margin-right: 0.3rem;
  }
</style>
