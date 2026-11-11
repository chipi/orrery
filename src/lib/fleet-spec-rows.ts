import * as m from '$lib/paraglide/messages';
import type { FleetEntry } from '$types/fleet';

export type SpecRow = { key: string; label: string; value: string };

/**
 * A fleet entry's spec grid in a stable order — only the fields the entry has,
 * so skeleton entries with empty specs simply show fewer rows. Shared by the
 * /fleet?id= panel and the /fleet/<id> page. `locale` formats numbers; left
 * out, the runtime default applies (what the panel has always done).
 */
export function fleetSpecRows(entry: FleetEntry, locale?: string): SpecRow[] {
  const rows: SpecRow[] = [];
  const s = entry.specs ?? {};
  const fmt = (v: number | string | boolean | undefined): string | null => {
    if (v === undefined || v === null || v === '') return null;
    if (typeof v === 'number') return v.toLocaleString(locale);
    return String(v);
  };
  type Unit = (inputs: { value: string }) => string;
  // Engine spec values that are words (cycle names, the two non-symbol propellants);
  // chemical designations (LOX, LH2, RP-1, N2O4, UDMH …) stay as written.
  const CYCLE: Record<string, () => string> = {
    'gas-generator': m.engine_cycle_gas_generator,
    'staged-combustion': m.engine_cycle_staged,
    'staged-combustion (ox-rich)': m.engine_cycle_staged_ox_rich,
    'staged-combustion (full-flow)': m.engine_cycle_staged_full_flow,
    expander: m.engine_cycle_expander,
    'expander-bleed': m.engine_cycle_expander_bleed,
  };
  const cycle: Unit = ({ value }) => CYCLE[value]?.() ?? value;
  const propellant: Unit = ({ value }) =>
    value
      .replace('liquid methane', m.engine_prop_liquid_methane())
      .replace('ethyl alcohol', m.engine_prop_ethyl_alcohol());
  const push = (label: string, key: string, unit?: Unit) => {
    const v = fmt(s[key]);
    if (v !== null) rows.push({ key, label, value: unit ? unit({ value: v }) : v });
  };
  // Common
  push(m.fleet_spec_height(), 'height_m', m.unit_m_value);
  push(m.fleet_spec_length(), 'length_m', m.unit_m_value);
  push(m.fleet_spec_diameter(), 'diameter_m', m.unit_m_value);
  push(m.fleet_spec_mass(), 'mass_kg', m.mp_flight_unit_kg);
  push(m.fleet_spec_thrust(), 'thrust_n', m.unit_n_value);
  push(m.fleet_spec_stages(), 'stages');
  push(m.fleet_spec_payload_leo(), 'payload_to_leo_kg', m.mp_flight_unit_kg);
  push(m.fleet_spec_payload_mars(), 'payload_to_mars_kg', m.mp_flight_unit_kg);
  push(m.fleet_spec_crew(), 'crew_capacity');
  push(m.fleet_spec_duration(), 'mission_duration_days', m.plan_sandbox_days);
  push(m.fleet_spec_volume(), 'pressurized_volume_m3', m.unit_m3_value);
  push(m.fleet_spec_power(), 'power_source');
  push(m.fleet_spec_mirror(), 'primary_mirror_m', m.unit_m_value);
  push(m.fleet_spec_wavelength(), 'wavelengths');
  push(m.fleet_spec_target(), 'mission_target');
  push(m.fleet_spec_instruments(), 'instruments_count');
  // Engine (PRD-032) — one of thrust_kn_sl/vac is present per engine.
  push(m.fleet_spec_cycle(), 'cycle', cycle);
  push(m.fleet_spec_propellant(), 'propellant', propellant);
  push(m.fleet_spec_thrust(), 'thrust_kn_sl', m.fleet_value_kn_sl);
  push(m.fleet_spec_thrust(), 'thrust_kn_vac', m.fleet_value_kn_vac);
  push(m.fleet_spec_isp(), 'isp_vac_s', m.fleet_value_isp_vac);
  push(m.fleet_spec_isp(), 'isp_sl_s', m.fleet_value_isp_sl);
  return rows;
}
