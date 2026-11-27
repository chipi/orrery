# W9 Shenzhou-12 / Tianhe hardware and approach, sourced - 2026-11-27

Companion to `docs/wip/2026-11-27-w9-docking-timelines-sourced.md` section 3. Rule: every number carries a URL fetched this session. "(search summary only)" = only the web-search result text, page not opened. "NOT FOUND" = no source I opened gave it; nothing from memory. Times UTC unless stated; "(mine)" = my arithmetic. Page text was read through a summarising fetcher (WebFetch), not raw HTML, so quotes are as returned by it.

Source tags:
- [WP-TH] https://en.wikipedia.org/wiki/Tianhe_core_module (last resort)
- [PD-0429] https://en.people.cn/n3/2021/0429/c90000-9845269.html (People's Daily, launch day)
- [PD-0617] https://en.people.cn/n3/2021/0617/c90000-9862248.html
- [CGTN-0618] https://news.cgtn.com/news/2021-06-18/Deciphering-Shenzhou-12-spaceship-Docking-space-tasks-and-trivia-11c2JaMAhk4/index.html
- [CGTN-1028] https://news.cgtn.com/news/2021-10-28/China-Space-Station-1st-radial-rendezvous-for-manned-spacecraft-14IGT64ne9i/index.html (Shenzhou-13, for the 200 m rule)
- [CGTN-SOL] https://news.cgtn.com/news/2022-08-17/China-Space-Station-Homegrown-solar-array-powers-nation-s-space-goal-1czLeC36wy4/index.html
- [EUREKA] https://www.eurekalert.org/news-releases/1051342 (summary of a journal paper on Tiangong design)
- [SFN-TZ2] https://spaceflightnow.com/2021/05/31/cargo-ship-docks-with-chinese-space-station/
- [SC] https://english.spacechina.com/n17212/c3526593/content.html (China Aerospace Science and Technology Corp.)
- [RDS] https://rdataspace.github.io/station_tiangong/tiangong-tech-station.html (hobbyist data site, secondary)
- [WP-CDM] https://en.wikipedia.org/wiki/Chinese_Docking_Mechanism ; [WP-SZ] https://en.wikipedia.org/wiki/Shenzhou_(spacecraft)

Not reached: CMSA / CASC primary technical pages (none surfaced), spacenews (429), spaceflight101 (404), wikiwand (403), the Chinese-language CNSA/CAST pages (not tried), gov.cn Tianzhou-2 page (opened, no Tianzhou content).

## 1. Tianhe node cabin and ports

| Item | Value | Source |
|---|---|---|
| Structure | Core module "consists of 3 parts: a node cabin, a life control cabin, and a resource cabin" | [EUREKA] |
| Node cabin shape | "the spherical structure at the front of Tianhe", forward docking hub with four ports: axial, port, starboard, nadir | [RDS]; (search summary of WP, same wording) |
| Node cabin diameter | NOT FOUND (no source opened gives it; [WP-TH] and [EUREKA] state it is not given) | |
| Ports, count | EUREKA: 3 docking hatches at the module: forward (crewed ships, later Xuntian), backward (cargo), radial (crewed). [RDS]/[WP-TH]: forward hub has 4 (axial, port, starboard, nadir) plus an aft-facing port at the service-module end = 5 total | [EUREKA]; [RDS]; [WP-TH] |
| Ports with rendezvous equipment | "The axial and nadir ports ... fitted with rendezvous equipment", used for Tianzhou and Shenzhou. Search summary adds forward, nadir and aft carry it | [RDS]; (search summary only) |
| Port and starboard | "Mengtian and Wentian modules are semi-permanently attached to the port and starboard ports" (later, 2022; not present on 17 Jun 2021) | [WP-TH] |
| Capacity statement (launch day) | "a node that could dock with up to three spacecraft at a time for short stays, or two for long" | [PD-0429] |
| Shenzhou-12 port | "front docking port of Tianhe" (axial/forward) | [PD-0617] |
| Aft port on 17 Jun 2021 | Tianzhou-2 (see below) | |
| Radial/nadir/port/starboard on 17 Jun 2021 | Free. No source I opened lists anything attached; nothing is claimed by [CGTN-0618], which says three parts (core, cargo ship, Shenzhou-12) were docked | [CGTN-0618] |
| Tianzhou-2 | Docked at the rear port: "Tianzhou 2 docked with the rear port on the Tianhe module", "lined up for an autonomous docking at 5:01 p.m. EDT (2101 GMT) Saturday" (29 May); fast approach "just eight hours" | [SFN-TZ2] |
| Tianzhou-2 date, WP | "29 May 2021" | [WP-TH] |
| Tianzhou-2 date, Beijing (search summary only) | 5:01 am Beijing 30 May 2021 (= 21:01 UTC 29 May, mine); launch 8:55 pm Beijing 29 May from Wenchang | (search summary of Xinhua / China Daily; page opened for China Daily did not state it) |
| Tianzhou-2 cargo | 6.9 t | [CGTN-0618] |

