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
  import * as m from '$lib/paraglide/messages';
  import { GOALS } from '$lib/physics/registry/goals';
  import Notebook from '$lib/lab/Notebook.svelte';
  import type { PageData } from './$types';

  type Props = { data: PageData };
  let { data }: Props = $props();

  // Goal picker — default to the M1 launch-a-rocket ladder.
  let selectedGoalId = $state('launch-a-rocket');
  const goal = $derived(GOALS.get(selectedGoalId) ?? [...GOALS.values()][0]);

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
  <title>Physics Lab · Orrery</title>
</svelte:head>

<div class="lab">
  <!-- Teal grid lab background (station-blueprint, UXS-015) -->
  <div class="lab__bg" aria-hidden="true"></div>

  <main class="lab__main">
    <header class="lab__header">
      <h1 class="lab__title">{t('lab.ui.title')}</h1>
      <p class="lab__subtitle">{t('lab.ui.subtitle')}</p>
    </header>

    <!-- Goal picker -->
    <div class="lab__picker">
      <label for="goal-select" class="lab__picker-label">{t('lab.ui.goal-picker')}</label>
      <select
        id="goal-select"
        class="lab__picker-select"
        bind:value={selectedGoalId}
        aria-label="Select goal"
      >
        {#each [...GOALS.keys()] as id (id)}
          <option value={id}>{goalLabel(id)}</option>
        {/each}
      </select>
    </div>

    <!-- Notebook — owns cell state; a goal-change effect re-seeds, so no remount -->
    <div class="lab__card-wrapper">
      <Notebook {goal} equationHtml={data.equationHtml} {t} />
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
