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
}

const TASKS: Task[] = [
  { name: 'validate-data', cmd: 'tsx', args: ['scripts/validate-data.ts'] },
  { name: 'validate-diagrams', cmd: 'tsx', args: ['scripts/validate-diagrams.ts'] },
  {
    name: 'check-science-map-refs',
    cmd: 'tsx',
    args: ['scripts/cislunar/check-science-map-refs.ts'],
  },
  { name: 'check-tech-bom', cmd: 'tsx', args: ['scripts/build-tech-bom.ts', '--check'] },
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

const overallStartedAt = Date.now();
const results = await Promise.all(TASKS.map(runTask));
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
  `\n──── parallel validate-data: ${verdict} (wall-clock ${overallSec}s) ────\n`,
);

process.exit(worstExit);