Conflict on lengths: see section 3.

## 2. Chinese Docking Mechanism (CDM)

| Item | Value | Source |
|---|---|---|
| Lineage | "based on the Androgynous Peripheral Attach System (APAS)", "APAS-89/95 developed by Russia and NASA"; first used by Shenzhou 8 / Tiangong-1 | [WP-SZ]; [RDS] |
| Variants | androgynous 310 kg, non-androgynous 200 kg | [WP-CDM] |
| Transfer passage diameter | 800 mm | [WP-CDM] |
| Latches / separation | 12 latches (seal), 12 locking pins after the ring retracts, 4 separation springs | [WP-CDM] |
| Capture sequence | Ring deployed ahead of the active craft makes first contact; Soft Capture System stabilises, then Hard Capture System completes the structural connection | [WP-CDM] |
| Contact speed (Shenzhou 8 / Tiangong-1, 2011) | "The docking ring made contact at a speed of 0.2 metres per second" | [WP-CDM] |
| Outer ring diameter, guide petal count and size | NOT FOUND | |
| Shenzhou-12 soft capture vs hard lock times | NOT FOUND (no source opened separates them; docking completion 07:54 UTC only, [PD-0617]) | |
| Closing speed of Shenzhou-12 at contact | NOT FOUND (0.2 m/s above is the 2011 Shenzhou 8 value, not Shenzhou-12) | |

## 3. Tianhe overall shape

| Item | Value | Source |
|---|---|---|
| Length | 16.6 m | [PD-0429] "total length of 16.6 meters"; [EUREKA] "total axial length of 16.6 m"; [WP-TH] |
| Max diameter | 4.2 m | [PD-0429]; [EUREKA]; [WP-TH] |
| Mass | 22.5 t at launch ([PD-0429]); on-orbit 22,500 kg, pressurised volume 113 m3, habitable 51 m3 ([WP-TH]) | |
| Conflict | A search summary quoted "axial length of 17.9 m"; the opened [EUREKA] page of the same text says 16.6 m. Treat 17.9 as unverified, 16.6 as confirmed | |
| Small-diameter section (resource-cabin end) dimensions | NOT FOUND (no source opened gives diameters per section; [WP-TH] says so explicitly) | |
| Solar wings, count | Two ("two steerable solar power arrays", [RDS], [WP-TH]); the 2022 CGTN piece mentions "each wing" without a count | |
| Wing area | 67 m2 each (flexible wings, first used on Tianhe); Wentian's wing is two times larger | [CGTN-SOL] |
| Wing span | [RDS] says "a total span of 60 m, with three panels on each wing" (secondary; I could not corroborate it with a primary source and it is not self-evidently consistent with 67 m2 per wing, so do not model from it without a check). Primary span: NOT FOUND | [RDS] |
| Deployed on 17 Jun 2021 | Indirect only: CASC says "Large-scale flexible solar cell wings have been providing energy for the core module and its complex", generation "approaching 10-kilowatt" (the page date is not shown in what I read, so whether this was written before 17 Jun is unverified). Explicit statement for 17 Jun: NOT FOUND | [SC] |

## 4. Shenzhou

