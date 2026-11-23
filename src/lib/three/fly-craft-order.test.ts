// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { preloadFlyCraft } from './fly-craft';
import { buildPayload } from './ascent-scene';

describe('a mission with a central model flies it, not the older silhouette', () => {
  it('Cassini rides its showcase model (with Huygens) on the launcher', async () => {
    expect(await preloadFlyCraft('cassini')).toBe(true);
    const payload = buildPayload('cassini', 50, 1, 50, 2);
    expect(payload.getObjectByName('huygens')).toBeDefined();
  });
});
