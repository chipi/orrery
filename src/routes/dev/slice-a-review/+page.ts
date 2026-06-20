// Slice A v3 approval review surface — dev-only. Loads the salvage
// result + any prior decisions and lets Marko approve / reject / comment
// per proposal. Decisions POST to the sibling +server.ts.
//
// Two datasets share the same UI:
//   - default (?dataset=slice-a)  → slice-a-salvage-result.json + slice-a-approvals.json
//   - body sweep (?dataset=bodies) → bodies-salvage-result.json + bodies-approvals.json
//
// The proposal schema is identical, so the same review surface renders
// both. Switching dataset changes which JSON files are read AND which
// approvals file the api writes to.

export const ssr = false;
export const prerender = false;

const DATASETS = {
  'slice-a': {
    salvage: '/data/slice-a-salvage-result.json',
    approvals: '/data/slice-a-approvals.json',
  },
  bodies: {
    salvage: '/data/bodies-salvage-result.json',
    approvals: '/data/bodies-approvals.json',
  },
};

export async function load({ fetch, url }: { fetch: typeof globalThis.fetch; url: URL }) {
  const datasetParam = url.searchParams.get('dataset') ?? 'slice-a';
  const dataset = (datasetParam in DATASETS ? datasetParam : 'slice-a') as keyof typeof DATASETS;
  const cfg = DATASETS[dataset];
  const [salvageRes, approvalsRes] = await Promise.all([
    fetch(cfg.salvage),
    fetch(cfg.approvals),
  ]);
  const salvage = salvageRes.ok ? await salvageRes.json() : { proposals: [], totals: {} };
  const approvals = approvalsRes.ok
    ? await approvalsRes.json()
    : { decisions: {}, reviewer: 'marko', last_updated_at: null };
  return { salvage, approvals, dataset };
}
