import { describe, expect, it } from 'vitest';
import { textureLicense } from './texture-credit';

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

  it('credits each 2K moon base like the 4K map it is cut from', () => {
    for (const n of ['io', 'titan', 'enceladus', 'pluto']) {
      const k2 = textureLicense(`2k_${n}.jpg`);
      expect(k2.modifications).not.toContain('NEEDS-VERIFICATION');
      expect(k2).toEqual(textureLicense(`4k_${n}.jpg`));
    }
  });

  it('credits the clean global maps, not the labelled chart or the disk photo', () => {
    expect(textureLicense('4k_pluto.jpg').source_url).toContain('Pluto_color_mapmosaic.jpg');
    expect(textureLicense('2k_charon.jpg').source_url).toContain('Cpmap_cyl_PS717_HR_180.jpg');
    expect(textureLicense('4k_enceladus.jpg').source_url).toContain('PIA18435');
  });

  it('keeps Solar System Scope textures and flags an unknown one', () => {
    expect(textureLicense('2k_mars.1x1.jpg')).toMatchObject({
      author: 'Solar System Scope',
      modifications: ['downloaded-from-publisher'],
    });
    expect(textureLicense('9k_unknown.jpg').modifications).toContain('NEEDS-VERIFICATION');
  });
});
