#!/usr/bin/env node
/**
 * Populate the per-flight roster (flights[]) on the historical
 * crewed-spacecraft fleet entries:
 *   - apollo-csm-block-ii (11 Apollo crewed CSMs by call sign)
 *   - apollo-lm           (10 Apollo LMs incl. LM-1 uncrewed test
 *                          + Apollo 13's "lifeboat" use of Aquarius)
 *   - columbia, challenger, discovery, atlantis, endeavour
 *                         (5 marquee STS flights per orbiter +
 *                          loss / final-flight + current museum)
 *   - enterprise          (5 ALT free flights from 1977)
 *
 * Replaces any existing flights[]; doesn't deep-merge. Run once;
 * re-runnable.
 */
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FLEET = join(ROOT, 'static', 'data', 'fleet', 'crewed-spacecraft');

const ROSTERS = {
  'apollo-csm-block-ii': [
    {
      mission_id: 'apollo7',
      flight_designation:
        'Apollo 7 (1968-10-11) · CSM-101 · first Block II crewed flight; LEO shakedown · CM at Frontiers of Flight Museum, Dallas TX',
    },
    {
      mission_id: 'apollo8',
      flight_designation:
        'Apollo 8 (1968-12-21) · CSM-103 · first humans to orbit the Moon; Earthrise · CM at Museum of Science and Industry, Chicago IL',
    },
    {
      mission_id: 'apollo9',
      flight_designation:
        'Apollo 9 (1969-03-03) · CSM Gumdrop (CSM-104) · first crewed LM rendezvous in Earth orbit · CM at San Diego Air & Space Museum, San Diego CA',
    },
    {
      mission_id: 'apollo10',
      flight_designation:
        'Apollo 10 (1969-05-18) · CSM Charlie Brown (CSM-106) · lunar dress rehearsal · CM at Science Museum, London, UK',
    },
    {
      mission_id: 'apollo11',
      flight_designation:
        'Apollo 11 (1969-07-16) · CSM Columbia (CSM-107) · first crewed Moon landing · CM at National Air & Space Museum, Washington DC',
    },
    {
      mission_id: 'apollo12',
      flight_designation:
        'Apollo 12 (1969-11-14) · CSM Yankee Clipper (CSM-108) · pinpoint Ocean of Storms landing · CM at Virginia Air & Space Center, Hampton VA',
    },
    {
      mission_id: 'apollo13',
      flight_designation:
        'Apollo 13 (1970-04-11) · CSM Odyssey (CSM-109) · "Houston we\'ve had a problem" · CM at Cosmosphere, Hutchinson KS',
    },
    {
      mission_id: 'apollo14',
      flight_designation:
        'Apollo 14 (1971-01-31) · CSM Kitty Hawk (CSM-110) · Fra Mauro highlands · CM at Kennedy Space Center Visitor Complex, FL',
    },
    {
      mission_id: 'apollo15',
      flight_designation:
        'Apollo 15 (1971-07-26) · CSM Endeavour (CSM-112) · first J-mission with LRV · CM at National Museum of the USAF, Dayton OH',
    },
    {
      mission_id: 'apollo16',
      flight_designation:
        'Apollo 16 (1972-04-16) · CSM Casper (CSM-113) · first highlands landing (Descartes) · CM at U.S. Space & Rocket Center, Huntsville AL',
    },
    {
      mission_id: 'apollo17',
      flight_designation:
        'Apollo 17 (1972-12-07) · CSM America (CSM-114) · last crewed lunar mission · CM at Space Center Houston, TX',
    },
  ],
  'apollo-lm': [
    {
      mission_id: 'apollo5',
      flight_designation:
        'Apollo 5 (1968-01-22) · LM-1 · uncrewed first LM Earth-orbit test · descent + ascent stages decayed within months',
    },
    {
      mission_id: 'apollo9',
      flight_designation:
        'Apollo 9 (1969-03-03) · LM Spider (LM-3) · first crewed LM test; rendezvous in Earth orbit · descent stage decayed 1981',
    },
    {
      mission_id: 'apollo10',
      flight_designation:
        'Apollo 10 (1969-05-18) · LM Snoopy (LM-4) · descent to 15.6 km above Moon — ascent stage ejected into heliocentric orbit (re-detected 2019)',
    },
    {
      mission_id: 'apollo11',
      flight_designation:
        'Apollo 11 (1969-07-16) · LM Eagle · first crewed Moon landing; descent stage at Tranquility Base',
    },
    {
      mission_id: 'apollo12',
      flight_designation:
        'Apollo 12 (1969-11-14) · LM Intrepid · pinpoint landing; ascent stage deorbited onto Moon for ALSEP seismometry',
    },
    {
      mission_id: 'apollo13',
      flight_designation:
        'Apollo 13 (1970-04-11) · LM Aquarius · "lifeboat" — saved the crew after the SM-O₂ tank rupture; reentered + burned up',
    },
    {
      mission_id: 'apollo14',
      flight_designation:
        'Apollo 14 (1971-01-31) · LM Antares · Fra Mauro; descent stage at landing site',
    },
    {
      mission_id: 'apollo15',
      flight_designation:
        'Apollo 15 (1971-07-26) · LM Falcon · first J-mission; Hadley-Apennine; descent stage at landing site',
    },
    {
      mission_id: 'apollo16',
      flight_designation:
        'Apollo 16 (1972-04-16) · LM Orion · Descartes highlands; descent stage at landing site',
    },
    {
      mission_id: 'apollo17',
      flight_designation:
        'Apollo 17 (1972-12-07) · LM Challenger · last Apollo Moonwalk; descent stage at Taurus-Littrow',
    },
  ],
  columbia: [
    {
      mission_id: 'sts-1',
      flight_designation:
        'STS-1 (1981-04-12) · first Space Shuttle flight; Young + Crippen — first crewed test of a new US spacecraft in 25 years',
    },
    {
      mission_id: 'sts-9',
      flight_designation:
        'STS-9 (1983-11-28) · first Spacelab mission; first 6-person Shuttle crew; first non-US ESA payload specialist (Merbold)',
    },
    {
      mission_id: 'sts-32',
      flight_designation:
        'STS-32 (1990-01-09) · retrieved LDEF (Long Duration Exposure Facility) after 5.7 years in orbit',
    },
    {
      mission_id: 'sts-93',
      flight_designation:
        'STS-93 (1999-07-23) · deployed Chandra X-ray Observatory; first Shuttle commanded by a woman (Collins)',
    },
    {
      mission_id: 'sts-107',
      flight_designation:
        'STS-107 (2003-01-16) · LOST on re-entry 2003-02-01 — foam strike breached the RCC left-wing leading edge; all 7 crew (Husband, McCool, Anderson, Brown, Chawla, Clark, Ramon) perished',
    },
  ],
  challenger: [
    {
      mission_id: 'sts-6',
      flight_designation:
        'STS-6 (1983-04-04) · first Challenger flight; first Shuttle EVA (Musgrave + Peterson) · deployed TDRS-1',
    },
    {
      mission_id: 'sts-41-b',
      flight_designation:
        'STS-41-B (1984-02-03) · first untethered EVA — McCandless and Stewart on MMU jetpacks',
    },
    {
      mission_id: 'sts-41-g',
      flight_designation:
        "STS-41-G (1984-10-05) · first 7-person crew; first US-female EVA (Sullivan); Sally Ride's 2nd flight",
    },
    {
      mission_id: 'sts-51-l',
      flight_designation:
        'STS-51-L (1986-01-28) · LOST 73 s after launch — right SRB O-ring failure in unprecedented cold (−1°C); all 7 crew (Scobee, Smith, Resnik, Onizuka, McNair, Jarvis, McAuliffe) perished',
    },
  ],
  discovery: [
    {
      mission_id: 'sts-41-d',
      flight_designation:
        'STS-41-D (1984-08-30) · first Discovery flight · deployed 3 commercial comsats',
    },
    {
      mission_id: 'sts-26',
      flight_designation:
        'STS-26 (1988-09-29) · post-Challenger Return-to-Flight after 32-month stand-down',
    },
    {
      mission_id: 'sts-31',
      flight_designation: 'STS-31 (1990-04-24) · deployed Hubble Space Telescope into 600 km orbit',
    },
    {
      mission_id: 'sts-95',
      flight_designation:
        'STS-95 (1998-10-29) · returned John Glenn to orbit at age 77 (36 years after his 1962 Friendship 7 flight)',
    },
    {
      mission_id: 'sts-114',
      flight_designation:
        'STS-114 (2005-07-26) · post-Columbia Return-to-Flight after 29-month stand-down · first test of in-orbit thermal-tile inspection / repair',
    },
    {
      mission_id: 'sts-133',
      flight_designation:
        'STS-133 (2011-02-24) · final Discovery flight (39 total — most of any orbiter) · delivered Leonardo PMM to ISS',
    },
  ],
  atlantis: [
    {
      mission_id: 'sts-51-j',
      flight_designation:
        'STS-51-J (1985-10-03) · first Atlantis flight; classified DoD mission (DSCS-III deployment)',
    },
    {
      mission_id: 'sts-30',
      flight_designation:
        'STS-30 (1989-05-04) · deployed Magellan probe to Venus — first US planetary mission in 11 years',
    },
    {
      mission_id: 'sts-34',
      flight_designation:
        'STS-34 (1989-10-18) · deployed Galileo probe to Jupiter via VEEGA trajectory',
    },
    {
      mission_id: 'sts-71',
      flight_designation:
        'STS-71 (1995-06-27) · first Shuttle-Mir docking; first US-Russian crew handover; 100th US crewed spaceflight',
    },
    {
      mission_id: 'sts-125',
      flight_designation:
        'STS-125 (2009-05-11) · final Hubble servicing mission (HST SM4); only post-Columbia mission without ISS rendezvous',
    },
    {
      mission_id: 'sts-135',
      flight_designation:
        'STS-135 (2011-07-08) · final Shuttle flight ever; delivered Raffaello MPLM to ISS; closed the 30-year Shuttle programme',
    },
  ],
  endeavour: [
    {
      mission_id: 'sts-49',
      flight_designation:
        'STS-49 (1992-05-07) · first Endeavour flight; first 3-person EVA (Thuot + Hieb + Akers) — captured stranded Intelsat-VI by hand',
    },
    {
      mission_id: 'sts-61',
      flight_designation:
        'STS-61 (1993-12-02) · first Hubble servicing mission (HST SM1); installed COSTAR corrective optics + WFPC2',
    },
    {
      mission_id: 'sts-88',
      flight_designation:
        'STS-88 (1998-12-04) · first ISS assembly mission; delivered + attached Unity (Node 1) to Zarya',
    },
    {
      mission_id: 'sts-100',
      flight_designation: 'STS-100 (2001-04-19) · installed Canadarm2 robotic arm on ISS',
    },
    {
      mission_id: 'sts-130',
      flight_designation:
        'STS-130 (2010-02-08) · installed Tranquility (Node 3) + Cupola on ISS — gave the station its iconic windows',
    },
    {
      mission_id: 'sts-134',
      flight_designation:
        'STS-134 (2011-05-16) · final Endeavour flight; installed AMS-02 cosmic-ray detector on ISS',
    },
  ],
  enterprise: [
    {
      mission_id: 'enterprise-cf-1',
      flight_designation:
        'CAPTIVE-INERT 1 (1977-02-18) · first carrying flight on a Boeing 747 SCA; unmanned; no separation',
    },
    {
      mission_id: 'enterprise-ff-1',
      flight_designation:
        'FREE FLIGHT 1 (1977-08-12) · first free flight from the SCA; Haise + Fullerton; first proof Shuttle could glide + land',
    },
    {
      mission_id: 'enterprise-ff-2',
      flight_designation:
        'FREE FLIGHT 2 (1977-09-13) · 2nd free flight; Engle + Truly; pitch-up landing test',
    },
    {
      mission_id: 'enterprise-ff-4',
      flight_designation:
        'FREE FLIGHT 4 (1977-10-12) · 4th free flight; first without tailcone — full orbital aerodynamics',
    },
    {
      mission_id: 'enterprise-ff-5',
      flight_designation:
        'FREE FLIGHT 5 (1977-10-26) · 5th + final free flight; first dry-runway landing; closed the ALT programme',
    },
  ],
};

async function main() {
  for (const [id, flights] of Object.entries(ROSTERS)) {
    const path = join(FLEET, id + '.json');
    const obj = JSON.parse(await readFile(path, 'utf8'));
    const before = (obj.flights || []).length;
    obj.flights = flights;
    await writeFile(path, JSON.stringify(obj, null, 2) + '\n');
    console.log('✓ ' + id.padEnd(22) + ' flights ' + before + ' → ' + flights.length);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
