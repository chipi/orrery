<!--
  Toggle rows for a phone drawer (Layers, Nations on the Worlds): the Orbit Ruler's row look
  (dot, name, lit band when on) instead of a block of 44 px chips, which read as oversized in a
  nested panel (operator 2026-11-23). On is the lit band and a filled dot; off is dim with a
  hollow one. Each row is an aria-pressed toggle carrying the testid its chip had.
-->
<script lang="ts">
  interface Row {
    testid: string;
    label: string | (() => string);
    title?: string;
    active: () => boolean;
    toggle: () => void;
    /** Dot colour (a nation's); the highlight blue when absent. */
    color?: string;
    visible?: boolean;
  }
  interface Props {
    rows: Row[];
    label: string;
  }
  let { rows, label }: Props = $props();
</script>

<ul class="dtr" role="group" aria-label={label}>
  {#each rows as row (row.testid)}
    {#if row.visible !== false}
      <li>
        <button
          type="button"
          class="dtr-row"
          class:on={row.active()}
          aria-pressed={row.active()}
          title={row.title}
          data-testid={row.testid}
          style:--dot={row.color ?? 'var(--color-state)'}
          onclick={row.toggle}
        >
          <span class="dtr-dot" aria-hidden="true"></span>
          <span class="dtr-name">{typeof row.label === 'function' ? row.label() : row.label}</span>
        </button>
      </li>
    {/if}
  {/each}
</ul>

<style>
  .dtr {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 11px;
  }
  .dtr-row {
    width: 100%;
    min-height: 32px;
    display: grid;
    grid-template-columns: 10px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
    padding: 4px 8px;
    background: transparent;
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.55);
    font: inherit;
    text-align: start;
    white-space: nowrap;
    cursor: pointer;
  }
  .dtr-row.on {
    background: rgba(136, 159, 231, 0.14);
    border-color: var(--color-state);
    color: #fff;
  }
  .dtr-row:focus-visible {
    outline: 2px solid var(--color-state);
    outline-offset: -2px;
  }
  .dtr-dot {
    width: 8px;
    height: 8px;
    box-sizing: border-box;
    border-radius: 50%;
    border: 1.5px solid var(--dot);
  }
  .dtr-row.on .dtr-dot {
    background: var(--dot);
    box-shadow: 0 0 8px var(--dot);
  }
  .dtr-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }
</style>
