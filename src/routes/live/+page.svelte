<script lang="ts">
  import * as m from '$lib/paraglide/messages';
  import { base } from '$app/paths';
  import MediaPlayer from '$lib/components/MediaPlayer.svelte';
  import { posterUrlFor, type VideoProvenanceEntry } from '$lib/video-provenance';
  import { getLiveFeeds, getNextLaunch, type LiveFeed } from '$lib/live-feeds';

  let feeds = $state<LiveFeed[]>([]);
  let nextLaunch = $state<{ name: string; net: string; source_url: string } | null>(null);
  let loaded = $state(false);
  let playerVideo = $state<VideoProvenanceEntry | null>(null);
  // Poster CDN can be unavailable — fall back to the gradient (review M2).
  let failedPosters = $state(new Set<string>());
  function markPosterFailed(id: string) {
    failedPosters = new Set(failedPosters).add(id);
  }

  $effect(() => {
    const now = new Date();
    void Promise.all([getLiveFeeds(now), getNextLaunch(now)]).then(([f, n]) => {
      feeds = f;
      nextLaunch = n;
      loaded = true;
    });
  });

  const issPins = $derived(feeds.filter((f) => f.kind === 'iss-permanent'));
  const launchFeeds = $derived(feeds.filter((f) => f.kind === 'launch-broadcast'));

  function fmtTime(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
  }
</script>

<svelte:head>
  <title>{m.live_title()} · Orrery</title>
</svelte:head>

<section class="live" aria-labelledby="live-title" data-route-ready="true">
  <header class="live-head">
    <h1 id="live-title">{m.live_title()}</h1>
    <p class="live-intro">{m.live_intro()}</p>
  </header>

  <!-- Pinned permanent stream (ISS) — click-to-load facade, honest live badge. -->
  {#each issPins as pin (pin.id)}
    {#if pin.video}
      {@const poster = posterUrlFor(pin.video)}
      <article class="pin">
        <button
          type="button"
          class="pin-tile"
          onclick={() => (playerVideo = pin.video ?? null)}
          aria-label={m.video_play_aria({ title: pin.title })}
        >
          {#if poster && !failedPosters.has(pin.id)}
            <img
              src={poster}
              alt=""
              loading="eager"
              decoding="async"
              onerror={() => markPosterFailed(pin.id)}
            />
          {:else}
            <span class="pin-fallback" aria-hidden="true"></span>
          {/if}
          <span class="badge badge-live" aria-hidden="true">● {m.live_badge_live()}</span>
          <span class="pin-play" aria-hidden="true">▶</span>
        </button>
        <div class="pin-meta">
          <p class="pin-title">{pin.title}</p>
          <p class="pin-credit">
            {pin.agency} ·
            <a href={pin.source_url} target="_blank" rel="noopener noreferrer"
              >{m.video_watch_on_source()}</a
            >
          </p>
        </div>
      </article>
    {/if}
  {/each}
  {#if loaded && issPins.length === 0}
    <p class="muted">{m.live_iss_unavailable()}</p>
  {/if}

  <!-- Launch broadcasts — time-gated; link-out (we hold the launch page, not the stream). -->
  <section class="launches" aria-labelledby="live-launches">
    <h2 id="live-launches">{m.live_launches_heading()}</h2>
    {#if !loaded}
      <p class="muted">{m.live_loading()}</p>
    {:else if launchFeeds.length === 0}
      <p class="muted">
        {m.live_none_live()}
        {#if nextLaunch}
          <br />
          <span class="next-up"
            >{m.live_next_up({ name: nextLaunch.name })} · {fmtTime(nextLaunch.net)}
            {#if nextLaunch.source_url}
              · <a href={nextLaunch.source_url} target="_blank" rel="noopener noreferrer"
                >{m.live_details()}</a
              >{/if}</span
          >
        {/if}
      </p>
    {:else}
      <ul class="launch-list">
        {#each launchFeeds as f (f.id)}
          <li class="launch-row">
            <span class="badge {f.state === 'live' ? 'badge-live' : 'badge-soon'}">
              {f.state === 'live' ? m.live_badge_live() : m.live_badge_imminent()}
            </span>
            <span class="launch-body">
              <span class="launch-title">{f.title}</span>
              <span class="launch-meta">
                {f.agency}{f.starts_at ? ` · ${fmtTime(f.starts_at)}` : ''}
              </span>
            </span>
            {#if f.source_url}
              <a class="launch-watch" href={f.source_url} target="_blank" rel="noopener noreferrer"
                >{m.live_watch()}</a
              >
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
    <p class="all-launches">
      <a href="{base}/missions/launches">{m.live_all_launches()}</a>
    </p>
  </section>
</section>

<MediaPlayer video={playerVideo} onClose={() => (playerVideo = null)} />

<style>
  .live {
    max-width: 900px;
    margin: 0 auto;
    padding: 24px 16px 64px;
    color: #dfe6f2;
  }
  .live-head h1 {
    margin: 0 0 6px;
  }
  .live-intro {
    margin: 0 0 20px;
    color: #aeb7c7;
    max-width: 60ch;
  }
  .pin {
    margin-bottom: 28px;
  }
  .pin-tile {
    position: relative;
    display: block;
    width: 100%;
    aspect-ratio: 16 / 9;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    overflow: hidden;
    padding: 0;
    cursor: pointer;
    background: #000;
  }
  .pin-tile img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .pin-fallback {
    display: block;
    width: 100%;
    height: 100%;
    background:
      radial-gradient(circle at 50% 40%, rgba(68, 102, 255, 0.28), transparent 60%),
      linear-gradient(160deg, #12213f, #0a0f1e);
  }
  .pin-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: rgba(8, 12, 22, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.55);
    color: #fff;
    font-size: 22px;
    line-height: 60px;
    text-align: center;
    padding-left: 4px;
  }
  .pin-meta {
    margin-top: 8px;
  }
  .pin-title {
    margin: 0;
    font-weight: 600;
  }
  .pin-credit {
    margin: 2px 0 0;
    font-size: 0.85em;
    color: #8b93a4;
  }
  .pin-credit a,
  .launch-watch,
  .next-up a {
    color: #9fc3ff;
  }
  .badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 4px;
    font-family: 'Space Mono', monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
  }
  .badge-live {
    background: #c62f2f;
    color: #fff;
  }
  .badge-soon {
    background: rgba(201, 118, 47, 0.9);
    color: #fff;
  }
  .pin-tile .badge-live {
    position: absolute;
    top: 10px;
    left: 10px;
  }
  .launches h2 {
    font-size: 1.05rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: 6px;
  }
  .muted {
    color: #8b93a4;
    line-height: 1.6;
  }
  .next-up {
    color: #c3cbdb;
  }
  .launch-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 8px;
  }
  .launch-row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 6px;
  }
  .launch-title {
    display: block;
    font-weight: 600;
  }
  .launch-meta {
    display: block;
    font-size: 0.82em;
    color: #8b93a4;
  }
  .launch-watch {
    white-space: nowrap;
    font-size: 0.85em;
  }
  .all-launches {
    margin-top: 14px;
    font-size: 0.9em;
  }
  .all-launches a {
    color: #9fc3ff;
  }
</style>
