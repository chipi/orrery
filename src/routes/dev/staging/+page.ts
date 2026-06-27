// Staging-ground review surface — dev-only (RFC-029 / #363).
// Client-only: the grid fetches the sibling api/ endpoint (GET) on mount
// and POSTs marked actions back. /dev/+layout.ts 404s the whole subtree in
// non-dev builds; the file-backed api/ can't run on static hosting anyway.
export const ssr = false;
export const prerender = false;
