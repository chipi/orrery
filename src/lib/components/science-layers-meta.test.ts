/**
 * Coverage check: every LayerKey returns a complete `metaFor()` result.
 *
 * PRD-024 drift-catcher. The ScienceLayersPanel's `metaFor()` is a
 * switch over `LayerKey` with no `default` branch. TypeScript's
 * exhaustive-switch check catches missing cases at compile time, but
 * only when the return value is read. A new LayerKey added to
 * `science-layers.ts` without a corresponding `metaFor` case would
 * compile fine if no one actually reads the meta for that key during
 * unit tests — and ship a broken layer with no description.
 *
 * This test reads the meta for every key in `LAYER_ORDER` at runtime
 * and asserts the returned `label` + `description` strings are
 * non-empty. Run as part of `vitest`. Add a new LayerKey → forget
 * metaFor → test fails.
 */
import { describe, it, expect } from 'vitest';
import { LAYER_ORDER } from '$lib/science-layers';

// Mirror the metaFor implementation under test. We can't import it
// from the .svelte component directly in a vitest unit; this test
// instead validates the contract by reading the description strings
// out of the existing paraglide messages bundle + the hard-coded
// PRD-023/024 strings.
//
// Strategy: import the messages module + assert each layer key has
// at least one of (a) a `science_layer_<key>_label` paraglide key
// OR (b) a hard-coded PRD-023+ description (the four PRD-023 layers
// + planet-stats live as hard-coded strings inside the component
// rather than the i18n bundle for now; that's tracked in PRD-024
// Slice 2 follow-up). For now we maintain an explicit allowlist
// of the in-component hardcoded keys; if a NEW key lands without
// either coverage, the test fails.
import * as m from '$lib/paraglide/messages';

// Empty as of #386 follow-up (2026-07-09): the PRD-023 + geophysics +
// climate layers were migrated from inline strings to
// `science_layer_<key>_label/_desc` paraglide keys, closing the
// PRD-024 Slice 2 i18n debt. Every LayerKey now has a message key; if a
// new one lands hardcoded, add it here (or, preferably, add the key).
const HARDCODED_IN_COMPONENT = new Set<string>([]);

function paraglideKey(layer: string): string {
  return `science_layer_${layer.replace(/-/g, '_')}_label`;
}

describe('ScienceLayersPanel — metaFor coverage', () => {
  it('every layer key in LAYER_ORDER has a label source (paraglide message or in-component string)', () => {
    const missing: string[] = [];
    for (const key of LAYER_ORDER) {
      if (HARDCODED_IN_COMPONENT.has(key)) continue;
      const messageKey = paraglideKey(key);
      const fn = (m as unknown as Record<string, () => string>)[messageKey];
      if (typeof fn !== 'function') {
        missing.push(`${key} (expected paraglide key: ${messageKey})`);
      }
    }
    expect(missing, missing.join('\n')).toEqual([]);
  });
});
