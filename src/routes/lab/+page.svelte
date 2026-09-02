<!--
  /lab — Physics Lab, Notebook view (S3b · the v1 home).

  A goal picker selects one Goal; the keyed <Notebook> renders it as a narrated
  ladder of formula cards with live index-order recompute (a wired step consumes
  an earlier step's output). The equation-HTML map is built at prerender time in
  +page.server.ts so KaTeX never ships to the browser (ADR-034). `t` resolves the
  registry's dotted keys (`lab.f.tsiolkovsky.title`) against the flat snake_case
  paraglide bundle (`lab_f_tsiolkovsky_title`) — S3d, dot/hyphen → underscore.
-->
<script lang="ts">
  import 'katex/dist/katex.min.css';
  import { untrack } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';
  import { GOALS } from '$lib/physics/registry/goals';
  import Notebook from '$lib/lab/Notebook.svelte';
  import Canvas from '$lib/lab/Canvas.svelte';
  import { createLabState } from '$lib/lab/lab-state.svelte';
  import type { PageData } from './$types';

  type Props = { data: PageData };
  let { data }: Props = $props();

  // Goal picker — default to the M1 launch-a-rocket ladder.
  let selectedGoalId = $state('launch-a-rocket');
  const goal = $derived(GOALS.get(selectedGoalId) ?? [...GOALS.values()][0]);

  // ONE card-state owner for all lab views (S5 step 4): Notebook (and Canvas,
  // S5) are projections of this instance — switching views can't lose an edit.
  // Seeded from the INITIAL goal deliberately (untrack): later goal switches
  // re-seed through Notebook's goal-change effect, not by re-creating state.
  const labState = createLabState(untrack(() => goal));

  // View switch (S5): Notebook is the default home; Canvas is the T2 workspace.
  // Touch devices get the read-only graph (UXS-015 §Responsive — never a wiring
  // surface on mobile; a stated limitation).
  let view = $state<'notebook' | 'canvas'>('notebook');
  const isTouch = browser ? matchMedia('(hover: none)').matches : false;

  // Goal switch re-seeds HERE, at the owner's level (holistic M1): the effect
  // used to live in Notebook, which is unmounted in canvas view — switching
  // goals there left the old goal's cells under the new goal's title forever.
  let lastGoalId = untrack(() => goal.id);
  $effect(() => {
    const gid = goal.id;
    if (gid !== lastGoalId) {
      lastGoalId = gid;
      labState.seedFromGoal(goal);
      if (browser && page.url.searchParams.has('nb')) {
        void goto(`${base}/lab`, { replaceState: true, keepFocus: true, noScroll: true });
      }
    }
  });

  // The registry uses dotted keys; paraglide ids are flat snake_case. Map
  // dot/hyphen → underscore and call the message fn (params for the few
  // parametrised strings). Falls back to the key if a message is missing.
  const messages = m as unknown as Record<string, (inputs?: Record<string, unknown>) => string>;
  function t(key: string, params?: Record<string, string | number>): string {
    const fn = messages[key.replace(/[.-]/g, '_')];
    return typeof fn === 'function' ? fn(params ?? {}) : key;
  }

  function goalLabel(id: string): string {
    const g = GOALS.get(id);
    return g ? t(g.titleKey) : id;
  }
</script>

<svelte:head>
  <title>{t('lab.ui.doc-title')}</title>
</svelte:head>

<div class="lab">
  <!-- Teal grid lab background (station-blueprint, UXS-015) -->
  <div class="lab__bg" aria-hidden="true"></div>

  <main class="lab__main">
    <header class="lab__header">
      <h1 class="lab__title">{t('lab.ui.title')}</h1>
      <p class="lab__subtitle">{t('lab.ui.subtitle')}</p>
    </header>

    <!-- Goal picker + view switch -->
    <div class="lab__picker">
      <label for="goal-select" class="lab__picker-label">{t('lab.ui.goal-picker')}</label>
      <select
        id="goal-select"
        class="lab__picker-select"
        bind:value={selectedGoalId}
        aria-label={t('lab.ui.aria-select-goal')}
      >
        {#each [...GOALS.keys()] as id (id)}
          <option value={id}>{goalLabel(id)}</option>
        {/each}
      </select>
      <div class="lab__views" role="tablist" aria-label={t('lab.ui.view-switch-aria')}>
        <button
          role="tab"
          aria-selected={view === 'notebook'}
          class="lab__view-btn"
          class:lab__view-btn--on={view === 'notebook'}
          onclick={() => (view = 'notebook')}>{t('lab.ui.view-notebook')}</button
        >
        <button
          role="tab"
          aria-selected={view === 'canvas'}
          class="lab__view-btn"
          class:lab__view-btn--on={view === 'canvas'}
          onclick={() => (view = 'canvas')}>{t('lab.ui.view-canvas')}</button
        >
      </div>
    </div>

    <!-- Both views project the ONE shared labState — switching can't lose an edit. -->
    <div class="lab__card-wrapper">
      {#if view === 'canvas'}
        <Canvas
          equationHtml={data.equationHtml}
          {t}
          {labState}
          readonly={isTouch}
          onPromoted={(cells) => {
            labState.adopt(cells);
            view = 'notebook';
          }}
          onFocusCard={(i) => {
            view = 'notebook';
            void goto(`${base}/lab?focus=${i}`, { replaceState: true, noScroll: true });
          }}
        />
        {#if isTouch}
          <p class="lab__canvas-note">{t('lab.canvas.readonly-note')}</p>
        {/if}
      {:else}
        <Notebook {goal} equationHtml={data.equationHtml} {t} {labState} />
      {/if}
    </div>
  </main>
</div>

<style>
  /* Full-viewport lab surface on the station-blueprint teal grid */
  .lab {
    position: relative;
    min-height: 100dvh;
    background: #04040c;
    color: #e8e8e8;
    overflow-x: hidden;
  }

  .lab__views {
    display: inline-flex;
    gap: 4px;
    margin-left: 12px;
  }
  .lab__view-btn {
    font-size: 11px;
    letter-spacing: 1px;
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 4px;
    background: transparent;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
  }
  .lab__view-btn--on {
    color: #fff;
    border-color: #4ecdc4;
    background: rgba(78, 205, 196, 0.08);
  }
  .lab__canvas-note {
    margin-top: 8px;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.55);
  }

  /* Graph-paper background grid (32px major, 8px minor — figure-style.ts tokens) */
  .lab__bg {
    position: fixed;
    inset: 0;
    background-image:
      linear-gradient(rgba(78, 205, 196, 0.032) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78, 205, 196, 0.032) 1px, transparent 1px),
      linear-gradient(rgba(78, 205, 196, 0.09) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78, 205, 196, 0.09) 1px, transparent 1px);
    background-size:
      8px 8px,
      8px 8px,
      32px 32px,
      32px 32px;
    pointer-events: none;
    z-index: 0;
  }

  .lab__main {
    position: relative;
    z-index: 1;
    max-width: 660px;
    margin: 0 auto;
    padding: 2rem 1rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  /* ─── Header ────────────────────────────────────────────────────────────── */
  .lab__header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .lab__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 2.5rem;
    letter-spacing: 4px;
    color: #4ecdc4;
    margin: 0;
    line-height: 1;
  }

  .lab__subtitle {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 1px;
    color: rgba(78, 205, 196, 0.55);
    margin: 0;
    text-transform: uppercase;
  }

  /* ─── Formula picker ────────────────────────────────────────────────────── */
  .lab__picker {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .lab__picker-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 0.5px;
    color: rgba(78, 205, 196, 0.65);
    text-transform: uppercase;
    white-space: nowrap;
  }

  .lab__picker-select {
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
    max-width: 320px;
  }

  .lab__picker-select:focus-visible {
    outline: 2px solid #4ecdc4;
    outline-offset: 2px;
  }

  /* ─── Card wrapper ──────────────────────────────────────────────────────── */
  .lab__card-wrapper {
    width: 100%;
  }

  /* ─── Responsive ────────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .lab__main {
      padding: 1.25rem 0.75rem 3rem;
    }

    .lab__title {
      font-size: 2rem;
    }

    .lab__picker {
      flex-direction: column;
      align-items: flex-start;
    }

    .lab__picker-select {
      max-width: 100%;
      width: 100%;
    }
  }
</style>
