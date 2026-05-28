/**
 * Validate that every (tab, slug) pair in `cislunar-phase-science-map.json`
 * resolves to an existing /science section JSON file. Run as part of
 * preflight (chained from validate-data) so a typo in the map fails
 * fast instead of producing a dead `?` chip in /fly.
 *
 * Exit codes:
 *   0 — all refs resolve
 *   1 — at least one ref dangles
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import map from '../../static/data/cislunar-phase-science-map.json' with { type: 'json' };

interface RefEntry {
  tab: string;
  slug: string;
}

const root = join(import.meta.dirname, '..', '..', 'static', 'data', 'science');
const failures: string[] = [];

function check(category: string, key: string, refs: unknown): void {
  if (!Array.isArray(refs)) {
    failures.push(`${category}/${key}: refs is not an array`);
    return;
  }
  for (const r of refs) {
    const ref = r as RefEntry;
    if (typeof ref?.tab !== 'string' || typeof ref?.slug !== 'string') {
      failures.push(`${category}/${key}: malformed ref ${JSON.stringify(ref)}`);
      continue;
    }
    const path = join(root, ref.tab, `${ref.slug}.json`);
    if (!existsSync(path)) {
      failures.push(`${category}/${key}: refs ${ref.tab}/${ref.slug} → ${path} not found`);
    }
  }
}

const m = map as { phase_refs?: Record<string, unknown>; event_refs?: Record<string, unknown> };

for (const [phase, refs] of Object.entries(m.phase_refs ?? {})) {
  check('phase_refs', phase, refs);
}
for (const [event, refs] of Object.entries(m.event_refs ?? {})) {
  check('event_refs', event, refs);
}

if (failures.length > 0) {
  console.error('\n✗ cislunar-phase-science-map.json — dangling refs:');
  for (const f of failures) console.error(`   ${f}`);
  process.exit(1);
}

const phaseCount = Object.keys(m.phase_refs ?? {}).length;
const eventCount = Object.keys(m.event_refs ?? {}).length;
console.log(
  `✓ cislunar-phase-science-map.json: ${phaseCount} phases + ${eventCount} events; all refs resolve`,
);
