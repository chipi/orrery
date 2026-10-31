import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// FleetEntryPanel renders these lists in keyed {#each} blocks. A repeated key
// throws each_key_duplicate and the panel never renders (GlitchTip
// ORRERY-PROD-20: two "Specific impulse" spec rows on merlin-1d). The spec
// rows are keyed by field now; these keys come straight from the data.
const DIR = 'static/data/fleet';

function entries(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return entries(p);
    return name.endsWith('.json') && name !== 'index.json' ? [p] : [];
  });
}

type Entry = {
  links?: { t: string; u: string }[];
  flights?: { mission_id: string; crew?: { name: string }[] }[];
  linked_missions?: string[];
  linked_sites?: { type: string; site_id: string }[];
};

function dupes(keys: string[]): string[] {
  const seen = new Set<string>();
  return keys.filter((k) => (seen.has(k) ? true : (seen.add(k), false)));
}

describe('fleet entries: keys of the panel lists are unique', () => {
  it('links per tier, flights, crew per flight, linked missions and linked sites', () => {
    const problems: string[] = [];
    for (const file of entries(DIR)) {
      const e = JSON.parse(readFileSync(file, 'utf8')) as Entry;
      const check = (what: string, keys: string[]) => {
        for (const d of dupes(keys)) problems.push(`${file}: ${what} "${d}"`);
      };
      for (const tier of ['intro', 'core', 'deep'])
        check(
          `links.${tier}`,
          (e.links ?? []).filter((l) => l.t === tier).map((l) => l.u),
        );
      check(
        'flights',
        (e.flights ?? []).map((f) => f.mission_id),
      );
      for (const f of e.flights ?? [])
        check(
          `crew of ${f.mission_id}`,
          (f.crew ?? []).map((c) => c.name),
        );
      check('linked_missions', e.linked_missions ?? []);
      check(
        'linked_sites',
        (e.linked_sites ?? []).map((s) => s.type + s.site_id),
      );
    }
    expect(problems, problems.join('\n')).toEqual([]);
  });
});
