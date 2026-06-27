<!--
  Staging-ground review surface — dev-only (RFC-029 / #363, Decision 5).

  Lists everything in static/images/_staging/ with its vision score /
  category / rejection, lets you filter + bulk-mark each image PROMOTE
  (copy into the shipped tree) / PRUNE (delete) / leave (skip), then
  "Apply marked actions" runs them all in one POST to the api/ endpoint.
-->
<script lang="ts">
  import { base } from '$app/paths';

  type Item = {
    mainPath: string;
    stagingWebPath: string;
    category: string;
    sizeKb: number;
    score: number | null;
    visionCategory: string | null;
    rejectedBy: string | null;
    subject: string | null;
  };

  let items = $state<Item[]>([]);
  let loading = $state(true);
  let applying = $state(false);
  let result = $state<string | null>(null);

  // path -> 'promote' | 'prune'  (absent = skip / leave staged)
  let marks = $state<Record<string, 'promote' | 'prune'>>({});

  // filters
  let categoryFilter = $state('all');
  let statusFilter = $state<'all' | 'scored' | 'unscored' | 'rejected' | 'lowscore'>('all');
  let lowScoreMax = $state(4);

  async function load() {
    loading = true;
    result = null;
    const res = await fetch(`${base}/dev/staging/api`);
    const data = await res.json();
    items = data.items ?? [];
    marks = {};
    loading = false;
  }
  $effect(() => {
    void load();
  });

  const categories = $derived([...new Set(items.map((i) => i.category))].sort());

  const filtered = $derived(
    items.filter((i) => {
      if (categoryFilter !== 'all' && i.category !== categoryFilter) return false;
      switch (statusFilter) {
        case 'scored':
          return i.score != null;
        case 'unscored':
          return i.score == null;
        case 'rejected':
          return i.rejectedBy != null;
        case 'lowscore':
          return i.score != null && i.score <= lowScoreMax;
        default:
          return true;
      }
    }),
  );

  const markedCount = $derived(Object.keys(marks).length);
  const promoteCount = $derived(Object.values(marks).filter((m) => m === 'promote').length);
  const pruneCount = $derived(Object.values(marks).filter((m) => m === 'prune').length);

  function mark(path: string, action: 'promote' | 'prune') {
    const next = { ...marks };
    if (next[path] === action) delete next[path];
    else next[path] = action;
    marks = next;
  }
  function bulkMark(action: 'promote' | 'prune') {
    const next = { ...marks };
    for (const i of filtered) next[i.mainPath] = action;
    marks = next;
  }
  function clearMarks() {
    marks = {};
  }

  async function apply() {
    const actions = Object.entries(marks).map(([path, action]) => ({ path, action }));
    if (!actions.length) return;
    if (
      !confirm(
        `Apply ${promoteCount} promote + ${pruneCount} prune action(s)? Prune permanently deletes files.`,
      )
    )
      return;
    applying = true;
    const res = await fetch(`${base}/dev/staging/api`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actions }),
    });
    const data = await res.json();
    applying = false;
    result =
      `Promoted ${data.promoted}, pruned ${data.pruned}.` +
      (data.errors?.length
        ? ` ${data.errors.length} error(s): ${JSON.stringify(data.errors)}`
        : '') +
      (data.note ? `\n${data.note}` : '');
    await load();
  }
</script>

<svelte:head><title>Staging review · dev</title></svelte:head>

