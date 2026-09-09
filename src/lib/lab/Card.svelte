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
  import { bodyGravityMs2 } from '$lib/physics/mechanics/bodies';
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

  // Live update while typing — no clamp here so the value can be edited freely.
  function handleNumberInput(field: FieldSpec, e: Event): void {
    const v = parseFloat((e.currentTarget as HTMLInputElement).value);
    if (!isNaN(v)) onInput(field.key, v);
  }

  // Common input hygiene (operator): on blur/enter, clamp the entry to the
  // field's declared [min, max] so a stray key can't land on an absurd value.
  function handleNumberChange(field: FieldSpec, e: Event): void {
    const el = e.currentTarget as HTMLInputElement;
    let v = parseFloat(el.value);
    if (isNaN(v)) v = numVal(inputs[field.key]);
    if (typeof field.min === 'number') v = Math.max(field.min, v);
    if (typeof field.max === 'number') v = Math.min(field.max, v);
    el.value = String(v);
    onInput(field.key, v);
  }

  function handleSelectInput(field: FieldSpec, e: Event): void {
    onInput(field.key, (e.currentTarget as HTMLSelectElement).value);
  }

  function handleDateInput(field: FieldSpec, e: Event): void {
    onInput(field.key, (e.currentTarget as HTMLInputElement).value);
  }

  // FB5: a weight-style "world" input is really a gravity choice — show the selected
  // body's g in the label ("Gravity [9.81 m/s²]"). Opt-in via FieldSpec.gravityInLabel;
  // magnitude-aware so a micro-g body reads 2.250e-4, never a rounded-to-zero 0.00.
  function gravityFor(bodyId: number | string | undefined): string {
    const g = bodyGravityMs2(String(bodyId ?? 'earth'));
    return g >= 0.01 ? g.toFixed(2) : g.toExponential(2);
  }

  const SOURCE_LABEL: Record<string, string> = {
    hyperphysics: 'HyperPhysics',
    'nasa-glenn': 'NASA Glenn',
    wikipedia: 'Wikipedia',
  };

  // Format a numeric value compactly (readouts + derived wired cells).
  function fmt(v: number): string {
    if (Math.abs(v) >= 1e6 || (Math.abs(v) < 0.001 && v !== 0)) return v.toExponential(3);
    if (Math.abs(v) >= 100) return v.toFixed(2);
    return v.toFixed(4);
  }

  // a11y (review M-3): the visible readout updates on every keystroke, which would
  // flood a polite live region. Announce the SETTLED ok result on a debounce via a
  // dedicated visually-hidden region instead. Blocked/fail states are NOT announced
  // here — they already own a `role="alert"` node, so repeating them in the polite
  // region would double-announce (assertive now + polite 500ms later, same text).
  const summary = $derived(
    !blocked && result?.status.ok
      ? formula.outputs
          .map((o) => {
            const q = result.values[o.key];
            return q ? `${t(o.labelKey)} ${fmt(q.value)} ${q.units}` : '';
          })
          .filter(Boolean)
          .join(', ')
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
  </header>

  <!-- Equation — pre-rendered KaTeX HTML, never calls renderKatex at runtime -->
  {#if equationHtml}
    <div class="card__equation" aria-label={t('lab.ui.aria-equation')}>
      <!-- eslint-disable-next-line svelte/no-at-html-tags -- KaTeX server-rendered HTML, ADR-034 -->
      {@html equationHtml}
    </div>
  {/if}

  <!-- Glossary (FB2): read the equation as meaning — each symbol, the physical law, the
       link to earlier rungs — before substituting numbers. -->
  {#if formula.glossaryKey}
    <p class="card__glossary">{t(formula.glossaryKey)}</p>
  {/if}

  <!-- Parameter controls -->
  <section class="card__controls" aria-label={t('lab.ui.aria-parameters')}>
    <!-- A zero-input formula (e.g. cislunar-transfer) would render an empty section —
         say WHY there are no dials instead (advisor newcomer-gap, 2026-09-09). -->
    {#if formula.inputs.filter((f) => !f.injected).length === 0}
      <p class="card__no-inputs">{t('lab.ui.no-inputs')}</p>
    {/if}
    {#each formula.inputs.filter((f) => !f.injected) as field (field.key)}
      <div class="card__field" class:card__field--wired={wired.has(field.key)}>
        <label class="card__label" for="field-{formula.id}-{field.key}">
          {#if field.gravityInLabel}
            {t('lab.ui.gravity')} [{gravityFor(inputs[field.key])} m/s²]
          {:else}
            {t(field.labelKey)}{field.units ? ` [${field.units}]` : ''}
          {/if}
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
          <!-- Plain number field (no slider, operator V4): compact + clamps to
               the declared [min,max] on blur. -->
          <input
            id="field-{formula.id}-{field.key}"
            type="number"
            class="card__number"
            min={field.min}
            max={field.max}
            step={field.step ?? 'any'}
            value={numVal(inputs[field.key])}
            oninput={(e) => handleNumberInput(field, e)}
            onchange={(e) => handleNumberChange(field, e)}
            aria-label={t('lab.ui.aria-value', { label: t(field.labelKey) })}
          />
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
              <!-- Translated body name — lab.body.<id>, authored for every picker id
                   (earth/moon/mars/venus/mercury) and guarded by the i18n-parity test. -->
              <option value={bodyId}>{t(`lab.body.${bodyId}`)}</option>
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

  <!-- Debounced screen-reader announcement (settled ok result only, review M-3) -->
  <div class="card__sr" aria-live="polite" aria-atomic="true">{announced}</div>

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
        <!-- (result is !ok in this branch; the ternary guards the union narrowing) -->
      </div>
    {/if}
  </section>

  <!-- Data-staleness disclosure (H5 · #464): when a result carries epochAgeDays
       (TLE / ephemeris), show how old the element set is; past staleAfterDays,
       flag the readout as approximate. Honest even on a container that hasn't
       redeployed since the last refresh. -->
  {#if !blocked && result?.status.ok && result.epochAgeDays != null}
    {@const stale = formula.staleAfterDays != null && result.epochAgeDays > formula.staleAfterDays}
    <p class="card__staleness" class:card__staleness--stale={stale}>
      {t('lab.ui.tle-age', { days: Math.round(result.epochAgeDays) })}
      {#if stale}
        <span class="card__staleness-flag">{t('lab.ui.tle-stale')}</span>
      {/if}
    </p>
  {/if}

  <!-- Figure — big, at the very bottom (operator V4). Omitted when blocked or
       when the result has no figure. -->
  {#if !blocked && result?.figure}
    <div class="card__figure">
      <FigureRenderer figure={result.figure} {t} />
    </div>
  {/if}

  <!-- Honesty (W2): what the model leaves out. Shown for ok AND fail results (a fail
       computed under the same assumptions — AskScenarioView already shows both). -->
  {#if !blocked && result && result.assumptions?.length}
    <p class="card__assumptions">
      <span class="card__assumptions-label">{t('lab.ui.assumptions-label')}</span>
      {result.assumptions.map((k) => t(k)).join(' · ')}
    </p>
  {/if}

  <!-- Learn more — one row linking OUT: our own /science encyclopedia article
       (citationKey) and a curated external first-principles resource. -->
  {#if formula.citationKey || formula.learnMore}
    <footer class="card__learn">
      <span class="card__learn-label">{t('lab.ui.learn-more')}</span>
      {#if formula.citationKey}
        <a class="card__learn-link" href="{base}/science/{formula.citationKey}"
          >{t('lab.ui.learn-more-science')}</a
        >
      {/if}
      {#if formula.learnMore}
        <a
          class="card__learn-link card__learn-link--ext"
          href={formula.learnMore.url}
          target="_blank"
          rel="noopener noreferrer">{SOURCE_LABEL[formula.learnMore.source]} ↗</a
        >
      {/if}
    </footer>
  {/if}
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

  /* Data-staleness disclosure (H5) — subtle when fresh, mars-red when stale. */
  .card__staleness {
    margin: 0.5rem 0 0;
    font-size: 0.7rem;
    letter-spacing: 0.03em;
    color: rgba(232, 232, 232, 0.5);
  }
  .card__staleness--stale {
    color: #c1440e;
  }
  .card__staleness-flag {
    text-transform: uppercase;
    font-weight: 600;
    margin-left: 0.35rem;
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

  /* ─── Honesty: assumptions row (W2) ─────────────────────────────────── */
  .card__assumptions {
    margin: 0.2rem 0 0;
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.42);
  }

  .card__assumptions-label {
    color: rgba(255, 200, 80, 0.6); /* gold kicker — a stated limit, not a result */
    letter-spacing: 0.5px;
    margin-right: 0.35rem;
  }

  /* ─── Learn more (footer link row) ──────────────────────────────────── */
  .card__learn {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 0.9rem;
    border-top: 1px solid rgba(78, 205, 196, 0.12);
    padding-top: 0.7rem;
    margin-top: 0.2rem;
  }

  .card__learn-label {
    font-family: 'Space Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
  }

  .card__learn-link {
    font-family: 'Space Mono', monospace;
    font-size: 0.72rem;
    color: #4ecdc4;
    text-decoration: none;
    border-bottom: 1px solid rgba(78, 205, 196, 0.35);
    padding-bottom: 1px;
    transition: color 0.15s;
  }

  .card__learn-link--ext {
    color: #ffc850; /* gold = leaves Orrery (colour discipline) */
    border-bottom-color: rgba(255, 200, 80, 0.4);
  }

  .card__learn-link:hover,
  .card__learn-link:focus-visible {
    color: #fff;
    outline: 2px solid rgba(78, 205, 196, 0.5);
    outline-offset: 2px;
  }

  /* ─── Equation (KaTeX HTML, server-rendered) ──────────────────────── */
  .card__equation {
    /* The formula is the card's hero (operator V4): dominant size, centred.
       KaTeX sizes relative to this container's font-size. */
    overflow-x: auto;
    overflow-y: hidden;
    padding: 0.75rem 0 0.9rem;
    color: rgba(255, 255, 255, 0.95);
    font-size: 1.35rem;
    text-align: center;
  }

  /* Glossary (FB2) — "read the equation" prose under the formula. */
  .card__glossary {
    margin: 0 0 0.9rem;
    font-size: 0.82rem;
    line-height: 1.55;
    color: rgba(232, 232, 232, 0.72);
    border-left: 2px solid rgba(78, 205, 196, 0.3);
    padding-left: 0.7rem;
  }

  .card__no-inputs {
    margin: 0;
    font-family: 'Space Mono', monospace;
    font-size: 0.68rem;
    color: rgba(232, 232, 232, 0.55);
    font-style: italic;
  }

  /* ─── Controls ───────────────────────────────────────────────────────── */
  /* Compact 2-up grid (operator V4): inputs no longer eat vertical space. */
  .card__controls {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem 0.75rem;
  }

  .card__field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    min-width: 0;
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

  .card__number {
    font-family: 'Space Mono', monospace;
    font-size: 0.75rem;
    width: 100%;
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
    width: 100%;
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
    width: 100%;
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
  /* Full-width at the card bottom (operator V4): the SVG scales to this box, so
     spanning the card is what "zooms in" on the picture. */
  .card__figure {
    border-radius: 4px;
    overflow: hidden;
    margin-top: 0.25rem;
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

    .card__controls {
      gap: 0.5rem 0.6rem;
    }

    .card__equation {
      font-size: 1.15rem;
    }
  }
</style>
