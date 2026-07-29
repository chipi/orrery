import { describe, it, expect } from 'vitest';
import {
  STREAM_ORIGIN,
  resolveAssetOrigin,
  resolveStreamedUrl,
  resolveLocaleBundleOrigin,
  assetOrigin,
  assetUrl,
  streamedUrl,
  localeBundleOrigin,
} from './asset-url';

// The pure resolvers are parameterised on `mobile` + `base` so BOTH the browser
// and Capacitor paths are covered. The bound public API runs under __MOBILE__ =
// false in the test build (vitest define), so it exercises the browser path.

describe('resolveAssetOrigin', () => {
  it('streams from the CDN origin under mobile', () => {
    expect(resolveAssetOrigin(true, '')).toBe(STREAM_ORIGIN);
    expect(resolveAssetOrigin(true, '/orrery')).toBe(STREAM_ORIGIN);
  });
  it('is the local base off mobile (browser / GH Pages)', () => {
    expect(resolveAssetOrigin(false, '')).toBe('');
    expect(resolveAssetOrigin(false, '/orrery')).toBe('/orrery');
  });
});

describe('resolveStreamedUrl', () => {
  it('prefixes /images and /audio with the CDN origin under mobile', () => {
    expect(resolveStreamedUrl('/images/fleet-galleries/dawn/01.jpg', true)).toBe(
      `${STREAM_ORIGIN}/images/fleet-galleries/dawn/01.jpg`,
    );
    expect(resolveStreamedUrl('/audio/episodes/en-US/x.mp3', true)).toBe(
      `${STREAM_ORIGIN}/audio/episodes/en-US/x.mp3`,
    );
  });
  it('leaves non-streamed buckets alone under mobile (textures/data stay bundled)', () => {
    expect(resolveStreamedUrl('/textures/2k_mars.jpg', true)).toBe('/textures/2k_mars.jpg');
    expect(resolveStreamedUrl('/data/missions/apollo11.json', true)).toBe(
      '/data/missions/apollo11.json',
    );
    // Already-absolute or base-prefixed paths don't match the /images/ prefix.
    expect(resolveStreamedUrl('/orrery/images/x.jpg', true)).toBe('/orrery/images/x.jpg');
  });
  it('is a no-op off mobile', () => {
    expect(resolveStreamedUrl('/images/x.jpg', false)).toBe('/images/x.jpg');
    expect(resolveStreamedUrl('/audio/x.mp3', false)).toBe('/audio/x.mp3');
  });
});

describe('resolveLocaleBundleOrigin', () => {
  it('keeps the default locale local (offline from install)', () => {
    expect(resolveLocaleBundleOrigin('en-US', true, '', 'en-US')).toBe('');
    expect(resolveLocaleBundleOrigin('en-US', true, '/orrery', 'en-US')).toBe('/orrery');
  });
  it('streams non-default locales under mobile', () => {
    expect(resolveLocaleBundleOrigin('de', true, '', 'en-US')).toBe(STREAM_ORIGIN);
    expect(resolveLocaleBundleOrigin('zh-CN', true, '', 'en-US')).toBe(STREAM_ORIGIN);
  });
  it('is the local base off mobile for every locale', () => {
    expect(resolveLocaleBundleOrigin('de', false, '/orrery', 'en-US')).toBe('/orrery');
    expect(resolveLocaleBundleOrigin('en-US', false, '', 'en-US')).toBe('');
  });
  it('never streams during build-time prerender (ssr=true), even under mobile', () => {
    // Regression: a MOBILE build's prerender used to fetch non-default-locale
    // bundles from the external stream CDN, which intermittently 404'd and
    // killed the prerender. Build-time must resolve every locale locally.
    expect(resolveLocaleBundleOrigin('zh-CN', true, '/orrery', 'en-US', true)).toBe('/orrery');
    expect(resolveLocaleBundleOrigin('de', true, '', 'en-US', true)).toBe('');
    expect(resolveLocaleBundleOrigin('en-US', true, '/orrery', 'en-US', true)).toBe('/orrery');
  });
});

describe('bound public API (browser build, __MOBILE__ === false)', () => {
  it('assetOrigin is the local base, so URLs are unchanged', () => {
    expect(assetOrigin).toBe(''); // base is '' in the test env
    expect(assetUrl('/images/x.jpg')).toBe('/images/x.jpg');
  });
  it('streamedUrl is a no-op and localeBundleOrigin is local', () => {
    expect(streamedUrl('/images/x.jpg')).toBe('/images/x.jpg');
    expect(localeBundleOrigin('de')).toBe('');
    expect(localeBundleOrigin('en-US')).toBe('');
  });
});
