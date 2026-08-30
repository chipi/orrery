<!--
  /lab — Physics Lab, Notebook view shell (S3a).

  Shows one Card at a time (selected from a formula picker). The equation-HTML
  map was built at prerender time in +page.ts so KaTeX never ships to the browser
  (ADR-034). The t() resolver is a humanizing passthrough for S3a; S3d wires
  the real paraglide bundle.
-->
<script lang="ts">
  import 'katex/dist/katex.min.css';
  import { REGISTRY } from '$lib/physics/registry';
  import Card from '$lib/lab/Card.svelte';
  import type { PageData } from './$types';

  type Props = { data: PageData };
  let { data }: Props = $props();

  // Formula picker — default to tsiolkovsky
  let selectedId = $state('tsiolkovsky');

  const formula = $derived(REGISTRY.get(selectedId)!);
  const equationHtml = $derived(data.equationHtml[selectedId] ?? '');

  // S3a humanizing passthrough: last dot-segment, title-cased.
  // S3d replaces this with the real paraglide resolver.
  function t(key: string): string {
    const seg = key.split('.').at(-1) ?? key;
    return seg.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Human-readable formula label for the picker option
  function formulaLabel(id: string): string {
    const def = REGISTRY.get(id);
    if (!def) return id;
    return t(def.titleKey);
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
      <h1 class="lab__title">PHYSICS LAB</h1>
      <p class="lab__subtitle">Interactive formula explorer</p>
    </header>

    <!-- Formula picker -->
    <div class="lab__picker">
      <label for="formula-select" class="lab__picker-label">Formula</label>
      <select
        id="formula-select"
        class="lab__picker-select"
        bind:value={selectedId}
        aria-label="Select formula"
      >
        {#each [...REGISTRY.keys()] as id (id)}
          <option value={id}>{formulaLabel(id)}</option>
        {/each}
      </select>
    </div>

    <!-- Single card -->
    {#if formula}
      <div class="lab__card-wrapper">
        <Card {formula} {equationHtml} {t} />
      </div>
    {/if}
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
