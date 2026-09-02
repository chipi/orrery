<!--
  Canvas — the T2 spatial workspace (S5 · #463 · UXS-015 §Canvas, pre-review C).

  A projection of the SAME shared lab-state instance the Notebook renders — cards
  dragged freely on the station-blueprint grid, each with input/output sockets;
  drag an output socket to a compatible input to wire, edges drawn in teal.
  Recompute propagates through the graph engine (`graph.ts` — cycle-honest,
  units-checked). PROMOTE turns a selected subgraph into a linear Notebook.

  Interaction discipline (repo rule): pointer events drive lightweight sync state
  only — drag writes a position map, wiring updates a ghost line; the compatible-
  input set is computed ONCE at wire-drag start; all heavy work (recompute) flows
  from the $derived graph, and commits happen on pointerup/click.

  Desktop-first; `readonly` renders the read-only mobile story (pan/zoom +
  tap-to-Focus, no drag/sockets) — the SAME component, no fork (UXS-015: a stated
  limitation, not a detail).

  A11y floor (pre-review E): cards stay in DOM order (= array order) and are
  positioned visually via transforms, so the tab order is stable; each card shell
  announces its wires. Keyboard wire-CREATION is the stated S5 cut.
-->
<script lang="ts">
  import { REGISTRY, defaultInputs } from '$lib/physics/registry';
  import { recomputeGraph, wouldCycle, linearizeIndexWired, type GraphNode } from './graph';
  import { promoteSubgraph } from './promote';
  import type { LabState, LabCell } from './lab-state.svelte';
  import Card from './Card.svelte';

  type Props = {
    equationHtml: Record<string, string>;
    t: (key: string, params?: Record<string, string | number>) => string;
    labState: LabState;
    /** Mobile story: pan/zoom + tap-to-Focus only. */
    readonly?: boolean;
    /** Promote hands the ordered cells back to /lab, which seeds a custom notebook. */
    onPromoted: (cells: LabCell[]) => void;
    /** Tap-to-Focus (readonly) / focus action → /lab?focus=i in notebook view. */
    onFocusCard: (index: number) => void;
  };

  let { equationHtml, t, labState, readonly = false, onPromoted, onFocusCard }: Props = $props();

  const cells = $derived(labState.cells);

  // ─── Graph projection ─────────────────────────────────────────────────────
  // Canvas wires are id-keyed; the shared cells carry index wires (the codec
  // model). Project index→id here; new wires created on the canvas are written
  // back as index wires so BOTH views stay consistent with one source of truth.
  const nodes = $derived<GraphNode[]>(
    cells.map((c) => ({
      id: c.id,
      formulaId: c.formulaId,
      inputs: c.inputs,
      wires: c.wires
        .filter(
          (w) => Number.isInteger(w.fromIndex) && w.fromIndex >= 0 && w.fromIndex < cells.length,
        )
        .map((w) => ({ fromId: cells[w.fromIndex].id, output: w.output, toInput: w.toInput })),
    })),
  );
  const graph = $derived(recomputeGraph(nodes, REGISTRY));

  // ─── Layout ───────────────────────────────────────────────────────────────
  // Default layout for never-placed cards: a left-to-right cascade in topo order.
  const CARD_W = 320;
  const GAP_X = 60;
  const GAP_Y = 40;
  function defaultPosition(id: string): { x: number; y: number } {
    const pos = graph.order.indexOf(id);
    const i = pos === -1 ? cells.findIndex((c) => c.id === id) : pos;
    return { x: 40 + i * (CARD_W + GAP_X), y: 90 + (i % 2) * GAP_Y };
  }
  function positionOf(c: LabCell): { x: number; y: number } {
    return c.position ?? defaultPosition(c.id);
  }

  // ─── Pan / zoom (world transform) ─────────────────────────────────────────
  let panX = $state(0);
  let panY = $state(0);
  let zoom = $state(1);
  let panning = $state(false);
  let panStart = { x: 0, y: 0, panX: 0, panY: 0 };

  // Active-pointer map for pinch zoom (holistic M4 — touch-action:none disables
  // native pinch, so the readonly mobile canvas must implement it: two pointers
  // on the surface scale `zoom` by the inter-pointer distance ratio).
  const activePointers = new Map<number, { x: number; y: number }>();
  let pinchStartDist = 0;
  let pinchStartZoom = 1;

  function onSurfacePointerDown(e: PointerEvent): void {
    if (e.target !== e.currentTarget) return; // only bare-grid drags pan
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 2) {
      const [a, b] = [...activePointers.values()];
      pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartZoom = zoom;
      panning = false; // pinch supersedes pan
      return;
    }
    panning = true;
    panStart = { x: e.clientX, y: e.clientY, panX, panY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onSurfacePointerMove(e: PointerEvent): void {
    if (activePointers.has(e.pointerId)) {
      activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (activePointers.size === 2 && pinchStartDist > 0) {
        const [a, b] = [...activePointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        zoom = Math.min(2, Math.max(0.35, pinchStartZoom * (dist / pinchStartDist)));
        return;
      }
    }
    if (panning) {
      panX = panStart.panX + (e.clientX - panStart.x);
      panY = panStart.panY + (e.clientY - panStart.y);
    }
    if (wireDrag) {
      wireCursor = toWorld(e.clientX, e.clientY);
    }
    if (drag) {
      const { id, offsetX, offsetY } = drag;
      const w = toWorld(e.clientX, e.clientY);
      const i = cells.findIndex((c) => c.id === id);
      // DEEP write (holistic m1): replacing the element would invalidate the
      // `nodes` derived and re-run the whole graph per move; `nodes` never
      // reads `position`, so the fine-grained proxy write keeps it cached.
      if (i !== -1) cells[i].position = { x: w.x - offsetX, y: w.y - offsetY };
    }
  }
  function onSurfacePointerUp(e: PointerEvent): void {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) pinchStartDist = 0;
    panning = false;
    drag = null;
    if (wireDrag) endWireDrag(e);
  }
  /** A cancelled pointer (browser gesture steal, tab switch) never leaves a stuck ghost. */
  function onSurfacePointerCancel(e: PointerEvent): void {
    activePointers.delete(e.pointerId);
    pinchStartDist = 0;
    panning = false;
    drag = null;
    wireDrag = null;
  }
  function onWheel(e: WheelEvent): void {
    e.preventDefault();
    const next = Math.min(2, Math.max(0.35, zoom * (e.deltaY < 0 ? 1.1 : 0.9)));
    zoom = next;
  }
  let surfaceEl = $state<HTMLElement>();
  function toWorld(clientX: number, clientY: number): { x: number; y: number } {
    const r = surfaceEl?.getBoundingClientRect();
    return {
      x: (clientX - (r?.left ?? 0) - panX) / zoom,
      y: (clientY - (r?.top ?? 0) - panY) / zoom,
    };
  }

  // ─── Card drag ────────────────────────────────────────────────────────────
  let drag = $state<{ id: string; offsetX: number; offsetY: number } | null>(null);
  function onCardHandleDown(e: PointerEvent, c: LabCell): void {
    if (readonly) return;
    const p = positionOf(c);
    const w = toWorld(e.clientX, e.clientY);
    drag = { id: c.id, offsetX: w.x - p.x, offsetY: w.y - p.y };
    surfaceEl?.setPointerCapture(e.pointerId);
    e.preventDefault();
  }

  // ─── Wiring gesture ───────────────────────────────────────────────────────
  // pointerdown on an output socket → ghost edge + the compatible-input set
  // (computed ONCE); pointerup over a highlighted input commits an index wire.
  interface WireDrag {
    fromId: string;
    output: string;
    units: string;
    /** `${cardId}:${inputKey}` of every compatible, non-cycle-closing target. */
    compatible: Set<string>;
  }
  let wireDrag = $state<WireDrag | null>(null);
  let wireCursor = $state({ x: 0, y: 0 });

  function startWireDrag(e: PointerEvent, c: LabCell, outputKey: string): void {
    if (readonly) return;
    const def = REGISTRY.get(c.formulaId);
    const out =
      def?.outputs.find((o) => o.key === outputKey) ??
      def?.selectionOutputs?.find((o) => o.key === outputKey);
    if (!out) return;
    const compatible = new Set<string>();
    for (const target of cells) {
      if (target.id === c.id) continue;
      if (wouldCycle(nodes, c.id, target.id)) continue;
      const tDef = REGISTRY.get(target.formulaId);
      for (const f of tDef?.inputs ?? []) {
        if (f.units === out.units) compatible.add(`${target.id}:${f.key}`);
      }
    }
    wireDrag = { fromId: c.id, output: outputKey, units: out.units, compatible };
    wireCursor = toWorld(e.clientX, e.clientY);
    // NO pointer capture here (holistic B1): capture retargets every subsequent
    // pointer event to the capture element and bypasses hit-testing, so the
    // input socket's onpointerup could never fire and the gesture always
    // silently cancelled. Uncaptured, move/up bubble to the surface handlers
    // (ghost still tracks) and the socket's commitWire runs before the bubbled
    // endWireDrag no-ops on the cleared state.
    e.preventDefault();
    e.stopPropagation();
  }

  function commitWire(targetId: string, inputKey: string): void {
    if (!wireDrag || !wireDrag.compatible.has(`${targetId}:${inputKey}`)) return;
    const fromIndex = cells.findIndex((c) => c.id === wireDrag!.fromId);
    const ti = cells.findIndex((c) => c.id === targetId);
    if (fromIndex === -1 || ti === -1) return;
    // One edge per input socket: replace an existing wire on the same input.
    const next = cells.map((c, idx) =>
      idx === ti
        ? {
            ...c,
            wires: [
              ...c.wires.filter((w) => w.toInput !== inputKey),
              { fromIndex, output: wireDrag!.output, toInput: inputKey },
            ],
          }
        : c,
    );
    // Topo-linearize (holistic M2): the shared array stays topologically sorted,
    // so the Notebook view honours this wire too — one model, provably.
    labState.setCells(linearizeIndexWired(next));
    wireDrag = null;
  }
  function endWireDrag(_e: PointerEvent): void {
    // pointerup on a socket calls commitWire first (socket handler); otherwise cancel.
    wireDrag = null;
  }
  function removeWire(targetId: string, inputKey: string): void {
    if (readonly) return;
    const ti = cells.findIndex((c) => c.id === targetId);
    if (ti === -1) return;
    cells[ti] = { ...cells[ti], wires: cells[ti].wires.filter((w) => w.toInput !== inputKey) };
  }

  // ─── Selection + promote ──────────────────────────────────────────────────
  let selected = $state<Set<string>>(new Set());
  let promoteError = $state('');
  let promotePreview = $state<Extract<ReturnType<typeof promoteSubgraph>, { ok: true }> | null>(
    null,
  );

  function toggleSelect(id: string): void {
    if (readonly) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selected = next;
  }
  function openPromote(): void {
    promoteError = '';
    const res = promoteSubgraph(nodes, selected);
    if (!res.ok) {
      promoteError = t(res.reasonKey);
      promotePreview = null;
      return;
    }
    promotePreview = res;
  }
  function confirmPromote(): void {
    if (!promotePreview) return;
    const byId = new Map(cells.map((c) => [c.id, c] as const));
    const promoted: LabCell[] = promotePreview.cells.map((pc, i) => ({
      id: `p${i}-${pc.sourceId}`,
      formulaId: pc.formulaId,
      inputs: { ...pc.inputs },
      wires: pc.wires,
      selection: byId.get(pc.sourceId)?.selection,
      removable: true,
      note: byId.get(pc.sourceId)?.note,
      position: byId.get(pc.sourceId)?.position, // layout survives promote (holistic m3)
    }));
    promotePreview = null;
    selected = new Set();
    onPromoted(promoted);
  }

  // ─── + ADD FORMULA palette ────────────────────────────────────────────────
  let paletteOpen = $state(false);
  let paletteQuery = $state('');
  const paletteEntries = $derived.by(() => {
    const q = paletteQuery.trim().toLowerCase();
    const all = [...REGISTRY.values()].map((d) => ({
      id: d.id,
      title: t(d.titleKey),
      domain: d.domain,
      tier: d.tier,
    }));
    const filtered = q
      ? all.filter((e) => e.title.toLowerCase().includes(q) || e.id.includes(q))
      : all;
    return filtered.sort((a, b) => a.domain.localeCompare(b.domain) || a.tier - b.tier);
  });
  function addFormula(id: string): void {
    const def = REGISTRY.get(id);
    if (!def) return;
    // World coords straight from the pan/zoom transform (holistic M3 — toWorld
    // expects CLIENT coords; feeding it surface-locals spawned cards off-canvas).
    const spawn = { x: (140 - panX) / zoom, y: (120 - panY) / zoom };
    labState.setCells([
      ...cells,
      {
        id: crypto.randomUUID(),
        formulaId: def.id,
        inputs: defaultInputs(def),
        wires: [],
        removable: true,
        position: { x: spawn.x + cells.length * 24, y: spawn.y + cells.length * 16 },
      },
    ]);
    paletteOpen = false;
    paletteQuery = '';
  }
  function removeCard(id: string): void {
    if (readonly) return;
    const i = cells.findIndex((c) => c.id === id);
    if (i === -1 || !cells[i].removable) return;
    labState.setCells(
      cells
        .filter((_, idx) => idx !== i)
        .map((c) => ({
          ...c,
          wires: c.wires
            .filter((w) => w.fromIndex !== i)
            .map((w) => ({ ...w, fromIndex: w.fromIndex > i ? w.fromIndex - 1 : w.fromIndex })),
        })),
    );
    const next = new Set(selected);
    next.delete(id);
    selected = next;
  }

  function setInput(id: string, key: string, value: number | string): void {
    const i = cells.findIndex((c) => c.id === id);
    if (i === -1) return;
    cells[i] = { ...cells[i], inputs: { ...cells[i].inputs, [key]: value } };
  }

  // ─── Edge geometry ────────────────────────────────────────────────────────
  interface Edge {
    fromId: string;
    toId: string;
    toInput: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  }
  const CARD_H_EST = 120; // socket anchor heights are approximations; fine at S5
  const edges = $derived.by<Edge[]>(() => {
    const byId = new Map(cells.map((c) => [c.id, c] as const));
    const out: Edge[] = [];
    for (const c of cells) {
      const to = positionOf(c);
      for (const w of c.wires) {
        const src = cells[w.fromIndex];
        if (!src || !byId.has(src.id)) continue;
        const from = positionOf(src);
        out.push({
          fromId: src.id,
          toId: c.id,
          toInput: w.toInput,
          x1: from.x + CARD_W,
          y1: from.y + CARD_H_EST / 2,
          x2: to.x,
          y2: to.y + CARD_H_EST / 2,
        });
      }
    }
    return out;
  });

  /** Bezier path between two socket anchors. */
  function edgePath(e: { x1: number; y1: number; x2: number; y2: number }): string {
    const dx = Math.max(50, Math.abs(e.x2 - e.x1) / 2);
    return `M ${e.x1} ${e.y1} C ${e.x1 + dx} ${e.y1}, ${e.x2 - dx} ${e.y2}, ${e.x2} ${e.y2}`;
  }

  /** Wire summary for the a11y mirror ("input X ← CARD.output"). */
  function wireSummary(c: LabCell): string {
    return c.wires
      .map((w) => {
        const src = cells[w.fromIndex];
        const srcTitle = src ? t(REGISTRY.get(src.formulaId)?.titleKey ?? src.formulaId) : '?';
        return `${w.toInput} ← ${srcTitle}.${w.output}`;
      })
      .join('; ');
  }

  const cellState = (id: string) => graph.states.get(id);
</script>

<svelte:window
  onkeydown={(e) => {
    if (e.key === 'Escape') {
      paletteOpen = false;
      promotePreview = null;
      wireDrag = null;
    }
  }}
/>

<div
  class="canvas"
  class:canvas--readonly={readonly}
  bind:this={surfaceEl}
  role="group"
  aria-label={t('lab.canvas.aria')}
  onpointerdown={onSurfacePointerDown}
  onpointermove={onSurfacePointerMove}
  onpointerup={onSurfacePointerUp}
  onpointercancel={onSurfacePointerCancel}
  onwheel={onWheel}
>
  <div class="canvas__world" style="transform: translate({panX}px, {panY}px) scale({zoom})">
    <svg class="canvas__edges" aria-hidden="true">
      {#each edges as e (e.toId + e.toInput)}
        <path d={edgePath(e)} class="canvas__edge" />
      {/each}
      {#if wireDrag}
        {@const src = cells.find((c) => c.id === wireDrag!.fromId)}
        {#if src}
          {@const p = positionOf(src)}
          <path
            d={edgePath({
              x1: p.x + CARD_W,
              y1: p.y + CARD_H_EST / 2,
              x2: wireCursor.x,
              y2: wireCursor.y,
            })}
            class="canvas__edge canvas__edge--ghost"
          />
        {/if}
      {/if}
    </svg>

    {#each cells as c, i (c.id)}
      {@const p = positionOf(c)}
      {@const st = cellState(c.id)}
      {@const def = REGISTRY.get(c.formulaId)}
      <div
        class="canvas__card"
        class:canvas__card--selected={selected.has(c.id)}
        style="transform: translate({p.x}px, {p.y}px); width: {CARD_W}px"
      >
        <!-- Shell header: drag handle + select + sockets + a11y wire summary -->
        <div class="canvas__shell">
          <button
            class="canvas__handle"
            aria-label={t('lab.canvas.drag-handle')}
            onpointerdown={(e) => onCardHandleDown(e, c)}
            onclick={() => readonly && onFocusCard(i)}>⠿</button
          >
          {#if !readonly}
            <input
              type="checkbox"
              class="canvas__select"
              checked={selected.has(c.id)}
              aria-label={t('lab.canvas.select-card')}
              onchange={() => toggleSelect(c.id)}
            />
          {/if}
          <span class="canvas__wiresum">{wireSummary(c)}</span>
          {#if !readonly}
            {#each def?.outputs ?? [] as o (o.key)}
              <button
                class="canvas__sock canvas__sock--out"
                title={`${o.key} [${o.units}]`}
                aria-label={t('lab.canvas.wire-from', { output: o.key })}
                onpointerdown={(e) => startWireDrag(e, c, o.key)}
              ></button>
            {/each}
            {#if c.removable}
              <button
                class="canvas__remove"
                aria-label={t('lab.ui.remove-cell')}
                onclick={() => removeCard(c.id)}>×</button
              >
            {/if}
          {/if}
        </div>
        {#if !readonly && wireDrag}
          <!-- Input sockets surface only during a wire drag, pre-filtered once -->
          <div class="canvas__inputs">
            {#each (def?.inputs ?? []).filter( (f) => wireDrag!.compatible.has(`${c.id}:${f.key}`) ) as f (f.key)}
              <button
                class="canvas__sock canvas__sock--in"
                aria-label={t('lab.canvas.wire-to', { input: f.key })}
                onpointerup={() => commitWire(c.id, f.key)}>{f.key}</button
              >
            {/each}
          </div>
        {/if}
        {#if !readonly}
          <div class="canvas__unwire">
            {#each c.wires as w (w.toInput)}
              <button class="canvas__unwire-btn" onclick={() => removeWire(c.id, w.toInput)}>
                {t('lab.canvas.unwire')}
                {w.toInput}
              </button>
            {/each}
          </div>
        {/if}
        {#if st && (st.status === 'cycle' || st.status === 'upstream-cycle')}
          <div class="canvas__cycle" role="alert">
            {t(st.status === 'cycle' ? 'lab.canvas.cycle' : 'lab.canvas.upstream-cycle')}
          </div>
        {:else if def && st}
          <Card
            formula={def}
            equationHtml={equationHtml[c.formulaId] ?? ''}
            {t}
            inputs={st.status === 'ok' || st.status === 'fail' ? st.resolvedInputs : c.inputs}
            result={st.status === 'ok' || st.status === 'fail' ? st.result : null}
            onInput={(key, value) => setInput(c.id, key, value)}
            wiredKeys={st.status === 'ok' || st.status === 'fail'
              ? st.wiredKeys
              : c.wires.map((w) => w.toInput)}
            blocked={st.status !== 'ok' && st.status !== 'fail'}
            blockedMessage={st.status === 'upstream-failed'
              ? t('lab.canvas.blocked-upstream')
              : st.status === 'invalid-wire'
                ? t('lab.canvas.blocked-wire')
                : st.status === 'compute-error'
                  ? t('lab.blocked.compute-error')
                  : st.status === 'unknown-formula'
                    ? t('lab.ui.unknown-formula', { id: c.formulaId })
                    : undefined}
          />
        {/if}
      </div>
    {/each}
  </div>

  {#if !readonly}
    <div class="canvas__bar">
      <button class="canvas__bar-btn" onclick={() => (paletteOpen = !paletteOpen)}>
        + {t('lab.canvas.add-formula')}
      </button>
      <button
        class="canvas__bar-btn canvas__bar-btn--primary"
        disabled={selected.size === 0}
        onclick={openPromote}
      >
        {t('lab.canvas.promote')} ({selected.size})
      </button>
      {#if promoteError}<span class="canvas__error" role="alert">{promoteError}</span>{/if}
    </div>

    {#if paletteOpen}
      <div class="canvas__palette" role="dialog" aria-label={t('lab.canvas.palette-aria')}>
        <input
          class="canvas__palette-search"
          type="search"
          placeholder={t('lab.canvas.palette-search')}
          bind:value={paletteQuery}
        />
        <ul class="canvas__palette-list">
          {#each paletteEntries as e (e.id)}
            <li>
              <button class="canvas__palette-item" onclick={() => addFormula(e.id)}>
                <span class="canvas__palette-domain">{e.domain}</span>
                {e.title}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}

    {#if promotePreview}
      <div class="canvas__confirm" role="dialog" aria-label={t('lab.canvas.promote-confirm-aria')}>
        <h3 class="canvas__confirm-title">{t('lab.canvas.promote-title')}</h3>
        <ol class="canvas__confirm-list">
          {#each promotePreview.cells as pc (pc.sourceId)}
            <li>
              {t(REGISTRY.get(pc.formulaId)?.titleKey ?? pc.formulaId)}
              {#if promotePreview.includedUpstream.includes(pc.sourceId)}
                <em class="canvas__confirm-upstream">{t('lab.canvas.upstream-included')}</em>
              {/if}
            </li>
          {/each}
        </ol>
        <p class="canvas__confirm-summary">
          {t('lab.canvas.promote-summary', {
            total: promotePreview.cells.length,
            upstream: promotePreview.includedUpstream.length,
          })}
        </p>
        <div class="canvas__confirm-actions">
          <button class="canvas__bar-btn canvas__bar-btn--primary" onclick={confirmPromote}>
            {t('lab.canvas.promote-confirm', { total: promotePreview.cells.length })}
          </button>
          <button class="canvas__bar-btn" onclick={() => (promotePreview = null)}>
            {t('lab.canvas.cancel')}
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .canvas {
    position: relative;
    height: 72vh;
    min-height: 480px;
    overflow: hidden;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    touch-action: none;
    background:
      linear-gradient(rgba(78, 205, 196, 0.09) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78, 205, 196, 0.09) 1px, transparent 1px),
      linear-gradient(rgba(78, 205, 196, 0.045) 1px, transparent 1px),
      linear-gradient(90deg, rgba(78, 205, 196, 0.045) 1px, transparent 1px);
    background-size:
      128px 128px,
      128px 128px,
      32px 32px,
      32px 32px;
  }
  .canvas__world {
    position: absolute;
    inset: 0;
    transform-origin: 0 0;
  }
  .canvas__edges {
    position: absolute;
    inset: -2000px;
    width: calc(100% + 4000px);
    height: calc(100% + 4000px);
    pointer-events: none;
    overflow: visible;
  }
  .canvas__edge {
    fill: none;
    stroke: #4ecdc4;
    stroke-width: 1.5;
    opacity: 0.8;
  }
  .canvas__edge--ghost {
    stroke-dasharray: 5 4;
    opacity: 0.5;
  }
  .canvas__card {
    position: absolute;
    top: 0;
    left: 0;
  }
  .canvas__card--selected {
    outline: 2px solid #4ecdc4;
    outline-offset: 2px;
    border-radius: 6px;
  }
  .canvas__shell {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 6px;
    background: rgba(8, 10, 22, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px 6px 0 0;
  }
  .canvas__handle {
    cursor: grab;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.55);
    font-size: 14px;
    touch-action: none;
  }
  .canvas__wiresum {
    flex: 1;
    font-size: 8px;
    color: rgba(255, 200, 80, 0.85);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .canvas__sock {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: #04040c;
    border: 2px solid #4ecdc4;
    cursor: crosshair;
    padding: 0;
  }
  .canvas__sock--in {
    width: auto;
    border-radius: 8px;
    padding: 2px 8px;
    color: #4ecdc4;
    font-size: 9px;
    background: rgba(78, 205, 196, 0.12);
  }
  .canvas__inputs {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    padding: 6px;
    background: rgba(8, 10, 22, 0.92);
    border-inline: 1px solid rgba(255, 255, 255, 0.1);
  }
  .canvas__unwire {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .canvas__unwire-btn {
    font-size: 8px;
    color: rgba(255, 255, 255, 0.55);
    background: none;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    cursor: pointer;
  }
  .canvas__remove {
    background: none;
    border: none;
    color: rgba(193, 68, 14, 0.9);
    cursor: pointer;
    font-size: 13px;
  }
  .canvas__cycle {
    padding: 12px;
    color: #c1440e;
    border: 1px solid rgba(193, 68, 14, 0.7);
    border-radius: 0 0 6px 6px;
    background: rgba(8, 10, 22, 0.95);
    font-size: 11px;
  }
  .canvas__bar {
    position: absolute;
    left: 12px;
    bottom: 12px;
    display: flex;
    gap: 8px;
    align-items: center;
    z-index: 4;
  }
  .canvas__bar-btn {
    font-size: 11px;
    letter-spacing: 1px;
    padding: 7px 12px;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(8, 10, 22, 0.92);
    color: rgba(255, 255, 255, 0.85);
    cursor: pointer;
  }
  .canvas__bar-btn--primary {
    border-color: #4ecdc4;
    color: #04040c;
    background: #4ecdc4;
    font-weight: 700;
  }
  .canvas__bar-btn:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .canvas__error {
    color: #c1440e;
    font-size: 11px;
    max-width: 380px;
  }
  .canvas__palette {
    position: absolute;
    left: 12px;
    bottom: 56px;
    width: 300px;
    max-height: 50%;
    display: flex;
    flex-direction: column;
    background: rgba(8, 10, 22, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    z-index: 5;
  }
  .canvas__palette-search {
    margin: 8px;
    padding: 6px 8px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 4px;
    color: #fff;
    font-size: 11px;
  }
  .canvas__palette-list {
    overflow: auto;
    margin: 0;
    padding: 0 8px 8px;
    list-style: none;
  }
  .canvas__palette-item {
    display: flex;
    gap: 8px;
    width: 100%;
    text-align: left;
    padding: 5px 6px;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.85);
    font-size: 11px;
    cursor: pointer;
    border-radius: 4px;
  }
  .canvas__palette-item:hover {
    background: rgba(78, 205, 196, 0.1);
  }
  .canvas__palette-domain {
    color: rgba(78, 205, 196, 0.8);
    font-size: 9px;
    width: 64px;
  }
  .canvas__confirm {
    position: absolute;
    inset: 0;
    margin: auto;
    width: min(420px, 90%);
    height: fit-content;
    max-height: 80%;
    overflow: auto;
    background: rgba(8, 10, 22, 0.97);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: 6px;
    padding: 16px;
    z-index: 6;
  }
  .canvas__confirm-title {
    margin: 0 0 10px;
    font-size: 15px;
    letter-spacing: 2px;
  }
  .canvas__confirm-list {
    margin: 0 0 8px;
    padding-left: 20px;
    font-size: 12px;
  }
  .canvas__confirm-upstream {
    color: rgba(255, 200, 80, 0.9);
    font-size: 10px;
    margin-left: 6px;
  }
  .canvas__confirm-summary {
    color: rgba(255, 200, 80, 0.9);
    font-size: 11px;
  }
  .canvas__confirm-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }
  .canvas__select {
    accent-color: #4ecdc4;
  }
  .canvas--readonly .canvas__handle {
    cursor: pointer;
  }
</style>
