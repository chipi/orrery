// 21 WebGLRenderer instances mount in onMount — opt out of SSR + the
// adapter-static prerender pass so build time doesn't try to evaluate
// the Three.js scene server-side.
export const ssr = false;
export const prerender = false;
