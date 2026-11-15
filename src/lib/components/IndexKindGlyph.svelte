<!--
  The type of an INDEX row as a 14 px glyph (UXD-045): the 14 drawings of index-kind-glyph.ts on one
  16 x 16 grid, currentColor, 1.2 stroke. Decorative (aria-hidden): ScaleIndex names the exact type
  next to it, as the tooltip and as text for a screen reader.
-->
<script lang="ts">
  import type { IndexKindGlyph } from '$lib/explore/index-kind-glyph';

  let { glyph, size = 14 }: { glyph: IndexKindGlyph; size?: number } = $props();
</script>

<svg
  class="index-kind-glyph"
  data-glyph={glyph}
  viewBox="0 0 16 16"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.2"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  {#if glyph === 'star'}
    <path d="M8 1.5v13M1.5 8h13" />
    <path d="M4 4l8 8M12 4l-8 8" stroke-width="0.8" />
    <circle cx="8" cy="8" r="2" fill="currentColor" stroke="none" />
  {:else if glyph === 'galaxy'}
    <ellipse cx="8" cy="8" rx="6.5" ry="2.6" transform="rotate(-25 8 8)" />
    <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
  {:else if glyph === 'cluster'}
    <circle cx="4.5" cy="5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="3.8" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="12" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="7.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="4" cy="11.5" r="1.1" fill="currentColor" stroke="none" />
    <circle cx="9.5" cy="12.5" r="1.1" fill="currentColor" stroke="none" />
  {:else if glyph === 'globular'}
    <circle cx="8" cy="8" r="6.3" />
    <circle cx="8" cy="8" r="2.4" fill="currentColor" stroke="none" />
    <circle cx="5" cy="6" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="11" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="6" cy="11" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="11" cy="10.5" r="0.8" fill="currentColor" stroke="none" />
  {:else if glyph === 'nebula'}
    <path
      d="M4.5 12.5a3 3 0 0 1-.6-5.9 3.6 3.6 0 0 1 6.8-1 3.2 3.2 0 0 1 1.3 6.2c-.3.5-.8.7-1.4.7z"
    />
  {:else if glyph === 'shell'}
    <circle cx="8" cy="8" r="5.5" />
    <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
  {:else if glyph === 'group'}
    <path d="M4 11.5L8 4l4 7.5z" stroke-width="0.9" />
    <circle cx="4" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="8" cy="4" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="11.5" r="1.5" fill="currentColor" stroke="none" />
  {:else if glyph === 'network'}
    <path d="M3 4l5 4-1 5.5M8 8l5-3.5M8 8l5.5 4" stroke-width="0.9" />
    <circle cx="3" cy="4" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="8" cy="8" r="1.6" fill="currentColor" stroke="none" />
    <circle cx="7" cy="13.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="13" cy="4.5" r="1.3" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
  {:else if glyph === 'wall'}
    <path d="M2 11L14 5" stroke-width="3" opacity="0.45" />
    <path d="M2 11L14 5" />
  {:else if glyph === 'void'}
    <circle cx="8" cy="8" r="5.8" stroke-dasharray="1.6 2.2" />
  {:else if glyph === 'attractor'}
    <path d="M2 8h3.5M14 8h-3.5M8 2v3.5M8 14v-3.5" />
    <path d="M4 6.2L5.6 8 4 9.8M12 6.2L10.4 8l1.6 1.8" stroke-width="0.9" />
    <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
  {:else if glyph === 'black-hole'}
    <circle cx="8" cy="8" r="2.8" fill="currentColor" />
    <ellipse cx="8" cy="8" rx="6.5" ry="2.2" transform="rotate(-20 8 8)" />
  {:else if glyph === 'arm'}
    <path d="M3 13C2 8 6 3.5 13 3.5" stroke-width="2" />
  {:else}
    <path d="M8 2.5l5.5 5.5L8 13.5 2.5 8z" />
  {/if}
</svg>

<style>
  .index-kind-glyph {
    display: block;
    flex: none;
  }
</style>
