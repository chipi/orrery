import { describe, expect, it } from 'vitest';
import { cleanFilename, imageStem, isNonDescriptiveAlt, pickAlt, subjectToAlt } from './alt-text';

describe('alt-text baseline (#389)', () => {
  it('flags captions that name the file, not the picture', () => {
    expect(isNonDescriptiveAlt('File:Gaia spacecraft 360 Gaia Sky.jpg')).toBe(true);
    expect(isNonDescriptiveAlt('NASA Images search result — chandra / "chandra x-ray"')).toBe(true);
    expect(isNonDescriptiveAlt('Uncurated panel image — fleet-galleries/a7l')).toBe(true);
    expect(isNonDescriptiveAlt('Curated panel image — beidou slot 4')).toBe(true);
    expect(isNonDescriptiveAlt('A Soyuz spacecraft docked to the ISS')).toBe(false);
    expect(isNonDescriptiveAlt('HiRISE ESP_040363_1915 — patch centred at 11.530°N')).toBe(false);
  });

  it('keys crops and formats to one stem', () => {
    expect(imageStem('/images/earth-objects/beidou/01.1x1.jpg')).toBe(
      '/images/earth-objects/beidou/01',
    );
    expect(imageStem('/images/earth-objects/beidou/01.webp')).toBe(
      '/images/earth-objects/beidou/01',
    );
  });

  it('trims a vision subject to its first clause', () => {
    expect(
      subjectToAlt(
        'ESA Gaia space observatory with its thermal shield, shown against a dark background — appears to be a render.',
      ),
    ).toBe('ESA Gaia space observatory with its thermal shield, shown against a dark background');
  });

  it('builds a readable fallback from the caption itself', () => {
    expect(cleanFilename('File:Beidou satellite mockup at FING UNLP 03.jpg')).toBe(
      'Beidou satellite mockup at FING UNLP',
    );
    expect(cleanFilename('NASA Images search result — chandra / "chandra x-ray observatory"')).toBe(
      'Chandra x-ray observatory',
    );
    expect(cleanFilename('Curated panel image — beidou slot 7')).toBe('Beidou');
    expect(cleanFilename('Uncurated panel image — fleet-galleries/a7lb')).toBe('A7lb');
  });

  it('prefers a real caption, then the vision subject, then the fallback', () => {
    const vision = new Map([['/images/x/01', 'A rover on red sand.']]);
    expect(pickAlt({ path: '/images/x/01.webp', title: 'Curiosity at Gale crater' }, vision)).toBe(
      'Curiosity at Gale crater',
    );
    expect(pickAlt({ path: '/images/x/01.1x1.jpg', title: 'File:PIA1234.jpg' }, vision)).toBe(
      'A rover on red sand',
    );
    expect(pickAlt({ path: '/images/y/02.webp', title: 'File:Mars rover 05.jpg' }, vision)).toBe(
      'Mars rover',
    );
  });
});
