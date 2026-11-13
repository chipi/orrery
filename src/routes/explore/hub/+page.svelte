<script lang="ts">
  import { metaDescription } from '$lib/seo';
  import * as m from '$lib/paraglide/messages';
  import SectionHub from '$lib/components/SectionHub.svelte';
  import { SCALE_SHELL_LIST } from '$lib/explore/scale-shells';

  // Explore hub — the zoom-out scale ladder, one tile per level from the shared shell table
  // (`SCALE_SHELLS`). The Solar System tile is the bare /explore link. The worlds you can stand
  // on moved to the WORLDS group / /worlds hub (RFC-038 nav split).
  const cards = $derived(
    SCALE_SHELL_LIST.map((s) => ({
      route: '/explore',
      query: s.id === 'solar-system' ? undefined : s.query,
      glyph: s.glyph,
      name: s.navName(),
      title: s.title(),
      desc: s.desc(),
    })),
  );
</script>

<svelte:head>
  <title>{m.explore_hub_page_title()}</title>
  <meta name="description" content={metaDescription(m.explore_hub_intro())} />
</svelte:head>

<SectionHub
  heading={m.nav_group_explore()}
  intro={m.explore_hub_intro()}
  {cards}
  gridTestId="explore-hub-cards"
  gridAudioStage="explore-hub-grid"
/>
