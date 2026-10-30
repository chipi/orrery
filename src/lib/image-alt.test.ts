import { afterEach, describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const EN = JSON.parse(readFileSync('static/data/image-alt-text/en-US.json', 'utf8')) as Record<
  string,
  string
>;
const enPath = Object.keys(EN)[0];

// Fresh module per test: the maps live in module state.
async function fresh() {
  vi.resetModules();
  return import('./image-alt');
}

function stubFetch(files: Record<string, Record<string, string>>) {
  const fetchSpy = vi.fn(async (url: string) => {
    const hit = Object.entries(files).find(([name]) => url.endsWith(`/image-alt-text/${name}`));
    return hit ? new Response(JSON.stringify(hit[1])) : new Response('', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchSpy);
  return fetchSpy;
}

const settle = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => vi.unstubAllGlobals());

describe('getImageAlt — locale-aware alt-text accessor', () => {
  it('ships no map: nothing is loaded until the first lookup', async () => {
    const { loadedLocales } = await fresh();
    expect(loadedLocales()).toEqual([]);
  });

  it('the first lookup in the browser fetches en-US and the locale, then resolves', async () => {
    vi.stubGlobal('window', {});
    const fetchSpy = stubFetch({
      'en-US.json': { [enPath]: EN[enPath], '/images/only-en.jpg': 'English only' },
      'de.json': { [enPath]: 'Deutsch' },
    });
    const { getImageAlt } = await fresh();
    expect(getImageAlt(enPath, 'de')).toBe('');
    await settle();
    expect(fetchSpy).toHaveBeenCalledWith('/data/image-alt-text/en-US.json');
    expect(fetchSpy).toHaveBeenCalledWith('/data/image-alt-text/de.json');
    expect(getImageAlt(enPath, 'de')).toBe('Deutsch');
    // A path the partial locale file lacks falls back to en-US.
    expect(getImageAlt('/images/only-en.jpg', 'de')).toBe('English only');
    expect(getImageAlt('/images/no-such-image-at-all.jpg', 'de')).toBe('');
    // Each map is fetched once, however many lookups follow.
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('a locale with no file falls back to en-US', async () => {
    vi.stubGlobal('window', {});
    stubFetch({ 'en-US.json': { [enPath]: EN[enPath] } });
    const { getImageAlt } = await fresh();
    getImageAlt(enPath, 'ja');
    await settle();
    expect(getImageAlt(enPath, 'ja')).toBe(EN[enPath]);
  });

  it('does not fetch during SSR', async () => {
    const fetchSpy = stubFetch({});
    const { getImageAlt } = await fresh();
    expect(getImageAlt(enPath, 'en-US')).toBe('');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('picks localized alt-text when locale is registered', async () => {
    const { getImageAlt, registerLocaleAltText } = await fresh();
    registerLocaleAltText('ja', { '/images/test/foo.jpg': 'テスト画像' });
    expect(getImageAlt('/images/test/foo.jpg', 'ja')).toBe('テスト画像');
    expect(getImageAlt('/images/test/foo.jpg', 'en-US')).toBe('');
  });

  // The mobile app streams non-default locale data from the CDN, so the loader
  // must fetch under the origin it is given.
  it('loadLocaleAltText fetches the locale file under the origin it is given', async () => {
    const fetchSpy = stubFetch({ 'de.json': { '/images/x.jpg': 'Bild' } });
    const { getImageAlt, loadLocaleAltText } = await fresh();
    await loadLocaleAltText('de', 'https://cdn.example/orrery');
    expect(fetchSpy).toHaveBeenCalledWith('https://cdn.example/orrery/data/image-alt-text/de.json');
    expect(getImageAlt('/images/x.jpg', 'de')).toBe('Bild');
  });
});
