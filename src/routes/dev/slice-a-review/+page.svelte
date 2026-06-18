<!--
  Slice A v3 image-approval review — dev-only data-labeling surface.
  Visit localhost:5173/dev/slice-a-review. Each proposal gets a status
  (approved / rejected / needs-manual / pending), a free-text comment,
  tag chips (categorical exceptions like 'wrong-mission' or
  'credit-incorrect'), and optional overrides that the apply script
  honours (credit / license / image_url / source_type / source_url).
  Every action POSTs to ./api/+server.ts which atomically rewrites
  static/data/slice-a-approvals.json — the single source of truth.
-->
<script lang="ts">
  import type { PageData } from './$types';

  type Overrides = { credit?: string; license?: string; image_url?: string; source_type?: string; source_url?: string };
  type Decision = {
    status: 'approved' | 'rejected' | 'needs-manual';
    comment: string;
    tags: string[];
    overrides: Overrides;
    updated_at?: string;
  };
  type Proposal = {
    proposal_id: string;
    agency: string;
    surface: string;
    missionId: string;
    slot: string;
    query?: string;
    proposed?: { source_type?: string; image_url?: string; source_url?: string; credit?: string; license?: string } | null;
    vision_v3?: { verdict?: string; confidence?: number; reason?: string } | null;
    size_bytes?: number | null;
    drop_reasons?: string[];
    notes?: string[];
    survivor: boolean;
  };

  const { data }: { data: PageData } = $props();

  // Canonical exception-tag vocabulary. Free-form tags are also accepted
  // via the "+ add" affordance — these are just quick-pick chips.
  const TAG_VOCAB = [
    { id: 'wrong-mission', label: 'wrong-mission', tip: 'Image is real but is from a different mission than claimed' },
    { id: 'wrong-target-body', label: 'wrong-target', tip: 'Image shows a different celestial body' },
    { id: 'low-resolution', label: 'low-res', tip: 'Too small / low-quality for hero use' },
    { id: 'mockup-or-museum', label: 'mockup', tip: 'Replica / museum display, not the real spacecraft' },
    { id: 'crew-only', label: 'crew-only', tip: 'Crew portrait without spacecraft in frame' },
    { id: 'distant-incidental', label: 'distant', tip: 'Target appears as a dot, not the subject' },
    { id: 'needs-manual-source', label: 'manual-source', tip: 'Automated resolver unlikely to find a good one' },
    { id: 'credit-incorrect', label: 'credit-fix', tip: 'Image OK but credit / license needs override' },
    { id: 'wrong-orientation', label: 'orientation', tip: 'Sideways / upside down' },
    { id: 'cross-mission-share-ok', label: 'share-ok', tip: 'Explicitly allow sharing across related missions' },
  ];

  // Live state, seeded from the loaded approvals file.
  const initialDecisions = (data.approvals.decisions ?? {}) as Record<string, Decision>;
  let decisions = $state<Record<string, Decision>>({ ...initialDecisions });
  let lastSavedAt = $state<string | null>(data.approvals.last_updated_at ?? null);
  let savingId = $state<string | null>(null);

  // Per-card editable buffers (comment + overrides). We commit them to
  // the server on blur / explicit save, not on every keystroke.
  let commentDrafts = $state<Record<string, string>>({});
  let overrideDrafts = $state<Record<string, Overrides>>({});
  for (const [id, d] of Object.entries(decisions)) {
    commentDrafts[id] = d.comment ?? '';
    overrideDrafts[id] = { ...(d.overrides ?? {}) };
  }
  function bufferFor(id: string, field: keyof Overrides): string {
    return overrideDrafts[id]?.[field] ?? '';
  }
  let expandedOverrides = $state<Record<string, boolean>>({});

  // Filter / view controls.
  let showDropped = $state(false);
  let filterAgency = $state<Set<string>>(new Set());
  let filterSurface = $state<Set<string>>(new Set());
  let filterCodePath = $state<Set<string>>(new Set());
  let filterStatus = $state<Set<string>>(new Set(['pending', 'approved', 'rejected', 'needs-manual']));

  const proposals: Proposal[] = data.salvage.proposals ?? [];

  function codePathOf(p: Proposal): string {
    if (p.surface === 'fleet-galleries') return 'fleet-gallery';
    if (p.surface === 'missions') return p.slot === '01' ? 'mission-hero' : 'mission-gallery';
    return p.surface;
  }
  function oldPathOf(p: Proposal): string {
    return `https://orrery.space/images/${p.surface}/${p.missionId}/${p.slot}.jpg`;
  }
  function statusOf(id: string): 'approved' | 'rejected' | 'needs-manual' | 'pending' {
    return decisions[id]?.status ?? 'pending';
  }

  const visibleList = $derived(
    proposals
      .filter((p) => (showDropped ? true : p.survivor))
      .filter((p) => filterAgency.size === 0 || filterAgency.has(p.agency))
      .filter((p) => filterSurface.size === 0 || filterSurface.has(p.surface))
      .filter((p) => filterCodePath.size === 0 || filterCodePath.has(codePathOf(p)))
      .filter((p) => filterStatus.has(statusOf(p.proposal_id))),
  );
  const counts = $derived({
    total: proposals.length,
    survivors: proposals.filter((p) => p.survivor).length,
    visible: visibleList.length,
    approved: Object.values(decisions).filter((d) => d.status === 'approved').length,
    rejected: Object.values(decisions).filter((d) => d.status === 'rejected').length,
    manual: Object.values(decisions).filter((d) => d.status === 'needs-manual').length,
  });
  const agencies = $derived([...new Set(proposals.map((p) => p.agency))].sort());
  const surfaces = $derived([...new Set(proposals.map((p) => p.surface))].sort());
  const codePaths = $derived([...new Set(proposals.map(codePathOf))].sort());

  async function persist(id: string, status: 'approved' | 'rejected' | 'needs-manual' | 'pending') {
    savingId = id;
    const comment = commentDrafts[id] ?? '';
    const tags = decisions[id]?.tags ?? [];
    const overrides = Object.fromEntries(
      Object.entries(overrideDrafts[id] ?? {}).filter(([, v]) => v && v.trim().length > 0),
    );
    // Optimistic state.
    if (status === 'pending') {
      delete decisions[id];
    } else {
      decisions[id] = {
        status,
        comment,
        tags,
        overrides,
        updated_at: new Date().toISOString(),
      };
    }
    try {
      const res = await fetch('./api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposal_id: id, status, comment, tags, overrides }),
      });
      if (res.ok) {
        const out = await res.json();
        lastSavedAt = out.last_updated_at;
      }
    } finally {
      savingId = null;
    }
  }

  function toggleTag(id: string, tag: string) {
    const cur = decisions[id];
    if (!cur) return; // require a decision before tagging
    const next = new Set(cur.tags);
    if (next.has(tag)) next.delete(tag);
    else next.add(tag);
    decisions[id] = { ...cur, tags: [...next] };
    persist(id, cur.status);
  }

  function setOverride(id: string, field: keyof Overrides, value: string) {
    overrideDrafts[id] = { ...(overrideDrafts[id] ?? {}), [field]: value };
  }

  async function saveOverridesAndComment(id: string) {
    const cur = decisions[id];
    if (!cur) return; // only persist when there's already a decision
    await persist(id, cur.status);
  }

  function toggleFilter(set: Set<string>, value: string): Set<string> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  async function bulkSet(status: 'approved' | 'rejected' | 'needs-manual' | 'pending') {
    // Serialised so the file write doesn't race.
    for (const p of visibleList) {
      // eslint-disable-next-line no-await-in-loop -- intentional serialisation
      await persist(p.proposal_id, status);
    }
  }
