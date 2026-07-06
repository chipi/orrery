#!/usr/bin/env tsx
// Score images sitting in static/images/_staging/ and write their scores into
// image-vision.json keyed by their MAIN path (/images/<surface>/<id>/<slot>),
// so /dev/staging shows score / category / subject / rejection. Reuses the
// content-keyed vision cache, so re-scoring images the fill already saw is
// free. Fills the gap score-images.ts (provenance-driven) can't cover for
// un-promoted staged files.
//
//   npx tsx scripts/score-staging.ts
try {
  process.loadEnvFile('.env');
} catch {
  /* no .env — fall back to ambient env */
}
import { promises as fs, readFileSync } from 'node:fs';
import path from 'node:path';
import { createAnthropicVisionProvider } from './vision/anthropic.ts';
import { resolveScoreFromCacheOrProvider } from './vision/cache.ts';
import { resolveSubject } from './vision/subject.ts';
import { computeRejectedBy } from './vision/build-manifest.ts';

const STAGING = 'static/images/_staging';
const VISION_PATH = 'static/data/image-vision.json';
const isBase = (f: string) => /\.(jpe?g|png)$/i.test(f) && !/\.(1x1|16x9|4x3)\./i.test(f);

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let ents;
  try {
    ents = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (isBase(e.name)) out.push(p);
  }
  return out;
}

async function main(): Promise<void> {
  const files = await walk(STAGING);
  if (files.length === 0) {
    console.log('No staged images to score.');
    return;
  }
  const manifest = JSON.parse(await fs.readFile(VISION_PATH, 'utf8')) as {
    entries?: Record<string, Record<string, unknown>>;
    [k: string]: unknown;
  };
  manifest.entries ??= {};
  const provider = createAnthropicVisionProvider();
  const now = new Date().toISOString();
  let scored = 0;
  let cost = 0;
  for (const abs of files) {
    const rel = path.relative(STAGING, abs).split(path.sep).join('/'); // <surface>/<id>/<slot>.jpg
    const mainPath = `/images/${rel}`;
    const id = rel.split('/')[1] ?? '';
    const r = await resolveScoreFromCacheOrProvider({
      imageBytes: readFileSync(abs),
      imagePath: mainPath,
      contextHint: resolveSubject(mainPath, { id }),
      provider,
      denyListExamples: [],
    });
    manifest.entries[mainPath] = {
      ...manifest.entries[mainPath],
      score: r.score,
      subject: r.subject,
      category: r.category,
      focal_point: r.focal_point,
      subject_match: r.subject_match ?? true,
      rejected_by: computeRejectedBy({
        score: r.score,
        category: r.category,
        subjectMatch: r.subject_match,
      }),
      scored_at: now,
      scoring_cost_usd: r.cost_usd ?? 0,
    };
    scored++;
    cost += r.cost_usd ?? 0;
  }
  await fs.writeFile(VISION_PATH, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `Scored ${scored} staged images → ${VISION_PATH} (fresh API cost $${cost.toFixed(2)})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
