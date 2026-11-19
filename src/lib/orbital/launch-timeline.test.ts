import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  integrateAscent,
  payloadSeparationDelayFor,
  type LaunchProfile,
  type AscentEvent,
} from '$lib/physics/ascent/ascent-physics';
import { buildAscentBeats } from './ascent-hud';

/**
 * Staging timeline of every launcher against its real nominal flight (2026-11-15 audit,
 * docs/wip/2026-11-15-launcher-timeline-audit.md). Each row is one event: the model time
 * must land within `tol` seconds of `real`. Tolerances: booster / stage separation and
 * MECO ±10 s, fairing ±10 s, SECO / orbit ±30 s. The source of each `real` is in the
 * comment on its row; "secondary" = Wikipedia or spaceflight101, not an agency document.
 */
const load = (id: string): LaunchProfile =>
  JSON.parse(
    readFileSync(resolve(__dirname, `../../../static/data/launch-profiles/${id}.json`), 'utf-8'),
  ) as LaunchProfile;

const first = (events: AscentEvent[], type: AscentEvent['type'], nth = 0): number | undefined =>
  events.filter((e) => e.type === type)[nth]?.t;

interface Row {
  event: string;
  type: AscentEvent['type'];
  /** Which occurrence of that event type (0 = first). */
  nth?: number;
  real: number;
  tol: number;
}

/** The event time a row reads: Max-Q from the summary (it is not an event), else the event. */
const rowTime = (sum: ReturnType<typeof integrateAscent>, r: Row): number | undefined =>
  r.type === 'max_q' ? sum.maxQ.t : first(sum.events, r.type, r.nth ?? 0);

