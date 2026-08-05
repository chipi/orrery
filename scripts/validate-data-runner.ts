/**
 * Parallel runner for the validate-data pipeline (GH #272 / W2).
 *
 * Replaces the previous `&&` chain in package.json:
 *
 *   tsx scripts/validate-data.ts
 *     && npm run validate-diagrams
 *     && tsx scripts/cislunar/check-science-map-refs.ts
 *     && npm run check-tech-bom
 *
 * Each sub-task is independent (touches different data classes) so
 * serial execution wastes wall-clock on every preflight + CI run.
 * This runner spawns all four concurrently via Promise.all and
 * preserves the previous "any failure → overall fail" semantics by
 * collecting exit codes and re-throwing the worst.
 *
 * Output policy: each sub-task's stdout/stderr is captured and replayed
 * grouped under a header so interleaved log lines from concurrent runs
 * don't garble readability.
 */

import { spawn } from 'node:child_process';

interface Task {
  /** Human-readable name printed in the grouped log header. */
  name: string;
  /** Command + argv. */
  cmd: string;
  args: string[];
  /**
   * Optional group tags. `npm run validate-image-integrity` (and any
   * `validate-data -- --group=<g>`) runs only the tasks tagged with that group.
   * `image` = the complete image-pipeline integrity umbrella (R5): every guard
   * that protects gallery/hero/provenance/credits/phash/variant integrity. The
   * omnibus `validate-data` is included because it carries the inline image
   * gates (license/on-disk/no-dupes, the half-baked-tile Tier-2 variant check,
   * duplicate-manifest routing). Untagged tasks run only in the full pass.
   */
  groups?: string[];
}

const TASKS: Task[] = [
  // validate-data is the omnibus — tagged `image` because it holds the core
  // inline image gates (provenance license/on-disk/dupes, half-baked-tile
  // variant resolve, sidecar dup-manifest) alongside its non-image checks.
  { name: 'validate-data', cmd: 'tsx', args: ['scripts/validate-data.ts'], groups: ['image'] },
  { name: 'validate-diagrams', cmd: 'tsx', args: ['scripts/validate-diagrams.ts'] },
  {
    name: 'check-science-map-refs',
    cmd: 'tsx',
    args: ['scripts/cislunar/check-science-map-refs.ts'],
  },
  { name: 'check-tech-bom', cmd: 'tsx', args: ['scripts/build-tech-bom.ts', '--check'] },
  { name: 'check-doc-counts', cmd: 'node', args: ['scripts/gen-doc-counts.mjs', '--check'] },
  { name: 'validate-satellites', cmd: 'tsx', args: ['scripts/validate-satellites.ts'] },
  { name: 'validate-universe-stars', cmd: 'tsx', args: ['scripts/validate-universe-stars.ts'] },
  {
    name: 'validate-hero-coverage',
    cmd: 'tsx',
    args: ['scripts/validate-hero-coverage.ts'],
    groups: ['image'],
  },
  {
    name: 'validate-image-dupes',
    cmd: 'tsx',
    args: ['scripts/validate-image-dupes.ts'],
    groups: ['image'],
  },
  {
    name: 'validate-image-phash-dupes',
    cmd: 'tsx',
    args: ['scripts/validate-image-phash-dupes.ts'],
    groups: ['image'],
  },
  {
    name: 'validate-gallery-counts',
    cmd: 'tsx',
    args: ['scripts/validate-gallery-counts.ts'],
    groups: ['image'],
  },
  {
    name: 'validate-provenance-walker',
    cmd: 'tsx',
    args: ['scripts/validate-provenance-walker.ts'],
    groups: ['image'],
  },
  {
    name: 'validate-allowlist-discipline',
    cmd: 'tsx',
    args: ['scripts/validate-allowlist-discipline.ts'],
    groups: ['image'],
  },
  {
    name: 'validate-credits-bundling',
    cmd: 'tsx',
    args: ['scripts/validate-credits-bundling.ts'],
    groups: ['image'],
  },
];

interface TaskResult {
  name: string;
  exitCode: number;
  durationMs: number;
  stdout: string;
  stderr: string;
}

function runTask(task: Task): Promise<TaskResult> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(task.cmd, task.args, {
      env: process.env,
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('close', (code) => {
      resolve({
        name: task.name,
        exitCode: code ?? 1,
        durationMs: Date.now() - startedAt,
        stdout,
        stderr,
      });
    });
  });
}

// `--group=<g>` runs only the tasks tagged with that group (e.g. the R5
// image-integrity umbrella). No flag → the full pass.
const groupArg = process.argv.find((a) => a.startsWith('--group='))?.slice('--group='.length);
const selected = groupArg ? TASKS.filter((t) => t.groups?.includes(groupArg)) : TASKS;
if (groupArg && selected.length === 0) {
  process.stderr.write(`validate-data-runner: no tasks in group '${groupArg}'.\n`);
  process.exit(2);
}
const label = groupArg ? `validate-data (group: ${groupArg})` : 'validate-data';

const overallStartedAt = Date.now();
const results = await Promise.all(selected.map(runTask));
const overallDurationMs = Date.now() - overallStartedAt;

let worstExit = 0;
for (const result of results) {
  const status = result.exitCode === 0 ? '✓' : '✗';
  const durationSec = (result.durationMs / 1000).toFixed(1);
  process.stdout.write(`\n──── ${status} ${result.name} (${durationSec}s) ────\n`);
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.exitCode > worstExit) worstExit = result.exitCode;
}

const overallSec = (overallDurationMs / 1000).toFixed(1);
const verdict = worstExit === 0 ? 'all green' : 'failures present';
process.stdout.write(
  `\n──── parallel ${label}: ${verdict} (${selected.length} tasks, wall-clock ${overallSec}s) ────\n`,
);

process.exit(worstExit);
