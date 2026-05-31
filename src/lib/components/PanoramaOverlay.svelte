<!--
  Sr-only live-region overlay for panorama (ground-view) mode
  (#42, extended by PRD-022 / ADR-074 / #286 Phase 3E for keyboard +
  screen-reader accessibility of yaw/pitch annotations).

  The visible exit affordance is rendered separately by the detail
  panel's Stand-at-site slot (2026-05-21 feedback). This overlay only
  exists for screen reader users:
    - `role="region"` + aria-label announces panorama entry
    - sr-only description text describes the scene + how to exit
    - sr-only `<ul>` of `<button>` mirrors the 3D annotation sprites:
      keyboard-navigable, focusable; click triggers the same caption-
      card open path as a sprite raycast hit.

  Per-route sr-only text differs ("on Mars" qualifier, ESC vs button
  wording) — pass it via the `description` prop.
-->
<script lang="ts">
  import type { PanoramaAnnotation } from '$types/surface-site';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    active: boolean;
    description: string;
    /** PRD-022 / ADR-074 Phase 3E — mirror of the 3D Sprite list, so
     *  keyboard / screen-reader users can navigate + open annotations
     *  without raycasting against the canvas. Empty array = no list. */
    annotations?: PanoramaAnnotation[];
    /** Click handler — wired the same way the sprite raycaster wires
     *  panoramaActiveAnnotation in SurfaceScene. */
    onAnnotationActivate?: (annotation: PanoramaAnnotation) => void;
  }
  let { active, description, annotations = [], onAnnotationActivate }: Props = $props();
</script>

{#if active}
  <div
    class="panorama-overlay"
    role="region"
    aria-label={m.panorama_mode_aria_label()}
    data-testid="panorama-overlay"
  >
    <span class="po-sr">{description}</span>
    {#if annotations.length > 0}
      <ul class="po-sr-list" aria-label={m.panorama_annotations_list_aria()}>
        {#each annotations as ann (ann.id)}
          <li>
            <button
              type="button"
              class="po-sr-btn"
              data-testid="panorama-annotation-sr-button"
              onclick={() => onAnnotationActivate?.(ann)}
            >
              {ann.label}{ann.body ? ` — ${ann.body}` : ''}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .panorama-overlay {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 50;
  }
  /* The sr-only descendants restore pointer-events so the buttons
     are activatable by keyboard (the overlay itself stays
     non-interactive for mouse users). */
  .panorama-overlay :global(.po-sr-btn) {
    pointer-events: auto;
  }
  .po-sr {
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
  /* Same clip pattern for the annotation list — visually hidden,
     reachable by tab. */
  .po-sr-list {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    list-style: none;
  }
  .po-sr-btn {
    background: none;
    border: 0;
    padding: 0;
    color: inherit;
    font: inherit;
    cursor: pointer;
    text-align: left;
  }
  .po-sr-btn:focus-visible {
    /* When tabbed to, render an outline so sighted-keyboard users see
       focus position even though the button is otherwise sr-only. */
    outline: 2px solid #4466ff;
    outline-offset: 2px;
  }
</style>