const TIMELINES: Record<string, Row[]> = {
  'space-shuttle-stack': [
    // NASA STS-68 Space Shuttle Mission Report (NSTS-08294), Table I: SRB separation command
    // T+124 s ("T + 123.96 seconds"), MECO command 514 s, ET separation command 534 s
    // (STS-39: 125, 515, 532; ET separation 17-20 s after MECO across the two flights).
    { event: 'SRB sep', type: 'staging', nth: 0, real: 124, tol: 10 },
    { event: 'MECO', type: 'meco', real: 514, tol: 10 },
    { event: 'ET sep', type: 'staging', nth: 1, real: 534, tol: 10 },
    // Max dynamic pressure T+51 s (STS-68, the flight whose throttle schedule the profile flies;
    // STS-39, with a different schedule, 67 s).
    { event: 'max-Q', type: 'max_q', real: 51, tol: 10 },
    // OMS-2 cutoff 273:11:52:48.2 = T+2208 s, the end of the direct insertion (a silent SECO).
    { event: 'OMS-2 cutoff', type: 'seco', real: 2208, tol: 40 },
  ],
  'atlas-v': [
    // Atlas V Launch Services User's Guide Rev 11 (March 2010), Table 2.4.1-1, the 521/531-class
    // columns (the 541 is not tabulated): SRB jettison 116-118, PLF 206-212, BECO 249-252,
    // Atlas booster / Centaur separation 257-260.
    { event: 'AJ-60A jettison', type: 'staging', nth: 0, real: 117, tol: 10 },
    { event: 'PLF jettison', type: 'fairing_jettison', real: 210, tol: 10 },
    { event: 'BECO', type: 'meco', real: 251, tol: 10 },
    { event: 'Centaur separation', type: 'staging', nth: 1, real: 259, tol: 10 },
    // The 541 itself, ULA Mars 2020 mission booklet: SRB jettison 00:01:49.3, PLF 00:03:27.6,
    // Atlas / Centaur separation 00:04:28.1.
    { event: '541 SRB jettison', type: 'staging', nth: 0, real: 109.3, tol: 10 },
    { event: '541 PLF jettison', type: 'fairing_jettison', real: 207.6, tol: 10 },
    { event: '541 Centaur separation', type: 'staging', nth: 1, real: 268.1, tol: 10 },
  ],
  'delta-ii': [
    // Delta II Payload Planners Guide (Dec 2006), Table 2-1, 7925, eastern range:
    // ground-lit solids sep T+66, air-lit sep T+132, MECO T+264, stage I/II sep M+8,
    // fairing M+39 (T+303), SECO-1 M+353 (T+617, Figure 2-5).
    { event: 'ground-lit GEM sep', type: 'staging', nth: 0, real: 66, tol: 10 },
    { event: 'air-lit GEM sep', type: 'staging', nth: 1, real: 132, tol: 10 },
    { event: 'MECO', type: 'meco', real: 264, tol: 10 },
    { event: 'stage I/II sep', type: 'staging', nth: 2, real: 272, tol: 10 },
    { event: 'fairing sep', type: 'fairing_jettison', real: 303, tol: 10 },
    { event: 'SECO-1', type: 'seco', real: 617, tol: 30 },
  ],
  'saturn-v': [
    // Apollo 8 / SA-503 Saturn V Flight Manual MSFC-MAN-503, Critical Event Sequence:
    // S-IC outboard cutoff 2:31.0, LET jettison 3:07.2, S-II cutoff / S-II-S-IVB separation
    // 8:40.1 / 8:41.0, S-IVB first-burn cutoff 11:21.7.
    { event: 'S-IC cutoff', type: 'meco', real: 151, tol: 10 },
    { event: 'LET jettison', type: 'fairing_jettison', real: 187, tol: 10 },
    { event: 'S-II sep', type: 'staging', nth: 1, real: 521, tol: 10 },
    { event: 'S-IVB cutoff (first burn)', type: 'seco', real: 682, tol: 30 },
  ],
  pslv: [
    // ISRO PSLV-C25 flight events: PSOM-XL ground-lit sep 69.94, air-lit sep 92.04, PS1 sep
    // 112.75, fairing 117.95, PS2 sep 264.74 (PS1 burn time 103 s).
    { event: 'PSOM-XL ground-lit sep', type: 'staging', nth: 0, real: 70, tol: 10 },
    { event: 'PSOM-XL air-lit sep', type: 'staging', nth: 1, real: 92, tol: 10 },
    { event: 'PS1 burnout', type: 'meco', real: 103, tol: 10 },
    { event: 'PS1 sep', type: 'staging', nth: 2, real: 112.75, tol: 10 },
    { event: 'fairing sep', type: 'fairing_jettison', real: 118, tol: 10 },
    { event: 'PS2 sep', type: 'staging', nth: 3, real: 264.74, tol: 10 },
  ],
  'delta-iv-heavy': [
    // ULA Delta IV Heavy Parker Solar Probe mission booklet: port and starboard booster
    // jettison T+3:57.6, first stage separation 5:42.4, fairing jettison 6:05.4, MECO-1 10:37.1.
    { event: 'booster jettison', type: 'staging', nth: 0, real: 237.6, tol: 10 },
    { event: 'core separation', type: 'staging', nth: 1, real: 342.4, tol: 10 },
    { event: 'fairing jettison', type: 'fairing_jettison', real: 365.4, tol: 10 },
    { event: 'MECO-1', type: 'seco', real: 637.1, tol: 30 },
  ],
  'ariane-5': [
    // Ariane 5 VA256 (Webb) launch kit, Arianespace: EAP jettison +02:21, EPC shutdown and
    // separation +08:47 (VA229 per spaceflight101: EAP 143 s).
    { event: 'EAP jettison', type: 'staging', nth: 0, real: 141, tol: 10 },
    { event: 'EPC separation', type: 'staging', nth: 1, real: 527, tol: 10 },
    // VA256 launch kit: the profile's fairingJettisonS.
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 206, tol: 10 },
  ],
  'falcon-9': [
    // NASA CRS-22 press kit: MECO 00:02:26, stage separation 00:02:30 (CRS-9: 141 / 144).
    { event: 'MECO', type: 'meco', real: 146, tol: 10 },
    { event: 'stage separation', type: 'staging', nth: 0, real: 150, tol: 10 },
  ],
  'falcon-heavy': [
    // NASA, key milestones for Europa Clipper's launch (all cores expended; the profile's
    // flight): side boosters separate 3:07, core MECO 4:02, stage separation 4:06, fairing
    // 4:31, SECO-1 7:53. Max Q 1:07 and MECO are what the core throttle (100 % to 20 s, then
    // 46 %) is fitted to; SECO-1 is not fitted. (Psyche, side boosters recovered: 148 / 235 s.)
    { event: 'side booster separation', type: 'staging', nth: 0, real: 187, tol: 10 },
    { event: 'max-Q (fitted)', type: 'max_q', real: 67, tol: 10 },
    { event: 'core MECO (fitted)', type: 'meco', real: 242, tol: 10 },
    { event: 'stage separation', type: 'staging', nth: 1, real: 246, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 271, tol: 10 },
    { event: 'SECO-1', type: 'seco', real: 473, tol: 30 },
  ],
  'h-iia': [
    // JAXA H-IIA brochure 2025, H2A202 flight sequence example: SRB-A separation 107 s (burnout
    // 97 s), fairing 250 s, MECO 396 s, first / second stage separation 404 s.
    { event: 'SRB-A separation', type: 'staging', nth: 0, real: 107, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 250, tol: 10 },
    { event: 'MECO', type: 'meco', real: 396, tol: 10 },
    { event: 'stage separation', type: 'staging', nth: 1, real: 404, tol: 10 },
  ],
  'soyuz-fg-fregat': [
    // Soyuz CSG User's Manual Issue 2 (Arianespace, 2012), Figure 2.3.1a, Soyuz ST-B / Fregat
    // (the guide's only table; Soyuz-FG from Baikonur has none): I-II separation 118.1, III
    // stage cut-off 558.6.
    { event: 'I-II separation', type: 'staging', nth: 0, real: 118.1, tol: 10 },
    { event: 'III stage cut-off', type: 'seco', real: 558.6, tol: 30 },
    // II-III separation: the ST-B guide 287.6 and Soyuz-FG crewed flights 287.30 (secondary:
    // russianspaceweb's crewed-Soyuz sequence) agree; the core thrust is fitted to it (backlog F4).
    { event: 'II-III separation (fitted)', type: 'meco', real: 287.6, tol: 10 },
    // Soyuz CSG guide, ST-B: the profile's fairingJettisonS.
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 208.4, tol: 10 },
  ],
  'saturn-ib': [
    // NASA SP-4029 Apollo 7 timeline: S-IB outboard cutoff 144.32, S-IB/S-IVB separation 145.59.
    { event: 'S-IB cutoff', type: 'meco', real: 144.32, tol: 10 },
    { event: 'S-IB/S-IVB separation', type: 'staging', nth: 0, real: 145.59, tol: 10 },
    // S-IVB cutoff 616.76 s (SP-4029) with the real payload (18,542 kg) and J-2 thrust schedule
    // (AS-205 trajectory, NTRS 19700014017) on a lofted S-IVB ascent, into 228 km.
    { event: 'S-IVB cutoff', type: 'seco', real: 616.76, tol: 30 },
  ],
  lvm3: [
    // ISRO LVM3-M4 / Chandrayaan-3 brochure, nominal flight sequence: 2xS200 separation 127.00,
    // L110 separation 305.56.
    { event: 'S200 separation', type: 'staging', nth: 0, real: 127, tol: 10 },
    { event: 'L110 separation', type: 'staging', nth: 1, real: 305.56, tol: 10 },
    // C25 shut-off 954.42 s into the brochure's injection orbit (GTO perigee 170 +/- 3.5 km, apogee
    // 36,500 +/- 500 km): the profile's injectionOrbit, one continuous burn raising the apogee.
    { event: 'C25 shut-off (injection orbit)', type: 'seco', real: 954.42, tol: 30 },
    // LVM3-M4 brochure: the profile's fairingJettisonS.
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 194.96, tol: 10 },
  ],
  'new-glenn': [
    // NASA ESCAPADE blog, NG-2 launch milestones: MECO T+00:03:05, stage separation 00:03:09.
    { event: 'MECO', type: 'meco', real: 185, tol: 10 },
    { event: 'stage separation', type: 'staging', nth: 0, real: 189, tol: 10 },
    // NASA ESCAPADE milestones: the profile's fairingJettisonS.
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 230, tol: 10 },
  ],
  'vostok-k': [
    // Vostok 1 launch timeline (secondary: russianspaceweb): stage I separation T+119, stage
    // II separation T+299.
    { event: 'stage I separation', type: 'staging', nth: 0, real: 119, tol: 10 },
    { event: 'stage II separation', type: 'staging', nth: 1, real: 299, tol: 10 },
    // russianspaceweb (secondary): the profile's fairingJettisonS.
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 154, tol: 10 },
  ],
  'titan-iiie-centaur': [
    // Voyager 2 launch sequence (secondary transcription of the JPL sequence): SRM separation
    // T+2:02, stage 1 separation 4:15, stage 2 separation 7:50, Centaur MECO-1 9:48.
    { event: 'SRM separation', type: 'staging', nth: 0, real: 122, tol: 10 },
    { event: 'stage 1 separation', type: 'staging', nth: 1, real: 255, tol: 10 },
    { event: 'stage 2 separation', type: 'staging', nth: 2, real: 470, tol: 10 },
    { event: 'Centaur MECO-1', type: 'seco', real: 588, tol: 30 },
    // Helios A (NTRS 19760006052), primary, the same vehicle: staging 259.6 (stage 1 thrust
    // fitted), MECO-1 584.0. Its shroud (318.6) is that flight's; the profile keeps Voyager's.
    { event: 'Helios A staging (fitted)', type: 'meco', real: 259.6, tol: 10 },
    { event: 'Helios A MECO-1', type: 'seco', real: 584, tol: 30 },
    // Voyager 2 transcription (secondary): the profile's fairingJettisonS.
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 266, tol: 10 },
  ],
  'mercury-redstone': [
    // NASA "The Mercury-Redstone Project" (TM X-53107), Table 3-1, nominal: cutoff 142.5 s,
    // tower separation 143.0, capsule separation 152.0 (fitted, backlog F4).
    { event: 'Redstone cutoff (fitted)', type: 'seco', real: 142.5, tol: 10 },
  ],
  'ariane-5g': [
    // Rosetta (Ariane 5 G+): the boosters burnt ~139 s before being jettisoned (ESA).
    { event: 'EAP jettison', type: 'staging', nth: 0, real: 139, tol: 10 },
  ],
  'proton-m-briz-m': [
    // ExoMars 2016 launch timeline (secondary: spaceflight101): stage 1 shutdown and
    // separation T+1:59.7, stage 2 separation 5:27, stage 3 cutoff 9:31.
    { event: 'stage 1 sep', type: 'staging', nth: 0, real: 119.7, tol: 10 },
    { event: 'stage 2 sep', type: 'staging', nth: 1, real: 327, tol: 10 },
    { event: 'stage 3 cutoff', type: 'staging', nth: 2, real: 571, tol: 10 },
    // ILS Proton Mission Planner's Guide Rev 7, Table 2.3.1-1: PLF jettison 348.2 (backlog F3).
    { event: 'fairing jettison', type: 'fairing_jettison', real: 348.2, tol: 10 },
  ],
  'long-march-2f': [
    // Strap-ons jettisoned at T+126 s, first stage burn 166 s (secondary: spaceflight101).
    { event: 'booster jettison', type: 'staging', nth: 0, real: 126, tol: 10 },
    { event: 'core burnout', type: 'meco', real: 166, tol: 10 },
  ],
  'titan-ii-glv': [
    // NASA Gemini mission reports (GT-4, -5, -7, -10, -12): BECO 152-156 s (stage 1 thrust fitted
    // to 154), SECO 333-344 s.
    { event: 'BECO (fitted)', type: 'meco', real: 154, tol: 10 },
    { event: 'SECO', type: 'seco', real: 338, tol: 30 },
  ],
  'atlas-lv-3b': [
    // NASA MA-6 results report, Table 6-II: BECO 129.6, SECO 301.4, capsule separation 303.6
    // (booster and sustainer thrust fitted; the "5:20 / 5:24" secondary figures are wrong).
    { event: 'BECO / booster staging (fitted)', type: 'staging', nth: 0, real: 129.6, tol: 10 },
    { event: 'SECO (fitted)', type: 'seco', real: 301.4, tol: 10 },
  ],
  'atlas-agena': [
    // Gemini 12 target vehicle (GATV), NASA mission report: BECO 131.1, SECO 280.1 (fitted).
    { event: 'BECO (fitted)', type: 'staging', nth: 0, real: 131.1, tol: 10 },
    { event: 'SECO (fitted)', type: 'meco', real: 280.1, tol: 10 },
  ],
  'atlas-centaur': [
    // NASA TM X-2278 (AC-20): BECO 147.1, fairing 228.5, sustainer SECO 270.8 (fitted).
    { event: 'BECO (fitted)', type: 'staging', nth: 0, real: 147.1, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 228.5, tol: 10 },
    { event: 'sustainer SECO (fitted)', type: 'meco', real: 270.8, tol: 10 },
  ],
  'titan-ivb-centaur': [
    // JPL Cassini launch press kit: SRMU separation 142, fairing 211, stage 2 ignition 321
    // (stage 1 cutoff), Titan / Centaur separation 553 (thrusts fitted).
    { event: 'SRMU separation (fitted)', type: 'staging', nth: 0, real: 142, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 211, tol: 10 },
    { event: 'stage 1 cutoff (fitted)', type: 'meco', real: 321, tol: 10 },
    { event: 'Titan / Centaur separation (fitted)', type: 'staging', nth: 2, real: 553, tol: 10 },
  ],
  'athena-ii': [
    // Lunar Prospector handbook, Table 6.3-3: stage 1 separation 89 (fitted), fairing 232.
    { event: 'stage 1 separation (fitted)', type: 'meco', real: 89, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 232, tol: 10 },
  ],
  starship: [
    // Secondary only (Everyday Astronaut IFT-2 plan; no SpaceX table published): booster cutoff
    // 159 s (fitted), hot staging 161, ship cutoff 513 (fitted).
    { event: 'booster cutoff (fitted)', type: 'meco', real: 159, tol: 10 },
    { event: 'ship cutoff (fitted)', type: 'seco', real: 513, tol: 30 },
  ],
  'sputnik-8k71ps': [
    // Sputnik 1 (secondary: russianspaceweb, citing its references): strap-on separation 116.38,
    // core cutoff 295.4 (both fitted); the satellite separated 19.9 s later.
    { event: 'strap-on separation (fitted)', type: 'staging', nth: 0, real: 116.4, tol: 10 },
    { event: 'core cutoff (fitted)', type: 'seco', real: 295.4, tol: 10 },
  ],
  'proton-k': [
    // Zvezda (secondary: russianspaceweb): stage 1 separation 126.1 (fitted), stage 3 main
    // cutoff 577. No Proton-K primary exists; the ILS Proton-M guide (sibling) gives 123.4 / 576.4.
    { event: 'stage 1 separation (fitted)', type: 'meco', real: 126.1, tol: 10 },
    { event: 'stage 3 cutoff', type: 'seco', real: 577, tol: 30 },
  ],
  'long-march-3a': [
    // CALT/CGWIC LM-3A user's manual, Table 3-1 (typical GTO): stage 1/2 separation 147.9
    // (fitted), fairing 236.9.
    { event: 'stage 1/2 separation (fitted)', type: 'meco', real: 147.9, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 236.9, tol: 10 },
  ],
  'long-march-3b': [
    // CALT/CGWIC LM-3B user's manual, Table 3-1 (typical GTO): boosters 128.7, stage 1/2
    // separation 146.2 (both fitted), fairing 215.2, stage 3 first shutdown 615.7.
    { event: 'booster separation (fitted)', type: 'staging', nth: 0, real: 128.7, tol: 10 },
    { event: 'stage 1/2 separation (fitted)', type: 'meco', real: 146.2, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 215.2, tol: 10 },
    { event: 'stage 3 first shutdown', type: 'seco', real: 615.7, tol: 30 },
  ],
  'long-march-5': [
    // Y1 (secondary: Spaceflight Now live timing, 2016): boosters 173, fairing 285, core
    // shutdown 475 (thrusts fitted). No CASC per-event table was found.
    { event: 'booster separation (fitted)', type: 'staging', nth: 0, real: 173, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 285, tol: 10 },
    { event: 'core shutdown (fitted)', type: 'meco', real: 475, tol: 10 },
  ],
  'm-v': [
    // JAXA Special Publication (2008), M-V-5 (Hayabusa) sequence: 1/2 separation 75, stage 2
    // burnout 151, fairing 186, 2/3 separation 200, stage 3 burnout 309, 3/4 separation 370
    // (the coasts are the stages' separationDelayS; stage 2 and 3 thrust fitted).
    { event: '1/2 separation', type: 'staging', nth: 0, real: 75, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 186, tol: 10 },
    { event: '2/3 separation (fitted)', type: 'staging', nth: 1, real: 200, tol: 10 },
    { event: '3/4 separation (fitted)', type: 'staging', nth: 2, real: 370, tol: 10 },
  ],
  h3: [
    // JAXA H3 / MMX launch plan (H3-24L), Table 2: SRB-3 separation 116 / 118, fairing 197,
    // MECO 292, stage separation 299 (boosters and stage 1 fitted, 7 s coast to separation).
    { event: 'SRB-3 separation (fitted)', type: 'staging', nth: 0, real: 117, tol: 10 },
    { event: 'fairing (scheduled input)', type: 'fairing_jettison', real: 197, tol: 10 },
    { event: 'MECO (fitted)', type: 'meco', real: 292, tol: 10 },
    { event: 'stage separation', type: 'staging', nth: 1, real: 299, tol: 10 },
  ],
  'sls-block-1': [
    // NASA SLS reference guide: boosters fire "approximately two minutes"; the core stage
    // depletes "approximately six more minutes" after.
    { event: 'SRB sep', type: 'staging', nth: 0, real: 120, tol: 10 },
    { event: 'core MECO', type: 'meco', real: 480, tol: 10 },
  ],
};

