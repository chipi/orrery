<!-- 8-spoke graphics-settings gear. Inline SVG, sized to the 16×16 nav box. -->
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
    d="M8 5.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Zm6.5 2.8c0-.3 0-.6-.1-.9l1.6-1.2-1.5-2.6-1.9.7a6.4 6.4 0 0 0-1.6-.9l-.3-2H7.3l-.3 2c-.6.2-1.1.5-1.6.9l-1.9-.7-1.5 2.6L3.6 7.1a6.4 6.4 0 0 0 0 1.8L2 10.1l1.5 2.6 1.9-.7c.5.4 1 .7 1.6.9l.3 2h3.4l.3-2c.6-.2 1.1-.5 1.6-.9l1.9.7 1.5-2.6-1.6-1.2c.1-.3.1-.6.1-.9Z"
    fill="none"
    stroke="currentColor"
    stroke-width="1.2"
    stroke-linejoin="round"
  />
</svg>
