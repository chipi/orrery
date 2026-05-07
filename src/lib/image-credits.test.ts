import { describe, expect, it, vi, beforeEach } from 'vitest';

// Stub Paraglide message functions so the helper's output is observable
// without depending on compiled message bundles in test env. The mock
// returns predictable strings keyed by message id and (where present)
// the rendered agency_name parameter.
vi.mock('$lib/paraglide/messages', () => {
  return {
    mp_gallery_credit: () => '[mp_gallery_credit]',
    panel_gallery_credit: () => '[panel_gallery_credit]',
    mp_gallery_credit_agency: ({ agency_name }: { agency_name: string }) =>
      `[mp_gallery_credit_agency:${agency_name}]`,
    panel_gallery_credit_agency: ({ agency_name }: { agency_name: string }) =>
      `[panel_gallery_credit_agency:${agency_name}]`,
  };
});

import {
  normalizeAgencyForCredit,
  missionGalleryCredit,
  panelGalleryCredit,
} from './image-credits';

describe('normalizeAgencyForCredit', () => {
  it('maps NASA / ROSCOSMOS / ESA / JAXA / ISRO / CNSA / UAESA / CSA', () => {
    expect(normalizeAgencyForCredit('NASA')).toBe('NASA');
    expect(normalizeAgencyForCredit('ROSCOSMOS')).toBe('ROSCOSMOS');
    expect(normalizeAgencyForCredit('ESA')).toBe('ESA');
    expect(normalizeAgencyForCredit('JAXA')).toBe('JAXA');
    expect(normalizeAgencyForCredit('ISRO')).toBe('ISRO');
    expect(normalizeAgencyForCredit('CNSA')).toBe('CNSA');
    expect(normalizeAgencyForCredit('UAESA')).toBe('UAESA');
    expect(normalizeAgencyForCredit('CSA')).toBe('CSA');
  });

  it('maps SpaceX / Blue Origin / Inspiration Mars (private operators)', () => {
    expect(normalizeAgencyForCredit('SpaceX')).toBe('SPACEX');
    expect(normalizeAgencyForCredit('Blue Origin')).toBe('BLUE_ORIGIN');
    expect(normalizeAgencyForCredit('Inspiration Mars')).toBe('INSPIRATION_MARS');
  });

  it('treats Soviet / Roskosmos as ROSCOSMOS for credit grouping', () => {
    expect(normalizeAgencyForCredit('Soviet')).toBe('ROSCOSMOS');
    expect(normalizeAgencyForCredit('Soviet Academy of Sciences')).toBe('ROSCOSMOS');
    expect(normalizeAgencyForCredit('Roskosmos')).toBe('ROSCOSMOS');
  });

  it('returns MIXED for compound strings with multiple recognised agencies', () => {
    expect(normalizeAgencyForCredit('NASA / ESA')).toBe('MIXED');
    expect(normalizeAgencyForCredit('NASA / ESA / CSA')).toBe('MIXED');
    expect(normalizeAgencyForCredit('CSA / NASA')).toBe('MIXED');
  });

  it('strips parenthetical notes before tokenising', () => {
    // "Roscosmos / NASA (funded)" -> Roscosmos + NASA -> MIXED
    expect(normalizeAgencyForCredit('Roscosmos / NASA (funded)')).toBe('MIXED');
    // "NASA (Goddard)" -> NASA only -> NASA
    expect(normalizeAgencyForCredit('NASA (Goddard)')).toBe('NASA');
  });

  it('returns UNKNOWN for empty/garbage/unrecognised', () => {
    expect(normalizeAgencyForCredit('')).toBe('UNKNOWN');
    expect(normalizeAgencyForCredit('   ')).toBe('UNKNOWN');
    expect(normalizeAgencyForCredit('FooBar Space')).toBe('UNKNOWN');
  });

  it('is case-insensitive for the canonical tokens', () => {
    expect(normalizeAgencyForCredit('nasa')).toBe('NASA');
    expect(normalizeAgencyForCredit('jaxa')).toBe('JAXA');
    expect(normalizeAgencyForCredit('spacex')).toBe('SPACEX');
  });
});

