/**
 * FleetEntryPanel spec-grid rows, extracted so the keyed-each key contract
 * is unit-testable without mounting the panel (fleet-spec-rows.test.ts).
 *
 * #622: the panel's spec grid is a keyed each and used to key rows by the
 * display label — but the table below legitimately renders the same label
 * twice ("Thrust" once per thrust figure, "Specific impulse" once per isp
 * field), and five shipped engines carry both isp_vac_s and isp_sl_s. Two
 * rows then shared one key and Svelte's runtime threw `each_key_duplicate`
 * when the entry panel opened on /fleet. Rows now carry `key` — the spec
 * field name, unique per row by construction — and the panel keys the each
 * block on it. Labels stay display copy and may repeat; keys may not.
 */

export interface FleetSpecRow {
  /** Spec field name — the keyed-each key. Unique per row by construction. */
  key: string;
  /** Display label, as rendered in the spec grid. May repeat across rows. */
  label: string;
  value: string;
}

/** Shape of `FleetEntry.specs` ($types/fleet.ts). */
type FleetSpecs = Record<string, number | string | boolean>;

/**
 * Render the spec grid in a stable order — only fields actually present
 * in the entry render, so skeleton entries with empty specs simply show
 * fewer rows.
 */
export function buildSpecRows(specs: FleetSpecs): FleetSpecRow[] {
  const rows: FleetSpecRow[] = [];
  const fmt = (v: number | string | boolean | undefined): string | null => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number') return v.toLocaleString();
    return String(v);
  };
  const push = (label: string, key: string, suffix = '') => {
    const v = fmt(specs[key]);
    if (v !== null) rows.push({ key, label, value: v + suffix });
  };
  // Common
  push('Height', 'height_m', ' m');
  push('Length', 'length_m', ' m');
  push('Diameter', 'diameter_m', ' m');
  push('Mass', 'mass_kg', ' kg');
  push('Thrust', 'thrust_n', ' N');
  push('Stages', 'stages');
  push('Payload to LEO', 'payload_to_leo_kg', ' kg');
  push('Payload to Mars', 'payload_to_mars_kg', ' kg');
  push('Crew capacity', 'crew_capacity');
  push('Mission duration', 'mission_duration_days', ' d');
  push('Pressurised volume', 'pressurized_volume_m3', ' m³');
  push('Power source', 'power_source');
  push('Primary mirror', 'primary_mirror_m', ' m');
  push('Wavelength', 'wavelengths');
  push('Mission target', 'mission_target');
  push('Instruments', 'instruments_count');
  // Engine (PRD-032) — one of thrust_kn_sl/vac is present per engine.
  push('Cycle', 'cycle');
  push('Propellant', 'propellant');
  push('Thrust', 'thrust_kn_sl', ' kN (sea level)');
  push('Thrust', 'thrust_kn_vac', ' kN (vacuum)');
  push('Specific impulse', 'isp_vac_s', ' s (vac)');
  push('Specific impulse', 'isp_sl_s', ' s (sea level)');
  return rows;
}
