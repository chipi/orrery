import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// App-wide guard for the ADR-079 asset-origin seam.
//
// `/images/` and `/audio/` are pruned from the Capacitor on-device bundle
// (scripts/mobile/prune-streamed-assets.mjs) and MUST be resolved through the
// asset-origin seam — `assetUrl()` for DOM <img>/lightbox sources, or
// `streamedUrl(\`${base}${url}\`)` for TextureLoader/Image() 3D loads. Building
// such a URL from `$app/paths` `base` alone resolves to the local capacitor://
// origin on mobile, where the asset no longer exists → a 404 (the /explore star
// hero regression, plus badges/galleries across the app). `/textures/`,
// `/data/`, `/diagrams/`, `/logos/`, and route hrefs stay bundled → `base` is
// correct for those and is NOT matched here.

const SRC = fileURLToPath(new URL('../', import.meta.url)); // src/

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(svelte|ts)$/.test(e.name) && !/\.test\.ts$/.test(e.name)) out.push(p);
  }
  return out;
}

// Strip line/block comments so a doc comment naming the old form isn't a hit.
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// `base` immediately followed by a pruned bucket — both the literal
// `${base}/images/…` / `{base}/images/…` form and the `{base}{expr}` /
// `${base}${expr}` concat form where a well-known image expression follows.
const LITERAL = /(\$\{base\}|\{base\})\/(images|audio)\//;
const CONCAT =
  /(\{base\}\{|\$\{base\}\$\{)\s*(badges\[|gallery(\[|\b)|img\.src\b|section\.photo\.src\b|photo\.path\b|star\.photo\.src\b)/;

describe('asset-origin guard — no streamed bucket resolved through bare base', () => {
  const files = walk(SRC);

  it('scans a meaningful number of source files', () => {
    expect(files.length).toBeGreaterThan(200);
  });

  it('never builds an /images/ or /audio/ src from base (use assetUrl/streamedUrl)', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const src = stripComments(readFileSync(f, 'utf8'));
      const lines = src.split('\n');
      lines.forEach((line, i) => {
        if (LITERAL.test(line) || CONCAT.test(line)) {
          offenders.push(`${f.slice(SRC.length)}:${i + 1}  ${line.trim().slice(0, 100)}`);
        }
      });
    }
    expect(offenders, `Streamed-bucket assets built from bare base:\n${offenders.join('\n')}`).toEqual(
      [],
    );
  });
});
