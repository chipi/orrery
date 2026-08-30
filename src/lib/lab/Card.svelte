<!--
  Card — a single formula instance (S3a · UXS-015 §"The card").

  Props:
    formula      — FormulaDef for this card
    equationHtml — pre-rendered KaTeX HTML (from +page.ts build-time map; ADR-034)
    t            — i18n resolver; S3a uses a key-passthrough; S3d wires paraglide

  States (plan §2):
    ok            — normal readout (teal)
    fail-honest   — !result.status.ok → mars-red readout + reason key
    upstream-failed — S3b wired inputs; placeholder comment marks the extension point

  Momentum (no figure) → FigureRenderer is omitted gracefully.
  KaTeX is NOT imported here — equationHtml is already-rendered static HTML.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import type { FormulaDef, FieldSpec } from '$lib/physics/spec';
  import FigureRenderer from './FigureRenderer.svelte';
  import { defaultInputs } from '$lib/physics/registry';

  type Props = {
    formula: FormulaDef;
    equationHtml: string;
    t: (key: string) => string;
  };

  let { formula, equationHtml, t }: Props = $props();

  // ─── Local input state, seeded from formula defaults ──────────────────────
  // `formulaId` and `formulaDefaults` are $derived so the $effect below can
  // read reactive values rather than the prop directly, avoiding the
  // state_referenced_locally warning that fires when a prop is read in a
  // $state initializer or $effect without going through a reactive binding.
  const formulaId = $derived(formula.id);
  const formulaDefaults = $derived(defaultInputs(formula));

  let trackedId = $state('');
  let inputs = $state<Record<string, number | string>>({});

  // Reset inputs to defaults whenever the formula changes.
  $effect(() => {
    if (formulaId !== trackedId) {
      trackedId = formulaId;
      inputs = { ...formulaDefaults };
    }
  });

  // ─── Recompute on every input change ─────────────────────────────────────
  const result = $derived(formula.compute(inputs));

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function numVal(v: number | string): number {
    return typeof v === 'number' ? v : parseFloat(v) || 0;
  }

  function handleNumberInput(field: FieldSpec, e: Event): void {
    const el = e.currentTarget as HTMLInputElement;
    const v = parseFloat(el.value);
    if (!isNaN(v)) {
      inputs = { ...inputs, [field.key]: v };
    }
  }

  function handleSelectInput(field: FieldSpec, e: Event): void {
    const el = e.currentTarget as HTMLSelectElement;
    inputs = { ...inputs, [field.key]: el.value };
  }

  function handleDateInput(field: FieldSpec, e: Event): void {
    const el = e.currentTarget as HTMLInputElement;
    inputs = { ...inputs, [field.key]: el.value };
  }

  // Format a numeric output value compactly
  function fmt(v: number): string {
    if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(3);
    if (Math.abs(v) >= 100) return v.toFixed(2);
    return v.toFixed(4);
  }
</script>

