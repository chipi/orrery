/**
 * Unit tests for the PRD-020 / RFC-023 launches manifest integrity helpers
 * extracted into `validate-data-helpers.ts`. Pure-function tests — no fs,
 * no console, no process.exit.
 */

import { describe, expect, it } from 'vitest';
import {
  findLaunchesMissingPrimaryProvenance,
  findLaunchesMissingCitations,
  findLaunchesOrphanLauncherRefs,
  findLaunchesOrphanRocketMappingTargets,
  type LaunchEntryMinimal,
} from './validate-data-helpers.js';

const entry = (overrides: Partial<LaunchEntryMinimal> = {}): LaunchEntryMinimal => ({
  id: '2026-05-26-falcon-9-starlink-10-31',
  provenance_chain: [
    { source: 'spacex-direct', role: 'primary' },
    { source: 'll2', role: 'augmented-with' },
  ],
  ...overrides,
});

describe('findLaunchesMissingPrimaryProvenance', () => {
  it('returns empty when every entry has a primary role', () => {
    expect(findLaunchesMissingPrimaryProvenance([entry()])).toEqual([]);
  });

  it('accepts fallback-primary in place of primary', () => {
    expect(
      findLaunchesMissingPrimaryProvenance([
        entry({ provenance_chain: [{ source: 'll2', role: 'fallback-primary' }] }),
      ]),
    ).toEqual([]);
  });

  it('flags entries where the chain only has augmented-with / confirmed-via roles', () => {
    const bad = entry({
      id: '2026-06-01-foo-bar',
      provenance_chain: [
        { source: 'll2', role: 'augmented-with' },
        { source: 'gcat', role: 'confirmed-via' },
      ],
    });
    const result = findLaunchesMissingPrimaryProvenance([bad]);
    expect(result).toEqual([
      { kind: 'missing-primary-provenance', launch_id: '2026-06-01-foo-bar' },
    ]);
  });

  it('flags multiple bad entries independently', () => {
    const bad1 = entry({
      id: 'a-x-y',
      provenance_chain: [{ source: 'll2', role: 'augmented-with' }],
    });
    const bad2 = entry({
      id: 'b-x-y',
      provenance_chain: [{ source: 'll2', role: 'confirmed-via' }],
    });
    const result = findLaunchesMissingPrimaryProvenance([bad1, entry(), bad2]);
    expect(result.map((f) => f.kind === 'missing-primary-provenance' && f.launch_id)).toEqual([
      'a-x-y',
      'b-x-y',
    ]);
  });
});

describe('findLaunchesMissingCitations', () => {
  it('returns empty when every distinct source has a matching text-sources id', () => {
    const known = new Set(['launches.source.spacex-direct', 'launches.source.ll2']);
    expect(findLaunchesMissingCitations([entry()], known)).toEqual([]);
  });

  it('flags a source that lacks a launches.source.<src> text-sources entry', () => {
    const known = new Set(['launches.source.spacex-direct']);
    const result = findLaunchesMissingCitations([entry()], known);
    expect(result).toEqual([
      {
        kind: 'missing-citation',
        source: 'll2',
        expected_text_source_id: 'launches.source.ll2',
      },
    ]);
  });

  it('deduplicates sources across multiple entries', () => {
    const e1 = entry({ id: 'a', provenance_chain: [{ source: 'nasa-direct', role: 'primary' }] });
    const e2 = entry({ id: 'b', provenance_chain: [{ source: 'nasa-direct', role: 'primary' }] });
    expect(findLaunchesMissingCitations([e1, e2], new Set())).toEqual([
      {
        kind: 'missing-citation',
        source: 'nasa-direct',
        expected_text_source_id: 'launches.source.nasa-direct',
      },
    ]);
  });

  it('returns empty when there are no entries to scan', () => {
    expect(findLaunchesMissingCitations([], new Set())).toEqual([]);
  });
});

describe('findLaunchesOrphanLauncherRefs', () => {
  it('returns empty when every non-null ref resolves', () => {
    const exists = (id: string) => id === 'falcon-9';
    expect(
      findLaunchesOrphanLauncherRefs([entry({ orrery_launcher_ref: 'falcon-9' })], exists),
    ).toEqual([]);
  });

  it('ignores null/undefined refs', () => {
    const exists = () => false;
    expect(
      findLaunchesOrphanLauncherRefs(
        [entry({ orrery_launcher_ref: null }), entry({ id: 'b', orrery_launcher_ref: undefined })],
        exists,
      ),
    ).toEqual([]);
  });

  it('flags refs that do not resolve', () => {
    const exists = (id: string) => id === 'falcon-9';
    const bad = entry({ id: '2026-05-26-totally-fake', orrery_launcher_ref: 'fake-rocket' });
    expect(findLaunchesOrphanLauncherRefs([bad], exists)).toEqual([
      {
        kind: 'orphan-launcher-ref',
        launch_id: '2026-05-26-totally-fake',
        orrery_launcher_ref: 'fake-rocket',
      },
    ]);
  });
});

describe('findLaunchesOrphanRocketMappingTargets', () => {
  it('returns empty when every target resolves', () => {
    const exists = (id: string) => ['falcon-9', 'sls-block-1'].includes(id);
    expect(
      findLaunchesOrphanRocketMappingTargets(
        {
          families: { 'Falcon 9': 'falcon-9', SLS: 'sls-block-1' },
          config_exceptions: { 'Falcon 9 Block 4': 'falcon-9' },
        },
        exists,
      ),
    ).toEqual([]);
  });

  it('flags orphan family targets', () => {
    const exists = () => false;
    const result = findLaunchesOrphanRocketMappingTargets(
      { families: { 'Falcon 9': 'falcon-9' } },
      exists,
    );
    expect(result).toEqual([
      {
        kind: 'orphan-rocket-mapping-target',
        mapping_key: 'families/Falcon 9',
        launcher_id: 'falcon-9',
      },
    ]);
  });

  it('flags orphan config_exception targets', () => {
    const exists = (id: string) => id === 'falcon-9';
    const result = findLaunchesOrphanRocketMappingTargets(
      {
        families: { 'Falcon 9': 'falcon-9' },
        config_exceptions: { 'Mystery Variant 9000': 'unknown-launcher' },
      },
      exists,
    );
    expect(result).toEqual([
      {
        kind: 'orphan-rocket-mapping-target',
        mapping_key: 'config_exceptions/Mystery Variant 9000',
        launcher_id: 'unknown-launcher',
      },
    ]);
  });

  it('treats missing config_exceptions block as empty', () => {
    const exists = (id: string) => id === 'falcon-9';
    expect(
      findLaunchesOrphanRocketMappingTargets({ families: { 'Falcon 9': 'falcon-9' } }, exists),
    ).toEqual([]);
  });
});
