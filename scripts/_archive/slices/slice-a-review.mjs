#!/usr/bin/env node
/**
 * Slice A v3 approval UI generator (Stage 4).
 *
 * Reads `static/data/slice-a-salvage-result.json` and writes a
 * self-contained HTML page at `docs/provenance/slice-a-v3-review.html`.
 * The page shows OLD vs NEW image side by side per proposal with
 * filterable slices (agency, surface, mission, vision verdict, drop
 * status) and bulk approve / reject. Decisions persist in
 * localStorage so a multi-hour review survives reload. The download
 * button emits an `approvals.json` payload that slice-a-apply.mjs
 * honours via its `--approvals=<path>` flag (added separately).
 *
 * Usage:
 *   node scripts/slice-a-review.mjs
 *   node scripts/slice-a-review.mjs --include-dropped   # also show dropped proposals
 *   node scripts/slice-a-review.mjs --output=docs/provenance/foo.html
 */

import { readFileSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), 'true'];
  }),
);
const INPUT =
  typeof args.input === 'string' ? args.input : 'static/data/slice-a-salvage-result.json';
const OUTPUT =
  typeof args.output === 'string' ? args.output : 'docs/provenance/slice-a-v3-review.html';
const INCLUDE_DROPPED = args['include-dropped'] === 'true';

const salvage = JSON.parse(readFileSync(INPUT, 'utf8'));
const allProposals = salvage.proposals ?? [];
const shown = INCLUDE_DROPPED ? allProposals : allProposals.filter((p) => p.survivor);

console.log(`slice-a-review: input=${INPUT} include-dropped=${INCLUDE_DROPPED}`);
console.log(`slice-a-review: ${allProposals.length} total proposals, ${shown.length} to display`);

function inferCodePath(p) {
  if (p.surface === 'fleet-galleries') return 'fleet-gallery';
  if (p.surface === 'missions') {
    return p.slot === '01' ? 'mission-hero' : 'mission-gallery';
  }
  if (p.surface === 'panel') return 'panel-image';
  return 'other';
}

