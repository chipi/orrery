/**
 * The Lab's dotted-key message resolver (extracted from /lab/+page.svelte in
 * F · #535 so the OAuth callback page shares ONE resolver). The registry uses
 * dotted keys; paraglide ids are flat snake_case. Map dot/hyphen → underscore
 * and call the message fn. Falls back to the RAW key when a message is
 * missing — which is exactly what the i18n-parity gate exists to prevent.
 */
import { LAB_MESSAGES } from './lab-messages';

const messages = LAB_MESSAGES as unknown as Record<
  string,
  ((inputs?: Record<string, unknown>) => string) | undefined
>;

export function t(key: string, params?: Record<string, string | number>): string {
  const fn = messages[key.replace(/[.-]/g, '_')];
  return typeof fn === 'function' ? fn(params ?? {}) : key;
}
