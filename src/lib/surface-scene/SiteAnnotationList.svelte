<!--
  "What you're seeing" — the annotated hardware on a site's close-up imagery.
  Hovering, focusing or tapping an item highlights (and, on tap, opens) its ring
  on the ground view / detail patch through the shared annotation-ui state.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import type { HotspotAnnotation } from '$types/surface-site';
  import { annotationUi } from '$lib/surface-scene/annotation-ui.svelte';

  let { annotations }: { annotations: HotspotAnnotation[] } = $props();

  const items = $derived(annotations.filter((a) => a.explain));
</script>

{#if items.length > 0}
  <section class="seeing" data-testid="site-annotation-list">
    <h3>{m.surface_annotations_heading()}</h3>
    <ul>
      {#each items as a (a.id)}
        <li>
          <button
            type="button"
            class:active={annotationUi.highlightId === a.id}
            data-annotation-id={a.id}
            onpointerenter={() => (annotationUi.highlightId = a.id)}
            onpointerleave={() => {
              if (annotationUi.openId !== a.id) annotationUi.highlightId = null;
            }}
            onfocus={() => (annotationUi.highlightId = a.id)}
            onblur={() => {
              if (annotationUi.openId !== a.id) annotationUi.highlightId = null;
            }}
            onclick={() => {
              annotationUi.highlightId = a.id;
              annotationUi.openId = a.id;
            }}
          >
            <span class="name">{a.label}</span>
            <span class="what">{a.explain}</span>
          </button>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<style>
  .seeing {
    margin: 18px 0 4px;
  }
  .seeing h3 {
    margin: 0 0 8px;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: var(--size-label);
    font-weight: 400;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-gold, #ffc850);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 6px;
  }
  button {
    width: 100%;
    min-height: 44px;
    box-sizing: border-box;
    display: grid;
    gap: 2px;
    text-align: start;
    padding: 8px 10px 8px 12px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--color-border, rgba(255, 255, 255, 0.07));
    border-inline-start: 3px solid var(--color-gold, #ffc850);
    border-radius: 3px;
    color: var(--color-text, #fff);
    font: inherit;
    cursor: pointer;
  }
  button:hover,
  button.active,
  button:focus-visible {
    background: rgba(255, 200, 80, 0.12);
  }
  .name {
    font-size: 13px;
    font-weight: 600;
  }
  .what {
    font-size: 12px;
    line-height: 1.45;
    color: var(--color-text-dim, rgba(255, 255, 255, 0.7));
  }
</style>
