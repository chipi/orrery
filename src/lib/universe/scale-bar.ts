// One scale-bar rule for the whole app (UXD-021): the bar keeps a constant pixel width at
// every zoom and the value beside it follows the zoom. Explore's strip and both Worlds
// bars draw through this module, so there is no second rounding rule.

/** Bar width on a desktop-sized view. */
export const SCALE_BAR_WIDTH_PX = 120;
/** Bar width under `SCALE_BAR_PHONE_BELOW_PX` wide (it shares a line with other readouts). */
export const SCALE_BAR_PHONE_WIDTH_PX = 64;
export const SCALE_BAR_PHONE_BELOW_PX = 600;

export interface FixedScaleBar {
  /** World length the bar spans, in the caller's unit (AU, km, …). */
  units: number;
  /** On-screen width of the bar, in pixels (always the input width). */
  widthPx: number;
}

/** The constant bar width for a view `viewW` pixels wide; 0 or unknown width reads as desktop. */
export function scaleBarWidth(viewW: number): number {
  return viewW > 0 && viewW < SCALE_BAR_PHONE_BELOW_PX
    ? SCALE_BAR_PHONE_WIDTH_PX
    : SCALE_BAR_WIDTH_PX;
}

/** A bar `widthPx` wide at `unitsPerPx`; null when the input is not a usable positive number. */
export function fixedScaleBar(unitsPerPx: number, widthPx: number): FixedScaleBar | null {
  if (!Number.isFinite(unitsPerPx) || unitsPerPx <= 0) return null;
  if (!Number.isFinite(widthPx) || widthPx <= 0) return null;
  return { units: unitsPerPx * widthPx, widthPx };
}

/** The bar value to three significant digits (1.37, 13.7, 137), in `locale`'s digits and separators. */
export function formatBarValue(units: number, locale?: string): string {
  return units.toLocaleString(locale, { maximumSignificantDigits: 3 });
}

/** A Worlds bar length in the unit that reads cleanly: km from 1 km up, metres below. */
export function worldsBarQuantity(km: number): { value: number; unit: 'km' | 'm' } {
  return km >= 1 ? { value: km, unit: 'km' } : { value: km * 1000, unit: 'm' };
}
