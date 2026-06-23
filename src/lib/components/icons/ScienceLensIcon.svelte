<!-- Science-lens toggle. Outer ring + centre dot (⊙) when off; ring +
     crosshair (⊕) when active. Inline SVG, not the Unicode glyph, which
     renders blank in font stacks that don't carry it. -->
<script lang="ts">
  interface Props {
    active?: boolean;
    size?: number;
    class?: string;
  }
  let { active = false, size = 16, class: cls = '' }: Props = $props();
</script>

<svg viewBox="0 0 16 16" width={size} height={size} class={cls} aria-hidden="true">
  <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.4" />
  {#if active}
    <line x1="8" y1="3" x2="8" y2="13" stroke="currentColor" stroke-width="1.4" />
    <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.4" />
  {:else}
    <circle cx="8" cy="8" r="1.4" fill="currentColor" />
  {/if}
</svg>
