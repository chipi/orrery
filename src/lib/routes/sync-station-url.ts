/**
 * URL-param sync for /iss + /tiangong station routes (#57).
 *
 * Both station routes share the same URL contract:
 *   ?view=2d-top|2d-side|2d-front|list   (3d is the implicit default)
 *   ?module=<moduleId>                    (omit when no module selected)
 *
 * Pre-extraction this lived as an identical ~25-line syncUrl function
 * in /iss and /tiangong. The helper centralises both routes' URL
 * contract so a future schema change (e.g. adding ?layer=) only
 * touches one place.
 *
 * Usage:
 *   syncStationUrl({ view: 'list' });           // ?view=list, keep module
 *   syncStationUrl({ moduleId: 'cupola' });     // set ?module=cupola
 *   syncStationUrl({ moduleId: null });         // clear ?module
 *   syncStationUrl({ view: '3d', moduleId: null }); // home view
 */

import { goto } from '$app/navigation';
import { base } from '$app/paths';
import { page } from '$app/stores';
import { get } from 'svelte/store';

export type StationView = '3d' | '2d-top' | '2d-side' | '2d-front' | 'list';

export interface StationUrlUpdate {
  view?: StationView;
  /** Pass `null` to clear; `undefined` (default) leaves it unchanged. */
  moduleId?: string | null;
}

/**
 * Caller passes its route path so the helper can build the canonical
 * URL (`{base}/iss` or `{base}/tiangong`). The equality short-circuit
 * avoids redundant goto() calls when the URL is already in sync.
 */
export function syncStationUrl(routePath: '/iss' | '/tiangong', partial: StationUrlUpdate): void {
  const url = get(page).url;
  const params = new URLSearchParams(url.searchParams);
  if (partial.view === 'list') params.set('view', 'list');
  else if (partial.view === '2d-top') params.set('view', '2d-top');
  else if (partial.view === '2d-side') params.set('view', '2d-side');
  else if (partial.view === '2d-front') params.set('view', '2d-front');
  else if (partial.view === '3d') params.delete('view');
  if (partial.moduleId === null) params.delete('module');
  else if (partial.moduleId !== undefined) params.set('module', partial.moduleId);
  const qs = params.toString();
  const target = `${base}${routePath}${qs ? `?${qs}` : ''}`;
  const cur = `${url.pathname}${url.search}`;
  if (target !== cur) {
    void goto(target, { replaceState: true, keepFocus: true, noScroll: true });
  }
}
