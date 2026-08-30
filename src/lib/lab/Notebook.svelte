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
  import { encodeNotebook, decodeNotebook, type CodecCell } from './codec';
  import Card from './Card.svelte';

  type Props = {
    goal: Goal;
    equationHtml: Record<string, string>;
    t: (key: string) => string;
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
    return g.path.map((step, i) => ({
      id: `s${i}`,
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
          message: `Upstream failed — step ${state.fromIndex + 1} produced no value to wire in.`,
        };
      case 'invalid-wire':
        return {
          ...base,
          message: `Invalid wire — step ${state.fromIndex + 1} has no output '${state.output}'.`,
        };
      case 'compute-error':
        return { ...base, message: 'Could not evaluate this formula with these inputs.' };
      case 'unknown-formula':
        return { ...base, message: `Unknown formula: ${state.formulaId}` };
    }
  }
</script>

<section class="nb" aria-label="Notebook">
  <header class="nb__head">
    <div class="nb__goal">
      <span class="nb__goal-kicker">{restored ? 'Custom notebook' : 'Goal'}</span>
      <h2 class="nb__goal-title">{restored ? 'Your notebook' : t(goal.titleKey)}</h2>
    </div>
    <button
      type="button"
      class="nb__share"
      class:nb__share--done={shareState === 'copied'}
      onclick={share}
      aria-label="Share this notebook — copy a link"
    >
      {shareState === 'copied'
        ? '✓ LINK COPIED'
        : shareState === 'failed'
          ? 'LINK IN URL'
          : 'SHARE'}
    </button>
  </header>

  <ol class="nb__steps">
    {#each cells as cell, i (cell.id)}
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

          {#if !formula}
            <p class="nb__unknown" role="alert">Unknown formula: {cell.formulaId}</p>
          {:else}
            {@const v = view(state, cell)}
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
                inputs={v.inputs}
                result={v.result}
                wiredKeys={v.wiredKeys}
                blocked={v.blocked}
                blockedMessage={v.message}
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

  .nb__share {
    font-family: 'Space Mono', monospace;
    font-size: 0.62rem;
    letter-spacing: 1.5px;
    color: #4ecdc4;
    background: rgba(78, 205, 196, 0.08);
    border: 1px solid rgba(78, 205, 196, 0.4);
    border-radius: 2px;
    padding: 0 0.9rem;
    min-height: 40px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: background 0.15s;
  }

  .nb__share:hover,
  .nb__share:focus-visible {
    background: rgba(78, 205, 196, 0.16);
    outline: 2px solid #4ecdc4;
    outline-offset: 2px;
  }

  .nb__share--done {
    color: #ffc850;
    border-color: rgba(255, 200, 80, 0.5);
    background: rgba(255, 200, 80, 0.1);
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
