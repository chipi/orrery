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
  // Which gallery objects are placed in the /explore sky (Slice 4) — used to
  // show a "Show in the sky" CTA only for objects that actually immerse there.
  let skyDesignations: string[] = [];
  try {
    const dso = await fetch(`${base}/data/universe/deep-sky-objects.json`);
    const doc = (await dso.json()) as {
      objects: Array<{ designation: string; photoKey: string | null }>;
    };
    skyDesignations = doc.objects.filter((o) => o.photoKey).map((o) => o.designation);
  } catch {
    skyDesignations = [];
  }
  return { images, skyDesignations };
};
