import { describe, it, expect } from 'vitest';
import {
  CTX_ORDER,
  contextLevel,
  planShellJump,
  planShellJumpTo,
  resolveSolarBodyTarget,
  isValidShellTarget,
  type BodyMembership,
} from './scale-shell-controller';

// The /explore scale-shell controller (RFC-036 WS-C). These lock the two pure,
// bug-prone decisions lifted out of the page: the ?id= body router (with the
// Pluto-in-two-catalogues nuance) and the shell-ladder jump planner.

// A membership fixture: real planet ids + a couple of small bodies. Pluto is a
// planet-catalogue id AND a small-body id (the whole point of the nuance).
const membership: BodyMembership = {
  isPlanet: (id) =>
    [
      'mercury',
      'venus',
      'earth',
      'mars',
      'jupiter',
      'saturn',
      'uranus',
      'neptune',
      'pluto',
    ].includes(id),
  isSmallBody: (id) => ['pluto', 'ceres', 'eris', 'halley'].includes(id),
};

describe('resolveSolarBodyTarget — the ?id= routing ladder', () => {
  it('sun → the Sun', () => {
    expect(resolveSolarBodyTarget('sun', membership)).toEqual({ kind: 'sun' });
  });

  it('pluto prefers the small-body surface (richer science_sections) even though it is also a planet id', () => {
    expect(resolveSolarBodyTarget('pluto', membership)).toEqual({ kind: 'smallBody', id: 'pluto' });
  });

  it('pluto falls back to planet when it is NOT in the small-body catalogue', () => {
    const noPlutoSmallBody: BodyMembership = {
      isPlanet: membership.isPlanet,
      isSmallBody: (id) => id !== 'pluto' && membership.isSmallBody(id),
    };
    expect(resolveSolarBodyTarget('pluto', noPlutoSmallBody)).toEqual({
      kind: 'planet',
      id: 'pluto',
    });
  });

  it('a known planet → planet', () => {
    expect(resolveSolarBodyTarget('mars', membership)).toEqual({ kind: 'planet', id: 'mars' });
  });

  it('a known small body → small body', () => {
    expect(resolveSolarBodyTarget('ceres', membership)).toEqual({ kind: 'smallBody', id: 'ceres' });
  });

  it('planet catalogue wins over small-body for a shared non-pluto id', () => {
    // halley is only a small body here; but if it were also a planet id, planet
    // membership is checked first (after the pluto special-case).
    const both: BodyMembership = {
      isPlanet: (id) => id === 'halley' || membership.isPlanet(id),
      isSmallBody: membership.isSmallBody,
    };
    expect(resolveSolarBodyTarget('halley', both)).toEqual({ kind: 'planet', id: 'halley' });
  });

  it('belt aliases both resolve', () => {
    expect(resolveSolarBodyTarget('asteroid-belt', membership)).toEqual({
      kind: 'belt',
      belt: 'asteroid',
    });
    expect(resolveSolarBodyTarget('belt:asteroid', membership)).toEqual({
      kind: 'belt',
      belt: 'asteroid',
    });
    expect(resolveSolarBodyTarget('kuiper-belt', membership)).toEqual({
      kind: 'belt',
      belt: 'kuiper',
    });
    expect(resolveSolarBodyTarget('belt:kuiper', membership)).toEqual({
      kind: 'belt',
      belt: 'kuiper',
    });
  });

  it('parent:satellite (parent is a planet) → satellite', () => {
    expect(resolveSolarBodyTarget('earth:moon', membership)).toEqual({
      kind: 'satellite',
      parentId: 'earth',
      satelliteId: 'moon',
    });
  });

  it('parent:satellite where parent is NOT a planet → null (no crash)', () => {
    expect(resolveSolarBodyTarget('foo:bar', membership)).toBeNull();
  });

  it('unknown id and empty/null → null', () => {
    expect(resolveSolarBodyTarget('nope', membership)).toBeNull();
    expect(resolveSolarBodyTarget('', membership)).toBeNull();
    expect(resolveSolarBodyTarget(null, membership)).toBeNull();
    expect(resolveSolarBodyTarget(undefined, membership)).toBeNull();
  });
});

describe('contextLevel — ladder rung of a context', () => {
  it('maps the five shells to 0..4 in ladder order', () => {
    expect(CTX_ORDER).toEqual([
      'solar-system',
      'neighborhood',
      'milky-way',
      'local-group',
      'local-sheet',
    ]);
    expect(contextLevel('solar-system')).toBe(0);
    expect(contextLevel('neighborhood')).toBe(1);
    expect(contextLevel('milky-way')).toBe(2);
    expect(contextLevel('local-group')).toBe(3);
    expect(contextLevel('local-sheet')).toBe(4);
  });

  it('off-ladder contexts (body-scene) and unknowns → -1', () => {
    expect(contextLevel('body-scene')).toBe(-1);
    expect(contextLevel('black-hole')).toBe(-1);
    expect(contextLevel('')).toBe(-1);
  });
});

describe('planShellJump — the cross-out / cross-in walker plan', () => {
  it('already at target → no steps', () => {
    expect(planShellJump(0, 0)).toEqual([]);
    expect(planShellJump(2, 2)).toEqual([]);
  });

  it('climbs OUT one rung per level below the target', () => {
    expect(planShellJump(0, 1)).toEqual(['out']);
    expect(planShellJump(0, 3)).toEqual(['out', 'out', 'out']);
    expect(planShellJump(1, 2)).toEqual(['out']);
  });

  it('descends IN one rung per level above the target', () => {
    expect(planShellJump(3, 0)).toEqual(['in', 'in', 'in']);
    expect(planShellJump(2, 1)).toEqual(['in']);
  });

  it('off-ladder endpoints → no steps', () => {
    expect(planShellJump(-1, 2)).toEqual([]);
    expect(planShellJump(1, -1)).toEqual([]);
  });
});

describe('planShellJumpTo — jump from a context to a named shell', () => {
  it('solar-system → milky-way climbs two rungs out', () => {
    expect(planShellJumpTo('solar-system', 'milky-way')).toEqual(['out', 'out']);
  });

  it('local-group → neighborhood descends two rungs in', () => {
    expect(planShellJumpTo('local-group', 'neighborhood')).toEqual(['in', 'in']);
  });

  it('unknown target shell → no steps (walker guard)', () => {
    expect(planShellJumpTo('solar-system', 'andromeda')).toEqual([]);
  });

  it('from an off-ladder context (body-scene) → no steps', () => {
    expect(planShellJumpTo('body-scene', 'milky-way')).toEqual([]);
  });
});

describe('isValidShellTarget — ?context= guard', () => {
  it('accepts the four ladder shells', () => {
    for (const s of CTX_ORDER) expect(isValidShellTarget(s)).toBe(true);
  });
  it('rejects off-ladder / unknown / empty', () => {
    expect(isValidShellTarget('body-scene')).toBe(false);
    expect(isValidShellTarget('universe')).toBe(false);
    expect(isValidShellTarget(null)).toBe(false);
    expect(isValidShellTarget(undefined)).toBe(false);
    expect(isValidShellTarget('')).toBe(false);
  });
});
