# Content 7 — Viking 2, IM-1, Chang'e 2, Mars 2, MRO, Mariner 2, Shenzhou 5 (brief; nothing authored yet)

Written 2026-11-15 on `tech-debt/0.9.9`. Ranks 2, 4, 5, 6, 8, 9, 10 of the operator-approved top-10 (`2026-11-14-slice-H-brief.md` section 6). Web search is exhausted (400/400), so facts come only from primary pages fetched directly.

## Status: stopped at the sourcing gate

The brief below is the plan. No mission JSON, overlay, fleet record or image has been written. Reason: the rule "anything not read in a fetched primary page stays out of the text" leaves four of the seven with almost no usable facts, and the fetch tool could not reach the agency pages that would carry them. What each fetch returned is listed per mission, so the next step (a wider source allowance, or a fresh search budget) is a decision, not a rediscovery.

## Per mission

| Mission | Fleet records | Programs to link | Site | Flight block | Facts read in a primary page |
|---|---|---|---|---|---|
| Viking 2 (`viking2`, MARS, 1975) | `viking2-lander` exists (skeleton); `viking1-orbiter` exists; no `viking-2` spacecraft entry (Viking 1 has `viking-1`), so the mission needs a decision: reuse `viking2-lander` only, or author `viking-2` per the fleet runbook | `viking` (roster names Viking 2 only by name), `mars` | `mars-sites` `viking2-lander` exists | Feasible: copy the Viking 1 shape (`tier_1_5_hybrid`, `type1_lambert`, EDL parachute_retro) after measuring the generator path | below |
| IM-1 (`im-1`, MOON, 2024) | `im-1-odysseus` exists (skeleton, `first_flight` 2024-02-22 is the landing date, not launch) | CLPS / Artemis-adjacent rosters: check `programs` for a CLPS row before linking | Moon site: none read yet | Feasible only after the launch date, vehicle and landing date are read; no flight data read | nothing readable |
| Chang'e 2 (`change2`, MOON, 2010) | `change-2` exists (skeleton, orbiter) | `change` (5 missions listed without it) | `moon-sites` `change2` exists | Needs the lunar orbit insertion timeline and the L2 / Toutatis legs; not feasible from what was read | nothing readable |
| Mars 2 (`mars2`, MARS, 1971) | `mars-2` (lander, FAILED) and `mars2-orbiter` exist (skeletons); `mars-2` `first_flight` 1971-11-27 is the arrival date, not launch | `mars` / Soviet program row paired with `mars3` | `mars-sites` `mars2` exists | Copy `mars3.json` shape; `sparse` quality | launch only |
| Mars Reconnaissance Orbiter (`mro`, MARS, 2005) | `mro` exists (skeleton, ACTIVE) | `mars` | `mars-sites` `mro` exists | Feasible: tier_1_5_hybrid Earth-Mars Lambert plus MOI; aerobraking is not a path | below |
| Mariner 2 (`mariner2`, VENUS, 1962) | needs a new fleet record `mariner-2` (spacecraft); author per the fleet runbook, never a stub; the launcher `atlas-agena-b` does not exist in fleet (`atlas-lv-3b`, `atlas-slv-3d` do), so a launcher decision is also open | `mariner` (3 missions today) | none (Venus flyby) | Feasible: Venus flyby, Earth-Venus Lambert, 109 days | below |
| Shenzhou 5 (`shenzhou-5`, EARTH, 2003) | `shenzhou`, `long-march-2f`, `jiuquan-slc-43` exist | `shenzhou`, `tiangong` (1 mission each) | none | Earth-orbit descriptor needed, none read | nothing readable |

### Facts read, with source

Viking 2 (NASA NSSDCA `nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1975-083A`; NASA `science.nasa.gov/mission/viking-2/`):

- launched 1975-09-09, 18:39:00 UT, Titan IIIE-Centaur, Cape Canaveral;
- Mars orbit insertion 1976-08-07 into a 1500 x 33,000 km, 24.6 hour orbit;
- lander touchdown 1976-09-03 at 22:37:50 UT, Utopia Planitia, 47.968 N, 225.71 W, about 6,460 km from the Viking 1 lander;
- orbiter ended 1978-07-24 (NSSDCA says 25 July 1978; NASA says July 24; the text must pick one and say so), orbiter returned almost 16,000 images in 706 orbits; lander ended 1980-04-12;
- biology experiments "inconclusive"; the two orbiters together 52,663 images, about 97% of Mars mapped, the landers 4,500 photos.

