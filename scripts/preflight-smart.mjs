#!/usr/bin/env node
/**
 * Smart preflight — reads `git diff` against origin/main and runs only
 * the subset of checks whose inputs actually changed.
 *
 * Falls back to FULL preflight whenever the change set isn't safely
 * narrowable (config files, unrecognised paths, errors reading git).
 *
 * Routing matrix (mirrors the README's preflight doc):
 *
 *   docs/.md only           -> check-no-secrets
 *   static/data/** only     -> validate-data + build
 *   messages/*.json only    -> i18n:compile + typecheck + build
 *   src/**.svelte/.ts only  -> typecheck + lint + vitest --changed + build
 *   *.test.ts only          -> vitest --changed + build
 *   static/audio/** only    -> audio:check-cost + build
 *   vite/tsconfig/package   -> FULL (config changes ripple)
 *   anything else           -> FULL (conservative)
 *
 * Manual escape: `npm run preflight:full` always runs every step.
 *
 * Honours OFFLINE preflight (skip `git fetch`) via PREFLIGHT_OFFLINE=1
 * (e.g. CI runners with no network).
 */

import { execSync, spawnSync } from 'node:child_process';

const log = (msg) => console.log(`▶ ${msg}`);
const sh = (cmd) => execSync(cmd, { encoding: 'utf-8' });

function fetchBase() {
  if (process.env.PREFLIGHT_OFFLINE === '1') {
    log('PREFLIGHT_OFFLINE=1 — skipping `git fetch origin main`');
    return;
  }
  try {
    log('fetching origin/main (silent)…');
    execSync('git fetch --quiet origin main', { stdio: 'pipe' });
  } catch {
    log('fetch failed (likely offline) — diffing against local origin/main as-is');
  }
}

function getChangedFiles() {
  // Diff every commit on HEAD that is not yet on origin/main, plus
  // uncommitted working-tree changes. Empty if everything has shipped.
  let committed = '';
  let workingTree = '';
  try {
    committed = sh('git diff --name-only origin/main...HEAD').trim();
  } catch {
    log('could not diff against origin/main — full preflight');
    return null;
  }
  try {
    workingTree = sh('git diff --name-only HEAD').trim();
  } catch {
    /* swallow */
  }
  const set = new Set();
  for (const line of (committed + '\n' + workingTree).split('\n')) {
    const trimmed = line.trim();
    if (trimmed) set.add(trimmed);
  }
  // Generated paraglide bundles regenerate from messages/*.json and
  // appear in every diff — strip so they don't trigger spurious work.
  for (const path of [...set]) {
    if (path.startsWith('src/lib/paraglide/')) set.delete(path);
  }
  return [...set];
}

// Top-level config-file basenames whose changes ripple unpredictably
// across the whole build. Any of these → full preflight.
const CONFIG_BASENAMES = new Set([
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'vite.config.ts',
  'vite.config.js',
  'svelte.config.js',
  'tsconfig.json',
  'eslint.config.js',
  'eslint.config.mjs',
  'playwright.config.ts',
  'vitest.config.ts',
  'tailwind.config.js',
  'postcss.config.js',
  '.prettierrc',
  '.prettierrc.json',
  '.eslintignore',
  '.gitignore',
  '.npmrc',
  'project.inlang',
]);

const MATCHERS = {
  isConfig: (p) =>
    CONFIG_BASENAMES.has(p) ||
    p.startsWith('.husky/') ||
    p.startsWith('.github/') ||
    p.startsWith('project.inlang/') ||
    p.startsWith('scripts/'),
  isDoc: (p) => /^(docs\/|README|CLAUDE|AGENTS|CHANGELOG|.*\.md$|.*\.mdx$)/.test(p),
  isData: (p) => p.startsWith('static/data/'),
  isMessages: (p) => p.startsWith('messages/') && p.endsWith('.json'),
  isAudio: (p) =>
    p.startsWith('static/audio/') || p.startsWith('scripts/audio/'),
  isTest: (p) => /\.(test|spec)\.(ts|js|svelte)$/.test(p),
  isCode: (p) =>
    /\.(svelte|ts|js|mjs)$/.test(p) &&
    !p.startsWith('src/lib/paraglide/') &&
    !/\.(test|spec)\./.test(p),
  isStaticAsset: (p) =>
    p.startsWith('static/') &&
    !p.startsWith('static/data/') &&
    !p.startsWith('static/audio/'),
};

function categorize(files) {
  const cats = {
    doc: 0,
    data: 0,
    messages: 0,
    audio: 0,
    test: 0,
    code: 0,
    config: 0,
    staticAsset: 0,
    other: 0,
  };
  const otherFiles = [];
  for (const f of files) {
    if (MATCHERS.isConfig(f)) cats.config++;
    else if (MATCHERS.isMessages(f)) cats.messages++;
    else if (MATCHERS.isDoc(f)) cats.doc++;
    else if (MATCHERS.isData(f)) cats.data++;
    else if (MATCHERS.isAudio(f)) cats.audio++;
    else if (MATCHERS.isTest(f)) cats.test++;
    else if (MATCHERS.isCode(f)) cats.code++;
    else if (MATCHERS.isStaticAsset(f)) cats.staticAsset++;
    else {
      cats.other++;
      otherFiles.push(f);
    }
  }
  return { cats, otherFiles };
}

