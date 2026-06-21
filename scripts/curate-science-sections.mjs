#!/usr/bin/env node
/**
 * curate-science-sections — Phase 2 of the full body-panel science-cards
 * sweep. Writes en-US `science_sections` arrays into overlay files for
 * every remaining body on /explore: 6 planets + 15 satellites + 22
 * small-bodies + 2 belts. Mercury / Mars / Saturn / Sun / Moon already
 * curated in a previous slice.
 *
 * Each entry carries { tab, section, why } where:
 *   - tab + section point into /science/<tab>/<section> articles
 *     verified to exist under static/data/i18n/en-US/science/
 *   - why is a one-line per-body context that renders as an italic
 *     prefix above the card title — translatable like fact/bio
 *
 * Missing overlay files are created. Missing dirs (en-US/small-bodies/,
 * en-US/belts/) are created. Existing overlay fields are preserved.
 *
 * Run: node scripts/curate-science-sections.mjs
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const DATA = {
  // ─── PLANETS (Mercury / Mars / Saturn already done) ──────────────
  planets: {
    venus: [
      {
        tab: 'planets',
        section: 'axial-tilt-and-seasons',
        why: 'Venus rotates retrograde with an axial tilt of 177° — effectively upside-down. Combined with a 243-day sidereal rotation, its day is longer than its 225-day year.',
      },
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: 'The most circular planetary orbit in the system (e = 0.0068) — Venus moves around the Sun like a near-perfect ring.',
      },
      {
        tab: 'planets',
        section: 'sub-solar-and-terminator',
        why: 'Venus has the most extreme greenhouse: surface temperatures stay ~460°C day and night, so the sub-solar / terminator distinction matters less than for any other planet.',
      },
      {
        tab: 'planets',
        section: 'active-spacecraft-survey',
        why: 'Akatsuki (JAXA, 2015–) is the only active Venus orbiter; the Soviet Venera campaign (1961–83) still owns the only surface images ever taken.',
      },
    ],
    earth: [
      {
        tab: 'scales-time',
        section: 'au',
        why: 'The astronomical unit IS the Earth-Sun mean distance — Earth is the literal yardstick for every solar-system measurement.',
      },
      {
        tab: 'scales-time',
        section: 'ecliptic-plane',
        why: "Earth's orbit defines the ecliptic plane. Every other planet's inclination is measured relative to this reference.",
      },
      {
        tab: 'planets',
        section: 'axial-tilt-and-seasons',
        why: "Earth's 23.4° tilt is the textbook seasons-machine — equinoxes and solstices arise directly from the angle between rotation axis and orbital plane.",
      },
      {
        tab: 'transfers',
        section: 'hohmann-transfer',
        why: 'Every Mars launch window — every 26 months — is an Earth-departure Hohmann transfer. The ladder leaves from here.',
      },
      {
        tab: 'planets',
        section: 'moons-of-the-system',
        why: 'The Moon is unusually large for its parent — the ratio (diameter ≈ 0.27 of Earth) is the highest in any planet–satellite pair.',
      },
    ],
    jupiter: [
      {
        tab: 'planets',
        section: 'moons-of-the-system',
        why: 'Jupiter has 95 confirmed moons — the four Galileans (Io, Europa, Ganymede, Callisto) are each worlds in their own right and trace a 1:2:4 orbital resonance.',
      },
      {
        tab: 'planets',
        section: 'magnetic-fields',
        why: "Jupiter's magnetosphere is the largest planetary structure in the solar system — extending past Saturn's orbit on the anti-sunward side.",
      },
      {
        tab: 'transfers',
        section: 'gravity-assist',
        why: 'Jupiter is the favoured gravity-assist target for outer-system missions — Voyager 1+2, Cassini, Galileo, New Horizons, Juno, Europa Clipper and JUICE all used or use a Jovian flyby for velocity gain.',
      },
      {
        tab: 'orbits',
        section: 'hill-sphere',
        why: "Jupiter's vast Hill sphere (50 million km radius) is what makes its 95-moon system stable — the gravitational well extends nearly to Mars at perihelion.",
      },
      {
        tab: 'planets',
        section: 'active-spacecraft-survey',
        why: 'Juno (NASA) is currently in polar orbit; Europa Clipper (NASA) and JUICE (ESA) are en route — orbital arrival at Ganymede 2034.',
      },
    ],
    uranus: [
      {
        tab: 'planets',
        section: 'axial-tilt-and-seasons',
        why: "Uranus's 97.8° tilt means it rotates on its side — each pole gets ~42 years of continuous sunlight, then ~42 years of darkness.",
      },
      {
        tab: 'orbits',
        section: 'inclination',
        why: 'The inclination of the planet matters less than the tilt of its rotation axis — Uranus has the most dramatic axial inclination in the system, even though its orbital inclination is modest (0.77°).',
      },
      {
        tab: 'planets',
        section: 'moons-of-the-system',
        why: "The five major Uranian moons (Miranda, Ariel, Umbriel, Titania, Oberon) share Uranus's tilt — they orbit in the equatorial plane, which is nearly perpendicular to the ecliptic.",
      },
      {
        tab: 'planets',
        section: 'active-spacecraft-survey',
        why: 'No spacecraft has visited Uranus since Voyager 2 (1986). A Uranus orbiter is a top NASA Decadal-Survey priority for the 2030s.',
      },
    ],
    neptune: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: 'At 30.07 AU mean distance, Neptune is so far that a single one-way light signal takes 4 hours each way. Voyager 2 needed 12 years to reach it.',
      },
      {
        tab: 'planets',
        section: 'moons-of-the-system',
        why: 'Triton is the only large moon in the solar system with a retrograde orbit — strong evidence it was captured from the Kuiper Belt, not formed with Neptune.',
      },
      {
        tab: 'orbits',
        section: 'apsides',
        why: "Neptune's gentle 0.0086 eccentricity gives an orbit so circular that perihelion–aphelion swing is under 200 million km on a 30-AU semi-major axis — a 1.4 % variation.",
      },
      {
        tab: 'planets',
        section: 'active-spacecraft-survey',
        why: 'Voyager 2 (1989 flyby) remains the only spacecraft to have visited Neptune. No mission to the system is currently funded or in flight.',
      },
    ],
    pluto: [
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: "Pluto's 0.249 eccentricity is so high its orbit dips inside Neptune's for 20 years per 248-year cycle (1979–1999 was the last such interval).",
      },
      {
        tab: 'orbits',
        section: 'inclination',
        why: "Pluto's 17.2° orbital inclination is the highest of any commonly-recognised planet or dwarf planet — well above the ecliptic where the gas giants live.",
      },
      {
        tab: 'orbits',
        section: 'apsides',
        why: 'Perihelion 29.7 AU vs aphelion 49.3 AU — a 20 AU swing means surface temperatures vary enough for Pluto’s atmosphere to thicken near perihelion and freeze out near aphelion.',
      },
      {
        tab: 'planets',
        section: 'moons-of-the-system',
        why: 'Pluto and Charon are tidally locked to each other — both rotation periods equal the 6.4-day mutual orbital period. The pair is treated as a true binary in much modern literature.',
      },
      {
        tab: 'planets',
        section: 'kuiper-belt',
        why: 'Pluto is the largest member of the Kuiper Belt — its discovery in 1930 predated the belt concept by 60 years.',
      },
    ],
  },
  // ─── SATELLITES (Moon already done) ──────────────────────────────
  satellites: {
    phobos: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: 'Phobos orbits Mars at just 9,377 km — below the synchronous altitude, so it is tidally accelerated INWARD and will impact Mars in ~40 million years.',
      },
      {
        tab: 'orbits',
        section: 'apsides',
        why: "Phobos's perihelion-aphelion swing is tiny but it circles Mars three times per Martian day — the most-orbits-per-parent-day moon in the system.",
      },
    ],
    deimos: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: 'Deimos is the outer Mars moon (23,460 km) — its orbital period (1.26 d) is longer than the Martian day, so tidal forces are pushing it slowly outward.',
      },
    ],
    io: [
      {
        tab: 'orbits',
        section: 'keplers-laws',
        why: "Io / Europa / Ganymede are locked in a 4:2:1 Laplace resonance — for every 4 Io orbits, Europa makes 2 and Ganymede 1. The resonance keeps Io's orbit non-circular.",
      },
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: "Io's tidal heating (which makes it the most volcanically active world in the solar system) comes from forced eccentricity — pumped by Europa and Ganymede through the Laplace resonance.",
      },
    ],
    europa: [
      {
        tab: 'orbits',
        section: 'keplers-laws',
        why: 'Europa is the middle member of the Io–Europa–Ganymede 4:2:1 Laplace resonance — its forced eccentricity drives the tidal flexing that keeps a subsurface ocean liquid.',
      },
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: "Europa's tiny 0.009 eccentricity is forced by Io's perturbations — without it the subsurface ocean would freeze. Europa Clipper (NASA, 2024–) is launching to study it.",
      },
    ],
    ganymede: [
      {
        tab: 'planets',
        section: 'magnetic-fields',
        why: "Ganymede is the only moon in the solar system with its own internally-generated magnetic field — produced by an iron-rich core embedded in Jupiter's magnetosphere.",
      },
      {
        tab: 'orbits',
        section: 'keplers-laws',
        why: "Outer member of the 4:2:1 Laplace resonance with Io and Europa — Ganymede's stability anchors the whole inner-Galilean system.",
      },
    ],
    callisto: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: "Callisto orbits outside the Laplace resonance — its 1.88-million-km semi-major axis puts it beyond the worst of Jupiter's radiation belts, making it the most spacecraft-friendly Galilean.",
      },
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: "Callisto's 0.007 eccentricity is small and unforced — without resonant pumping, no tidal flexing, no subsurface ocean (probably).",
      },
    ],
    titan: [
      {
        tab: 'orbits',
        section: 'apsides',
        why: "Titan is in 1:1 spin-orbit resonance with Saturn — always shows the same face. Its 1.22-million-km semi-major axis places it near Saturn's outer Hill sphere.",
      },
      {
        tab: 'planets',
        section: 'sub-solar-and-terminator',
        why: 'Titan has a dense N₂-CH₄ atmosphere — the only moon with one. Surface temperatures sit at 94 K, where methane and ethane exist as liquid lakes.',
      },
    ],
    enceladus: [
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: 'Enceladus is in 2:1 mean-motion resonance with Dione — the forced eccentricity (0.0047) drives the tidal flexing that powers the south-polar cryovolcanic plumes.',
      },
    ],
    triton: [
      {
        tab: 'orbits',
        section: 'inclination',
        why: "Triton's 156.8° orbital inclination — retrograde, steeply tilted to Neptune's equator — is the smoking-gun for capture from the Kuiper Belt rather than formation with Neptune.",
      },
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: "Triton's tidal drag is decreasing its orbit — in 3.6 billion years it will either impact Neptune or fragment inside the Roche limit and form a ring system.",
      },
    ],
    charon: [
      {
        tab: 'orbits',
        section: 'keplerian-orbit',
        why: 'Charon and Pluto orbit a barycentre that sits OUTSIDE Pluto — making it the only known true binary system in the solar system rather than a planet-with-moon.',
      },
      {
        tab: 'orbits',
        section: 'apsides',
        why: "Charon's 19,591-km mean distance from Pluto, combined with mutual tidal locking, means both bodies show the same face to each other forever.",
      },
    ],
    miranda: [
      {
        tab: 'orbits',
        section: 'inclination',
        why: 'Miranda has the highest orbital inclination (4.3°) of the major Uranian moons — combined with an early-system disruption event, it explains the famous cliff faces Voyager 2 imaged in 1986.',
      },
    ],
    ariel: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: "Ariel orbits at 190,900 km from Uranus — second-innermost of the major moons. Like all Uranian moons, its orbit shares the planet's 97° axial tilt.",
      },
    ],
    umbriel: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: "Umbriel orbits Uranus at 266,000 km — its orbital plane is tilted with the planet, so its seasons mirror the parent's extreme axial geometry.",
      },
    ],
    titania: [
      {
        tab: 'planets',
        section: 'moons-of-the-system',
        why: 'Titania is the largest moon of Uranus (1,578 km diameter) — comparable in size to Pluto. Only Voyager 2 has imaged it (1986).',
      },
    ],
    oberon: [
      {
        tab: 'planets',
        section: 'moons-of-the-system',
        why: 'Oberon is the outermost of the five major Uranian moons (583,500 km orbit) — its surface is the most cratered, suggesting it has the oldest exposed surface in the Uranus system.',
      },
    ],
  },
  // ─── SMALL-BODIES (need en-US dir + 22 files) ────────────────────
  'small-bodies': {
    ceres: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: "Ceres holds ~25% of the main belt's total mass in a single body — and is the only main-belt object classified as a dwarf planet.",
      },
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: 'Ceres orbits at 2.77 AU — squarely inside the asteroid belt and used as the canonical "middle of the belt" reference distance.',
      },
    ],
    pluto: [
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: "Pluto's 0.249 eccentricity dips its orbit inside Neptune's for 20 years per 248-year cycle.",
      },
      {
        tab: 'orbits',
        section: 'inclination',
        why: "Pluto's 17.2° inclination keeps it well clear of Neptune even though the orbits cross in projection.",
      },
      {
        tab: 'planets',
        section: 'kuiper-belt',
        why: 'Pluto is the largest known Kuiper-belt body — its 1930 discovery predated the belt concept by 60 years.',
      },
    ],
    haumea: [
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: "Haumea's elongated shape (a 3.9-hour rotation deforms it into a triaxial ellipsoid) is a clue to the violent collision that created its family of icy fragments.",
      },
      {
        tab: 'planets',
        section: 'kuiper-belt',
        why: 'Haumea is part of a small collisional family in the Kuiper Belt — bodies with similar orbits and spectra that share an ancient parent.',
      },
    ],
    makemake: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: "Makemake's 45.7-AU semi-major axis puts it in the classical Kuiper Belt — distant enough that surface methane survives as the dominant ice.",
      },
      {
        tab: 'planets',
        section: 'kuiper-belt',
        why: 'Makemake is the fourth-largest known KBO and the only one of the IAU-recognised dwarf planets without a confirmed moon until Hubble found MK2 in 2016.',
      },
    ],
    eris: [
      {
        tab: 'orbits',
        section: 'inclination',
        why: "Eris's 44° orbital inclination is among the highest of any catalogued large body — its scattered-disc origin puts it well off the ecliptic.",
      },
      {
        tab: 'orbits',
        section: 'apsides',
        why: 'Eris swings from 38 AU at perihelion to 97 AU at aphelion — a 60-AU spread on a 96-AU mean orbit. It is currently near aphelion.',
      },
    ],
    halley: [
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: "Halley's 0.967 eccentricity is the textbook short-period-comet orbit — nearly parabolic, with perihelion 0.59 AU and aphelion 35 AU.",
      },
      {
        tab: 'orbits',
        section: 'apsides',
        why: "Halley's enormous perihelion-aphelion swing (35 to 0.59 AU) drives the surface ices to sublimate violently near perihelion, producing the coma and tail. Next perihelion: 2061.",
      },
    ],
    '67p': [
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: '67P/Churyumov–Gerasimenko has e = 0.64 — a Jupiter-family comet whose orbit was reshaped by a 1959 Jupiter close approach.',
      },
      {
        tab: 'transfers',
        section: 'gravity-assist',
        why: 'Rosetta needed three Earth gravity assists and a Mars flyby to reach 67P — a 10-year cruise to catch a comet moving on its own elliptical trajectory.',
      },
    ],
    vesta: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: 'Vesta is the second-most-massive belt body — its surface is the only main-belt source confirmed for HED meteorites found on Earth.',
      },
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: "Vesta orbits at 2.36 AU — inner belt. Its proximity drove Dawn's choice to visit Vesta first (2011), then leave for Ceres (2015).",
      },
    ],
    psyche: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: "16 Psyche may be the exposed nickel-iron core of a protoplanet that lost its mantle in the early belt's violent youth. NASA Psyche (launched 2023) arrives in 2029.",
      },
    ],
    bennu: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: 'Bennu is a near-Earth asteroid (semi-major axis 1.13 AU) — close enough that OSIRIS-REx could rendezvous, sample, and return material to Earth in 7 years.',
      },
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: "Bennu's 0.204 eccentricity gives it a low probability impact path with Earth in the 2100s — one of the reasons it was chosen for OSIRIS-REx (planetary-defence reconnaissance).",
      },
    ],
    arrokoth: [
      {
        tab: 'planets',
        section: 'kuiper-belt',
        why: '486958 Arrokoth (visited by New Horizons in 2019) is the most distant solar-system object ever explored — a primordial Kuiper-belt contact binary that has likely never been warmed by the Sun.',
      },
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: 'Arrokoth orbits at 44.6 AU — classical Kuiper Belt, beyond Pluto, in a region where bodies have been mostly undisturbed since the early solar system.',
      },
    ],
    itokawa: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: "Itokawa is a near-Earth Apollo asteroid — semi-major axis 1.32 AU. Hayabusa's 2005 rendezvous + 2010 sample return was the first NEA round-trip.",
      },
    ],
    didymos: [
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: 'Didymos is a binary near-Earth asteroid (semi-major axis 1.64 AU). DART (NASA, 2022) struck its small companion Dimorphos to test asteroid-deflection physics.',
      },
    ],
    dimorphos: [
      {
        tab: 'orbits',
        section: 'apsides',
        why: 'Dimorphos orbits Didymos at a mere 1.2 km — and after DART, its orbital period changed by 33 minutes. The first deliberate orbit change of a celestial body by humans.',
      },
    ],
    donaldjohanson: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: '52246 Donaldjohanson is a main-belt asteroid (named after Lucy fossil discoverer) — NASA Lucy flew by on 20 April 2025 as its first belt encounter.',
      },
    ],
    eurybates: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: 'Eurybates orbits in the L4 Jupiter Trojan cloud — leading the planet by 60°. Lucy will be the first spacecraft to visit a Trojan (August 2027).',
      },
    ],
    polymele: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: "Polymele is an L4 Trojan — Lucy flyby September 2027. The Trojans are dynamically locked at Jupiter's L4/L5 Lagrange points and may be captured Kuiper-belt bodies.",
      },
    ],
    leucus: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: 'Leucus is an unusually slow-rotating L4 Trojan (445-hour period) — Lucy flyby April 2028 will image its odd elongated shape up close.',
      },
    ],
    orus: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: 'Orus is a C-type L4 Trojan — Lucy flyby November 2028. Its dark, carbon-rich spectrum is closer to Kuiper-belt objects than to inner-belt asteroids.',
      },
    ],
    patroclus: [
      {
        tab: 'orbits',
        section: 'lagrange-points',
        why: 'Patroclus is a binary system at L5 — trailing Jupiter by 60°. Lucy reaches it in 2033 to complete the first spacecraft tour of both Trojan clouds.',
      },
    ],
    menoetius: [
      {
        tab: 'orbits',
        section: 'lagrange-points',
        why: "Menoetius is Patroclus's binary companion at L5. Their tight binary geometry has kept them dynamically stable for 4.5 billion years.",
      },
    ],
    oumuamua: [
      {
        tab: 'orbits',
        section: 'eccentricity',
        why: 'ʻOumuamua had e > 1 — a hyperbolic, unbound orbit. The first confirmed interstellar object to pass through the solar system (2017).',
      },
      {
        tab: 'transfers',
        section: 'conic-sections',
        why: "Oumuamua's trajectory was the textbook hyperbolic conic — defined by escape velocity exceeded at every point. By the time it was discovered it was already leaving.",
      },
    ],
  },
  // ─── BELTS (need en-US dir) ──────────────────────────────────────
  belts: {
    asteroid: [
      {
        tab: 'planets',
        section: 'asteroid-belt',
        why: "The main belt: ~1–2 million bodies between Mars and Jupiter, total mass ≈ 4 % of the Moon. Jupiter's resonances cleared the belt — fragmentation has won against accretion ever since.",
      },
      {
        tab: 'orbits',
        section: 'orbit-regimes',
        why: 'The belt occupies the 2.2–3.2 AU annulus. Kirkwood gaps — empty orbit zones at Jupiter mean-motion resonances — pattern the population.',
      },
      {
        tab: 'orbits',
        section: 'inclination',
        why: 'Most belt asteroids stay near the ecliptic (< 10° inclination) but the high-inclination Pallas family at 33° reminds you the belt is a 3-D disc, not a 2-D ring.',
      },
    ],
    kuiper: [
      {
        tab: 'planets',
        section: 'kuiper-belt',
        why: 'The Kuiper Belt is the trans-Neptunian remnant of the protoplanetary disc — 30 to 50 AU, dominated by ice. Pluto, Eris, Haumea, Makemake live here.',
      },
      {
        tab: 'orbits',
        section: 'semi-major-axis',
        why: 'The classical KBOs orbit between 42 and 48 AU in low-eccentricity, low-inclination orbits — they have been mostly undisturbed since the early system.',
      },
      {
        tab: 'orbits',
        section: 'inclination',
        why: "The scattered-disc subpopulation (Eris, Sedna) sits at high inclinations (30°+) — gravitationally scattered by Neptune's outward migration and currently spreading the belt vertically.",
      },
    ],
  },
};

let createdCount = 0;
let patchedCount = 0;
const created = [];
const patched = [];

for (const [surface, bodies] of Object.entries(DATA)) {
  for (const [bodyId, sections] of Object.entries(bodies)) {
    const dir = `static/data/i18n/en-US/${surface}`;
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const path = `${dir}/${bodyId}.json`;
    let json = {};
    if (existsSync(path)) {
      json = JSON.parse(readFileSync(path, 'utf8'));
      patchedCount++;
      patched.push(`${surface}/${bodyId}`);
    } else {
      createdCount++;
      created.push(`${surface}/${bodyId}`);
    }
    json.science_sections = sections;
    writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
  }
}

console.log(`patched ${patchedCount} existing overlays + created ${createdCount} new`);
console.log(`\nnew files:`);
created.forEach((p) => console.log(`  ${p}`));
console.log(`\npatched files:`);
patched.forEach((p) => console.log(`  ${p}`));
