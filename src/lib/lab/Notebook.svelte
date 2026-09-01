<!--
  Notebook — renders a Goal as an ordered, narrated column of formula cards
  (S3b · RFC-037 §10 S3 · UXS-015 notebook.html). THE state owner: it holds the
  cell list, runs the pure recompute engine (`notebook.ts`) reactively, and hands
  each Card its resolved inputs + result + wire flags. Cards are presentational.

  A goal step may WIRE its input from an earlier step's output (index-order, plan
  M4). `+ ADD CELL` appends an unwired sandbox card from the registry palette.

  Lifecycle (S3c): seeded synchronously from the goal at construction (untracked) so
  the prerendered HTML already contains every card. A goal-change $effect re-seeds on
  a picker switch (no remount). onMount opens an incoming ?nb= share link as a custom
  notebook. Edits auto-save to localStorage and Share encodes the notebook into ?nb=.
-->
<script lang="ts">
  import { untrack, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';
  import type { Goal, FormulaResult } from '$lib/physics/spec';
  import { REGISTRY, defaultInputs } from '$lib/physics/registry';
  import { recomputeNotebook, type Cell, type CellComputed, type CellWire } from './notebook';
  import {
    encodeNotebook,
    decodeNotebook,
    encodeOrrlab,
    decodeOrrlab,
    MAX_ORRLAB_BYTES,
    type CodecCell,
  } from './codec';
  import Card from './Card.svelte';
  import FlightMapCanvas from './FlightMapCanvas.svelte';
  import { getFlightMap } from './flight-maps';

  type Props = {
    goal: Goal;
    equationHtml: Record<string, string>;
    t: (key: string, params?: Record<string, string | number>) => string;
  };

  let { goal, equationHtml, t }: Props = $props();

  const LS_KEY = 'orrlab:last';

  /** UI cell = recompute Cell + presentational extras (id, narrative, removability). */
  interface UICell extends Cell {
    id: string;
    wires: CellWire[];
    selection?: Record<string, number | string>;
    narrativeKey?: string;
    removable: boolean;
  }

  // Ids: seed cells get deterministic `s{i}` (hydration-stable — SSR + client agree);
  // cells created client-side (add / restore) get a uuid (only ever called in the
  // browser — fromCodec runs in onMount, addCell on click).
  const uid = () => crypto.randomUUID();

  function seed(g: Goal): UICell[] {
    return g.path.map((step, i) => {
      const def = REGISTRY.get(step.formulaId)!;
      // Goal presets override the formula defaults (only keys that are real inputs).
      const inputKeys = new Set(def.inputs.map((f) => f.key));
      const preset = Object.fromEntries(
        Object.entries(step.presetInputs ?? {}).filter(([k]) => inputKeys.has(k)),
      );
      return {
        id: `s${i}`,
        formulaId: step.formulaId,
        inputs: { ...defaultInputs(def), ...preset },
        wires: (step.wiresFrom ?? []).map((w) => ({
          fromIndex: w.fromStep,
          output: w.output,
          toInput: w.toInput,
        })),
        narrativeKey: step.narrativeKey,
        removable: false,
      };
    });
  }

  /** A shared/restored notebook is a CUSTOM notebook — no goal narrative, all removable. */
  function fromCodec(cells: CodecCell[]): UICell[] {
    return cells.map((c) => ({
      id: uid(),
      formulaId: c.formulaId,
      inputs: c.inputs,
      wires: c.wires ?? [],
      selection: c.selection,
      removable: true,
    }));
  }

  function toCodec(cs: UICell[]): CodecCell[] {
    return cs.map((c) => ({
      formulaId: c.formulaId,
      inputs: c.inputs,
      selection: c.selection,
      wires: c.wires,
    }));
  }

  // SSR/prerender seeds from the goal so the static HTML matches first client render.
  let cells = $state<UICell[]>(untrack(() => seed(goal)));
  let lastGoalId = untrack(() => goal.id);
  let restored = $state(false); // loaded from a ?nb= link → showing a custom notebook

  // The whole notebook recomputes on any input edit — trivially cheap for M1.
  const computed = $derived(recomputeNotebook(cells, REGISTRY));

  /** The capstone/milestone GRAND HERO — a whole-mission flight map, shown atop the notebook. */
  const flightMap = $derived(restored ? null : getFlightMap(goal.id));

  // First client load: an incoming ?nb= share link overrides the goal seed and
  // becomes a custom notebook. Post-hydration so SSR and first render agree. We do
  // NOT auto-restore the localStorage save over a goal — that would silently strip
  // the lesson narratives on refresh; S3c.3 adds a considered "resume" affordance.
  onMount(() => {
    const shared = page.url.searchParams.get('nb');
    if (!shared) return;
    const decoded = decodeNotebook(shared, REGISTRY);
    if (decoded && decoded.length > 0) {
      cells = fromCodec(decoded);
      restored = true;
    }
  });

  // A real goal switch (picker) wins over any restore: fresh seed + drop ?nb=.
  $effect(() => {
    const gid = goal.id;
    if (gid !== lastGoalId) {
      lastGoalId = gid;
      cells = seed(goal);
      restored = false;
      if (browser && page.url.searchParams.has('nb')) {
        void goto(`${base}/lab`, { replaceState: true, keepFocus: true, noScroll: true });
      }
    }
  });

  // Auto-save the working notebook to localStorage (debounced) — survives refresh.
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  $effect(() => {
    const encoded = encodeNotebook(toCodec(cells)); // tracks cells
    if (!browser) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, encoded);
      } catch {
        // ignore quota / private-mode failures
      }
    }, 400);
    return () => clearTimeout(saveTimer);
  });

  // ─── Share ───────────────────────────────────────────────────────────────
  let shareState = $state<'idle' | 'copied' | 'failed'>('idle');
  let shareTimer: ReturnType<typeof setTimeout> | undefined;
  async function share(): Promise<void> {
    const encoded = encodeNotebook(toCodec(cells));
    await goto(`${base}/lab?nb=${encoded}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
    try {
      await navigator.clipboard.writeText(window.location.href);
      shareState = 'copied';
    } catch {
      shareState = 'failed';
    }
    clearTimeout(shareTimer);
    shareTimer = setTimeout(() => (shareState = 'idle'), 2000);
  }

  // ─── Save / Load .orrlab.json (durable file) ──────────────────────────────
  let fileInput = $state<HTMLInputElement>();
  let loadError = $state('');

  function saveFile(): void {
    const title = restored ? t('lab.ui.your-notebook') : t(goal.titleKey);
    const doc = encodeOrrlab(cells, title);
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notebook.orrlab.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function loadFile(e: Event): Promise<void> {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file
    if (!file) return;
    loadError = '';
    if (file.size > MAX_ORRLAB_BYTES) {
      loadError = t('lab.ui.load-error-toobig');
      return;
    }
    try {
      const decoded = decodeOrrlab(JSON.parse(await file.text()), REGISTRY);
      if (decoded && decoded.cells.length > 0) {
        cells = fromCodec(decoded.cells);
        restored = true;
      } else {
        loadError = t('lab.ui.load-error-invalid');
      }
    } catch {
      loadError = t('lab.ui.load-error-read');
    }
  }

  // ─── Focus (one card full-width) — a URL-param mode, not a sub-route ───────
  // Index-based (?focus=<i>) so it survives reload for goal + shared notebooks alike.
  const focusIndex = $derived.by<number | null>(() => {
    const raw = browser ? page.url.searchParams.get('focus') : null;
    if (raw == null) return null;
    const n = Number(raw);
    return Number.isInteger(n) && n >= 0 && n < cells.length ? n : null;
  });

  function setFocus(i: number | null): void {
    const params = new URLSearchParams(page.url.search);
    if (i == null) params.delete('focus');
    else params.set('focus', String(i));
    const qs = params.toString();
    void goto(`${base}/lab${qs ? `?${qs}` : ''}`, {
      replaceState: true,
      keepFocus: true,
      noScroll: true,
    });
  }

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
      { id: uid(), formulaId: def.id, inputs: defaultInputs(def), wires: [], removable: true },
    ];
  }

  // Removing cell i drops any wire sourced from it and shifts higher source indices
  // down by one, so index-based wires stay pointed at the right cells (review M-1).
  function removeCell(i: number): void {
    cells = cells
      .filter((_, idx) => idx !== i)
      .map((c) => ({
        ...c,
        wires: c.wires
          .filter((w) => w.fromIndex !== i)
          .map((w) => ({ ...w, fromIndex: w.fromIndex > i ? w.fromIndex - 1 : w.fromIndex })),
      }));
    // Keep ?focus pointing at the same card after the index shift (review MINOR-3):
    // the removed card clears focus; a card before it shifts down by one.
    const fi = focusIndex;
    if (fi !== null) {
      if (i === fi) setFocus(null);
      else if (i < fi) setFocus(fi - 1);
    }
  }

  function labelFor(id: string): string {
    const def = REGISTRY.get(id);
    return def ? t(def.titleKey) : id;
  }

  /**
   * Map a cell's computed state to the Card's presentational props. A blocked cell
   * (upstream-failed / invalid-wire / compute-error) shows its honest reason and no
   * result — never a defaulted value. Messages are English literals for now; S3d
   * routes them through paraglide (they take a step-number param).
   */
  function view(
    state: CellComputed | undefined,
    cell: UICell,
  ): {
    blocked: boolean;
    message: string;
    result: FormulaResult | null;
    wiredKeys: string[];
    inputs: Record<string, number | string>;
  } {
    const wiredKeys =
      state && 'wiredKeys' in state ? state.wiredKeys : cell.wires.map((w) => w.toInput);
    const base = { blocked: true, message: '', result: null, wiredKeys, inputs: cell.inputs };
    if (!state) return base;
    switch (state.status) {
      case 'ok':
      case 'fail':
        return {
          blocked: false,
          message: '',
          result: state.result,
          wiredKeys,
          inputs: state.resolvedInputs,
        };
      case 'upstream-failed':
        return {
          ...base,
          message: t('lab.blocked.upstream-failed', { step: state.fromIndex + 1 }),
        };
      case 'invalid-wire':
        return {
          ...base,
          message: t('lab.blocked.invalid-wire', {
            step: state.fromIndex + 1,
            output: state.output,
          }),
        };
      case 'compute-error':
        return { ...base, message: t('lab.blocked.compute-error') };
      case 'unknown-formula':
        return { ...base, message: t('lab.ui.unknown-formula', { id: state.formulaId }) };
    }
  }
</script>

<!-- One card + its action rail (focus / remove) — reused in notebook + focus modes. -->
{#snippet cardCell(cell: UICell, i: number)}
  {@const state = computed[i]}
  {@const formula = REGISTRY.get(cell.formulaId)}
  {#if !formula}
    <p class="nb__unknown" role="alert">{t('lab.ui.unknown-formula', { id: cell.formulaId })}</p>
  {:else}
    {@const v = view(state, cell)}
    <div class="nb__card">
      <div class="nb__card-actions">
        <button
          type="button"
          class="nb__act"
          onclick={() => setFocus(focusIndex === i ? null : i)}
          aria-label={focusIndex === i ? t('lab.ui.exit-focus') : t('lab.ui.focus-cell')}
          title={t('lab.ui.focus-cell')}>⤢</button
        >
        {#if cell.removable}
          <button
            type="button"
            class="nb__act nb__act--danger"
            onclick={() => removeCell(i)}
            aria-label={t('lab.ui.remove-cell')}
            title={t('lab.ui.remove-cell')}>&times;</button
          >
        {/if}
      </div>
      <Card
        {formula}
        equationHtml={equationHtml[cell.formulaId] ?? ''}
        {t}
        inputs={v.inputs}
        result={v.result}
        wiredKeys={v.wiredKeys}
        blocked={v.blocked}
        blockedMessage={v.message}
        onInput={(key, value) => setInput(i, key, value)}
      />
    </div>
  {/if}
{/snippet}

<section class="nb" aria-label={t('lab.ui.aria-notebook')}>
  {#if focusIndex !== null}
    <!-- Focus mode — one card full-width, back link clears ?focus -->
    {@const cell = cells[focusIndex]}
    <div class="nb__focus-view">
      <button type="button" class="nb__back" onclick={() => setFocus(null)}>
        ← {t('lab.ui.back-to-notebook')}
      </button>
      <div class="nb__focus-head">
        <span class="nb__index">{focusIndex + 1}</span>
        {#if cell.narrativeKey}<p class="nb__narrative">{t(cell.narrativeKey)}</p>{/if}
      </div>
      {@render cardCell(cell, focusIndex)}
    </div>
  {:else}
    <header class="nb__head">
      <div class="nb__goal">
        <span class="nb__goal-kicker"
          >{restored ? t('lab.ui.custom-notebook') : t('lab.ui.goal')}</span
        >
        <h2 class="nb__goal-title">{restored ? t('lab.ui.your-notebook') : t(goal.titleKey)}</h2>
      </div>
      <div class="nb__tools">
        <button
          type="button"
          class="nb__tool nb__tool--accent"
          class:nb__tool--done={shareState === 'copied'}
          onclick={share}
          aria-label={t('lab.ui.aria-share')}
        >
          {shareState === 'copied'
            ? '✓ ' + t('lab.ui.share-copied')
            : shareState === 'failed'
              ? t('lab.ui.share-in-url')
              : t('lab.ui.share')}
        </button>
        <button type="button" class="nb__tool" onclick={saveFile} aria-label={t('lab.ui.aria-save')}
          >{t('lab.ui.save')}</button
        >
        <button
          type="button"
          class="nb__tool"
          onclick={() => fileInput?.click()}
          aria-label={t('lab.ui.aria-load')}>{t('lab.ui.load')}</button
        >
        <input
          bind:this={fileInput}
          type="file"
          accept=".json,.orrlab.json,application/json"
          class="nb__file"
          onchange={loadFile}
          aria-hidden="true"
          tabindex="-1"
        />
      </div>
    </header>
    {#if flightMap}
      <figure class="nb__flightmap">
        <FlightMapCanvas flight={flightMap} />
      </figure>
    {/if}
    {#if loadError}
      <p class="nb__load-error" role="alert">{loadError}</p>
    {/if}

    <ol class="nb__steps">
      {#each cells as cell, i (cell.id)}
        <li class="nb__step">
          <div class="nb__gutter" aria-hidden="true">
            <span class="nb__index">{i + 1}</span>
            {#if i < cells.length - 1}<span class="nb__rail"></span>{/if}
          </div>

          <div class="nb__body">
            {#if cell.narrativeKey}
              <p class="nb__narrative">{t(cell.narrativeKey)}</p>
            {/if}
            {@render cardCell(cell, i)}
          </div>
        </li>
      {/each}
    </ol>

    <!-- + ADD CELL — append any registered formula as an unwired sandbox card -->
    <div class="nb__add">
      <label class="nb__add-label" for="nb-add-select">{t('lab.ui.add-cell')}</label>
      <select id="nb-add-select" class="nb__add-select" bind:value={addId}>
        {#each [...REGISTRY.keys()] as id (id)}
          <option value={id}>{labelFor(id)}</option>
        {/each}
      </select>
      <button type="button" class="nb__add-btn" onclick={addCell}>+ {t('lab.ui.add-cell')}</button>
    </div>

    <!-- Practical-connection panel (v0.9 reality-punch) — the lesson's conclusion linked
         out to the real missions/vehicles/sites in Orrery. Goal mode only (a restored
         custom notebook has no lesson). -->
    {#if !restored && goal.connection}
      {@const conn = goal.connection}
      <aside class="nb__conn" aria-label={t('lab.conn.aria')}>
        <h3 class="nb__conn-title">{t('lab.conn.heading')}</h3>
        <p class="nb__conn-why">{t(conn.whyKey)}</p>

        {#if conn.hookKey}
          <div class="nb__conn-hook">
            <span class="nb__conn-hook-label">{t('lab.conn.hook-label')}</span>
            <p class="nb__conn-hook-text">{t(conn.hookKey)}</p>
          </div>
        {/if}

        <ul class="nb__conn-links">
          {#each conn.links as link (link.href)}
            <li>
              <a class="nb__conn-a" href="{base}{link.href}">
                <span class="nb__conn-label">{t(link.labelKey)}</span>
                {#if link.agency}<span class="nb__conn-agency">{link.agency}</span>{/if}
              </a>
            </li>
          {/each}
        </ul>

        {#if conn.nextKey}
          <p class="nb__conn-next">
            <span class="nb__conn-next-label">{t('lab.conn.next-label')}</span>
            {t(conn.nextKey)}
          </p>
        {/if}
      </aside>
    {/if}
  {/if}
</section>

<style>
  .nb {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    width: 100%;
  }

  /* ─── Practical-connection panel (reality punch) ──────────────────────────── */
  .nb__conn {
    margin-top: 0.25rem;
    padding: 1.25rem 1.4rem;
    border: 1px solid rgba(78, 205, 196, 0.28);
    border-radius: 10px;
    background: linear-gradient(180deg, rgba(78, 205, 196, 0.07), rgba(78, 205, 196, 0.02));
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }
  .nb__conn-title {
    margin: 0;
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #4ecdc4;
  }
  .nb__conn-why {
    margin: 0;
    line-height: 1.55;
    color: #e8e8e8;
  }
  .nb__conn-hook {
    border-left: 2px solid #ffc850;
    padding-left: 0.8rem;
  }
  .nb__conn-hook-label {
    display: block;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: #ffc850;
    margin-bottom: 0.25rem;
  }
  .nb__conn-hook-text {
    margin: 0;
    line-height: 1.55;
    color: #d8d8d8;
    font-style: italic;
  }
  .nb__conn-links {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }
  .nb__conn-a {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.5rem 0.7rem;
    border-radius: 7px;
    background: rgba(255, 255, 255, 0.03);
    color: #e8e8e8;
    text-decoration: none;
    border: 1px solid transparent;
    transition:
      background 0.12s ease,
      border-color 0.12s ease;
  }
  .nb__conn-a:hover,
  .nb__conn-a:focus-visible {
    background: rgba(78, 205, 196, 0.12);
    border-color: rgba(78, 205, 196, 0.45);
  }
  .nb__conn-label {
    line-height: 1.35;
  }
  .nb__conn-agency {
    flex-shrink: 0;
    font-size: 0.64rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: rgba(78, 205, 196, 0.16);
    color: #9fe0da;
  }
  .nb__conn-next {
    margin: 0;
    padding-top: 0.5rem;
    border-top: 1px dashed rgba(255, 255, 255, 0.14);
    color: #b7bdc0;
    font-size: 0.92rem;
    line-height: 1.5;
  }
  .nb__conn-next-label {
    color: #4ecdc4;
    font-weight: 700;
    margin-right: 0.35rem;
  }

  /* ─── Header (goal + share) ───────────────────────────────────────────── */
  .nb__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .nb__goal {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    border-left: 2px solid #4ecdc4;
    padding-left: 0.75rem;
  }

  .nb__tools {
    display: flex;
    gap: 0.4rem;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .nb__tool {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 1.5px;
    color: rgba(232, 232, 232, 0.75);
    background: rgba(232, 232, 232, 0.04);
    border: 1px solid rgba(232, 232, 232, 0.2);
    border-radius: 2px;
    padding: 0 0.8rem;
    min-height: 40px;
    cursor: pointer;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .nb__tool:hover,
  .nb__tool:focus-visible {
    background: rgba(232, 232, 232, 0.1);
    outline: 2px solid rgba(232, 232, 232, 0.5);
    outline-offset: 2px;
  }

  .nb__tool--accent {
    color: #4ecdc4;
    background: rgba(78, 205, 196, 0.08);
    border-color: rgba(78, 205, 196, 0.4);
  }

  .nb__tool--accent:hover,
  .nb__tool--accent:focus-visible {
    background: rgba(78, 205, 196, 0.16);
    outline-color: #4ecdc4;
  }

  .nb__tool--done {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.5);
    background: rgba(255, 200, 80, 0.1);
  }

  .nb__file {
    position: absolute;
    width: 1px;
    height: 1px;
    opacity: 0;
    pointer-events: none;
  }

  .nb__load-error {
    font-family: 'Space Mono', monospace;
    font-size: 0.72rem;
    color: #c1440e;
    margin: -0.5rem 0 0;
  }

  .nb__flightmap {
    margin: 0 0 0.5rem;
    border: 1px solid rgba(78, 205, 196, 0.18);
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 24px rgba(0, 0, 0, 0.35);
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

  /* Action rail — focus + remove, top-right of the card */
  .nb__card-actions {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    z-index: 2;
    display: flex;
    gap: 0.35rem;
  }

  .nb__act {
    font-family: 'Space Mono', monospace;
    font-size: 0.95rem;
    line-height: 1;
    color: rgba(78, 205, 196, 0.85);
    background: rgba(4, 4, 12, 0.7);
    border: 1px solid rgba(78, 205, 196, 0.3);
    border-radius: 3px;
    width: 1.7rem;
    height: 1.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .nb__act:hover,
  .nb__act:focus-visible {
    background: rgba(78, 205, 196, 0.14);
    outline: 2px solid #4ecdc4;
    outline-offset: 1px;
  }

  .nb__act--danger {
    color: rgba(193, 68, 14, 0.85);
    border-color: rgba(193, 68, 14, 0.3);
  }

  .nb__act--danger:hover,
  .nb__act--danger:focus-visible {
    background: rgba(193, 68, 14, 0.15);
    outline-color: #c1440e;
  }

  /* ─── Focus mode ──────────────────────────────────────────────────────── */
  .nb__focus-view {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .nb__back {
    align-self: flex-start;
    font-family: 'Space Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: #4ecdc4;
    background: none;
    border: none;
    padding: 0.4rem 0;
    cursor: pointer;
  }

  .nb__back:hover,
  .nb__back:focus-visible {
    text-decoration: underline;
    outline: none;
  }

  .nb__focus-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  /* In focus, let the card breathe wider than the 600px notebook cap. */
  .nb__focus-view :global(.card) {
    max-width: 860px;
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
