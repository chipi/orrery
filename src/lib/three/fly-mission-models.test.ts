// @vitest-environment jsdom
// Every /fly mission flies its own craft: a dedicated model in cruise (interplanetary,
// lander-cruise or showcase), or its capsule in Earth orbit. A mission listed in GENERIC rides a
// shared stand-in on purpose (the operator's rule: share a model where the differences are small).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildInterplanetarySpacecraft } from './interplanetary-spacecraft-models';
import { buildLanderCruiseCraft } from './lander-cruise-models';
import { flyCraft, preloadFlyCraft } from './fly-craft';
import { getEarthOrbitCoast } from '$lib/orbital/earth-orbit-registry';

const ROOT = join(process.cwd(), 'static/data/missions');
const missions = readdirSync(ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .flatMap((d) =>
    readdirSync(join(ROOT, d.name))
      .filter((f) => f.endsWith('.json'))
      .map(
        (f) =>
          JSON.parse(readFileSync(join(ROOT, d.name, f), 'utf8')) as {
            id: string;
            status?: string;
          },
      ),
  );

/** Shared stand-ins, by decision — each with the model it rides. */
const GENERIC: Record<string, string> = {
  'apollo-1': 'never flew (pad fire)',
  escapade:
    'two small Mars orbiters with no dedicated model yet; rides the generic spacecraft glyph',
  'peregrine-m1':
    'a lander that never reached the Moon; no dedicated model yet (the private Moon plan models Hakuto-R and Blue Ghost only)',
};

describe('/fly mission models', () => {
  it('every mission resolves to its own craft', async () => {
    const missing: string[] = [];
    for (const m of missions) {
      if (GENERIC[m.id]) continue;
      const own =
        buildInterplanetarySpacecraft(m.id) ??
        buildLanderCruiseCraft(m.id) ??
        ((await preloadFlyCraft(m.id)) ? flyCraft(m.id) : null) ??
        (getEarthOrbitCoast(m.id) ? 'capsule' : null);
      if (!own) missing.push(m.id);
    }
    expect(missing).toEqual([]);
    // Builds every mission's craft at full detail: ~1.5 s alone, past the 5 s default under
    // coverage with the whole suite running.
  }, 30_000);
});
