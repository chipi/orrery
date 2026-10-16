import { describe, expect, it } from 'vitest';
import { textureLicense } from './build-image-provenance';

describe('textureLicense (#596)', () => {
  it('credits a crop variant like its base texture', () => {
    for (const v of ['4k_io.1x1.jpg', '4k_io.4x3.jpg', '4k_io.16x9.jpg']) {
      expect(textureLicense(v)).toEqual(textureLicense('4k_io.jpg'));
    }
    expect(textureLicense('4k_titan.16x9.jpg').license).toBe('PD-NASA');
  });

  it('gives Wikimedia and BJJ textures their own author, not Solar System Scope', () => {
    expect(textureLicense('4k_io.jpg').author).toBe('Björn Jónsson');
    expect(textureLicense('2k_phobos.jpg')).toMatchObject({
      license: 'PD-NASA',
      author: 'NASA / JPL-Caltech / University of Arizona / MRO HiRISE',
    });
  });

  it('keeps Solar System Scope textures and flags an unknown one', () => {
    expect(textureLicense('2k_mars.1x1.jpg')).toMatchObject({
      author: 'Solar System Scope',
      modifications: ['downloaded-from-publisher'],
    });
    expect(textureLicense('9k_unknown.jpg').modifications).toContain('NEEDS-VERIFICATION');
  });
});
