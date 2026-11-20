import { describe, it, expect } from 'vitest';
import { normaliseLicenseShortName, isAllowedLicense } from './license-allowlist';

describe('normaliseLicenseShortName', () => {
  it('keeps the common Commons shorts', () => {
    expect(normaliseLicenseShortName('CC BY 4.0')).toBe('CC-BY-4.0');
    expect(normaliseLicenseShortName('cc by-sa 3.0')).toBe('CC-BY-SA-3.0');
    expect(normaliseLicenseShortName('CC BY 3.0 IGO')).toBe('CC-BY-3.0-IGO');
    expect(normaliseLicenseShortName('Public domain')).toBe('PD-Old');
  });

  // Backlog S9: "CC BY 2.1 jp" (the Kaguya launch photo, the H-IIA hero) fell through to the
  // bare "CC BY" rule and was recorded as CC-BY-4.0, a licence the photographer never gave.
  it('keeps a jurisdiction port the allowlist knows', () => {
    expect(normaliseLicenseShortName('CC BY 2.1 jp')).toBe('CC-BY-2.1-JP');
    expect(normaliseLicenseShortName('CC BY-SA 2.0 de')).toBe('CC-BY-SA-2.0-DE');
    expect(normaliseLicenseShortName('CC BY-SA 2.0 fr')).toBe('CC-BY-SA-2.0-FR');
    for (const s of ['CC-BY-2.1-JP', 'CC-BY-SA-2.0-DE', 'CC-BY-SA-2.0-FR']) {
      expect(isAllowedLicense(s)).toBe(true);
    }
  });

  it('an unknown port keeps its real version, never 4.0', () => {
    expect(normaliseLicenseShortName('CC BY 3.0 nl')).toBe('CC-BY-3.0');
    expect(normaliseLicenseShortName('CC BY-SA 2.5 es')).toBe('CC-BY-SA-2.5');
  });
});
