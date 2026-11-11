// Source-level guard for the colour pipeline rule (docs/wip/2026-11-11-slice-output-step-brief.md):
// composers render into linear targets, so every composer ends in one OutputPass, and every
// texture says which colour space it is in (colour maps sRGB, data maps NoColorSpace).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(__dirname, '..', '..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, ent.name);
    if (ent.isDirectory()) sourceFiles(p, out);
    else if (/\.(ts|svelte)$/.test(ent.name) && !/\.(test|spec)\.ts$/.test(ent.name)) out.push(p);
  }
  return out;
}

const files = sourceFiles(SRC).map((p) => ({
  path: relative(SRC, p),
  lines: readFileSync(p, 'utf8').split('\n'),
}));
const rel = (p: string) => `src/${p}`;

const code = (l: string) => !/^\s*(\/\/|\*|\/\*)/.test(l);

describe('colour pipeline rule', () => {
  it('A: every file that builds an EffectComposer also builds an OutputPass (6 sites)', () => {
    const composerSites: string[] = [];
    const missing: string[] = [];
    for (const f of files) {
      const n = f.lines.filter((l) => code(l) && /new EffectComposer\(/.test(l)).length;
      if (!n) continue;
      composerSites.push(...Array(n).fill(f.path));
      if (!f.lines.some((l) => code(l) && /new OutputPass\(/.test(l))) missing.push(rel(f.path));
    }
    expect(missing).toEqual([]);
    expect(composerSites).toHaveLength(6);
  });

  it('B: both createOutlinePassSetup users pass outputPass: true', () => {
    const bad: string[] = [];
    let users = 0;
    for (const f of files) {
      f.lines.forEach((l, i) => {
        if (!code(l) || !/createOutlinePassSetup\(\{/.test(l)) return;
        users++;
        // the call's argument object closes at the first line indented like the opener's `})`
        const indent = /^\s*/.exec(l)![0];
        let end = i + 1;
        while (end < f.lines.length && !f.lines[end].startsWith(`${indent}})`)) end++;
        const body = f.lines.slice(i, end + 1).join('\n');
        if (!/outputPass:\s*true/.test(body)) bad.push(`${rel(f.path)}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
    expect(users).toBe(2);
  });

  it('C: every texture creation sets a colorSpace within 14 lines', () => {
    const create = /new (?:THREE\.)?(?:CanvasTexture|Texture|DataTexture)\(|\b\w*[Ll]oader\.load\(/;
    const bad: string[] = [];
    for (const f of files) {
      f.lines.forEach((l, i) => {
        if (!code(l) || !create.test(l)) return;
        // A plain `const x = new ...` must tag that same variable; a loader call that takes a
        // callback (the line ends in `(`) tags the texture it receives, whatever it is called.
        const name = /^\s*(?:const|let)\s+(\w+)\s*=/.exec(l)?.[1];
        const tag =
          name && !/\(\s*$/.test(l)
            ? new RegExp(`\\b${name}\\.colorSpace\\s*=`)
            : /\.colorSpace\s*=/;
        if (!f.lines.slice(i, i + 15).some((w) => tag.test(w))) {
          bad.push(`${rel(f.path)}:${i + 1}`);
        }
      });
    }
    expect(bad).toEqual([]);
  });

  it('C: the data maps are tagged NoColorSpace explicitly', () => {
    const dataMapFiles = [
      'lib/three/launch-ground.ts',
      'lib/three/hero-materials.ts',
      'lib/three/launcher-detail.ts',
      'lib/three/feather-mask.ts',
    ];
    for (const p of dataMapFiles) {
      const f = files.find((x) => x.path === p);
      expect(f, p).toBeDefined();
      expect(
        f!.lines.some((l) => code(l) && /NoColorSpace/.test(l)),
        p,
      ).toBe(true);
    }
  });
});
