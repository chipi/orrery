<script lang="ts">
  import { agencyToLogoPaths } from '$lib/agency-logo';

  interface Props {
    agency: string | undefined;
  }
  let { agency }: Props = $props();

  const paths = $derived(agencyToLogoPaths(agency));
</script>

{#if paths.length > 0}
  <span class="badges" aria-hidden="true">
    {#each paths as p (p)}
      <img src={p} alt="" class="badge" />
    {/each}
  </span>
{/if}

<style>
  .badges {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }
  .badge {
    width: 14px;
    height: 14px;
    object-fit: contain;
    /* SVG agency marks are black-on-transparent; invert to white-on-dark
       for the dark theme. */
    filter: brightness(0) invert(1) opacity(0.85);
    transition: filter 120ms;
  }
  /* Don't invert if the logo is already coloured — let CSS classes
     opt-out via parent selectors if needed. For now we trust the
     monochrome convention used by /static/logos/. */
</style>
