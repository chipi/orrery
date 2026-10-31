import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildSpecRows } from './fleet-spec-rows';

// Regression pin for #622. The panel's spec grid is a keyed each; it used to
// key rows by the display label, and the table below renders "Specific
// impulse" once per isp field (vacuum / sea-level). Five shipped engines
// (f-1, merlin-1d, raptor, rd-180, rs-25) carry BOTH isp_vac_s and isp_sl_s,
// so opening their entry panel on /fleet rendered two rows with the same key
// and Svelte's runtime threw `each_key_duplicate`. Keys are now the spec
// field names, which are unique per row by construction — labels are display
// copy and may repeat.

const F1_SPECS = { thrust_kn_sl: 6770, isp_vac_s: 304, isp_sl_s: 263, mass_kg: 8400 };

describe('buildSpecRows keys', () => {
  it('F-1-shaped specs yield two "Specific impulse" rows with distinct keys', () => {
    const rows = buildSpecRows(F1_SPECS);
    const impulseRows = rows.filter((r) => r.label === 'Specific impulse');
    expect(impulseRows.map((r) => r.key).sort()).toEqual(['isp_sl_s', 'isp_vac_s']);
  });

  it('row keys are unique even when labels repeat', () => {
    const rows = buildSpecRows(F1_SPECS);
    const keys = rows.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('row keys are unique for every shipped fleet entry (data-invariant)', () => {
    const fleetDir = join(process.cwd(), 'static/data/fleet');
    for (const category of readdirSync(fleetDir, { withFileTypes: true })) {
      if (!category.isDirectory()) continue;
      for (const file of readdirSync(join(fleetDir, category.name))) {
        if (!file.endsWith('.json')) continue;
        const p = join(fleetDir, category.name, file);
        const entry = JSON.parse(readFileSync(p, 'utf-8')) as {
          specs?: Record<string, number | string | boolean>;
        };
        const keys = buildSpecRows(entry.specs ?? {}).map((r) => r.key);
        expect(new Set(keys).size, `duplicate spec-row key in ${p}`).toBe(keys.length);
      }
    }
  });
});
