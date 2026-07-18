import { describe, it, expect } from 'vitest';
import { buildDescentModel, KNOWN_DESCENT_STACK_IDS } from './descent-models';

describe('buildDescentModel', () => {
  it('skycrane stack (Curiosity) has rigging, descent stage, chute + a lander', () => {
    const m = buildDescentModel('curiosity', 'mars', 1);
    expect(m.skycraneRigging.children.length).toBeGreaterThan(0);
    expect(m.descentStage.children.length).toBeGreaterThan(0);
    expect(m.parachute.children.length).toBeGreaterThan(0);
    expect(m.lander.children.length).toBeGreaterThan(0);
    expect(m.root.children).toContain(m.lander);
  });

  it('lunar stack (Apollo 11) has a retro + lander but no parachute', () => {
    const m = buildDescentModel('apollo11', 'moon', 1);
    expect(m.lander.children.length).toBeGreaterThan(0);
    expect(m.retro.children.length).toBeGreaterThan(0);
    expect(m.parachute.children.length).toBe(0); // vacuum — no chute
  });

  it('airbag stack (Pathfinder) carries a hidden airbag cluster', () => {
    const m = buildDescentModel('mars-pathfinder', 'mars', 1);
    expect(m.airbags.children.length).toBeGreaterThan(0);
    expect(m.airbags.visible).toBe(false); // inflated by the scene at deploy
  });

  it('Venus stack builds an aeroshell heat-shield + reuses the Venera lander', () => {
    const m = buildDescentModel('venera-13', 'venus', 1);
    expect(m.heatshield.geometry).toBeTruthy();
    expect(m.lander.children.length).toBeGreaterThan(0);
  });

  it('exposes the dedicated stack ids', () => {
    expect(KNOWN_DESCENT_STACK_IDS).toContain('curiosity');
    expect(KNOWN_DESCENT_STACK_IDS).toContain('viking1-lander');
  });
});
