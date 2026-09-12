/**
 * Card render route (#547 S4) — fleet twin of /cards/mission/[id]. A bare
 * stage for the build-time card-image generator; not linked, not prerendered
 * (served via the 404.html SPA fallback the Playwright generator drives).
 */
export const prerender = false;
export const ssr = false;
