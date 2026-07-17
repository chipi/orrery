<!--
  VideoThumb — the resting facade tile (PRD-031 / RFC-033 S1/S2).

  A poster still + play affordance that opens the MediaPlayer. It is a plain
  <img>, never an <iframe>, so a gallery of these mounts zero embeds until a
  click (RFC-033 V-B).

  Poster = the provider thumbnail (we LINK, never host). Robust by design so a
  slow/unavailable thumbnail CDN can never degrade the page:
    - loading="lazy" + decoding="async" — the fetch only starts near-viewport
      and never blocks the main thread;
    - on any load error we fall back to a pure-CSS gradient (no fetch — it
      cannot itself be unavailable), so there is never a broken-image icon and
      never a retry.
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { posterUrlFor, type VideoProvenanceEntry } from '$lib/video-provenance';

  interface Props {
    video: VideoProvenanceEntry;
    onOpen: (v: VideoProvenanceEntry) => void;
  }
  let { video, onOpen }: Props = $props();

  const poster = $derived(posterUrlFor(video));
  let failed = $state(false);
  // Reset the error flag if the tile is reused for a different clip.
  $effect(() => {
    void video.id;
    failed = false;
  });

  function fmtDuration(s: number | null): string {
    if (!s || s <= 0) return '';
    const mm = Math.floor(s / 60);
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }
  const duration = $derived(fmtDuration(video.duration_seconds));
</script>

<button
  type="button"
  class="thumb gallery-thumb video-thumb"
  onclick={() => onOpen(video)}
  aria-label={m.video_play_aria({ title: video.title })}
>
  {#if poster && !failed}
    <img src={poster} alt="" loading="lazy" decoding="async" onerror={() => (failed = true)} />
  {:else}
    <span class="video-poster-fallback" aria-hidden="true"></span>
  {/if}
  <span class="video-play" aria-hidden="true">▶</span>
  {#if duration}<span class="video-duration">{duration}</span>{/if}
</button>
