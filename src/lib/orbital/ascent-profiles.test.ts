import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FALCON9_SAMPLE } from './ascent-profiles';

/**
 * FALCON9_SAMPLE exists so tests + the dev harness get a LaunchProfile
 * synchronously (no fetch). The shipped source of truth is the JSON under
 * static/data/launch-profiles/. This guard fails the moment the two drift, so
 * the inline sample can't silently diverge from the vehicle data users see (#8).
 */
describe('FALCON9_SAMPLE stays in lockstep with the shipped falcon-9.json', () => {
  const json = JSON.parse(
    readFileSync(join(process.cwd(), 'static/data/launch-profiles/falcon-9.json'), 'utf-8'),
  ) as Record<string, unknown>;

  it('matches the shipped JSON field-for-field (ignoring JSON-only provenance)', () => {
    // The JSON adds source_tier + provenance; the physics fields must be identical.
    const { source_tier, provenance, ...physics } = json;
    void source_tier;
    void provenance;
    expect(physics).toEqual(FALCON9_SAMPLE);
  });
});
