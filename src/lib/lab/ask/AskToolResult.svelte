<!--
  One kernel result inside an ask answer (F · #535) — a READ-ONLY card, not
  Card.svelte (that carries editable-input machinery). The values and figure
  are VERBATIM kernel output; `localized` strings were resolved server-side
  ×14. Output labels resolve client-side from the registry — same keys the
  Notebook uses.
-->
<script lang="ts">
  import { REGISTRY } from '$lib/physics/registry';
  import FigureRenderer from '$lib/lab/FigureRenderer.svelte';
  import type { FigureSpec } from '$lib/physics/spec';
  import type { AskToolCallView } from './ask-state.svelte';

  type Props = {
    call: AskToolCallView;
    t: (key: string, params?: Record<string, string | number>) => string;
  };
  let { call, t }: Props = $props();

  const def = $derived(REGISTRY.get(call.tool));
  const values = $derived(call.result.values ?? {});
  const failed = $derived(call.result.status?.ok === false);
  const isRejection = $derived('error' in call.result);

  // Same magnitude-aware formatting as Card.svelte.
  function fmt(v: number): string {
    if (!Number.isFinite(v)) return '—';
    if (Math.abs(v) >= 100) return v.toFixed(2);
    return v.toFixed(4);
  }
</script>

<div class="ask-tool" class:ask-tool--failed={failed || isRejection}>
  <p class="ask-tool__title">
    {call.result.localized?.title ?? (def ? t(def.titleKey) : call.tool)}
    <span class="ask-tool__badge">{t('lab.ask.kernel-badge')}</span>
  </p>

  {#if isRejection}
    <p class="ask-tool__status">{t('lab.ask.tool-rejected')}</p>
  {:else}
    {#if Object.keys(values).length}
      <ul class="ask-tool__values">
        {#each def?.outputs ?? [] as o (o.key)}
          {#if values[o.key]}
            <li>
              <span class="ask-tool__label">{t(o.labelKey)}</span>
              <span class="ask-tool__value">{fmt(values[o.key].value)} {values[o.key].units}</span>
            </li>
          {/if}
        {/each}
      </ul>
    {/if}
    {#if failed && call.result.localized?.status}
      <p class="ask-tool__status">{call.result.localized.status}</p>
    {/if}
    {#if call.result.figure}
      <FigureRenderer figure={call.result.figure as FigureSpec} {t} />
    {/if}
    {#if call.result.localized?.assumptions?.length}
      <p class="ask-tool__assumptions">{call.result.localized.assumptions.join(' · ')}</p>
    {/if}
  {/if}
</div>

<style>
  .ask-tool {
    border: 1px solid var(--lab-line, #2a3040);
    border-radius: 8px;
    padding: 0.75rem 0.9rem;
    display: grid;
    gap: 0.5rem;
  }
  .ask-tool--failed {
    border-style: dashed;
  }
  .ask-tool__title {
    margin: 0;
    font-weight: 600;
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .ask-tool__badge {
    font-size: 0.7rem;
    font-weight: 500;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    opacity: 0.75;
    border: 1px solid currentColor;
    border-radius: 999px;
    padding: 0.05rem 0.5rem;
  }
  .ask-tool__values {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.25rem;
  }
  .ask-tool__values li {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .ask-tool__value {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
  .ask-tool__status,
  .ask-tool__assumptions {
    margin: 0;
    font-size: 0.85rem;
    opacity: 0.8;
  }
</style>
