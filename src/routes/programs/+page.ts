import { getProgramIndex, getBadges } from '$lib/data';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  const [programs, badges] = await Promise.all([getProgramIndex(fetch), getBadges(fetch)]);
  return { programs, badges };
};
