import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Indexing the paraglide module with a computed key (m[`x_${id}`], or casting it
// to a Record) makes the bundler keep all ~11k messages in one chunk: 3 MB on
// /science, /explore and /lab until 2026-10-30. Use an explicit table of message
// functions instead (src/lib/science-tab-label.ts, src/lib/lab/lab-messages.ts).
const files = execFileSync('git', ['ls-files', 'src/**/*.ts', 'src/**/*.svelte'], {
  encoding: 'utf8',
})
  .split('\n')
  .filter((f) => f && !f.endsWith('.test.ts') && !f.startsWith('src/lib/paraglide/'));

const IMPORT = /import \* as (\w+) from '\$lib\/paraglide\/messages(?:\.js)?'/;

describe('paraglide messages are never looked up by computed key', () => {
  it('no source file indexes or re-types the messages module', () => {
    const hits: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      const alias = src.match(IMPORT)?.[1];
      if (!alias) continue;
      // A numeric index is a local regex match that shadows the alias (m[1]), not a lookup.
      const lookup = new RegExp(
        `\\b${alias}\\s*\\[(?!\\d)|\\(\\s*${alias}\\s+as\\b|\\b${alias}\\s+as\\s`,
      );
      src.split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
        if (lookup.test(line)) hits.push(`${f}:${i + 1}: ${line.trim()}`);
      });
    }
    expect(hits, hits.join('\n')).toEqual([]);
  });
});
