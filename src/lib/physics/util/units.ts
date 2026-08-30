/**
 * Physics-kernel unit vocabulary (S2a · RFC-037 §5 · Fable-5-frozen contract).
 *
 * A CLOSED string-literal union — audited against every M1–M6 + Family-B kernel
 * output. Closed on purpose: it catches unit errors at the type level. Adding a
 * member later is additive (it never serializes into `.orrlab.json`). `as Unit`
 * casts are lint-banned in `physics/**` (they smuggle wrong units past the
 * compiler — the exact hazard this union exists to prevent).
 */
export type Unit =
  | 'km'
  | 'm'
  | 'AU' // length
  | 'km/s'
  | 'm/s'
  | 'AU/yr' // velocity
  | 'm/s2' // acceleration
  | 's'
  | 'day'
  | 'yr' // time
  | 'kg'
  | 'N'
  | 'kg*m/s'
  | 'N*s' // mass, force, momentum, impulse
  | 'J'
  | 'W' // energy, power
  | 'deg'
  | 'rad'
  | 'K'
  | 'Pa'
  | ''; // angle, temperature, pressure, dimensionless

/** A physical quantity: a value with its unit. The atom of a `FormulaResult`. */
export interface Quantity {
  value: number;
  units: Unit;
}
