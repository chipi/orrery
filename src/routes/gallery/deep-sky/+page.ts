import { base } from '$app/paths';
import type { DeepSkyImage } from '$lib/deep-sky';
import type { PageLoad } from './$types';

// Deep-Sky gallery — a curated wall of the finest publicly-licensed
// observatory imagery (#391). Static, English-only for now, matching its
// /posters and /patches siblings under the Gallery hub. The image set +
// captions live in static/data/deep-sky.json (curated by hand; not a
// generated manifest).
export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  const res = await fetch(`${base}/data/deep-sky.json`);
  const images = (await res.json()) as DeepSkyImage[];
  return { images };
};
