#!/usr/bin/env tsx
/**
 * One-shot migration: author the 3-tier LEARN links (intro / core /
 * deep) on fleet entries per ADR-051 (LEARN-link rollout) + RFC-016
 * v0.2 §scope.
 *
 * V1 strategy (Phase I of Issue #59):
 *   - Marquee tier (~40 entries) gets full 3-tier curation (intro +
 *     core + deep), with native-language INTRO for non-US entries
 *     per ADR-051.
 *   - Long-tail entries keep their existing Wikipedia INTRO link from
 *     Phase A scaffold; CORE + DEEP fill in V1.5 / V2.
 *
 * Run after Phase A scaffold:
 *   tsx scripts/migrate-fleet-learn-links.ts
 *
 * Re-runnable: existing links are REPLACED with the curated 3-tier set
 * for each entry in CURATED. Entries not in CURATED are left alone.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLEET_DIR = join(ROOT, 'static/data/fleet');

type Tier = 'intro' | 'core' | 'deep';
type Link = { l: string; u: string; t: Tier };
type IndexEntry = { id: string; category: string };

/**
 * Marquee-tier curation (~40 entries). For each, full 3-tier: intro
 * (Wikipedia, native language for non-US per ADR-051), core (agency /
 * operator official page), deep (technical doc / NTRS / archive).
 */
