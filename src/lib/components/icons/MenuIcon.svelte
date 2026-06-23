<!-- Hamburger / close-X nav toggle. `open` swaps the three bars for an X. -->
<script lang="ts">
  interface Props {
    open?: boolean;
    size?: number;
    class?: string;
    [key: string]: unknown;
  }
  let { open = false, size = 18, class: cls = '', ...rest }: Props = $props();
</script>

<svg viewBox="0 0 16 16" width={size} height={size} class={cls} aria-hidden="true" {...rest}>
  {#if open}
    <line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.6" />
    <line x1="13" y1="3" x2="3" y2="13" stroke="currentColor" stroke-width="1.6" />
  {:else}
    <line x1="3" y1="4.5" x2="13" y2="4.5" stroke="currentColor" stroke-width="1.6" />
    <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" stroke-width="1.6" />
    <line x1="3" y1="11.5" x2="13" y2="11.5" stroke="currentColor" stroke-width="1.6" />
  {/if}
</svg>
