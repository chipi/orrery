/**
 * Responsive <img> attributes for every raster image the app shows (#482):
 *
 *   <img {...responsive(url, IMAGE_SIZES.card)} alt="" loading="lazy" />
 *
 * Given the served URL and a `sizes` hint matching the slot's real layout width,
 * returns `{ src, srcset, sizes }` from the WebP ladder (image-ladder.json) so each
 * device picks its rung by width × DPR — phone, tablet, desktop and TV alike, with
 * no per-device code. An image without a ladder (SVG logos, badges, hotspot tiles)
 * gets just `{ src }`. A spread rather than a component, so the <img> stays in the
 * caller and keeps its scoped CSS.
 *
 * Before the manifest has loaded:
 * - during the initial hydration it returns the plain src, matching the
 *   server-rendered HTML;
 * - after the app has mounted (client-rendered lists, panels) it returns NO src, so
 *   the browser doesn't fetch the full-size base first and then the rung — a cold
 *   /colophon on a tablet measured 59.6 MB that way vs 30.9 MB warm.
 * `ladderReady` is reactive, so the template re-renders with the srcset once it
 * lands. A failed manifest load resolves to an empty manifest: plain src. +layout
 * starts the load at boot and calls markAppMounted().
 */
import { browser } from '$app/environment';
import { ladderSources, loadLadder } from '$lib/image-srcset';

let ladderReady = $state(false);
let started = false;
let appMounted = false;

/** Called once from the root layout's onMount: initial hydration is done. */
export function markAppMounted(): void {
  appMounted = true;
}

function ensureLoading(): void {
  if (started) return;
  started = true;
  void loadLadder().then(() => (ladderReady = true));
}

export function responsive(
  src: string,
  sizes: string,
): { src?: string; srcset?: string; sizes?: string } {
  ensureLoading();
  if (!ladderReady) return browser && appMounted ? {} : { src };
  const ladder = ladderSources(src);
  if (ladder?.srcset) return { src: ladder.src, srcset: ladder.srcset, sizes };
  return { src: ladder?.src ?? src };
}
