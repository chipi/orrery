import { base } from '$app/paths';
import { getDeepSkyGallery } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad } from './$types';

// Deep-Sky gallery — a curated wall of the finest publicly-licensed
// observatory imagery (#391). The image set + captions live in
// static/data/deep-sky.json (curated by hand; not a generated manifest); a
// locale's overlay (i18n-src/<locale>/deep-sky.json) carries the translated text.
export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  const images = await getDeepSkyGallery(fetch, getLocale());
  // Which gallery objects are placed in the /explore sky (Slice 4) — used to
  // show a "Show in the sky" CTA only for objects that actually immerse there.
  let skyDesignations: string[];
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
