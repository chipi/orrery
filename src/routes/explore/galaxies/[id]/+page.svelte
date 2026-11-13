<!--
  /explore/galaxies/<id> — one Local Group galaxy as an indexable page (ADR-096 item 18): the
  panel's text and values, the Related list, and a link into the 3D explorer. The shared template
  is OuterEntityPage; the structure pages use it too.
-->
<script lang="ts">
  import OuterEntityPage from '$lib/components/OuterEntityPage.svelte';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();
</script>

<OuterEntityPage {data} />
