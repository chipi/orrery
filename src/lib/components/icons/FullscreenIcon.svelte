<!-- Fullscreen toggle. Corner brackets point outward to enter, inward to
     exit (`active` = currently fullscreen). -->
<script lang="ts">
  interface Props {
    active?: boolean;
    size?: number;
    class?: string;
  }
  let { active = false, size = 18, class: cls = '' }: Props = $props();
</script>

<svg viewBox="0 0 18 18" width={size} height={size} fill="none" class={cls} aria-hidden="true">
  {#if active}
    <path d="M6 1v5H1M12 1v5h5M6 17v-5H1M12 17v-5h5" stroke="currentColor" stroke-width="1.5" />
  {:else}
    <path d="M1 6V1h5M17 6V1h-5M1 12v5h5M17 12v5h-5" stroke="currentColor" stroke-width="1.5" />
  {/if}
</svg>
