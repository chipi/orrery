/**
 * Drift-catcher: every /science article registered in `_index.json`
 * has both a base JSON record AND an en-US overlay file, with
 * consistent `tab` and `id` fields. PRD-024 Slice 3 follow-up.
 *
 * Catches:
 *   • Typo in an _index.json id ("axial-tilt-and-seaons") → article 404
 *   • Renamed article file without updating _index.json
 *   • Article's `tab` field disagreeing with its directory
 *   • Article's `id` field disagreeing with its filename
 *   • Missing en-US overlay (so the i18n fallback chain breaks)
 *
 * Runs over every `static/data/science/<tab>/_index.json`.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SCIENCE_ROOT = 'static/data/science';
const EN_US_ROOT = 'i18n-src/en-US/science';

interface TabIndex {
  ids: string[];
}

interface SectionRecord {
  id: string;
  tab: string;
}

function listTabsWithIndex(): string[] {
  return readdirSync(SCIENCE_ROOT)
    .filter((entry) => {
      const p = join(SCIENCE_ROOT, entry);
      if (!statSync(p).isDirectory()) return false;
      return existsSync(join(p, '_index.json'));
    })
    .sort();
}

describe('PRD-024 — /science index coverage', () => {
  const tabs = listTabsWithIndex();

  for (const tab of tabs) {
    const index = JSON.parse(
      readFileSync(join(SCIENCE_ROOT, tab, '_index.json'), 'utf8'),
    ) as TabIndex;
    // reading-list / watch-list have empty ids arrays — they're
    // curated companion lists with their own route, not per-section
    // article content. Skip empty index files.
    if (index.ids.length === 0) continue;
    describe(`tab: ${tab}`, () => {
      for (const id of index.ids) {
        it(`${id} has a base JSON record at science/${tab}/${id}.json`, () => {
          const path = join(SCIENCE_ROOT, tab, `${id}.json`);
          expect(existsSync(path), `missing base record: ${path}`).toBe(true);
        });

        it(`${id} base record's tab + id fields match its directory + filename`, () => {
          const path = join(SCIENCE_ROOT, tab, `${id}.json`);
          if (!existsSync(path)) return; // first test reports it
          const record = JSON.parse(readFileSync(path, 'utf8')) as SectionRecord;
          expect(record.tab, `${path}: tab field`).toBe(tab);
          expect(record.id, `${path}: id field`).toBe(id);
        });

        it(`${id} has an en-US overlay at i18n/en-US/science/${tab}/${id}.json`, () => {
          const path = join(EN_US_ROOT, tab, `${id}.json`);
          expect(existsSync(path), `missing en-US overlay: ${path}`).toBe(true);
        });
      }
    });
  }
});
