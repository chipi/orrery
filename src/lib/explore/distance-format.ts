import * as m from '$lib/paraglide/messages';

// A distance from scale-readout ({value, unit: 'km' | 'AU' | 'ly' | 'pc'}) in the locale's own
// unit form (style guide §1a: ru а. е. / св. год / пк, de AE, ar و.ف …). Its own module so a scene
// that only labels a scale bar does not load format.ts's catalogue, plural and galaxy helpers.
export const distanceWithUnit = (value: string, unit: string): string => {
  switch (unit) {
    case 'AU':
      return m.unit_au_value({ value });
    case 'ly':
      return m.unit_ly_value({ value });
    case 'pc':
      return m.unit_pc_value({ value });
    case 'km':
      return m.mp_flight_unit_km({ value });
    case 'm':
      return m.unit_m_value({ value });
    default:
      return `${value} ${unit}`;
  }
};
// The bare unit, for a toggle chip with no number next to it.
export const distanceUnitLabel = (unit: string): string => distanceWithUnit('', unit).trim();
