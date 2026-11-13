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
  { name: 'check-version-sync', cmd: 'node', args: ['scripts/check-version-sync.mjs'] },
  // A bare paraglide compile writes src/paraglide/, which empties svelte-check's program.
  { name: 'check-stray-paraglide', cmd: 'node', args: ['scripts/check-stray-paraglide.mjs'] },
  // In-app links held in data, overlays and messages (every locale): route,
  // query parameter and selected id must exist. Panel links never reach the
  // prerendered HTML that check-internal-links.mjs reads.
  { name: 'check-data-links', cmd: 'node', args: ['scripts/check-data-links.mjs'] },
  // Translation defects that are never legitimate (2026-10-17 audit, plan 9b):
  // placeholder tokens, Russian in Serbian, Latin letters inside Cyrillic words,
  // another language's script, Latin-script Serbian, English spelled in Cyrillic.
  // Untranslated/englishProse/truncated stay out: they have legitimate cases (names,
  // quotes) and are reviewed through i18n-audit instead.
  {
    name: 'check-i18n-defects',
    cmd: 'node',
    args: [
      'scripts/i18n-detect.mjs',
      '--gate=placeholder,russianInSr,mixedWord,foreignScript,latinSerbian,phoneticEnglish,corrupted',
    ],
  },
  // Names of vehicles, missions and agencies kept as in English outside their origin
  // locale, in every translated string — pages and UI (2026-10-18; ko 화성 익스프레스
  // for Mars Express and ~115 more had passed every earlier check).
  {
    name: 'check-i18n-name-drift',
    cmd: 'node',
    args: ['scripts/i18n-tools/name-drift-scan.mjs'],
  },
  // A number in the English that the translation lost or changed (the hill-sphere "80×" for
  // 333,000×), over every tree and locale. A finding is fixed in i18n-src or recorded, with a
  // reason and a hash of both texts, in number-drift-reviewed.json (2026-11-09; zero unreviewed).
  {
    name: 'check-i18n-number-drift',
    cmd: 'node',
    args: ['scripts/i18n-tools/number-drift.mjs', 'tree=all', '--gate'],
  },
  // A translation shorter than the English by a sentence (dropped sentences / clauses), every tree
  // and locale; reviewed ones live in dropped-sentences-reviewed.json.
  {
    name: 'check-i18n-dropped-sentences',
    cmd: 'node',
    args: ['scripts/i18n-tools/dropped-sentences.mjs', 'tree=all', '--gate'],
  },
  // A translation far shorter or longer than the English for its locale (a dropped clause, English left
  // in and the translation appended); bounds per locale and kind in length-ratio-bounds.json, reviewed
  // ones in length-ratio-reviewed.json.
  {
    name: 'check-i18n-length-ratio',
    cmd: 'node',
    args: ['scripts/i18n-tools/length-ratio.mjs', '--gate'],
  },
  // An English string edited (or added) after the translations were last checked against it. CI has
  // no git history, so the English each translation was made from is a committed manifest of hashes;
  // after re-checking the translations of what this lists, refresh it (stale-overlays.mjs --manifest=write).
  {
    name: 'check-i18n-en-source',
    cmd: 'node',
    args: ['scripts/i18n-tools/stale-overlays.mjs', '--manifest=check'],
  },
  // Translation coverage: a missing file or key, an empty string, placeholder text, a type or length
  // mismatch, or a string left identical to the English — overlays and UI messages, every locale.
  // A string that is right as it is (a name kept in English) is in coverage-reviewed.json.
  {
    name: 'check-i18n-coverage',
    cmd: 'node',
    args: ['scripts/i18n-coverage-scan.mjs', '--gate'],
  },
  { name: 'validate-satellites', cmd: 'tsx', args: ['scripts/validate-satellites.ts'] },
  { name: 'validate-universe-stars', cmd: 'tsx', args: ['scripts/validate-universe-stars.ts'] },
  {
    name: 'validate-hero-coverage',
    cmd: 'tsx',
    args: ['scripts/validate-hero-coverage.ts'],
    groups: ['image'],
  },
  // Flown-vehicle galleries: a concept, illustration or computer graphic says so in the provenance
  // title and the alt text (Rule B), and a hero is a photograph unless the vehicle is PLANNED or the
  // slot is waived (Rule A; today's concept heroes are frozen in hero-concept-baseline.json). ADR-053.
  {
    name: 'validate-image-depiction',
    cmd: 'tsx',
    args: ['scripts/validate-image-depiction.ts'],
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
  {
    // Every gallery image has a credit row; placeholder credits do not grow.
    name: 'validate-gallery-credits',
    cmd: 'tsx',
    args: ['scripts/validate-gallery-credits.ts'],
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
