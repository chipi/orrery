<!--
  Stand-at-site / exit-panorama button (#42).

  Single button that flips based on panoramaActive: enter when off,
  exit when on. Only renders when the site has a `hotspot_tier3_panorama`.

  Mars + Moon previously inlined the verbatim 24-line block.
-->
<script lang="ts">
  import { base } from '$app/paths';
  import { isSaveDataActive } from '$lib/hotspot-tier3-skybox';

  interface Props {
    panoramaUrl: string | null | undefined;
    siteId: string;
    panoramaActive: boolean;
    onEnter: (textureUrl: string, siteId: string) => void;
    onExit: () => void;
  }
  let { panoramaUrl, siteId, panoramaActive, onEnter, onExit }: Props = $props();
</script>

{#if panoramaUrl}
  {#if panoramaActive}
    <button
      type="button"
      class="stand-at-site stand-at-site--exit"
      data-testid="exit-panorama"
      data-audio-stage="surface-exit-panorama"
      onclick={onExit}
      title="Exit panorama view (Esc)"
    >
      Exit panorama view
    </button>
  {:else}
    <button
      type="button"
      class="stand-at-site"
      data-testid="stand-at-site"
      data-audio-stage="surface-stand-at-site"
      onclick={() => onEnter(`${base}${panoramaUrl}`, siteId)}
      title={isSaveDataActive()
        ? 'Tap to load panorama (~8 MB) — saveData is on'
        : 'Stand at this landing site — wrap-around ground view'}
    >
      Stand at site{isSaveDataActive() ? ' (tap to load)' : ''}
    </button>
  {/if}
{/if}
