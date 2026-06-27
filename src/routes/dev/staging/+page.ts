// Staging-ground review surface — dev-only (RFC-029 / #363).
// Client-only: the grid fetches the sibling api/ endpoint (GET) on mount
// and POSTs marked actions back. Not prerendered, so it isn't in the
// static prod build.
export const ssr = false;
export const prerender = false;
