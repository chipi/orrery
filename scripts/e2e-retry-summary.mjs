// List the Playwright tests that needed a retry, from the JSON reporter's
// output (playwright.config.ts adds it in CI). Writes a table to
// $GITHUB_STEP_SUMMARY when set, one ::warning:: per retried test, and
// prints the same lines to stdout. Never fails the job: retries are a
// signal to read, the test outcome is already the gate.
//
//   node scripts/e2e-retry-summary.mjs [playwright-results.json] [label]
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const file = process.argv[2] ?? 'playwright-results.json';
const label = process.argv[3] ?? '';

if (!existsSync(file)) {
  console.log(`e2e-retry-summary: ${file} not found (run did not reach the reporter)`);
  process.exit(0);
}

const report = JSON.parse(readFileSync(file, 'utf8'));
const rootDir = report.config?.rootDir ?? '';
const retried = [];
const OUTCOME = { flaky: 'FLAKY', unexpected: 'FAILED', expected: 'PASSED', skipped: 'SKIPPED' };

function walk(suite, titles) {
  const here = suite.title ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? []) {
    for (const t of spec.tests ?? []) {
      const runs = t.results ?? [];
      if (runs.length < 2) continue;
      retried.push({
        where: `${rootDir ? relative(process.cwd(), join(rootDir, spec.file)) : spec.file}:${spec.line}`,
        title: [...here.slice(1), spec.title].join(' › '),
        project: t.projectName,
        attempts: runs.length,
        final: OUTCOME[t.status] ?? String(t.status).toUpperCase(),
        firstError: (runs[0].error?.message ?? '').split('\n')[0].slice(0, 160),
      });
    }
  }
  for (const child of suite.suites ?? []) walk(child, here);
}
for (const s of report.suites ?? []) walk(s, []);

const head = `e2e retries${label ? ` (${label})` : ''}: ${retried.length}`;
console.log(head);
for (const r of retried) {
  const line = `${r.final} after ${r.attempts} attempts: ${r.where} ${r.title}`;
  console.log(`  ${line}`);
  if (process.env.GITHUB_ACTIONS) console.log(`::warning file=${r.where.split(':')[0]}::${line}`);
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const rows = retried.map(
    (r) =>
      `| ${r.final} | ${r.attempts} | \`${r.where}\` | ${r.title.replace(/\|/g, '\\|')} | ${r.firstError.replace(/\|/g, '\\|')} |`,
  );
  const md = [
    `### ${head}`,
    '',
    ...(retried.length
      ? ['| outcome | attempts | test | title | first error |', '|---|---|---|---|---|', ...rows]
      : ['No test needed a retry.']),
    '',
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
}
