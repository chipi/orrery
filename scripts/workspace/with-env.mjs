#!/usr/bin/env node
// with-env.mjs — run a command with the checkout's `.env.workspace` values as
// defaults (the shell environment wins), plus optional `--default KEY=VALUE`
// fallbacks applied last; `${KEY}` in a fallback expands from the result, and
// `${CHECKOUT}` is the directory the command runs in (the checkout root under
// `npm run`) — for per-checkout paths that must work with no .env.workspace.
//
//   node scripts/workspace/with-env.mjs \
//     --default 'LAB_PORT=8093' --default 'LAB_ISSUER=http://localhost:${LAB_PORT}' \
//     -- tsx server/lab-api/main.ts
//
// Used by the lab-api / mcp dev scripts, which don't load env files themselves.
import { execFileSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readWorkspaceEnv } from './env.mjs';

/**
 * Pure: the env a command should run with.
 * @param {Record<string, string | undefined>} baseEnv
 * @param {Record<string, string>} workspaceEnv
 * @param {string[]} defaults
 * @param {string} [cwd] value of `${CHECKOUT}` in a default
 * @returns {Record<string, string | undefined>}
 */
export function buildEnv(baseEnv, workspaceEnv, defaults, cwd = process.cwd()) {
  const env = { ...baseEnv };
  for (const [k, v] of Object.entries(workspaceEnv)) {
    if (env[k] === undefined || env[k] === '') env[k] = v;
  }
  for (const spec of defaults) {
    const eq = spec.indexOf('=');
    if (eq <= 0) throw new Error(`--default expects KEY=VALUE, got '${spec}'`);
    const key = spec.slice(0, eq);
    if (env[key] !== undefined && env[key] !== '') continue;
    env[key] = spec
      .slice(eq + 1)
      .replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (_, name) =>
        name === 'CHECKOUT' ? cwd : (env[name] ?? ''),
      );
  }
  return env;
}

/**
 * Pure: split argv into `--default` specs and the command.
 * @param {string[]} argv
 * @returns {{ defaults: string[], command: string[] }}
 */
export function parseArgs(argv) {
  /** @type {string[]} */
  const defaults = [];
  let i = 0;
  for (; i < argv.length; i++) {
    if (argv[i] === '--') break;
    if (argv[i] === '--default' && i + 1 < argv.length) defaults.push(argv[++i]);
    else
      throw new Error(
        `unexpected argument '${argv[i]}' (usage: with-env.mjs [--default K=V]... -- cmd ...)`,
      );
  }
  const command = argv.slice(i + 1);
  if (command.length === 0) throw new Error('no command after --');
  return { defaults, command };
}

/** The current git branch, or undefined on a detached HEAD or outside git. */
function gitBranch() {
  try {
    const b = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return b && b !== 'HEAD' ? b : undefined;
  } catch {
    return undefined;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`with-env: ${/** @type {Error} */ (err).message}`);
    process.exit(2);
  }
  const env = buildEnv(process.env, readWorkspaceEnv(), parsed.defaults);
  // The dev telemetry contract tags a local server's logs, traces and errors with the
  // checkout's branch (server/observability reads ORRERY_WORKTREE in dev only), as vite.config
  // does for the browser. A detached HEAD or no git leaves it unset.
  if (!env.ORRERY_WORKTREE) {
    const branch = gitBranch();
    if (branch) env.ORRERY_WORKTREE = branch;
  }
  const [cmd, ...args] = parsed.command;
  const child = spawn(cmd, args, { stdio: 'inherit', env });
  child.on('error', (err) => {
    console.error(`with-env: ${err.message}`);
    process.exit(127);
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 1);
  });
}
