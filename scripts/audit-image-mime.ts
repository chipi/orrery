#!/usr/bin/env tsx
/**
 * Walk `static/images/**\/*.jpg` and verify every file's first 3
 * bytes are the JPEG SOI marker (`ff d8 ff`). Exits non-zero on any
 * mismatch.
 *
 * GH #251: 110 fleet-gallery files have `.jpg` extensions but raw
 * PNG bytes (downloader copied source URL bodies without re-encode).
 * Wired into `npm run preflight` via validate-data.ts so future
 * regressions are caught in CI.
 *
 * Usage:
 *   npx tsx scripts/audit-image-mime.ts            # report only, exit 1 if mismatched
 *   npx tsx scripts/audit-image-mime.ts --repair   # re-encode flagged files in place
 *   npx tsx scripts/audit-image-mime.ts --quiet    # CI-friendly (only failures + summary)
 */

import path from 'node:path';
import { promises as fs } from 'node:fs';

import { isJpegBytes, coerceToJpeg } from './lib/image-bytes.ts';

const ROOT = path.resolve(import.meta.dirname ?? '.', '..');
const SCAN_ROOT = path.join(ROOT, 'static', 'images');

interface Args {
  repair: boolean;
  quiet: boolean;
}

function parseArgs(argv: string[]): Args {
  return {
    repair: argv.includes('--repair'),
    quiet: argv.includes('--quiet'),
  };
}

async function walkJpegs(dir: string, out: string[]): Promise<void> {
  let entries: import('node:fs').Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw e;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkJpegs(full, out);
    } else if (entry.isFile() && /\.jpe?g$/i.test(entry.name)) {
      out.push(full);
    }
  }
}

async function checkFile(filePath: string): Promise<boolean> {
  const fd = await fs.open(filePath, 'r');
  try {
    const buf = Buffer.alloc(3);
    await fd.read(buf, 0, 3, 0);
    return isJpegBytes(buf);
  } finally {
    await fd.close();
  }
}

async function repairFile(filePath: string): Promise<void> {
  const srcBuf = await fs.readFile(filePath);
  const jpegBuf = await coerceToJpeg(srcBuf);
  await fs.writeFile(filePath, jpegBuf);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const jpegs: string[] = [];
  await walkJpegs(SCAN_ROOT, jpegs);

  if (!args.quiet) {
    console.log(`Scanning ${jpegs.length} .jpg files under ${path.relative(ROOT, SCAN_ROOT)}/…`);
  }

  const mismatched: string[] = [];
  for (const f of jpegs) {
    try {
      if (!(await checkFile(f))) mismatched.push(f);
    } catch (e) {
      console.error(`  ! ${path.relative(ROOT, f)} — read error: ${(e as Error).message}`);
      mismatched.push(f);
    }
  }

  if (mismatched.length === 0) {
    if (!args.quiet) console.log(`✓ All ${jpegs.length} files have valid JPEG magic bytes.`);
    return;
  }

  console.log(
    `${args.repair ? 'Repairing' : 'Found'} ${mismatched.length} file(s) with .jpg extension but non-JPEG bytes:`,
  );
  for (const f of mismatched) {
    const rel = path.relative(ROOT, f);
    if (args.repair) {
      try {
        await repairFile(f);
        console.log(`  ✓ repaired ${rel}`);
      } catch (e) {
        console.log(`  ✗ FAILED ${rel} — ${(e as Error).message}`);
      }
    } else {
      console.log(`  - ${rel}`);
    }
  }

  if (args.repair) {
    // Re-scan to confirm.
    const stillBad: string[] = [];
    for (const f of mismatched) {
      if (!(await checkFile(f))) stillBad.push(f);
    }
    if (stillBad.length > 0) {
      console.error(`\n✗ ${stillBad.length} file(s) still mismatched after repair:`);
      for (const f of stillBad) console.error(`  - ${path.relative(ROOT, f)}`);
      process.exit(1);
    }
    console.log(`\n✓ All ${mismatched.length} files repaired and re-verified.`);
    return;
  }

  console.error(
    `\nTo repair in place: npx tsx scripts/audit-image-mime.ts --repair\n` +
      `(See GH #251 for context. All fetchers should call coerceToJpeg() to prevent regression.)`,
  );
  process.exit(1);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
