import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

// AGENTS.md recurring bug class 1: an `{#each}` keyed by a display string. Two rows can share
// the text, in one language only, and Svelte throws `each_key_duplicate` and stops the page.
// Prod 0.9.9: every /fleet/<engine> page in hi, ja and ko never hydrated, because "Engines" and
// "Engine" are one word there (plan A8, GitHub #657). Key by an id, or by the index with the
// text (`(i + ':' + row.label)`).

const SRC = fileURLToPath(new URL('../', import.meta.url)); // src/

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith('.svelte')) out.push(p);
  }
  return out;
}

// `{#each xs as x (x.label)}`, `(x.title)`, `(name)`… — the key is nothing but a display field.
const DISPLAY_KEY =
  /\{#each [^}]* as [A-Za-z_$][\w$]*(?:,\s*[A-Za-z_$][\w$]*)?\s*\(\s*(?:[A-Za-z_$][\w$]*\.)?(?:title|name|label|heading|text|caption)\s*\)\s*\}/;

describe('{#each} keys are never a bare display string', () => {
  const files = walk(SRC);

  it('scans a meaningful number of components', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('no {#each} is keyed by a label, title, name, heading, text or caption alone', () => {
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (DISPLAY_KEY.test(line)) hits.push(`${relative(SRC, f)}:${i + 1}: ${line.trim()}`);
        });
    }
    expect(hits).toEqual([]);
  });

  it('the pattern catches the 0.9.9 engine-page key and passes the fixed form', () => {
    expect(DISPLAY_KEY.test('{#each groups as group (group.title)}')).toBe(true);
    expect(DISPLAY_KEY.test('{#each data.rows as row (row.label)}')).toBe(true);
    expect(DISPLAY_KEY.test('{#each names as name (name)}')).toBe(true);
    expect(DISPLAY_KEY.test("{#each data.rows as row, ki (ki + ':' + row.label)}")).toBe(false);
    expect(DISPLAY_KEY.test('{#each groups as group (group.key)}')).toBe(false);
  });
});
