<script lang="ts">
  let { flashId, caption }: { flashId: number; caption: string } = $props();
</script>

{#if flashId > 0}
  {#key flashId}
    <div class="cross-flash" aria-hidden="true"></div>
  {/key}
{/if}

<!-- v2 Slice 2: distance caption shown during a Navigator warp into a system,
     teaching the distance it just crossed (UXS-014 §4 signature moment). -->
{#if caption}
  {#key caption}
    <div class="warp-caption" role="status">{caption}</div>
  {/key}
{/if}

<style>
  /* Warp flash overlay — a soft radial bloom that masks the boundary cut. */
  .cross-flash {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none;
    background: radial-gradient(
      circle at 50% 50%,
      rgba(220, 235, 255, 0.55),
      rgba(120, 180, 255, 0.12) 45%,
      transparent 70%
    );
    animation: crossFlash 720ms ease-out forwards;
  }
  @keyframes crossFlash {
    0% {
      opacity: 0;
    }
    22% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
  .warp-caption {
    position: absolute;
    top: 38%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 8;
    pointer-events: none;
    font-family: var(--font-mono, 'Space Mono', monospace);
    font-size: 13px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(230, 240, 255, 0.92);
    text-shadow: 0 0 12px rgba(120, 180, 255, 0.7);
    white-space: nowrap;
    animation: warpCaption 1800ms ease-out forwards;
  }
  @keyframes warpCaption {
    0% {
      opacity: 0;
      transform: translate(-50%, calc(-50% + 8px));
    }
    18% {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
    80% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
