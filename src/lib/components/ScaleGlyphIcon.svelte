<!--
  One /explore scale-level glyph as a stand-alone icon (UXD-027): the same drawing the home grid and
  the hub show for the level (`ScaleGlyph`), with its own gradient defs under ids unique to this
  instance, so it works on any page and several can sit side by side (the nav rows, the picker's
  chip and ladder, the level card). Decorative: the name next to it is the accessible text.
-->
<script lang="ts">
  import ScaleGlyph from './ScaleGlyph.svelte';

  let { glyph, size = 20 }: { glyph: string; size?: number } = $props();

  const uid = $props.id();
  const sfx = `-${uid}`;
</script>

<svg
  class="scale-glyph-icon"
  viewBox="0 0 48 48"
  width={size}
  height={size}
  aria-hidden="true"
  focusable="false"
>
  <defs>
    <radialGradient id="ic-sun{sfx}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#fff7e0" />
      <stop offset="55%" stop-color="#ffc850" />
      <stop offset="100%" stop-color="#c14a1e" />
    </radialGradient>
    <radialGradient id="ic-sun-corona{sfx}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffc850" stop-opacity="0.5" />
      <stop offset="100%" stop-color="#ffc850" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ic-glow-blue{sfx}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="40%" stop-color="var(--color-accent)" stop-opacity="0.45" />
      <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ic-glow-gold{sfx}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="40%" stop-color="#e6b84a" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#e6b84a" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="ic-glow-accent{sfx}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="40%" stop-color="var(--color-accent)" stop-opacity="0.5" />
      <stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0" />
    </radialGradient>
  </defs>
  <ScaleGlyph {glyph} idSuffix={sfx} />
</svg>

<style>
  .scale-glyph-icon {
    flex: none;
    display: block;
  }
</style>
