// Slice A v3 approval review surface — dev-only. Loads the salvage
// result + any prior decisions and lets Marko approve / reject / comment
// per proposal. Decisions POST to the sibling +server.ts which writes
// `static/data/slice-a-approvals.json`.

export const ssr = false;
export const prerender = false;

export async function load({ fetch }) {
  const [salvageRes, approvalsRes] = await Promise.all([
    fetch('/data/slice-a-salvage-result.json'),
    fetch('/data/slice-a-approvals.json'),
  ]);
  const salvage = salvageRes.ok ? await salvageRes.json() : { proposals: [], totals: {} };
  const approvals = approvalsRes.ok
    ? await approvalsRes.json()
    : { decisions: {}, reviewer: 'marko', last_updated_at: null };
  return { salvage, approvals };
}
