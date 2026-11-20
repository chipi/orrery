import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { findLaunchEntry, type LaunchEntryLike } from '$lib/orbital/launch-sun';

/**
 * The hand links in launches-curation.json `mission_refs` (backlog F9 / plan L56): every curated
 * mission resolves to its launch entry, with a time of day, through the same matcher the launch
 * lighting uses. A link the regenerated data lost (a renamed source launch) fails here.
 */
const DATA = resolve(__dirname, '../../../static/data');
const curation = JSON.parse(readFileSync(join(DATA, 'launches-curation.json'), 'utf-8')) as {
  mission_refs?: Array<{ launch_id: string; orrery_mission_ref: string }>;
};
const entries: Array<LaunchEntryLike & { id: string }> = [];
for (const f of readdirSync(join(DATA, 'launches-historic')).filter((x) => x.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(join(DATA, 'launches-historic', f), 'utf-8')) as {
    entries: Record<string, LaunchEntryLike>;
  };
  for (const [id, e] of Object.entries(j.entries)) entries.push({ ...e, id });
}

describe('curated launch → mission links', () => {
  const refs = curation.mission_refs ?? [];
  it('there are curated links', () => {
    expect(refs.length).toBeGreaterThanOrEqual(37);
  });
  for (const r of refs) {
    it(`${r.orrery_mission_ref} resolves to ${r.launch_id} with a time of day`, () => {
      const e = findLaunchEntry(entries, { missionId: r.orrery_mission_ref }) as
        (LaunchEntryLike & { id: string }) | null;
      expect(e?.id).toBe(r.launch_id);
    });
  }
});
