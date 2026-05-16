#!/usr/bin/env node
/**
 * `npm run release:rehearsal vX.Y.Z` — codifies the AGENTS.md
 * §"Before tagging or releasing" checklist as a single command.
 *
 * Runs (fail-closed) on the local machine:
 *
 *   1. preflight        — typecheck / lint / unit / validate / build
 *   2. e2e desktop      — npx playwright test --project=desktop-chromium
 *   3. e2e mobile       — npx playwright test --project=mobile-chromium
 *   4. CHANGELOG extract — pulls the `## [X.Y.Z]` block from CHANGELOG.md
 *                          into /tmp/release-body-vX.Y.Z.md
 *   5. gh release draft  — creates a DRAFT release tied to the named
 *                          tag (does NOT push the tag, does NOT mark
 *                          the release as published). Human reviewer
 *                          flips it to published after smoke-testing.
 *
 * Any non-zero exit code from steps 1-4 stops the run; the failing
 * step is named so re-running individual steps is cheap. Step 5 is
 * idempotent — re-runs against an existing draft update the body
 * rather than failing.
 *
 * The rule this enforces: "the pre-push hook is not enough to ship a
 * release." Preflight excludes e2e. CI runs e2e on push-to-main, but
 * if e2e is red on the tagged commit the GH Pages deploy never fires
 * and shipping turns into a CI ping-pong. Closes GH issue #134.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const VERSION_PATTERN = /^v\d+\.\d+\.\d+(?:-[\w.]+)?$/;

const argVersion = process.argv[2];
if (!argVersion || !VERSION_PATTERN.test(argVersion)) {
  console.error('Usage: npm run release:rehearsal vX.Y.Z');
  console.error('Examples: vX.Y.Z = v0.6.2, v0.6.2-rc1, v1.0.0');
  process.exit(2);
}
const version = argVersion; // e.g. "v0.6.2"
const versionBare = version.replace(/^v/, ''); // e.g. "0.6.2"

const repoRoot = resolve(import.meta.dirname, '..');

const log = (msg: string): void => {
  console.log(`\n\x1b[36m▶ ${msg}\x1b[0m`);
};
const ok = (msg: string): void => {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
};
const fail = (step: string, exitCode: number): never => {
  console.error(`\n\x1b[31m✗ ${step} failed (exit ${exitCode})\x1b[0m`);
  console.error(
    `Re-run that step alone, fix, then re-invoke this script. Don't tag until everything is green.`,
  );
  process.exit(exitCode);
};

function run(cmd: string, args: string[], stepLabel: string): void {
  log(stepLabel);
  console.log(`  $ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: repoRoot,
    env: process.env,
  });
  if (result.status !== 0) {
    fail(stepLabel, result.status ?? 1);
  }
  ok(`${stepLabel} green`);
}

// ─── Step 1: preflight ─────────────────────────────────────────────
run('npm', ['run', 'preflight'], 'preflight (typecheck / lint / unit / validate / build)');

// ─── Step 2 + 3: e2e on both projects ─────────────────────────────
// `--workers=1` matches CI (the preview server can crash under
// concurrent rAF / canvas tests on the default 2-worker setup).
// `npm run build` already ran inside preflight, so the test:e2e
// script's build step is a no-op cache hit — but we skip the npm-
// scripts wrapper and call playwright directly so a chained `&& build`
// in test:e2e doesn't double-build.
run(
  'npx',
  ['playwright', 'test', '--workers=1', '--project=desktop-chromium'],
  'e2e desktop-chromium',
);
run(
  'npx',
  ['playwright', 'test', '--workers=1', '--project=mobile-chromium'],
  'e2e mobile-chromium',
);

// ─── Step 4: extract the CHANGELOG body for this version ──────────
log(`extracting CHANGELOG body for ${version}`);
const changelogPath = resolve(repoRoot, 'CHANGELOG.md');
if (!existsSync(changelogPath)) {
  fail('CHANGELOG.md missing', 1);
}
const changelog = readFileSync(changelogPath, 'utf-8');

// Regex matches `## [X.Y.Z]` … up to (but not including) the next
// `## [` heading or EOF. Section header line itself is dropped so the
// body starts with the prose paragraph.
const sectionRe = new RegExp(
  `^## \\[${versionBare.replace(/\./g, '\\.')}\\][^\\n]*\\n([\\s\\S]*?)(?=\\n## \\[|$)`,
  'm',
);
const match = changelog.match(sectionRe);
if (!match || !match[1].trim()) {
  console.error(
    `\x1b[31m✗\x1b[0m CHANGELOG.md has no \`## [${versionBare}]\` section yet.\n` +
      `   Add the section first (and remember to drop a release date), then re-run.`,
  );
  process.exit(1);
}
const releaseBody = match[1].trim();
const bodyPath = `/tmp/release-body-${version}.md`;
writeFileSync(bodyPath, releaseBody);
ok(`CHANGELOG body written to ${bodyPath} (${releaseBody.length} chars)`);
console.log(
  '\n  Preview:\n' +
    releaseBody
      .split('\n')
      .slice(0, 10)
      .map((l) => `    ${l}`)
      .join('\n') +
    '\n    …',
);

// ─── Step 5: create / update the DRAFT GH Release ─────────────────
log(`creating draft GH Release for ${version}`);

// Check if `gh` is available + authenticated; if not, skip step 5
// gracefully so the rehearsal still counts as green (preflight + e2e
// passed; the user just needs to run `gh release create` manually).
const ghCheck = spawnSync('gh', ['auth', 'status'], { stdio: 'pipe' });
if (ghCheck.status !== 0) {
  console.warn(
    '\x1b[33m!\x1b[0m gh CLI not authenticated — skipping draft release. Run manually:\n' +
      `    gh release create ${version} --draft --title "${version} — short headline" --notes-file ${bodyPath}`,
  );
} else {
  // Existing release? `gh release view` exits 0 if found.
  const existsCheck = spawnSync('gh', ['release', 'view', version], {
    stdio: 'pipe',
  });
  if (existsCheck.status === 0) {
    // Update the existing draft's body.
    run(
      'gh',
      ['release', 'edit', version, '--notes-file', bodyPath],
      `updating existing release ${version}`,
    );
  } else {
    // Create a new draft. Title defaults to the version; the human
    // tagger can `gh release edit` it to a real headline before
    // marking published.
    run(
      'gh',
      ['release', 'create', version, '--draft', '--title', `${version}`, '--notes-file', bodyPath],
      `creating draft release ${version}`,
    );
  }
}

// ─── Final summary ────────────────────────────────────────────────
console.log(`
\x1b[32m═══════════════════════════════════════════════════════════════════\x1b[0m
\x1b[32m✓ Release rehearsal for ${version} complete. \x1b[0m

  Next steps (manual, in this order):

    1. Bump package.json version to ${versionBare} if not already done.
    2. Commit the bump:
         git commit -am "chore(release): ${version}"
    3. Push and tag:
         git push origin main
         git tag -a ${version} -m "${version} — <headline>"
         git push origin ${version}
    4. Wait for the CI + e2e workflows to go green on main.
    5. Publish the draft GH Release:
         gh release edit ${version} --draft=false --latest
    6. The Deploy preview workflow auto-fires from the e2e success.
       If e2e is red on the tagged commit, force the deploy:
         gh workflow run "Deploy preview" --ref main

  Release-readiness rule lived up to: preflight + e2e both green
  locally BEFORE any tag landed.

\x1b[32m═══════════════════════════════════════════════════════════════════\x1b[0m
`);
