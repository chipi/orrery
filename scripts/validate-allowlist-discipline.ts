/**
 * Allowlist discipline guard (Slice A v3 / Stage 1.3).
 *
 * Background: tonight's v2 apply shipped 707 bad image swaps. To keep the
 * build green, the operator added 118 byte-dupe SHA prefixes to
 * scripts/validate-image-dupes.ts:ALLOWLIST and 28 pHash pairs to
 * scripts/validate-image-phash-dupes.ts:INLINE_ALLOWLIST under benign
 * "sibling-mission shared imagery" labels. Without those, the build would
 * have failed and forced a real fix. With them, the regression shipped.
 *
 * This guard makes that pattern impossible to repeat unnoticed. It diffs
 * the current ALLOWLIST entries against `origin/main` (or `main`) and
 * fails when more than MAX_AUTOLAND new entries land unless the branch
 * carries an `ALLOWLIST_AUTHORIZED:` token in at least one commit message.
 *
 * Usage:
 *   tsx scripts/validate-allowlist-discipline.ts
 *   tsx scripts/validate-allowlist-discipline.ts --base=main --max=5
 *
 * Wire into validate-data as a sub-step. Skips silently on initial setup
 * when no baseline ref is available.
 */

import { execSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

type GuardConfig = {
  base: string;
  maxAutoland: number;
};

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.+)$/);
    return m ? [m[1], m[2]] : [a.replace(/^-+/, ''), 'true'];
  }),
);

const config: GuardConfig = {
  base: typeof args.base === 'string' ? args.base : 'origin/main',
  maxAutoland: typeof args.max === 'string' ? parseInt(args.max, 10) : 5,
};

const FILES_TO_GUARD: Array<{ path: string; setName: string; matcher: RegExp }> = [
  {
    path: 'scripts/validate-image-dupes.ts',
    setName: 'ALLOWLIST',
    matcher: /^\s*'([0-9a-f]{6,16})'\s*,/gm,
  },
  {
    path: 'scripts/validate-image-phash-dupes.ts',
    setName: 'INLINE_ALLOWLIST',
    matcher: /^\s*'([0-9a-f]+\|[0-9a-f]+)'\s*,/gm,
  },
];

function safeGit(cmd: string): string | null {
  try {
    return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

function resolveBaseRef(preferred: string): string | null {
  for (const candidate of [preferred, 'origin/main', 'main']) {
    if (safeGit(`git rev-parse --verify --quiet ${candidate}^{commit}`)) return candidate;
  }
  return null;
}

function extractEntries(text: string, matcher: RegExp): Set<string> {
  const out = new Set<string>();
  for (const match of text.matchAll(new RegExp(matcher.source, matcher.flags))) {
    out.add(match[1]);
  }
  return out;
}

async function readLocalEntries(path: string, matcher: RegExp): Promise<Set<string>> {
  try {
    const txt = await readFile(path, 'utf8');
    return extractEntries(txt, matcher);
  } catch {
    return new Set();
  }
}

function readBaselineEntries(base: string, path: string, matcher: RegExp): Set<string> {
  const txt = safeGit(`git show ${base}:${path}`);
  if (!txt) return new Set();
  return extractEntries(txt, matcher);
}

function commitMessages(base: string): string {
  // Walk every commit between base and HEAD looking for the authorization token.
  return safeGit(`git log ${base}..HEAD --format=%B`) ?? '';
}

async function main(): Promise<void> {
  const baseRef = resolveBaseRef(config.base);
  if (!baseRef) {
    console.log(
      `validate-allowlist-discipline: no baseline ref (${config.base} / origin/main / main not found) — skipping`,
    );
    return;
  }

  const messages = commitMessages(baseRef);
  const authorized = /ALLOWLIST_AUTHORIZED:/.test(messages);

  let netNew = 0;
  const reports: Array<{ file: string; added: string[]; baseline: number; current: number }> = [];
  for (const file of FILES_TO_GUARD) {
    const baseline = readBaselineEntries(baseRef, file.path, file.matcher);
    const current = await readLocalEntries(file.path, file.matcher);
    const added: string[] = [];
    for (const entry of current) if (!baseline.has(entry)) added.push(entry);
    netNew += added.length;
    reports.push({ file: file.path, added, baseline: baseline.size, current: current.size });
  }

  console.log(`validate-allowlist-discipline: baseline=${baseRef}, max-autoland=${config.maxAutoland}`);
  for (const r of reports) {
    console.log(
      `  ${r.file}: ${r.current} entries (baseline ${r.baseline}, +${r.added.length} on this branch)`,
    );
  }
  console.log(`  net new across all files: ${netNew}`);
  console.log(`  ALLOWLIST_AUTHORIZED token in commit messages: ${authorized ? 'yes' : 'no'}`);

  if (netNew <= config.maxAutoland) {
    console.log('validate-allowlist-discipline: OK (within auto-land budget)');
    return;
  }
  if (authorized) {
    console.log('validate-allowlist-discipline: OK (authorized via commit-message token)');
    return;
  }
  console.error(
    `validate-allowlist-discipline: FAIL — ${netNew} new entries exceeds max ${config.maxAutoland} and no ALLOWLIST_AUTHORIZED token in branch commits.`,
  );
  console.error(
    '  Fix the underlying duplication, OR add a commit on this branch with "ALLOWLIST_AUTHORIZED: <reason>" in the message after curator review.',
  );
  for (const r of reports) {
    if (r.added.length > 0) {
      console.error(`  added in ${r.file}:`);
      for (const e of r.added.slice(0, 10)) console.error(`    ${e}`);
      if (r.added.length > 10) console.error(`    … and ${r.added.length - 10} more`);
    }
  }
  process.exit(1);
}

main().catch((err) => {
  console.error('validate-allowlist-discipline: fatal', err);
  process.exit(2);
});
