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