Mariner 2 (NSSDCA `id=1962-041A`; NASA `science.nasa.gov/mission/mariner-2/`):

- launched 1962-08-27, 06:53:14 UT, Atlas-Agena B, Cape Canaveral; mass 202.8 kg;
- closest approach to Venus 1962-12-14, 19:59:28 UT; range 34,773 km (NSSDCA) or 34,854 km (NASA page): the two pages disagree, so the text says "about 35,000 km";
- last contact 1963-01-03, 07:00 UT; instruments: magnetometer, particle detectors, cosmic ray detector, cosmic dust detector, solar plasma spectrometer, microwave and infrared radiometers;
- findings: slow retrograde rotation, hot surface, mostly carbon dioxide, continuous cloud, top about 60 km (NSSDCA); 216 C dark side to 237 C day side, cloud layer 56 to 80 km, no significant magnetic field (NASA); solar wind streams continuously;
- NASA: "the very first successful planetary science mission in history".

Mars Reconnaissance Orbiter (NSSDCA `id=2005-029A`; NASA `science.nasa.gov/mission/mars-reconnaissance-orbiter/`):

- launched 2005-08-12, 11:43 UT, Atlas V 401, Cape Canaveral; arrived 2006-03-10 (1641 s burn into a 400 x 35,000 km capture orbit); aerobraking about six months to a 255 x 320 km sun-synchronous science orbit; science began after solar conjunction, November 2006;
- operational mass 1031 kg (2180 kg fuelled); instruments HiRISE, CRISM, MCS, SHARAD, CTX, MARCI;
- NASA: HiRISE can "spot something as small as a dinner table"; relay role "the first link in a communications bridge back to Earth"; still operating.

Mars 2: only the launch date, 1971-05-19, from `nssdc.gsfc.nasa.gov/planetary/chronology_mars.html` ("Mars Orbiter / Attempted Lander", lander "failed to successfully land"). The master catalog page for Mars 2 returned an error for ids `1971-045A` and `1971-045D` (three tries).

### What the fetch tool returned for the rest

- IM-1: the NASA CLPS page (`nasa.gov/missions/artemis/clps/intuitive-machines/`) read only the pre-launch description (Nova-C, six NASA payloads, planned for 2024); four guessed NASA article URLs and the Intuitive Machines site gave 404 or a redirect loop; the NSSDCA page errored.
- Chang'e 2: NSSDCA errored (SQL error) on `2010-050A` and `2010-050B`; the CNSA English home page had no Chang'e 2 content.
- Shenzhou 5: NSSDCA errored on `2003-045A`; `en.cmse.gov.cn` home and missions pages list only 2024 to 2026 flights, no Shenzhou 5 page found.

## Outcomes

- Mars 2: follow the Chandrayaan-2 precedent (`status` as flown, index `outcome: "failure"`), because the lander was lost and the orbiter worked, the same split. The slice H brief names the Chandrayaan-2 outcome as fork H-1 (section 1, item 3) and the shipped Chandrayaan-2 record is the precedent; the runbook text for `outcome` ("did not reach its primary objective ... Chandrayaan-2 is ACTIVE with `outcome: failure`") says the same. I did not read the operator's H-1 answer itself, only the shipped result.
- IM-1: no `outcome` field: it landed on its side and operated. The text must say so plainly.

## Decisions for the operator

1. Source allowance. For Chang'e 2, Shenzhou 5, Mars 2 and IM-1 the reachable primary pages gave no facts. Options: allow Wikipedia or news pages as facts sources for the plain figures (dates, vehicle, altitudes) with a "secondary" row in the backlog; or wait for a search budget; or author the three well-sourced ones now (Viking 2, MRO, Mariner 2) and hold the other four.
2. Mariner 2 needs two fleet records (`mariner-2`, and a launcher entry for Atlas-Agena B, or a reuse of `atlas-lv-3b` only if honest). Say which.
3. Viking 2: reuse `viking2-lander` or author a `viking-2` spacecraft entry like `viking-1`.

## Image candidates

None staged. The staging step needs the same fetch access (agency pages with image licences); NASA and JPL public-domain pages for Viking 2, MRO and Mariner 2 are the first targets once authoring starts.
