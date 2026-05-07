/**
 * Build maps from combined chunks, apply to overlays, sync enums from en-US.
 *
 * Run from repo root: node scripts/wave23/run-wave23-overlay-locales.mjs
 */
import { spawnSync } from 'node:child_process';
import process from 'node:process';

const locales = ['zh-CN', 'ja', 'ko', 'hi', 'ar', 'ru'];

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(process.execPath, ['scripts/wave23/build-maps-from-combined-chunks.mjs']);
for (const locale of locales) {
  run(process.execPath, ['scripts/wave23/apply-translations.mjs', locale]);
}
run(process.execPath, ['scripts/wave23/sync-i18n-enums-from-en-us.mjs']);
