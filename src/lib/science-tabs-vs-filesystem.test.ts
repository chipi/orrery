/**
 * Drift-catcher: SCIENCE_TABS constant matches the actual directory
 * structure under `static/data/science/`. Issue #303.
 *
 * Catches:
 *   • Adding a new tab directory + content without updating SCIENCE_TABS
 *     (would render the tab inaccessible from the /science nav)
 *   • Removing a tab directory without removing it from SCIENCE_TABS
 *     (would link to a 404)
 *
 * The science-section.schema.json `tab` enum is checked separately by
 * validate-data (every article validates against it).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SCIENCE_TABS } from '$lib/data';

const SCIENCE_ROOT = 'static/data/science';

// Tabs known to exist in the SCIENCE_TABS constant but NOT as
// content directories — reading-list and watch-list are curated
// companion lists rendered by a dedicated route, no per-section
// JSON files (issue #128 + #129, v0.6.3).
const NON_CONTENT_TABS = new Set(['reading-list', 'watch-list']);

describe('SCIENCE_TABS vs static/data/science/ directories', () => {
  it('every content tab in SCIENCE_TABS has a matching directory with _index.json', () => {
    const missing: string[] = [];
    for (const tab of SCIENCE_TABS) {
      if (NON_CONTENT_TABS.has(tab)) continue;
      const dir = join(SCIENCE_ROOT, tab);
      const indexPath = join(dir, '_index.json');
      if (!existsSync(dir) || !existsSync(indexPath)) {
        missing.push(`${tab}: expected ${indexPath}`);
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });

  it('every directory under static/data/science/ is registered in SCIENCE_TABS', () => {
    const onDisk = readdirSync(SCIENCE_ROOT).filter((entry) =>
      statSync(join(SCIENCE_ROOT, entry)).isDirectory(),
    );
    const stale = onDisk.filter(
      (dir) => !SCIENCE_TABS.includes(dir as (typeof SCIENCE_TABS)[number]),
    );
    expect(
      stale,
      `Directories not in SCIENCE_TABS: ${stale.join(', ')}. Either add to src/lib/data.ts SCIENCE_TABS const + ScienceTabId union + science-section.schema enum, or remove the directory.`,
    ).toEqual([]);
  });
});
