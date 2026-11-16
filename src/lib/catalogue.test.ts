import { describe, it, expect } from 'vitest';
import {
  adsHref,
  catalogueLabel,
  dataSourceItems,
  recordLinks,
  sourceLink,
  type CatalogueEntry,
} from './catalogue';

const entry = (over: Partial<CatalogueEntry> = {}): CatalogueEntry => ({
  value: 1,
  source: 'Hunt & Reffert 2023, Improving the open cluster census II (Gaia DR3)',
  bibcode: '2023A&A...673A.114H',
  record_url: 'https://vizier.cds.unistra.fr/viz-bin/VizieR-4?-source=x',
  ...over,
});

describe('catalogueLabel', () => {
  it('takes the text before the first comma outside parentheses', () => {
    expect(catalogueLabel(entry().source)).toBe('Hunt & Reffert 2023');
    expect(
      catalogueLabel('Cosmicflows-4, Tully et al. 2023 (distance modulus, all methodologies)'),
    ).toBe('Cosmicflows-4');
    expect(
      catalogueLabel('Event Horizon Telescope Collaboration 2019 (paper VI), M87* shadow'),
    ).toBe('Event Horizon Telescope Collaboration 2019 (paper VI)');
    expect(catalogueLabel('SIMBAD')).toBe('SIMBAD');
  });

  it('names Harris and HYG in full', () => {
    expect(catalogueLabel('Harris, Catalog of Parameters for Milky Way Globular Clusters')).toBe(
      'Harris 1996 (2010 edition)',
    );
    expect(
      catalogueLabel(
        'HYG Database v4.1 (merges the Hipparcos, Yale Bright Star and Gliese catalogues)',
      ),
    ).toBe('HYG v4.1');
  });
});

describe('adsHref / sourceLink / recordLinks', () => {
  it('builds the ADS page with the bibcode encoded', () => {
    expect(adsHref('2023A&A...673A.114H')).toBe(
      'https://ui.adsabs.harvard.edu/abs/2023A%26A...673A.114H/abstract',
    );
  });

  it('links a value to its record, or to nothing', () => {
    expect(sourceLink(entry())).toEqual({
      label: 'Hunt & Reffert 2023',
      url: 'https://vizier.cds.unistra.fr/viz-bin/VizieR-4?-source=x',
    });
    expect(sourceLink(undefined)).toBeNull();
  });

  it('lists the object pages in a fixed order and skips absent ones', () => {
    expect(recordLinks({ ned: 'https://n', simbad: 'https://s' })).toEqual([
      { label: 'SIMBAD', url: 'https://s' },
      { label: 'NED', url: 'https://n' },
    ]);
    expect(recordLinks(undefined)).toEqual([]);
  });
});

describe('dataSourceItems', () => {
  it('groups the fields one catalogue supplied and carries notes', () => {
    const cat = {
      mass_solar: entry({
        source: 'GRAVITY Collaboration 2022, Mass of Sgr A*',
        bibcode: '2022A&A...657L..12G',
        note: '4.297 million',
      }),
      dist_ly: entry({
        source: 'GRAVITY Collaboration 2022, Mass of Sgr A*',
        bibcode: '2022A&A...657L..12G',
      }),
      position: entry({ source: 'OpenNGC, coordinates from NED', bibcode: null }),
    };
    const labels: Record<string, string> = { mass_solar: 'Mass', dist_ly: 'Distance' };
    const items = dataSourceItems(cat, (k) => labels[k] ?? null);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      label: 'GRAVITY Collaboration 2022',
      bibcode: '2022A&A...657L..12G',
      fields: ['Mass', 'Distance'],
      notes: ['Mass: 4.297 million'],
    });
  });

  it('keeps the same catalogue with different papers apart, and tolerates no catalogue', () => {
    const cat = {
      a: entry({ bibcode: 'x1' }),
      b: entry({ bibcode: 'x2' }),
    };
    expect(dataSourceItems(cat, () => 'f')).toHaveLength(2);
    expect(dataSourceItems(undefined, () => 'f')).toEqual([]);
  });
});
