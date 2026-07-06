<script lang="ts">
  // New-images review surface — dev-only (0.7.3). Shows every image a
  // fill-gallery-gaps batch ADDED (static/data/new-images-review.json, built by
  // scripts/collect-new-images.mjs), grouped by gallery. Every image already
  // passed the vision gate — this is the human sanity-check. Default = keep;
  // click remove on anything that shouldn't ship. Decisions are recorded
  // non-destructively; the prune of removed slots is a separate step.
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  type Item = {
    path: string;
    surface: string;
    gallery: string;
    source: string;
    sourceUrl: string | null;
    license: string | null;
    decision: 'keep' | 'remove' | null;
  };

  let items = $state<Item[]>([]);
  let count = $state(0);
  let loading = $state(true);
  let saving = $state(false);
  let msg = $state('');
  let filter = $state<'all' | 'removed'>('all');

  // pending, unsaved removes keyed by path (keep is the default, so we only
  // need to track explicit removes + explicit keeps that undo a remove).
  let pending = $state<Record<string, 'keep' | 'remove'>>({});

  const groups = $derived.by(() => {
    const shown = items.filter((i) =>
      filter === 'removed' ? (pending[i.path] ?? i.decision) === 'remove' : true,
    );
    const by = new Map<string, Item[]>();
    for (const i of shown) {
      const key = `${i.surface}/${i.gallery}`;
      let arr = by.get(key);
      if (!arr) {
        arr = [];
        by.set(key, arr);
      }
      arr.push(i);
    }
    return [...by.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  });
  const dirty = $derived(Object.keys(pending).length);
  const removeCount = $derived(
    items.filter((i) => (pending[i.path] ?? i.decision) === 'remove').length,
  );

  async function load() {
    loading = true;
    const r = await fetch(`${base}/dev/new-images/api`);
    const data = await r.json();
    items = data.items;
    count = data.count;
    pending = {};
    loading = false;
  }

  function current(i: Item): 'keep' | 'remove' {
    return pending[i.path] ?? i.decision ?? 'keep';
  }

  function toggle(i: Item) {
    const next = current(i) === 'remove' ? 'keep' : 'remove';
    pending = { ...pending, [i.path]: next };
  }

  async function save() {
    saving = true;
    msg = '';
    const decisions = Object.entries(pending).map(([path, decision]) => ({ path, decision }));
    const r = await fetch(`${base}/dev/new-images/api`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decisions }),
    });
    const res = await r.json();
    msg = `Saved ${res.saved} · ${res.total} decisions on file`;
    saving = false;
    await load();
  }

  function badgeClass(source: string): string {
    if (source === 'unsplash') return 'unsplash';
    if (source === 'esa-portal') return 'esa';
    if (source.startsWith('flickr')) return 'flickr';
    if (source.startsWith('nasa')) return 'nasa';
    return 'commons';
  }

  onMount(load);
</script>

<svelte:head><title>New-images review · dev</title></svelte:head>

<main>
  <header>
    <h1>New-images review</h1>
    <p class="sub">
      {count} images added by the last fill batch, grouped by gallery. All passed the vision gate —
      <b>keep</b>
      is the default. Click <b>remove</b> on anything that shouldn't ship. Non-destructive: records decisions;
      the prune is a separate step.
    </p>
    <div class="bar">
      <span class="filters">
        <button class:active={filter === 'all'} onclick={() => (filter = 'all')}
          >all ({count})</button
        >
        <button class:active={filter === 'removed'} onclick={() => (filter = 'removed')}
          >removed ({removeCount})</button
        >
      </span>
      <button class="save" disabled={!dirty || saving} onclick={save}>
        {saving ? 'saving…' : `Save ${dirty} change${dirty === 1 ? '' : 's'}`}
      </button>
      {#if msg}<span class="msg">{msg}</span>{/if}
    </div>
  </header>

  {#if loading}
    <p>loading…</p>
  {:else if count === 0}
    <p>No new images found. Run <code>node scripts/collect-new-images.mjs</code> after a fill.</p>
  {:else}
    {#each groups as [key, group] (key)}
      <section class="gallery">
        <h2>{key} <span class="n">+{group.length}</span></h2>
        <ul class="grid">
          {#each group as i (i.path)}
            {@const c = current(i)}
            <li class="card" class:removed={c === 'remove'}>
              <button class="imgbtn" onclick={() => toggle(i)} title="click to toggle keep/remove">
                <img src={`${base}${i.path}`} alt={i.gallery} loading="lazy" />
                {#if c === 'remove'}<span class="x">✕ remove</span>{/if}
              </button>
              <div class="meta">
                <span class="slot">{i.path.split('/').pop()}</span>
                <span class="src {badgeClass(i.source)}">{i.source}</span>
                {#if i.sourceUrl}<a href={i.sourceUrl} target="_blank" rel="noopener">src</a>{/if}
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  {/if}
</main>

<style>
  main {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1.5rem;
    color: #e8e8e8;
    font-family: system-ui, sans-serif;
  }
  h1 {
    margin: 0 0 0.25rem;
    font-size: 1.4rem;
  }
  .sub {
    margin: 0 0 0.75rem;
    color: #9aa;
    font-size: 0.85rem;
    max-width: 70ch;
  }
  .bar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    background: #111;
    padding: 0.6rem 0;
    z-index: 2;
  }
  .filters button,
  .save {
    background: #222;
    color: #ddd;
    border: 1px solid #444;
    border-radius: 5px;
    padding: 4px 10px;
    cursor: pointer;
    font-size: 0.8rem;
  }
  .filters button.active {
    background: #3a5;
    color: #fff;
  }
  .save {
    background: #35c;
    border-color: #35c;
    color: #fff;
    font-weight: 600;
  }
  .save:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .msg {
    color: #6d9;
    font-size: 0.8rem;
  }
  .gallery {
    margin: 1.25rem 0 0;
  }
  .gallery h2 {
    font-size: 0.95rem;
    margin: 0 0 0.5rem;
    color: #cde;
    font-family: monospace;
  }
  .gallery h2 .n {
    color: #6d9;
    font-weight: 700;
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.7rem;
  }
  .card {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
  }
  .card.removed {
    border-color: #c44;
    opacity: 0.6;
  }
  .imgbtn {
    display: block;
    width: 100%;
    padding: 0;
    border: 0;
    background: #000;
    cursor: pointer;
    position: relative;
  }
  .imgbtn img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    display: block;
  }
  .imgbtn .x {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    background: rgba(180, 40, 40, 0.55);
    color: #fff;
    font-weight: 700;
    font-size: 0.9rem;
  }
  .meta {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    padding: 0.35rem 0.45rem;
    font-size: 0.7rem;
    color: #9aa;
    flex-wrap: wrap;
  }
  .slot {
    font-family: monospace;
    color: #ccd;
  }
  .src {
    padding: 1px 6px;
    border-radius: 9px;
    color: #111;
    font-weight: 600;
  }
  .src.commons {
    background: #9ab;
  }
  .src.unsplash {
    background: #6d9;
  }
  .src.esa {
    background: #7bd;
  }
  .src.nasa {
    background: #eb6;
  }
  .src.flickr {
    background: #d9a;
  }
  .meta a {
    color: #7ac;
  }
</style>
