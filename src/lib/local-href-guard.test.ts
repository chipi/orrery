import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// An in-app link written as `${base}/route` (or `{base}/route` in markup) is
// the English page: a German reader who clicks it leaves German. Links go
// through localHref() (src/lib/locale.ts). This flags a base-prefixed path
// whose first segment is a page route under src/routes; assets (/images,
// /logos, sw.js …) are not routes and pass.
const ROUTES = new Set(
  readdirSync('src/routes').filter(
    (d) =>
      statSync(join('src/routes', d)).isDirectory() && !d.startsWith('(') && !d.startsWith('['),
  ),
);
// Not a navigation target: the Nav's active-state compare, comments, the
// OAuth redirect URI (registered verbatim) and the error page's debug example.
const ALLOWED = [
  /isActive\(/,
  /^\s*(\*|\/\/)/,
  /location\.origin\}\$\{base\}\/lab\/callback/,
  /example: `\$\{base\}\/fly\?debug=1`/,
];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      return name === 'paraglide' || p === 'src/routes/dev' ? [] : files(p);
    }
    return /\.(svelte|ts)$/.test(name) && !/\.test\.ts$/.test(name) ? [p] : [];
  });
}

describe('internal links keep the locale', () => {
  it('no `{base}/<route>` link outside localHref()', () => {
    const offenders: string[] = [];
    for (const f of files('src')) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (ALLOWED.some((re) => re.test(line))) return;
          for (const m of line.matchAll(/\{base\}\/([a-z][a-z0-9-]*)/g)) {
            if (ROUTES.has(m[1]!)) offenders.push(`${f}:${i + 1}: ${line.trim()}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });

  it('knows the route list (guards a vacuous pass)', () => {
    for (const r of ['missions', 'fleet', 'science', 'explore', 'iss'])
      expect(ROUTES.has(r)).toBe(true);
  });
});
