/**
 * Drift-catcher: every LayerKey has a `case '<key>':` branch in the
 * `metaFor()` switch inside `ScienceLayersPanel.svelte`. Issue #303.
 *
 * TypeScript's exhaustive-switch check already catches missing cases
 * at compile time IF the switch return value is read with strict
 * `noFallthroughCasesInSwitch` + a `LayerMeta` return type with no
 * `default` branch. That's the primary line of defense.
 *
 * This test is the secondary line: it reads the .svelte source as
 * text + asserts each LayerKey is named in a `case '<key>':` line.
 * Catches the failure mode where a hand-rolled refactor accidentally
 * deletes a case (TS may pass if the deleted branch's keys are then
 * unreachable code) or where a key gets renamed in `LAYER_ORDER` but
 * not in the switch.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { LAYER_ORDER } from '$lib/science-layers';

const PANEL_PATH = 'src/lib/components/ScienceLayersPanel.svelte';

describe('ScienceLayersPanel metaFor — source-level exhaustiveness', () => {
  const source = readFileSync(PANEL_PATH, 'utf8');

  for (const key of LAYER_ORDER) {
    it(`metaFor has a "case '${key}':" branch`, () => {
      const re = new RegExp(`case\\s+['"]${key.replace(/[-]/g, '\\-')}['"]\\s*:`);
      expect(
        re.test(source),
        `LayerKey "${key}" has no matching case in ${PANEL_PATH}. Add it to the metaFor switch.`,
      ).toBe(true);
    });
  }
});