describe('launcher staging timelines vs the real nominal flight', () => {
  for (const [id, rows] of Object.entries(TIMELINES)) {
    describe(id, () => {
      const sum = integrateAscent(load(id));
      for (const r of rows) {
        it(`${r.event} at ~T+${r.real} s (±${r.tol})`, () => {
          const t = rowTime(sum, r);
          expect(t).toBeDefined();
          expect(Math.abs((t as number) - r.real)).toBeLessThanOrEqual(r.tol);
        });
      }
    });
  }

  // Known gaps (docs/wip/2026-11-15-launcher-timeline-audit.md, closed out 2026-11-19 in
  // docs/wip/2026-11-17-launcher-timelines-sourced.md): sourced, and the model cannot hold the time
  // with a timing fit, because the cause is the trajectory, not a burn time.
  it.todo(
    'proton-m-briz-m: Briz-M first-burn cutoff T+1129 s (ILS guide Figure 2.3.1-1); model 1099 s. The model first Briz-M burn is ~547 s against 449 s in the guide (its standard GTO profile, not ExoMars); no sourced ExoMars Briz-M burn exists',
  );
  it.todo(
    'space-shuttle-stack: OMS-2 lights at 2081.5 s against STS-68 2110 s; the MECO altitude is the generic TD0358A 360,000 ft, not the STS-68 one (unpublished)',
  );
  it.todo(
    'atlas-v 541 (Mars 2020): MECO-1 into a ~270 km parking orbit (secondary: Seradata) at 687.9 s; model 878.6 s. A circular parking orbit, so a trajectory calibration, not the elliptical-injection model',
  );
  it.todo(
    'h3 (MMX plan, Table 2): MECO at 208 km and 6.2 km/s, SECO1 640 s at 329 km / 7.7 km/s (a parking orbit); the model reaches MECO at 180 km and 6.89 km/s, so its second stage has less to do (SECO1 ~530 s even at 329 km). Needs the stage-1 trajectory calibrated to the plan',
  );
  it.todo(
    'new-glenn (NG-2): SECO-1 773 s; model 692.4 s. The orbit at SECO-1 is unpublished (the final transfer orbit had a 100,000 km apogee), so there is no target to fit',
  );
  it.todo(
    'atlas-centaur (AC-20, Mariner 7): Centaur MECO 725.5 s is a direct escape injection toward Mars, which the ascent model does not fly (it stops at an Earth orbit)',
  );
  it.todo(
    'long-march-5: stage-2 shutdown 752 s (Chang e-5, secondary); model 702 s after the core fit to Y1. No CASC per-event table found',
  );
});

