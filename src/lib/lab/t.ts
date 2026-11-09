/**
 * The Lab's dotted-key message resolver (extracted from /lab/+page.svelte in
 * F · #535). The registry uses dotted keys; paraglide ids are flat snake_case:
 * dot/hyphen → underscore, then look the message up in the reader's locale
 * table. Falls back to the RAW key when a message is missing (or the table is
 * not loaded yet) — which is exactly what the i18n-parity gate exists to prevent.
 *
 * Tables are generated per locale (scripts/i18n-tools/gen-lab-messages.mjs) so a
 * visit downloads one locale's Lab text, not all 14. A page that calls t() must
 * `await loadLabMessages()` in its load (server and client) before it renders.
 * Locale changes reload the page (setLocale), so one table per page load is enough.
 */
import { getLocale } from '$lib/paraglide/runtime';

type Table = Record<string, string>;

const importers = import.meta.glob<Table>('./messages/*.ts', { import: 'default' });
const tables = new Map<string, Table>();

export async function loadLabMessages(locale: string = getLocale()): Promise<void> {
  if (tables.has(locale)) return;
  const load = importers[`./messages/${locale}.ts`];
  if (load) tables.set(locale, await load());
}

export function t(key: string, params?: Record<string, string | number>): string {
  const text = tables.get(getLocale())?.[key.replace(/[.-]/g, '_')];
  if (text === undefined) return key;
  const inputs: Record<string, unknown> = params ?? {};
  return text.replace(/\{(\w+)\}/g, (_, name: string) => String(inputs[name]));
}
