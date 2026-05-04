import { describe, it, expect } from 'vitest';
import {
  formatDay,
  formatDeltaV,
  formatKm,
  formatKmPerSec,
  formatLightMinutes,
  formatMegaKm,
  formatNumber,
} from './format';

describe('formatNumber', () => {
  it('en-US uses comma grouping + dot decimal', () => {
    expect(formatNumber(1000.5, 'en-US', 1)).toBe('1,000.5');
    expect(formatNumber(1234567, 'en-US', 0)).toBe('1,234,567');
  });
  it('es uses dot grouping + comma decimal', () => {
    expect(formatNumber(1000.5, 'es', 1)).toBe('1000,5');
    expect(formatNumber(1234567, 'es', 0)).toBe('1.234.567');
  });
});

describe('formatKm', () => {
  it('appends km unit (locale-correct grouping)', () => {
    expect(formatKm(326, 'en-US')).toBe('326 km');
    expect(formatKm(1234, 'en-US')).toBe('1,234 km');
    expect(formatKm(1234, 'es')).toBe('1234 km');
  });
});

describe('formatMegaKm', () => {
  it('appends M km label', () => {
    expect(formatMegaKm(144, 'en-US')).toBe('144 M km');
  });
});

describe('formatKmPerSec', () => {
  it('two-decimal velocity', () => {
    expect(formatKmPerSec(29.78, 'en-US')).toBe('29.78 km/s');
    expect(formatKmPerSec(29.78, 'es')).toBe('29,78 km/s');
  });
});

describe('formatDay', () => {
  it('rounds to integer', () => {
    expect(formatDay(254.4, 'en-US')).toBe('254');
    expect(formatDay(254.6, 'en-US')).toBe('255');
  });
});

describe('formatLightMinutes', () => {
  it('two decimals + l-min suffix', () => {
    expect(formatLightMinutes(0.45, 'en-US')).toBe('0.45 l-min');
    expect(formatLightMinutes(0.45, 'es')).toBe('0,45 l-min');
  });
});

describe('formatDeltaV', () => {
  it('matches km/s formatting', () => {
    expect(formatDeltaV(3.61, 'en-US')).toBe('3.61 km/s');
  });
});
