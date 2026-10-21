import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../svelte.config.js';

// svelte.config.js lists two fixed inline-script hashes in its CSP (#601). If
// either source string changes, the browser blocks that script with no build
// error, so pin both to their sources here.
const sha = (s: string) => `sha256-${createHash('sha256').update(s).digest('base64')}`;
const scriptSrc: string[] = config.kit?.csp?.directives?.['script-src'] ?? [];

describe('CSP script-src hashes', () => {
  it("lists the hash of app.html's inline viewport script", () => {
    const html = readFileSync('src/app.html', 'utf8');
    const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(inline).toHaveLength(1);
    expect(scriptSrc).toContain(sha(inline[0]));
  });

  it("lists the hash of Svelte's event-replay handler, which Svelte still emits", () => {
    const emitter = readFileSync(
      'node_modules/svelte/src/compiler/phases/3-transform/server/visitors/shared/element.js',
      'utf8',
    );
    expect(emitter).toContain('="this.__e=event"');
    expect(scriptSrc).toContain('unsafe-hashes');
    expect(scriptSrc).toContain(sha('this.__e=event'));
  });

  it('allows every Umami tracker host the app can load', () => {
    const src = ['src/lib/analytics.ts', 'src/lib/target-env.ts']
      .map((f) => readFileSync(f, 'utf8'))
      .join('\n');
    const hosts = [...src.matchAll(/(?:DEV_UMAMI_HOST =|umamiHost:)\s*'(https:\/\/[^']+)'/g)].map(
      (m) => m[1],
    );
    expect(hosts.length).toBeGreaterThan(1);
    for (const h of hosts) expect(scriptSrc).toContain(h.replace(/\/$/, ''));
  });

  it('has no unsafe-inline or unsafe-eval', () => {
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
  });
});