describe('Space Shuttle ascent: no SECO, the tank leaves 18 s after MECO', () => {
  const sum = integrateAscent(load('space-shuttle-stack'));

  it('the SRBs follow the STS-68 impulse gates and separate at T+123.4 s', () => {
    const srb = load('space-shuttle-stack').boosters!;
    expect(srb.thrustSlKN).toBeLessThan(12000); // the rating the gates scale, not the 12 MN peak
    expect(srb.impulseGates?.length).toBe(3);
    expect(Math.abs(first(sum.events, 'staging', 0)! - 123.4)).toBeLessThan(1);
  });

  it('ET separation trails MECO by the stage separationDelayS', () => {
    const meco = first(sum.events, 'meco')!;
    const et = first(sum.events, 'staging', 1)!;
    expect(et - meco).toBeGreaterThanOrEqual(18);
    expect(et - meco).toBeLessThan(18.5);
  });

  it('the ET stays on the orbiter between MECO and its separation (no thrust, tank mass kept)', () => {
    const meco = first(sum.events, 'meco')!;
    const mid = sum.states.find((s) => s.t >= meco + 5)!;
    expect(mid.thrustN).toBe(0);
    expect(mid.stageIndex).toBe(0);
  });

  it('the beat list has MECO, a STAGE SEP for the tank 18 s later, ORBIT, and no SECO', () => {
    const beats = buildAscentBeats(sum);
    const labels = beats.map((b) => b.label);
    expect(labels).not.toContain('SECO');
    expect(labels.filter((l) => l === 'MECO')).toHaveLength(1);
    // Direct insertion: MECO short of orbit, the tank off, then OMS-2 completes the orbit.
    expect(labels.at(-1)).toBe('ORBIT');
    const meco = beats.find((b) => b.label === 'MECO')!;
    const sep = beats.filter((b) => b.label === 'STAGE SEP').at(-1)!;
    expect(sep.t - meco.t).toBeGreaterThan(17);
  });

  it('the camera/clock bookkeeping event stays in the event list, flagged silent', () => {
    const seco = sum.events.find((e) => e.type === 'seco')!;
    expect(seco.silent).toBe(true);
  });

  it('other vehicles keep their SECO beat', () => {
    const f9 = integrateAscent(load('falcon-9'));
    expect(buildAscentBeats(f9).map((b) => b.label)).toContain('SECO');
    expect(f9.events.some((e) => e.silent)).toBe(false);
  });
});

