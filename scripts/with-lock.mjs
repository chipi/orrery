#!/usr/bin/env node
/**
 * with-lock.mjs — POSIX-portable file mutex around a child command.
 *
 * Why this exists:
 *   When two agents / shells run `npm run preflight` (or `npm run build`)
 *   on the same checkout, both vite-plugin-sveltekit-compile invocations
 *   try to `rimraf .svelte-kit/output` concurrently. Whichever loses the
 *   race exits with `ENOTEMPTY, Directory not empty`, failing the build
 *   on a phantom error. The same hazard exists for any tool that writes
 *   into `node_modules/.vite`, `.svelte-kit/`, or `build/`.
 *
 * Strategy:
 *   - Lock = an empty directory at LOCK_DIR (mkdir is atomic on POSIX).
 *   - On collision, poll every 2 s with a CLI breadcrumb so the waiting
 *     terminal isn't silent. Bounded wait — fail after MAX_WAIT_MS so a
 *     deadlocked agent can't hang another forever.
 *   - On acquire, write {pid, ts, cmd} into the lock dir so a stale lock
 *     can be diagnosed by inspecting it. Stale = ts older than STALE_MS;
 *     stale locks are auto-cleared and re-acquired.
 *   - Lock released on normal exit, SIGINT, SIGTERM, and process.exit().
 *     Crashes / SIGKILL leave a stale lock that the next acquire clears.
 *
 * Usage:
 *   node scripts/with-lock.mjs <name> -- <command> [args...]
 *   node scripts/with-lock.mjs preflight -- npm run preflight:body
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const POLL_MS = 2_000;
const STALE_MS = 30 * 60 * 1000; // 30 min — long enough for a slow CI-equivalent local run
const MAX_WAIT_MS = 60 * 60 * 1000; // 1 h — never block longer than that

const dashIdx = process.argv.indexOf('--');
if (dashIdx === -1 || dashIdx < 3) {
  console.error('usage: with-lock.mjs <name> -- <command> [args...]');
  process.exit(2);
}
const name = process.argv[2];
const cmd = process.argv[dashIdx + 1];
const args = process.argv.slice(dashIdx + 2);
if (!cmd) {
  console.error('with-lock: no command after --');
  process.exit(2);
}

const LOCK_DIR = join(tmpdir(), `orrery-${name}.lock`);

function readLockMeta() {
  try {
    return JSON.parse(readFileSync(join(LOCK_DIR, 'meta.json'), 'utf-8'));
  } catch {
    return null;
  }
}

function isStale() {
  if (!existsSync(LOCK_DIR)) return false;
  const meta = readLockMeta();
  if (!meta || typeof meta.ts !== 'number') return true; // unreadable / corrupt
  return Date.now() - meta.ts > STALE_MS;
}

function releaseLock() {
  try {
    rmSync(LOCK_DIR, { recursive: true, force: true });
  } catch {
    // best-effort; nothing meaningful to do here
  }
}

async function acquire() {
  const start = Date.now();
  let notified = false;
  while (true) {
    try {
      mkdirSync(LOCK_DIR);
      writeFileSync(
        join(LOCK_DIR, 'meta.json'),
        JSON.stringify({
          pid: process.pid,
          ts: Date.now(),
          cmd: [cmd, ...args].join(' '),
        }),
      );
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (isStale()) {
        console.warn(`[with-lock:${name}] stale lock at ${LOCK_DIR} — clearing`);
        releaseLock();
        continue;
      }
      if (!notified) {
        const meta = readLockMeta();
        const heldBy = meta?.pid ? `pid ${meta.pid}` : 'unknown';
        const heldFor = meta?.ts ? `${Math.round((Date.now() - meta.ts) / 1000)}s` : 'unknown';
        console.log(
          `[with-lock:${name}] held by ${heldBy} for ${heldFor} (${meta?.cmd ?? ''}) — waiting…`,
        );
        notified = true;
      }
      if (Date.now() - start > MAX_WAIT_MS) {
        console.error(
          `[with-lock:${name}] timed out after ${MAX_WAIT_MS / 60_000}m waiting for ${LOCK_DIR}`,
        );
        process.exit(124);
      }
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

await acquire();

let exiting = false;
function bailOut(code) {
  if (exiting) return;
  exiting = true;
  releaseLock();
  process.exit(code);
}
process.on('exit', releaseLock);
process.on('SIGINT', () => bailOut(130));
process.on('SIGTERM', () => bailOut(143));
process.on('SIGHUP', () => bailOut(129));

const child = spawn(cmd, args, { stdio: 'inherit', shell: false });
child.on('exit', (code, signal) => {
  if (signal) {
    bailOut(128 + (signal === 'SIGTERM' ? 15 : signal === 'SIGINT' ? 2 : 1));
  } else {
    bailOut(code ?? 1);
  }
});
child.on('error', (err) => {
  console.error(`[with-lock:${name}] failed to spawn ${cmd}: ${err.message}`);
  bailOut(127);
});
