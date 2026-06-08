#!/usr/bin/env node
/**
 * Build mission JSON + en-US overlay for the 8 Apollo missions not yet
 * present in /missions:
 *   - lunar: 8, 10, 12, 14, 15, 16 → dest:MOON
 *   - LEO shakedown: 7, 9 → dest:EARTH (added in this same slice
 *     alongside the EARTH dest enum / TS / pill / fly-view changes;
 *     Marko's call: "we could and should add destination EARTH").
 *
 * Each generated record:
 *   - base mission JSON in static/data/missions/moon/<id>.json
 *   - en-US overlay in static/data/i18n/en-US/missions/moon/<id>.json
 *   - reciprocal entry insertion into static/data/missions/index.json
 *
 * Cislunar_profile waypoints are deliberately omitted — /fly falls back
 * to its parametric translunar mode for these missions. Hand-tuned
 * waypoint sets are an ADR-058 follow-up.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MISSIONS_ROOT = join(ROOT, 'static', 'data', 'missions');
const I18N_ROOT = join(ROOT, 'static', 'data', 'i18n');

const NASA_COLOR = '#0B3D91';
const NASA_FULL = 'National Aeronautics and Space Administration / Manned Spacecraft Center';

// All six missions launched from LC-39A on Saturn V and landed on Moon.
// Departure / arrival / TEI / splashdown dates from NASA mission reports.
// Vehicle stack mass approximates "translunar mass" at TLI (CSM + LM + S-IVB residuals).
const MISSIONS = [
  {
    id: 'apollo7',
    dest: 'EARTH',
    year: 1968,
    departure_date: '1968-10-11',
    arrival_date: '1968-10-11',
    transit_days: 0,
    vehicle: 'Saturn IB (AS-205)',
    csm: 'Apollo 7 CSM (CSM-101)',
    lm: null,
    mass_kg: 14781,
    landing_site: null,
    landing_site_name: null,
    landing_date: null,
    departure_lunar_date: null,
    splashdown_date: '1968-10-22',
    splashdown_zone: 'North Atlantic Ocean',
    headline: 'First crewed Apollo flight — Earth-orbit CSM shakedown',
    crew: 'Walter Schirra (CDR), Donn Eisele (CMP), Walter Cunningham (LMP)',
    description:
      "The first crewed Apollo flight, 21 months after the Apollo 1 fire (1967-01-27) killed Grissom, White and Chaffee on the pad. Apollo 7 verified the redesigned Block II Command and Service Module in Earth orbit — life support, power, propulsion (SPS fired eight times), thermal control, and the world's first live TV broadcast from a crewed US spacecraft. Schirra (head cold + irritable throughout) overruled Houston on a re-entry helmet question, contributing to Mission Control's decision that none of the three crewmembers would fly again. The 10 day 20 hour flight cleared the way for Apollo 8's lunar-orbit gamble two months later.",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn IB (AS-205) from Cape Kennedy LC-34 1968-10-11 15:02 UTC.',
        type: 'nominal',
      },
      {
        met: 0.1,
        label: 'ORBIT INSERT',
        note: 'CSM separates from S-IVB into 232 × 285 km Earth orbit, inclination 31.6°. SPS firing sequence (8 burns over 11 days) validates the propulsion that will perform LOI + TEI at the Moon.',
        type: 'nominal',
      },
      {
        met: 1.2,
        label: 'FIRST LIVE TV',
        note: '"Hello from the lovely Apollo room high atop everything." First live TV broadcast from a crewed US spacecraft.',
        type: 'info',
      },
      {
        met: 10.8,
        label: 'SPLASHDOWN',
        note: 'CM splashed down in the North Atlantic 1968-10-22 11:11 UTC after 163 orbits / 7.4 million km / 10 d 20 h. Recovery by USS Essex.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Apollo 7 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_7', t: 'intro' },
      {
        l: 'Apollo 7 mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-7/',
        t: 'intro',
      },
    ],
  },
  {
    id: 'apollo9',
    dest: 'EARTH',
    year: 1969,
    departure_date: '1969-03-03',
    arrival_date: '1969-03-03',
    transit_days: 0,
    vehicle: 'Saturn V (AS-504)',
    csm: 'CSM Gumdrop (CSM-104)',
    lm: 'LM Spider (LM-3)',
    mass_kg: 42400,
    landing_site: null,
    landing_site_name: null,
    landing_date: null,
    departure_lunar_date: null,
    splashdown_date: '1969-03-13',
    splashdown_zone: 'North Atlantic Ocean',
    headline: 'First crewed LM flight — Earth-orbit LM separation + rendezvous tests',
    crew: 'James McDivitt (CDR), David Scott (CMP), Russell "Rusty" Schweickart (LMP)',
    description:
      'The first crewed flight of the Lunar Module. In Earth orbit, McDivitt and Schweickart undocked LM Spider from CSM Gumdrop, flew up to 183 km away over six hours, then rendezvous and re-docked — every step of the lunar-rendezvous procedure tested without the option of bringing the crew home in the CSM if anything went wrong. Schweickart did a 38-minute EVA on the LM porch, demonstrating the Apollo EVA spacesuit + PLSS backpack design that the Moonwalking crews would use. Scott did a stand-up EVA from the CSM hatch. With LM hardware and rendezvous procedures verified, NASA was clear to send Apollo 10 to the Moon two months later.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn V (AS-504) from Kennedy Space Center LC-39A 1969-03-03 16:00 UTC — third Saturn V flight, first crewed launch carrying LM.',
        type: 'nominal',
      },
      {
        met: 0.13,
        label: 'CSM-LM EXTRACTION',
        note: 'CSM Gumdrop turns around + docks with LM Spider in the SLA adapter — first crewed transposition + docking. All Apollo lunar missions repeat this maneuver.',
        type: 'nominal',
      },
      {
        met: 4.2,
        label: 'LM SEPARATION',
        note: "McDivitt + Schweickart undock Spider, fly up to 183 km from Gumdrop over six hours. First crewed flight where the spacecraft + crew aren't both attached to a re-entry vehicle.",
        type: 'info',
      },
      {
        met: 4.5,
        label: 'EVA',
        note: 'Schweickart does 38-min EVA on LM porch. Scott stand-up EVA from CSM hatch. First validation of Apollo PLSS backpack.',
        type: 'info',
      },
      {
        met: 4.5,
        label: 'RENDEZVOUS + REDOCK',
        note: 'Spider rendezvous + redocks with Gumdrop, completing the lunar-procedure dress rehearsal in Earth orbit.',
        type: 'nominal',
      },
      {
        met: 5.0,
        label: 'LM JETTISON',
        note: 'Spider ascent stage jettisoned to deorbit; descent stage remained in orbit and decayed 1981.',
        type: 'nominal',
      },
      {
        met: 10.04,
        label: 'SPLASHDOWN',
        note: 'CM splashed down in North Atlantic 1969-03-13 17:00 UTC after 151 orbits. Recovery by USS Guadalcanal.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Apollo 9 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_9', t: 'intro' },
      {
        l: 'Apollo 9 mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-9/',
        t: 'intro',
      },
    ],
  },
  {
    id: 'apollo8',
    year: 1968,
    departure_date: '1968-12-21',
    arrival_date: '1968-12-24',
    transit_days: 3,
    vehicle: 'Saturn V (AS-503)',
    csm: 'Apollo 8 CSM (CSM-103)',
    lm: null, // No LM — LM-3 wasn't ready, flew empty mass-simulator slot
    mass_kg: 28833,
    landing_site: null,
    landing_site_name: null,
    landing_date: null,
    departure_lunar_date: '1968-12-25',
    splashdown_date: '1968-12-27',
    splashdown_zone: 'North Pacific Ocean',
    headline: 'First humans to leave low Earth orbit + orbit the Moon',
    crew: 'Frank Borman (CDR), James Lovell (CMP), William Anders (LMP)',
    description:
      'The first crewed mission to leave low Earth orbit, the first to escape Earth gravity, and the first to orbit the Moon. Launched 1968-12-21 on the first crewed flight of the Saturn V (AS-503), Apollo 8 entered lunar orbit on Christmas Eve 1968. Anders\' "Earthrise" photograph during the fourth orbit became one of the most influential images in history. The crew read from Genesis on live television to ~1 billion viewers — the largest TV audience to that date. 10 orbits later they fired the SPS engine for TEI on the far side of the Moon, returning to Pacific splashdown 1968-12-27. NASA had decided in August 1968 to swap Apollo 8\'s payload from a high-Earth-orbit LM test to a lunar-orbit CSM-only mission after CIA intelligence suggested the USSR might attempt a circumlunar flight first.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn V (AS-503) from Kennedy Space Center LC-39A 1968-12-21 12:51 UTC — first crewed Saturn V flight.',
        type: 'nominal',
      },
      {
        met: 0.12,
        label: 'TLI',
        note: 'Trans-lunar injection burn — first crewed escape of Earth gravity. S-IVB ∆v ~3.05 km/s.',
        type: 'nominal',
      },
      {
        met: 2.79,
        label: 'LOI',
        note: 'Lunar orbit insertion behind the Moon, out of radio contact. SPS burn ~0.91 km/s. First humans to orbit another body.',
        type: 'nominal',
      },
      {
        met: 3.16,
        label: 'EARTHRISE',
        note: 'Anders photographs Earth rising over the lunar horizon during the fourth orbit (1968-12-24, AS08-14-2383).',
        type: 'info',
      },
      {
        met: 3.5,
        label: 'GENESIS READING',
        note: 'Crew reads from Genesis on live TV to ~1 billion viewers — largest live TV audience to that date.',
        type: 'info',
      },
      {
        met: 3.96,
        label: 'TEI',
        note: 'Trans-Earth injection behind the Moon (1968-12-25 06:10 UTC). SPS ∆v ~1.07 km/s.',
        type: 'nominal',
      },
      {
        met: 6.13,
        label: 'SPLASHDOWN',
        note: 'CM splashed down in North Pacific 1968-12-27. Recovery by USS Yorktown.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Apollo 8 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_8', t: 'intro' },
      {
        l: 'Apollo 8 mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-8/',
        t: 'intro',
      },
      { l: 'Earthrise — Wikipedia', u: 'https://en.wikipedia.org/wiki/Earthrise', t: 'core' },
    ],
  },
  {
    id: 'apollo10',
    year: 1969,
    departure_date: '1969-05-18',
    arrival_date: '1969-05-21',
    transit_days: 3,
    vehicle: 'Saturn V (AS-505)',
    csm: 'CSM Charlie Brown (CSM-106)',
    lm: 'LM Snoopy (LM-4)',
    mass_kg: 42775,
    landing_site: null,
    landing_site_name: null,
    landing_date: null,
    departure_lunar_date: '1969-05-24',
    splashdown_date: '1969-05-26',
    splashdown_zone: 'South Pacific Ocean',
    headline: 'Full lunar-landing dress rehearsal — LM descended to ~15.6 km altitude',
    crew: 'Thomas Stafford (CDR), John Young (CMP), Eugene Cernan (LMP)',
    description:
      "The full dress rehearsal for the first lunar landing. Stafford and Cernan flew LM Snoopy down to ~15.6 km altitude above the planned Apollo 11 landing site at Mare Tranquillitatis — every step of a landing approach except the actual landing itself. They confirmed the descent profile, the landing radar, the ascent trajectory, and the rendezvous procedure that Apollo 11 would use two months later. The LM's ascent-stage propellant tanks were deliberately underfueled (~50 % of nominal) to prevent any temptation to attempt a landing. Snoopy's ascent stage was the only one to leave lunar orbit with positive ∆v — jettisoned into a heliocentric orbit where it remains today, intermittently re-detected by amateur astronomers (most recently confirmed by Nick Howes / Faulkes Telescope, 2019).",
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn V (AS-505) from Kennedy Space Center LC-39B 1969-05-18 16:49 UTC — first crewed launch from LC-39B.',
        type: 'nominal',
      },
      {
        met: 0.12,
        label: 'TLI',
        note: 'Trans-lunar injection. S-IVB ∆v ~3.05 km/s.',
        type: 'nominal',
      },
      {
        met: 3.16,
        label: 'LOI',
        note: 'Lunar orbit insertion. SPS ∆v ~0.91 km/s.',
        type: 'nominal',
      },
      {
        met: 4.6,
        label: 'LM SEPARATION',
        note: 'Snoopy undocks from Charlie Brown. Crew of two (Stafford + Cernan) descend toward Mare Tranquillitatis.',
        type: 'nominal',
      },
      {
        met: 4.66,
        label: 'CLOSEST APPROACH',
        note: 'Snoopy reaches ~15.6 km above Apollo 11 target site — no landing; everything verified except touchdown itself.',
        type: 'info',
      },
      {
        met: 4.76,
        label: 'ASCENT + RENDEZVOUS',
        note: 'Snoopy ascent stage rendezvous with Charlie Brown — first complete LM-to-CSM redocking in lunar orbit.',
        type: 'nominal',
      },
      {
        met: 5.96,
        label: 'TEI',
        note: 'Trans-Earth injection. SPS ∆v ~1.0 km/s.',
        type: 'nominal',
      },
      {
        met: 8.05,
        label: 'SPLASHDOWN',
        note: 'CM splashed down in South Pacific 1969-05-26 16:52 UTC. Recovery by USS Princeton.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Apollo 10 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_10', t: 'intro' },
      {
        l: 'Apollo 10 mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-10/',
        t: 'intro',
      },
      {
        l: 'Snoopy ascent stage in heliocentric orbit — search effort',
        u: 'https://en.wikipedia.org/wiki/Apollo_10#Snoopy',
        t: 'core',
      },
    ],
  },
  {
    id: 'apollo12',
    year: 1969,
    departure_date: '1969-11-14',
    arrival_date: '1969-11-19',
    transit_days: 4,
    vehicle: 'Saturn V (AS-507)',
    csm: 'CSM Yankee Clipper (CSM-108)',
    lm: 'LM Intrepid (LM-6)',
    mass_kg: 46782,
    landing_site: 'Oceanus Procellarum (Surveyor 3 site)',
    landing_site_name: 'Statio Cognitum — within 163 m of Surveyor 3',
    landing_date: '1969-11-19',
    departure_lunar_date: '1969-11-20',
    splashdown_date: '1969-11-24',
    splashdown_zone: 'South Pacific Ocean',
    headline: 'Second crewed Moon landing — pinpoint touchdown 163 m from Surveyor 3',
    crew: 'Charles "Pete" Conrad (CDR), Alan Bean (LMP), Richard Gordon (CMP)',
    description:
      'The second crewed Moon landing. Saturn V was struck by lightning twice during ascent (T+36 s and T+52 s) — Bean restored the spacecraft via the famous "SCE to AUX" call from EECOM John Aaron, then the crew re-aligned the inertial measurement unit in lunar orbit. Conrad and Bean executed a pinpoint landing on the Ocean of Storms within 163 m of Surveyor 3 (which had soft-landed in April 1967), then walked to Surveyor 3 and removed its camera + sample of its surface — pieces that came home to Earth for analysis of long-term lunar-surface exposure. They deployed ALSEP (the full Apollo Lunar Surface Experiments Package — the first ALSEP, vs Apollo 11\'s simpler EASEP) which transmitted data for 8 years. The mission returned 34 kg of samples including dark mare basalts.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn V (AS-507) from Kennedy Space Center LC-39A 1969-11-14 16:22 UTC. Two lightning strikes on the stack (T+36 s, T+52 s) tripped fuel cells offline; recovered via "SCE to AUX" call.',
        type: 'warning',
      },
      {
        met: 0.12,
        label: 'TLI',
        note: 'Trans-lunar injection — recovery from lightning strikes verified; mission GO for Moon.',
        type: 'nominal',
      },
      {
        met: 3.39,
        label: 'LOI',
        note: 'Lunar orbit insertion. SPS ∆v ~0.89 km/s.',
        type: 'nominal',
      },
      {
        met: 5.43,
        label: 'TOUCHDOWN',
        note: 'Intrepid lands at Oceanus Procellarum (Statio Cognitum) 1969-11-19 06:54 UTC — within 163 m of Surveyor 3 (the most precise lunar landing yet).',
        type: 'nominal',
      },
      {
        met: 5.58,
        label: 'SURVEYOR 3 VISIT',
        note: 'Conrad + Bean walk to Surveyor 3 (~163 m away), remove its TV camera + samples for return to Earth — first time a crew visited a previously-landed robotic spacecraft.',
        type: 'info',
      },
      {
        met: 6.74,
        label: 'ASCENT',
        note: 'Intrepid lifts off after 31 h 31 m on surface. 34 kg of samples returned.',
        type: 'nominal',
      },
      {
        met: 6.93,
        label: 'LM IMPACT',
        note: 'Intrepid ascent stage deliberately crashed onto Moon to calibrate ALSEP seismometers. First man-made lunar impact event.',
        type: 'info',
      },
      {
        met: 7.92,
        label: 'TEI',
        note: 'Trans-Earth injection. SPS ∆v ~1.0 km/s.',
        type: 'nominal',
      },
      {
        met: 10.18,
        label: 'SPLASHDOWN',
        note: 'CM splashed down in South Pacific 1969-11-24 20:58 UTC. Recovery by USS Hornet.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Apollo 12 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_12', t: 'intro' },
      {
        l: 'Apollo 12 mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-12/',
        t: 'intro',
      },
      {
        l: '"SCE to AUX" — John Aaron and the Apollo 12 lightning recovery',
        u: 'https://www.hq.nasa.gov/alsj/a12/a12LightningStrike.html',
        t: 'deep',
      },
    ],
  },
  {
    id: 'apollo14',
    year: 1971,
    departure_date: '1971-01-31',
    arrival_date: '1971-02-05',
    transit_days: 5,
    vehicle: 'Saturn V (AS-509)',
    csm: 'CSM Kitty Hawk (CSM-110)',
    lm: 'LM Antares (LM-8)',
    mass_kg: 46305,
    landing_site: 'Fra Mauro Highlands',
    landing_site_name: 'Fra Mauro Formation (intended Apollo 13 site)',
    landing_date: '1971-02-05',
    departure_lunar_date: '1971-02-06',
    splashdown_date: '1971-02-09',
    splashdown_zone: 'South Pacific Ocean',
    headline: "Third lunar landing — Apollo 13's lost target reached; Shepard's golf shots",
    crew: 'Alan Shepard (CDR), Edgar Mitchell (LMP), Stuart Roosa (CMP)',
    description:
      'The third crewed Moon landing and Alan Shepard\'s second flight — making him both the first American in space (Freedom 7, 1961) and the fifth man on the Moon, at age 47 the oldest Moonwalker. Apollo 14 was the recovery mission after Apollo 13\'s aborted landing, taking over Apollo 13\'s intended Fra Mauro Highlands target. Shepard and Mitchell deployed ALSEP, completed two EVAs totalling 9 h 23 m, and pulled the modular equipment transporter (MET, a rickshaw-style cart — the LRV was still one mission away) toward Cone Crater, though they came up ~30 m short of the rim due to navigation uncertainty in the cratered terrain. In the final minutes of EVA-2, Shepard improvised a six-iron golf-club head onto a sample-collection handle and hit two golf balls "miles and miles and miles" (one was later analysed from imagery at ~24 m and ~37 m). Stuart Roosa carried tree seeds in Kitty Hawk that became the "Moon Trees" planted across the US. 42 kg of samples returned.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn V (AS-509) from Kennedy Space Center LC-39A 1971-01-31 21:03 UTC.',
        type: 'nominal',
      },
      {
        met: 0.12,
        label: 'TLI',
        note: 'Trans-lunar injection. S-IVB ∆v ~3.05 km/s.',
        type: 'nominal',
      },
      {
        met: 0.25,
        label: 'CSM-LM DOCKING',
        note: 'Five docking attempts before Kitty Hawk soft-captured Antares — anomaly in docking latches; root cause never reproduced on ground.',
        type: 'warning',
      },
      {
        met: 3.82,
        label: 'LOI',
        note: 'Lunar orbit insertion. SPS ∆v ~0.88 km/s.',
        type: 'nominal',
      },
      {
        met: 4.6,
        label: 'TOUCHDOWN',
        note: 'Antares lands at Fra Mauro Highlands 1971-02-05 09:18 UTC — within 53 m of target despite an abort-program glitch in the LM computer that the team patched in real-time.',
        type: 'nominal',
      },
      {
        met: 5.0,
        label: 'EVA-1',
        note: 'Shepard + Mitchell deploy ALSEP + first lunar geology traverse on this mission.',
        type: 'info',
      },
      {
        met: 5.4,
        label: 'CONE CRATER + GOLF',
        note: 'EVA-2: traverse toward Cone Crater (came up ~30 m short of rim). Final minutes — Shepard hits two golf balls with an improvised club.',
        type: 'info',
      },
      {
        met: 5.6,
        label: 'ASCENT',
        note: 'Antares lifts off after 33 h 31 m on surface. 42 kg of samples returned.',
        type: 'nominal',
      },
      { met: 6.4, label: 'TEI', note: 'Trans-Earth injection. SPS ∆v ~1.0 km/s.', type: 'nominal' },
      {
        met: 9.0,
        label: 'SPLASHDOWN',
        note: 'CM splashed down in South Pacific 1971-02-09 21:05 UTC. Recovery by USS New Orleans. Last Apollo quarantine.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Apollo 14 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_14', t: 'intro' },
      {
        l: 'Apollo 14 mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-14/',
        t: 'intro',
      },
      {
        l: 'Apollo 14 Lunar Surface Journal (ALSJ)',
        u: 'https://www.hq.nasa.gov/alsj/a14/',
        t: 'deep',
      },
    ],
  },
  {
    id: 'apollo15',
    year: 1971,
    departure_date: '1971-07-26',
    arrival_date: '1971-07-30',
    transit_days: 4,
    vehicle: 'Saturn V (AS-510)',
    csm: 'CSM Endeavour (CSM-112)',
    lm: 'LM Falcon (LM-10)',
    mass_kg: 48599,
    landing_site: 'Hadley-Apennine',
    landing_site_name: 'Hadley Rille, foot of the Apennine Mountains',
    landing_date: '1971-07-30',
    departure_lunar_date: '1971-08-02',
    splashdown_date: '1971-08-07',
    splashdown_zone: 'North Pacific Ocean',
    headline: 'First J-mission — extended stay, first Lunar Roving Vehicle, "Genesis Rock"',
    crew: 'David Scott (CDR), James Irwin (LMP), Alfred Worden (CMP)',
    description:
      'The first "J-mission" — extended-stay scientific Apollo with the new Lunar Roving Vehicle. The LRV gave Scott + Irwin a 27.9 km traverse range (vs the 3.5 km of walking-only Apollo 14), opening the dramatic Hadley-Apennine site at the foot of a 4.5-km mountain range and the edge of the sinuous Hadley Rille. Three EVAs totalling 18 h 35 m, 77 kg of samples returned, including the famous "Genesis Rock" (sample 15415) — a 4.1-billion-year-old anorthosite confirming the magma-ocean origin of the lunar highlands crust. Scott\'s televised "hammer-feather drop" verified Galileo\'s law of gravitation live. Worden in lunar orbit operated a SIM-bay full of remote-sensing instruments (mapping cameras, gamma-ray, X-ray, alpha-particle spectrometers) and performed the first deep-space EVA on the way home (38-minute EVA at ~315000 km from Earth to retrieve the film canisters). Apollo 15\'s recovery was marred by one of three parachutes failing to deploy — CM splashed down hard but crew was safe.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn V (AS-510) from Kennedy Space Center LC-39A 1971-07-26 13:34 UTC.',
        type: 'nominal',
      },
      { met: 0.12, label: 'TLI', note: 'Trans-lunar injection.', type: 'nominal' },
      {
        met: 3.25,
        label: 'LOI',
        note: 'Lunar orbit insertion. SPS ∆v ~0.91 km/s.',
        type: 'nominal',
      },
      {
        met: 4.79,
        label: 'TOUCHDOWN',
        note: 'Falcon lands at Hadley-Apennine 1971-07-30 22:16 UTC — first landing at a non-mare highland site.',
        type: 'nominal',
      },
      {
        met: 5.0,
        label: 'FIRST LRV TRAVERSE',
        note: 'EVA-1: First Lunar Roving Vehicle deployment + 10.3 km traverse to Elbow Crater + the rim of Hadley Rille.',
        type: 'info',
      },
      {
        met: 5.5,
        label: 'GENESIS ROCK',
        note: 'EVA-2: At Spur Crater, Scott + Irwin recover sample 15415 — a 4.1-billion-year-old anorthosite from the original lunar crust.',
        type: 'info',
      },
      {
        met: 6.1,
        label: 'HAMMER-FEATHER DROP',
        note: "EVA-3 / pre-ascent: Scott televises a hammer + feather dropped together; both hit the regolith simultaneously, verifying Galileo's 1589 prediction live.",
        type: 'info',
      },
      {
        met: 6.25,
        label: 'ASCENT',
        note: 'Falcon lifts off after 66 h 55 m on surface. 77 kg samples + first ascent televised from the LRV-mounted camera (operated remotely by Houston).',
        type: 'nominal',
      },
      { met: 8.2, label: 'TEI', note: 'Trans-Earth injection. SPS ∆v ~1.0 km/s.', type: 'nominal' },
      {
        met: 9.5,
        label: 'DEEP-SPACE EVA',
        note: 'Worden performs first-ever EVA in cislunar space (38 min at ~315 000 km from Earth) to retrieve SIM-bay film canisters.',
        type: 'info',
      },
      {
        met: 12.31,
        label: 'SPLASHDOWN',
        note: 'CM splashed down in North Pacific 1971-08-07 20:46 UTC. One of three main parachutes failed to deploy fully; landing hard but safe. Recovery by USS Okinawa.',
        type: 'warning',
      },
    ],
    links: [
      { l: 'Apollo 15 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_15', t: 'intro' },
      {
        l: 'Apollo 15 mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-15/',
        t: 'intro',
      },
      {
        l: 'Genesis Rock (sample 15415) — Smithsonian NMNH',
        u: 'https://airandspace.si.edu/multimedia-gallery/9311hjpg',
        t: 'core',
      },
      {
        l: 'Apollo 15 Lunar Surface Journal (ALSJ)',
        u: 'https://www.hq.nasa.gov/alsj/a15/',
        t: 'deep',
      },
    ],
  },
  {
    id: 'apollo16',
    year: 1972,
    departure_date: '1972-04-16',
    arrival_date: '1972-04-19',
    transit_days: 3,
    vehicle: 'Saturn V (AS-511)',
    csm: 'CSM Casper (CSM-113)',
    lm: 'LM Orion (LM-11)',
    mass_kg: 48599,
    landing_site: 'Descartes Highlands',
    landing_site_name: 'Cayley Plains, Descartes Highlands',
    landing_date: '1972-04-21',
    departure_lunar_date: '1972-04-24',
    splashdown_date: '1972-04-27',
    splashdown_zone: 'Central Pacific Ocean',
    headline:
      'First Moon landing in the lunar highlands — Descartes; John Young\'s "lunar Grand Prix"',
    crew: 'John Young (CDR), Charles Duke (LMP), Thomas "Ken" Mattingly (CMP)',
    description:
      'The fifth crewed Moon landing and the first to a non-mare highland site. Geologists had expected Descartes to be volcanic; Apollo 16 disproved this — every rock returned was breccia (impact-shattered debris), reshaping understanding of the lunar highlands as products of catastrophic impacts rather than ancient volcanism. Young and Duke completed three LRV-supported EVAs totalling 20 h 14 m, traversed 26.7 km, and returned 95.7 kg of samples (the heaviest Apollo haul to that date). Young\'s "lunar Grand Prix" — a televised speed test of the LRV — peaked at ~17 km/h. Duke\'s 11-second hop attempt during a long-jump record attempt put him at risk of damaging his PLSS backpack and was called off. Charlie Duke\'s family photo + the "Far-UV Camera/Spectrograph" — the first astronomical observatory operated from the surface of another world — both ended up at the landing site. Mattingly, originally on Apollo 13 (replaced before launch over German measles concerns), finally got to fly to the Moon.',
    events: [
      {
        met: 0,
        label: 'LAUNCH',
        note: 'Saturn V (AS-511) from Kennedy Space Center LC-39A 1972-04-16 17:54 UTC.',
        type: 'nominal',
      },
      { met: 0.12, label: 'TLI', note: 'Trans-lunar injection.', type: 'nominal' },
      {
        met: 3.3,
        label: 'LOI',
        note: 'Lunar orbit insertion. SPS ∆v ~0.91 km/s.',
        type: 'nominal',
      },
      {
        met: 4.79,
        label: 'SPS ANOMALY',
        note: 'Pre-descent: a backup SPS gimbal oscillation forced a 6-hour landing-vs-abort engineering review in real time. Landing ultimately approved.',
        type: 'warning',
      },
      {
        met: 5.04,
        label: 'TOUCHDOWN',
        note: 'Orion lands at Descartes Highlands 1972-04-21 02:23 UTC — first highland (non-mare) landing.',
        type: 'nominal',
      },
      {
        met: 5.5,
        label: 'FIRST HIGHLANDS EVA',
        note: 'EVA-1: ALSEP deployment + LRV deployment + first scientific traverse of the lunar highlands.',
        type: 'info',
      },
      {
        met: 6.1,
        label: 'LUNAR GRAND PRIX',
        note: 'EVA-2: Young\'s televised LRV speed test ("lunar Grand Prix") — peak speed ~17 km/h. Geology traverse up Stone Mountain.',
        type: 'info',
      },
      {
        met: 6.7,
        label: 'FAR-UV CAMERA',
        note: 'EVA-3: First astronomical observatory deployed on the surface of another world (NRL UV camera-spectrograph).',
        type: 'info',
      },
      {
        met: 7.81,
        label: 'ASCENT',
        note: 'Orion lifts off after 71 h 02 m on surface. 95.7 kg samples returned — heaviest Apollo haul to that date.',
        type: 'nominal',
      },
      { met: 8.5, label: 'TEI', note: 'Trans-Earth injection. SPS ∆v ~1.0 km/s.', type: 'nominal' },
      {
        met: 11.07,
        label: 'SPLASHDOWN',
        note: 'CM splashed down in Central Pacific 1972-04-27 19:45 UTC. Recovery by USS Ticonderoga.',
        type: 'nominal',
      },
    ],
    links: [
      { l: 'Apollo 16 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Apollo_16', t: 'intro' },
      {
        l: 'Apollo 16 mission overview (NASA)',
        u: 'https://www.nasa.gov/mission/apollo-16/',
        t: 'intro',
      },
      {
        l: 'Apollo 16 Lunar Surface Journal (ALSJ)',
        u: 'https://www.hq.nasa.gov/alsj/a16/',
        t: 'deep',
      },
    ],
  },
];

function fleetRefs(m) {
  // Apollo 7 flew on Saturn IB from LC-34 (Cape Kennedy, decommissioned
  // 1969 — not yet in fleet, so omit the launch-site ref for apollo7;
  // backfill LC-34 in a later slice).
  // Apollo 10 launched from LC-39B (first crewed launch from there).
  // Every other Apollo lunar mission launched from LC-39A.
  const launcher = m.id === 'apollo7' ? 'saturn-ib' : 'saturn-v';
  const refs = [
    { id: launcher, role: 'launcher' },
    { id: 'apollo-csm-block-ii', role: 'spacecraft' },
  ];
  if (m.lm) refs.push({ id: 'apollo-lm', role: 'spacecraft' });
  if (['apollo15', 'apollo16'].includes(m.id)) refs.push({ id: 'lrv-apollo', role: 'payload' });
  if (m.id !== 'apollo7') {
    const site = m.id === 'apollo10' ? 'lc-39b' : 'lc-39a';
    refs.push({ id: site, role: 'launch-site' });
  }
  return refs;
}

function buildBase(m) {
  const dest = m.dest || 'MOON';
  // ∆v summary: Earth-orbit Apollo 7/9 burned ~9.5 km/s to LEO + a few
  // hundred m/s of SPS / RCS for orbital maneuvers — no LOI/TEI.
  const deltaV = dest === 'EARTH' ? '~9.5 km/s (to LEO)' : '~6 km/s (round trip)';
  const out = {
    id: m.id,
    agency: 'NASA',
    agency_full: NASA_FULL,
    sector: 'gov',
    dest,
    color: NASA_COLOR,
    year: m.year,
    status: 'FLOWN',
    departure_date: m.departure_date,
    arrival_date: m.arrival_date,
    transit_days: m.transit_days,
    vehicle: m.vehicle,
    payload: m.lm
      ? `${m.mass_kg} kg launched (${m.csm} + ${m.lm})`
      : `${m.mass_kg} kg launched (${m.csm}, no LM)`,
    delta_v: deltaV,
    data_quality: 'good',
    credit: `© NASA — Apollo ${m.id.replace('apollo', '')} mission report. Public domain. ${m.headline}.`,
    links: m.links,
    flight_data_quality: 'reconstructed',
    fleet_refs: fleetRefs(m),
  };
  return out;
}

function buildOverlay(m) {
  const num = m.id.replace('apollo', '');
  // CREWED LANDER if it touched down; CREWED ORBITER for lunar-orbit-only
  // missions (8, 10); CREWED EARTH-ORBIT for the LEO shakedowns (7, 9).
  const type = m.landing_site
    ? 'CREWED LANDER · FLOWN'
    : m.dest === 'EARTH'
      ? 'CREWED EARTH-ORBIT · FLOWN'
      : 'CREWED ORBITER · FLOWN';
  return {
    name: `Apollo ${num}`,
    type,
    first: m.headline,
    description: m.description,
    events: m.events,
  };
}

async function main() {
  const indexPath = join(MISSIONS_ROOT, 'index.json');
  const indexRaw = JSON.parse(await readFile(indexPath, 'utf8'));
  // Detect whether index.json is an array or wrapped
  const indexList = Array.isArray(indexRaw) ? indexRaw : indexRaw.missions;
  const existing = new Set(indexList.map((e) => e.id));

  for (const m of MISSIONS) {
    const base = buildBase(m);
    const overlay = buildOverlay(m);
    const destDir = (m.dest || 'MOON').toLowerCase(); // EARTH → 'earth', MOON → 'moon'
    // base
    const basePath = join(MISSIONS_ROOT, destDir, `${m.id}.json`);
    await mkdir(dirname(basePath), { recursive: true });
    await writeFile(basePath, JSON.stringify(base, null, 2) + '\n');
    // en-US overlay
    const overlayPath = join(I18N_ROOT, 'en-US', 'missions', destDir, `${m.id}.json`);
    await mkdir(dirname(overlayPath), { recursive: true });
    await writeFile(overlayPath, JSON.stringify(overlay, null, 2) + '\n');
    console.log(`✓ ${m.id}: base + en-US`);

    // index row (idempotent — only add if missing)
    if (!existing.has(m.id)) {
      indexList.push({
        id: m.id,
        agency: 'NASA',
        dest: m.dest || 'MOON',
        status: 'FLOWN',
        year: m.year,
        sector: 'gov',
        color: NASA_COLOR,
      });
      existing.add(m.id);
      console.log(`  + index row added for ${m.id}`);
    }
  }
  // Re-sort missions by year for stable index ordering (existing convention check needed)
  // Keep insertion order; index.json typically iterates by file order, not alphabetical.
  if (Array.isArray(indexRaw)) {
    await writeFile(indexPath, JSON.stringify(indexList, null, 2) + '\n');
  } else {
    indexRaw.missions = indexList;
    await writeFile(indexPath, JSON.stringify(indexRaw, null, 2) + '\n');
  }
  console.log('\n✓ index.json updated');

  // ───────── reciprocal linked_missions on each fleet asset ─────────
  // Compute (fleetId → set of mission ids) from the mission fleet_refs
  // we just wrote, then union into each fleet entry's linked_missions.
  const fleetTouchMap = {};
  for (const m of MISSIONS) {
    for (const ref of fleetRefs(m)) {
      if (!fleetTouchMap[ref.id]) fleetTouchMap[ref.id] = new Set();
      fleetTouchMap[ref.id].add(m.id);
    }
  }
  // category folder lookup: scan fleet/index.json for the fleet entry
  const fleetIndex = JSON.parse(
    await readFile(join(ROOT, 'static', 'data', 'fleet', 'index.json'), 'utf8'),
  );
  const catLookup = new Map(fleetIndex.map((e) => [e.id, e.category]));
  for (const [fleetId, missionIds] of Object.entries(fleetTouchMap)) {
    const cat = catLookup.get(fleetId);
    if (!cat) {
      console.warn(`  ⚠ no fleet category for ${fleetId} — skipped`);
      continue;
    }
    const path = join(ROOT, 'static', 'data', 'fleet', cat, `${fleetId}.json`);
    const obj = JSON.parse(await readFile(path, 'utf8'));
    const prev = new Set(obj.linked_missions || []);
    const before = prev.size;
    for (const id of missionIds) prev.add(id);
    obj.linked_missions = Array.from(prev).sort();
    await writeFile(path, JSON.stringify(obj, null, 2) + '\n');
    console.log(
      `  ↔ ${fleetId.padEnd(22)} linked_missions ${before} → ${obj.linked_missions.length}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
