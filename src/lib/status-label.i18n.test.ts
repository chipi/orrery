import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/paraglide/runtime', async (importOriginal) => ({
  ...(await importOriginal<typeof import('$lib/paraglide/runtime')>()),
  getLocale: () => 'de',
}));

const { fleetStatusLabel, missionStatusLabel, programStatusLabel, surfaceStatusLabel } =
  await import('./status-label');

// Status codes rendered as raw English in every locale until these labels.
describe('status labels in a non-English locale', () => {
  it('every code resolves to the de wording, not the code', () => {
    expect(['ACTIVE', 'FLOWN', 'PLANNED', 'CANCELLED'].map(missionStatusLabel)).toEqual([
      'AKTIV',
      'GEFLOGEN',
      'GEPLANT',
      'ABGESAGT',
    ]);
    expect(['ACTIVE', 'FLOWN', 'RETIRED', 'FAILED', 'PLANNED'].map(fleetStatusLabel)).toEqual([
      'AKTIV',
      'GEFLOGEN',
      'AUSGEMUSTERT',
      'FEHLGESCHLAGEN',
      'GEPLANT',
    ]);
    expect(['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map(programStatusLabel)).toEqual([
      'GEPLANT',
      'AKTIV',
      'ABGESCHLOSSEN',
      'EINGESTELLT',
    ]);
    for (const code of ['ACTIVE', 'FLOWN', 'PLANNED', 'RETIRED', 'ENDED', 'CRASHED', 'LOST']) {
      expect(surfaceStatusLabel(code)).not.toBe(code);
    }
  });
});
