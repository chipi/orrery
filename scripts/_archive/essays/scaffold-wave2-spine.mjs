/**
 * Scaffold the wave-2 essay spine: 7 new base records + re-point seven-minutes into
 * the new movement + rebuild index.json + emit the ESSAY_SLUGS list for +page.ts.
 * Heroes are omitted (added in the illustration phase). Run once.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const baseDir = path.join(ROOT, 'static', 'data', 'essays');

const rn = (label, href, kind) => ({ label, href, kind });
const src = (title, url) => ({ title, url });

// slug -> { movement, order, read_next, sources }
const recs = {
  'space-comm-arrays': {
    movement: 'into-the-dark',
    order: 4,
    read_next: [
      rn(
        'Running the Solar System on a Whisper — the three dishes this essay grows from',
        '/essays/comms',
        'essay',
      ),
      rn(
        'The honest arithmetic of interstellar distance — where even light is slow',
        '/essays/interstellar-exploration',
        'essay',
      ),
      rn(
        'The Deep Space Network — how ranging and Doppler actually work',
        '/science/mission-phases/dsn',
        'science',
      ),
      rn('Fly a mission — watch a command cross the light-lag', '/fly', 'interactive'),
    ],
    sources: [
      src(
        'NASA — Deep Space Network',
        'https://www.nasa.gov/directorates/somd/space-communications-navigation-program/deep-space-network/',
      ),
      src(
        'NASA — Deep Space Optical Communications (DSOC) aboard Psyche',
        'https://www.nasa.gov/mission/deep-space-optical-communications-dsoc/',
      ),
      src(
        'NASA — Laser Communications Relay Demonstration (LCRD)',
        'https://www.nasa.gov/mission/laser-communications-relay-demonstration-lcrd/',
      ),
      src(
        'IETF RFC 9171 — Bundle Protocol Version 7 (Delay-Tolerant Networking)',
        'https://www.rfc-editor.org/rfc/rfc9171.html',
      ),
    ],
  },
  'going-to-the-moon': {
    movement: 'the-destinations',
    order: 1,
    read_next: [
      rn(
        'The Seven Minutes — why an airless landing is rockets all the way down',
        '/essays/seven-minutes',
        'essay',
      ),
      rn('The Wall — why Mars is not simply the Moon, further', '/essays/going-to-mars', 'essay'),
      rn('Explore the Moon in 3D', '/explore', 'interactive'),
      rn('The Artemis programme', '/programs/artemis', 'program'),
    ],
    sources: [
      src('NASA — Artemis', 'https://www.nasa.gov/humans-in-space/artemis/'),
      src('ISRO — Chandrayaan-3', 'https://www.isro.gov.in/Chandrayaan3.html'),
      src(
        'JAXA — SLIM (Smart Lander for Investigating Moon)',
        'https://www.isas.jaxa.jp/en/missions/spacecraft/current/slim.html',
      ),
      src(
        'NASA — Lunar Reconnaissance Orbiter: water ice at the poles',
        'https://science.nasa.gov/mission/lro/',
      ),
      src('Wikipedia — Luna programme', 'https://en.wikipedia.org/wiki/Luna_programme'),
    ],
  },
  'going-to-mars': {
    movement: 'the-destinations',
    order: 2,
    read_next: [
      rn(
        'The Seven Minutes — the hardest landing in the solar system',
        '/essays/seven-minutes',
        'essay',
      ),
      rn(
        'The Body in the Dark — the traveller is the fragile payload',
        '/essays/the-body-in-the-dark',
        'essay',
      ),
      rn('The grammar of delta-v — why you never fly straight', '/essays/delta-v', 'essay'),
      rn('Fly a Mars transfer and watch the window close', '/fly', 'interactive'),
    ],
    sources: [
      src('NASA — Mars Exploration Program', 'https://science.nasa.gov/mars/'),
      src(
        'ISRO — Mars Orbiter Mission (Mangalyaan)',
        'https://www.isro.gov.in/MarsOrbiterMissionSpacecraft.html',
      ),
      src(
        'NASA JPL — MOXIE makes oxygen on Mars',
        'https://www.nasa.gov/technology/moxie-oxygen-on-mars/',
      ),
      src(
        'NASA — Space Radiation and the human journey to Mars',
        'https://www.nasa.gov/humans-in-space/space-radiation/',
      ),
      src('Wikipedia — Tianwen-1', 'https://en.wikipedia.org/wiki/Tianwen-1'),
    ],
  },
  'asteroid-mining': {
    movement: 'the-destinations',
    order: 3,
    read_next: [
      rn('The grammar of delta-v — why a gravity well is the enemy', '/essays/delta-v', 'essay'),
      rn(
        'The Practice Ground — the same ice-as-fuel logic at the Moon',
        '/essays/going-to-the-moon',
        'essay',
      ),
      rn(
        'Keep the Rocket — the launch cost this is all measured against',
        '/essays/reusable-launchers',
        'essay',
      ),
      rn('Explore the small bodies', '/explore', 'interactive'),
    ],
    sources: [
      src('JAXA — Hayabusa2 (Ryugu sample return)', 'https://www.hayabusa2.jaxa.jp/en/'),
      src(
        'NASA — OSIRIS-REx (Bennu sample return)',
        'https://science.nasa.gov/mission/osiris-rex/',
      ),
      src('NASA — Near-Earth Object studies', 'https://cneos.jpl.nasa.gov/'),
      src(
        'Wikipedia — Asteroid mining (history: Planetary Resources, DSI)',
        'https://en.wikipedia.org/wiki/Asteroid_mining',
      ),
    ],
  },
  'the-body-in-the-dark': {
    movement: 'arrival-and-the-body',
    order: 2,
    read_next: [
      rn('The Wall — the trip that breaks on the body', '/essays/going-to-mars', 'essay'),
      rn(
        'The Ship Becomes a World — where the body becomes a lineage',
        '/essays/generational-starships',
        'essay',
      ),
      rn(
        'The Exits We’ve Always Known — the engines that shorten the exposure',
        '/essays/new-propulsion',
        'essay',
      ),
      rn(
        'The International Space Station — the lab this knowledge came from',
        '/programs/iss',
        'program',
      ),
    ],
    sources: [
      src(
        'NASA — Human Research Program',
        'https://www.nasa.gov/humans-in-space/human-research-program/',
      ),
      src('NASA — The Twins Study (Scott & Mark Kelly)', 'https://www.nasa.gov/twins-study/'),
      src(
        'NASA — Spaceflight-Associated Neuro-ocular Syndrome (SANS)',
        'https://www.nasa.gov/humans-in-space/',
      ),
      src(
        'ESA — Mars-500 isolation study',
        'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Mars500',
      ),
      src(
        'Wikipedia — Valeri Polyakov (437-day record aboard Mir)',
        'https://en.wikipedia.org/wiki/Valeri_Polyakov',
      ),
    ],
  },
  'interstellar-exploration': {
    movement: 'the-far-horizon',
    order: 1,
    read_next: [
      rn(
        'The Exits We’ve Always Known — the propulsion this arithmetic rests on',
        '/essays/new-propulsion',
        'essay',
      ),
      rn(
        'The Ship Becomes a World — if you cannot go fast, go slow',
        '/essays/generational-starships',
        'essay',
      ),
      rn(
        'Louder Than a Whisper — the message problem across light-years',
        '/essays/space-comm-arrays',
        'essay',
      ),
      rn('Explore the edge of the map', '/explore', 'interactive'),
    ],
    sources: [
      src('Breakthrough Starshot', 'https://breakthroughinitiatives.org/initiative/3'),
      src(
        'British Interplanetary Society — Project Daedalus',
        'https://www.bis-space.com/what-we-do/projects/project-daedalus/',
      ),
      src('NASA — Voyager: interstellar mission', 'https://science.nasa.gov/mission/voyager/'),
      src('ESO — Proxima Centauri, the nearest star', 'https://www.eso.org/public/news/eso1629/'),
    ],
  },
  'generational-starships': {
    movement: 'the-far-horizon',
    order: 2,
    read_next: [
      rn(
        'The Honest Arithmetic — why slow is the only answer left',
        '/essays/interstellar-exploration',
        'essay',
      ),
      rn(
        'The Body in the Dark — the biology this multiplies across centuries',
        '/essays/the-body-in-the-dark',
        'essay',
      ),
      rn(
        'The Exits We’ve Always Known — the engines that would have to hold',
        '/essays/new-propulsion',
        'essay',
      ),
      rn('Explore the whole system that made us', '/explore', 'interactive'),
    ],
    sources: [
      src(
        'Wikipedia — Biosphere 2 (closed-ecology experiment)',
        'https://en.wikipedia.org/wiki/Biosphere_2',
      ),
      src(
        'British Interplanetary Society — worldships / Project Hyperion',
        'https://www.bis-space.com/',
      ),
      src(
        'NASA — Environmental Control and Life Support (ECLSS)',
        'https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/',
      ),
      src(
        'Wikipedia — Generation ship (minimum viable population, wait calculation)',
        'https://en.wikipedia.org/wiki/Generation_ship',
      ),
    ],
  },
};

// titles pulled from the overlays for nothing (base records don't carry title), just write records
for (const [slug, r] of Object.entries(recs)) {
  const rec = {
    slug,
    movement: r.movement,
    order: r.order,
    status: 'published',
    read_next: r.read_next,
    sources: r.sources,
  };
  fs.writeFileSync(path.join(baseDir, `${slug}.json`), JSON.stringify(rec, null, 2) + '\n');
}

// re-point seven-minutes into the renamed movement
const sm = JSON.parse(fs.readFileSync(path.join(baseDir, 'seven-minutes.json'), 'utf8'));
sm.movement = 'arrival-and-the-body';
sm.order = 1;
fs.writeFileSync(path.join(baseDir, 'seven-minutes.json'), JSON.stringify(sm, null, 2) + '\n');

// rebuild index.json from every base record
const order = [
  'navigation',
  'delta-v',
  'comms',
  'space-comm-arrays',
  'reusable-launchers',
  'new-propulsion',
  'going-to-the-moon',
  'going-to-mars',
  'asteroid-mining',
  'seven-minutes',
  'the-body-in-the-dark',
  'interstellar-exploration',
  'generational-starships',
];
const index = order.map((slug) => {
  const b = JSON.parse(fs.readFileSync(path.join(baseDir, `${slug}.json`), 'utf8'));
  return { slug, movement: b.movement, order: b.order, status: b.status };
});
fs.writeFileSync(path.join(baseDir, 'index.json'), JSON.stringify(index, null, 2) + '\n');

console.log(
  'scaffolded',
  Object.keys(recs).length,
  'base records; index has',
  index.length,
  'essays',
);
console.log('ESSAY_SLUGS =', JSON.stringify(order));
