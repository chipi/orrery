// Reader for `.env.workspace` — the per-checkout runtime values written by
// `.config/workspace/setup` (ports, URLs, Compose identity; never secrets).
// Contract and precedence: .config/workspace/README.md.
//
// Consumers treat these values as DEFAULTS: the shell environment and the
// user's own `.env*` files always win, and an absent file (CI, a fresh clone,
// a checkout setup never ran in) leaves today's defaults untouched.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const WORKSPACE_ENV_FILE = '.env.workspace';

/**
 * Parse `KEY=value` lines; `#` comments and blank lines are skipped.
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function parseWorkspaceEnv(text) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) continue;
    out[key] = line.slice(eq + 1).trim();
  }
  return out;
}

/**
 * The checkout's `.env.workspace` as a plain object; `{}` when absent.
 * @param {string} [dir]
 * @returns {Record<string, string>}
 */
export function readWorkspaceEnv(dir = process.cwd()) {
  let text;
  try {
    text = readFileSync(join(dir, WORKSPACE_ENV_FILE), 'utf8');
  } catch (err) {
    if (/** @type {NodeJS.ErrnoException} */ (err).code === 'ENOENT') return {};
    throw err;
  }
  return parseWorkspaceEnv(text);
}

/**
 * First non-empty of: explicit value (shell / .env files), workspace value, default.
 * @param {string | undefined} explicit
 * @param {string | undefined} workspace
 * @param {string} fallback
 * @returns {string}
 */
export function pick(explicit, workspace, fallback) {
  if (explicit !== undefined && explicit !== '') return explicit;
  if (workspace !== undefined && workspace !== '') return workspace;
  return fallback;
}

/**
 * The workspace `VITE_*` values Vite should expose to client code
 * (`import.meta.env`): those neither the shell nor an `.env*` file set.
 * `VITE_DEV_PORT` is server config, not a client value. They configure the
 * checkout's local dev server only: `{}` for a build (artifacts keep the
 * production/default values) and under Vitest, which also loads the config with
 * command `serve` — unit tests must not depend on which checkout runs them.
 * @param {Record<string, string>} workspace
 * @param {Record<string, string>} explicit
 * @param {{ command: 'serve' | 'build', vitest: boolean }} opts
 * @returns {Record<string, string>}
 */
export function workspaceClientEnv(workspace, explicit, { command, vitest }) {
  /** @type {Record<string, string>} */
  const out = {};
  if (command !== 'serve' || vitest) return out;
  for (const [key, value] of Object.entries(workspace)) {
    if (key.startsWith('VITE_') && key !== 'VITE_DEV_PORT' && !explicit[key]) out[key] = value;
  }
  return out;
}
