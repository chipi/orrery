/**
 * scripts/check-no-secrets.ts — RFC-025 §3 / ADR-067 fail-closed gate.
 *
 * Greps the git staged diff for known credential patterns and exits
 * non-zero if any match. Runs in `npm run preflight` and via
 * `.husky/pre-commit` (added in a follow-up); both block the commit
 * when a real secret pattern lands in staged content.
 *
 * Fast and dumb on purpose — no AST parsing, no entropy heuristics,
 * just a regex sweep against three patterns:
 *
 *   1. Sentry public DSN  (PUBLIC_SENTRY_DSN value, public-by-design
 *      but we still don't want forks accidentally inheriting the
 *      operator's project ID via a committed value).
 *   2. Grafana Cloud API key (glc_ prefix, genuinely secret).
 *   3. Anthropic API key (sk-ant- prefix, genuinely secret — already
 *      gitignored via .env, but worth a belt-and-suspenders catch
 *      since it predates RFC-025 and isn't otherwise blocked).
 *
 * Allowlist: matches inside `.env.example`, `docs/**`, `*.test.ts`,
 * and inside this script itself are allowed (they're documentation
 * or fixtures, not live credentials).
 *
 * Usage:
 *   tsx scripts/check-no-secrets.ts            # scan staged diff
 *   tsx scripts/check-no-secrets.ts --all      # scan full tree (CI)
 *
 * Exit codes:
 *   0 = no matches (or only allowlisted matches)
 *   1 = at least one credential-shaped match in a non-allowlisted file
 *   2 = invocation error (git not found, etc.)
 */
import { execSync } from 'node:child_process';

type Pattern = { name: string; regex: RegExp; severity: 'public' | 'secret' };

// The set of patterns we scan for. Each one is the SHAPE of a credential —
// the regex itself is not sensitive, it's just describing what one looks like.
const PATTERNS: Pattern[] = [
  {
    name: 'Sentry DSN (modern format)',
    // https://<32-char-hex>@o<digits>.ingest.<region>.sentry.io/<digits>
    regex: /https:\/\/[a-f0-9]{32}@o\d+(?:\.ingest(?:\.[a-z0-9-]+)*)?\.sentry\.io\/\d+/g,
    severity: 'public',
  },
  {
    name: 'Sentry DSN (alphanumeric public-key variant)',
    // Some older / EU projects use mixed-case alphanumeric public keys.
    regex: /https:\/\/[a-zA-Z0-9]{32}@o\d+\.ingest(?:\.[a-z0-9-]+)*\.sentry\.io\/\d+/g,
    severity: 'public',
  },
  {
    name: 'Grafana Cloud API key',
    regex: /\bglc_[A-Za-z0-9+/=]{40,}\b/g,
    severity: 'secret',
  },
  {
    name: 'Anthropic API key',
    regex: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
    severity: 'secret',
  },
];

// Files where pattern hits are OK — these are documentation, templates,
// or this script itself describing what a credential LOOKS like.
const ALLOWLIST_PATTERNS: RegExp[] = [
  /^\.env\.example$/,
  /^docs\//,
  /^scripts\/check-no-secrets\.ts$/,
  /\.test\.ts$/,
  /\.spec\.ts$/,
];

function isAllowlisted(path: string): boolean {
  return ALLOWLIST_PATTERNS.some((re) => re.test(path));
}

/**
 * Get staged-only changed lines via `git diff --cached`. Returns a
 * map from path → added-lines (lines starting with '+' that aren't the
 * file header `+++ b/path`). When --all is passed, scans the whole
 * working tree instead.
 */
function gatherCandidateContent(scanAll: boolean): Map<string, string> {
  if (scanAll) {
    const files = execSync('git ls-files', { encoding: 'utf8' })
      .split('\n')
      .filter((f) => f.length > 0)
      .filter((f) => !isAllowlisted(f));
    const m = new Map<string, string>();
    for (const f of files) {
      try {
        const content = execSync(`git show HEAD:${JSON.stringify(f)}`, { encoding: 'utf8' });
        m.set(f, content);
      } catch {
        // file may be newly added / untracked; skip
      }
    }
    return m;
  }

  // Staged diff mode (pre-commit / preflight).
  const diff = execSync('git diff --cached --unified=0', { encoding: 'utf8' });
  const m = new Map<string, string>();
  let currentPath: string | null = null;
  let buffer: string[] = [];
  const flush = () => {
    if (currentPath && buffer.length > 0) {
      const existing = m.get(currentPath) ?? '';
      m.set(currentPath, existing + buffer.join('\n') + '\n');
      buffer = [];
    }
  };
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      flush();
      currentPath = line.slice(6);
      continue;
    }
    if (line.startsWith('--- ') || line.startsWith('diff ')) continue;
    if (line.startsWith('@@')) continue;
    if (line.startsWith('+')) {
      buffer.push(line.slice(1));
    }
  }
  flush();
  return m;
}

type Hit = { path: string; pattern: string; severity: 'public' | 'secret'; sample: string };

function scan(content: Map<string, string>): Hit[] {
  const hits: Hit[] = [];
  for (const [path, body] of content) {
    if (isAllowlisted(path)) continue;
    for (const { name, regex, severity } of PATTERNS) {
      const matches = body.match(regex);
      if (!matches) continue;
      for (const sample of matches) {
        // Redact most of the matched string so the script's own
        // error output doesn't leak the secret further than the
        // diff already did.
        const redacted = sample.slice(0, Math.min(12, sample.length)) + '…' + sample.slice(-4);
        hits.push({ path, pattern: name, severity, sample: redacted });
      }
    }
  }
  return hits;
}

function main(): number {
  const args = new Set(process.argv.slice(2));
  const scanAll = args.has('--all');

  let content: Map<string, string>;
  try {
    content = gatherCandidateContent(scanAll);
  } catch (err) {
    console.error(`[check-no-secrets] git command failed: ${String((err as Error).message)}`);
    return 2;
  }

  const hits = scan(content);
  if (hits.length === 0) {
    if (!process.env.SILENT) {
      console.log(
        `[check-no-secrets] ${scanAll ? 'tree' : 'staged diff'} clean (${content.size} file(s) checked)`,
      );
    }
    return 0;
  }

  console.error(
    `\n[check-no-secrets] ✗ ${hits.length} credential-shaped match(es) in tracked files:\n`,
  );
  for (const hit of hits) {
    console.error(`  ${hit.path}`);
    console.error(`    pattern: ${hit.pattern} (severity: ${hit.severity})`);
    console.error(`    sample:  ${hit.sample}\n`);
  }
  console.error('To allowlist a known false-positive, add the path to ALLOWLIST_PATTERNS');
  console.error('in scripts/check-no-secrets.ts. Do NOT use --no-verify to bypass —');
  console.error('rotate any leaked credential first.\n');
  return 1;
}

const code = main();
if (code !== 0) process.exit(code);
