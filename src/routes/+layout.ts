import { browser, version } from '$app/environment';
import { base } from '$app/paths';
import { configureMessages, loadMessagesFor } from '$lib/i18n-split/registry';

export const prerender = true;

// ADR-098: the route's UI messages, in the reader's locale, are in before it renders. Reading
// `route` makes this load run again on every navigation to another route.
export async function load({ route }) {
  if (!browser) return;
  configureMessages(base, version);
  await loadMessagesFor(route.id);
}
