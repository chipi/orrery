import { preloadLauncherModel } from '$lib/three/launcher-models';

// One WebGLRenderer + ~46 Three.js scenes mount in onMount — opt out of
// SSR + the adapter-static prerender pass so build time doesn't try to
// evaluate the meshes server-side. Dev-only: /dev/+layout.ts 404s the
// subtree in non-dev builds (chunks still ship, but the page won't render).
export const ssr = false;
export const prerender = false;

// The Shuttle stack is a lazy chunk (launcher-shuttle-stack.ts); without it the page draws the
// generic body in its place.
export async function load(): Promise<void> {
  await preloadLauncherModel('space-shuttle-stack');
}
