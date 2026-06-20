#!/usr/bin/env tsx
/**
 * Generate `static/data/<surface>-hero-overrides.json` files from the
 * audit-heroes.ts swap-proposal tables in `docs/provenance/*-hero-audit.md`.
 * Phase 5 plumbing (pickHero + loadHeroOverrides) consumes these files
 * to pick a non-default slot per entity id.
 *
 * For each surface we read the "## ⇄ Swap proposals" table — each row
 * names a current-bad hero (slot 01) and a proposed alternate slot
 * that scored cleanly. We translate that into:
 *
 *   {
 *     "version": "1.0",
 *     "overrides": {
 *       "<id>": { "slot": "<NN>.jpg", "reason": "<rubric flags>",
 *                  "approved_at": "<YYYY-MM-DD>" },
 *       …
 *     }
 *   }
 *
 * Marko's blanket Phase-2 approval ("OK with all we did") authorises
 * every swap proposal in the current audit; future audits with new
 * proposals would re-run this to refresh the JSON.
 *
 * Idempotent: a 2nd run on an unchanged audit overwrites the JSON with
 * identical content.
 *
 * Run:
 *   npx tsx scripts/generate-hero-overrides.ts
 */
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const SURFACES = [
  'missions',
  'fleet',
  'moon-sites',
  'mars-sites',
  'earth-objects',
  'planets',
  'small-bodies',
  'satellites',
];
const AUDIT_DIR = 'docs/provenance';
const OUT_DIR = 'static/data';
const APPROVED_AT = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

interface OverrideRow {
  id: string;
  slot: string;
  reason: string;
}

async function main(): Promise<void> {
  let total = 0;
  for (const surface of SURFACES) {
    const auditPath = join(AUDIT_DIR, `${surface}-hero-audit.md`);
    let md: string;
    try {
      md = await readFile(auditPath, 'utf8');
    } catch {
      console.log(`  ⚠ ${surface}: no audit at ${auditPath}; skipping`);
      continue;
    }
    const rows = parseSwapTable(md);
    if (rows.length === 0) {
      console.log(`  ${surface}: no swap proposals → no override file written`);
      continue;
    }
    const overrides: Record<string, { slot: string; reason: string; approved_at: string }> = {};
    for (const r of rows) {
      overrides[r.id] = {
        slot: r.slot,
        reason: r.reason,
        approved_at: APPROVED_AT,
      };
    }
    const file = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      source_audit: `${surface}-hero-audit.md`,
      overrides,
    };
    const outPath = join(OUT_DIR, `${surface}-hero-overrides.json`);
    await writeFile(outPath, JSON.stringify(file, null, 2) + '\n');
    console.log(`  ${surface}: ${rows.length} overrides → ${outPath}`);
    total += rows.length;
  }
  console.log(`Total: ${total} hero overrides written.`);
}

/**
 * Parse the `## ⇄ Swap proposals` markdown table. Rows look like
 *
 *   | <id> | <hero reasons> | <propose-slot> | <alt rationale> |
 *
 * with a header row and a separator row before the data starts. We
 * grab columns 1, 3, and 2 (id, slot, reason — reason is the row's
 * "hero reasons" since that's what justified the swap).
 */
function parseSwapTable(md: string): OverrideRow[] {
  const out: OverrideRow[] = [];
  const header = '## ⇄ Swap proposals';
  const hi = md.indexOf(header);
  if (hi === -1) return out;
  const tail = md.slice(hi + header.length);
  const nextSection = tail.match(/\n## /);
  const block = nextSection ? tail.slice(0, nextSection.index) : tail;
  for (const line of block.split('\n')) {
    // Skip header + separator
    if (!line.startsWith('|')) continue;
    if (/^\|\s*-/.test(line)) continue;
    if (/^\|\s*id\s*\|/.test(line)) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 3) continue;
    const [id, heroReasons, proposeSlot] = cells;
    if (!id || !proposeSlot) continue;
    if (!/^\d{2}\.(jpe?g|png|webp)$/i.test(proposeSlot)) continue;
    out.push({ id, slot: proposeSlot, reason: heroReasons });
  }
  return out;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