describe('missionGalleryCredit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the agency-specific copy when the mission has a single recognised agency', () => {
    expect(missionGalleryCredit('NASA')).toBe('[mp_gallery_credit_agency:NASA]');
    expect(missionGalleryCredit('ESA')).toBe('[mp_gallery_credit_agency:ESA]');
    expect(missionGalleryCredit('JAXA')).toBe('[mp_gallery_credit_agency:JAXA]');
    expect(missionGalleryCredit('CNSA')).toBe('[mp_gallery_credit_agency:CNSA]');
    expect(missionGalleryCredit('SpaceX')).toBe('[mp_gallery_credit_agency:SpaceX]');
  });

  it('expands ROSCOSMOS to include the historical Soviet attribution label', () => {
    expect(missionGalleryCredit('ROSCOSMOS')).toBe(
      '[mp_gallery_credit_agency:Roscosmos / Soviet Academy of Sciences]',
    );
  });

  it('uses MBRSC label for UAESA', () => {
    expect(missionGalleryCredit('UAESA')).toBe(
      '[mp_gallery_credit_agency:MBRSC (UAE Space Agency)]',
    );
  });

  it('falls back to mixed-source copy for compound or unrecognised agencies', () => {
    expect(missionGalleryCredit('NASA / ESA')).toBe('[mp_gallery_credit]');
    expect(missionGalleryCredit('Some Random Org')).toBe('[mp_gallery_credit]');
  });

  it('falls back to mixed-source copy for nullish or empty agency', () => {
    expect(missionGalleryCredit(undefined)).toBe('[mp_gallery_credit]');
    expect(missionGalleryCredit(null)).toBe('[mp_gallery_credit]');
    expect(missionGalleryCredit('')).toBe('[mp_gallery_credit]');
  });
});

describe('panelGalleryCredit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders agency-specific copy for single-agency panels (e.g. ISS Kibo / JAXA, Tiangong / CNSA)', () => {
    expect(panelGalleryCredit('JAXA')).toBe('[panel_gallery_credit_agency:JAXA]');
    expect(panelGalleryCredit('CNSA')).toBe('[panel_gallery_credit_agency:CNSA]');
  });

  it('falls back to mixed-source copy for ISS modules with joint operators (NASA / ESA)', () => {
    expect(panelGalleryCredit('NASA / ESA')).toBe('[panel_gallery_credit]');
    expect(panelGalleryCredit('CSA / NASA')).toBe('[panel_gallery_credit]');
    expect(panelGalleryCredit('Roscosmos / NASA (funded)')).toBe('[panel_gallery_credit]');
  });

  it('falls back to mixed-source copy for nullish, empty, or unrecognised agency', () => {
    expect(panelGalleryCredit(undefined)).toBe('[panel_gallery_credit]');
    expect(panelGalleryCredit(null)).toBe('[panel_gallery_credit]');
    expect(panelGalleryCredit('')).toBe('[panel_gallery_credit]');
    expect(panelGalleryCredit('SomeOrg')).toBe('[panel_gallery_credit]');
  });

  it('handles array-joined earth-object agencies — multi-agency goes mixed, single goes specific', () => {
    // ISS shipped as ['NASA','ESA','JAXA','ROSCOSMOS','CSA'] — joined with ' / '
    expect(panelGalleryCredit(['NASA', 'ESA', 'JAXA', 'ROSCOSMOS', 'CSA'].join(' / '))).toBe(
      '[panel_gallery_credit]',
    );
    // Tiangong shipped as ['CNSA']
    expect(panelGalleryCredit(['CNSA'].join(' / '))).toBe('[panel_gallery_credit_agency:CNSA]');
  });
});
