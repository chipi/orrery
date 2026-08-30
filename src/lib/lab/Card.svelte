<!--
  Card — a single formula instance (S3a card · S3b controlled).

  CONTROLLED: the parent (Notebook) owns cell state + runs the recompute engine,
  then hands each card its `inputs` (wired values already substituted), its
  `result`, and the `wiredKeys`/`upstreamFailed` flags. The card is presentational:
  it renders controls, emits `onInput(key, value)`, and never computes wiring.

  Props:
    formula        — FormulaDef for this card
    equationHtml   — pre-rendered KaTeX HTML (build-time map; ADR-034)
    t              — i18n resolver (S3a passthrough; S3d wires paraglide)
    inputs         — current input values (resolved: wired keys already substituted)
    result         — FormulaResult, or null when upstreamFailed (nothing computed)
    onInput        — (key, value) → parent updates cell state → recompute
    wiredKeys      — inputs driven by a wire → rendered read-only "derived"
    blocked        — this cell produced no honest result (upstream-failed / invalid-wire /
                     compute-error). Surface `blockedMessage`, do NOT fake a result.
    blockedMessage — the honest reason the cell is blocked

  States (plan §2): ok (teal) · fail-honest (mars-red + reasonKey) · blocked (mars-red +
  reason). Momentum (no figure) → FigureRenderer omitted. KaTeX is NOT imported here.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import type { FormulaDef, FieldSpec, FormulaResult } from '$lib/physics/spec';
  import FigureRenderer from './FigureRenderer.svelte';

  type Props = {
    formula: FormulaDef;
    equationHtml: string;
    t: (key: string, params?: Record<string, string | number>) => string;
    inputs: Record<string, number | string>;
    result: FormulaResult | null;
    onInput: (key: string, value: number | string) => void;
    wiredKeys?: string[];
    blocked?: boolean;
    blockedMessage?: string;
  };

  let {
    formula,
    equationHtml,
    t,
    inputs,
    result,
    onInput,
    wiredKeys = [],
    blocked = false,
    blockedMessage = '',
  }: Props = $props();

  const wired = $derived(new Set(wiredKeys));
  const failed = $derived(blocked || (result != null && !result.status.ok));

  // ─── Helpers ─────────────────────────────────────────────────────────────
  function numVal(v: number | string | undefined): number {
    if (typeof v === 'number') return v;
    return v == null ? 0 : parseFloat(v) || 0;
  }

  function handleNumberInput(field: FieldSpec, e: Event): void {
    const v = parseFloat((e.currentTarget as HTMLInputElement).value);
    if (!isNaN(v)) onInput(field.key, v);
  }

  function handleSelectInput(field: FieldSpec, e: Event): void {
    onInput(field.key, (e.currentTarget as HTMLSelectElement).value);
  }

  function handleDateInput(field: FieldSpec, e: Event): void {
    onInput(field.key, (e.currentTarget as HTMLInputElement).value);
  }

  // Format a numeric value compactly (readouts + derived wired cells).
  function fmt(v: number): string {
    if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(3);
    if (Math.abs(v) >= 100) return v.toFixed(2);
    return v.toFixed(4);
  }

  // a11y (review M-3): the visible readout updates on every slider tick, which would
  // flood a polite live region. Announce a settled summary on a debounce instead, via
  // a dedicated visually-hidden region — the visible readout carries no aria-live.
  const summary = $derived(
    blocked
      ? blockedMessage
      : result?.status.ok
        ? formula.outputs
            .map((o) => {
              const q = result.values[o.key];
              return q ? `${t(o.labelKey)} ${fmt(q.value)} ${q.units}` : '';
            })
            .filter(Boolean)
            .join(', ')
        : result && !result.status.ok
          ? t(result.status.reasonKey)
          : '',
  );
  let announced = $state('');
  let announceTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const next = summary;
    clearTimeout(announceTimer);
    announceTimer = setTimeout(() => (announced = next), 500);
    return () => clearTimeout(announceTimer);
  });
</script>

