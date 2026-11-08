<script lang="ts">
  import SiteEntityPage from '$lib/components/SiteEntityPage.svelte';
  import * as m from '$lib/paraglide/messages';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<SiteEntityPage body="mars" entity={data.entity} mapTitle={m.mars_page_title()} />
