<script lang="ts">
  import SiteEntityPage from '$lib/components/SiteEntityPage.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<SiteEntityPage body="moon" entity={data.entity} mapTitle={m.moon_page_title()} />
