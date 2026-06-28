#!/usr/bin/env tsx
/**
 * One-shot migration: generates en-US locale overlay files for every
 * fleet entry per ADR-017 / PRD-012 v0.2 Phase G.
 *
 * Strategy:
 *   - Marquee tier (~50 entries) gets a hand-curated 2–3 sentence
 *     description specific to the hardware's history + significance.
 *   - Long-tail entries use a category-aware template that composes a
 *     serviceable paragraph from the existing base fields (tagline +
 *     manufacturer + country + first_flight + status). Reads naturally
 *     and avoids template-y phrasing where possible.
 *
 * Run after Phase A scaffold:
 *   tsx scripts/migrate-fleet-en-us-overlays.ts
 *
 * Re-runnable: existing files at the target paths are OVERWRITTEN.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const FLEET_DIR = join(ROOT, 'static/data/fleet');
const OVERLAY_DIR = join(ROOT, 'static/data/i18n/en-US/fleet');

type IndexEntry = {
  id: string;
  name: string;
  category: string;
  agency: string;
  country: string;
  era: string;
  epoch: string;
  status: string;
  first_flight: string;
  tagline: string;
};

type DetailEntry = IndexEntry & {
  manufacturer: string;
  best_known_for?: string;
};

/**
 * Hand-curated descriptions for the marquee tier — written for the
 * /fleet OVERVIEW tab to read as a 2–3 sentence editorial paragraph.
 */
