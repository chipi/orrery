<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import SectionHub from '$lib/components/SectionHub.svelte';

  // Explore hub — the zoom-out scale ladder: Our Solar System, then the outward
  // scale shells (neighborhood → Local Group). The worlds you can stand on moved
  // to the WORLDS group / /worlds hub (RFC-038 nav split). Names are the nav
  // labels; titles/descs come from the shared landing_card_* catalogue (14 locales).
  const cards = $derived([
    {
      route: '/explore',
      name: m.nav_explore(),
      title: m.landing_card_explore_title(),
      desc: m.landing_card_explore_desc(),
    },
    // /explore v2 scale-shells — full tiles that jump straight into a context.
    {
      route: '/explore',
      query: '?context=neighborhood',
      name: m.explore_ctx_stellar_neighborhood(),
      title: m.explore_hub_shortcut_neighborhood(),
      desc: m.explore_hub_desc_neighborhood(),
    },
    {
      route: '/explore',
      query: '?context=milky-way',
      name: m.explore_ctx_milky_way(),
      title: m.explore_hub_shortcut_milkyway(),
      desc: m.explore_hub_desc_milkyway(),
    },
    {
      route: '/explore',
      query: '?context=local-group',
      name: m.explore_ctx_local_group(),
      title: m.explore_hub_shortcut_localgroup(),
      desc: m.explore_hub_desc_localgroup(),
    },
  ]);
</script>

<svelte:head>
  <title>{m.nav_group_explore()} · ORRERY</title>
</svelte:head>

<SectionHub
  heading={m.nav_group_explore()}
  intro={m.explore_hub_intro()}
  {cards}
  gridTestId="explore-hub-cards"
  gridAudioStage="explore-hub-grid"
/>
