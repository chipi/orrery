# Mars landings: the record against the profiles (pass 2 input)

Gathered 2026-11-23 by a research subagent (about 25 web calls). Several NTRS and JPL press-kit
PDFs came back unreadable, so some figures come from Wikipedia and Spaceflight Now. Unverified
figures are marked. Verify against the primary source before changing a profile.

## What the engine can express today

- Events:
  - entry, entry_flip, landing_flip, peak_heat, peak_decel;
  - parachute_deploy, heatshield_sep, backshell_sep, skycrane_lower, skycrane_flyaway;
  - retro_ignition, airbag_deploy, harpoon_fire, first_contact, bounce (comet only);
  - sample_collected, parachute_jettison, probe_signal_lost, record_ends, skip_out,
    second_entry, touchdown.
- Mars archetypes:
  - MARS_PARACHUTE_RETRO: chute and heat shield at the same instant, then backshell and retro at
    the same instant.
  - MARS_AIRBAG: chute and heat shield, retro, airbags.
  - MARS_CHUTE_AIRBAG: chute and heat shield, airbags.
  - MARS_SKYCRANE: chute and heat shield, backshell, retro, skycrane_lower.
- Missing:
  - legs deploying, radar lock;
  - bridle lowering and bridle cut;
  - RAD rockets as their own beat, airbag inflation as its own beat, bounces (Mars);
  - the backshell and chute flying off;
  - hover and hazard avoidance;
  - failures;
  - two canopies;
  - after-landing beats (petals, solar arrays, rover egress);
  - attitude or tilt.

## Gaps by mission

| id | Record | Profile gap |
| --- | --- | --- |
| viking1 | 3.5 m aeroshell, single DGB (16 m unverified). Chute at about 5.5–6 km. Aeroshell off 8–14 s later. At about 1.5 km three throttled engines (18 nozzles) light; chute and backshell released. Constant 1.5 m/s from 17 m. About 2 m/s on three legs. | No leg deploy, no 17 m constant-velocity phase; touchdown 2.4 vs 2 m/s. |
| mars3 | 2.9 m cone over a 1.2 m sphere. Chute and retro (no sourced figures). Petals. PrOP-M on a 15 m tether. Signal 90 s after landing for 14.5–20 s, then silence. | Altitudes are estimates; no petals; no signal loss. |
| mars-pathfinder | 12.5 m DGB at 8.6 km. Heat shield 20 s later. 20 m bridle. Radar at 1.6 km. Airbags (5.2 m, 4 bags) at 300–355 m. RAD rockets at 98 m. Bridle cut at 21.5 m. Impact at 14 m/s, first bounce 15.7 m, 15+ bounces. Petals at 87 min. | No bridle, inflation beat, RAD, cut, bounces or petals. |
| spirit / opportunity | 2.65 m aeroshell, chute ~14 m (unverified) at about 9.5–10 km. 20 m Zylon bridle. Airbags 8 s before impact (4 bags × 6 lobes). 3 RAD rockets ~10 kN for 4 s at 90–120 m. Bridle cut at 6.5 m (Spirit) or 8.5 m (Opportunity). Spirit: 27 bounces, 250–300 m roll. Opportunity: 26 bounces, about 200 m, ended in a small crater. | Same gaps as Pathfinder. Chute at 7.5 km against the record's ~9.5 km (source unclear). |
| phoenix | 11.8 m DGB at about 12.6 km, Mach 1.7. Heat shield 15–25 s later; legs out. Separation from the backshell at about 980 m. 12 pulsed thrusters. 2.4 m/s. Chute and backshell imaged by HiRISE. | Chute at 13.4 km (reference unclear); no legs or radar beat; separation not distinct. |
| insight | Chute at T-2:57, about 11.1 km. Heat shield T-2:42. Legs T-2:32. Radar T-1:00 (~2.4 km). Backshell T-0:44, then 12 engines. 2.4 m/s. Arrays open 16–32 min after landing. | Chute at 8.1 km against the verified 11.1 km; no legs, radar or arrays. |
| perseverance | 21.5 m chute (Range Trigger) at about 11 km. Heat shield 20 s later. TRN between 4.2 and 2.2 km. Sky crane. | Chute at 12.6 km against ~11 km; no TRN window. |
| curiosity | Confirmed times (PDT): entry 22:10:45.7, chute 22:15:04.9, heat shield 22:15:24.6, rover separation 22:17:38.6, touchdown 22:17:57.3. | Backshell and flyaway times not confirmed. |
| schiaparelli | 2.4 m aeroshell, 12 m DGB at 12 km. Heat shield at 7.8 km. IMU saturation causes an early release of chute and backshell at about 3.7 km. Thrusters fire 3 s instead of 30 s. Free fall about 40 s; impact about 150 m/s. | Modelled as a success with the propellant at 1 kg; no early release, no 3 s burn. |
| tianwen1 | About 4.5 m aeroshell (secondary source). Single DGB (~200 m²), 460 → under 100 m/s. Shell and chute off about 1.5 km. Variable-thrust engine. **Hover at about 100 m**, hazard avoidance. Four legs. Zhurong down the ramp 7–8 days later. | No hover; the chute altitude is an estimate. |
| mars-express (Beagle 2) | 1.9 m drogue then a 10 m main chute. Airbags (3, ~2 m) at 200–280 m. Bounces. Lid, petals. Found by HiRISE (2015) partly deployed, one petal blocking the antenna. | One canopy; no bounces; no petals or the partial deployment. |

