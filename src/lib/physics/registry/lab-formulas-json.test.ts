import { describe, it, expect } from 'vitest';
import { REGISTRY } from './index';
import labFormulas from '../../../../static/data/lab-formulas.json';

// static/data/lab-formulas.json seeds the /lab/<id> pages in every locale
// (scripts/site-routes.mjs is plain Node and cannot import the TS registry).
describe('static/data/lab-formulas.json', () => {
  it('lists exactly the registry formulas, in registry order', () => {
    expect(labFormulas.ids).toEqual([...REGISTRY.keys()]);
  });

  it('has no id that collides with a static /lab route', () => {
    expect(labFormulas.ids).not.toContain('callback');
  });
});
