/**
 * Card render route (#547 S2) — a bare stage for the build-time card-image
 * generator (scripts/cards/generate-card-images.mjs). Not linked from any
 * nav; not prerendered (adapter-static serves it via the 404.html SPA
 * fallback, which is exactly what the Playwright generator drives).
 */
export const prerender = false;
export const ssr = false;
