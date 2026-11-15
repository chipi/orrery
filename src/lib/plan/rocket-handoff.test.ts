import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import rockets from '$data/rockets.json';
import { FLAGSHIP_IDS, resolveLauncher } from '$lib/physics/ascent/launch-profile-registry';
import { PLAN_ROCKET_IDS, ROCKET_FLEET_ID, resolveRocketHandoff } from './rocket-handoff';

const enName = (id: string): string =>
  JSON.parse(readFileSync(`i18n-src/en-US/rockets/${id}.json`, 'utf8')).name;

const launcherOf = (id: string): string => {
  const h = resolveRocketHandoff(id)!;
  return resolveLauncher(h.fleetRefs, h.vehicle)!.id;
};

describe('rocket handoff (/plan ?rocket= → /fly vehicle + launcher ref)', () => {
  it('covers every rocket /plan lists, and only those', () => {
    expect([...PLAN_ROCKET_IDS].sort()).toEqual(rockets.map((r: { id: string }) => r.id).sort());
  });

  it.each(PLAN_ROCKET_IDS)('%s names the vehicle /plan shows and carries a launcher ref', (id) => {
    const h = resolveRocketHandoff(id)!;
    expect(h.rocketId).toBe(id);
    expect(h.vehicle).toBe(enName(id));
    expect(h.fleetRefs).toEqual([{ id: ROCKET_FLEET_ID[id], role: 'launcher' }]);
  });

  it('flies a flagship profile for every rocket that has one, the generic stand-in only for Ariane 6', () => {
    const generic = PLAN_ROCKET_IDS.filter((id) => !FLAGSHIP_IDS.has(launcherOf(id)));
    expect(generic).toEqual(['ariane-6']);
  });

  it('maps the ids that differ from the registry explicitly', () => {
    expect(launcherOf('atlas-v-541')).toBe('atlas-v');
    expect(launcherOf('soyuz-fregat')).toBe('soyuz-fg-fregat');
    expect(launcherOf('proton-m')).toBe('proton-k');
    expect(launcherOf('pslv-xl')).toBe('pslv');
  });

  it('ignores an unknown or empty id (today’s behaviour: no rocket)', () => {
    expect(resolveRocketHandoff('saturn-v')).toBeNull();
    expect(resolveRocketHandoff('')).toBeNull();
    expect(resolveRocketHandoff(null)).toBeNull();
    expect(resolveRocketHandoff(undefined)).toBeNull();
  });

  it('is case-insensitive like /plan’s own ?rocket= reader', () => {
    expect(resolveRocketHandoff('Falcon-Heavy')?.vehicle).toBe('Falcon Heavy');
  });
});
