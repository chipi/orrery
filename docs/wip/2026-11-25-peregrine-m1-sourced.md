# Astrobotic Peregrine Mission One - sourced facts, 2026-11-25

Rule: every fact has a URL opened in this session, unless marked "(search summary only)". "not found" = not returned. Nothing from memory.

Tags: [PMR] Astrobotic PM1 Post-Mission Report, Aug 2024, https://astrobotic.com/wp-content/uploads/2024/08/PM1_Post-Mission-Report_2024-1.pdf (full text read). [KIT] NASA CLPS press kit https://www.nasa.gov/wp-content/uploads/2023/12/np-2023-12-017-jsc-clps-astrobotic-press-kit-update-508.pdf (read). [PUG] Astrobotic payload user guide as hosted by NASA https://science.nasa.gov/wp-content/uploads/2023/11/astrobotic-lunar-landers-pug.pdf (read). [SFN] https://spaceflightnow.com/2024/01/19/astrobotics-peregrine-lunar-lander-ends-mission-in-fiery-reentry/ . [U8] https://www.astrobotic.com/update-8-for-peregrine-mission-one/ . [WP] https://en.wikipedia.org/wiki/Peregrine_Mission_One . [NSSDCA] https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=PEREGRN-1 (search summary only; page errored on fetch).

## Launch
- 8 Jan 2024, 2:18:38 am ET = 07:18:38 UTC - [PMR] (ET to UTC conversion mine; WP also 07:18:38 UTC).
- Vehicle: ULA Vulcan Centaur, first flight (Cert-1), VC2S per WP - [PMR] (maiden flight), [WP] (config). Pad: SLC-41, Cape Canaveral SFS - [KIT], [WP].
- Separation from Centaur: 03:09:05 am ET (= 08:09:05 UTC) - [PMR]. First signal about 7 min later.
- Rideshare partners: NOT FOUND (Peregrine was the Vulcan payload; Celestis memorial capsule on the Centaur is not verified in any source opened).

## Lander
- Launch mass 1,283 kg - [WP] only. Dry mass: NOT FOUND. Propellant capacity 450 kg - [WP] only (unverified).
- Size: about 1.9 m high, about 2.5 m across, four legs - [NSSDCA] (search summary).
- Propulsion: five main engines, 667 N each (TALOS-150 per NSSDCA), pulsed for throttling; twelve ACS thrusters, 45 N each (four sets of three); pressure-fed hypergolic MMH + MON-25; two fuel and two oxidiser tanks plus central helium tank - [PUG], [PMR]. Isp: NOT FOUND.
- Payload to surface: 70-90 kg mid-latitude config [PUG]; 90 kg (NSSDCA summary). Surface life planned about 192 h (8 days) [PUG]; KIT says "10 days".
- Power: 480 W max, 840 Wh Li-ion (NSSDCA summary).
- Payloads: 20 payloads, 9 active and 11 passive per [PMR]; "21 payloads" in Astrobotic launch packet https://astrobotic.com/wp-content/uploads/2023/11/Launch_Info_Packet_5.8.pdf. Five NASA instruments: LRA, NSS, LETS, NIRVSS, PITMS - https://science.nasa.gov/lunar-science/deliveries/to2-astrobotic/ . Also CMU IRIS rover, Astrobotic TRN sensor, LINX-UNAM 5 microrobots (Colmena), Spacebit, DLR M-42, DHL MoonBox, Astroscale capsule, etc. - https://www.astrobotic.com/missionone/ . Masses: IRIS 2 kg, Colmena under 60 g each, Spacebit 1.5 kg - [WP] only (unverified). Everything else: NOT FOUND.

## Planned mission
- Trajectory: highly elliptical Earth orbit with apogee at lunar distance, 1.5 loops (to Moon distance, back to Earth, out again) before lunar interception - [PMR]. Arrival in lunar orbit 17-19 days after launch, orbit for up to 39 days (KIT says "up to 39", later paragraph "up to 17"; the two disagree), then autonomous descent - [KIT].
- Planned landing date: 23 Feb 2024 - [WP] only.
- Descent profile: unpowered 100 km to 15 km; powered 15 km to 1 km; terminal 1 km to 300 m; terminal nadir 300 m to touchdown (PUG: constant vertical velocity from 30 m) - [KIT], [PUG].
- Site: Sinus Viscositatis, mare outside the Gruithuisen domes at the NE edge of Oceanus Procellarum - [KIT], https://www.nasa.gov/blogs/clps/2023/02/02/new-landing-site-will-upgrade-science-returns-for-astrobotic-flight/ . Originally Lacus Mortis.
- Coordinates: NOT FOUND in any page opened. A search summary gives Sinus Viscositatis centre about 35.2 N, 41 W (or 40.9 W), 68 km x 50 km, but no page showing it was opened; USGS Gazetteer pages I opened were the wrong features. Treat as unverified. Gruithuisen Delta (USGS, search summary) 36.07 N, 39.59 W.

