<script lang="ts">
  import { agencyToLogoEntries } from '$lib/agency-logo';

  interface Props {
    agency: string | undefined;
  }
  let { agency }: Props = $props();

  const entries = $derived(agencyToLogoEntries(agency));
</script>

{#if entries.length > 0}
  <span class="badges" aria-hidden="true">
    {#each entries as e (e.path)}
      <img src={e.path} alt="" title={e.full} class="badge" loading="lazy" decoding="async" />
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
    width: auto;
    height: 17px;
    max-width: 26px;
    object-fit: contain;
    /* Real brand colours on a small white tile — legible on the dark theme
       for both the colour marks (NASA, SpaceX) and the monochrome ones,
       and keeps each logo's own aspect ratio instead of squashing to a
       square. */
    background: #fff;
    border-radius: 2px;
    padding: 2px 3px;
  }
</style>
