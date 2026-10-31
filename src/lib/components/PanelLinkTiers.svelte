<!--
  LEARN-tab links grouped by tier (intro / core / deep) for the detail
  panels. Empty tiers render nothing; the caller decides what to show when
  there are no links at all.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import LearnLink from './LearnLink.svelte';
  import { groupLinksByTier, type LinkTier } from '$lib/surface-map/link-tiers';

  interface Props {
    links: readonly { u: string; l: string; t: LinkTier }[] | null | undefined;
    /** Entity the links belong to (LearnLink uses it for analytics). */
    entityId: string;
  }
  let { links, entityId }: Props = $props();

  const tiers = $derived(groupLinksByTier(links));
  const ORDER: readonly LinkTier[] = ['intro', 'core', 'deep'];
  const HEADING: Record<LinkTier, () => string> = {
    intro: m.panel_links_intro,
    core: m.panel_links_core,
    deep: m.panel_links_deep,
  };
</script>

{#each ORDER as tier (tier)}
  {#if tiers[tier].length > 0}
    <section class="link-tier tier-{tier}">
      <h3>{HEADING[tier]()}</h3>
      <ul>
        {#each tiers[tier] as link (link.u)}
          <li><LearnLink {entityId} url={link.u} label={link.l} /></li>
        {/each}
      </ul>
    </section>
  {/if}
{/each}
