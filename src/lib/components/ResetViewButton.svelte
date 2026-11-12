<!-- Reset view: the one button for every "put the camera back" site (E8). -->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import Chip from './Chip.svelte';

  let { ...rest }: { [key: string]: unknown } = $props();
</script>

<Chip kind="action" {...rest}>
  {m.ui_reset_view()}
</Chip>
