#!/usr/bin/env tsx
/**
 * Tech Bill-of-Materials generator.
 *
 * Produces:
 *   • docs/TECH-BOM.md        — human-readable markdown (linked from README)
 *   • static/data/tech-bom.json — machine-readable JSON (CycloneDX-ish subset)
 *
 * Walks the npm dependency tree (via `npm ls --json --all --omit=optional`)
 * and reads each installed package's `package.json` for license metadata.
 *
 * Each package is classified as:
 *   • "runtime"     — reachable from package.json#dependencies (ships to browsers)
 *   • "development" — reachable from package.json#devDependencies only
 *
 * License allowlist is enforced fail-closed. Unknown licenses block CI so
 * we never silently ship a dep with a license we have not vetted.
 *
 * Usage:
 *   npm run build-tech-bom              # regenerate + validate
 *   tsx scripts/build-tech-bom.ts --check  # validate-only (no rewrite)
 *
 * Re-run after every `npm install` / dep bump.
 *
 * Issue: #92
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const NM = join(ROOT, 'node_modules');
const OUT_MD = join(ROOT, 'docs', 'TECH-BOM.md');
const OUT_JSON = join(ROOT, 'static', 'data', 'tech-bom.json');

// SPDX identifiers we accept without review. Aligned with OSI-approved
// permissive + copyleft-not-affecting-distribution-of-static-frontend.
// New deps with licenses outside this list MUST be either:
//   1. Added here with justification, or
//   2. Removed.
const LICENSE_ALLOWLIST = new Set([
  // Permissive
  'MIT',
  'MIT-0',
  'ISC',
  'Apache-2.0',
  'BSD',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'BSD-3-Clause-Clear',
  '0BSD',
  'BlueOak-1.0.0',
  'Python-2.0',
  'PSF-2.0',
  'Unlicense',
  'WTFPL',
  'Zlib',
  'Artistic-2.0',
  // Creative commons (used by some font/data deps)
  'CC0-1.0',
  'CC-BY-3.0',
  'CC-BY-4.0',
  // Public domain
  'CC-PDDC',
]);

// Some legacy npm packages declare licenses as compound expressions or
// non-SPDX strings. We canonicalise the obvious cases here.
function canonicaliseLicense(raw: unknown): string {
  if (raw == null) return 'UNKNOWN';
  if (typeof raw === 'string') {
    // SPDX expressions like "(MIT OR Apache-2.0)" — pick first OR-branch.
    const m = raw.match(/^\(([A-Za-z0-9.-]+)\s+OR/);
    if (m) return m[1];
    if (raw === 'AFL-2.1') return 'AFL-2.1';
    if (raw === 'Public Domain') return 'CC0-1.0';
    return raw.trim();
  }
  if (Array.isArray(raw) && raw.length > 0) {
    // legacy: licenses: [{type: "MIT"}]
    const first = raw[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object' && 'type' in first) {
      return canonicaliseLicense((first as { type: unknown }).type);
    }
  }
  if (typeof raw === 'object' && raw !== null && 'type' in raw) {
    return canonicaliseLicense((raw as { type: unknown }).type);
  }
  return 'UNKNOWN';
}

interface Pkg {
  name: string;
  version: string;
  license: string;
  description?: string;
  homepage?: string;
  repository?: string;
  author?: string;
  scope: 'runtime' | 'development';
  topLevel: boolean; // present in our package.json directly
}

function readPkgJson(name: string): Record<string, unknown> | null {
  const p = join(NM, name, 'package.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function repoUrl(repo: unknown): string | undefined {
  if (typeof repo === 'string') return cleanUrl(repo);
  if (repo && typeof repo === 'object' && 'url' in repo) {
    return cleanUrl(String((repo as { url: unknown }).url || ''));
  }
  return undefined;
}

function cleanUrl(u: string): string | undefined {
  if (!u) return undefined;
  const cleaned = u
    .replace(/^git\+/, '')
    .replace(/\.git$/, '')
    .replace(/^git:\/\//, 'https://')
    .replace(/^ssh:\/\/git@/, 'https://')
    .replace(/^git@github\.com:/, 'https://github.com/');
  // npm package.json `repository` accepts shorthand forms that aren't URLs:
  //   "user/repo"            → https://github.com/user/repo
  //   "github:user/repo"     → https://github.com/user/repo
  //   "gitlab:user/repo"     → https://gitlab.com/user/repo
  //   "bitbucket:user/repo"  → https://bitbucket.org/user/repo
  // Without this, tech-bom.md emits markdown like `[name](user/repo)` which
  // breaks VitePress's dead-link check.
  if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(cleaned)) {
    return `https://github.com/${cleaned}`;
  }
  const shorthand = cleaned.match(/^(github|gitlab|bitbucket):(.+)$/);
  if (shorthand) {
    const host =
      shorthand[1] === 'gitlab'
        ? 'gitlab.com'
        : shorthand[1] === 'bitbucket'
          ? 'bitbucket.org'
          : 'github.com';
    return `https://${host}/${shorthand[2]}`;
  }
  return cleaned;
}

function authorString(a: unknown): string | undefined {
  if (typeof a === 'string') return a.split('<')[0].trim();
  if (a && typeof a === 'object' && 'name' in a)
    return String((a as { name: unknown }).name || '').trim();
  return undefined;
}

/* ───────────────────────── walk dep tree ───────────────────────── */

