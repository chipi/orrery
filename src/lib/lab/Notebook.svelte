<!--
  Notebook — renders a Goal as an ordered, narrated column of formula cards
  (S3b · RFC-037 §10 S3 · UXS-015 notebook.html). THE state owner: it holds the
  cell list, runs the pure recompute engine (`notebook.ts`) reactively, and hands
  each Card its resolved inputs + result + wire flags. Cards are presentational.

  A goal step may WIRE its input from an earlier step's output (index-order, plan
  M4). `+ ADD CELL` appends an unwired sandbox card from the registry palette.

  The parent keys this component on goal.id, so switching goals remounts it and
  re-seeds from the new path (no cross-goal state bleed). Prerender-safe: the cell
  list is seeded synchronously at construction (untracked), so the static HTML
  already contains every card.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import type { Goal } from '$lib/physics/spec';
  import { REGISTRY, defaultInputs } from '$lib/physics/registry';
  import { recomputeNotebook, type Cell, type CellWire } from './notebook';
  import Card from './Card.svelte';

  type Props = {
    goal: Goal;
    equationHtml: Record<string, string>;
    t: (key: string) => string;
  };

  let { goal, equationHtml, t }: Props = $props();

  /** UI cell = recompute Cell + presentational extras (narrative, removability). */
  interface UICell extends Cell {
    wires: CellWire[];
    narrativeKey?: string;
    removable: boolean;
  }

  function seed(g: Goal): UICell[] {
    return g.path.map((step) => ({
      formulaId: step.formulaId,
      inputs: defaultInputs(REGISTRY.get(step.formulaId)!),
      wires: (step.wiresFrom ?? []).map((w) => ({
        fromIndex: w.fromStep,
        output: w.output,
        toInput: w.toInput,
      })),
      narrativeKey: step.narrativeKey,
      removable: false,
    }));
  }

  // One-time snapshot from the (keyed) goal prop — see header. untrack avoids the
  // state_referenced_locally warning and the remount gives us fresh seeding.
  let cells = $state<UICell[]>(untrack(() => seed(goal)));

  // The whole notebook recomputes on any input edit — trivially cheap for M1.
  const computed = $derived(recomputeNotebook(cells, REGISTRY));

  // ─── Mutations ─────────────────────────────────────────────────────────────
  function setInput(i: number, key: string, value: number | string): void {
    cells[i] = { ...cells[i], inputs: { ...cells[i].inputs, [key]: value } };
  }

  let addId = $state<string>([...REGISTRY.keys()][0]);
  function addCell(): void {
    const def = REGISTRY.get(addId);
    if (!def) return;
    cells = [
      ...cells,
      { formulaId: def.id, inputs: defaultInputs(def), wires: [], removable: true },
    ];
  }

  function removeCell(i: number): void {
    cells = cells.filter((_, idx) => idx !== i);
  }

  function labelFor(id: string): string {
    const def = REGISTRY.get(id);
    return def ? t(def.titleKey) : id;
  }
</script>