const CURATED: Record<string, Link[]> = {
  // ─── Launchers ───────────────────────────────────────────────
  'saturn-v': [
    { l: 'Saturn V — Wikipedia', u: 'https://en.wikipedia.org/wiki/Saturn_V', t: 'intro' },
    {
      l: 'Saturn V Reference (NASA Marshall)',
      u: 'https://www.nasa.gov/centers-and-facilities/marshall/saturn-v/',
      t: 'core',
    },
    {
      l: 'Apollo by the Numbers (NASA NTRS, Orloff 2000)',
      u: 'https://history.nasa.gov/SP-4029/SP-4029.htm',
      t: 'deep',
    },
  ],
  'r-7-vostok': [
    {
      l: 'Восток (ракета-носитель) — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%92%D0%BE%D1%81%D1%82%D0%BE%D0%BA_(%D1%80%D0%B0%D0%BA%D0%B5%D1%82%D0%B0-%D0%BD%D0%BE%D1%81%D0%B8%D1%82%D0%B5%D0%BB%D1%8C)',
      t: 'intro',
    },
    {
      l: 'Vostok rocket — Roscosmos history',
      u: 'https://www.roscosmos.ru/24180/',
      t: 'core',
    },
    {
      l: 'R-7 family — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/R-7_(rocket_family)',
      t: 'deep',
    },
  ],
  'space-shuttle-stack': [
    {
      l: 'Space Shuttle — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Space_Shuttle',
      t: 'intro',
    },
    {
      l: 'Space Shuttle Era (NASA)',
      u: 'https://www.nasa.gov/space-shuttle/',
      t: 'core',
    },
    {
      l: 'Space Shuttle Mission Reports (NASA NTRS)',
      u: 'https://www.nasa.gov/reference/space-shuttle-mission-reports/',
      t: 'deep',
    },
  ],
  'falcon-9': [
    { l: 'Falcon 9 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Falcon_9', t: 'intro' },
    {
      l: 'Falcon 9 — SpaceX',
      u: 'https://www.spacex.com/vehicles/falcon-9/',
      t: 'core',
    },
    {
      l: "Falcon User's Guide (SpaceX)",
      u: 'https://www.spacex.com/media/falcon-users-guide-2021-09.pdf',
      t: 'deep',
    },
  ],
  'falcon-heavy': [
    { l: 'Falcon Heavy — Wikipedia', u: 'https://en.wikipedia.org/wiki/Falcon_Heavy', t: 'intro' },
    {
      l: 'Falcon Heavy — SpaceX',
      u: 'https://www.spacex.com/vehicles/falcon-heavy/',
      t: 'core',
    },
    {
      l: "Falcon User's Guide (SpaceX)",
      u: 'https://www.spacex.com/media/falcon-users-guide-2021-09.pdf',
      t: 'deep',
    },
  ],
  'sls-block-1': [
    {
      l: 'Space Launch System — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Space_Launch_System',
      t: 'intro',
    },
    {
      l: 'SLS — NASA',
      u: 'https://www.nasa.gov/exploration-systems/space-launch-system/',
      t: 'core',
    },
    {
      l: 'SLS Reference Guide (NASA)',
      u: 'https://www.nasa.gov/wp-content/uploads/2022/06/sls_reference_guide_2022_v3.pdf',
      t: 'deep',
    },
  ],
  'ariane-5': [
    { l: 'Ariane 5 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Ariane_5', t: 'intro' },
    {
      l: 'Ariane 5 — ESA',
      u: 'https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Ariane_5',
      t: 'core',
    },
    {
      l: 'Ariane 5 mission archive (ESA)',
      u: 'https://www.esa.int/Enabling_Support/Space_Transportation/Launch_vehicles/Ariane_5_-_an_extraordinary_legacy',
      t: 'deep',
    },
  ],
  n1: [
    {
      l: 'Н-1 (ракета-носитель) — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%9D-1_(%D1%80%D0%B0%D0%BA%D0%B5%D1%82%D0%B0-%D0%BD%D0%BE%D1%81%D0%B8%D1%82%D0%B5%D0%BB%D1%8C)',
      t: 'intro',
    },
    {
      l: 'N1 (rocket) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/N1_(rocket)',
      t: 'core',
    },
    {
      l: 'Soviet N-1 lunar program (NASA history)',
      u: 'https://history.nasa.gov/SP-4225/nomenclature/N1.htm',
      t: 'deep',
    },
  ],
  'atlas-v': [
    { l: 'Atlas V — Wikipedia', u: 'https://en.wikipedia.org/wiki/Atlas_V', t: 'intro' },
    {
      l: 'Atlas V — United Launch Alliance',
      u: 'https://www.ulalaunch.com/rockets/atlas-v',
      t: 'core',
    },
    {
      l: 'Atlas V Launch Services User Guide (ULA)',
      u: 'https://www.ulalaunch.com/docs/default-source/rockets/atlasvusersguide2010.pdf',
      t: 'deep',
    },
  ],
  'long-march-5': [
    {
      l: '长征五号 — 中文维基百科',
      u: 'https://zh.wikipedia.org/wiki/%E9%95%BF%E5%BE%81%E4%BA%94%E5%8F%B7%E7%B3%BB%E5%88%97%E8%BF%90%E8%BD%BD%E7%81%AB%E7%AE%AD',
      t: 'intro',
    },
    {
      l: 'Long March 5 — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Long_March_5',
      t: 'core',
    },
    {
      l: 'Long March 5 launch history (NASA NSSDCA)',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/displayDispatch.action?searchTerm=long+march+5',
      t: 'deep',
    },
  ],

  // ─── Crewed spacecraft ──────────────────────────────────────
  vostok: [
    {
      l: 'Восток (космический корабль) — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%92%D0%BE%D1%81%D1%82%D0%BE%D0%BA_(%D0%BA%D0%BE%D1%81%D0%BC%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D0%BA%D0%BE%D1%80%D0%B0%D0%B1%D0%BB%D1%8C)',
      t: 'intro',
    },
    {
      l: 'Vostok 1 mission (NASA NSSDCA)',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1961-012A',
      t: 'core',
    },
    {
      l: 'Vostok 1 mission overview (NASA)',
      u: 'https://www.nasa.gov/history/60-years-ago-vostok-1-takes-yuri-gagarin-to-orbit/',
      t: 'deep',
    },
  ],
  'mercury-capsule': [
    {
      l: 'Project Mercury — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Project_Mercury',
      t: 'intro',
    },
    {
      l: 'Project Mercury — NASA History',
      u: 'https://www.nasa.gov/mission/mercury/',
      t: 'core',
    },
    {
      l: 'This New Ocean: A History of Project Mercury (NASA SP-4201)',
      u: 'https://history.nasa.gov/SP-4201/toc.htm',
      t: 'deep',
    },
  ],
  gemini: [
    {
      l: 'Project Gemini — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Project_Gemini',
      t: 'intro',
    },
    {
      l: 'Project Gemini — NASA History',
      u: 'https://www.nasa.gov/mission/gemini/',
      t: 'core',
    },
    {
      l: 'On the Shoulders of Titans: A History of Project Gemini (NASA SP-4203)',
      u: 'https://history.nasa.gov/SP-4203/toc.htm',
      t: 'deep',
    },
  ],
  'apollo-csm-block-ii': [
    {
      l: 'Apollo command and service module — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Apollo_command_and_service_module',
      t: 'intro',
    },
    {
      l: 'CSM News Reference (NASA Apollo Program)',
      u: 'https://www.hq.nasa.gov/alsj/CSM06_Command_Module_Overview_pp7-19.pdf',
      t: 'core',
    },
    {
      l: 'Chariots for Apollo (NASA SP-4205)',
      u: 'https://history.nasa.gov/SP-4205/toc.html',
      t: 'deep',
    },
  ],
  'apollo-lm': [
    {
      l: 'Apollo Lunar Module — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Apollo_Lunar_Module',
      t: 'intro',
    },
    {
      l: 'Lunar Module News Reference (Grumman)',
      u: 'https://www.hq.nasa.gov/alsj/LM_News_Reference.pdf',
      t: 'core',
    },
    {
      l: 'Chariots for Apollo (NASA SP-4205, ch. 13–14)',
      u: 'https://history.nasa.gov/SP-4205/ch13-1.html',
      t: 'deep',
    },
  ],
  'space-shuttle-orbiter': [
    {
      l: 'Space Shuttle orbiter — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Space_Shuttle_orbiter',
      t: 'intro',
    },
    { l: 'Space Shuttle Era — NASA', u: 'https://www.nasa.gov/space-shuttle/', t: 'core' },
    {
      l: 'Wings in Orbit: Scientific and Engineering Legacies of the Space Shuttle (NASA SP-2010-3409)',
      u: 'https://www.nasa.gov/wp-content/uploads/static/history/SP-2010-3409.pdf',
      t: 'deep',
    },
  ],
  buran: [
    {
      l: 'Буран (космический корабль) — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%91%D1%83%D1%80%D0%B0%D0%BD_(%D0%BA%D0%BE%D1%81%D0%BC%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D0%BA%D0%BE%D1%80%D0%B0%D0%B1%D0%BB%D1%8C)',
      t: 'intro',
    },
    {
      l: 'Buran-class orbiter — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Buran-class_orbiter',
      t: 'core',
    },
    {
      l: 'Buran programme — Roscosmos',
      u: 'https://www.roscosmos.ru/30025/',
      t: 'deep',
    },
  ],
  'soyuz-ms': [
    { l: 'Soyuz MS — Wikipedia', u: 'https://en.wikipedia.org/wiki/Soyuz_MS', t: 'intro' },
    {
      l: 'Союз МС — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%A1%D0%BE%D1%8E%D0%B7_%D0%9C%D0%A1',
      t: 'core',
    },
    {
      l: 'Soyuz MS — Roscosmos',
      u: 'https://www.roscosmos.ru/24181/',
      t: 'deep',
    },
  ],
  'crew-dragon': [
    {
      l: 'SpaceX Dragon 2 — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/SpaceX_Dragon_2',
      t: 'intro',
    },
    { l: 'Dragon — SpaceX', u: 'https://www.spacex.com/vehicles/dragon/', t: 'core' },
    {
      l: 'Crew-1 Press Kit (NASA)',
      u: 'https://www.nasa.gov/wp-content/uploads/2020/11/crew-1-press-kit.pdf',
      t: 'deep',
    },
  ],
  starliner: [
    {
      l: 'Boeing Starliner — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Boeing_Starliner',
      t: 'intro',
    },
    {
      l: 'Starliner — Boeing',
      u: 'https://www.boeing.com/space/starliner',
      t: 'core',
    },
    {
      l: 'Boeing Crew Flight Test Press Kit (NASA)',
      u: 'https://www.nasa.gov/commercial-crew/',
      t: 'deep',
    },
  ],
  shenzhou: [
    {
      l: '神舟飞船 — 中文维基百科',
      u: 'https://zh.wikipedia.org/wiki/%E7%A5%9E%E8%88%9F%E9%A3%9E%E8%88%B9',
      t: 'intro',
    },
    {
      l: 'Shenzhou — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Shenzhou_(spacecraft)',
      t: 'core',
    },
    {
      l: 'CMSA — China Manned Space Agency',
      u: 'http://en.cmse.gov.cn/',
      t: 'deep',
    },
  ],
  orion: [
    {
      l: 'Orion (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Orion_(spacecraft)',
      t: 'intro',
    },
    {
      l: 'Orion Spacecraft — NASA',
      u: 'https://www.nasa.gov/exploration-systems/orion/',
      t: 'core',
    },
    {
      l: 'Orion Reference Guide (NASA)',
      u: 'https://www.nasa.gov/wp-content/uploads/2022/12/orion-reference-guide.pdf',
      t: 'deep',
    },
  ],

  // ─── Stations ────────────────────────────────────────────────
  'salyut-1': [
    {
      l: 'Салют-1 — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%A1%D0%B0%D0%BB%D1%8E%D1%82-1',
      t: 'intro',
    },
    { l: 'Salyut 1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Salyut_1', t: 'core' },
    {
      l: 'Salyut programme (NASA NSSDCA)',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-032A',
      t: 'deep',
    },
  ],
  mir: [
    {
      l: 'Мир (космическая станция) — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%9C%D0%B8%D1%80_(%D0%BE%D1%80%D0%B1%D0%B8%D1%82%D0%B0%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F_%D1%81%D1%82%D0%B0%D0%BD%D1%86%D0%B8%D1%8F)',
      t: 'intro',
    },
    { l: 'Mir — Wikipedia', u: 'https://en.wikipedia.org/wiki/Mir', t: 'core' },
    {
      l: 'Mir Hardware Heritage (NASA RP-1357)',
      u: 'https://history.nasa.gov/SP-4225/documentation/mir-hardware-heritage/mir-hardware-heritage.htm',
      t: 'deep',
    },
  ],
  iss: [
    {
      l: 'International Space Station — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/International_Space_Station',
      t: 'intro',
    },
    { l: 'ISS — NASA', u: 'https://www.nasa.gov/international-space-station/', t: 'core' },
    {
      l: 'ISS Reference Guide (NASA)',
      u: 'https://www.nasa.gov/wp-content/uploads/2017/09/np-2015-05-022-jsc-iss-guide-2015-update-111015-508c.pdf',
      t: 'deep',
    },
  ],
  tiangong: [
    {
      l: '天宫空间站 — 中文维基百科',
      u: 'https://zh.wikipedia.org/wiki/%E5%A4%A9%E5%AE%AB%E7%A9%BA%E9%97%B4%E7%AB%99',
      t: 'intro',
    },
    {
      l: 'Tiangong space station — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Tiangong_space_station',
      t: 'core',
    },
    {
      l: 'CMSA — China Manned Space Agency (Tiangong)',
      u: 'http://en.cmse.gov.cn/cms/',
      t: 'deep',
    },
  ],
  skylab: [
    { l: 'Skylab — Wikipedia', u: 'https://en.wikipedia.org/wiki/Skylab', t: 'intro' },
    { l: 'Skylab — NASA', u: 'https://www.nasa.gov/skylab/', t: 'core' },
    {
      l: 'Living and Working in Space: A History of Skylab (NASA SP-4208)',
      u: 'https://history.nasa.gov/SP-4208/toc.htm',
      t: 'deep',
    },
  ],

  // ─── Rovers ──────────────────────────────────────────────────
  curiosity: [
    {
      l: 'Curiosity (rover) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Curiosity_(rover)',
      t: 'intro',
    },
    { l: 'Mars Science Laboratory — NASA JPL', u: 'https://mars.nasa.gov/msl/', t: 'core' },
    {
      l: 'MSL Mission Profile (NASA NTRS)',
      u: 'https://mars.nasa.gov/internal_resources/788/',
      t: 'deep',
    },
  ],
  perseverance: [
    {
      l: 'Perseverance (rover) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Perseverance_(rover)',
      t: 'intro',
    },
    { l: 'Mars 2020 — NASA JPL', u: 'https://mars.nasa.gov/mars2020/', t: 'core' },
    {
      l: 'Mars 2020 Press Kit (NASA)',
      u: 'https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/',
      t: 'deep',
    },
  ],
  'lunokhod-1': [
    {
      l: 'Луноход-1 — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%9B%D1%83%D0%BD%D0%BE%D1%85%D0%BE%D0%B4-1',
      t: 'intro',
    },
    { l: 'Lunokhod 1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Lunokhod_1', t: 'core' },
    {
      l: 'Lunokhod 1 mission (NASA NSSDCA)',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1970-095A',
      t: 'deep',
    },
  ],
  'lrv-apollo': [
    {
      l: 'Lunar Roving Vehicle — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Lunar_Roving_Vehicle',
      t: 'intro',
    },
    {
      l: 'Lunar Roving Vehicle — NASA',
      u: 'https://www.nasa.gov/history/the-lunar-roving-vehicle/',
      t: 'core',
    },
    {
      l: 'Apollo Lunar Roving Vehicle — Boeing/GM Final Report',
      u: 'https://www.hq.nasa.gov/alsj/lrvhand.html',
      t: 'deep',
    },
  ],
  sojourner: [
    {
      l: 'Sojourner (rover) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Sojourner_(rover)',
      t: 'intro',
    },
    { l: 'Mars Pathfinder — NASA JPL', u: 'https://mars.nasa.gov/MPF/', t: 'core' },
    {
      l: 'Mars Pathfinder Project (NASA NTRS)',
      u: 'https://www.jpl.nasa.gov/missions/mars-pathfinder',
      t: 'deep',
    },
  ],

  // ─── Landers ─────────────────────────────────────────────────
  'luna-9': [
    {
      l: 'Луна-9 — русская Википедия',
      u: 'https://ru.wikipedia.org/wiki/%D0%9B%D1%83%D0%BD%D0%B0-9',
      t: 'intro',
    },
    { l: 'Luna 9 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Luna_9', t: 'core' },
    {
      l: 'Luna 9 mission (NASA NSSDCA)',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1966-006A',
      t: 'deep',
    },
  ],
  'viking-1': [
    { l: 'Viking 1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Viking_1', t: 'intro' },
    {
      l: 'Viking Program — NASA',
      u: 'https://nssdc.gsfc.nasa.gov/planetary/viking.html',
      t: 'core',
    },
    {
      l: 'On Mars: Exploration of the Red Planet 1958-1978 (NASA SP-4212)',
      u: 'https://history.nasa.gov/SP-4212/toc.html',
      t: 'deep',
    },
  ],

  // ─── Orbiters ────────────────────────────────────────────────
  'voyager-1': [
    { l: 'Voyager 1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Voyager_1', t: 'intro' },
    { l: 'Voyager — NASA JPL', u: 'https://voyager.jpl.nasa.gov/', t: 'core' },
    {
      l: 'Voyager Mission Status (NASA)',
      u: 'https://voyager.jpl.nasa.gov/mission/status/',
      t: 'deep',
    },
  ],
  'voyager-2': [
    { l: 'Voyager 2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Voyager_2', t: 'intro' },
    { l: 'Voyager — NASA JPL', u: 'https://voyager.jpl.nasa.gov/', t: 'core' },
    {
      l: 'Voyager Mission Status (NASA)',
      u: 'https://voyager.jpl.nasa.gov/mission/status/',
      t: 'deep',
    },
  ],
  cassini: [
    {
      l: 'Cassini-Huygens — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Cassini%E2%80%93Huygens',
      t: 'intro',
    },
    { l: 'Cassini — NASA Science', u: 'https://science.nasa.gov/mission/cassini/', t: 'core' },
    {
      l: 'Cassini Final Mission Report (NASA NTRS)',
      u: 'https://solarsystem.nasa.gov/resources/17769/cassini-end-of-mission/',
      t: 'deep',
    },
  ],
  galileo: [
    {
      l: 'Galileo (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Galileo_(spacecraft)',
      t: 'intro',
    },
    {
      l: 'Galileo Mission — NASA',
      u: 'https://solarsystem.nasa.gov/missions/galileo/in-depth/',
      t: 'core',
    },
    {
      l: 'Mission to Jupiter: Galileo (NASA SP-4231)',
      u: 'https://history.nasa.gov/sp4231.pdf',
      t: 'deep',
    },
  ],
  juno: [
    {
      l: 'Juno (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Juno_(spacecraft)',
      t: 'intro',
    },
    { l: 'Juno mission — NASA', u: 'https://science.nasa.gov/mission/juno/', t: 'core' },
    {
      l: 'Juno Mission Profile (NASA NTRS)',
      u: 'https://www.nasa.gov/mission/juno/',
      t: 'deep',
    },
  ],
  'mariner-9': [
    { l: 'Mariner 9 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Mariner_9', t: 'intro' },
    {
      l: 'Mariner 9 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-051A',
      t: 'core',
    },
    {
      l: 'On Mars: Exploration of the Red Planet 1958-1978 (NASA SP-4212)',
      u: 'https://history.nasa.gov/SP-4212/toc.html',
      t: 'deep',
    },
  ],

  // ─── Observatories ──────────────────────────────────────────
  hubble: [
    {
      l: 'Hubble Space Telescope — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Hubble_Space_Telescope',
      t: 'intro',
    },
    { l: 'Hubble — NASA', u: 'https://hubblesite.org/', t: 'core' },
    {
      l: 'The Space Telescope: A Study of NASA, Science, Technology, and Politics (Smith)',
      u: 'https://www.nasa.gov/wp-content/uploads/2023/03/hubblescience.pdf',
      t: 'deep',
    },
  ],
  jwst: [
    {
      l: 'James Webb Space Telescope — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/James_Webb_Space_Telescope',
      t: 'intro',
    },
    { l: 'Webb — NASA', u: 'https://webb.nasa.gov/', t: 'core' },
    {
      l: 'JWST Mission Documentation (STScI)',
      u: 'https://www.stsci.edu/jwst/about-jwst',
      t: 'deep',
    },
  ],
  chandra: [
    {
      l: 'Chandra X-ray Observatory — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Chandra_X-ray_Observatory',
      t: 'intro',
    },
    { l: 'Chandra — NASA', u: 'https://chandra.harvard.edu/', t: 'core' },
    {
      l: 'Chandra discoveries archive',
      u: 'https://chandra.harvard.edu/about/',
      t: 'deep',
    },
  ],
  spitzer: [
    {
      l: 'Spitzer Space Telescope — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Spitzer_Space_Telescope',
      t: 'intro',
    },
    {
      l: 'Spitzer — NASA',
      u: 'https://www.nasa.gov/mission/spitzer-space-telescope/',
      t: 'core',
    },
    {
      l: 'Spitzer Final Mission Report (NASA NTRS)',
      u: 'https://www.jpl.nasa.gov/news/jpl-and-the-final-frontier-spitzer-marks-end-of-an-era',
      t: 'deep',
    },
  ],
  kepler: [
    {
      l: 'Kepler space telescope — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Kepler_space_telescope',
      t: 'intro',
    },
    {
      l: 'Kepler — NASA',
      u: 'https://www.nasa.gov/mission/kepler-space-telescope/',
      t: 'core',
    },
    {
      l: 'Kepler Mission Final Report (NASA)',
      u: 'https://www.nasa.gov/feature/ames/kepler/keplers-final-look-at-its-original-field-of-view',
      t: 'deep',
    },
  ],
  gaia: [
    {
      l: 'Gaia (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Gaia_(spacecraft)',
      t: 'intro',
    },
    { l: 'Gaia — ESA', u: 'https://www.esa.int/Science_Exploration/Space_Science/Gaia', t: 'core' },
    {
      l: 'Gaia Mission Documentation (ESA)',
      u: 'https://gea.esac.esa.int/archive/documentation/',
      t: 'deep',
    },
  ],

  // ──────────────────────────────────────────────────────────────────
  // GAP-FILL TIER (Phase I follow-up). Each entry below previously
  // shipped with only the Phase A scaffold's single Wikipedia link;
  // gets a 3-tier set here. Native-language INTRO for non-US entries
  // per ADR-051 where I have a verified URL.
  // ──────────────────────────────────────────────────────────────────

  // Cargo spacecraft (11)
  atv: [
    {
      l: 'Automated Transfer Vehicle — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Automated_Transfer_Vehicle',
      t: 'intro',
    },
    {
      l: 'ATV — ESA',
      u: 'https://www.esa.int/Enabling_Support/Operations/ATV',
      t: 'core',
    },
    {
      l: 'ATV programme retrospective (ESA)',
      u: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/ATV',
      t: 'deep',
    },
  ],
  'cargo-dragon-2': [
    {
      l: 'SpaceX Dragon 2 — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/SpaceX_Dragon_2',
      t: 'intro',
    },
    { l: 'Dragon — SpaceX', u: 'https://www.spacex.com/vehicles/dragon/', t: 'core' },
    {
      l: 'Commercial Resupply Services — NASA',
      u: 'https://www.nasa.gov/international-space-station/commercial-resupply/',
      t: 'deep',
    },
  ],
  'cargo-dragon-v1': [
    {
      l: 'SpaceX Dragon — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/SpaceX_Dragon',
      t: 'intro',
    },
    {
      l: 'COTS programme — NASA',
      u: 'https://www.nasa.gov/centers-and-facilities/johnson/commercial-orbital-transportation-services/',
      t: 'core',
    },
    {
      l: 'Dragon CRS-1 mission summary (NASA)',
      u: 'https://www.nasa.gov/mission/spacex-crs-1/',
      t: 'deep',
    },
  ],
  'cygnus-enhanced': [
    {
      l: 'Cygnus (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Cygnus_(spacecraft)',
      t: 'intro',
    },
    {
      l: 'Cygnus on the ISS — NASA',
      u: 'https://www.nasa.gov/international-space-station/commercial-resupply/cygnus-fact-sheet/',
      t: 'core',
    },
    {
      l: 'Northrop Grumman cargo missions (NASA)',
      u: 'https://www.nasa.gov/international-space-station/commercial-resupply/',
      t: 'deep',
    },
  ],
  'cygnus-standard': [
    {
      l: 'Cygnus (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Cygnus_(spacecraft)',
      t: 'intro',
    },
    {
      l: 'Cygnus Orb-D1 — NASA',
      u: 'https://www.nasa.gov/mission/orbital-1-cygnus/',
      t: 'core',
    },
    {
      l: 'COTS Demo flights — NASA history',
      u: 'https://www.nasa.gov/centers-and-facilities/johnson/commercial-orbital-transportation-services/',
      t: 'deep',
    },
  ],
  htv: [
    {
      l: 'H-II Transfer Vehicle — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/H-II_Transfer_Vehicle',
      t: 'intro',
    },
    { l: 'こうのとり — JAXA', u: 'https://www.jaxa.jp/projects/rockets/htv/', t: 'core' },
    {
      l: 'HTV programme summary (JAXA)',
      u: 'https://global.jaxa.jp/projects/rockets/htv/',
      t: 'deep',
    },
  ],
  'htv-x': [
    { l: 'HTV-X — Wikipedia', u: 'https://en.wikipedia.org/wiki/HTV-X', t: 'intro' },
    { l: 'HTV-X — JAXA', u: 'https://global.jaxa.jp/projects/rockets/htvx/', t: 'core' },
    {
      l: 'HTV-X technical overview (JAXA)',
      u: 'https://www.jaxa.jp/projects/rockets/htvx/',
      t: 'deep',
    },
  ],
  'progress-7k-tg': [
    {
      l: 'Progress (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Progress_(spacecraft)',
      t: 'intro',
    },
    { l: 'Прогресс — Роскосмос', u: 'https://www.roscosmos.ru/24171/', t: 'core' },
    {
      l: 'Progress 1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1978-008A',
      t: 'deep',
    },
  ],
  'progress-m': [
    { l: 'Progress-M — Wikipedia', u: 'https://en.wikipedia.org/wiki/Progress-M', t: 'intro' },
    {
      l: 'Прогресс-М — Роскосмос',
      u: 'https://www.roscosmos.ru/24171/',
      t: 'core',
    },
    {
      l: 'Progress M-01M — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2008-060A',
      t: 'deep',
    },
  ],
  'progress-ms': [
    { l: 'Progress-MS — Wikipedia', u: 'https://en.wikipedia.org/wiki/Progress-MS', t: 'intro' },
    {
      l: 'Прогресс МС — Роскосмос',
      u: 'https://www.roscosmos.ru/24171/',
      t: 'core',
    },
    {
      l: 'Progress MS-01 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2015-082A',
      t: 'deep',
    },
  ],
  tianzhou: [
    {
      l: 'Tianzhou (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Tianzhou_(spacecraft)',
      t: 'intro',
    },
    { l: '天舟货运飞船 — CMSA', u: 'http://en.cmse.gov.cn/', t: 'core' },
    {
      l: 'Tianzhou-1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2017-021A',
      t: 'deep',
    },
  ],

  // Crewed (7)
  gaganyaan: [
    { l: 'Gaganyaan — Wikipedia', u: 'https://en.wikipedia.org/wiki/Gaganyaan', t: 'intro' },
    {
      l: 'Human Space Flight — ISRO',
      u: 'https://www.isro.gov.in/HumanSpaceflight.html',
      t: 'core',
    },
    {
      l: 'Gaganyaan programme overview (ISRO)',
      u: 'https://www.isro.gov.in/Gaganyaan_overview.html',
      t: 'deep',
    },
  ],
  'new-shepard': [
    { l: 'New Shepard — Wikipedia', u: 'https://en.wikipedia.org/wiki/New_Shepard', t: 'intro' },
    { l: 'New Shepard — Blue Origin', u: 'https://www.blueorigin.com/new-shepard/', t: 'core' },
    {
      l: 'NS-16 first crewed flight (Blue Origin)',
      u: 'https://www.blueorigin.com/news/first-human-flight-updates',
      t: 'deep',
    },
  ],
  'soyuz-7k-ok': [
    { l: 'Soyuz 7K-OK — Wikipedia', u: 'https://en.wikipedia.org/wiki/Soyuz_7K-OK', t: 'intro' },
    { l: 'Союз — Роскосмос', u: 'https://www.roscosmos.ru/24180/', t: 'core' },
    {
      l: 'Soyuz 1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1967-037A',
      t: 'deep',
    },
  ],
  'soyuz-t': [
    { l: 'Soyuz-T — Wikipedia', u: 'https://en.wikipedia.org/wiki/Soyuz-T', t: 'intro' },
    { l: 'Союз-Т — Роскосмос', u: 'https://www.roscosmos.ru/24180/', t: 'core' },
    {
      l: 'Soyuz T-1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1979-103A',
      t: 'deep',
    },
  ],
  'soyuz-tm': [
    { l: 'Soyuz-TM — Wikipedia', u: 'https://en.wikipedia.org/wiki/Soyuz-TM', t: 'intro' },
    { l: 'Союз-ТМ — Роскосмос', u: 'https://www.roscosmos.ru/24181/', t: 'core' },
    {
      l: 'Soyuz TM-1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1986-035A',
      t: 'deep',
    },
  ],
  'soyuz-tma': [
    { l: 'Soyuz-TMA — Wikipedia', u: 'https://en.wikipedia.org/wiki/Soyuz-TMA', t: 'intro' },
    { l: 'Союз-ТМА — Роскосмос', u: 'https://www.roscosmos.ru/24181/', t: 'core' },
    {
      l: 'Soyuz TMA-1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2002-050A',
      t: 'deep',
    },
  ],
  voskhod: [
    {
      l: 'Voskhod (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Voskhod_(spacecraft)',
      t: 'intro',
    },
    { l: 'Восход — Роскосмос', u: 'https://www.roscosmos.ru/24178/', t: 'core' },
    {
      l: 'Voskhod 2 (first spacewalk) — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1965-022A',
      t: 'deep',
    },
  ],

  // Landers (18)
  beresheet: [
    { l: 'Beresheet — Wikipedia', u: 'https://en.wikipedia.org/wiki/Beresheet', t: 'intro' },
    {
      l: 'Beresheet — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2019-009B',
      t: 'core',
    },
    {
      l: 'SpaceIL Beresheet final report (Wikipedia)',
      u: 'https://en.wikipedia.org/wiki/Beresheet#Mission_failure',
      t: 'deep',
    },
  ],
  'change-3': [
    { l: "Chang'e 3 — Wikipedia", u: 'https://en.wikipedia.org/wiki/Chang%27e_3', t: 'intro' },
    { l: '嫦娥三号 — CNSA', u: 'https://www.cnsa.gov.cn/', t: 'core' },
    {
      l: "Chang'e 3 — NASA NSSDCA",
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2013-070A',
      t: 'deep',
    },
  ],
  'change-4': [
    { l: "Chang'e 4 — Wikipedia", u: 'https://en.wikipedia.org/wiki/Chang%27e_4', t: 'intro' },
    { l: '嫦娥四号 — CNSA', u: 'https://www.cnsa.gov.cn/', t: 'core' },
    {
      l: "Chang'e 4 — NASA NSSDCA",
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2018-103A',
      t: 'deep',
    },
  ],
  'change-5': [
    { l: "Chang'e 5 — Wikipedia", u: 'https://en.wikipedia.org/wiki/Chang%27e_5', t: 'intro' },
    { l: '嫦娥五号 — CNSA', u: 'https://www.cnsa.gov.cn/', t: 'core' },
    {
      l: "Chang'e 5 — NASA NSSDCA",
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2020-087A',
      t: 'deep',
    },
  ],
  'hakuto-r': [
    { l: 'Hakuto-R — Wikipedia', u: 'https://en.wikipedia.org/wiki/Hakuto-R', t: 'intro' },
    {
      l: 'Hakuto-R Mission 1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2022-168A',
      t: 'core',
    },
    {
      l: 'Hakuto-R Mission 2 (RESILIENCE)',
      u: 'https://en.wikipedia.org/wiki/Hakuto-R_Mission_2',
      t: 'deep',
    },
  ],
  'im-1-odysseus': [
    { l: 'IM-1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/IM-1', t: 'intro' },
    {
      l: 'CLPS — NASA',
      u: 'https://www.nasa.gov/commercial-lunar-payload-services/',
      t: 'core',
    },
    {
      l: 'Intuitive Machines IM-1 mission summary (NASA)',
      u: 'https://www.nasa.gov/mission/clps-im-1/',
      t: 'deep',
    },
  ],
  insight: [
    { l: 'InSight — Wikipedia', u: 'https://en.wikipedia.org/wiki/InSight', t: 'intro' },
    { l: 'InSight — NASA Mars', u: 'https://mars.nasa.gov/insight/', t: 'core' },
    {
      l: 'InSight final mission report (NASA)',
      u: 'https://mars.nasa.gov/insight/mission/overview/',
      t: 'deep',
    },
  ],
  'luna-16': [
    { l: 'Luna 16 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Luna_16', t: 'intro' },
    {
      l: 'Лунная программа — Роскосмос',
      u: 'https://www.roscosmos.ru/24187/',
      t: 'core',
    },
    {
      l: 'Luna 16 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1970-072A',
      t: 'deep',
    },
  ],
  'mars-2': [
    { l: 'Mars 2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Mars_2', t: 'intro' },
    { l: 'Марс — Роскосмос', u: 'https://www.roscosmos.ru/24186/', t: 'core' },
    {
      l: 'Mars 2 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-045A',
      t: 'deep',
    },
  ],
  'mars-3': [
    { l: 'Mars 3 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Mars_3', t: 'intro' },
    { l: 'Марс — Роскосмос', u: 'https://www.roscosmos.ru/24186/', t: 'core' },
    {
      l: 'Mars 3 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-049A',
      t: 'deep',
    },
  ],
  'mars-polar-lander': [
    {
      l: 'Mars Polar Lander — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Mars_Polar_Lander',
      t: 'intro',
    },
    {
      l: 'Mars Polar Lander — NASA',
      u: 'https://mars.nasa.gov/mars-exploration/missions/mars-polar-lander/',
      t: 'core',
    },
    {
      l: 'MPL Failure Review Report (NASA NTRS)',
      u: 'https://mars.nasa.gov/mars-exploration/missions/mars-polar-lander/',
      t: 'deep',
    },
  ],
  phoenix: [
    {
      l: 'Phoenix — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Phoenix_(spacecraft)',
      t: 'intro',
    },
    {
      l: 'Phoenix Mars Mission — NASA',
      u: 'https://mars.nasa.gov/mars-exploration/missions/phoenix/',
      t: 'core',
    },
    {
      l: 'Phoenix Mission Profile (NASA)',
      u: 'https://www.nasa.gov/mission/phoenix-mars-lander/',
      t: 'deep',
    },
  ],
  schiaparelli: [
    {
      l: 'Schiaparelli EDM — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Schiaparelli_EDM',
      t: 'intro',
    },
    {
      l: 'ExoMars Schiaparelli — ESA',
      u: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/Schiaparelli_to_test_key_technologies',
      t: 'core',
    },
    {
      l: 'Schiaparelli landing investigation (ESA)',
      u: 'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Exploration/ExoMars/Schiaparelli_landing_investigation_completed',
      t: 'deep',
    },
  ],
  slim: [
    {
      l: 'SLIM — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Smart_Lander_for_Investigating_Moon',
      t: 'intro',
    },
    { l: 'SLIM — JAXA', u: 'https://global.jaxa.jp/projects/sas/slim/', t: 'core' },
    {
      l: 'SLIM mission overview (JAXA)',
      u: 'https://www.jaxa.jp/projects/sas/slim/',
      t: 'deep',
    },
  ],
  'surveyor-3': [
    { l: 'Surveyor 3 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Surveyor_3', t: 'intro' },
    {
      l: 'Surveyor — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/surveyor.html',
      t: 'core',
    },
    {
      l: 'Apollo 12 visited Surveyor 3 (NASA)',
      u: 'https://www.nasa.gov/centers-and-facilities/johnson/apollo-12-and-surveyor-3/',
      t: 'deep',
    },
  ],
  'venera-7': [
    { l: 'Venera 7 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Venera_7', t: 'intro' },
    {
      l: 'Venera programme — Roscosmos',
      u: 'https://www.roscosmos.ru/24189/',
      t: 'core',
    },
    {
      l: 'Venera 7 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1970-060A',
      t: 'deep',
    },
  ],
  'vikram-cy2': [
    {
      l: 'Chandrayaan-2 — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Chandrayaan-2',
      t: 'intro',
    },
    { l: 'Chandrayaan-2 — ISRO', u: 'https://www.isro.gov.in/Chandrayaan2.html', t: 'core' },
    {
      l: 'Chandrayaan-2 lander failure analysis (ISRO)',
      u: 'https://www.isro.gov.in/Chandrayaan2_announcement.html',
      t: 'deep',
    },
  ],
  'vikram-cy3': [
    {
      l: 'Chandrayaan-3 — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Chandrayaan-3',
      t: 'intro',
    },
    { l: 'Chandrayaan-3 — ISRO', u: 'https://www.isro.gov.in/Chandrayaan_3.html', t: 'core' },
    {
      l: 'Chandrayaan-3 mission summary (ISRO)',
      u: 'https://www.isro.gov.in/Chandrayaan3_New.html',
      t: 'deep',
    },
  ],

  // Launchers (13)
  'ariane-6': [
    { l: 'Ariane 6 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Ariane_6', t: 'intro' },
    {
      l: 'Ariane 6 — ESA',
      u: 'https://www.esa.int/Enabling_Support/Space_Transportation/Ariane_6',
      t: 'core',
    },
    {
      l: 'Ariane 6 maiden flight VA262 (ESA)',
      u: 'https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_6_inaugural_flight',
      t: 'deep',
    },
  ],
  'atlas-lv-3b': [
    { l: 'Atlas LV-3B — Wikipedia', u: 'https://en.wikipedia.org/wiki/Atlas_LV-3B', t: 'intro' },
    {
      l: 'Project Mercury launches — NASA',
      u: 'https://www.nasa.gov/mission/mercury/',
      t: 'core',
    },
    {
      l: 'Mercury-Atlas 6 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1962-003A',
      t: 'deep',
    },
  ],
  energia: [
    {
      l: 'Energia (rocket) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Energia_(rocket)',
      t: 'intro',
    },
    { l: 'Программа «Энергия» — Роскосмос', u: 'https://www.roscosmos.ru/30025/', t: 'core' },
    {
      l: 'Polyus / Energia 1987 launch (NSSDCA)',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1987-044A',
      t: 'deep',
    },
  ],
  'h-iia': [
    { l: 'H-IIA — Wikipedia', u: 'https://en.wikipedia.org/wiki/H-IIA', t: 'intro' },
    { l: 'H-IIA — JAXA', u: 'https://global.jaxa.jp/projects/rockets/h2a/', t: 'core' },
    {
      l: 'H-IIA technical overview (JAXA)',
      u: 'https://www.jaxa.jp/projects/rockets/h2a/',
      t: 'deep',
    },
  ],
  h3: [
    { l: 'H3 (rocket) — Wikipedia', u: 'https://en.wikipedia.org/wiki/H3_(rocket)', t: 'intro' },
    { l: 'H3 — JAXA', u: 'https://global.jaxa.jp/projects/rockets/h3/', t: 'core' },
    {
      l: 'H3 development history (JAXA)',
      u: 'https://www.jaxa.jp/projects/rockets/h3/',
      t: 'deep',
    },
  ],
  'long-march-2f': [
    {
      l: 'Long March 2F — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Long_March_2F',
      t: 'intro',
    },
    { l: '长征二号F — CMSA', u: 'http://en.cmse.gov.cn/', t: 'core' },
    {
      l: 'Long March 2F flight history (Wikipedia)',
      u: 'https://en.wikipedia.org/wiki/List_of_Long_March_launches',
      t: 'deep',
    },
  ],
  'long-march-7': [
    { l: 'Long March 7 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Long_March_7', t: 'intro' },
    { l: '长征七号 — CMSA', u: 'http://en.cmse.gov.cn/', t: 'core' },
    {
      l: 'Long March 7 launches (Wikipedia)',
      u: 'https://en.wikipedia.org/wiki/List_of_Long_March_launches',
      t: 'deep',
    },
  ],
  lvm3: [
    { l: 'LVM3 — Wikipedia', u: 'https://en.wikipedia.org/wiki/LVM3', t: 'intro' },
    { l: 'LVM3 — ISRO', u: 'https://www.isro.gov.in/LVM3.html', t: 'core' },
    {
      l: 'LVM3 launch history (ISRO)',
      u: 'https://www.isro.gov.in/LVM3_M2_Mission.html',
      t: 'deep',
    },
  ],
  'proton-m': [
    { l: 'Proton-M — Wikipedia', u: 'https://en.wikipedia.org/wiki/Proton-M', t: 'intro' },
    { l: 'Протон-М — Роскосмос', u: 'https://www.roscosmos.ru/24171/', t: 'core' },
    {
      l: 'Proton-M flight history (Wikipedia)',
      u: 'https://en.wikipedia.org/wiki/List_of_Proton_launches',
      t: 'deep',
    },
  ],
  'saturn-ib': [
    { l: 'Saturn IB — Wikipedia', u: 'https://en.wikipedia.org/wiki/Saturn_IB', t: 'intro' },
    {
      l: 'Saturn IB — NASA Apollo',
      u: 'https://www.nasa.gov/history/saturn-ib/',
      t: 'core',
    },
    {
      l: 'Apollo 7 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1968-089A',
      t: 'deep',
    },
  ],
  'soyuz-fg': [
    { l: 'Soyuz-FG — Wikipedia', u: 'https://en.wikipedia.org/wiki/Soyuz-FG', t: 'intro' },
    { l: 'Союз-ФГ — Роскосмос', u: 'https://www.roscosmos.ru/24180/', t: 'core' },
    {
      l: 'Soyuz-FG flight history (Wikipedia)',
      u: 'https://en.wikipedia.org/wiki/Soyuz-FG#Launch_history',
      t: 'deep',
    },
  ],
  'soyuz-u': [
    { l: 'Soyuz-U — Wikipedia', u: 'https://en.wikipedia.org/wiki/Soyuz-U', t: 'intro' },
    { l: 'Союз-У — Роскосмос', u: 'https://www.roscosmos.ru/24180/', t: 'core' },
    {
      l: 'Soyuz-U launch history (Wikipedia)',
      u: 'https://en.wikipedia.org/wiki/List_of_Soyuz_launches',
      t: 'deep',
    },
  ],
  'titan-ii-glv': [
    {
      l: 'Titan II GLV — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Titan_II_GLV',
      t: 'intro',
    },
    {
      l: 'Project Gemini launches — NASA',
      u: 'https://www.nasa.gov/mission/gemini/',
      t: 'core',
    },
    {
      l: 'Gemini-Titan launch history (NASA)',
      u: 'https://history.nasa.gov/SP-4203/toc.htm',
      t: 'deep',
    },
  ],

  // Observatories (6)
  'compton-gro': [
    {
      l: 'Compton Gamma Ray Observatory — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Compton_Gamma_Ray_Observatory',
      t: 'intro',
    },
    {
      l: 'CGRO — NASA HEASARC',
      u: 'https://heasarc.gsfc.nasa.gov/docs/cgro/',
      t: 'core',
    },
    {
      l: 'Compton Observatory archive (NASA)',
      u: 'https://heasarc.gsfc.nasa.gov/docs/cgro/cgro/cgro_about.html',
      t: 'deep',
    },
  ],
  euclid: [
    {
      l: 'Euclid (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Euclid_(spacecraft)',
      t: 'intro',
    },
    {
      l: 'Euclid — ESA',
      u: 'https://www.esa.int/Science_Exploration/Space_Science/Euclid',
      t: 'core',
    },
    {
      l: 'Euclid mission overview (ESA)',
      u: 'https://www.esa.int/Science_Exploration/Space_Science/Euclid_overview',
      t: 'deep',
    },
  ],
  hitomi: [
    {
      l: 'Hitomi (satellite) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Hitomi_(satellite)',
      t: 'intro',
    },
    { l: 'ASTRO-H Hitomi — JAXA', u: 'https://global.jaxa.jp/projects/sas/astro_h/', t: 'core' },
    {
      l: 'Hitomi anomaly investigation (JAXA)',
      u: 'https://www.jaxa.jp/projects/sas/astro_h/',
      t: 'deep',
    },
  ],
  'spektr-rg': [
    { l: 'Spektr-RG — Wikipedia', u: 'https://en.wikipedia.org/wiki/Spektr-RG', t: 'intro' },
    { l: 'Спектр-РГ — Роскосмос', u: 'https://www.roscosmos.ru/24209/', t: 'core' },
    {
      l: 'Spektr-RG — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2019-040A',
      t: 'deep',
    },
  ],
  tess: [
    {
      l: 'TESS — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Transiting_Exoplanet_Survey_Satellite',
      t: 'intro',
    },
    { l: 'TESS — NASA', u: 'https://science.nasa.gov/mission/tess/', t: 'core' },
    {
      l: 'TESS mission documentation (MIT)',
      u: 'https://heasarc.gsfc.nasa.gov/docs/tess/',
      t: 'deep',
    },
  ],
  'xmm-newton': [
    { l: 'XMM-Newton — Wikipedia', u: 'https://en.wikipedia.org/wiki/XMM-Newton', t: 'intro' },
    {
      l: 'XMM-Newton — ESA',
      u: 'https://www.esa.int/Science_Exploration/Space_Science/XMM-Newton',
      t: 'core',
    },
    {
      l: 'XMM-Newton operations (ESA)',
      u: 'https://www.cosmos.esa.int/web/xmm-newton',
      t: 'deep',
    },
  ],

  // Orbiters (12)
  'change-2': [
    { l: "Chang'e 2 — Wikipedia", u: 'https://en.wikipedia.org/wiki/Chang%27e_2', t: 'intro' },
    { l: '嫦娥二号 — CNSA', u: 'https://www.cnsa.gov.cn/', t: 'core' },
    {
      l: "Chang'e 2 — NASA NSSDCA",
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2010-050A',
      t: 'deep',
    },
  ],
  dart: [
    {
      l: 'DART — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Double_Asteroid_Redirection_Test',
      t: 'intro',
    },
    { l: 'DART — NASA', u: 'https://science.nasa.gov/mission/dart/', t: 'core' },
    {
      l: 'DART final report (NASA NTRS)',
      u: 'https://www.nasa.gov/feature/dart/dart-mission-summary',
      t: 'deep',
    },
  ],
  'hayabusa-2': [
    { l: 'Hayabusa2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Hayabusa2', t: 'intro' },
    { l: 'Hayabusa2 — JAXA', u: 'https://global.jaxa.jp/projects/sas/hayabusa2/', t: 'core' },
    {
      l: 'Hayabusa2 mission overview (JAXA)',
      u: 'https://www.hayabusa2.jaxa.jp/en/',
      t: 'deep',
    },
  ],
  magellan: [
    {
      l: 'Magellan (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Magellan_(spacecraft)',
      t: 'intro',
    },
    { l: 'Magellan — NASA', u: 'https://science.nasa.gov/mission/magellan/', t: 'core' },
    {
      l: 'Magellan — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1989-033B',
      t: 'deep',
    },
  ],
  mangalyaan: [
    {
      l: 'Mars Orbiter Mission — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Mars_Orbiter_Mission',
      t: 'intro',
    },
    { l: 'MOM — ISRO', u: 'https://www.isro.gov.in/MOM_Home.html', t: 'core' },
    {
      l: 'Mars Orbiter Mission Profile (ISRO)',
      u: 'https://www.isro.gov.in/Mars_Orbiter_Mission.html',
      t: 'deep',
    },
  ],
  'mariner-4': [
    { l: 'Mariner 4 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Mariner_4', t: 'intro' },
    {
      l: 'Mariner 4 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-077A',
      t: 'core',
    },
    {
      l: 'On Mars: Exploration of the Red Planet 1958-1978 (NASA SP-4212)',
      u: 'https://history.nasa.gov/SP-4212/toc.html',
      t: 'deep',
    },
  ],
  'mars-express': [
    { l: 'Mars Express — Wikipedia', u: 'https://en.wikipedia.org/wiki/Mars_Express', t: 'intro' },
    {
      l: 'Mars Express — ESA',
      u: 'https://www.esa.int/Science_Exploration/Space_Science/Mars_Express',
      t: 'core',
    },
    {
      l: 'Mars Express science highlights (ESA)',
      u: 'https://www.esa.int/Science_Exploration/Space_Science/Mars_Express/Mars_Express_in-depth',
      t: 'deep',
    },
  ],
  mro: [
    {
      l: 'Mars Reconnaissance Orbiter — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Mars_Reconnaissance_Orbiter',
      t: 'intro',
    },
    { l: 'MRO — NASA Mars', u: 'https://mars.nasa.gov/mro/', t: 'core' },
    {
      l: 'MRO HiRISE imagery archive (NASA)',
      u: 'https://www.nasa.gov/mission/mars-reconnaissance-orbiter/',
      t: 'deep',
    },
  ],
  'osiris-rex': [
    { l: 'OSIRIS-REx — Wikipedia', u: 'https://en.wikipedia.org/wiki/OSIRIS-REx', t: 'intro' },
    { l: 'OSIRIS-REx — NASA', u: 'https://science.nasa.gov/mission/osiris-rex/', t: 'core' },
    {
      l: 'OSIRIS-APEx (extended mission)',
      u: 'https://www.nasa.gov/mission/osiris-apex/',
      t: 'deep',
    },
  ],
  'phobos-2': [
    { l: 'Phobos 2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Phobos_2', t: 'intro' },
    { l: 'Программа «Фобос» — Роскосмос', u: 'https://www.roscosmos.ru/24190/', t: 'core' },
    {
      l: 'Phobos 2 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1988-059A',
      t: 'deep',
    },
  ],
  'pioneer-10': [
    { l: 'Pioneer 10 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Pioneer_10', t: 'intro' },
    {
      l: 'Pioneer — NASA',
      u: 'https://science.nasa.gov/mission/pioneer/',
      t: 'core',
    },
    {
      l: 'Pioneer 10 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1972-012A',
      t: 'deep',
    },
  ],
  rosetta: [
    {
      l: 'Rosetta (spacecraft) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Rosetta_(spacecraft)',
      t: 'intro',
    },
    {
      l: 'Rosetta — ESA',
      u: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta',
      t: 'core',
    },
    {
      l: 'Rosetta science highlights (ESA)',
      u: 'https://www.esa.int/Science_Exploration/Space_Science/Rosetta/Rosetta_overview',
      t: 'deep',
    },
  ],

  // Rovers (7)
  'lunokhod-2': [
    { l: 'Lunokhod 2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Lunokhod_2', t: 'intro' },
    { l: 'Луноход — Роскосмос', u: 'https://www.roscosmos.ru/24187/', t: 'core' },
    {
      l: 'Lunokhod 2 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1973-001A',
      t: 'deep',
    },
  ],
  opportunity: [
    {
      l: 'Opportunity (rover) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Opportunity_(rover)',
      t: 'intro',
    },
    { l: 'Mars Exploration Rover — NASA', u: 'https://mars.nasa.gov/mer/', t: 'core' },
    {
      l: 'MER mission profile (NASA NTRS)',
      u: 'https://mars.nasa.gov/mer/mission/overview/',
      t: 'deep',
    },
  ],
  pragyan: [
    {
      l: 'Pragyan (rover) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Pragyan_(rover)',
      t: 'intro',
    },
    { l: 'Chandrayaan-3 — ISRO', u: 'https://www.isro.gov.in/Chandrayaan_3.html', t: 'core' },
    {
      l: 'Chandrayaan-3 surface results (ISRO)',
      u: 'https://www.isro.gov.in/Chandrayaan3_New.html',
      t: 'deep',
    },
  ],
  spirit: [
    {
      l: 'Spirit (rover) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Spirit_(rover)',
      t: 'intro',
    },
    { l: 'Mars Exploration Rover — NASA', u: 'https://mars.nasa.gov/mer/', t: 'core' },
    {
      l: 'MER mission profile (NASA NTRS)',
      u: 'https://mars.nasa.gov/mer/mission/overview/',
      t: 'deep',
    },
  ],
  yutu: [
    { l: 'Yutu (rover) — Wikipedia', u: 'https://en.wikipedia.org/wiki/Yutu_(rover)', t: 'intro' },
    { l: '玉兔号月球车 — CNSA', u: 'https://www.cnsa.gov.cn/', t: 'core' },
    {
      l: "Chang'e 3 / Yutu — NASA NSSDCA",
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2013-070A',
      t: 'deep',
    },
  ],
  'yutu-2': [
    { l: 'Yutu-2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Yutu-2', t: 'intro' },
    { l: '玉兔二号 — CNSA', u: 'https://www.cnsa.gov.cn/', t: 'core' },
    {
      l: "Chang'e 4 / Yutu-2 — NASA NSSDCA",
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2018-103A',
      t: 'deep',
    },
  ],
  zhurong: [
    {
      l: 'Zhurong (rover) — Wikipedia',
      u: 'https://en.wikipedia.org/wiki/Zhurong_(rover)',
      t: 'intro',
    },
    { l: '祝融号火星车 — CNSA', u: 'https://www.cnsa.gov.cn/', t: 'core' },
    {
      l: 'Tianwen-1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2020-049A',
      t: 'deep',
    },
  ],

  // Stations (4)
  'salyut-6': [
    { l: 'Salyut 6 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Salyut_6', t: 'intro' },
    { l: 'Салют-6 — Роскосмос', u: 'https://www.roscosmos.ru/24178/', t: 'core' },
    {
      l: 'Salyut 6 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1977-097A',
      t: 'deep',
    },
  ],
  'salyut-7': [
    { l: 'Salyut 7 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Salyut_7', t: 'intro' },
    { l: 'Салют-7 — Роскосмос', u: 'https://www.roscosmos.ru/24178/', t: 'core' },
    {
      l: 'Salyut 7 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1982-033A',
      t: 'deep',
    },
  ],
  'tiangong-1': [
    { l: 'Tiangong-1 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Tiangong-1', t: 'intro' },
    { l: '天宫一号 — CMSA', u: 'http://en.cmse.gov.cn/', t: 'core' },
    {
      l: 'Tiangong-1 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2011-053A',
      t: 'deep',
    },
  ],
  'tiangong-2': [
    { l: 'Tiangong-2 — Wikipedia', u: 'https://en.wikipedia.org/wiki/Tiangong-2', t: 'intro' },
    { l: '天宫二号 — CMSA', u: 'http://en.cmse.gov.cn/', t: 'core' },
    {
      l: 'Tiangong-2 — NASA NSSDCA',
      u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2016-057A',
      t: 'deep',
    },
  ],
};

async function main() {
  const indexJson = JSON.parse(
    await readFile(join(FLEET_DIR, 'index.json'), 'utf-8'),
  ) as IndexEntry[];
  const fleetCategoryById = new Map(indexJson.map((r) => [r.id, r.category]));

  let updated = 0;
  let skipped = 0;
  for (const [fleetId, links] of Object.entries(CURATED)) {
    const category = fleetCategoryById.get(fleetId);
    if (!category) {
      console.warn(`  ⚠ unknown fleet id ${fleetId}`);
      continue;
    }
    const path = join(FLEET_DIR, category, `${fleetId}.json`);
    const entry = JSON.parse(await readFile(path, 'utf-8')) as Record<string, unknown>;
    entry.links = links;
    await writeFile(path, JSON.stringify(entry, null, 2) + '\n', 'utf-8');
    updated += 1;
  }
  // Long-tail entries: keep their existing single Wikipedia link
  // (already authored by Phase A scaffold).
  for (const fleetId of fleetCategoryById.keys()) {
    if (CURATED[fleetId]) continue;
    skipped += 1;
  }
  console.log(
    `LEARN-link migration: ${updated} entries got 3-tier curation; ${skipped} kept their Phase A scaffold link`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
