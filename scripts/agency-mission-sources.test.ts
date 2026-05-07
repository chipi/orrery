import { describe, expect, it, vi } from 'vitest';
import {
  fetchAgencyPrimaryImageUrls,
  normalizeAgency,
  type FetchNasaGalleryUrlsFn,
} from './agency-mission-sources.js';

describe('normalizeAgency', () => {
  it('maps index.json agency strings to closed keys', () => {
    expect(normalizeAgency('NASA')).toBe('NASA');
    expect(normalizeAgency('ROSCOSMOS')).toBe('ROSCOSMOS');
    expect(normalizeAgency('ESA')).toBe('ESA');
    expect(normalizeAgency('CNSA')).toBe('CNSA');
    expect(normalizeAgency('ISRO')).toBe('ISRO');
    expect(normalizeAgency('JAXA')).toBe('JAXA');
    expect(normalizeAgency('UAESA')).toBe('UAESA');
    expect(normalizeAgency('SpaceX')).toBe('SPACEX');
    expect(normalizeAgency('Blue Origin')).toBe('BLUE_ORIGIN');
    expect(normalizeAgency('Inspiration Mars')).toBe('INSPIRATION_MARS');
  });

  it('trims whitespace', () => {
    expect(normalizeAgency('  NASA  ')).toBe('NASA');
  });

  it('returns UNKNOWN for unexpected strings', () => {
    expect(normalizeAgency('ACME')).toBe('UNKNOWN');
  });
});

describe('fetchAgencyPrimaryImageUrls', () => {
  it('calls NASA fetcher only for NASA agency key', async () => {
    const fetchNasaGalleryUrls = vi.fn<FetchNasaGalleryUrlsFn>().mockResolvedValue(['https://img/a.jpg']);
    const r = await fetchAgencyPrimaryImageUrls({
      agencyKey: 'NASA',
      missionId: 'curiosity',
      query: 'curiosity rover',
      max: 5,
      fetchNasaGalleryUrls,
    });
    expect(fetchNasaGalleryUrls).toHaveBeenCalledWith('curiosity rover', 5, 'curiosity');
    expect(r.urls).toEqual(['https://img/a.jpg']);
    expect(r.sourceTag).toBe('nasa-api');
  });

  it('returns empty primary for non-NASA agencies', async () => {
    const fetchNasaGalleryUrls = vi.fn<FetchNasaGalleryUrlsFn>();
    const r = await fetchAgencyPrimaryImageUrls({
      agencyKey: 'ESA',
      missionId: 'mars-express',
      query: 'mars express',
      max: 5,
      fetchNasaGalleryUrls,
    });
    expect(fetchNasaGalleryUrls).not.toHaveBeenCalled();
    expect(r.urls).toEqual([]);
    expect(r.sourceTag).toBe('none');
  });

  it('maps empty NASA result to nasa-api-empty', async () => {
    const fetchNasaGalleryUrls = vi.fn<FetchNasaGalleryUrlsFn>().mockResolvedValue([]);
    const r = await fetchAgencyPrimaryImageUrls({
      agencyKey: 'NASA',
      missionId: 'dawn',
      query: 'dawn spacecraft',
      max: 5,
      fetchNasaGalleryUrls,
    });
    expect(r.sourceTag).toBe('nasa-api-empty');
  });

  it('maps NASA fetcher rejection to nasa-api-empty', async () => {
    const fetchNasaGalleryUrls = vi.fn<FetchNasaGalleryUrlsFn>().mockRejectedValue(new Error('network'));
    const r = await fetchAgencyPrimaryImageUrls({
      agencyKey: 'NASA',
      missionId: 'voyager-2',
      query: 'voyager 2',
      max: 3,
      fetchNasaGalleryUrls,
    });
    expect(r.urls).toEqual([]);
    expect(r.sourceTag).toBe('nasa-api-empty');
  });
});
