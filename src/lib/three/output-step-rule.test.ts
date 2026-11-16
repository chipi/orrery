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
  it('A: every EffectComposer chain has exactly one OutputPass, added last (6 sites)', () => {
    const sites: string[] = [];
    const bad: string[] = [];
    for (const f of files) {
      f.lines.forEach((l) => {
        const name = code(l) ? /(\w+)\s*=\s*new EffectComposer\(/.exec(l)?.[1] : undefined;
        if (!name) return;
        sites.push(f.path);
        const passes = f.lines.filter(
          (p) => code(p) && new RegExp(`\\b${name}\\.(?:addPass|insertPass)\\(`).test(p),
        );
        const outputs = passes.filter((p) => /new OutputPass\(/.test(p));
        const lastIsOutput =
          passes.length > 0 && /new OutputPass\(/.test(passes[passes.length - 1]);
        if (outputs.length !== 1 || !lastIsOutput) bad.push(`${rel(f.path)} (${name})`);
      });
    }
    expect(bad).toEqual([]);
    expect(sites).toHaveLength(6);
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

  it('C: every texture creation tags the texture it creates, within 14 lines', () => {
    // Any `.load(` (TextureLoader instance or chained `new THREE.TextureLoader().load(`) too.
    const create =
      /new (?:THREE\.)?(?:CanvasTexture|Texture|DataTexture)\(|(?:[Ll]oader|TextureLoader\(\)|\btl)\.load\(/;
    const bad: string[] = [];
    for (const f of files) {
      // any variable bound to a TextureLoader (const tx = new THREE.TextureLoader(); tx.load(...))
      const bound = f.lines
        .map((l) => /(?:const|let)\s+(\w+)\s*=[^;]*new (?:THREE\.)?TextureLoader\(/.exec(l)?.[1])
        .filter(Boolean);
      const loaderVar = bound.length ? new RegExp(`\\b(?:${bound.join('|')})\\.load\\(`) : null;
      f.lines.forEach((l, i) => {
        if (!code(l) || !(create.test(l) || loaderVar?.test(l))) return;
        const win = f.lines.slice(i, i + 15);
        // `const x = new ...` / `const x = loader.load(url)` must tag x itself; a loader call with a
        // callback tags the parameter the callback receives.
        const name = /^\s*(?:const|let)?\s*(\w+)\s*=/.exec(l)?.[1];
        let target = name;
        if (!name || /\(\s*$/.test(l)) {
          target = /\(?\b(\w+)(?::[^)]*)?\)?\s*=>/.exec(win.join('\n'))?.[1] ?? name;
        }
        const tag = target ? new RegExp(`\\b${target}\\.colorSpace\\s*=`) : /(?!)/;
        if (!win.some((w) => tag.test(w))) bad.push(`${rel(f.path)}:${i + 1}`);
      });
    }
    expect(bad).toEqual([]);
  });

  it('shader colours reach the composer as THREE.Color, never as raw GLSL literals', () => {
    // A raw sRGB literal in a fragment shader is treated as linear and the OutputPass then encodes it
    // a second time (pale colours). THREE.Color uniforms are converted to linear by ColorManagement.
    const shaderFiles = [
      'lib/three/ascent-scene.ts',
      'lib/three/descent-scene.ts',
      'lib/three/fly-helio-scene.ts',
      'lib/three/fly-helio-overlays.ts',
      'lib/three/fly-helio-mission.ts',
      'lib/three/fly-cislunar-overlays.ts',
      'lib/three/explore-solar-scene.ts',
      'lib/universe/milky-way-scene.ts',
      'lib/universe/local-group-scene.ts',
      'lib/universe/point-field.ts',
      'lib/universe/black-hole-scene.ts',
    ];
    // Whole-file exceptions: the shader owns its whole output transform.
    const skipFile: Record<string, string> = {
      'lib/universe/black-hole-scene.ts':
        'direct-render full-screen shader (no composer); it tone-maps and gammas itself, so its literals are display values',
    };
    // `file:line-pattern` exceptions with the reason.
    const allow: Array<[string, RegExp, string]> = [
      [
        'lib/universe/point-field.ts',
        /vColor \* 0\.6 \+ vec3\(0\.4\)/,
        'whitening amount added to a linear vertex colour (an intensity), not an authored colour',
      ],
    ];
    const invariant = (args: string) =>
      args.split(',').every((a) => /^\s*[01](?:\.0*)?\s*$/.test(a));
    const colourName = /(?:Color|Tint|Horizon|Zenith|Rim|Glow|Base|Tip|Hue)/;
    const bad: string[] = [];
    for (const p of shaderFiles) {
      const f = files.find((x) => x.path === p);
      expect(f, p).toBeDefined();
      if (skipFile[p]) continue;
      f!.lines.forEach((l, i) => {
        if (!code(l) || allow.some(([ap, re]) => ap === p && re.test(l))) return;
        const at = `${rel(p)}:${i + 1}`;
        // vec3/vec4 colour literals (0 and 1 are the same in both spaces)
        for (const m of l.matchAll(/vec[34]\(\s*([-0-9.]+(?:\s*,\s*[-0-9.]+){2,3})\s*[,)]/g)) {
          if (!invariant(m[1])) bad.push(at);
        }
        // single-argument vec3(x) used as a colour (assigned to a colour / gl_FragColor)
        if (/(?:gl_FragColor|\b\w*[Cc]ol\w*)\s*[-+*]?=[^;]*vec3\(\s*[-0-9.]+\s*\)/.test(l)) {
          const v = /vec3\(\s*([-0-9.]+)\s*\)/.exec(l)![1];
          if (!invariant(v)) bad.push(at);
        }
        // uniforms: an array/number triple anywhere, or a colour-named uniform that is not a THREE.Color
        if (/\bu[A-Z]\w*:\s*\{\s*value:\s*\[\s*[-0-9.]+\s*,\s*[-0-9.]+\s*,\s*[-0-9.]+/.test(l))
          bad.push(at);
        const named = /(?:\b(u[A-Z]\w*)\s*:|uniforms\.(\w+)\s*=)\s*\{\s*value:\s*(.*)$/.exec(l);
        const uname = named?.[1] ?? named?.[2];
        if (
          named &&
          uname &&
          colourName.test(uname) &&
          !/Opacity|Strength|Power/.test(uname) &&
          !/^new THREE\.Color\(/.test(named[3])
        ) {
          bad.push(at);
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
