import { getScienceLanding } from '$lib/data';
import { getLocale } from '$lib/paraglide/runtime';
import type { PageLoad } from './$types';

export const prerender = true;

export const load: PageLoad = async ({ fetch }) => {
  // Locale is bound to the request by the Paraglide server middleware so each
  // prerendered /<locale>/science path bakes its own localized content.
  const landing = await getScienceLanding(getLocale(), fetch);
  return { landing };
};
