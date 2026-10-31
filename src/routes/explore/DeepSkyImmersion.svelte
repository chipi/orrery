<script lang="ts">
  let { url, alt, visible }: { url: string; alt: string; visible: boolean } = $props();
</script>

<div class="deep-sky-immersion" class:visible aria-hidden={!visible}>
  <img src={url} {alt} />
  <div class="ds-vignette"></div>
</div>

<style>
  /* v2 Slice 4 — full-frame deep-sky immersion. Sits above the canvas (z 6),
     below the warp flash (7) + HUD + panel. Fades in as the approach completes. */
  .deep-sky-immersion {
    position: absolute;
    inset: 0;
    z-index: 6;
    pointer-events: none;
    opacity: 0;
    transition: opacity 900ms ease-out;
    background: #05070f;
  }
  .deep-sky-immersion.visible {
    opacity: 1;
  }
  .deep-sky-immersion img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .ds-vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: radial-gradient(
      ellipse at 50% 45%,
      transparent 42%,
      rgba(3, 4, 12, 0.55) 82%,
      rgba(3, 4, 12, 0.9) 100%
    );
  }
  @media (prefers-reduced-motion: reduce) {
    .deep-sky-immersion {
      transition: none;
    }
  }
</style>
