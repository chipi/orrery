<!--
  Hotspots LOD cycle chip (#42).

  Three-state toggle (AUTO ↔ LOW ↔ HIGH) for the surface-hotspots LOD
  dispatcher. /moon and /mars rendered the same 11-line markup with
  the same cycle handler.
-->
<script lang="ts">
  import type { HotspotMode } from '$lib/hotspot-lod-dispatcher';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    mode: HotspotMode;
    onCycle: () => void;
  }
  let { mode, onCycle }: Props = $props();
</script>

<button
  type="button"
  class="chip chip-hotspots"
  class:active={mode !== 'low'}
  onclick={onCycle}
  title={m.hotspots_lod_title()}
  aria-label="Hotspots tier: {mode}"
  data-testid="layer-hotspots"
  data-hotspots-mode={mode}
>
  HOTSPOTS · {mode.toUpperCase()}
</button>
