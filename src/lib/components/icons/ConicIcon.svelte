<!-- Conic-section glyph family for the orbit lens: circle / ellipse /
     parabola / hyperbola, swapped by `shape`. Coord-pinned at 32×20. -->
<script lang="ts">
  type Shape = 'circle' | 'ellipse' | 'parabola' | 'hyperbola';
  interface Props {
    shape?: Shape;
    size?: number;
    class?: string;
    [key: string]: unknown;
  }
  let { shape = 'ellipse', size = 32, class: cls = '', ...rest }: Props = $props();
  let height = $derived((size * 20) / 32);
</script>

<svg viewBox="0 0 32 20" width={size} {height} class={cls} aria-hidden="true" {...rest}>
  {#if shape === 'circle'}
    <circle cx="16" cy="10" r="7" fill="none" stroke="currentColor" stroke-width="1.4" />
    <circle cx="16" cy="10" r="1.2" fill="currentColor" />
  {:else if shape === 'ellipse'}
    <ellipse cx="16" cy="10" rx="13" ry="6" fill="none" stroke="currentColor" stroke-width="1.4" />
    <circle cx="22" cy="10" r="1.2" fill="currentColor" />
  {:else if shape === 'parabola'}
    <path d="M3 3 Q 16 22 29 3" fill="none" stroke="currentColor" stroke-width="1.4" />
    <circle cx="16" cy="14" r="1.2" fill="currentColor" />
  {:else}
    <path d="M3 3 Q 12 10 3 17" fill="none" stroke="currentColor" stroke-width="1.4" />
    <path d="M29 3 Q 20 10 29 17" fill="none" stroke="currentColor" stroke-width="1.4" />
    <circle cx="11.5" cy="10" r="1.2" fill="currentColor" />
  {/if}
</svg>