<article class="card" class:card--fail={failed}>
  <!-- Title -->
  <header class="card__header">
    <h2 class="card__title">{t(formula.titleKey)}</h2>
    {#if formula.citationKey}
      <!-- Why? affordance — gold, links to /science deep-link -->
      <a
        href="{base}/science/{formula.citationKey}"
        class="card__why"
        aria-label={t('lab.ui.aria-why')}
        title={t('lab.ui.why-title')}>?</a
      >
    {/if}
  </header>

  <!-- Equation — pre-rendered KaTeX HTML, never calls renderKatex at runtime -->
  {#if equationHtml}
    <div class="card__equation" aria-label={t('lab.ui.aria-equation')}>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX server-rendered HTML, ADR-034 -->
      {@html equationHtml}
    </div>
  {/if}

  <!-- Parameter controls -->
  <section class="card__controls" aria-label={t('lab.ui.aria-parameters')}>
    {#each formula.inputs as field (field.key)}
      <div class="card__field" class:card__field--wired={wired.has(field.key)}>
        <label class="card__label" for="field-{formula.id}-{field.key}">
          {t(field.labelKey)}{field.units ? ` (${field.units})` : ''}
          {#if wired.has(field.key)}
            <span class="card__wired-chip" title={t('lab.ui.wired-title')}
              >&#8592; {t('lab.ui.wired')}</span
            >
          {/if}
        </label>

        {#if wired.has(field.key)}
          <!-- Wire-driven input: read-only derived value (not user-editable) -->
          <output id="field-{formula.id}-{field.key}" class="card__derived">
            {#if blocked}
              <span class="card__derived-void">{t('lab.ui.no-value')}</span>
            {:else}
              {fmt(numVal(inputs[field.key]))}<span class="card__derived-unit">{field.units}</span>
            {/if}
          </output>
        {:else if field.kind === 'number'}
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
              aria-label={t('lab.ui.aria-slider', { label: t(field.labelKey) })}
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
              aria-label={t('lab.ui.aria-value', { label: t(field.labelKey) })}
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

  <!-- Figure — omitted when blocked or when the result has no figure -->
  {#if !blocked && result?.figure}
    <div class="card__figure">
      <FigureRenderer figure={result.figure} {t} />
    </div>
  {/if}

  <!-- Debounced screen-reader announcement (settled result only, review M-3) -->
  <div class="card__sr" aria-live="polite">{announced}</div>

  <!-- Readout grid — visible; no aria-live (the card__sr region announces) -->
  <section
    class="card__readout"
    class:card__readout--fail={failed}
    aria-label={t('lab.ui.aria-results')}
  >
    {#if blocked}
      <!-- blocked: no honest result (upstream-failed / invalid-wire / compute-error). -->
      <div class="card__readout-fail" role="alert">
        <span class="card__readout-fail-icon" aria-hidden="true">&#9888;</span>
        {blockedMessage}
      </div>
    {:else if result?.status.ok}
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
    {:else if result}
      <!-- fail-honest state: mars-red + reason key -->
      <div class="card__readout-fail" role="alert">
        <span class="card__readout-fail-icon" aria-hidden="true">&#9888;</span>
        {t(result.status.ok ? '' : result.status.reasonKey)}
      </div>
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
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  /* Wired input — gold "derived" chip + read-only value cell */
  .card__wired-chip {
    font-size: 0.55rem;
    color: #ffc850;
    letter-spacing: 0.5px;
  }

  .card__derived {
    font-family: 'Space Mono', monospace;
    font-size: 0.95rem;
    font-weight: bold;
    color: #ffc850; /* gold — this value came from a wire, not the user */
    background: rgba(255, 200, 80, 0.06);
    border: 1px dashed rgba(255, 200, 80, 0.4);
    border-radius: 2px;
    padding: 0.5rem 0.6rem;
    min-height: 44px;
    display: flex;
    align-items: center;
  }

  .card__derived-unit {
    font-size: 0.62rem;
    margin-left: 0.25rem;
    color: rgba(255, 200, 80, 0.6);
    font-weight: normal;
  }

  .card__derived-void {
    color: #c1440e;
    font-weight: normal;
    font-size: 0.8rem;
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

  /* Visually-hidden live region for the debounced result announcement */
  .card__sr {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
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
