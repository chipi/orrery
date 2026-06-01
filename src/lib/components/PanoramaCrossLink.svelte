<!--
  Cross-link footer for Tier-3 panorama view (PRD-022 / ADR-074, #286
  Phase 2G).

  Slim bottom-right strip of 1-3 link chips connecting the panorama
  to: (a) the rover's traverse stop where this panorama was captured,
  (b) the fleet entry for the mission, (c) the audio episode whose
  narrative anchors here. Each link is its own chip; missing targets
  drop silently — empty footer hidden.

  This is the visible expression of the "spatial-context graph"
  framing from PRD-022 §META. The panorama is one node in the
  mission graph; the cross-links surface adjacent nodes.

  Resolution rules:
    - traverseStopLink: `?site=<mission>&traverse_stop=<id>` on the
      same surface route (caller resolves to the right body's route).
    - fleetEntryId: `/fleet/<id>` route.
    - audioEpisodeId: `/?audio=<episode-id>` deep-link (root route
      anchored).
-->
<script lang="ts">
  import { base } from '$app/paths';
  import * as m from '$lib/paraglide/messages';

  interface Props {
    active: boolean;
    /** "/mars" or "/moon" route prefix for the traverse-stop link. */
    routeBase: '/mars' | '/moon' | '/earth';
    /** Mission id used for the traverse-stop href + as the site param. */
    missionId: string | null | undefined;
    /** Traverse-stop id from panorama metadata; null when no traverse. */
    traverseStopLink: string | null | undefined;
    /** Fleet-entry id; null when no fleet entry exists. */
    fleetEntryId: string | null | undefined;
    /** Audio-episode id; null when no episode covers this view. */
    audioEpisodeId: string | null | undefined;
  }
  let { active, routeBase, missionId, traverseStopLink, fleetEntryId, audioEpisodeId }: Props =
    $props();

  // True only when at least one link target exists — otherwise the
  // footer is hidden so we don't render an empty chrome bar.
  let hasAnyLink = $derived(
    !!(traverseStopLink && missionId) || !!fleetEntryId || !!audioEpisodeId,
  );
</script>

{#if active && hasAnyLink}
  <div class="cross-link-bar" data-testid="panorama-cross-link">
    <!-- Order: mission chip first (always present when the site has
         a fleet entry), then audio, then traverse-stop last because
         it's the most-optional chip (only rovers with a panorama-
         pinned traverse stop carry it). Keeping traverse-stop last
         means its absence doesn't leave a gap between the first
         chip and whatever follows. -->
    {#if fleetEntryId}
      <a class="chip" href={`${base}/missions?id=${fleetEntryId}`}>
        <span class="hint mono">↗</span>
        <span>{m.panorama_crosslink_mission()}</span>
      </a>
    {/if}
    {#if audioEpisodeId}
      <a class="chip" href={`${base}/?audio=${audioEpisodeId}`}>
        <span class="hint mono">♪</span>
        <span>{m.panorama_crosslink_audio()}</span>
      </a>
    {/if}
    {#if traverseStopLink && missionId}
      <a
        class="chip"
        href={`${base}${routeBase}?site=${missionId}&traverse_stop=${traverseStopLink}`}
      >
        <span class="hint mono">↗</span>
        <span>{m.panorama_crosslink_traverse_stop()}</span>
      </a>
    {/if}
  </div>
{/if}

<style>
  .cross-link-bar {
    position: fixed;
    /* Single-row bottom-left panorama-controls layout (#286 audit).
       Sits to the right of compass (24..102) + fullscreen
       (110..154) → starts at left: 162px. The ⓘ info button
       lives above the compass column now, not in this row. */
    bottom: 40px;
    left: 162px;
    display: flex;
    flex-direction: row;
    gap: 8px;
    z-index: 60;
    backdrop-filter: blur(6px);
    animation: fade-in 200ms ease-out;
  }

  .chip {
    background: rgba(5, 5, 20, 0.88);
    border: 1px solid rgba(255, 255, 255, 0.15);
    padding: 6px 12px;
    color: var(--color-text-on-dark, #ffffff);
    font-size: 12px;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
  }
  .chip:hover,
  .chip:focus-visible {
    border-color: rgba(255, 255, 255, 0.4);
  }

  .hint {
    font-size: 10px;
    color: rgba(255, 255, 255, 0.65);
    letter-spacing: 0.05em;
  }

  .mono {
    font-family: 'Space Mono', 'Courier New', monospace;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .cross-link-bar {
      animation: none;
    }
  }
</style>
