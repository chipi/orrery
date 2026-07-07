<!-- Share glyph (iOS-style square + up arrow). Inline SVG so it renders
     consistently across font stacks. Used in the nav share button (S4). -->
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
  }
  let { size = 16, class: cls = '' }: Props = $props();
</script>

<svg
  viewBox="0 0 16 16"
  width={size}
  height={size}
  class={cls}
  fill="none"
  stroke="currentColor"
  stroke-width="1.4"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  <path d="M8 1.5 V 9.5" />
  <path d="M5.2 4 L8 1.3 L10.8 4" />
  <path
    d="M4 7 H 3 A1.5 1.5 0 0 0 1.5 8.5 V 13 A1.5 1.5 0 0 0 3 14.5 H 13 A1.5 1.5 0 0 0 14.5 13 V 8.5 A1.5 1.5 0 0 0 13 7 H 12"
  />
</svg>
