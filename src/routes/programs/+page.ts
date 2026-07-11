import { getProgramIndex } from '$lib/data';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  const programs = await getProgramIndex(fetch);
  return { programs };
};
