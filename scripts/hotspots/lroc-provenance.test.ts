import { describe, it, expect } from 'vitest';
import { buildLrocProvenanceEntry, isLrocPdsUrl, LROC_TERMS_URL } from './provenance';

const build = (sourceUrl: string) =>
  buildLrocProvenanceEntry({
    outputPath: 'static/images/hotspots/moon/x/tier2-lroc.jpg',
    sourceUrl,
    productId: 'P',
    siteId: 'x',
    centerLat: 1,
    centerLon: 2,
  });

const PDS =
  'https://pds.lroc.im-ldi.com/data/LRO-L-LROC-5-RDR-V1.0/LROLRC_2001/DATA/BDR/NAC_ROI/X/X_5M.IMG';
const WEB = 'https://lroc.im-ldi.com/data/support/featured_sites/Luna/16/M141899500L.jpg';

describe('LROC provenance: PDS vs website (2026-11-09 terms)', () => {
  it('classifies by host', () => {
    expect(isLrocPdsUrl(PDS)).toBe(true);
    expect(isLrocPdsUrl(WEB)).toBe(false);
    expect(isLrocPdsUrl('https://lroc.im-ldi.com/ckeditor_assets/pictures/1/x.png')).toBe(false);
    expect(isLrocPdsUrl('not a url')).toBe(false);
  });

  it('PDS products stay public domain', () => {
    const e = build(PDS);
    expect(e.license_short).toBe('PD-NASA');
    expect(e.license_url).not.toBe(LROC_TERMS_URL);
  });

  it('LROC-website products are LROC-EDU with the terms page and the exact credit', () => {
    const e = build(WEB);
    expect(e.license_short).toBe('LROC-EDU');
    expect(e.license_url).toBe(LROC_TERMS_URL);
    expect(e.author).toBe('NASA/GSFC/Arizona State University');
    expect(e.license_rationale).not.toMatch(/17 U\.S\.C/);
  });
});
