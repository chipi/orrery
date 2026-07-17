<!--
  MediaPlayer — the click-to-load video facade (PRD-031 / RFC-033 S1).

  We LINK video, never host it. This is the *modal* half of the facade: it
  only ever exists in the DOM once the user has clicked a poster tile, so no
  <iframe> is mounted at rest (RFC-033 V-B — the perf non-negotiable; the
  #360 render-storm lesson). The grid tile that opens it is a plain poster
  <img>, rendered by the caller.

  - Privacy-preserving embed (youtube-nocookie / vimeo dnt) via embedUrlFor.
    autoplay is appended HERE, on the user click that mounts the embed —
    never in the resting URL.
  - content_advisory (loss-of-life / graphic) → a click-through interstitial
    gates the embed (RFC-033 V-H).
  - Escape is handled in the CAPTURE phase + stopPropagation, so on a route
    whose Panel wires its own window Escape-to-close, closing the player does
    NOT also close the Panel (RFC-033 V-I; mirrors panorama-keys.ts).
-->
<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { embedUrlFor, type VideoProvenanceEntry } from '$lib/video-provenance';

  interface Props {
    video: VideoProvenanceEntry | null;
    onClose: () => void;
  }
  let { video, onClose }: Props = $props();

  // Advisory gate — reset whenever the open clip changes.
  let confirmed = $state(false);
  $effect(() => {
    void video?.id;
    confirmed = false;
  });
  const needsGate = $derived(!!video && video.content_advisory != null && !confirmed);

  const embedSrc = $derived(video ? withAutoplay(video) : null);
  function withAutoplay(v: VideoProvenanceEntry): string {
    const url = embedUrlFor(v);
    if (v.provider === 'youtube' || v.provider === 'vimeo') {
      return url + (url.includes('?') ? '&' : '?') + 'autoplay=1';
    }
    return url;
  }

  const advisoryCopy = $derived(
    video?.content_advisory === 'loss-of-life'
      ? m.video_advisory_loss_of_life()
      : m.video_advisory_graphic(),
  );

  // Capture-phase Escape (see header note).
  function onKey(e: KeyboardEvent) {
    if (!video || e.key !== 'Escape') return;
    e.stopPropagation();
    e.preventDefault();
    onClose();
  }
  $effect(() => {
    if (!video) return;
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  });

  // Move focus into the dialog on open.
  let closeBtn = $state<HTMLButtonElement | null>(null);
  $effect(() => {
    if (video && closeBtn) closeBtn.focus();
  });
</script>

{#if video}
  <div class="vp-overlay" role="dialog" aria-modal="true" aria-label={video.title}>
    <button type="button" class="vp-backdrop" aria-label={m.video_close()} onclick={onClose}
    ></button>

    <div class="vp-frame">
      <button
        bind:this={closeBtn}
        type="button"
        class="vp-close"
        aria-label={m.video_close()}
        onclick={onClose}>×</button
      >

      {#if needsGate}
        <div class="vp-interstitial" role="alertdialog" aria-label={advisoryCopy}>
          <p class="vp-advisory-icon" aria-hidden="true">⚠</p>
          <p class="vp-advisory-copy">{advisoryCopy}</p>
          <div class="vp-advisory-actions">
            <button type="button" class="vp-btn vp-btn-ghost" onclick={onClose}>
              {m.video_advisory_cancel()}
            </button>
            <button type="button" class="vp-btn vp-btn-primary" onclick={() => (confirmed = true)}>
              {m.video_advisory_continue()}
            </button>
          </div>
        </div>
      {:else}
        <div class="vp-media">
          {#if video.provider === 'youtube' || video.provider === 'vimeo'}
            <iframe
              src={embedSrc}
              title={video.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowfullscreen
              loading="lazy"
              referrerpolicy="strict-origin-when-cross-origin"
            ></iframe>
          {:else}
            <!-- Direct agency HLS/MP4 has no author-time caption track to
                 attach; captions (when the source has them) are reached via the
                 "watch on source" link. a11y_media_has_caption is suppressed
                 deliberately, not by oversight. -->
            <!-- svelte-ignore a11y_media_has_caption -->
            <video src={embedSrc} controls autoplay playsinline></video>
          {/if}
        </div>
      {/if}

      <div class="vp-meta">
        <p class="vp-title">{video.title}</p>
        {#if video.caption}<p class="vp-caption">{video.caption}</p>{/if}
        <p class="vp-credit">
          <span class="vp-channel">{video.channel}</span>{#if video.agency !== video.channel}
            · {video.agency}{/if} · {video.license_or_fair_use} ·
          <a href={video.source_url} target="_blank" rel="noopener noreferrer">
            {m.video_watch_on_source()}
          </a>
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .vp-overlay {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }
  .vp-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(2, 4, 12, 0.92);
    backdrop-filter: blur(8px);
    border: none;
    padding: 0;
    cursor: zoom-out;
  }
  .vp-frame {
    position: relative;
    z-index: 1;
    width: min(92vw, 1200px);
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .vp-close {
    position: absolute;
    top: -6px;
    right: -6px;
    z-index: 2;
    width: 44px;
    height: 44px;
    background: rgba(20, 24, 36, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.18);
    color: #fff;
    font-size: 24px;
    line-height: 1;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .vp-close:hover,
  .vp-close:focus-visible {
    border-color: rgba(255, 255, 255, 0.5);
    outline: none;
  }
  .vp-media {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    background: #000;
    border-radius: 6px;
    overflow: hidden;
    box-shadow: 0 12px 48px rgba(0, 0, 0, 0.6);
  }
  .vp-media :global(iframe),
  .vp-media :global(video) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: none;
  }
  .vp-interstitial {
    width: 100%;
    aspect-ratio: 16 / 9;
    background: rgba(12, 14, 22, 0.96);
    border: 1px solid rgba(255, 180, 120, 0.35);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 24px;
    text-align: center;
  }
  .vp-advisory-icon {
    font-size: 32px;
    margin: 0;
    color: #ffb478;
  }
  .vp-advisory-copy {
    margin: 0;
    max-width: 46ch;
    color: #f2e9dd;
    line-height: 1.5;
  }
  .vp-advisory-actions {
    display: flex;
    gap: 12px;
  }
  .vp-btn {
    padding: 9px 18px;
    border-radius: 6px;
    font: inherit;
    cursor: pointer;
    border: 1px solid transparent;
  }
  .vp-btn-ghost {
    background: transparent;
    border-color: rgba(255, 255, 255, 0.25);
    color: #dfe6f2;
  }
  .vp-btn-primary {
    background: #c9762f;
    color: #fff;
  }
  .vp-btn-ghost:hover,
  .vp-btn-primary:hover {
    filter: brightness(1.12);
  }
  .vp-meta {
    color: #dfe6f2;
  }
  .vp-title {
    margin: 0;
    font-weight: 600;
  }
  .vp-caption {
    margin: 2px 0 0;
    font-size: 0.88em;
    color: #aeb7c7;
  }
  .vp-credit {
    margin: 6px 0 0;
    font-size: 0.8em;
    color: #8b93a4;
  }
  .vp-credit a {
    color: #9fc3ff;
  }
  .vp-channel {
    color: #c3cbdb;
  }
  @media (prefers-reduced-motion: reduce) {
    .vp-backdrop {
      backdrop-filter: none;
    }
  }
</style>
