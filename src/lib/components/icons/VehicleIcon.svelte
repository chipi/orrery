<!-- Launch-vehicle glyph: rocket body with payload cone, landing legs, and
     a porthole. Used on the mission-panel "vehicle" spec row. -->
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
    [key: string]: unknown;
  }
  let { size = 16, class: cls = '', ...rest }: Props = $props();
  let height = $derived((size * 20) / 16);
</script>

<svg
  viewBox="0 0 16 20"
  width={size}
  {height}
  fill="currentColor"
  class={cls}
  aria-hidden="true"
  {...rest}
>
  <path d="M8 1 L11 6 L11 13 L13 16 L13 18 L11 17 L11 18 L5 18 L5 17 L3 18 L3 16 L5 13 L5 6 Z" />
  <circle cx="8" cy="9" r="1.6" fill="rgba(0,0,0,0.45)" />
</svg>