## Engine features pass 2 needs

1. Bridle lowering and bridle cut (Pathfinder, MER).
2. Distinct beats:
   - leg deploy;
   - radar lock;
   - RAD fire;
   - airbag inflation;
   - backshell and chute flyaway;
   - cruise-stage jettison.
3. Mars bounces with a count and a roll distance.
4. Hover and hazard avoidance (Tianwen-1); Viking's constant-velocity phase from 17 m.
5. Failures: Schiaparelli's early release; Mars 3's signal loss; Beagle 2's partial deployment.
6. Drogue then main chute (Beagle 2).
7. After landing: petals, arrays (InSight), rover egress (Zhurong).
8. Attitude and tilt.

## Sources

- Viking: https://en.wikipedia.org/wiki/Viking_program · https://solarviews.com/history/SP-4212/ch8-2.html ·
  https://ntrs.nasa.gov/api/citations/19780023083/downloads/19780023083.pdf
- Mars 3: https://en.wikipedia.org/wiki/Mars_3
- Pathfinder: https://en.wikipedia.org/wiki/Mars_Pathfinder ·
  https://nssdc.gsfc.nasa.gov/planetary/marsentry.html · https://www.jpl.nasa.gov/news/press_kits/mpfland.pdf
- MER: https://en.wikipedia.org/wiki/Mars_Exploration_Rover ·
  https://spaceflightnow.com/mars/mera/040104landing.html
- Phoenix: https://spaceflightnow.com/mars/phoenix/080521edl.html
- InSight: https://www.jpl.nasa.gov/news/nasa-insight-landing-on-mars-milestones ·
  https://spaceflightnow.com/2018/11/26/insights-entry-descent-and-landing-timeline/
- Perseverance: https://www.jpl.nasa.gov/news/press_kits/mars_2020/landing/mission
- Curiosity: https://www.jpl.nasa.gov/news/timeline-of-major-mission-events-during-curiositys-landing/
- Schiaparelli: https://www.esa.int/Newsroom/Schiaparelli_landing_investigation_completed
- Tianwen-1: https://www.nasaspaceflight.com/2021/05/china-first-mars-landing-attempt-tianwen-1/ ·
  https://www.space.com/china-tianwen-1-zhurong-mars-landing-explained
- Beagle 2: https://en.wikipedia.org/wiki/Beagle_2 · https://www.esa.int/About_Us/ESOC/Beagle-2_lander_found_on_Mars
