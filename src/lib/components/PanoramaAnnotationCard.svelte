<!--
  Annotation caption card for Tier-3 panorama view (PRD-022 / ADR-074,
  #286 Phase 2E).

  Renders when the user clicks a panorama annotation pin (3D Sprite
  raycast hit in hotspot-tier3-skybox.ts). Floats over the panorama
  near-centre (we don't try to anchor to the 3D position — small card
  in the centre is easier to read than a tooltip that may be off-screen
  after a yaw drag).

  Dismissible by clicking the × button, hitting Esc, or clicking outside.
  Resets when the user navigates to a different annotation.
-->
<script lang="ts">
  import type { PanoramaAnnotation } from '$types/surface-site';

  interface Props {
    annotation: PanoramaAnnotation | null;
    onDismiss: () => void;
  }
  let { annotation, onDismiss }: Props = $props();

  // Esc key dismisses the card without exiting the panorama itself.
  // Bound while mounted; cleaned up on unmount.
  $effect(() => {
    if (!annotation) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onDismiss();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
</script>

{#if annotation}
  <div
    class="annotation-card"
    role="dialog"
    aria-modal="false"
    aria-label={annotation.label}
    data-testid="panorama-annotation-card"
  >
    <button
      type="button"
      class="dismiss"
      aria-label="Dismiss annotation"
      onclick={onDismiss}
    >
      ×
    </button>
    <div class="label">{annotation.label}</div>
    {#if annotation.body}
      <p class="body">{annotation.body}</p>
    {/if}
  </div>
{/if}

<style>
  .annotation-card {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(4, 4, 12, 0.92);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 16px 36px 16px 20px;
    color: var(--color-text-on-dark, #ffffff);
    font-size: 14px;
    line-height: 1.5;
    max-width: 480px;
    backdrop-filter: blur(8px);
    z-index: 65;
    pointer-events: auto;
    animation: fade-in 180ms ease-out;
  }

  .label {
    font-size: 15px;
    font-weight: 500;
    margin-bottom: 6px;
  }

  .body {
    margin: 0;
    color: rgba(255, 255, 255, 0.85);
  }

  .dismiss {
    position: absolute;
    top: 6px;
    right: 8px;
    background: none;
    border: 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
    padding: 4px 6px;
  }
  .dismiss:hover,
  .dismiss:focus-visible {
    color: rgba(255, 255, 255, 0.9);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translate(-50%, -45%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .annotation-card {
      animation: none;
    }
  }
</style>