const cards = shown.map((p) => ({
  proposal_id: p.proposal_id,
  agency: p.agency,
  surface: p.surface,
  code_path: inferCodePath(p),
  missionId: p.missionId,
  slot: p.slot,
  query: p.query,
  old_path: `/images/${p.surface}/${p.missionId}/${p.slot}.jpg`,
  new_url: p.proposed?.image_url ?? null,
  source_type: p.proposed?.source_type ?? null,
  credit: p.proposed?.credit ?? null,
  license: p.proposed?.license ?? null,
  vision_v3: p.vision_v3,
  vision_v2: p.vision_v2,
  size_bytes: p.size_bytes,
  drop_reasons: p.drop_reasons ?? [],
  notes: p.notes ?? [],
  survivor: p.survivor,
}));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Slice A v3 — Image Approval Review</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body {
    margin: 0; font: 14px/1.4 -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
    background: #0a0c10; color: #d8dde6;
  }
  header { padding: 14px 22px; border-bottom: 1px solid #232733; display: flex; gap: 22px; align-items: baseline; }
  header h1 { font-size: 16px; margin: 0; font-weight: 600; color: #fff; }
  header .stat { color: #9aa3b2; font-size: 13px; }
  header .stat b { color: #d8dde6; }
  main { display: grid; grid-template-columns: 220px 1fr; gap: 0; min-height: calc(100vh - 52px); }
  aside { border-right: 1px solid #232733; padding: 16px 14px; overflow-y: auto; max-height: calc(100vh - 52px); position: sticky; top: 0; }
  aside h2 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6b7484; margin: 18px 0 8px; }
  aside h2:first-child { margin-top: 0; }
  aside label { display: flex; gap: 6px; align-items: center; padding: 3px 0; cursor: pointer; font-size: 13px; }
  aside label input { margin: 0; }
  aside .count { color: #6b7484; margin-left: auto; font-size: 12px; }
  aside button.reset { width: 100%; padding: 6px 8px; background: #1a1e28; color: #d8dde6; border: 1px solid #2d3340; border-radius: 4px; cursor: pointer; margin-top: 14px; font-size: 12px; }
  aside button.reset:hover { background: #232733; }
  .grid { padding: 18px 22px 100px; display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 18px; align-content: start; }
  .card { background: #131822; border: 1px solid #232733; border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; transition: border-color 0.1s; }
  .card.approved { border-color: #2a8a4b; }
  .card.rejected { border-color: #7a2a2a; opacity: 0.55; }
  .card .head { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-bottom: 1px solid #232733; font-size: 12px; }
  .card .head .mid { color: #d8dde6; font-weight: 600; }
  .card .head .codepath { color: #6b7484; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  .imgs { display: grid; grid-template-columns: 1fr 1fr; gap: 1px; background: #232733; }
  .imgs > div { background: #0a0c10; display: flex; flex-direction: column; align-items: center; padding: 8px; min-height: 180px; }
  .imgs label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b7484; margin-bottom: 6px; }
  .imgs img { max-width: 100%; max-height: 200px; object-fit: contain; background: #18181b; border-radius: 3px; }
  .imgs .missing { color: #6b7484; font-size: 11px; padding: 60px 12px; text-align: center; }
  .meta { padding: 10px 12px; border-top: 1px solid #232733; font-size: 12px; color: #9aa3b2; }
  .meta .row { display: flex; gap: 8px; margin: 4px 0; }
  .meta .row b { color: #d8dde6; min-width: 70px; }
  .pill { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
  .pill.related { background: #143924; color: #6df0a3; }
  .pill.unrelated { background: #391414; color: #f06d6d; }
  .pill.unsure { background: #393214; color: #f0d56d; }
  .pill.drop { background: #232733; color: #9aa3b2; }
  .actions { padding: 8px 12px; border-top: 1px solid #232733; display: flex; gap: 6px; }
  .actions button { flex: 1; padding: 6px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
  .actions .approve { background: #143924; color: #6df0a3; border: 1px solid #2a8a4b; }
  .actions .reject  { background: #391414; color: #f06d6d; border: 1px solid #7a2a2a; }
  .actions .skip    { background: #1a1e28; color: #d8dde6; border: 1px solid #2d3340; }
  .actions button:hover { filter: brightness(1.2); }
  .card.approved .actions .approve { background: #2a8a4b; color: #fff; }
  .card.rejected .actions .reject  { background: #7a2a2a; color: #fff; }
  footer { position: fixed; bottom: 0; left: 220px; right: 0; background: #131822; border-top: 1px solid #2d3340; padding: 12px 22px; display: flex; gap: 14px; align-items: center; z-index: 10; }
  footer button { padding: 8px 14px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; }
  footer .bulk-approve { background: #2a8a4b; color: #fff; border: 1px solid #2a8a4b; }
  footer .bulk-reject  { background: #7a2a2a; color: #fff; border: 1px solid #7a2a2a; }
  footer .bulk-clear   { background: #1a1e28; color: #d8dde6; border: 1px solid #2d3340; }
  footer .download     { background: #1f4dab; color: #fff; border: 1px solid #1f4dab; margin-left: auto; }
  footer .summary { color: #9aa3b2; margin-right: auto; }
  footer .summary b { color: #d8dde6; }
  .empty { padding: 40px; text-align: center; color: #6b7484; grid-column: 1 / -1; }
</style>
</head>
<body>
<header>
  <h1>Slice A v3 — Image Approval Review</h1>
  <div class="stat"><b id="vis">0</b> visible · <b id="app">0</b> approved · <b id="rej">0</b> rejected · <b id="pen">0</b> pending</div>
</header>
<main>
  <aside id="filters"></aside>
  <div id="grid" class="grid"></div>
</main>
<footer>
  <div class="summary">Decisions persist in localStorage. <b id="lastSaved">never</b></div>
  <button class="bulk-approve" id="bulkApprove">Approve all visible</button>
  <button class="bulk-reject"  id="bulkReject">Reject all visible</button>
  <button class="bulk-clear"   id="bulkClear">Clear visible decisions</button>
  <button class="download"     id="download">Download approvals.json</button>
</footer>
<script>
const PROPOSALS = ${JSON.stringify(cards)};
const META = ${JSON.stringify({
  generated_at: salvage.generated_at,
  source_dryruns: salvage.source_dryrun_files,
  totals: salvage.totals,
  filters_run: salvage.filters_run,
})};
const KEY = 'slice-a-v3-review:decisions';

let decisions = {};
try { decisions = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}

const filters = {
  agency: new Set(),
  surface: new Set(),
  code_path: new Set(),
  vision: new Set(),
  status: new Set(['pending', 'approved', 'rejected']),
};

function countBy(items, getter) {
  const m = new Map();
  for (const it of items) { const k = getter(it) ?? '?'; m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
function visionLabel(p) {
  if (!p.vision_v3) return 'none';
  return p.vision_v3.verdict ?? 'unknown';
}
function statusOf(id) {
  if (decisions[id] === 'approved') return 'approved';
  if (decisions[id] === 'rejected') return 'rejected';
  return 'pending';
}

function renderFilters() {
  const aside = document.getElementById('filters');
  const groups = [
    ['Agency', 'agency', countBy(PROPOSALS, (p) => p.agency)],
    ['Surface', 'surface', countBy(PROPOSALS, (p) => p.surface)],
    ['Code path', 'code_path', countBy(PROPOSALS, (p) => p.code_path)],
    ['Vision verdict', 'vision', countBy(PROPOSALS, visionLabel)],
    ['Status', 'status', [['pending','?'],['approved','?'],['rejected','?']]],
  ];
  aside.innerHTML = groups.map(([title, key, opts]) => \`
    <h2>\${title}</h2>
    \${opts.map(([v, c]) => \`
      <label>
        <input type="checkbox" data-filter="\${key}" value="\${v}" \${filters[key].has(v) ? 'checked' : ''}/>
        \${v} <span class="count">\${typeof c === 'number' ? c : ''}</span>
      </label>
    \`).join('')}
  \`).join('') + '<button class="reset" id="resetFilters">Reset filters</button>';
  for (const cb of aside.querySelectorAll('input[type=checkbox]')) {
    cb.addEventListener('change', () => {
      const set = filters[cb.dataset.filter];
      if (cb.checked) set.add(cb.value); else set.delete(cb.value);
      render();
    });
  }
  document.getElementById('resetFilters').addEventListener('click', () => {
    for (const k of Object.keys(filters)) filters[k] = new Set(k === 'status' ? ['pending','approved','rejected'] : []);
    render();
  });
}

function passes(p) {
  if (filters.agency.size > 0 && !filters.agency.has(p.agency)) return false;
  if (filters.surface.size > 0 && !filters.surface.has(p.surface)) return false;
  if (filters.code_path.size > 0 && !filters.code_path.has(p.code_path)) return false;
  if (filters.vision.size > 0 && !filters.vision.has(visionLabel(p))) return false;
  if (filters.status.size > 0 && !filters.status.has(statusOf(p.proposal_id))) return false;
  return true;
}

function renderCard(p) {
  const status = statusOf(p.proposal_id);
  const v3 = p.vision_v3;
  const visionPill = v3
    ? \`<span class="pill \${v3.verdict}">\${v3.verdict} · \${(v3.confidence ?? 0).toFixed(2)}</span>\`
    : '<span class="pill drop">no vision</span>';
  const dropPill = p.survivor ? '' : '<span class="pill drop">dropped</span>';
  const reasons = (p.drop_reasons.length || p.notes.length)
    ? \`<div class="row"><b>flags</b><span>\${[...p.drop_reasons, ...p.notes].slice(0,3).map(r => r.replace(/^[a-z-]+:\\s*/i,'')).join(' · ')}</span></div>\`
    : '';
  return \`
    <div class="card \${status}" data-id="\${p.proposal_id}">
      <div class="head">
        <span class="mid">\${p.missionId}/\${p.slot}</span>
        <span class="codepath">\${p.code_path}</span>
      </div>
      <div class="imgs">
        <div><label>old</label><img loading="lazy" src="https://orrery.space\${p.old_path}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'missing',textContent:'(no old image on prod)'}))"/></div>
        <div><label>new (\${p.source_type ?? '?'})</label>\${p.new_url ? \`<img loading="lazy" src="\${p.new_url}" />\` : '<div class="missing">no candidate</div>'}</div>
      </div>
      <div class="meta">
        <div class="row"><b>agency</b><span>\${p.agency}</span></div>
        <div class="row"><b>credit</b><span>\${p.credit ?? '—'}</span></div>
        <div class="row"><b>vision</b>\${visionPill} \${dropPill}</div>
        \${v3?.reason ? \`<div class="row"><b>reason</b><span>\${v3.reason}</span></div>\` : ''}
        \${reasons}
      </div>
      <div class="actions">
        <button class="approve" data-act="approved">Approve ✓</button>
        <button class="skip" data-act="pending">Skip</button>
        <button class="reject" data-act="rejected">Reject ✗</button>
      </div>
    </div>
  \`;
}

function render() {
  const grid = document.getElementById('grid');
  const visible = PROPOSALS.filter(passes);
  grid.innerHTML = visible.length === 0
    ? '<div class="empty">No proposals match current filters.</div>'
    : visible.map(renderCard).join('');
  for (const btn of grid.querySelectorAll('button[data-act]')) {
    btn.addEventListener('click', () => {
      const id = btn.closest('.card').dataset.id;
      const act = btn.dataset.act;
      if (act === 'pending') delete decisions[id]; else decisions[id] = act;
      persist();
      render();
    });
  }
  updateStats(visible);
  renderFilters();
}

function updateStats(visible) {
  const total = PROPOSALS.length;
  const approved = Object.values(decisions).filter((v) => v === 'approved').length;
  const rejected = Object.values(decisions).filter((v) => v === 'rejected').length;
  const pending = total - approved - rejected;
  document.getElementById('vis').textContent = visible.length;
  document.getElementById('app').textContent = approved;
  document.getElementById('rej').textContent = rejected;
  document.getElementById('pen').textContent = pending;
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(decisions));
  document.getElementById('lastSaved').textContent = new Date().toLocaleTimeString();
}

document.getElementById('bulkApprove').addEventListener('click', () => {
  for (const p of PROPOSALS.filter(passes)) decisions[p.proposal_id] = 'approved';
  persist(); render();
});
document.getElementById('bulkReject').addEventListener('click', () => {
  for (const p of PROPOSALS.filter(passes)) decisions[p.proposal_id] = 'rejected';
  persist(); render();
});
document.getElementById('bulkClear').addEventListener('click', () => {
  for (const p of PROPOSALS.filter(passes)) delete decisions[p.proposal_id];
  persist(); render();
});
document.getElementById('download').addEventListener('click', () => {
  const approved = Object.entries(decisions).filter(([,v]) => v === 'approved').map(([k]) => k);
  const rejected = Object.entries(decisions).filter(([,v]) => v === 'rejected').map(([k]) => k);
  const payload = {
    approved, rejected,
    generated_at: new Date().toISOString(),
    reviewer: 'marko',
    source_dryrun_files: META.source_dryruns,
    salvage_generated_at: META.generated_at,
    filters_run: META.filters_run,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'approvals.json'; a.click();
  URL.revokeObjectURL(url);
});

render();
</script>
</body>
</html>
`;

writeFileSync(OUTPUT, html);
console.log(`slice-a-review: wrote ${OUTPUT}`);
console.log(`  open in browser: file://${process.cwd()}/${OUTPUT}`);
console.log(`  or via dev server: ${OUTPUT.replace(/^docs\//, 'http://localhost:5173/docs/')}`);
