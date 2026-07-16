<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import SectionHub from '$lib/components/SectionHub.svelte';

  // Explore hub — Our Solar System first, then the four worlds we can stand
  // on, then the two crewed stations. Names are the nav labels; titles/descs
  // come from the shared landing_card_* catalogue (localized to 14 locales).
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
    {
      route: '/earth',
      name: m.nav_earth(),
      title: m.landing_card_earth_title(),
      desc: m.landing_card_earth_desc(),
    },
    {
      route: '/moon',
      name: m.nav_moon(),
      title: m.landing_card_moon_title(),
      desc: m.landing_card_moon_desc(),
    },
    {
      route: '/mars',
      name: m.nav_mars(),
      title: m.landing_card_mars_title(),
      desc: m.landing_card_mars_desc(),
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