const CURATED: Record<string, string> = {
  // Launchers
  'saturn-v':
    'The 110.6 m three-stage rocket that put 24 humans on a translunar trajectory and 12 of them on the lunar surface. Thirteen launches between 1967 and 1973, zero losses on ascent. Still the most powerful rocket ever to fly successfully.',
  'r-7-vostok':
    'The launcher that put Sputnik in orbit in 1957 and Yuri Gagarin into space in 1961. A direct ancestor of every Soyuz rocket flown since — the longest production lineage in spaceflight, with thousands of flights across six decades.',
  'space-shuttle-stack':
    'The reusable orbiter, external tank, and twin solid rocket boosters that flew 135 missions between 1981 and 2011. Built the ISS, deployed and serviced Hubble, and demonstrated the engineering trade-offs of a partially-reusable crewed launcher.',
  'falcon-9':
    'SpaceX’s Block 5 booster, designed for ten flights without refurbishment. The first orbital-class rocket to land and re-fly itself, fundamentally reshaping the commercial-launch market and dropping the cost-to-orbit by roughly an order of magnitude.',
  'falcon-heavy':
    'Three Falcon 9 first-stage cores strapped together, with the two side boosters returning to land while the center core lands downrange on a drone ship. Currently the second-most-powerful operational rocket after SLS, with payload capacity rivalling Saturn V on a cost-per-kg basis far below it.',
  'sls-block-1':
    'NASA’s super-heavy successor to the Space Shuttle stack, sharing its RS-25 engines and SRB heritage. Carried Orion on Artemis I in 2022; planned to launch crewed lunar missions through Artemis IV.',
  n1: 'The Soviet Union’s answer to Saturn V — a 105 m super-heavy rocket with thirty NK-15 engines on the first stage. All four launches between 1969 and 1972 failed; the program was cancelled when Apollo 17 ended any chance of a Soviet crewed lunar landing.',
  energia:
    'The only Soviet super-heavy launcher to fly. Designed to carry the Buran orbiter or stand-alone payloads up to 100 t to LEO. Two flights, both successful, before the program was shelved at the end of the Cold War.',
  'ariane-5':
    'ESA’s long-running heavy lifter, retired in 2023 after 117 launches. Carried Rosetta to comet 67P, JWST to L2, and dual-manifested geostationary commercial payloads for two decades.',
  'atlas-v':
    'The reliable workhorse of United Launch Alliance, with over 100 successful launches since 2002. Carried Curiosity, Perseverance, MAVEN, MRO, New Horizons, and many of the most consequential US planetary missions of the 21st century.',
  'long-march-5':
    'China’s first heavy-lift launcher, capable of putting 25 t to LEO. Lifts the Tiangong space station modules and Tianwen Mars probes; Long March 5B is the variant used for station modules.',

  // Crewed spacecraft
  vostok:
    'The spherical descent module that returned Yuri Gagarin from orbit on 1961-04-12 — the first human spaceflight. Six crewed flights between 1961 and 1963, including Valentina Tereshkova’s solo orbital mission as the first woman in space.',
  voskhod:
    'A modified Vostok refitted to carry up to three cosmonauts. Two crewed flights — Voskhod 1 (first multi-crew) and Voskhod 2 (Alexei Leonov’s first spacewalk in 1965). Pushed beyond the design margin and was retired in favour of Soyuz.',
  'mercury-capsule':
    'The cone-shaped capsule that carried six American astronauts on Project Mercury between 1961 and 1963. Tiny enough that John Glenn famously described being "spam in a can" — but it proved orbital flight was achievable for the United States.',
  gemini:
    'The two-person spacecraft that taught NASA how to rendezvous, dock, and walk in space — the techniques that made Apollo possible. Ten crewed flights between 1965 and 1966, every one a step toward the Moon.',
  'soyuz-7k-ok':
    'The first generation of Soyuz, with all the architectural choices that have endured for sixty years: orbital module sphere, descent module, service module with deployable solar arrays. Tragically introduced by Soyuz 1 (Komarov’s fatal flight, 1967).',
  'apollo-csm-block-ii':
    'The lunar-capable Command and Service Module that carried Apollo astronauts to lunar orbit between 1968 and 1972. Eleven flights — including Apollo 13’s improvised lifeboat configuration — plus three Skylab visits and the Apollo-Soyuz Test Project.',
  'apollo-lm':
    'The only crewed lunar lander ever built. Six successful landings between 1969 and 1972 — Eagle, Intrepid, Antares, Falcon, Orion, Challenger — plus Aquarius, which served as Apollo 13’s lifeboat. Descent stage stays on the Moon; ascent stage rejoined the CSM in lunar orbit.',
  'soyuz-t':
    'The 1979–1986 Salyut-era Soyuz with three-cosmonaut capacity restored after the Soyuz 11 fatal decompression. Modernised avionics and hypergolic propulsion; the bridge between the original 7K-OK and the long-running TM/TMA/MS lineage.',
  'space-shuttle-orbiter':
    'The reusable winged spacecraft that flew 135 missions between 1981 and 2011 — the only crewed vehicle ever to land like a glider. Five flight orbiters were built (Columbia, Challenger, Discovery, Atlantis, Endeavour); Columbia and Challenger were lost with their crews.',
  buran:
    'The Soviet shuttle, externally similar to the American orbiter but with no main engines (Energia carried it). Flew exactly once, in 1988, fully autonomous and unmanned — the only Soviet shuttle to ever reach orbit before the program ended.',
  'soyuz-tm':
    'The Mir-era Soyuz (1986–2002), with redesigned avionics and the new Kurs automated docking system. Flew Soviet, Russian, and partner-country cosmonauts to Mir for 15 years.',
  'soyuz-tma':
    'The ISS-era Soyuz (2002–2012), with a digital flight computer and a wider crew-height envelope to accommodate the international partner astronaut corps. Carried the first space tourists alongside professional crews.',
  shenzhou:
    'China’s crewed spacecraft, externally Soyuz-derived but enlarged. First crewed flight in 2003 (Shenzhou 5, Yang Liwei); now the standard ferry to Tiangong, with crew rotations every six months.',
  'soyuz-ms':
    'The current Soyuz generation, in service since 2016. New software and GLONASS/GPS-aided rendezvous makes ISS docking possible in as little as 3 hours. Continues to be the most-flown crewed spacecraft in history.',
  'crew-dragon':
    'SpaceX’s human-rated spacecraft, the first commercial vehicle to carry humans to orbit (Demo-2, 2020). The trunk’s body-mounted solar cells differ visibly from every other crewed spacecraft’s deployable wings.',
  starliner:
    'Boeing’s Commercial Crew vehicle, with a pusher launch-abort system using its own service-module thrusters. Crew Flight Test launched in 2024 with Butch Wilmore and Suni Williams.',
  'new-shepard':
    'Blue Origin’s suborbital crewed spacecraft, named for Alan Shepard. Reusable booster + capsule architecture, with the capsule landing under parachutes. Crewed since 2021; carried Jeff Bezos, William Shatner, and others on brief suborbital flights.',
  orion:
    'The crew vehicle for NASA’s Artemis program, built jointly with ESA (the European Service Module is provided by Airbus). Designed to support up to four astronauts on multi-week missions to lunar orbit. Flew uncrewed on Artemis I in 2022.',
  gaganyaan:
    'India’s first crewed spacecraft, planned for 2026 launch on the LVM3. Three astronauts on a roughly seven-day low-Earth-orbit mission — the start of an Indian human-spaceflight programme.',

  // Cargo spacecraft
  'progress-7k-tg':
    'The first robotic cargo spacecraft, derived from Soyuz. Forty-three Progress flights to Salyut and early Mir between 1978 and 1990 established the architecture every subsequent ISS resupply has followed.',
  'cargo-dragon-v1':
    'The first commercial spacecraft to ever resupply the ISS (COTS-2, 2012). Twenty pressurized-cargo flights between 2010 and 2020 before the upgraded Dragon 2 took over.',
  'cargo-dragon-2':
    'The crewless variant of Crew Dragon, with the same body-mounted solar cells on the trunk. Differs visibly from Cygnus (round arrays) and Soyuz/Progress (rectangular wings). Returns intact with downmass — unique among ISS cargo carriers.',
  'cygnus-enhanced':
    'Northrop Grumman’s pressurised-cargo carrier, recognisable by its round UltraFlex solar arrays — a fan-fold accordion pattern shared with no other ISS visitor. Burns up on reentry; no downmass.',
  tianzhou:
    'China’s cargo spacecraft for the Tiangong space station, derived from the Tiangong-1 module bus. Refuels Tiangong’s propellant tanks and delivers experiment racks; first flight in 2017.',

  // Stations
  'salyut-1':
    'The world’s first space station — launched 1971, occupied for 23 days by the Soyuz 11 crew (Dobrovolski, Volkov, Patsayev), all of whom died on return when their capsule depressurised. Salyut 1 was deorbited later that year.',
  skylab:
    'America’s first space station, built from a Saturn V S-IVB upper stage. Three crews of three each lived aboard between 1973 and 1974, conducting solar observations and zero-g experiments. Reentered uncontrolled over Australia in 1979.',
  'salyut-6':
    'The first multi-port Salyut, capable of receiving Progress resupply ships and rotating long-duration crews. Continuously occupied (with breaks) for nearly five years between 1977 and 1982 — the model for every modular station that followed.',
  'salyut-7':
    'The last Salyut, in service 1982–1991. Famously revived by Vladimir Dzhanibekov and Viktor Savinykh in 1985 after losing power and tumbling — the first orbital salvage mission. Reentered uncontrolled in 1991 over Argentina.',
  mir: 'The first modular space station, assembled in orbit between 1986 and 1996 and continuously occupied for nearly a decade through 2000. Hosted American astronauts during the Shuttle-Mir program (1995–1998) — the partnership that made ISS possible.',
  iss: 'The International Space Station — humanity’s longest continuously crewed habitat, occupied since November 2000. Assembled across more than 40 launches by NASA, Roscosmos, ESA, JAXA, and CSA. Currently scheduled for deorbit around 2031.',
  tiangong:
    'China’s modular space station — Tianhe core plus Wentian and Mengtian science labs, fully assembled in October 2022 and continuously crewed since June 2022. Roughly the mass and volume of Mir; the only currently-operational space station outside ISS.',

  // Rovers
  'lunokhod-1':
    'The first wheeled vehicle to roam another world. Operated for ten months on the Moon’s Mare Imbrium between November 1970 and September 1971, driven via radio link by a five-person team in Crimea. A pressurised "tub" warmed by a polonium heater overnight.',
  'lrv-apollo':
    'The Lunar Roving Vehicle — the first crewed rover. Three Apollos (15, 16, 17) used it to extend their surface exploration, covering up to 36 km per mission. Built by Boeing and Delco; folded into the LM’s descent stage.',
  curiosity:
    'NASA’s nuclear-powered Mars Science Laboratory rover, on Mars since August 2012. Discovered organic molecules, ancient stream-bed environments, and evidence that Mars’ Gale Crater was habitable in the past. Still operational over a decade later.',
  perseverance:
    'NASA’s sample-caching rover, on Mars since February 2021. Carried Ingenuity, the first off-Earth helicopter; collecting 38 sample tubes for eventual return to Earth. Looking for biosignatures in Jezero Crater’s ancient delta.',
  'yutu-2':
    'China’s Chang’e-4 rover, the first rover to operate on the lunar far side. Landed in Von Kármán crater in January 2019; still active over five years later, far exceeding its three-month design lifetime.',

  // Landers
  'luna-9':
    'The first soft landing on another world. Touched down on Oceanus Procellarum in February 1966, returning the first photographs from the lunar surface — a panorama of the cratered landscape just centimeters from the lander’s eye.',
  'mars-2':
    'The first spacecraft to reach Mars’ surface — by hard impact. The descent module crashed during the 1971 dust storm that obscured every other Mars probe in orbit at the time. Companion Mars 3 made the first soft landing two days later.',
  'mars-3':
    'The first soft landing on Mars (December 1971). Returned 110 seconds of partial telemetry — possibly an image — before contact was lost in the global dust storm raging across the planet.',
  'viking-1':
    'The first successful Mars lander mission, on the surface from July 1976 through November 1982. Carried four biology experiments and returned high-resolution images of the Chryse Planitia plains. The Viking 1 / Viking 2 pair set the template for every Mars lander that followed.',
  schiaparelli:
    'ESA’s 2016 ExoMars demonstrator that crashed during landing — a faulty IMU saturated, triggering an early parachute deploy and engine cutoff. Lessons fed directly into the Rosalind Franklin lander design.',
  insight:
    'NASA’s 2018–2022 Mars seismometer mission. Detected over 1,300 marsquakes, mapped the planet’s internal structure for the first time, and confirmed the existence of a large molten core. Ended when dust accumulation on its solar panels finally starved its power.',
  beresheet:
    'The first private lunar landing attempt, by Israel’s SpaceIL nonprofit. Crashed in April 2019 when a thrust-control software glitch left the engine off too long. Demonstrated that landing on the Moon is much harder than reaching it.',
  'change-3':
    'China’s first lunar lander (December 2013), carrying the Yutu rover. Mare Imbrium touchdown — the first soft landing on the Moon since Luna 24 in 1976.',
  'change-4':
    'The first soft landing on the lunar far side (January 2019). Required a relay satellite (Queqiao) at Earth-Moon L2 to maintain communications. Yutu-2 has since roamed the Von Kármán crater terrain for years.',
  'change-5':
    'The first lunar sample return since Luna 24 in 1976. Returned 1.7 kg of basalt from a region 1.2 billion years younger than the Apollo and Luna samples — extending the timeline of recent lunar volcanism.',
  'vikram-cy3':
    'India’s first successful lunar lander (August 2023), the first spacecraft to land near the lunar south pole. Two years after Vikram CY-2 crashed in the same region — the redemption arc India and ISRO needed.',
  slim: 'JAXA’s 2024 lunar lander. Touched down within 100 m of its target — pinpoint accuracy unprecedented for a lunar lander — but tipped over on landing, ending up upside-down. Still operated for several lunar days from that orientation.',
  'im-1-odysseus':
    'The first US lunar landing since Apollo 17 in 1972. Touched down sideways on the lunar south-pole region in February 2024 (a navigation laser error left the rangefinder inoperative); operated briefly before sunset.',

  // Orbiters
  'mariner-4':
    'The first successful Mars flyby — July 1965. The 22 grainy black-and-white photos returned ended over a century of speculation about Martian canals and life by showing a cratered, Moon-like surface.',
  'mariner-9':
    'The first spacecraft to orbit another planet (Mars, November 1971). Mapped 100% of the Martian surface — including the global dust storm that hid everything for the first month and the first close-up of Olympus Mons.',
  'pioneer-10':
    'The first spacecraft to traverse the asteroid belt and the first to fly past Jupiter (December 1973). Carried the Pioneer plaque — the etched gold-anodized aluminium drawing of human figures + solar system that Carl Sagan and Frank Drake designed in three weeks.',
  'voyager-1':
    'The most distant human-made object — over 24 billion kilometers from the Sun and growing. Crossed the heliopause into interstellar space on August 25, 2012. Carries the Golden Record. Still transmitting on its 470 W RTG.',
  'voyager-2':
    'The only spacecraft to visit all four giant planets — Jupiter (1979), Saturn (1981), Uranus (1986), Neptune (1989). Followed its twin Voyager 1 into interstellar space in November 2018. Carries an identical Golden Record.',
  galileo:
    'The first Jupiter orbiter (1995–2003), and the only mission to drop a probe into Jupiter’s atmosphere. Also discovered evidence for a subsurface ocean on Europa — making it one of the most consequential planetary missions ever flown.',
  cassini:
    'The Saturn orbiter (2004–2017) that carried ESA’s Huygens lander to Titan — still the only landing on a moon of an outer planet. Discovered the active geyser plumes of Enceladus and the global ocean beneath its icy crust. Ended in a planned plunge into Saturn’s atmosphere.',
  'phobos-2':
    'The last Soviet planetary mission. Reached Mars orbit in January 1989 but lost contact with Earth in March, just before its planned encounter with the moon Phobos. Two final images suggest something — likely a thruster failure — but the cause was never confirmed.',
  juno: 'NASA’s polar Jupiter orbiter, in orbit since 2016. Solar-powered (a first at Jupiter’s distance), spinning to maintain stability, and orbiting close enough to Jupiter’s cloud-tops to risk severe radiation damage with each pass.',
  rosetta:
    'ESA’s comet rendezvous mission. Caught up to Comet 67P/Churyumov–Gerasimenko in August 2014, deployed the Philae lander (which bounced and fell into a crevasse), and accompanied the comet through its 2015 perihelion before crash-landing on the surface itself in September 2016.',
  hayabusa2:
    'JAXA’s asteroid sample-return mission. Reached asteroid Ryugu in 2018, deployed several rovers and an impactor (creating an artificial crater), and returned 5.4 g of material to Earth in December 2020 — the second asteroid sample return after the original Hayabusa.',
  mangalyaan:
    'India’s first interplanetary mission and the first successful Mars mission by an Asian space agency. Delivered an orbiter to Mars on its first attempt — a feat no other space-faring nation managed. Operated for nearly eight years before contact was lost in 2022.',
  'osiris-rex':
    'NASA’s asteroid sample-return mission. Approached asteroid Bennu in 2018, captured a sample with its TAGSAM arm in 2020, and returned the sample capsule to Utah in September 2023. Now redesignated OSIRIS-APEX, en route to asteroid Apophis for its 2029 close Earth flyby.',
  dart: 'The first planetary defense impactor. Deliberately collided with the asteroid moonlet Dimorphos in September 2022, shortening its orbital period around its parent Didymos by 33 minutes — proving that kinetic deflection is a viable planet-protection technique.',

  // Observatories
  hubble:
    'NASA’s and ESA’s shared visible/UV space telescope, in low Earth orbit since 1990 and serviced five times by Space Shuttle missions through 2009. Still in operation 35+ years later, with major instruments installed by spacewalking astronauts and a primary mirror corrected by COSTAR after the manufacturing flaw was discovered post-launch.',
  jwst: 'The largest infrared space telescope ever built. Stationed at Sun-Earth L2 since January 2022, with a 6.5 m segmented gold-coated beryllium primary mirror behind a tennis-court-sized sunshield. Sees back to the first galaxies after the Big Bang.',
  'compton-gro':
    'One of NASA’s four "Great Observatories" alongside Hubble, Chandra, and Spitzer. In orbit 1991–2000, mapped the gamma-ray sky and discovered that gamma-ray bursts come from cosmological distances rather than nearby sources.',
  chandra:
    'NASA’s flagship X-ray observatory, in service since 1999. Resolution roughly 25× better than any previous X-ray telescope, allowing direct imaging of black-hole accretion disks, supernova remnants, and the hot gas threading galaxy clusters.',
  spitzer:
    'NASA’s infrared Great Observatory, in service 2003–2020. Designed for a five-year cryogenic mission but operated for sixteen, including a "warm mission" phase after its liquid-helium coolant was exhausted in 2009.',
  kepler:
    'NASA’s exoplanet hunter (2009–2018). Stared at a single patch of sky and detected exoplanets via transit photometry — the brief dip in starlight when a planet passes in front of its star. Discovered over 2,600 confirmed exoplanets and demonstrated that Earth-sized worlds are common.',
  gaia: 'ESA’s star-charting satellite, mapping the position, brightness, and motion of nearly two billion stars in the Milky Way at unprecedented precision. Operated 2013–2025; the resulting catalogue will underpin galactic astronomy for decades.',
  hitomi:
    'JAXA’s X-ray observatory, lost just 38 days after launch in February 2016. A reaction-wheel saturation triggered a sequence of attitude-control errors that spun the spacecraft so fast it broke apart. Lessons drove the development of XRISM (launched 2023).',
  tess: 'The Transiting Exoplanet Survey Satellite, in orbit since 2018. Surveys nearly the entire sky in 26 sectors, looking for short-period exoplanets around the brightest, closest stars to Earth — the targets that will be most amenable to follow-up atmospheric characterisation by JWST.',
};

