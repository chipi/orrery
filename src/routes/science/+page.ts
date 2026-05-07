import { getScienceLanding } from '$lib/data';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  const landing = await getScienceLanding('en-US', fetch);
  return { landing };
};
