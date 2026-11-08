# Round 2 — accepted fixes (judged by the lead, 2026-11-07)

Sources are the round-2 reviewers' (unverified-brief.md) plus the lead's own searches. Apply the
fact in every locale where it appears (fix-brief.md rules: exact finds via show.mjs, minimal edits,
the locale's own register and number format, remove a number rather than guess one). Do not
change event METs: the lead moves those.

## Group S — early crewed flights (missions/earth, fleet)

- voskhod-2 description: the O₂ sentence → after Leonov re-entered, the hatch did not seal
  properly and life support overfilled the cabin with oxygen (a fire hazard if a spark occurred);
  drop "EVA hatch failed to re-seal" and "spontaneous combustion". (russianspaceweb voskhod2-eva)
- voskhod-2 description + events RESCUE note: "rescue helicopters arrived 1965-03-21" → a rescue
  party reached them on 20 March; on 21 March they skied about 9 km to a helicopter site and were
  flown out. Keep the wolves and the cold as written. (russianspaceweb voskhod2-landing)
- voskhod-1 description: remove the "Yegorov's breath on his neck" sentence (no source); if a
  sentence is needed in its place: the cosmonauts had to diet to fit their couches (Wikipedia).
- voskhod-1 description + events LAND note: "near Marevka" → "in northern Kazakhstan, about 312 km
  north-east of Kostanay". (Wikipedia: 52°02′N 68°08′E)
- vostok-3 description: drop "and to John Glenn's Friendship 7" (the dual flight was planned for
  November 1961, before Friendship 7). Keep the propaganda point without the Glenn clause.
- vostok-6 description + events ORBIT-CORRECTION note: "ground controllers re-uploaded corrected
  attitude software the next day" → "ground controllers supplied corrective data"; drop
  "software", "re-uploaded", "next day". Keep "youngest woman to orbit" (Guinness: still true for
  orbital flight).
- vostok-4 description: "duress code-word for early termination" → "the pre-arranged code for
  feeling ill". 
- shenzhou-1 description: payload → "a dummy payload and about 100 kg of seeds exposed to the
  space environment"; drop the flag, mock-up life-support and "microgravity-genetics".
- freedom-7 description: "max-Q 3.7 g" → "peak 6.3 g on ascent; maximum dynamic pressure about
  28 kPa" (keep apogee 187 km and 11.6 g re-entry).
- aurora-7 description: "a stuck yaw thruster" → "a faulty pitch horizon scanner and fuel spent
  running the manual and automatic attitude systems together"; the capsule was ~25° off in yaw
  and retrofire came ~3 s late. "1 h 7 min recovery delay" (description + SPLASHDOWN note) →
  "Carpenter was found after nearly an hour and lifted out about 3 hours after splashdown".
- sigma-7 description: remove the "38 kg … 32 kg" attitude-gas figures → "Schirra used so little
  attitude-control fuel that he dumped the rest during re-entry".
- faith-7 description + SPLASHDOWN note: "~7 km from target" → "about 6 km (4 mi) from the
  recovery ship USS Kearsarge" (Wikipedia MA-9).
- liberty-bell-7: "first flight to feature an explosive escape hatch" → "first Mercury flight with
  an explosive escape hatch"; SPLASHDOWN note "480 km downrange" → "486 km downrange".
- Fleet: search static/data/fleet and i18n-src/*/fleet for the same wrong texts and fix repeats.

## Group A — Apollo and Skylab

- apollo13: "over Mare Cognitum" (flyby event description and arrival.source, overlays) → "above
  the far side" (pericynthion was over the far side; the S-IVB later struck the Moon near Mare
  Cognitum — keep that only if the text is about the S-IVB). Tank cause: → "overheated heater
  thermostat switches (rated 28 V, fed 65 V during pre-launch ground detanking) damaged the
  Teflon insulation of the tank's fan wiring; in flight a short in those wires ignited it"
  (Apollo 13 Review Board via NSSDCA ap13acc). Keep "about ten hours" for PC+2 (Flight Journal).
- apollo16 payload "48599 kg" (copied from Apollo 15) → "52,759 kg" (Wikipedia infobox launch
  mass, the definition Apollo 13/14 use). Description: replace the "Duke's 11-second hop attempt
  … called off" sentence with: at the end of the third moonwalk Duke fell backwards onto his PLSS
  backpack during a high-jump attempt (no "11-second", no "called off").
- apollo9 payload "42400 kg" → "43,196 kg" (Wikipedia infobox). EVA "38 minutes" → "about 38
  minutes outside on the LM porch" (NSSDCA 37.5 min) if the text says only "38 minutes".
- apollo7: orbit "232 × 285 km" → "228 × 285 km" (insertion, 123 × 154 nmi); mass 14,781 kg →
  label it the CSM's ("14,781 kg CSM").
- apollo8: "~1 billion viewers / largest TV audience to date" → "an estimated audience of up to a
  billion, the most-watched broadcast to that date".
- apollo14: "five docking attempts" → "six docking attempts (the first five failed)".
- skylab-3: "305 hours" of ATM observations → "about 305 crew-hours of ATM solar observing".
- skylab-2: EVA-1 "38 min" → "about 40 min" (Weitz's stand-up EVA, 25 May EDT / 26 May UTC — say
  the UTC day if the text gives a date). Leave the temperatures.
- Fleet (Saturn V/IB, CSM, LM, Skylab): fix repeats of any of the above.

## Group V — Venus and Mars

- vega-1 (base + overlays): "Vega 1's imagery + dust-impact data informed the Giotto-target final
  approach geometry" → "Vega's camera images of the nucleus, with VLBI tracking of Vega's
  position, refined Giotto's aim point (the 'Pathfinder' scheme)". Balloon: "ESA/CNES-built" →
  "built by CNES with IKI"; "Soviet–ESA flagship of the Halley armada" → "Soviet flagship of the
  Halley armada". vega-2: same balloon wording. "a week ahead of Giotto" → "8 days ahead".
- venera-13 base credit: "beating its design target by nearly an hour" → "by about 95 minutes"
  (127 vs 32 min). Fleet lander/venera-13 credit: drop "(… Beta Regio volcanic flank)" — Phoebe
  Regio only.
- mars-express: payload / mass "1183 kg (1123 kg orbiter + 60 kg Beagle 2 lander)" → "1223 kg at
  launch, including the 60 kg Beagle 2 lander" (ESA); also flight.launch.mass_at_tli_kg 1183 →
  1223. MARSIS: "mapped subsurface ice + (controversially) a liquid water reservoir" → "mapped
  subsurface ice and in 2018 found a bright radar reflector under the south polar cap, read as a
  subglacial lake — an interpretation still disputed". TCM-4 label/text "final pre-MOI" → drop
  "final pre-MOI".
- curiosity: TCM-3 note "Final pre-EDL correction" → "Third trajectory correction; refines the
  Gale Crater target"; TCM-4 "final pre-EDL burn" → "fourth correction (two more chances remained
  before landing)"; remove "3.61 km/s ∆v" from the TMI note.
- mangalyaan: "the lowest-cost interplanetary mission in history" → "the least expensive Mars
  mission to succeed" (Physics World).
- tianwen1: "358 sols" → "347 sols (358 Earth days)"; "named after a Chinese poem from 340 BCE" →
  "named after the poem Tianwen ('Questions to Heaven') by Qu Yuan (c. 340–278 BCE)".
- hope-probe launch event: "partnering with US universities + JAXA + ESA" → "built by MBRSC with
  the University of Colorado Boulder (LASP), Arizona State University and UC Berkeley; launched on
  a Mitsubishi Heavy Industries H-IIA".
- fleet rover/zhurong first_flight "2021-05-15" → "2021-05-14" (landing, UTC).

## Group D — deep space and small bodies

- parker-solar-probe (launch event description + flight.launch.source, fleet): "the highest C3
  ever achieved for a science mission (154 km²/s²)" → "one of the highest launch energies ever
  flown (C3 ≈ 154 km²/s²; only New Horizons' was higher)".
- magellan: periapsis 295 → 294 km (PDS mission.cat); "the first planned controlled atmospheric
  entry of a planetary spacecraft" → drop "first" (… "a planned controlled entry into the
  atmosphere, gathering drag data").
- akatsuki: "clogged oxidiser check valve" / "salt crystal buildup in an oxidiser check valve
  disrupted the propellant mix and caused asymmetric thrust + attitude tumble" → "salt deposits
  blocked a check valve between the helium pressurant tank and the fuel tank; the engine, starved
  of fuel, ran oxidiser-rich and overheated, and the probe entered safe mode ~152 s into the burn".
- pioneer-11: "Signal lost 1995-09-30" / "Last contact 1995-09-30" → "Routine operations ended
  1995-09-30; the last engineering data arrived 1995-11-24".
- voyager-1: "slingshots Voyager 1 to ~17 km/s heliocentric" → "bends and speeds Voyager 1 on to
  Saturn" (17 km/s is today's speed). delta_v "~17 km/s (cumulative)" stays unless a field states
  it as the post-Jupiter speed.
- solar-orbiter: NASA "1 instrument" / "one instrument contribution" → "two instruments (SoloHI
  and the Heavy Ion Sensor)".
- near-shoemaker: landing "near the Himeros saddle region at 35.0°N, 280.0°W" → "just south of
  the saddle-shaped Himeros, near 35.7°S"; "125 m" last image → "about 120 m"; "five orbit-lowering
  burns reduced altitude to ~5 km; the final controlled descent proceeded at ~1.7 m/s" → "four
  braking burns brought it down from about 26 km; it touched down at 1.9 m/s" (JPL); dispatch
  "stretched into a saddle shape by its own slow rotation" → drop the rotation clause ("…pocked
  with craters, with a saddle-shaped hollow, …"); Mathilde "five craters wider than the object's
  radius" → "several giant craters 20–33 km across".
- osiris-rex (description + events[2] note): "record ~1.4 km orbit" → "record orbit 680 m above
  the surface (930 m from Bennu's centre, June 2019)" (NASA / Planetary Society).
- europa-clipper events[4] note: drop "760 m/s" (no published figure).
- lucy: Eurybates "1,000 km at 5.7 km/s" → "within 1,000 km at 5.8 km/s, 2027-08-11" (SwRI).
- hayabusa1: "~4.0 km/s" total Δv → "about 2.2 km/s from the ion engines" (base delta_v keeps the
  schema form "~2.2 km/s (ion engines)"); the touchdown text: "The first was unintended —
  Hayabusa came down softly and bounced" → "On the first descent the sampling sequence aborted;
  Hayabusa came down softly, bounced and rested on the surface for about 30 minutes".
- dart description: "HST and JWST imaged the resulting ejecta tail for weeks" → "Hubble imaged the
  ejecta tail for weeks; JWST observed the impact". Keep "~3 seconds before impact" (telemetry
  timing, correct).