<section class="nb" aria-label="Notebook">
  <header class="nb__goal">
    <span class="nb__goal-kicker">Goal</span>
    <h2 class="nb__goal-title">{t(goal.titleKey)}</h2>
  </header>

  <ol class="nb__steps">
    {#each cells as cell, i (i)}
      {@const state = computed[i]}
      {@const formula = REGISTRY.get(cell.formulaId)}
      <li class="nb__step">
        <div class="nb__gutter" aria-hidden="true">
          <span class="nb__index">{i + 1}</span>
          {#if i < cells.length - 1}<span class="nb__rail"></span>{/if}
        </div>

        <div class="nb__body">
          {#if cell.narrativeKey}
            <p class="nb__narrative">{t(cell.narrativeKey)}</p>
          {/if}

          {#if !formula || (state && state.status === 'unknown-formula')}
            <p class="nb__unknown" role="alert">Unknown formula: {cell.formulaId}</p>
          {:else}
            {@const upstreamFailed = state?.status === 'upstream-failed'}
            {@const wiredKeys =
              state && 'wiredKeys' in state ? state.wiredKeys : cell.wires.map((w) => w.toInput)}
            {@const shownInputs =
              state && state.status !== 'upstream-failed' && 'resolvedInputs' in state
                ? state.resolvedInputs
                : cell.inputs}
            {@const result =
              state && (state.status === 'ok' || state.status === 'fail') ? state.result : null}
            <div class="nb__card">
              {#if cell.removable}
                <button
                  type="button"
                  class="nb__remove"
                  onclick={() => removeCell(i)}
                  aria-label="Remove this cell"
                  title="Remove cell">&times;</button
                >
              {/if}
              <Card
                {formula}
                equationHtml={equationHtml[cell.formulaId] ?? ''}
                {t}
                inputs={shownInputs}
                {result}
                {wiredKeys}
                {upstreamFailed}
                onInput={(key, value) => setInput(i, key, value)}
              />
            </div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>

  <!-- + ADD CELL — append any registered formula as an unwired sandbox card -->
  <div class="nb__add">
    <label class="nb__add-label" for="nb-add-select">Add cell</label>
    <select id="nb-add-select" class="nb__add-select" bind:value={addId}>
      {#each [...REGISTRY.keys()] as id (id)}
        <option value={id}>{labelFor(id)}</option>
      {/each}
    </select>
    <button type="button" class="nb__add-btn" onclick={addCell}>+ ADD CELL</button>
  </div>
</section>

<style>
  .nb {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
  }

  /* ─── Goal header ─────────────────────────────────────────────────────── */
  .nb__goal {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    border-left: 2px solid #4ecdc4;
    padding-left: 0.75rem;
  }

  .nb__goal-kicker {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(78, 205, 196, 0.6);
  }

  .nb__goal-title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.75rem;
    letter-spacing: 2px;
    color: #e8e8e8;
    margin: 0;
    line-height: 1.05;
  }

  /* ─── Step column ─────────────────────────────────────────────────────── */
  .nb__steps {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .nb__step {
    display: flex;
    gap: 0.75rem;
    align-items: stretch;
  }

  .nb__gutter {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex-shrink: 0;
    width: 1.75rem;
  }

  .nb__index {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    font-weight: bold;
    color: #04040c;
    background: #4ecdc4;
    border-radius: 50%;
    width: 1.6rem;
    height: 1.6rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .nb__rail {
    flex: 1;
    width: 1px;
    background: linear-gradient(rgba(78, 205, 196, 0.4), rgba(78, 205, 196, 0.08));
    margin-top: 0.25rem;
    min-height: 0.5rem;
  }

  .nb__body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .nb__narrative {
    font-family: 'Space Mono', monospace;
    font-size: 0.78rem;
    line-height: 1.6;
    color: rgba(232, 232, 232, 0.7);
    margin: 0;
  }

  .nb__card {
    position: relative;
  }

  .nb__remove {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;
    font-family: 'Space Mono', monospace;
    font-size: 1rem;
    line-height: 1;
    color: rgba(193, 68, 14, 0.8);
    background: rgba(4, 4, 12, 0.7);
    border: 1px solid rgba(193, 68, 14, 0.3);
    border-radius: 3px;
    width: 1.6rem;
    height: 1.6rem;
    cursor: pointer;
  }

  .nb__remove:hover,
  .nb__remove:focus-visible {
    background: rgba(193, 68, 14, 0.15);
    outline: 2px solid #c1440e;
    outline-offset: 1px;
  }

  .nb__unknown {
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    color: #c1440e;
    margin: 0;
  }

  /* ─── Add cell ────────────────────────────────────────────────────────── */
  .nb__add {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    border-top: 1px dashed rgba(78, 205, 196, 0.2);
    padding-top: 1rem;
  }

  .nb__add-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    color: rgba(78, 205, 196, 0.65);
  }

  .nb__add-select {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.25);
    border-radius: 2px;
    color: #e8e8e8;
    padding: 0.35rem 0.5rem;
    min-height: 44px;
    cursor: pointer;
    flex: 1;
    min-width: 10rem;
  }

  .nb__add-select:focus-visible {
    outline: 2px solid #4ecdc4;
    outline-offset: 2px;
  }

  .nb__add-btn {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 1px;
    color: #4ecdc4;
    background: rgba(78, 205, 196, 0.08);
    border: 1px solid rgba(78, 205, 196, 0.4);
    border-radius: 2px;
    padding: 0 1rem;
    min-height: 44px;
    cursor: pointer;
    white-space: nowrap;
  }

  .nb__add-btn:hover,
  .nb__add-btn:focus-visible {
    background: rgba(78, 205, 196, 0.16);
    outline: 2px solid #4ecdc4;
    outline-offset: 2px;
  }

  @media (max-width: 480px) {
    .nb__step {
      gap: 0.5rem;
    }
    .nb__gutter {
      width: 1.5rem;
    }
  }
</style>