/**
 * Category-aware fallback template that composes a serviceable
 * description from the entry's existing fields. Used for any entry
 * not in CURATED.
 */
function fallbackDescription(entry: DetailEntry): string {
  const cat = entry.category;
  const yr = entry.first_flight === 'planned' ? 'planned' : entry.first_flight.slice(0, 4);
  const status = entry.status.toLowerCase();

  const noun = ((): string => {
    switch (cat) {
      case 'launcher':
        return 'orbital launcher';
      case 'crewed-spacecraft':
        return 'crewed spacecraft';
      case 'cargo-spacecraft':
        return 'robotic cargo spacecraft';
      case 'station':
        return 'space station';
      case 'rover':
        return 'planetary rover';
      case 'lander':
        return 'planetary lander';
      case 'orbiter':
        return 'deep-space orbiter';
      case 'observatory':
        return 'space observatory';
      default:
        return 'spacecraft';
    }
  })();

  const sentence1 = `${entry.name} is a ${noun} built by ${entry.manufacturer}${entry.country !== entry.manufacturer ? ` in ${entry.country}` : ''}.`;
  const sentence2 = entry.tagline.endsWith('.') ? entry.tagline : `${entry.tagline}.`;
  const sentence3 =
    yr === 'planned'
      ? `Currently planned; not yet flown.`
      : status === 'failed'
        ? `Flew in ${yr} but failed; informs the redemption-arc layer of the ${entry.epoch.replace(/-/g, ' ')} epoch.`
        : status === 'active' || status === 'flown'
          ? `In service since ${yr}.`
          : `Retired after first flight in ${yr}.`;

  return `${sentence1} ${sentence2} ${sentence3}`;
}

async function main() {
  const indexJson = JSON.parse(
    await readFile(join(FLEET_DIR, 'index.json'), 'utf-8'),
  ) as IndexEntry[];

  let curated = 0;
  let templated = 0;

  for (const summary of indexJson) {
    const detailRaw = JSON.parse(
      await readFile(join(FLEET_DIR, summary.category, `${summary.id}.json`), 'utf-8'),
    ) as DetailEntry;
    // Merge index + detail so fallback has access to tagline (index only).
    const detail: DetailEntry = { ...detailRaw, tagline: summary.tagline };

    const description = CURATED[summary.id] ?? fallbackDescription(detail);
    if (CURATED[summary.id]) curated += 1;
    else templated += 1;

    const overlay = {
      name: detail.name,
      tagline: summary.tagline,
      description,
      ...(detail.best_known_for ? { best_known_for: detail.best_known_for } : {}),
    };

    const dir = join(OVERLAY_DIR, summary.category);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, `${summary.id}.json`),
      JSON.stringify(overlay, null, 2) + '\n',
      'utf-8',
    );
  }

  console.log(
    `en-US fleet overlays: ${curated} curated descriptions + ${templated} template-derived = ${curated + templated} total`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
