# Search findings B: rows S20, S21, S22, S23, S25, S26, S27, S28, S29 (2026-11-18)

Research only; no content, data or code file was edited. Web searches used: 27 of 30. Fetched pages are
listed with the URL that answered. Failures seen: NSSDCA Mars 2 pages (`1971-045A/C/D`, `1971-049A`, `IM-1-NOVA`)
return an NSSDCA "Errors and Messages" page for every direct fetch (the Mars 2 text below is the Wayback copy of
the same page); `jpl.nasa.gov/news/...` answered 403 to curl (one JPL page was read through WebFetch, which
summarises); `investors.intuitivemachines.com` 403; `patrick.spaceforce.mil` PDF 403; `intuitivemachines.com/im-1`
and `/nova-c` redirect-loop (Wayback copy used); `science.ksc.nasa.gov` timed out (Wayback copy used);
`arianespace.com` Soyuz CSG manual 410; ESA multimedia pages return a generic JS shell with no text.
All quotes are verbatim from `pdftotext`/HTML text unless marked "(WebFetch summary)".

Locale rule for every row: the English text lives in the overlay key `<file-path>.<field>`; the same key must
change in all 14 locales, in both the aggregate `static/data/i18n/<loc>.json` and the segment file named per row
(`<loc>.missions.json`, `<loc>.fleet.json`, `<loc>.core.json`), loc = en-US, de, fr, es, it, pt-BR, nl,
sr-Cyrl, ru, zh-CN, ja, ko, hi, ar.

---

## S20 + S29: Shenzhou 5 (and the 42.4 degree inclination)

Primary sources fetched (all 200):
- CMSE, "神舟五号载人航天飞行任务基本情况": https://www.cmse.gov.cn/fxrw/szwh/jchg_193/200809/t20080917_23552.html
- CMSE, "神舟五号载人航天飞行任务时间表": https://www.cmse.gov.cn/fxrw/szwh/jchg_193/200809/t20080917_23556.html
- CMSE, "神舟五号载人飞船简介": https://www.cmse.gov.cn/fxrw/szwh/jchg_193/200809/t20080917_23551.html
- CMSE, Yang Liwei profile: https://www.cmse.gov.cn/fxrw/szwh/qsjl_195/200809/t20080920_23592.html
- NASA NSSDCA 2003-045A (Wayback copy): https://web.archive.org/web/2023/https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-045A
- NASA NSSDC SPACEWARN Bulletin 600: https://nssdc.gsfc.nasa.gov/spacewarn/spx600.html

| Claim | Location | Current value | Source and verbatim quote | Verdict | Proposed |
|---|---|---|---|---|---|
| Launch 2003-10-15 09:00 CST, Jiuquan, Long March 2F | overlay `missions/earth/shenzhou-5.json` `description`, `events.0.note` | "launched alone on a Long March 2F from Jiuquan on 2003-10-15 at 09:00 China Standard Time" | CMSE 23556: "10月15日9时整，火箭在震天憾地的轰鸣中腾空而起"; CMSE 23552: "10月15日北京时间9:00，火箭一级发动机和4个助推发动机同时点火" | CONFIRMED | none |
| Landing Inner Mongolia, 2003-10-16 CST | `description`, `events.1.note` | "landed in Inner Mongolia on 2003-10-16 (China Standard Time)" | CMSE 23552: "返回舱于2003年10月16日北京时间6:23安全着陆"; NSSDCA: "landing in the grasslands of Inner Mongolia at 22:23 UTC (6:23 a.m. local time)" | CONFIRMED (the 16 October CST date is confirmed; 22:23 UTC is 15 October) | none |
| 14 orbits | `description`, `events.1.note` | "circled the Earth 14 times", "after 14 orbits" | CMSE 23552: "神舟五号载人飞船在轨自主运行14圈返回地球"; NSSDCA: "A total of 14 orbits were made." | CONFIRMED | none |
| Altitude "about 332 to 336 km" | `description`; `src/lib/orbital/earth-orbit-registry.ts` lines 338-347 (`apogeeKm: 336, perigeeKm: 332`) | "at an altitude of about 332 to 336 km" | SPACEWARN 600 gives 332 x 336 km only as "Initial orbital parameters were period 91.2 min, apogee 336 km, perigee 332 km, and inclination 42.4 deg." CMSE 23552 gives a different insertion and a later circular orbit: "飞船进入倾角42.4度、近地点高度199.14公里、远地点高度347.8公里的椭圆轨道。...并在第5圈实施变轨，进入343公里圆轨道。" CMSE 23551: "发射到近地点200公里、远地点350公里、倾角42.4°初始轨道，实施变轨后，进入343km的圆轨道。" CMSE 23556 (orbit 7): "他在距地面343公里的太空中说" | CORRECT | Text: "He circled the Earth 14 times, in a circular orbit 343 km high after a manoeuvre on the fifth orbit, and landed in Inner Mongolia..." Registry: `apogeeKm: 343, perigeeKm: 343` (the 332 x 336 pair is an unexplained catalogue figure that the agency page contradicts). |
| Duration 21 h 22 min 45 s | `description`, `events.1.note`; registry `coastDurationS: 76965` | "21 hours, 22 minutes and 45 seconds" | CMSE 23552: "首飞航天员杨利伟在飞行21小时23分后顺利返回"; CMSE gives no seconds. The 22 min 45 s is only the English Wikipedia infobox (01:00:03 to 22:22:48 UTC). | CORRECT (seconds are secondary) | "after 21 hours and 23 minutes of flight" and in `events.1.note` "after 14 orbits and 21 h 23 min"; registry `coastDurationS: 76980` if the text changes. |
| Inclination 42.4 degrees (S29) | registry `inclinationDeg: 42.4`, comment lines 334-337 | 42.4 | CMSE 23552 and 23551 (quotes above): "倾角42.4度" | CONFIRMED (primary, replaces the Wikipedia-infobox note) | Update the registry comment and the mission `credit` to cite CMSE 23552. |
| Mass 7,840 kg | `payload` "7840 kg; one astronaut (Yang Liwei)" | 7840 kg | Only Britannica (cited by Wikipedia). SPACEWARN 600: "The 8.5 tonne satellite consists of three modules". No CMSE page fetched gives a mass. A search summary mentioned a 7,790 kg figure; I did not fetch a page that states it. | UNRESOLVED | Either drop the number ("one astronaut (Yang Liwei)") or keep it flagged as Britannica. Not settled. |
| Yang Liwei, 38, lieutenant colonel, former fighter pilot | `description` | "a 38-year-old lieutenant colonel and former fighter pilot" | CMSE profile 23592: "1965年6月21日，杨利伟出生" (so 38 on 2003-10-15); "成为空军某师一名强击机飞行员...后来，他又成为一名优秀的改机型的歼击机飞行员"; NSSDCA: "The spacecraft was manned by Lt. Col. Yang Liwei". (CMSE 23552, 2008, lists "上校军衔", i.e. colonel later.) | CONFIRMED | none |
| Credit line "Plain figures from Wikipedia, not from a CMSA page" | `static/data/missions/earth/shenzhou-5.json` `credit` | | Now CMSE-sourced except the mass | CORRECT | Replace with the CMSE pages above. |