<article class="card" class:card--fail={!result.status.ok}>
  <!-- Title -->
  <header class="card__header">
    <h2 class="card__title">{t(formula.titleKey)}</h2>
    {#if formula.citationKey}
      <!-- Why? affordance — gold, links to /science deep-link -->
      <a
        href="{base}/science/{formula.citationKey}"
        class="card__why"
        aria-label="Why? — derivation on /science"
        title="Why? See derivation">?</a
      >
    {/if}
  </header>

  <!-- Equation — pre-rendered KaTeX HTML, never calls renderKatex at runtime -->
  {#if equationHtml}
    <div class="card__equation" aria-label="Formula equation">
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX server-rendered HTML, ADR-034 -->
      {@html equationHtml}
    </div>
  {/if}

  <!-- Parameter controls -->
  <section class="card__controls" aria-label="Parameters">
    {#each formula.inputs as field (field.key)}
      <div class="card__field">
        <label class="card__label" for="field-{formula.id}-{field.key}">
          {t(field.labelKey)}{field.units ? ` (${field.units})` : ''}
        </label>

        {#if field.kind === 'number'}
          <div class="card__number-row">
            <input
              id="field-{formula.id}-{field.key}"
              type="range"
              class="card__slider"
              min={field.min ?? 0}
              max={field.max ?? 1000}
              step={field.step ?? ((field.max ?? 1000) - (field.min ?? 0)) / 500}
              value={numVal(inputs[field.key])}
              oninput={(e) => handleNumberInput(field, e)}
              aria-label="{t(field.labelKey)} slider"
            />
            <input
              type="number"
              class="card__number"
              min={field.min}
              max={field.max}
              step={field.step ?? 'any'}
              value={numVal(inputs[field.key])}
              oninput={(e) => handleNumberInput(field, e)}
              aria-labelledby="field-{formula.id}-{field.key}"
              aria-label="{t(field.labelKey)} value"
            />
          </div>
        {:else if field.kind === 'enum'}
          <select
            id="field-{formula.id}-{field.key}"
            class="card__select"
            value={String(inputs[field.key])}
            onchange={(e) => handleSelectInput(field, e)}
          >
            {#each field.enumValues ?? [] as ev (ev.value)}
              <option value={ev.value}>{t(ev.labelKey)}</option>
            {/each}
          </select>
        {:else if field.kind === 'body'}
          <select
            id="field-{formula.id}-{field.key}"
            class="card__select"
            value={String(inputs[field.key])}
            onchange={(e) => handleSelectInput(field, e)}
          >
            {#each field.bodyIds ?? [] as bodyId (bodyId)}
              <option value={bodyId}>{bodyId.replace(/^\w/, (c) => c.toUpperCase())}</option>
            {/each}
          </select>
        {:else if field.kind === 'date'}
          <input
            id="field-{formula.id}-{field.key}"
            type="date"
            class="card__date"
            value={String(inputs[field.key])}
            onchange={(e) => handleDateInput(field, e)}
          />
        {/if}
      </div>
    {/each}
  </section>

  <!-- Figure — omitted when result has no figure (e.g. momentum) -->
  {#if result.figure}
    <div class="card__figure">
      <FigureRenderer figure={result.figure} {t} />
    </div>
  {/if}

  <!-- Readout grid -->
  <section
    class="card__readout"
    class:card__readout--fail={!result.status.ok}
    aria-label="Results"
    aria-live="polite"
  >
    {#if result.status.ok}
      {#each formula.outputs as out (out.key)}
        {@const qty = result.values[out.key]}
        {#if qty !== undefined}
          <div class="card__readout-row">
            <span class="card__readout-label">{t(out.labelKey)}</span>
            <span class="card__readout-value">
              {fmt(qty.value)}<span class="card__readout-unit">{qty.units}</span>
            </span>
          </div>
        {/if}
      {/each}
    {:else}
      <!-- fail-honest state: mars-red + reason key -->
      <div class="card__readout-fail" role="alert">
        <span class="card__readout-fail-icon" aria-hidden="true">&#9888;</span>
        {t(result.status.reasonKey)}
      </div>
      <!-- S3b: upstream-failed state wired here when a fromCard input is absent/failed -->
      <!-- // S3b: upstream-failed — check wires; if source card !ok → show "upstream failed" -->
    {/if}
  </section>
</article>

<style>
  /* Design tokens from UXS-015 + notebook.html prototype */
  .card {
    background: #04040c;
    border: 1px solid rgba(78, 205, 196, 0.22);
    border-radius: 4px;
    padding: 1.25rem 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    color: #e8e8e8;
    max-width: 600px;
    width: 100%;
  }

  .card--fail {
    border-color: rgba(193, 68, 14, 0.35);
  }

  /* ─── Header ─────────────────────────────────────────────────────────── */
  .card__header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
  }

  .card__title {
    font-family: 'Bebas Neue', sans-serif;
    font-size: 1.5rem;
    letter-spacing: 3px;
    color: #e8e8e8;
    margin: 0;
    line-height: 1;
    flex: 1;
  }

  /* Why? — gold affordance (UXS-015 §colour discipline) */
  .card__why {
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    color: #ffc850;
    border: 1px solid rgba(255, 200, 80, 0.45);
    border-radius: 50%;
    width: 1.3rem;
    height: 1.3rem;
    display: flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .card__why:hover,
  .card__why:focus-visible {
    background: rgba(255, 200, 80, 0.12);
    outline: 2px solid #ffc850;
    outline-offset: 2px;
  }

  /* ─── Equation (KaTeX HTML, server-rendered) ──────────────────────── */
  .card__equation {
    /* KaTeX display mode centres by default; keep it in the card flow */
    overflow-x: auto;
    padding: 0.5rem 0;
    color: rgba(255, 255, 255, 0.9);
  }

  /* ─── Controls ───────────────────────────────────────────────────────── */
  .card__controls {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .card__field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .card__label {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 0.5px;
    color: rgba(78, 205, 196, 0.75);
    text-transform: uppercase;
  }

  .card__number-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .card__slider {
    flex: 1;
    accent-color: #4ecdc4;
    /* 44px touch target height — AGENTS.md mobile-first */
    height: 44px;
    cursor: pointer;
  }

  .card__number {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    width: 7rem;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.2);
    border-radius: 2px;
    color: #e8e8e8;
    padding: 0.3rem 0.4rem;
    /* number inputs get a 44px min-height for touch */
    min-height: 44px;
  }

  .card__number:focus-visible {
    outline: 2px solid #4ecdc4;
    outline-offset: 2px;
  }

  .card__select {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.2);
    border-radius: 2px;
    color: #e8e8e8;
    padding: 0.3rem 0.4rem;
    min-height: 44px;
    cursor: pointer;
  }

  .card__select:focus-visible {
    outline: 2px solid #4ecdc4;
    outline-offset: 2px;
  }

  .card__date {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    background: rgba(78, 205, 196, 0.06);
    border: 1px solid rgba(78, 205, 196, 0.2);
    border-radius: 2px;
    color: #e8e8e8;
    padding: 0.3rem 0.4rem;
    min-height: 44px;
  }

  .card__date:focus-visible {
    outline: 2px solid #4ecdc4;
    outline-offset: 2px;
  }

  /* ─── Figure wrapper ─────────────────────────────────────────────────── */
  .card__figure {
    border-radius: 2px;
    overflow: hidden;
  }

  /* ─── Readout grid ───────────────────────────────────────────────────── */
  .card__readout {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    border-top: 1px solid rgba(78, 205, 196, 0.12);
    padding-top: 0.75rem;
  }

  .card__readout--fail {
    border-top-color: rgba(193, 68, 14, 0.3);
  }

  .card__readout-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .card__readout-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 0.5px;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
  }

  .card__readout-value {
    font-family: 'Space Mono', monospace;
    font-size: 0.95rem;
    font-weight: bold;
    color: #4ecdc4; /* teal strong cell — UXS-015 */
  }

  .card__readout-unit {
    font-size: 0.62rem;
    margin-left: 0.2rem;
    color: rgba(78, 205, 196, 0.6);
    font-weight: normal;
  }

  /* fail-honest state (mars-red, UXS-015) */
  .card__readout-fail {
    font-family: 'Space Mono', monospace;
    font-size: 0.8rem;
    color: #c1440e;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .card__readout-fail-icon {
    font-size: 1rem;
  }

  /* ─── Responsive ─────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .card {
      padding: 1rem 0.875rem 0.875rem;
    }

    .card__number-row {
      flex-direction: column;
      align-items: stretch;
    }

    .card__number {
      width: 100%;
    }
  }
</style>
