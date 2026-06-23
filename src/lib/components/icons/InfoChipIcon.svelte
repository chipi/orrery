<!-- Geometric "i" info glyph for the science chips: outer ring + dot above
     a short stem, centred in the 14×14 viewBox regardless of font. Size is
     left to the consuming CSS by default (no width/height attribute). -->
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
    [key: string]: unknown;
  }
  let { size, class: cls = '', ...rest }: Props = $props();
</script>

<svg
  class={cls}
  viewBox="0 0 14 14"
  width={size}
  height={size}
  aria-hidden="true"
  focusable="false"
  xmlns="http://www.w3.org/2000/svg"
  {...rest}
>
  <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" stroke-width="1" />
  <circle cx="7" cy="4.2" r="0.85" fill="currentColor" />
  <rect x="6.25" y="6" width="1.5" height="4.4" rx="0.4" fill="currentColor" />
</svg>
