<script lang="ts">
  // Off-subject review surface — dev-only (0.7.3). Reviews images the vision
  // detector flagged off-subject, ranked by score (model-hated gross junk
  // first). keep = detector wrong (on-subject); remove = genuine junk. Both
  // are recorded to static/data/off-subject-review.json as labels that also
  // grow the detector eval. Non-destructive — pruning/re-sourcing is separate.
  import { base } from '$app/paths';
  import { onMount } from 'svelte';

  type Item = {
    path: string;
    entity: string;
    slot: string;
    score: number | null;
    category: string | null;
    subject: string;
    agency: string | null;
    sourceUrl: string | null;
    decision: 'keep' | 'remove' | null;
    note: string | null;
  };

  let items = $state<Item[]>([]);
  let count = $state(0);
  let reviewed = $state(0);
  let loading = $state(true);
  let saving = $state(false);
  let msg = $state('');
  let filter = $state<'all' | 'undecided' | 'junk'>('all');

  // pending, unsaved decisions keyed by path
  let pending = $state<Record<string, 'keep' | 'remove'>>({});
  let notes = $state<Record<string, string>>({});

  const shown = $derived(
    items.filter((i) => {
      if (filter === 'undecided') return !(pending[i.path] ?? i.decision);
      if (filter === 'junk') return (i.score ?? 9) === 1;
      return true;
    }),
  );
  const dirty = $derived(Object.keys(pending).length);

  async function load() {
    loading = true;
    const r = await fetch(`${base}/dev/off-subject/api`);
    const data = await r.json();
    items = data.items;
    count = data.count;
    reviewed = data.reviewed;
    pending = {};
    for (const i of items) if (i.note) notes[i.path] = i.note;
    loading = false;
  }

  function mark(path: string, decision: 'keep' | 'remove') {
    pending = { ...pending, [path]: pending[path] === decision ? undefined : decision } as Record<
      string,
      'keep' | 'remove'
    >;
    // strip undefined
    if (!pending[path]) {
      const { [path]: _drop, ...rest } = pending;
      pending = rest;
    }
  }

  function current(i: Item): 'keep' | 'remove' | null {
    return pending[i.path] ?? i.decision;
  }

  async function save() {
    saving = true;
    msg = '';
    const decisions = Object.entries(pending).map(([path, decision]) => ({
      path,
      decision,
      note: notes[path],
    }));
    const r = await fetch(`${base}/dev/off-subject/api`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ decisions }),
    });
    const res = await r.json();
    msg = `Saved ${res.saved} · ${res.total} total decisions on file`;
    saving = false;
    await load();
  }

  function tier(score: number | null): string {
    if (score === 1) return 'junk'; // reliable gross junk
    if ((score ?? 9) >= 3) return 'fp'; // likely false positive
    return 'mid';
  }

  onMount(load);
</script>

<svelte:head><title>Off-subject review · dev</title></svelte:head>

<main>
  <header>
    <h1>Off-subject review</h1>
    <p class="sub">
      {count} flagged · {reviewed} reviewed · ranked by score (model-hated junk first). <b>keep</b>
      = detector wrong (on-subject) · <b>remove</b> = genuine junk. Non-destructive — records labels.
    </p>
    <div class="bar">
      <span class="filters">
        <button class:active={filter === 'all'} onclick={() => (filter = 'all')}>all</button>
        <button class:active={filter === 'undecided'} onclick={() => (filter = 'undecided')}
          >undecided</button
        >
        <button class:active={filter === 'junk'} onclick={() => (filter = 'junk')}
          >score-1 junk</button
        >
      </span>
      <button class="save" disabled={!dirty || saving} onclick={save}>
        {saving ? 'saving…' : `Save ${dirty} decision${dirty === 1 ? '' : 's'}`}
      </button>
      {#if msg}<span class="msg">{msg}</span>{/if}
    </div>
  </header>

  {#if loading}
    <p>loading…</p>
  {:else}
    <ul class="grid">
      {#each shown as i (i.path)}
        {@const c = current(i)}
        <li class="card" class:decided={c}>
          <img src={`${base}${i.path}`} alt={i.subject} loading="lazy" />
          <div class="meta">
            <span class="score {tier(i.score)}">{i.score ?? '–'}</span>
            <span class="id">{i.entity}/{i.slot}</span>
            <span class="cat">{i.category}</span>
            {#if i.agency}<span class="agency">{i.agency}</span>{/if}
          </div>
          <p class="subject">{i.subject}</p>
          <div class="actions">
            <button class="keep" class:on={c === 'keep'} onclick={() => mark(i.path, 'keep')}
              >keep</button
            >
            <button class="remove" class:on={c === 'remove'} onclick={() => mark(i.path, 'remove')}
              >remove</button
            >
            <input class="note" placeholder="note…" bind:value={notes[i.path]} />
            {#if i.sourceUrl}<a href={i.sourceUrl} target="_blank" rel="noopener">src</a>{/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
</main>

<style>
  main {
    max-width: 1100px;
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
  }
  .bar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
    position: sticky;
    top: 0;
    background: #111;
    padding: 0.5rem 0;
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
  .grid {
    list-style: none;
    margin: 1rem 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 0.9rem;
  }
  .card {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .card.decided {
    border-color: #4a6;
  }
  .card img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    background: #000;
  }
  .meta {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    padding: 0.4rem 0.5rem 0;
    font-size: 0.72rem;
    color: #9aa;
    flex-wrap: wrap;
  }
  .score {
    font-weight: 700;
    padding: 1px 7px;
    border-radius: 10px;
    color: #111;
  }
  .score.junk {
    background: #e66;
  }
  .score.mid {
    background: #eb6;
  }
  .score.fp {
    background: #789;
  }
  .id {
    font-family: monospace;
    color: #ccd;
  }
  .subject {
    margin: 0.35rem 0.5rem;
    font-size: 0.8rem;
    color: #dde;
    flex: 1;
  }
  .actions {
    display: flex;
    gap: 0.3rem;
    align-items: center;
    padding: 0 0.5rem 0.5rem;
  }
  .actions button {
    border: 1px solid #555;
    background: #222;
    color: #ccc;
    border-radius: 5px;
    padding: 3px 9px;
    cursor: pointer;
    font-size: 0.78rem;
  }
  .actions .keep.on {
    background: #3a5;
    border-color: #3a5;
    color: #fff;
  }
  .actions .remove.on {
    background: #c44;
    border-color: #c44;
    color: #fff;
  }
  .note {
    flex: 1;
    min-width: 0;
    background: #111;
    border: 1px solid #444;
    border-radius: 5px;
    color: #ddd;
    padding: 3px 6px;
    font-size: 0.75rem;
  }
  .actions a {
    color: #7ac;
    font-size: 0.75rem;
  }
</style>
