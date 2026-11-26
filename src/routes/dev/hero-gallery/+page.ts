import { preloadLauncherModel } from '$lib/three/launcher-models';

// The Shuttle stack is a lazy chunk (launcher-shuttle-stack.ts); without it the page draws the
// generic body in its place.
export async function load(): Promise<void> {
  await preloadLauncherModel('space-shuttle-stack');
}