</script>

<svelte:head><title>Slice A v3 — Image Approval Review</title></svelte:head>

<div class="wrap">
  <header>
    <h1>Slice A v3 — Image Approval Review</h1>
    <div class="stats">
      <span><b>{counts.visible}</b> visible</span>
      <span class="ok"><b>{counts.approved}</b> approved</span>
      <span class="bad"><b>{counts.rejected}</b> rejected</span>
      <span class="warn"><b>{counts.manual}</b> manual</span>
      <span><b>{counts.total - counts.approved - counts.rejected - counts.manual}</b> pending</span>
      <span class="hint">saved {lastSavedAt ? new Date(lastSavedAt).toLocaleTimeString() : 'never'}</span>
    </div>
  </header>

  <main>
    <aside>
      <h2>Pool</h2>
      <label>
        <input type="checkbox" bind:checked={showDropped} />
        Show dropped proposals
        <span class="count">({counts.total - counts.survivors})</span>
      </label>

      <h2>Agency</h2>
      {#each agencies as a}
        <label>
          <input
            type="checkbox"
            checked={filterAgency.has(a)}
            onchange={() => (filterAgency = toggleFilter(filterAgency, a))}
          />
          {a}
          <span class="count">{proposals.filter((p) => p.agency === a).length}</span>
        </label>
      {/each}

      <h2>Surface</h2>
      {#each surfaces as s}
        <label>
          <input
            type="checkbox"
            checked={filterSurface.has(s)}
            onchange={() => (filterSurface = toggleFilter(filterSurface, s))}
          />
          {s}
        </label>
      {/each}

      <h2>Code path</h2>
      {#each codePaths as c}
        <label>
          <input
            type="checkbox"
            checked={filterCodePath.has(c)}
            onchange={() => (filterCodePath = toggleFilter(filterCodePath, c))}
          />
          {c}
        </label>
      {/each}

      <h2>Status</h2>
      {#each ['pending', 'approved', 'rejected', 'needs-manual'] as s}
        <label>
          <input
            type="checkbox"
            checked={filterStatus.has(s)}
            onchange={() => (filterStatus = toggleFilter(filterStatus, s))}
          />
          {s}
        </label>
      {/each}

      <button
        class="reset"
        onclick={() => {
          filterAgency = new Set();
          filterSurface = new Set();
          filterCodePath = new Set();
          filterStatus = new Set(['pending', 'approved', 'rejected', 'needs-manual']);
        }}
      >Reset filters</button>
    </aside>

    <section class="grid">
      {#each visibleList as p (p.proposal_id)}
        {@const st = statusOf(p.proposal_id)}
        {@const tagsOn = new Set(decisions[p.proposal_id]?.tags ?? [])}
        <article class="card {st}" data-id={p.proposal_id}>
          <div class="head">
            <span class="mid">{p.missionId}/{p.slot}</span>
            <span class="codepath">{codePathOf(p)}</span>
          </div>
          <div class="imgs">
            <div>
              <span class="label">old</span>
              <img loading="lazy" src={oldPathOf(p)} alt="old"
                onerror={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')} />
            </div>
            <div>
              <span class="label">new ({p.proposed?.source_type ?? '?'})</span>
              {#if p.proposed?.image_url}
                <img loading="lazy" src={p.proposed.image_url} alt="new" />
              {:else}
                <span class="missing">no candidate</span>
              {/if}
            </div>
          </div>
          <div class="meta">
            <div class="row"><b>agency</b><span>{p.agency}</span></div>
            <div class="row"><b>credit</b><span>{p.proposed?.credit ?? '—'}</span></div>
            {#if p.vision_v3}
              <div class="row">
                <b>vision</b>
                <span class="pill {p.vision_v3.verdict}">
                  {p.vision_v3.verdict} · {(p.vision_v3.confidence ?? 0).toFixed(2)}
                </span>
              </div>
              {#if p.vision_v3.reason}
                <div class="row"><b>reason</b><span>{p.vision_v3.reason}</span></div>
              {/if}
            {/if}
            {#if (p.drop_reasons?.length ?? 0) + (p.notes?.length ?? 0) > 0}
              <div class="row">
                <b>flags</b>
                <span class="flags">{[...(p.drop_reasons ?? []), ...(p.notes ?? [])].join(' · ')}</span>
              </div>
            {/if}
          </div>

          <textarea
            class="comment"
            placeholder="comment (optional — describe why if rejecting, or why it needs manual sourcing)"
            bind:value={commentDrafts[p.proposal_id]}
            onblur={() => saveOverridesAndComment(p.proposal_id)}
          ></textarea>

          <div class="tags" class:disabled={st === 'pending'}>
            <span class="tags-label">exception tags:</span>
            {#each TAG_VOCAB as t}
              <button
                type="button"
                class="tag-chip"
                class:on={tagsOn.has(t.id)}
                title={t.tip}
                disabled={st === 'pending'}
                onclick={() => toggleTag(p.proposal_id, t.id)}
              >{t.label}</button>
            {/each}
          </div>

          <details
            class="overrides"
            bind:open={expandedOverrides[p.proposal_id]}
          >
            <summary>overrides (apply uses these if set)</summary>
            <div class="override-grid">
              <label>credit
                <input
                  type="text"
                  value={bufferFor(p.proposal_id, 'credit')}
                  oninput={(e) => setOverride(p.proposal_id, 'credit', e.currentTarget.value)}
                  onblur={() => saveOverridesAndComment(p.proposal_id)}
                />
              </label>
              <label>license
                <input
                  type="text"
                  value={bufferFor(p.proposal_id, 'license')}
                  oninput={(e) => setOverride(p.proposal_id, 'license', e.currentTarget.value)}
                  onblur={() => saveOverridesAndComment(p.proposal_id)}
                />
              </label>
              <label class="full">image_url (swap to a different source entirely)
                <input
                  type="url"
                  value={bufferFor(p.proposal_id, 'image_url')}
                  oninput={(e) => setOverride(p.proposal_id, 'image_url', e.currentTarget.value)}
                  onblur={() => saveOverridesAndComment(p.proposal_id)}
                />
              </label>
              <label>source_type
                <input
                  type="text"
                  value={bufferFor(p.proposal_id, 'source_type')}
                  oninput={(e) => setOverride(p.proposal_id, 'source_type', e.currentTarget.value)}
                  onblur={() => saveOverridesAndComment(p.proposal_id)}
                />
              </label>
              <label>source_url
                <input
                  type="url"
                  value={bufferFor(p.proposal_id, 'source_url')}
                  oninput={(e) => setOverride(p.proposal_id, 'source_url', e.currentTarget.value)}
                  onblur={() => saveOverridesAndComment(p.proposal_id)}
                />
              </label>
            </div>
          </details>

          <div class="actions">
            <button
              class="approve"
              disabled={savingId === p.proposal_id}
              onclick={() => persist(p.proposal_id, 'approved')}
            >Approve ✓</button>
            <button
              class="manual"
              disabled={savingId === p.proposal_id}
              onclick={() => persist(p.proposal_id, 'needs-manual')}
            >Manual ⌛</button>
            <button
              class="skip"
              disabled={savingId === p.proposal_id}
              onclick={() => persist(p.proposal_id, 'pending')}
            >Skip</button>
            <button
              class="reject"
              disabled={savingId === p.proposal_id}
              onclick={() => persist(p.proposal_id, 'rejected')}
            >Reject ✗</button>
          </div>
        </article>
      {:else}
        <div class="empty">No proposals match current filters.</div>
      {/each}
    </section>
  </main>

  <footer>
    <span class="summary">
      <b>{counts.approved}</b> approved · <b>{counts.rejected}</b> rejected · <b>{counts.manual}</b> manual · <b>{counts.visible}</b> visible
    </span>
    <button class="bulk approve" onclick={() => bulkSet('approved')}>Approve visible</button>
    <button class="bulk manual" onclick={() => bulkSet('needs-manual')}>Manual visible</button>
    <button class="bulk reject" onclick={() => bulkSet('rejected')}>Reject visible</button>
    <button class="bulk skip" onclick={() => bulkSet('pending')}>Clear visible</button>
  </footer>
</div>

<style>
  :global(html, body) { background: #0a0c10; color: #d8dde6; }
  :global(body) { font: 14px/1.4 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; }
  .wrap { min-height: 100vh; }
  header { padding: 14px 22px; border-bottom: 1px solid #232733; display: flex; gap: 22px; align-items: baseline; flex-wrap: wrap; }
  header h1 { font-size: 16px; margin: 0; font-weight: 600; color: #fff; }
  .stats { color: #9aa3b2; font-size: 13px; display: flex; gap: 14px; flex-wrap: wrap; }
  .stats b { color: #d8dde6; }
  .stats .ok b { color: #6df0a3; }
  .stats .bad b { color: #f06d6d; }
  .stats .warn b { color: #f0d56d; }
  .stats .hint { color: #6b7484; margin-left: auto; }
  main { display: grid; grid-template-columns: 230px 1fr; gap: 0; min-height: calc(100vh - 100px); }
  aside { border-right: 1px solid #232733; padding: 16px 14px; max-height: calc(100vh - 100px); overflow-y: auto; position: sticky; top: 0; }
  aside h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7484; margin: 18px 0 8px; }
  aside h2:first-child { margin-top: 0; }
  aside label { display: flex; gap: 6px; align-items: center; padding: 3px 0; cursor: pointer; font-size: 13px; }
  .count { color: #6b7484; margin-left: auto; font-size: 12px; }
  button.reset { width: 100%; padding: 6px 8px; background: #1a1e28; color: #d8dde6; border: 1px solid #2d3340; border-radius: 4px; cursor: pointer; margin-top: 14px; font-size: 12px; }
  .grid { padding: 18px 22px 100px; display: grid; grid-template-columns: repeat(auto-fill, minmax(420px, 1fr)); gap: 18px; align-content: start; }
  .card { background: #131822; border: 1px solid #232733; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.1s; }
  .card.approved { border-color: #2a8a4b; }
  .card.rejected { border-color: #7a2a2a; opacity: 0.6; }
  .card.needs-manual { border-color: #b08a2a; }
  .head { display: flex; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #232733; font-size: 12px; }
  .mid { color: #d8dde6; font-weight: 600; }
  .codepath { color: #6b7484; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .imgs { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #232733; }
  .imgs > div { background: #0a0c10; display: flex; flex-direction: column; align-items: center; padding: 8px; min-height: 200px; }
  .imgs .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7484; margin-bottom: 6px; }
  .imgs img { max-width: 100%; max-height: 220px; object-fit: contain; border-radius: 3px; background: #18181b; }
  .imgs .missing { color: #6b7484; font-size: 11px; padding: 60px 12px; text-align: center; }
  .meta { padding: 10px 12px; border-top: 1px solid #232733; font-size: 12px; color: #9aa3b2; }
  .row { display: flex; gap: 8px; margin: 4px 0; }
  .row b { color: #d8dde6; min-width: 70px; }
  .flags { font-size: 11px; }
  .pill { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .pill.related { background: #143924; color: #6df0a3; }
  .pill.unrelated { background: #391414; color: #f06d6d; }
  .pill.unsure { background: #393214; color: #f0d56d; }
  .comment { width: 100%; min-height: 56px; padding: 8px 10px; border: none; border-top: 1px solid #232733; background: #0a0c10; color: #d8dde6; font: inherit; resize: vertical; }
  .comment::placeholder { color: #6b7484; }
  .tags { padding: 8px 10px; border-top: 1px solid #232733; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
  .tags.disabled { opacity: 0.5; }
  .tags-label { font-size: 11px; color: #6b7484; text-transform: uppercase; letter-spacing: 0.05em; }
  .tag-chip { background: #1a1e28; color: #9aa3b2; border: 1px solid #2d3340; border-radius: 11px; padding: 3px 9px; font-size: 11px; cursor: pointer; }
  .tag-chip.on { background: #2a3340; color: #d8dde6; border-color: #5c6680; }
  .tag-chip:hover { background: #232733; }
  .tag-chip:disabled { cursor: not-allowed; }
  .overrides { padding: 8px 12px; border-top: 1px solid #232733; font-size: 12px; }
  .overrides summary { cursor: pointer; color: #9aa3b2; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; user-select: none; }
  .override-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 8px; }
  .override-grid label { display: flex; flex-direction: column; font-size: 11px; color: #6b7484; gap: 2px; }
  .override-grid label.full { grid-column: 1 / -1; }
  .override-grid input { padding: 5px 7px; background: #0a0c10; color: #d8dde6; border: 1px solid #2d3340; border-radius: 3px; font: inherit; }
  .actions { display: flex; gap: 6px; padding: 8px 12px; border-top: 1px solid #232733; }
  .actions button { flex: 1; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; border: 1px solid #2d3340; }
  .actions .approve { background: #143924; color: #6df0a3; border-color: #2a8a4b; }
  .actions .reject  { background: #391414; color: #f06d6d; border-color: #7a2a2a; }
  .actions .manual  { background: #2d2614; color: #f0d56d; border-color: #b08a2a; }
  .actions .skip    { background: #1a1e28; color: #d8dde6; }
  .actions button:disabled { opacity: 0.5; cursor: progress; }
  .card.approved .actions .approve { background: #2a8a4b; color: #fff; }
  .card.rejected .actions .reject  { background: #7a2a2a; color: #fff; }
  .card.needs-manual .actions .manual { background: #b08a2a; color: #fff; }
  .empty { padding: 40px; text-align: center; color: #6b7484; grid-column: 1 / -1; }
  footer { position: fixed; bottom: 0; left: 230px; right: 0; background: #131822; border-top: 1px solid #2d3340; padding: 12px 22px; display: flex; gap: 14px; align-items: center; z-index: 10; flex-wrap: wrap; }
  .summary { color: #9aa3b2; margin-right: auto; }
  .summary b { color: #d8dde6; }
  .bulk { padding: 8px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; border: 1px solid #2d3340; }
  .bulk.approve { background: #2a8a4b; color: #fff; border-color: #2a8a4b; }
  .bulk.reject  { background: #7a2a2a; color: #fff; border-color: #7a2a2a; }
  .bulk.manual  { background: #b08a2a; color: #fff; border-color: #b08a2a; }
  .bulk.skip    { background: #1a1e28; color: #d8dde6; }
</style>
