<!-- Spacecraft/payload glyph: central bus with solar panels either side, an
     antenna boom, and an orientation marker. Mission-panel "payload" row. -->
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
    [key: string]: unknown;
  }
  let { size = 20, class: cls = '', ...rest }: Props = $props();
</script>

<svg
  viewBox="0 0 20 20"
  width={size}
  height={size}
  fill="currentColor"
  class={cls}
  aria-hidden="true"
  {...rest}
>
  <rect x="6" y="6" width="8" height="8" rx="1" />
  <rect x="1" y="8" width="4" height="4" />
  <rect x="15" y="8" width="4" height="4" />
  <line x1="10" y1="3" x2="10" y2="6" stroke="currentColor" stroke-width="1.5" />
  <circle cx="10" cy="2.4" r="1.3" />
</svg>
