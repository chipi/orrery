<!--
  UniverseFacts — the labelled value cells of a star or outer-scale panel, in the planet panel's
  look (mono label, mono value, three columns). One list shape for every panel that shows facts
  there: UniversePanelBody puts it on Overview; the star panel puts it in TECHNICAL.
-->
<script lang="ts" module>
  export type Fact = {
    label: string;
    value: string;
    /** Smaller trailing unit text ("solar masses"). */
    unit?: string;
    accent?: boolean;
    /** The catalogue behind the value (#658): a link under it. */
    source?: { url: string; label: string };
    /** A colour dot before the value (a star's colour). */
    swatch?: string;
    /** An inline "why" popover beside the label. */
    why?: { title: string; body: string };
  };
</script>

<script lang="ts">
  import WhyPopover from './WhyPopover.svelte';

  let { facts }: { facts: Fact[] } = $props();
</script>

{#if facts.length > 0}
  <div class="grid">
    {#each facts as f (f.label)}
      <div class="cell">
        <div class="cell-label">
          {f.label}{#if f.why}<WhyPopover title={f.why.title} body={f.why.body} />{/if}
        </div>
        <div class="cell-value" class:accent={f.accent}>
          {#if f.swatch}<span class="swatch" style:background={f.swatch} aria-hidden="true"
            ></span>{/if}{f.value}{#if f.unit}&nbsp;<span class="unit">{f.unit}</span>{/if}
        </div>
        {#if f.source}
          <a class="src" href={f.source.url} target="_blank" rel="noopener noreferrer external"
            >{f.source.label}</a
          >
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 7px;
    margin-bottom: 12px;
  }
  .cell {
    min-width: 0;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 4px;
    padding: 8px 10px;
  }
  .cell-label {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    letter-spacing: 2px;
    color: var(--color-text-label);
    margin-bottom: 3px;
    /* A long word (Schwarzschild) must not pass the cell edge at three columns. */
    overflow-wrap: anywhere;
  }
  .cell-value {
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    color: var(--color-text);
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  .cell-value.accent {
    color: var(--color-state);
  }
  .unit {
    font-weight: 400;
    color: var(--color-text-label);
  }
  .swatch {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    box-shadow: 0 0 6px 1px currentColor;
    margin-right: 4px;
  }
  .src {
    display: block;
    margin-top: 2px;
    font-size: var(--size-label);
    color: var(--color-text-label);
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