interface NpmLsNode {
  name?: string;
  version?: string;
  resolved?: string;
  dependencies?: Record<string, NpmLsNode>;
}

function flattenTree(tree: NpmLsNode, out: Map<string, string> = new Map()): Map<string, string> {
  if (tree.dependencies) {
    for (const [name, node] of Object.entries(tree.dependencies)) {
      const v = node.version ?? '';
      const key = `${name}@${v}`;
      if (!out.has(key)) {
        out.set(key, name);
        flattenTree(node, out);
      }
    }
  }
  return out;
}

function npmLs(omitDev: boolean): NpmLsNode {
  const cmd = `npm ls --json --all --omit=optional${omitDev ? ' --omit=dev' : ''}`;
  // npm ls exits non-zero for peer-dep warnings even when output is valid.
  // We capture stdout regardless.
  let raw = '';
  try {
    raw = execSync(cmd, {
      cwd: ROOT,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString('utf8');
  } catch (e) {
    const err = e as { stdout?: Buffer | string };
    raw = (err.stdout ?? '').toString();
  }
  if (!raw) throw new Error(`npm ls failed (omitDev=${omitDev})`);
  return JSON.parse(raw) as NpmLsNode;
}

/* ───────────────────────── main ─────────────────────────────────── */

function buildBom(): { pkgs: Pkg[]; ourPkg: Record<string, unknown> } {
  const ourPkgJson = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as Record<
    string,
    unknown
  >;
  const directRuntime = new Set(Object.keys(ourPkgJson.dependencies ?? {}));
  const directDev = new Set(Object.keys(ourPkgJson.devDependencies ?? {}));

  // Walk the npm tree twice: once with --omit=dev (runtime closure), once
  // without (full closure). The diff = development-only deps.
  const runtimeKeys = flattenTree(npmLs(true));
  const fullKeys = flattenTree(npmLs(false));
  const devOnlyKeys = new Map<string, string>();
  for (const [k, name] of fullKeys) {
    if (!runtimeKeys.has(k)) devOnlyKeys.set(k, name);
  }

  const pkgs: Pkg[] = [];
  const seen = new Set<string>();
  function add(name: string, scope: 'runtime' | 'development', topLevel: boolean) {
    const pj = readPkgJson(name);
    if (!pj) return;
    const id = `${pj.name as string}@${pj.version as string}`;
    if (seen.has(id)) return;
    seen.add(id);
    pkgs.push({
      name: pj.name as string,
      version: pj.version as string,
      license: canonicaliseLicense(pj.license ?? pj.licenses),
      description: typeof pj.description === 'string' ? pj.description : undefined,
      homepage: typeof pj.homepage === 'string' ? pj.homepage : undefined,
      repository: repoUrl(pj.repository),
      author: authorString(pj.author),
      scope,
      topLevel,
    });
  }

  // Runtime closure first (so it wins the scope tag)
  for (const name of runtimeKeys.values()) {
    add(name, 'runtime', directRuntime.has(name));
  }
  for (const name of devOnlyKeys.values()) {
    add(name, 'development', directDev.has(name));
  }

  pkgs.sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === 'runtime' ? -1 : 1;
    if (a.topLevel !== b.topLevel) return a.topLevel ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return { pkgs, ourPkg: ourPkgJson };
}

function validateLicenses(pkgs: Pkg[]): void {
  const violators = pkgs.filter((p) => !LICENSE_ALLOWLIST.has(p.license));
  if (violators.length === 0) return;
  console.error('\n❌ Tech BOM: licenses not on allowlist:\n');
  for (const v of violators) {
    console.error(
      `  ${v.name}@${v.version}  (${v.license})  [${v.scope}${v.topLevel ? ', top-level' : ''}]`,
    );
  }
  console.error('\nResolve by either:');
  console.error('  • Adding the license to LICENSE_ALLOWLIST in scripts/build-tech-bom.ts');
  console.error('  • Removing / replacing the offending dependency');
  process.exit(1);
}

/* ───────────────────────── markdown writer ─────────────────────── */

function escMd(s: string | undefined): string {
  if (!s) return '';
  return s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 110);
}

function writeMarkdown(pkgs: Pkg[], ourPkg: Record<string, unknown>): string {
  const runtimeAll = pkgs.filter((p) => p.scope === 'runtime');
  const runtimeTop = runtimeAll.filter((p) => p.topLevel);
  const devTop = pkgs.filter((p) => p.scope === 'development' && p.topLevel);
  const transitive = pkgs.filter((p) => !p.topLevel);

  const licenseHistogram = new Map<string, number>();
  for (const p of pkgs) licenseHistogram.set(p.license, (licenseHistogram.get(p.license) ?? 0) + 1);
  const licensesSorted = [...licenseHistogram.entries()].sort((a, b) => b[1] - a[1]);

  const generated = new Date().toISOString().slice(0, 10);
  const ourVersion = String(ourPkg.version ?? '');

  const lines: string[] = [];
  lines.push('# Tech Bill of Materials');
  lines.push('');
  lines.push('> Auto-generated. **Do not edit by hand.** Re-run `npm run build-tech-bom`.');
  lines.push('');
  lines.push(
    'Every npm package that ships with Orrery, every build-time tool, every transitive dependency. License-audited fail-closed in CI — if a new dep ships with a license that is not in our allowlist, the build breaks and we have to make a decision.',
  );
  lines.push('');
  lines.push(
    'Companion to the [image bill of materials](../static/data/image-provenance.json) and the [outbound-link bill of materials](../static/data/link-provenance.json) — every kind of "what is in this app and where did it come from" question is answered by one of those three sources.',
  );
  lines.push('');
  lines.push('| | |');
  lines.push('|---|---|');
  lines.push(`| **Project** | \`orrery@${ourVersion}\` |`);
  lines.push(`| **Generated** | ${generated} |`);
  lines.push(
    `| **Total packages** | ${pkgs.length} (${runtimeAll.length} runtime · ${pkgs.length - runtimeAll.length} development) |`,
  );
  lines.push(`| **Top-level runtime deps** | ${runtimeTop.length} |`);
  lines.push(`| **Top-level dev deps** | ${devTop.length} |`);
  lines.push(`| **Transitive deps** | ${transitive.length} |`);
  lines.push(`| **Distinct licenses** | ${licensesSorted.length} |`);
  lines.push('');

  /* ───── License summary ───── */
  lines.push('## License summary');
  lines.push('');
  lines.push('| License | Count | Notes |');
  lines.push('|---|---|---|');
  for (const [lic, count] of licensesSorted) {
    const note = LICENSE_ALLOWLIST.has(lic) ? '' : '⚠️ NOT on allowlist';
    lines.push(`| \`${lic}\` | ${count} | ${note} |`);
  }
  lines.push('');

  /* ───── Top-level runtime ───── */
  lines.push('## Top-level runtime dependencies');
  lines.push('');
  lines.push(
    '_Bundled into the SPA and shipped to every visitor. Smallest possible surface area is the goal — we go to lengths to keep this list short._',
  );
  lines.push('');
  lines.push('| Package | Version | License | Description |');
  lines.push('|---|---|---|---|');
  for (const p of runtimeTop) {
    const link = p.homepage || p.repository;
    const name = link ? `[\`${p.name}\`](${link})` : `\`${p.name}\``;
    lines.push(`| ${name} | ${p.version} | \`${p.license}\` | ${escMd(p.description)} |`);
  }
  lines.push('');

  /* ───── Top-level dev ───── */
  lines.push('## Top-level development dependencies');
  lines.push('');
  lines.push('_Build-time tools — not shipped to browsers._');
  lines.push('');
  lines.push('| Package | Version | License | Description |');
  lines.push('|---|---|---|---|');
  for (const p of devTop) {
    const link = p.homepage || p.repository;
    const name = link ? `[\`${p.name}\`](${link})` : `\`${p.name}\``;
    lines.push(`| ${name} | ${p.version} | \`${p.license}\` | ${escMd(p.description)} |`);
  }
  lines.push('');

  /* ───── Transitive deps (collapsible) ───── */
  lines.push('## Transitive dependencies');
  lines.push('');
  lines.push(`<details><summary>Show all ${transitive.length} transitive packages</summary>`);
  lines.push('');
  lines.push('| Package | Version | License | Scope |');
  lines.push('|---|---|---|---|');
  for (const p of transitive) {
    const link = p.homepage || p.repository;
    const name = link ? `[\`${p.name}\`](${link})` : `\`${p.name}\``;
    lines.push(`| ${name} | ${p.version} | \`${p.license}\` | ${p.scope} |`);
  }
  lines.push('');
  lines.push('</details>');
  lines.push('');

  /* ───── Footer ───── */
  lines.push('## How this is maintained');
  lines.push('');
  lines.push(
    '- **Re-generation**: `npm run build-tech-bom` reads `node_modules/`, walks the npm dep tree, and rewrites this file + `static/data/tech-bom.json`. Run after every `npm install` / dep bump.',
  );
  lines.push(
    '- **CI check**: chained into `validate-data` so a license that is not on the allowlist breaks the build. To add a new license, edit `LICENSE_ALLOWLIST` in `scripts/build-tech-bom.ts`.',
  );
  lines.push(
    '- **No new dependencies were added to make this work.** Generator is pure Node + npm CLI; output formats are markdown + a CycloneDX-shaped JSON subset.',
  );
  lines.push(
    '- **Project license**: `MIT` (see [LICENSE](https://github.com/chipi/orrery/blob/main/LICENSE)). All bundled deps are compatible.',
  );
  lines.push('');

  return lines.join('\n') + '\n';
}

/* ───────────────────────── json writer ─────────────────────────── */

function writeJson(pkgs: Pkg[], ourPkg: Record<string, unknown>): string {
  // CycloneDX-like subset: bom-format, components[]. Not full SBOM (no
  // hashes, no PURLs) but consumable by downstream tooling that just wants
  // the dep list. We can graduate to full CycloneDX later if needed.
  const doc = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ vendor: 'Orrery', name: 'build-tech-bom', version: '1.0' }],
      component: {
        type: 'application',
        name: ourPkg.name,
        version: ourPkg.version,
        licenses: [{ license: { id: ourPkg.license } }],
      },
    },
    components: pkgs.map((p) => ({
      type: 'library',
      name: p.name,
      version: p.version,
      description: p.description,
      licenses: [{ license: { id: p.license } }],
      externalReferences: [
        ...(p.homepage ? [{ type: 'website', url: p.homepage }] : []),
        ...(p.repository ? [{ type: 'vcs', url: p.repository }] : []),
      ],
      properties: [
        { name: 'orrery:scope', value: p.scope },
        { name: 'orrery:topLevel', value: String(p.topLevel) },
      ],
    })),
  };
  return JSON.stringify(doc, null, 2) + '\n';
}

/* ───────────────────────── entry ───────────────────────────────── */

function main(): void {
  const checkOnly = process.argv.includes('--check');

  const { pkgs, ourPkg } = buildBom();
  validateLicenses(pkgs);

  if (checkOnly) {
    console.log(`✅ tech-bom: ${pkgs.length} packages, all licenses on allowlist.`);
    return;
  }

  mkdirSync(dirname(OUT_MD), { recursive: true });
  mkdirSync(dirname(OUT_JSON), { recursive: true });
  writeFileSync(OUT_MD, writeMarkdown(pkgs, ourPkg), 'utf8');
  writeFileSync(OUT_JSON, writeJson(pkgs, ourPkg), 'utf8');

  console.log(`✅ tech-bom written: ${pkgs.length} packages.`);
  console.log(`   ${OUT_MD}`);
  console.log(`   ${OUT_JSON}`);
}

main();
