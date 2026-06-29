// /fly iconic-camera regression dashboard — dev-only. Reads the audit
// produced by `npm run audit:fly-cameras` (static/data/fly-camera-audit.json)
// and renders every flyby/arrival event's current-vs-proposed verdict.
// Refresh the data by re-running the script, then reload this page.

export const ssr = false;
export const prerender = false;

export async function load({ fetch }: { fetch: typeof globalThis.fetch }) {
  const res = await fetch('/data/fly-camera-audit.json');
  const audit = res.ok
    ? await res.json()
    : { totals: { events: 0 }, results: [], generatedNote: 'audit not generated yet' };
  return { audit };
}