describe('shared physics: booster jettison delay and a time-scheduled fairing', () => {
  const base = load('delta-ii');

  it('a booster stays attached for separationDelayS after burnout, then the STAGE SEP fires', () => {
    const none = integrateAscent({ ...base, boosters: { ...base.boosters!, separationDelayS: 0 } });
    const held = integrateAscent({
      ...base,
      boosters: { ...base.boosters!, separationDelayS: 3 },
    });
    expect(first(held.events, 'staging', 0)! - first(none.events, 'staging', 0)!).toBeGreaterThan(
      2.5,
    );
  });

  it('fairingJettisonS jettisons the fairing at that mission time, not at the altitude', () => {
    const timed = integrateAscent({ ...base, fairingJettisonS: 200 });
    expect(first(timed.events, 'fairing_jettison')).toBeCloseTo(200, 0);
    const altitude = integrateAscent({ ...base, fairingJettisonS: undefined });
    expect(first(altitude.events, 'fairing_jettison')).not.toBeCloseTo(200, 0);
  });
});

describe('payload separation delay per mission (plan L63)', () => {
  it('a mission entry overrides the vehicle delay; other missions keep the vehicle value', () => {
    const p = { payloadSeparationDelayS: 35, payloadSeparationDelayByMissionS: { a: 198 } };
    expect(payloadSeparationDelayFor(p, 'a')).toBe(198);
    expect(payloadSeparationDelayFor(p, 'b')).toBe(35);
    expect(payloadSeparationDelayFor({}, 'a')).toBeUndefined();
  });

  it('every per-mission key names a mission that exists', () => {
    const dir = resolve(__dirname, '../../../static/data');
    const missionIds = new Set(
      readdirSync(resolve(dir, 'missions'), { recursive: true })
        .map(String)
        .filter((f) => f.endsWith('.json'))
        .map((f) => f.replace(/^.*\//, '').replace(/\.json$/, '')),
    );
    for (const f of readdirSync(resolve(dir, 'launch-profiles'))) {
      const p = load(f.replace(/\.json$/, ''));
      for (const id of Object.keys(p.payloadSeparationDelayByMissionS ?? {}))
        expect(missionIds.has(id), `${f}: ${id}`).toBe(true);
    }
  });
});
