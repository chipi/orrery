// Dev-only review surface (G · #536) — the /dev layout guard 404s this whole
// subtree outside the dev server; the file-backed API below can't run on
// static hosting anyway.
export const prerender = false;
export const ssr = false;

import { loadLabMessages } from '$lib/lab/t';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  await loadLabMessages();
};
