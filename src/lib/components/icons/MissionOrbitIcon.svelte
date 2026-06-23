<!-- Mission glyph: an orbit ring with an arcing path and a marker dot.
     Used on the fleet-entry "missions" CTA rows. -->
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
  }
  let { size = 20, class: cls = '' }: Props = $props();
</script>

<svg
  viewBox="0 0 22 22"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cls}
  aria-hidden="true"
>
  <circle cx="11" cy="11" r="8.5" />
  <path d="M5 13 Q 11 5 17 13" />
  <circle cx="11" cy="6.6" r="1.3" fill="currentColor" stroke="none" />
</svg>