| Item | Value | Source |
|---|---|---|
| Total length | 9.25 m (the "about 9 m" is confirmed as 9.25 m) | [WP-SZ] |
| Max diameter | 2.8 m | [WP-SZ] |
| Solar array span | 17 m (service module) | [WP-SZ] |
| Orbital module body | 2.8 m long, 2.25 m diameter (its own 10.4 m wings were removed from Shenzhou 7 onward; not on Shenzhou-12) | [WP-SZ] |
| Re-entry module | length 2.94 m, base diameter 2.5 m, max 2.8 m; service module 2.94 m long (these two are the same figures in the search summary and I could not tell which line belongs to which module; re-entry-module length is commonly lower, so check before modelling) | (search summary only) |
| Forward mechanism | Since Shenzhou 8 every orbital module carries rendezvous equipment and the CDM (active, ring at the front end) | [WP-SZ] |
| Primary source (CMSA / CAST) for any of the above | NOT FOUND | |

## 5. Approach of Shenzhou-12, 17 Jun 2021

| Item | Value | Source |
|---|---|---|
| Launch | 9:22 am Beijing = 01:22 UTC (mine), Jiuquan | [PD-0617] |
| Docking | "fast autonomous rendezvous and docking with the front docking port of Tianhe at 3:54 p.m. (Beijing Time)" = 07:54 UTC (mine); "approximately 6.5 hours"; 6 h 32 min (mine); three-module complex with Tianzhou-2 | [PD-0617] |
| Geometry | "the Shenzhou-12 has to first go to the front, take a U-turn and then dock on the front of the space station", unlike earlier craft that "docked directly from the back" (the second clause is from a search summary of the same CGTN piece) | [CGTN-0618] |
| Parking point | "the parking point 200 meters away from the space station's core module, ready for docking after entering the orbit for around six hours" (= about 6 h after launch, so docking about 0.5 h after leaving the point is an inference, not stated) | [CGTN-0618] |
| 200 m rule | "For front and rear dockings, there is a 200-meter holding point for the craft, enabling them to maintain a stable attitude in orbit even when engines are not working" | [CGTN-1028] |
| Previous rendezvous duration | 48 h; fast method "about one eighth" | [CGTN-0618] |
| Other hold points (5 km, 400 m, 120 m, 19 m before docking) | NOT FOUND for the 17 Jun approach. 19 m and 200 m appear only for the 16 Sep 2021 radial rendezvous test (search summary only of the Wikipedia Shenzhou 12 article; the page I opened says nothing on hold points) | |
| Closing speed at contact | NOT FOUND | |
| U-turn geometry details (where the craft passes, distance ahead, direction) | NOT FOUND | |
| Orbit-adjustment burn count and times | NOT FOUND | |
| Hatch open | 6:48 pm Beijing = 10:48 UTC (mine); [WP] 10:48 UTC | (see timelines doc section 3) |

## Conflicts

- Tianhe length: 16.6 m ([PD-0429], [EUREKA], [WP-TH]) against 17.9 m (search summary only). Use 16.6 m.
- Port count: 3 hatches at the module ([EUREKA], counting forward, backward, radial) against 4 hub ports + aft ([RDS], [WP-TH]). Both can hold if EUREKA counts one radial hatch group; the difference is unresolved.
- Wing span: 60 m ([RDS], secondary) with 67 m2 per wing ([CGTN-SOL]) not cross-checked.

## Not covered

- Node cabin sphere diameter, hatch/port diameters, positions of the nadir/port/starboard ports on the sphere, and where the sphere sits relative to the 4.2 m cylinder.
- Dimensions of the small-diameter (resource) section, the module's tapered transitions, antennas, the robotic arm's stowed position, and external equipment.
- Solar wing span and panel count from a primary source, and whether the wings were fully deployed and their orientation on 17 Jun 2021.
- CDM outer ring diameter, guide petals, capture ring geometry, and the timed soft capture / hard dock sequence for Shenzhou-12.
- Shenzhou per-module dimensions from a primary source, the orbital module's forward-end geometry, and the re-entry/service module lengths.
- Rendezvous hold points other than 200 m, burn times, closing speed, and U-turn path (no CMSA/CASC technical briefing was reached).
- Whether any craft other than Tianzhou-2 was at the station on 17 Jun 2021 (no source says; assumed none).
