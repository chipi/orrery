#!/usr/bin/env node
/**
 * Version drift gate: every committed file that carries the app version must
 * match package.json.
 *
 * package.json is the one source (docs/guides/mobile-build-and-deploy.md), but
 * some files copy it when they are generated, and a version bump that does not
 * regenerate them leaves them behind. 0.9.2 shipped to staging and prod with
 * data/offline-manifest.json still saying 0.9.1, and the tech BOM said 0.9.1 too.
 *
 *   node scripts/check-version-sync.mjs   # exit 1 and list each file that differs
 *
 * Fix by regenerating, not by editing the version by hand:
 *   offline manifest      node scripts/mobile/build-offline-manifest.mjs
 *   tech BOM (json + md)  npm run build-tech-bom
 *   iOS MARKETING_VERSION node scripts/mobile/sync-native-version.mjs
 *   CHANGELOG             add a `## [X.Y.Z]` section for the version being worked on
 *
 * Wired into validate-data, so preflight and CI fail on drift.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const version = JSON.parse(read('package.json')).version;
const lock = JSON.parse(read('package-lock.json'));

/** [file, version found (string, or array for files with several copies), how to fix] */
const found = [
  ['package-lock.json', [lock.version, lock.packages?.['']?.version], 'npm install'],
  [
    'static/data/offline-manifest.json',
    JSON.parse(read('static/data/offline-manifest.json')).version,
    'node scripts/mobile/build-offline-manifest.mjs',
  ],
  [
    'static/data/tech-bom.json',
    JSON.parse(read('static/data/tech-bom.json')).metadata?.component?.version,
    'npm run build-tech-bom',
  ],
  [
    'docs/TECH-BOM.md',
    read('docs/TECH-BOM.md').match(/`orrery@([^`]+)`/)?.[1],
    'npm run build-tech-bom',
  ],
  [
    'ios/App/App.xcodeproj/project.pbxproj',
    [
      ...read('ios/App/App.xcodeproj/project.pbxproj').matchAll(/MARKETING_VERSION = ([^;]+);/g),
    ].map((m) => m[1]),
    'node scripts/mobile/sync-native-version.mjs',
  ],
  [
    'CHANGELOG.md',
    read('CHANGELOG.md')
      .split('\n')
      .some((l) => l.startsWith(`## [${version}]`))
      ? version
      : 'no section',
    `add a "## [${version}]" section`,
  ],
];

const bad = [];
for (const [file, value, fix] of found) {
  const values = Array.isArray(value) ? value : [value];
  if (values.length === 0 || values.some((v) => v !== version)) {
    bad.push(`  ${file}: ${values.length ? values.join(', ') : 'not found'}  →  ${fix}`);
  }
}

if (bad.length) {
  console.error(
    `✗ version drift: package.json is ${version}, these files differ:\n${bad.join('\n')}`,
  );
  process.exit(1);
}
console.log(`✅ version ${version} matches in ${found.length} files.`);