Locale keys to change: `missions/earth/shenzhou-5.json` fields `description`, `events.1.note`
(and `payload` only if the mass is dropped). 14 locales, aggregate + `.missions.json`.
Also `src/lib/orbital/earth-orbit-registry.ts` shenzhou-5 block and its comment (not a locale file).

---

## S21: Mars 2

Sources fetched: NSSDCA 1971-045A via Wayback (https://web.archive.org/web/2023/https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-045A, 200);
NASA History, Perminov, "The Difficult Road to Mars", https://history.nasa.gov/monograph15.pdf (200);
NASA/PDS caption PIA18888 https://pds-rings.seti.org/press_releases/pages/PIA18xxx/PIA18888.html (200);
NSSDCA chronology https://nssdc.gsfc.nasa.gov/planetary/chronology.html (200).

| Claim | Location | Current text | Source and verbatim quote | Verdict | Proposed |
|---|---|---|---|---|---|
| Launch 1971-05-19 | `missions/mars/mars2.json` | "launched on 1971-05-19" | chronology: "Mars 2 - 19 May 1971 - Mars Orbiter/ Attempted Lander"; NSSDCA: "Launch Date: 1971-05-19" | CONFIRMED | none |
| 4,650 kg | `payload` "4650 kg (orbiter + lander combined)"; flight `mass_at_tli_kg` 4650 | | NSSDCA: "The attached orbiter/bus and descent module had a mass of approximately 4650 kg at launch (including fuel)" | CONFIRMED | none |
| Descent module separated about 4.5 h before arrival | `description`, `events.2.note` | | NSSDCA: "Mars 2 released the descent module (71-045D) 4.5 hours before reaching Mars on 27 November 1971." | CONFIRMED | none |
| Descent system malfunctioned, parachute did not deploy, lander crashed | `description` | "Its descent system malfunctioned, the parachute did not deploy and the lander crashed on Mars." | NSSDCA: "The descent system malfunctioned and the lander crashed at 45 deg S, 313 deg W". Perminov: "the lander entered the Martian atmosphere at the big angle and hit the Martian surface before the parachute system was activated." | CONFIRMED | none |
| Orbit insertion 1971-11-27 into an 18-hour orbit | `description`, `events.1.note` | | NSSDCA (same paragraph, same date): "the orbiter engine performed a burn to put the spacecraft into a 1380 x 24,940 km, 18 hour orbit about Mars with an inclination of 48.9 degrees." NSSDCA gives no separate date for the burn; Perminov's text is garbled on this point. | CONFIRMED (18 h, 1380 x 24,940 km); the 27 November date for the burn is inferred from the same paragraph | optional: add "1,380 x 24,940 km" |
| Orbiter worked until about August 1972 | `description` | "sent data until about August 1972" | NSSDCA: "transmissions continued through August. It was announced that Mars 2 and 3 had completed their missions by 22 August 1972, after 362 orbits completed by Mars 2". Perminov: "the orbiters of Mars 2 and Mars 3 continued circling the planet for 8 months" | CONFIRMED | none |
| Nine days before Mars 3 | `description` | | chronology: Mars 3 "28 May 1971" | CONFIRMED | none |
| Fleet entry "first human-made object to reach the Martian surface" | `fleet/lander/mars-2.json` `tagline`, `description`, `best_known_for`; `mars-sites/mars2.json` `fact` | | NASA/PDS PIA18888: "The Soviet Mars 2 lander was the first man-made object to touch the surface of the Red Planet when it crashed landed on 27 November 1971." | CONFIRMED (NASA states it; the S21 note that this wording was left out of the mission record can be lifted) | none |
| Cause of failure | site story `site-stories/mars2.json` `intro`: "probably because the capsule came in too steeply" | | PIA18888: "It is believed that the descent stage malfunctioned after the lander entered the atmosphere at too steep an angle." NSSDCA: "at a steeper angle than planned". Perminov: "the onboard computer issued a wrong command to decrease the height of the pericenter" | CONFIRMED | none |
| `delta_v` "~5.5 km/s (estimate)" | `delta_v` | | No primary figure found | UNRESOLVED (class estimate) | keep as estimate |

Side note (not in the row): `mars-sites/mars2.json` `site_name` reads "Approx. 45°S, 313°E (Hellas Planitia)"; NSSDCA says "45 deg S, 313 deg W" (Soviet west-positive; 313 W is 47 E). Whoever owns that file should check the hemisphere letter.

Locale keys: none required by this row. (If the failure-cause wording is later added, `missions/mars/mars2.json.description`.)

---

## S22: IM-1 (Odysseus)

Sources fetched: NSSDCA IM-1 via Wayback (https://web.archive.org/web/20240615/https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=IM-1-NOVA, 200);
NASA TM-20250010290, Navigation Doppler Lidar performance (https://ntrs.nasa.gov/api/citations/20250010290/downloads/NASA%20TM%2020250010290.pdf, 200);
NASA NDL slides (https://ntrs.nasa.gov/api/citations/20240004236/downloads/MSS%202024_NDL%20Lunar%20Mission.pdf, 200);
NASA CLPS results page (https://www.nasa.gov/missions/artemis/clps/nasa-collects-first-surface-science-in-decades-via-commercial-moon-mission/, 200);
NASA release (https://www.nasa.gov/news-release/nasa-tech-contributes-to-soft-moon-landing-agency-science-underway/, 200);
NASA CLPS blog (https://www.nasa.gov/blogs/clps/2024/02/22/intuitive-machines-prepares-to-land-on-the-moon-with-nasa-science-ready-to-begin-operations/, 200);
Intuitive Machines page, Wayback (https://web.archive.org/web/20240402105229/https://www.intuitivemachines.com/im-1, 200);
IM-1 press kit (https://web.archive.org/web/20240213160536/https://www.intuitivemachines.com/_files/ugd/7c27f7_51f84ee63ea744a9b7312d17fefa9606.pdf, 200).

| Claim | Location | Current | Source and verbatim quote | Verdict | Proposed |
|---|---|---|---|---|---|
| Launch 2024-02-15 06:05:37 UTC, Falcon 9, LC-39A | `static/data/missions/moon/im-1.json` flight event line 56 (not an overlay) | "Kennedy Space Center LC-39A, 2024-02-15, 06:05:37 UTC." | NSSDCA: "IM-1 launched on 15 February 2024 at 06:05 UT (1:05 a.m. EST) on a SpaceX Falcon 9 from Kennedy Space Center." NASA TM: "launched from KSC on a SpaceX Falcon 9 launch vehicle on 06:05:00 UTC, February 15, 2024". IM press kit: "from Launch Complex 39A at NASA's Kennedy Space Center in Florida." | CORRECT (the 37 seconds have no source; "Block 5" was not verified either) | "2024-02-15, 06:05 UTC" |
| Lunar orbit insertion 2024-02-21 | `description`, `events.1.note` | | NASA TM: "a lunar orbit insertion maneuver that placed the spacecraft in a 20 by 200 km altitude orbit on February 21, 2024, at 14:35:51 UTC" | CONFIRMED | none |
| Landing 2024-02-22 23:23:53 UTC near Malapert A, 80°08' S, 1°26' E | `description`, flight event line 68 | | NSSDCA: "Odysseus landed on the Moon at Malapert A crater near the south pole on February 22, at 23:23:53 UT ... at 80.13 degrees S, 1.44 degrees E". NASA TM: "location -80.1276 N, 1.4367 E on February 22, 2024 at 23:23:00 UTC" | CONFIRMED (seconds differ between the two NASA documents; NSSDCA kept) | none |
| Tipped over at about 30 degrees | `description`, `events.2.note` | | NSSDCA: "Some of the landing gear broke upon impact, and Odysseus tipped over and is resting at a 30 degree angle to the horizontal, but is still operational." | CONFIRMED | none |
| Lost power with the lunar night 2024-02-29 | `description`, flight event line 68 | "kept working until it lost power as the lunar night began on 2024-02-29" | NASA CLPS results: "The six instruments ceased science and technology operations seven days after landing". IM page: "our IM-1 mission ended seven days after landing, as Odysseus' mission was not intended to survive the harsh temperatures of the lunar night"; the IM release is dated "HOUSTON, Feb. 29, 2024". NSSDCA says instead: "It was losing sunlight and powered down on February 28." | CORRECT (two-way disagreement, 28 vs 29 Feb) | "It worked for about seven days after landing, until the lunar night; Intuitive Machines announced the end of science on 2024-02-29." Keep the date only if that framing is used. |
| Six NASA payloads | `payload`, `description` | | NASA release: "Carrying six NASA science research and technology demonstrations". NSSDCA says "five NASA payloads". | CONFIRMED (NASA) | none |
| Lander mass 1,900 kg | `payload`, flight `mass_at_tli_kg` | | NSSDCA: "Mass: 1908 kg". NASA TM: "wet mass at launch of 2035 kg and dry mass of 677 kg". | CORRECT / disputed | "about 1,900 kg" stays within NSSDCA; the NASA TM says 2,035 kg wet. Choose one and cite it. |
| Fleet entry: laser rangefinder inactive, "safety switch not armed pre-launch" | `fleet/lander/im-1-odysseus.json` `description` | "the primary laser rangefinder had been left inactive — safety switch not armed pre-launch" | NASA NDL slides: "IM found out hours before landing that their laser range finders couldn't be turned on as they had a manual safety switch turned on". NASA TM: "A discovery was made prior to descent initiation that the laser altimeter was not operational". | CORRECT (the "not armed" direction is not what NASA says) | "its laser rangefinders could not be turned on because a manual safety switch was on" (or drop the cause: "its laser altimeter was not operational") |

Locale keys: `missions/moon/im-1.json` `description` (power-loss sentence); `fleet/lander/im-1-odysseus.json` `description`.
Non-overlay edits: `static/data/missions/moon/im-1.json` flight event descriptions (lines 56, 68) and `credit`.

---

## S27: Nova-C model (`src/lib/three/showcase/landers.ts`)

Code: `NOVA_C_HEIGHT_M = 4.3` (line 30), `NOVA_C_WIDTH_M = 1.57` (line 31), `yBot 1.15`, `yTop 3.85`, foot radius `2.0` (line 119). The header comment cites "search-backlog row S25"; the row is S27.

| Claim | Source and verbatim quote | Verdict | Value |
|---|---|---|---|
| Height 4.3 m | IM-1 press kit (Intuitive Machines, p.23): "Height. 4.3 m". NASA TM-20250010290: "The vehicle was 3.9 m tall by 1.6 m in diameter with a hexagonal cross section" (conflict). | CONFIRMED against the company kit; NASA TM disagrees | keep 4.3 m, note 3.9 m in NASA TM |
| Width 1.57 m | Press kit: "Hull Diameter - 1.6m"; NASA TM: "1.6 m in diameter" | CORRECT | 1.6 m (1.57 is Wikipedia-only) |
| Leg splay about 2 m radius | Press kit: "Landing gear diameter - 4.6m" | CORRECT | foot radius 2.3 m (line 119: `multiplyScalar(2.0)`) |
| Six legs, hexagonal | NSSDCA/press kit; NASA TM: "hexagonal cross section" | CONFIRMED (six legs only on Wikipedia/search, not on a fetched primary page) | keep |
| Methane / LOX engine | Press kit: "ENGINE: ... Liquid Methane & Liquid Oxygen ... ISP - over 320 sec" | CONFIRMED; "VR900, 3,100 N" UNRESOLVED (no fetched primary) | keep |
| Top-deck + body solar panels | Press kit: "top deck and side solar arrays"; NASA CLPS kit: "lander top deck solar array" | CONFIRMED (count of three not stated) | keep |
| Dry mass | Press kit: "Vehicle weight - 675kg"; NASA TM: "dry mass of 677 kg" | CONFIRMED | n/a |

Update the file header comment to cite the press kit instead of Wikipedia.

---

## S28: MRO and Mariner 2 models (`src/lib/three/showcase/orbiters.ts`)

Sources: JPL MRO launch press kit https://www.jpl.nasa.gov/news/press_kits/mro-launch-Aug05.pdf (200);
NSSDCA 2005-029A https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2005-029A (200);
NSSDCA 1962-041A https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1962-041A (200).

MRO (`MRO_ARRAY_M` line 746, dish 747, SHARAD 748, HiRISE 749, bus `[1.8, 2.2, 1.6]` line 753):

| Claim | Source and verbatim quote | Verdict |
|---|---|---|
| Arrays 5.35 x 2.53 m | JPL press kit: "Each array is 5.35 meters (17.56 feet) long by 2.53 meters (8.30 feet) wide." | CONFIRMED (primary replaces Wikipedia) |
| Overall span about 13.5 m | JPL press kit: "width 13.6 meters (45 feet) with pair of 5.35- by 2.53-meter (17.56- by 8.30-foot) solar panels"; "Height 6.5 meters (21 feet) with 3-meter-diameter (10-foot) dish antenna" | CONFIRMED (13.6 m; model span 13.5 m is within 0.1 m; 6.5 m height is the target for the overall model height) |
| 3 m dish | NSSDCA: "a 3 meter high-gain antenna dish" | CONFIRMED |
| SHARAD 10 m (two 5 m tubes) | JPL press kit: "The Shallow Subsurface Radar's antenna will extend five meters (16 feet) to each side of the spacecraft." | CONFIRMED |
| HiRISE 1.6 x 0.9 m | not restated in the press kit; the NASA instruments page was fetched on 2026-11-15, not re-fetched | UNRESOLVED in this pass (previously fetched) |
| Bus 1.8 x 2.2 x 1.6 m | no fetched primary gives the bus size | UNRESOLVED (schematic; constrain it by the 6.5 m total height and 13.6 m span) |

Side findings in MRO text: `missions/mars/mro.json.payload` "2180 kg fuelled (1031 kg operational)". JPL: "Mass: 2,180 kilograms ... total at launch, consisting of 139 kilograms (306 pounds) science payload, 892 kilograms (1,967 pounds) other dry weight, plus 1,149 kilograms (2,533 pounds) of propellant and pressurant" (139 + 892 = 1,031 kg is the dry mass). CORRECT to "(1031 kg dry)". `missions/mars/mro.json.first` says "as small as a dinner table"; the JPL kit says "features as small as a kitchen table" (line 538). CORRECT to "kitchen table".
Locale keys for those two: `missions/mars/mro.json` `payload`, `first`.

Mariner 2 (`MARINER_2_HEIGHT_M` 3.66, `MARINER_2_SPAN_M` 5.05, dish 0.4 m):

| Claim | Source and verbatim quote | Verdict |
|---|---|---|
| Base 1.04 m, 0.36 m thick, height 3.66 m, span 5.05 m, panels 183 x 76 and 152 x 76 cm + 31 cm extension | NSSDCA: "a hexagonal base, 1.04 meters across and 0.36 meters thick ... total height of the spacecraft to 3.66 meters ... total span of 5.05 meters and width of 0.76 meters" | CONFIRMED |
| Dish size | NSSDCA: "Attached by an arm to one side of the base and extending below the spacecraft was a large directional dish antenna." No diameter. The only dish size is the radiometer: "a 48 cm diameter parabolic radiometer antenna mounted near the bottom of the mast". | UNRESOLVED (schematic 0.4 m stays) |
| Omni antenna on top of the mast | NSSDCA: "a cylindrical omnidirectional antenna at the top of the instrument mast" | CONFIRMED |

Not found: the JPL Mariner 2 report (SP-59) text and a JPL MRO fact sheet beyond the press kit.

---

## S23: Viking 2, MRO, Mariner 2, Atlas-Agena B

Sources fetched: NASA Viking 2 mission page https://science.nasa.gov/mission/viking-2/ (200);
NSSDCA Viking 2 orbiter 1975-083A via Wayback (https://web.archive.org/web/2023/https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-083A, 200);
NASA SP-4524 Deep Space Chronicle https://www.nasa.gov/wp-content/uploads/2023/04/sp-4524.pdf (200);
NASA "45 years ago: Viking 1 touches down" https://www.nasa.gov/history/45-years-ago-viking-1-touches-down-on-mars/ (200);
NASA SP-4012 vol. 2 https://www.nasa.gov/wp-content/uploads/2023/04/sp-4012v2.pdf (200);
NSSDCA MIDAS 3 via Wayback (https://web.archive.org/web/2023/https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1961-018A, 200);
NASA FACTS NF B-4-63 https://ntrs.nasa.gov/api/citations/19630006687/downloads/19630006687.pdf (200);
NASA Mariner 2 page https://science.nasa.gov/mission/mariner-2/ (200).

| Claim | Location | Current | Source and verbatim quote | Verdict | Proposed |
|---|---|---|---|---|---|
| Viking 2 orbiter end 24 vs 25 July 1978 | `missions/mars/viking2.json.description`; `fleet/lander/viking-2.json.description` | "turned off on 1978-07-24" | NASA mission page: "July 24, 1978: End of orbiter operations". SP-4524: "A series of leaks prompted the termination of Orbiter 2 operations on 24 July 1978". NSSDCA: "turned off on 25 July 1978 after returning almost 16,000 images in 706 orbits". | CONFIRMED (two NASA sources for 24 July; NSSDCA is the odd one) | keep 24 July |
| Viking 2 launch mass 3,530 kg | `missions/mars/viking2.json.payload`; flight `mass_at_tli_kg` 3530 | "3530 kg (orbiter + lander)" | NASA mission page: "Spacecraft Mass 7,776 pounds (3,527 kilograms)"; NSSDCA: "The fully fueled orbiter-lander pair had a mass of 3527 kg."; SP-4524 table: "3,527 kg" | CORRECT | "3527 kg"; flight `mass_at_tli_kg` 3527 |
| Viking 2 orbit inclination 80.5 degrees | `static/data/missions/mars/viking2.json` `flight.arrival.inclination_deg` 80.5, source text "inclination from Wikipedia (80.5 deg)" | | NSSDCA: "trimmed to a 27.3 hr site certification orbit with a periapsis of 1499 km and an inclination of 55.2 degrees on 9 August ... The orbit inclination was raised to 75 degrees on 30 September 1976 ... On 20 December 1976 the periapsis was lowered to 778 km and the inclination raised to 80 degrees." No primary page states 80.5; the insertion orbit (1500 x 33,000 km) was not at 80 degrees. | CORRECT | If a number is kept, use 80 (NSSDCA, from December 1976) and label it as the extended-mission orbit; for the arrival block remove `inclination_deg` or say it is not stated. |
| Viking makers (lander Martin Marietta; orbiter JPL) | `static/data/fleet/lander/viking-2.json` `manufacturer`: "Martin Marietta (lander); NASA JPL (orbiter)"; `viking2-lander.json` `manufacturer` | | NASA history page: "an orbiter, based on the Mariner 9 spacecraft built by the Jet Propulsion Laboratory (JPL), in Pasadena, California, and a lander, built by Martin Marietta under contract to NASA Langley" | CONFIRMED | credit line "Manufacturers from Wikipedia" can cite NASA instead |
| Mariner 2 closest approach 34,773 vs 34,854 km | `missions/venus/mariner2.json.description`, `events.1.note`; `fleet/orbiter/mariner-2.json.description`; data `flight.arrival.periapsis_km` | 34,773 km | NSSDCA: "closest distance of 34,773 km at 19:59:28 UT 14 December 1962". NASA mission page: "flew by Venus at a range of 21,660 miles (34,854 kilometers) at 19:59:28 UT Dec. 14, 1962". NASA FACTS NF B-4-63 (1963): "flew past Venus at a distance of 21 ,648 miles" (= 34,839 km). SP-59 final report not fetched. | UNRESOLVED (three NASA figures, 34,773 / 34,839 / 34,854) | If a single number is wanted, "about 35,000 km" is inside all three; otherwise keep NSSDCA and keep the credit note. |
| Mariner 2 maker NASA JPL | | | NASA mission page: "Mission Design and Management NASA/JPL"; NSSDCA personnel: project manager "NASA Jet Propulsion Laboratory" | CONFIRMED | none |
| Atlas-Agena B first flight 1961-07-12, Midas 3 | `fleet/launcher/atlas-agena-b.json` `first_flight`, `description` | | NSSDCA MIDAS 3: "an Agena B replaced the Agena A as the upper stage" and "Launch Date: 1961-07-12". | CONFIRMED | none |
| Diameter 3 m; Agena built by Lockheed; Atlas by Convair | same file `specs.diameter_m`, `manufacturer` | | SP-4012 vol. 2, Table 1-40 "Atlas-Agena B Characteristics": "Diameter (m): 3" (first stage), Agena B 1.5, total height 30.6 m; "Contractors: Consolidated Vultee Aircraft Corp. (Convair/General Dynamics), Atlas ... Lockheed Missiles and Space Co., Agena" | CONFIRMED (and the stack height is 30.6 m, which can fill the "36 m not found" gap) | `specs.height_m` 30.6 if wanted |
| "Between 1961 and 1965 it completed 21 successes in 28 flights" | `fleet/launcher/atlas-agena-b.json` `description` (overlay) | | SP-4012: "Atlas-Agena B combination used to launch Ranger I through 9 ... Atlas-Agena B was also used with Mariner I and 2 and OGO 1 and 3, with the last launch of an Agena B taking place on June 6, 1966." The 21-of-28 count has no fetched primary. | REMOVE the count; CORRECT the end year to 1966 | "It first flew with Midas 3 on 1961-07-12. NASA used it for Ranger 1 to 9, Mariner 1 and 2 and OGO 1 and 3; the last Agena B launch was on 1966-06-06." |
| "The standardized Agena D first flew in 1963" | same description | | SP-4012: "June 1962 Air Force successfully flight tested the Agena D." | CORRECT | "The improved Agena D, flight tested by the Air Force in June 1962, replaced the Agena B." |
| Atlas-Agena `delta_v` and TCM dates for Viking 2 / Mars 2 / IM-1 / Mariner 2 (all class estimates, `tcm_count` 0) | data | | Not sought in this pass (no TCM date appeared in any fetched primary page) | UNRESOLVED | |
| MRO launch pad | not stored | | Not stated on the NSSDCA / JPL pages used here | UNRESOLVED | |

Side findings from the Viking pages: the fleet text `fleet/lander/viking2-lander.json` says "(47.97° N, 134.04° E)"; SP-4524 gives "47.968° north latitude and 225.71° west longitude" (= 134.29° E). Descent-profile rows for Viking 2, Mars 2, IM-1: not researched.

Locale keys: `missions/mars/viking2.json.payload`; `fleet/launcher/atlas-agena-b.json.description`; (Mariner 2 only if the distance changes) `missions/venus/mariner2.json` `description`, `events.1.note`, `fleet/orbiter/mariner-2.json.description`.

---

## S25: X-37B Earth-orbit coast (`earth-orbit-registry.ts`, `otv-1` to `otv-7`)

Source fetched: CelesTrak SATCAT (the Space Force catalogue, public mirror), e.g. https://celestrak.org/satcat/records.php?NAME=USA%20212&FORMAT=json and `?INTDES=2023-210` (200). Space-Track needs a login; no USSF/Boeing page that states orbit elements was found.

| Object | SATCAT launch / decay | Days | Registry `coastDurationS` | Verdict on days |
|---|---|---|---|---|
| OTV 1 (USA 212) | 2010-04-22 / 2010-12-03 | 225 | 19,440,000 (225 d) | CONFIRMED |
| OTV 2 (USA 226) | 2011-03-05 / 2012-06-16 | 469 | 40,521,600 (469 d) | CONFIRMED |
| OTV 3 (USA 240) | 2012-12-11 / 2014-10-17 | 675 | 58,320,000 (675 d) | CONFIRMED |
| OTV 4 (USA 261) | 2015-05-20 / 2017-05-07 | 718 | 62,035,200 (718 d) | CONFIRMED |
| OTV 5 (USA 277) | 2017-09-07 / 2019-10-27 | 780 | 67,392,000 (780 d) | CONFIRMED |
| OTV 6 (USA 299) | 2020-05-17 / 2022-11-12 | 909 | 78,537,600 (909 d) | CONFIRMED |
| OTV 7 (USA 349) | 2023-12-29 / 2025-03-07 | 434 | 37,497,600 (434 d) | CONFIRMED |

Orbit elements (perigee, apogee, inclination): UNRESOLVED. SATCAT carries `"PERIOD":null,"INCLINATION":null,"APOGEE":null,"PERIGEE":null` for every decayed X-37B object; `gp.php` returns "No GP data found". Tried: CelesTrak SATCAT and GP for all seven; no agency page states them. The Wikipedia-derived figures stay as the stopgap.

CORRECT (found by this check): OTV-7 is "OTV 7 (USA 349)" in SATCAT (NORAD 58666, 2023-210A); the repo says "USA-358". USA 358 in SATCAT is a different object (NORAD 59818, 2024-096E, launched 2024-05-22). Locations: `static/data/missions/earth/otv-7.json` `payload` ("USA-358 / USSF-52; ..."), `static/data/fleet/crewed-spacecraft/x37b.json` line 72 `flight_designation` ("X-37B OTV-7 (USA-358, USSF-52)"). Locale keys: `missions/earth/otv-7.json.payload` in all 14 locales (aggregate + `.missions.json`); the `flight_designation` string in x37b.json is data. Proposed: "USA-349 / USSF-52".
Also inconsistent inside the repo: `fleet/crewed-spacecraft/x37b.json.description` says "224 days (OTV-1, 2010)" and "908 days (OTV-6)", while the mission records and registry use 225 and 909 (SATCAT dates give 225 and 909 as calendar-day differences). One of the two must be made to match the other.

---

## S26: Launch-pad dimensions (`src/lib/three/launch-pads.ts`, `src/lib/launches/pad-family.ts`)

Code lines: `padTowerHeightM` lines 46-85 (`apollo-lut` 380 ft, `shuttle` 350 ft, `sls` 108, `soyuz` 1.6 x vehicle, `proton` 1.9 x vehicle, `f9-39a` 350 ft, `f9-cat` 80, `starbase` 146, `atlas-v` 1.15 x vehicle, `cape-classic` 1.1 x vehicle, `kourou-a5/a6` 0.95 x vehicle, `chinese-fst` `CHINESE_REL` x vehicle, `tanegashima` 0.8 x vehicle); RSS lines 302-303 (`189 * FT`), FSS line 296 (`247 * FT`), lattice at line 282 (183), water tower line 305 (290 ft).

| Claim | Source (fetched, 200) and verbatim quote | Verdict | Value |
|---|---|---|---|
| Shuttle FSS 247 ft | NASA KSC STS newsref LC-39 (Wayback of science.ksc.nasa.gov/shuttle/technology/sts-newsref/sts-lc39.html): "The height of the fixed service structure to the top of the tower is 247 feet." NASA FACTS LC-39 (https://www3.nasa.gov/centers/kennedy/pdf/168440main_LC39-06.pdf): "standing 347 feet from ground level to the tip of the lightning mast. The 80-foot tall fiberglass mast..." | CONFIRMED (the 350 ft `shuttle` / `f9-39a` height is the 347 ft to the mast tip) | keep |
| Shuttle RSS "189 ft high, 102 ft wide" | same newsref: "The rotating service structure is 102 feet long, 50 feet wide and 130 feet high. The elevation of the main structure above the surface of the pad ranges from 59 to 189 feet." NASA FACTS: "The RSS is 102 feet long, 50 feet wide, and 130 feet high." | CORRECT: 102 ft is the length (50 ft the width); 189 ft is the top elevation, 130 ft the structure height | footprint 102 x 50 ft stands (model 31 x 15 m); keep 189 ft as top elevation |
| Water tower 290 ft | NASA FACTS: "Water stored in a 290-foot-high, 300,000-gallon tank" | CONFIRMED | keep |
| SLS Mobile Launcher tower 108 m | NASA ML-1 fact sheet (https://www.nasa.gov/wp-content/uploads/2021/04/final_-_mobile_launcher_1_fact_sheet.pdf): "Tower: 40 feet square, about 345 feet tall"; "Total height above ground: ~400 feet"; "Two-story base: 25 feet high, 165 feet long, and 135 feet wide" | CORRECT: 345 ft = 105 m, not 108 m (NASA's other pages say 355 ft) | 105 m, or keep 108 m and note the 345-355 ft range |
| LC-39B lightning towers 183 m | NASA "Lightning Towers Stand Tall at NASA Kennedy's Launch Pad 39B" (https://www.nasa.gov/missions/artemis/lightning-towers-stand-tall-at-nasa-kennedys-launch-pad-39b/): "At nearly 600 feet, the taller towers" | CONFIRMED (600 ft = 183 m) | keep |
| SLC-40 crew access tower 80 m | FAA Written Re-evaluation https://www.faa.gov/media/92781: "The approximately 300 feet tall crew tower at SLC-40 is similar in design to the existing crew access tower at LC-39A." | CORRECT | 91 m (300 ft), `f9-cat` line 63 and lines 453-454 |
| Starbase tower 146 m | FAA Final PEA https://www.faa.gov/sites/faa.gov/files/2022-06/PEA_for_SpaceX_Starship_Super_Heavy_at_Boca_Chica_FINAL.pdf: "Each tower would be approximately 480 feet tall with a 10-foot lightning rod on top" | CONFIRMED (480 ft = 146 m; planned-tower wording) | keep |
| Jiuquan (Shenzhou) tower | CMSE https://www.cmse.gov.cn/kpjy/htzs/gbtg/201509/t20150911_37346.html: "脐带塔高105.52米（含16米高避雷针），塔体为钢结构，设10层固定平台，塔架设四节回旋平台、回旋平台上设13层水平工作台。" | CORRECT | 89.5 m umbilical tower plus a 16 m lightning rod (105.52 m total) instead of `CHINESE_REL['jiuquan-slc-43']` 1.7 x vehicle (about 99 m) |
| Wenchang pads | Xinhua 2026-02-15 (https://english.news.cn/20260215/dfd2dbfe847c44dfbb31f370fad6ad4b/c.html): "a white launch tower standing approximately 120 meters tall ... the tallest launch tower in China currently" (the new crewed-lunar pad, not LC-101); Xinhua 2025-03-12 (https://english.news.cn/20250312/1a44e9d635984f47a3f242e2f7fd1ca1/c.html): "The launch pad, standing 83 meters tall" (the commercial spaceport pad, Long March 8; the page does not name LC-201 explicitly) | PARTIAL: 83 m for the commercial pad; LC-101 height not found | `wenchang-lc-201`: 83 m if the commercial-pad identification is accepted; LC-101 UNRESOLVED |
| Tanegashima Yoshinobu | JAXA guide https://global.jaxa.jp/countdown/f11/presskit/tnsc_guide_e.pdf: "Height 65.5 m/ Width: 22 m/ Depth 21 m" (Mobile Launcher); "Lightening tower: Height: 74.5 m"; "<Height: 61 m/ Total weight: 1,000 t/ steel structure>" (former Pad Service Tower) | CORRECT: model is 0.8 x vehicle (about 43 m) | tower 65.5 m, lightning tower 74.5 m |
| Kourou ELA-4 gantry | ESA https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Building_Ariane_6_mobile_gantry_at_Europe_s_Spaceport: "The mobile gantry is a 90 m-high, nine-storey structure" | CONFIRMED for the gantry (retracted at liftoff; the pad's umbilical mast not found) | n/a |
| Kourou Soyuz (ELS) | ESA https://www.esa.int/Enabling_Support/Space_Transportation/Soyuz_launch_site_ready_for_first_flight: "the 45 m-tall mobile gantry" | CONFIRMED (45 m; a search summary gave 52 m from a source I did not fetch) | `soyuz` variant is 1.6 x vehicle for all Soyuz pads |
| Kourou ELA-3 mast, lightning towers | not found on any fetched page (ESA/CNES pages return no heights) | UNRESOLVED | |
| Proton service tower (`proton` 1.9 x vehicle) | ILS Proton PMPG section 6 (200) and RussianSpaceWeb pages (200) give no tower height | UNRESOLVED (a search summary said 60 m from an unfetched page; that would make 1.9 x vehicle about 110 m too tall) | |
| Soyuz Baikonur cabins/masts; SLC-41 umbilical tower; Cape mobile-service-tower pads; Xichang, Taiyuan; Sriharikota | ULA Atlas V guide (200) has no tower height; ISRO pages found give none ("33 metres" only for the SSLV complex); nothing fetched for the others | UNRESOLVED | |
| Reference photographs | Not researched here (out of scope with S24 images) | NOT DONE | |

Locale keys: none (pad sizes are code constants in `launch-pads.ts`; the "approximate" flag lives on /colophon, not located).

---

## Summary of proposed edits (for the person applying them)

1. Shenzhou 5: 343 km circular orbit, "21 hours and 23 minutes", registry 343/343 and 76,980 s, CMSE credit; mass UNRESOLVED.
2. IM-1: launch time without seconds; fix the fleet rangefinder wording; power-loss wording (28 vs 29 Feb); settle 1,900 vs 1,908 vs 2,035 kg.
3. MRO: "1031 kg dry"; "kitchen table".
4. Viking 2: payload 3527 kg; drop or relabel 80.5 degrees.
5. Atlas-Agena B: remove "21 successes in 28 flights", end year 1966, Agena D flight-tested June 1962, height 30.6 m available.
6. OTV-7: USA-349, not USA-358; reconcile 224/908 vs 225/909.
7. Models and pads: Nova-C landing-gear diameter 4.6 m (foot radius 2.3 m), hull 1.6 m; SLC-40 tower 91 m; ML 105 m; Tanegashima 65.5 m + 74.5 m; Jiuquan 89.5 m + 16 m rod.
8. Left unsettled: Shenzhou mass, X-37B orbit elements, Mariner 2 closest approach (three NASA values), Nova-C VR900 thrust, MRO bus and HiRISE sizes, Proton, Soyuz Baikonur, SLC-41, Cape MST pads, Chinese pads other than Jiuquan and the commercial Wenchang pad, Sriharikota, Kourou ELA-3.
