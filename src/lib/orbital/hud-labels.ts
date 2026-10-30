import * as m from '$lib/paraglide/messages';

/**
 * The launch / coast / descent HUD modules (ascent-hud, descent-hud,
 * orbit-insertion, injection-burn) return English status and beat codes —
 * they stay pure and unit-tested, and the codes double as identifiers
 * (`b.label === 'STAGE SEP'`). The scenes pass every code through `hudLabel`
 * when they render it. Flight-dynamics acronyms (MECO, SECO, MAX-Q, MAX-G)
 * are the same in every locale and fall through unchanged, as does any code
 * not listed here.
 */
const HUD_LABEL: Record<string, () => string> = {
  'GO FOR LAUNCH': m.hud_go_for_launch,
  'TERMINAL COUNT': m.hud_terminal_count,
  'IGNITION SEQUENCE': m.hud_ignition_sequence,
  LIFTOFF: m.hud_liftoff,
  ASCENT: m.hud_ascent,
  'PARKING ORBIT': m.hud_parking_orbit,
  'STAGE SEP': m.hud_stage_sep,
  FAIRING: m.hud_fairing,
  ORBIT: m.card_stat_orbit,
  ENTRY: m.hud_entry,
  PARACHUTE: m.hud_parachute,
  'POWERED DESCENT': m.hud_powered_descent,
  SKYCRANE: m.hud_skycrane,
  'AIRBAG DESCENT': m.hud_airbag_descent,
  'AEROSHELL DESCENT': m.hud_aeroshell_descent,
  'HARD DESCENT': m.hud_hard_descent,
  'TOUCH-AND-GO': m.hud_touch_and_go,
  COAST: m.hud_coast,
  FLIP: m.hud_flip,
  'PEAK HEAT': m.hud_peak_heat,
  CHUTE: m.hud_chute,
  'H/S SEP': m.hud_hs_sep,
  'B/S SEP': m.hud_bs_sep,
  FLYAWAY: m.hud_flyaway,
  RETRO: m.hud_retro,
  AIRBAG: m.hud_airbag,
  HARPOON: m.hud_harpoon,
  CONTACT: m.hud_contact,
  BOUNCE: m.hud_bounce,
  SAMPLE: m.hud_sample,
  'CHUTE SEP': m.hud_chute_sep,
  'SIGNAL LOST': m.hud_signal_lost,
  'SKIP OUT': m.hud_skip_out,
  '2ND ENTRY': m.hud_second_entry,
  TOUCHDOWN: m.hud_touchdown,
  DESCENT: m.hud_descent,
  'SAMPLE COLLECTED': m.hud_sample_collected,
  SETTLED: m.hud_settled,
  IMPACT: m.hud_impact,
  'TRANS-LUNAR INJECTION': m.hud_tli,
  'TRANS-MARS INJECTION': m.hud_tmi,
  'ORBITAL INJECTION': m.hud_orbital_injection,
  'LUNAR ORBIT INSERTION': m.hud_oi_moon,
  'MARS ORBIT INSERTION': m.hud_oi_mars,
  'VENUS ORBIT INSERTION': m.hud_oi_venus,
  'MERCURY ORBIT INSERTION': m.hud_oi_mercury,
  'JUPITER ORBIT INSERTION': m.hud_oi_jupiter,
  'SATURN ORBIT INSERTION': m.hud_oi_saturn,
  'URANUS ORBIT INSERTION': m.hud_oi_uranus,
  'NEPTUNE ORBIT INSERTION': m.hud_oi_neptune,
  'CERES ORBIT INSERTION': m.hud_oi_ceres,
  'VESTA ORBIT INSERTION': m.hud_oi_vesta,
  'ORBIT INSERTION': m.hud_oi_generic,
};

export function hudLabel(code: string): string {
  return HUD_LABEL[code]?.() ?? code;
}
