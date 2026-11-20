import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// ops/refresh-prod-data.sh rewrites the launch data on prod every 6 h, but nginx
// (brotli_static / gzip_static) prefers a precompressed .br / .gz sibling, and the deploy ships
// those built from the old data. Every file fetch-launches.ts writes must have both siblings
// dropped, or prod keeps serving the deploy's copy: launches-years.json was missed until
// 2026-11-17 and the era tiles on /missions/launches counted 7,645 launches against 7,849.

const root = fileURLToPath(new URL('../', import.meta.url));
const fetchSrc = readFileSync(`${root}scripts/fetch-launches.ts`, 'utf8');
const refresh = readFileSync(`${root}ops/refresh-prod-data.sh`, 'utf8');

/** The files fetch-launches.ts writes under static/data, as served paths. */
function writtenFiles(): string[] {
  const out = [...fetchSrc.matchAll(/writeJson\(\s*join\(DATA_ROOT, '([^']+\.json)'\)/g)].map(
    (m) => m[1],
  );
  if (/writeJson\(\s*join\(HISTORIC_DIR, `\$\{decade\}\.json`\)/.test(fetchSrc))
    out.push('launches-historic/*.json');
  return out;
}

describe('refresh-prod-data.sh drops the precompressed copy of every file the fetch rewrites', () => {
  const files = writtenFiles();

  it('finds the files fetch-launches.ts writes', () => {
    expect(files).toEqual(
      expect.arrayContaining(['launches.json', 'launches-years.json', 'launches-historic/*.json']),
    );
  });

  for (const f of files) {
    it(`${f}: .gz and .br are removed`, () => {
      expect(refresh).toContain(`static/data/${f}.gz`);
      expect(refresh).toContain(`static/data/${f}.br`);
    });
  }
});