<div class="wrap">
  <h1>Staging ground review <span class="muted">({items.length} images in _staging)</span></h1>
  <p class="muted">
    PROMOTE copies into the shipped tree + appends to the approved allowlist. PRUNE permanently
    deletes. Unmarked images stay staged. After promoting, run
    <code>npm run build-image-provenance</code> to credit them.
  </p>

  <div class="toolbar">
    <label
      >Category
      <select bind:value={categoryFilter}>
        <option value="all">all ({items.length})</option>
        {#each categories as c (c)}
          <option value={c}>{c} ({items.filter((i) => i.category === c).length})</option>
        {/each}
      </select>
    </label>
    <label
      >Status
      <select bind:value={statusFilter}>
        <option value="all">all</option>
        <option value="scored">scored</option>
        <option value="unscored">unscored</option>
        <option value="rejected">vision-rejected</option>
        <option value="lowscore">score ≤ {lowScoreMax}</option>
      </select>
    </label>
    {#if statusFilter === 'lowscore'}
      <label>max <input type="number" min="1" max="10" bind:value={lowScoreMax} /></label>
    {/if}
    <span class="grow"></span>
    <button onclick={() => bulkMark('promote')}>Mark {filtered.length} → promote</button>
    <button onclick={() => bulkMark('prune')}>Mark {filtered.length} → prune</button>
    <button onclick={clearMarks} disabled={markedCount === 0}>Clear marks</button>
  </div>

  <div class="apply-bar">
    <strong>{markedCount}</strong> marked — {promoteCount} promote, {pruneCount} prune
    <button class="apply" onclick={apply} disabled={markedCount === 0 || applying}>
      {applying ? 'Applying…' : 'Apply marked actions'}
    </button>
  </div>
  {#if result}<pre class="result">{result}</pre>{/if}

  {#if loading}
    <p>Loading…</p>
  {:else if filtered.length === 0}
    <p class="muted">Nothing matches the current filter.</p>
  {:else}
    <div class="grid">
      {#each filtered as item (item.mainPath)}
        <figure
          class="card"
          class:promote={marks[item.mainPath] === 'promote'}
          class:prune={marks[item.mainPath] === 'prune'}
        >
          <img src="{base}{item.stagingWebPath}" alt="" loading="lazy" />
          <figcaption>
            <span class="path">{item.mainPath.replace('/images/', '')}</span>
            <span class="meta">
              {item.category} · {item.sizeKb} KB ·
              {#if item.score != null}score {item.score}{:else}unscored{/if}
              {#if item.rejectedBy}· <span class="rej">rejected: {item.rejectedBy}</span>{/if}
            </span>
            {#if item.subject}<span class="subj" title={item.subject}>{item.subject}</span>{/if}
          </figcaption>
          <div class="actions">
            <button
              class:on={marks[item.mainPath] === 'promote'}
              onclick={() => mark(item.mainPath, 'promote')}>Promote</button
            >
            <button
              class:on={marks[item.mainPath] === 'prune'}
              onclick={() => mark(item.mainPath, 'prune')}>Prune</button
            >
          </div>
        </figure>
      {/each}
    </div>
  {/if}
</div>

<style>
  .wrap {
    max-width: 1400px;
    margin: 0 auto;
    padding: 16px;
    font-family: system-ui, sans-serif;
    color: #e6e6e6;
  }
  h1 {
    font-size: 18px;
  }
  .muted {
    color: #9aa;
    font-weight: 400;
  }
  code {
    background: #222;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .toolbar,
  .apply-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 8px 0;
    position: sticky;
    top: 0;
    background: #111;
    z-index: 2;
  }
  .grow {
    flex: 1;
  }
  .apply-bar {
    border-top: 1px solid #333;
    border-bottom: 1px solid #333;
  }
  button {
    background: #2a2a3a;
    color: #e6e6e6;
    border: 1px solid #444;
    border-radius: 4px;
    padding: 4px 10px;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  button.apply {
    background: #2563eb;
    border-color: #2563eb;
    font-weight: 700;
  }
  .result {
    white-space: pre-wrap;
    background: #1a2a1a;
    border: 1px solid #2d5;
    padding: 8px;
    border-radius: 4px;
    font-size: 12px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 10px;
    margin-top: 12px;
  }
  .card {
    margin: 0;
    border: 2px solid #333;
    border-radius: 6px;
    overflow: hidden;
    background: #181820;
    display: flex;
    flex-direction: column;
  }
  .card.promote {
    border-color: #2d5;
  }
  .card.prune {
    border-color: #e44;
  }
  .card img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    background: #000;
  }
  figcaption {
    padding: 5px 7px;
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
  }
  .path {
    font-family: monospace;
    word-break: break-all;
  }
  .meta {
    color: #9aa;
  }
  .rej {
    color: #f88;
  }
  .subj {
    color: #889;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .actions {
    display: flex;
    gap: 4px;
    padding: 6px;
  }
  .actions button {
    flex: 1;
    font-size: 11px;
  }
  .actions button.on {
    background: #2563eb;
    border-color: #2563eb;
  }
</style>
