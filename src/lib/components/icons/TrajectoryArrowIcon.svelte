<!-- Curved trajectory arrow — an arcing flight path with an arrowhead.
     Used on the mission-panel "fly this" CTA and the /plan transfer button. -->
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
    [key: string]: unknown;
  }
  let { size = 20, class: cls = '', ...rest }: Props = $props();
</script>

<svg
  viewBox="0 0 22 22"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cls}
  aria-hidden="true"
  {...rest}
>
  <path d="M3 17 Q 9 3 19 9" />
  <path d="M19 9 L14 7 M19 9 L17 14" />
</svg>
