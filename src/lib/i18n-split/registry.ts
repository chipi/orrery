/**
 * Per-locale UI message catalogues on the client (ADR-098).
 *
 * In the client build, `scripts/i18n-split-plugin.mjs` turns every Paraglide message module into a
 * stub that calls `msg()`, and emits per locale one module with the messages every page needs and
 * one per route with the messages that route adds (`_app/immutable/i18n/<locale>/<hash>.js`), plus
 * a route map (`<locale>/routes.<version>.json`). The root layout's load awaits
 * `loadMessagesFor(route.id)` before every render, so a stub always finds its function.
 *
 * In dev, in SSR and in tests the plugin is off: the message modules are Paraglide's own, nothing
 * calls `msg()`, and `loadMessagesFor` returns at once.
 */
import { getLocale } from '$lib/paraglide/runtime';

type MessageFn = (inputs: Record<string, unknown>) => string;

declare const __I18N_SPLIT__: boolean | undefined;
const SPLIT = typeof __I18N_SPLIT__ !== 'undefined' && __I18N_SPLIT__ && !import.meta.env.SSR;

/** locale → message key → function. */
const loaded = new Map<string, Map<string, MessageFn>>();
const pieces = new Map<string, Promise<void>>();
const routeMaps = new Map<string, Promise<RouteMap>>();
const reported = new Set<string>();

interface RouteMap {
  /** The module every page needs (entries, root layout, error page); null when it has none. */
  root: string | null;
  /** Route id → the module with the messages the route adds. */
  routes: Record<string, string>;
}

let assetBase = '';
let version = '';

/** Where the catalogues live; set once by the root layout. */
export function configureMessages(base: string, buildVersion: string): void {
  assetBase = base;
  version = buildVersion;
}

function loadPiece(locale: string, id: string): Promise<void> {
  const k = `${locale}/${id}`;
  let p = pieces.get(k);
  if (!p) {
    const url = `${assetBase}/_app/immutable/i18n/${k}.js`;
    p = import(/* @vite-ignore */ url).then((mod: { default: Record<string, MessageFn> }) => {
      let table = loaded.get(locale);
      if (!table) loaded.set(locale, (table = new Map()));
      for (const [key, fn] of Object.entries(mod.default)) table.set(key, fn);
    });
    // A failed piece is retried on the next navigation.
    p.catch(() => pieces.delete(k));
    pieces.set(k, p);
  }
  return p;
}

function loadRouteMap(locale: string): Promise<RouteMap> {
  let map = routeMaps.get(locale);
  if (!map) {
    map = fetch(`${assetBase}/_app/immutable/i18n/${locale}/routes.${version}.json`).then((r) => {
      if (!r.ok) throw new Error(`i18n route map: HTTP ${r.status}`);
      return r.json() as Promise<RouteMap>;
    });
    map.catch(() => routeMaps.delete(locale));
    routeMaps.set(locale, map);
  }
  return map;
}

/** Loads the current locale's messages for a route (its static and lazy chunks). */
export async function loadMessagesFor(routeId: string | null, locale = getLocale()): Promise<void> {
  if (!SPLIT) return;
  const map = await loadRouteMap(locale);
  const route = routeId ? map.routes[routeId] : undefined;
  await Promise.all(
    [map.root, route].filter((id): id is string => !!id).map((id) => loadPiece(locale, id)),
  );
}

/** The stubs' implementation: the loaded function for the locale, else the key. */
export function msg(
  key: string,
  inputs: Record<string, unknown> = {},
  options: { locale?: string } = {},
): string {
  const locale = options.locale ?? getLocale();
  const fn = loaded.get(locale)?.get(key) ?? loaded.get(getLocale())?.get(key);
  if (fn) return fn(inputs);
  if (!reported.has(key)) {
    reported.add(key);
    // A message whose piece did not load is a bug in the route map, not a translation gap.
    console.error(`i18n-split: message "${key}" (${locale}) is not loaded`);
  }
  return key;
}
