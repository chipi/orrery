import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ENGINE_REGISTRY,
  ENGINE_IDS,
  getEngineMeta,
  launchersForEngine,
  enginesForLauncher,
} from './engine-registry';
import { LAUNCHER_ENGINES } from './launcher-engines';

// The two propulsion primers every engine panel links (FleetEntryPanel
// ENGINE_SCIENCE_PRIMERS). Mirrored here so a renamed / deleted science card
// fails the cross-ref gate, not just silently 404s in the UI.
const SCIENCE_PRIMERS = ['propulsion/engine-types', 'propulsion/thrust-and-twr'];
const scienceCardExists = (slug: string) =>
  existsSync(resolve(__dirname, '../../../static/data/science', `${slug}.json`));

describe('ENGINE_REGISTRY', () => {
  it('holds the curated set with unique, url-safe ids', () => {
    expect(ENGINE_REGISTRY.length).toBeGreaterThanOrEqual(20);
    expect(new Set(ENGINE_IDS).size).toBe(ENGINE_IDS.length);
    for (const id of ENGINE_IDS) expect(id).toMatch(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/);
  });

  it('every engine carries at least one designation + a thrust figure', () => {
    for (const e of ENGINE_REGISTRY) {
      expect(e.designations.length).toBeGreaterThan(0);
      expect(e.thrust_kn).toBeGreaterThan(0);
    }
  });

  it('every designation exists in launcher-engines.ts (no dangling cross-ref)', () => {
    const known = new Set<string>();
    for (const spec of Object.values(LAUNCHER_ENGINES))
      for (const s of spec.stages) known.add(s.engine);
    for (const e of ENGINE_REGISTRY)
      for (const d of e.designations)
        expect(known.has(d), `${e.id}: designation "${d}" not in launcher-engines`).toBe(true);
  });
});

describe('getEngineMeta', () => {
  it('resolves a known id and returns undefined otherwise', () => {
    expect(getEngineMeta('merlin-1d')?.name).toBe('Merlin 1D');
    expect(getEngineMeta('nope')).toBeUndefined();
  });
});

describe('launchersForEngine (reverse index)', () => {
  it('resolves at least one vehicle for every registry engine', () => {
    for (const e of ENGINE_REGISTRY)
      expect(launchersForEngine(e.id).length, `${e.id} has no launcher`).toBeGreaterThan(0);
  });

  it('maps Merlin 1D to Falcon 9 with stage labels', () => {
    const v = launchersForEngine('merlin-1d');
    expect(v.map((x) => x.launcherId)).toContain('falcon-9');
    expect(v[0].stages.length).toBeGreaterThan(0);
  });

  it('maps the R-7 pair across Vostok/Voskhod/Soyuz', () => {
    const ids = launchersForEngine('rd-107-108').map((x) => x.launcherId);
    expect(ids).toContain('soyuz');
    expect(ids.length).toBeGreaterThanOrEqual(2);
  });

  it('returns [] for an unknown id', () => {
    expect(launchersForEngine('nope')).toEqual([]);
  });
});

describe('enginesForLauncher (forward index)', () => {
  it('lists Merlin 1D for Falcon 9', () => {
    expect(enginesForLauncher('falcon-9').map((e) => e.id)).toContain('merlin-1d');
  });

  it('returns [] for an unknown launcher', () => {
    expect(enginesForLauncher('nope')).toEqual([]);
  });
});

// PRD-032 — the operator's cross-reference gate: the engine↔launcher graph must
// be symmetric both ways, and every science / external link an engine points at
// must actually resolve. This is what "cross-referenced well" means.
describe('engine ↔ launcher round-trip symmetry', () => {
  it('every launcher an engine claims lists that engine back', () => {
    for (const e of ENGINE_REGISTRY)
      for (const v of launchersForEngine(e.id)) {
        const back = enginesForLauncher(v.launcherId).map((x) => x.id);
        expect(back, `${e.id} → ${v.launcherId} but ${v.launcherId} omits ${e.id}`).toContain(e.id);
      }
  });

  it('every engine a launcher lists claims that launcher back', () => {
    for (const launcherId of Object.keys(LAUNCHER_ENGINES))
      for (const eng of enginesForLauncher(launcherId)) {
        const back = launchersForEngine(eng.id).map((x) => x.launcherId);
        expect(back, `${launcherId} → ${eng.id} but ${eng.id} omits ${launcherId}`).toContain(
          launcherId,
        );
      }
  });
});

describe('engine → science cross-references resolve', () => {
  it('both propulsion primers exist as science cards', () => {
    for (const slug of SCIENCE_PRIMERS)
      expect(scienceCardExists(slug), `primer "${slug}" has no science card`).toBe(true);
  });

  it('every per-engine science slug resolves to a real science card', () => {
    for (const e of ENGINE_REGISTRY)
      for (const slug of e.science ?? [])
        expect(scienceCardExists(slug), `${e.id}: science "${slug}" has no card`).toBe(true);
  });
});

describe('engine → external links are well-formed', () => {
  it('every link has a label, an http(s) url, and a section tag', () => {
    for (const e of ENGINE_REGISTRY)
      for (const l of e.links) {
        expect(l.l?.trim(), `${e.id}: link missing label`).toBeTruthy();
        expect(l.u, `${e.id}: link "${l.l}" url not http(s)`).toMatch(/^https?:\/\//);
        expect(l.t?.trim(), `${e.id}: link "${l.l}" missing section tag`).toBeTruthy();
      }
  });
});
