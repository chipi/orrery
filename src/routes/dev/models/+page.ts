// One WebGLRenderer + ~46 Three.js scenes mount in onMount — opt out of
// SSR + the adapter-static prerender pass so build time doesn't try to
// evaluate the meshes server-side. Dev-only, never in the prod bundle.
export const ssr = false;
export const prerender = false;
