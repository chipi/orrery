/**
 * One breadcrumb scrubber for the web and the servers (Phase 6 o11y gap, 2026-10-31).
 * The web hook only stripped navigation URLs; http/fetch/xhr crumbs kept their query
 * strings (search terms, OAuth `code`/`state`), and the servers had no hook at all.
 *
 * - `ui.input` crumbs carry what the user typed: dropped.
 * - Every URL a crumb carries (navigation from/to, http/fetch/xhr url) keeps its
 *   origin and path; query and hash go.
 * - Console crumbs: email addresses in the message are replaced.
 */
export interface CrumbLike {
  category?: string;
  message?: string;
  data?: Record<string, unknown>;
}

const URL_KEYS = ['url', 'from', 'to'];
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

function stripQuery(value: string): string {
  const cut = value.search(/[?#]/);
  return cut < 0 ? value : value.slice(0, cut);
}

export function scrubBreadcrumb<T extends CrumbLike>(crumb: T): T | null {
  if (crumb.category === 'ui.input') return null;
  if (crumb.data) {
    const data = { ...crumb.data };
    for (const k of URL_KEYS)
      if (typeof data[k] === 'string') data[k] = stripQuery(data[k] as string);
    crumb = { ...crumb, data };
  }
  if (crumb.category === 'console' && typeof crumb.message === 'string') {
    crumb = { ...crumb, message: crumb.message.replace(EMAIL, '[email]') };
  }
  return crumb;
}
