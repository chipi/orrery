import { describe, expect, it, vi } from 'vitest';

const { state } = vi.hoisted(() => ({ state: { locale: 'ru' } }));

vi.mock('$app/environment', () => ({ browser: true }));
vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$lib/paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/paraglide/runtime')>()),
  getLocale: () => state.locale,
}));
vi.mock('$lib/locale', () => ({
  localHref: (p: string) => (state.locale === 'en-US' ? p : `/${state.locale}${p}`),
}));
vi.mock('$lib/data/core', () => ({
  loadI18nBundle: async (locale: string) =>
    locale === 'en-US'
      ? { 'fleet/orbiter/mro.json': { name: 'Mars Reconnaissance Orbiter' } }
      : {
          'missions/moon/luna16.json': { name: 'Луна-16' },
          'missions/moon/change4.json': { name: '嫦娥四号 / 玉兔二号' },
          'fleet/lander/luna-16.json': { name: 'Луна-16' },
          'missions/moon/apollo11.json': { name: 'Apollo 11' },
        },
}));
vi.stubGlobal(
  'fetch',
  vi.fn(async (url: string) => ({
    ok: true,
    json: async () =>
      url.includes('missions')
        ? [{ id: 'luna16' }, { id: 'change4' }, { id: 'apollo11' }]
        : [{ id: 'luna-16' }, { id: 'mro' }],
  })),
);

const { linkifyMission, linkifyMissionEntry, loadMissionIndex } =
  await import('./missions-linkify');

// Body panels show the locale's own mission names (origin-language rule);
// the id candidates only match Latin names, so these lost their link.
describe('mission links from localized names', () => {
  it('links «Луна-16» to the mission, not the fleet entry', async () => {
    await loadMissionIndex();
    const link = linkifyMission('«Луна-16» — СССР, 1970 (первая автоматическая доставка грунта)');
    expect(link?.href).toBe('/ru/missions?id=luna16');
    expect(link?.label).toBe('«Луна-16»');
  });

  it('links one part of a compound localized name', async () => {
    await loadMissionIndex();
    expect(linkifyMission('嫦娥四号 — 中国，2019 年')?.href).toBe('/ru/missions?id=change4');
  });

  it('still resolves Latin names by id', async () => {
    await loadMissionIndex();
    expect(linkifyMission('Apollo 11 — США, 1969')?.href).toBe('/ru/missions?id=apollo11');
    expect(linkifyMissionEntry('Apollo 11 — США').find((s) => s.href)?.href).toBe(
      '/ru/missions?id=apollo11',
    );
  });

  // English entries name missions by their full title; the id candidates miss
  // "Mars Reconnaissance Orbiter" (id mro), the en-US bundle name finds it.
  it('resolves an en-US full name through the en-US bundle', async () => {
    state.locale = 'en-US';
    await loadMissionIndex();
    expect(linkifyMission('Mars Reconnaissance Orbiter — NASA, 2006')?.href).toBe('/fleet?id=mro');
    state.locale = 'ru';
  });
});
