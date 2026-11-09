import { describe, it, expect } from 'vitest';
import { buildPanoramaProvenanceEntry } from './provenance';

const entry = (license: Parameters<typeof buildPanoramaProvenanceEntry>[0]['license']) =>
  buildPanoramaProvenanceEntry({
    siteId: 'x',
    publicPath: '/images/hotspots/moon/x/tier3-pan.jpg',
    sourceLabel: 'label',
    sourceUrl: 'https://example.org/x.jpg',
    attribution: 'someone',
    license,
    caption: 'caption',
  });

describe('buildPanoramaProvenanceEntry agency + licence (0.9.8)', () => {
  it('credits each licence to its own agency, not CNSA', () => {
    expect(entry('ISRO-EDU').agency).toBe('ISRO');
    expect(entry('JAXA-OPEN').agency).toBe('JAXA');
    expect(entry('PD-Russia').agency).toBe('Roscosmos');
    expect(entry('SpaceIL-EDU').agency).toBe('SpaceIL');
    expect(entry('PD-NASA').agency).toBe('NASA');
    expect(entry('CNSA-EDU').agency).toBe('CNSA');
  });

  it('takes ISRO / JAXA / Soviet licence URL and rationale from the allowlist', () => {
    expect(entry('ISRO-EDU').license_url).toContain('isro.gov.in');
    expect(entry('JAXA-OPEN').license_url).toContain('jaxa.jp');
    expect(entry('PD-Russia').license_rationale).not.toContain('China National Space');
  });

  it('keeps CNSA and NASA wording unchanged', () => {
    expect(entry('CNSA-EDU').license_url).toBe('https://www.cnsa.gov.cn/english/');
    expect(entry('PD-NASA').license_rationale).toContain('17 U.S.C. §105');
  });
});