function pickPlan({ cats, otherFiles }) {
  // Any config change OR any unknown path → full.
  if (cats.config > 0) return { mode: 'full', reason: 'config files changed' };
  if (cats.other > 0)
    return {
      mode: 'full',
      reason: `unrecognised paths (${otherFiles.slice(0, 3).join(', ')}${otherFiles.length > 3 ? ' …' : ''})`,
    };
  // Only docs / commit-message edits → just secret scan.
  if (cats.doc > 0 && cats.data + cats.messages + cats.audio + cats.test + cats.code + cats.staticAsset === 0) {
    return { mode: 'docs', reason: 'docs-only change' };
  }
  // Only data → validate-data + build.
  if (cats.data > 0 && cats.code + cats.messages + cats.audio + cats.test + cats.staticAsset === 0) {
    return { mode: 'data', reason: 'data-only change' };
  }
  // Only messages → i18n + typecheck + build.
  if (cats.messages > 0 && cats.code + cats.data + cats.audio + cats.test + cats.staticAsset === 0) {
    return { mode: 'messages', reason: 'i18n-only change' };
  }
  // Only audio → audio cost + build.
  if (cats.audio > 0 && cats.code + cats.data + cats.messages + cats.test + cats.staticAsset === 0) {
    return { mode: 'audio', reason: 'audio-only change' };
  }
  // Only test files → vitest --changed + build.
  if (cats.test > 0 && cats.code + cats.data + cats.messages + cats.audio + cats.staticAsset === 0) {
    return { mode: 'tests', reason: 'tests-only change' };
  }
  // Source code changes (with or without tests/messages/data) → typecheck + lint + vitest --changed + build.
  if (cats.code > 0) return { mode: 'code', reason: 'source-code change' };
  // Static asset (images, etc.) only → build (so 404 manifest is regenerated).
  if (cats.staticAsset > 0) return { mode: 'static', reason: 'static-asset-only change' };
  // Nothing to check — defensive.
  return { mode: 'noop', reason: 'no relevant changes' };
}

function run(label, program, args) {
  log(label);
  const r = spawnSync(program, args, { stdio: 'inherit', shell: false });
  if (r.status !== 0) {
    console.error(`✗ ${label} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

function runShell(label, line) {
  log(label);
  const r = spawnSync('/bin/sh', ['-c', line], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`✗ ${label} failed (exit ${r.status})`);
    process.exit(r.status ?? 1);
  }
}

const PLAN_TO_STEPS = {
  full: [['Full preflight (mirror of CI)', 'npm', ['run', 'preflight:full:body']]],
  docs: [['check-no-secrets', 'npm', ['run', 'check-no-secrets:all']]],
  noop: [['noop', 'true', []]],
};

// Build the dispatch steps for mode "code", "tests", "data", "messages",
// "audio", "static". Each mode is materialised as a list of [label, cmd, args].
function planSteps(mode) {
  if (PLAN_TO_STEPS[mode]) return PLAN_TO_STEPS[mode];
  switch (mode) {
    case 'code':
      return [
        ['typecheck', 'npm', ['run', 'typecheck']],
        ['lint', 'npm', ['run', 'lint']],
        ['tests (--changed)', 'sh', ['vitest run --passWithNoTests --changed=origin/main']],
        ['validate-data', 'npm', ['run', 'validate-data']],
        ['check-no-secrets', 'npm', ['run', 'check-no-secrets:all']],
        ['build', 'npm', ['run', 'build']],
      ];
    case 'tests':
      return [
        ['tests (--changed)', 'sh', ['vitest run --passWithNoTests --changed=origin/main']],
        ['check-no-secrets', 'npm', ['run', 'check-no-secrets:all']],
        ['build', 'npm', ['run', 'build']],
      ];
    case 'data':
      return [
        ['validate-data', 'npm', ['run', 'validate-data']],
        ['check-no-secrets', 'npm', ['run', 'check-no-secrets:all']],
        ['build', 'npm', ['run', 'build']],
      ];
    case 'messages':
      return [
        ['i18n:compile', 'npm', ['run', 'i18n:compile']],
        ['typecheck', 'npm', ['run', 'typecheck']],
        ['check-no-secrets', 'npm', ['run', 'check-no-secrets:all']],
        ['build', 'npm', ['run', 'build']],
      ];
    case 'audio':
      return [
        ['audio:check-cost', 'npm', ['run', 'audio:check-cost']],
        ['check-no-secrets', 'npm', ['run', 'check-no-secrets:all']],
        ['build', 'npm', ['run', 'build']],
      ];
    case 'static':
      return [
        ['check-no-secrets', 'npm', ['run', 'check-no-secrets:all']],
        ['build', 'npm', ['run', 'build']],
      ];
    default:
      return PLAN_TO_STEPS.full;
  }
}

// ── Entry ─────────────────────────────────────────────────────────
fetchBase();
const files = getChangedFiles();
if (files === null) {
  // Defensive: couldn't read git → run full.
  run('Full preflight (could not read git diff)', 'npm', ['run', 'preflight:full:body']);
  process.exit(0);
}

log(`changed files: ${files.length}`);
const { cats, otherFiles } = categorize(files);
const plan = pickPlan({ cats, otherFiles });

console.log(`▶ smart-preflight plan: ${plan.mode.toUpperCase()} — ${plan.reason}`);
console.log(`  cats: ${JSON.stringify(cats)}`);

if (plan.mode === 'noop') {
  console.log('✓ nothing to do');
  process.exit(0);
}

const steps = planSteps(plan.mode);
for (const [label, cmd, args] of steps) {
  if (cmd === 'sh') runShell(label, args[0]);
  else run(label, cmd, args);
}
console.log('✓ smart-preflight complete');
