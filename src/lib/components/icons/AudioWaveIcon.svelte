<!-- Audio-tour waveform glyph (the "〜" mark). Inline SVG so it renders
     consistently across font stacks. Used in the nav audio toggle + the
     landing-page tour CTA. -->
<script lang="ts">
  interface Props {
    size?: number;
    class?: string;
    [key: string]: unknown;
  }
  let { size = 16, class: cls = '', ...rest }: Props = $props();
</script>

<svg viewBox="0 0 16 16" width={size} height={size} class={cls} aria-hidden="true" {...rest}>
  <path
    d="M1 8 Q 3 4, 5 8 T 9 8 T 13 8 T 15 8"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
  />
</svg>
