import { loadLabMessages } from '$lib/lab/t';
import type { PageLoad } from './$types';

// Runs on the server (prerender) and in the browser, so t() has the reader's
// locale table before the first render and before hydration.
export const load: PageLoad = async ({ data }) => {
  await loadLabMessages();
  return data;
};
