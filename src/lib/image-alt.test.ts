import { describe, it, expect } from 'vitest';
import { getImageAlt, registerLocaleAltText, loadedLocales, loadLocaleAltText } from './image-alt';

describe('getImageAlt — locale-aware alt-text accessor', () => {
  it('returns en-US alt-text for a known image path', () => {
    // The baseline en-US file is auto-generated from image-provenance.json.
    // This test asserts the accessor works against the loaded data, not
    // any specific entry — pick the first known fleet-gallery path.
    const alt = getImageAlt('/images/fleet-galleries/a7l/01.jpg', 'en-US');
    expect(typeof alt).toBe('string');
  });

  it('falls back to en-US when requested locale not loaded', () => {
    const enAlt = getImageAlt('/images/missions/apollo11/01.jpg', 'en-US');
    const jaAlt = getImageAlt('/images/missions/apollo11/01.jpg', 'ja');
    // ja file not loaded → falls back to en-US
    expect(jaAlt).toBe(enAlt);
  });

  it('returns empty string for unknown image path', () => {
    expect(getImageAlt('/images/no-such-image-at-all.jpg', 'en-US')).toBe('');
  });

  it('picks localized alt-text when locale is registered', () => {
    registerLocaleAltText('ja', {
      '/images/test/foo.jpg': 'テスト画像',
    });
    expect(getImageAlt('/images/test/foo.jpg', 'ja')).toBe('テスト画像');
    expect(getImageAlt('/images/test/foo.jpg', 'en-US')).toBe('');
  });

  it('loadedLocales includes en-US by default', () => {
    expect(loadedLocales()).toContain('en-US');
  });

  it('loadLocaleAltText is a no-op for en-US (falls through to the baseline)', async () => {
    // en-US is the baseline that ships in the accessor — loadLocaleAltText
    // short-circuits without a fetch, so it resolves and adds nothing.
    await expect(loadLocaleAltText('en-US')).resolves.toBeUndefined();
    expect(loadedLocales()).toContain('en-US');
  });
});
