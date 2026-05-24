#!/usr/bin/env tsx
/**
 * Flag a specific image as bad (PRD-018 M6, RFC-022 §8).
 *
 * Appends to static/data/image-curation.json so the next scoring run can:
 *   1. Skip the image entirely (don't re-score rejects).
 *   2. Surface the most-recent ~5 deny reasons as in-context bias in the
 *      next scoring prompt (RFC-022 §8 — wired in scripts/score-images.ts).
 *
 * Usage:
 *   npx tsx scripts/flag-image.ts <path> --reason "<why>"
 *   npx tsx scripts/flag-image.ts --list
 *   npx tsx scripts/flag-image.ts --unflag <path>
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

const CURATION_PATH = path.join('static', 'data', 'image-curation.json');

export interface CurationEntry {
  path: string;
  reason: string;
  flaggedAt: string;
}

interface CurationFile {
  version: '1.0';
  entries: CurationEntry[];
}

function normalisePath(input: string): string {
  let p = input.trim();
  if (p.startsWith('static/')) p = p.slice('static'.length);
  if (!p.startsWith('/')) p = '/' + p;
  return p;
}

async function loadCuration(): Promise<CurationFile> {
  try {
    const raw = await fs.readFile(CURATION_PATH, 'utf-8');
    return JSON.parse(raw) as CurationFile;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: '1.0', entries: [] };
    }
    throw err;
  }
}

async function writeCuration(c: CurationFile): Promise<void> {
  await fs.writeFile(CURATION_PATH, JSON.stringify(c, null, 2) + '\n', 'utf-8');
}

async function flag(targetPath: string, reason: string): Promise<void> {
  const cur = await loadCuration();
  const normalised = normalisePath(targetPath);
  const idx = cur.entries.findIndex((e) => e.path === normalised);
  const entry: CurationEntry = {
    path: normalised,
    reason,
    flaggedAt: new Date().toISOString(),
  };
  if (idx >= 0) {
    cur.entries[idx] = entry;
    console.log(`Updated existing flag: ${normalised}`);
  } else {
    cur.entries.push(entry);
    console.log(`Added new flag: ${normalised}`);
  }
  await writeCuration(cur);
}

async function unflag(targetPath: string): Promise<void> {
  const cur = await loadCuration();
  const normalised = normalisePath(targetPath);
  const before = cur.entries.length;
  cur.entries = cur.entries.filter((e) => e.path !== normalised);
  if (cur.entries.length === before) {
    console.log(`No flag found for ${normalised}`);
    return;
  }
  await writeCuration(cur);
  console.log(`Removed flag: ${normalised}`);
}

async function list(): Promise<void> {
  const cur = await loadCuration();
  if (cur.entries.length === 0) {
    console.log('Curation list is empty.');
    return;
  }
  console.log(`${cur.entries.length} flagged image(s):\n`);
  for (const e of cur.entries.sort((a, b) => b.flaggedAt.localeCompare(a.flaggedAt))) {
    console.log(`  ${e.path}`);
    console.log(`    reason: ${e.reason}`);
    console.log(`    flagged: ${e.flaggedAt}`);
    console.log('');
  }
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      reason: { type: 'string' },
      list: { type: 'boolean' },
      unflag: { type: 'string' },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.list) {
    await list();
    return;
  }
  if (values.unflag) {
    await unflag(values.unflag);
    return;
  }

  const target = positionals[0];
  if (!target) {
    console.error('Usage: flag-image.ts <path> --reason "<why>"');
    console.error('       flag-image.ts --list');
    console.error('       flag-image.ts --unflag <path>');
    process.exit(2);
  }
  if (!values.reason) {
    console.error('Error: --reason is required when flagging an image.');
    process.exit(2);
  }
  await flag(target, values.reason);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
