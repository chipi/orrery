/**
 * MCP-side i18n (S4 · operator decision 2026-09-01: everything ×14).
 *
 * Loads the SAME paraglide message bundles the app ships (`messages/<loc>.json`)
 * and resolves the kernel's dotted i18n keys with the /lab mapping
 * (dot/hyphen → underscore, `src/routes/lab/+page.svelte`). No paraglide
 * compile step server-side — the bundles are plain JSON and the lab keys are
 * parameterless, so a direct lookup is the whole job. Unknown key falls back to
 * the key itself (same fail-visible posture as the lab's `t`).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Localize } from './registry-tools';

export const LOCALES = [
  'en-US',
  'ar',
  'de',
  'es',
  'fr',
  'hi',
  'it',
  'ja',
  'ko',
  'nl',
  'pt-BR',
  'ru',
  'sr-Cyrl',
  'zh-CN',
] as const;
export type Locale = (typeof LOCALES)[number];

const cache = new Map<string, Record<string, string>>();

/** Resolve + memoize one locale bundle. `dir` defaults to `<repo>/messages`. */
function bundle(locale: Locale, dir?: string): Record<string, string> {
  const key = `${dir ?? ''}:${locale}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const base = dir ?? path.resolve(process.cwd(), 'messages');
  const parsed = JSON.parse(readFileSync(path.join(base, `${locale}.json`), 'utf8')) as Record<
    string,
    unknown
  >;
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') flat[k] = v;
  cache.set(key, flat);
  return flat;
}

/** Coerce an untrusted locale string to a supported one (default en-US). */
export function resolveLocale(raw: unknown): Locale {
  return LOCALES.includes(raw as Locale) ? (raw as Locale) : 'en-US';
}

/** Build the localizer for one locale; en-US is the fallback layer. */
export function makeT(locale: Locale, dir?: string): Localize {
  const primary = bundle(locale, dir);
  const fallback = locale === 'en-US' ? primary : bundle('en-US', dir);
  return (key: string): string => {
    const flat = key.replace(/[.-]/g, '_');
    return primary[flat] ?? fallback[flat] ?? key;
  };
}