## What went wrong - leak timeline (all times ET unless noted) - [PMR]
- 03:09:05 separation; propulsion initiation sequence runs autonomously; PCV1 nominal; PCV2 actuated then oxidiser-tank pressure kept rising while helium tank pressure fell. Under 90 s later the oxidiser-tank pressure transducers saturated.
- 04:41:02 (92 min after separation): rapid uncontrolled attitude change; team assessed an oxidiser tank had ruptured; leak was applying torque. Three attempts to cycle PCV2 failed (valve leaking internally).
- About 5 min later ACS slowed the spin; after about 2 h the leak slowed but Sun-pointing could not be fully recovered. 06:06 am first photo evidence (puffed-up MLI). Battery drain; slew to Sun approved with 3 min to spare before the pass ended; battery recharging.
- Landing called off: oxidiser loss made TCMs, LOI and landing uncertain and left a high fuel-to-oxidiser mix ratio (hot engines). Mission switched to payload data and controlled Earth re-entry.
- Hypothesis in real time (9 Jan 2024): valve between helium and oxidiser failed to reseal - [U8]. WP says Astrobotic estimated about 40 more hours of attitude control after 21:16 EST 8 Jan (WP only).
- Reached lunar distance about 12 Jan, about 238,000 mi from Earth - [SFN]. [PMR] says "four days after launch".
- Decision to end mission 13 Jan, with NASA - [PMR]. 23 short burns with all five main engines to move re-entry to the South Pacific [SFN]; [PMR] says four pulse trains over a day. Flight 10 days 14 h; more than 535,000 miles travelled - [PMR].
- Earth-crescent photo: camera 2, 18 Jan 2024 02:27 am ET, Sun hidden behind a payload-deck strut - [PMR] Fig. 10.

## Re-entry
- 18 Jan 2024 at 4:04 pm ET = 21:04 UTC, over the South Pacific - [PMR] summary; [SFN]: telemetry lost 3:50 pm EST (20:50 UTC), expected splashdown 4:04 pm EST (21:04 UTC), approximately 23.087 S, 176.594 W (south of Fiji); NSSDCA summary also 21:04 UT. 
- Conflicts: [PMR]'s narrative says "4 PM EST on January 19"; the same report's summary says 18 Jan. WP says 15:59 EST / 20:59 UTC and "near Point Nemo" - not supported by [PMR] or [SFN]; do not use.

## Root cause and report
- Review board chaired by Dr John Horack (Ohio State), 34 experts. Most likely cause: helium pressure control valve PCV2 lost seal, probably from vibration-induced loosening of threaded parts inside the valve; oxidiser "Tank 5" ruptured; ground test on a spare valve reproduced the leak and a loosened thread joint and damaged O-ring - [PMR]. Fixes: redesign/requalify PCVs, regulator and backup latch valves on Griffin.

## Images
1. Liftoff of Vulcan with Peregrine, 8 Jan 2024, NASA KSC, Public domain - https://commons.wikimedia.org/wiki/File:CLPS_Peregrine_Mission_One_(PM-1)_Astrobotic-ULA_Liftoff_(KSC-20240108-PH-ILW01_0033).jpg (4480x4975)
2. Same flight, wide shot "Peregrine launch.jpg", Public domain, Kim Shiflett (NASA) - https://commons.wikimedia.org/wiki/File:Peregrine_launch.jpg
3. Vulcan Centaur rollout with Peregrine, Public domain, NASA/Ben Smegelsky - https://commons.wikimedia.org/wiki/File:Vulcan_Centaur_rollout_(Peregrine).jpg
4. Peregrine in-flight images (Earth crescent, MLI damage): in [PMR] Figs 3-5 and 10. Rights not stated; no free-licence copy found on Commons. Link out only.
5. NASA/ASU LROC images are not relevant (Peregrine never reached the Moon).

## Not found
Dry mass; Isp; coordinates verified; rideshare; free-licence Earth-crescent photo; unverified payload masses; the 17 vs 39 day lunar-orbit wording conflict.

# Other private lunar missions, 2019 to 25 Nov 2026

Question: anything beyond Beresheet, IM-1, IM-2, Blue Ghost M1, ispace M1/M2 that reached lunar orbit, impacted or landed?
- Answer: none found. Evidence:
  - NASA update, 4 Aug 2026: Blue Moon MK1, Blue Ghost M2, IM-3 and Griffin-1 all still in testing, delivery windows 2028 (Griffin launch "late 2026") - https://www.nasa.gov/missions/moon-base/nasa-provides-updates-on-moon-base-cargo-landers-tech-demonstrations/
  - Griffin-1: Wikipedia, as of Nov 2026, not launched, NET Jan 2027 - https://en.wikipedia.org/wiki/Griffin_Mission_One
  - ispace: Mission 3 is 2028; orbiter Mission 2.5 "as early as 2027" - https://www.ispace-inc.com/2026/03/30/statement-regarding-certain-reports-in-domestic-media/
  - Blue Moon MK1 target early 2027 (search summary, Space.com/Gizmodo not opened); Blue Ghost M2 NET 2027 per Firefly page (search summary); IM-3 slipped to 2027 (search summary).
- Not covered: Chinese commercial lunar efforts, lunar-orbit cubesats on non-NASA rides, and anything after the NASA 4 Aug 2026 page not caught by search. A negative search is a fact about the search.
